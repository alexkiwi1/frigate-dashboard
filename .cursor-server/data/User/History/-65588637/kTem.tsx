import React from 'react';
import { Employee } from '../types/api';
import { Clock, MapPin, Activity, AlertCircle } from 'lucide-react';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, loading }) => {
  if (loading) {
    return (
      <div className="card">
        <h2>Employee Work Hours</h2>
        <div className="loading">Loading employee data...</div>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="card">
        <h2>Employee Work Hours</h2>
        <div className="error">No employee data available</div>
      </div>
    );
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'status present';
      case 'absent':
        return 'status absent';
      case 'half_day':
        return 'status half-day';
      case 'partial_day':
        return 'status partial-day';
      default:
        return 'status';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="card">
      <h2>Employee Work Hours</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Work Hours</th>
              <th>Arrival</th>
              <th>Departure</th>
              <th>Productivity</th>
              <th>Activity</th>
              <th>Zones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee, index) => (
              <tr key={index}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} color="#6b7280" />
                    <strong>{employee.employee_name}</strong>
                  </div>
                </td>
                <td>
                  <span className={getStatusClass(employee.attendance_status)}>
                    {employee.attendance_status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} color="#6b7280" />
                    {employee.total_work_hours.toFixed(1)}h
                  </div>
                </td>
                <td>{formatTime(employee.arrival_time)}</td>
                <td>{formatTime(employee.departure_time)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ 
                      color: employee.productivity_score >= 80 ? '#10b981' : 
                             employee.productivity_score >= 60 ? '#f59e0b' : '#ef4444'
                    }}>
                      {employee.productivity_score}%
                    </span>
                  </div>
                </td>
                <td>{employee.total_activity}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="#6b7280" />
                    {employee.zones.slice(0, 2).join(', ')}
                    {employee.zones.length > 2 && ` +${employee.zones.length - 2}`}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;
