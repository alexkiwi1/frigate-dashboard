import React, { useState } from 'react';
import { Eye, Clock, Phone, Coffee, User, X } from 'lucide-react';
import { WorkHoursResponse, BreakTimeResponse, ViolationsResponse, ViolationData, DailyViolationsSummaryData } from '../types/api';
import apiService from '../services/api';
import ViolationsModal from './ViolationsModal';

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

  // Violations modal state
  const [violationsModal, setViolationsModal] = useState<{
    isOpen: boolean;
    employeeName: string;
    violations: ViolationData[];
    loading: boolean;
  }>({
    isOpen: false,
    employeeName: '',
    violations: [],
    loading: false
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

  // Helper function to check if arrival time is before 11am
  const isEarlyArrival = (arrivalTime: string): boolean => {
    const date = new Date(arrivalTime);
    const hour = date.getHours();
    return hour < 11; // Before 11am
  };

  // Helper function to get departure status and styling
  const getDepartureStatus = (employee: any) => {
    // Use status field to determine if employee departed
    if (employee.status === 'present') {
      return { 
        text: 'Still at office', 
        color: '#10b981', 
        icon: '🟢',
        confidence: 'none'
      };
    }
    
    const confidence = employee.departure_confidence || 'low';
    const method = employee.departure_method || 'session_end';
    
    if (confidence === 'high') {
      return { 
        text: 'Departed (High Confidence)', 
        color: '#3b82f6', 
        icon: '✓',
        confidence: 'high'
      };
    } else if (confidence === 'medium') {
      return { 
        text: 'Departed (Medium Confidence)', 
        color: '#f59e0b', 
        icon: '~',
        confidence: 'medium'
      };
    } else {
      return { 
        text: 'Departed (Low Confidence)', 
        color: '#ef4444', 
        icon: '?',
        confidence: 'low'
      };
    }
  };

  // Helper function to get arrival status and styling
  const getArrivalStatus = (employee: any) => {
    // Use status field to determine if employee arrived
    if (employee.status === 'absent') {
      return { 
        text: 'No arrival detected', 
        color: '#ef4444', 
        icon: '❌',
        confidence: 'none'
      };
    }
    
    const confidence = employee.arrival_confidence || 'low';
    const method = employee.arrival_method || 'session_start';
    
    if (confidence === 'high') {
      return { 
        text: 'Arrived (High Confidence)', 
        color: '#3b82f6', 
        icon: '✓',
        confidence: 'high'
      };
    } else if (confidence === 'medium') {
      return { 
        text: 'Arrived (Medium Confidence)', 
        color: '#f59e0b', 
        icon: '~',
        confidence: 'medium'
      };
    } else {
      return { 
        text: 'Arrived (Low Confidence)', 
        color: '#ef4444', 
        icon: '?',
        confidence: 'low'
      };
    }
  };

  // Helper function to format arrival time with confidence indicator
  const formatArrivalTime = (employee: any): string => {
    if (employee.status === 'absent') {
      return 'No arrival';
    }
    
    const time = formatTime(employee.arrival_time);
    const status = getArrivalStatus(employee);
    
    return `${time} ${status.icon}`;
  };

  // Helper function to format departure time with confidence indicator
  const formatDepartureTime = (employee: any): string => {
    if (employee.status === 'present') {
      return 'Still at office';
    }
    
    const time = formatTime(employee.departure_time);
    const status = getDepartureStatus(employee);
    
    return `${time} ${status.icon}`;
  };

  // Helper function to get employee status using the new status field
  const getEmployeeStatus = (employee: any) => {
    // Handle false positives first
    if (employee.false_positive_reason) {
      return {
        status: 'filtered',
        text: `Filtered: ${employee.false_positive_reason}`,
        color: '#f59e0b',
        icon: '⚠️'
      };
    }
    
    // Use the new status field from API
    switch (employee.status) {
      case 'absent':
        return {
          status: 'absent',
          text: 'Absent',
          color: '#ef4444',
          icon: '🔴'
        };
      case 'present':
        return {
          status: 'present',
          text: 'Present',
          color: '#10b981',
          icon: '🟢'
        };
      case 'departed':
        return {
          status: 'departed',
          text: 'Departed',
          color: '#3b82f6',
          icon: '✅'
        };
      default:
        return {
          status: 'unknown',
          text: 'Unknown',
          color: '#6b7280',
          icon: '❓'
        };
    }
  };

  // Handle video click
  const handleVideoClick = async (
    employee: any,
    eventType: 'arrival' | 'departure'
  ) => {
    console.log('Video click:', employee.employee_name, eventType);
    
    try {
      // First, try to get video URL from session data (NEW: Use cached URL from API)
      let videoUrl: string | null = null;
      
      if (employee.sessions && employee.sessions.length > 0) {
        // Use the first session's video URL if available
        videoUrl = employee.sessions[0].video_url;
        console.log('Video URL from session data:', videoUrl);
      }
      
      // If no video URL in session data, fall back to API call
      if (!videoUrl) {
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

        console.log('Fetching video via API for:', { camera, timestamp, eventType });
        videoUrl = await apiService.getRecordingAtTimestamp(camera, timestamp, 5);
        console.log('Video URL from API:', videoUrl);
      }
      
      if (videoUrl) {
        setVideoModal({
          isOpen: true,
          videoUrl,
          employeeName: employee.employee_name,
          timestamp: eventType === 'arrival' ? employee.arrival_time : employee.departure_time,
          eventType
        });
        console.log('Video modal opened with URL:', videoUrl);
      } else {
        console.log('No video URL available');
        alert(`No recording found for ${eventType} at this time. The camera may not have been recording at that moment.`);
      }
    } catch (error) {
      console.error('Error loading video:', error);
      alert('Failed to load video recording');
    }
  };

  // Handle violations click - now uses cached data
  const handleViolationsClick = (employee: any) => {
    if (!dailyViolations) {
      return;
    }
    
    // Find employee in the violations data
    const employeeData = dailyViolations.summary.find(emp => emp.employeeName === employee.employee_name);
    
    if (employeeData && employeeData.totalViolations > 0) {
      setViolationsModal({
        isOpen: true,
        employeeName: employee.employee_name,
        violations: employeeData.violations,
        loading: false
      });
    } else {
      // No violations for this employee
      setViolationsModal({
        isOpen: true,
        employeeName: employee.employee_name,
        violations: [],
        loading: false
      });
    }
  };

  // Helper function to get phone time from violations
  const getPhoneTime = (employeeName: string): string => {
    // Since violations are fetched per employee, show a placeholder
    // The actual count will be shown when the violations modal is opened
    return 'Click to view';
  };

  // Simple state for daily violations summary
  const [dailyViolations, setDailyViolations] = useState<DailyViolationsSummaryData | null>(null);
  const [violationsLoading, setViolationsLoading] = useState(false);

  // Fetch all violations for the date range in one call
  const fetchDailyViolations = async () => {
    if (!workHoursData?.period?.start || !workHoursData?.period?.end) {
      return;
    }

    setViolationsLoading(true);
    try {
      const response = await apiService.getDailyViolationsSummary({
        start_date: workHoursData.period.start,
        end_date: workHoursData.period.end
      });
      
      if (response.success) {
        setDailyViolations(response.data);
      }
    } catch (error) {
      console.error('Error fetching daily violations:', error);
    } finally {
      setViolationsLoading(false);
    }
  };

  // Fetch violations when date changes
  React.useEffect(() => {
    if (workHoursData?.period?.start && workHoursData?.period?.end) {
      fetchDailyViolations();
    }
  }, [workHoursData?.period?.start, workHoursData?.period?.end]);

  // Simplified helper function to get phone time from violations
  const getPhoneTimeWithCount = (employeeName: string): string => {
    if (violationsLoading) {
      return 'Loading...';
    }
    
    if (!dailyViolations) {
      return '';
    }
    
    // Find employee in the violations data
    const employeeData = dailyViolations.summary.find(emp => emp.employeeName === employeeName);
    const count = employeeData?.totalViolations || 0;
    
    // Return empty string if no violations, otherwise show count
    return count === 0 ? '' : `${count} violations`;
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

  // Get the business date from the period start date
  const businessDate = workHoursData.period?.start 
    ? formatDate(workHoursData.period.start)
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
              <th>Status</th>
              <th>Desk</th>
              <th>Arrival Time</th>
              <th>Departure Time</th>
              <th>Total Time</th>
              <th>Office Time</th>
              <th>Break Time</th>
              <th>Phone Violations</th>
            </tr>
          </thead>
          <tbody>
            {workHoursData.employees
              .filter(employee => 
                employee.detections && employee.detections.length > 0 && 
                !employee.false_positive_reason && 
                employee.status !== 'absent'
              )
              .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
              .map((employee, index) => (
              <tr key={index}>
                <td className="business-date-cell">
                  {businessDate}
                </td>
                <td className="employee-name">
                  <div className="employee-info">
                    <User size={16} />
                    {employee.employee_name}
                    {employee.false_positive_reason && (
                      <div className="filtered-indicator" style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '2px' }}>
                        ⚠️ Filtered: {employee.false_positive_reason}
                      </div>
                    )}
                  </div>
                </td>
                <td className="status-cell">
                  <div 
                    className="status-indicator"
                    style={{ 
                      color: getEmployeeStatus(employee).color,
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{getEmployeeStatus(employee).icon}</span>
                    <span>{getEmployeeStatus(employee).text}</span>
                  </div>
                </td>
                <td className="desk-cell">
                  <div className="desk-info">
                    <div className="desk-number">
                      {employee.assigned_desk || 'N/A'}
                    </div>
                    {employee.assigned_desk_camera && (
                      <div className="desk-camera">
                        📹 {employee.assigned_desk_camera}
                      </div>
                    )}
                  </div>
                </td>
                <td className="time-cell">
                  <div 
                    className={`time-info clickable ${isEarlyArrival(employee.arrival_time) ? 'early-arrival' : ''} ${getArrivalStatus(employee).confidence !== 'none' ? 'arrival-time' : ''}`}
                    onClick={() => handleVideoClick(employee, 'arrival')}
                    style={{ color: getArrivalStatus(employee).color }}
                  >
                    <Eye size={14} className="video-icon" />
                    {formatArrivalTime(employee)}
                    {isEarlyArrival(employee.arrival_time) && (
                      <span className="camera-adjustment-indicator">📷</span>
                    )}
                    {employee.arrival_method && employee.arrival_method !== 'none' && (
                      <span className="arrival-method-indicator">
                        {employee.arrival_method === 'face_at_desk' ? '👤' : 
                         employee.arrival_method === 'person_at_desk' ? '👥' : 
                         employee.arrival_method === 'scheduled' ? '📅' : '📋'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="time-cell">
                  <div 
                    className={`time-info clickable ${getDepartureStatus(employee).confidence !== 'none' ? 'departure-time' : ''}`}
                    onClick={() => handleVideoClick(employee, 'departure')}
                    style={{ color: getDepartureStatus(employee).color }}
                  >
                    <Eye size={14} className="video-icon" />
                    {formatDepartureTime(employee)}
                    {employee.departure_method && employee.departure_method !== 'none' && (
                      <span className="departure-method-indicator">
                        {employee.departure_method === 'face_at_desk' ? '👤' : 
                         employee.departure_method === 'person_at_desk' ? '👥' : '📋'}
                      </span>
                    )}
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
                  {getPhoneTimeWithCount(employee.employee_name) ? (
                    <div 
                      className="phone-info clickable-violations" 
                      onClick={() => handleViolationsClick(employee)}
                    >
                      <Phone size={14} />
                      {getPhoneTimeWithCount(employee.employee_name)}
                    </div>
                  ) : (
                    <div className="phone-info empty-cell">
                      {/* Empty cell - no violations */}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}

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

      {/* Violations Modal */}
      {!violationsModal.loading && (
        <ViolationsModal
          isOpen={violationsModal.isOpen}
          onClose={() => setViolationsModal({ ...violationsModal, isOpen: false })}
          violations={violationsModal.violations}
          employeeName={violationsModal.employeeName}
        />
      )}

    </div>
  );
};

export default TimeActivityReport;
