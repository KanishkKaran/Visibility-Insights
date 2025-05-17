(async () => {
  try {
    console.log("Starting scan...");
    const origin = location.origin;
    const hostname = location.hostname;
    const pageTitle = document.title;
    
    console.log("Fetching robots.txt...");
    // Fetch robots.txt
    let robots = '';
    try {
      const robotsResponse = await fetch(origin + '/robots.txt');
      console.log("robots.txt response:", robotsResponse.status);
      robots = robotsResponse.ok ? await robotsResponse.text() : '';
    } catch (err) {
      console.error("Error fetching robots.txt:", err);
      robots = '';
    }
    
    console.log("Fetching sitemap.xml...");
    // Fetch sitemap.xml
    let sitemap = '';
    try {
      const sitemapResponse = await fetch(origin + '/sitemap.xml');
      console.log("sitemap.xml response:", sitemapResponse.status);
      sitemap = sitemapResponse.ok ? await sitemapResponse.text() : '';
    } catch (err) {
      console.error("Error fetching sitemap.xml:", err);
      sitemap = '';
    }
    
    console.log("Getting HTML comments...");
    // Get HTML comments
    const html = document.documentElement.innerHTML;
    const comments = html.match(/<!--([\s\S]*?)-->/g) || [];
    // Clean up comments - remove comment tags and trim
    const cleanedComments = comments.map(comment => 
      comment.replace(/<!--/, '').replace(/-->/, '').trim()
    );
    
    console.log("Getting cookies...");
    // Get cookies
    const cookies = document.cookie.split(";").map(c => c.trim()).filter(c => c !== '');
    
    console.log("Getting external links...");
    // Get external links only
    const allLinks = Array.from(document.querySelectorAll("a[href]")).map(a => a.href);
    const externalLinks = allLinks.filter(link => {
      try {
        const linkUrl = new URL(link);
        // Check if the link's hostname is different from the current page's hostname and is not empty
        return linkUrl.hostname !== hostname && 
               linkUrl.hostname !== "" && 
               linkUrl.protocol.startsWith('http'); // Only http/https links
      } catch (e) {
        console.error("Error processing URL:", link, e);
        return false;
      }
    });
    
    console.log("Saving results...");
    const results = {
      robots, 
      sitemap, 
      comments: cleanedComments, 
      cookies, 
      links: externalLinks,
      url: location.href,
      pageTitle: pageTitle,
      timestamp: new Date().toISOString()
    };
    
    console.log("Results prepared, saving to storage");
    
    // Save results to Chrome storage
    chrome.storage.local.set({ scanResults: results }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving to storage:", chrome.runtime.lastError);
      } else {
        console.log("Successfully saved results to storage");
      }
    });
    
    console.log("Scan completed successfully");
  } catch (error) {
    console.error("Error during scan:", error);
    console.error("Stack trace:", error.stack);
  }
})();