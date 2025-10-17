"""
Exercise Service for Ghost Gym V2
Handles exercise database operations including CSV import, search, and CRUD operations
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from firebase_admin import firestore
from ..config.firebase_config import get_firebase_app
from ..models import Exercise, CreateExerciseRequest, ExerciseListResponse, ExerciseSearchResponse

# Set up logging
logger = logging.getLogger(__name__)

class ExerciseService:
    """
    Service for managing exercises in Firestore
    Handles both global exercises and user-specific custom exercises
    """
    
    def __init__(self):
        """Initialize Exercise service"""
        try:
            self.app = get_firebase_app()
            if self.app:
                self.db = firestore.client(app=self.app)
                self.available = True
                logger.info("Exercise service initialized successfully")
            else:
                self.db = None
                self.available = False
                logger.warning("Exercise service not available - Firebase not initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Exercise service: {str(e)}")
            self.db = None
            self.available = False
    
    def is_available(self) -> bool:
        """Check if Exercise service is available"""
        return self.available and self.db is not None
    
    # Global Exercise Operations
    
    async def get_all_exercises(
        self, 
        limit: int = 1000,
        page: int = 1
    ) -> ExerciseListResponse:
        """
        Get all global exercises with pagination
        
        Args:
            limit: Maximum number of exercises to return
            page: Page number (1-based)
            
        Returns:
            ExerciseListResponse with exercises and metadata
        """
        if not self.is_available():
            logger.warning("Firestore not available - cannot get exercises")
            return ExerciseListResponse(
                exercises=[],
                total_count=0,
                page=page,
                page_size=limit
            )
        
        try:
            # Calculate offset
            offset = (page - 1) * limit
            
            # Query exercises
            exercises_ref = (self.db.collection('global_exercises')
                           .order_by('name')
                           .limit(limit)
                           .offset(offset))
            
            docs = exercises_ref.stream()
            exercises = []
            
            for doc in docs:
                try:
                    exercise_data = doc.to_dict()
                    exercise = Exercise(**exercise_data)
                    exercises.append(exercise)
                except Exception as e:
                    logger.warning(f"Failed to parse exercise {doc.id}: {str(e)}")
                    continue
            
            # Get total count (expensive operation, consider caching)
            total_count = len(list(self.db.collection('global_exercises').stream()))
            
            logger.info(f"Retrieved {len(exercises)} exercises (page {page})")
            
            return ExerciseListResponse(
                exercises=exercises,
                total_count=total_count,
                page=page,
                page_size=limit
            )
            
        except Exception as e:
            logger.error(f"Failed to get exercises: {str(e)}")
            return ExerciseListResponse(
                exercises=[],
                total_count=0,
                page=page,
                page_size=limit
            )
    
    async def search_exercises(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> ExerciseSearchResponse:
        """
        Search exercises by name and optional filters
        
        Args:
            query: Search query string
            filters: Optional filters (muscle_group, equipment, difficulty)
            limit: Maximum number of results
            
        Returns:
            ExerciseSearchResponse with matching exercises
        """
        if not self.is_available():
            return ExerciseSearchResponse(
                exercises=[],
                query=query,
                total_results=0
            )
        
        try:
            query_lower = query.lower()
            
            # Start with base query
            exercises_ref = self.db.collection('global_exercises')
            
            # Apply filters if provided
            if filters:
                if 'muscle_group' in filters and filters['muscle_group']:
                    exercises_ref = exercises_ref.where('targetMuscleGroup', '==', filters['muscle_group'])
                if 'equipment' in filters and filters['equipment']:
                    exercises_ref = exercises_ref.where('primaryEquipment', '==', filters['equipment'])
                if 'difficulty' in filters and filters['difficulty']:
                    exercises_ref = exercises_ref.where('difficultyLevel', '==', filters['difficulty'])
            
            # Use array-contains for token-based search
            if query_lower:
                exercises_ref = exercises_ref.where('nameSearchTokens', 'array_contains', query_lower)
            
            # Limit results
            exercises_ref = exercises_ref.limit(limit)
            
            docs = exercises_ref.stream()
            exercises = []
            
            for doc in docs:
                try:
                    exercise_data = doc.to_dict()
                    exercise = Exercise(**exercise_data)
                    exercises.append(exercise)
                except Exception as e:
                    logger.warning(f"Failed to parse exercise {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Search '{query}' returned {len(exercises)} results")
            
            return ExerciseSearchResponse(
                exercises=exercises,
                query=query,
                total_results=len(exercises)
            )
            
        except Exception as e:
            logger.error(f"Failed to search exercises: {str(e)}")
            return ExerciseSearchResponse(
                exercises=[],
                query=query,
                total_results=0
            )
    
    async def get_exercise_by_id(self, exercise_id: str) -> Optional[Exercise]:
        """
        Get a specific exercise by ID
        
        Args:
            exercise_id: ID of the exercise
            
        Returns:
            Exercise object or None if not found
        """
        if not self.is_available():
            return None
        
        try:
            exercise_ref = self.db.collection('global_exercises').document(exercise_id)
            doc = exercise_ref.get()
            
            if doc.exists:
                exercise_data = doc.to_dict()
                return Exercise(**exercise_data)
            else:
                logger.info(f"Exercise {exercise_id} not found")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get exercise: {str(e)}")
            return None
    
    # User Custom Exercise Operations
    
    async def create_custom_exercise(
        self,
        user_id: str,
        exercise_request: CreateExerciseRequest
    ) -> Optional[Exercise]:
        """
        Create a custom exercise for a user
        
        Args:
            user_id: ID of the user
            exercise_request: Exercise creation request
            
        Returns:
            Created Exercise object or None on failure
        """
        if not self.is_available():
            logger.warning("Firestore not available - cannot create custom exercise")
            return None
        
        try:
            # Create exercise object
            exercise = Exercise(
                name=exercise_request.name,
                nameSearchTokens=self._generate_search_tokens(exercise_request.name),
                difficultyLevel=exercise_request.difficultyLevel,
                targetMuscleGroup=exercise_request.targetMuscleGroup,
                primaryEquipment=exercise_request.primaryEquipment,
                movementPattern1=exercise_request.movementPattern1,
                bodyRegion=exercise_request.bodyRegion,
                mechanics=exercise_request.mechanics,
                isGlobal=False
            )
            
            # Save to Firestore
            exercise_ref = (self.db.collection('users')
                          .document(user_id)
                          .collection('custom_exercises')
                          .document(exercise.id))
            
            exercise_data = exercise.dict()
            exercise_data['createdAt'] = firestore.SERVER_TIMESTAMP
            exercise_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            exercise_ref.set(exercise_data)
            
            logger.info(f"Created custom exercise {exercise.id} for user {user_id}")
            return exercise
            
        except Exception as e:
            logger.error(f"Failed to create custom exercise: {str(e)}")
            return None
    
    async def get_user_custom_exercises(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Exercise]:
        """
        Get all custom exercises for a user
        
        Args:
            user_id: ID of the user
            limit: Maximum number of exercises to return
            
        Returns:
            List of Exercise objects
        """
        if not self.is_available():
            return []
        
        try:
            exercises_ref = (self.db.collection('users')
                           .document(user_id)
                           .collection('custom_exercises')
                           .order_by('name')
                           .limit(limit))
            
            docs = exercises_ref.stream()
            exercises = []
            
            for doc in docs:
                try:
                    exercise_data = doc.to_dict()
                    exercise = Exercise(**exercise_data)
                    exercises.append(exercise)
                except Exception as e:
                    logger.warning(f"Failed to parse custom exercise {doc.id}: {str(e)}")
                    continue
            
            logger.info(f"Retrieved {len(exercises)} custom exercises for user {user_id}")
            return exercises
            
        except Exception as e:
            logger.error(f"Failed to get user custom exercises: {str(e)}")
            return []
    
    # Utility Methods
    
    def _generate_search_tokens(self, name: str) -> List[str]:
        """
        Generate search tokens from exercise name
        
        Args:
            name: Exercise name
            
        Returns:
            List of lowercase tokens for searching
        """
        # Split by spaces and common separators
        tokens = name.lower().replace('-', ' ').replace('/', ' ').split()
        
        # Remove common words that don't help with search
        stop_words = {'the', 'a', 'an', 'and', 'or', 'with', 'to', 'for'}
        tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
        
        return tokens
    
    async def get_unique_values(self, field: str) -> List[str]:
        """
        Get unique values for a specific field (for filters)
        
        Args:
            field: Field name (e.g., 'targetMuscleGroup', 'primaryEquipment')
            
        Returns:
            List of unique values
        """
        if not self.is_available():
            return []
        
        try:
            docs = self.db.collection('global_exercises').stream()
            values = set()
            
            for doc in docs:
                data = doc.to_dict()
                if field in data and data[field]:
                    values.add(data[field])
            
            return sorted(list(values))
            
        except Exception as e:
            logger.error(f"Failed to get unique values for {field}: {str(e)}")
            return []

# Global exercise service instance
exercise_service = ExerciseService()