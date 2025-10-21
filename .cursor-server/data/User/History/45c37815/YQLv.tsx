import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import OverviewCards from './components/OverviewCards';
import EmployeeTable from './components/EmployeeTable';
import ViolationsTable from './components/ViolationsTable';
import Charts from './components/Charts';
import EmployeeStatusBoard from './components/EmployeeStatusBoard';
import BreakMonitor from './components/BreakMonitor';
import WorkHoursSummary from './components/WorkHoursSummary';
import apiService from './services/api';
import { 
  DashboardData, 
  WorkHoursResponse, 
  BreakTimeResponse,
  ViolationsResponse, 
  TrendData,
  ApiParams 
} from './types/api';

const App: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [employeeData, setEmployeeData] = useState<WorkHoursResponse | null>(null);
  const [breakData, setBreakData] = useState<BreakTimeResponse | null>(null);
  const [violationsData, setViolationsData] = useState<ViolationsResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<ApiParams>(apiService.getDefaultParams());

  const fetchData = useCallback(async (params: ApiParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const [dashboard, employees, breaks, violations, trends] = await Promise.all([
        apiService.getDashboardData(params),
        apiService.getEmployeeWorkHours(params),
        apiService.getEmployeeBreakTime(params),
        apiService.getCellPhoneViolations(params),
        apiService.getTrendAnalysis(params)
      ]);

      setDashboardData(dashboard);
      setEmployeeData(employees);
      setBreakData(breaks);
      setViolationsData(violations);
      setTrendData(trends);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [currentParams, fetchData]);

  // Initial data load
  useEffect(() => {
    fetchData(currentParams);
  }, [fetchData, currentParams]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchData(currentParams);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentParams, fetchData, loading]);

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => fetchData(currentParams)}
            style={{ marginTop: '10px' }}
          >
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
      />

      <OverviewCards data={dashboardData} loading={loading} />

      {/* Employee Status Board */}
      <EmployeeStatusBoard 
        employees={employeeData?.employees || []} 
        breakData={breakData?.employees || []} 
        loading={loading} 
      />

      {/* Break Monitor */}
      <BreakMonitor 
        breakData={breakData?.employees || []} 
        loading={loading} 
      />

      {/* Work Hours Summary */}
      <WorkHoursSummary 
        employees={employeeData?.employees || []} 
        breakData={breakData?.employees || []} 
        loading={loading} 
      />

      <div className="grid grid-2">
        <EmployeeTable 
          employees={employeeData?.employees || []} 
          loading={loading} 
        />
        
        <ViolationsTable 
          violations={violationsData?.violations || []} 
          loading={loading} 
        />
      </div>

      <Charts 
        trendData={trendData} 
        violationsData={violationsData} 
        loading={loading} 
      />

      {/* Footer */}
      <footer style={{ 
        marginTop: '40px', 
        padding: '20px', 
        textAlign: 'center', 
        color: '#6b7280',
        borderTop: '1px solid #e5e7eb'
      }}>
        <p>
          Frigate Employee Dashboard v1.0.0 | 
          Last updated: {new Date().toLocaleString()} | 
          Auto-refresh: 30s
        </p>
      </footer>
    </div>
  );
};

export default App;
