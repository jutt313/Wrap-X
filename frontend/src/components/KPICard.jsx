import '../styles/KPICard.css';

function KPICard({ title, value, subtitle, color = 'primary', showTimeFilter = false, timeRange, onTimeRangeChange }) {
  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (title.toLowerCase().includes('cost')) {
        return `$${val.toFixed(2)}`;
      }
      if (title.toLowerCase().includes('rate') || title.toLowerCase().includes('success')) {
        return `${val.toFixed(1)}%`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-content">
        <h3 className="kpi-title">{title}</h3>
        <div className="kpi-value">{formatValue(value)}</div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
        {showTimeFilter && (
          <div className="kpi-time-filter">
            <button
              className={timeRange === 'today' ? 'active' : ''}
              onClick={() => onTimeRangeChange('today')}
            >
              Today
            </button>
            <button
              className={timeRange === '7d' ? 'active' : ''}
              onClick={() => onTimeRangeChange('7d')}
            >
              7d
            </button>
            <button
              className={timeRange === '30d' ? 'active' : ''}
              onClick={() => onTimeRangeChange('30d')}
            >
              30d
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default KPICard;

