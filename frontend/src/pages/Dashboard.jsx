import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { wrappedApiService } from '../services/wrappedApiService';
import KPICard from '../components/KPICard';
import ChartContainer from '../components/ChartContainer';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationDropdown from '../components/NotificationDropdown';
import CreateWrapModal from '../components/CreateWrapModal';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCreateWrap, setShowCreateWrap] = useState(false);
  
  // State for KPI stats
  const [stats, setStats] = useState({
    total_requests: 0,
    success_rate: 0,
    active_wrapped_apis: 0,
    estimated_cost: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  
  // State for graphs
  const [spendingData, setSpendingData] = useState({ dates: [], datasets: [] });
  const [spendingLoading, setSpendingLoading] = useState(true);
  const [spendingError, setSpendingError] = useState(null);
  
  const [successRateData, setSuccessRateData] = useState({ dates: [], datasets: [], averages: [] });
  const [successRateLoading, setSuccessRateLoading] = useState(true);
  const [successRateError, setSuccessRateError] = useState(null);
  
  const [costData, setCostData] = useState({ dates: [], datasets: [], totals: [] });
  const [costLoading, setCostLoading] = useState(true);
  const [costError, setCostError] = useState(null);
  
  // State for wrapped APIs table
  const [wrappedAPIs, setWrappedAPIs] = useState([]);
  const [apisLoading, setApisLoading] = useState(true);
  const [apisError, setApisError] = useState(null);

  // Load dashboard stats
  useEffect(() => {
    loadStats();
  }, [timeRange]);

  // Load graph data
  useEffect(() => {
    loadGraphs();
  }, []);

  // Load wrapped APIs
  useEffect(() => {
    loadWrappedAPIs();
  }, []);

  // Debug: Log logo path on mount
  useEffect(() => {
    console.log('🔍 Dashboard mounted - checking logo path:', '/logo-icon.png');
    console.log('Base URL:', window.location.origin);
    console.log('Full logo URL would be:', window.location.origin + '/logo-icon.png');
    
    // Try to fetch the logo to see if it exists
    fetch('/logo-icon.png')
      .then(res => {
        if (res.ok) {
          console.log('✅ Logo file exists and is accessible (status:', res.status, ')');
          console.log('Content-Type:', res.headers.get('content-type'));
        } else {
          console.error('❌ Logo file returned status:', res.status, res.statusText);
        }
      })
      .catch(err => {
        console.error('❌ Error fetching logo:', err);
      });
  }, []);

  // Fixed lighting: subtle top-corner glows + bottom center light (no scroll switching)

  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await dashboardService.getDashboardStats(timeRange);
      setStats(data);
    } catch (error) {
      setStatsError(error.message || 'Failed to load statistics');
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadGraphs = async () => {
    // Load spending graph
    setSpendingLoading(true);
    try {
      const spending = await dashboardService.getSpendingGraph('7d');
      setSpendingData(spending);
    } catch (error) {
      setSpendingError(error.message || 'Failed to load spending data');
      console.error('Error loading spending graph:', error);
    } finally {
      setSpendingLoading(false);
    }

    // Load success rate graph
    setSuccessRateLoading(true);
    try {
      const successRate = await dashboardService.getSuccessRateGraph('7d');
      setSuccessRateData(successRate);
    } catch (error) {
      setSuccessRateError(error.message || 'Failed to load success rate data');
      console.error('Error loading success rate graph:', error);
    } finally {
      setSuccessRateLoading(false);
    }

    // Load cost graph
    setCostLoading(true);
    try {
      const cost = await dashboardService.getCostGraph('7d');
      setCostData(cost);
    } catch (error) {
      setCostError(error.message || 'Failed to load cost data');
      console.error('Error loading cost graph:', error);
    } finally {
      setCostLoading(false);
    }
  };

  const loadWrappedAPIs = async () => {
    setApisLoading(true);
    setApisError(null);
    try {
      const data = await dashboardService.getWrappedAPIs();
      setWrappedAPIs(data);
    } catch (error) {
      setApisError(error.message || 'Failed to load wrapped APIs');
      console.error('Error loading wrapped APIs:', error);
    } finally {
      setApisLoading(false);
    }
  };

  // Transform data for recharts
  const transformSpendingData = () => {
    if (!spendingData.dates || spendingData.dates.length === 0) return [];
    
    return spendingData.dates.map((date, index) => {
      const item = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      spendingData.datasets.forEach(dataset => {
        item[dataset.name] = dataset.data[index] || 0;
      });
      return item;
    });
  };

  const transformSuccessRateData = () => {
    if (!successRateData.dates || successRateData.dates.length === 0) return [];
    
    return successRateData.dates.map((date, index) => {
      const item = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      successRateData.datasets.forEach(dataset => {
        item[dataset.name] = dataset.data[index] || 0;
      });
      if (successRateData.averages && successRateData.averages.length > index) {
        item['Average'] = successRateData.averages[index];
      }
      return item;
    });
  };

  const transformCostData = () => {
    if (!costData.dates || costData.dates.length === 0) return [];
    
    return costData.dates.map((date, index) => {
      const item = { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
      costData.datasets.forEach(dataset => {
        item[dataset.name] = dataset.data[index] || 0;
      });
      return item;
    });
  };

  const handleAPIClick = (wrappedApiId) => {
    navigate(`/chat/${wrappedApiId}`);
  };

  const handleDeleteAPI = async (e, apiId, apiName) => {
    e.stopPropagation(); // Prevent row click
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${apiName}"?\n\nThis action cannot be undone and will delete all associated data including:\n- Configuration\n- API Keys\n- Chat History\n- Logs`
    );
    
    if (!confirmed) return;
    
    try {
      await wrappedApiService.deleteWrappedAPI(apiId);
      // Reload the wrapped APIs list
      await loadWrappedAPIs();
      // Also reload stats to update counts
      await loadStats();
    } catch (error) {
      console.error('Error deleting wrapped API:', error);
      alert(`Failed to delete "${apiName}". Please try again.`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 95) return '#10B981';
    if (rate >= 80) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className={"dashboard-container light-bottom"}>
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
              console.log('✅ Dashboard logo loaded successfully:', '/logo-icon.png');
              const img = document.querySelector('.dashboard-logo');
              if (img) {
                console.log('Logo dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                console.log('Logo visible:', img.offsetWidth > 0 && img.offsetHeight > 0);
                console.log('Logo display style:', window.getComputedStyle(img).display);
                console.log('Logo visibility:', window.getComputedStyle(img).visibility);
              }
            }}
            onError={(e) => {
              console.error('❌ Dashboard logo failed to load:', '/logo-icon.png');
              console.error('Error event:', e);
              console.error('Image element:', e.target);
              console.error('Attempted src:', e.target.src);
            }}
          />
          <div className="dashboard-welcome">
            Welcome, <span className="username">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
          </div>
        </div>
        <div className="dashboard-header-right">
          <button className="wrap-x-button" onClick={() => setShowCreateWrap(true)}>
            Wrap-X
          </button>
          <NotificationDropdown />
          <ProfileDropdown user={user} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        <KPICard
          title="Total Requests"
          value={statsLoading ? '...' : stats.total_requests}
          subtitle={timeRange === 'today' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
          showTimeFilter={true}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          color="primary"
        />
        <KPICard
          title="Success Rate"
          value={statsLoading ? '...' : stats.success_rate}
          subtitle="Average success percentage"
          color="success"
        />
        <KPICard
          title="Active Wrapped APIs"
          value={statsLoading ? '...' : stats.active_wrapped_apis}
          subtitle="Currently enabled APIs"
          color="info"
        />
        <KPICard
          title="Estimated Cost"
          value={statsLoading ? '...' : stats.estimated_cost}
          subtitle="Total spending"
          color="warning"
        />
      </div>

      {/* Graphs */}
      <div className="dashboard-graphs">
        <ChartContainer
          title="Spending Comparison"
          loading={spendingLoading}
          error={spendingError}
        >
          {spendingData.datasets.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transformSpendingData()}>
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
                {spendingData.datasets.map((dataset, index) => (
                  <Bar 
                    key={dataset.name}
                    dataKey={dataset.name} 
                    stackId="spending"
                    fill={`hsl(${index * 60}, 70%, 60%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No spending data available</div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Success Rate Over Time"
          loading={successRateLoading}
          error={successRateError}
        >
          {successRateData.datasets.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transformSuccessRateData()}>
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
                {successRateData.datasets.map((dataset, index) => (
                  <Line 
                    key={dataset.name}
                    type="monotone" 
                    dataKey={dataset.name}
                    stroke={`hsl(${index * 60}, 70%, 60%)`}
                    strokeWidth={2}
                  />
                ))}
                {successRateData.averages && successRateData.averages.length > 0 && (
                  <Line 
                    type="monotone" 
                    dataKey="Average"
                    stroke="#6366F1"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No success rate data available</div>
          )}
        </ChartContainer>

        <ChartContainer
          title="Cost Over Time"
          loading={costLoading}
          error={costError}
        >
          {costData.datasets.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transformCostData()}>
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
                {costData.datasets.map((dataset, index) => (
                  <Line 
                    key={dataset.name}
                    type="monotone" 
                    dataKey={dataset.name}
                    stroke={`hsl(${index * 60}, 70%, 60%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No cost data available</div>
          )}
        </ChartContainer>
      </div>

      {/* Wrapped APIs Table */}
      <div className="dashboard-table-container">
        <h3 style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.9)' }}>Wrapped APIs</h3>
        {apisLoading ? (
          <div className="empty-state">Loading wrapped APIs...</div>
        ) : apisError ? (
          <div className="empty-state" style={{ color: '#EF4444' }}>{apisError}</div>
        ) : wrappedAPIs.length === 0 ? (
          <div className="empty-state">No wrapped APIs yet. Create your first wrapped API to get started!</div>
        ) : (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wrappedAPIs.map((api) => (
                <tr key={api.id} onClick={() => handleAPIClick(api.id)}>
                  <td>{api.name}</td>
                  <td>{api.provider_name || 'N/A'}</td>
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
                  <td>{formatDate(api.updated_at || api.created_at)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="dashboard-delete-button"
                      onClick={(e) => handleDeleteAPI(e, api.id, api.name)}
                      title="Delete wrapped API"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11V17M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateWrapModal 
        isOpen={showCreateWrap} 
        onClose={() => setShowCreateWrap(false)} 
      />
    </div>
  );
}

export default Dashboard;
