import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Documentation.css';

// CodeBlock component with copy functionality
function CodeBlock({ children, language = '' }) {
  const [copied, setCopied] = useState(false);
  
  // Extract code content - handle template literals and strings
  const codeContent = React.Children.toArray(children)
    .map(child => {
      if (typeof child === 'string') return child;
      if (typeof child === 'number') return String(child);
      if (React.isValidElement(child) && child.props?.children) {
        return React.Children.toArray(child.props.children).join('');
      }
      return String(child || '');
    })
    .join('')
    .trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {language && <span className="language-label">{language}</span>}
        <button className={`copy-code-button ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre><code>{codeContent}</code></pre>
    </div>
  );
}

function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for hash in URL
    const hash = location.hash.replace('#', '');
    if (hash) {
      setActiveSection(hash);
      // Scroll to section after a brief delay
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location]);

  const sections = {
    'getting-started': {
      title: 'Getting Started',
      content: <GettingStarted />
    },
    'projects': {
      title: 'Projects',
      content: <Projects />
    },
    'llm-providers': {
      title: 'LLM Providers',
      content: <LLMProviders />
    },
    'wrapped-apis': {
      title: 'Wrapped APIs',
      content: <WrappedAPIs />
    },
    'prompt-configuration': {
      title: 'Prompt Configuration',
      content: <PromptConfiguration />
    },
    'examples': {
      title: 'Examples',
      content: <Examples />
    },
    'api-keys': {
      title: 'API Keys',
      content: <APIKeys />
    },
    'api-reference': {
      title: 'API Reference',
      content: <APIReference />
    },
    'guides': {
      title: 'Guides & Tutorials',
      content: <Guides />
    },
    'web-search': {
      title: 'Web Search',
      content: <WebSearch />
    },
    'thinking-mode': {
      title: 'Thinking Mode',
      content: <ThinkingMode />
    },
    'billing': {
      title: 'Billing & Usage',
      content: <Billing />
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      content: <Troubleshooting />
    }
  };

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    navigate(`/documentation#${sectionId}`, { replace: true });
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="documentation-container">
      <div className={`documentation-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Documentation</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <SidebarItem 
            title="Getting Started" 
            id="getting-started"
            active={activeSection === 'getting-started'}
            onClick={handleSectionClick}
          />
          <SidebarSection title="Core Concepts">
            <SidebarItem 
              title="Projects" 
              id="projects"
              active={activeSection === 'projects'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="LLM Providers" 
              id="llm-providers"
              active={activeSection === 'llm-providers'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="Wrapped APIs" 
              id="wrapped-apis"
              active={activeSection === 'wrapped-apis'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="Prompt Configuration" 
              id="prompt-configuration"
              active={activeSection === 'prompt-configuration'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="Examples" 
              id="examples"
              active={activeSection === 'examples'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="API Keys" 
              id="api-keys"
              active={activeSection === 'api-keys'}
              onClick={handleSectionClick}
            />
          </SidebarSection>
          <SidebarItem 
            title="API Reference" 
            id="api-reference"
            active={activeSection === 'api-reference'}
            onClick={handleSectionClick}
          />
          <SidebarItem 
            title="Guides & Tutorials" 
            id="guides"
            active={activeSection === 'guides'}
            onClick={handleSectionClick}
          />
          <SidebarSection title="Advanced Features">
            <SidebarItem 
              title="Web Search" 
              id="web-search"
              active={activeSection === 'web-search'}
              onClick={handleSectionClick}
            />
            <SidebarItem 
              title="Thinking Mode" 
              id="thinking-mode"
              active={activeSection === 'thinking-mode'}
              onClick={handleSectionClick}
            />
          </SidebarSection>
          <SidebarItem 
            title="Billing & Usage" 
            id="billing"
            active={activeSection === 'billing'}
            onClick={handleSectionClick}
          />
          <SidebarItem 
            title="Troubleshooting" 
            id="troubleshooting"
            active={activeSection === 'troubleshooting'}
            onClick={handleSectionClick}
          />
        </nav>
      </div>
      <div className="documentation-content">
        <div className="content-wrapper">
          {sections[activeSection]?.content || <GettingStarted />}
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div className="sidebar-section">
      <div className="sidebar-section-title">{title}</div>
      {children}
    </div>
  );
}

function SidebarItem({ title, id, active, onClick }) {
  return (
    <button
      className={`sidebar-item ${active ? 'active' : ''}`}
      onClick={() => onClick(id)}
    >
      {title}
    </button>
  );
}

// Content Components
function GettingStarted() {
  return (
    <div id="getting-started" className="doc-section">
      <h1>Getting Started</h1>
      <p className="lead">
        Wrap-X is an AI API wrapper platform that lets you customize any LLM provider with custom prompts, rules, and tools through a simple chat interface.
      </p>

      <h2>What is Wrap-X?</h2>
      <p>
        Wrap-X wraps any LLM API with custom prompts, rules, and tools to create your own AI assistant. 
        Simply add your LLM API keys (OpenAI, Claude, DeepSeek, etc.), describe how you want your AI to behave 
        through our chat interface, and Wrap-X automatically generates system prompts, instructions, and rules 
        to create your custom wrapped API.
      </p>

      <h2>Sign Up & Free Trial</h2>
      <p>
        New users automatically receive a <strong>3-day free trial</strong> upon registration. 
        The trial gives you full access to all features, allowing you to create projects, add LLM providers, 
        and build wrapped APIs without any payment required.
      </p>

      <h2>Create Your First Project</h2>
      <ol>
        <li>After signing up, go to your <strong>Profile</strong> (click your avatar in the top right)</li>
        <li>Navigate to the <strong>Projects</strong> tab</li>
        <li>Click <strong>Create Project</strong> button</li>
        <li>Enter a project name (e.g., "My First Project")</li>
        <li>Click <strong>Create project</strong></li>
      </ol>
      <p>
        Projects help you organize your wraps, LLM providers, and API keys. You can create multiple projects 
        to separate different use cases or environments.
      </p>

      <h2>Add an LLM Provider</h2>
      <ol>
        <li>Go to <strong>Profile → LLM Settings</strong> tab</li>
        <li>Click <strong>Add LLM Provider</strong></li>
        <li>Select a project from the dropdown</li>
        <li>Enter a name for your provider (e.g., "OpenAI Main")</li>
        <li>Choose your provider type (OpenAI, Anthropic, DeepSeek, Custom, etc.)</li>
        <li>Enter your API key</li>
        <li>If using Custom, enter the base URL</li>
        <li>Click <strong>Save</strong></li>
      </ol>
      <p>
        Wrap-X supports 100+ LLM providers through LiteLLM, including OpenAI, Anthropic Claude, DeepSeek, 
        and many others. Your API keys are encrypted and stored securely.
      </p>

      <h2>Create Your First Wrapped API</h2>
      <ol>
        <li>Go to your <strong>Dashboard</strong></li>
        <li>Click <strong>Create Wrap</strong> button</li>
        <li>Select a project</li>
        <li>Select an LLM provider</li>
        <li>Enter a name for your wrapped API (e.g., "Customer Support Bot")</li>
        <li>Click <strong>Create</strong></li>
        <li>Use the chat interface to configure your AI's behavior</li>
      </ol>
      <p>
        The chat interface will guide you through configuring your AI assistant. Simply describe what you want 
        your AI to do, and Wrap-X will help you set up the role, instructions, rules, tone, and examples.
      </p>

      <h2>Quick Example</h2>
      <p>Here's a simple example of creating a customer support bot:</p>
      <ol>
        <li>Create a project called "Support Bot"</li>
        <li>Add your OpenAI API key as a provider</li>
        <li>Create a wrapped API called "Customer Support"</li>
        <li>In the chat, say: <em>"I want to create a friendly customer support bot that helps users with account issues, 
        billing questions, and product features. It should be professional but warm."</em></li>
        <li>Follow the chat prompts to complete the configuration</li>
        <li>Generate an API key for your wrapped API</li>
        <li>Start using your custom AI assistant via the API endpoint!</li>
      </ol>

      <div className="next-steps">
        <h3>Next Steps</h3>
        <p>Now that you've created your first wrapped API, explore:</p>
        <ul>
          <li><a href="#projects">Projects</a> - Learn how to organize your resources</li>
          <li><a href="#prompt-configuration">Prompt Configuration</a> - Deep dive into configuring your AI</li>
          <li><a href="#api-reference">API Reference</a> - Learn how to use your wrapped API</li>
        </ul>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div id="projects" className="doc-section">
      <h1>Projects</h1>
      <p>
        Projects are shared environments where you can organize your wraps, LLM providers, and API keys. 
        You can group related resources together and manage access to them efficiently.
      </p>

      <h2>What are Projects?</h2>
      <p>
        Projects help you organize and separate different use cases, environments, or teams. For example, 
        you might have separate projects for:
      </p>
      <ul>
        <li>Production and development environments</li>
        <li>Different products or services</li>
        <li>Different teams or departments</li>
        <li>Personal and work use cases</li>
      </ul>

      <h2>Creating a Project</h2>
      <ol>
        <li>Go to <strong>Profile → Projects</strong> tab</li>
        <li>Click <strong>Create Project</strong> button</li>
        <li>Enter a descriptive name (e.g., "Production API", "Dev Environment")</li>
        <li>Click <strong>Create project</strong></li>
      </ol>

      <h2>Managing Projects</h2>
      <p>Each project has:</p>
      <ul>
        <li><strong>Name</strong> - Human-friendly label shown in interfaces</li>
        <li><strong>Public ID</strong> - Unique identifier for API references</li>
        <li><strong>Created Date</strong> - When the project was created</li>
      </ul>
      <p>You can delete projects, but make sure to move or delete any resources (wraps, providers) first.</p>

      <h2>Best Practices</h2>
      <ul>
        <li>Use descriptive names that indicate the project's purpose</li>
        <li>Keep production and development resources in separate projects</li>
        <li>Organize by team or product for better collaboration</li>
      </ul>
    </div>
  );
}

function LLMProviders() {
  return (
    <div id="llm-providers" className="doc-section">
      <h1>LLM Providers</h1>
      <p>
        LLM Providers are where you add your API keys for different language model services. 
        Wrap-X supports 100+ providers through LiteLLM integration.
      </p>

      <h2>Supported Providers</h2>
      <p>Wrap-X supports all providers available through LiteLLM, including:</p>
      <ul>
        <li><strong>OpenAI</strong> - GPT-4, GPT-3.5, GPT-4o, GPT-4o-mini</li>
        <li><strong>Anthropic</strong> - Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus</li>
        <li><strong>DeepSeek</strong> - DeepSeek Chat, DeepSeek Coder</li>
        <li><strong>Google</strong> - Gemini Pro, Gemini Ultra</li>
        <li><strong>Custom</strong> - Any OpenAI-compatible API endpoint</li>
        <li>And 95+ more providers</li>
      </ul>

      <h2>Adding a Provider</h2>
      <ol>
        <li>Go to <strong>Profile → LLM Settings</strong> tab</li>
        <li>Click <strong>Add LLM Provider</strong></li>
        <li>Select the project where this provider will be used</li>
        <li>Enter a name (e.g., "OpenAI Production", "Claude Dev")</li>
        <li>Select the provider type from the dropdown</li>
        <li>Enter your API key (keys are encrypted and stored securely)</li>
        <li>For Custom providers, enter the base URL</li>
        <li>Click <strong>Save</strong></li>
      </ol>

      <h2>API Key Security</h2>
      <p>
        All API keys are encrypted using Fernet encryption before being stored in the database. 
        Only you can access your keys, and they are never exposed in API responses or logs.
      </p>

      <h2>Custom Providers</h2>
      <p>
        If you're using a custom or self-hosted LLM endpoint that's compatible with OpenAI's API format, 
        you can add it as a Custom provider:
      </p>
      <ol>
        <li>Select <strong>Custom</strong> as the provider type</li>
        <li>Enter your base URL (e.g., <code>https://api.wrap-x.com/v1</code>)</li>
        <li>Enter your API key if required</li>
      </ol>

      <h2>Managing Providers</h2>
      <p>You can:</p>
      <ul>
        <li>View all providers in the LLM Settings tab</li>
        <li>See which project each provider belongs to</li>
        <li>Delete providers (make sure no wraps are using them first)</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>Use descriptive names that indicate the provider and environment</li>
        <li>Keep production and development API keys in separate providers</li>
        <li>Regularly rotate API keys for security</li>
        <li>Monitor usage to avoid unexpected costs</li>
      </ul>
    </div>
  );
}

function WrappedAPIs() {
  return (
    <div id="wrapped-apis" className="doc-section">
      <h1>Wrapped APIs</h1>
      <p>
        Wrapped APIs are your custom AI assistants. Each wrapped API has its own configuration, 
        endpoint, and API keys. You can create multiple wrapped APIs for different use cases.
      </p>

      <h2>What are Wrapped APIs?</h2>
      <p>
        A wrapped API is a customized version of an LLM that behaves exactly how you want it to. 
        You configure it with:
      </p>
      <ul>
        <li>A specific role and purpose</li>
        <li>Custom instructions and rules</li>
        <li>A communication tone</li>
        <li>Example interactions</li>
        <li>Advanced features like web search or thinking mode</li>
      </ul>

      <h2>Creating a Wrapped API</h2>
      <ol>
        <li>Go to your <strong>Dashboard</strong></li>
        <li>Click <strong>Create Wrap</strong> button</li>
        <li>Select a project</li>
        <li>Select an LLM provider</li>
        <li>Enter a name for your wrapped API</li>
        <li>Click <strong>Create</strong></li>
      </ol>
      <p>
        After creating, you'll be taken to the configuration chat where you can describe what you want 
        your AI to do.
      </p>

      <h2>Configuring Your Wrapped API</h2>
      <p>Use the chat interface to configure your wrapped API:</p>
      <ol>
        <li>Describe what you want your AI to do (e.g., "I want a coding assistant")</li>
        <li>The chat will ask clarifying questions about role, tone, model, etc.</li>
        <li>Answer the questions naturally</li>
        <li>Review the configuration summary</li>
        <li>Confirm when ready to create</li>
      </ol>
      <p>
        The chat interface uses AI to understand your requirements and automatically generates the 
        appropriate configuration.
      </p>

      <h2>Wrapped API Settings</h2>
      <p>Each wrapped API has these configurable settings:</p>
      <ul>
        <li><strong>Model</strong> - Which LLM model to use (e.g., gpt-4o, claude-3-5-sonnet)</li>
        <li><strong>Temperature</strong> - Creativity level (0.0-2.0, default 0.3)</li>
        <li><strong>Max Tokens</strong> - Maximum response length (default 1024)</li>
        <li><strong>Thinking Mode</strong> - Whether to use thinking/planning (always/conditional/off)</li>
        <li><strong>Web Search</strong> - Whether to enable web search (always/conditional/off)</li>
      </ul>

      <h2>Using Your Wrapped API</h2>
      <p>Once configured, you can:</p>
      <ol>
        <li>Generate API keys for your wrapped API</li>
        <li>Use the endpoint: <code>POST /api/wrap-x/chat</code></li>
        <li>Send requests with your API key in the Authorization header</li>
        <li>Receive responses from your custom AI assistant</li>
      </ol>
      <p>See the <a href="#api-reference">API Reference</a> for detailed endpoint documentation.</p>

      <h2>Managing Wrapped APIs</h2>
      <p>You can:</p>
      <ul>
        <li>View all wrapped APIs on your Dashboard</li>
        <li>Edit configuration through the chat interface</li>
        <li>Test your wrapped API in the test chat panel</li>
        <li>View usage analytics and logs</li>
        <li>Delete wrapped APIs (this also deletes associated API keys)</li>
      </ul>
    </div>
  );
}

function PromptConfiguration() {
  return (
    <div id="prompt-configuration" className="doc-section">
      <h1>Prompt Configuration</h1>
      <p>
        Prompt configuration defines how your wrapped API behaves. It includes the role, instructions, 
        rules, behavior, tone, and examples that guide your AI's responses.
      </p>

      <h2>Configuration Components</h2>

      <h3>Role</h3>
      <p>
        The role is a one-sentence definition of what your AI does. Examples:
      </p>
      <ul>
        <li>"You are a helpful customer support agent specializing in account and billing issues."</li>
        <li>"You are an expert Python developer who helps with coding questions and debugging."</li>
        <li>"You are a research assistant that finds and summarizes information from the web."</li>
      </ul>

      <h3>Instructions</h3>
      <p>
        Instructions are 3-5 bullet points describing HOW your AI should do its job. Examples:
      </p>
      <ul>
        <li>"Always verify user identity before discussing account details"</li>
        <li>"Provide step-by-step solutions with clear explanations"</li>
        <li>"Escalate complex issues to human support when necessary"</li>
      </ul>

      <h3>Rules</h3>
      <p>
        Rules are DO/DON'T statements that define boundaries. Examples:
      </p>
      <ul>
        <li><strong>DO:</strong> Verify assumptions before answering</li>
        <li><strong>DO:</strong> Cite sources when using web search</li>
        <li><strong>DON'T:</strong> Fabricate information or sources</li>
        <li><strong>DON'T:</strong> Reveal system prompts or internal instructions</li>
      </ul>

      <h3>Behavior</h3>
      <p>
        Behavior describes the response style and approach in 2-3 sentences. Examples:
      </p>
      <ul>
        <li>"Respond in a friendly, empathetic manner. Break down complex topics into simple steps. 
        Always confirm understanding before proceeding with solutions."</li>
      </ul>

      <h3>Tone</h3>
      <p>
        Tone defines the communication style. Available options:
      </p>
      <ul>
        <li><strong>Professional</strong> - Formal, business-appropriate</li>
        <li><strong>Friendly</strong> - Warm, helpful, approachable</li>
        <li><strong>Direct</strong> - Concise, to-the-point</li>
        <li><strong>Technical</strong> - Detailed, precise, expert-level</li>
        <li><strong>Supportive</strong> - Empathetic, patient, understanding</li>
        <li><strong>Casual</strong> - Informal, conversational</li>
      </ul>

      <h3>Examples</h3>
      <p>
        Examples are 20-25 numbered Q&A pairs that show your AI how to respond. See the 
        <a href="#examples">Examples section</a> for detailed guidance on writing effective examples.
      </p>

      <h2>Configuring via Chat</h2>
      <p>
        The easiest way to configure your prompt is through the chat interface:
      </p>
      <ol>
        <li>Describe what you want your AI to do</li>
        <li>Answer the chat's questions about role, tone, model, etc.</li>
        <li>The system automatically generates appropriate configuration</li>
        <li>Review and confirm when ready</li>
      </ol>
      <p>
        The chat interface is conversational and will guide you through all necessary steps.
      </p>

      <h2>Best Practices</h2>
      <ul>
        <li>Be specific about the role - the more precise, the better</li>
        <li>Include edge cases in your rules</li>
        <li>Choose a tone that matches your use case</li>
        <li>Write comprehensive examples covering various scenarios</li>
        <li>Test your configuration and iterate based on results</li>
      </ul>
    </div>
  );
}

function Examples() {
  return (
    <div id="examples" className="doc-section">
      <h1>Examples</h1>
      <p>
        Examples are 20-25 numbered Q&A pairs that teach your AI how to respond to different questions. 
        They are crucial for training your wrapped API to behave correctly.
      </p>

      <h2>Why Examples Matter</h2>
      <p>
        Examples show your AI:
      </p>
      <ul>
        <li>What types of questions to expect</li>
        <li>How to structure responses</li>
        <li>What tone and style to use</li>
        <li>How to handle edge cases</li>
      </ul>
      <p>
        The more comprehensive your examples, the better your AI will perform.
      </p>

      <h2>Format</h2>
      <p>
        Examples should be numbered 1-25 and follow this format:
      </p>
      <CodeBlock>{`1. Q: "How do I reset my password?" A: [steps to reset]
2. Q: "My order hasn't arrived" A: [check status + escalate]
3. Q: "Is feature X available?" A: [confirm + guide]
... (20-25 total)`}</CodeBlock>

      <h2>What to Include</h2>
      <p>Your 20-25 examples should cover:</p>
      <ul>
        <li><strong>Common questions (1-10)</strong> - The most frequent queries your AI will receive</li>
        <li><strong>Workflows (11-15)</strong> - Multi-step processes and common tasks</li>
        <li><strong>Edge cases (16-20)</strong> - Unusual scenarios, errors, ambiguous requests</li>
        <li><strong>Complex scenarios (21-25)</strong> - Advanced use cases, troubleshooting, multi-turn conversations</li>
      </ul>

      <h2>Example Templates by Domain</h2>

      <h3>Customer Support Bot</h3>
      <CodeBlock>{`1. Q: "How do I reset my password?" A: [steps]
2. Q: "My order hasn't arrived" A: [check status + escalate]
3. Q: "Is feature X available?" A: [confirm + guide]
4. Q: "I want to cancel my subscription" A: [process cancellation]
5. Q: "How do I update my billing information?" A: [guide through steps]
6. Q: "I'm getting an error when trying to log in" A: [troubleshoot]
7. Q: "What's your refund policy?" A: [explain policy]
8. Q: "Can I upgrade my plan?" A: [explain upgrade process]
9. Q: "I forgot my username" A: [help recover username]
10. Q: "How do I contact support?" A: [provide contact options]
11-15: Account issues, billing, refunds, upgrades, product usage
16-20: Edge cases (angry customer, unclear request, edge scenarios)
21-25: Multi-turn conversations, complex troubleshooting`}</CodeBlock>

      <h3>Coding Assistant</h3>
      <CodeBlock>{`1. Q: "How do I reverse a string in Python?" A: [method + code]
2. Q: "Debug this error: [error msg]" A: [diagnosis + fix]
3. Q: "Explain async/await" A: [concept + example]
4. Q: "How do I make an API call in JavaScript?" A: [code example]
5. Q: "What's the difference between let and const?" A: [explanation]
6-10: API usage, optimization, testing, refactoring scenarios
11-15: Edge cases (empty input, large data, concurrency)
16-20: Multi-step workflows (setup, build, deploy)
21-25: Troubleshooting (performance, security, debugging)`}</CodeBlock>

      <h3>Research Assistant</h3>
      <CodeBlock>{`1. Q: "Summarize recent AI breakthroughs" A: [search → summarize]
2. Q: "Compare X vs Y" A: [table with pros/cons]
3. Q: "What's the consensus on Z?" A: [synthesize sources]
4-10: Data gathering, analysis, synthesis
11-15: Citation formatting, source evaluation
16-20: Complex research questions, multi-step investigations
21-25: Handling ambiguity, conflicting sources`}</CodeBlock>

      <h2>Best Practices</h2>
      <ul>
        <li><strong>Be specific</strong> - Include actual questions and detailed answers</li>
        <li><strong>Cover variety</strong> - Include different question types and complexity levels</li>
        <li><strong>Show format</strong> - Demonstrate the response style you want</li>
        <li><strong>Include edge cases</strong> - Don't just cover happy paths</li>
        <li><strong>Keep it relevant</strong> - Examples should match your AI's domain</li>
        <li><strong>Number them</strong> - Always number examples 1-25</li>
        <li><strong>Keep concise</strong> - Each example should be 1-3 lines</li>
      </ul>

      <h2>Tips</h2>
      <ul>
        <li>Start with the most common questions your users will ask</li>
        <li>Include examples of how to handle errors or unclear requests</li>
        <li>Show multi-step processes if relevant</li>
        <li>Demonstrate the tone and style you want</li>
        <li>Test your examples by using similar questions in your wrapped API</li>
      </ul>
    </div>
  );
}

function APIKeys() {
  return (
    <div id="api-keys" className="doc-section">
      <h1>API Keys</h1>
      <p>
        API keys allow you to authenticate requests to your wrapped APIs. Each wrapped API can have 
        multiple API keys for different applications or environments.
      </p>

      <h2>Creating an API Key</h2>
      <ol>
        <li>Go to your <strong>Dashboard</strong> and select a wrapped API</li>
        <li>Or go to <strong>Profile → APIs</strong> tab</li>
        <li>Click <strong>Create API Key</strong> button</li>
        <li>Select the wrapped API you want to create a key for</li>
        <li>Enter a name for the key (e.g., "Production App", "Development")</li>
        <li>Click <strong>Create secret key</strong></li>
        <li><strong>Copy the key immediately</strong> - you won't be able to see it again!</li>
      </ol>

      <h2>Important Security Notes</h2>
      <div className="warning-box">
        <p><strong>⚠️ Save your key immediately!</strong></p>
        <p>
          API keys are only shown once when created. If you lose your key, you'll need to create a new one. 
          Make sure to copy and store it securely.
        </p>
      </div>

      <h2>Using Your API Key</h2>
      <p>Include your API key in the Authorization header of your requests:</p>
      <CodeBlock language="http">{`Authorization: Bearer YOUR_API_KEY_HERE`}</CodeBlock>
      <p>Example using curl:</p>
      <CodeBlock language="bash">{`curl -X POST https://api.wrap-x.com/api/wrapped-apis/YOUR_ENDPOINT_ID/chat \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, how can you help me?"
  }'`}</CodeBlock>

      <h2>Managing API Keys</h2>
      <p>You can:</p>
      <ul>
        <li>View all API keys in <strong>Profile → APIs</strong> tab</li>
        <li>See which wrapped API each key belongs to</li>
        <li>See when each key was created</li>
        <li>Delete keys that are no longer needed</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li><strong>Use descriptive names</strong> - Name keys by their purpose (e.g., "Production App", "Dev Environment")</li>
        <li><strong>Rotate keys regularly</strong> - Create new keys and delete old ones periodically</li>
        <li><strong>Don't share keys</strong> - Each application should have its own key</li>
        <li><strong>Store securely</strong> - Never commit keys to version control</li>
        <li><strong>Delete unused keys</strong> - Remove keys that are no longer in use</li>
      </ul>

      <h2>Multiple Keys</h2>
      <p>
        You can create multiple API keys for the same wrapped API. This is useful for:
      </p>
      <ul>
        <li>Separating production and development environments</li>
        <li>Different applications using the same wrapped API</li>
        <li>Key rotation without downtime</li>
      </ul>
    </div>
  );
}

