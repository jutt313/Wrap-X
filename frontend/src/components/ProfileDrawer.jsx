import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { notificationService } from '../services/notificationService';
import { wrappedApiService } from '../services/wrappedApiService';
import { projectService } from '../services/projectService';
import { llmProviderService } from '../services/llmProviderService';
import billingService from '../services/billingService';
import CreateAPIKeyModal from './CreateAPIKeyModal';
import AddLLMPopup from './AddLLMPopup';
import TrialPlanModal from './TrialPlanModal';
import CreateProjectModal from './CreateProjectModal';
import '../styles/ProfileDrawer.css';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'apis', label: 'APIs' },
  { id: 'projects', label: 'Projects' },
  { id: 'llm', label: 'LLM Settings' },
  { id: 'billing', label: 'Billing' },
  { id: 'docs', label: 'Documentation' },
];

const STATUS_LABELS = {
  trial: 'Trialing',
  active: 'Active',
  cancelled: 'Cancelled',
  past_due: 'Past Due',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
};

const TRIAL_PROMPT_KEY = 'wrapxTrialPromptSeen';

function formatCurrency(amount, currency = 'usd') {
  if (amount === null || amount === undefined) return '-';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (err) {
    console.error('Error formatting currency', err);
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return '—';
  }
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatPeriod(start, end) {
  if (!start && !end) return '—';
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  if (!start) return endDate;
  if (!end) return startDate;
  return `${startDate} → ${endDate}`;
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

function ProfileDrawer({ isOpen, onClose, onLogout }) {
  const { user, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile tab state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [notificationSettings, setNotificationSettings] = useState({
    api_errors: true,
    rate_limits: true,
    usage_thresholds: true,
    billing_alerts: true,
    deployment_updates: true,
    in_app_enabled: true,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef(null);
  const planSectionRef = useRef(null);

  // APIs tab state
  const [apiKeys, setApiKeys] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [apiDeletingId, setApiDeletingId] = useState(null);

  // Projects tab state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // LLM providers tab state
  const [providers, setProviders] = useState([]);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const [showAddLLM, setShowAddLLM] = useState(false);

  // Billing tab state
  const [billingPlans, setBillingPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [billingHistoryLoading, setBillingHistoryLoading] = useState(false);
  const [billingHistoryError, setBillingHistoryError] = useState(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingAllWraps, setDeletingAllWraps] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset to profile tab when opening
    setActiveTab('profile');
    setProfileError(null);
    setProfileSuccess(null);

    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar_url || '');
      setAvatarPreview(user.avatar_url || null);
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadNotificationSettings();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'apis') {
      loadApiKeys();
    } else if (activeTab === 'projects') {
      loadProjects();
    } else if (activeTab === 'llm') {
      loadProviders();
    } else if (activeTab === 'billing') {
      loadBillingOverview();
      loadBillingHistory();
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen || billingLoading) return;
    if (subscription && subscription.status === 'trial') {
      if (typeof window !== 'undefined') {
        if (!window.localStorage.getItem(TRIAL_PROMPT_KEY)) {
          window.localStorage.setItem(TRIAL_PROMPT_KEY, '1');
          setShowTrialModal(true);
        }
      }
    }
  }, [isOpen, billingLoading, subscription]);

  useEffect(() => {
    if (subscription && subscription.status !== 'trial') {
      setShowTrialModal(false);
    }
  }, [subscription]);

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

  const handleNotificationSettingChange = async (key, value) => {
    const previous = notificationSettings[key];
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    setSavingSettings(true);
    try {
      await notificationService.updateSettings({ [key]: value });
    } catch (err) {
      console.error('Error updating notification setting:', err);
      setNotificationSettings((prev) => ({ ...prev, [key]: previous }));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarUrl(reader.result);
    };
    reader.readAsDataURL(file);
    setProfileError(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    try {
      const updatedUser = await profileService.updateProfile(name, avatarUrl);
      setUser(updatedUser);
      setProfileSuccess('Profile updated successfully');
      setTimeout(() => setProfileSuccess(null), 2500);
    } catch (err) {
      setProfileError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setProfileError(null);
    setProfileSuccess(null);

    if (newPassword.length < 8) {
      setProfileError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setProfileError('New passwords do not match');
      return;
    }

    setProfileSaving(true);

    try {
      await profileService.changePassword(currentPassword, newPassword, confirmPassword);
      setProfileSuccess('Password updated successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.detail || err.message || 'Failed to change password');
    } finally {
      setProfileSaving(false);
    }
  };

  const loadApiKeys = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const keys = await wrappedApiService.getAllAPIKeys();
      setApiKeys(keys || []);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setApiError(err.message || 'Failed to load API keys');
    } finally {
      setApiLoading(false);
    }
  };

  const handleDeleteAPIKey = async (id, name) => {
    if (!window.confirm(`Delete "${name || 'API key'}"? This action cannot be undone.`)) {
      return;
    }
    setApiDeletingId(id);
    try {
      await wrappedApiService.deleteAPIKey(id);
      await loadApiKeys();
    } catch (err) {
      setApiError(err.message || 'Failed to delete API key');
    } finally {
      setApiDeletingId(null);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setProjectsError(err.message || 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleProjectCreated = async () => {
    await loadProjects();
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await projectService.deleteProject(id);
      await loadProjects();
    } catch (err) {
      setProjectsError(err.message || 'Failed to delete project');
    }
  };

  const loadProviders = async () => {
    setLlmLoading(true);
    setLlmError(null);
    try {
      const [providersData, projectsData] = await Promise.all([
        llmProviderService.getProviders(),
        projectService.getProjects(),
      ]);
      const projectMap = new Map(projectsData.map((p) => [p.id, p.name]));
      const enriched = providersData.map((p) => ({
        ...p,
        projectName: projectMap.get(p.project_id) || 'Unknown Project',
      }));
      setProviders(enriched);
    } catch (err) {
      setLlmError(err.message || 'Failed to load providers');
    } finally {
      setLlmLoading(false);
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (!window.confirm('Delete this LLM provider? This action cannot be undone.')) return;
    try {
      await llmProviderService.deleteProvider(providerId);
      await loadProviders();
    } catch (err) {
      setLlmError(err.message || 'Failed to delete provider');
    }
  };

  const handleAddLLMSuccess = () => {
    setShowAddLLM(false);
    loadProviders();
  };

  const loadBillingOverview = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
      ]);
      setBillingPlans(plansResponse?.plans || []);
      setTrialDays(plansResponse?.trial_days || 0);
      setSubscription(subscriptionResponse || null);
    } catch (err) {
      console.error('Error loading billing overview:', err);
      setBillingError(err.response?.data?.detail || err.message || 'Failed to load billing details');
    } finally {
      setBillingLoading(false);
    }
  };

  const loadBillingHistory = async () => {
    setBillingHistoryLoading(true);
    setBillingHistoryError(null);
    try {
      const response = await billingService.getHistory();
      setBillingHistory(response?.invoices || []);
    } catch (err) {
      console.error('Error loading billing history:', err);
      setBillingHistoryError(err.response?.data?.detail || err.message || 'Failed to load billing history');
    } finally {
      setBillingHistoryLoading(false);
    }
  };

  const handleCheckoutPlan = async (plan) => {
    markTrialPromptSeen();
    setCheckoutPlanId(plan.id);
    setBillingError(null);
    try {
      const response = await billingService.createCheckoutSession(plan.price_id);
      if (response?.url) {
        window.location.href = response.url;
      } else {
        setBillingError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setBillingError(err.response?.data?.detail || err.message || 'Failed to start checkout');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleOpenPortal = async () => {
    if (trialActive) {
      setBillingError('Upgrade to a paid plan to manage billing details.');
      return;
    }
    setPortalLoading(true);
    setBillingError(null);
    try {
      const response = await billingService.createPortalSession();
      if (response?.url) {
        window.open(response.url, '_blank', 'noopener,noreferrer');
      } else {
        setBillingError('Unable to open customer portal. Please try again.');
      }
    } catch (err) {
      console.error('Portal session error:', err);
      setBillingError(err.response?.data?.detail || err.message || 'Failed to open customer portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const planLookup = useMemo(() => {
    const lookup = {};
    billingPlans.forEach((plan) => {
      lookup[plan.id] = plan;
    });
    return lookup;
  }, [billingPlans]);

  const currentPlan = subscription ? planLookup[subscription.plan_type] : null;
  const trialActive = subscription?.status === 'trial';
  const trialCountdown = useMemo(() => {
    if (!subscription?.trial_end) return null;
    const end = new Date(subscription.trial_end);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }, [subscription?.trial_end]);

  const markTrialPromptSeen = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TRIAL_PROMPT_KEY, '1');
    }
  };

  const handleUpgradeClick = () => {
    if (trialActive) {
      markTrialPromptSeen();
      setShowTrialModal(true);
    } else {
      planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDeleteAllWraps = async () => {
    const confirmMessage = 'Are you sure you want to delete ALL your wraps? This action cannot be undone.';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const doubleConfirm = window.prompt(
      'This will permanently delete all your wraps. Type "DELETE ALL" to confirm:'
    );

    if (doubleConfirm !== 'DELETE ALL') {
      return;
    }

    setDeletingAllWraps(true);
    try {
      const response = await wrappedApiService.deleteAllWraps();
      alert(`Successfully deleted ${response.deleted_count || 0} wrap(s).`);
      // Optionally reload projects or refresh the page
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete wraps');
    } finally {
      setDeletingAllWraps(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = 'Are you sure you want to delete your account? This will permanently delete:\n\n' +
      '• All your wraps\n' +
      '• All your projects\n' +
      '• All your API keys\n' +
      '• All your LLM providers\n' +
      '• All your data\n\n' +
      'This action CANNOT be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const doubleConfirm = window.prompt(
      'This will permanently delete your account and all data. Type "DELETE ACCOUNT" to confirm:'
    );

    if (doubleConfirm !== 'DELETE ACCOUNT') {
      return;
    }

    setDeletingAccount(true);
    try {
      await profileService.deleteAccount();
      alert('Your account has been deleted. You will be logged out.');
      // Logout and redirect
      if (logout) {
        logout();
      } else if (onLogout) {
        onLogout();
      }
      // Redirect to home/login
      window.location.href = '/';
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-drawer-overlay" onClick={onClose}>
      <div className="profile-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="profile-drawer-header">
          <div className="profile-drawer-user">
            <div className="profile-drawer-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.name || 'User'} />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="profile-drawer-user-info">
              <h2>{user?.name || 'User'}</h2>
              <p>{user?.email}</p>
            </div>
          </div>
          <div className="profile-drawer-actions">
            <button className="profile-drawer-logout" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <nav className="profile-drawer-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`profile-drawer-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="profile-drawer-body">
          {activeTab === 'profile' && (
            <div className="profile-tab-content">
              {profileSuccess && (
                <div className="profile-banner success">{profileSuccess}</div>
              )}
              {profileError && (
                <div className="profile-banner error">{profileError}</div>
              )}

              <div className="profile-section">
                <h3>Profile Photo</h3>
                <div className="profile-avatar-row">
                  <div className="profile-avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" />
                    ) : (
                      <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="profile-avatar-actions">
                    <button type="button" className="profile-btn" onClick={handleAvatarClick}>
                      Upload Photo
                    </button>
                    {avatarPreview && (
                      <button type="button" className="profile-btn subtle" onClick={handleRemoveAvatar}>
                        Remove
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <p className="profile-hint">JPG, PNG or WebP. Max size 2MB.</p>
                  </div>
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-field">
                  <label htmlFor="drawer-name">Name</label>
                  <input
                    id="drawer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled />
                  <span className="profile-hint">Email cannot be changed</span>
                </div>
              </div>

              <div className="profile-info-row">
                <div>
                  <label>Member Since</label>
                  <p>{user?.created_at ? formatDate(user.created_at, { dateStyle: 'long' }) : 'N/A'}</p>
                </div>
                <div>
                  <label>Account Status</label>
                  <span className={`status-badge ${user?.is_active ? 'active' : 'inactive'}`}>
                    <span className="status-dot" />
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="profile-actions">
                <button className="profile-btn primary" onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="profile-password">
                <div className="profile-password-header">
                  <div>
                    <h3>Password</h3>
                    <p>Keep your account secure with a strong password.</p>
                  </div>
                  <button className="profile-btn subtle" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                    {showPasswordForm ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {showPasswordForm && (
                  <div className="profile-password-form">
                    <div className="profile-password-field">
                      <label htmlFor="current-password">Current Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="current-password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className="profile-password-field">
                      <label htmlFor="new-password">New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="new-password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className="profile-password-field">
                      <label htmlFor="confirm-password">Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="confirm-password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <button
                      className="profile-btn secondary"
                      onClick={handleChangePassword}
                      disabled={profileSaving || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {profileSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-notifications">
                <h3>Notification Preferences</h3>
                <p>Control which updates you receive from Wrap-X.</p>

                <ul className="notification-list">
                  {[
                    {
                      key: 'api_errors',
                      title: 'API Errors',
                      description: 'Receive alerts when your APIs encounter errors.',
                    },
                    {
                      key: 'rate_limits',
                      title: 'Rate Limit Warnings',
                      description: 'Get notified when approaching rate limits.',
                    },
                    {
                      key: 'usage_thresholds',
                      title: 'Usage Thresholds',
                      description: 'Updates when usage reaches configured thresholds.',
                    },
                    {
                      key: 'billing_alerts',
                      title: 'Billing Alerts',
                      description: 'Important billing and payment notifications.',
                    },
                    {
                      key: 'deployment_updates',
                      title: 'Deployment Updates',
                      description: 'Status changes and deployment updates for your wraps.',
                    },
                    {
                      key: 'in_app_enabled',
                      title: 'In-App Notifications',
                      description: 'Enable or disable all in-app notifications.',
                    },
                  ].map((item) => (
                    <li className="notification-row" key={item.key}>
                      <div className="notification-text">
                        <span className="notification-title">{item.title}</span>
                        <span className="notification-desc">{item.description}</span>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={notificationSettings[item.key]}
                          onChange={(e) => handleNotificationSettingChange(item.key, e.target.checked)}
                          disabled={savingSettings || loadingSettings}
                        />
                        <span className="slider" />
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="profile-danger-zone">
                <h3>Danger Zone</h3>
                <p className="danger-zone-description">
                  Irreversible and destructive actions. Please proceed with caution.
                </p>

                <div className="danger-zone-actions">
                  <div className="danger-action-item">
                    <div className="danger-action-info">
                      <h4>Delete All Wraps</h4>
                      <p>Permanently delete all your wraps. This action cannot be undone.</p>
                    </div>
                    <button
                      className="profile-btn danger"
                      onClick={handleDeleteAllWraps}
                      disabled={deletingAllWraps}
                    >
                      {deletingAllWraps ? 'Deleting...' : 'Delete All Wraps'}
                    </button>
                  </div>

                  <div className="danger-action-item">
                    <div className="danger-action-info">
                      <h4>Delete Account</h4>
                      <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                    <button
                      className="profile-btn danger"
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                    >
                      {deletingAccount ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apis' && (
            <div className="panel-section">
              <div className="panel-header">
                <div>
                  <h3>API Keys</h3>
                  <p>Manage and create API keys across all wraps.</p>
                </div>
                <button className="panel-btn primary" onClick={() => setShowCreateKeyModal(true)}>
                  Create API Key
                </button>
              </div>
              {apiError && <div className="panel-banner error">{apiError}</div>}
              {apiLoading ? (
                <div className="panel-loading">Loading API keys…</div>
              ) : apiKeys.length === 0 ? (
                <div className="panel-empty">
                  <p>No API keys yet.</p>
                  <button className="panel-btn" onClick={() => setShowCreateKeyModal(true)}>
                    Create your first API Key
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="panel-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Secret</th>
                        <th>Wrap</th>
                        <th>Project</th>
                        <th>Created</th>
                        <th>Last Used</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key) => (
                        <tr key={key.id}>
                          <td>{key.key_name || 'Untitled Key'}</td>
                          <td className="mono">wx_{String(key.id).padStart(8, '0')}…</td>
                          <td>{key.wrapped_api_name || '—'}</td>
                          <td>{key.project_name || '—'}</td>
                          <td>{key.created_at ? formatDate(key.created_at) : '—'}</td>
                          <td>{key.last_used ? formatDate(key.last_used) : 'Never'}</td>
                          <td className="actions">
                            <button
                              className="panel-btn subtle"
                              onClick={() => handleDeleteAPIKey(key.id, key.key_name)}
                              disabled={apiDeletingId === key.id}
                            >
                              {apiDeletingId === key.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="panel-section">
              <div className="panel-header">
                <div>
                  <h3>Projects</h3>
                  <p>Organize wraps and providers across projects.</p>
                </div>
                <div className="panel-header-actions">
                  <button className="panel-btn primary" onClick={() => setShowCreateProjectModal(true)}>
                    Create Project
                  </button>
                </div>
              </div>
              {projectsError && <div className="panel-banner error">{projectsError}</div>}
              {projectsLoading ? (
                <div className="panel-loading">Loading projects…</div>
              ) : projects.length === 0 ? (
                <div className="panel-empty">No projects yet. Create your first project to get started.</div>
              ) : (
                <div className="card-grid">
                  {projects.map((project) => (
                    <div className="panel-card" key={project.id}>
                      <div className="panel-card-header">
                        <h4>{project.name}</h4>
                        <button className="panel-btn subtle" onClick={() => handleDeleteProject(project.id)}>
                          Delete
                        </button>
                      </div>
                      <p className="panel-card-id">ID: {project.public_id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'llm' && (
            <div className="panel-section">
              <div className="panel-header">
                <div>
                  <h3>LLM Providers</h3>
                  <p>Manage provider credentials connected to your wraps.</p>
                </div>
                <button className="panel-btn primary" onClick={() => setShowAddLLM(true)}>
                  Add LLM
                </button>
              </div>
              {llmError && <div className="panel-banner error">{llmError}</div>}
              {llmLoading ? (
                <div className="panel-loading">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="panel-empty">No providers yet. Add your first provider to begin wrapping.</div>
              ) : (
                <div className="table-wrapper">
                  <table className="panel-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Provider</th>
                        <th>Project</th>
                        <th>Last Used</th>
                        <th>Tokens</th>
                        <th>Calls</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((provider) => (
                        <tr key={provider.id}>
                          <td>{provider.name}</td>
                          <td>{provider.provider_name}</td>
                          <td>{provider.projectName || '—'}</td>
                          <td>{formatDateTime(provider.last_used)}</td>
                          <td>{formatNumber(provider.tokens_count)}</td>
                          <td>{formatNumber(provider.calls_count)}</td>
                          <td className="actions">
                            <button className="panel-btn subtle" onClick={() => handleDeleteProvider(provider.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="panel-section">
              {billingError && <div className="panel-banner error">{billingError}</div>}

              {billingLoading ? (
                <div className="panel-loading">Loading billing details…</div>
              ) : (
                <>
                  <div className="billing-summary-card">
                    <div className="billing-summary-content">
                      <div className="billing-summary-head">
                        <div>
                          <span className="billing-summary-label">Current Plan</span>
                          <h3>{subscription ? currentPlan?.name || subscription.plan_type : 'No active subscription'}</h3>
                        </div>
                        {subscription?.status && (
                          <span className={`status-badge ${subscription.status}`}>
                            {STATUS_LABELS[subscription.status] || subscription.status}
                          </span>
                        )}
                      </div>

                      {subscription ? (
                        <div className="billing-summary-meta">
                          <div>
                            <span>Subscribed On</span>
                            <strong>{formatDate(subscription.created_at)}</strong>
                          </div>
                          <div>
                            <span>Next Renewal</span>
                            <strong>{subscription.current_period_end ? formatDate(subscription.current_period_end) : '—'}</strong>
                          </div>
                          <div>
                            <span>Monthly Rate</span>
                            <strong>{formatCurrency(currentPlan?.price ?? subscription.amount)}</strong>
                          </div>
                          {subscription.trial_end && (
                            <div>
                              <span>Trial Ends</span>
                              <strong>{formatDate(subscription.trial_end)}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="billing-summary-empty">You don't have an active subscription yet. Choose a plan below to get started with Wrap-X.</p>
                      )}

                      {trialActive && trialCountdown && (
                        <div className="trial-countdown">
                          Trial ends in <strong>{trialCountdown}</strong>
                        </div>
                      )}
                    </div>

                    <div className="billing-summary-actions">
                      <button
                        className="panel-btn"
                        onClick={handleUpgradeClick}
                      >
                        {trialActive ? 'Upgrade Plan' : 'Upgrade or Change Plan'}
                      </button>
                      <button
                        className="panel-btn subtle"
                        onClick={handleOpenPortal}
                        disabled={portalLoading || trialActive || !subscription?.stripe_customer_id}
                      >
                        {portalLoading ? 'Opening portal…' : 'Manage Subscription'}
                      </button>
                    </div>
                  </div>

                  <h3 className="billing-section-title">Plans</h3>
                  <div className="plan-grid" ref={planSectionRef}>
                    {billingPlans.map((plan) => {
                      const isCurrent = subscription?.plan_type === plan.id;
                      return (
                        <div key={plan.id} className={`plan-card ${isCurrent ? 'current' : ''}`}>
                          {plan.id === 'professional' && <span className="plan-badge">Most Popular</span>}
                          <div className="plan-header">
                            <h4>{plan.name}</h4>
                            <div className="plan-price">
                              {formatCurrency(plan.price)}<span>/month</span>
                            </div>
                          </div>
                          <ul className="plan-features">
                            <li>{plan.wraps} {plan.wraps === 1 ? 'Wrap' : 'Wraps'} included</li>
                            <li>3-day free trial</li>
                            <li>Unlimited usage</li>
                            <li>All platform features</li>
                          </ul>
                          <div className="plan-actions">
                            {subscription ? (
                              isCurrent ? (
                                <span className="plan-current-chip">Current Plan</span>
                              ) : (
                                <button
                                  className="panel-btn primary"
                                  onClick={() => handleCheckoutPlan(plan)}
                                  disabled={checkoutPlanId === plan.id}
                                >
                                  {checkoutPlanId === plan.id ? 'Redirecting…' : 'Upgrade'}
                                </button>
                              )
                            ) : (
                              <button
                                className="panel-btn primary"
                                onClick={() => handleCheckoutPlan(plan)}
                                disabled={checkoutPlanId === plan.id}
                              >
                                {checkoutPlanId === plan.id ? 'Redirecting…' : 'Select Plan'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="billing-history-section">
                    <div className="panel-header">
                      <div>
                        <h3>Payment History</h3>
                        <p>Track past charges and download invoices.</p>
                      </div>
                      <button className="panel-btn" onClick={loadBillingHistory} disabled={billingHistoryLoading}>
                        {billingHistoryLoading ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </div>
                    {billingHistoryError && <div className="panel-banner error">{billingHistoryError}</div>}
                    {billingHistoryLoading ? (
                      <div className="panel-loading">Loading invoices…</div>
                    ) : billingHistory.length === 0 ? (
                      <div className="panel-empty">No invoices yet. Invoices will appear once you subscribe.</div>
                    ) : (
                      <div className="table-wrapper">
                        <table className="panel-table">
                          <thead>
                            <tr>
                              <th>Invoice</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Period</th>
                              <th>Issued</th>
                              <th>Paid</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {billingHistory.map((invoice) => (
                              <tr key={invoice.id}>
                                <td>
                                  <div className="invoice-meta">
                                    <span className="invoice-number">{invoice.number || invoice.id}</span>
                                    {invoice.plan_name && <span className="invoice-plan">{invoice.plan_name}</span>}
                                  </div>
                                </td>
                                <td>{formatCurrency(invoice.amount_paid || invoice.amount_due)}</td>
                                <td>
                                  <span className={`status-badge ${invoice.status}`}>
                                    {STATUS_LABELS[invoice.status] || invoice.status}
                                  </span>
                                </td>
                                <td>{formatPeriod(invoice.period_start, invoice.period_end)}</td>
                                <td>{formatDate(invoice.created_at)}</td>
                                <td>{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</td>
                                <td className="actions">
                                  <div className="invoice-actions">
                                    {invoice.hosted_invoice_url && (
                                      <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="panel-btn subtle">View</a>
                                    )}
                                    {invoice.invoice_pdf && (
                                      <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="panel-btn subtle">PDF</a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="panel-section">
              <h3>Documentation</h3>
              <p className="panel-description">
                Stay up to date with the latest Wrap-X guides, SDKs, and API references.
              </p>
              <div className="doc-grid">
                <div className="doc-card">
                  <h4>Getting Started</h4>
                  <p>Learn how to wrap your first API in minutes with step-by-step tutorials.</p>
                  <a href="/documentation#getting-started" className="panel-btn">Open Guide</a>
                </div>
                <div className="doc-card">
                  <h4>API Reference</h4>
                  <p>Detailed reference for all Wrap-X endpoints, parameters, and payloads.</p>
                  <a href="/documentation#api-reference" className="panel-btn">View Reference</a>
                </div>
                <div className="doc-card">
                  <h4>Billing & Usage</h4>
                  <p>Understand billing, usage limits, and best practices for scaling.</p>
                  <a href="/documentation#billing" className="panel-btn">Billing Docs</a>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showCreateKeyModal && (
        <CreateAPIKeyModal
          isOpen={showCreateKeyModal}
          onClose={() => {
            setShowCreateKeyModal(false);
            loadApiKeys();
          }}
        />
      )}

      {showAddLLM && (
        <AddLLMPopup
          isOpen={showAddLLM}
          onClose={() => setShowAddLLM(false)}
          onSuccess={handleAddLLMSuccess}
        />
      )}

      <TrialPlanModal
        isOpen={showTrialModal}
        plans={billingPlans}
        trialDays={trialDays}
        loadingPlanId={checkoutPlanId}
        onClose={() => setShowTrialModal(false)}
        onSelectPlan={(plan) => {
          markTrialPromptSeen();
          setShowTrialModal(false);
          handleCheckoutPlan(plan);
        }}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}

export default ProfileDrawer;


