import React from 'react';
import { Clock, TrendingUp, Users, Calendar, MapPin, Activity } from 'lucide-react';
import { Employee, EmployeeBreakData } from '../../types/api';

interface WorkHoursSummaryProps {
  employees: Employee[];
  breakData: EmployeeBreakData[];
  loading: boolean;
}

const WorkHoursSummary: React.FC<WorkHoursSummaryProps> = ({ 
  employees, 
  breakData, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="card">
        <h2>Work Hours Summary</h2>
        <div className="loading">Loading work hours data...</div>
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

  // Calculate summary statistics
  const totalWorkHours = employees.reduce((sum, emp) => sum + emp.total_work_hours, 0);
  const averageWorkHours = totalWorkHours / employees.length;
  const totalBreakTime = breakData.reduce((sum, emp) => sum + emp.total_break_time, 0);
  const averageProductivity = employees.reduce((sum, emp) => sum + emp.productivity_score, 0) / employees.length;
  
  // Get all unique zones visited
  const allZones = Array.from(new Set(employees.flatMap(emp => emp.zones)));
  
  // Get all unique cameras used
  const allCameras = Array.from(new Set(employees.flatMap(emp => emp.cameras)));

  // Calculate work efficiency distribution
  const efficiencyRanges = {
    excellent: employees.filter(emp => emp.work_efficiency >= 90).length,
    good: employees.filter(emp => emp.work_efficiency >= 70 && emp.work_efficiency < 90).length,
    average: employees.filter(emp => emp.work_efficiency >= 50 && emp.work_efficiency < 70).length,
    poor: employees.filter(emp => emp.work_efficiency < 50).length
  };

  return (
    <div className="card">
      <h2>Work Hours Summary</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="overview-card">
          <Clock size={32} color="#2563eb" />
          <h3>{formatDuration(totalWorkHours)}</h3>
          <p>Total Work Hours</p>
        </div>
        
        <div className="overview-card">
          <TrendingUp size={32} color="#10b981" />
          <h3>{averageProductivity.toFixed(1)}%</h3>
          <p>Avg Productivity</p>
        </div>
        
        <div className="overview-card">
          <Users size={32} color="#f59e0b" />
          <h3>{employees.length}</h3>
          <p>Active Employees</p>
        </div>
        
        <div className="overview-card">
          <MapPin size={32} color="#8b5cf6" />
          <h3>{allZones.length}</h3>
          <p>Zones Visited</p>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '16px',
            color: '#374151'
          }}>
            <Activity size={20} />
            Work Efficiency Distribution
          </h3>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#10b981', fontWeight: '500' }}>Excellent (90%+)</span>
              <span style={{ fontWeight: 'bold' }}>{efficiencyRanges.excellent}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#22c55e', fontWeight: '500' }}>Good (70-89%)</span>
              <span style={{ fontWeight: 'bold' }}>{efficiencyRanges.good}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f59e0b', fontWeight: '500' }}>Average (50-69%)</span>
              <span style={{ fontWeight: 'bold' }}>{efficiencyRanges.average}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ef4444', fontWeight: '500' }}>Poor (&lt;50%)</span>
              <span style={{ fontWeight: 'bold' }}>{efficiencyRanges.poor}</span>
            </div>
          </div>
        </div>

        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '16px',
            color: '#374151'
          }}>
            <Calendar size={20} />
            Break Analysis
          </h3>
          
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Break Time:</span>
              <span style={{ fontWeight: 'bold' }}>{formatDuration(totalBreakTime)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Avg Break Time:</span>
              <span style={{ fontWeight: 'bold' }}>{formatDuration(totalBreakTime / breakData.length)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Breaks:</span>
              <span style={{ fontWeight: 'bold' }}>{breakData.reduce((sum, emp) => sum + emp.total_breaks, 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Avg Break Duration:</span>
              <span style={{ fontWeight: 'bold' }}>
                {formatDuration(breakData.reduce((sum, emp) => sum + emp.average_break_duration, 0) / breakData.length)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Work Sessions */}
      <div>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '16px',
          color: '#374151'
        }}>
          <Clock size={20} />
          Employee Work Sessions
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Work Hours</th>
                <th>Break Time</th>
                <th>Productivity</th>
                <th>Efficiency</th>
                <th>Zones</th>
                <th>Cameras</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => {
                const breakInfo = breakData.find(emp => emp.employee_name === employee.employee_name);
                
                return (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={16} color="#6b7280" />
                        <strong>{employee.employee_name}</strong>
                      </div>
                    </td>
                    <td>{formatTime(employee.arrival_time)}</td>
                    <td>{formatTime(employee.departure_time)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} color="#6b7280" />
                        {formatDuration(employee.total_work_hours)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} color="#f59e0b" />
                        {breakInfo ? formatDuration(breakInfo.total_break_time) : '0h 0m'}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        color: employee.productivity_score >= 80 ? '#10b981' : 
                               employee.productivity_score >= 60 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {employee.productivity_score}%
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        color: employee.work_efficiency >= 80 ? '#10b981' : 
                               employee.work_efficiency >= 60 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold'
                      }}>
                        {employee.work_efficiency}%
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#6b7280" />
                        {employee.zones.length}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={14} color="#6b7280" />
                        {employee.cameras.length}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WorkHoursSummary;
