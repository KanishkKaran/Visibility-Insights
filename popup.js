document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById("run");
  
  // Initialize premium features
  if (window.premiumFeatures) {
    window.premiumFeatures.initPremiumFeatures();
  }
  
  scanButton.addEventListener("click", async () => {
    try {
      // Check premium status before scanning
      const isPremium = await window.premiumFeatures.hasPremiumAccess();
      const remainingScans = await window.premiumFeatures.getRemainingScans();
      
      // If not premium and no scans remaining, show premium overlay
      if (!isPremium && remainingScans <= 0) {
        document.getElementById('premium-overlay').style.display = 'flex';
        return;
      }
      
      // Show loading state
      const originalText = scanButton.innerHTML;
      scanButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Scanning...';
      scanButton.disabled = true;
      
      // Record scan attempt
      await window.premiumFeatures.recordScan();
      
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute script in active tab
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["scan-site.js"]
      }, async (results) => {
        // Check for any error
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          scanButton.innerHTML = originalText;
          scanButton.disabled = false;
          
          // Show error notification
          showNotification('Error scanning page. Please try again.', 'error');
          
          // Update premium UI after scan attempt
          if (window.premiumFeatures) {
            window.premiumFeatures.updatePremiumUI();
          }
          return;
        }
        
        // Open results page
        chrome.tabs.create({ url: chrome.runtime.getURL("results.html") });
      });
    } catch (error) {
      console.error("Error:", error);
      scanButton.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> Run Site Scan';
      scanButton.disabled = false;
      
      // Show error notification
      showNotification('An error occurred. Please try again.', 'error');
      
      // Update premium UI after scan attempt
      if (window.premiumFeatures) {
        window.premiumFeatures.updatePremiumUI();
      }
    }
  });
  
  // Function to show notification
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
  
  // For development/testing purposes
  window.resetFreeTrial = async function() {
    if (window.premiumFeatures) {
      await window.premiumFeatures.resetScanCount();
      window.premiumFeatures.updatePremiumUI();
      showNotification('Free trial reset successfully!', 'info');
    }
  };
});