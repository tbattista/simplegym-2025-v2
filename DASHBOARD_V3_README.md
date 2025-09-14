# Ghost Gym V3 - Program Manager Dashboard

## 🎯 Overview

Ghost Gym V3 transforms the single-workout system into a comprehensive **Program Manager Dashboard** with hierarchical workout organization: **Programs → Workouts → Exercises**. Users can now create reusable workout templates, organize them into training programs, and generate professional multi-page documents.

## 🚀 New Features

### 📊 Dashboard Interface
- **Modern Dark Theme**: Professional dashboard with responsive design
- **Three-Panel Layout**: Programs (left) | Program Details (center) | Workout Library (right)
- **Drag & Drop**: Intuitive workout organization with visual feedback
- **Real-time Search**: Filter programs and workouts instantly
- **Mobile Responsive**: Touch-friendly interface for tablets and phones

### 🏋️ Program Management
- **Create Programs**: Name, description, duration, difficulty level, tags
- **Add Multiple Workouts**: Drag workouts from library into programs
- **Reorder Workouts**: Drag-and-drop to change workout sequence
- **Custom Naming**: Override workout names within programs
- **Program Preview**: Full-screen preview of combined document
- **Export Options**: Generate HTML or PDF with customizable settings

### 💪 Workout Library
- **Reusable Templates**: Create workout templates once, use in multiple programs
- **Exercise Groups**: Up to 6 exercise groups per workout (a, b, c format)
- **Bonus Exercises**: Additional exercises with separate tracking
- **Tagging System**: Organize workouts by muscle groups, difficulty, equipment
- **Duplication**: Clone workouts with modifications
- **Search & Filter**: Find workouts by name, tags, or content

### 📄 Multi-Page Documents
- **Cover Page**: Program overview with details and branding
- **Table of Contents**: Automatic page numbering and navigation
- **Individual Workout Pages**: Each workout gets dedicated pages
- **Progress Tracking**: Weekly tracking grids for each workout
- **Professional Layout**: A5 format optimized for printing
- **Page Breaks**: Proper pagination for multi-workout programs

### 🔄 Data Management
- **JSON Storage**: Lightweight file-based persistence
- **Backup System**: Automatic and manual backup creation
- **Import/Export**: Share programs and workouts as JSON files
- **Data Validation**: Comprehensive input validation and error handling
- **Auto-cleanup**: Automatic removal of old generated files

## 🏗️ Architecture

### Backend (FastAPI)
```
backend/
├── main.py                     # API endpoints and routing
├── models.py                   # Pydantic data models
├── services/
│   ├── data_service.py         # JSON-based data persistence
│   └── v2/
│       ├── document_service_v2.py  # Document generation
│       └── gotenberg_client.py     # PDF generation client
├── templates/html/
│   ├── gym_log_template.html   # Single workout template
│   └── program_template.html   # Multi-workout program template
└── data/                       # JSON data storage
    ├── programs.json
    └── workouts.json
```

### Frontend (Vanilla JS + Bootstrap)
```
frontend/
├── dashboard.html              # V3 Dashboard interface
├── index.html                  # V2 Single workout (legacy)
├── css/
│   ├── dashboard-v3.css        # Dashboard styling
│   └── style-v2.css           # Legacy V2 styling
└── js/
    ├── dashboard-v3.js         # Dashboard functionality
    └── app-v2.js              # Legacy V2 functionality
```

## 🔌 API Endpoints

### Program Management
- `POST /api/v3/programs` - Create program
- `GET /api/v3/programs` - List programs (with search/pagination)
- `GET /api/v3/programs/{id}` - Get program details
- `PUT /api/v3/programs/{id}` - Update program
- `DELETE /api/v3/programs/{id}` - Delete program
- `GET /api/v3/programs/{id}/details` - Get program with workout details

### Workout Management
- `POST /api/v3/workouts` - Create workout template
- `GET /api/v3/workouts` - List workouts (with search/pagination/tags)
- `GET /api/v3/workouts/{id}` - Get workout details
- `PUT /api/v3/workouts/{id}` - Update workout
- `DELETE /api/v3/workouts/{id}` - Delete workout
- `POST /api/v3/workouts/{id}/duplicate` - Duplicate workout

