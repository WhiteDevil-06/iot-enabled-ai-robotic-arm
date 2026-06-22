import { useState } from 'react';
import { Filter, Download, FileSpreadsheet, FileText, Calendar, Clock, BarChart2 } from 'lucide-react';
import { INITIAL_HISTORY, INITIAL_STATS, isHistory, isStats, readStoredJson, writeStoredJson } from '../utils/storage';
import './Reports.css';

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Reports = () => {
  const [historyData] = useState(() => {
    const stored = readStoredJson('sort_history', null, isHistory);
    if (stored !== null) return stored;
    writeStoredJson('sort_history', INITIAL_HISTORY);
    return INITIAL_HISTORY;
  });
  const [stats] = useState(() => readStoredJson('sorting_stats', INITIAL_STATS, isStats));
  const [showFilters, setShowFilters] = useState(false);
  const [fruitFilter, setFruitFilter] = useState('All');
  const [decisionFilter, setDecisionFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredData = historyData.filter((row) => {
    const rowDate = new Date(row.time);
    const matchesFruit = fruitFilter === 'All' || row.fruit === fruitFilter;
    const matchesDecision = decisionFilter === 'All' || row.action === decisionFilter;
    const matchesStart = !startDate || (!Number.isNaN(rowDate.getTime()) && rowDate >= new Date(`${startDate}T00:00:00`));
    const matchesEnd = !endDate || (!Number.isNaN(rowDate.getTime()) && rowDate <= new Date(`${endDate}T23:59:59.999`));
    return matchesFruit && matchesDecision && matchesStart && matchesEnd;
  });

  const correctlySorted = historyData.filter((row) =>
    (row.prediction === 'Fresh' && row.action === 'Accepted') ||
    (row.prediction === 'Rotten' && row.action === 'Rejected')
  ).length;
  const sortingAccuracy = historyData.length ? `${((correctlySorted / historyData.length) * 100).toFixed(2)}%` : '—';

  const applyDatePreset = (preset) => {
    const end = new Date();
    const start = new Date(end);
    if (preset === 'week') {
      const daysSinceMonday = (end.getDay() + 6) % 7;
      start.setDate(end.getDate() - daysSinceMonday);
    } else if (preset === 'month') {
      start.setDate(1);
    }
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
    setShowFilters(true);
  };

  const clearFilters = () => {
    setFruitFilter('All');
    setDecisionFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      window.alert('No matching data available to export.');
      return;
    }
    const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const headers = ['Timestamp', 'Fruit Type', 'Prediction', 'Confidence', 'Action Taken', 'System Response'];
    const rows = filteredData.map((row) => [row.time, row.fruit, row.prediction, row.confidence, row.action, row.response]);
    const blob = new Blob([[headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agrobot_filtered_history.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const hasFilters = fruitFilter !== 'All' || decisionFilter !== 'All' || startDate || endDate;

  return (
    <div className="reports-page container py-6 flex-col gap-8">
      {/* Page Header */}
      <div className="page-header flex justify-between items-center border-b pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History & Reports</h1>
          <p className="text-sm text-secondary mt-1">Review historical classification logs, search batch details, and export reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card card p-6"><span className="text-secondary text-sm font-medium">Total Accepted</span><div className="text-3xl font-bold mt-2">{stats.accepted.toLocaleString()}</div></div>
        <div className="metric-card card p-6"><span className="text-secondary text-sm font-medium">Total Rejected</span><div className="text-3xl font-bold text-error mt-2">{stats.rejected.toLocaleString()}</div></div>
        <div className="metric-card card p-6"><span className="text-secondary text-sm font-medium">Sorting Accuracy</span><div className="text-3xl font-bold mt-2">{sortingAccuracy}</div></div>
        <div className="metric-card card p-6"><span className="text-secondary text-sm font-medium">Fruits Processed</span><div className="text-3xl font-bold mt-2">{stats.currentBatch.toLocaleString()}</div></div>
      </div>

      <div className="card p-0 overflow-hidden report-table-card">
        <div className="report-table-header p-4 border-b flex justify-between items-center">
          <div><h3 className="font-semibold text-lg">Batch History</h3><p className="text-xs text-secondary">Showing {filteredData.length} of {historyData.length} records</p></div>
          <div className="flex gap-3">
            <button className={`btn btn-outline compact-btn ${showFilters ? 'bg-gray-light' : ''}`} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
              <Filter size={16} /> Filter
            </button>
            <button className="btn btn-outline compact-btn" onClick={exportToCSV}><Download size={16} /> Export</button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-bar p-4 bg-gray-light border-b flex gap-6 items-center flex-wrap">
            <label className="filter-field text-sm font-medium text-secondary">Fruit Type
              <select value={fruitFilter} onChange={(event) => setFruitFilter(event.target.value)}>
                <option value="All">All Fruits</option><option value="Apple">Apple</option><option value="Banana">Banana</option><option value="Orange">Orange</option><option value="Guava">Guava</option>
              </select>
            </label>
            <label className="filter-field text-sm font-medium text-secondary">Decision
              <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)}>
                <option value="All">All Decisions</option><option value="Accepted">Accepted</option><option value="Rejected">Rejected</option>
              </select>
            </label>
            <label className="filter-field text-sm font-medium text-secondary">From
              <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="filter-field text-sm font-medium text-secondary">To
              <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            {hasFilters && <button onClick={clearFilters} className="clear-filters text-sm font-medium">Clear Filters</button>}
          </div>
        )}

        <div className="table-responsive">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-gray-light text-secondary text-sm"><th className="p-4 font-medium border-b">Timestamp</th><th className="p-4 font-medium border-b">Fruit Type</th><th className="p-4 font-medium border-b">Prediction</th><th className="p-4 font-medium border-b">Confidence</th><th className="p-4 font-medium border-b">Action Taken</th><th className="p-4 font-medium border-b">System Response</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-secondary">No batch history records match these filters.</td></tr> : filteredData.map((row) => (
                <tr key={row.id} className="border-b table-row hover:bg-gray-light transition-colors"><td className="p-4 text-sm">{row.time}</td><td className="p-4 text-sm font-medium">{row.fruit}</td><td className={`p-4 text-sm font-medium ${row.prediction === 'Fresh' ? 'text-success' : 'text-error'}`}>{row.prediction}</td><td className="p-4 text-sm">{row.confidence}</td><td className={`p-4 text-sm font-medium ${row.action === 'Accepted' ? 'text-success' : 'text-error'}`}>{row.action}</td><td className="p-4 text-sm text-secondary">{row.response}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section aria-labelledby="reports-overview-heading">
        <h3 id="reports-overview-heading" className="font-semibold text-lg mb-4">Reports Overview</h3>
        <div className="grid grid-cols-4 gap-4">
          <button className="card report-action flex items-center justify-between" onClick={() => applyDatePreset('day')}>
            <span className="action-content flex items-center gap-4">
              <span className="action-icon icon-wrapper bg-blue-light text-primary-blue"><Clock size={24} /></span>
              <span className="action-copy flex-col items-start">
                <span className="font-semibold text-sm action-label">Daily Report</span>
                <span className="text-xs text-secondary">Today</span>
              </span>
            </span>
            <span className="text-primary-blue text-sm font-medium">Apply</span>
          </button>
          <button className="card report-action flex items-center justify-between" onClick={() => applyDatePreset('week')}>
            <span className="action-content flex items-center gap-4">
              <span className="action-icon icon-wrapper bg-success-bg text-success"><Calendar size={24} /></span>
              <span className="action-copy flex-col items-start">
                <span className="font-semibold text-sm action-label">Weekly Report</span>
                <span className="text-xs text-secondary">This week</span>
              </span>
            </span>
            <span className="text-primary-blue text-sm font-medium">Apply</span>
          </button>
          <button className="card report-action flex items-center justify-between" onClick={() => applyDatePreset('month')}>
            <span className="action-content flex items-center gap-4">
              <span className="action-icon icon-wrapper bg-purple-light text-purple"><BarChart2 size={24} /></span>
              <span className="action-copy flex-col items-start">
                <span className="font-semibold text-sm action-label">Monthly Report</span>
                <span className="text-xs text-secondary">This month</span>
              </span>
            </span>
            <span className="text-primary-blue text-sm font-medium">Apply</span>
          </button>
          <button className="card report-action flex items-center justify-between border-dashed" onClick={() => setShowFilters(true)}>
            <span className="action-content flex items-center gap-4">
              <span className="action-icon icon-wrapper bg-gray-light text-secondary"><Filter size={24} /></span>
              <span className="action-copy flex-col items-start">
                <span className="font-semibold text-sm action-label">Custom Range</span>
                <span className="text-xs text-secondary">Choose dates above</span>
              </span>
            </span>
            <span className="text-primary-blue text-sm font-medium">Open</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="export-heading">
        <h3 id="export-heading" className="font-semibold text-lg mb-4">Export & Reports</h3>
        <div className="grid grid-cols-3 gap-4">
          <button className="card report-action flex items-center gap-4" onClick={exportToCSV}>
            <FileSpreadsheet size={32} className="text-success" />
            <span className="action-copy flex-col items-start">
              <span className="font-semibold action-label">Export filtered CSV</span>
              <span className="text-xs text-secondary">Download the visible records</span>
            </span>
          </button>
          <button className="card report-action flex items-center gap-4" onClick={() => window.print()}>
            <FileText size={32} className="text-error" />
            <span className="action-copy flex-col items-start">
              <span className="font-semibold action-label">Print / Save PDF</span>
              <span className="text-xs text-secondary">Use your browser’s PDF option</span>
            </span>
          </button>
          <button className="card report-action flex items-center gap-4" onClick={() => setShowFilters(true)}>
            <BarChart2 size={32} className="text-primary-blue" />
            <span className="action-copy flex-col items-start">
              <span className="font-semibold action-label">Build custom report</span>
              <span className="text-xs text-secondary">Set filters and a date range</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Reports;