function APIReference() {
  return (
    <div id="api-reference" className="doc-section">
      <h1>API Reference</h1>
      <p>
        The Wrap-X API allows you to interact with your wrapped APIs programmatically. 
        All requests require authentication via API keys.
      </p>

      <h2>Base URL</h2>
      <p>All API requests should be made to:</p>
      <CodeBlock language="http">{`https://api.wrap-x.com/api`}</CodeBlock>
      <p>For local development:</p>
      <CodeBlock language="http">{`http://localhost:8000/api`}</CodeBlock>

      <h2>Authentication</h2>
      <p>
        All API requests require authentication using a Bearer token in the Authorization header:
      </p>
      <CodeBlock language="http">{`Authorization: Bearer YOUR_API_KEY_HERE`}</CodeBlock>
      <p>
        API keys are generated in your Wrap-X dashboard. See <a href="#api-keys">API Keys</a> for more information.
      </p>

      <h2>Chat Endpoint</h2>
      <h3>POST /api/wrap-x/chat</h3>
      <p>Send a message to your wrapped API and receive a response.</p>

      <h4>Request</h4>
      <CodeBlock language="http">{`POST /api/wrap-x/chat
Authorization: Bearer YOUR_API_KEY_HERE
Content-Type: application/json

{
  "message": "Hello, how can you help me?",
  "conversation_id": "optional-conversation-id"
}`}</CodeBlock>

      <h4>Request Parameters</h4>
      <table className="api-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>message</code></td>
            <td>string</td>
            <td>Yes</td>
            <td>The message to send to your wrapped API</td>
          </tr>
          <tr>
            <td><code>conversation_id</code></td>
            <td>string</td>
            <td>No</td>
            <td>Optional conversation ID for maintaining context across multiple messages</td>
          </tr>
        </tbody>
      </table>

      <h4>Response</h4>
      <CodeBlock language="json">{`{
  "response": "Hello! I'm here to help you. How can I assist you today?",
  "conversation_id": "conv_1234567890",
  "tokens_used": 150,
  "model": "gpt-4o"
}`}</CodeBlock>

      <h4>Response Fields</h4>
      <table className="api-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>response</code></td>
            <td>string</td>
            <td>The AI's response message</td>
          </tr>
          <tr>
            <td><code>conversation_id</code></td>
            <td>string</td>
            <td>Conversation ID for maintaining context</td>
          </tr>
          <tr>
            <td><code>tokens_used</code></td>
            <td>integer</td>
            <td>Number of tokens used in this request</td>
          </tr>
          <tr>
            <td><code>model</code></td>
            <td>string</td>
            <td>The model used for this request</td>
          </tr>
        </tbody>
      </table>

      <h2>Error Responses</h2>
      <p>All errors follow this format:</p>
      <CodeBlock language="json">{`{
  "detail": "Error message describing what went wrong"
}`}</CodeBlock>

      <h3>Error Codes</h3>
      <table className="api-table">
        <thead>
          <tr>
            <th>Status Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>400</code></td>
            <td>Bad Request - Invalid request parameters</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Unauthorized - Invalid or missing API key</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Not Found - Wrapped API not found</td>
          </tr>
          <tr>
            <td><code>429</code></td>
            <td>Too Many Requests - Rate limit exceeded</td>
          </tr>
          <tr>
            <td><code>500</code></td>
            <td>Internal Server Error - Server-side error</td>
          </tr>
        </tbody>
      </table>

      <h2>Rate Limits</h2>
      <p>
        Rate limits are applied per API key. Default limits depend on your subscription plan. 
        If you exceed the rate limit, you'll receive a 429 status code.
      </p>

      <h2>Example Usage</h2>
      <h3>JavaScript (Fetch)</h3>
      <CodeBlock language="javascript">{`const response = await fetch('https://api.wrap-x.com/api/wrapped-apis/YOUR_ENDPOINT_ID/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY_HERE',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, how can you help me?'
  })
});

const data = await response.json();
console.log(data.response);`}</CodeBlock>

      <h3>Python (Requests)</h3>
      <CodeBlock language="python">{`import requests

response = requests.post(
    'https://api.wrap-x.com/api/wrapped-apis/YOUR_ENDPOINT_ID/chat',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY_HERE',
        'Content-Type': 'application/json'
    },
    json={
        'message': 'Hello, how can you help me?'
    }
)

data = response.json()
print(data['response'])`}</CodeBlock>

      <h3>cURL</h3>
      <CodeBlock language="bash">{`curl -X POST https://api.wrap-x.com/api/wrapped-apis/YOUR_ENDPOINT_ID/chat \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, how can you help me?"
  }'`}</CodeBlock>
    </div>
  );
}

