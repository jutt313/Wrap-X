import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Integrations.css';

function Integrations() {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Integrations - Wrap-X",
      "description": "Wrap-X integrates with 100+ platforms including Zapier, Make.com, Slack, Shopify, and custom applications."
    });
    document.head.appendChild(script);

    document.title = "Integrations - Wrap-X | Connect with Your Favorite Tools";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Wrap-X integrates with automation platforms, communication tools, e-commerce, CRM systems, and custom applications.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const integrations = {
    backend: {
      title: "Backend Applications",
      description: "Integrate Wrap-X APIs into your Node.js, Python, Go, or any backend application.",
      platforms: ["Node.js", "Python", "Go", "Ruby", "PHP", "Java", ".NET"]
    },
    automation: {
      title: "Automation Platforms",
      description: "Connect with Zapier, Make.com, and n8n to automate workflows and trigger AI actions.",
      platforms: ["Zapier", "Make.com", "n8n", "Microsoft Power Automate"]
    },
    communication: {
      title: "Communication Platforms",
      description: "Build chatbots and assistants for Slack, Discord, WhatsApp, and other messaging platforms.",
      platforms: ["Slack", "Discord", "WhatsApp", "Telegram", "Microsoft Teams"]
    },
    ecommerce: {
      title: "E-Commerce",
      description: "Enhance your Shopify, WooCommerce, or custom store with AI-powered features.",
      platforms: ["Shopify", "WooCommerce", "Magento", "BigCommerce"]
    },
    crm: {
      title: "CRM & Helpdesk",
      description: "Integrate with Salesforce, HubSpot, Zendesk, and other CRM systems for AI-powered support.",
      platforms: ["Salesforce", "HubSpot", "Zendesk", "Intercom", "Freshdesk"]
    },
    custom: {
      title: "Custom Applications",
      description: "Use our REST API to integrate Wrap-X into any custom application or website.",
      platforms: ["REST API", "Webhooks", "GraphQL", "gRPC"]
    }
  };

  return (
    <div className="integrations-page">
      <div className="integrations-hero">
        <div className="container">
          <h1>Integrations</h1>
          <p className="hero-subtitle">
            Connect Wrap-X with your favorite tools and platforms. Works with 100+ services out of the box.
          </p>
        </div>
      </div>

      <div className="integrations-grid container">
        {Object.entries(integrations).map(([key, integration]) => (
          <div key={key} className="integration-card">
            <h2>{integration.title}</h2>
            <p>{integration.description}</p>
            <div className="platforms-grid">
              {integration.platforms.map((platform, index) => (
                <div key={index} className="platform-badge">
                  {platform}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="integrations-code-example">
        <div className="container">
          <h2>Simple Integration Example</h2>
          <div className="code-block">
            <pre>
{`// Node.js Example
const response = await fetch('https://api.wrap-x.com/api/wrap-x/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, how can you help me?'
  })
});

const data = await response.json();
console.log(data.message);`}
            </pre>
          </div>
        </div>
      </div>

      <div className="integrations-cta">
        <div className="container">
          <h2>Ready to Integrate?</h2>
          <p>Start building with Wrap-X and connect to your favorite platforms</p>
          <button className="btn-primary" onClick={() => navigate('/register')}>
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  );
}

export default Integrations;

