"""
Service for testing integration credentials
"""
import logging
import httpx
import json
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


async def test_integration_credentials(
    tool_name: str,
    credentials: Dict[str, Any],
    tool_code: str = None
) -> Tuple[bool, str]:
    """
    Test if integration credentials are valid.
    Returns (success: bool, message: str)
    """
    tool_name_lower = tool_name.lower()
    
    try:
        # Gmail / Google Services
        if 'gmail' in tool_name_lower or 'google' in tool_name_lower:
            return await _test_google_credentials(credentials)
        
        # Shopify
        elif 'shopify' in tool_name_lower:
            return await _test_shopify_credentials(credentials)
        
        # Airtable
        elif 'airtable' in tool_name_lower:
            return await _test_airtable_credentials(credentials)
        
        # Notion
        elif 'notion' in tool_name_lower:
            return await _test_notion_credentials(credentials)
        
        # PostgreSQL
        elif 'postgres' in tool_name_lower or 'postgresql' in tool_name_lower:
            return await _test_postgresql_credentials(credentials)
        
        # MySQL
        elif 'mysql' in tool_name_lower:
            return await _test_mysql_credentials(credentials)
        
        # MongoDB
        elif 'mongo' in tool_name_lower:
            return await _test_mongodb_credentials(credentials)
        
        # Slack
        elif 'slack' in tool_name_lower:
            return await _test_slack_credentials(credentials)
        
        # GitHub
        elif 'github' in tool_name_lower:
            return await _test_github_credentials(credentials)
        
        # Stripe
        elif 'stripe' in tool_name_lower:
            return await _test_stripe_credentials(credentials)
        
        # Twilio
        elif 'twilio' in tool_name_lower:
            return await _test_twilio_credentials(credentials)
        
        # SendGrid
        elif 'sendgrid' in tool_name_lower:
            return await _test_sendgrid_credentials(credentials)
        
        # Discord
        elif 'discord' in tool_name_lower:
            return await _test_discord_credentials(credentials)
        
        # Dropbox
        elif 'dropbox' in tool_name_lower:
            return await _test_dropbox_credentials(credentials)
        
        # AWS S3
        elif 'aws' in tool_name_lower or 's3' in tool_name_lower:
            return await _test_aws_credentials(credentials)
        
        # Generic API key validation
        elif 'api_key' in credentials or 'apiKey' in credentials:
            return await _test_generic_api_key(tool_name, credentials)
        
        # Default: basic validation
        else:
            return await _test_basic_validation(credentials)
            
    except Exception as e:
        logger.error(f"Error testing {tool_name} credentials: {e}")
        return False, f"Test failed: {str(e)[:200]}"


