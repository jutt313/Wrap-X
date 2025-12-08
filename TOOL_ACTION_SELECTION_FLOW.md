# Tool Action Selection Flow

## Overview
New implementation allows users to see and select specific actions/capabilities before generating tool integrations. The system searches online for the latest API documentation and extracts all available actions for user selection.

## Flow

### 1. User mentions a tool
User: "I want to connect Slack"

### 2. System searches online for API documentation
- Searches Google for: "Slack API authentication methods", "Slack API available endpoints", etc.
- Gets latest, real-time documentation

### 3. AI extracts available actions
Using `tool_action_extractor.py`:
- Analyzes API docs
- Extracts ALL available actions (send messages, read channels, create channels, etc.)
- Groups by category (Messages, Channels, Users, Files)
- Identifies required OAuth scopes for each action

### 4. Frontend shows action selector UI
Beautiful modal with:
- ✅ Checklist of all available actions
- 🔍 Search box to filter actions
- 📑 Category filters (Messages, Channels, Users, etc.)
- ✓ Select All / ✗ Deselect All buttons
- Selected count display
- Documentation link

### 5. User selects desired actions
- Click checkboxes to enable/disable actions
- Can search: "send" to find all send-related actions
- Can filter by category: show only "Messages" actions
- See exactly what each action does

### 6. User clicks "Continue with X actions"

### 7. System generates tool with ONLY selected actions
- Generates Python code for selected actions only
- Identifies required credentials
- Creates OAuth scopes list based on selections

### 8. Credential popup shown
- Shows required fields (client_id, client_secret, etc.)
- Step-by-step instructions
- OAuth flow if needed

## Files Created/Modified

### Backend
1. **`app/services/tool_action_extractor.py`** (NEW)
   - Searches online for API docs
   - Extracts available actions using LLM
   - Returns structured action list

2. **`app/services/chat_service.py`** (MODIFIED)
   - Updated generate_tool handling
   - Two-phase flow: action extraction → tool generation
   - Returns action_selection_data for frontend

3. **`app/services/tool_generator.py`** (MODIFIED)
   - Accepts `selected_actions` parameter
   - Generates code only for selected actions
   - Includes action context in prompts

### Frontend
1. **`frontend/src/components/ToolActionSelector.jsx`** (NEW)
   - Beautiful modal UI for action selection
   - Search and filter functionality
   - Checkbox selections
   - Responsive design

2. **`frontend/src/styles/ToolActionSelector.css`** (NEW)
   - Dark theme styling
   - Smooth animations
   - Responsive layout
   - Accessibility features

3. **`frontend/src/components/ConfigChat.jsx`** (MODIFIED)
   - Detects action_selection_data in response
   - Shows ToolActionSelector modal
   - Handles action confirmation
   - Sends selected actions to generate tool

## Benefits

✅ **No guessing**: User sees exactly what the API can do
✅ **Latest info**: Always searches online for current documentation
✅ **User control**: Choose only needed actions
✅ **Clean UI**: Professional checklist interface
✅ **Better code**: Generated tool only includes selected actions
✅ **Faster**: Skip unnecessary capabilities
✅ **Transparent**: See OAuth scopes for each action

## Example: Connecting Slack

1. User: "connect Slack"
2. System searches Slack API docs online
3. Shows actions:
   - ☐ Send Messages (chat:write)
   - ☐ Read Messages (channels:history)
   - ☐ List Channels (channels:read)
   - ☐ Create Channels (channels:manage)
   - ☐ List Users (users:read)
   - ☐ Upload Files (files:write)
4. User selects: ✓ Send Messages, ✓ List Channels
5. System generates tool with ONLY those 2 actions
6. OAuth scopes: only `chat:write` and `channels:read`
7. Credential popup shows
8. User connects and tool is ready!

## Technical Details

### Action Extraction
```python
{
  "tool_name": "slack",
  "display_name": "Slack",
  "available_actions": [
    {
      "name": "send_message",
      "display_name": "Send Messages",
      "description": "Send messages to channels or users",
      "category": "Messages",
      "requires_scope": "chat:write",
      "selected": false
    },
    ...
  ],
  "categories": ["Messages", "Channels", "Users", "Files"]
}
```

### Tool Generation with Selected Actions
```python
generate_custom_tool(
    tool_name="slack",
    tool_description="Slack integration",
    selected_actions=[
        {"name": "send_message", "display_name": "Send Messages", ...},
        {"name": "list_channels", "display_name": "List Channels", ...}
    ]
)
```

## UI Features

- **Search**: Filter actions by name/description
- **Categories**: Filter by category (Messages, Channels, etc.)
- **Bulk actions**: Select All / Deselect All
- **Counter**: Shows "X / Y selected"
- **Documentation link**: Opens official API docs
- **Responsive**: Works on mobile and desktop
- **Accessible**: Keyboard navigation, ARIA labels
- **Dark theme**: Matches Wrap-X design

## Status
✅ All features implemented and tested
✅ No linter errors
✅ Clean, production-ready code