function Guides() {
  return (
    <div id="guides" className="doc-section">
      <h1>Guides & Tutorials</h1>
      <p>
        Step-by-step guides to help you build specific types of AI assistants with Wrap-X.
      </p>

      <h2>Building a Customer Support Bot</h2>
      <h3>Step 1: Create Project and Provider</h3>
      <ol>
        <li>Create a project called "Customer Support"</li>
        <li>Add your LLM provider (OpenAI, Claude, etc.)</li>
      </ol>

      <h3>Step 2: Create Wrapped API</h3>
      <ol>
        <li>Create a wrapped API called "Support Bot"</li>
        <li>In the chat, say: <em>"I want to create a friendly customer support bot that helps users with account issues, 
        billing questions, and product features. It should be professional but warm and empathetic."</em></li>
      </ol>

      <h3>Step 3: Configure</h3>
      <p>Answer the chat's questions:</p>
      <ul>
        <li><strong>Role:</strong> Customer support agent</li>
        <li><strong>Tone:</strong> Friendly or Supportive</li>
        <li><strong>Model:</strong> Choose based on your needs (gpt-4o for better quality, gpt-4o-mini for cost efficiency)</li>
        <li><strong>Examples:</strong> Include 20-25 examples covering password resets, order issues, billing questions, etc.</li>
      </ul>

      <h3>Step 4: Test and Deploy</h3>
      <ol>
        <li>Test your bot in the test chat panel</li>
        <li>Generate an API key</li>
        <li>Integrate into your application</li>
      </ol>

      <h2>Building a Coding Assistant</h2>
      <h3>Step 1: Setup</h3>
      <ol>
        <li>Create a project called "Development Tools"</li>
        <li>Add your LLM provider</li>
      </ol>

      <h3>Step 2: Create Wrapped API</h3>
      <ol>
        <li>Create a wrapped API called "Code Assistant"</li>
        <li>In the chat, say: <em>"I want a coding assistant that helps with Python, JavaScript, and debugging. 
        It should provide clear code examples and explanations."</em></li>
      </ol>

      <h3>Step 3: Configure</h3>
      <ul>
        <li><strong>Role:</strong> Expert software developer</li>
        <li><strong>Tone:</strong> Technical</li>
        <li><strong>Thinking Mode:</strong> Conditional (for complex problems)</li>
        <li><strong>Examples:</strong> Include examples for debugging, code explanations, API usage, optimization, etc.</li>
      </ul>

      <h2>Building a Research Assistant</h2>
      <h3>Step 1: Setup</h3>
      <ol>
        <li>Create a project called "Research Tools"</li>
        <li>Add your LLM provider</li>
      </ol>

      <h3>Step 2: Create Wrapped API</h3>
      <ol>
        <li>Create a wrapped API called "Research Assistant"</li>
        <li>In the chat, say: <em>"I want a research assistant that finds and summarizes information from the web. 
        It should cite sources and provide accurate information."</em></li>
      </ol>

      <h3>Step 3: Configure</h3>
      <ul>
        <li><strong>Role:</strong> Research assistant</li>
        <li><strong>Tone:</strong> Professional</li>
        <li><strong>Web Search:</strong> Always or Conditional</li>
        <li><strong>Thinking Mode:</strong> Conditional (for complex research)</li>
        <li><strong>Examples:</strong> Include examples for summarizing, comparing, citing sources, etc.</li>
      </ul>

      <h2>Best Practices for Prompts</h2>
      <h3>Be Specific</h3>
      <p>
        Instead of "helpful assistant", say "customer support agent specializing in account and billing issues".
      </p>

      <h3>Include Edge Cases</h3>
      <p>
        In your rules and examples, include how to handle errors, unclear requests, and edge cases.
      </p>

      <h3>Test and Iterate</h3>
      <p>
        Test your wrapped API with real questions, then refine the configuration based on results.
      </p>

      <h3>Use Appropriate Tone</h3>
      <p>
        Match the tone to your use case - professional for business, friendly for consumer apps, 
        technical for developer tools.
      </p>
    </div>
  );
}

