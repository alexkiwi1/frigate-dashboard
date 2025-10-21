import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TimeActivityReport from './components/TimeActivityReport';
import EmployeeStatusBoard from './components/EmployeeStatusBoard';
import apiService from './services/api';
import { 
  WorkHoursResponse, 
  BreakTimeResponse,
  ViolationsResponse,
  ApiParams
} from './types/api';

// Timezone mapping utility
const getTimezoneFromAbbreviation = (abbreviation: string): string => {
  const timezoneMap: Record<string, string> = {
    'PKT': 'Asia/Karachi',
    'EST': 'America/New_York',
    'UTC': 'UTC',
    'CET': 'Europe/Paris',
    'JST': 'Asia/Tokyo'
  };
  return timezoneMap[abbreviation] || 'Asia/Karachi';
};

const App: React.FC = () => {
  const [workHoursData, setWorkHoursData] = useState<WorkHoursResponse | null>(null);
  const [breakData, setBreakData] = useState<BreakTimeResponse | null>(null);
  const [violationsData, setViolationsData] = useState<ViolationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<ApiParams>(apiService.getDefaultParams());

  const fetchData = useCallback(async (params: ApiParams) => {
    setLoading(true);
    setError(null);

    try {
      const [workHours, breaks, violations] = await Promise.all([
        apiService.getEmployeeWorkHours(params),
        apiService.getEmployeeBreakTime(params),
        apiService.getCellPhoneViolations(params)
      ]);

      setWorkHoursData(workHours);
      setBreakData(breaks);
      setViolationsData(violations);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentParams);
  }, [fetchData, currentParams]);

  const handleDateChange = useCallback((date: string) => {
    const newParams = {
      ...currentParams,
      start_date: date,
      end_date: date
    };
    setCurrentParams(newParams);
    fetchData(newParams);
  }, [currentParams, fetchData]);

  const handleTimezoneChange = useCallback((timezone: string) => {
    const newParams = {
      ...currentParams,
      timezone
    };
    setCurrentParams(newParams);
    fetchData(newParams);
  }, [currentParams, fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(currentParams);
  }, [fetchData, currentParams]);

  if (error) {
    return (
      <div className="container">
        <div className="error-message">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get the current timezone for display - use user-selected timezone, not API response
  const currentTimezone = currentParams.timezone || 'PKT';
  const timezoneForDisplay = getTimezoneFromAbbreviation(currentTimezone);

  return (
    <div className="container">
      <Header
        onDateChange={handleDateChange}
        onTimezoneChange={handleTimezoneChange}
        onRefresh={handleRefresh}
        loading={loading}
        currentTimezone={currentTimezone}
      />

      <TimeActivityReport
        workHoursData={workHoursData}
        breakData={breakData}
        violationsData={violationsData}
        loading={loading}
        timezone={timezoneForDisplay}
      />

      <EmployeeStatusBoard
        employees={workHoursData?.employees || []}
        breakData={breakData?.employees || []}
        loading={loading}
        timezone={timezoneForDisplay}
      />

      <footer style={{
        marginTop: '40px',
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        Frigate Employee Dashboard © 2025
      </footer>
    </div>
  );
};

export default App;