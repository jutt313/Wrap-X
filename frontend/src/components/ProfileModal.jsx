import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { notificationService } from '../services/notificationService';
import '../styles/ProfileModal.css';

function ProfileModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'notifications'
  
  // Form states
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    api_errors: true,
    rate_limits: true,
    usage_thresholds: true,
    billing_alerts: true,
    deployment_updates: true,
    in_app_enabled: true
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const fileInputRef = useRef(null);

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
      setAvatarPreview(user.avatar_url || null);
      setError(null);
      setSuccess(null);
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadNotificationSettings();
    }
  }, [isOpen, user]);

  // Load notification settings
  const loadNotificationSettings = async () => {
    setLoadingSettings(true);
    try {
      const settings = await notificationService.getSettings();
      setNotificationSettings(settings);
    } catch (err) {
      console.error('Error loading notification settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Handle notification settings update
  const handleNotificationSettingChange = async (key, value) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    setSavingSettings(true);
    try {
      await notificationService.updateSettings({ [key]: value });
    } catch (err) {
      console.error('Error updating notification setting:', err);
      // Revert on error
      setNotificationSettings(notificationSettings);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      // For now, we'll use data URL. In production, upload to server and get URL
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  // Handle avatar upload button click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Handle remove avatar
  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle profile update
  const handleSaveProfile = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updatedUser = await profileService.updateProfile(name, avatarUrl);
      setUser(updatedUser);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);

    try {
      await profileService.changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess('Password updated successfully!');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">Profile Settings</h2>
          <button className="profile-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-modal-tabs">
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`profile-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notification Settings
          </button>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          {activeTab === 'profile' ? (
            <>
              {/* Success/Error Messages */}
              {success && (
            <div className="profile-message success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {success}
            </div>
          )}
          {error && (
            <div className="profile-message error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Profile Image Section */}
          <div className="profile-section">
            <label className="profile-section-label">Profile Picture</label>
            <div className="profile-avatar-section">
              <div className="profile-avatar-container">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="profile-avatar-overlay">
                  <button
                    type="button"
                    className="profile-avatar-btn"
                    onClick={handleAvatarClick}
                    title="Change photo"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      className="profile-avatar-btn remove"
                      onClick={handleRemoveAvatar}
                      title="Remove photo"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <p className="profile-avatar-hint">
                JPG, PNG or WebP. Max size 2MB
              </p>
            </div>
          </div>

          {/* Profile Info Section */}
          <div className="profile-section">
            <label className="profile-section-label" htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="profile-section">
            <label className="profile-section-label">Email</label>
            <input
              type="email"
              className="profile-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <p className="profile-hint">Email cannot be changed</p>
          </div>

          <div className="profile-section">
            <label className="profile-section-label">Member Since</label>
            <div className="profile-info-value">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'N/A'}
            </div>
          </div>

          <div className="profile-section">
            <label className="profile-section-label">Account Status</label>
            <div className="profile-status-badge">
              <span className={`status-indicator ${user?.is_active ? 'active' : 'inactive'}`}></span>
              {user?.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Password Change Section */}
          <div className="profile-section">
            <div className="profile-password-header">
              <label className="profile-section-label">Password</label>
              <button
                type="button"
                className="profile-password-toggle"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <div className="profile-password-form">
                <div className="profile-password-field">
                  <label htmlFor="current-password">Current Password</label>
                  <div className="profile-password-input-wrapper">
                    <input
                      id="current-password"
                      type={showPasswords.current ? 'text' : 'password'}
                      className="profile-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="profile-password-toggle-btn"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12C2.73 7.61 7 4 12 4C13.1 4 14.17 4.21 15.17 4.61M9.9 4.24C10.62 4.09 11.31 4 12 4C17 4 21.27 7.61 23 12C22.18 14.54 20.5 16.68 18.37 18.04L9.9 4.24ZM1 1L23 23M14.12 14.12A3 3 0 0 1 9.88 9.88L14.12 14.12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12C1 16.39 4.61 20 9 20C10.1 20 11.18 19.79 12.17 19.39M23 12C23 7.61 19.39 4 15 4C13.9 4 12.82 4.21 11.83 4.61M12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8ZM12 4V8M12 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="profile-password-field">
                  <label htmlFor="new-password">New Password</label>
                  <div className="profile-password-input-wrapper">
                    <input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      className="profile-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <button
                      type="button"
                      className="profile-password-toggle-btn"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12C2.73 7.61 7 4 12 4C13.1 4 14.17 4.21 15.17 4.61M9.9 4.24C10.62 4.09 11.31 4 12 4C17 4 21.27 7.61 23 12C22.18 14.54 20.5 16.68 18.37 18.04L9.9 4.24ZM1 1L23 23M14.12 14.12A3 3 0 0 1 9.88 9.88L14.12 14.12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12C1 16.39 4.61 20 9 20C10.1 20 11.18 19.79 12.17 19.39M23 12C23 7.61 19.39 4 15 4C13.9 4 12.82 4.21 11.83 4.61M12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8ZM12 4V8M12 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="profile-password-field">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <div className="profile-password-input-wrapper">
                    <input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="profile-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="profile-password-toggle-btn"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12C2.73 7.61 7 4 12 4C13.1 4 14.17 4.21 15.17 4.61M9.9 4.24C10.62 4.09 11.31 4 12 4C17 4 21.27 7.61 23 12C22.18 14.54 20.5 16.68 18.37 18.04L9.9 4.24ZM1 1L23 23M14.12 14.12A3 3 0 0 1 9.88 9.88L14.12 14.12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12C1 16.39 4.61 20 9 20C10.1 20 11.18 19.79 12.17 19.39M23 12C23 7.61 19.39 4 15 4C13.9 4 12.82 4.21 11.83 4.61M12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8ZM12 4V8M12 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="profile-btn profile-btn-secondary"
                  onClick={handleChangePassword}
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}
          </div>
            </>
          ) : (
            /* Notification Settings Tab */
            <div className="notification-settings-section">
              <div className="profile-section">
                <label className="profile-section-label">Notification Preferences</label>
                <p className="profile-hint">Control which notifications you receive</p>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">API Errors</label>
                  <p className="notification-setting-desc">Receive notifications when API calls fail</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.api_errors}
                    onChange={(e) => handleNotificationSettingChange('api_errors', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">Rate Limit Warnings</label>
                  <p className="notification-setting-desc">Get alerted when approaching rate limits</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.rate_limits}
                    onChange={(e) => handleNotificationSettingChange('rate_limits', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">Usage Thresholds</label>
                  <p className="notification-setting-desc">Notifications when usage reaches specific thresholds</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.usage_thresholds}
                    onChange={(e) => handleNotificationSettingChange('usage_thresholds', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">Billing Alerts</label>
                  <p className="notification-setting-desc">Important billing and payment notifications</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.billing_alerts}
                    onChange={(e) => handleNotificationSettingChange('billing_alerts', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">Deployment Updates</label>
                  <p className="notification-setting-desc">Notifications about API deployment status</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.deployment_updates}
                    onChange={(e) => handleNotificationSettingChange('deployment_updates', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="notification-setting-item">
                <div className="notification-setting-info">
                  <label className="notification-setting-label">In-App Notifications</label>
                  <p className="notification-setting-desc">Enable or disable all in-app notifications</p>
                </div>
                <label className="notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationSettings.in_app_enabled}
                    onChange={(e) => handleNotificationSettingChange('in_app_enabled', e.target.checked)}
                    disabled={savingSettings || loadingSettings}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="profile-modal-footer">
          {activeTab === 'profile' ? (
            <>
              <button
                type="button"
                className="profile-btn profile-btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="profile-btn profile-btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="profile-btn profile-btn-primary"
              onClick={onClose}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;

