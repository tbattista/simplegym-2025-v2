"""
Firestore Database Structure Inspector
Inspects and documents the complete Firestore database structure
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)
print(f"Loading .env from: {env_path}")
print(f".env exists: {env_path.exists()}")

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.config.firebase_config import get_firebase_app
from firebase_admin import firestore


def inspect_document(doc_ref, depth=0):
    """Recursively inspect a document and its subcollections"""
    indent = "  " * depth
    doc = doc_ref.get()
    
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    structure = {
        "id": doc.id,
        "fields": {},
        "subcollections": {}
    }
    
    # Analyze fields
    for key, value in data.items():
        value_type = type(value).__name__
        if isinstance(value, dict):
            structure["fields"][key] = {
                "type": "map",
                "keys": list(value.keys())[:5],  # Show first 5 keys
                "sample": str(value)[:100] if value else "{}"
            }
        elif isinstance(value, list):
            structure["fields"][key] = {
                "type": "array",
                "length": len(value),
                "sample": str(value[:3]) if value else "[]"
            }
        else:
            structure["fields"][key] = {
                "type": value_type,
                "value": str(value)[:50] if value else "null"
            }
    
    # Check for subcollections
    collections = doc_ref.collections()
    for collection in collections:
        coll_name = collection.id
        structure["subcollections"][coll_name] = {
            "document_count": len(list(collection.limit(100).stream())),
            "sample_docs": []
        }
        
        # Get first 2 documents as samples
        for sample_doc in collection.limit(2).stream():
            structure["subcollections"][coll_name]["sample_docs"].append(
                inspect_document(sample_doc.reference, depth + 1)
            )
    
    return structure


def inspect_collection(db, collection_name, max_docs=5):
    """Inspect a collection and sample documents"""
    print(f"\n{'='*80}")
    print(f"Collection: {collection_name}")
    print(f"{'='*80}")
    
    collection_ref = db.collection(collection_name)
    docs = list(collection_ref.limit(max_docs).stream())
    
    structure = {
        "collection": collection_name,
        "total_docs_sampled": len(docs),
        "documents": []
    }
    
    for doc in docs:
        print(f"\n  Document ID: {doc.id}")
        doc_structure = inspect_document(doc.reference, depth=1)
        structure["documents"].append(doc_structure)
        
        # Print field summary
        if doc_structure and "fields" in doc_structure:
            for field_name, field_info in doc_structure["fields"].items():
                print(f"    - {field_name}: {field_info['type']}")
                if field_info['type'] == 'map':
                    print(f"      Keys: {field_info['keys']}")
                elif field_info['type'] == 'array':
                    print(f"      Length: {field_info['length']}")
        
        # Print subcollection summary
        if doc_structure and "subcollections" in doc_structure:
            for subcoll_name, subcoll_info in doc_structure["subcollections"].items():
                print(f"    Subcollection: {subcoll_name} ({subcoll_info['document_count']} docs)")
    
    return structure


def main():
    """Main inspection function"""
    print("="*80)
    print("FIRESTORE DATABASE STRUCTURE INSPECTOR")
    print("="*80)
    
    # Initialize Firebase
    app = get_firebase_app()
    if not app:
        print("❌ Failed to initialize Firebase")
        return
    
    db = firestore.client(app=app)
    print("✅ Connected to Firestore")
    
    # Get all collections
    collections = db.collections()
    collection_names = [coll.id for coll in collections]
    
    print(f"\n📊 Found {len(collection_names)} top-level collections:")
    for name in collection_names:
        print(f"  - {name}")
    
    # Inspect each collection
    full_structure = {
        "inspected_at": datetime.now().isoformat(),
        "collections": {}
    }
    
    for coll_name in collection_names:
        structure = inspect_collection(db, coll_name, max_docs=3)
        full_structure["collections"][coll_name] = structure
    
    # Save to JSON file
    output_file = Path(__file__).parent / "firestore_structure.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(full_structure, f, indent=2, default=str)
    
    print(f"\n{'='*80}")
    print(f"✅ Full structure saved to: {output_file}")
    print(f"{'='*80}")
    
    # Special focus on users collection for favorites
    print("\n" + "="*80)
    print("DETAILED FAVORITES INSPECTION")
    print("="*80)
    
    users_ref = db.collection('users')
    for user_doc in users_ref.limit(1).stream():
        print(f"\nUser ID: {user_doc.id}")
        
        # Check data subcollection
        data_ref = user_doc.reference.collection('data')
        for data_doc in data_ref.stream():
            print(f"  Data Document: {data_doc.id}")
            
            if data_doc.id == 'favorites':
                data = data_doc.to_dict()
                print(f"\n  📦 FAVORITES DOCUMENT STRUCTURE:")
                print(f"  {'─'*76}")
                
                for key, value in data.items():
                    if key.startswith('exercises.'):
                        print(f"    ❌ DOTTED FIELD: {key}")
                        print(f"       Type: {type(value).__name__}")
                        if isinstance(value, dict):
                            print(f"       Keys: {list(value.keys())}")
                    else:
                        print(f"    ✓ {key}: {type(value).__name__}")
                        if key == 'exercises' and isinstance(value, dict):
                            print(f"       Nested exercises: {list(value.keys())}")
                        elif key == 'exerciseIds' and isinstance(value, list):
                            print(f"       IDs: {value}")


if __name__ == "__main__":
    main()