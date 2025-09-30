"""
Firebase Service for Ghost Gym V3 Phase 2
Handles Firestore operations and Firebase integration
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    firebase_admin = None
    credentials = None
    firestore = None

logger = logging.getLogger(__name__)

class FirebaseService:
    """Firebase service for Firestore operations"""
    
    def __init__(self):
        self.db = None
        self.app = None
        self._available = False
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase Admin SDK"""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available - install firebase-admin package")
            return
        
        try:
            # Check if Firebase is already initialized
            if firebase_admin._apps:
                self.app = firebase_admin.get_app()
                self.db = firestore.client()
                self._available = True
                logger.info("✅ Firebase service connected to existing app")
                return
            
            # Initialize Firebase Admin SDK
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            project_id = os.getenv('FIREBASE_PROJECT_ID', 'ghost-gym-v3')
            
            if service_account_path and os.path.exists(service_account_path):
                # Use service account file
                cred = credentials.Certificate(service_account_path)
                self.app = firebase_admin.initialize_app(cred, {
                    'projectId': project_id
                })
            else:
                # Try to use environment variables or default credentials
                try:
                    # Use default credentials (for Railway deployment)
                    self.app = firebase_admin.initialize_app()
                except Exception as e:
                    logger.warning(f"Could not initialize Firebase with default credentials: {e}")
                    return
            
            self.db = firestore.client()
            self._available = True
            logger.info("✅ Firebase service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Firebase initialization failed: {e}")
            self._available = False
    
    def is_available(self) -> bool:
        """Check if Firebase service is available"""
        return self._available and self.db is not None
    
    async def create_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Create user profile in Firestore"""
        if not self.is_available():
            return False
        
        try:
            profile_data.update({
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            self.db.collection('users').document(user_id).set(profile_data)
            logger.info(f"✅ User profile created for {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error creating user profile: {e}")
            return False
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        if not self.is_available():
            return None
        
        try:
            doc = self.db.collection('users').document(user_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting user profile: {e}")
            return None
    
    async def create_program(self, user_id: str, program_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create program in Firestore"""
        if not self.is_available():
            return None
        
        try:
            program_data.update({
                'user_id': user_id,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            doc_ref = self.db.collection('programs').document()
            doc_ref.set(program_data)
            
            # Return the created program with ID
            program_data['id'] = doc_ref.id
            logger.info(f"✅ Program created: {doc_ref.id}")
            return program_data
            
        except Exception as e:
            logger.error(f"❌ Error creating program: {e}")
            return None
    
    async def get_user_programs(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user programs from Firestore"""
        if not self.is_available():
            return []
        
        try:
            query = (self.db.collection('programs')
                    .where('user_id', '==', user_id)
                    .order_by('created_at', direction=firestore.Query.DESCENDING)
                    .limit(limit))
            
            docs = query.stream()
            programs = []
            
            for doc in docs:
                program = doc.to_dict()
                program['id'] = doc.id
                programs.append(program)
            
            logger.info(f"✅ Retrieved {len(programs)} programs for user {user_id}")
            return programs
            
        except Exception as e:
            logger.error(f"❌ Error getting user programs: {e}")
            return []
    
    async def create_workout(self, user_id: str, workout_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create workout in Firestore"""
        if not self.is_available():
            return None
        
        try:
            workout_data.update({
                'user_id': user_id,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            
            doc_ref = self.db.collection('workouts').document()
            doc_ref.set(workout_data)
            
            # Return the created workout with ID
            workout_data['id'] = doc_ref.id
            logger.info(f"✅ Workout created: {doc_ref.id}")
            return workout_data
            
        except Exception as e:
            logger.error(f"❌ Error creating workout: {e}")
            return None
    
    async def get_user_workouts(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user workouts from Firestore"""
        if not self.is_available():
            return []
        
        try:
            query = (self.db.collection('workouts')
                    .where('user_id', '==', user_id)
                    .order_by('created_at', direction=firestore.Query.DESCENDING)
                    .limit(limit))
            
            docs = query.stream()
            workouts = []
            
            for doc in docs:
                workout = doc.to_dict()
                workout['id'] = doc.id
                workouts.append(workout)
            
            logger.info(f"✅ Retrieved {len(workouts)} workouts for user {user_id}")
            return workouts
            
        except Exception as e:
            logger.error(f"❌ Error getting user workouts: {e}")
            return []
    
    async def migrate_anonymous_data(self, user_id: str, programs_data: List[Dict], workouts_data: List[Dict]) -> bool:
        """Migrate anonymous data to user account"""
        if not self.is_available():
            return False
        
        try:
            batch = self.db.batch()
            migrated_count = 0
            
            # Migrate programs
            for program in programs_data:
                program.update({
                    'user_id': user_id,
                    'migrated_at': firestore.SERVER_TIMESTAMP,
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                
                doc_ref = self.db.collection('programs').document()
                batch.set(doc_ref, program)
                migrated_count += 1
            
            # Migrate workouts
            for workout in workouts_data:
                workout.update({
                    'user_id': user_id,
                    'migrated_at': firestore.SERVER_TIMESTAMP,
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                
                doc_ref = self.db.collection('workouts').document()
                batch.set(doc_ref, workout)
                migrated_count += 1
            
            # Commit the batch
            batch.commit()
            
            logger.info(f"✅ Migrated {migrated_count} items for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error migrating data: {e}")
            return False

# Create global instance
firebase_service = FirebaseService()