import React, { useState } from 'react';
import { projectService } from '../services/projectService';
import '../styles/CreateProjectModal.css';

function CreateProjectModal({ isOpen, onClose, onSuccess }) {
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await projectService.createProject(projectName.trim());
      setProjectName('');
      setError(null);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setProjectName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-project-modal-overlay" onClick={handleClose}>
      <div className="create-project-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="create-project-modal-header">
          <h3 className="create-project-modal-title">Create a new project</h3>
          <button className="create-project-modal-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="create-project-modal-body">
          <div className="create-project-description">
            <p>
              Projects are shared environments where you can organize your wraps, LLM providers, and API keys. 
              You can group related resources together and manage access to them efficiently.
            </p>
          </div>

          {error && <div className="create-project-error-message">{error}</div>}
          
          <div className="create-project-form-group">
            <label htmlFor="project-name">Name</label>
            <p className="create-project-label-description">
              Human-friendly label for your project, shown in user interfaces and on exports
            </p>
            <input
              id="project-name"
              type="text"
              className="create-project-input"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !saving) {
                  handleCreate();
                }
              }}
              disabled={saving}
              autoFocus
            />
          </div>
        </div>

        <div className="create-project-modal-footer">
          <button
            className="create-project-btn-secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="create-project-btn-primary"
            onClick={handleCreate}
            disabled={saving || !projectName.trim()}
          >
            {saving ? 'Creating...' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProjectModal;

