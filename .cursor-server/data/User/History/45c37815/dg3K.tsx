import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TimeActivityReport from './components/TimeActivityReport';
import apiService from './services/api';
import { 
  WorkHoursResponse, 
  BreakTimeResponse,
  ViolationsResponse,
  ApiParams
} from './types/api';

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

  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    const newParams = {
      ...currentParams,
      start_date: startDate,
      end_date: endDate
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

  return (
    <div className="container">
      <Header
        onDateRangeChange={handleDateRangeChange}
        onTimezoneChange={handleTimezoneChange}
        onRefresh={handleRefresh}
        loading={loading}
        currentTimezone={workHoursData?.timezone_info?.abbreviation}
      />

      <TimeActivityReport
        workHoursData={workHoursData}
        breakData={breakData}
        violationsData={violationsData}
        loading={loading}
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