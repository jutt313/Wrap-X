import React, { useState, useEffect } from 'react';
import { llmProviderService } from '../services/llmProviderService';
import { projectService } from '../services/projectService';
import '../styles/CreateAPIKeyModal.css';

function AddLLMPopup({ isOpen, onClose, onSuccess }) {
  const [projects, setProjects] = useState([]);
  const [supportedProviders, setSupportedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    name: '',
    providerName: '',
    apiKey: '',
    apiBaseUrl: ''
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load projects and supported providers in parallel
      const [projectsData, providersData] = await Promise.all([
        projectService.getProjects(),
        llmProviderService.getSupportedProviders()
      ]);
      
      setProjects(projectsData);
      setSupportedProviders(providersData);
      
      // Auto-select default project
      const defaultProject = projectsData.find(p => 
        p.name.includes('Default Project') || p.name.includes('Default')
      ) || projectsData[0];
      
      if (defaultProject) {
        setFormData(prev => ({ ...prev, projectId: String(defaultProject.id) }));
      }
      } catch (err) {
        console.error('Error loading data:', err);
        const errorMsg = err.message || 'Failed to load projects or providers.';
        if (errorMsg.includes('Authentication failed') || errorMsg.includes('session has expired') || errorMsg.includes('authenticated')) {
          setFormError('Authentication failed. Please refresh the page and log in again.');
        } else {
          setFormError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

  const handleSave = async () => {
    if (!formData.projectId || !formData.name || !formData.providerName || !formData.apiKey) {
      setFormError('Please fill in all required fields.');
      return;
    }

    // If Custom is selected, base URL is required
    if (formData.providerName === 'custom' && !formData.apiBaseUrl) {
      setFormError('Base URL is required for Custom providers.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // Validate projectId is set and is a valid number
      if (!formData.projectId || formData.projectId === '' || formData.projectId === null || formData.projectId === undefined) {
        setFormError('Please select a project.');
        setSaving(false);
        return;
      }
      
      const projectIdNum = parseInt(formData.projectId, 10);
      if (isNaN(projectIdNum) || projectIdNum <= 0) {
        setFormError('Please select a valid project.');
        setSaving(false);
        return;
      }
      
      console.log('Creating provider with data:', {
        name: formData.name,
        projectId: projectIdNum,
        providerName: formData.providerName,
        hasApiKey: !!formData.apiKey,
        apiBaseUrl: formData.apiBaseUrl,
        formDataProjectId: formData.projectId
      });
      
      // API key test happens automatically during save in backend
      await llmProviderService.createProvider(
        formData.name,
        projectIdNum,
        formData.providerName,
        formData.apiKey,
        formData.apiBaseUrl || null
      );
      
      // Reset form
      const defaultProject = projects.find(p => 
        p.name.includes('Default Project') || p.name.includes('Default')
      ) || projects[0];
      
      setFormData({ 
        projectId: defaultProject ? String(defaultProject.id) : '', 
        name: '', 
        providerName: '', 
        apiKey: '', 
        apiBaseUrl: '' 
      });
      setFormError(null);
      onSuccess(); // This will close popup and reload list
    } catch (err) {
      console.error('Error in handleSave:', err);
      const errorMsg = err.message || 'Failed to save provider. Please check your API key.';
      // Check if it's an authentication error
      if (errorMsg.includes('Authentication failed') || errorMsg.includes('session has expired') || errorMsg.includes('authenticated')) {
        setFormError('Authentication failed. Please refresh the page and log in again.');
      } else {
        setFormError(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    const defaultProject = projects.find(p => 
      p.name.includes('Default Project') || p.name.includes('Default')
    ) || projects[0];
    
    setFormData({ 
      projectId: defaultProject?.id || '', 
      name: '', 
      providerName: '', 
      apiKey: '', 
      apiBaseUrl: '' 
    });
    setFormError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-api-key-modal-overlay" onClick={handleClose}>
      <div className="create-api-key-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="create-api-key-modal-header">
          <h3 className="create-api-key-modal-title">Add New LLM Provider</h3>
          <button className="create-api-key-modal-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="create-api-key-modal-body">
          {loading ? (
            <div className="create-api-key-loading">Loading projects and providers...</div>
          ) : projects.length === 0 ? (
            <div className="create-api-key-error">No projects found. Please create a project first.</div>
          ) : (
            <>
              <div className="create-api-key-form-group">
                <label htmlFor="projectId">Project *</label>
                <select
                  id="projectId"
                  value={formData.projectId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    console.log('Project selected:', selectedId);
                    setFormData({ ...formData, projectId: selectedId });
                  }}
                  required
                  disabled={loading || projects.length === 0}
                  className="create-api-key-select"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="create-api-key-form-group">
                <label htmlFor="llmName">Name *</label>
                <input
                  type="text"
                  id="llmName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My OpenAI Key"
                  required
                  className="create-api-key-input"
                  autoFocus
                />
              </div>

              <div className="create-api-key-form-group">
                <label htmlFor="providerName">LLM *</label>
                <select
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value, apiBaseUrl: '' })}
                  required
                  disabled={loading}
                  className="create-api-key-select"
                >
                  <option value="">Select a provider...</option>
                  {loading ? (
                    <option disabled>Loading providers...</option>
                  ) : (
                    supportedProviders.map((provider) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name} {provider.description ? `- ${provider.description}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="create-api-key-form-group">
                <label htmlFor="apiKey">API Key *</label>
                <input
                  type="password"
                  id="apiKey"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  required
                  className="create-api-key-input"
                />
              </div>

              {formData.providerName === 'custom' && (
                <div className="create-api-key-form-group">
                  <label htmlFor="apiBaseUrl">Base URL *</label>
                  <input
                    type="text"
                    id="apiBaseUrl"
                    value={formData.apiBaseUrl}
                    onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                    placeholder="e.g., https://api.wrap-x.com/v1"
                    required
                    className="create-api-key-input"
                  />
                </div>
              )}

              {formError && (
                <div className="create-api-key-error-message">{formError}</div>
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
            onClick={handleSave} 
            disabled={saving || !formData.projectId || !formData.name || !formData.providerName || !formData.apiKey || (formData.providerName === 'custom' && !formData.apiBaseUrl) || loading || projects.length === 0}
          >
            {saving ? 'Saving & Testing...' : 'Save & Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddLLMPopup;

