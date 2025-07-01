import React from 'react';
import AuthButton from '../components/AuthButton';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="brand-name">MarkIt</h1>
          <p className="slogan">Textbooks, but <span className="slogan-highlight">better</span>.</p>
          <div className="hero-button-container">
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3 className="feature-title">Interactive AI Learning</h3>
            <p className="feature-description">
              Go beyond static pages. Engage with an AI that explains complex concepts, quizzes you on the material, and adapts to your learning style.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3 className="feature-title">Instant Feedback</h3>
            <p className="feature-description">
              Upload your own textbooks and course materials to get instant, AI-powered feedback and summaries from powerful Large Language Models (LLMs).
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3 className="feature-title">Centralize Your Study</h3>
            <p className="feature-description">
              Keep all your notes, highlights, and AI-generated insights in one place, turning your textbook into a personalized and dynamic study hub.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage; 