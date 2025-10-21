import React, { useState } from 'react';
import { Eye, Clock, Phone, Coffee, User, X } from 'lucide-react';
import { WorkHoursResponse, BreakTimeResponse, ViolationsResponse } from '../types/api';
import apiService from '../services/api';

interface TimeActivityReportProps {
  workHoursData: WorkHoursResponse | null;
  breakData: BreakTimeResponse | null;
  violationsData: ViolationsResponse | null;
  loading: boolean;
  timezone?: string;
}

const TimeActivityReport: React.FC<TimeActivityReportProps> = ({
  workHoursData,
  breakData,
  violationsData,
  loading,
  timezone = 'Asia/Karachi'
}) => {
  // Video modal state
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    videoUrl: string;
    employeeName: string;
    timestamp: string;
    eventType: 'arrival' | 'departure';
  }>({
    isOpen: false,
    videoUrl: '',
    employeeName: '',
    timestamp: '',
    eventType: 'arrival'
  });

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
      hour12: false,
      timeZone: timezone
    });
  };

  // Helper function to format date
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: timezone
    });
  };

  // Handle video click
  const handleVideoClick = async (
    employee: any,
    eventType: 'arrival' | 'departure'
  ) => {
    const timestamp = eventType === 'arrival' 
      ? employee.arrival_timestamp 
      : employee.departure_timestamp;
    
    const camera = employee.cameras && employee.cameras.length > 0 
      ? employee.cameras[0] 
      : null;
    
    if (!camera || !timestamp) {
      alert('Missing camera or timestamp data for this employee');
      return;
    }

    try {
      const videoUrl = await apiService.getRecordingAtTimestamp(camera, timestamp, 5);
      
      if (videoUrl) {
        setVideoModal({
          isOpen: true,
          videoUrl,
          employeeName: employee.employee_name,
          timestamp: eventType === 'arrival' ? employee.arrival_time : employee.departure_time,
          eventType
        });
      } else {
        alert('No recording found for this timestamp');
      }
    } catch (error) {
      console.error('Error loading video:', error);
      alert('Failed to load video recording');
    }
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

  // Debug: Log the data being received
  if (workHoursData.employees && workHoursData.employees.length > 0) {
    const firstEmployee = workHoursData.employees[0];
    console.log('=== FRONTEND DEBUG ===');
    console.log('First employee data:', firstEmployee);
    console.log('Total time:', firstEmployee.total_time);
    console.log('Break time:', firstEmployee.total_break_time);
    console.log('Office time:', firstEmployee.office_time);
    console.log('Formatted break time:', formatDuration(firstEmployee.total_break_time || 0));
    console.log('=== END DEBUG ===');
  }


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
              <th>Total Time</th>
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
                  <div className="time-info clickable" onClick={() => handleVideoClick(employee, 'arrival')}>
                    <Eye size={14} className="video-icon" />
                    {formatTime(employee.arrival_time)}
                  </div>
                </td>
                <td className="time-cell">
                  <div className="time-info clickable" onClick={() => handleVideoClick(employee, 'departure')}>
                    <Eye size={14} className="video-icon" />
                    {formatTime(employee.departure_time)}
                  </div>
                </td>
                <td className="duration-cell">
                  <div className="duration-info total-time">
                    <Clock size={14} />
                    {formatDuration(employee.total_time)}
                  </div>
                </td>
                <td className="duration-cell">
                  <div className="duration-info office-time">
                    <Clock size={14} />
                    {formatDuration(employee.office_time || employee.total_work_hours)}
                  </div>
                </td>
                <td className="break-cell">
                  <div className="break-info">
                    <Coffee size={14} />
                    {formatDuration(employee.total_break_time || 0)}
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

      {/* Video Modal */}
      {videoModal.isOpen && (
        <div className="modal-overlay" onClick={() => setVideoModal({ ...videoModal, isOpen: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{videoModal.employeeName} - {videoModal.eventType === 'arrival' ? 'Arrival' : 'Departure'}</h3>
                <p>{videoModal.timestamp}</p>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setVideoModal({ ...videoModal, isOpen: false })}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <video 
                controls 
                autoPlay 
                src={videoModal.videoUrl}
                className="modal-video"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TimeActivityReport;
