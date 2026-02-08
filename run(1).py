#!/usr/bin/env python3
"""
Development server launcher for Ghost Gym V2 - Advanced Log Book
Modern HTML/PDF generation with Gotenberg integration
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    """Launch the V2 development server"""
    
    # Ensure we're in the correct directory
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    # Check if required directories exist
    required_dirs = ['backend', 'frontend', 'backend/templates/html']
    for dir_name in required_dirs:
        if not Path(dir_name).exists():
            print(f"Error: Required directory '{dir_name}' not found!")
            print(f"Please ensure you're running this from the project root directory.")
            sys.exit(1)
    
    # Check if HTML templates exist
    templates_dir = Path('backend/templates/html')
    template_files = list(templates_dir.glob('*.html'))
    if not template_files:
        print("Warning: No .html template files found in the backend/templates/html/ directory.")
        print("Please add your HTML document templates to the backend/templates/html/ folder.")
    else:
        print(f"Found {len(template_files)} HTML template(s):")
        for template in template_files:
            print(f"  - {template.name}")
    
    # Check if Gotenberg service directory exists
    gotenberg_dir = Path('gotenberg-service')
    if gotenberg_dir.exists():
        print(f"[INFO] Gotenberg service directory found: {gotenberg_dir}")
        print("[INFO] To enable PDF generation, run Gotenberg service separately")
        print("   See gotenberg-service/README.md for instructions")
    else:
        print("[WARN] Gotenberg service directory not found - PDF generation will be disabled")
    
    print("\n" + "="*60)
    print("GHOST GYM V2 - ADVANCED LOG BOOK - DEVELOPMENT SERVER")
    print("="*60)
    print(f"Project Directory: {project_root}")
    print(f"Server URL: http://localhost:8001")
    print(f"API Documentation: http://localhost:8001/docs")
    print(f"Auto-reload: Enabled")
    print(f"Template Type: HTML (.html)")
    print(f"Features: Instant HTML preview, PDF generation (if Gotenberg available)")
    print("="*60)
    print("\n[INFO] Starting V2 server...")
    print("[INFO] Press Ctrl+C to stop the server")
    print("\n")
    
    try:
        # Get port from environment variable or default to 8001 for local development
        # Railway will provide PORT environment variable in production
        port = int(os.environ.get("PORT", 8001))
        
        # Check if we're in production
        is_production = os.environ.get("RAILWAY_ENVIRONMENT") == "production" or os.environ.get("ENVIRONMENT") == "production"
        
        # Launch the FastAPI server with uvicorn
        uvicorn.run(
            "backend.main:app",
            host="0.0.0.0",
            port=port,
            reload=not is_production,  # Disable reload in production
            reload_dirs=["backend", "frontend"] if not is_production else None,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n[INFO] V2 Server stopped by user")
    except Exception as e:
        print(f"\n[ERROR] Error starting V2 server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
