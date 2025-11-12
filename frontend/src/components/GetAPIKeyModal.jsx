import React, { useState, useEffect } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import '../styles/Modal.css';
import '../styles/GetAPIKeyModal.css';

function GetAPIKeyModal({ wrappedApiId, isOpen, onClose }) {
  const [view, setView] = useState('main'); // 'main', 'create', 'show'
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [endpointInfo, setEndpointInfo] = useState(null);

  useEffect(() => {
    if (isOpen && view === 'main') {
      loadKeys();
    }
  }, [isOpen, view]);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await wrappedApiService.listAPIKeys(wrappedApiId);
      setKeys(response.keys || []);
      setEndpointInfo({
        endpoint_id: response.endpoint_id,
        endpoint_url: response.endpoint_url
      });
    } catch (err) {
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSecret = () => {
    setView('create');
    setKeyName('');
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await wrappedApiService.createAPIKey(wrappedApiId, keyName.trim());
      setNewApiKey(response);
      setView('show');
      loadKeys(); // Refresh list
    } catch (err) {
      console.error('Error creating API key:', err);
      alert('Failed to create API key: ' + (err.message || 'Unknown error'));
    } finally {
      setCreating(false);
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

  const handleDeleteKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await wrappedApiService.deleteAPIKey(keyId);
      loadKeys(); // Refresh list
    } catch (err) {
      console.error('Error deleting API key:', err);
      alert('Failed to delete API key: ' + (err.message || 'Unknown error'));
    }
  };

  const handleClose = () => {
    setView('main');
    setKeyName('');
    setNewApiKey(null);
    setCopied(false);
    onClose();
  };

  const maskSecretKey = (keyId) => {
    // Show masked format: wx_****...****
    // Since we can't retrieve the actual key after creation, show a masked version
    // Format: wx_[8 chars]...[8 chars] (looks like a real API key but masked)
    const idStr = String(keyId).padStart(8, '0');
    const prefix = 'wx_';
    const start = idStr.substring(0, 8).replace(/./g, '*');
    const end = idStr.slice(-8).replace(/./g, '*');
    return `${prefix}${start}...${end}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  if (!isOpen) return null;

  // Create Secret View (small modal on top)
  if (view === 'create') {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-card api-key-create-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Create new secret key</h3>
          </div>
          <div className="modal-body">
            <div className="api-key-form-group">
              <label htmlFor="key-name">Name</label>
              <input
                id="key-name"
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Enter a name for this key"
                className="api-key-input"
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setView('main')}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateKey}
              disabled={!keyName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show Key View (small modal on top)
  if (view === 'show' && newApiKey) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-card api-key-show-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Save your key</h3>
          </div>
          <div className="modal-body">
            <div className="api-key-warning-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>
                Please save your secret key in a safe place since you won't be able to view it again. 
                Keep it secure, as anyone with your API key can make requests on your behalf. 
                If you do lose it, you'll need to generate a new one.
              </p>
            </div>
            <div className="api-key-display-box">
              <div className="api-key-value" onClick={handleCopyKey}>
                {newApiKey.api_key}
              </div>
              <button
                className={`api-key-copy-btn ${copied ? 'copied' : ''}`}
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
                      <path d="M8 5.00005C7.01165 5.00005 6.49359 5.00005 6.09202 5.21799C5.71569 5.40973 5.40973 5.71569 5.21799 6.09202C5 6.49359 5 7.01165 5 8.00005V16C5 16.9884 5 17.5065 5.21799 17.908C5.40973 18.2843 5.71569 18.5903 6.09202 18.782C6.49359 19 7.01165 19 8 19H16C16.9884 19 17.5065 19 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C19 17.5065 19 16.9884 19 16V8.00005C19 7.01165 19 6.49359 18.782 6.09202C18.5903 5.71569 18.2843 5.40973 17.908 5.21799C17.5065 5.00005 16.9884 5.00005 16 5.00005H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 5.00005C8 4.05719 8 3.58579 8.29289 3.29289C8.58579 3.00005 9.05719 3.00005 10 3.00005H14C14.9428 3.00005 15.4142 3.00005 15.7071 3.29289C16 3.58579 16 4.05719 16 5.00005" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={handleClose}>
              I've saved my key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main View (full-screen modal)
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">API Keys</h3>
          <button className="create-btn" onClick={handleCreateSecret}>
            + Create new secret
          </button>
        </div>
        <div className="modal-body">
          <div className="api-key-warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>
              Do not share your API key with others or expose it in the browser or other client-side code. 
              To protect your account's security, Wrap-X may automatically disable any API key that has leaked publicly.
            </p>
          </div>

          {loading ? (
            <div className="empty">Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div className="empty">No API keys found. Create your first secret key to get started.</div>
          ) : (
            <div className="api-keys-table-wrap">
              <table className="api-keys-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Secret Key</th>
                    <th>Created</th>
                    <th>Last used</th>
                    <th>Project Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td>{key.key_name || 'Unnamed Key'}</td>
                      <td className="mono secret-key-cell" title={`Key ID: ${key.id}`}>
                        {maskSecretKey(key.id)}
                      </td>
                      <td>{formatDate(key.created_at)}</td>
                      <td>{formatDate(key.last_used)}</td>
                      <td>{key.project_name || '-'}</td>
                      <td>
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDeleteKey(key.id)}
                          title="Delete API key"
                        >
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
      </div>
    </div>
  );
}

export default GetAPIKeyModal;
