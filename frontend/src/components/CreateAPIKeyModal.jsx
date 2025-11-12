import React, { useState, useEffect } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import { dashboardService } from '../services/dashboardService';
import '../styles/CreateAPIKeyModal.css';

function CreateAPIKeyModal({ isOpen, onClose }) {
  const [wrappedAPIs, setWrappedAPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [keyName, setKeyName] = useState('');
  const [selectedWrapId, setSelectedWrapId] = useState('');
  const [newApiKey, setNewApiKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('create'); // 'create' or 'show'

  useEffect(() => {
    if (isOpen && view === 'create') {
      loadWrappedAPIs();
    }
  }, [isOpen, view]);

  const loadWrappedAPIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const apis = await dashboardService.getWrappedAPIs();
      setWrappedAPIs(apis);
      if (apis.length > 0) {
        setSelectedWrapId(String(apis[0].id));
      }
    } catch (err) {
      console.error('Error loading wrapped APIs:', err);
      setError(err.message || 'Failed to load wrapped APIs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyName.trim() || !selectedWrapId) {
      setError('Please enter a key name and select a wrap');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await wrappedApiService.createAPIKey(
        Number(selectedWrapId),
        keyName.trim()
      );
      setNewApiKey(response);
      setView('show');
    } catch (err) {
      console.error('Error creating API key:', err);
      setError(err.message || 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = async () => {
    if (newApiKey?.api_key) {
      try {
        await navigator.clipboard.writeText(newApiKey.api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleClose = () => {
    setView('create');
    setKeyName('');
    setSelectedWrapId('');
    setNewApiKey(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  // Show Key View
  if (view === 'show' && newApiKey) {
    return (
      <div className="create-api-key-modal-overlay" onClick={handleClose}>
        <div className="create-api-key-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="create-api-key-modal-header">
            <h3 className="create-api-key-modal-title">Save your key</h3>
            <button className="create-api-key-modal-close" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="create-api-key-modal-body">
            <div className="create-api-key-warning-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>
                Please save your secret key in a safe place since you won't be able to view it again. 
                Keep it secure, as anyone with your API key can make requests on your behalf.
              </p>
            </div>
            <div className="create-api-key-display-box">
              <div className="create-api-key-value" onClick={handleCopyKey}>
                {newApiKey.api_key}
              </div>
              <button
                className={`create-api-key-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyKey}
              >
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V3C3 2.46957 3.21071 1.96086 3.58579 1.58579C3.96086 1.21071 4.46957 1 5 1H13C13.5304 1 14.0391 1.21071 14.4142 1.58579C14.7893 1.96086 15 2.46957 15 3V6M18 8H11C10.4696 8 9.96086 8.21071 9.58579 8.58579C9.21071 8.96086 9 9.46957 9 10V21C9 21.5304 9.21071 22.0391 9.58579 22.4142C9.96086 22.7893 10.4696 23 11 23H19C19.5304 23 20.0391 22.7893 20.4142 22.4142C20.7893 22.0391 21 21.5304 21 21V10C21 9.46957 20.7893 8.96086 20.4142 8.58579C20.0391 8.21071 19.5304 8 19 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="create-api-key-endpoint-info">
              <div className="create-api-key-endpoint-label">Endpoint URL:</div>
              <div className="create-api-key-endpoint-value mono">
                {window.location.origin}/api/wrap-x/chat
              </div>
              <div className="create-api-key-endpoint-hint">
                Use this endpoint for all your wrapped APIs. The API key identifies which wrap to use.
              </div>
            </div>
          </div>
          <div className="create-api-key-modal-footer">
            <button className="create-api-key-btn-primary" onClick={handleClose}>
              I've saved my key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create View
  return (
    <div className="create-api-key-modal-overlay" onClick={handleClose}>
      <div className="create-api-key-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="create-api-key-modal-header">
          <h3 className="create-api-key-modal-title">Create new secret key</h3>
          <button className="create-api-key-modal-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="create-api-key-modal-body">
          {loading ? (
            <div className="create-api-key-loading">Loading wraps...</div>
          ) : wrappedAPIs.length === 0 ? (
            <div className="create-api-key-error">No wrapped APIs found. Please create a wrap first.</div>
          ) : (
            <>
              <div className="create-api-key-form-group">
                <label htmlFor="key-name">API Key Name</label>
                <input
                  id="key-name"
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Enter a name for this key"
                  className="create-api-key-input"
                  autoFocus
                />
              </div>
              <div className="create-api-key-form-group">
                <label htmlFor="wrap-select">Wrap</label>
                <select
                  id="wrap-select"
                  value={selectedWrapId}
                  onChange={(e) => setSelectedWrapId(e.target.value)}
                  className="create-api-key-select"
                >
                  {wrappedAPIs.map((api) => (
                    <option key={api.id} value={String(api.id)}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="create-api-key-error-message">{error}</div>
              )}
            </>
          )}
        </div>
        <div className="create-api-key-modal-footer">
          <button 
            className="create-api-key-btn-secondary" 
            onClick={handleClose} 
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            className="create-api-key-btn-primary" 
            onClick={handleCreate} 
            disabled={!keyName.trim() || !selectedWrapId || saving || loading || wrappedAPIs.length === 0}
          >
            {saving ? 'Creating...' : 'Create secret key'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateAPIKeyModal;

