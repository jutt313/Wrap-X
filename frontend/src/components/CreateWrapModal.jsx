import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { llmProviderService } from '../services/llmProviderService';
import { projectService } from '../services/projectService';
import { wrappedApiService } from '../services/wrappedApiService';
import LLMSettingsModal from './LLMSettingsModal';
import '../styles/CreateWrapModal.css';

function CreateWrapModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLLM, setShowAddLLM] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    providerId: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen && !authLoading && user) {
      loadData();
    } else if (isOpen && !authLoading && !user) {
      setFormError('Please log in to create a wrap.');
      setLoading(false);
    }
  }, [isOpen, authLoading, user]);

  const loadData = async () => {
    setLoading(true);
    setFormError(null);
    
    // Double-check authentication
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setFormError('Authentication token not found. Please refresh the page and log in again.');
      setLoading(false);
      return;
    }
    
    try {
      const [projectsData, providersData] = await Promise.all([
        projectService.getProjects(),
        llmProviderService.getProviders()
      ]);
      
      setProjects(projectsData);
      setProviders(providersData);
      
      // Auto-select default project
      const defaultProject = projectsData.find(p => 
        p.name.includes('Default Project') || p.name.includes('Default')
      ) || projectsData[0];
      
      if (defaultProject) {
        setFormData(prev => ({ ...prev, projectId: String(defaultProject.id) }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
      const errorMsg = err.message || 'Failed to load projects or LLM providers.';
      if (errorMsg.includes('Authentication failed') || errorMsg.includes('Not authenticated')) {
        setFormError('Your session has expired. Please refresh the page and log in again.');
      } else {
        setFormError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.providerId) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const result = await wrappedApiService.createWrappedAPI(
        formData.name,
        formData.projectId ? Number(formData.projectId) : null,
        Number(formData.providerId)
      );
      
      // Navigate to chat page
      navigate(`/chat/${result.id}`);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to create wrapped API.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      projectId: '',
      providerId: ''
    });
    setFormError(null);
    onClose();
  };

  if (!isOpen) return null;

  if (authLoading) {
    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-card create-wrap-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Create New Wrap</h3>
          </div>
          <div className="modal-body">
            <div className="loading-state">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-card create-wrap-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Create New Wrap</h3>
          </div>
          <div className="modal-body">
            <div className="create-wrap-form">
              <div className="form-group">
                <label htmlFor="wrapName">Wrap Name *</label>
                <input
                  type="text"
                  id="wrapName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Coding Assistant"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="projectId">Project</label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  disabled={loading}
                >
                  <option value="">Select a project (optional)...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="providerId">LLM Provider *</label>
                <select
                  id="providerId"
                  value={formData.providerId}
                  onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="">Select an LLM provider...</option>
                  {loading ? (
                    <option disabled>Loading providers...</option>
                  ) : providers.length === 0 ? (
                    <option disabled>No LLM providers available</option>
                  ) : (
                    providers.map((provider) => (
                      <option key={provider.id} value={String(provider.id)}>
                        {provider.name} ({provider.provider_name})
                      </option>
                    ))
                  )}
                </select>
                {!loading && providers.length === 0 && (
                  <div className="form-hint">
                    <button 
                      type="button" 
                      className="link-button"
                      onClick={() => setShowAddLLM(true)}
                    >
                      Add LLM Provider
                    </button>
                  </div>
                )}
              </div>

              {formError && <div className="error-message">{formError}</div>}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleCreate} 
              disabled={saving || !formData.name || !formData.providerId}
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>

      {showAddLLM && (
        <LLMSettingsModal 
          isOpen={showAddLLM} 
          onClose={() => {
            setShowAddLLM(false);
            loadData(); // Reload providers
          }} 
        />
      )}
    </>
  );
}

export default CreateWrapModal;

