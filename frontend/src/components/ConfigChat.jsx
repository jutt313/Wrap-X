import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';
import '../styles/ConfigChat.css';

function ConfigChat({ wrappedApiId, onConfigUpdate }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showCoderPane, setShowCoderPane] = useState(false);
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
    // Show mini coder animation while processing
    setShowCoderPane(true);
    // Auto-peek the panel briefly then collapse to tab (if still loading)
    setTimeout(() => {
      if (loading) {
        setShowCoderPane(false);
      }
    }, 1200);

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
      
      // Remove typing indicator and stream assistant response into the paired message
      const full = response.response || '';
      setMessages(prev => prev.filter(msg => msg.id !== typingMessage.id));
      const speedMs = 18;
      const chunkSize = 3;
      let index = 0;
      const interval = setInterval(() => {
        index = Math.min(index + chunkSize, full.length);
        const next = full.slice(0, index);
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, response: next, isStreaming: index < full.length } : m));
        if (index >= full.length) {
          clearInterval(interval);
        }
      }, speedMs);

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
      setShowCoderPane(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render message with smart line breaks for readability
  const formatMessage = (text) => {
    const t = text || '';
    
    // First, split by existing newlines
    let paragraphs = t.split('\n').filter(p => p.trim());
    
    // For each paragraph, split by sentences (periods, question marks, exclamation marks)
    const processedLines = [];
    paragraphs.forEach((para, paraIdx) => {
      // Split by sentence endings (. ? !) but keep the punctuation
      const sentences = para.split(/([?.!])\s+/).filter(s => s.trim());
      
      let currentSentence = '';
      sentences.forEach((part, idx) => {
        if (part.match(/^[?.!]$/)) {
          // This is punctuation - add it to current sentence
          currentSentence += part;
          if (currentSentence.trim()) {
            processedLines.push({ 
              type: 'sentence', 
              text: currentSentence.trim(), 
              key: `para-${paraIdx}-sent-${idx}` 
            });
          }
          currentSentence = '';
        } else {
          currentSentence += (currentSentence ? ' ' : '') + part;
        }
      });
      
      // Add any remaining text
      if (currentSentence.trim()) {
        processedLines.push({ 
          type: 'sentence', 
          text: currentSentence.trim(), 
          key: `para-${paraIdx}-final` 
        });
      }
      
      // Add spacer between paragraphs (except after last paragraph)
      if (paraIdx < paragraphs.length - 1) {
        processedLines.push({ type: 'spacer', key: `spacer-${paraIdx}` });
      }
    });
    
    return (
      <>
        {processedLines.map((item) => {
          if (item.type === 'spacer') {
            return <div key={item.key} className="message-spacer"></div>;
          }
          return (
            <div key={item.key} className="message-line">
              {item.text}
            </div>
          );
        })}
      </>
    );
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
                <div className="message-content">{formatMessage(msg.response)}{msg.isStreaming && <span className="stream-caret" />}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Coding-in-progress mini tab and panel */}
      {loading && (
        <>
          <button
            type="button"
            className="coder-tab"
            aria-label="Show coding progress"
            onClick={() => setShowCoderPane(prev => !prev)}
          >
            <span className="coder-dot" />
            <span>Coding…</span>
          </button>
          {showCoderPane && (
            <div className="coder-panel">
              <div className="coder-header">
                <span className="coder-title">Building your wrap</span>
                <button
                  className="coder-close"
                  aria-label="Close"
                  onClick={() => setShowCoderPane(false)}
                >×</button>
              </div>
              <div className="coder-body">
                <div className="coder-line" style={{ animationDelay: '0s' }}>Analyzing use case<span className="coder-caret"/></div>
                <div className="coder-line" style={{ animationDelay: '0.3s' }}>Generating configuration fields…</div>
                <div className="coder-line" style={{ animationDelay: '0.6s' }}>Validating model & parameters…</div>
                <div className="coder-line" style={{ animationDelay: '0.9s' }}>Updating role/instructions/rules…</div>
              </div>
            </div>
          )}
        </>
      )}

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
