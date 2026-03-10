"""
Personal Records Service for Fitness Field Notes
Handles user personal records with optimized Firestore operations
"""

import logging
import re
import traceback
from typing import List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from firebase_admin import firestore
    FIRESTORE_AVAILABLE = True
except ImportError as e:
    FIRESTORE_AVAILABLE = False
    firestore = None
    logger.error(f"Personal records service: Failed to import firestore - {str(e)}")

from ..config.firebase_config import get_firebase_app
from ..models import PersonalRecord, UserPersonalRecords


def _normalize_pr_id(pr_type: str, exercise_name: str) -> str:
    """Generate normalized PR ID from type and exercise name"""
    normalized = re.sub(r'[^a-z0-9]+', '_', exercise_name.lower()).strip('_')
    return f"{pr_type}_{normalized}"


class PersonalRecordsService:
    """
    Service for managing user personal records
    Uses single-document structure matching the favorites pattern
    """

    def __init__(self):
        if not FIRESTORE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available - Personal records service disabled")
            self.db = None
            self.available = False
            return

        try:
            self.app = get_firebase_app()
            if self.app:
                self.db = firestore.client(app=self.app)
                self.available = True
                logger.info("Personal records service initialized successfully")
            else:
                self.db = None
                self.available = False
        except Exception as e:
            logger.error(f"Failed to initialize Personal records service: {str(e)}")
            self.db = None
            self.available = False

    def is_available(self) -> bool:
        return self.available and self.db is not None

    def _get_doc_ref(self, user_id: str):
        return (self.db.collection('users')
                .document(user_id)
                .collection('data')
                .document('personal_records'))

    def get_user_personal_records(self, user_id: str) -> UserPersonalRecords:
        """Get all personal records for a user"""
        if not self.is_available():
            return UserPersonalRecords()

        try:
            doc = self._get_doc_ref(user_id).get()

            if doc.exists:
                data = doc.to_dict()
                records = {}
                records_data = data.get('records', {})

                for pr_id, pr_data in records_data.items():
                    try:
                        records[pr_id] = PersonalRecord(**pr_data)
                    except Exception as e:
                        logger.warning(f"Failed to parse personal record {pr_id}: {str(e)}")
                        continue

                return UserPersonalRecords(
                    recordIds=data.get('recordIds', []),
                    records=records,
                    lastUpdated=data.get('lastUpdated', datetime.now()),
                    count=data.get('count', len(records))
                )
            else:
                return UserPersonalRecords()

        except Exception as e:
            logger.error(f"Error getting personal records for user {user_id}: {str(e)}")
            return UserPersonalRecords()

    def mark_personal_record(self, user_id: str, pr_data: dict) -> dict:
        """
        Mark a personal record. Replaces existing PR for the same exercise+type.

        Returns dict with 'success', 'pr_id', 'replaced' keys.
        """
        if not self.is_available():
            return {'success': False, 'error': 'Service not available'}

        try:
            pr_id = _normalize_pr_id(pr_data['pr_type'], pr_data['exercise_name'])

            # Use session_date as marked_at if provided (reflects when PR was first achieved)
            session_date = pr_data.get('session_date')
            if session_date and isinstance(session_date, str):
                try:
                    marked_at = datetime.fromisoformat(session_date.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    marked_at = datetime.now()
            else:
                marked_at = datetime.now()

            record = PersonalRecord(
                id=pr_id,
                pr_type=pr_data['pr_type'],
                exercise_name=pr_data['exercise_name'],
                activity_type=pr_data.get('activity_type'),
                value=pr_data['value'],
                value_unit=pr_data.get('value_unit', 'lbs'),
                session_id=pr_data.get('session_id'),
                session_date=session_date,
                workout_name=pr_data.get('workout_name'),
                sets_reps=pr_data.get('sets_reps'),
                marked_at=marked_at,
                is_manual=True
            )

            doc_ref = self._get_doc_ref(user_id)
            current_doc = doc_ref.get()

            replaced = False

            if current_doc.exists:
                existing_data = current_doc.to_dict()
                existing_ids = existing_data.get('recordIds', [])
                replaced = pr_id in existing_ids

                update_data = {
                    f'records.{pr_id}': record.model_dump(),
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                }

                if not replaced:
                    update_data['recordIds'] = firestore.ArrayUnion([pr_id])
                    update_data['count'] = firestore.Increment(1)

                doc_ref.update(update_data)
            else:
                doc_ref.set({
                    'recordIds': [pr_id],
                    'records': {
                        pr_id: record.model_dump()
                    },
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                    'count': 1
                })

            logger.info(f"{'Replaced' if replaced else 'Marked'} PR: {pr_id} for user {user_id}")
            return {'success': True, 'pr_id': pr_id, 'replaced': replaced}

        except Exception as e:
            logger.error(f"Error marking personal record for user {user_id}: {str(e)}")
            return {'success': False, 'error': str(e)}

    def remove_personal_record(self, user_id: str, pr_id: str) -> bool:
        """Remove a personal record"""
        if not self.is_available():
            return False

        try:
            doc_ref = self._get_doc_ref(user_id)

            doc_ref.update({
                'recordIds': firestore.ArrayRemove([pr_id]),
                f'records.{pr_id}': firestore.DELETE_FIELD,
                'lastUpdated': firestore.SERVER_TIMESTAMP,
                'count': firestore.Increment(-1)
            })

            logger.info(f"Removed PR: {pr_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error removing personal record for user {user_id}: {str(e)}")
            return False

    def update_personal_record_value(self, user_id: str, pr_id: str, update_data: dict) -> bool:
        """Update a personal record's value (for manual edits and auto-updates)"""
        if not self.is_available():
            return False

        try:
            doc_ref = self._get_doc_ref(user_id)
            doc = doc_ref.get()

            if not doc.exists:
                return False

            data = doc.to_dict()
            if pr_id not in data.get('records', {}):
                return False

            # Build update fields
            updates = {
                f'records.{pr_id}.value': update_data['value'],
                f'records.{pr_id}.marked_at': datetime.now().isoformat(),
                'lastUpdated': firestore.SERVER_TIMESTAMP,
            }
            if 'value_unit' in update_data:
                updates[f'records.{pr_id}.value_unit'] = update_data['value_unit']
            if 'session_id' in update_data:
                updates[f'records.{pr_id}.session_id'] = update_data['session_id']
            if 'session_date' in update_data:
                updates[f'records.{pr_id}.session_date'] = update_data['session_date']

            doc_ref.update(updates)
            logger.info(f"Updated PR value: {pr_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating personal record for user {user_id}: {str(e)}")
            return False

    def bulk_check_personal_records(self, user_id: str, exercise_names: List[str]) -> Dict[str, dict]:
        """
        Check PR status for multiple exercise names.
        Returns dict of exercise_name -> {has_pr: bool, pr_id: str, pr_type: str, value: str, value_unit: str}
        """
        prs = self.get_user_personal_records(user_id)
        result = {}

        # Build reverse lookup: exercise_name -> list of PRs
        name_to_prs = {}
        for pr_id, pr in prs.records.items():
            name = pr.exercise_name.lower()
            if name not in name_to_prs:
                name_to_prs[name] = []
            name_to_prs[name].append(pr)

        for name in exercise_names:
            matching = name_to_prs.get(name.lower(), [])
            if matching:
                # Return info about all PR types for this exercise
                result[name] = {
                    'has_pr': True,
                    'prs': [{
                        'pr_id': p.id,
                        'pr_type': p.pr_type,
                        'value': p.value,
                        'value_unit': p.value_unit,
                        'session_id': p.session_id
                    } for p in matching]
                }
            else:
                result[name] = {'has_pr': False, 'prs': []}

        return result


# Global service instance
personal_records_service = PersonalRecordsService()
