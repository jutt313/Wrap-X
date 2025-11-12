import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/Welcome.css';
import billingService from '../services/billingService';

function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await billingService.getPlans();
      setPlans(response.plans || []);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Failed to load pricing plans');
    }
  };

  const handleGetStarted = async (priceId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is logged in
      if (!isAuthenticated) {
        // Redirect to login with return path to Welcome page
        navigate('/login', { state: { from: '/', returnTo: '/' } });
        return;
      }

      // Create checkout session
      const response = await billingService.createCheckoutSession(priceId);
      
      if (response.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.url;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.response?.data?.detail || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-container">
      <div className="gradient-background">
        <div className="dark-top-layer"></div>
        <div className="light-bottom-layer"></div>
        <div className="curve-light"></div>
      </div>

      <div className="welcome-content">
        <div className="mirror-card main-card">
          <h1 className="welcome-title">
            Welcome to <span className="gradient-text">Wrap-X</span>
          </h1>
          <p className="welcome-subtitle">
            The Next-Generation AI API Wrapper Platform
          </p>
        </div>

        <div className="mirror-card info-card">
          <h2 className="card-title">What is Wrap-X?</h2>
          <div className="card-content">
            <p>
              <strong>Wrap-X</strong> is a powerful platform that lets you customize and enhance any LLM (Large Language Model) API with intelligent layers of prompts, rules, and tools.
            </p>
            <p>
              Simply add your LLM API keys (OpenAI, Claude, DeepSeek, etc.), describe how you want your AI to behave through our chat interface, and Wrap-X automatically generates system prompts, instructions, and rules to create your custom wrapped API.
            </p>
          </div>
        </div>

        <div className="cards-grid">
          <div className="mirror-card feature-card">
            <h3>Add Your LLM APIs</h3>
            <p>Connect any LLM provider - OpenAI, Anthropic, DeepSeek, and 100+ more</p>
          </div>

          <div className="mirror-card feature-card">
            <h3>Chat to Configure</h3>
            <p>Describe your AI's behavior naturally. We handle the system prompts automatically</p>
          </div>

          <div className="mirror-card feature-card">
            <h3>Custom Tools</h3>
            <p>Add web search, thinking capabilities, code execution, and more</p>
          </div>

          <div className="mirror-card feature-card">
            <h3>Wrapped API</h3>
            <p>Get your custom API endpoint that behaves exactly as you specified</p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pricing-section">
          <div className="pricing-header">
            <h2 className="pricing-title">Choose Your Plan</h2>
            <p className="pricing-subtitle">Start with a 3-day free trial. No credit card required.</p>
          </div>

          {error && (
            <div className="pricing-error">
              {error}
            </div>
          )}

          <div className="pricing-cards">
            {plans.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.id === 'professional' ? 'featured' : ''}`}>
                {plan.id === 'professional' && (
                  <div className="pricing-badge">Most Popular</div>
                )}
                <div className="pricing-card-header">
                  <h3 className="pricing-plan-name">{plan.name}</h3>
                  <div className="pricing-price">
                    <span className="pricing-amount">${plan.price}</span>
                    <span className="pricing-period">/month</span>
                  </div>
                </div>
                <div className="pricing-features">
                  <div className="pricing-feature">
                    <span className="pricing-feature-icon">✓</span>
                    <span>{plan.wraps} {plan.wraps === 1 ? 'Wrap' : 'Wraps'}</span>
                  </div>
                  <div className="pricing-feature">
                    <span className="pricing-feature-icon">✓</span>
                    <span>3-Day Free Trial</span>
                  </div>
                  <div className="pricing-feature">
                    <span className="pricing-feature-icon">✓</span>
                    <span>All Features Included</span>
                  </div>
                  <div className="pricing-feature">
                    <span className="pricing-feature-icon">✓</span>
                    <span>Cancel Anytime</span>
                  </div>
                </div>
                <button
                  className={`pricing-button ${plan.id === 'professional' ? 'pricing-button-featured' : ''}`}
                  onClick={() => handleGetStarted(plan.price_id)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mirror-card cta-card">
          <h2>Ready to Get Started?</h2>
          <p>Transform your LLM APIs with intelligent customization</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/login')}>Get Started</button>
            <button className="btn-secondary">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
