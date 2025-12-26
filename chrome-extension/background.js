// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Scraper Builder extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages between content script and popup
  if (message.type === 'ELEMENT_CAPTURED' || message.type === 'CAPTURE_CANCELLED') {
    // Broadcast to all extension pages (popup)
    chrome.runtime.sendMessage(message);
  }
  
  return true;
});
