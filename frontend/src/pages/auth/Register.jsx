import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/auth/Register.css';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the return path from location state, default to Welcome page
  const from = location.state?.from?.pathname || location.state?.returnTo || '/';
  const returnTo = location.state?.returnTo || '/';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://wrap-x-198767072474.us-central1.run.app'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        setError('');
        alert('Verification email sent! Please check your inbox.');
      } else {
        setError(data.detail || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting registration:', { email: formData.email, hasPassword: !!formData.password });
      const response = await register(formData.email, formData.password, formData.name);
      // Show success message instead of redirecting
      setSuccess(true);
      setRegisteredEmail(formData.email);
      setError('');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container register-container">
      <div className="auth-background">
        <div className="light-effect light-top-left"></div>
        <div className="light-effect light-right-bottom"></div>
      </div>

      <div className="auth-content">
        <div className="mirror-card auth-card">
          <div className="auth-logo-container">
            <img 
              src="/logo-full.png" 
              alt="Wrap-X" 
              className="auth-logo"
              onLoad={() => console.log('✅ Register logo loaded:', '/logo-full.png')}
              onError={(e) => {
                console.error('❌ Register logo failed:', '/logo-full.png');
                console.error('Full URL:', e.target.src);
              }}
            />
          </div>
          <h1 className="auth-title">
            Create <span className="gradient-text">Account</span>
          </h1>
          <p className="auth-subtitle">Join Wrap-X and customize your AI APIs</p>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Account Created Successfully! ✅</h3>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>We've sent a confirmation email to <strong>{registeredEmail}</strong></p>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                Please check your inbox and click the verification link to activate your account.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Didn't receive the email?{' '}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(99, 102, 241, 0.9)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Name (Optional)</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          )}

          <div className="auth-links">
            {success ? (
              <p>
                <Link to="/login" state={location.state}>Go to Sign In</Link>
              </p>
            ) : (
              <p>
                Already have an account? <Link to="/login" state={location.state}>Sign In</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

