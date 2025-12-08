import requests
from typing import Dict, Any

def execute_tool(action: str, params: Dict[str, Any], credentials: Dict[str, str]) -> Dict[str, Any]:
    """
    Execute Slack API calls

    Supported actions:
    - 'send_message', 'retrieve_messages'
    - 'list_channels', 'create_channel', 'join_channel'
    - 'list_users', 'get_user_info'
    - 'upload_file', 'list_files'
    """
    base_url = "https://slack.com/api"
    headers = {
        "Authorization": f"Bearer {credentials.get('access_token')}",
        "Content-Type": "application/json"
    }
    
    try:
        if action == "send_message":
            response = requests.post(
                f"{base_url}/chat.postMessage",
                headers=headers,
                json=params
            )
        elif action == "retrieve_messages":
            response = requests.get(
                f"{base_url}/conversations.history",
                headers=headers,
                params=params
            )
        elif action == "list_channels":
            response = requests.get(
                f"{base_url}/conversations.list",
                headers=headers
            )
        elif action == "create_channel":
            response = requests.post(
                f"{base_url}/conversations.create",
                headers=headers,
                json=params
            )
        elif action == "join_channel":
            response = requests.post(
                f"{base_url}/conversations.join",
                headers=headers,
                json=params
            )
        elif action == "list_users":
            response = requests.get(
                f"{base_url}/users.list",
                headers=headers
            )
        elif action == "get_user_info":
            response = requests.get(
                f"{base_url}/users.info",
                headers=headers,
                params=params
            )
        elif action == "upload_file":
            response = requests.post(
                f"{base_url}/files.upload",
                headers=headers,
                files=params
            )
        elif action == "list_files":
            response = requests.get(
                f"{base_url}/files.list",
                headers=headers
            )
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
        
        response.raise_for_status()
        return {"success": True, "data": response.json()}
        
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}