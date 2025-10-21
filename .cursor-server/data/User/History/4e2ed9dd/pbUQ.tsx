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
    if (!violationsData?.violations) return '0 violations';
    
    const employeeViolations = violationsData.violations.filter(
      violation => violation.employee_name === employeeName
    );
    
    if (employeeViolations.length === 0) return '0 violations';
    
    return `${employeeViolations.length} violations`;
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
              <th>Phone Violations</th>
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

    </div>
  );
};

export default TimeActivityReport;
