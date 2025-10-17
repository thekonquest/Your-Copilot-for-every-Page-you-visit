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
      const result = fillFormFields(request.content);
      sendResponse({ success: result.titleFilled || result.contentFilled, result });
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
  console.log('Auto-fill: Starting to fill form fields with content:', content.substring(0, 100) + '...');
  
  // Find common form field selectors - expanded list
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
    'textarea[class*="title" i]',
    // PeakD specific selectors
    'input[placeholder*="Write a new post" i]',
    'input[placeholder*="Post title" i]',
    'input[placeholder*="Title" i]',
    'input[type="text"]:not([value])',
    'textarea[placeholder*="Write" i]'
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
    'div[role="textbox"]',
    // PeakD specific selectors - more comprehensive
    'textarea[placeholder*="Write" i]',
    'textarea[placeholder*="Tell your story" i]',
    'div[contenteditable="true"][data-placeholder*="Write" i]',
    // Rich text editor selectors
    '.ql-editor',
    '.ProseMirror',
    '.editor-content',
    '.rich-text-editor',
    'div[contenteditable="true"]:not([data-placeholder])',
    'div[contenteditable="true"][aria-label*="content" i]',
    'div[contenteditable="true"][aria-label*="body" i]',
    'div[contenteditable="true"][aria-label*="editor" i]',
    // Generic contenteditable divs (last resort)
    'div[contenteditable="true"]'
  ];
  
  // Extract title and content from AI response
  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
  const title = titleMatch ? titleMatch[1].trim() : content.split('\n')[0].trim();
  
  // Remove title from content
  const cleanContent = content.replace(/\*\*Title:\*\*\s*.+?(?:\n|$)/i, '').trim();
  
  console.log('Auto-fill: Extracted title:', title);
  console.log('Auto-fill: Clean content:', cleanContent.substring(0, 100) + '...');
  
  let titleFilled = false;
  let contentFilled = false;
  
  // Fill title field
  for (const selector of titleSelectors) {
    const titleField = document.querySelector(selector);
    if (titleField) {
      console.log('Auto-fill: Found title field with selector:', selector);
      if (!titleField.value) {
        titleField.value = title;
        titleField.dispatchEvent(new Event('input', { bubbles: true }));
        titleField.dispatchEvent(new Event('change', { bubbles: true }));
        titleFilled = true;
        console.log('Auto-fill: Title field filled successfully');
        break;
      }
    }
  }
  
  // Fill content field
  for (const selector of contentSelectors) {
    const contentField = document.querySelector(selector);
    if (contentField) {
      console.log('Auto-fill: Found content field with selector:', selector);
      
      // Check if field is empty or has minimal content
      const isEmpty = !contentField.value && 
                     (!contentField.textContent || contentField.textContent.trim().length < 10);
      
      if (isEmpty) {
        if (contentField.tagName === 'TEXTAREA' || contentField.tagName === 'INPUT') {
          contentField.value = cleanContent;
          contentField.dispatchEvent(new Event('input', { bubbles: true }));
          contentField.dispatchEvent(new Event('change', { bubbles: true }));
          contentFilled = true;
          console.log('Auto-fill: Content field filled successfully (textarea/input)');
          break;
        } else if (contentField.contentEditable === 'true' || contentField.getAttribute('role') === 'textbox') {
          // For rich text editors, try multiple approaches
          try {
            // Method 1: Set textContent
            contentField.textContent = cleanContent;
            contentField.dispatchEvent(new Event('input', { bubbles: true }));
            contentField.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Method 2: If that didn't work, try innerHTML
            if (!contentField.textContent || contentField.textContent.trim().length < 10) {
              contentField.innerHTML = cleanContent.replace(/\n/g, '<br>');
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            // Method 3: Try focusing and typing (for stubborn editors)
            if (!contentField.textContent || contentField.textContent.trim().length < 10) {
              contentField.focus();
              contentField.textContent = cleanContent;
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            contentFilled = true;
            console.log('Auto-fill: Content field filled successfully (contenteditable)');
            break;
          } catch (error) {
            console.log('Auto-fill: Error filling contenteditable field:', error);
          }
        }
      } else {
        console.log('Auto-fill: Content field not empty, skipping:', contentField.textContent?.substring(0, 50) + '...');
      }
    }
  }
  
  console.log('Auto-fill: Title filled:', titleFilled, 'Content filled:', contentFilled);
  return { titleFilled, contentFilled };
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
