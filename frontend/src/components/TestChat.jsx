import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';
import '../styles/TestChat.css';

function TestChat({ wrappedApiId, endpointId, wrappedAPI }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [testChatConfig, setTestChatConfig] = useState({
    historyMode: 'all',
    lastNCount: 5,
    showThinking: true,
    showWebSearch: true,
    autoScroll: true
  });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Check if wrap is configured
  useEffect(() => {
    if (wrappedAPI) {
      console.log('🔍 [TestChat] Checking if wrap is configured...');
      console.log('🔍 [TestChat] wrappedAPI:', {
        id: wrappedAPI.id,
        name: wrappedAPI.name,
        model: wrappedAPI.model,
        hasPromptConfig: !!wrappedAPI.prompt_config,
        promptConfig: wrappedAPI.prompt_config ? {
          role: wrappedAPI.prompt_config.role,
          instructions: wrappedAPI.prompt_config.instructions,
          roleLength: wrappedAPI.prompt_config.role?.length || 0,
          instructionsLength: wrappedAPI.prompt_config.instructions?.length || 0
        } : null
      });
      
      // Check if prompt_config exists and has required fields
      const hasRole = wrappedAPI.prompt_config?.role && wrappedAPI.prompt_config.role.trim().length > 0;
      const hasInstructions = wrappedAPI.prompt_config?.instructions && wrappedAPI.prompt_config.instructions.trim().length > 0;
      const hasModel = wrappedAPI.model && wrappedAPI.model.trim().length > 0;
      
      console.log('🔍 [TestChat] Field checks:', {
        hasRole,
        hasInstructions,
        hasModel,
        roleValue: wrappedAPI.prompt_config?.role || 'MISSING',
        instructionsValue: wrappedAPI.prompt_config?.instructions || 'MISSING',
        modelValue: wrappedAPI.model || 'MISSING'
      });
      
      // Consider configured if it has role, instructions, and model
      const configured = hasRole && hasInstructions && hasModel;
      console.log('🔍 [TestChat] Final configured status:', configured);
      
      if (!configured) {
        console.warn('❌ [TestChat] Wrap is NOT configured. Missing:', {
          missingRole: !hasRole,
          missingInstructions: !hasInstructions,
          missingModel: !hasModel
        });
      } else {
        console.log('✅ [TestChat] Wrap is configured! Test Chat unlocked.');
      }
      
      setIsConfigured(configured);
    }
  }, [wrappedAPI]);

  useEffect(() => {
    // Load test chat config from localStorage
    const loadConfig = () => {
      const savedConfig = localStorage.getItem(`testChatConfig_${wrappedApiId}`);
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setTestChatConfig(config);
        } catch (e) {
          console.error('Error loading test chat config:', e);
        }
      }
    };

    loadConfig();
    setInitializing(false);

    // Listen for config updates
    const handleConfigUpdate = (event) => {
      if (event.detail.wrappedApiId === wrappedApiId) {
        setTestChatConfig(event.detail.config);
      }
    };

    window.addEventListener('testChatConfigUpdated', handleConfigUpdate);
    return () => {
      window.removeEventListener('testChatConfigUpdated', handleConfigUpdate);
    };
  }, [wrappedApiId, endpointId]);

  useEffect(() => {
    if (testChatConfig.autoScroll) {
      scrollToBottom();
    }
  }, [messages, testChatConfig.autoScroll]);

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

  // Simulate streaming of assistant text into a message id
  const simulateStream = (id, fullText) => {
    const speedMs = 18; // typing speed per tick
    const chunkSize = 3; // characters per tick
    let index = 0;
    const interval = setInterval(() => {
      index = Math.min(index + chunkSize, fullText.length);
      const next = fullText.slice(0, index);
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, content: next } : m)));
      if (index >= fullText.length) {
        clearInterval(interval);
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, isStreaming: false } : m)));
      }
    }, speedMs);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading || !endpointId || !isConfigured) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Add user message immediately
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Add typing indicator
    const typingMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: null,
      timestamp: new Date().toISOString(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Build conversation history based on config
      let messagesToSend = [];
      
      if (testChatConfig.historyMode === 'all') {
        // Send all previous messages
        messagesToSend = messages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .filter(msg => !msg.isTyping && !msg.isStatus && !msg.isError)
          .map(msg => ({
            role: msg.role,
            content: msg.content || ''
          }));
      } else if (testChatConfig.historyMode === 'last_n') {
        // Send only last N messages
        const validMessages = messages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .filter(msg => !msg.isTyping && !msg.isStatus && !msg.isError)
          .map(msg => ({
            role: msg.role,
            content: msg.content || ''
          }));
        
        const n = testChatConfig.lastNCount || 5;
        messagesToSend = validMessages.slice(-n);
      }
      
      // Add current user message
      messagesToSend.push({
        role: 'user',
        content: userMessage
      });

      // Call the wrapped API endpoint with conversation history
      const response = await chatService.sendTestMessage(endpointId, messagesToSend);

      // Extract events dynamically from response (handle both simple and OpenAI formats)
      const events = Array.isArray(response.events) ? response.events : 
                     Array.isArray(response.wx_events) ? response.wx_events : [];
      const eventMsgs = [];
      
      for (const ev of events) {
        if (!testChatConfig.showThinking) {
          // Skip thinking events if disabled
          if (ev.type === 'thinking_started' || ev.type === 'thinking_content' || ev.type === 'thinking_completed') {
            continue;
          }
        }
        
        if (!testChatConfig.showWebSearch) {
          // Skip web search events if disabled
          if (ev.type === 'tool_call' && ev.name === 'web_search') {
            continue;
          }
          if (ev.type === 'tool_result' && ev.name === 'web_search') {
            continue;
          }
        }

        if (ev.type === 'thinking_started') {
          const focus = ev.focus ? `: ${ev.focus}` : '';
          eventMsgs.push({
            id: Date.now() + eventMsgs.length,
            role: 'assistant',
            content: `Thinking${focus}`,
            timestamp: new Date().toISOString(),
            isStatus: true,
            statusType: 'thinking'
          });
        }
        else if (ev.type === 'thinking_content') {
          const content = ev.content || '';
          if (content) {
            eventMsgs.push({
              id: Date.now() + eventMsgs.length,
              role: 'assistant',
              content: `Thinking: ${content}`,
              timestamp: new Date().toISOString(),
              isStatus: true,
              statusType: 'thinking'
            });
          }
        }
        else if (ev.type === 'tool_call') {
          const toolName = ev.name || 'tool';
          const args = ev.args || {};
          
          if (toolName === 'web_search') {
            const query = args.query || '';
            eventMsgs.push({
              id: Date.now() + eventMsgs.length,
              role: 'assistant',
              content: query ? `Searching the web: "${query}"` : 'Searching the web',
              timestamp: new Date().toISOString(),
              isStatus: true,
              statusType: 'web_search'
            });
          } else {
            eventMsgs.push({
              id: Date.now() + eventMsgs.length,
              role: 'assistant',
              content: `Running ${toolName}...`,
              timestamp: new Date().toISOString(),
              isStatus: true,
              statusType: 'tool'
            });
          }
        }
        else if (ev.type === 'tool_result') {
          const toolName = ev.name || 'tool';
          
          if (toolName === 'web_search') {
            const query = ev.query || '';
            const resultsCount = ev.results_count || 0;
            const statusText = query 
              ? `Web search complete: "${query}" (${resultsCount} results)`
              : `Web search complete (${resultsCount} results)`;
            eventMsgs.push({
              id: Date.now() + eventMsgs.length,
              role: 'assistant',
              content: statusText,
              timestamp: new Date().toISOString(),
              isStatus: true,
              statusType: 'web_search'
            });
          } else {
            eventMsgs.push({
              id: Date.now() + eventMsgs.length,
              role: 'assistant',
              content: `${toolName} complete`,
              timestamp: new Date().toISOString(),
              isStatus: true,
              statusType: 'tool'
            });
          }
        }
        else if (ev.type === 'thinking_completed') {
          eventMsgs.push({
            id: Date.now() + eventMsgs.length,
            role: 'assistant',
            content: 'Thinking complete',
            timestamp: new Date().toISOString(),
            isStatus: true,
            statusType: 'thinking'
          });
        }
      }

      // Extract final response content (handle both simple and OpenAI-compatible formats)
      const responseContent = response.choices?.[0]?.message?.content || 
                             response.response || 
                             response.message ||
                             'No response received';
      
      // Remove typing indicator and add events then start streaming assistant message
      const streamId = Date.now() + 1000;
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        const streamingAssistant = {
          id: streamId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        };
        return [...filtered, ...eventMsgs, streamingAssistant];
      });
      // Simulate streaming into the assistant message
      simulateStream(streamId, responseContent);
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove typing indicator and add error
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Error: ${err.message || 'Failed to process message'}`,
          timestamp: new Date().toISOString(),
          isError: true
        };
        return [...filtered, errorMessage];
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

  // Render each newline-separated line with spacing between lines
  const formatMessage = (text) => {
    const t = text || '';
    const lines = t.split('\n');
    return (
      <>
        {lines.map((line, i) => (
          <div key={i} className="line">{line || '\u00A0'}</div>
        ))}
      </>
    );
  };

  if (initializing) {
    return (
      <div className="test-chat-card">
        <div className="test-chat-loading-state">Loading test chat...</div>
      </div>
    );
  }

  // Show blocked state if not configured
  if (!isConfigured) {
    return (
      <div className="test-chat-card">
        <div className="test-chat-blocked-state">
          <div className="blocked-illustration">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" fill="rgba(99, 102, 241, 0.05)"/>
              <path d="M40 60L55 75L80 45" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="35" y="35" width="50" height="50" rx="8" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" strokeDasharray="4 4"/>
            </svg>
          </div>
          <h3 className="blocked-title">Configure Your Wrap First</h3>
          <p className="blocked-message">
            Complete the configuration in the left panel to start testing your wrapped AI.
          </p>
          <p className="blocked-hint">
            The AI needs a role, instructions, and model to be ready for testing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-chat-card">
      <div className="test-chat-messages-container">
        {messages.length === 0 && (
          <div className="test-chat-empty-state">
            <div className="empty-state-illustration">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="30" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" fill="rgba(99, 102, 241, 0.05)"/>
                <path d="M30 40L36 46L50 32" stroke="rgba(99, 102, 241, 0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Start testing your wrapped LLM by sending a message below.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="test-message-group">
            {msg.role === 'user' ? (
              <div className="test-message user-message">
                <div className="test-message-content">{formatMessage(msg.content)}</div>
              </div>
            ) : msg.isTyping ? (
              <div className="test-message assistant-message typing-indicator">
                <div className="test-message-content typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : (
              <div className={`test-message assistant-message ${msg.isError ? 'error' : ''} ${msg.isStatus ? 'status-message' : ''} ${msg.statusType ? `status-${msg.statusType}` : ''}`}>
                <div className="test-message-content">
                  {formatMessage(msg.content)}{msg.isStreaming && <span className="stream-caret" />}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="test-chat-input-wrapper">
        <div className="test-chat-input-container">
          <textarea
            ref={textareaRef}
            className="test-chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Test your wrapped LLM..."
            disabled={loading || !endpointId || !isConfigured}
            rows={1}
          />
          <button 
            className="test-send-button"
            onClick={handleSend}
            disabled={loading || !inputValue.trim() || !endpointId || !isConfigured}
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

export default TestChat;
