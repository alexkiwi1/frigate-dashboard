import React from 'react';
import { Clock, Coffee, MapPin, Activity, Users, TrendingUp } from 'lucide-react';
import { Employee, EmployeeBreakData } from '../types/api';

interface EmployeeStatusBoardProps {
  employees: Employee[];
  breakData: EmployeeBreakData[];
  loading: boolean;
  timezone?: string;
}

const EmployeeStatusBoard: React.FC<EmployeeStatusBoardProps> = ({ 
  employees, 
  breakData, 
  loading,
  timezone = 'Asia/Karachi'
}) => {
  if (loading) {
    return (
      <div className="card">
        <h2>Employee Status Board</h2>
        <div className="loading">Loading employee status...</div>
      </div>
    );
  }

  const getCurrentStatus = (employee: Employee, breakInfo?: EmployeeBreakData) => {
    const now = new Date();
    const arrival = new Date(employee.arrival_time);
    const departure = new Date(employee.departure_time);
    
    // Check if currently on break
    if (breakInfo) {
      const currentBreak = breakInfo.break_sessions.find(session => {
        const breakStart = new Date(session.break_start);
        const breakEnd = new Date(session.break_end);
        return now >= breakStart && now <= breakEnd;
      });
      
      if (currentBreak) {
        return {
          status: 'on_break',
          message: 'On Break',
          color: '#f59e0b',
          icon: Coffee
        };
      }
    }
    
    // Check if currently working
    if (now >= arrival && now <= departure) {
      return {
        status: 'working',
        message: 'Working',
        color: '#10b981',
        icon: Activity
      };
    }
    
    // Check if left for the day
    if (now > departure) {
      return {
        status: 'departed',
        message: 'Departed',
        color: '#6b7280',
        icon: Clock
      };
    }
    
    return {
      status: 'not_arrived',
      message: 'Not Arrived',
      color: '#ef4444',
      icon: Clock
    };
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    } catch {
      return timeString;
    }
  };

  const getBreakInfo = (employeeName: string) => {
    return breakData.find(emp => emp.employee_name === employeeName);
  };

  return (
    <div className="card">
      <h2>Employee Status Board</h2>
      <div className="grid grid-3">
        {employees.map((employee, index) => {
          const breakInfo = getBreakInfo(employee.employee_name);
          const status = getCurrentStatus(employee, breakInfo);
          const StatusIcon = status.icon;
          
          return (
            <div key={index} className="employee-status-card" style={{
              border: `2px solid ${status.color}`,
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: `${status.color}10`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <StatusIcon size={20} color={status.color} />
                <h3 style={{ color: status.color, margin: 0 }}>{employee.employee_name}</h3>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: status.color,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {status.message}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Clock size={14} color="#6b7280" />
                    <span style={{ fontWeight: '500' }}>Arrival:</span>
                  </div>
                  <div style={{ color: '#374151' }}>{formatTime(employee.arrival_time)}</div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Clock size={14} color="#6b7280" />
                    <span style={{ fontWeight: '500' }}>Departure:</span>
                  </div>
                  <div style={{ color: '#374151' }}>{formatTime(employee.departure_time)}</div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <TrendingUp size={14} color="#6b7280" />
                    <span style={{ fontWeight: '500' }}>Productivity:</span>
                  </div>
                  <div style={{ 
                    color: employee.productivity_score >= 80 ? '#10b981' : 
                           employee.productivity_score >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {employee.productivity_score}%
                  </div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Activity size={14} color="#6b7280" />
                    <span style={{ fontWeight: '500' }}>Work Hours:</span>
                  </div>
                  <div style={{ color: '#374151' }}>{employee.total_work_hours.toFixed(1)}h</div>
                </div>
              </div>
              
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <MapPin size={14} color="#6b7280" />
                  <span style={{ fontWeight: '500', fontSize: '12px' }}>Current Zones:</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {employee.zones.slice(0, 2).join(', ')}
                  {employee.zones.length > 2 && ` +${employee.zones.length - 2} more`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeStatusBoard;
