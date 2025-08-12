# Gotenberg Service Deployment Script for Railway (PowerShell)
# This script automates the deployment of Gotenberg service to Railway

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Ghost Gym - Gotenberg Service Deployment Script" -ForegroundColor Green
    Write-Host "Usage: .\deploy.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This script will:"
    Write-Host "1. Check for Railway CLI installation"
    Write-Host "2. Verify Railway authentication"
    Write-Host "3. Create and deploy Gotenberg service"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "- Railway CLI installed"
    Write-Host "- Railway account and login"
    exit 0
}

Write-Host "🚀 Ghost Gym - Gotenberg Service Deployment" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# Check if Railway CLI is installed
try {
    $railwayVersion = railway --version 2>$null
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   iwr https://railway.app/install.ps1 | iex" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in
try {
    $user = railway whoami 2>$null
    Write-Host "✅ Railway authentication verified for: $user" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please login to Railway first:" -ForegroundColor Yellow
    railway login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Railway login failed" -ForegroundColor Red
        exit 1
    }
}

# Create and deploy the service
Write-Host "📦 Creating Gotenberg service..." -ForegroundColor Blue
try {
    railway service create gotenberg-pdf-service
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create service" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error creating service: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying Gotenberg service..." -ForegroundColor Blue
try {
    railway up
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during deployment: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait for deployment to complete (2-5 minutes)"
Write-Host "2. Get the service URL from Railway dashboard"
Write-Host "3. Add GOTENBERG_SERVICE_URL environment variable to your main app"
Write-Host "4. Test the V2 endpoints"
Write-Host ""
Write-Host "🔗 Railway Dashboard: https://railway.app/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 For detailed instructions, see GOTENBERG_DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
