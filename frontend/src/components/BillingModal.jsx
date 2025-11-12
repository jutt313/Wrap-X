import React, { useState, useEffect, useMemo } from 'react';
import billingService from '../services/billingService';
import '../styles/BillingModal.css';

const STATUS_LABELS = {
  trial: 'Trialing',
  active: 'Active',
  cancelled: 'Cancelled',
  past_due: 'Past Due',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
};

function formatCurrency(amount, currency = 'usd') {
  if (amount === null || amount === undefined) return '-';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch (err) {
    console.error('Error formatting currency', err);
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return '—';
  }
}

function formatPeriod(start, end) {
  if (!start && !end) return '—';
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  if (!start) return endDate;
  if (!end) return startDate;
  return `${startDate} → ${endDate}`;
}

function BillingModal({ isOpen, onClose }) {
  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('overview');
    loadPrimaryData();
    loadHistory();
  }, [isOpen]);

  const planLookup = useMemo(() => {
    const lookup = {};
    plans.forEach((plan) => {
      lookup[plan.id] = plan;
    });
    return lookup;
  }, [plans]);

  const currentPlan = subscription ? planLookup[subscription.plan_type] : null;

  const loadPrimaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
      ]);

      setPlans(plansResponse?.plans || []);
      setTrialDays(plansResponse?.trial_days || 0);
      setSubscription(subscriptionResponse || null);
    } catch (err) {
      console.error('Error loading billing details:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load billing details.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await billingService.getHistory();
      setHistory(response?.invoices || []);
    } catch (err) {
      console.error('Error loading billing history:', err);
      setHistoryError(err?.response?.data?.detail || err.message || 'Failed to load billing history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCheckout = async (plan) => {
    setCheckoutPlanId(plan.id);
    setError(null);
    try {
      const response = await billingService.createCheckoutSession(plan.price_id);
      if (response?.url) {
        window.location.href = response.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to start checkout.');
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const response = await billingService.createPortalSession();
      if (response?.url) {
        window.open(response.url, '_blank', 'noopener,noreferrer');
      } else {
        setError('Unable to open customer portal. Please try again.');
      }
    } catch (err) {
      console.error('Portal session error:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to open customer portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const renderStatusBadge = (status) => {
    const label = STATUS_LABELS[status] || (status ? status.replace(/_/g, ' ') : 'Unknown');
    return (
      <span className={`billing-status-badge status-${status || 'unknown'}`}>
        {label}
      </span>
    );
  };

  const renderPlanButton = (plan) => {
    const isCurrentPlan = subscription && plan.id === subscription.plan_type;
    const isSubscribed = Boolean(subscription);

    if (isCurrentPlan && subscription?.status !== 'cancelled') {
      return (
        <button className="billing-plan-button" disabled>
          Current Plan
        </button>
      );
    }

    return (
      <button
        className="billing-plan-button primary"
        onClick={() => handleCheckout(plan)}
        disabled={checkoutPlanId === plan.id}
      >
        {checkoutPlanId === plan.id ? 'Redirecting...' : isSubscribed ? 'Switch Plan' : 'Select Plan'}
      </button>
    );
  };

  return (
    <div className="billing-modal-overlay" onClick={onClose}>
      <div className="billing-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="billing-modal-header">
          <div>
            <h2 className="billing-modal-title">Billing & Subscription</h2>
            <p className="billing-modal-subtitle">Manage your Wrap-X subscription, upgrade plans, and review payment history.</p>
          </div>
          <button className="billing-modal-close" onClick={onClose} aria-label="Close billing modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {(error || loading) && (
          <div className="billing-alerts">
            {error && <div className="billing-error-banner">{error}</div>}
            {loading && <div className="billing-loading-banner">Loading billing details…</div>}
          </div>
        )}

        <div className="billing-tabs">
          <button
            className={`billing-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Subscription
          </button>
          <button
            className={`billing-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Billing History
          </button>
        </div>

        <div className="billing-modal-body">
          {activeTab === 'overview' ? (
            <div className="billing-overview">
              <section className="billing-overview-grid">
                <div className="billing-card subscription-card">
                  <div className="billing-card-header">
                    <h3>Current Subscription</h3>
                    {subscription?.status && renderStatusBadge(subscription.status)}
                  </div>

                  {subscription ? (
                    <>
                      <div className="billing-current-plan">
                        <div>
                          <p className="billing-plan-label">Plan</p>
                          <h4 className="billing-plan-name">{currentPlan?.name || subscription.plan_type}</h4>
                        </div>
                        <div className="billing-plan-price">
                          {formatCurrency(currentPlan?.price ?? subscription.amount)}
                          <span className="billing-plan-period">/month</span>
                        </div>
                      </div>

                      <div className="billing-subscription-meta">
                        <div className="meta-item">
                          <span className="meta-label">Trial Ends</span>
                          <span className="meta-value">{formatDate(subscription.trial_end)}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Next Renewal</span>
                          <span className="meta-value">{formatDate(subscription.current_period_end)}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Started</span>
                          <span className="meta-value">{formatDate(subscription.created_at)}</span>
                        </div>
                      </div>

                      <div className="billing-card-actions">
                        <button
                          className="billing-portal-btn"
                          onClick={handleOpenPortal}
                          disabled={portalLoading}
                        >
                          {portalLoading ? 'Opening portal…' : 'Manage Subscription'}
                        </button>
                        <p className="billing-help-text">Manage payment methods, download invoices, or cancel inside Stripe&apos;s customer portal.</p>
                      </div>
                    </>
                  ) : (
                    <div className="billing-empty-subscription">
                      <h4>No active subscription</h4>
                      <p>Select one of the plans below to start your Wrap-X subscription.</p>
                    </div>
                  )}
                </div>

                <div className="billing-card trial-card">
                  <h3>Three-Day Free Trial</h3>
                  <p>Every plan starts with a {trialDays}-day free trial so you can test Wrap-X before you commit.</p>
                  <ul className="billing-trial-list">
                    <li><span>✓</span> Full access to all platform features</li>
                    <li><span>✓</span> Upgrade or cancel anytime in the portal</li>
                    <li><span>✓</span> No hidden fees or overages</li>
                  </ul>
                </div>
              </section>

              <section className="billing-plans-section">
                <div className="billing-plans-header">
                  <div>
                    <h3>Choose Your Plan</h3>
                    <p>Select the wrap capacity that fits your team&apos;s workload.</p>
                  </div>
                </div>

                <div className="billing-plans-grid">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`billing-plan-card ${plan.id === subscription?.plan_type ? 'current' : ''}`}
                    >
                      {plan.id === 'professional' && (
                        <div className="billing-plan-badge">Most Popular</div>
                      )}
                      <div className="billing-plan-header">
                        <h4>{plan.name}</h4>
                        <div className="billing-plan-price">
                          {formatCurrency(plan.price)}
                          <span className="billing-plan-period">/month</span>
                        </div>
                      </div>
                      <ul className="billing-plan-features">
                        <li><span>✓</span>{plan.wraps} {plan.wraps === 1 ? 'Wrap' : 'Wraps'} included</li>
                        <li><span>✓</span>3-Day free trial</li>
                        <li><span>✓</span>Unlimited usage during trial</li>
                        <li><span>✓</span>Access to all platform features</li>
                      </ul>
                      {renderPlanButton(plan)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="billing-history">
              <div className="billing-history-header">
                <div>
                  <h3>Invoice History</h3>
                  <p>Track payments, download invoices, and verify billing status.</p>
                </div>
                <div className="billing-history-actions">
                  <button
                    className="billing-refresh-btn"
                    onClick={loadHistory}
                    disabled={historyLoading}
                  >
                    {historyLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {historyError && <div className="billing-error-banner compact">{historyError}</div>}

              {historyLoading ? (
                <div className="billing-history-loading">Loading recent invoices…</div>
              ) : history.length === 0 ? (
                <div className="billing-history-empty">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3H16C17.1046 3 18 3.89543 18 5V19C18 20.1046 17.1046 21 16 21H8C6.89543 21 6 20.1046 6 19V5C6 3.89543 6.89543 3 8 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 7H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 11H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>No invoices yet. Once you subscribe, invoices will appear here.</p>
                </div>
              ) : (
                <div className="billing-history-table-wrapper">
                  <table className="billing-history-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Billed Period</th>
                        <th>Issued</th>
                        <th>Paid</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <div className="billing-invoice-meta">
                              <span className="invoice-number">{invoice.number || invoice.id}</span>
                              {invoice.plan_name && <span className="invoice-plan">{invoice.plan_name}</span>}
                            </div>
                          </td>
                          <td>{formatCurrency(invoice.amount_paid || invoice.amount_due)}</td>
                          <td>{renderStatusBadge(invoice.status)}</td>
                          <td>{formatPeriod(invoice.period_start, invoice.period_end)}</td>
                          <td>{formatDate(invoice.created_at)}</td>
                          <td>{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</td>
                          <td>
                            <div className="billing-history-actions-inline">
                              {invoice.hosted_invoice_url && (
                                <a
                                  className="billing-link-btn"
                                  href={invoice.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              )}
                              {invoice.invoice_pdf && (
                                <a
                                  className="billing-link-btn"
                                  href={invoice.invoice_pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  PDF

                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillingModal;