### Program-Workout Association
- `POST /api/v3/programs/{id}/workouts` - Add workout to program
- `DELETE /api/v3/programs/{id}/workouts/{workout_id}` - Remove workout
- `PUT /api/v3/programs/{id}/workouts/reorder` - Reorder workouts

### Document Generation
- `POST /api/v3/programs/{id}/generate-html` - Generate HTML document
- `POST /api/v3/programs/{id}/generate-pdf` - Generate PDF document
- `POST /api/v3/programs/{id}/preview-html` - Generate preview

### Data Management
- `POST /api/v3/data/backup` - Create data backup
- `POST /api/v3/data/restore` - Restore from backup
- `GET /api/v3/export/programs` - Export programs as JSON
- `GET /api/v3/export/workouts` - Export workouts as JSON
- `GET /api/v3/export/all` - Export all data as JSON
- `POST /api/v3/import` - Import data from JSON file

## 📱 User Interface

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 👻 Ghost Gym V3 - Program Manager Dashboard               │
├─────────────────┬───────────────────────────────────────────┤
│ Programs        │ Program Details / Welcome                 │
│                 │                                           │
│ 📁 Push/Pull/   │ 📊 Program: Push/Pull/Legs Split         │
│    Legs Split   │ ┌─────────────────────────────────────┐   │
│    └ Push Day   │ │ 1. Push Day A                       │   │
│    └ Pull Day   │ │ 6 groups + 2 bonus                  │   │
│    └ Legs Day   │ └─────────────────────────────────────┘   │
│                 │                                           │
│ 📁 Upper/Lower  │ ┌─────────────────────────────────────┐   │
│    └ Upper A    │ │ 2. Pull Day A                       │   │
│    └ Lower A    │ │ 5 groups + 1 bonus                  │   │
│                 │ └─────────────────────────────────────┘   │
├─────────────────┼───────────────────────────────────────────┤
│                 │ Workout Library                           │
│                 │                                           │
│                 │ 💪 Push Day A                             │
│                 │ 💪 Pull Day A                             │
│                 │ 💪 Legs Day A                             │
│                 │ 💪 Upper Body                             │
└─────────────────┴───────────────────────────────────────────┘
```

### Key Interactions
- **Click Program**: View/edit program details
- **Drag Workout**: Add to program or reorder within program
- **Right-click**: Context menus for quick actions
- **Search**: Real-time filtering of programs and workouts
- **Preview**: Full-screen document preview before generation

## 🎨 Design System

### Color Palette
- **Primary**: `#2563eb` (Blue) - Actions, highlights
- **Success**: `#059669` (Green) - Success states, generation
- **Background**: `#0f172a` (Dark Blue) - Main background
- **Cards**: `#1e293b` (Slate) - Panel backgrounds
- **Text**: `#f8fafc` (White) - Primary text
- **Muted**: `#94a3b8` (Gray) - Secondary text

### Typography
- **Font**: Inter, system fonts
- **Headers**: 700 weight, larger sizes
- **Body**: 400-500 weight, readable sizes
- **Code**: Monospace for technical content

### Components
- **Cards**: Rounded corners, subtle shadows, hover effects
- **Buttons**: Gradient backgrounds, hover animations
- **Forms**: Dark theme, proper validation states
- **Modals**: Full-screen on mobile, centered on desktop

## 🔧 Technical Features

### Data Models
```typescript
Program {
  id: string
  name: string
  description?: string
  workouts: ProgramWorkout[]
  duration_weeks?: number
  difficulty_level: string
  tags: string[]
  created_date: datetime
  modified_date: datetime
}

WorkoutTemplate {
  id: string
  name: string
  description?: string
  exercise_groups: ExerciseGroup[]
  bonus_exercises: BonusExercise[]
  is_template: boolean
  tags: string[]
  created_date: datetime
  modified_date: datetime
}

ExerciseGroup {
  group_id: string
  exercises: {[letter]: string}  // {a: "Bench Press", b: "Incline Press"}
  sets: string
  reps: string
  rest: string
}
```

### Document Generation
- **Jinja2 Templates**: Server-side HTML generation
- **CSS Print Styles**: Optimized for A5 printing
- **Page Breaks**: Proper pagination between workouts
- **Gotenberg Integration**: HTML to PDF conversion
- **Fallback Support**: HTML-only mode when PDF unavailable

