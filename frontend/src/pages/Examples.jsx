import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Examples.css';

function Examples() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Examples - Wrap-X | Real-World AI API Examples";
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'See real-world examples of Wrap-X APIs: customer support bots, coding assistants, research tools, and more with code samples.';
    document.head.appendChild(metaDescription);

    return () => {
      if (metaDescription.parentNode) {
        document.head.removeChild(metaDescription);
      }
    };
  }, []);

  const examples = [
    {
      title: "Customer Support Chatbot",
      description: "A helpful customer support assistant that answers questions, searches knowledge bases, and provides accurate information.",
      config: {
        role: "Customer Support Specialist",
        tone: "Helpful and professional",
        model: "gpt-4o"
      },
      apiCall: `curl -X POST https://api.wrap-x.com/api/wrap-x/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is your return policy?"
  }'`,
      response: `{
  "message": "Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. Would you like me to help you start a return?",
  "sources": ["knowledge-base-article-123"]
}`
    },
    {
      title: "Code Review Assistant",
      description: "An AI assistant that reviews code, suggests improvements, and explains complex concepts.",
      config: {
        role: "Senior Software Engineer",
        tone: "Technical and constructive",
        model: "claude-3-5-sonnet"
      },
      apiCall: `curl -X POST https://api.wrap-x.com/api/wrap-x/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Review this React component for performance issues"
  }'`,
      response: `{
  "message": "I've reviewed your component. Here are the optimizations:\n\n1. Use React.memo to prevent unnecessary re-renders\n2. Extract expensive calculations to useMemo\n3. Consider code splitting for large components",
  "suggestions": ["Use React.memo", "Add useMemo", "Code splitting"]
}`
    },
    {
      title: "Research Assistant",
      description: "An AI that searches the web, analyzes information, and provides well-cited research summaries.",
      config: {
        role: "Research Analyst",
        tone: "Academic and thorough",
        model: "gpt-4o",
        features: ["Web Search Enabled", "Thinking Mode"]
      },
      apiCall: `curl -X POST https://api.wrap-x.com/api/wrap-x/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What are the latest trends in AI for 2024?"
  }'`,
      response: `{
  "message": "Based on recent research, key AI trends for 2024 include:\n\n1. Multimodal AI systems\n2. Agentic AI architectures\n3. Efficiency improvements\n\nSources:\n- [Research Paper 1](url)\n- [Industry Report](url)",
  "sources": ["source1", "source2", "source3"]
}`
    }
  ];

  return (
    <div className="examples-page">
      <div className="examples-hero">
        <div className="container">
          <h1>Real-World Examples</h1>
          <p className="hero-subtitle">
            See how developers use Wrap-X to build powerful AI applications. Each example includes configuration, API calls, and responses.
          </p>
        </div>
      </div>

      <div className="examples-container container">
        {examples.map((example, index) => (
          <div key={index} className="example-card">
            <h2>{example.title}</h2>
            <p className="example-description">{example.description}</p>
            
            <div className="example-config">
              <h3>Configuration</h3>
              <div className="config-details">
                <div><strong>Role:</strong> {example.config.role}</div>
                <div><strong>Tone:</strong> {example.config.tone}</div>
                <div><strong>Model:</strong> {example.config.model}</div>
                {example.config.features && (
                  <div><strong>Features:</strong> {example.config.features.join(', ')}</div>
                )}
              </div>
            </div>

            <div className="example-api">
              <h3>API Call</h3>
              <pre className="code-block">{example.apiCall}</pre>
            </div>

            <div className="example-response">
              <h3>Response</h3>
              <pre className="code-block">{example.response}</pre>
            </div>
          </div>
        ))}
      </div>

      <div className="examples-cta">
        <div className="container">
          <h2>Ready to Build Your Own?</h2>
          <p>Start building your custom AI API in minutes</p>
          <button className="btn-primary" onClick={() => navigate('/register')}>
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  );
}

export default Examples;

