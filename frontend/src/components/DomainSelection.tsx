import React, { useState } from 'react';
import './DomainSelection.css';

interface DomainOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface DomainSelectionProps {
  onDomainSelect: (domain: string, customDescription?: string) => void;
  selectedDomain?: string;
  className?: string;
}

const PREDEFINED_DOMAINS: DomainOption[] = [
  {
    id: 'accessibility',
    name: 'Low Vision Safety & Navigation Assistance',
    description: 'Low vision safety and navigation assistance',
    icon: '♿'
  },
  {
    id: 'construction',
    name: 'Construction Safety',
    description: 'OSHA compliance and workplace hazard detection',
    icon: '🏗️'
  },
  {
    id: 'general',
    name: 'General Insights',
    description: 'Comprehensive object and scene analysis',
    icon: '🔍'
  }
];

export const DomainSelection: React.FC<DomainSelectionProps> = ({
  onDomainSelect,
  selectedDomain,
  className = ''
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleDomainClick = (domainId: string) => {
    if (domainId === 'custom') {
      setShowCustomInput(true);
      return;
    }
    
    onDomainSelect(domainId);
    setShowCustomInput(false);
    setCustomInput('');
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onDomainSelect('custom', customInput.trim());
      setShowCustomInput(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustomInput(false);
    setCustomInput('');
  };

  return (
    <div className={`domain-selection ${className}`}>
      <div className="domain-header">
        <h3>🎯 Analysis Domain</h3>
        <p>Select the type of analysis to perform on your video</p>
      </div>

      <div className="domain-grid">
        {PREDEFINED_DOMAINS.map((domain) => (
          <button
            key={domain.id}
            className={`domain-card ${selectedDomain === domain.id ? 'selected' : ''}`}
            onClick={() => handleDomainClick(domain.id)}
            aria-label={`Select ${domain.name}`}
          >
            <div className="domain-icon">{domain.icon}</div>
            <div className="domain-content">
              <h4 className="domain-name">{domain.name}</h4>
              <p className="domain-description">{domain.description}</p>
            </div>
            {selectedDomain === domain.id && (
              <div className="selected-indicator">✓</div>
            )}
          </button>
        ))}

        {/* Custom domain option */}
        <button
          className={`domain-card custom-card ${
            selectedDomain === 'custom' ? 'selected' : ''
          } ${showCustomInput ? 'active' : ''}`}
          onClick={() => handleDomainClick('custom')}
          aria-label="Custom analysis domain"
        >
          <div className="domain-icon">✏️</div>
          <div className="domain-content">
            <h4 className="domain-name">Custom Domain</h4>
            <p className="domain-description">
              Describe your specific analysis needs
            </p>
          </div>
          {selectedDomain === 'custom' && (
            <div className="selected-indicator">✓</div>
          )}
        </button>
      </div>

      {/* Custom input field */}
      {showCustomInput && (
        <div className="custom-input-section">
          <div className="custom-input-header">
            <h4>Describe your analysis domain:</h4>
            <p>Be specific about what you want the AI to focus on</p>
          </div>
          
          <textarea
            className="custom-input-field"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="e.g., Identify potential safety hazards in a kitchen environment, focusing on sharp objects, hot surfaces, and slip risks..."
            rows={4}
            maxLength={500}
            aria-label="Custom domain description"
            autoFocus
          />
          
          <div className="custom-input-actions">
            <button
              className="custom-btn cancel-btn"
              onClick={handleCustomCancel}
            >
              Cancel
            </button>
            <button
              className="custom-btn submit-btn"
              onClick={handleCustomSubmit}
              disabled={!customInput.trim()}
            >
              Apply Custom Domain
            </button>
          </div>
          
          <div className="character-count">
            {customInput.length}/500 characters
          </div>
        </div>
      )}

      {/* Selected domain summary */}
      {selectedDomain && selectedDomain !== 'custom' && (
        <div className="selected-summary">
          <div className="summary-content">
            <span className="summary-label">Selected Domain:</span>
            <span className="summary-value">
              {PREDEFINED_DOMAINS.find(d => d.id === selectedDomain)?.name}
            </span>
          </div>
        </div>
      )}

      {selectedDomain === 'custom' && customInput && (
        <div className="selected-summary custom-summary">
          <div className="summary-content">
            <span className="summary-label">Custom Domain:</span>
            <span className="summary-value">{customInput}</span>
          </div>
          <button
            className="edit-custom-btn"
            onClick={() => setShowCustomInput(true)}
            aria-label="Edit custom domain"
          >
            ✏️ Edit
          </button>
        </div>
      )}
    </div>
  );
};