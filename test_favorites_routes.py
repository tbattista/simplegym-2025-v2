"""
Quick test script to verify favorites routes are registered
Run this after starting the server to see all registered routes
"""

import requests
import json

BASE_URL = "http://localhost:8001"

def test_routes():
    """Test if favorites routes are accessible"""
    
    print("=" * 60)
    print("Testing Favorites API Routes")
    print("=" * 60)
    
    # Test 1: Check if OpenAPI docs show the routes
    print("\n1. Checking OpenAPI documentation...")
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            openapi = response.json()
            paths = openapi.get('paths', {})
            
            favorites_routes = [path for path in paths.keys() if 'favorites' in path]
            
            if favorites_routes:
                print(f"✅ Found {len(favorites_routes)} favorites routes in OpenAPI:")
                for route in sorted(favorites_routes):
                    methods = list(paths[route].keys())
                    print(f"   - {route}: {', '.join(methods).upper()}")
            else:
                print("❌ No favorites routes found in OpenAPI documentation")
        else:
            print(f"❌ Failed to get OpenAPI docs: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking OpenAPI: {e}")
    
    # Test 2: Try to access the routes directly (will fail without auth, but should not be 404)
    print("\n2. Testing route accessibility (without auth)...")
    
    test_cases = [
        ("GET", "/api/v3/users/me/favorites"),
        ("GET", "/api/v3/users/me/favorites/"),
        ("POST", "/api/v3/users/me/favorites"),
        ("POST", "/api/v3/users/me/favorites/"),
    ]
    
    for method, path in test_cases:
        try:
            url = f"{BASE_URL}{path}"
            if method == "GET":
                response = requests.get(url)
            else:
                response = requests.post(url, json={"exerciseId": "test"})
            
            # We expect 401 (Unauthorized) or 403 (Forbidden), NOT 404
            if response.status_code == 404:
                print(f"❌ {method} {path}: 404 Not Found (route not registered!)")
            elif response.status_code in [401, 403]:
                print(f"✅ {method} {path}: {response.status_code} (route exists, auth required)")
            else:
                print(f"⚠️  {method} {path}: {response.status_code} {response.reason}")
        except Exception as e:
            print(f"❌ {method} {path}: Error - {e}")
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    test_routes()