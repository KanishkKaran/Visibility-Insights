// Service worker for Visibility Insights extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize scan count and premium status for new installations
    await chrome.storage.sync.set({
      'visibility_insights_scan_count': 0,
      'visibility_insights_premium': false
    });
    console.log('Extension installed, data initialized');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkPremiumStatus') {
    chrome.storage.sync.get(['visibility_insights_premium'], (result) => {
      sendResponse({isPremium: result.visibility_insights_premium === true});
    });
    return true; // Required for async sendResponse
  }
  
  // Payment verification
  if (message.action === 'verifyPayment') {
    const sessionId = message.sessionId;
    
    // Call the server to verify this payment
    fetch(`https://visibility-insights.com/api/verify-payment?sessionId=${sessionId}`)
      .then(response => response.json())
      .then(data => {
        if (data.premium) {
          // Payment verified, activate premium
          chrome.storage.sync.set({ 'visibility_insights_premium': true });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      })
      .catch(error => {
        console.error('Error verifying payment:', error);
        // For initial setup, we'll allow activation even if verification fails
        // This is temporary code for initial testing - in production, you should remove this fallback
        chrome.storage.sync.set({ 'visibility_insights_premium': true });
        sendResponse({ success: true });
      });
    return true; // Required for async sendResponse
  }
  
  // For debugging purposes - allows manual reset of premium status
  if (message.action === 'resetPremiumStatus') {
    chrome.storage.sync.set({ 'visibility_insights_premium': false }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
  
  // For debugging purposes - allows manual activation of premium status
  if (message.action === 'activatePremium') {
    chrome.storage.sync.set({ 'visibility_insights_premium': true }, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
  
  // Handle scan data (save results after scan)
  if (message.action === 'saveScanResults') {
    chrome.storage.local.set({ 'scanResults': message.data }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving scan results:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Required for async sendResponse
  }
  
  // Get scan results
  if (message.action === 'getScanResults') {
    chrome.storage.local.get(['scanResults'], (result) => {
      sendResponse({ success: true, data: result.scanResults || {} });
    });
    return true; // Required for async sendResponse
  }
});

// Handle installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open onboarding page for new users
    chrome.tabs.create({
      url: 'onboarding.html'
    });
  } else if (details.reason === 'update') {
    // Check if this is a major version update
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    // If major version change (e.g., from 1.x to 2.x), show update page
    if (previousVersion && currentVersion && 
        previousVersion.split('.')[0] !== currentVersion.split('.')[0]) {
      chrome.tabs.create({
        url: 'update.html'
      });
    }
  }
});

// Optional: Set up alarm for periodic tasks (like checking license status)
chrome.alarms.create('checkLicense', { periodInMinutes: 1440 }); // Once per day

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkLicense') {
    // Verify premium status with server (if needed)
    chrome.storage.sync.get(['visibility_insights_premium'], (result) => {
      if (result.visibility_insights_premium === true) {
        // If premium, could verify with server here
        console.log('Premium status check completed');
      }
    });
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // If icon is clicked directly (instead of using popup), open the popup
  chrome.action.openPopup();
});

console.log('Background service worker initialized');