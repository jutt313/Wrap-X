import React, { useState, useEffect } from 'react';
import { wrappedApiService } from '../services/wrappedApiService';
import { apiClient } from '../api/client';
import { documentService } from '../services/documentService';
import FileUploadModal from './FileUploadModal';
import '../styles/ToolsConfigModal.css';

function ToolsConfigModal({ wrappedApiId, isOpen, onClose }) {
  const [wrappedAPI, setWrappedAPI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    if (isOpen && wrappedApiId) {
      loadData();
      loadDocuments();
    }
  }, [isOpen, wrappedApiId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await wrappedApiService.getWrappedAPI(wrappedApiId);
      setWrappedAPI(data);
      // Use explicit boolean check - don't use || false which treats undefined as false
      setWebSearchEnabled(data.web_search_enabled === true);
      setThinkingEnabled(data.thinking_enabled === true);
      console.log('📥 Loaded tool states:', { 
        web_search: data.web_search_enabled, 
        thinking: data.thinking_enabled,
        raw_data: data 
      });
    } catch (err) {
      console.error('Error loading wrapped API:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolToggle = async (tool, enabled) => {
    // Save previous state for rollback
    const previousWebSearch = webSearchEnabled;
    const previousThinking = thinkingEnabled;
    
    // Calculate new state
    const newWebSearch = tool === 'web_search' ? enabled : webSearchEnabled;
    const newThinking = tool === 'thinking' ? enabled : thinkingEnabled;
    
    // Optimistically update UI
    setWebSearchEnabled(newWebSearch);
    setThinkingEnabled(newThinking);

    try {
      console.log('💾 Saving tool state:', { tool, enabled, newWebSearch, newThinking });
      const response = await apiClient.patch(
        `/api/wrapped-apis/${wrappedApiId}/tools`,
        {
          web_search_enabled: newWebSearch,
          thinking_enabled: newThinking
        }
      );
      console.log('📤 Backend response FULL:', JSON.stringify(response, null, 2));
      console.log('📤 Response web_search_enabled:', response?.web_search_enabled, 'type:', typeof response?.web_search_enabled);
      console.log('📤 Response thinking_enabled:', response?.thinking_enabled, 'type:', typeof response?.thinking_enabled);
      
      // Update from response to ensure sync - use Boolean() to handle any type
      if (response) {
        const savedWebSearch = Boolean(response.web_search_enabled);
        const savedThinking = Boolean(response.thinking_enabled);
        
        setWebSearchEnabled(savedWebSearch);
        setThinkingEnabled(savedThinking);
        
        console.log('✅ Tool saved successfully:', { 
          web_search: savedWebSearch, 
          thinking: savedThinking,
          raw_web_search: response.web_search_enabled,
          raw_thinking: response.thinking_enabled,
          web_search_type: typeof response.web_search_enabled,
          thinking_type: typeof response.thinking_enabled
        });
        
        // Verify persistence by reloading after delay
        setTimeout(async () => {
          console.log('🔄 Verifying persistence - reloading...');
          const verifyData = await wrappedApiService.getWrappedAPI(wrappedApiId);
          console.log('🔄 Verified after reload:', { 
            web_search: verifyData.web_search_enabled, 
            thinking: verifyData.thinking_enabled 
          });
          if (verifyData.web_search_enabled !== savedWebSearch || verifyData.thinking_enabled !== savedThinking) {
            console.error('❌ PERSISTENCE ISSUE: Values changed after reload!');
            console.error('Expected:', { web_search: savedWebSearch, thinking: savedThinking });
            console.error('Got:', { web_search: verifyData.web_search_enabled, thinking: verifyData.thinking_enabled });
          }
        }, 1000);
      } else {
        // If response doesn't have the fields, reload from server
        console.log('⚠️ Response missing fields, reloading from server...');
        await loadData();
        console.log('✅ Tool saved, reloaded from server');
      }
    } catch (err) {
      console.error('❌ Error updating tool:', err);
      console.error('❌ Error details:', { 
        message: err.message, 
        response: err.response?.data,
        status: err.response?.status
      });
      // Revert on error
      setWebSearchEnabled(previousWebSearch);
      setThinkingEnabled(previousThinking);
      const errorMessage = err.message || err.response?.data?.detail || 'Unknown error';
      alert(`Failed to update ${tool === 'web_search' ? 'Web Search' : 'Thinking'} tool: ${errorMessage}`);
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

  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(wrappedApiId, documentId);
      // Reload documents list
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document: ' + (err.message || 'Unknown error'));
    }
  };

  const handleFileUpload = async (fileData) => {
    try {
      await documentService.uploadDocument(wrappedApiId, fileData);
      // Reload documents list
      await loadDocuments();
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay tools-modal-overlay" onClick={onClose}>
        <div className="modal-card tools-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Tools Configuration</h3>
            <button className="modal-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div className="modal-body">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : (
              <div className="tools-section">
                <h4 className="section-title">Available Tools</h4>
                <div className="tools-list">
                  {/* Web Search Tool */}
                  <div className="tool-item">
                    <div className="tool-info">
                      <span className="tool-name">Web Search</span>
                      <span className="tool-description">Enable web search capabilities for real-time information</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={webSearchEnabled}
                        onChange={(e) => handleToolToggle('web_search', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  {/* Thinking Tool */}
                  <div className="tool-item">
                    <div className="tool-info">
                      <span className="tool-name">Thinking</span>
                      <span className="tool-description">Enable thinking/planning mode for complex reasoning</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={thinkingEnabled}
                        onChange={(e) => handleToolToggle('thinking', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  {/* Upload File Tool */}
                  <div className="tool-item upload-file-item">
                    <div className="tool-info">
                      <span className="tool-name">Upload Document</span>
                      <span className="tool-description">Upload CSV, PDF, TXT, or other files for AI to read</span>
                    </div>
                    <button 
                      className="btn-upload-file"
                      onClick={() => setShowFileUpload(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Upload
                    </button>
                  </div>
                </div>

                {/* Uploaded Documents Section */}
                <div className="documents-section">
                  <h4 className="section-title">Uploaded Documents</h4>
                  {loadingDocuments ? (
                    <div className="loading-state">Loading documents...</div>
                  ) : documents.length === 0 ? (
                    <div className="no-documents">
                      <p>No documents uploaded yet. Click "Upload" above to add documents.</p>
                    </div>
                  ) : (
                    <div className="documents-list">
                      {documents.map((doc) => (
                        <div key={doc.id} className="document-item">
                          <div className="document-info">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="document-icon">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="document-details">
                              <span className="document-name">{doc.filename}</span>
                              <span className="document-meta">
                                {doc.file_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(2)} KB • {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button 
                            className="delete-document-btn"
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Delete document"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFileUpload && (
        <FileUploadModal
          isOpen={showFileUpload}
          onClose={() => setShowFileUpload(false)}
          onUpload={handleFileUpload}
        />
      )}
    </>
  );
}

export default ToolsConfigModal;

