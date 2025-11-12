from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import json
import logging
from app.models.notification import Notification
from app.models.notification_settings import NotificationSettings
from app.models.user import User

logger = logging.getLogger(__name__)

# Default notification settings
DEFAULT_NOTIFICATION_SETTINGS = {
    "api_errors": True,
    "rate_limits": True,
    "usage_thresholds": True,
    "billing_alerts": True,
    "deployment_updates": True,
    "in_app_enabled": True
}


async def get_user_notification_settings(user: User, db: AsyncSession) -> dict:
    """Get user's notification settings"""
    try:
        # Try to get from NotificationSettings table
        result = await db.execute(
            select(NotificationSettings).where(NotificationSettings.user_id == user.id)
        )
        settings_obj = result.scalar_one_or_none()
        
        if settings_obj:
            return {
                "api_errors": settings_obj.api_errors,
                "rate_limits": settings_obj.rate_limits,
                "usage_thresholds": settings_obj.usage_thresholds,
                "billing_alerts": settings_obj.billing_alerts,
                "deployment_updates": settings_obj.deployment_updates,
                "in_app_enabled": settings_obj.in_app_enabled,
            }
        
        # Create default settings if none exist
        default_settings = NotificationSettings(
            user_id=user.id,
            **DEFAULT_NOTIFICATION_SETTINGS
        )
        db.add(default_settings)
        await db.commit()
        await db.refresh(default_settings)
        
        return DEFAULT_NOTIFICATION_SETTINGS.copy()
    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        return DEFAULT_NOTIFICATION_SETTINGS.copy()


async def should_send_notification(user: User, notification_type: str, db: AsyncSession) -> bool:
    """Check if notification should be sent based on user preferences"""
    try:
        settings = await get_user_notification_settings(user, db)
        
        # Check if in-app notifications are enabled
        if not settings.get("in_app_enabled", True):
            return False
        
        # Map notification types to settings
        type_mapping = {
            "api_error": "api_errors",
            "rate_limit": "rate_limits",
            "usage_threshold": "usage_thresholds",
            "billing_alert": "billing_alerts",
            "deployment_update": "deployment_updates",
            "trial_activated": "billing_alerts",
            "trial_ending": "billing_alerts",
            "charge_succeeded": "billing_alerts",
            "charge_failed": "billing_alerts",
            "wrap_created": "deployment_updates",
            "wrap_deployed": "deployment_updates",
        }
        
        setting_key = type_mapping.get(notification_type, "in_app_enabled")
        return settings.get(setting_key, True)
    except Exception as e:
        logger.error(f"Error checking notification preference: {e}")
        return True  # Default to sending if check fails


async def create_notification(
    db: AsyncSession,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    wrapped_api_id: Optional[int] = None,
    metadata: Optional[dict] = None
) -> Optional[Notification]:
    """Create a notification if user preferences allow it"""
    try:
        # Get user to check preferences
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"User {user_id} not found for notification")
            return None
        
        # Check if notification should be sent
        should_send = await should_send_notification(user, notification_type, db)
        if not should_send:
            logger.debug(f"Notification {notification_type} skipped for user {user_id} due to preferences")
            return None
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            wrapped_api_id=wrapped_api_id,
            type=notification_type,
            title=title,
            message=message,
            meta_data=json.dumps(metadata) if metadata else None,
            is_read=False
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
        logger.info(f"Notification created: {notification_type} for user {user_id}")
        return notification
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        await db.rollback()
        return None

