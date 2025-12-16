# Ghost Gym V2 - Advanced Log Book

Modern HTML/PDF generation system for creating personalized workout logs with instant preview and professional formatting.

## Features

- **HTML Templates**: Uses Jinja2 HTML templates for flexible, modern formatting
- **Instant HTML Preview**: Generate instant HTML previews without external dependencies
- **PDF Generation**: Professional PDF output via Gotenberg service (optional)
- **Format Selection**: Choose between HTML and PDF output formats
- **Real-time Status**: Live system status monitoring with service availability indicators
- **Modern UI**: Bootstrap 5-based responsive interface with accordions and animations
- **Workout Customization**: Fill in workout details, exercises, sets, reps, and rest periods

## Quick Start

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Ensure HTML Templates Exist**:
   - HTML templates should be in `backend/templates/html/`
   - Default template: `gym_log_template.html`

3. **Run the Server**:
   ```bash
   python run.py
   ```

4. **Access the App**:
   - Open http://localhost:8000 in your browser
   - API Documentation: http://localhost:8000/docs

## Optional: PDF Generation Setup

For PDF generation capabilities, you need to run the Gotenberg service:

1. **Using Docker** (Recommended):
   ```bash
   cd gotenberg-service
   docker run --rm -p 3000:3000 gotenberg/gotenberg:8
   ```

2. **Check Status**:
   - The app will automatically detect if Gotenberg is available
   - Status indicator shows service availability

## Project Structure

```
simplegym_v2/
├── backend/
│   ├── main.py                    # FastAPI application (V2 only)
│   ├── models.py                  # Data models
│   ├── services/v2/               # V2 services
│   │   ├── document_service_v2.py # HTML/PDF processing
│   │   └── gotenberg_client.py    # Gotenberg integration
│   └── templates/html/            # HTML templates
│       └── gym_log_template.html  # Default template
├── frontend/
│   ├── index.html                 # V2 UI
│   ├── css/style-v2.css          # V2 styling
│   └── js/app-v2.js              # V2 frontend logic
├── gotenberg-service/             # PDF service configuration
├── requirements.txt               # Python dependencies
└── run.py                        # Development server launcher
```

## Template Variables

Your HTML templates can use these Jinja2 variables:

### Basic Info
- `{{ workout_name }}` - Name of the workout
- `{{ workout_date }}` - Date of the workout

### Main Exercises (1-6)
- `{{ exercise_1a }}`, `{{ exercise_1b }}`, `{{ exercise_1c }}` - Exercise names for group 1
- `{{ exercise_2a }}`, `{{ exercise_2b }}`, `{{ exercise_2c }}` - Exercise names for group 2
- ... (up to group 6)

### Sets, Reps, Rest
- `{{ sets_1 }}` to `{{ sets_6 }}` - Number of sets
- `{{ reps_1 }}` to `{{ reps_6 }}` - Number of reps
- `{{ rest_1 }}` to `{{ rest_6 }}` - Rest periods

### Bonus Exercises
- `{{ exercise_bonus_1 }}`, `{{ exercise_bonus_2 }}` - Bonus exercise names
- `{{ sets_bonus_1 }}`, `{{ sets_bonus_2 }}` - Bonus sets
- `{{ reps_bonus_1 }}`, `{{ reps_bonus_2 }}` - Bonus reps
- `{{ rest_bonus_1 }}`, `{{ rest_bonus_2 }}` - Bonus rest periods

## API Endpoints

### Core Endpoints
- `GET /` - Serve the V2 frontend
- `GET /api/health` - Health check
- `GET /api/status` - System status (including Gotenberg availability)
- `GET /api/templates` - List available HTML templates

### Generation Endpoints
- `POST /api/preview-html` - Generate instant HTML preview
- `POST /api/preview-pdf` - Generate PDF preview (requires Gotenberg)
- `POST /api/generate-html` - Generate and download HTML file
- `POST /api/generate-pdf` - Generate and download PDF file (requires Gotenberg)

### Utility Endpoints
- `GET /api/template-info` - Get template information and variables

## Features

### Format Selection
- **HTML**: Instant generation, web-friendly, no external dependencies
- **PDF**: Professional print-ready format, requires Gotenberg service

### Status Monitoring
- Real-time service availability checking
- Visual status indicators
- Graceful degradation when services are unavailable

### Modern UI
- Bootstrap 5 responsive design
- Collapsible exercise group accordions
- Real-time form validation
- Loading states and progress indicators
- Toast notifications for user feedback

### Keyboard Shortcuts
- `Ctrl+Enter` - Generate document
- `Ctrl+P` - Show preview
- `Ctrl+E` - Expand all accordions
- `Ctrl+C` - Collapse all accordions
- `Escape` - Close modals

## Dependencies

- **FastAPI**: Modern web framework
- **Jinja2**: HTML template engine
- **Requests**: HTTP client for Gotenberg integration
- **Uvicorn**: ASGI server

## Optional Dependencies

- **Gotenberg**: PDF generation service (Docker-based)
- **Docker**: For running Gotenberg service

## Development

### Running in Development Mode
```bash
python run.py
```

### Template Development
1. Edit HTML templates in `backend/templates/html/`
2. Use Jinja2 syntax for variables: `{{ variable_name }}`
3. Test with instant HTML preview
4. Generate PDF preview if Gotenberg is available

### API Testing
- Visit http://localhost:8000/docs for interactive API documentation
- Use the `/api/status` endpoint to check service availability

## Deployment

V2 can be deployed independently from V1:

1. **Railway/Heroku**: Use the included configuration files
2. **Docker**: Build with the provided Dockerfile
3. **Traditional Hosting**: Deploy as a standard FastAPI application

## Version

This is Version 2 (V2) of the Ghost Gym Log Book system, featuring modern HTML/PDF generation with Gotenberg integration.

## Differences from V1

- **Templates**: HTML (Jinja2) instead of Word documents
- **Preview**: Instant HTML preview + optional PDF preview
- **Dependencies**: Lighter weight, optional PDF service
- **UI**: Modern Bootstrap 5 interface with enhanced UX
- **Architecture**: Microservice-ready with separate PDF generation
