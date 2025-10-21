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
  onDateChange, 
  onTimezoneChange, 
  onRefresh, 
  loading,
  currentTimezone 
}) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [timezone, setTimezone] = useState('PKT');

  const timezones = [
    { value: 'PKT', label: 'Pakistan Time (PKT)' },
    { value: 'EST', label: 'Eastern Time (EST)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'CET', label: 'Central European Time (CET)' },
    { value: 'JST', label: 'Japan Standard Time (JST)' }
  ];

  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDateChange(selectedDate);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimezone = e.target.value;
    setTimezone(newTimezone);
    onTimezoneChange(newTimezone);
  };

  const handleQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    onDateChange(dateStr);
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

      <form onSubmit={handleDateSubmit} className="controls">
        <div className="control-group">
          <label htmlFor="selected-date">Select Date</label>
          <input
            id="selected-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
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
          onClick={() => handleQuickDate(1)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Yesterday
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDate(7)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          7 Days Ago
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDate(30)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          30 Days Ago
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleQuickDate(0)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Today
        </button>
      </div>

    </header>
  );
};

export default Header;
