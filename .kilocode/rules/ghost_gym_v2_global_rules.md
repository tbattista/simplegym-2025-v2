# Ghost Gym V2 - Global Rules

This file defines global application settings, validation rules, and constraints for the Ghost Gym V2 workout log generator system.

## Application Configuration

### API Settings
- Always use FastAPI with proper CORS configuration for development
- Default API port should be 8000
- API timeout for external services should not exceed 30 seconds
- All API endpoints must include proper error handling with HTTPException
- API responses must include version information in headers

### Service Integration Rules
- Gotenberg service URL must be configurable via environment variables
- Always check service availability before attempting PDF generation
- Fallback gracefully to HTML-only mode when PDF services are unavailable
- Service health checks should timeout after 5 seconds maximum

## Data Validation Rules

### Workout Data Constraints
- Workout names must be between 1-50 characters
- Exercise names must be between 1-100 characters
- Sets must be numeric values between 1-20
- Reps can be numeric ranges (e.g., "8-12") or single numbers, max 999
- Rest periods must follow format: number + unit (s/min) e.g., "60s", "2min"
- Workout dates must be in YYYY-MM-DD format
- Maximum 6 exercise groups per workout
- Maximum 2 bonus exercises per workout

### Input Sanitization
- All text inputs must be trimmed of whitespace
- HTML entities must be escaped in user inputs
- No script tags or executable content allowed in any text fields
- File uploads restricted to .html and .pdf extensions only

## Template and Document Rules

### HTML Template Standards
- All templates must use Jinja2 syntax with proper escaping
- Template variables must follow snake_case naming convention
- Missing template variables should default to empty strings, never cause errors
- Templates must be responsive and print-friendly
- CSS must be embedded in templates for PDF generation compatibility

### PDF Generation Rules
- PDF paper size must be A5 (5.83" x 8.27")
- Margins: 0.4" top/bottom, 0.3" left/right
- Always enable background printing for proper styling
- PDF generation timeout: 30 seconds maximum
- Fallback to HTML download if PDF generation fails

### File Naming Conventions
- Generated files must follow pattern: `gym_log_{workout_name}_{date}.{extension}`
- Replace spaces in workout names with underscores
- Use ISO date format (YYYY-MM-DD) in filenames
- All generated files must include timestamp for uniqueness

## Security and Privacy Rules

### File Access Restrictions
- Never read or access files outside the project directory
- Uploaded files must be stored in designated `backend/uploads/` directory only
- Automatically clean up generated files older than 24 hours
- No access to system files, credentials, or sensitive data

### Data Handling
- Never log sensitive user data (personal information, workout details)
- All file operations must include proper error handling
- Temporary files must be cleaned up after use
- No persistent storage of user workout data beyond session

## UI/UX Standards

### Design System Rules
- Always use the defined CSS custom properties (CSS variables) for colors
- Dark theme is the primary theme - all components must support it
- Maintain consistent spacing using Bootstrap's spacing utilities
- All interactive elements must have hover and focus states
- Loading states must be shown for operations taking >500ms

### Form Validation
- Real-time validation feedback for all form inputs
- Clear error messages that explain what needs to be fixed
- Success states must be visually distinct and informative
- Form submission must be disabled during processing

### Accessibility Requirements
- All interactive elements must be keyboard accessible
- Color contrast must meet WCAG AA standards
- Loading spinners must include screen reader text
- Form labels must be properly associated with inputs

## Performance and Resource Management

### File Management
- Automatic cleanup of files older than 24 hours in uploads directory
- Maximum file size for generated documents: 10MB
- Limit concurrent PDF generation requests to prevent resource exhaustion
- Cache template compilation for better performance

### Frontend Performance
- Minimize DOM manipulations during form updates
- Use event delegation for dynamically generated content
- Debounce rapid user inputs (accordion updates, form validation)
- Lazy load non-critical UI components

## Error Handling Standards

### Backend Error Handling
- All service methods must include try-catch blocks
- Errors must be logged with appropriate detail level
- User-facing errors must be sanitized and helpful
- Service unavailability must be handled gracefully

### Frontend Error Handling
- Network errors must show user-friendly messages
- Failed operations must provide retry options where appropriate
- Error states must not break the overall application flow
- Console errors should be minimized in production

## Development and Deployment Rules

### Code Quality Standards
- All functions must include proper type hints (Python) or JSDoc (JavaScript)
- No hardcoded URLs or configuration values
- Environment variables must be used for all external service configurations
- All async operations must include proper error handling

### Testing Requirements
- All API endpoints must be testable without external dependencies
- Mock external services (Gotenberg) in tests
- Form validation logic must be unit tested
- Template rendering must be tested with various data scenarios

## Integration Rules

### External Service Integration
- Always check service availability before making requests
- Implement circuit breaker pattern for unreliable services
- Provide meaningful fallback options when services are unavailable
- Log service interaction metrics for monitoring

### Railway Deployment
- Environment variables must be properly configured for production
- Health check endpoints must be available for monitoring
- Static file serving must work correctly in production environment
- Database connections (if added) must include proper pooling and timeouts

## Monitoring and Logging

### Application Monitoring
- Log application startup and shutdown events
- Monitor PDF generation success/failure rates
- Track template rendering performance
- Log service availability status changes

### User Experience Monitoring
- Track form submission success rates
- Monitor document generation completion times
- Log user interface errors and recovery actions
- Track feature usage patterns for optimization

---

*These rules ensure consistent behavior, security, and user experience across the Ghost Gym V2 application. All AI interactions with this codebase must follow these guidelines.*