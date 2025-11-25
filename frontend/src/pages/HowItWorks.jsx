import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HowItWorks.css';

function HowItWorks() {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Build Custom AI APIs with Wrap-X",
      "description": "Learn how to build and deploy custom AI APIs in 5 simple steps using Wrap-X.",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Sign Up",
          "text": "Create your free account and start your 3-day trial"
        },
        {
          "@type": "HowToStep",
          "name": "Add LLM Provider",
          "text": "Connect your OpenAI, Anthropic, or other LLM provider API key"
        },
        {
          "@type": "HowToStep",
          "name": "Configure via Chat",
          "text": "Describe what you want your AI to do through our chat interface"
        },
        {
          "@type": "HowToStep",
          "name": "Test Your API",
          "text": "Test your configured AI in the built-in test chat"
        },
        {
          "@type": "HowToStep",
          "name": "Deploy & Use",
          "text": "Get your API endpoint and start using it in your applications"
        }
      ]
    });
    document.head.appendChild(script);

    document.title = "How It Works - Wrap-X | Build AI APIs in 5 Minutes";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Learn how Wrap-X works: Sign up, add LLM provider, configure via chat, test, and deploy. Build custom AI APIs in minutes without coding.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const steps = [
    {
      number: "1",
      title: "Sign Up & Create Project",
      description: "Create your free Wrap-X account and start a 3-day trial. No credit card required. Create a project to organize your wraps and LLM providers.",
      icon: "🚀"
    },
    {
      number: "2",
      title: "Add Your LLM Provider",
      description: "Connect your LLM provider API key (OpenAI, Anthropic, Google, etc.). Wrap-X supports 100+ providers. Your keys are encrypted and stored securely.",
      icon: "🔌"
    },
    {
      number: "3",
      title: "Configure via Chat",
      description: "Describe what you want your AI to do. Our AI assistant asks clarifying questions and automatically generates the perfect configuration for you.",
      icon: "💬"
    },
    {
      number: "4",
      title: "Test Your API",
      description: "Use the built-in test chat to interact with your configured AI. See how it responds, refine the configuration, and ensure it works perfectly.",
      icon: "🧪"
    },
    {
      number: "5",
      title: "Deploy & Use",
      description: "Get your production-ready API endpoint and API key. Start using it in your applications, integrate with Zapier/Make.com, or use webhooks.",
      icon: "⚡"
    }
  ];

  return (
    <div className="how-it-works-page">
      <div className="how-it-works-hero">
        <div className="container">
          <h1>How It Works</h1>
          <p className="hero-subtitle">
            Build and deploy custom AI APIs in 5 simple steps. No coding required.
          </p>
        </div>
      </div>

      <div className="steps-container container">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            <div className="step-number">{step.number}</div>
            <div className="step-content">
              <div className="step-icon">{step.icon}</div>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="how-it-works-cta">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of developers building AI applications with Wrap-X</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Start Free Trial
            </button>
            <button className="btn-secondary" onClick={() => navigate('/features')}>
              View Features
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;

