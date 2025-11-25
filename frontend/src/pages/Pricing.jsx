import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Pricing.css';

function Pricing() {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Wrap-X",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Trial",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Starter",
          "price": "29",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Professional",
          "price": "99",
          "priceCurrency": "USD"
        },
        {
          "@type": "Offer",
          "name": "Business",
          "price": "299",
          "priceCurrency": "USD"
        }
      ]
    });
    document.head.appendChild(script);

    document.title = "Pricing - Wrap-X | Simple, Transparent Pricing";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Wrap-X pricing: Start with a free 3-day trial. Choose from Starter ($29/mo), Professional ($99/mo), or Business ($299/mo) plans.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const plans = [
    {
      name: "Free Trial",
      price: "$0",
      period: "3 days",
      description: "Perfect for trying out Wrap-X",
      features: [
        "Full access to all features",
        "Up to 3 wrapped APIs",
        "1,000 API calls",
        "Community support",
        "No credit card required"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "For individuals and small projects",
      features: [
        "Unlimited wrapped APIs",
        "10,000 API calls/month",
        "All LLM providers",
        "Email support",
        "Basic analytics"
      ],
      cta: "Get Started",
      popular: true
    },
    {
      name: "Professional",
      price: "$99",
      period: "per month",
      description: "For growing teams and businesses",
      features: [
        "Everything in Starter",
        "100,000 API calls/month",
        "Priority support",
        "Advanced analytics",
        "Webhook integrations",
        "Custom response formats"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Business",
      price: "$299",
      period: "per month",
      description: "For enterprises and high-volume usage",
      features: [
        "Everything in Professional",
        "Unlimited API calls",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
        "Team management",
        "Advanced security"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <div className="container">
          <h1>Simple, Transparent Pricing</h1>
          <p className="hero-subtitle">
            Start with a free 3-day trial. No credit card required. Choose the plan that fits your needs.
          </p>
        </div>
      </div>

      <div className="pricing-grid container">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <h2>{plan.name}</h2>
            <div className="price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">/{plan.period}</span>
            </div>
            <p className="plan-description">{plan.description}</p>
            <ul className="features-list">
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <span className="check-icon">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <button 
              className={`pricing-btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => navigate('/register')}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <div className="container">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>Can I change plans later?</h3>
              <p>Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="faq-item">
              <h3>What happens after the free trial?</h3>
              <p>After 3 days, you'll need to choose a paid plan to continue using Wrap-X. No charges during the trial.</p>
            </div>
            <div className="faq-item">
              <h3>Do you offer refunds?</h3>
              <p>Yes, we offer a 30-day money-back guarantee on all paid plans if you're not satisfied.</p>
            </div>
            <div className="faq-item">
              <h3>What payment methods do you accept?</h3>
              <p>We accept all major credit cards, PayPal, and bank transfers for Business plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;

