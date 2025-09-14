# Frontend Development Standards

These rules define frontend development practices and UI/UX standards for Ghost Gym V2.

## JavaScript Code Standards
- Use modern ES6+ syntax and features
- All async operations must include proper error handling
- Use meaningful variable and function names
- Implement proper event delegation for dynamic content
- Debounce rapid user inputs to prevent performance issues

## UI Component Rules
- All components must support the dark theme
- Interactive elements must have hover and focus states
- Loading states must be shown for operations taking >500ms
- Form validation must provide real-time feedback
- Error messages must be clear and actionable

## CSS and Styling Standards
- Always use CSS custom properties (variables) defined in `:root`
- Follow the established color palette and gradients
- Maintain consistent spacing using Bootstrap utilities
- Ensure responsive design works on mobile devices
- Use semantic class names that describe purpose, not appearance

## Accessibility Requirements
- All interactive elements must be keyboard accessible
- Color contrast must meet WCAG AA standards
- Include proper ARIA labels and roles
- Loading spinners must include screen reader text
- Form labels must be properly associated with inputs

## Performance Guidelines
- Minimize DOM manipulations during updates
- Use event delegation for dynamically generated content
- Lazy load non-critical components
- Cache frequently accessed DOM elements
- Optimize animations for 60fps performance

## Form Handling Standards
- Validate inputs in real-time
- Disable form submission during processing
- Show clear success and error states
- Preserve user input during validation errors
- Use proper input types for better mobile experience

## Modal and Dialog Rules
- Modals must be keyboard accessible (ESC to close)
- Focus management when opening/closing modals
- Prevent body scroll when modal is open
- Include proper close buttons and actions
- Support both click and keyboard interactions