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

      if (onConfigUpdate) {
        onConfigUpdate(response.parsed_updates);
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

