import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../styles/ToolCredential.css';
import OAuthSetupGuide from './OAuthSetupGuide';
import oauthService from '../services/oauthService';
import platformIntegrationService from '../services/platformIntegrationService';

/**
 * Rounded popup with glow effect for entering tool credentials.
 * Renders fields dynamically based on the `fields` prop.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onSave: function(credentials) - Called with credential values when saved
 * - toolName: string - Display name of the tool
 * - fields: Array<{ name: string, label: string, type: 'text' | 'password' | 'dropdown', options?: string[], required?: boolean, placeholder?: string, helpText?: string, instructions?: string }>
 * - initialValues: object (optional) - Pre-fill values for editing
 * - saving: boolean (optional) - Show saving state
 * - isReadOnly: boolean (optional) - If true, show fields as read-only with edit button
 * - wrappedApiId: number (optional) - For testing credentials
 * - toolCode: string (optional) - Tool code for testing
 * - requiresOAuth: boolean (optional) - Whether OAuth setup is required
 * - oauthProvider: string (optional) - Provider key (google, shopify, etc.)
 * - oauthScopes: array (optional) - Scopes suggested by the tool
 * - aggregatedScopes: array (optional) - Combined scopes across tools
 * - oauthInstructions: string (optional) - Extra guidance from LLM
 */