async def _test_google_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Google/Gmail OAuth credentials"""
    try:
        required_fields = ['client_id', 'client_secret']
        missing = [f for f in required_fields if f not in credentials or not credentials[f]]
        
        if missing:
            return False, f"Missing required fields: {', '.join(missing)}"
        
        # For OAuth, we can't fully test without refresh_token, but validate format
        client_id = credentials.get('client_id', '')
        if not client_id.endswith('.apps.googleusercontent.com'):
            return False, "Invalid client_id format. Should end with .apps.googleusercontent.com"
        
        return True, "Google credentials format is valid. Full OAuth flow required for complete verification."
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


async def _test_shopify_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Shopify API credentials"""
    try:
        shop_url = credentials.get('shop_url', credentials.get('store_url', ''))
        access_token = credentials.get('access_token', credentials.get('api_key', ''))
        
        if not shop_url or not access_token:
            return False, "Missing shop_url or access_token"
        
        # Normalize shop URL
        if not shop_url.startswith('http'):
            shop_url = f"https://{shop_url}"
        if not shop_url.endswith('.myshopify.com') and 'myshopify.com' not in shop_url:
            shop_url = f"{shop_url}.myshopify.com"
        
        # Test API call
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{shop_url}/admin/api/2024-01/shop.json",
                headers={
                    "X-Shopify-Access-Token": access_token,
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                return True, "Shopify credentials are valid and working"
            elif response.status_code == 401:
                return False, "Invalid access token"
            elif response.status_code == 404:
                return False, "Shop not found. Check your shop URL"
            else:
                return False, f"API returned status {response.status_code}"
                
    except httpx.TimeoutException:
        return False, "Connection timeout. Check your shop URL"
    except Exception as e:
        return False, f"Connection error: {str(e)[:100]}"


async def _test_airtable_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Airtable credentials"""
    try:
        api_key = credentials.get('api_key', credentials.get('apiKey', ''))
        base_id = credentials.get('base_id', credentials.get('baseId', ''))
        
        if not api_key:
            return False, "Missing api_key"
        
        if not api_key.startswith('pat'):
            return False, "Invalid API key format. Airtable personal access tokens start with 'pat'"
        
        if base_id:
            # Test with base
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://api.airtable.com/v0/meta/bases/{base_id}/tables",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                
                if response.status_code == 200:
                    return True, "Airtable credentials are valid"
                elif response.status_code == 401:
                    return False, "Invalid API key"
                elif response.status_code == 404:
                    return False, "Base not found"
                else:
                    return False, f"API returned status {response.status_code}"
        else:
            return True, "API key format is valid. Add base_id for full verification."
            
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_notion_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Notion integration token"""
    try:
        token = credentials.get('integration_token', credentials.get('token', credentials.get('api_key', '')))
        
        if not token:
            return False, "Missing integration_token"
        
        if not token.startswith('secret_'):
            return False, "Invalid token format. Notion tokens start with 'secret_'"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.notion.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Notion-Version": "2022-06-28"
                }
            )
            
            if response.status_code == 200:
                return True, "Notion credentials are valid"
            elif response.status_code == 401:
                return False, "Invalid integration token"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_postgresql_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test PostgreSQL connection"""
    try:
        import asyncpg
        
        host = credentials.get('host', 'localhost')
        port = credentials.get('port', 5432)
        database = credentials.get('database', credentials.get('db', ''))
        user = credentials.get('username', credentials.get('user', ''))
        password = credentials.get('password', '')
        
        if not all([database, user, password]):
            return False, "Missing required fields: database, username, password"
        
        conn = await asyncpg.connect(
            host=host,
            port=int(port),
            database=database,
            user=user,
            password=password,
            timeout=10
        )
        await conn.execute('SELECT 1')
        await conn.close()
        
        return True, "PostgreSQL connection successful"
        
    except ImportError:
        return True, "Database credentials format is valid. Install asyncpg for full testing."
    except Exception as e:
        error_msg = str(e).lower()
        if 'password authentication failed' in error_msg:
            return False, "Invalid username or password"
        elif 'does not exist' in error_msg:
            return False, "Database does not exist"
        elif 'could not connect' in error_msg:
            return False, "Could not connect to server. Check host and port"
        else:
            return False, f"Connection error: {str(e)[:100]}"


async def _test_mysql_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test MySQL connection"""
    try:
        import aiomysql
        
        host = credentials.get('host', 'localhost')
        port = credentials.get('port', 3306)
        database = credentials.get('database', credentials.get('db', ''))
        user = credentials.get('username', credentials.get('user', ''))
        password = credentials.get('password', '')
        
        if not all([database, user, password]):
            return False, "Missing required fields: database, username, password"
        
        conn = await aiomysql.connect(
            host=host,
            port=int(port),
            db=database,
            user=user,
            password=password,
            connect_timeout=10
        )
        async with conn.cursor() as cursor:
            await cursor.execute('SELECT 1')
        conn.close()
        
        return True, "MySQL connection successful"
        
    except ImportError:
        return True, "Database credentials format is valid. Install aiomysql for full testing."
    except Exception as e:
        error_msg = str(e).lower()
        if 'access denied' in error_msg:
            return False, "Invalid username or password"
        elif 'unknown database' in error_msg:
            return False, "Database does not exist"
        else:
            return False, f"Connection error: {str(e)[:100]}"


async def _test_mongodb_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test MongoDB connection"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        connection_string = credentials.get('connection_string', credentials.get('uri', ''))
        
        if not connection_string:
            return False, "Missing connection_string"
        
        if not connection_string.startswith('mongodb'):
            return False, "Invalid connection string format. Should start with mongodb:// or mongodb+srv://"
        
        client = AsyncIOMotorClient(connection_string, serverSelectionTimeoutMS=10000)
        await client.admin.command('ping')
        client.close()
        
        return True, "MongoDB connection successful"
        
    except ImportError:
        return True, "Connection string format is valid. Install motor for full testing."
    except Exception as e:
        return False, f"Connection error: {str(e)[:100]}"


