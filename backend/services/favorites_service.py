"""
Favorites Service for Ghost Gym V2
Handles user favorite exercises with optimized Firestore operations
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from firebase_admin import firestore
from ..config.firebase_config import get_firebase_app
from ..models import FavoriteExercise, UserFavorites, Exercise

# Set up logging
logger = logging.getLogger(__name__)

class FavoritesService:
    """
    Service for managing user favorite exercises
    Uses optimized single-document structure for fast reads and writes
    """
    
    def __init__(self):
        """Initialize Favorites service"""
        try:
            self.app = get_firebase_app()
            if self.app:
                self.db = firestore.client(app=self.app)
                self.available = True
                logger.info("Favorites service initialized successfully")
            else:
                self.db = None
                self.available = False
                logger.warning("Favorites service not available - Firebase not initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Favorites service: {str(e)}")
            self.db = None
            self.available = False
    
    def is_available(self) -> bool:
        """Check if Favorites service is available"""
        return self.available and self.db is not None
    
    def get_user_favorites(self, user_id: str) -> UserFavorites:
        """
        Get all favorites for a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            UserFavorites object with all favorite exercises
        """
        if not self.is_available():
            logger.warning("Firestore not available - cannot get favorites")
            return UserFavorites()
        
        try:
            doc_ref = (self.db.collection('users')
                      .document(user_id)
                      .collection('data')
                      .document('favorites'))
            
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                logger.info(f"📦 Raw Firestore data keys: {list(data.keys())}")
                
                # Convert exercises dict to FavoriteExercise objects
                exercises = {}
                
                # Handle both nested map structure AND dotted field paths (for backward compatibility)
                exercises_data = data.get('exercises', {})
                
                if exercises_data:
                    # New structure: exercises is a nested map
                    logger.info(f"✅ Found nested exercises map with {len(exercises_data)} items")
                    for ex_id, ex_data in exercises_data.items():
                        try:
                            exercises[ex_id] = FavoriteExercise(**ex_data)
                        except Exception as e:
                            logger.warning(f"Failed to parse favorite exercise {ex_id}: {str(e)}")
                            continue
                else:
                    # Old structure: exercises stored as dotted field paths
                    logger.info("⚠️ Using legacy dotted field path structure")
                    for key, value in data.items():
                        if key.startswith('exercises.'):
                            ex_id = key.replace('exercises.', '')
                            try:
                                exercises[ex_id] = FavoriteExercise(**value)
                                logger.info(f"📦 Parsed legacy favorite: {ex_id}")
                            except Exception as e:
                                logger.warning(f"Failed to parse legacy favorite {ex_id}: {str(e)}")
                                continue
                
                logger.info(f"✅ Parsed {len(exercises)} favorite exercises total")
                
                return UserFavorites(
                    exerciseIds=data.get('exerciseIds', []),
                    exercises=exercises,
                    lastUpdated=data.get('lastUpdated', datetime.now()),
                    count=data.get('count', len(exercises))
                )
            else:
                logger.info(f"No favorites found for user {user_id}")
                return UserFavorites()
                
        except Exception as e:
            logger.error(f"Error getting favorites for user {user_id}: {str(e)}")
            return UserFavorites()
    
    def add_favorite(self, user_id: str, exercise_id: str, exercise: Exercise) -> bool:
        """
        Add exercise to user's favorites
        
        Args:
            user_id: ID of the user
            exercise_id: ID of the exercise to favorite
            exercise: Full Exercise object with details
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("Firestore not available - cannot add favorite")
            return False
        
        try:
            doc_ref = (self.db.collection('users')
                      .document(user_id)
                      .collection('data')
                      .document('favorites'))
            
            # Create favorite exercise object
            favorite = FavoriteExercise(
                exerciseId=exercise_id,
                name=exercise.name,
                targetMuscleGroup=exercise.targetMuscleGroup,
                primaryEquipment=exercise.primaryEquipment,
                isGlobal=exercise.isGlobal,
                favoritedAt=datetime.now()
            )
            
            # Get current document to check structure
            current_doc = doc_ref.get()
            
            if current_doc.exists:
                # Update existing document with nested structure
                doc_ref.update({
                    'exerciseIds': firestore.ArrayUnion([exercise_id]),
                    f'exercises.{exercise_id}': favorite.model_dump(),
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                    'count': firestore.Increment(1)
                })
            else:
                # Create new document with proper nested structure
                doc_ref.set({
                    'exerciseIds': [exercise_id],
                    'exercises': {
                        exercise_id: favorite.model_dump()
                    },
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                    'count': 1
                })
            
            # Optionally increment favorite count on the exercise itself
            try:
                exercise_ref = self.db.collection('global_exercises').document(exercise_id)
                exercise_ref.update({
                    'favoriteCount': firestore.Increment(1)
                })
            except Exception as e:
                logger.warning(f"Could not update exercise favorite count: {str(e)}")
            
            logger.info(f"Added favorite: {exercise.name} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding favorite for user {user_id}: {str(e)}")
            return False
    
    def remove_favorite(self, user_id: str, exercise_id: str) -> bool:
        """
        Remove exercise from user's favorites
        
        Args:
            user_id: ID of the user
            exercise_id: ID of the exercise to unfavorite
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available():
            logger.warning("Firestore not available - cannot remove favorite")
            return False
        
        try:
            doc_ref = (self.db.collection('users')
                      .document(user_id)
                      .collection('data')
                      .document('favorites'))
            
            # Remove from favorites using Firestore atomic operations
            doc_ref.update({
                'exerciseIds': firestore.ArrayRemove([exercise_id]),
                f'exercises.{exercise_id}': firestore.DELETE_FIELD,
                'lastUpdated': firestore.SERVER_TIMESTAMP,
                'count': firestore.Increment(-1)
            })
            
            # Optionally decrement favorite count on the exercise itself
            try:
                exercise_ref = self.db.collection('global_exercises').document(exercise_id)
                exercise_ref.update({
                    'favoriteCount': firestore.Increment(-1)
                })
            except Exception as e:
                logger.warning(f"Could not update exercise favorite count: {str(e)}")
            
            logger.info(f"Removed favorite: {exercise_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing favorite for user {user_id}: {str(e)}")
            return False
    
    def is_favorited(self, user_id: str, exercise_id: str) -> bool:
        """
        Check if exercise is favorited by user
        
        Args:
            user_id: ID of the user
            exercise_id: ID of the exercise to check
            
        Returns:
            True if favorited, False otherwise
        """
        favorites = self.get_user_favorites(user_id)
        return exercise_id in favorites.exerciseIds
    
    def bulk_check_favorites(self, user_id: str, exercise_ids: List[str]) -> Dict[str, bool]:
        """
        Check favorite status for multiple exercises at once
        
        Args:
            user_id: ID of the user
            exercise_ids: List of exercise IDs to check
            
        Returns:
            Dictionary mapping exercise IDs to favorite status
        """
        favorites = self.get_user_favorites(user_id)
        return {
            exercise_id: exercise_id in favorites.exerciseIds
            for exercise_id in exercise_ids
        }

# Global service instance
favorites_service = FavoritesService()