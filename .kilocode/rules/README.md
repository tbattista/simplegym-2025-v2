# Ghost Gym V2 - Kilo Code Rules Documentation

This directory contains custom rules for the Ghost Gym V2 application that define global behaviors, constraints, and standards for AI interactions with the codebase.

## Overview

The rules in this directory ensure consistent development practices, security standards, and user experience across all AI-assisted development work on the Ghost Gym V2 project.

## Rule Files

### Core Rules
- **[`ghost_gym_v2_global_rules.md`](./ghost_gym_v2_global_rules.md)** - Main global rules covering all aspects of the application
- **[`api_standards.md`](./api_standards.md)** - API design and documentation standards
- **[`frontend_standards.md`](./frontend_standards.md)** - Frontend development and UI/UX guidelines

## Rule Categories

### 🔧 Application Configuration
- API settings and service integration
- Environment variable management
- Service availability and fallback handling

### ✅ Data Validation
- Workout data constraints and limits
- Input sanitization and security
- Form validation requirements

### 🎨 UI/UX Standards
- Dark theme consistency
- Accessibility requirements (WCAG AA)
- Responsive design principles
- Loading states and user feedback

### 🔒 Security & Privacy
- File access restrictions
- Data handling policies
- Input sanitization rules

### 📄 Template & Document Rules
- HTML template standards with Jinja2
- PDF generation specifications (A5, margins)
- File naming conventions

### ⚡ Performance Guidelines
- Resource management and cleanup
- Frontend optimization techniques
- Caching strategies

## Usage Examples

### Example 1: Workout Data Validation
When creating or modifying workout-related functionality, the AI will automatically enforce:
- Workout names: 1-50 characters
- Exercise names: 1-100 characters
- Sets: 1-20 numeric values
- Maximum 6 exercise groups + 2 bonus exercises

### Example 2: API Endpoint Creation
New API endpoints will automatically follow:
- RESTful naming with `/api/` prefix
- Proper error response format with detail, error_code, timestamp
- OpenAPI documentation requirements
- Health check standards

### Example 3: Frontend Component Development
UI components will automatically include:
- Dark theme support using CSS custom properties
- Keyboard accessibility (ESC to close modals)
- Loading states for operations >500ms
- WCAG AA color contrast compliance

## File Structure

```
.kilocode/rules/
├── README.md                     # This documentation
├── ghost_gym_v2_global_rules.md  # Main global rules
├── api_standards.md              # API-specific rules
└── frontend_standards.md         # Frontend-specific rules
```

## Rule Loading Priority

According to Kilo Code documentation, rules are loaded in this order:
1. Global rules from `~/.kilocode/rules/` (if any)
2. Project rules from `.kilocode/rules/` (these files)
3. Mode-specific rules (if applicable)

Project rules take precedence over global rules for conflicting directives.

## Key Benefits

### 🎯 Consistency
- Uniform code style and structure
- Consistent API design patterns
- Standardized error handling

### 🛡️ Security
- Automatic input sanitization
- File access restrictions
- Sensitive data protection

### 🚀 Performance
- Optimized resource management
- Efficient DOM manipulation
- Proper cleanup procedures

### ♿ Accessibility
- WCAG AA compliance
- Keyboard navigation support
- Screen reader compatibility

### 📱 User Experience
- Responsive design enforcement
- Loading state management
- Clear error messaging

## Customization

To modify rules:
1. Edit the relevant `.md` file in this directory
2. Rules are automatically applied to new AI interactions
3. Use Markdown headers (`#`, `##`) to organize rule categories
4. Use lists (`-`, `*`) to enumerate specific constraints
5. Include code blocks for examples when needed

## Integration with Development Workflow

These rules automatically guide AI behavior for:
- Code generation and modification
- API endpoint creation
- Frontend component development
- Template and document generation
- Error handling implementation
- Security validation
- Performance optimization

## Validation

The rules are designed to be:
- **Specific**: Clear, actionable constraints
- **Measurable**: Quantifiable limits and standards
- **Achievable**: Realistic within the application context
- **Relevant**: Directly applicable to Ghost Gym V2
- **Time-bound**: Immediate application to all AI interactions

---

*These rules ensure that all AI-assisted development maintains the high standards and consistent experience that Ghost Gym V2 users expect.*