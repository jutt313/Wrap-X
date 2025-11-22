import React, { useState, useEffect } from 'react';
import '../styles/TestChatConfigModal.css';

function TestChatConfigModal({ wrappedApiId, isOpen, onClose }) {
  const [historyMode, setHistoryMode] = useState('all'); // 'all' or 'last_n'
  const [lastNCount, setLastNCount] = useState(5);
  const [showThinking, setShowThinking] = useState(true);
  const [showWebSearch, setShowWebSearch] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Load saved config from localStorage
  useEffect(() => {
    if (isOpen && wrappedApiId) {
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
    }
  }, [isOpen, wrappedApiId]);

  const handleSave = () => {
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="test-chat-config-modal-overlay" onClick={onClose}>
      <div className="test-chat-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="test-chat-config-modal-header">
          <h2>Test Chat Configuration</h2>
          <button className="test-chat-config-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="test-chat-config-modal-body">
          {/* Conversation History Mode */}
          <div className="test-chat-config-section">
            <label className="test-chat-config-label">Conversation History</label>
            <p className="test-chat-config-description">
              Choose how much conversation history to send to the LLM
            </p>
            
            <div className="test-chat-config-radio-group">
              <label className="test-chat-config-radio">
                <input
                  type="radio"
                  name="historyMode"
                  value="all"
                  checked={historyMode === 'all'}
                  onChange={(e) => setHistoryMode(e.target.value)}
                />
                <span>All History</span>
                <span className="test-chat-config-hint">Send entire conversation context</span>
              </label>
              
              <label className="test-chat-config-radio">
                <input
                  type="radio"
                  name="historyMode"
                  value="last_n"
                  checked={historyMode === 'last_n'}
                  onChange={(e) => setHistoryMode(e.target.value)}
                />
                <span>Last N Messages</span>
                <span className="test-chat-config-hint">Send only recent messages</span>
              </label>
            </div>

            {historyMode === 'last_n' && (
              <div className="test-chat-config-input-group">
                <label>Number of messages:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={lastNCount}
                  onChange={(e) => setLastNCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 5)))}
                  className="test-chat-config-number-input"
                />
              </div>
            )}
          </div>

          {/* UI Display Options */}
          <div className="test-chat-config-section">
            <label className="test-chat-config-label">Display Options</label>
            <p className="test-chat-config-description">
              Control what information is shown in the test chat UI
            </p>

            <div className="test-chat-config-toggle-group">
              <label className="test-chat-config-toggle">
                <input
                  type="checkbox"
                  checked={showThinking}
                  onChange={(e) => setShowThinking(e.target.checked)}
                />
                <span>Show Thinking Process</span>
                <span className="test-chat-config-hint">Display what the AI is thinking</span>
              </label>

              <label className="test-chat-config-toggle">
                <input
                  type="checkbox"
                  checked={showWebSearch}
                  onChange={(e) => setShowWebSearch(e.target.checked)}
                />
                <span>Show Web Search Queries</span>
                <span className="test-chat-config-hint">Display search queries and results</span>
              </label>

              <label className="test-chat-config-toggle">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                <span>Auto-scroll to Bottom</span>
                <span className="test-chat-config-hint">Automatically scroll to latest message</span>
              </label>
            </div>
          </div>
        </div>

        <div className="test-chat-config-modal-footer">
          <button className="test-chat-config-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="test-chat-config-save" onClick={handleSave}>
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestChatConfigModal;

