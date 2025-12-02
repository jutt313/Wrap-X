import React from 'react';
import '../styles/ToolCredential.css';

function OAuthSetupGuide({
  provider,
  setup,
  loading = false,
  error = null,
  onRetry,
  acknowledged = false,
  onAcknowledge,
}) {
  if (loading) {
    return (
      <div className="oauth-guide">
        <div className="oauth-guide-loading">Loading OAuth instructions…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oauth-guide oauth-guide-error">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="credential-btn-test" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!setup) {
    return null;
  }

  const steps = setup?.instructions?.steps || [];
  const redirectUrl = setup.redirect_url;
  const scopeList = setup.scopes || [];

  const handleCopy = async () => {
    if (!redirectUrl) return;
    try {
      await navigator.clipboard.writeText(redirectUrl);
    } catch (copyErr) {
      console.warn('Failed to copy redirect URL', copyErr);
    }
  };

  return (
    <div className="oauth-guide">
      <div className="oauth-guide-header">
        <div>
          <p className="oauth-guide-provider">OAuth setup for {provider?.toUpperCase()}</p>
          {setup.instructions?.display_name && (
            <span className="oauth-guide-console">
              Console: {setup.instructions.display_name}
            </span>
          )}
        </div>
        {setup.instructions?.console_url && (
          <a
            href={setup.instructions.console_url}
            target="_blank"
            rel="noreferrer"
            className="oauth-guide-link"
          >
            Open Console
          </a>
        )}
      </div>

      {steps.length > 0 && (
        <ol className="oauth-guide-steps">
          {steps.map((step, idx) => (
            <li key={`oauth-step-${idx}`}>{step}</li>
          ))}
        </ol>
      )}

      {redirectUrl && (
        <div className="oauth-guide-redirect">
          <div>
            <p className="oauth-redirect-label">Authorized redirect URL</p>
            <code className="oauth-redirect-value">{redirectUrl}</code>
          </div>
          <button type="button" className="oauth-copy-btn" onClick={handleCopy}>
            Copy
          </button>
        </div>
      )}

      {scopeList.length > 0 && (
        <div className="oauth-guide-scopes">
          <p>Scopes to enable</p>
          <div className="oauth-scope-chips">
            {scopeList.map((scope) => (
              <span key={scope} className="oauth-scope-chip">
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}

      <label className="oauth-guide-acknowledge">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge?.(e.target.checked)}
        />
        <span>I completed these console steps</span>
      </label>
    </div>
  );
}

export default OAuthSetupGuide;