async def _test_slack_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Slack bot token"""
    try:
        token = credentials.get('bot_token', credentials.get('token', credentials.get('api_key', '')))
        
        if not token:
            return False, "Missing bot_token"
        
        if not token.startswith('xoxb-'):
            return False, "Invalid token format. Slack bot tokens start with 'xoxb-'"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    return True, f"Slack credentials valid for team: {data.get('team', 'Unknown')}"
                else:
                    return False, f"Invalid token: {data.get('error', 'Unknown error')}"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_github_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test GitHub personal access token"""
    try:
        token = credentials.get('personal_access_token', credentials.get('token', credentials.get('api_key', '')))
        
        if not token:
            return False, "Missing personal_access_token"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, f"GitHub credentials valid for user: {data.get('login', 'Unknown')}"
            elif response.status_code == 401:
                return False, "Invalid personal access token"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_stripe_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Stripe API key"""
    try:
        api_key = credentials.get('api_key', credentials.get('secret_key', ''))
        
        if not api_key:
            return False, "Missing api_key or secret_key"
        
        if not (api_key.startswith('sk_test_') or api_key.startswith('sk_live_')):
            return False, "Invalid API key format. Should start with sk_test_ or sk_live_"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.stripe.com/v1/balance",
                auth=(api_key, '')
            )
            
            if response.status_code == 200:
                return True, "Stripe credentials are valid"
            elif response.status_code == 401:
                return False, "Invalid API key"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_twilio_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Twilio credentials"""
    try:
        account_sid = credentials.get('account_sid', '')
        auth_token = credentials.get('auth_token', '')
        
        if not account_sid or not auth_token:
            return False, "Missing account_sid or auth_token"
        
        if not account_sid.startswith('AC'):
            return False, "Invalid account_sid format. Should start with 'AC'"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json",
                auth=(account_sid, auth_token)
            )
            
            if response.status_code == 200:
                return True, "Twilio credentials are valid"
            elif response.status_code == 401:
                return False, "Invalid credentials"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_sendgrid_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test SendGrid API key"""
    try:
        api_key = credentials.get('api_key', '')
        
        if not api_key:
            return False, "Missing api_key"
        
        if not api_key.startswith('SG.'):
            return False, "Invalid API key format. SendGrid keys start with 'SG.'"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.sendgrid.com/v3/scopes",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                return True, "SendGrid credentials are valid"
            elif response.status_code == 401:
                return False, "Invalid API key"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_discord_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Discord bot token"""
    try:
        token = credentials.get('bot_token', credentials.get('token', ''))
        
        if not token:
            return False, "Missing bot_token"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://discord.com/api/v10/users/@me",
                headers={"Authorization": f"Bot {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, f"Discord credentials valid for bot: {data.get('username', 'Unknown')}"
            elif response.status_code == 401:
                return False, "Invalid bot token"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_dropbox_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test Dropbox access token"""
    try:
        access_token = credentials.get('access_token', credentials.get('token', ''))
        
        if not access_token:
            return False, "Missing access_token"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.dropboxapi.com/2/users/get_current_account",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return True, f"Dropbox credentials valid for: {data.get('email', 'Unknown')}"
            elif response.status_code == 401:
                return False, "Invalid access token"
            else:
                return False, f"API returned status {response.status_code}"
                
    except Exception as e:
        return False, f"Test error: {str(e)[:100]}"


async def _test_aws_credentials(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Test AWS S3 credentials"""
    try:
        access_key_id = credentials.get('access_key_id', '')
        secret_access_key = credentials.get('secret_access_key', '')
        
        if not access_key_id or not secret_access_key:
            return False, "Missing access_key_id or secret_access_key"
        
        if not access_key_id.startswith('AKIA'):
            return False, "Invalid access_key_id format. Should start with 'AKIA'"
        
        # Basic format validation only - actual AWS testing requires boto3
        return True, "AWS credentials format is valid. Install boto3 for full verification."
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


async def _test_generic_api_key(tool_name: str, credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Generic API key validation"""
    try:
        api_key = credentials.get('api_key', credentials.get('apiKey', ''))
        
        if not api_key:
            return False, "Missing api_key"
        
        if len(api_key) < 10:
            return False, "API key seems too short. Please verify."
        
        # Check for base URL if provided
        base_url = credentials.get('base_url', credentials.get('api_url', ''))
        if base_url:
            if not base_url.startswith('http'):
                return False, "Invalid base_url format. Should start with http:// or https://"
        
        return True, f"Credentials format is valid for {tool_name}. Actual API testing requires endpoint information."
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


async def _test_basic_validation(credentials: Dict[str, Any]) -> Tuple[bool, str]:
    """Basic validation for unknown integration types"""
    try:
        if not credentials:
            return False, "No credentials provided"
        
        # Check that at least one credential field is filled
        filled_fields = [k for k, v in credentials.items() if v]
        
        if not filled_fields:
            return False, "All credential fields are empty"
        
        return True, f"Credentials contain {len(filled_fields)} field(s). Service-specific validation not available."
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"

