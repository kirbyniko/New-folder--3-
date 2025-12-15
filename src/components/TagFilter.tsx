import { useState } from 'react';
import { getAllTags, getTagsByCategory, type EventTag } from '../utils/tagging';
import './TagFilter.css';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tagsByCategory = getTagsByCategory();

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  return (
    <div className="tag-filter">
      <button
        className="tag-filter-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="tag-filter-icon">🏷️</span>
        <span>Filter by Topic</span>
        {selectedTags.length > 0 && (
          <span className="tag-filter-count">{selectedTags.length}</span>
        )}
        <span className="tag-filter-arrow">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="tag-filter-panel">
          <div className="tag-filter-header">
            <h3>Filter Events by Topic</h3>
            {selectedTags.length > 0 && (
              <button className="tag-filter-clear" onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>

          {Object.entries(tagsByCategory).map(([category, tags]) => (
            <div key={category} className="tag-category">
              <h4 className="tag-category-title">{category}</h4>
              <div className="tag-grid">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    className={`tag-button ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      '--tag-color': tag.color,
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                      borderColor: tag.color,
                      color: selectedTags.includes(tag.id) ? 'white' : tag.color
                    } as React.CSSProperties}
                    type="button"
                  >
                    <span className="tag-icon">{tag.icon}</span>
                    <span className="tag-label">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
