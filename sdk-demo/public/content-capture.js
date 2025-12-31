/**
 * Content Script for Element Capture
 * 
 * Injected into web pages to enable element selection:
 * - Highlight elements on hover
 * - Capture CSS selectors on click
 * - Support multi-step captures (for modals, dynamic content)
 * - Send captured data back to builder
 */

(() => {
  console.log('🎯 Element capture script loaded');

  let isCapturing = false;
  let currentField = null;
  let highlightedElement = null;
  let overlay = null;
  let infoBox = null;
  let capturedSteps = [];

  // Add CSS for highlighting
  const style = document.createElement('style');
  style.textContent = `
    .scraper-capture-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(16, 185, 129, 0.1) !important;
      z-index: 999998 !important;
      pointer-events: none !important;
    }

    .scraper-capture-highlight {
      outline: 3px solid #10b981 !important;
      outline-offset: 2px !important;
      background: rgba(16, 185, 129, 0.1) !important;
      cursor: crosshair !important;
    }

    .scraper-capture-infobox {
      position: fixed !important;
      background: #1a1a1a !important;
      color: white !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 12px !important;
      z-index: 9999999 !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
      max-width: 300px !important;
      pointer-events: none !important;
    }

    .scraper-capture-infobox strong {
      color: #10b981 !important;
      display: block !important;
      margin-bottom: 4px !important;
    }

    .scraper-capture-infobox code {
      background: #333 !important;
      padding: 3px 6px !important;
      border-radius: 3px !important;
      font-size: 11px !important;
      display: block !important;
      margin-top: 6px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-family: 'Courier New', monospace !important;
    }

    @keyframes pulse-highlight {
      0%, 100% { background: rgba(16, 185, 129, 0.1); }
      50% { background: rgba(16, 185, 129, 0.3); }
    }
  `;
  document.head.appendChild(style);

  // Generate optimal CSS selector
  function getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    // Try class combination
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => 
        c && !c.startsWith('scraper-capture')
      );
      if (classes.length > 0) {
        const classSelector = '.' + classes.slice(0, 2).join('.');
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    // Try data attributes
    for (const attr of element.attributes || []) {
      if (attr.name.startsWith('data-') && attr.value) {
        const attrSelector = `[${attr.name}="${attr.value}"]`;
        if (document.querySelectorAll(attrSelector).length === 1) {
          return attrSelector;
        }
      }
    }

    // Build path-based selector
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 4) {
      let selector = current.nodeName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(/\s+/).filter(c => 
          c && !c.startsWith('scraper-capture')
        );
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }

      if (current.parentNode) {
        const siblings = Array.from(current.parentNode.children);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentNode;
    }

    return path.join(' > ');
  }

  // Generate XPath
  function getXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.nodeName.toLowerCase();
      const pathIndex = index > 1 ? `[${index}]` : '';
      path.unshift(`${tagName}${pathIndex}`);
      
      current = current.parentNode;
      if (path.length >= 5) break;
    }

    return '//' + path.join('/');
  }

  // Extract value from element
  function extractValue(element) {
    if (element.tagName === 'A') {
      return element.href;
    }
    if (element.tagName === 'IMG') {
      return element.src;
    }
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
      return element.value;
    }

    // Check for data attributes
    for (const attr of element.attributes || []) {
      if (attr.name.startsWith('data-') && attr.value) {
        return attr.value;
      }
    }

    return element.textContent?.trim() || '';
  }

  // Create overlay
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'scraper-capture-overlay';
    document.body.appendChild(overlay);
  }

  // Create info box
  function createInfoBox(element, x, y) {
    if (infoBox) {
      infoBox.remove();
    }

    infoBox = document.createElement('div');
    infoBox.className = 'scraper-capture-infobox';
    
    const selector = getSelector(element);
    const value = extractValue(element);
    const tag = element.tagName.toLowerCase();

    infoBox.innerHTML = `
      <strong>🎯 ${tag}</strong>
      <div style="font-size: 11px; color: #ccc; margin-top: 4px;">
        ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '<empty>'}
      </div>
      <code>${selector.length > 50 ? selector.substring(0, 50) + '...' : selector}</code>
    `;

    // Position near cursor but keep on screen
    infoBox.style.left = Math.min(x + 15, window.innerWidth - 320) + 'px';
    infoBox.style.top = Math.min(y + 15, window.innerHeight - 150) + 'px';

    document.body.appendChild(infoBox);
  }

  // Handle mouse move - highlight element
  function handleMouseMove(e) {
    if (!isCapturing) return;

    const element = e.target;
    if (!element || element === overlay || element === infoBox) return;

    // Remove previous highlight
    if (highlightedElement) {
      highlightedElement.classList.remove('scraper-capture-highlight');
    }

    // Highlight current element
    element.classList.add('scraper-capture-highlight');
    highlightedElement = element;

    // Show info box
    createInfoBox(element, e.clientX, e.clientY);
  }

  // Handle click - capture element
  function handleClick(e) {
    if (!isCapturing) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    if (!element || element === overlay || element === infoBox) return;

    const selector = getSelector(element);
    const xpath = getXPath(element);
    const value = extractValue(element);

    // Add to captured steps
    const step = {
      selector,
      xpath,
      value,
      tagName: element.tagName.toLowerCase(),
      timestamp: new Date().toISOString()
    };
    capturedSteps.push(step);

    // Visual feedback
    element.style.animation = 'pulse-highlight 0.5s';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);

    // Check if this is a multi-step capture (modal trigger, etc.)
    const isMultiStep = confirm(`✅ Captured: ${selector}\n\n📋 Captured ${capturedSteps.length} step(s)\n\nCapture another step? (for modals, dynamic content)`);

    if (!isMultiStep) {
      // Send all captured steps
      sendCapturedData();
      stopCapture();
    }
  }

  // Send captured data back to extension
  function sendCapturedData() {
    window.postMessage({
      type: 'ELEMENT_CAPTURED',
      source: 'scraper-builder',
      data: {
        field: currentField,
        selector: capturedSteps[capturedSteps.length - 1]?.selector,
        xpath: capturedSteps[capturedSteps.length - 1]?.xpath,
        value: capturedSteps[capturedSteps.length - 1]?.value,
        steps: capturedSteps
      }
    }, '*');
  }

  // Start capturing
  function startCapture(field) {
    console.log('🎯 Starting capture for field:', field);
    isCapturing = true;
    currentField = field;
    capturedSteps = [];

    createOverlay();

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
  }

  // Stop capturing
  function stopCapture() {
    console.log('🛑 Stopping capture');
    isCapturing = false;
    currentField = null;
    capturedSteps = [];

    if (highlightedElement) {
      highlightedElement.classList.remove('scraper-capture-highlight');
      highlightedElement = null;
    }

    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    if (infoBox) {
      infoBox.remove();
      infoBox = null;
    }

    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
  }

  // Listen for messages from extension
  window.addEventListener('message', (event) => {
    if (event.data.source !== 'scraper-builder-extension') return;

    switch (event.data.type) {
      case 'START_CAPTURE':
        startCapture(event.data.field);
        break;
      case 'STOP_CAPTURE':
        stopCapture();
        break;
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', stopCapture);

  console.log('✅ Element capture script ready');
})();
