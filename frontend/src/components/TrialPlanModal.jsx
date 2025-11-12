import React from 'react';
import '../styles/TrialPlanModal.css';

const formatCurrency = (amount, currency = 'usd') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount ?? 0);
  } catch (err) {
    console.error('Currency format error:', err);
    return `$${Number(amount ?? 0).toFixed(2)}`;
  }
};

function TrialPlanModal({ isOpen, plans = [], trialDays = 3, loadingPlanId, onSelectPlan, onClose }) {
  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="trial-modal-overlay" onClick={handleOverlayClick}>
      <div className="trial-modal" role="dialog" aria-modal="true">
        <div className="trial-modal-header">
          <div>
            <h2>Start your {trialDays}-day free trial</h2>
            <p>Select a plan to begin. You can cancel anytime during the trial with no charge.</p>
          </div>
          <button className="trial-modal-close" onClick={onClose} aria-label="Close plan selection">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="trial-plan-grid">
          {plans.length === 0 ? (
            <div className="trial-plan-empty">No plans available yet. Please try again shortly.</div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="trial-plan-card">
                {plan.id === 'professional' && <span className="trial-plan-badge">Most Popular</span>}
                <div className="trial-plan-header">
                  <h3>{plan.name}</h3>
                  <div className="trial-plan-price">
                    {formatCurrency(plan.price)}<span>/month</span>
                  </div>
                </div>
                <ul>
                  <li>{plan.wraps} {plan.wraps === 1 ? 'Wrap' : 'Wraps'} included</li>
                  <li>{trialDays}-day full-feature trial</li>
                  <li>Unlimited usage during trial</li>
                  <li>Cancel anytime</li>
                </ul>
                <button
                  className="trial-plan-select"
                  onClick={() => onSelectPlan?.(plan)}
                  disabled={loadingPlanId === plan.id}
                >
                  {loadingPlanId === plan.id ? 'Redirecting…' : 'Start Free Trial'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TrialPlanModal;


