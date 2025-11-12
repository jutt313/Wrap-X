from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
import json
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.models.notification_settings import NotificationSettings as NotificationSettingsModel
from app.auth.dependencies import get_current_active_user
from app.schemas.notification import NotificationSettings, NotificationSettingsUpdate
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Default notification settings
DEFAULT_NOTIFICATION_SETTINGS = {
    "api_errors": True,
    "rate_limits": True,
    "usage_thresholds": True,
    "billing_alerts": True,
    "deployment_updates": True,
    "in_app_enabled": True
}


@router.get("")
async def get_notifications(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user notifications (paginated, unread first)"""
    try:
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.is_read.asc(), Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        notifications = result.scalars().all()
        
        return [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
                "metadata": n.meta_data
            }
            for n in notifications
        ]
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark notification as read"""
    try:
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        notification.is_read = True
        await db.commit()
        
        return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )


@router.patch("/mark-all-read")
async def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read"""
    try:
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
        notifications = result.scalars().all()
        
        for notification in notifications:
            notification.is_read = True
        
        await db.commit()
        
        return {"message": f"{len(notifications)} notifications marked as read"}
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notifications"
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a single notification"""
    try:
        # First check if notification exists and belongs to user
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Delete the notification using delete statement
        await db.execute(
            delete(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
        await db.commit()
        
        return {"message": "Notification deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )


@router.delete("/all")
async def delete_all_notifications(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all notifications for the user"""
    try:
        result = await db.execute(
            delete(Notification).where(
                Notification.user_id == current_user.id
            )
        )
        await db.commit()
        
        return {"message": "All notifications deleted"}
    except Exception as e:
        logger.error(f"Error deleting all notifications: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notifications"
        )


@router.get("/settings", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user notification settings"""
    try:
        result = await db.execute(
            select(NotificationSettingsModel).where(NotificationSettingsModel.user_id == current_user.id)
        )
        settings_obj = result.scalar_one_or_none()
        
        if settings_obj:
            return NotificationSettings(
                api_errors=settings_obj.api_errors,
                rate_limits=settings_obj.rate_limits,
                usage_thresholds=settings_obj.usage_thresholds,
                billing_alerts=settings_obj.billing_alerts,
                deployment_updates=settings_obj.deployment_updates,
                in_app_enabled=settings_obj.in_app_enabled,
            )
        
        # Create default settings if none exist
        default_settings = NotificationSettingsModel(
            user_id=current_user.id,
            **DEFAULT_NOTIFICATION_SETTINGS
        )
        db.add(default_settings)
        await db.commit()
        await db.refresh(default_settings)
        
        return NotificationSettings(**DEFAULT_NOTIFICATION_SETTINGS)
    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        return NotificationSettings(**DEFAULT_NOTIFICATION_SETTINGS)


@router.put("/settings", response_model=NotificationSettings)
async def update_notification_settings(
    settings_update: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user notification settings"""
    try:
        result = await db.execute(
            select(NotificationSettingsModel).where(NotificationSettingsModel.user_id == current_user.id)
        )
        settings_obj = result.scalar_one_or_none()
        
        if not settings_obj:
            # Create new settings
            settings_obj = NotificationSettingsModel(
                user_id=current_user.id,
                **DEFAULT_NOTIFICATION_SETTINGS
            )
            db.add(settings_obj)
        
        # Update with new values
        update_data = settings_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(settings_obj, key):
                setattr(settings_obj, key, value)
        
        await db.commit()
        await db.refresh(settings_obj)
        
        return NotificationSettings(
            api_errors=settings_obj.api_errors,
            rate_limits=settings_obj.rate_limits,
            usage_thresholds=settings_obj.usage_thresholds,
            billing_alerts=settings_obj.billing_alerts,
            deployment_updates=settings_obj.deployment_updates,
            in_app_enabled=settings_obj.in_app_enabled,
        )
    except Exception as e:
        logger.error(f"Error updating notification settings: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )

