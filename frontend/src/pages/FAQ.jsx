import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/FAQ.css';

function FAQ() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Wrap-X?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Wrap-X is a platform that lets you build custom AI APIs without writing code. Configure AI assistants through chat and deploy production-ready APIs in minutes."
          }
        },
        {
          "@type": "Question",
          "name": "How does Wrap-X work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You add your LLM provider API key, describe what you want your AI to do through our chat interface, and Wrap-X automatically generates the configuration and gives you a production-ready API endpoint."
          }
        },
        {
          "@type": "Question",
          "name": "Which LLM providers does Wrap-X support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Wrap-X supports 100+ LLM providers including OpenAI, Anthropic, Google, Groq, DeepSeek, Mistral, Cohere, and many more."
          }
        }
      ]
    });
    document.head.appendChild(script);

    document.title = "FAQ - Wrap-X | Frequently Asked Questions";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Frequently asked questions about Wrap-X: pricing, features, integrations, and how to get started.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const categories = ['all', 'getting-started', 'features', 'pricing', 'technical'];

  const faqs = [
    {
      category: 'getting-started',
      question: "What is Wrap-X?",
      answer: "Wrap-X is a platform that lets you build custom AI APIs without writing code. You configure AI assistants through a chat interface, and Wrap-X automatically generates the configuration and gives you a production-ready API endpoint."
    },
    {
      category: 'getting-started',
      question: "How do I get started?",
      answer: "Sign up for a free 3-day trial (no credit card required), create a project, add your LLM provider API key, and start configuring your first wrapped API through our chat interface."
    },
    {
      category: 'getting-started',
      question: "Do I need coding experience?",
      answer: "No coding experience required! Wrap-X uses a chat-based interface where you describe what you want, and our AI helps you configure everything. However, basic knowledge helps when integrating the API into your applications."
    },
    {
      category: 'features',
      question: "Which LLM providers does Wrap-X support?",
      answer: "Wrap-X supports 100+ LLM providers including OpenAI (GPT-4, GPT-3.5), Anthropic (Claude 3.5 Sonnet), Google (Gemini Pro), Groq, DeepSeek, Mistral, Cohere, and many more."
    },
    {
      category: 'features',
      question: "Can I use web search with my wrapped API?",
      answer: "Yes! Wrap-X supports web search integration. Enable it in your wrapped API settings, and your AI can search the web for real-time information and cite sources."
    },
    {
      category: 'features',
      question: "What response formats are supported?",
      answer: "You can configure your wrapped API to return responses in JSON, arrays, Python code, plain text, or custom formats. This makes it easy to integrate with any application."
    },
    {
      category: 'pricing',
      question: "Is there a free trial?",
      answer: "Yes! New users get a 3-day free trial with full access to all features. No credit card required. After the trial, you can choose a paid plan to continue."
    },
    {
      category: 'pricing',
      question: "Can I change plans later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges."
    },
    {
      category: 'pricing',
      question: "What happens if I exceed my API call limit?",
      answer: "If you exceed your monthly API call limit, you can either upgrade your plan or wait until the next billing cycle. We'll notify you when you're approaching your limit."
    },
    {
      category: 'technical',
      question: "How do I integrate Wrap-X into my application?",
      answer: "Wrap-X provides a simple REST API. Just make a POST request to your endpoint with your API key in the Authorization header. We support all major programming languages and platforms."
    },
    {
      category: 'technical',
      question: "Are API keys secure?",
      answer: "Yes, all API keys are encrypted at rest and transmitted over HTTPS. We follow industry best practices for security and compliance."
    },
    {
      category: 'technical',
      question: "Can I use Wrap-X with Zapier or Make.com?",
      answer: "Yes! Wrap-X integrates seamlessly with Zapier, Make.com, and other automation platforms. You can trigger AI actions in your workflows."
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="faq-page">
      <div className="faq-hero">
        <div className="container">
          <h1>Frequently Asked Questions</h1>
          <p className="hero-subtitle">
            Find answers to common questions about Wrap-X. Can't find what you're looking for? Contact our support team.
          </p>
        </div>
      </div>

      <div className="faq-container container">
        <div className="faq-filters">
          <input
            type="text"
            placeholder="Search questions..."
            className="faq-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="faq-categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="faq-list">
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <div key={index} className="faq-item">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No questions found. Try a different search term or category.</p>
            </div>
          )}
        </div>
      </div>

      <div className="faq-cta">
        <div className="container">
          <h2>Still have questions?</h2>
          <p>Contact our support team or check out our documentation</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Get Started
            </button>
            <button className="btn-secondary" onClick={() => navigate('/documentation')}>
              View Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;

