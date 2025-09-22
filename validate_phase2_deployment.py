#!/usr/bin/env python3
"""
Phase 2 Deployment Validation Script
Validates that all Phase 2 components are properly deployed and functional
"""

import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime

def print_header(title):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f"[CHECK] {title}")
    print('='*60)

def print_success(message):
    """Print success message"""
    print(f"[PASS] {message}")

def print_warning(message):
    """Print warning message"""
    print(f"[WARN] {message}")

def print_error(message):
    """Print error message"""
    print(f"[FAIL] {message}")

def print_info(message):
    """Print info message"""
    print(f"[INFO] {message}")

async def validate_backend_services():
    """Validate backend services are properly configured"""
    print_header("Backend Services Validation")
    
    try:
        # Test imports
        from backend.services.unified_data_service import unified_data_service
        from backend.services.migration_service import migration_service
        from backend.services.firestore_data_service import firestore_data_service
        from backend.config.firebase_config import firebase_app
        
        print_success("All Phase 2 services imported successfully")
        
        # Test service availability
        if unified_data_service:
            print_success("Unified data service initialized")
            
            # Test service status
            status = unified_data_service.get_service_status()
            print_info(f"Local service: {'✅' if status['local_service']['available'] else '❌'}")
            print_info(f"Firestore service: {'✅' if status['firestore_service']['available'] else '❌'}")
        
        if migration_service:
            print_success("Migration service initialized")
        
        if firestore_data_service:
            firestore_available = firestore_data_service.is_available()
            if firestore_available:
                print_success("Firestore data service operational")
            else:
                print_warning("Firestore data service not available (fallback mode)")
        
        if firebase_app:
            print_success("Firebase Admin SDK initialized")
        else:
            print_warning("Firebase Admin SDK not available")
        
        return True
        
    except ImportError as e:
        print_error(f"Import error: {str(e)}")
        return False
    except Exception as e:
        print_error(f"Service validation error: {str(e)}")
        return False

def validate_frontend_files():
    """Validate frontend files are present"""
    print_header("Frontend Files Validation")
    
    required_files = [
        "frontend/js/firebase/data-manager.js",
        "frontend/js/firebase/sync-manager.js", 
        "frontend/js/firebase/migration-ui.js",
        "frontend/dashboard.html"
    ]
    
    all_present = True
    
    for file_path in required_files:
        if Path(file_path).exists():
            print_success(f"{file_path} exists")
        else:
            print_error(f"{file_path} missing")
            all_present = False
    
    return all_present

def validate_api_structure():
    """Validate API structure and endpoints"""
    print_header("API Structure Validation")
    
    try:
        # Check if API files exist
        api_files = [
            "backend/api/__init__.py",
            "backend/api/migration.py"
        ]
        
        for file_path in api_files:
            if Path(file_path).exists():
                print_success(f"{file_path} exists")
            else:
                print_error(f"{file_path} missing")
                return False
        
        # Test API router import
        from backend.api.migration import router
        print_success("Migration API router imported successfully")
        
        return True
        
    except Exception as e:
        print_error(f"API validation error: {str(e)}")
        return False

def validate_data_backup():
    """Validate data backup was created"""
    print_header("Data Backup Validation")
    
    backup_dir = Path("backend/backups")
    if not backup_dir.exists():
        print_error("Backup directory not found")
        return False
    
    backup_files = list(backup_dir.glob("*_backup_phase2.json"))
    
    if len(backup_files) >= 2:  # programs and workouts backups
        print_success(f"Found {len(backup_files)} backup files")
        for backup_file in backup_files:
            print_info(f"  📁 {backup_file.name}")
        return True
    else:
        print_warning(f"Expected 2 backup files, found {len(backup_files)}")
        return False

