# Railway Deployment Guide - Ghost Gym V2

This guide will help you deploy Ghost Gym V2 to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Git Repository**: The V2 project is already initialized with git
3. **GitHub Account**: To connect your repository to Railway

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `ghost-gym-v2`)
2. Add the remote and push:

```bash
cd ../simplegym_v2
git remote add origin https://github.com/YOUR_USERNAME/ghost-gym-v2.git
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

3. Deploy from the V2 directory:
```bash
cd ../simplegym_v2
railway deploy
```

### Option B: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `ghost-gym-v2` repository
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
- `/` - Main application
- `/api/health` - Health check
- `/api/status` - System status
- `/docs` - API documentation

## Features Available After Deployment

✅ **Working Features**:
- Modern V2 interface with dark theme
- HTML document generation and download
- Instant HTML preview
- All V2 API endpoints
- Responsive design

⚠️ **Limited Features** (without Gotenberg):
- PDF generation will show "service unavailable" message
- HTML generation works perfectly as fallback

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

**Ready to Deploy!** 🚀

Your Ghost Gym V2 application is fully prepared for Railway deployment with all necessary configuration files in place.
