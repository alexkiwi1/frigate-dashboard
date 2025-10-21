import React from 'react';
import { Coffee, Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { EmployeeBreakData } from '../types/api';

interface BreakMonitorProps {
  breakData: EmployeeBreakData[];
  loading: boolean;
}

const BreakMonitor: React.FC<BreakMonitorProps> = ({ breakData, loading }) => {
  if (loading) {
    return (
      <div className="card">
        <h2>Break Monitor</h2>
        <div className="loading">Loading break data...</div>
      </div>
    );
  }

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

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getCurrentBreaks = () => {
    const now = new Date();
    return breakData.filter(employee => {
      return employee.break_sessions.some(session => {
        const breakStart = new Date(session.break_start);
        const breakEnd = new Date(session.break_end);
        return now >= breakStart && now <= breakEnd;
      });
    });
  };

  const getUpcomingBreaks = () => {
    const now = new Date();
    return breakData.filter(employee => {
      return employee.break_sessions.some(session => {
        const breakStart = new Date(session.break_start);
        return breakStart > now;
      });
    });
  };

  const currentBreaks = getCurrentBreaks();
  const upcomingBreaks = getUpcomingBreaks();

  return (
    <div className="card">
      <h2>Break Monitor</h2>
      
      {/* Current Breaks */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#f59e0b',
          marginBottom: '16px'
        }}>
          <Pause size={20} />
          Currently on Break ({currentBreaks.length})
        </h3>
        
        {currentBreaks.length > 0 ? (
          <div className="grid grid-2">
            {currentBreaks.map((employee, index) => {
              const currentBreak = employee.break_sessions.find(session => {
                const now = new Date();
                const breakStart = new Date(session.break_start);
                const breakEnd = new Date(session.break_end);
                return now >= breakStart && now <= breakEnd;
              });
              
              return (
                <div key={index} style={{
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: '#fef3c7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Coffee size={20} color="#f59e0b" />
                    <h4 style={{ margin: 0, color: '#92400e' }}>{employee.employee_name}</h4>
                  </div>
                  
                  {currentBreak && (
                    <div style={{ fontSize: '14px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: '500' }}>Break Started:</span> {formatTime(currentBreak.break_start)}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: '500' }}>Expected End:</span> {formatTime(currentBreak.break_end)}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: '500' }}>Duration:</span> {formatDuration(currentBreak.duration_hours)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            color: '#10b981',
            backgroundColor: '#dcfce7',
            borderRadius: '8px'
          }}>
            <Play size={32} color="#10b981" />
            <p style={{ margin: '8px 0 0 0' }}>No employees currently on break</p>
          </div>
        )}
      </div>

      {/* Break Statistics */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#6b7280',
          marginBottom: '16px'
        }}>
          <RotateCcw size={20} />
          Break Statistics
        </h3>
        
        <div className="grid grid-4">
          {breakData.map((employee, index) => (
            <div key={index} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#f9fafb'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>{employee.employee_name}</h4>
              
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Total Breaks:</span>
                  <span style={{ fontWeight: '500' }}>{employee.total_breaks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Break Time:</span>
                  <span style={{ fontWeight: '500' }}>{formatDuration(employee.total_break_time)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Avg Duration:</span>
                  <span style={{ fontWeight: '500' }}>{formatDuration(employee.average_break_duration)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Longest:</span>
                  <span style={{ fontWeight: '500' }}>{formatDuration(employee.longest_break)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Efficiency:</span>
                  <span style={{ 
                    fontWeight: '500',
                    color: employee.break_efficiency >= 80 ? '#10b981' : 
                           employee.break_efficiency >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {employee.break_efficiency}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Break Sessions Timeline */}
      <div>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#6b7280',
          marginBottom: '16px'
        }}>
          <Clock size={20} />
          Recent Break Sessions
        </h3>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {breakData.map((employee, empIndex) => 
            employee.break_sessions.map((session, sessionIndex) => (
              <div key={`${empIndex}-${sessionIndex}`} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#374151' }}>{employee.employee_name}</h4>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {formatDuration(session.duration_hours)}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>Started:</span> {formatTime(session.break_start)}
                  </div>
                  <div>
                    <span style={{ fontWeight: '500' }}>Ended:</span> {formatTime(session.break_end)}
                  </div>
                  <div>
                    <span style={{ fontWeight: '500' }}>Previous:</span> {session.previous_session.camera}
                  </div>
                  <div>
                    <span style={{ fontWeight: '500' }}>Next:</span> {session.next_session.camera}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakMonitor;