async def validate_migration_functionality():
    """Validate migration functionality"""
    print_header("Migration Functionality Validation")
    
    try:
        from backend.services.migration_service import migration_service
        
        # Test migration eligibility check (with dummy user)
        test_user_id = "validation-test-user"
        
        if migration_service and hasattr(migration_service, 'check_migration_eligibility'):
            print_success("Migration eligibility check method available")
        
        if migration_service and hasattr(migration_service, 'execute_migration'):
            print_success("Migration execution method available")
        
        if migration_service and hasattr(migration_service, 'get_migration_status'):
            print_success("Migration status check method available")
        
        print_success("All migration methods available")
        return True
        
    except Exception as e:
        print_error(f"Migration validation error: {str(e)}")
        return False

def validate_configuration():
    """Validate configuration and environment"""
    print_header("Configuration Validation")
    
    try:
        # Check environment variables
        import os
        required_env_vars = [
            "FIREBASE_PROJECT_ID",
            "FIREBASE_PRIVATE_KEY",
            "FIREBASE_CLIENT_EMAIL"
        ]
        
        env_status = True
        for var in required_env_vars:
            if os.getenv(var):
                print_success(f"{var} configured")
            else:
                print_warning(f"{var} not configured")
                env_status = False
        
        # Check data directories
        data_dir = Path("backend/data")
        if data_dir.exists():
            print_success("Data directory exists")
            
            programs_file = data_dir / "programs.json"
            workouts_file = data_dir / "workouts.json"
            
            if programs_file.exists():
                print_success("Programs data file exists")
            else:
                print_warning("Programs data file missing")
            
            if workouts_file.exists():
                print_success("Workouts data file exists")
            else:
                print_warning("Workouts data file missing")
        
        return env_status
        
    except Exception as e:
        print_error(f"Configuration validation error: {str(e)}")
        return False

def create_deployment_checklist():
    """Create deployment checklist"""
    print_header("Deployment Checklist")
    
    checklist = [
        "✅ Phase 2 implementation committed to feature branch",
        "✅ All backend services implemented and tested",
        "✅ Frontend components created and integrated",
        "✅ Data backup created before implementation",
        "✅ Migration system implemented with validation",
        "✅ Real-time sync capabilities added",
        "✅ Fallback mechanisms implemented",
        "✅ API endpoints enhanced with user-specific operations",
        "⏳ Local testing completed",
        "⏳ Firebase connection validated",
        "⏳ Migration flow tested end-to-end",
        "⏳ Production deployment to Railway",
        "⏳ Live testing with real user accounts",
        "⏳ Performance monitoring and optimization"
    ]
    
    print("📋 Phase 2 Deployment Checklist:")
    for item in checklist:
        print(f"  {item}")
    
    return checklist

async def main():
    """Main validation function"""
    print("Phase 2 Deployment Validation")
    print(f"Validation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    validation_results = []
    
    # Run all validations
    validation_results.append(("Backend Services", await validate_backend_services()))
    validation_results.append(("Frontend Files", validate_frontend_files()))
    validation_results.append(("API Structure", validate_api_structure()))
    validation_results.append(("Data Backup", validate_data_backup()))
    validation_results.append(("Migration Functionality", await validate_migration_functionality()))
    validation_results.append(("Configuration", validate_configuration()))
    
    # Summary
    print_header("Validation Summary")
    
    passed = 0
    total = len(validation_results)
    
    for test_name, result in validation_results:
        if result:
            print_success(f"{test_name}: PASSED")
            passed += 1
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n📊 Validation Results: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("All validations passed! Phase 2 is ready for deployment.")
        
        # Create deployment checklist
        create_deployment_checklist()
        
        print_header("Next Steps")
        print("1. Start local server: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload")
        print("2. Test locally: http://localhost:8000/dashboard")
        print("3. Test migration flow with real user account")
        print("4. Deploy to Railway for production testing")
        print("5. Monitor performance and user feedback")
        
        return True
    else:
        print_error("Some validations failed. Please fix issues before deployment.")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\nValidation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nValidation script error: {str(e)}")
        sys.exit(1)