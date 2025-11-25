import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Features.css';

function Features() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Wrap-X",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "150"
      },
      "featureList": [
        "100+ LLM Provider Support",
        "Chat-Based Configuration",
        "Instant API Deployment",
        "Custom Response Formats",
        "Web Search Integration",
        "Thinking Mode",
        "API Keys & Webhooks",
        "Usage Analytics"
      ]
    });
    document.head.appendChild(script);

    // Update meta tags
    document.title = "Features - Wrap-X | Build Custom AI APIs Without Code";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Discover Wrap-X features: 100+ LLM providers, chat-based configuration, instant deployment, custom response formats, web search, thinking mode, and more.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const features = [
    {
      icon: "🔌",
      title: "100+ LLM Providers",
      description: "Connect to OpenAI, Anthropic, Google, Groq, DeepSeek, and 100+ more LLM providers through a single unified API. Switch between providers instantly without changing your code.",
      details: [
        "OpenAI (GPT-4, GPT-3.5)",
        "Anthropic (Claude 3.5 Sonnet)",
        "Google (Gemini Pro)",
        "Groq (Ultra-fast inference)",
        "DeepSeek, Mistral, Cohere, and more"
      ]
    },
    {
      icon: "💬",
      title: "Chat-Based Configuration",
      description: "Configure your AI assistant through natural conversation. No coding required. Simply describe what you want, and our AI helps you build the perfect configuration.",
      details: [
        "Natural language interface",
        "AI-powered configuration assistant",
        "Real-time preview",
        "Instant validation"
      ]
    },
    {
      icon: "⚡",
      title: "Instant Deployment",
      description: "Deploy your custom AI API in minutes, not days. Get a production-ready endpoint with API keys, webhooks, and analytics immediately after configuration.",
      details: [
        "One-click deployment",
        "Production-ready endpoints",
        "Automatic SSL certificates",
        "Global CDN distribution"
      ]
    },
    {
      icon: "📝",
      title: "Custom Response Formats",
      description: "Configure exactly how your AI responds. Choose from JSON, arrays, Python code, plain text, or define your own custom format for seamless integration.",
      details: [
        "JSON responses",
        "Array formats",
        "Code generation",
        "Custom structures"
      ]
    },
    {
      icon: "🔍",
      title: "Web Search & Thinking",
      description: "Enable web search for real-time information and thinking mode for complex problem-solving. Give your AI the tools it needs to be truly helpful.",
      details: [
        "Real-time web search",
        "Thinking process visibility",
        "Source citations",
        "Enhanced reasoning"
      ]
    },
    {
      icon: "🔑",
      title: "API Keys & Webhooks",
      description: "Generate secure API keys for your wrapped APIs. Set up webhooks for real-time notifications and integrate with your existing infrastructure seamlessly.",
      details: [
        "Secure API key generation",
        "Webhook support",
        "Rate limiting",
        "Usage tracking"
      ]
    },
    {
      icon: "📊",
      title: "Usage Analytics",
      description: "Monitor your API usage with detailed analytics. Track requests, tokens, costs, and performance metrics in real-time through an intuitive dashboard.",
      details: [
        "Request tracking",
        "Token usage monitoring",
        "Cost analysis",
        "Performance metrics"
      ]
    },
    {
      icon: "🛡️",
      title: "Enterprise Security",
      description: "Built with security in mind. Encrypted API keys, secure authentication, rate limiting, and audit logs to keep your data safe and compliant.",
      details: [
        "Encrypted storage",
        "JWT authentication",
        "Rate limiting",
        "Audit logging"
      ]
    }
  ];

  return (
    <div className="features-page">
      <div className="features-hero">
        <div className="container">
          <h1>Powerful Features for Modern AI Development</h1>
          <p className="hero-subtitle">
            Everything you need to build, deploy, and manage custom AI APIs without writing a single line of code.
          </p>
        </div>
      </div>

      <div className="features-grid container">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h2>{feature.title}</h2>
            <p className="feature-description">{feature.description}</p>
            <ul className="feature-details">
              {feature.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="features-cta">
        <div className="container">
          <h2>Ready to Build Your Custom AI API?</h2>
          <p>Start building in minutes with our free trial. No credit card required.</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Get Started Free
            </button>
            <button className="btn-secondary" onClick={() => navigate('/how-it-works')}>
              See How It Works
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Features;

