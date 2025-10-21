import React, { useState } from 'react';
import { Calendar, Clock, RefreshCw, Settings } from 'lucide-react';

interface HeaderProps {
  onDateChange: (date: string) => void;
  onTimezoneChange: (timezone: string) => void;
  onRefresh: () => void;
  loading: boolean;
  currentTimezone?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onDateRangeChange, 
  onTimezoneChange, 
  onRefresh, 
  loading,
  currentTimezone 
}) => {
  const [startDate, setStartDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [timezone, setTimezone] = useState('PKT');

  const timezones = [
    { value: 'PKT', label: 'Pakistan Time (PKT)' },
    { value: 'EST', label: 'Eastern Time (EST)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'CET', label: 'Central European Time (CET)' },
    { value: 'JST', label: 'Japan Standard Time (JST)' }
  ];

  const handleDateRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDateRangeChange(startDate, endDate);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimezone = e.target.value;
    setTimezone(newTimezone);
    onTimezoneChange(newTimezone);
  };

  const handleQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange(startStr, endStr);
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>🚀 Frigate Employee Dashboard</h1>
          <p style={{ color: '#6b7280', marginTop: '5px' }}>
            Real-time employee monitoring and analytics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} className={loading ? 'rotating' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <form onSubmit={handleDateRangeSubmit} className="controls">
        <div className="control-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          />
        </div>

        <div className="control-group">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={timezone}
            onChange={handleTimezoneChange}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          {currentTimezone && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              Active: {currentTimezone}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} />
          Apply
        </button>
      </form>

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDateRange(1)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Last 24 Hours
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDateRange(7)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Last 7 Days
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDateRange(30)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Last 30 Days
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
            onDateRangeChange(today, today);
          }}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Today
        </button>
      </div>

    </header>
  );
};

export default Header;
