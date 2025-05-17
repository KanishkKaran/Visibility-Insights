document.addEventListener('DOMContentLoaded', function() {
  console.log("Document loaded");
  
  // Check if Bootstrap JS is loaded
  if (typeof bootstrap === 'undefined') {
    console.error("Bootstrap JavaScript is not loaded!");
  } else {
    console.log("Bootstrap loaded successfully");
  }

  // Initialize premium features
  if (window.premiumFeatures) {
    window.premiumFeatures.initPremiumFeatures();
  }

  // Setup event listeners for collapsible sections
  setupCollapsibleSections();

  // Load scan results
  chrome.storage.local.get(["scanResults"], (result) => {
    try {
      const data = result.scanResults || {};
      const { robots = '', sitemap = '', comments = [], cookies = [], links = [], url = '', pageTitle = '', timestamp = '' } = data;
      
      // Add scanned URL if available
      if (url) {
        const urlElement = document.getElementById('site-url');
        if (urlElement) {
          urlElement.innerHTML = `<i class="bi bi-link-45deg"></i> <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`;
        }
      }
      
      // Set page title if available
      if (document.title && pageTitle) {
        document.title = `Visibility Insights | ${escapeHtml(pageTitle)}`;
      }
      
      // Set timestamp if available
      if (timestamp) {
        const date = new Date(timestamp);
        const reportDateEl = document.getElementById('report-date');
        if (reportDateEl) {
          reportDateEl.textContent = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
      
      // Handle robots.txt data
      const robotsBody = document.querySelector("#robots-table tbody");
      let robotsRuleCount = 0;
      let disallowCount = 0;
      
      if (robotsBody) {
        if (robots && robots.trim()) {
          robots.split('\n').filter(Boolean).forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            robotsRuleCount++;
            const isDisallow = trimmedLine.includes('Disallow');
            if (isDisallow) disallowCount++;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td class="${isDisallow ? 'warn' : 'good'}">${escapeHtml(trimmedLine)}</td>
              <td><span class="${isDisallow ? 'disallow-badge' : 'allow-badge'}">${isDisallow ? 'Disallow' : 'Allow'}</span></td>
            `;
            robotsBody.appendChild(tr);
          });
        } else {
          addEmptyMessage(robotsBody, "No robots.txt file found", 2);
        }
      }
      
      // Update robots.txt summary card
      const robotsCountEl = document.getElementById('robots-count');
      if (robotsCountEl) {
        robotsCountEl.textContent = robotsRuleCount;
        
        const robotsStatusEl = document.getElementById('robots-status');
        if (robotsStatusEl) {
          if (robotsRuleCount > 0) {
            robotsStatusEl.innerHTML = 
              `<i class="bi bi-check-circle-fill"></i> <span>${disallowCount} restrictions found</span>`;
            robotsStatusEl.className = 'metric-status status-success';
          } else {
            robotsStatusEl.innerHTML = 
              `<i class="bi bi-exclamation-triangle-fill"></i> <span>No robots.txt found</span>`;
            robotsStatusEl.className = 'metric-status status-warning';
          }
        }
      }

      // Handle sitemap.xml data
      const sitemapBody = document.querySelector("#sitemap-table tbody");
      const sitemapUrls = sitemap ? [...(sitemap.matchAll(/<loc>(.*?)<\/loc>/g) || [])] : [];
      const sitemapCount = sitemapUrls.length;
      
      if (sitemapBody) {
        if (sitemapCount > 0) {
          sitemapUrls.forEach(m => {
            const tr = document.createElement("tr");
            const url = escapeHtml(m[1]);
            tr.innerHTML = `<td><a href="${url}" target="_blank" class="text-primary">${url}</a></td>`;
            sitemapBody.appendChild(tr);
          });
        } else {
          addEmptyMessage(sitemapBody, "No sitemap.xml found or no URLs in sitemap");
        }
      }
      
      // Update sitemap summary card
      const sitemapCountEl = document.getElementById('sitemap-count');
      if (sitemapCountEl) {
        sitemapCountEl.textContent = sitemapCount;
        
        const sitemapStatusEl = document.getElementById('sitemap-status');
        if (sitemapStatusEl) {
          if (sitemapCount > 0) {
            sitemapStatusEl.innerHTML = 
              `<i class="bi bi-check-circle-fill"></i> <span>Sitemap found</span>`;
            sitemapStatusEl.className = 'metric-status status-success';
          } else {
            sitemapStatusEl.innerHTML = 
              `<i class="bi bi-exclamation-triangle-fill"></i> <span>No sitemap found</span>`;
            sitemapStatusEl.className = 'metric-status status-warning';
          }
        }
      }
      
      // Handle HTML comments
      const commentsBody = document.querySelector("#comments-table tbody");
      const commentsCount = Array.isArray(comments) ? comments.length : 0;
      let sensitiveCmtCount = 0;
      
      if (commentsBody) {
        if (commentsCount > 0) {
          comments.forEach(c => {
            if (!c || typeof c !== 'string') return;
            
            const isWarning = /TODO|debug|pass|key|fix|password|secret|admin/i.test(c);
            if (isWarning) sensitiveCmtCount++;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td class="${isWarning ? 'warn' : ''}">${escapeHtml(c)}</td>
              <td><span class="${isWarning ? 'disallow-badge' : 'allow-badge'}">${isWarning ? 'Sensitive' : 'Safe'}</span></td>
            `;
            commentsBody.appendChild(tr);
          });
        } else {
          addEmptyMessage(commentsBody, "No HTML comments found", 2);
        }
      }
      
      // Update comments summary card
      const commentsCountEl = document.getElementById('comments-count');
      if (commentsCountEl) {
        commentsCountEl.textContent = commentsCount;
        
        const commentsStatusEl = document.getElementById('comments-status');
        if (commentsStatusEl) {
          if (sensitiveCmtCount > 0) {
            commentsStatusEl.innerHTML = 
              `<i class="bi bi-exclamation-triangle-fill"></i> <span>${sensitiveCmtCount} sensitive comments</span>`;
            commentsStatusEl.className = 'metric-status status-warning';
          } else if (commentsCount > 0) {
            commentsStatusEl.innerHTML = 
              `<i class="bi bi-check-circle-fill"></i> <span>All comments safe</span>`;
            commentsStatusEl.className = 'metric-status status-success';
          } else {
            commentsStatusEl.innerHTML = 
              `<i class="bi bi-info-circle-fill"></i> <span>No comments found</span>`;
            commentsStatusEl.className = 'metric-status status-info';
          }
        }
      }

      // Handle cookies
      const cookiesBody = document.querySelector("#cookies-table tbody");
      const cookiesCount = Array.isArray(cookies) && cookies.length ? cookies.filter(c => c && c !== "").length : 0;
      
      // Update cookies summary card
      const cookiesCountEl = document.getElementById('cookies-count');
      if (cookiesCountEl) {
        cookiesCountEl.textContent = cookiesCount;
        
        const cookiesStatusEl = document.getElementById('cookies-status');
        if (cookiesStatusEl) {
          if (cookiesCount > 0) {
            cookiesStatusEl.innerHTML = 
              `<i class="bi bi-info-circle-fill"></i> <span>${cookiesCount} cookies found</span>`;
            cookiesStatusEl.className = 'metric-status status-info';
          } else {
            cookiesStatusEl.innerHTML = 
              `<i class="bi bi-info-circle-fill"></i> <span>No cookies found</span>`;
            cookiesStatusEl.className = 'metric-status status-info';
          }
        }
      }
      
      if (cookiesBody) {
        if (cookiesCount > 0 && Array.isArray(cookies)) {
          cookies.forEach(c => {
            if (!c || typeof c !== 'string') return;
            
            const parts = c.split('=');
            const name = parts[0];
            const value = parts.slice(1).join('=');
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><strong>${escapeHtml(name)}</strong></td>
              <td>${escapeHtml(value)}</td>
            `;
            cookiesBody.appendChild(tr);
          });
        } else {
          addEmptyMessage(cookiesBody, "No cookies found", 2);
        }
      }
      
      // Handle external links
      const domainsBody = document.querySelector("#domains-table tbody");
      
      // Group links by domain
      const domainMap = new Map();
      if (Array.isArray(links)) {
        links.forEach(link => {
          if (!link || typeof link !== 'string') return;
          
          try {
            const url = new URL(link);
            const domain = url.hostname;
            if (!domainMap.has(domain)) {
              domainMap.set(domain, []);
            }
            domainMap.get(domain).push(link);
          } catch (e) {
            // Skip invalid URLs
          }
        });
      }
      
      const domainsCount = domainMap.size;
      const totalLinks = Array.isArray(links) ? links.length : 0;
      
      // Update domains summary card
      const domainsCountEl = document.getElementById('domains-count');
      if (domainsCountEl) {
        domainsCountEl.textContent = domainsCount;
        
        const domainsStatusEl = document.getElementById('domains-status');
        if (domainsStatusEl) {
          if (domainsCount > 0) {
            domainsStatusEl.innerHTML = 
              `<i class="bi bi-info-circle-fill"></i> <span>${totalLinks} total links</span>`;
            domainsStatusEl.className = 'metric-status status-info';
          } else {
            domainsStatusEl.innerHTML = 
              `<i class="bi bi-info-circle-fill"></i> <span>No external links</span>`;
            domainsStatusEl.className = 'metric-status status-info';
          }
        }
      }
      
      // Display grouped links
      if (domainsBody) {
        if (domainsCount > 0) {
          Array.from(domainMap.entries()).sort().forEach(([domain, domainLinks]) => {
            const tr = document.createElement("tr");
            tr.classList.add('domain-group');
            tr.innerHTML = `
              <td><strong>${escapeHtml(domain)}</strong></td>
              <td>${domainLinks.length}</td>
            `;
            domainsBody.appendChild(tr);
            
            // Show first 3 links for each domain
            domainLinks.slice(0, 3).forEach(link => {
              const linkRow = document.createElement("tr");
              linkRow.classList.add('domain-link');
              linkRow.innerHTML = `
                <td colspan="2">
                  <a href="${escapeHtml(link)}" target="_blank" class="text-primary">${escapeHtml(link)}</a>
                </td>
              `;
              domainsBody.appendChild(linkRow);
            });
            
            // If there are more links, add a "more" row
            if (domainLinks.length > 3) {
              const moreRow = document.createElement("tr");
              moreRow.classList.add('domain-link');
              moreRow.innerHTML = `
                <td colspan="2" class="text-muted fst-italic">
                  ...and ${domainLinks.length - 3} more links
                </td>
              `;
              domainsBody.appendChild(moreRow);
            }
          });
        } else {
          addEmptyMessage(domainsBody, "No external links found", 2);
        }
      }

      // Set up CSV download
      const downloadCsvBtn = document.getElementById("download-csv");
      if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener("click", function(e) {
          e.preventDefault();
          
          // Create CSV with all scan data
          const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
          const filename = `visibility-insights-report-${timestamp}.csv`;
          
          // Start with robots.txt
          let csvContent = "SECTION,ITEM,DETAILS\n";
          
          // Add robots.txt data
          if (robots && robots.trim()) {
            robots.split('\n').filter(Boolean).forEach(line => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return;
              
              csvContent += `"Robots.txt","${trimmedLine.replace(/"/g, '""')}","${trimmedLine.includes('Disallow') ? 'Disallow' : 'Allow'}"\n`;
            });
          } else {
            csvContent += `"Robots.txt","No robots.txt found","Warning"\n`;
          }
          
          // Add sitemap data
          if (sitemapCount > 0) {
            sitemapUrls.forEach(m => {
              csvContent += `"Sitemap.xml","${m[1].replace(/"/g, '""')}","URL"\n`;
            });
          } else {
            csvContent += `"Sitemap.xml","No sitemap.xml found","Warning"\n`;
          }
          
          // Add comments data
          if (commentsCount > 0 && Array.isArray(comments)) {
            comments.forEach(c => {
              if (!c || typeof c !== 'string') return;
              
              const cleanComment = c.replace(/"/g, '""');
              const isWarning = /TODO|debug|pass|key|fix|password|secret|admin/i.test(c);
              csvContent += `"HTML Comments","${cleanComment}","${isWarning ? 'Sensitive' : 'Safe'}"\n`;
            });
          }
          
          // Add cookies data
          if (cookiesCount > 0 && Array.isArray(cookies)) {
            cookies.forEach(c => {
              if (!c || typeof c !== 'string') return;
              
              const parts = c.split('=');
              const name = parts[0];
              csvContent += `"Cookies","${name.replace(/"/g, '""')}","${c.substring(name.length + 1).replace(/"/g, '""')}"\n`;
            });
          }
          
          // Add external links data
          domainMap.forEach((domainLinks, domain) => {
            domainLinks.forEach(link => {
              csvContent += `"External Domains","${domain.replace(/"/g, '""')}","${link.replace(/"/g, '""')}"\n`;
            });
          });
          
          // Create and trigger download
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
        });
      }
      
      // Open the first section with data after a short delay to ensure DOM is ready
      setTimeout(() => {
        openFirstSectionWithData(robotsRuleCount, sitemapCount, commentsCount, cookiesCount, domainsCount);
      }, 300);
      
    } catch (error) {
      console.error("Error processing results:", error);
      
      // Show error message in the UI
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.innerHTML = `
          <div class="alert alert-danger p-5 text-center">
            <i class="bi bi-exclamation-triangle-fill display-1 mb-4"></i>
            <h2>Error Processing Results</h2>
            <p class="mb-0">There was an error processing the scan results. Please try again.</p>
          </div>
        `;
      }
    }
  });
});

