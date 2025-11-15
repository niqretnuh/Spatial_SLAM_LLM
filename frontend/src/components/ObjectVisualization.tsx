import React from 'react';
import { useObjectQuery, downloadJSON } from '@/hooks';
import { DetectedObject } from '@/types';
import './ObjectVisualization.css';

export const ObjectVisualization: React.FC = () => {
  const { data, objects, isLoading, error, queryObject, getAllObjects } =
    useObjectQuery();

  const [selectedClass, setSelectedClass] = React.useState<string>('');

  React.useEffect(() => {
    // Load all objects on mount
    getAllObjects();
  }, [getAllObjects]);

  const objectClasses = ['mug', 'pan', 'knife', 'fire', 'cutting_board'];

  const handleQuery = () => {
    if (selectedClass) {
      queryObject(selectedClass);
    }
  };

  const handleExportObject = (obj: DetectedObject) => {
    downloadJSON(obj, `object-${obj.object_id}-${Date.now()}.json`);
  };

  const handleExportAll = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalObjects: objects.length,
      objects,
    };
    downloadJSON(exportData, `all-objects-${Date.now()}.json`);
  };

  return (
    <div className="object-visualization">
      <div className="viz-header">
        <h2>Object Detection</h2>
        <button className="export-button" onClick={handleExportAll}>
          💾 Export All
        </button>
      </div>

      <div className="query-section">
        <div className="query-controls">
          <select
            className="object-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            aria-label="Select object class"
          >
            <option value="">Select an object...</option>
            {objectClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            className="query-button"
            onClick={handleQuery}
            disabled={!selectedClass || isLoading}
            aria-label="Query object location"
          >
            {isLoading ? '🔍 Searching...' : '🔍 Find Object'}
          </button>
        </div>

        {data && (
          <div className={`query-result ${data.found ? 'found' : 'not-found'}`}>
            <div className="result-header">
              <strong>{data.found ? '✅ Found' : '❌ Not Found'}</strong>
            </div>
            <div className="result-content">
              <p>{data.message}</p>
              {data.object && (
                <div className="object-details">
                  <div className="detail-row">
                    <span className="detail-label">Zone:</span>
                    <span className="detail-value">{data.zone || 'Unknown'}</span>
                  </div>
                  {data.relative_direction && (
                    <div className="detail-row">
                      <span className="detail-label">Direction:</span>
                      <span className="detail-value">{data.relative_direction}</span>
                    </div>
                  )}
                  {data.distance_m !== undefined && (
                    <div className="detail-row">
                      <span className="detail-label">Distance:</span>
                      <span className="detail-value">{data.distance_m.toFixed(2)}m</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Position:</span>
                    <span className="detail-value">
                      ({data.object.last_position.x.toFixed(2)}, 
                      {data.object.last_position.y.toFixed(2)}, 
                      {data.object.last_position.z.toFixed(2)})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="objects-grid">
        <h3>Detected Objects ({objects.length})</h3>
        
        {isLoading && objects.length === 0 && (
          <div className="loading-state">Loading objects...</div>
        )}

        {error && (
          <div className="error-state">{error}</div>
        )}

        {!isLoading && objects.length === 0 && !error && (
          <div className="empty-state">
            No objects detected yet. Start scanning your kitchen!
          </div>
        )}

        <div className="objects-list">
          {objects.map((obj) => (
            <div key={obj.object_id} className="object-card">
              <div className="object-icon">
                {getObjectEmoji(obj.class)}
              </div>
              <div className="object-info">
                <h4>{obj.class.replace('_', ' ')}</h4>
                <div className="object-meta">
                  <span>ID: {obj.object_id.substring(0, 8)}</span>
                  {obj.zone_label && (
                    <span className="zone-badge">{obj.zone_label}</span>
                  )}
                </div>
                <div className="object-position">
                  <small>
                    Position: ({obj.last_position.x.toFixed(2)}, 
                    {obj.last_position.y.toFixed(2)}, 
                    {obj.last_position.z.toFixed(2)})
                  </small>
                </div>
                <div className="object-timestamp">
                  <small>
                    Last seen: {new Date(obj.last_seen_ts).toLocaleString()}
                  </small>
                </div>
              </div>
              <button
                className="export-object-button"
                onClick={() => handleExportObject(obj)}
                aria-label={`Export ${obj.class} data`}
              >
                💾
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getObjectEmoji(className: string): string {
  const emojiMap: Record<string, string> = {
    mug: '☕',
    pan: '🍳',
    knife: '🔪',
    fire: '🔥',
    cutting_board: '📋',
  };
  return emojiMap[className] || '📦';
}
