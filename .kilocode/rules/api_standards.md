# API Standards and Conventions

These rules define how APIs should be structured and documented in the Ghost Gym V2 application.

## Endpoint Naming
- Use RESTful conventions for endpoint naming
- All endpoints must start with `/api/` prefix
- Use kebab-case for multi-word endpoints (e.g., `/api/preview-html`)
- Version endpoints when breaking changes are introduced

## Request/Response Format
- All POST requests must accept JSON payloads
- All responses must include proper HTTP status codes
- Error responses must follow consistent format:
  ```json
  {
    "detail": "Human-readable error message",
    "error_code": "SPECIFIC_ERROR_CODE",
    "timestamp": "ISO-8601 timestamp"
  }
  ```

## Documentation Requirements
- All endpoints must be documented with OpenAPI/Swagger
- Include example requests and responses
- Document all possible error conditions
- Specify required vs optional parameters

## Health and Status Endpoints
- `/api/health` must return basic service status
- `/api/status` must include detailed service availability information
- Health checks should complete within 2 seconds
- Status endpoints should not require authentication

## File Upload/Download Standards
- Use proper MIME types for file responses
- Include `Content-Disposition` headers for downloads
- Validate file types before processing
- Limit file sizes to prevent abuse
- Clean up temporary files after operations