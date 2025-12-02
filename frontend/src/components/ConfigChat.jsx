import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import ToolCredentialButton from './ToolCredentialButton';
import ToolCredentialPopup from './ToolCredentialPopup';
import '../styles/ConfigChat.css';
import '../styles/ToolCredential.css';

function ConfigChat({ wrappedApiId, onConfigUpdate }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [liveStatuses, setLiveStatuses] = useState({ thinking: false, webSearch: false });
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Document mention state
  const [documents, setDocuments] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');

  const TOOL_STORAGE_PREFIX = 'wx_tool_state';
  const getStorageKey = (type, id = wrappedApiId) => `${TOOL_STORAGE_PREFIX}:${id}:${type}`;
  const persistTools = useCallback((type, tools, id = wrappedApiId) => {
    if (typeof window === 'undefined' || !id) return;
    const key = getStorageKey(type, id);
    try {
      if (!tools || tools.length === 0) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(tools));
      }
      window.dispatchEvent(new CustomEvent('wxToolsUpdated', {
        detail: { wrappedApiId: id, type }
      }));
    } catch (err) {
      console.warn('Failed to persist tool state', err);
    }
  }, [wrappedApiId]);

  // Tool credentials state
  const [pendingTools, setPendingTools] = useState([]); // Tools waiting for credentials
  const [connectedTools, setConnectedTools] = useState([]); // Tools with saved credentials
  const [selectedTool, setSelectedTool] = useState(null); // Tool being configured
  const [showCredentialPopup, setShowCredentialPopup] = useState(false);
  const [savingCredential, setSavingCredential] = useState(false);

  const normalizePendingTools = (tools) => {
    if (!Array.isArray(tools)) return [];
    const normalized = tools.map((tool, idx) => {
      const safeName = tool?.name || tool?.tool_name || tool?.toolName || `integration_${idx + 1}`;
      const displayName = tool?.display_name || tool?.displayName || safeName || 'Custom Integration';
      const rawFields = Array.isArray(tool?.fields)
        ? tool.fields
        : (Array.isArray(tool?.credential_fields) ? tool.credential_fields : (Array.isArray(tool?.credentialFields) ? tool.credentialFields : []));

      let normalizedFields = rawFields.map((field, fieldIdx) => ({
        name: field?.name || field?.key || `field_${fieldIdx + 1}`,
        label: field?.label || field?.name || field?.key || `Field ${fieldIdx + 1}`,
        type: field?.type || 'text',
        required: field?.required !== false,
        placeholder: field?.placeholder || '',
        helpText: field?.helpText || field?.description || '',
        instructions: field?.instructions || '',
        options: field?.options || [],
      }));

      // If OAuth is required, hide token fields that the model might have emitted
      const requiresOAuth = tool?.requires_oauth === true || tool?.requiresOAuth === true;
      if (requiresOAuth) {
        normalizedFields = normalizedFields.filter((f) => {
          const n = (f.name || '').toLowerCase();
          return !(n === 'refresh_token' || n === 'access_token' || n === 'token' || n === 'bearer_token');
        });
      }

      return {
        name: safeName,
        displayName,
        description: tool?.description || '',
        icon: tool?.icon || null,
        toolCode: tool?.tool_code || tool?.toolCode || null,
        fields: normalizedFields,
        requiresOAuth,
        oauthProvider: tool?.oauth_provider || tool?.oauthProvider || null,
        oauthScopes: Array.isArray(tool?.oauth_scopes)
          ? tool.oauth_scopes
          : (Array.isArray(tool?.oauthScopes) ? tool.oauthScopes : []),
        oauthInstructions: tool?.oauth_instructions || tool?.oauthInstructions || '',
      };
    });

    // Group tools by OAuth provider and aggregate scopes
    const providerScopes = normalized.reduce((acc, tool) => {
      if (tool.requiresOAuth && tool.oauthProvider) {
        const key = tool.oauthProvider.toLowerCase();
        if (!acc[key]) acc[key] = new Set();
        (tool.oauthScopes || []).forEach((scope) => {
          if (scope) acc[key].add(scope);
        });
      }
      return acc;
    }, {});

    // Add aggregated scopes to each tool
    const toolsWithScopes = normalized.map((tool) => {
      if (tool.requiresOAuth && tool.oauthProvider) {
        const key = tool.oauthProvider.toLowerCase();
        const aggregated = providerScopes[key] ? Array.from(providerScopes[key]) : [];
        return { ...tool, aggregatedScopes: aggregated };
      }
      return tool;
    });

    // Group tools by provider for button rendering
    const groupedByProvider = toolsWithScopes.reduce((acc, tool) => {
      if (tool.requiresOAuth && tool.oauthProvider) {
        const key = tool.oauthProvider.toLowerCase();
        if (!acc[key]) {
          acc[key] = {
            provider: tool.oauthProvider,
            displayName: tool.oauthProvider.charAt(0).toUpperCase() + tool.oauthProvider.slice(1),
            tools: [],
            aggregatedScopes: tool.aggregatedScopes || [],
            requiresOAuth: true,
            oauthProvider: tool.oauthProvider,
            oauthInstructions: tool.oauthInstructions || ''
          };
        }
        acc[key].tools.push(tool);
        // Merge aggregated scopes from all tools in group
        if (tool.aggregatedScopes && tool.aggregatedScopes.length > 0) {
          tool.aggregatedScopes.forEach(scope => {
            if (!acc[key].aggregatedScopes.includes(scope)) {
              acc[key].aggregatedScopes.push(scope);
            }
          });
        }
      } else {
        // Non-OAuth tools stay separate
        acc[tool.name] = {
          provider: null,
          displayName: tool.displayName || tool.name,
          tools: [tool],
          requiresOAuth: false
        };
      }
      return acc;
    }, {});

    // Return grouped structure for rendering
    return Object.values(groupedByProvider).map(group => {
      if (group.tools.length === 1 && !group.requiresOAuth) {
        // Single non-OAuth tool - return as-is
        return group.tools[0];
      }
      // OAuth provider group - return group object
      return {
        name: group.provider ? `${group.provider}_group` : group.tools[0].name,
        displayName: group.displayName,
        description: group.tools.map(t => t.displayName || t.name).join(', '),
        tools: group.tools,
        requiresOAuth: group.requiresOAuth,
        oauthProvider: group.oauthProvider,
        aggregatedScopes: group.aggregatedScopes || [],
        oauthInstructions: group.oauthInstructions,
        // Use first tool's fields (they should all be the same for OAuth)
        fields: group.tools[0]?.fields || [],
        toolCode: group.tools[0]?.toolCode || null
      };
    });
  };

  useEffect(() => {
    loadMessages();
    loadDocuments();
  }, [wrappedApiId]);

  const loadDocuments = async () => {
    try {
      const { documentService } = await import('../services/documentService');
      const docs = await documentService.getDocuments(wrappedApiId);
      setDocuments(docs || []);
    } catch (err) {
      console.warn('Failed to load documents in ConfigChat:', err);
      setDocuments([]);
    }
  };

  // Load tools from backend and localStorage on mount
  useEffect(() => {
    if (!wrappedApiId) {
      setPendingTools([]);
      setConnectedTools([]);
      return;
    }

    const loadTools = async () => {
      try {
        // Load pending tools from localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedPending = window.localStorage.getItem(getStorageKey('pending'));
            if (savedPending) {
              const parsed = JSON.parse(savedPending);
              if (Array.isArray(parsed)) {
                setPendingTools(parsed);
              }
            }
          } catch (err) {
            console.warn('Failed to load pending tools from localStorage', err);
          }
        }

        // Load connected tools from backend
        const { apiClient } = await import('../api/client');
        const integrations = await apiClient.get(`/api/wrapped-apis/${wrappedApiId}/integrations`);
        
        if (Array.isArray(integrations)) {
          const connected = integrations.map(integration => ({
            name: integration.name || integration.tool_name,
            displayName: integration.display_name || integration.name,
            description: integration.description || '',
            fields: integration.fields || integration.credential_fields || [],
            credentials: {}, // Not returned for security
            requiresOAuth: integration.requires_oauth || false,
            oauthProvider: integration.oauth_provider,
            oauthScopes: integration.oauth_scopes || [],
            oauthInstructions: integration.oauth_instructions || '',
            toolCode: integration.tool_code || null,
            isConnected: true
          }));
          setConnectedTools(connected);
        }
      } catch (err) {
        console.warn('Failed to load integrations from backend', err);
        // Continue with localStorage data if backend fails
      }
    };

    loadTools();
  }, [wrappedApiId]);

  useEffect(() => {
    persistTools('pending', pendingTools);
  }, [pendingTools, persistTools]);

  // Note: Scroll is handled manually when messages are added/updated
  // This useEffect was causing conflicts, so we handle scrolling explicitly in sendMessage and response completion

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 4 * 24; // 4 lines * 24px per line (approx)
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  const scrollToNewMessage = (messageId) => {
    // Scroll aggressively: new message at TOP, all old messages pushed out of view (like Cursor AI)
    const container = document.querySelector('.chat-messages-container');
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (container && messageElement) {
      // Calculate scroll position: message at very top (minimal padding)
      // This pushes ALL previous messages completely out of view above
      const scrollTop = messageElement.offsetTop - 10; // Just 10px padding from very top
      
      // Scroll immediately - use instant for immediate effect, then smooth for final position
      container.scrollTop = Math.max(0, scrollTop);
      
      // Optional: smooth scroll to final position for polish
      setTimeout(() => {
        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
      }, 10);
    }
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
    setLiveStatuses({ thinking: false, webSearch: false });

    // Add user message immediately
    const newMessage = {
      id: Date.now(),
      message: userMessage,
      response: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Scroll new message to top immediately - push all old messages out of view
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToNewMessage(newMessage.id);
      }, 50);
    });

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
      console.log('📤 [ConfigChat] ========== SENDING MESSAGE ==========');
      console.log('📤 [ConfigChat] Wrapped API ID:', wrappedApiId);
      console.log('📤 [ConfigChat] User message:', userMessage);
      const response = await chatService.sendConfigMessage(wrappedApiId, userMessage);
      console.log('📥 [ConfigChat] ========== RESPONSE RECEIVED FROM API ==========');
      const pendingToolsPayload =
        response?.parsed_updates?.pending_tools ??
        response?.parsed_updates?.pendingTools ??
        response?.pending_tools ??
        response?.pendingTools ??
        null;
      if (Array.isArray(pendingToolsPayload)) {
        const normalized = normalizePendingTools(pendingToolsPayload);
        setPendingTools(normalized);
        // Persist to localStorage immediately
        if (typeof window !== 'undefined') {
          try {
            const key = getStorageKey('pending');
            window.localStorage.setItem(key, JSON.stringify(normalized));
          } catch (err) {
            console.warn('Failed to save pending tools to localStorage', err);
          }
        }
      }
      
      // Remove typing indicator and stream assistant response into the paired message
      const full = response.response || '';
      // Events are in parsed_updates.events (backend sends them there)
      const events = Array.isArray(response.parsed_updates?.events) ? response.parsed_updates.events :
                     Array.isArray(response.parsed_updates?.wx_events) ? response.parsed_updates.wx_events :
                     Array.isArray(response.events) ? response.events :
                     Array.isArray(response.wx_events) ? response.wx_events : [];
      
      console.log('📨 [ConfigChat] ========== RESPONSE RECEIVED ==========');
      console.log('📨 [ConfigChat] Full response object:', JSON.stringify(response, null, 2));
      console.log('📨 [ConfigChat] response.parsed_updates:', response.parsed_updates);
      console.log('📨 [ConfigChat] response.parsed_updates?.events:', response.parsed_updates?.events);
      console.log('📨 [ConfigChat] response.parsed_updates?.wx_events:', response.parsed_updates?.wx_events);
      console.log('📨 [ConfigChat] response.events:', response.events);
      console.log('📨 [ConfigChat] response.wx_events:', response.wx_events);
      console.log('📨 [ConfigChat] Events array (final):', events);
      console.log('📨 [ConfigChat] Events count:', events.length);
      console.log('📨 [ConfigChat] Events type:', typeof events);
      console.log('📨 [ConfigChat] Is array?', Array.isArray(events));
      
      const statusMsgs = [];
      const state = { thinking: false, reasoning: false, webSearch: false };
      
      console.log('📨 [ConfigChat] Starting to process events...');
      console.log('📨 [ConfigChat] Events to process:', events.length);

      events.forEach((ev, index) => {
        console.log(`📨 [ConfigChat] Processing event ${index + 1}/${events.length}:`, ev);
        if (ev.type === 'thinking_started') {
          const focus = ev.focus ? ` ${ev.focus}` : '';
          state.thinking = true;
          console.log('🤔 [ConfigChat] THINKING STARTED', ev);
          statusMsgs.push({
            id: Date.now() + statusMsgs.length,
            response: `Thinking${focus}`,
            isStatus: true,
            statusType: 'thinking',
            autoHide: true,
            showCaret: true
          });
        } else if (ev.type === 'thinking_content') {
          const content = ev.content || '';
          if (content) {
            console.log('🤔 [ConfigChat] THINKING CONTENT', content.substring(0, 100));
            statusMsgs.push({
              id: Date.now() + statusMsgs.length,
              response: `Thinking: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
              isStatus: true,
              statusType: 'thinking',
              autoHide: true,
              showCaret: true
            });
          }
        } else if (ev.type === 'thinking_completed') {
          state.thinking = false;
          console.log('✅ [ConfigChat] THINKING COMPLETED');
        } else if (ev.type === 'reasoning_started') {
          const focus = ev.focus ? ` ${ev.focus}` : '';
          state.reasoning = true;
          console.log('🔍 [ConfigChat] REASONING STARTED', ev);
          statusMsgs.push({
            id: Date.now() + statusMsgs.length,
            response: `Reasoning${focus}`,
            isStatus: true,
            statusType: 'reasoning',
            autoHide: true,
            showCaret: true
          });
        } else if (ev.type === 'reasoning_content') {
          const content = ev.content || '';
          if (content) {
            console.log('🔍 [ConfigChat] REASONING CONTENT', content.substring(0, 100));
            statusMsgs.push({
              id: Date.now() + statusMsgs.length,
              response: `Reasoning: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
              isStatus: true,
              statusType: 'reasoning',
              autoHide: true,
              showCaret: true
            });
          }
        } else if (ev.type === 'reasoning_completed') {
          state.reasoning = false;
          console.log('✅ [ConfigChat] REASONING COMPLETED');
        } else if (ev.type === 'tool_call' && ev.name === 'web_search') {
          const query = ev.args?.query;
          state.webSearch = true;
          console.log('🔍 [ConfigChat] WEB SEARCH STARTED');
          console.log('  Query:', query);
          console.log('  Full event:', ev);
          statusMsgs.push({
            id: Date.now() + statusMsgs.length,
            response: query ? `Searching: ${query}` : 'Searching',
            isStatus: true,
            statusType: 'web_search',
            autoHide: true,
            showCaret: true
          });
        } else if (ev.type === 'tool_result' && ev.name === 'web_search') {
          const query = ev.query || '';
          const resultsCount = ev.results_count || 0;
          console.log('✅ [ConfigChat] WEB SEARCH COMPLETED');
          console.log('  Query:', query);
          console.log('  Results count:', resultsCount);
          console.log('  Full event:', ev);
          state.webSearch = false;
          statusMsgs.push({
            id: Date.now() + statusMsgs.length,
            response: query ? `Found ${resultsCount} results for "${query}"` : `Found ${resultsCount} results`,
            isStatus: true,
            statusType: 'web_search',
            autoHide: true
          });
        } else {
          console.log(`📨 [ConfigChat] Unknown event type: ${ev.type}`, ev);
        }
      });
      
      console.log('📨 [ConfigChat] ========== EVENT PROCESSING COMPLETE ==========');
      console.log('📨 [ConfigChat] Status messages created:', statusMsgs.length);
      console.log('📨 [ConfigChat] Status messages:', statusMsgs);
      console.log('📨 [ConfigChat] Final state:', state);

      setLiveStatuses(state);
      console.log('📨 [ConfigChat] Live statuses updated:', state);
      
      setMessages(prev => prev.filter(msg => msg.id !== typingMessage.id).map(msg => msg.id === newMessage.id ? { ...msg, response: null } : msg));
      console.log('📨 [ConfigChat] Typing indicator removed, new message prepared');
      
      if (statusMsgs.length) {
        console.log('📨 [ConfigChat] Adding status messages to chat...');
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === newMessage.id);
          if (idx === -1) {
            console.warn('📨 [ConfigChat] WARNING: Could not find new message in messages array!');
            return prev;
          }
          const before = prev.slice(0, idx + 1);
          const after = prev.slice(idx + 1);
          const updated = [...before, ...statusMsgs, ...after];
          console.log('📨 [ConfigChat] Messages updated with status messages. Total messages:', updated.length);
          return updated;
        });
      } else {
        console.log('📨 [ConfigChat] No status messages to add');
      }

      const speedMs = 18;
      const chunkSize = 3;
      let index = 0;
      const interval = setInterval(() => {
        index = Math.min(index + chunkSize, full.length);
        const next = full.slice(0, index);
        // Keep status messages visible during streaming
        setMessages(prev => prev.map(m => {
          if (m.id === newMessage.id) {
            return { ...m, response: next, isStreaming: index < full.length };
          }
          // Don't filter status messages during streaming - keep them visible
          return m;
        }));
        if (index >= full.length) {
          clearInterval(interval);
          // Only filter autoHide messages after streaming completes
          setMessages(prev => prev.filter(msg => !msg.autoHide));
          setLiveStatuses({ thinking: false, webSearch: false });
          // Scroll to new message after response completes - keep current conversation in view
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToNewMessage(newMessage.id);
            }, 200);
          });
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
        const filtered = prev.filter(msg => msg.id !== typingMessage.id && !msg.autoHide);
        return filtered.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, response: 'Error: ' + (err.message || 'Failed to process message'), isError: true }
            : msg
        );
      });
      setLiveStatuses({ thinking: false, webSearch: false });
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

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Check for @ mention trigger
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = newValue.substring(lastAtIndex + 1);
      // Show dropdown only if @ is followed by letter/number or space (and no space after @)
      if (!afterAt.includes('\n') && !afterAt.includes('@')) {
        setMentionQuery(afterAt);
        setShowMentionDropdown(true);

        // Filter documents based on query
        const filtered = documents.filter(doc =>
          doc.filename.toLowerCase().includes(afterAt.toLowerCase())
        );
        setFilteredDocs(filtered);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleMentionSelect = (docName) => {
    const lastAtIndex = inputValue.lastIndexOf('@');
    const beforeAt = inputValue.substring(0, lastAtIndex);
    const newValue = beforeAt + '@' + docName + ' ';
    setInputValue(newValue);
    setShowMentionDropdown(false);
    setMentionQuery('');
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
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

  const isProcessing = loading || liveStatuses.thinking || liveStatuses.webSearch;

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
          <div key={msg.id} className="message-group" data-message-id={msg.id}>
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
                <div className="message-content">
                  {msg.isStatus ? (
                    <>
                      <span>{msg.response}</span>
                      {(msg.isStreaming || msg.showCaret) && <span className="stream-caret" />}
                    </>
                  ) : (
                    <>
                      {formatMessage(msg.response)}
                      {msg.isStreaming && <span className="stream-caret" />}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        {/* Tool buttons - show above input when tools are pending or connected */}
        {(pendingTools.length > 0 || connectedTools.length > 0) && (
          <div className="tool-buttons-container">
            {pendingTools.map((toolOrGroup) => {
              // Handle grouped tools (OAuth provider groups)
              if (toolOrGroup.tools && Array.isArray(toolOrGroup.tools) && toolOrGroup.tools.length > 1) {
                // This is a provider group - show provider name
                return (
                  <ToolCredentialButton
                    key={toolOrGroup.name}
                    toolName={toolOrGroup.displayName}
                    isConnected={false}
                    icon={toolOrGroup.icon}
                    onClick={() => {
                      setSelectedTool(toolOrGroup);
                      setShowCredentialPopup(true);
                    }}
                  />
                );
              }
              // Single tool (OAuth or non-OAuth)
              return (
                <ToolCredentialButton
                  key={toolOrGroup.name}
                  toolName={toolOrGroup.displayName || toolOrGroup.name}
                  isConnected={false}
                  icon={toolOrGroup.icon}
                  onClick={() => {
                    setSelectedTool(toolOrGroup);
                    setShowCredentialPopup(true);
                  }}
                />
              );
            })}
            {connectedTools.map((toolOrGroup) => {
              // Handle grouped tools
              if (toolOrGroup.tools && Array.isArray(toolOrGroup.tools) && toolOrGroup.tools.length > 1) {
                return (
                  <ToolCredentialButton
                    key={toolOrGroup.name}
                    toolName={toolOrGroup.displayName}
                    isConnected={true}
                    icon={toolOrGroup.icon}
                    onClick={() => {
                      setSelectedTool(toolOrGroup);
                      setShowCredentialPopup(true);
                    }}
                  />
                );
              }
              return (
                <ToolCredentialButton
                  key={toolOrGroup.name}
                  toolName={toolOrGroup.displayName || toolOrGroup.name}
                  isConnected={true}
                  icon={toolOrGroup.icon}
                  onClick={() => {
                    setSelectedTool(toolOrGroup);
                    setShowCredentialPopup(true);
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="chat-input-container">
          {/* Document mention dropdown - appears above input */}
          {showMentionDropdown && filteredDocs.length > 0 && (
            <div className="mention-dropdown-above">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="mention-item"
                  onClick={() => handleMentionSelect(doc.filename)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{doc.filename}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Describe how you want your AI to behave... (Type @ to mention documents)"
            disabled={isProcessing}
            rows={1}
          />
          <button
            className={`send-button ${isProcessing ? 'playing' : ''}`}
            onClick={handleSend}
            disabled={isProcessing || !inputValue.trim()}
          >
            {isProcessing ? (
              <span className="send-button-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 10L17.5 10M17.5 10L11.6667 3.33334M17.5 10L11.6667 16.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Tool Credential Popup */}
      <ToolCredentialPopup
        isOpen={showCredentialPopup}
        onClose={() => {
          setShowCredentialPopup(false);
          setSelectedTool(null);
        }}
        wrappedApiId={wrappedApiId}
        toolCode={selectedTool?.toolCode || (selectedTool?.tools?.[0]?.toolCode)}
        requiresOAuth={selectedTool?.requiresOAuth || false}
        oauthProvider={selectedTool?.oauthProvider}
        oauthScopes={selectedTool?.oauthScopes || (selectedTool?.tools?.[0]?.oauthScopes)}
        aggregatedScopes={selectedTool?.aggregatedScopes || []}
        oauthInstructions={selectedTool?.oauthInstructions || (selectedTool?.tools?.[0]?.oauthInstructions)}
        onSave={async (credentials) => {
          if (!selectedTool) return;
          setSavingCredential(true);
          try {
            const { apiClient } = await import('../api/client');
            
            // Handle grouped tools (OAuth provider groups)
            const toolsToSave = selectedTool.tools && Array.isArray(selectedTool.tools) && selectedTool.tools.length > 1
              ? selectedTool.tools
              : [selectedTool];
            
            // Save credentials for all tools in the group
            for (const tool of toolsToSave) {
              await apiClient.post(`/api/wrapped-apis/${wrappedApiId}/integrations`, {
                tool_name: tool.name,
                display_name: tool.displayName || tool.name,
                description: tool.description || '',
                credential_fields: tool.fields || selectedTool.fields || [],
                credentials: credentials
              });
            }
            
            // Remove from pending (both state and localStorage)
            setPendingTools(prev => {
              const filtered = prev.filter(t => {
                // Handle grouped tools
                if (t.tools && Array.isArray(t.tools)) {
                  return t.name !== selectedTool.name;
                }
                return t.name !== selectedTool.name;
              });
              
              // Update localStorage
              if (typeof window !== 'undefined') {
                try {
                  const key = getStorageKey('pending');
                  if (filtered.length === 0) {
                    window.localStorage.removeItem(key);
                  } else {
                    window.localStorage.setItem(key, JSON.stringify(filtered));
                  }
                } catch (err) {
                  console.warn('Failed to update localStorage', err);
                }
              }
              
              return filtered;
            });
            
            // Reload connected tools from backend to get latest state
            try {
              const { apiClient: reloadClient } = await import('../api/client');
              const integrations = await reloadClient.get(`/api/wrapped-apis/${wrappedApiId}/integrations`);
              if (Array.isArray(integrations)) {
                const connected = integrations.map(integration => ({
                  name: integration.name || integration.tool_name,
                  displayName: integration.display_name || integration.name,
                  description: integration.description || '',
                  fields: integration.fields || integration.credential_fields || [],
                  credentials: {},
                  requiresOAuth: integration.requires_oauth || false,
                  oauthProvider: integration.oauth_provider,
                  oauthScopes: integration.oauth_scopes || [],
                  oauthInstructions: integration.oauth_instructions || '',
                  toolCode: integration.tool_code || null,
                  isConnected: true
                }));
                setConnectedTools(connected);
              }
            } catch (err) {
              console.warn('Failed to reload integrations', err);
            }
            
            setShowCredentialPopup(false);
            setSelectedTool(null);
            
            // Notify parent to refresh
            if (onConfigUpdate) {
              onConfigUpdate();
            }
            
            // Dispatch event for SettingsModal to update
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('wxToolsUpdated', {
                detail: { wrappedApiId, type: 'connected' }
              }));
            }
          } catch (err) {
            console.error('Error saving credentials:', err);
            alert('Failed to save credentials. Please try again.');
          } finally {
            setSavingCredential(false);
          }
        }}
        toolName={selectedTool?.displayName || selectedTool?.name || ''}
        fields={selectedTool?.fields || selectedTool?.tools?.[0]?.fields || []}
        initialValues={selectedTool?.credentials || {}}
        saving={savingCredential}
      />
    </div>
  );
}

export default ConfigChat;
