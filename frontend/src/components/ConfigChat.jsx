import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';
import '../styles/ConfigChat.css';

function ConfigChat({ wrappedApiId, onConfigUpdate }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [wrappedApiId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 4 * 24; // 4 lines * 24px per line (approx)
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const msgs = await chatService.getConfigMessages(wrappedApiId);
      setMessages(msgs);
      setInitializing(false);
    } catch (err) {
      console.error('Error loading messages:', err);
      setInitializing(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Add user message immediately
    const newMessage = {
      id: Date.now(),
      message: userMessage,
      response: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);

    // Add typing indicator
    const typingMessage = {
      id: Date.now() + 1,
      message: null,
      response: null,
      created_at: new Date().toISOString(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await chatService.sendConfigMessage(wrappedApiId, userMessage);
      
      // Remove typing indicator and add actual response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        return filtered.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, response: response.response }
            : msg
        );
      });

      // Notify parent that config was updated (parent will reload wrapped API)
      if (onConfigUpdate) {
        onConfigUpdate();
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove typing indicator and add error
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        return filtered.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, response: 'Error: ' + (err.message || 'Failed to process message'), isError: true }
            : msg
        );
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (text) => {
    if (!text) return '';
    // Split by double newlines to create paragraphs, then split by single newlines for line breaks
    return text.split(/\n\n+/).map((paragraph, idx) => (
      <React.Fragment key={idx}>
        {paragraph.split('\n').map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {line}
            {lineIdx < paragraph.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
        {idx < text.split(/\n\n+/).length - 1 && <><br /><br /></>}
      </React.Fragment>
    ));
  };

  if (initializing) {
    return (
      <div className="config-chat-panel">
        <div className="chat-loading-state">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="config-chat-panel">
      <div className="chat-messages-container">
        {messages.length === 0 && (
          <div className="config-chat-empty-state">
            <div className="config-frame">
              <div className="config-illustration">
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="45" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" fill="rgba(99, 102, 241, 0.05)"/>
                  <path d="M30 50L45 65L70 35" stroke="rgba(99, 102, 241, 0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="50" cy="50" r="25" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1.5" strokeDasharray="3 3"/>
                </svg>
              </div>
              <h3 className="config-welcome-title">Let's Build Your AI Assistant</h3>
              <p className="config-welcome-message">
                I'm here to help you configure your wrapped AI. Just tell me what you want to build!
              </p>
              <div className="config-instructions">
                <div className="instruction-item">
                  <div className="instruction-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M8 10H16M8 14H16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="instruction-text">
                    <strong>Describe your vision</strong>
                    <span>Tell me what you want your AI to do</span>
                  </div>
                </div>
                <div className="instruction-item">
                  <div className="instruction-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M8 9H16M8 13H16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="instruction-text">
                    <strong>Answer questions</strong>
                    <span>I'll ask about tools, tone, and settings</span>
                  </div>
                </div>
                <div className="instruction-item">
                  <div className="instruction-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="instruction-text">
                    <strong>Review & confirm</strong>
                    <span>Check the configuration and approve</span>
                  </div>
                </div>
              </div>
              <div className="config-examples">
                <p className="examples-label">Try saying:</p>
                <div className="example-chips">
                  <button 
                    className="example-chip"
                    onClick={() => setInputValue("I want a customer support AI")}
                  >
                    "I want a customer support AI"
                  </button>
                  <button 
                    className="example-chip"
                    onClick={() => setInputValue("Build me a coding assistant")}
                  >
                    "Build me a coding assistant"
                  </button>
                  <button 
                    className="example-chip"
                    onClick={() => setInputValue("I need a research assistant")}
                  >
                    "I need a research assistant"
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="message-group">
            {msg.message && (
              <div className="message user-message">
                <div className="message-content">{msg.message}</div>
              </div>
            )}
            {msg.isTyping ? (
              <div className="message assistant-message typing-indicator">
                <div className="message-content typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : msg.response && (
              <div className={`message assistant-message ${msg.isError ? 'error' : ''} ${msg.isStatus ? 'status-message' : ''} ${msg.statusType ? `status-${msg.statusType}` : ''}`}>
                <div className="message-content">{formatMessage(msg.response)}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe how you want your AI to behave..."
            disabled={loading}
            rows={1}
          />
          <button 
            className="send-button"
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 10L17.5 10M17.5 10L11.6667 3.33334M17.5 10L11.6667 16.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfigChat;