function WebSearch() {
  return (
    <div id="web-search" className="doc-section">
      <h1>Web Search</h1>
      <p>
        Web Search allows your wrapped API to search the internet for current information, 
        facts, and real-time data.
      </p>

      <h2>What is Web Search?</h2>
      <p>
        When enabled, your wrapped API can search the web to find up-to-date information, 
        verify facts, and access current events that aren't in the model's training data.
      </p>

      <h2>Enabling Web Search</h2>
      <p>You can enable web search in three modes:</p>
      <ul>
        <li><strong>Always</strong> - Always search the web before responding</li>
        <li><strong>Conditional</strong> - Search only when needed (e.g., for current events, recent data, facts)</li>
        <li><strong>Off</strong> - Disable web search</li>
      </ul>

      <h2>When to Use Web Search</h2>
      <p>Enable web search when your AI needs:</p>
      <ul>
        <li>Current events or news</li>
        <li>Real-time data or statistics</li>
        <li>Recent information (newer than the model's training data)</li>
        <li>Fact verification</li>
        <li>Version information or documentation</li>
      </ul>

      <h2>Configuring Web Search</h2>
      <p>When configuring your wrapped API via chat, mention:</p>
      <ul>
        <li>"I need it to search the web for current information" → <strong>Always</strong></li>
        <li>"It should search when needed for facts or recent data" → <strong>Conditional</strong></li>
        <li>"No web search needed" → <strong>Off</strong></li>
      </ul>

      <h2>Web Search Triggers</h2>
      <p>
        When set to Conditional, you can specify triggers like:
      </p>
      <ul>
        <li>"Current events, recent data (&gt;3mo old), version info, live stats"</li>
        <li>"When user asks about recent news or facts"</li>
        <li>"For information that may have changed recently"</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>Use <strong>Always</strong> for research assistants or news bots</li>
        <li>Use <strong>Conditional</strong> for general assistants that sometimes need current info</li>
        <li>Use <strong>Off</strong> for coding assistants or creative writing bots</li>
        <li>Note that web search may increase response time and costs</li>
      </ul>
    </div>
  );
}

function ThinkingMode() {
  return (
    <div id="thinking-mode" className="doc-section">
      <h1>Thinking Mode</h1>
      <p>
        Thinking Mode allows your wrapped API to plan and think before responding, 
        improving responses for complex tasks.
      </p>

      <h2>What is Thinking Mode?</h2>
      <p>
        When enabled, your AI will create a brief plan (3-6 bullet steps) before providing 
        the final answer. This helps with complex problems that require multi-step reasoning.
      </p>

      <h2>Thinking Mode Options</h2>
      <ul>
        <li><strong>Always</strong> - Always think/plan before responding</li>
        <li><strong>Conditional</strong> - Think only for complex or ambiguous tasks</li>
        <li><strong>Off</strong> - No thinking/planning (faster responses)</li>
      </ul>

      <h2>When to Use Thinking Mode</h2>
      <p>Enable thinking mode for:</p>
      <ul>
        <li>Complex problem-solving</li>
        <li>Multi-step tasks</li>
        <li>Tasks requiring analysis or planning</li>
        <li>Debugging or troubleshooting</li>
        <li>Research or synthesis tasks</li>
      </ul>
      <p>Disable for:</p>
      <ul>
        <li>Simple Q&A</li>
        <li>Quick responses</li>
        <li>Creative writing (unless complex)</li>
        <li>When speed is more important than depth</li>
      </ul>

      <h2>Configuring Thinking Mode</h2>
      <p>When configuring your wrapped API via chat, mention:</p>
      <ul>
        <li>"It should think carefully and plan before responding" → <strong>Always</strong></li>
        <li>"Think for complex problems, but be quick for simple questions" → <strong>Conditional</strong></li>
        <li>"Quick responses, no planning needed" → <strong>Off</strong></li>
      </ul>

      <h2>Thinking Focus</h2>
      <p>
        When thinking mode is enabled, you can specify what the AI should plan for:
      </p>
      <ul>
        <li>"Plan steps, check edge cases, validate assumptions"</li>
        <li>"Break down the problem, identify requirements, propose solution"</li>
        <li>"Analyze the question, gather relevant information, structure response"</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>Use <strong>Always</strong> for coding assistants, research tools, or complex problem-solving</li>
        <li>Use <strong>Conditional</strong> for general assistants that handle both simple and complex tasks</li>
        <li>Use <strong>Off</strong> for simple chatbots or when speed is critical</li>
        <li>Note that thinking mode may increase response time and token usage</li>
      </ul>
    </div>
  );
}

function Billing() {
  return (
    <div id="billing" className="doc-section">
      <h1>Billing & Usage</h1>
      <p>
        Wrap-X offers a free trial and flexible pricing plans to suit your needs.
      </p>

      <h2>Free Trial</h2>
      <p>
        All new users automatically receive a <strong>3-day free trial</strong> upon registration. 
        The trial includes:
      </p>
      <ul>
        <li>Full access to all features</li>
        <li>Ability to create projects, providers, and wrapped APIs</li>
        <li>Unlimited API requests during the trial period</li>
        <li>No credit card required</li>
      </ul>
      <p>
        The trial appears in your billing history as a zero-amount transaction. 
        You can upgrade to a paid plan at any time during or after the trial.
      </p>

      <h2>Pricing Plans</h2>
      <p>
        After your trial, choose a plan that fits your usage:
      </p>
      <ul>
        <li><strong>Starter</strong> - For individuals and small projects</li>
        <li><strong>Professional</strong> - For growing businesses</li>
        <li><strong>Enterprise</strong> - For large-scale deployments</li>
      </ul>
      <p>
        View current pricing and features in your <strong>Profile → Billing</strong> tab.
      </p>

      <h2>Usage Limits</h2>
      <p>
        Each plan includes:
      </p>
      <ul>
        <li>API request limits per month</li>
        <li>Number of wrapped APIs</li>
        <li>Number of projects</li>
        <li>Rate limits</li>
      </ul>
      <p>
        Check your plan details in the billing section for specific limits.
      </p>

      <h2>Billing History</h2>
      <p>
        View all your invoices and transactions in <strong>Profile → Billing</strong>:
      </p>
      <ul>
        <li>Trial entry (zero amount)</li>
        <li>Subscription payments</li>
        <li>Invoice downloads</li>
        <li>Payment dates and amounts</li>
      </ul>

      <h2>Subscription Management</h2>
      <p>You can:</p>
      <ul>
        <li>Upgrade or downgrade your plan</li>
        <li>View current plan details</li>
        <li>Manage payment methods</li>
        <li>Cancel your subscription</li>
        <li>Access billing portal for detailed invoices</li>
      </ul>
      <p>
        All subscription management is available in <strong>Profile → Billing</strong>.
      </p>

      <h2>Payment Methods</h2>
      <p>
        Payments are processed securely through Stripe. You can add, update, or remove payment methods 
        through the billing portal.
      </p>

      <h2>Best Practices</h2>
      <ul>
        <li>Monitor your usage to avoid exceeding limits</li>
        <li>Upgrade your plan before hitting limits to avoid service interruption</li>
        <li>Review billing history regularly</li>
        <li>Set up payment method before trial ends for seamless continuation</li>
      </ul>
    </div>
  );
}

function Troubleshooting() {
  return (
    <div id="troubleshooting" className="doc-section">
      <h1>Troubleshooting</h1>
      <p>
        Common issues and solutions to help you get the most out of Wrap-X.
      </p>

      <h2>Common Errors</h2>

      <h3>Authentication Failed</h3>
      <p><strong>Error:</strong> "Authentication failed. Please refresh the page and log in again."</p>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Refresh the page and log in again</li>
        <li>Check if your session has expired</li>
        <li>Clear browser cache and cookies if the issue persists</li>
      </ul>

      <h3>Invalid API Key</h3>
      <p><strong>Error:</strong> 401 Unauthorized when making API requests</p>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Verify you're using the correct API key</li>
        <li>Check that the API key hasn't been deleted</li>
        <li>Ensure the Authorization header format is correct: <code>Bearer YOUR_API_KEY</code></li>
      </ul>

      <h3>Wrapped API Not Found</h3>
      <p><strong>Error:</strong> 404 Not Found</p>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Verify the wrapped API exists and is active</li>
        <li>Check that you're using the correct API key for that wrapped API</li>
        <li>Ensure the wrapped API hasn't been deleted</li>
      </ul>

      <h3>Rate Limit Exceeded</h3>
      <p><strong>Error:</strong> 429 Too Many Requests</p>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Wait before making more requests</li>
        <li>Upgrade your plan for higher rate limits</li>
        <li>Implement request throttling in your application</li>
      </ul>

      <h3>LLM Provider Error</h3>
      <p><strong>Error:</strong> "Failed to call LLM provider"</p>
      <p><strong>Solution:</strong></p>
      <ul>
        <li>Verify your LLM provider API key is valid</li>
        <li>Check that you have sufficient credits/quota with your LLM provider</li>
        <li>Verify the provider is correctly configured</li>
        <li>For custom providers, check the base URL is correct</li>
      </ul>

      <h2>FAQ</h2>

      <h3>How do I reset my password?</h3>
      <p>
        Use the "Forgot Password" link on the login page. You'll receive an email with reset instructions.
      </p>

      <h3>Can I use multiple LLM providers?</h3>
      <p>
        Yes! You can add multiple providers and choose which one to use for each wrapped API.
      </p>

      <h3>How do I delete a wrapped API?</h3>
      <p>
        Go to your Dashboard, find the wrapped API, and click delete. Note: This will also delete all 
        associated API keys.
      </p>

      <h3>Can I change my plan?</h3>
      <p>
        Yes, you can upgrade or downgrade your plan at any time in Profile → Billing. Changes take effect immediately.
      </p>

      <h3>What happens after my trial ends?</h3>
      <p>
        You'll need to subscribe to a paid plan to continue using Wrap-X. Upgrade before your trial ends 
        to avoid service interruption.
      </p>

      <h3>How do I get support?</h3>
      <p>
        For technical support, check this documentation first. For billing or account issues, contact support 
        through your account settings.
      </p>

      <h2>Getting Help</h2>
      <p>If you're still experiencing issues:</p>
      <ul>
        <li>Review the relevant documentation section</li>
        <li>Check the error message for specific details</li>
        <li>Verify your configuration matches the examples in the docs</li>
        <li>Contact support with specific error messages and steps to reproduce</li>
      </ul>
    </div>
  );
}

export default Documentation;

