import React, { useState, useRef, useEffect } from 'react';
import '../styles/TestChat.css';

function DemoTestChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Simulate conversation
  useEffect(() => {
    const demoMessages = [
      {
        id: 1,
        role: 'user',
        content: "What's the refund policy for SaaS subscriptions?",
        timestamp: new Date(Date.now() - 90000).toISOString()
      },
      {
        id: 2,
        role: 'assistant',
        content: "I'd be happy to help you with our refund policy! 😊\n\nFor SaaS subscriptions, we offer:\n\n**30-Day Money-Back Guarantee**\n- Full refund within the first 30 days\n- No questions asked\n- Processed within 5-7 business days\n\n**After 30 Days**\n- Pro-rated refunds for annual plans\n- Contact support@example.com for special cases\n\nWould you like me to help you process a refund or answer any specific questions about your subscription?",
        timestamp: new Date(Date.now() - 85000).toISOString()
      },
      {
        id: 3,
        role: 'user',
        content: "How do I cancel my subscription?",
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 4,
        role: 'assistant',
        content: "Here's how to cancel your subscription:\n\n**Step-by-Step:**\n1. Go to Settings → Billing\n2. Click \"Manage Subscription\"\n3. Select \"Cancel Subscription\"\n4. Confirm cancellation\n\n**Important Notes:**\n- You'll have access until the end of your billing period\n- No charges after cancellation\n- You can reactivate anytime\n- All your data is saved for 90 days\n\nNeed help with any of these steps? I can guide you through! 💙",
        timestamp: new Date(Date.now() - 55000).toISOString()
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

  return (
    <div className="test-chat-panel">
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}-message`}>
            <div className="message-content">{formatMessage(msg.content)}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Test your AI assistant..."
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

export default DemoTestChat;

