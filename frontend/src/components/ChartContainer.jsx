import '../styles/ChartContainer.css';

function ChartContainer({ title, loading, error, children }) {
  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
      </div>
      <div className="chart-content">
        {loading && <div className="chart-loading">Loading chart data...</div>}
        {error && <div className="chart-error">{error}</div>}
        {!loading && !error && children}
      </div>
    </div>
  );
}

export default ChartContainer;

