"""
Check Firebase Configuration
Verifies that Firebase environment variables are properly set
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

print("=" * 60)
print("🔍 Firebase Configuration Check")
print("=" * 60)
print(f"\n📁 Looking for .env file at: {env_path}")
print(f"   File exists: {env_path.exists()}")

if not env_path.exists():
    print("\n❌ .env file not found!")
    print("   Create it by copying .env.example:")
    print("   cp .env.example .env")
    sys.exit(1)

print("\n✅ .env file found!")

# Check required variables
required_vars = {
    'FIREBASE_PROJECT_ID': 'Firebase Project ID',
    'FIREBASE_PRIVATE_KEY': 'Firebase Private Key',
    'FIREBASE_CLIENT_EMAIL': 'Firebase Client Email'
}

print("\n🔑 Checking Firebase credentials:")
print("-" * 60)

all_present = True
for var_name, description in required_vars.items():
    value = os.getenv(var_name)
    
    if value and value != f"your-{var_name.lower().replace('_', '-')}":
        # Check if it's not the placeholder value
        if var_name == 'FIREBASE_PRIVATE_KEY':
            # Just check if it starts with the right format
            if value.startswith('-----BEGIN PRIVATE KEY-----'):
                print(f"✅ {description}: Configured (key starts correctly)")
            else:
                print(f"⚠️  {description}: Set but may be incorrect format")
                print(f"   Should start with: -----BEGIN PRIVATE KEY-----")
                all_present = False
        elif var_name == 'FIREBASE_CLIENT_EMAIL':
            if '@' in value and '.iam.gserviceaccount.com' in value:
                print(f"✅ {description}: {value}")
            else:
                print(f"⚠️  {description}: Set but may be incorrect format")
                print(f"   Should end with: .iam.gserviceaccount.com")
                all_present = False
        else:
            print(f"✅ {description}: {value}")
    else:
        print(f"❌ {description}: NOT SET or using placeholder")
        all_present = False

print("-" * 60)

if all_present:
    print("\n🎉 All Firebase credentials are configured!")
    print("\n📝 Next steps:")
    print("   1. Run: python run.py")
    print("   2. Then run the test script")
    sys.exit(0)
else:
    print("\n❌ Firebase credentials are incomplete!")
    print("\n📝 How to fix:")
    print("   1. Go to Firebase Console: https://console.firebase.google.com/")
    print("   2. Select your project")
    print("   3. Go to Project Settings (gear icon) → Service Accounts")
    print("   4. Click 'Generate New Private Key'")
    print("   5. Download the JSON file")
    print("   6. Copy values from JSON to your .env file:")
    print("      - project_id → FIREBASE_PROJECT_ID")
    print("      - private_key → FIREBASE_PRIVATE_KEY")
    print("      - client_email → FIREBASE_CLIENT_EMAIL")
    print("\n⚠️  Important: Keep the private key format with \\n characters!")
    sys.exit(1)