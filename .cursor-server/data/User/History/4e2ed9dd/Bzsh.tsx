import React from 'react';
import { Clock, Phone, Coffee, User } from 'lucide-react';
import { WorkHoursResponse, BreakTimeResponse, ViolationsResponse } from '../types/api';

interface TimeActivityReportProps {
  workHoursData: WorkHoursResponse | null;
  breakData: BreakTimeResponse | null;
  violationsData: ViolationsResponse | null;
  loading: boolean;
}

const TimeActivityReport: React.FC<TimeActivityReportProps> = ({
  workHoursData,
  breakData,
  violationsData,
  loading
}) => {
  // Helper function to format time duration
  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours} h ${minutes} min`;
  };

  // Helper function to format time from ISO string
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Helper function to format date
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // Helper function to get phone time from violations
  const getPhoneTime = (employeeName: string): string => {
    if (!violationsData?.violations) return '0 sec';
    
    const employeeViolations = violationsData.violations.filter(
      violation => violation.employee_name === employeeName
    );
    
    if (employeeViolations.length === 0) return '0 sec';
    
    // Calculate total phone time (assuming each violation is 1 minute for demo)
    const totalMinutes = employeeViolations.length;
    if (totalMinutes < 1) {
      return `${Math.round(totalMinutes * 60)} sec`;
    }
    return `${totalMinutes} min`;
  };

  // Helper function to get break time for an employee
  const getBreakTime = (employeeName: string): string => {
    if (!breakData?.employees) return '0 min';
    
    const employee = breakData.employees.find(emp => emp.employee_name === employeeName);
    if (!employee) return '0 min';
    
    return formatDuration(employee.total_break_time);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Time & Activity Report</h3>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!workHoursData?.employees || workHoursData.employees.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>Time & Activity Report</h3>
        </div>
        <div className="no-data">
          <p>No employee data available for the selected period.</p>
        </div>
      </div>
    );
  }

  // Get the business date from the first employee's arrival time
  const businessDate = workHoursData.employees[0]?.arrival_time 
    ? formatDate(workHoursData.employees[0].arrival_time)
    : 'N/A';

  return (
    <div className="card">
      <div className="card-header">
        <h3>Time & Activity Report</h3>
        <div className="header-actions">
          <span className="business-date">
            <Clock size={16} />
            Business Date: {businessDate}
          </span>
        </div>
      </div>
      
      <div className="table-container">
        <table className="time-activity-table">
          <thead>
            <tr>
              <th>Business Date</th>
              <th>Employee Name</th>
              <th>Arrival Time</th>
              <th>Departure Time</th>
              <th>Office Time</th>
              <th>Break Time</th>
              <th>Phone Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workHoursData.employees.map((employee, index) => (
              <tr key={index}>
                <td className="business-date-cell">
                  {businessDate}
                </td>
                <td className="employee-name">
                  <div className="employee-info">
                    <User size={16} />
                    {employee.employee_name}
                  </div>
                </td>
                <td className="time-cell">
                  <div className="time-info">
                    <Clock size={14} />
                    {formatTime(employee.arrival_time)}
                  </div>
                </td>
                <td className="time-cell">
                  <div className="time-info">
                    <Clock size={14} />
                    {formatTime(employee.departure_time)}
                  </div>
                </td>
                <td className="duration-cell">
                  <div className="duration-info">
                    <Clock size={14} />
                    {formatDuration(employee.total_work_hours)}
                  </div>
                </td>
                <td className="break-cell">
                  <div className="break-info">
                    <Coffee size={14} />
                    {getBreakTime(employee.employee_name)}
                  </div>
                </td>
                <td className="phone-cell">
                  <div className="phone-info">
                    <Phone size={14} />
                    {getPhoneTime(employee.employee_name)}
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-outline">
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .time-activity-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .time-activity-table th {
          background: #f8fafc;
          color: #374151;
          font-weight: 600;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 2px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .time-activity-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        .time-activity-table tr:hover {
          background: #f9fafb;
        }

        .business-date-cell {
          font-weight: 500;
          color: #6b7280;
        }

        .employee-name {
          font-weight: 500;
        }

        .employee-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .time-cell, .duration-cell, .break-cell, .phone-cell {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .time-info, .duration-info, .break-info, .phone-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .break-info {
          color: #f59e0b;
        }

        .phone-info {
          color: #ef4444;
        }

        .actions-cell {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.75rem;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .btn-outline:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .business-date {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .table-container {
          max-height: 600px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default TimeActivityReport;