function ToolCredentialPopup({ 
  isOpen, 
  onClose, 
  onSave, 
  toolName, 
  fields = [], 
  initialValues = {}, 
  saving = false,
  isReadOnly = false,
  wrappedApiId = null,
  toolCode = null,
  requiresOAuth = false,
  oauthProvider = null,
  oauthScopes = [],
  aggregatedScopes = [],
  oauthInstructions = ''
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(!isReadOnly);
  const [showInstructions, setShowInstructions] = useState(null); // Field name for which to show instructions
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [oauthSetup, setOauthSetup] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  const [oauthAcknowledged, setOauthAcknowledged] = useState(!requiresOAuth);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [activeTab, setActiveTab] = useState('credentials');

  const effectiveScopes = useMemo(() => {
    if (aggregatedScopes && aggregatedScopes.length) {
      return aggregatedScopes;
    }
    return oauthScopes || [];
  }, [aggregatedScopes, oauthScopes]);

  const shouldShowOAuthGuide = requiresOAuth && Boolean(oauthProvider);

  const loadOAuthSetup = useCallback(async () => {
    if (!shouldShowOAuthGuide || !wrappedApiId || !oauthProvider) {
      setShowOAuthGuide(false);
      return;
    }
    try {
      setShowOAuthGuide(true);
      setOauthLoading(true);
      setOauthError(null);
      const response = await oauthService.getSetup(oauthProvider, wrappedApiId, effectiveScopes);
      setOauthSetup(response);
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to load OAuth instructions.';
      setOauthError(message);
    } finally {
      setOauthLoading(false);
    }
  }, [shouldShowOAuthGuide, wrappedApiId, oauthProvider, effectiveScopes]);

  const disableSave = saving || testing || fields.length === 0 || (shouldShowOAuthGuide && !oauthAcknowledged);
  const clientIdValue = values?.client_id || values?.clientId || '';
  const clientSecretValue = values?.client_secret || values?.clientSecret || '';

  // Initialize values when popup opens or fields change
  useEffect(() => {
    if (isOpen) {
      const initial = {};
      fields.forEach(field => {
        initial[field.name] = initialValues[field.name] || '';
      });
      setValues(initial);
      setErrors({});
      setEditing(!isReadOnly);
      setActiveTab('credentials'); // Reset to credentials tab when popup opens
      setShowInstructions(null);
      setTestResult(null);
      setShowOAuthGuide(requiresOAuth && !!oauthProvider);
      setOauthSetup(null);
      setOauthError(null);
      setOauthAcknowledged(!requiresOAuth);
      setOauthLoading(false);
      setAuthLoading(false);
      setAuthNotice('');
    }
  }, [isOpen, fields, initialValues, isReadOnly, requiresOAuth, oauthProvider]);

  useEffect(() => {
    if (isOpen && shouldShowOAuthGuide) {
      loadOAuthSetup();
      setOauthAcknowledged(false);
    } else if (!shouldShowOAuthGuide) {
      setOauthSetup(null);
      setOauthError(null);
      setOauthAcknowledged(true);
    }
  }, [isOpen, shouldShowOAuthGuide, loadOAuthSetup]);

  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  // Validation functions
  const validateField = (field, value) => {
    if (field.required && !value?.trim()) {
      return `${field.label} is required`;
    }
    
    // Format validation based on field type/name
    if (value && value.trim()) {
      // Email validation
      if (field.type === 'email' || (field.name.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
        return 'Please enter a valid email address';
      }
      
      // URL validation
      if (field.type === 'url' || (field.name.includes('url') && !/^https?:\/\/.+/.test(value))) {
        return 'Please enter a valid URL (starting with http:// or https://)';
      }
      
      // API key format (usually alphanumeric, dashes, underscores)
      if (field.name.includes('api_key') || field.name.includes('token')) {
        if (!/^[a-zA-Z0-9_\-]+$/.test(value)) {
          return 'API key should only contain letters, numbers, dashes, and underscores';
        }
        if (value.length < 10) {
          return 'API key seems too short. Please check and try again.';
        }
      }
      
      // Minimum length for passwords
      if (field.type === 'password' && value.length < 8) {
        return 'Password must be at least 8 characters';
      }
    }
    
    return null;
  };

  const handleTest = async () => {
    // Validate all fields before testing
    const newErrors = {};
    fields.forEach(field => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTestResult({ success: false, message: 'Please fix validation errors before testing' });
      return;
    }

    if (!wrappedApiId) {
      setTestResult({ success: false, message: 'Cannot test: missing wrapped API ID' });
      return;
    }

    if (shouldShowOAuthGuide && !oauthAcknowledged) {
      setTestResult({ success: false, message: 'Complete the OAuth guide steps before testing.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await platformIntegrationService.testIntegration(
        wrappedApiId,
        toolName,
        values,
        toolCode
      );
      
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful!' : 'Connection failed')
      });
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        message: error.message || 'Test failed. Please check your credentials.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAuthorization = async () => {
    if (!shouldShowOAuthGuide || !oauthProvider || !wrappedApiId) return;
    const clientIdValue = values.client_id || values.clientId || '';
    const clientSecretValue = values.client_secret || values.clientSecret || '';
    if (!clientIdValue || !clientSecretValue) {
      setTestResult({
        success: false,
        message: 'Enter the Client ID and Client Secret before starting OAuth authorization.',
      });
      return;
    }
    try {
      setAuthLoading(true);
      setAuthNotice('');
      const response = await oauthService.authorize(oauthProvider, {
        wrappedApiId,
        clientId: clientIdValue,
        clientSecret: clientSecretValue,
        scopes: effectiveScopes,
      });
      if (response?.authorization_url) {
        window.open(response.authorization_url, '_blank', 'width=520,height=720');
        setAuthNotice('OAuth window opened. After approving access, return here and click Save to finish.');
      }
    } catch (err) {
      const message = err?.response?.data?.detail || err.message || 'Failed to start OAuth flow.';
      setTestResult({ success: false, message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    fields.forEach(field => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (shouldShowOAuthGuide && !oauthAcknowledged) {
      setTestResult({
        success: false,
        message: 'Complete the OAuth setup checklist before saving credentials.',
      });
      return;
    }

    onSave(values);
  };

  const renderField = (field) => {
    const { name, label, type, options, placeholder, helpText, required, instructions } = field;
    const value = values[name] || '';
    const error = errors[name];
    const isReadOnlyField = isReadOnly && !editing;

    return (
      <div key={name} className="credential-field">
        <label className="credential-field-label">
          {label}
          {required && <span className="credential-required">*</span>}
          {instructions && (
            <button
              type="button"
              className="credential-help-icon"
              onClick={(e) => {
                e.preventDefault();
                setShowInstructions(showInstructions === name ? null : name);
              }}
              title="How to get this credential"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </label>
        
        {isReadOnlyField ? (
          <div className="credential-readonly-value">
            {type === 'password' ? '••••••••' : (value || '(not set)')}
          </div>
        ) : type === 'dropdown' ? (
          <select
            className={`credential-input credential-select ${error ? 'has-error' : ''}`}
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            disabled={saving}
          >
            <option value="">Select {label}...</option>
            {options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={type === 'password' ? 'password' : 'text'}
            className={`credential-input ${error ? 'has-error' : ''}`}
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            autoComplete={type === 'password' ? 'new-password' : 'off'}
            disabled={saving}
          />
        )}
        
        {helpText && <p className="credential-help-text">{helpText}</p>}
        {error && <p className="credential-error-text">{error}</p>}
        
        {/* Instructions Popup */}
        {showInstructions === name && instructions && (
          <div className="credential-instructions-popup">
            <div className="credential-instructions-content">
              <div className="credential-instructions-header">
                <h4>How to get {label}</h4>
                <button
                  type="button"
                  className="credential-instructions-close"
                  onClick={() => setShowInstructions(null)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className="credential-instructions-body">
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {instructions}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="credential-popup-overlay" onClick={onClose}>
      <div className="credential-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="credential-popup-header">
          <div className="credential-popup-title-row">
            <div className="credential-popup-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="credential-popup-title">
              {isReadOnly && !editing ? 'View' : 'Configure'} {toolName}
            </h3>
          </div>
          <button className="credential-popup-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="credential-popup-body">
          {/* Tabs for OAuth tools */}
          {shouldShowOAuthGuide ? (
            <>
              <div className="credential-tabs">
                <button
                  type="button"
                  className={`credential-tab ${activeTab === 'credentials' ? 'active' : ''}`}
                  onClick={() => setActiveTab('credentials')}
                >
                  Credentials
                </button>
                <button
                  type="button"
                  className={`credential-tab ${activeTab === 'guide' ? 'active' : ''}`}
                  onClick={() => setActiveTab('guide')}
                >
                  How to Get
                </button>
              </div>
              
              <div className="credential-tab-content">
                {activeTab === 'credentials' && (
                  fields.length === 0 ? (
                    <div className="credential-no-fields">
                      <p>No configuration fields available for this tool.</p>
                    </div>
                  ) : (
                    <div className="credential-fields">
                      {fields.map(renderField)}
                    </div>
                  )
                )}
                
                {activeTab === 'guide' && (
                  <OAuthSetupGuide
                    provider={oauthProvider}
                    setup={oauthSetup}
                    loading={oauthLoading}
                    error={oauthError}
                    onRetry={loadOAuthSetup}
                    acknowledged={oauthAcknowledged}
                    onAcknowledge={setOauthAcknowledged}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {oauthInstructions && (
                <div className="oauth-guide-hint">{oauthInstructions}</div>
              )}
              {fields.length === 0 ? (
                <div className="credential-no-fields">
                  <p>No configuration fields available for this tool.</p>
                </div>
              ) : (
                <div className="credential-fields">
                  {fields.map(renderField)}
                </div>
              )}
            </>
          )}

          {/* Test Result Banner */}
          {testResult && (
            <div className={`credential-test-result ${testResult.success ? 'success' : 'error'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {testResult.success ? (
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
              <span>{testResult.message}</span>
            </div>
          )}

          {authNotice && (
            <div className="credential-test-result info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="11" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{authNotice}</span>
            </div>
          )}

          {/* Footer */}
          <div className="credential-popup-footer">
            {isReadOnly && !editing ? (
              <>
                <button 
                  type="button" 
                  className="credential-btn-cancel" 
                  onClick={onClose}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="credential-btn-save"
                  onClick={() => setEditing(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className="credential-btn-cancel" 
                  onClick={() => {
                    if (isReadOnly && editing) {
                      setEditing(false);
                      // Reset values to initial
                      const initial = {};
                      fields.forEach(field => {
                        initial[field.name] = initialValues[field.name] || '';
                      });
                      setValues(initial);
                      setErrors({});
                      setTestResult(null);
                    } else {
                      onClose();
                    }
                  }}
                  disabled={saving || testing}
                >
                  {isReadOnly && editing ? 'Cancel' : 'Cancel'}
                </button>
                {shouldShowOAuthGuide && wrappedApiId && (
                  <button
                    type="button"
                    className="credential-btn-test"
                    onClick={handleAuthorization}
                    disabled={authLoading || !clientIdValue || !clientSecretValue}
                  >
                    {authLoading ? (
                      <>
                        <span className="credential-btn-spinner"></span>
                        Opening OAuth…
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Connect Account
                      </>
                    )}
                  </button>
                )}
                {wrappedApiId && (
                  <button 
                    type="button" 
                    className="credential-btn-test"
                    onClick={handleTest}
                    disabled={saving || testing || fields.length === 0 || (shouldShowOAuthGuide && !oauthAcknowledged)}
                  >
                    {testing ? (
                      <>
                        <span className="credential-btn-spinner"></span>
                        Testing...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Test Connection
                      </>
                    )}
                  </button>
                )}
                <button 
                  type="submit" 
                  className="credential-btn-save"
                  disabled={disableSave}
                >
                  {saving ? (
                    <>
                      <span className="credential-btn-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Save & Connect
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ToolCredentialPopup;
