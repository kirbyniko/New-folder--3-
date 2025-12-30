// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Scraper Builder extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action || message.type);
  
  // When content script captures an element, save it immediately
  if (message.action === 'selectorCaptured') {
    const { fieldId, selector } = message;
    console.log('💾 Background saving captured selector:', fieldId, selector);
    
    // Save to storage
    chrome.storage.local.get(['builderFieldValues'], (result) => {
      const values = result.builderFieldValues || {};
      values[fieldId] = selector;
      chrome.storage.local.set({ 
        builderFieldValues: values,
        capturingField: null,
        lastCapturedField: fieldId,
        lastCapturedSelector: selector
      }, () => {
        console.log('✅ Background saved selector to storage');
        sendResponse({ success: true });
      });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Forward other messages
  if (message.type === 'ELEMENT_CAPTURED' || message.type === 'CAPTURE_CANCELLED') {
    chrome.runtime.sendMessage(message).catch(() => {
      console.log('No popup to receive message, data saved to storage');
    });
  }
  
  return true;
});
