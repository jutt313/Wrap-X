import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/auth/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for email verification success
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setSuccess('Email verified successfully! Please sign in to continue.');
      const verifiedEmail = params.get('email');
      if (verifiedEmail) {
        setEmail(verifiedEmail);
      }
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Always redirect to dashboard after successful login
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container login-container">
      <div className="auth-background">
        <div className="light-effect light-left-bottom"></div>
        <div className="light-effect light-right-top"></div>
      </div>

      <div className="auth-content">
        <div className="mirror-card auth-card">
          <div className="auth-logo-container">
            <img src="/logo-full.png" alt="Wrap-X" className="auth-logo" />
          </div>
          <h1 className="auth-title">
            Welcome <span className="gradient-text">Back</span>
          </h1>
          <p className="auth-subtitle">Sign in to your Wrap-X account</p>

          {success && <div className="success-message">{success}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/forgot-password">Forgot Password?</Link>
            <p>
              Don't have an account? <Link to="/register" state={location.state}>Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

