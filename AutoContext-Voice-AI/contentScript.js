// Content script for AutoContext Voice AI
// This script runs on every webpage and extracts page data

console.log('AutoContext Voice AI content script loaded');

// Function to extract page data
function extractPageData() {
  // Get basic page information
  const url = window.location.href;
  const title = document.title;
  
  // Extract visible text content
  let content = '';
  
  // Remove script and style elements
  const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside');
  elementsToRemove.forEach(el => el.remove());
  
  // Get text content from main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '#content',
    '.post',
    '.article',
    'body'
  ];
  
  let mainContent = '';
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element.textContent;
      break;
    }
  }
  
  // If no main content found, use body text
  if (!mainContent) {
    mainContent = document.body.textContent;
  }
  
  // Clean up the content
  content = mainContent
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace multiple newlines with single space
    .trim();
  
  // Limit content length to prevent API issues
  if (content.length > 2000) {
    content = content.substring(0, 2000) + '...';
  }
  
  // Extract additional useful information
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent.trim())
    .filter(text => text.length > 0)
    .slice(0, 5); // Limit to first 5 headings
  
  return {
    url,
    title,
    content,
    metaDescription,
    headings,
    timestamp: Date.now()
  };
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    try {
      const pageData = extractPageData();
      sendResponse(pageData);
    } catch (error) {
      console.error('Error extracting page data:', error);
      sendResponse({
        url: window.location.href,
        title: document.title,
        content: 'Error extracting page content',
        error: error.message
      });
    }
    return true; // Indicates we will send a response asynchronously
  }
  
  if (request.action === 'fillFormFields') {
    try {
      fillFormFields(request.content);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error filling form fields:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'fillTitleField') {
    try {
      fillTitleField(request.title);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error filling title field:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// Optional: Send page data when page loads (for debugging)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, AutoContext ready');
  });
} else {
  console.log('Page already loaded, AutoContext ready');
}

// Utility function to get page summary (for future use)
function getPageSummary() {
  const data = extractPageData();
  return {
    url: data.url,
    title: data.title,
    contentLength: data.content.length,
    hasContent: data.content.length > 0
  };
}

// Auto-fill functions
function fillFormFields(content) {
  // Find common form field selectors
  const titleSelectors = [
    'input[type="text"][placeholder*="title" i]',
    'input[type="text"][placeholder*="Title" i]',
    'input[name*="title" i]',
    'input[id*="title" i]',
    'input[class*="title" i]',
    'textarea[placeholder*="title" i]',
    'textarea[placeholder*="Title" i]',
    'textarea[name*="title" i]',
    'textarea[id*="title" i]',
    'textarea[class*="title" i]'
  ];
  
  const contentSelectors = [
    'textarea[placeholder*="content" i]',
    'textarea[placeholder*="Content" i]',
    'textarea[placeholder*="body" i]',
    'textarea[placeholder*="Body" i]',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="Description" i]',
    'textarea[name*="content" i]',
    'textarea[name*="body" i]',
    'textarea[name*="description" i]',
    'textarea[id*="content" i]',
    'textarea[id*="body" i]',
    'textarea[id*="description" i]',
    'div[contenteditable="true"]',
    'div[role="textbox"]'
  ];
  
  // Extract title and content from AI response
  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
  const title = titleMatch ? titleMatch[1].trim() : content.split('\n')[0].trim();
  
  // Remove title from content
  const cleanContent = content.replace(/\*\*Title:\*\*\s*.+?(?:\n|$)/i, '').trim();
  
  // Fill title field
  for (const selector of titleSelectors) {
    const titleField = document.querySelector(selector);
    if (titleField && !titleField.value) {
      titleField.value = title;
      titleField.dispatchEvent(new Event('input', { bubbles: true }));
      titleField.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
  }
  
  // Fill content field
  for (const selector of contentSelectors) {
    const contentField = document.querySelector(selector);
    if (contentField && !contentField.value && !contentField.textContent) {
      if (contentField.tagName === 'TEXTAREA' || contentField.tagName === 'INPUT') {
        contentField.value = cleanContent;
        contentField.dispatchEvent(new Event('input', { bubbles: true }));
        contentField.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (contentField.contentEditable === 'true' || contentField.getAttribute('role') === 'textbox') {
        contentField.textContent = cleanContent;
        contentField.dispatchEvent(new Event('input', { bubbles: true }));
        contentField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      break;
    }
  }
}

function fillTitleField(title) {
  // Find title field selectors
  const titleSelectors = [
    'input[type="text"][placeholder*="title" i]',
    'input[type="text"][placeholder*="Title" i]',
    'input[name*="title" i]',
    'input[id*="title" i]',
    'input[class*="title" i]',
    'textarea[placeholder*="title" i]',
    'textarea[placeholder*="Title" i]',
    'textarea[name*="title" i]',
    'textarea[id*="title" i]',
    'textarea[class*="title" i]'
  ];
  
  // Fill the first available title field
  for (const selector of titleSelectors) {
    const titleField = document.querySelector(selector);
    if (titleField) {
      titleField.value = title;
      titleField.dispatchEvent(new Event('input', { bubbles: true }));
      titleField.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
  }
}

// Make functions available globally for debugging
window.autoContext = {
  extractPageData,
  getPageSummary,
  fillFormFields,
  fillTitleField
};
