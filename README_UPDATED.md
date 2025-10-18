# Ghost Gym V0.4.1 - Professional Workout Program Manager

Modern workout program management system with Firebase cloud sync, exercise database, and professional document generation.

## 🎯 Features

- **Program Management**: Create and organize multi-workout training programs
- **Workout Library**: Build a library of reusable workouts
- **Exercise Database**: Browse 2,500+ exercises with filtering and favorites
- **Cloud Sync**: Firebase authentication and cloud storage
- **Document Generation**: Export programs as HTML or PDF
- **Modern UI**: Professional Sneat Bootstrap template with dark theme
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up Environment
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### 3. Run the Server
```bash
python run.py
```

### 4. Access the Dashboard
- **Main Dashboard**: http://localhost:8001/
- **API Documentation**: http://localhost:8001/docs

## 📁 Project Structure

```
simplegym_v2/
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── models.py                  # Data models
│   ├── api/                       # API route modules
│   │   ├── health.py             # Health check endpoints
│   │   ├── documents.py          # Document generation
│   │   ├── workouts.py           # Workout management
│   │   ├── programs.py           # Program management
│   │   ├── exercises.py          # Exercise database
│   │   ├── favorites.py          # Exercise favorites
│   │   ├── auth.py               # Firebase authentication
│   │   ├── data.py               # Data export/import
│   │   └── migration.py          # Data migration
│   ├── services/                  # Business logic services
│   └── templates/html/            # HTML templates for documents
├── frontend/
│   ├── dashboard.html             # Main dashboard (V0.4.1)
│   ├── assets/                    # CSS, images, fonts
│   └── js/
│       ├── ghost-gym-dashboard.js # Main dashboard logic
│       ├── menu-navigation.js     # SPA navigation system
│       ├── components/            # Reusable components
│       └── firebase/              # Firebase integration
├── sneat-bootstrap-template/      # Reference Sneat template
├── requirements.txt               # Python dependencies
└── run.py                        # Development server launcher
```

## 🎨 Dashboard Navigation

The dashboard uses a single-page application (SPA) approach with the following sections:

### Main Sections
- **Dashboard** - Overview with all panels
- **My Programs** - Program management and organization
- **Workout Library** - Browse and manage workouts
- **Exercise Database** - 2,500+ exercises with filtering

### Tools
- **Backup & Export** - Download your data
- **Settings** - Application preferences

## 🔥 Firebase Integration

### Features
- **Authentication**: Email/password and Google sign-in
- **Cloud Storage**: Automatic sync of programs and workouts
- **Offline Support**: Works offline with local storage fallback
- **Multi-Device**: Access your data from any device

### Setup
See [`FIREBASE_SETUP_GUIDE.md`](FIREBASE_SETUP_GUIDE.md) for detailed Firebase configuration instructions.

## 💪 Exercise Database

### Features
- **2,583 Exercises**: Comprehensive exercise library
- **Smart Filtering**: By muscle group, equipment, difficulty
- **Favorites System**: Save your favorite exercises
- **Custom Exercises**: Add your own exercises
- **Autocomplete**: Quick exercise search in workout builder

### Usage
1. Click "Exercise Database" in the menu
2. Use filters to find exercises
3. Click the star icon to favorite
4. Click exercise name for details

## 📊 Program Management

### Creating Programs
1. Click "New Program" button
2. Enter program details (name, duration, difficulty)
3. Add workouts to the program
4. Drag to reorder workouts
5. Generate HTML or PDF document

### Generating Documents
1. Select a program
2. Click "Generate" button
3. Choose format (HTML or PDF)
4. Set start date and options
5. Download your document

## 🔌 API Endpoints

### Core Endpoints
- `GET /` - Main dashboard
- `GET /api/health` - Health check
- `GET /api/status` - System status

### Program Management
- `GET /api/v3/programs` - List programs
- `POST /api/v3/programs` - Create program
- `PUT /api/v3/programs/{id}` - Update program
- `DELETE /api/v3/programs/{id}` - Delete program

### Workout Management
- `GET /api/v3/workouts` - List workouts
- `POST /api/v3/workouts` - Create workout
- `PUT /api/v3/workouts/{id}` - Update workout
- `DELETE /api/v3/workouts/{id}` - Delete workout

### Exercise Database
- `GET /api/exercises` - List exercises
- `GET /api/exercises/search` - Search exercises
- `GET /api/exercises/{id}` - Get exercise details

### Favorites
- `GET /api/favorites` - List favorite exercises
- `POST /api/favorites/{exercise_id}` - Add favorite
- `DELETE /api/favorites/{exercise_id}` - Remove favorite

### Document Generation
- `POST /api/preview-html` - Generate HTML preview
- `POST /api/generate-html` - Generate HTML document
- `POST /api/generate-pdf` - Generate PDF document (requires Gotenberg)

## 🐳 Optional: PDF Generation

For PDF generation, run the Gotenberg service:

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

The app will automatically detect if Gotenberg is available and enable PDF generation.

## 🧪 Development

### Running Tests
```bash
pytest
```

### Code Style
```bash
black backend/
flake8 backend/
```

### Hot Reload
The development server (`run.py`) includes hot reload for both backend and frontend changes.

## 📦 Deployment

### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

See [`RAILWAY_DEPLOYMENT.md`](RAILWAY_DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Environment Variables
```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id

# Gotenberg Service (optional)
GOTENBERG_URL=http://localhost:3000

# Server Configuration
PORT=8001
ENVIRONMENT=development
```

## 📚 Documentation

- [`FIREBASE_SETUP_GUIDE.md`](FIREBASE_SETUP_GUIDE.md) - Firebase configuration
- [`EXERCISE_DATABASE_INTEGRATION.md`](EXERCISE_DATABASE_INTEGRATION.md) - Exercise database details
- [`FRONTEND_CLEANUP_AND_MENU_FIX_PLAN.md`](FRONTEND_CLEANUP_AND_MENU_FIX_PLAN.md) - Architecture decisions
- [`CLEANUP_INSTRUCTIONS.md`](CLEANUP_INSTRUCTIONS.md) - Recent cleanup changes

## 🐛 Troubleshooting

### Dashboard Not Loading
- Check that `frontend/dashboard.html` exists
- Verify static files are being served at `/static/`
- Check browser console for errors

### Menu Not Working
- Ensure `menu-navigation.js` is loaded
- Check browser console for JavaScript errors
- Verify menu items have `data-section` attributes

### Firebase Not Connecting
- Verify Firebase configuration in dashboard.html
- Check Firebase project settings
- Ensure Firebase is enabled in your project

### Exercise Database Not Loading
- Check API endpoint: `/api/exercises`
- Verify `Exercises.csv` exists in project root
- Check backend logs for import errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- **Sneat Bootstrap Template** - UI framework
- **Firebase** - Authentication and cloud storage
- **Gotenberg** - PDF generation service
- **FastAPI** - Backend framework

---

**Version**: 0.4.1  
**Last Updated**: 2025-01-18  
**Status**: ✅ Production Ready