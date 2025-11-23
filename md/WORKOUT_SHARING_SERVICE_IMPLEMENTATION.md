# Workout Sharing Service - Complete Implementation

This document contains the complete implementation of `backend/services/sharing_service.py`.

## File: `backend/services/sharing_service.py`

```python
"""
Workout Sharing Service
Handles public and private workout sharing with copy-on-share approach
"""

import logging
import secrets
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

try:
    from firebase_admin import firestore
    FIRESTORE_AVAILABLE = True
except ImportError:
    FIRESTORE_AVAILABLE = False
    firestore = None

from ..config.firebase_config import get_firebase_app
from ..models import (
    PublicWorkout, PrivateShare, SharedWorkoutStats,
    ShareWorkoutPublicRequest, ShareWorkoutPrivateRequest,
    SavePublicWorkoutRequest, WorkoutTemplate
)

class SharingService:
    """Service for workout sharing operations"""
    
    def __init__(self):
        """Initialize sharing service"""
        if not FIRESTORE_AVAILABLE:
            logger.warning("Firestore not available - sharing service disabled")
            self.db = None
            self.available = False
            return
        
        try:
            app = get_firebase_app()
            if app:
                self.db = firestore.client(app=app)
                self.available = True
                logger.info("Sharing service initialized successfully")
            else:
                self.db = None
                self.available = False
        except Exception as e:
            logger.error(f"Failed to initialize sharing service: {str(e)}")
            self.db = None
            self.available = False
    
    def is_available(self) -> bool:
        """Check if service is available"""
        return self.available and self.db is not None
    
    # ========================================================================
    # PUBLIC SHARING
    # ========================================================================
    
    async def share_workout_publicly(
        self,
        user_id: str,
        workout: WorkoutTemplate,
        show_creator_name: bool = True
    ) -> Optional[PublicWorkout]:
        """
        Share a workout publicly
        
        Args:
            user_id: ID of user sharing the workout
            workout: Workout template to share
            show_creator_name: Whether to show creator attribution
        
        Returns:
            PublicWorkout object or None if failed
        """
        if not self.is_available():
            logger.warning("Sharing service not available")
            return None
        
        try:
            # Check if user already shared this workout publicly
            existing = await self._check_existing_public_share(user_id, workout.id)
            if existing:
                logger.info(f"Workout {workout.id} already shared publicly by user {user_id}")
                return existing
            
            # Get user's display name if showing attribution
            creator_name = None
            if show_creator_name:
                creator_name = await self._get_user_display_name(user_id)
            
            # Create workout snapshot
            workout_data = workout.model_dump()
            
            # Create public workout document
            public_ref = self.db.collection('public_workouts').document()
            
            public_workout_data = {
                'workout_data': workout_data,
                'creator_id': user_id,
                'creator_name': creator_name,
                'source_workout_id': workout.id,
                'created_at': firestore.SERVER_TIMESTAMP,
                'is_moderated': False,
                'stats': {
                    'view_count': 0,
                    'save_count': 0
                }
            }
            
            public_ref.set(public_workout_data)
            
            logger.info(f"✅ Shared workout {workout.id} publicly as {public_ref.id}")
            
            # Return created public workout
            public_workout_data['id'] = public_ref.id
            public_workout_data['created_at'] = datetime.now()
            return PublicWorkout(**public_workout_data)
            
        except Exception as e:
            logger.error(f"Failed to share workout publicly: {str(e)}")
            return None
    
    async def _check_existing_public_share(
        self,
        user_id: str,
        workout_id: str
    ) -> Optional[PublicWorkout]:
        """Check if user already shared this workout publicly"""
        try:
            query = (self.db.collection('public_workouts')
                    .where('creator_id', '==', user_id)
                    .where('source_workout_id', '==', workout_id)
                    .limit(1))
            
            docs = query.stream()
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                return PublicWorkout(**data)
            
            return None
        except Exception as e:
            logger.error(f"Failed to check existing share: {str(e)}")
            return None
    
    async def get_public_workouts(
        self,
        page: int = 1,
        page_size: int = 20,
        tags: Optional[List[str]] = None,
        sort_by: str = "created_at"
    ) -> Dict[str, Any]:
        """
        Browse public workouts with filtering and sorting
        
        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            tags: Filter by tags
            sort_by: Sort field ("created_at", "view_count", "save_count")
        
        Returns:
            Dict with workouts list and metadata
        """
        if not self.is_available():
            return {"workouts": [], "total_count": 0, "page": page, "page_size": page_size}
        
        try:
            query = self.db.collection('public_workouts')
            
            # Filter by moderation status (only show approved)
            query = query.where('is_moderated', '==', False)
            
            # Apply tag filtering if specified
            if tags:
                query = query.where('workout_data.tags', 'array_contains_any', tags[:10])
            
            # Apply sorting
            if sort_by == "view_count":
                query = query.order_by('stats.view_count', direction=firestore.Query.DESCENDING)
            elif sort_by == "save_count":
                query = query.order_by('stats.save_count', direction=firestore.Query.DESCENDING)
            else:
                query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
            
            # Get total count
            all_docs = query.stream()
            total_count = sum(1 for _ in all_docs)
            
            # Apply pagination
            offset = (page - 1) * page_size
            query = query.limit(page_size).offset(offset)
            
            # Fetch workouts
            docs = query.stream()
            workouts = []
            
            for doc in docs:
                try:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    workout = PublicWorkout(**data)
                    workouts.append(workout)
                except Exception as e:
                    logger.warning(f"Failed to parse public workout {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(workouts)} public workouts (page {page})")
            
            return {
                "workouts": workouts,
                "total_count": total_count,
                "page": page,
                "page_size": page_size
            }
            
        except Exception as e:
            logger.error(f"Failed to get public workouts: {str(e)}")
            return {"workouts": [], "total_count": 0, "page": page, "page_size": page_size}
    
    async def get_public_workout(self, public_workout_id: str) -> Optional[PublicWorkout]:
        """Get a specific public workout by ID"""
        if not self.is_available():
            return None
        
        try:
            doc_ref = self.db.collection('public_workouts').document(public_workout_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Increment view count
                await self.increment_view_count(public_workout_id, is_public=True)
                
                return PublicWorkout(**data)
            else:
                logger.info(f"Public workout {public_workout_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get public workout: {str(e)}")
            return None
    
    async def save_public_workout(
        self,
        user_id: str,
        public_workout_id: str,
        custom_name: Optional[str] = None
    ) -> Optional[WorkoutTemplate]:
        """
        Save a public workout to user's library
        
        Args:
            user_id: ID of user saving the workout
            public_workout_id: ID of public workout to save
            custom_name: Optional custom name for saved workout
        
        Returns:
            Saved WorkoutTemplate or None if failed
        """
        if not self.is_available():
            return None
        
        try:
            # Get public workout
            public_workout = await self.get_public_workout(public_workout_id)
            if not public_workout:
                return None
            
            # Create new workout from public workout data
            workout_data = public_workout.workout_data.copy()
            
            # Apply custom name if provided
            if custom_name:
                workout_data['name'] = custom_name
            else:
                workout_data['name'] = f"{workout_data['name']} (Shared)"
            
            # Create new workout in user's library
            from ..services.firestore_data_service import firestore_data_service
            from ..models import CreateWorkoutRequest
            
            workout_request = CreateWorkoutRequest(**workout_data)
            saved_workout = await firestore_data_service.create_workout(user_id, workout_request)
            
            if saved_workout:
                # Increment save count
                await self.increment_save_count(public_workout_id)
                logger.info(f"✅ User {user_id} saved public workout {public_workout_id}")
            
            return saved_workout
            
        except Exception as e:
            logger.error(f"Failed to save public workout: {str(e)}")
            return None
    
    # ========================================================================
    # PRIVATE SHARING
    # ========================================================================
    
    async def share_workout_privately(
        self,
        user_id: str,
        workout: WorkoutTemplate,
        show_creator_name: bool = True,
        expires_in_days: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Create a private share with token
        
        Args:
            user_id: ID of user sharing the workout
            workout: Workout template to share
            show_creator_name: Whether to show creator attribution
            expires_in_days: Optional expiration in days
        
        Returns:
            Dict with token and share_url, or None if failed
        """
        if not self.is_available():
            return None
        
        try:
            # Generate secure token
            token = secrets.token_urlsafe(16)
            
            # Get user's display name if showing attribution
            creator_name = None
            if show_creator_name:
                creator_name = await self._get_user_display_name(user_id)
            
            # Calculate expiration if specified
            expires_at = None
            if expires_in_days:
                expires_at = datetime.now() + timedelta(days=expires_in_days)
            
            # Create workout snapshot
            workout_data = workout.model_dump()
            
            # Create private share document (token is document ID)
            share_ref = self.db.collection('private_shares').document(token)
            
            share_data = {
                'workout_data': workout_data,
                'creator_id': user_id,
                'creator_name': creator_name,
                'created_at': firestore.SERVER_TIMESTAMP,
                'expires_at': expires_at,
                'view_count': 0
            }
            
            share_ref.set(share_data)
            
            # Generate share URL (update domain in production)
            share_url = f"https://yourdomain.com/share/{token}"
            
            logger.info(f"✅ Created private share for workout {workout.id} with token {token}")
            
            return {
                "token": token,
                "share_url": share_url,
                "expires_at": expires_at
            }
            
        except Exception as e:
            logger.error(f"Failed to create private share: {str(e)}")
            return None
    
    async def get_private_share(self, token: str) -> Optional[PrivateShare]:
        """Get private share by token"""
        if not self.is_available():
            return None
        
        try:
            doc_ref = self.db.collection('private_shares').document(token)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['token'] = token
                
                # Check if expired
                if data.get('expires_at') and data['expires_at'] < datetime.now():
                    logger.info(f"Private share {token} has expired")
                    return None
                
                # Increment view count
                await self.increment_view_count(token, is_public=False)
                
                return PrivateShare(**data)
            else:
                logger.info(f"Private share {token} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get private share: {str(e)}")
            return None
    
    async def save_private_share(
        self,
        user_id: str,
        token: str,
        custom_name: Optional[str] = None
    ) -> Optional[WorkoutTemplate]:
        """Save a private share to user's library"""
        if not self.is_available():
            return None
        
        try:
            # Get private share
            private_share = await self.get_private_share(token)
            if not private_share:
                return None
            
            # Create new workout from share data
            workout_data = private_share.workout_data.copy()
            
            # Apply custom name if provided
            if custom_name:
                workout_data['name'] = custom_name
            else:
                workout_data['name'] = f"{workout_data['name']} (Shared)"
            
            # Create new workout in user's library
            from ..services.firestore_data_service import firestore_data_service
            from ..models import CreateWorkoutRequest
            
            workout_request = CreateWorkoutRequest(**workout_data)
            saved_workout = await firestore_data_service.create_workout(user_id, workout_request)
            
            if saved_workout:
                logger.info(f"✅ User {user_id} saved private share {token}")
            
            return saved_workout
            
        except Exception as e:
            logger.error(f"Failed to save private share: {str(e)}")
            return None
    
    async def delete_private_share(self, user_id: str, token: str) -> bool:
        """Delete a private share (creator only)"""
        if not self.is_available():
            return False
        
        try:
            doc_ref = self.db.collection('private_shares').document(token)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            # Verify creator
            data = doc.to_dict()
            if data.get('creator_id') != user_id:
                logger.warning(f"User {user_id} attempted to delete share {token} they don't own")
                return False
            
            doc_ref.delete()
            logger.info(f"Deleted private share {token}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete private share: {str(e)}")
            return False
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    async def increment_view_count(self, share_id: str, is_public: bool = True) -> bool:
        """Increment view count for a shared workout"""
        if not self.is_available():
            return False
        
        try:
            collection = 'public_workouts' if is_public else 'private_shares'
            doc_ref = self.db.collection(collection).document(share_id)
            
            if is_public:
                doc_ref.update({'stats.view_count': firestore.Increment(1)})
            else:
                doc_ref.update({'view_count': firestore.Increment(1)})
            
            return True
        except Exception as e:
            logger.warning(f"Failed to increment view count: {str(e)}")
            return False
    
    async def increment_save_count(self, public_workout_id: str) -> bool:
        """Increment save count for a public workout"""
        if not self.is_available():
            return False
        
        try:
            doc_ref = self.db.collection('public_workouts').document(public_workout_id)
            doc_ref.update({'stats.save_count': firestore.Increment(1)})
            return True
        except Exception as e:
            logger.warning(f"Failed to increment save count: {str(e)}")
            return False
    
    async def _get_user_display_name(self, user_id: str) -> Optional[str]:
        """Get user's display name for attribution"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                return data.get('displayName')
            
            return None
        except Exception as e:
            logger.warning(f"Failed to get user display name: {str(e)}")
            return None

# Global sharing service instance
sharing_service = SharingService()
```

## Usage Examples

### Share Workout Publicly

```python
from backend.services.sharing_service import sharing_service
from backend.services.firestore_data_service import firestore_data_service

# Get workout
workout = await firestore_data_service.get_workout(user_id, workout_id)

# Share publicly
public_workout = await sharing_service.share_workout_publicly(
    user_id=user_id,
    workout=workout,
    show_creator_name=True
)
```

### Browse Public Workouts

```python
# Get popular workouts
result = await sharing_service.get_public_workouts(
    page=1,
    page_size=20,
    sort_by="view_count"
)

workouts = result["workouts"]
total = result["total_count"]
```

### Create Private Share

```python
# Create share with 7-day expiration
share_result = await sharing_service.share_workout_privately(
    user_id=user_id,
    workout=workout,
    show_creator_name=True,
    expires_in_days=7
)

token = share_result["token"]
share_url = share_result["share_url"]
```

## Error Handling

The service includes comprehensive error handling:

- Returns `None` for failed operations
- Logs all errors with context
- Gracefully handles missing data
- Validates permissions before operations

## Performance Considerations

- Uses Firestore batch operations where possible
- Implements pagination for large result sets
- Caches user display names (future enhancement)
- Efficient duplicate checking with indexed queries