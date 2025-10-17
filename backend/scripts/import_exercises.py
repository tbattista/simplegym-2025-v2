"""
Exercise Database Import Script
Parses CSV file and imports exercises into Firestore global_exercises collection
"""

import sys
import os
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.services.exercise_service import exercise_service
from backend.models import Exercise
from firebase_admin import firestore

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ExerciseImporter:
    """Handles importing exercises from CSV to Firestore"""
    
    # CSV column mapping to model fields
    COLUMN_MAPPING = {
        'Exercise': 'name',
        'Short YouTube Demonstration': 'shortVideoUrl',
        'In-Depth YouTube Explanation': 'detailedVideoUrl',
        'Difficulty Level': 'difficultyLevel',
        'Target Muscle Group ': 'targetMuscleGroup',  # Note: space in CSV
        'Prime Mover Muscle': 'primeMoverMuscle',
        'Secondary Muscle': 'secondaryMuscle',
        'Tertiary Muscle': 'tertiaryMuscle',
        'Primary Equipment ': 'primaryEquipment',  # Note: space in CSV
        '# Primary Items': 'primaryEquipmentCount',
        'Secondary Equipment': 'secondaryEquipment',
        '# Secondary Items': 'secondaryEquipmentCount',
        'Posture': 'posture',
        'Single or Double Arm': 'armType',
        'Continuous or Alternating Arms ': 'armPattern',  # Note: space in CSV
        'Grip': 'grip',
        'Load Position (Ending)': 'loadPosition',
        'Foot Elevation': 'footElevation',
        'Combination Exercises': 'combinationExercise',
        'Movement Pattern #1': 'movementPattern1',
        'Movement Pattern #2': 'movementPattern2',
        'Movement Pattern #3': 'movementPattern3',
        'Plane Of Motion #1': 'planeOfMotion1',
        'Plane Of Motion #2': 'planeOfMotion2',
        'Plane Of Motion #3': 'planeOfMotion3',
        'Body Region': 'bodyRegion',
        'Force Type': 'forceType',
        'Mechanics': 'mechanics',
        'Laterality': 'laterality',
        'Primary Exercise Classification': 'classification'
    }
    
    def __init__(self, csv_path: str, batch_size: int = 500):
        """
        Initialize importer
        
        Args:
            csv_path: Path to CSV file
            batch_size: Number of exercises to upload per batch
        """
        self.csv_path = csv_path
        self.batch_size = batch_size
        self.service = exercise_service
        
        if not self.service.is_available():
            raise RuntimeError("Exercise service not available - check Firebase configuration")
    
    def _clean_value(self, value: Any) -> Any:
        """
        Clean CSV value
        
        Args:
            value: Raw value from CSV
            
        Returns:
            Cleaned value or None
        """
        if pd.isna(value):
            return None
        
        if isinstance(value, str):
            value = value.strip()
            # Replace placeholder text with None
            if value in ['', 'None', 'Video Demonstration', 'Video Explanation']:
                return None
        
        return value
    
    def _generate_search_tokens(self, name: str) -> List[str]:
        """
        Generate search tokens from exercise name
        
        Args:
            name: Exercise name
            
        Returns:
            List of lowercase tokens
        """
        # Split by spaces and common separators
        tokens = name.lower().replace('-', ' ').replace('/', ' ').split()
        
        # Remove common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'with', 'to', 'for'}
        tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
        
        return tokens
    
    def _row_to_exercise_dict(self, row: pd.Series) -> Dict[str, Any]:
        """
        Convert CSV row to exercise dictionary
        
        Args:
            row: Pandas Series representing a CSV row
            
        Returns:
            Dictionary with exercise data
        """
        exercise_data = {}
        
        # Map CSV columns to model fields
        for csv_col, model_field in self.COLUMN_MAPPING.items():
            if csv_col in row.index:
                value = self._clean_value(row[csv_col])
                exercise_data[model_field] = value
        
        # Generate search tokens from name
        if 'name' in exercise_data and exercise_data['name']:
            exercise_data['nameSearchTokens'] = self._generate_search_tokens(exercise_data['name'])
        else:
            exercise_data['nameSearchTokens'] = []
        
        # Set metadata
        exercise_data['isGlobal'] = True
        exercise_data['createdAt'] = datetime.now()
        exercise_data['updatedAt'] = datetime.now()
        
        return exercise_data
    
    def parse_csv(self) -> List[Dict[str, Any]]:
        """
        Parse CSV file and return list of exercise dictionaries
        
        Returns:
            List of exercise data dictionaries
        """
        logger.info(f"Reading CSV file: {self.csv_path}")
        
        try:
            # Read CSV with pandas
            df = pd.read_csv(self.csv_path)
            logger.info(f"Found {len(df)} exercises in CSV")
            
            # Convert each row to exercise dictionary
            exercises = []
            for idx, row in df.iterrows():
                try:
                    exercise_data = self._row_to_exercise_dict(row)
                    
                    # Validate required fields
                    if not exercise_data.get('name'):
                        logger.warning(f"Row {idx + 2} missing exercise name, skipping")
                        continue
                    
                    exercises.append(exercise_data)
                    
                except Exception as e:
                    logger.error(f"Error parsing row {idx + 2}: {str(e)}")
                    continue
            
            logger.info(f"Successfully parsed {len(exercises)} exercises")
            return exercises
            
        except Exception as e:
            logger.error(f"Failed to parse CSV: {str(e)}")
            raise
    
    def upload_to_firestore(
        self,
        exercises: List[Dict[str, Any]],
        dry_run: bool = False
    ) -> Dict[str, int]:
        """
        Upload exercises to Firestore in batches
        
        Args:
            exercises: List of exercise data dictionaries
            dry_run: If True, don't actually upload (for testing)
            
        Returns:
            Dictionary with upload statistics
        """
        if dry_run:
            logger.info("DRY RUN MODE - No data will be uploaded")
            return {
                'total': len(exercises),
                'uploaded': 0,
                'failed': 0,
                'skipped': len(exercises)
            }
        
        logger.info(f"Starting upload of {len(exercises)} exercises...")
        
        stats = {
            'total': len(exercises),
            'uploaded': 0,
            'failed': 0,
            'skipped': 0
        }
        
        # Process in batches
        for i in range(0, len(exercises), self.batch_size):
            batch_exercises = exercises[i:i + self.batch_size]
            batch_num = (i // self.batch_size) + 1
            total_batches = (len(exercises) + self.batch_size - 1) // self.batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch_exercises)} exercises)")
            
            try:
                # Create Firestore batch
                batch = self.service.db.batch()
                
                for exercise_data in batch_exercises:
                    try:
                        # Create Exercise model to validate data
                        exercise = Exercise(**exercise_data)
                        
                        # Create document reference
                        doc_ref = self.service.db.collection('global_exercises').document(exercise.id)
                        
                        # Convert to dict for Firestore
                        firestore_data = exercise.dict()
                        firestore_data['createdAt'] = firestore.SERVER_TIMESTAMP
                        firestore_data['updatedAt'] = firestore.SERVER_TIMESTAMP
                        
                        # Add to batch
                        batch.set(doc_ref, firestore_data)
                        stats['uploaded'] += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to prepare exercise '{exercise_data.get('name', 'unknown')}': {str(e)}")
                        stats['failed'] += 1
                        continue
                
                # Commit batch
                batch.commit()
                logger.info(f"Batch {batch_num} committed successfully")
                
            except Exception as e:
                logger.error(f"Failed to commit batch {batch_num}: {str(e)}")
                stats['failed'] += len(batch_exercises)
        
        logger.info(f"Upload complete: {stats['uploaded']} uploaded, {stats['failed']} failed")
        return stats
    
    def import_exercises(self, dry_run: bool = False) -> Dict[str, int]:
        """
        Main import method - parse CSV and upload to Firestore
        
        Args:
            dry_run: If True, parse but don't upload
            
        Returns:
            Dictionary with import statistics
        """
        logger.info("=" * 60)
        logger.info("EXERCISE DATABASE IMPORT")
        logger.info("=" * 60)
        
        # Parse CSV
        exercises = self.parse_csv()
        
        if not exercises:
            logger.error("No exercises to import")
            return {'total': 0, 'uploaded': 0, 'failed': 0, 'skipped': 0}
        
        # Upload to Firestore
        stats = self.upload_to_firestore(exercises, dry_run=dry_run)
        
        logger.info("=" * 60)
        logger.info("IMPORT SUMMARY")
        logger.info(f"Total exercises: {stats['total']}")
        logger.info(f"Successfully uploaded: {stats['uploaded']}")
        logger.info(f"Failed: {stats['failed']}")
        logger.info(f"Skipped: {stats['skipped']}")
        logger.info("=" * 60)
        
        return stats


def main():
    """Main entry point for script"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Import exercises from CSV to Firestore')
    parser.add_argument(
        'csv_file',
        help='Path to CSV file (e.g., Exercises.csv)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Parse CSV but don\'t upload to Firestore'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=500,
        help='Number of exercises per batch (default: 500)'
    )
    
    args = parser.parse_args()
    
    # Validate CSV file exists
    if not os.path.exists(args.csv_file):
        logger.error(f"CSV file not found: {args.csv_file}")
        sys.exit(1)
    
    try:
        # Create importer and run
        importer = ExerciseImporter(args.csv_file, batch_size=args.batch_size)
        stats = importer.import_exercises(dry_run=args.dry_run)
        
        # Exit with error code if any failures
        if stats['failed'] > 0:
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()