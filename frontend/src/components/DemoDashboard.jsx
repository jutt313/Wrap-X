import { useState } from 'react';
import KPICard from './KPICard';
import ChartContainer from './ChartContainer';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

function DemoDashboard() {
  const [timeRange] = useState('30d');
  
  // Dummy user data
  const user = {
    name: 'Alex Developer',
    email: 'alex@example.com'
  };

  // Dummy stats
  const stats = {
    total_requests: 15234,
    success_rate: 98.5,
    active_wrapped_apis: 12,
    estimated_cost: 124.50
  };

  // Dummy spending data
  const spendingChartData = [
    { date: 'Nov 10', 'OpenAI': 12, 'Anthropic': 8, 'DeepSeek': 5 },
    { date: 'Nov 11', 'OpenAI': 15, 'Anthropic': 10, 'DeepSeek': 7 },
    { date: 'Nov 12', 'OpenAI': 18, 'Anthropic': 12, 'DeepSeek': 9 },
    { date: 'Nov 13', 'OpenAI': 22, 'Anthropic': 15, 'DeepSeek': 11 },
    { date: 'Nov 14', 'OpenAI': 25, 'Anthropic': 18, 'DeepSeek': 13 },
    { date: 'Nov 15', 'OpenAI': 28, 'Anthropic': 20, 'DeepSeek': 15 },
    { date: 'Nov 16', 'OpenAI': 32, 'Anthropic': 22, 'DeepSeek': 17 }
  ];

  // Dummy success rate data
  const successRateChartData = [
    { date: 'Nov 10', 'Customer Support': 95, 'Legal Research': 97, 'Code Assistant': 98, 'Average': 96.7 },
    { date: 'Nov 11', 'Customer Support': 96, 'Legal Research': 98, 'Code Assistant': 97, 'Average': 97 },
    { date: 'Nov 12', 'Customer Support': 97, 'Legal Research': 98, 'Code Assistant': 99, 'Average': 98 },
    { date: 'Nov 13', 'Customer Support': 98, 'Legal Research': 99, 'Code Assistant': 98, 'Average': 98.3 },
    { date: 'Nov 14', 'Customer Support': 97, 'Legal Research': 98, 'Code Assistant': 99, 'Average': 98 },
    { date: 'Nov 15', 'Customer Support': 98, 'Legal Research': 99, 'Code Assistant': 98, 'Average': 98.3 },
    { date: 'Nov 16', 'Customer Support': 99, 'Legal Research': 98, 'Code Assistant': 99, 'Average': 98.7 }
  ];

  // Dummy cost data
  const costChartData = [
    { date: 'Nov 10', 'Customer Support': 15, 'Legal Research': 12, 'Code Assistant': 8 },
    { date: 'Nov 11', 'Customer Support': 18, 'Legal Research': 14, 'Code Assistant': 10 },
    { date: 'Nov 12', 'Customer Support': 22, 'Legal Research': 16, 'Code Assistant': 12 },
    { date: 'Nov 13', 'Customer Support': 25, 'Legal Research': 18, 'Code Assistant': 14 },
    { date: 'Nov 14', 'Customer Support': 28, 'Legal Research': 20, 'Code Assistant': 16 },
    { date: 'Nov 15', 'Customer Support': 32, 'Legal Research': 22, 'Code Assistant': 18 },
    { date: 'Nov 16', 'Customer Support': 35, 'Legal Research': 25, 'Code Assistant': 20 }
  ];

  // Dummy wrapped APIs
  const wrappedAPIs = [
    {
      id: 1,
      name: 'Customer Support AI',
      provider_name: 'OpenAI GPT-4',
      is_active: true,
      requests_count: 5420,
      success_rate: 98.5,
      cost: 45.20,
      created_at: '2024-10-15T10:30:00Z'
    },
    {
      id: 2,
      name: 'Legal Research Assistant',
      provider_name: 'DeepSeek V3',
      is_active: true,
      requests_count: 3150,
      success_rate: 97.8,
      cost: 28.50,
      created_at: '2024-10-20T14:20:00Z'
    },
    {
      id: 3,
      name: 'Code Assistant Pro',
      provider_name: 'Anthropic Claude',
      is_active: true,
      requests_count: 2890,
      success_rate: 99.2,
      cost: 32.80,
      created_at: '2024-10-25T09:15:00Z'
    },
    {
      id: 4,
      name: 'Content Generator',
      provider_name: 'Google Gemini',
      is_active: true,
      requests_count: 1820,
      success_rate: 96.5,
      cost: 15.40,
      created_at: '2024-11-01T16:45:00Z'
    },
    {
      id: 5,
      name: 'Data Analyzer',
      provider_name: 'Groq Llama',
      is_active: false,
      requests_count: 950,
      success_rate: 94.2,
      cost: 8.90,
      created_at: '2024-11-05T11:30:00Z'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 95) return '#10B981';
    if (rate >= 80) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="dashboard-container light-bottom">
      {/* Background gradient */}
      <div className="dashboard-background">
        <div className="dashboard-dark-top-layer"></div>
        <div className="dashboard-light-bottom-layer"></div>
        <div className="corner-light top-left"></div>
        <div className="corner-light top-right"></div>
        <div className="side-light left"></div>
        <div className="side-light right"></div>
        <div className="dashboard-curve-light"></div>
      </div>

      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <img 
            src="/logo-icon.png" 
            alt="Wrap-X" 
            className="dashboard-logo"
            onLoad={() => {
              console.log('✅ Demo Dashboard logo loaded successfully:', '/logo-icon.png');
              const img = document.querySelector('.dashboard-logo');
              if (img) {
                console.log('Logo dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                console.log('Logo visible:', img.offsetWidth > 0 && img.offsetHeight > 0);
              }
            }}
            onError={(e) => {
              console.error('❌ Demo Dashboard logo failed to load:', '/logo-icon.png');
              console.error('Attempted src:', e.target.src);
            }}
          />
          <div className="dashboard-welcome">
            Welcome, <span className="username">{user.name}</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <button className="wrap-x-button">
            Wrap-X
          </button>
          <div className="demo-notification-icon"></div>
          <div className="demo-profile-icon"></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        <KPICard
          title="Total Requests"
          value={stats.total_requests.toLocaleString()}
          subtitle={timeRange === 'today' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
          showTimeFilter={true}
          timeRange={timeRange}
          color="primary"
        />
        <KPICard
          title="Success Rate"
          value={`${stats.success_rate}%`}
          subtitle="Average success percentage"
          color="success"
        />
        <KPICard
          title="Active Wrapped APIs"
          value={stats.active_wrapped_apis}
          subtitle="Currently enabled APIs"
          color="info"
        />
        <KPICard
          title="Estimated Cost"
          value={`$${stats.estimated_cost}`}
          subtitle="Total spending"
          color="warning"
        />
      </div>

      {/* Graphs */}
      <div className="dashboard-graphs">
        <ChartContainer title="Spending Comparison" loading={false} error={null}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" />
              <YAxis stroke="rgba(255, 255, 255, 0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              />
              <Legend />
              <Bar dataKey="OpenAI" stackId="spending" fill="#6366F1" />
              <Bar dataKey="Anthropic" stackId="spending" fill="#8B5CF6" />
              <Bar dataKey="DeepSeek" stackId="spending" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Success Rate Over Time" loading={false} error={null}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={successRateChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" />
              <YAxis stroke="rgba(255, 255, 255, 0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Customer Support" stroke="#6366F1" strokeWidth={2} />
              <Line type="monotone" dataKey="Legal Research" stroke="#8B5CF6" strokeWidth={2} />
              <Line type="monotone" dataKey="Code Assistant" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="Average" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Cost Over Time" loading={false} error={null}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" />
              <YAxis stroke="rgba(255, 255, 255, 0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="Customer Support" stroke="#6366F1" strokeWidth={2} />
              <Line type="monotone" dataKey="Legal Research" stroke="#8B5CF6" strokeWidth={2} />
              <Line type="monotone" dataKey="Code Assistant" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Wrapped APIs Table */}
      <div className="dashboard-table-container">
        <h3 style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.9)' }}>Wrapped APIs</h3>
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Requests (24h)</th>
              <th>Success Rate</th>
              <th>Cost</th>
              <th>Last Deploy</th>
            </tr>
          </thead>
          <tbody>
            {wrappedAPIs.map((api) => (
              <tr key={api.id}>
                <td>{api.name}</td>
                <td>{api.provider_name}</td>
                <td>
                  <span className={`status-badge ${api.is_active ? 'active' : 'inactive'}`}>
                    {api.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{api.requests_count.toLocaleString()}</td>
                <td style={{ color: getSuccessRateColor(api.success_rate) }}>
                  {api.success_rate.toFixed(1)}%
                </td>
                <td>${api.cost.toFixed(2)}</td>
                <td>{formatDate(api.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DemoDashboard;

