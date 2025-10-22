import React, { useState } from 'react';
import { X, Eye, AlertTriangle } from 'lucide-react';
import { ViolationData } from '../types/api';

interface ViolationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ViolationData[];
  employeeName: string;
}

export const ViolationsModal: React.FC<ViolationsModalProps> = ({
  isOpen,
  onClose,
  violations,
  employeeName
}) => {
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    timestamp: string;
    camera: string;
  } | null>(null);

  const [selectedThumbnail, setSelectedThumbnail] = useState<{
    url: string;
    timestamp: string;
    camera: string;
  } | null>(null);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Karachi'
    });
  };

  const handleVideoClick = (violation: ViolationData) => {
    if (violation.media.video_url) {
      setSelectedVideo({
        url: violation.media.video_url,
        timestamp: violation.timestamp,
        camera: violation.camera
      });
    } else {
      alert('No video recording available for this violation');
    }
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  const handleThumbnailClick = (violation: ViolationData) => {
    setSelectedThumbnail({
      url: violation.media.thumbnail_url,
      timestamp: violation.timestamp,
      camera: violation.camera
    });
  };

  const closeThumbnailModal = () => {
    setSelectedThumbnail(null);
  };

  // Helper function to get confidence level and color
  const getConfidenceInfo = (confidence: any) => {
    if (!confidence || confidence.score === null || confidence.score === undefined) {
      return { level: 'none', color: '#9ca3af', score: null }; // gray for N/A
    }
    
    const score = confidence.score;
    let level = 'low';
    let color = '#ef4444'; // red
    
    if (score >= 0.9) {
      level = 'high';
      color = '#10b981'; // green
    } else if (score >= 0.7) {
      level = 'medium';
      color = '#f59e0b'; // yellow
    }
    
    return { level, color, score };
  };

  // Helper function to get confidence source label
  const getConfidenceSourceLabel = (source: string) => {
    switch (source) {
      case 'frigate_score': return 'AI Detection';
      case 'frigate_top_score': return 'AI Top Score';
      case 'default_estimate': return 'Estimated';
      default: return 'Unknown';
    }
  };

  return (
    <>
      {/* Main Violations Modal */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="violations-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3>
                <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                Phone Violations - {employeeName}
              </h3>
              <p>{violations.length} violation{violations.length !== 1 ? 's' : ''} found</p>
            </div>
            <button className="modal-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          
          <div className="modal-body violations-table-container">
            {violations.length > 0 ? (
              <table className="violations-table">
                <thead>
                  <tr>
                    <th>Thumbnail</th>
                    <th>Date & Time</th>
                    <th>Camera</th>
                    <th>Zone</th>
                    <th>Confidence</th>
                    <th>Video</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation, index) => (
                    <tr key={index}>
                      <td className="thumbnail-cell">
                        <img 
                          src={violation.media.thumbnail_url} 
                          alt="Violation"
                          className="violation-thumbnail clickable-thumbnail"
                          onClick={() => handleThumbnailClick(violation)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="75"%3E%3Crect fill="%23ddd" width="100" height="75"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </td>
                      <td>
                        <div className="timestamp-info">
                          <div>{formatTimestamp(violation.timestamp)}</div>
                          <small className="relative-time">{violation.timestampRelative}</small>
                        </div>
                      </td>
                      <td>{violation.camera}</td>
                      <td>{violation.zones.length > 0 ? violation.zones.join(', ') : 'N/A'}</td>
                      <td>
                        {violation.media.confidence && violation.media.confidence.score !== null ? (
                          <div className="confidence-display">
                            <span 
                              className="confidence-badge"
                              style={{ backgroundColor: getConfidenceInfo(violation.media.confidence).color }}
                            >
                              {(violation.media.confidence.score * 100).toFixed(0)}%
                            </span>
                            <small className="confidence-source">
                              {getConfidenceSourceLabel(violation.media.confidence.source)}
                            </small>
                          </div>
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </td>
                      <td>
                        {violation.media.video_url ? (
                          <button 
                            className="btn-video"
                            onClick={() => handleVideoClick(violation)}
                          >
                            <Eye size={16} />
                            Watch
                          </button>
                        ) : (
                          <span className="no-video-text">No video</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-violations">
                <AlertTriangle size={48} />
                <p>No violations found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="modal-overlay" onClick={closeVideoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Violation Video - {employeeName}</h3>
                <p>{formatTimestamp(selectedVideo.timestamp)} • {selectedVideo.camera}</p>
              </div>
              <button className="modal-close" onClick={closeVideoModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <video 
                controls 
                autoPlay 
                src={selectedVideo.url}
                className="modal-video"
                onError={() => {
                  alert('Failed to load video. The recording may not be available.');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail Modal */}
      {selectedThumbnail && (
        <div className="modal-overlay" onClick={closeThumbnailModal}>
          <div className="modal-content thumbnail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Violation Image - {employeeName}</h3>
                <p>{formatTimestamp(selectedThumbnail.timestamp)} • {selectedThumbnail.camera}</p>
              </div>
              <button className="modal-close" onClick={closeThumbnailModal}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <img 
                src={selectedThumbnail.url} 
                alt="Violation thumbnail"
                className="modal-thumbnail"
                onError={() => {
                  alert('Failed to load image. The thumbnail may not be available.');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViolationsModal;