### Performance Optimizations
- **Lazy Loading**: Load data on demand
- **Debounced Search**: Prevent excessive API calls
- **Event Delegation**: Efficient DOM event handling
- **Caching**: Template compilation and DOM element caching
- **Pagination**: Handle large datasets efficiently

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- FastAPI
- Modern web browser
- Optional: Gotenberg service for PDF generation

### Installation
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Server**:
   ```bash
   python run.py
   ```

3. **Access the Dashboard**:
   - V3 Dashboard: `http://localhost:8000/dashboard`
   - V2 Legacy: `http://localhost:8000/`
   - API Docs: `http://localhost:8000/docs`

### First Steps
1. **Create Your First Workout**:
   - Click "Create Your First Workout" or the + button in Workout Library
   - Add exercise groups with exercises, sets, reps, and rest periods
   - Add bonus exercises if needed
   - Save the workout template

2. **Create Your First Program**:
   - Click "Create Your First Program" or the + button in Programs
   - Give it a name, description, and set difficulty/duration
   - Drag workouts from the library into your program
   - Reorder workouts as needed

3. **Generate Your Document**:
   - Select a program from the left panel
   - Click "Preview" to see the full document
   - Click "Generate" to download HTML or PDF
   - Customize generation options (cover page, table of contents, etc.)

## 🔄 Migration from V2

The V3 system is fully backward compatible:
- **V2 Interface**: Still available at `/` for single workouts
- **V3 Dashboard**: New interface at `/dashboard` for program management
- **Data Coexistence**: Both systems can run simultaneously
- **Gradual Migration**: Users can transition at their own pace

### Converting V2 Workouts
1. Use the V2 interface to create individual workouts
2. In V3, create workout templates with the same exercises
3. Organize templates into programs
4. Export/backup data for safety

## 🛠️ Development

### Adding New Features
1. **Backend**: Add endpoints in [`main.py`](backend/main.py)
2. **Models**: Define data structures in [`models.py`](backend/models.py)
3. **Services**: Add business logic in [`services/`](backend/services/)
4. **Frontend**: Update [`dashboard-v3.js`](frontend/js/dashboard-v3.js)
5. **Styling**: Modify [`dashboard-v3.css`](frontend/css/dashboard-v3.css)

### Testing
- **API Testing**: Use FastAPI's automatic docs at `/docs`
- **Frontend Testing**: Browser developer tools and manual testing
- **Data Validation**: Pydantic models provide automatic validation
- **Error Handling**: Comprehensive error messages and fallbacks

### Deployment
- **Railway**: Configured with [`railway.toml`](railway.toml)
- **Environment Variables**: Configure external services
- **Static Files**: Served directly by FastAPI
- **Database**: JSON files (can be upgraded to PostgreSQL)

## 📈 Future Enhancements

### Planned Features
- **User Authentication**: Multi-user support with accounts
- **Cloud Storage**: Sync data across devices
- **Exercise Database**: Pre-populated exercise library
- **Progress Analytics**: Workout completion tracking
- **Mobile App**: Native iOS/Android applications
- **Social Features**: Share programs with community
- **Advanced Templates**: More document layouts and themes

### Technical Improvements
- **Database Migration**: PostgreSQL for better performance
- **Real-time Sync**: WebSocket updates for multi-device use
- **Offline Support**: Service worker for offline functionality
- **Performance Monitoring**: Analytics and error tracking
- **Automated Testing**: Unit and integration test suites

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Follow Code Standards**: Use existing patterns and conventions
4. **Test Thoroughly**: Ensure all functionality works
5. **Submit Pull Request**: Describe changes and benefits

## 📄 License

This project is part of the Ghost Gym ecosystem. See the main repository for licensing information.

## 🙏 Acknowledgments

- **FastAPI**: Modern Python web framework
- **Bootstrap**: Responsive CSS framework
- **Sortable.js**: Drag and drop functionality
- **Jinja2**: Template engine for document generation
- **Gotenberg**: HTML to PDF conversion service

---

**Ghost Gym V3** - Transform your workout planning with professional program management! 🏋️‍♂️💪