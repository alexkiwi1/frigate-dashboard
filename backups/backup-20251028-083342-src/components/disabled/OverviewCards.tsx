import React from 'react';
import { DashboardData } from '../types/api';
import { Users, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface OverviewCardsProps {
  data: DashboardData | null;
  loading: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="overview-cards">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="overview-card">
            <div className="loading">Loading...</div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overview-cards">
        <div className="overview-card">
          <div className="error">No data available</div>
        </div>
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="overview-cards">
      <div className="overview-card">
        <Users size={32} color="#6b7280" />
        <h3>{overview.total_employees}</h3>
        <p>Total Employees</p>
      </div>
      
      <div className="overview-card positive">
        <Users size={32} color="#10b981" />
        <h3>{overview.active_employees}</h3>
        <p>Active Employees</p>
      </div>
      
      <div className="overview-card negative">
        <AlertTriangle size={32} color="#ef4444" />
        <h3>{overview.total_violations}</h3>
        <p>Total Violations</p>
      </div>
      
      <div className="overview-card">
        <Clock size={32} color="#6b7280" />
        <h3>{overview.total_work_hours.toFixed(1)}h</h3>
        <p>Total Work Hours</p>
      </div>
      
      <div className="overview-card positive">
        <TrendingUp size={32} color="#10b981" />
        <h3>{overview.average_productivity.toFixed(1)}%</h3>
        <p>Avg Productivity</p>
      </div>
    </div>
  );
};

export default OverviewCards;
