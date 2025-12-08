import React, { useState, useEffect, useCallback } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import { apiClient } from '../api/client';
import { documentService } from '../services/documentService';
import FileUploadModal from './FileUploadModal';
import '../styles/SettingsModal.css';

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
  


  useEffect(() => {
    if (isOpen && wrappedApiId) {
      loadData();
      loadDocuments();
      loadTestChatConfig();
    }
  }, [isOpen, wrappedApiId]);

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

    </div>
  );
}

export default SettingsModal;

