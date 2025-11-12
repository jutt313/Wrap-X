import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { llmProviderService } from '../services/llmProviderService';
import { projectService } from '../services/projectService';
import AddLLMPopup from './AddLLMPopup';
import '../styles/LLMSettingsModal.css';

function LLMSettingsModal({ isOpen, onClose }) {
  const { user, loading: authLoading } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddPopup, setShowAddPopup] = useState(false);

  useEffect(() => {
    // Only load providers when modal is open AND user is available
    if (isOpen && !authLoading && user) {
      loadAllProviders();
    } else if (isOpen && !authLoading && !user) {
      // User not authenticated
      setError('Please log in to view LLM providers.');
      setLoading(false);
    }
  }, [isOpen, authLoading, user]);

  const loadAllProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load providers directly - the endpoint returns all providers for the user
      const allProviders = await llmProviderService.getProviders();
      
      // Load projects to get project names for display
      const projects = await projectService.getProjects();
      const projectMap = new Map(projects.map(p => [p.id, p.name]));
      
      // Add project names to providers
      const providersWithProject = allProviders.map(p => ({
        ...p,
        projectName: projectMap.get(p.project_id) || 'Unknown Project'
      }));
      
      setProviders(providersWithProject);
    } catch (err) {
      console.error('Error loading providers:', err);
      if (err.message && err.message.includes('session has expired')) {
        // Handle session expiry gracefully
        setError('Your session has expired. Please refresh the page and log in again.');
      } else {
        setError(err.message || 'Failed to load providers.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (providerId) => {
    if (window.confirm('Are you sure you want to delete this LLM provider? This action cannot be undone.')) {
      try {
        await llmProviderService.deleteProvider(providerId);
        loadAllProviders(); // Reload list
      } catch (err) {
        setError(err.message || 'Failed to delete provider.');
      }
    }
  };

  const handleAddSuccess = () => {
    setShowAddPopup(false);
    loadAllProviders(); // Reload list
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">LLM Settings</h3>
          </div>
          <div className="modal-body">
            <div className="llm-settings-content">
              <div className="llm-settings-header">
                <h4 className="settings-subtitle">Manage your LLM provider configurations</h4>
                <button 
                  className="new-llm-button" 
                  onClick={() => setShowAddPopup(true)}
                >
                  + Add LLM
                </button>
              </div>

              {loading ? (
                <div className="empty-state">Loading...</div>
              ) : error ? (
                <div className="empty-state error-message">{error}</div>
              ) : providers.length === 0 ? (
                <div className="empty-state">No LLM providers yet. Click "Add LLM" to add your first provider!</div>
              ) : (
                <div className="llm-providers-table-container">
                  <table className="llm-providers-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>LLM</th>
                        <th>Project</th>
                        <th>Last Used</th>
                        <th>Tokens Used</th>
                        <th>Calls</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((provider) => (
                        <tr key={provider.id}>
                          <td>{provider.name}</td>
                          <td>{provider.provider_name}</td>
                          <td>{provider.projectName || 'N/A'}</td>
                          <td>{formatDate(provider.last_used)}</td>
                          <td>{formatNumber(provider.tokens_count)}</td>
                          <td>{formatNumber(provider.calls_count)}</td>
                          <td>
                            <button 
                              className="delete-button" 
                              onClick={() => handleDelete(provider.id)}
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
      </div>

      {showAddPopup && (
        <AddLLMPopup
          isOpen={showAddPopup}
          onClose={() => setShowAddPopup(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </>
  );
}

export default LLMSettingsModal;

