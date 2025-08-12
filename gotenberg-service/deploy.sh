#!/bin/bash

# Gotenberg Service Deployment Script for Railway
# This script automates the deployment of Gotenberg service to Railway

set -e  # Exit on any error

echo "🚀 Ghost Gym - Gotenberg Service Deployment"
echo "==========================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   Windows: iwr https://railway.app/install.ps1 | iex"
    echo "   macOS/Linux: curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

echo "✅ Railway CLI found"

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    railway login
fi

echo "✅ Railway authentication verified"

# Create and deploy the service
echo "📦 Creating Gotenberg service..."
railway service create gotenberg-pdf-service

echo "🚀 Deploying Gotenberg service..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "1. Wait for deployment to complete (2-5 minutes)"
echo "2. Get the service URL from Railway dashboard"
echo "3. Add GOTENBERG_SERVICE_URL environment variable to your main app"
echo "4. Test the V2 endpoints"
echo ""
echo "🔗 Railway Dashboard: https://railway.app/dashboard"
echo ""
echo "📖 For detailed instructions, see GOTENBERG_DEPLOYMENT_GUIDE.md"
