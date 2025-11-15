import React from 'react';
import { AnnotationResponse, JSONAnnotation } from '../types';
import './JSONAnnotationDisplay.css';

interface JSONAnnotationDisplayProps {
  annotationData: AnnotationResponse;
  currentFrameIndex?: number;
  className?: string;
}

export const JSONAnnotationDisplay: React.FC<JSONAnnotationDisplayProps> = ({
  annotationData,
  currentFrameIndex = 0,
  className = ''
}) => {
  const currentFrame = annotationData.frames[currentFrameIndex];
  
  // Get all annotations for the current frame
  const annotations = currentFrame?.hazards || currentFrame?.obstacles || currentFrame?.annotations || [];

  // Severity color mapping
  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return '#dc3545'; // Red
      case 'high':
        return '#fd7e14'; // Orange
      case 'medium':
        return '#ffc107'; // Yellow
      case 'low':
        return '#28a745'; // Green
      default:
        return '#6c757d'; // Gray
    }
  };

  const getSeverityIcon = (severity?: string): string => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  return (
    <div className={`json-annotation-display ${className}`}>
      {/* Summary Header */}
      <div className="annotation-header">
        <h3 className="annotation-title">
          {annotationData.domain || 'Analysis'}
        </h3>
        <div className="annotation-meta">
          <span className="frame-indicator">
            Frame {currentFrame?.frame_number || currentFrameIndex + 1} / {annotationData.total_frames}
          </span>
          <span className="timestamp">
            {currentFrame?.timestamp?.toFixed(2) || 0}s
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      {annotationData.summary && (
        <div className="annotation-summary">
          {Object.entries(annotationData.summary).map(([key, value]) => (
            <div key={key} className="summary-stat">
              <span className="stat-label">{key.replace(/_/g, ' ')}:</span>
              <span className="stat-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Frame Annotations */}
      <div className="frame-annotations">
        <h4 className="annotations-subtitle">
          {annotations.length > 0 ? `Detected Issues (${annotations.length})` : 'No issues detected'}
        </h4>
        
        {annotations.length === 0 ? (
          <div className="no-annotations">
            <span className="check-icon">✅</span>
            <p>This frame appears safe</p>
          </div>
        ) : (
          <div className="annotations-list">
            {annotations.map((annotation: JSONAnnotation, index: number) => (
              <div 
                key={annotation.object_id || index} 
                className="annotation-item"
                style={{ borderLeftColor: getSeverityColor(annotation.severity) }}
              >
                {/* Header */}
                <div className="annotation-item-header">
                  <span className="severity-badge" style={{ backgroundColor: getSeverityColor(annotation.severity) }}>
                    {getSeverityIcon(annotation.severity)} {annotation.severity || 'info'}
                  </span>
                  <span className="object-label">{annotation.object_label}</span>
                </div>

                {/* Main Content */}
                <div className="annotation-content">
                  {annotation.violation && (
                    <div className="annotation-field">
                      <strong>Violation:</strong> {annotation.violation}
                    </div>
                  )}
                  
                  {annotation.concern && (
                    <div className="annotation-field">
                      <strong>Concern:</strong> {annotation.concern}
                    </div>
                  )}
                  
                  {annotation.observation && (
                    <div className="annotation-field">
                      <strong>Observation:</strong> {annotation.observation}
                    </div>
                  )}

                  {annotation.osha_citation && (
                    <div className="annotation-field osha-citation">
                      <strong>📋 OSHA:</strong> {annotation.osha_citation}
                    </div>
                  )}

                  {annotation.measurements && Object.keys(annotation.measurements).length > 0 && (
                    <div className="annotation-field measurements">
                      <strong>📏 Measurements:</strong>
                      <div className="measurement-values">
                        {Object.entries(annotation.measurements).map(([key, value]) => (
                          <span key={key} className="measurement-item">
                            {key}: {typeof value === 'number' ? value.toFixed(2) : value}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {annotation.recommendation && (
                    <div className="annotation-field recommendation">
                      <strong>💡 Recommendation:</strong> {annotation.recommendation}
                    </div>
                  )}

                  {annotation.navigation_advice && (
                    <div className="annotation-field navigation">
                      <strong>🧭 Navigation:</strong> {annotation.navigation_advice}
                    </div>
                  )}

                  {annotation.note && (
                    <div className="annotation-field note">
                      <em>{annotation.note}</em>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw JSON Toggle (for debugging) */}
      <details className="raw-json-section">
        <summary>View Raw JSON</summary>
        <pre className="raw-json">
          {JSON.stringify(currentFrame, null, 2)}
        </pre>
      </details>
    </div>
  );
};
