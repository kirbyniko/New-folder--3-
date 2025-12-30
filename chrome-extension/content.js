// Content script - injected into web pages
// Handles element selection and highlighting

console.log('🔧 Content script loaded/reloaded at', new Date().toISOString());

let isCapturing = false;
let currentField = null;
let highlightedElement = null;
let captureOverlay = null;
let captureCooldown = false; // Prevent rapid re-triggering

// Create overlay for visual feedback
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'scraper-builder-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 102, 204, 0.1);
    z-index: 999998;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Create highlight element
function createHighlight(element, color = '#0066cc') {
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.className = 'scraper-builder-highlight';
  highlight.style.cssText = `
    position: absolute;
    top: ${rect.top + window.scrollY}px;
    left: ${rect.left + window.scrollX}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 3px solid ${color};
    background: ${color}22;
    z-index: 999999;
    pointer-events: none;
    box-sizing: border-box;
    animation: pulse-highlight 1.5s infinite;
  `;
  document.body.appendChild(highlight);
  return highlight;
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-highlight {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  .scraper-builder-hover-highlight {
    outline: 2px dashed #0066cc !important;
    outline-offset: 2px !important;
  }
  .scraper-builder-info-box {
    position: fixed;
    background: #1a1a1a;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 300px;
    pointer-events: none;
  }
  .scraper-builder-info-box strong {
    color: #00aaff;
    display: block;
    margin-bottom: 4px;
  }
  .scraper-builder-info-box code {
    background: #333;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    display: block;
    margin-top: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
document.head.appendChild(style);

// Generate CSS selector for element
function getSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const path = [];
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => 
        c && !c.startsWith('scraper-builder')
      );
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
        path.unshift(selector);
        break; // Class is usually specific enough
      }
    }
    
    // Add nth-child if needed for specificity
    if (element.parentNode) {
      const siblings = Array.from(element.parentNode.children);
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    element = element.parentNode;
    
    if (path.length >= 3) break; // Keep selector reasonably short
  }
  
  return path.join(' > ');
}

// Get optimal selector - try multiple strategies
function getOptimalSelector(element) {
  // Try ID first
  if (element.id) return `#${element.id}`;
  
  // Try unique class combination
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(/\s+/).filter(c => 
      c && !c.startsWith('scraper-builder')
    );
    if (classes.length > 0) {
      const classSelector = '.' + classes.join('.');
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
      // Try first two classes
      if (classes.length > 1) {
        const twoClassSelector = '.' + classes.slice(0, 2).join('.');
        if (document.querySelectorAll(twoClassSelector).length === 1) {
          return twoClassSelector;
        }
      }
    }
  }
  
  // Try data attributes
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-') && attr.value) {
      const attrSelector = `[${attr.name}="${attr.value}"]`;
      if (document.querySelectorAll(attrSelector).length === 1) {
        return attrSelector;
      }
    }
  }
  
  // Fall back to path-based selector
  return getSelector(element);
}

// Extract value from element
function extractValue(element, field) {
  // Safety check for null/undefined field
  if (!field) return element.textContent?.trim() || null;
  
  // For links, get href
  if (field.includes('link') || field.includes('url')) {
    const link = element.tagName === 'A' ? element : element.querySelector('a');
    if (link) return link.href;
  }
  
  // For images, get src
  if (element.tagName === 'IMG') {
    return element.src;
  }
  
  // Check for data attributes that might contain structured data
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-') && attr.value) {
      return attr.value;
    }
  }
  
  // Get text content
  return element.textContent.trim();
}

// Get attribute if element has meaningful attributes
function getRelevantAttribute(element, field) {
  // Safety check for null/undefined field
  if (!field) return null;
  
  if (element.tagName === 'A' && element.href) return 'href';
  if (element.tagName === 'IMG' && element.src) return 'src';
  if (field.includes('url') || field.includes('link')) return 'href';
  
  // Check for data attributes
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      return attr.name;
    }
  }
  
  return null;
}

// Show info box near cursor
function showInfoBox(element, x, y) {
  const existing = document.querySelector('.scraper-builder-info-box');
  if (existing) existing.remove();
  
  const box = document.createElement('div');
  box.className = 'scraper-builder-info-box';
  
  const selector = getOptimalSelector(element);
  const value = extractValue(element, currentField || '');
  
  // Handle SVG elements where className is an object, not a string
  const className = typeof element.className === 'string' ? element.className : (element.className?.baseVal || '');
  
  box.innerHTML = `
    <strong>🎯 ${currentField || 'Hover'}</strong>
    <div>${element.tagName.toLowerCase()}${className ? '.' + className.split(' ')[0] : ''}</div>
    <code>${selector}</code>
    ${value ? `<div style="margin-top:6px; color:#aaa;">Value: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}</div>` : ''}
  `;
  
  box.style.left = Math.min(x + 15, window.innerWidth - 320) + 'px';
  box.style.top = Math.min(y + 15, window.innerHeight - 150) + 'px';
  
  document.body.appendChild(box);
}

