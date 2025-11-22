import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoDashboard from '../components/DemoDashboard';
import DemoConfigChat from '../components/DemoConfigChat';
import DemoTestChat from '../components/DemoTestChat';
import '../styles/Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentHeadline, setCurrentHeadline] = useState(0);
  const canvasRef = useRef(null);

  // Rotating headlines
  const headlines = [
    {
      badge: "The Future of AI APIs",
      title: "Build Custom AI APIs",
      subtitle: "Without Writing Code"
    },
    {
      badge: "Ship Faster",
      title: "Deploy AI in Minutes",
      subtitle: "Not Days or Weeks"
    },
    {
      badge: "Stop Writing Boilerplate",
      title: "Configure AI Visually",
      subtitle: "Chat Your Way to Production"
    },
    {
      badge: "One Platform, Infinite Possibilities",
      title: "Wrap 100+ LLM Providers",
      subtitle: "OpenAI, Anthropic, Google, Groq & More"
    },
    {
      badge: "From Idea to API",
      title: "Turn Prompts Into APIs",
      subtitle: "Deploy Instantly"
    },
    {
      badge: "No Code Required",
      title: "Build AI Products Faster",
      subtitle: "Configure, Test, Deploy"
    },
    {
      badge: "Powerful Yet Simple",
      title: "Enterprise-Grade AI APIs",
      subtitle: "With Zero Complexity"
    },
    {
      badge: "The Smart Way to Build AI",
      title: "Create Custom AI Assistants",
      subtitle: "In Under 5 Minutes"
    }
  ];

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Rotate headlines every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeadline((prev) => (prev + 1) % headlines.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [headlines.length]);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 100;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.update();
        particle.draw();

        // Connect nearby particles
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll-triggered animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('[data-scroll]');
    elementsToAnimate.forEach((el) => observer.observe(el));

    return () => {
      elementsToAnimate.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="landing-page-modern">
      {/* Hero Section with Particle Background */}
      <section className="hero-modern">
        <canvas ref={canvasRef} className="particle-canvas"></canvas>

        <div className="hero-content-modern">
          <div className="hero-badge-modern" key={`badge-${currentHeadline}`}>
            <div className="badge-dot"></div>
            <span>{headlines[currentHeadline].badge}</span>
          </div>

          <h1 className="hero-title-modern" key={`title-${currentHeadline}`}>
            {headlines[currentHeadline].title}
            <br />
            <span className="gradient-text-modern">{headlines[currentHeadline].subtitle}</span>
          </h1>

          <p className="hero-subtitle-modern">
            Connect any LLM provider. Add tools. Deploy in minutes.
            <br />
            Your perfect AI API, wrapped and ready.
          </p>

          <div className="hero-cta-modern">
            <button
              className="cta-primary-modern magnetic-btn"
              onClick={() => navigate('/register')}
              style={{
                transform: `translate(${(mousePosition.x - window.innerWidth / 2) * 0.01}px, ${(mousePosition.y - window.innerHeight / 2) * 0.01}px)`
              }}
            >
              <span className="btn-text">Start Building Free</span>
              <span className="btn-shimmer"></span>
            </button>
            <button
              className="cta-secondary-modern"
              onClick={() => navigate('/login')}
            >
              <span>Sign In</span>
            </button>
          </div>

          <div className="hero-features-modern">
            <div className="feature-pill">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="feature-pill">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>100+ LLM providers</span>
            </div>
            <div className="feature-pill">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.3333 4L6 11.3333L2.66666 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Deploy in &lt; 5 minutes</span>
            </div>
          </div>
        </div>

        {/* Floating gradient orbs */}
        <div className="gradient-orbs-modern">
          <div className="orb-modern orb-1" style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.15}px)` }}></div>
          <div className="orb-modern orb-2" style={{ transform: `translate(${-scrollY * 0.1}px, ${scrollY * 0.2}px)` }}></div>
          <div className="orb-modern orb-3" style={{ transform: `translate(${scrollY * 0.15}px, ${-scrollY * 0.1}px)` }}></div>
        </div>
      </section>

      {/* Live Dashboard Demo */}
      <section className="dashboard-demo-section">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Monitor Everything</h2>
          <p className="section-subtitle-modern">Real-time analytics and insights</p>
        </div>

        <div className="dashboard-demo-wrapper" data-scroll>
          <div className="dashboard-frame">
            <DemoDashboard />
          </div>
        </div>
      </section>

      {/* Live Chat Demos - Side by Side */}
      <section className="chat-demo-section">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Build & Test Your AI</h2>
          <p className="section-subtitle-modern">Configure through conversation, test instantly</p>
        </div>

        <div className="chat-demos-wrapper" data-scroll>
          <div className="chat-demo-split">
            <div className="chat-demo-panel">
              <div className="chat-demo-header">
                <div className="chat-demo-tab active">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span>Configuration Chat</span>
                </div>
              </div>
              <div className="chat-demo-content">
                <DemoConfigChat />
              </div>
            </div>

            <div className="chat-demo-panel">
              <div className="chat-demo-header">
                <div className="chat-demo-tab active">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 7L8 2L2 7M3 6V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Test Chat</span>
                </div>
              </div>
              <div className="chat-demo-content">
                <DemoTestChat />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="bento-section">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Everything You Need</h2>
          <p className="section-subtitle-modern">Powerful features for modern AI APIs</p>
        </div>

        <div className="bento-grid">
          {/* Large feature card */}
          <div className="bento-card bento-large" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon-large">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" stroke="url(#grad1)" strokeWidth="2" />
                  <path d="M24 16V24L28 28" stroke="url(#grad1)" strokeWidth="2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="grad1" x1="4" y1="4" x2="44" y2="44">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className="bento-title">100+ LLM Providers</h3>
              <p className="bento-description">
                OpenAI, Anthropic, DeepSeek, Google, Groq, Mistral, Azure, and 100+ more through LiteLLM. Switch providers instantly.
              </p>
              <div className="provider-logos">
                <div className="provider-tag">OpenAI</div>
                <div className="provider-tag">Anthropic</div>
                <div className="provider-tag">DeepSeek</div>
                <div className="provider-tag">Google</div>
                <div className="provider-tag">Groq</div>
                <div className="provider-tag">Mistral</div>
                <div className="provider-tag">+100 More</div>
              </div>
            </div>
          </div>

          {/* Medium cards */}
          <div className="bento-card bento-medium" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4L4 10L16 16L28 10L16 4Z" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 22L16 28L28 22" stroke="url(#grad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="grad2" x1="4" y1="4" x2="28" y2="28">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className="bento-title">Advanced Tools</h3>
              <p className="bento-description">
                Web search, thinking mode, document upload, and custom integrations.
              </p>
            </div>
          </div>

          <div className="bento-card bento-medium" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M8 12H24M8 16H24M6 28H26C27.1046 28 28 27.1046 28 26V6C28 4.89543 27.1046 4 26 4H6C4.89543 4 4 4.89543 4 6V26C4 27.1046 4.89543 28 6 28Z" stroke="url(#grad3)" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad3" x1="4" y1="4" x2="28" y2="28">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 className="bento-title">AI Config Builder</h3>
              <p className="bento-description">
                Describe what you want. AI generates complete configs in minutes.
              </p>
            </div>
          </div>

          {/* Small cards */}
          <div className="bento-card bento-small" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon-small">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#10B981" strokeWidth="2" />
                  <path d="M8 12L11 15L16 9" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="bento-title-small">Production Ready</h3>
            </div>
          </div>

          <div className="bento-card bento-small" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon-small">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8V16M8 12H16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                  <rect x="2" y="2" width="20" height="20" rx="4" stroke="#F59E0B" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="bento-title-small">Real-Time Testing</h3>
            </div>
          </div>

          <div className="bento-card bento-small" data-scroll>
            <div className="bento-card-inner">
              <div className="bento-icon-small">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#3B82F6" strokeWidth="2" />
                </svg>
              </div>
              <h3 className="bento-title-small">Document Upload</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Traditional vs Wrap-X Comparison */}
      <section className="comparison-section">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Why Developers Choose Wrap-X</h2>
          <p className="section-subtitle-modern">Compare traditional configuration vs our approach</p>
        </div>

        <div className="comparison-container" data-scroll>
          <div className="comparison-side traditional">
            <div className="comparison-badge traditional-badge">Traditional Way</div>
            <h3 className="comparison-title">Days of Coding</h3>

            <div className="comparison-steps">
              <div className="comparison-step">
                <div className="step-marker">1</div>
                <div className="step-text">
                  <strong>Write boilerplate code</strong>
                  <div className="code-block-small">
                    <code>
                      import openai<br />
                      from flask import Flask, request<br />
                      <br />
                      app = Flask(__name__)<br />
                      client = openai.OpenAI()<br />
                      <br />
                      @app.route('/chat')<br />
                      def chat():<br />
                      &nbsp;&nbsp;# 50+ lines of code...<br />
                    </code>
                  </div>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">2</div>
                <div className="step-text">
                  <strong>Configure prompts manually</strong>
                  <span className="step-detail">Edit JSON, test, repeat</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">3</div>
                <div className="step-text">
                  <strong>Build error handling</strong>
                  <span className="step-detail">Rate limits, retries, timeouts</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">4</div>
                <div className="step-text">
                  <strong>Set up authentication</strong>
                  <span className="step-detail">API keys, JWT, validation</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">5</div>
                <div className="step-text">
                  <strong>Deploy infrastructure</strong>
                  <span className="step-detail">Docker, K8s, monitoring</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">6</div>
                <div className="step-text">
                  <strong>Build analytics dashboard</strong>
                  <span className="step-detail">Track usage, costs, errors</span>
                </div>
              </div>
            </div>

            <div className="comparison-result traditional-result">
              <div className="result-item">500+ lines of code</div>
              <div className="result-item">2-3 weeks development</div>
              <div className="result-item">Technical expertise required</div>
              <div className="result-item">Ongoing maintenance</div>
            </div>
          </div>

          <div className="comparison-divider">
            <div className="vs-badge">VS</div>
          </div>

          <div className="comparison-side wrapx">
            <div className="comparison-badge wrapx-badge">Wrap-X Way</div>
            <h3 className="comparison-title">Minutes to Production</h3>

            <div className="comparison-steps">
              <div className="comparison-step">
                <div className="step-marker">1</div>
                <div className="step-text">
                  <strong>Connect provider</strong>
                  <span className="step-detail">Add API key in 30 seconds</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">2</div>
                <div className="step-text">
                  <strong>Chat to configure</strong>
                  <span className="step-detail">Describe what you want naturally</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">3</div>
                <div className="step-text">
                  <strong>Test instantly</strong>
                  <span className="step-detail">Real-time chat testing built-in</span>
                </div>
              </div>

              <div className="comparison-step">
                <div className="step-marker">4</div>
                <div className="step-text">
                  <strong>Deploy</strong>
                  <span className="step-detail">Copy endpoint, start using</span>
                </div>
              </div>
            </div>

            <div className="comparison-result wrapx-result">
              <div className="result-item">0 lines of code</div>
              <div className="result-item">5 minutes setup</div>
              <div className="result-item">Anyone can do it</div>
              <div className="result-item">Auto-maintained</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section className="how-section-modern">
        <div className="section-header-modern">
          <h2 className="section-title-modern">How It Works</h2>
          <p className="section-subtitle-modern">From idea to production in 3 simple steps</p>
        </div>

        <div className="journey-flow">
          <div className="journey-step" data-scroll>
            <div className="journey-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="url(#gradStep1)" strokeWidth="2" />
                <path d="M18 24H30M24 18V30" stroke="url(#gradStep1)" strokeWidth="2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="gradStep1" x1="4" y1="4" x2="44" y2="44">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="journey-number">Step 1</div>
            <h3 className="journey-title">Connect Provider</h3>
            <p className="journey-description">
              Choose from 100+ LLM providers. Add your API key. Takes 30 seconds.
            </p>
            <div className="journey-tags">
              <span className="journey-tag">OpenAI</span>
              <span className="journey-tag">Anthropic</span>
              <span className="journey-tag">DeepSeek</span>
              <span className="journey-tag">+100 more</span>
            </div>
          </div>

          <div className="journey-arrow" data-scroll>
            <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
              <path d="M0 12H56M56 12L46 2M56 12L46 22" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="journey-step" data-scroll>
            <div className="journey-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="url(#gradStep2)" strokeWidth="2" />
                <path d="M16 20L20 24L32 14" stroke="url(#gradStep2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="gradStep2" x1="4" y1="4" x2="44" y2="44">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="journey-number">Step 2</div>
            <h3 className="journey-title">Configure with AI</h3>
            <p className="journey-description">
              Chat with AI to define behavior, tools, and settings. No code needed.
            </p>
            <div className="journey-tags">
              <span className="journey-tag">Web Search</span>
              <span className="journey-tag">Thinking Mode</span>
              <span className="journey-tag">Custom Tone</span>
            </div>
          </div>

          <div className="journey-arrow" data-scroll>
            <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
              <path d="M0 12H56M56 12L46 2M56 12L46 22" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="journey-step" data-scroll>
            <div className="journey-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="url(#gradStep3)" strokeWidth="2" />
                <path d="M24 16V24L28 28" stroke="url(#gradStep3)" strokeWidth="2" strokeLinecap="round" />
                <defs>
                  <linearGradient id="gradStep3" x1="4" y1="4" x2="44" y2="44">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="journey-number">Step 3</div>
            <h3 className="journey-title">Deploy & Monitor</h3>
            <p className="journey-description">
              Get your API endpoint. Track performance in real-time dashboard.
            </p>
            <div className="journey-tags">
              <span className="journey-tag">Live in 5min</span>
              <span className="journey-tag">Analytics</span>
              <span className="journey-tag">99.9% Uptime</span>
            </div>
          </div>
        </div>

        <div className="journey-cta" data-scroll>
          <p className="journey-cta-text">Ready to build your AI API?</p>
          <button className="journey-cta-button" onClick={() => navigate('/register')}>
            Start Building Free
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Loved by Developers</h2>
          <p className="section-subtitle-modern">See what teams are building with Wrap-X</p>
        </div>

        <div className="testimonials-container" data-scroll>
          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "We shipped our AI customer support in 4 hours instead of 4 weeks. Wrap-X eliminated all the infrastructure headaches and let us focus on our product."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">SC</div>
              <div className="author-info">
                <div className="author-name">Sarah Chen</div>
                <div className="author-role">CTO, TechStartup</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "No more managing infrastructure, rate limits, or error handling. Just describe what you want, test it, deploy. Game changer for our development workflow."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">MR</div>
              <div className="author-info">
                <div className="author-name">Mike Rodriguez</div>
                <div className="author-role">Product Lead, SaaS Co</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "Our non-technical team is now building AI features. Wrap-X democratized AI development for our entire company. The chat-based configuration is brilliant."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">EW</div>
              <div className="author-info">
                <div className="author-name">Emily Watson</div>
                <div className="author-role">Founder, HealthTech</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "The real-time testing and monitoring dashboard saved us countless debugging hours. We can see exactly how our AI performs in production."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">JL</div>
              <div className="author-info">
                <div className="author-name">James Liu</div>
                <div className="author-role">Engineering Manager, FinTech</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "Switched from building everything in-house to Wrap-X. Cut our AI API development time by 90%. Now we iterate in hours, not weeks."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">AP</div>
              <div className="author-info">
                <div className="author-name">Aisha Patel</div>
                <div className="author-role">Lead Developer, EdTech</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-text">
              "Supporting 100+ LLM providers out of the box is incredible. We can test different models without rewriting code. Perfect for experimentation."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">DK</div>
              <div className="author-info">
                <div className="author-name">David Kim</div>
                <div className="author-role">AI Researcher, Research Lab</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Glassmorphism */}
      <section className="pricing-modern">
        <div className="section-header-modern">
          <h2 className="section-title-modern">Simple Pricing</h2>
          <p className="section-subtitle-modern">Start free, scale as you grow</p>
        </div>

        <div className="pricing-grid-modern">
          <div className="pricing-card-modern" data-scroll>
            <div className="pricing-header-modern">
              <h3 className="pricing-name-modern">Starter</h3>
              <div className="pricing-price-modern">
                <span className="price-symbol">$</span>
                <span className="price-amount">8.79</span>
                <span className="price-period">/mo</span>
              </div>
            </div>
            <ul className="pricing-features-modern">
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                1 Project
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                3 Wraps
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Standard Support
              </li>
            </ul>
            <button className="pricing-btn-modern" onClick={() => navigate('/register')}>
              Get Started
            </button>
          </div>

          <div className="pricing-card-modern pricing-featured" data-scroll>
            <div className="featured-badge-modern">Most Popular</div>
            <div className="pricing-header-modern">
              <h3 className="pricing-name-modern">Professional</h3>
              <div className="pricing-price-modern">
                <span className="price-symbol">$</span>
                <span className="price-amount">19.89</span>
                <span className="price-period">/mo</span>
              </div>
            </div>
            <ul className="pricing-features-modern">
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Unlimited Projects
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                10 Wraps
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Priority Support
              </li>
            </ul>
            <button className="pricing-btn-modern pricing-btn-featured" onClick={() => navigate('/register')}>
              Start Pro Trial
            </button>
          </div>

          <div className="pricing-card-modern" data-scroll>
            <div className="pricing-header-modern">
              <h3 className="pricing-name-modern">Business</h3>
              <div className="pricing-price-modern">
                <span className="price-symbol">$</span>
                <span className="price-amount">49.99</span>
                <span className="price-period">/mo</span>
              </div>
            </div>
            <ul className="pricing-features-modern">
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Unlimited Projects
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                31 Wraps
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.6667 5L7.5 14.1667L3.33334 10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Dedicated Support
              </li>
            </ul>
            <button className="pricing-btn-modern" onClick={() => navigate('/register')}>
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-final-modern">
        <div className="cta-gradient-bg"></div>
        <div className="cta-content-modern">
          <h2 className="cta-title-modern">Ready to Build?</h2>
          <p className="cta-subtitle-modern">
            Start building custom AI APIs today. No credit card required.
          </p>
          <button
            className="cta-btn-large-modern magnetic-btn"
            onClick={() => navigate('/register')}
          >
            <span>Start Building Free</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="footer-modern">
        <div className="footer-content-modern">
          <div className="footer-links-modern">
            <a href="/terms-of-service">Terms</a>
            <a href="/privacy-policy">Privacy</a>
            <a href="/cookie-policy">Cookies</a>
            <a href="/tokushoho">特定商取引法</a>
            <a href="mailto:info@wrap-x.com">Contact</a>
          </div>
          <p className="footer-copy-modern">© 2025 Wrap-X. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
