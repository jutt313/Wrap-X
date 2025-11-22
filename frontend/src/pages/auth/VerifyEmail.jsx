import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/auth/Login.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Call backend API to verify email
    const verifyEmail = async () => {
      try {
        const response = await apiClient.get(`/api/auth/verify-email?token=${token}`);
        
        // If successful, backend redirects, but we handle it here too
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 2000);
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to verify email. The link may be invalid or expired.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="login-container">
      <div className="auth-background">
        <div className="light-effect light-left-bottom"></div>
        <div className="light-effect light-right-top"></div>
      </div>
      <div className="auth-content">
        <div className="mirror-card auth-card">
          <div className="auth-logo-container">
            <img 
              src="/logo-full.png" 
              alt="Wrap-X" 
              className="auth-logo"
              onLoad={() => console.log('✅ VerifyEmail logo loaded:', '/logo-full.png')}
              onError={(e) => {
                console.error('❌ VerifyEmail logo failed:', '/logo-full.png');
                console.error('Full URL:', e.target.src);
              }}
            />
          </div>
          
          {status === 'verifying' && (
            <div className="verification-status">
              <div className="loading-spinner"></div>
              <p>{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="verification-status success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: '#10B981', marginBottom: '1rem' }}>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p style={{ color: '#10B981' }}>{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="verification-status error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ color: '#EF4444', marginBottom: '1rem' }}>
                <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p style={{ color: '#EF4444' }}>{message}</p>
              <button 
                className="btn-primary" 
                onClick={() => navigate('/login')}
                style={{ marginTop: '1rem' }}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