// Mouse move handler
function handleMouseMove(e) {
  if (!isCapturing) return;
  
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (!element || element.classList.contains('scraper-builder-info-box')) return;
  
  // Remove previous hover highlight
  document.querySelectorAll('.scraper-builder-hover-highlight').forEach(el => {
    el.classList.remove('scraper-builder-hover-highlight');
  });
  
  // Add hover highlight
  element.classList.add('scraper-builder-hover-highlight');
  
  // Show info box
  showInfoBox(element, e.clientX, e.clientY);
}

// Click handler
function handleClick(e) {
  console.log('👆 Click detected - isCapturing:', isCapturing, 'captureCooldown:', captureCooldown);
  
  if (!isCapturing || captureCooldown) {
    console.log('❌ Ignoring click - not capturing or in cooldown');
    return;
  }
  
  console.log('✅ Processing click on element:', e.target);
  
  // Immediately disable to prevent double-clicks
  captureCooldown = true;
  
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const element = e.target;
  
  // Save the field name BEFORE stopping (stopCapturing sets currentField to null)
  const fieldId = currentField;
  console.log('💾 Saved field ID:', fieldId);
  
  // Stop capturing FIRST before any async operations
  console.log('🛑 Stopping capture mode...');
  stopCapturing();
  
  // Capture element data
  const selector = getOptimalSelector(element);
  const value = extractValue(element, fieldId);
  const attribute = getRelevantAttribute(element, fieldId);
  
  const capturedData = {
    field: fieldId,
    selector: selector,
    outerHTML: element.outerHTML.substring(0, 500), // Truncate for storage
    value: value,
    attribute: attribute,
    tagName: element.tagName.toLowerCase(),
    className: element.className,
    timestamp: Date.now()
  };
  
  // Special handling for container elements
  if (fieldId === 'event-container' || fieldId === 'bills-container') {
    const children = element.children;
    capturedData.childCount = children.length;
    capturedData.childSelector = children.length > 0 ? getOptimalSelector(children[0]) : null;
  }
  
  // Highlight captured element
  const highlight = createHighlight(element, '#22c55e');
  setTimeout(() => highlight.remove(), 2000);
  
  // Send to background worker (always works, even if popup is closed)
  chrome.runtime.sendMessage({
    action: 'selectorCaptured',
    fieldId: fieldId,
    selector: selector,
    data: capturedData
  }).then(() => {
    console.log('\u2705 Sent to background worker');
    // Show success notification
    showNotification('\u2705 Captured! Selector saved.', 3000);
    // Reset cooldown after a delay
    setTimeout(() => { captureCooldown = false; }, 1000);
  }).catch((error) => {
    console.log('Background worker received message:', error);
    showNotification('\u2705 Captured! Selector saved.', 3000);
    setTimeout(() => { captureCooldown = false; }, 1000);
  });
  
  // Also try to send to popup directly (for when popup is still open)
  chrome.runtime.sendMessage({
    type: 'ELEMENT_CAPTURED',
    data: capturedData
  }).catch(() => console.log('Popup closed'));
}

