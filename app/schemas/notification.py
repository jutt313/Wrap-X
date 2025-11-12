from pydantic import BaseModel
from typing import Optional

class NotificationSettings(BaseModel):
    """Schema for notification settings"""
    api_errors: bool = True
    rate_limits: bool = True
    usage_thresholds: bool = True
    billing_alerts: bool = True
    deployment_updates: bool = True
    in_app_enabled: bool = True

class NotificationSettingsUpdate(BaseModel):
    """Schema for updating notification settings"""
    api_errors: Optional[bool] = None
    rate_limits: Optional[bool] = None
    usage_thresholds: Optional[bool] = None
    billing_alerts: Optional[bool] = None
    deployment_updates: Optional[bool] = None
    in_app_enabled: Optional[bool] = None

