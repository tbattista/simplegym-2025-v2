"""
Migration Script: Add Popularity and Favorite Count Fields
Adds popularityScore and favoriteCount to all existing exercises in Firestore
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from firebase_admin import firestore
from backend.config.firebase_config import get_firebase_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_add_popularity_fields():
    """Add popularityScore and favoriteCount to all exercises"""
    try:
        app = get_firebase_app()
        if not app:
            logger.error("❌ Firebase not initialized")
            return False
        
        db = firestore.client(app=app)
        exercises_ref = db.collection('global_exercises')
        
        # Get all exercises
        logger.info("📡 Fetching all exercises from Firestore...")
        docs = exercises_ref.stream()
        
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for doc in docs:
            try:
                exercise_data = doc.to_dict()
                exercise_name = exercise_data.get('name', 'Unknown')
                
                # Check if fields already exist
                has_popularity = 'popularityScore' in exercise_data
                has_favorite_count = 'favoriteCount' in exercise_data
                
                if has_popularity and has_favorite_count:
                    skipped_count += 1
                    continue
                
                # Prepare update data
                update_data = {}
                
                if not has_popularity:
                    update_data['popularityScore'] = 50  # Default score
                
                if not has_favorite_count:
                    update_data['favoriteCount'] = 0  # Default count
                
                # Update document
                exercises_ref.document(doc.id).update(update_data)
                updated_count += 1
                
                if updated_count % 100 == 0:
                    logger.info(f"✅ Updated {updated_count} exercises...")
                    
            except Exception as e:
                logger.error(f"❌ Failed to update {exercise_name}: {str(e)}")
                error_count += 1
        
        logger.info("\n" + "="*60)
        logger.info("🎉 Migration Complete!")
        logger.info("="*60)
        logger.info(f"✅ Updated: {updated_count} exercises")
        logger.info(f"⏭️  Skipped: {skipped_count} exercises (already had fields)")
        logger.info(f"❌ Errors:  {error_count} exercises")
        logger.info("="*60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting migration: Add popularity fields to exercises")
    logger.info("="*60)
    
    success = asyncio.run(migrate_add_popularity_fields())
    
    if success:
        logger.info("\n✅ Migration completed successfully!")
        logger.info("You can now see popularityScore and favoriteCount in Firestore")
    else:
        logger.error("\n❌ Migration failed!")
        sys.exit(1)