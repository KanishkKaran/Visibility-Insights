// premium.js - Handles premium features and tracking
const PREMIUM_KEY = 'visibility_insights_premium';
const SCAN_COUNT_KEY = 'visibility_insights_scan_count';
const MAX_FREE_SCANS = 3;
const PAYMENT_SITE_URL = 'https://visibility-insights.com/payment';

// Check if user has premium access
async function hasPremiumAccess() {
  try {
    const result = await chrome.storage.sync.get([PREMIUM_KEY]);
    return result[PREMIUM_KEY] === true;
  } catch (error) {
    console.error("Error checking premium access:", error);
    return false;
  }
}

// Get remaining free scans
async function getRemainingScans() {
  try {
    const result = await chrome.storage.sync.get([SCAN_COUNT_KEY]);
    const usedScans = result[SCAN_COUNT_KEY] || 0;
    const remaining = Math.max(0, MAX_FREE_SCANS - usedScans);
    return remaining;
  } catch (error) {
    console.error("Error getting remaining scans:", error);
    return MAX_FREE_SCANS; // Default to max scans if there's an error
  }
}

// Record a scan
async function recordScan() {
  try {
    const isPremium = await hasPremiumAccess();
    if (isPremium) {
      return true; // Premium users don't need scan counting
    }
    
    const result = await chrome.storage.sync.get([SCAN_COUNT_KEY]);
    const currentCount = result[SCAN_COUNT_KEY] || 0;
    await chrome.storage.sync.set({ [SCAN_COUNT_KEY]: currentCount + 1 });
    return currentCount < MAX_FREE_SCANS;
  } catch (error) {
    console.error("Error recording scan:", error);
    return true; // Allow scan if there's an error
  }
}

// Activate premium
async function activatePremium() {
  try {
    await chrome.storage.sync.set({ [PREMIUM_KEY]: true });
    updatePremiumUI();
    return true;
  } catch (error) {
    console.error("Error activating premium:", error);
    return false;
  }
}

// Reset scan count (for testing purposes)
async function resetScanCount() {
  try {
    await chrome.storage.sync.set({ [SCAN_COUNT_KEY]: 0 });
    return true;
  } catch (error) {
    console.error("Error resetting scan count:", error);
    return false;
  }
}

// Verify license key
async function verifyLicenseKey(licenseKey) {
  // Valid license key formats
  // For demonstration, accept any key starting with VI- and at least 8 chars
  const isValid = licenseKey && 
                  licenseKey.startsWith('VI-') && 
                  licenseKey.length >= 8;
  
  if (isValid) {
    // Activate premium
    await activatePremium();
    return true;
  }
  
  return false;
}

// Update UI based on premium status
async function updatePremiumUI() {
  try {
    const isPremium = await hasPremiumAccess();
    const remainingScans = await getRemainingScans();
    
    const premiumBadges = document.querySelectorAll('.premium-badge');
    const premiumButtons = document.querySelectorAll('.premium-btn');
    const scanLimitMessages = document.querySelectorAll('.scan-limit-message');
    
    // Update premium badges visibility
    premiumBadges.forEach(badge => {
      badge.style.display = isPremium ? 'inline-flex' : 'none';
    });
    
    // Update premium buttons
    premiumButtons.forEach(button => {
      if (isPremium) {
        button.innerHTML = '<i class="bi bi-star-fill"></i> Premium Active';
        button.disabled = true;
        button.classList.add('premium-active');
      } else {
        button.innerHTML = '<i class="bi bi-star-fill"></i> Upgrade to Premium';
        button.disabled = false;
        button.classList.remove('premium-active');
      }
    });
    
    // Update scan limit messages
    scanLimitMessages.forEach(message => {
      if (isPremium) {
        message.style.display = 'none';
      } else {
        message.style.display = 'block';
        message.textContent = `${remainingScans} of ${MAX_FREE_SCANS} free scans remaining`;
      }
    });
    
    // Check if we should show the premium overlay
    const premiumOverlay = document.getElementById('premium-overlay');
    if (premiumOverlay && !isPremium && remainingScans <= 0) {
      premiumOverlay.style.display = 'flex';
    }
  } catch (error) {
    console.error("Error updating premium UI:", error);
  }
}

