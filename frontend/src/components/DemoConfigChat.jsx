import React, { useState, useRef, useEffect } from 'react';
import '../styles/ConfigChat.css';

function DemoConfigChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Simulate conversation
  useEffect(() => {
    const demoMessages = [
      {
        id: 1,
        message: "I want to build a customer support AI that helps users with product questions",
        response: "Great! I'd love to help you build that. To get started, I need to understand a few things:\n\n- What's the main purpose of this AI? What problem will it solve?\n- Where will it be used? In your app, as an API, or internally?\n- Who will use it? Your team, customers, or the public?",
        created_at: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 2,
        message: "It will be used in our web app for customers to get instant help about our software products",
        response: "Perfect! So this is a customer-facing support assistant in your web app. Now let's configure it:\n\n1. **Tone & Style**: Should it be formal, friendly, or casual?\n2. **Response Length**: Short and concise, or detailed explanations?\n3. **Tools**: Do you want web search enabled to find latest product info?\n4. **Knowledge Base**: Any specific documents or guidelines it should follow?",
        created_at: new Date(Date.now() - 90000).toISOString()
      },
      {
        id: 3,
        message: "Friendly tone, detailed responses, yes to web search, and we'll upload our product docs",
        response: "Excellent! Here's what I've configured:\n\n✅ **Role**: Customer Support Assistant\n✅ **Tone**: Friendly and approachable\n✅ **Response Style**: Detailed explanations\n✅ **Web Search**: Enabled\n✅ **Document Support**: Ready for your product docs\n\nThis assistant will:\n- Answer product questions with a friendly tone\n- Provide detailed, helpful explanations\n- Search the web for latest information when needed\n- Reference your uploaded product documentation\n\nReady to create this configuration?",
        created_at: new Date(Date.now() - 60000).toISOString()
      }
    ];
    
    setMessages(demoMessages);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 4 * 24;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessage = (text) => {
    if (!text) return '';
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

  const exampleChips = [
    "I want a legal research assistant",
    "Build a code review AI",
    "Create a content writing assistant"
  ];

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
                I'll help you configure your perfect AI API through conversation. Just describe what you want!
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
                <span className="examples-label">Try these examples:</span>
                <div className="example-chips">
                  {exampleChips.map((example, idx) => (
                    <button
                      key={idx}
                      className="example-chip"
                      onClick={() => setInputValue(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="message-pair">
            {msg.message && (
              <div className="message user-message">
                <div className="message-content">{formatMessage(msg.message)}</div>
              </div>
            )}
            {msg.response && (
              <div className="message assistant-message">
                <div className="message-content">{formatMessage(msg.response)}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe what you want your AI to do..."
          className="chat-input"
          rows={1}
          disabled
        />
        <button className="send-button" disabled>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DemoConfigChat;