// Show notification to user
function showNotification(message, duration = 3000) {
  // Remove existing notification
  const existing = document.getElementById('scraper-builder-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'scraper-builder-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #22c55e;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    animation: slideInRight 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// Start capturing mode
function startCapturing(field) {
  console.log('🚀 startCapturing() called with field:', field);
  
  // Stop any existing capture first
  if (isCapturing) {
    console.log('⚠️ Stopping existing capture first');
    stopCapturing();
  }
  
  // Reset cooldown - allow starting new capture from popup button
  captureCooldown = false;
  console.log('✅ Cooldown reset');
  
  console.log('🎯 Starting capture for:', field);
  isCapturing = true;
  currentField = field;
  console.log('📊 State updated - isCapturing:', isCapturing, 'currentField:', currentField);
  
  // Create overlay
  captureOverlay = createOverlay();
  console.log('✅ Overlay created');
  
  // Add event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  console.log('✅ Event listeners attached (mousemove + click with capture phase)');
  
  // Show notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  notification.innerHTML = `
    <strong>🎯 Click element to capture: ${field}</strong>
    <div style="font-size:12px; color:#aaa; margin-top:4px;">Press <kbd style="background:#333;padding:2px 6px;border-radius:3px;">ESC</kbd> to cancel</div>
  `;
  notification.id = 'scraper-builder-notification';
  document.body.appendChild(notification);
}

// Stop capturing mode
function stopCapturing() {
  console.log('\ud83d\uded1 Stopping capture mode');
  
  isCapturing = false;
  currentField = null;
  
  // Remove overlay
  if (captureOverlay) {
    captureOverlay.remove();
    captureOverlay = null;
  }
  
  // Remove ALL event listeners with capture phase
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  
  // Also remove from bubble phase (safety)
  document.removeEventListener('mousemove', handleMouseMove, false);
  document.removeEventListener('click', handleClick, false);
  
  // Remove hover highlights
  document.querySelectorAll('.scraper-builder-hover-highlight').forEach(el => {
    el.classList.remove('scraper-builder-hover-highlight');
  });
  
  // Remove info box
  const infoBox = document.querySelector('.scraper-builder-info-box');
  if (infoBox) infoBox.remove();
  
  // Remove notification
  const notification = document.getElementById('scraper-builder-notification');
  if (notification) notification.remove();
}

// Listen for ESC key to cancel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isCapturing) {
    e.preventDefault();
    e.stopPropagation();
    console.log('\u274c Capture cancelled by ESC key');
    stopCapturing();
    showNotification('\u274c Capture cancelled', 2000);
    chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' }).catch(() => {});
    
    // Reset cooldown
    captureCooldown = false;
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message);
  
  // Handle both old format (type: 'START_CAPTURE') and new format (action: 'startCapture')
  const messageType = message.type || message.action;
  
  if (messageType === 'START_CAPTURE' || messageType === 'startCapture') {
    console.log('🎯 Processing start capture request for field:', message.field || message.fieldId);
    startCapturing(message.field || message.fieldId);
    sendResponse({ success: true });
    return true; // Keep channel open
  } else if (messageType === 'STOP_CAPTURE' || messageType === 'stopCapture') {
    stopCapturing();
    sendResponse({ success: true });
    return true; // Keep channel open
  } else if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      baseUrl: window.location.origin
    });
  } else if (message.type === 'COUNT_ELEMENTS') {
    const count = document.querySelectorAll(message.selector).length;
    sendResponse({ count });
  } else if (message.type === 'HIGHLIGHT_ELEMENTS') {
    // Remove previous highlights
    document.querySelectorAll('.scraper-builder-highlight').forEach(el => el.remove());
    
    // Highlight all matching elements
    const elements = document.querySelectorAll(message.selector);
    elements.forEach(el => {
      createHighlight(el, '#22c55e');
    });
    
    sendResponse({ count: elements.length });
  } else if (message.type === 'DETECT_PUPPETEER') {
    // Detect if page needs Puppeteer
    const needsPuppeteer = detectPuppeteerRequirement();
    sendResponse({ needsPuppeteer });
  }
  
  return true; // Keep channel open for async response
});

// Detect if page requires Puppeteer
function detectPuppeteerRequirement() {
  // Check 1: Is the body nearly empty?
  const bodyText = document.body.innerText.trim();
  const bodyHTML = document.body.innerHTML;
  
  if (bodyText.length < 500 && bodyHTML.includes('id="root"')) {
    // React/Vue app with minimal content
    return true;
  }
  
  if (bodyText.length < 500 && (bodyHTML.includes('ng-app') || bodyHTML.includes('data-ng-'))) {
    // Angular app
    return true;
  }
  
  // Check 2: Look for skeleton loaders or loading indicators
  const skeletonSelectors = [
    '[class*="skeleton"]',
    '[class*="loading"]',
    '[class*="spinner"]',
    '[class*="placeholder"]',
    '.animate-pulse'
  ];
  
  for (const selector of skeletonSelectors) {
    if (document.querySelectorAll(selector).length > 3) {
      return true; // Many loading placeholders = dynamic content
    }
  }
  
  // Check 3: View source comparison (heuristic)
  // If most content is generated, the static HTML will be minimal
  const scripts = document.querySelectorAll('script[src]');
  const hasReact = Array.from(scripts).some(s => s.src.includes('react'));
  const hasVue = Array.from(scripts).some(s => s.src.includes('vue'));
  const hasNext = Array.from(scripts).some(s => s.src.includes('_next'));
  
  if ((hasReact || hasVue || hasNext) && bodyText.length < 1000) {
    return true;
  }
  
  // Check 4: Calendar-specific checks
  const calendarIndicators = document.querySelectorAll(
    '[class*="calendar"], [id*="calendar"], ' +
    '[class*="event"], [data-event], ' +
    '[class*="meeting"], [class*="agenda"]'
  );
  
  if (calendarIndicators.length > 0) {
    // Has calendar elements - check if they have meaningful content
    let hasContent = false;
    calendarIndicators.forEach(el => {
      if (el.innerText.trim().length > 50) {
        hasContent = true;
      }
    });
    
    if (!hasContent && calendarIndicators.length > 5) {
      // Many calendar elements but no content = waiting for JS
      return true;
    }
  }
  
  // Default: probably doesn't need Puppeteer
  return false;
}

console.log('🔧 Scraper Builder content script loaded');