// Initialize premium feature handlers
function initPremiumFeatures() {
  try {
    // Add event listeners to premium buttons
    document.querySelectorAll('.premium-btn').forEach(button => {
      if (!button.classList.contains('premium-active')) {
        button.addEventListener('click', redirectToPaymentSite);
      }
    });
    
    // Add license form handler if it exists
    const licenseForm = document.getElementById('license-form');
    if (licenseForm) {
      licenseForm.addEventListener('submit', handleLicenseSubmission);
    }
    
    // Add development activation button
    const devActivateBtn = document.getElementById('dev-activate');
    if (devActivateBtn) {
      devActivateBtn.addEventListener('click', () => {
        activatePremium();
        showNotification('Premium activated for development!', 'success');
      });
    }
    
    // Initialize UI
    updatePremiumUI();
  } catch (error) {
    console.error("Error initializing premium features:", error);
  }
}

// Redirect to payment site
function redirectToPaymentSite() {
  // Generate a unique ID for this user session
  const sessionId = 'si-' + Date.now();
  
  // Get the extension ID for the return URL
  const extensionId = chrome.runtime.id;
  
  // Create the return URL for your payment site to redirect back to
  const returnUrl = `chrome-extension://${extensionId}/premium-return.html`;
  
  // Open the payment site in a new tab with session ID and return URL
  chrome.tabs.create({ 
    url: `${PAYMENT_SITE_URL}?session=${sessionId}&return_url=${encodeURIComponent(returnUrl)}` 
  });
  
  // Close the popup overlay if it's open
  const premiumOverlay = document.getElementById('premium-overlay');
  if (premiumOverlay) {
    premiumOverlay.style.display = 'none';
  }
}

// Handle license key submission
async function handleLicenseSubmission(event) {
  event.preventDefault();
  
  // Get input and status elements
  const licenseInput = document.getElementById('license-key');
  const statusElement = document.getElementById('license-status');
  
  if (!licenseInput || !statusElement) return;
  
  const licenseKey = licenseInput.value.trim();
  
  if (!licenseKey) {
    statusElement.textContent = 'Please enter a license key';
    statusElement.className = 'error-message';
    return;
  }
  
  statusElement.textContent = 'Verifying license...';
  statusElement.className = 'info-message';
  
  try {
    const isValid = await verifyLicenseKey(licenseKey);
    
    if (isValid) {
      statusElement.textContent = 'License verified! Premium features activated.';
      statusElement.className = 'success-message';
      
      showNotification('Premium features activated successfully!', 'success');
    } else {
      statusElement.textContent = 'Invalid license key. Please try again.';
      statusElement.className = 'error-message';
    }
  } catch (error) {
    console.error('License verification error:', error);
    statusElement.textContent = 'Error verifying license. Please try again.';
    statusElement.className = 'error-message';
  }
}

// Helper function to show notification
function showNotification(message, type = 'info') {
  if (document.querySelector('.notification')) {
    document.querySelector('.notification').remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.position = 'fixed';
  notification.style.bottom = '60px';
  notification.style.left = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px';
  notification.style.borderRadius = '4px';
  notification.style.textAlign = 'center';
  notification.style.fontSize = '14px';
  notification.style.zIndex = '1000';
  
  if (type === 'error') {
    notification.style.backgroundColor = '#fee2e2';
    notification.style.color = '#b91c1c';
    notification.style.border = '1px solid #fecaca';
  } else if (type === 'success') {
    notification.style.backgroundColor = '#d1fae5';
    notification.style.color = '#065f46';
    notification.style.border = '1px solid #a7f3d0';
  } else {
    notification.style.backgroundColor = '#e0f2fe';
    notification.style.color = '#0369a1';
    notification.style.border = '1px solid #bae6fd';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Export the functions for use in other files
window.premiumFeatures = {
  hasPremiumAccess,
  getRemainingScans,
  recordScan,
  activatePremium,
  resetScanCount,
  verifyLicenseKey,
  updatePremiumUI,
  initPremiumFeatures
};