# Integration & Tooling Testing Guide

## Overview
This guide covers the new credential testing, tool generation retry logic, and integration CRUD features implemented in Wrap-X.

## Features Implemented

### 1. Credential Testing
- **Backend**: `POST /api/wrapped-apis/{id}/integrations/{tool_name}/test`
- **Service**: `app/services/integration_test_service.py`
- **Frontend**: Test button in `ToolCredentialPopup`
- **Supported Services**:
  - Gmail/Google Services (OAuth validation)
  - Shopify (API + store validation)
  - Airtable (API key + base validation)
  - Notion (integration token validation)
  - PostgreSQL (connection test)
  - MySQL (connection test)
  - MongoDB (ping test)
  - Slack (bot token validation)
  - GitHub (PAT validation)
  - Stripe (API key validation)
  - Twilio (account validation)
  - SendGrid (API key validation)
  - Discord (bot token validation)
  - Dropbox (access token validation)
  - AWS S3 (format validation)
  - Generic API key validation

### 2. Tool Generation Retry Logic
- **Implementation**: `@retry_with_backoff` decorator in `app/services/tool_generator.py`
- **Retry Strategy**:
  - Max 3 attempts
  - Exponential backoff (1s, 2s, 4s)
  - Retries on: Rate limits, API errors, network timeouts
  - No retry on: Authentication errors, validation errors
- **Logging**: Each retry attempt is logged for debugging

### 3. Integration CRUD Operations
- **List**: `GET /api/wrapped-apis/{id}/integrations`
- **Create/Update**: `POST /api/wrapped-apis/{id}/integrations`
- **Test**: `POST /api/wrapped-apis/{id}/integrations/{tool_name}/test`
- **Update Metadata**: `PATCH /api/wrapped-apis/{id}/integrations/{tool_name}`
- **Delete**: `DELETE /api/wrapped-apis/{id}/integrations/{tool_name}`

### 4. Frontend UX Improvements
- Test Connection button in credential popup
- Real-time test result display (success/error banner)
- Timestamp display for connected integrations
- Edit/Delete buttons in Settings modal
- Validation prevents saving invalid credentials
- Loading states for all async operations

## Testing Instructions

### Testing Credential Validation

1. **Start the backend server**:
   ```bash
   cd /Users/chaffanjutt/Downloads/dev/Wrap-x
   source venv/bin/activate
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Credential Form**:
   - Create or edit a wrapped API
   - Open Config Chat
   - Request integration (e.g., "connect Gmail", "add Shopify")
   - Click on the integration button that appears
   - Fill in credential fields
   - Click "Test Connection" before saving
   - Observe success/error message
   - Save if test succeeds

### Testing Integration Management

1. **View Integrations**:
   - Open Settings modal (gear icon)
   - Scroll to "Connected Integrations" section
   - View list of all connected tools with timestamps

2. **Edit Integration**:
   - Click "Edit" on any integration
   - Modify credentials
   - Test connection
   - Save changes

3. **Delete Integration**:
   - Click "Remove" on any integration
   - Confirm deletion
   - Verify integration is removed from list

### Testing Retry Logic

1. **Simulate Rate Limit** (requires OpenAI API):
   - Make multiple rapid requests for tool generation
   - Check backend logs for retry attempts:
     ```
     WARNING: Rate limit hit on attempt 1/3, retrying in 1.0s...
     ```

2. **Simulate Network Error**:
   - Disconnect internet briefly during tool generation
   - Observe retry attempts in logs
   - Tool generation should succeed on reconnection

### Testing Individual Services

#### Gmail/Google Services
```json
{
  "client_id": "your-client-id.apps.googleusercontent.com",
  "client_secret": "your-client-secret",
  "refresh_token": "your-refresh-token"
}
```
Expected: Validates client_id format

#### Shopify
```json
{
  "shop_url": "your-store.myshopify.com",
  "access_token": "your-access-token"
}
```
Expected: Tests API connection to shop

#### Airtable
```json
{
  "api_key": "patXXXXXXXXXXXXXX",
  "base_id": "appXXXXXXXXXXXXXX"
}
```
Expected: Tests API connection and validates key format

#### PostgreSQL
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "pass"
}
```
Expected: Attempts connection and runs `SELECT 1`

## Error Handling

### Backend Errors
- Invalid credentials return `{"success": false, "message": "..."}`
- Network timeouts return connection error messages
- Missing fields return validation error messages

### Frontend Errors
- Display inline error messages for validation failures
- Show banner with error message for test failures
- Disable save button until validation passes

## API Response Formats

### Test Integration Response
```json
{
  "success": true,
  "message": "Connection successful!",
  "tool_name": "gmail"
}
```

### List Integrations Response
```json
[
  {
    "name": "gmail",
    "display_name": "Gmail",
    "description": "Access Gmail API",
    "is_connected": true,
    "fields": [...],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  }
]
```

### Integration Create/Update Response
```json
{
  "name": "gmail",
  "display_name": "Gmail",
  "description": "Access Gmail API",
  "is_connected": true,
  "fields": [...],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

## Database Schema

### WrapTool
- `id`: Primary key
- `wrap_id`: Foreign key to wrapped_apis
- `tool_name`: Unique tool identifier
- `tool_code`: Python function code
- `description`: Tool description
- `is_active`: Boolean flag
- `created_at`, `updated_at`: Timestamps

### WrapCredential
- `id`: Primary key
- `wrap_id`: Foreign key to wrapped_apis
- `tool_id`: Foreign key to wrap_tools
- `tool_name`: Tool identifier
- `credentials_json`: Encrypted JSON blob
- `tool_metadata`: JSON with field definitions
- `created_at`, `updated_at`: Timestamps

## Security Notes

1. **Encryption**: All credentials are encrypted using Fernet before storage
2. **Transmission**: Credentials sent over HTTPS only
3. **Access Control**: Users can only access their own integrations
4. **Credential Display**: Saved credentials are never returned to frontend (read-only mode shows masked values)

## Troubleshooting

### Test Connection Fails
- Check backend logs for specific error
- Verify credentials are correct
- Ensure service is accessible from backend
- Check for firewall/network restrictions

### Integration Not Saving
- Check browser console for errors
- Verify all required fields are filled
- Ensure backend is running
- Check for validation errors

### Retry Logic Not Working
- Check backend logs for retry attempts
- Verify OpenAI API key is configured
- Check network connectivity
- Review error type (some errors don't trigger retries)

## Next Steps

1. Add more service-specific validators
2. Implement OAuth flow helpers
3. Add connection health monitoring
4. Create automated test suite
5. Add webhook configuration support

