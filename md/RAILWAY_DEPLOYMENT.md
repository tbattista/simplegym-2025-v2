# Railway Deployment Guide - Ghost Gym V3

This guide will help you deploy Ghost Gym V3 (with V2 compatibility) to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Git Repository**: The V2 project is already initialized with git
3. **GitHub Account**: To connect your repository to Railway

## Step 1: Push V3 Update to GitHub

If you already have a repository, update it with the V3 changes:

```bash
# Add all new V3 files
git add .

# Commit the V3 dashboard update
git commit -m "feat: Add V3 Program Manager Dashboard

- Add hierarchical Programs → Workouts → Exercises structure
- New dashboard interface at /dashboard
- Multi-workout document generation
- Drag-and-drop program organization
- Workout library with reusable templates
- Import/export functionality
- Maintain V2 compatibility at /"

# Push to GitHub
git push origin main
```

If this is a new repository:
```bash
git remote add origin https://github.com/YOUR_USERNAME/ghost-gym-v3.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Railway CLI (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Deploy the V3 update:
```bash
railway deploy
```

### Option B: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `ghost-gym-v3` repository
5. Railway will automatically detect the configuration

## Step 3: Configuration

Railway will automatically use the `railway.toml` configuration:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python run.py"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
ENVIRONMENT = "production"
```

## Step 4: Environment Variables

Railway will automatically set:
- `PORT` - The port your app should listen on
- `RAILWAY_ENVIRONMENT` - Set to "production"

No additional environment variables are required for basic functionality.

## Step 5: Optional - Gotenberg Service for PDF Generation

To enable PDF generation, you can deploy the Gotenberg service separately:

1. Create a new Railway service
2. Deploy from the `gotenberg-service` directory
3. Set the Gotenberg URL in your main app's environment variables

## Step 6: Verify Deployment

Once deployed, Railway will provide you with a URL like:
`https://your-app-name.railway.app`

Test the following endpoints:
- `/` - V2 Single workout interface (legacy)
- `/dashboard` - V3 Program Manager Dashboard (new!)
- `/api/health` - Health check
- `/api/status` - System status
- `/api/v3/stats` - V3 statistics
- `/docs` - API documentation

## Features Available After Deployment

✅ **V3 Dashboard Features**:
- Program Manager Dashboard at `/dashboard`
- Hierarchical Programs → Workouts → Exercises
- Drag-and-drop workout organization
- Multi-workout document generation
- Workout library with templates
- Import/export functionality
- Real-time search and filtering
- Mobile-responsive design

✅ **V2 Legacy Features** (still available at `/`):
- Single workout interface
- HTML document generation
- Instant preview
- All original V2 functionality

⚠️ **Limited Features** (without Gotenberg):
- PDF generation will show "service unavailable" message
- HTML generation works perfectly as fallback
- All other features work normally

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are in `requirements.txt`
2. **App Won't Start**: Verify `run.py` is executable and `railway.toml` is correct
3. **Static Files Not Loading**: Ensure `frontend/` directory structure is correct

### Logs:
View logs in Railway dashboard or via CLI:
```bash
railway logs
```

## Production Considerations

1. **Performance**: The app runs with auto-reload disabled in production
2. **Scaling**: Railway handles scaling automatically
3. **Monitoring**: Use Railway's built-in monitoring and health checks
4. **Updates**: Push to GitHub to trigger automatic redeployment

## Cost

- Railway offers a generous free tier
- V2 app is lightweight and should run well within free limits
- Only pay for what you use beyond free tier

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Ghost Gym V2 Issues: Check the repository issues

---

**Ready to Deploy V3!** 🚀

Your Ghost Gym V3 application with the new Program Manager Dashboard is fully prepared for Railway deployment. The V2 interface remains available for backward compatibility.

## V3 New Features After Deployment

🎯 **Program Management**:
- Create and organize workout programs
- Drag workouts from library into programs
- Reorder workouts within programs
- Generate multi-page program documents

💪 **Workout Library**:
- Create reusable workout templates
- Tag and search workouts
- Duplicate and modify existing workouts
- Import/export workout collections

📄 **Enhanced Documents**:
- Multi-workout program documents
- Professional cover pages and table of contents
- Individual workout pages with progress tracking
- A5 format optimized for printing

🔄 **Data Management**:
- JSON-based data storage
- Automatic backup creation
- Import/export programs and workouts
- Full backward compatibility with V2
