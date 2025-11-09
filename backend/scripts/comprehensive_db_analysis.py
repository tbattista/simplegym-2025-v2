"""
Comprehensive Firestore Database Analysis Script
Pulls complete database structure and performs detailed analysis
"""

import sys
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)
print(f"Loading .env from: {env_path}")
print(f".env exists: {env_path.exists()}")

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore

class DatabaseAnalyzer:
    """Comprehensive database analyzer"""
    
    def __init__(self):
        self.db = None
        self.app = None
        self.analysis_results = {
            "timestamp": datetime.now().isoformat(),
            "users": [],
            "global_exercises": [],
            "duplicates": {
                "users": [],
                "workouts": [],
                "programs": [],
                "exercises": []
            },
            "weight_fields": [],
            "data_quality_issues": [],
            "statistics": {},
            "recommendations": []
        }
        
    def initialize(self):
        """Initialize Firebase connection"""
        print("\n" + "="*80)
        print("COMPREHENSIVE DATABASE ANALYSIS")
        print("="*80)
        
        self.app = get_firebase_app()
        if not self.app:
            print("❌ Failed to initialize Firebase")
            return False
        
        self.db = firestore.client(app=self.app)
        print("✅ Connected to Firestore")
        return True
    
    def analyze_users_collection(self):
        """Analyze all users and their subcollections"""
        print("\n" + "="*80)
        print("ANALYZING USERS COLLECTION")
        print("="*80)
        
        users_ref = self.db.collection('users')
        users = list(users_ref.stream())
        
        print(f"📊 Found {len(users)} users")
        
        user_ids_seen = set()
        duplicate_user_ids = []
        
        for user_doc in users:
            user_id = user_doc.id
            user_data = user_doc.to_dict()
            
            # Check for duplicate user IDs
            if user_id in user_ids_seen:
                duplicate_user_ids.append(user_id)
                print(f"⚠️  DUPLICATE USER ID FOUND: {user_id}")
            user_ids_seen.add(user_id)
            
            print(f"\n👤 Analyzing user: {user_id}")
            
            user_analysis = {
                "user_id": user_id,
                "user_data": self._serialize_doc(user_data),
                "workouts": [],
                "programs": [],
                "custom_exercises": [],
                "data": [],
                "workout_sessions": [],
                "exercise_history": []
            }
            
            # Analyze workouts subcollection
            workouts = self._analyze_subcollection(user_doc.reference, 'workouts')
            user_analysis["workouts"] = workouts
            print(f"  📋 Workouts: {len(workouts)}")
            
            # Analyze programs subcollection
            programs = self._analyze_subcollection(user_doc.reference, 'programs')
            user_analysis["programs"] = programs
            print(f"  📚 Programs: {len(programs)}")
            
            # Analyze custom_exercises subcollection
            custom_exercises = self._analyze_subcollection(user_doc.reference, 'custom_exercises')
            user_analysis["custom_exercises"] = custom_exercises
            print(f"  🏋️ Custom Exercises: {len(custom_exercises)}")
            
            # Analyze data subcollection
            data = self._analyze_subcollection(user_doc.reference, 'data')
            user_analysis["data"] = data
            print(f"  📊 Data: {len(data)}")
            
            # Check for weight logging collections
            workout_sessions = self._analyze_subcollection(user_doc.reference, 'workout_sessions')
            user_analysis["workout_sessions"] = workout_sessions
            if workout_sessions:
                print(f"  ✅ Workout Sessions: {len(workout_sessions)}")
            
            exercise_history = self._analyze_subcollection(user_doc.reference, 'exercise_history')
            user_analysis["exercise_history"] = exercise_history
            if exercise_history:
                print(f"  ✅ Exercise History: {len(exercise_history)}")
            
            # Check for weight fields in workouts
            self._check_weight_fields_in_workouts(user_id, workouts)
            
            self.analysis_results["users"].append(user_analysis)
        
        # Store duplicate information
        if duplicate_user_ids:
            self.analysis_results["duplicates"]["users"] = duplicate_user_ids
            self.analysis_results["data_quality_issues"].append({
                "type": "duplicate_user_ids",
                "severity": "HIGH",
                "count": len(duplicate_user_ids),
                "user_ids": duplicate_user_ids,
                "description": "Multiple user documents with the same ID found"
            })
        
        return len(users)
    
    def _analyze_subcollection(self, parent_ref, collection_name: str) -> List[Dict]:
        """Analyze a subcollection"""
        try:
            coll_ref = parent_ref.collection(collection_name)
            docs = list(coll_ref.stream())
            
            results = []
            for doc in docs:
                doc_data = doc.to_dict()
                results.append({
                    "id": doc.id,
                    "data": self._serialize_doc(doc_data)
                })
            
            return results
        except Exception as e:
            print(f"  ⚠️  Error analyzing {collection_name}: {e}")
            return []
    
    def _check_weight_fields_in_workouts(self, user_id: str, workouts: List[Dict]):
        """Check for weight-related fields in workout templates"""
        for workout in workouts:
            workout_data = workout.get("data", {})
            
            # Check exercise_groups for weight fields
            exercise_groups = workout_data.get("exercise_groups", [])
            for group in exercise_groups:
                if isinstance(group, dict):
                    # Check for any weight-related keys
                    weight_keys = [k for k in group.keys() if 'weight' in k.lower()]
                    if weight_keys:
                        self.analysis_results["weight_fields"].append({
                            "location": f"users/{user_id}/workouts/{workout['id']}/exercise_groups",
                            "fields": weight_keys,
                            "sample_data": {k: group.get(k) for k in weight_keys}
                        })
    
    def analyze_global_exercises(self):
        """Analyze global exercises collection"""
        print("\n" + "="*80)
        print("ANALYZING GLOBAL EXERCISES")
        print("="*80)
        
        exercises_ref = self.db.collection('global_exercises')
        exercises = list(exercises_ref.stream())
        
        print(f"🏋️ Found {len(exercises)} global exercises")
        
        exercise_names_seen = {}
        duplicate_exercises = []
        
        for ex_doc in exercises:
            ex_data = ex_doc.to_dict()
            ex_name = ex_data.get('name', 'Unknown')
            
            # Check for duplicate names
            if ex_name in exercise_names_seen:
                duplicate_exercises.append({
                    "name": ex_name,
                    "ids": [exercise_names_seen[ex_name], ex_doc.id]
                })
                print(f"⚠️  DUPLICATE EXERCISE NAME: {ex_name}")
            else:
                exercise_names_seen[ex_name] = ex_doc.id
            
            self.analysis_results["global_exercises"].append({
                "id": ex_doc.id,
                "name": ex_name,
                "data": self._serialize_doc(ex_data)
            })
        
        if duplicate_exercises:
            self.analysis_results["duplicates"]["exercises"] = duplicate_exercises
        
        return len(exercises)
    
    def check_for_duplicates(self):
        """Check for duplicate IDs across collections"""
        print("\n" + "="*80)
        print("CHECKING FOR DUPLICATES")
        print("="*80)
        
        # Check workout IDs across all users
        workout_ids = defaultdict(list)
        for user in self.analysis_results["users"]:
            for workout in user["workouts"]:
                workout_ids[workout["id"]].append(user["user_id"])
        
        duplicate_workouts = {wid: users for wid, users in workout_ids.items() if len(users) > 1}
        if duplicate_workouts:
            print(f"⚠️  Found {len(duplicate_workouts)} duplicate workout IDs across users")
            self.analysis_results["duplicates"]["workouts"] = duplicate_workouts
        
        # Check program IDs across all users
        program_ids = defaultdict(list)
        for user in self.analysis_results["users"]:
            for program in user["programs"]:
                program_ids[program["id"]].append(user["user_id"])
        
        duplicate_programs = {pid: users for pid, users in program_ids.items() if len(users) > 1}
        if duplicate_programs:
            print(f"⚠️  Found {len(duplicate_programs)} duplicate program IDs across users")
            self.analysis_results["duplicates"]["programs"] = duplicate_programs
    
    def analyze_data_quality(self):
        """Analyze data quality and consistency"""
        print("\n" + "="*80)
        print("ANALYZING DATA QUALITY")
        print("="*80)
        
        issues = []
        
        # Check for missing required fields in workouts
        for user in self.analysis_results["users"]:
            for workout in user["workouts"]:
                workout_data = workout.get("data", {})
                required_fields = ["name", "exercise_groups"]
                missing = [f for f in required_fields if f not in workout_data]
                if missing:
                    issues.append({
                        "type": "missing_required_fields",
                        "severity": "MEDIUM",
                        "location": f"users/{user['user_id']}/workouts/{workout['id']}",
                        "missing_fields": missing
                    })
        
        # Check for weight field type consistency
        weight_field_types = defaultdict(set)
        for weight_field in self.analysis_results["weight_fields"]:
            for field_name, value in weight_field.get("sample_data", {}).items():
                weight_field_types[field_name].add(type(value).__name__)
        
        for field_name, types in weight_field_types.items():
            if len(types) > 1:
                issues.append({
                    "type": "inconsistent_field_types",
                    "severity": "HIGH",
                    "field": field_name,
                    "types_found": list(types),
                    "description": f"Weight field '{field_name}' has inconsistent types: {types}"
                })
        
        self.analysis_results["data_quality_issues"].extend(issues)
        
        if issues:
            print(f"⚠️  Found {len(issues)} data quality issues")
        else:
            print("✅ No data quality issues found")
    
    def generate_statistics(self):
        """Generate database statistics"""
        print("\n" + "="*80)
        print("GENERATING STATISTICS")
        print("="*80)
        
        stats = {
            "total_users": len(self.analysis_results["users"]),
            "total_global_exercises": len(self.analysis_results["global_exercises"]),
            "total_workouts": sum(len(u["workouts"]) for u in self.analysis_results["users"]),
            "total_programs": sum(len(u["programs"]) for u in self.analysis_results["users"]),
            "total_custom_exercises": sum(len(u["custom_exercises"]) for u in self.analysis_results["users"]),
            "users_with_workout_sessions": sum(1 for u in self.analysis_results["users"] if u["workout_sessions"]),
            "users_with_exercise_history": sum(1 for u in self.analysis_results["users"] if u["exercise_history"]),
            "weight_fields_found": len(self.analysis_results["weight_fields"]),
            "duplicate_users": len(self.analysis_results["duplicates"]["users"]),
            "duplicate_workouts": len(self.analysis_results["duplicates"]["workouts"]),
            "duplicate_programs": len(self.analysis_results["duplicates"]["programs"]),
            "duplicate_exercises": len(self.analysis_results["duplicates"]["exercises"]),
            "data_quality_issues": len(self.analysis_results["data_quality_issues"])
        }
        
        self.analysis_results["statistics"] = stats
        
        print(f"📊 Total Users: {stats['total_users']}")
        print(f"📊 Total Workouts: {stats['total_workouts']}")
        print(f"📊 Total Programs: {stats['total_programs']}")
        print(f"📊 Global Exercises: {stats['total_global_exercises']}")
        print(f"📊 Weight Fields Found: {stats['weight_fields_found']}")
        print(f"⚠️  Duplicate Users: {stats['duplicate_users']}")
        print(f"⚠️  Data Quality Issues: {stats['data_quality_issues']}")
    
    def generate_recommendations(self):
        """Generate optimization recommendations"""
        print("\n" + "="*80)
        print("GENERATING RECOMMENDATIONS")
        print("="*80)
        
        recommendations = []
        
        # Check if weight logging is implemented
        if self.analysis_results["statistics"]["users_with_workout_sessions"] == 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "Feature Implementation",
                "title": "Implement Weight Logging Collections",
                "description": "No workout_sessions or exercise_history collections found. Implement the weight logging architecture as defined in WEIGHT_LOGGING_DATABASE_ARCHITECTURE.md",
                "action": "Create workout_sessions and exercise_history subcollections for users"
            })
        
        # Check for duplicate users
        if self.analysis_results["duplicates"]["users"]:
            recommendations.append({
                "priority": "CRITICAL",
                "category": "Data Integrity",
                "title": "Resolve Duplicate User IDs",
                "description": f"Found {len(self.analysis_results['duplicates']['users'])} duplicate user IDs",
                "action": "Investigate and merge or remove duplicate user documents"
            })
        
        # Check for weight field inconsistencies
        if self.analysis_results["weight_fields"]:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Data Structure",
                "title": "Standardize Weight Field Storage",
                "description": "Weight fields found in workout templates. Ensure consistent storage as numbers with separate unit field",
                "action": "Review weight field types and migrate to number type if stored as strings"
            })
        
        # Check for missing indexes
        if self.analysis_results["statistics"]["total_workouts"] > 10:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Performance",
                "title": "Add Composite Indexes",
                "description": "Add indexes for common queries to improve performance",
                "action": "Create composite indexes for workout_id + completed_at queries"
            })
        
        self.analysis_results["recommendations"] = recommendations
        
        for rec in recommendations:
            print(f"\n{rec['priority']}: {rec['title']}")
            print(f"  {rec['description']}")
    
    def _serialize_doc(self, data: Any) -> Any:
        """Serialize Firestore document data to JSON-compatible format"""
        if data is None:
            return None
        elif isinstance(data, dict):
            return {k: self._serialize_doc(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._serialize_doc(item) for item in data]
        elif hasattr(data, 'isoformat'):  # datetime objects
            return data.isoformat()
        else:
            return data
    
    def save_results(self, output_dir: Path):
        """Save analysis results to files"""
        print("\n" + "="*80)
        print("SAVING RESULTS")
        print("="*80)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Complete database dump
        dump_file = output_dir / "db_complete_dump.json"
        with open(dump_file, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results, f, indent=2, default=str)
        print(f"✅ Complete dump: {dump_file}")
        
        # 2. Issues summary
        issues_file = output_dir / "db_issues_found.json"
        with open(issues_file, 'w', encoding='utf-8') as f:
            json.dump({
                "duplicates": self.analysis_results["duplicates"],
                "data_quality_issues": self.analysis_results["data_quality_issues"],
                "weight_fields": self.analysis_results["weight_fields"]
            }, f, indent=2, default=str)
        print(f"✅ Issues summary: {issues_file}")
        
        # 3. Statistics
        stats_file = output_dir / "db_statistics.json"
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results["statistics"], f, indent=2)
        print(f"✅ Statistics: {stats_file}")
        
        # 4. Recommendations
        rec_file = output_dir / "db_recommendations.json"
        with open(rec_file, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_results["recommendations"], f, indent=2)
        print(f"✅ Recommendations: {rec_file}")
        
        # 5. Users CSV
        self._save_users_csv(output_dir)
        
        # 6. Markdown report
        self._generate_markdown_report(output_dir)
    
    def _save_users_csv(self, output_dir: Path):
        """Save users list as CSV"""
        csv_file = output_dir / "users_list.csv"
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['User ID', 'Workouts', 'Programs', 'Custom Exercises', 'Has Sessions', 'Has History'])
            
            for user in self.analysis_results["users"]:
                writer.writerow([
                    user["user_id"],
                    len(user["workouts"]),
                    len(user["programs"]),
                    len(user["custom_exercises"]),
                    'Yes' if user["workout_sessions"] else 'No',
                    'Yes' if user["exercise_history"] else 'No'
                ])
        
        print(f"✅ Users CSV: {csv_file}")
    
    def _generate_markdown_report(self, output_dir: Path):
        """Generate comprehensive markdown report"""
        report_file = output_dir / "db_analysis_report.md"
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("# Comprehensive Database Analysis Report\n\n")
            f.write(f"**Generated:** {self.analysis_results['timestamp']}\n\n")
            
            # Executive Summary
            f.write("## Executive Summary\n\n")
            stats = self.analysis_results["statistics"]
            f.write(f"- **Total Users:** {stats['total_users']}\n")
            f.write(f"- **Total Workouts:** {stats['total_workouts']}\n")
            f.write(f"- **Total Programs:** {stats['total_programs']}\n")
            f.write(f"- **Global Exercises:** {stats['total_global_exercises']}\n")
            f.write(f"- **Weight Fields Found:** {stats['weight_fields_found']}\n")
            f.write(f"- **Data Quality Issues:** {stats['data_quality_issues']}\n\n")
            
            # Critical Issues
            if stats['duplicate_users'] > 0 or stats['data_quality_issues'] > 0:
                f.write("## ⚠️ Critical Issues\n\n")
                
                if stats['duplicate_users'] > 0:
                    f.write(f"### Duplicate User IDs ({stats['duplicate_users']})\n\n")
                    for user_id in self.analysis_results["duplicates"]["users"]:
                        f.write(f"- `{user_id}`\n")
                    f.write("\n")
                
                if self.analysis_results["data_quality_issues"]:
                    f.write("### Data Quality Issues\n\n")
                    for issue in self.analysis_results["data_quality_issues"]:
                        f.write(f"**{issue['severity']}**: {issue.get('description', issue['type'])}\n\n")
            
            # Weight Handling Analysis
            f.write("## Weight Handling Analysis\n\n")
            if self.analysis_results["weight_fields"]:
                f.write(f"Found {len(self.analysis_results['weight_fields'])} weight-related fields:\n\n")
                for wf in self.analysis_results["weight_fields"]:
                    f.write(f"- **Location:** `{wf['location']}`\n")
                    f.write(f"  - Fields: {', '.join(wf['fields'])}\n")
                    f.write(f"  - Sample: {wf['sample_data']}\n\n")
            else:
                f.write("✅ No weight fields found in workout templates (expected for new implementation)\n\n")
            
            # Recommendations
            f.write("## Recommendations\n\n")
            for rec in self.analysis_results["recommendations"]:
                f.write(f"### {rec['priority']}: {rec['title']}\n\n")
                f.write(f"**Category:** {rec['category']}\n\n")
                f.write(f"{rec['description']}\n\n")
                f.write(f"**Action:** {rec['action']}\n\n")
            
            # User Details
            f.write("## User Details\n\n")
            for user in self.analysis_results["users"]:
                f.write(f"### User: `{user['user_id']}`\n\n")
                f.write(f"- Workouts: {len(user['workouts'])}\n")
                f.write(f"- Programs: {len(user['programs'])}\n")
                f.write(f"- Custom Exercises: {len(user['custom_exercises'])}\n")
                f.write(f"- Workout Sessions: {len(user['workout_sessions'])}\n")
                f.write(f"- Exercise History: {len(user['exercise_history'])}\n\n")
        
        print(f"✅ Markdown report: {report_file}")

def main():
    """Main execution function"""
    analyzer = DatabaseAnalyzer()
    
    if not analyzer.initialize():
        return
    
    # Run analysis
    analyzer.analyze_users_collection()
    analyzer.analyze_global_exercises()
    analyzer.check_for_duplicates()
    analyzer.analyze_data_quality()
    analyzer.generate_statistics()
    analyzer.generate_recommendations()
    
    # Save results
    output_dir = Path(__file__).parent / "analysis_results"
    analyzer.save_results(output_dir)
    
    print("\n" + "="*80)
    print("✅ ANALYSIS COMPLETE")
    print("="*80)
    print(f"\nResults saved to: {output_dir}")
    print("\nNext steps:")
    print("1. Review db_analysis_report.md for overview")
    print("2. Check db_issues_found.json for specific problems")
    print("3. Review db_recommendations.json for action items")

if __name__ == "__main__":
    main()