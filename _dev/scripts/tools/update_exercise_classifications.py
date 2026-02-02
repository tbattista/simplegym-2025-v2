"""
Update Exercise Classifications from Classified CSV
Adds tier, foundational score, and tags to existing exercises in Firestore
"""

import sys
import os
import pandas as pd
import logging
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.services.exercise_service import exercise_service
from firebase_admin import firestore

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ClassificationUpdater:
    """Updates exercise classifications from CSV to Firestore"""
    
    def __init__(self, csv_path: str):
        """
        Initialize updater
        
        Args:
            csv_path: Path to classified CSV file
        """
        self.csv_path = csv_path
        self.service = exercise_service
        
        if not self.service.is_available():
            raise RuntimeError("Exercise service not available - check Firebase configuration")
    
    def load_classifications(self) -> pd.DataFrame:
        """
        Load classifications from CSV
        
        Returns:
            DataFrame with classification data
        """
        logger.info(f"Reading classified CSV: {self.csv_path}")
        
        try:
            df = pd.read_csv(self.csv_path)
            
            # Validate required columns
            required_cols = ['Exercise', 'foundationalScore', 'exerciseTier', 'isFoundational', 'classificationTags']
            missing = [col for col in required_cols if col not in df.columns]
            
            if missing:
                raise ValueError(f"Missing required columns: {missing}")
            
            logger.info(f"Loaded {len(df)} exercises from CSV")
            
            # Show tier distribution
            tier_counts = df['exerciseTier'].value_counts().sort_index()
            logger.info(f"\nTier Distribution:")
            logger.info(f"  Tier 1 (Foundation): {tier_counts.get(1, 0)} exercises ({tier_counts.get(1, 0)/len(df)*100:.1f}%)")
            logger.info(f"  Tier 2 (Standard):   {tier_counts.get(2, 0)} exercises ({tier_counts.get(2, 0)/len(df)*100:.1f}%)")
            logger.info(f"  Tier 3 (Specialized): {tier_counts.get(3, 0)} exercises ({tier_counts.get(3, 0)/len(df)*100:.1f}%)")
            
            # Show sample Tier 1 exercises
            tier1 = df[df['exerciseTier'] == 1].head(10)
            logger.info(f"\nSample Tier 1 (Foundation) Exercises:")
            for _, row in tier1.iterrows():
                logger.info(f"  - {row['Exercise']} (Score: {row['foundationalScore']})")
            
            return df
            
        except Exception as e:
            logger.error(f"Failed to load CSV: {str(e)}")
            raise
    
    def update_firestore(self, df: pd.DataFrame, dry_run: bool = False) -> Dict[str, int]:
        """
        Update Firestore with classifications
        
        Args:
            df: DataFrame with classification data
            dry_run: If True, show what would be updated without changing DB
            
        Returns:
            Dictionary with update statistics
        """
        if dry_run:
            logger.info("\n" + "="*60)
            logger.info("DRY RUN MODE - No updates will be made")
            logger.info("="*60)
            logger.info("\n✅ Dry run completed successfully!")
            logger.info("Run without --dry-run flag to apply changes to Firestore")
            return {
                'total': len(df),
                'updated': 0,
                'failed': 0,
                'not_found': 0,
                'skipped': len(df)
            }
        
        logger.info(f"\nStarting Firestore update for {len(df)} exercises...")
        
        stats = {
            'total': len(df),
            'updated': 0,
            'failed': 0,
            'not_found': 0
        }
        
        # Process in batches
        batch_size = 500
        
        for i in range(0, len(df), batch_size):
            batch_df = df.iloc[i:i+batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(df) + batch_size - 1) // batch_size
            
            logger.info(f"\nProcessing batch {batch_num}/{total_batches} ({len(batch_df)} exercises)")
            
            try:
                # Create Firestore batch
                batch = self.service.db.batch()
                batch_updates = 0
                
                for _, row in batch_df.iterrows():
                    try:
                        # Clean exercise name (remove trailing spaces)
                        exercise_name = str(row['Exercise']).strip()
                        
                        # Find exercise by name
                        exercises_ref = self.service.db.collection('global_exercises')
                        query = exercises_ref.where('name', '==', exercise_name).limit(1)
                        docs = list(query.stream())
                        
                        if not docs:
                            logger.warning(f"  ⚠️  Exercise not found: '{exercise_name}'")
                            stats['not_found'] += 1
                            continue
                        
                        doc_ref = docs[0].reference
                        
                        # Parse tags (handle NaN and convert to list)
                        tags = []
                        if pd.notna(row['classificationTags']) and row['classificationTags']:
                            tags = [t.strip() for t in str(row['classificationTags']).split(',') if t.strip()]
                        
                        # Prepare update data
                        update_data = {
                            'foundationalScore': int(row['foundationalScore']),
                            'exerciseTier': int(row['exerciseTier']),
                            'isFoundational': bool(row['isFoundational']),
                            'classificationTags': tags,
                            'updatedAt': firestore.SERVER_TIMESTAMP
                        }
                        
                        # Add to batch
                        batch.update(doc_ref, update_data)
                        batch_updates += 1
                        
                    except Exception as e:
                        logger.error(f"  ❌ Error preparing update for {row.get('Exercise', 'unknown')}: {str(e)}")
                        stats['failed'] += 1
                        continue
                
                # Commit batch
                if batch_updates > 0:
                    batch.commit()
                    stats['updated'] += batch_updates
                    logger.info(f"  ✅ Batch {batch_num} committed: {batch_updates} exercises updated")
                
            except Exception as e:
                logger.error(f"  ❌ Failed to commit batch {batch_num}: {str(e)}")
                stats['failed'] += len(batch_df)
        
        logger.info("\n" + "="*60)
        logger.info("UPDATE SUMMARY")
        logger.info(f"Total exercises:    {stats['total']}")
        logger.info(f"Successfully updated: {stats['updated']}")
        logger.info(f"Not found:          {stats['not_found']}")
        logger.info(f"Failed:             {stats['failed']}")
        logger.info("="*60)
        
        return stats
    
    def run(self, dry_run: bool = False):
        """
        Main execution method
        
        Args:
            dry_run: If True, show what would be updated without changing DB
        """
        logger.info("="*60)
        logger.info("EXERCISE CLASSIFICATION UPDATE")
        logger.info("="*60)
        
        # Load classifications
        df = self.load_classifications()
        
        # Update Firestore
        stats = self.update_firestore(df, dry_run=dry_run)
        
        return stats


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Update exercise classifications from CSV to Firestore'
    )
    parser.add_argument(
        'csv_file',
        help='Path to classified CSV file (e.g., Exercises_Classified.csv)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without changing database'
    )
    
    args = parser.parse_args()
    
    # Validate CSV file exists
    if not os.path.exists(args.csv_file):
        logger.error(f"CSV file not found: {args.csv_file}")
        sys.exit(1)
    
    try:
        # Create updater and run
        updater = ClassificationUpdater(args.csv_file)
        stats = updater.run(dry_run=args.dry_run)
        
        # Exit with error code if any failures (but not in dry-run mode)
        if not args.dry_run and (stats['failed'] > 0 or stats['not_found'] > 0):
            logger.warning(f"\n⚠️  Completed with {stats['failed']} failures and {stats['not_found']} not found")
            sys.exit(1)
        
        if args.dry_run:
            logger.info(f"\n✅ Dry run completed successfully! Ready to update {stats['total']} exercises.")
        else:
            logger.info(f"\n✅ Successfully updated {stats['updated']} exercises!")
        
    except Exception as e:
        logger.error(f"Update failed: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()