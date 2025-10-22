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

  // Convert timezone to user-friendly display name
  const getTimezoneDisplayName = (tz: string): string => {
    const timezoneMap: Record<string, string> = {
      'Asia/Karachi': 'Pakistan Time (PKT)',
      'America/New_York': 'Eastern Time (EST)',
      'UTC': 'UTC',
      'Europe/Paris': 'Central European Time (CET)',
      'Asia/Tokyo': 'Japan Standard Time (JST)',
      'PKT': 'Pakistan Time (PKT)',
      'EST': 'Eastern Time (EST)',
      'CET': 'Central European Time (CET)',
      'JST': 'Japan Standard Time (JST)'
    };
    return timezoneMap[tz] || tz;
  };

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
      <div className="header-top">
        <div className="header-title">
          <h1>🚀 Net2apps Employee Dashboard</h1>
          <p className="header-subtitle">
            Real-time employee monitoring and analytics
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={loading}
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
          />
        </div>

        <div className="control-group">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={timezone}
            onChange={handleTimezoneChange}
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary">
          <Calendar size={16} />
          Apply
        </button>
      </form>

      <div className="quick-date-buttons">
        <button
          className="btn btn-secondary btn-small"
          onClick={() => handleQuickDate(1)}
        >
          Yesterday
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => handleQuickDate(7)}
        >
          7 Days Ago
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => handleQuickDate(30)}
        >
          30 Days Ago
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => handleQuickDate(0)}
        >
          Today
        </button>
      </div>
    </header>
  );
};

export default Header;
