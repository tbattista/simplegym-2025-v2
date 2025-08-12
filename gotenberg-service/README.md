# Gotenberg Service for Ghost Gym

This is a separate Railway service that provides PDF generation capabilities for the Ghost Gym Log Book application.

## What is Gotenberg?

Gotenberg is a Docker-powered stateless API for converting HTML, Markdown and Office documents to PDF. It's designed to be used as a microservice for PDF generation.

## Deployment Instructions

### 1. Create New Railway Service

1. Go to your Railway dashboard
2. Click "New Project" or add to existing project
3. Choose "Deploy from GitHub repo" or "Empty Service"
4. Name it `gotenberg-service` or similar

### 2. Deploy This Service

**Option A: Via Railway CLI**
```bash
# Navigate to the gotenberg-service directory
cd gotenberg-service

# Initialize Railway project (if not already done)
railway login
railway link

# Deploy the service
railway up
```

**Option B: Via GitHub Integration**
1. Push this `gotenberg-service` folder to a separate GitHub repository
2. Connect the repository to Railway
3. Railway will automatically build and deploy using the Dockerfile

**Option C: Via Railway Dashboard**
1. Create new service in Railway dashboard
2. Upload these files or connect to GitHub
3. Railway will detect the Dockerfile and deploy automatically

### 3. Get the Service URL

After deployment, Railway will provide a URL like:
```
https://gotenberg-service-production-xxxx.up.railway.app
```

### 4. Configure Main Application

Add this environment variable to your main Ghost Gym application:
```
GOTENBERG_SERVICE_URL=https://gotenberg-service-production-xxxx.up.railway.app
```

### 5. Test the Integration

Your main application's V2 endpoints should now work:
- `/api/v2/status` - Should show Gotenberg as available
- `/api/v2/preview-pdf` - Generate PDF previews
- `/api/v2/generate-pdf` - Download PDF files

## Service Configuration

The service is configured with:
- **Port**: 3000 (Gotenberg default)
- **Health Check**: `/health` endpoint
- **Timeout**: 30 seconds for API calls
- **Security**: Disabled web security for HTML conversion
- **Restart Policy**: Automatic restart on failure

## Troubleshooting

### Service Not Starting
- Check Railway logs for startup errors
- Verify Dockerfile syntax
- Ensure port 3000 is properly exposed

### PDF Generation Failing
- Check if service URL is correctly set in main app
- Verify network connectivity between services
- Check Gotenberg logs for conversion errors

### Performance Issues
- Monitor memory usage (Gotenberg can be memory-intensive)
- Consider upgrading Railway plan if needed
- Check timeout settings

## API Endpoints

Once deployed, the service provides these endpoints:

- `GET /health` - Health check
- `POST /forms/chromium/convert/html` - Convert HTML to PDF
- `POST /forms/chromium/convert/url` - Convert URL to PDF
- `POST /forms/chromium/convert/markdown` - Convert Markdown to PDF

## Cost Considerations

- Gotenberg service will consume Railway resources
- PDF generation is CPU/memory intensive
- Consider usage patterns when selecting Railway plan
- Monitor costs and optimize as needed

## Security Notes

- Service is configured for internal use within Railway network
- Web security is disabled for HTML conversion (safe within Railway)
- No authentication required (services communicate internally)

## Support

For issues with:
- **Gotenberg itself**: Check [Gotenberg documentation](https://gotenberg.dev/)
- **Railway deployment**: Check Railway documentation
- **Integration with Ghost Gym**: Check main application logs and V2 service code
