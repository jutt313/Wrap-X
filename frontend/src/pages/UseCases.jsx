import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UseCases.css';

function UseCases() {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Use Cases - Wrap-X",
      "description": "Discover how Wrap-X powers customer support, coding assistants, research tools, content generation, and automation workflows.",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "name": "Customer Support Chatbot"
          },
          {
            "@type": "ListItem",
            "name": "Coding Assistant"
          },
          {
            "@type": "ListItem",
            "name": "Research Assistant"
          },
          {
            "@type": "ListItem",
            "name": "Content Generation"
          },
          {
            "@type": "ListItem",
            "name": "Data Analysis"
          },
          {
            "@type": "ListItem",
            "name": "Automation Tools"
          }
        ]
      }
    });
    document.head.appendChild(script);

    document.title = "Use Cases - Wrap-X | Real-World AI Applications";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'See how Wrap-X powers customer support chatbots, coding assistants, research tools, content generation, data analysis, and automation workflows.';
    document.head.appendChild(metaDescription);

    return () => {
      document.head.removeChild(script);
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const useCases = [
    {
      title: "Customer Support Chatbot",
      icon: "💬",
      description: "Build intelligent customer support bots that understand context, search knowledge bases, and provide accurate answers 24/7.",
      example: {
        question: "What's your return policy?",
        answer: "Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. Would you like me to help you start a return?"
      },
      benefits: [
        "24/7 availability",
        "Instant responses",
        "Knowledge base integration",
        "Multi-language support"
      ]
    },
    {
      title: "Coding Assistant",
      icon: "💻",
      description: "Create AI assistants that help developers write better code, debug issues, explain complex concepts, and suggest improvements.",
      example: {
        question: "How do I optimize this React component?",
        answer: "Here's an optimized version using React.memo and useMemo to prevent unnecessary re-renders..."
      },
      benefits: [
        "Code review and suggestions",
        "Bug detection",
        "Performance optimization",
        "Best practices guidance"
      ]
    },
    {
      title: "Research Assistant",
      icon: "🔍",
      description: "Develop research tools that can search the web, analyze information, summarize findings, and cite sources automatically.",
      example: {
        question: "What are the latest trends in AI?",
        answer: "Based on recent research, key trends include multimodal AI, agentic systems, and efficiency improvements..."
      },
      benefits: [
        "Web search integration",
        "Source citation",
        "Data summarization",
        "Multi-source analysis"
      ]
    },
    {
      title: "Content Generation",
      icon: "✍️",
      description: "Generate high-quality content for blogs, social media, marketing materials, and documentation with consistent tone and style.",
      example: {
        question: "Write a blog post about AI in healthcare",
        answer: "AI is revolutionizing healthcare through diagnostic tools, personalized treatment plans, and drug discovery..."
      },
      benefits: [
        "Consistent brand voice",
        "Multiple content formats",
        "SEO optimization",
        "Bulk generation"
      ]
    },
    {
      title: "Data Analysis",
      icon: "📊",
      description: "Transform raw data into insights with AI that understands your data structure and provides actionable recommendations.",
      example: {
        question: "Analyze this sales data and suggest improvements",
        answer: "Your Q4 sales show a 15% increase. Top performing products are X, Y, Z. Consider focusing marketing on these segments..."
      },
      benefits: [
        "Pattern recognition",
        "Predictive insights",
        "Visual data representation",
        "Automated reporting"
      ]
    },
    {
      title: "Automation Tools",
      icon: "⚙️",
      description: "Integrate with Zapier, Make.com, and custom apps to automate workflows, process data, and trigger actions based on AI decisions.",
      example: {
        question: "When a new lead comes in, analyze and route to the right team",
        answer: "Lead analyzed: High-value enterprise client. Routing to Enterprise Sales team. Priority: High."
      },
      benefits: [
        "Zapier integration",
        "Make.com support",
        "Custom webhooks",
        "Workflow automation"
      ]
    }
  ];

  return (
    <div className="use-cases-page">
      <div className="use-cases-hero">
        <div className="container">
          <h1>Real-World Use Cases</h1>
          <p className="hero-subtitle">
            See how developers and businesses use Wrap-X to build powerful AI applications across industries.
          </p>
        </div>
      </div>

      <div className="use-cases-grid container">
        {useCases.map((useCase, index) => (
          <div key={index} className="use-case-card">
            <div className="use-case-header">
              <div className="use-case-icon">{useCase.icon}</div>
              <h2>{useCase.title}</h2>
            </div>
            <p className="use-case-description">{useCase.description}</p>
            
            <div className="use-case-example">
              <div className="example-question">
                <strong>Example:</strong>
                <p>"{useCase.example.question}"</p>
              </div>
              <div className="example-answer">
                <p>"{useCase.example.answer}"</p>
              </div>
            </div>

            <div className="use-case-benefits">
              <h3>Key Benefits:</h3>
              <ul>
                {useCase.benefits.map((benefit, i) => (
                  <li key={i}>{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="use-cases-cta">
        <div className="container">
          <h2>Ready to Build Your Use Case?</h2>
          <p>Start building your custom AI solution in minutes. No credit card required.</p>
          <button className="btn-primary" onClick={() => navigate('/register')}>
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  );
}

export default UseCases;

