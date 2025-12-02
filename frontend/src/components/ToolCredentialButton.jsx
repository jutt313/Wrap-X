import React from 'react';
import '../styles/ToolCredential.css';

/**
 * Small rounded button that appears above the chat input.
 * Shows tool name and connected status.
 * 
 * Props:
 * - toolName: string - Display name of the tool (e.g., "Gmail", "Shopify")
 * - isConnected: boolean - Whether credentials have been saved
 * - onClick: function - Called when button is clicked
 * - icon: string (optional) - Icon URL or null for default
 */
function ToolCredentialButton({ toolName, isConnected, onClick, icon }) {
  return (
    <button
      type="button"
      className={`tool-credential-button ${isConnected ? 'connected' : ''}`}
      onClick={onClick}
      title={isConnected ? `${toolName} - Connected` : `Configure ${toolName}`}
    >
      {icon ? (
        <img src={icon} alt={toolName} className="tool-button-icon" />
      ) : (
        <span className="tool-button-icon-default">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
      <span className="tool-button-name">{toolName}</span>
      {isConnected && (
        <span className="tool-button-checkmark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}

export default ToolCredentialButton;