// Setup collapsible sections
function setupCollapsibleSections() {
  const sectionHeaders = document.querySelectorAll('.section-header');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const targetId = this.getAttribute('data-bs-target');
      const targetElement = document.querySelector(targetId);
      
      if (!targetElement) return;
      
      // Toggle the show class directly (don't rely on Bootstrap)
      const isExpanded = targetElement.classList.contains('show');
      
      if (isExpanded) {
        // Close the section
        targetElement.classList.remove('show');
        this.classList.add('collapsed');
        this.setAttribute('aria-expanded', 'false');
      } else {
        // Open the section
        targetElement.classList.add('show');
        this.classList.remove('collapsed');
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// Helper function to display empty state messages
function addEmptyMessage(tableBody, message, colSpan = 1) {
  if (!tableBody) return;
  
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td colspan="${colSpan}" class="empty-state">
      <i class="bi bi-search empty-icon"></i>
      <p>${message}</p>
    </td>
  `;
  tableBody.appendChild(tr);
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(unsafe) {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }
  
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Function to open the first section that has data
function openFirstSectionWithData(robotsCount, sitemapCount, commentsCount, cookiesCount, domainsCount) {
  // Create an array of sections with their data counts
  const sections = [
    { id: 'robots-content', count: robotsCount },
    { id: 'sitemap-content', count: sitemapCount },
    { id: 'comments-content', count: commentsCount },
    { id: 'cookies-content', count: cookiesCount },
    { id: 'domains-content', count: domainsCount }
  ];
  
  // Find the first section with data
  const firstSectionWithData = sections.find(section => section.count > 0);
  
  if (firstSectionWithData) {
    // Show this section
    const sectionId = firstSectionWithData.id;
    const contentElement = document.getElementById(sectionId);
    const headerElement = document.querySelector(`[data-bs-target="#${sectionId}"]`);
    
    if (contentElement && headerElement) {
      // Manually open the section
      contentElement.classList.add('show');
      headerElement.classList.remove('collapsed');
      headerElement.setAttribute('aria-expanded', 'true');
    }
  }
}