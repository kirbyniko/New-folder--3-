import { useState } from 'react';
import { TAG_DEFINITIONS } from '../utils/tagging';
import './FilterBar.css';

interface FilterBarProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function FilterBar({ selectedTags, onTagsChange }: FilterBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(t => t !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  return (
    <div className={`filter-bar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="filter-bar-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="filter-bar-title">
          <span className="filter-icon">🏷️</span>
          <span>Filter by Topic</span>
          {selectedTags.length > 0 && (
            <span className="filter-count">{selectedTags.length} selected</span>
          )}
        </div>
        <button className="filter-toggle-button">
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="filter-bar-content">
          <div className="filter-actions">
            {selectedTags.length > 0 && (
              <button className="clear-filters-button" onClick={handleClearAll}>
                Clear All
              </button>
            )}
          </div>
          <div className="filter-tags-container">
            {Object.values(TAG_DEFINITIONS).map(tag => (
              <button
                key={tag.id}
                className={`filter-tag ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => handleToggleTag(tag.id)}
                style={{
                  borderColor: selectedTags.includes(tag.id) ? tag.color : '#e5e7eb',
                  backgroundColor: selectedTags.includes(tag.id) ? `${tag.color}15` : 'white'
                }}
              >
                <span className="tag-icon">{tag.icon}</span>
                <span className="tag-label">{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
