"""
Exercise Deletion Script
Permanently deletes exercises from the exercises_to_delete.json file.
Use --dry-run flag to preview without actually deleting.
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore


def load_exercises_to_delete(file_path: Path) -> list:
    """Load the list of exercises to delete from JSON file"""
    if not file_path.exists():
        print(f"Error: {file_path} not found")
        print("Run analyze_exercises.py first to generate the delete list")
        return []

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    return data.get('exercises', [])


def delete_exercises(exercises: list, dry_run: bool = True):
    """Delete exercises from Firestore"""
    print("\n" + "="*80)
    print("EXERCISE DELETION" + (" (DRY RUN)" if dry_run else ""))
    print("="*80)

    if dry_run:
        print("\n*** DRY RUN MODE - No changes will be made ***\n")

    # Initialize Firebase
    app = get_firebase_app()
    if not app:
        print("Failed to initialize Firebase")
        return False

    db = firestore.client(app=app)
    print("Connected to Firestore\n")

    total = len(exercises)
    print(f"Exercises to delete: {total}\n")

    if total == 0:
        print("No exercises to delete")
        return True

    # Confirm before proceeding (unless dry run)
    if not dry_run:
        print("="*80)
        print("WARNING: This will PERMANENTLY delete these exercises!")
        print("="*80)
        print("\nFirst 10 exercises to be deleted:")
        for i, ex in enumerate(exercises[:10], 1):
            print(f"  {i}. {ex['name']}")
        if total > 10:
            print(f"  ... and {total - 10} more")

        confirm = input(f"\nType 'DELETE {total}' to confirm deletion: ")
        if confirm != f"DELETE {total}":
            print("Deletion cancelled")
            return False

    # Delete in batches (Firestore limit is 500 per batch)
    batch_size = 500
    deleted_count = 0
    failed = []
    deletion_log = []

    for i in range(0, total, batch_size):
        batch_exercises = exercises[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"\nProcessing batch {batch_num}/{total_batches} ({len(batch_exercises)} exercises)...")

        if dry_run:
            # Just log what would be deleted
            for ex in batch_exercises:
                print(f"  [DRY RUN] Would delete: {ex['name']} (ID: {ex['id']})")
                deletion_log.append({
                    'id': ex['id'],
                    'name': ex['name'],
                    'action': 'would_delete',
                    'timestamp': datetime.now().isoformat()
                })
            deleted_count += len(batch_exercises)
        else:
            # Actually delete using batch write
            batch = db.batch()

            for ex in batch_exercises:
                try:
                    doc_ref = db.collection('global_exercises').document(ex['id'])
                    batch.delete(doc_ref)
                    deletion_log.append({
                        'id': ex['id'],
                        'name': ex['name'],
                        'action': 'deleted',
                        'timestamp': datetime.now().isoformat()
                    })
                except Exception as e:
                    print(f"  Error preparing delete for {ex['name']}: {e}")
                    failed.append({'exercise': ex, 'error': str(e)})

            try:
                batch.commit()
                deleted_count += len(batch_exercises) - len([f for f in failed if f['exercise'] in batch_exercises])
                print(f"  Batch {batch_num} committed successfully")
            except Exception as e:
                print(f"  Error committing batch {batch_num}: {e}")
                for ex in batch_exercises:
                    failed.append({'exercise': ex, 'error': str(e)})

    # Update metadata
    if not dry_run and deleted_count > 0:
        print("\nUpdating exercises_metadata...")
        try:
            # Get current count
            exercises_ref = db.collection('global_exercises')
            remaining = len(list(exercises_ref.stream()))

            # Update metadata
            metadata_ref = db.collection('exercises_metadata').document('global')
            metadata_ref.set({
                'exerciseCount': remaining,
                'lastUpdated': datetime.now().isoformat(),
                'lastCleanup': {
                    'date': datetime.now().isoformat(),
                    'deletedCount': deleted_count
                }
            }, merge=True)
            print(f"  Metadata updated: {remaining} exercises remaining")
        except Exception as e:
            print(f"  Warning: Failed to update metadata: {e}")

    # Save deletion log
    output_dir = Path(__file__).parent / "analysis_results"
    log_file = output_dir / ("deletion_log_dry_run.json" if dry_run else "deletion_log.json")

    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump({
            'dry_run': dry_run,
            'timestamp': datetime.now().isoformat(),
            'total_processed': total,
            'deleted_count': deleted_count,
            'failed_count': len(failed),
            'deletions': deletion_log,
            'failures': failed
        }, f, indent=2)

    print(f"\nDeletion log saved: {log_file}")

    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total exercises processed: {total}")
    print(f"Successfully {'would delete' if dry_run else 'deleted'}: {deleted_count}")
    if failed:
        print(f"Failed: {len(failed)}")

    if dry_run:
        print("\n*** This was a DRY RUN - No changes were made ***")
        print("Run without --dry-run to execute deletion")

    return len(failed) == 0


def main():
    parser = argparse.ArgumentParser(description='Delete exercises from database')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview deletion without actually deleting')
    parser.add_argument('--file', type=str, default=None,
                        help='Path to exercises_to_delete.json')

    args = parser.parse_args()

    # Determine file path
    if args.file:
        file_path = Path(args.file)
    else:
        file_path = Path(__file__).parent / "analysis_results" / "exercises_to_delete.json"

    print(f"Loading exercises from: {file_path}")

    # Load exercises
    exercises = load_exercises_to_delete(file_path)
    if not exercises:
        return

    # Delete exercises
    success = delete_exercises(exercises, dry_run=args.dry_run)

    if success:
        print("\nDeletion process completed successfully")
    else:
        print("\nDeletion process completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
