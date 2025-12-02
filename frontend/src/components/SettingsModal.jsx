import React, { useState, useEffect, useCallback } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import { apiClient } from '../api/client';
import { documentService } from '../services/documentService';
import FileUploadModal from './FileUploadModal';
import ToolCredentialPopup from './ToolCredentialPopup';
import '../styles/SettingsModal.css';
import '../styles/ToolCredential.css';

function SettingsModal({ wrappedApiId, isOpen, onClose }) {
  const [wrappedAPI, setWrappedAPI] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Tools Config State
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  
  // Test Chat Config State
  const [historyMode, setHistoryMode] = useState('all'); // 'all' or 'last_n'
  const [lastNCount, setLastNCount] = useState(5);
  const [showThinking, setShowThinking] = useState(true);
  const [showWebSearch, setShowWebSearch] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Integrations State
  const [integrations, setIntegrations] = useState([]);
  const [pendingIntegrations, setPendingIntegrations] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showIntegrationPopup, setShowIntegrationPopup] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const TOOL_STORAGE_PREFIX = 'wx_tool_state';

  const getPendingStorageKey = useCallback(() => {
    if (!wrappedApiId) return null;
    return `${TOOL_STORAGE_PREFIX}:${wrappedApiId}:pending`;
  }, [wrappedApiId]);

  const readPendingFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return [];
    const key = getPendingStorageKey();
    if (!key) return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Failed to parse pending integrations from storage', err);
      return [];
    }
  }, [getPendingStorageKey]);

  const updatePendingState = useCallback(() => {
    setPendingIntegrations(readPendingFromStorage());
  }, [readPendingFromStorage]);

  const removePendingIntegration = useCallback((integrationName) => {
    if (typeof window === 'undefined') return;
    const key = getPendingStorageKey();
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter((tool) => tool?.name !== integrationName);
      if (next.length === 0) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      window.dispatchEvent(new CustomEvent('wxToolsUpdated', {
        detail: { wrappedApiId, type: 'pending' }
      }));
      setPendingIntegrations(next);
    } catch (err) {
      console.error('Failed to remove pending integration', err);
    }
  }, [getPendingStorageKey, wrappedApiId]);

  useEffect(() => {
    if (isOpen && wrappedApiId) {
      loadData();
      loadDocuments();
      loadTestChatConfig();
      loadIntegrations();
    }
  }, [isOpen, wrappedApiId]);

  useEffect(() => {
    if (!isOpen) return;
    updatePendingState();
    loadIntegrations(); // Reload from backend when modal opens
    if (typeof window === 'undefined') return;
    const handler = (event) => {
      const eventWrapId = event?.detail?.wrappedApiId;
      if (eventWrapId && eventWrapId !== wrappedApiId) return;
      // Reload integrations when tools are updated
      loadIntegrations();
      updatePendingState();
    };
    window.addEventListener('wxToolsUpdated', handler);
    return () => window.removeEventListener('wxToolsUpdated', handler);
  }, [isOpen, wrappedApiId, updatePendingState]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await wrappedApiService.getWrappedAPI(wrappedApiId);
      setWrappedAPI(data);
      setWebSearchEnabled(data.web_search_enabled === true);
      setThinkingEnabled(data.thinking_enabled === true);
    } catch (err) {
      console.error('Error loading wrapped API:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const docs = await documentService.getDocuments(wrappedApiId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleFileUpload = async (fileData) => {
    try {
      console.log('SettingsModal: Starting file upload', { wrappedApiId, fileData: { ...fileData, content: fileData.content?.substring(0, 50) + '...' } });
      await documentService.uploadDocument(wrappedApiId, fileData);
      console.log('SettingsModal: File upload successful');
      // Reload documents list
      await loadDocuments();
    } catch (err) {
      console.error('SettingsModal: Error uploading file:', err);
      console.error('SettingsModal: Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      throw err;
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(wrappedApiId, documentId);
      console.log('SettingsModal: Document deleted successfully');
      // Reload documents list
      await loadDocuments();
    } catch (err) {
      console.error('SettingsModal: Error deleting document:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  const loadIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const data = await apiClient.get(`/api/wrapped-apis/${wrappedApiId}/integrations`);
      // Transform backend response to match frontend format
      const transformed = data.map(integration => ({
        name: integration.name,
        displayName: integration.display_name,
        description: integration.description,
        isConnected: integration.is_connected,
        fields: integration.fields,
        credentials: {}, // Credentials are not returned for security
        updatedAt: integration.updated_at,
        requiresOAuth: integration.requires_oauth,
        oauthProvider: integration.oauth_provider,
        oauthScopes: integration.oauth_scopes || [],
      }));
      setIntegrations(transformed);
      updatePendingState();
    } catch (err) {
      console.error('Error loading integrations:', err);
      // Fallback to empty array on error
      setIntegrations([]);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleSaveIntegration = async (credentials) => {
    if (!selectedIntegration) return;
    setSavingIntegration(true);
    try {
      await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/integrations`, {
        tool_name: selectedIntegration.name,
        display_name: selectedIntegration.displayName || selectedIntegration.name,
        description: selectedIntegration.description || '',
        credential_fields: selectedIntegration.fields || [],
        credentials: credentials
      });
      removePendingIntegration(selectedIntegration.name);
      updatePendingState();
      
      // Reload integrations from backend
      await loadIntegrations();
      
      setShowIntegrationPopup(false);
      setSelectedIntegration(null);
    } catch (err) {
      console.error('Error saving integration:', err);
      alert('Failed to save integration. Please try again.');
    } finally {
      setSavingIntegration(false);
    }
  };

  const handleDeleteIntegration = async (integrationName) => {
    if (!confirm(`Are you sure you want to remove ${integrationName}?`)) return;
    try {
      await apiClient.delete(`/api/wrapped-apis/${wrappedApiId}/integrations/${integrationName}`);
      // Reload integrations to reflect deletion
      removePendingIntegration(integrationName);
      updatePendingState();
      await loadIntegrations();
      alert(`${integrationName} removed successfully`);
    } catch (err) {
      console.error('Error deleting integration:', err);
      alert('Failed to remove integration: ' + (err.message || 'Unknown error'));
    }
  };

  const loadTestChatConfig = () => {
    const savedConfig = localStorage.getItem(`testChatConfig_${wrappedApiId}`);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setHistoryMode(config.historyMode || 'all');
        setLastNCount(config.lastNCount || 5);
        setShowThinking(config.showThinking !== false);
        setShowWebSearch(config.showWebSearch !== false);
        setAutoScroll(config.autoScroll !== false);
      } catch (e) {
        console.error('Error loading test chat config:', e);
      }
    }
  };

  const handleToolToggle = async (tool, enabled) => {
    const previousWebSearch = webSearchEnabled;
    const previousThinking = thinkingEnabled;
    
    const newWebSearch = tool === 'web_search' ? enabled : webSearchEnabled;
    const newThinking = tool === 'thinking' ? enabled : thinkingEnabled;
    
    setWebSearchEnabled(newWebSearch);
    setThinkingEnabled(newThinking);
    
    try {
      const response = await apiClient.patch(
        `/api/wrapped-apis/${wrappedApiId}/tools`,
        {
          web_search_enabled: newWebSearch,
          thinking_enabled: newThinking
        }
      );
      
      // Update from response to ensure sync
      if (response) {
        setWebSearchEnabled(Boolean(response.web_search_enabled));
        setThinkingEnabled(Boolean(response.thinking_enabled));
      }
    } catch (err) {
      console.error('Error updating tool:', err);
      // Rollback on error
      setWebSearchEnabled(previousWebSearch);
      setThinkingEnabled(previousThinking);
      alert('Failed to update tool settings. Please try again.');
    }
  };

  const handleSaveTestChatConfig = () => {
    const config = {
      historyMode,
      lastNCount,
      showThinking,
      showWebSearch,
      autoScroll
    };
    localStorage.setItem(`testChatConfig_${wrappedApiId}`, JSON.stringify(config));
    // Trigger custom event to notify TestChat component
    window.dispatchEvent(new CustomEvent('testChatConfigUpdated', { 
      detail: { wrappedApiId, config } 
    }));
  };

  const handleSaveAll = () => {
    handleSaveTestChatConfig();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="settings-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="settings-modal-body">
          {/* Tools Configurations Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Tools Configurations</h3>
            
            {loading ? (
              <div className="settings-loading">Loading...</div>
            ) : (
              <>
                <div className="settings-toggle-group">
                  <label className="settings-toggle-item">
                    <div className="settings-toggle-info">
                      <span className="settings-toggle-label">Web Search</span>
                      <span className="settings-toggle-description">Enable web search functionality for your wrapped API</span>
                    </div>
                    <div className="settings-toggle-switch">
                      <input
                        type="checkbox"
                        checked={webSearchEnabled}
                        onChange={(e) => handleToolToggle('web_search', e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </div>
                  </label>

                  <label className="settings-toggle-item">
                    <div className="settings-toggle-info">
                      <span className="settings-toggle-label">Thinking Mode</span>
                      <span className="settings-toggle-description">Enable internal thinking process for complex reasoning</span>
                    </div>
                    <div className="settings-toggle-switch">
                      <input
                        type="checkbox"
                        checked={thinkingEnabled}
                        onChange={(e) => handleToolToggle('thinking', e.target.checked)}
                      />
                      <span className="settings-toggle-slider"></span>
                    </div>
                  </label>
                </div>

                {/* Documents Section */}
                <div className="settings-documents-section">
                  <span className="settings-documents-label">Uploaded Documents</span>

                  {loadingDocuments ? (
                    <div className="settings-loading">Loading documents...</div>
                  ) : (
                    <>
                      {/* Modern 3D Upload Zone */}
                      <div className="modern-upload-zone">
                        <div
                          className="upload-3d-container"
                          onClick={() => setShowFileUpload(true)}
                        >
                          <div className="upload-3d-inner">
                            <div className="upload-3d-icon">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div className="upload-3d-text">
                              <p className="upload-3d-title">Click to upload documents</p>
                              <p className="upload-3d-hint">PDF, CSV, TXT, DOC, DOCX, XLS, XLSX</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Documents List */}
                      {documents.length > 0 ? (
                        <div className="documents-list">
                          {documents.map((doc) => (
                            <div key={doc.id} className="document-item">
                              <div className="document-info">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="document-icon">
                                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <div className="document-details">
                                  <span className="document-name">{doc.filename}</span>
                                  <span className="document-meta">{(doc.file_size / 1024).toFixed(2)} KB</span>
                                </div>
                              </div>
                              <button
                                className="delete-document-btn"
                                onClick={() => handleDeleteDocument(doc.id)}
                                title="Delete document"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-documents">No documents uploaded yet. Click above to add one.</div>
                      )}
                    </>
                  )}
                </div>

                {/* Integrations Section */}
                <div className="integrations-section">
                  <div className="integrations-header">
                    <span className="integrations-label">Connected Integrations</span>
                  </div>
                  
                  {loadingIntegrations ? (
                    <div className="settings-loading">Loading integrations...</div>
                  ) : (
                    <>
                      {pendingIntegrations.length > 0 && (
                        <div className="integrations-list pending-list">
                          <div className="integrations-subheader">Pending Integrations</div>
                          {pendingIntegrations.map((integration) => (
                            <div key={`pending-${integration.name}`} className="integration-item pending">
                              <div className="integration-info">
                                <div className="integration-icon">
                                  {integration.icon ? (
                                    <img src={integration.icon} alt={integration.name} />
                                  ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="integration-details">
                                  <span className="integration-name">{integration.displayName || integration.name}</span>
                                  <div className="integration-meta">
                                <span className="integration-status pending">
                                      <span className="integration-status-dot"></span>
                                  {integration.oauthProvider ? `OAuth: ${integration.oauthProvider}` : 'Pending credentials'}
                                    </span>
                                    <span className="integration-timestamp">Awaiting setup</span>
                                  </div>
                                </div>
                              </div>
                              <div className="integration-actions">
                                <button
                                  className="integration-btn edit"
                                  onClick={() => {
                                    setSelectedIntegration({
                                      ...integration,
                                      isConnected: false,
                                      credentials: integration.credentials || {}
                                    });
                                    setShowIntegrationPopup(true);
                                  }}
                                >
                                  Finish Setup
                                </button>
                                <button
                                  className="integration-btn delete"
                                  onClick={() => removePendingIntegration(integration.name)}
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {integrations.length > 0 && (
                        <div className="integrations-list">
                          {integrations.map((integration) => (
                            <div key={integration.name} className="integration-item">
                              <div className="integration-info">
                                <div className="integration-icon">
                                  {integration.icon ? (
                                    <img src={integration.icon} alt={integration.name} />
                                  ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="integration-details">
                                  <span className="integration-name">{integration.displayName || integration.name}</span>
                                  <div className="integration-meta">
                                    <span className={`integration-status ${integration.isConnected ? 'connected' : 'disconnected'}`}>
                                      <span className="integration-status-dot"></span>
                                      {integration.isConnected ? 'Connected' : 'Not connected'}
                                    </span>
                                    {integration.updatedAt && (
                                      <span className="integration-timestamp">
                                        Updated {new Date(integration.updatedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="integration-actions">
                                <button
                                  className="integration-btn edit"
                                  onClick={() => {
                                    setSelectedIntegration(integration);
                                    setShowIntegrationPopup(true);
                                  }}
                                >
                                  {integration.isConnected ? 'View' : 'Connect'}
                                </button>
                                <button 
                                  className="integration-btn edit"
                                  onClick={() => {
                                    setSelectedIntegration(integration);
                                    setShowIntegrationPopup(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="integration-btn delete"
                                  onClick={() => handleDeleteIntegration(integration.name)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {pendingIntegrations.length === 0 && integrations.length === 0 && (
                        <div className="integrations-empty">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px', opacity: 0.5 }}>
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <p>No integrations connected yet</p>
                          <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Use the config chat to add integrations</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Response Format Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Response Format</h3>
            <p className="settings-section-description">
              View and manage your wrap's response format configuration
            </p>
            
            {wrappedAPI && wrappedAPI.prompt_config && (() => {
              // Extract platform and response_format from instructions
              const instructions = wrappedAPI.prompt_config.instructions || '';
              const platformMatch = instructions.match(/platform[:\s]+([^\n]+)/i);
              const formatMatch = instructions.match(/response[_\s]?format[:\s]+([^\n]+)/i);
              const platform = platformMatch ? platformMatch[1].trim() : 'Not set';
              const responseFormat = formatMatch ? formatMatch[1].trim() : (wrappedAPI.prompt_config.response_format || 'Not set');
              
              return (
                <div className="settings-format-display">
                  <div className="format-field">
                    <label>Platform/Integration:</label>
                    <div className="format-value">
                      {platform}
                    </div>
                  </div>
                  <div className="format-field">
                    <label>Response Format:</label>
                    <div className="format-value">
                      {responseFormat}
                    </div>
                    <p className="format-hint">
                      This includes both content style (bullets, step-by-step) and data format (JSON, Array, etc.)
                    </p>
                  </div>
                <div className="format-field">
                  <label>API Response Structure:</label>
                  <div className="format-code">
                    <code>{`{ "choices": [{ "message": { "content": "..." } }] }`}</code>
                  </div>
                  <p className="format-hint">
                    Extract content from <code>choices[0].message.content</code> and parse according to your data format
                  </p>
                </div>
                  <div className="format-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        // Navigate to config chat to update format
                        window.location.hash = '#config';
                      }}
                    >
                      Update Format in Config Chat
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Test Chat Configurations Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Test Chat Configurations</h3>
            
            {/* Conversation History Mode */}
            <div className="settings-option-group">
              <label className="settings-option-label">Conversation History</label>
              <p className="settings-option-description">
                Choose how much conversation history to send to the LLM
              </p>
              
              <div className="settings-radio-group">
                <label className="settings-radio-item">
                  <input
                    type="radio"
                    name="historyMode"
                    value="all"
                    checked={historyMode === 'all'}
                    onChange={(e) => setHistoryMode(e.target.value)}
                  />
                  <div className="settings-radio-content">
                    <span className="settings-radio-label">All History</span>
                    <span className="settings-radio-hint">Send entire conversation context</span>
                  </div>
                </label>
                
                <label className="settings-radio-item">
                  <input
                    type="radio"
                    name="historyMode"
                    value="last_n"
                    checked={historyMode === 'last_n'}
                    onChange={(e) => setHistoryMode(e.target.value)}
                  />
                  <div className="settings-radio-content">
                    <span className="settings-radio-label">Last N Messages</span>
                    <span className="settings-radio-hint">Send only recent messages</span>
                  </div>
                </label>
              </div>

              {historyMode === 'last_n' && (
                <div className="settings-number-input-group">
                  <label>Number of messages:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={lastNCount}
                    onChange={(e) => setLastNCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                    className="settings-number-input"
                  />
                </div>
              )}
            </div>

            {/* Display Options */}
            <div className="settings-option-group">
              <label className="settings-option-label">Display Options</label>
              <p className="settings-option-description">
                Control what information is shown in the test chat UI
              </p>

              <div className="settings-toggle-group">
                <label className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Show Thinking Process</span>
                    <span className="settings-toggle-description">Display what the AI is thinking</span>
                  </div>
                  <div className="settings-toggle-switch">
                    <input
                      type="checkbox"
                      checked={showThinking}
                      onChange={(e) => setShowThinking(e.target.checked)}
                    />
                    <span className="settings-toggle-slider"></span>
                  </div>
                </label>

                <label className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Show Web Searching</span>
                    <span className="settings-toggle-description">Display search queries and results</span>
                  </div>
                  <div className="settings-toggle-switch">
                    <input
                      type="checkbox"
                      checked={showWebSearch}
                      onChange={(e) => setShowWebSearch(e.target.checked)}
                    />
                    <span className="settings-toggle-slider"></span>
                  </div>
                </label>

                <label className="settings-toggle-item">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Auto Scroll to Bottom</span>
                    <span className="settings-toggle-description">Automatically scroll to latest message</span>
                  </div>
                  <div className="settings-toggle-switch">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    <span className="settings-toggle-slider"></span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          <button className="settings-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-modal-save" onClick={handleSaveAll}>
            Save All Settings
          </button>
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUploadModal
          wrappedApiId={wrappedApiId}
          isOpen={showFileUpload}
          onClose={() => {
            setShowFileUpload(false);
            loadDocuments();
          }}
          onUpload={handleFileUpload}
        />
      )}

      {/* Integration Credential Popup */}
      <ToolCredentialPopup
        isOpen={showIntegrationPopup}
        onClose={() => {
          setShowIntegrationPopup(false);
          setSelectedIntegration(null);
        }}
        onSave={handleSaveIntegration}
        toolName={selectedIntegration?.displayName || selectedIntegration?.name || ''}
        fields={selectedIntegration?.fields || []}
        initialValues={selectedIntegration?.credentials || {}}
        saving={savingIntegration}
        isReadOnly={selectedIntegration?.isConnected}
        wrappedApiId={wrappedApiId}
        toolCode={selectedIntegration?.toolCode}
        requiresOAuth={selectedIntegration?.requiresOAuth}
        oauthProvider={selectedIntegration?.oauthProvider}
        oauthScopes={selectedIntegration?.oauthScopes}
        aggregatedScopes={selectedIntegration?.aggregatedScopes}
      />
    </div>
  );
}

export default SettingsModal;

