"""
Exercise Service for Ghost Gym V2
Handles exercise database operations including CSV import, search, and CRUD operations
"""

import logging
from typing import List, Optional, Dict, Any, Set
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
    
    def get_all_exercises(
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
    
    def search_exercises(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20,
        user_id: Optional[str] = None
    ) -> ExerciseSearchResponse:
        """
        Search exercises by name and optional filters with smart ranking
        
        Args:
            query: Search query string
            filters: Optional filters (muscle_group, equipment, difficulty, tier)
            limit: Maximum number of results
            user_id: Optional user ID for favorites-based ranking
            
        Returns:
            ExerciseSearchResponse with ranked matching exercises
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
                if 'tier' in filters and filters['tier']:
                    exercises_ref = exercises_ref.where('exerciseTier', '==', filters['tier'])
            
            # Use array-contains for token-based search
            if query_lower:
                exercises_ref = exercises_ref.where('nameSearchTokens', 'array_contains', query_lower)
            
            # Increase limit to allow for ranking
            fetch_limit = min(limit * 3, 100)  # Fetch more to allow for ranking
            exercises_ref = exercises_ref.limit(fetch_limit)
            
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
            
            # Get user favorites if user_id is provided
            user_favorites = set()
            if user_id and len(exercises) > 0:
                from ..services.favorites_service import favorites_service
                if favorites_service.is_available():
                    exercise_ids = [ex.id for ex in exercises]
                    favorites_dict = favorites_service.bulk_check_favorites(user_id, exercise_ids)
                    user_favorites = {ex_id for ex_id, is_fav in favorites_dict.items() if is_fav}
            
            # Apply ranking algorithm
            ranked_exercises = self._rank_exercises(exercises, query_lower, user_favorites)
            
            # Limit results after ranking
            ranked_exercises = ranked_exercises[:limit]
            
            logger.info(f"Search '{query}' returned {len(ranked_exercises)} ranked results")
            
            return ExerciseSearchResponse(
                exercises=ranked_exercises,
                query=query,
                total_results=len(ranked_exercises)
            )
            
        except Exception as e:
            logger.error(f"Failed to search exercises: {str(e)}")
            return ExerciseSearchResponse(
                exercises=[],
                query=query,
                total_results=0
            )
    
    def get_exercise_by_id(self, exercise_id: str) -> Optional[Exercise]:
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
    
    def create_custom_exercise(
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
            
            exercise_data = exercise.model_dump()
            exercise_data['createdAt'] = firestore.SERVER_TIMESTAMP
            exercise_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            exercise_ref.set(exercise_data)
            
            logger.info(f"Created custom exercise {exercise.id} for user {user_id}")
            return exercise
            
        except Exception as e:
            logger.error(f"Failed to create custom exercise: {str(e)}")
            return None
    
    def get_user_custom_exercises(
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
    
    def get_unique_values(self, field: str) -> List[str]:
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
    
    def _rank_exercises(
        self,
        exercises: List[Exercise],
        query: str,
        user_favorites: Set[str]
    ) -> List[Exercise]:
        """
        Rank exercises based on multiple factors
        
        Args:
            exercises: List of exercises to rank
            query: Search query (lowercase)
            user_favorites: Set of exercise IDs favorited by the user
            
        Returns:
            Ranked list of exercises
        """
        # Calculate scores for each exercise
        scored_exercises = []
        
        for exercise in exercises:
            # Base relevance score (exact name match gets highest score)
            base_score = 100
            if exercise.name and query in exercise.name.lower():
                # Exact match gets higher score
                name_lower = exercise.name.lower()
                if name_lower == query:
                    base_score = 100
                elif name_lower.startswith(query):
                    base_score = 90
                else:
                    base_score = 80
            else:
                # Matched on tokens or other fields
                base_score = 70
            
            # Tier boost (increased to ensure proper tier prioritization)
            tier_boost = 0
            if exercise.exerciseTier == 1:  # Foundation
                tier_boost = 50
            elif exercise.exerciseTier == 2:  # Standard
                tier_boost = 25
            # Tier 3 gets no boost
            
            # Favorite boost
            favorite_boost = 25 if exercise.id in user_favorites else 0
            
            # Popularity boost (0-25 points)
            popularity_boost = min(25, (exercise.popularityScore or 0) / 4)
            
            # Calculate total score
            total_score = base_score + tier_boost + favorite_boost + popularity_boost
            
            scored_exercises.append((exercise, total_score))
        
        # Sort by score (descending)
        scored_exercises.sort(key=lambda x: x[1], reverse=True)
        
        # Return sorted exercises
        return [ex for ex, score in scored_exercises]

# Global exercise service instance
exercise_service = ExerciseService()