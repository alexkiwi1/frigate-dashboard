import React from 'react';
import { Violation } from '../../types/api';
import { AlertTriangle, Camera, User, ExternalLink } from 'lucide-react';

interface ViolationsTableProps {
  violations: Violation[];
  loading: boolean;
}

const ViolationsTable: React.FC<ViolationsTableProps> = ({ violations, loading }) => {
  if (loading) {
    return (
      <div className="card">
        <h2>Cell Phone Violations</h2>
        <div className="loading">Loading violations...</div>
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div className="card">
        <h2>Cell Phone Violations</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: '#10b981' }}>
          <AlertTriangle size={48} color="#10b981" />
          <p style={{ marginTop: '10px', fontSize: '18px' }}>No violations found!</p>
          <p style={{ color: '#6b7280' }}>Great job maintaining workplace policies.</p>
        </div>
      </div>
    );
  }

  const getConfidenceClass = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'status absent'; // Red for high confidence violations
      case 'medium':
        return 'status half-day'; // Yellow for medium
      case 'low':
        return 'status partial-day'; // Blue for low
      default:
        return 'status';
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
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
      <h2>Cell Phone Violations</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Employee</th>
              <th>Camera</th>
              <th>Zone</th>
              <th>Confidence</th>
              <th>Media</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((violation, index) => (
              <tr key={index}>
                <td>{formatTime(violation.timestamp)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#6b7280" />
                    {violation.employee_name}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={16} color="#6b7280" />
                    {violation.camera}
                  </div>
                </td>
                <td>{violation.zones.join(', ')}</td>
                <td>
                  <span className={getConfidenceClass(violation.confidence)}>
                    {violation.confidence.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {violation.media_urls.snapshot && (
                      <a
                        href={violation.media_urls.snapshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          color: '#2563eb',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={14} />
                        Snapshot
                      </a>
                    )}
                    {violation.media_urls.video && (
                      <a
                        href={violation.media_urls.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          color: '#2563eb',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={14} />
                        Video
                      </a>
                    )}
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

export default ViolationsTable;
