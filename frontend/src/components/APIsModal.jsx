import React, { useState, useEffect } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import CreateAPIKeyModal from './CreateAPIKeyModal';
import '../styles/APIsModal.css';

function APIsModal({ isOpen, onClose }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const keys = await wrappedApiService.getAllAPIKeys();
      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to delete "${keyName || 'this API key'}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(keyId);
    try {
      await wrappedApiService.deleteAPIKey(keyId);
      await loadData(); // Reload data
    } catch (err) {
      console.error('Error deleting API key:', err);
      alert('Failed to delete API key: ' + (err.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const maskSecretKey = (keyId) => {
    // Show masked format: wx_****...****
    const idStr = String(keyId).padStart(8, '0');
    const prefix = 'wx_';
    const start = idStr.substring(0, 8).replace(/./g, '*');
    const end = idStr.slice(-8).replace(/./g, '*');
    return `${prefix}${start}...${end}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="apis-modal-overlay" onClick={onClose}>
        <div className="apis-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="apis-modal-header">
            <h2 className="apis-modal-title">API Keys</h2>
            <div className="apis-modal-header-actions">
              <button
                className="apis-create-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create API Key
              </button>
              <button className="apis-modal-close" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="apis-modal-body">
            {loading ? (
              <div className="apis-loading-state">Loading API keys...</div>
            ) : error ? (
              <div className="apis-error-state">{error}</div>
            ) : apiKeys.length === 0 ? (
              <div className="apis-empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 7H18C18.5304 7 19.0391 7.21071 19.4142 7.58579C19.7893 7.96086 20 8.46957 20 9V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V9C4 8.46957 4.21071 7.96086 4.58579 7.58579C4.96086 7.21071 5.46957 7 6 7H9M15 7V5C15 4.46957 14.7893 3.96086 14.4142 3.58579C14.0391 3.21071 13.5304 3 13 3H11C10.4696 3 9.96086 3.21071 9.58579 3.58579C9.21071 3.96086 9 4.46957 9 5V7M15 7H9M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>No API keys yet. Create your first API key to get started!</p>
                <button
                  className="apis-empty-create-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Your First API Key
                </button>
              </div>
            ) : (
              <div className="apis-table-wrapper">
                <table className="apis-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Secret Key</th>
                      <th>Wrap Name</th>
                      <th>Project</th>
                      <th>Created</th>
                      <th>Last Used</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td>{key.key_name || 'Unnamed Key'}</td>
                        <td className="apis-secret-key mono" title={`Key ID: ${key.id}`}>
                          {maskSecretKey(key.id)}
                        </td>
                        <td>{key.wrapped_api_name || 'N/A'}</td>
                        <td>{key.project_name || '-'}</td>
                        <td>{formatDate(key.created_at)}</td>
                        <td>{formatDate(key.last_used)}</td>
                        <td>
                          <button 
                            className="apis-delete-btn" 
                            onClick={() => handleDelete(key.id, key.key_name)}
                            disabled={deletingId === key.id}
                            title="Delete API key"
                          >
                            {deletingId === key.id ? (
                              'Deleting...'
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
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

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadData(); // Reload keys after creation
          }}
        />
      )}
    </>
  );
}

export default APIsModal;

