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
      sendResponse({ success: true, result });
    } catch (error) {
      console.error('Error starting click-to-fill mode:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'fillSelectedField') {
    try {
      const success = fillSelectedField(request.content);
      sendResponse({ success: success });
    } catch (error) {
      console.error('Error filling selected field:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'exitClickToFillMode') {
    try {
      clickToFillMode = false;
      selectedField = null;
      removeClickListeners();
      
      // Remove instruction
      const instruction = document.getElementById('copilot-instruction');
      if (instruction) {
        instruction.remove();
      }
      
      // Remove field highlights
      document.querySelectorAll('.copilot-selected').forEach(el => {
        el.classList.remove('copilot-selected');
        el.style.backgroundColor = '';
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error exiting click-to-fill mode:', error);
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

// Smart platform detection
function detectWritingPlatform() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  // Platform detection based on URL and DOM elements
  if (hostname.includes('medium.com')) {
    return 'medium';
  } else if (hostname.includes('docs.google.com')) {
    return 'google-docs';
  } else if (hostname.includes('notion.so') || hostname.includes('notion.site')) {
    return 'notion';
  } else if (hostname.includes('wordpress.com') || hostname.includes('wp-admin')) {
    return 'wordpress';
  } else if (hostname.includes('ghost.io')) {
    return 'ghost';
  } else if (hostname.includes('substack.com')) {
    return 'substack';
  } else if (hostname.includes('peakd.com')) {
    return 'peakd';
  } else if (hostname.includes('hashnode.com')) {
    return 'hashnode';
  } else if (hostname.includes('dev.to')) {
    return 'devto';
  } else if (hostname.includes('linkedin.com')) {
    return 'linkedin';
  } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'twitter';
  } else {
    return 'unknown';
  }
}

// Debug function to inspect page structure
function debugPageStructure() {
  console.log('=== PAGE STRUCTURE DEBUG ===');
  console.log('Detected platform:', detectWritingPlatform());
  console.log('All input elements:', document.querySelectorAll('input'));
  console.log('All textarea elements:', document.querySelectorAll('textarea'));
  console.log('All contenteditable divs:', document.querySelectorAll('div[contenteditable="true"]'));
  console.log('All divs with role="textbox":', document.querySelectorAll('div[role="textbox"]'));
  
  // Check for common rich text editor classes
  const richTextSelectors = ['.ql-editor', '.ProseMirror', '.editor-content', '.rich-text-editor', '.DraftEditor-editorContainer', '.public-DraftEditor-content'];
  richTextSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`Found ${selector}:`, elements);
    }
  });
  
  console.log('=== END DEBUG ===');
}

// Click-to-fill system
let clickToFillMode = false;
let selectedField = null;
let fillContent = '';

// Add click listeners to all editable fields
function addClickListeners() {
  // Remove existing listeners first
  removeClickListeners();
  
  // Find all potential editable fields
  const editableFields = document.querySelectorAll('input, textarea, div[contenteditable="true"], div[role="textbox"]');
  
  editableFields.forEach(field => {
    // Skip restricted input types
    if (field.tagName === 'INPUT') {
      const restrictedTypes = ['file', 'password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset'];
      if (restrictedTypes.includes(field.type)) {
        return;
      }
    }
    
    // Add click listener
    field.addEventListener('click', handleFieldClick);
    field.style.cursor = 'pointer';
    field.style.border = '2px dashed #3b82f6';
    field.style.borderRadius = '4px';
  });
  
  console.log(`Click-to-fill: Added listeners to ${editableFields.length} fields`);
}

// Remove click listeners
function removeClickListeners() {
  const editableFields = document.querySelectorAll('input, textarea, div[contenteditable="true"], div[role="textbox"]');
  
  editableFields.forEach(field => {
    field.removeEventListener('click', handleFieldClick);
    field.style.cursor = '';
    field.style.border = '';
    field.style.borderRadius = '';
  });
}

// Handle field click
function handleFieldClick(event) {
  if (!clickToFillMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  selectedField = event.target;
  
  // Remove previous selection
  document.querySelectorAll('.copilot-selected').forEach(el => {
    el.classList.remove('copilot-selected');
    el.style.backgroundColor = '';
  });
  
  // Highlight selected field
  selectedField.classList.add('copilot-selected');
  selectedField.style.backgroundColor = '#dbeafe';
  
  console.log('Click-to-fill: Selected field:', selectedField);
  
  // Send message to sidebar
  chrome.runtime.sendMessage({
    action: 'fieldSelected',
    fieldType: selectedField.tagName,
    fieldTypeAttr: selectedField.type,
    fieldId: selectedField.id,
    fieldClass: selectedField.className,
    fieldPlaceholder: selectedField.placeholder
  });
}

// Fill the selected field
function fillSelectedField(content) {
  if (!selectedField) {
    console.log('Click-to-fill: No field selected');
    return false;
  }
  
  try {
    if (selectedField.tagName === 'INPUT' || selectedField.tagName === 'TEXTAREA') {
      selectedField.value = content;
      selectedField.dispatchEvent(new Event('input', { bubbles: true }));
      selectedField.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (selectedField.contentEditable === 'true' || selectedField.getAttribute('role') === 'textbox') {
      selectedField.textContent = content;
      selectedField.dispatchEvent(new Event('input', { bubbles: true }));
      selectedField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    console.log('Click-to-fill: Field filled successfully');
    return true;
  } catch (error) {
    console.error('Click-to-fill: Error filling field:', error);
    return false;
  }
}

// Auto-fill functions
function fillFormFields(content) {
  console.log('Auto-fill: Starting click-to-fill mode with content:', content.substring(0, 100) + '...');
  
  // Store content for later use
  fillContent = content;
  
  // Enter click-to-fill mode
  clickToFillMode = true;
  addClickListeners();
  
  // Show instruction to user
  const instruction = document.createElement('div');
  instruction.id = 'copilot-instruction';
  instruction.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #3b82f6;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    text-align: center;
  `;
  instruction.textContent = '🤖 Click on the field you want to fill with AI content!';
  document.body.appendChild(instruction);
  
  // Auto-remove instruction after 10 seconds
  setTimeout(() => {
    if (instruction.parentNode) {
      instruction.parentNode.removeChild(instruction);
    }
  }, 10000);
  
  return { clickToFillMode: true, message: 'Click on any field to fill it with AI content!' };
}
  
  // Universal writing platform selectors - covers ALL platforms
  const titleSelectors = [
    // Generic title selectors
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
    
    // Platform-specific selectors
    // PeakD
    'input[placeholder*="Write a new post" i]',
    'input[placeholder*="Post title" i]',
    'input[placeholder*="Title" i]',
    
    // Medium
    'h1[contenteditable="true"]',
    'div[data-testid="post-title"]',
    'input[placeholder*="Title" i]',
    'div[aria-label*="title" i]',
    
    // Google Docs
    'div[aria-label*="title" i]',
    'div[contenteditable="true"][aria-label*="title" i]',
    'div[contenteditable="true"][data-placeholder*="title" i]',
    
    // Notion
    'div[contenteditable="true"][data-block-id]',
    'div[contenteditable="true"][placeholder*="title" i]',
    'div[contenteditable="true"][placeholder*="Title" i]',
    
    // WordPress
    'input[name="post_title"]',
    'input[id="title"]',
    'input[class*="title"]',
    
    // Ghost
    'input[placeholder*="Post title" i]',
    'input[name="post.title"]',
    
    // Substack
    'input[placeholder*="Title" i]',
    'div[contenteditable="true"][data-placeholder*="title" i]',
    
    // Generic fallbacks
    'input[type="text"]:not([value])',
    'textarea[placeholder*="Write" i]',
    'div[contenteditable="true"]:first-of-type'
  ];
  
  const contentSelectors = [
    // Generic content selectors
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
    
    // Platform-specific content selectors
    // PeakD
    'textarea[placeholder*="Write" i]',
    'textarea[placeholder*="Tell your story" i]',
    'div[contenteditable="true"][data-placeholder*="Write" i]',
    
    // Medium
    'div[data-testid="post-content"]',
    'div[contenteditable="true"][aria-label*="content" i]',
    'div[contenteditable="true"][aria-label*="body" i]',
    'div[contenteditable="true"][placeholder*="Tell your story" i]',
    'div[contenteditable="true"][placeholder*="Write" i]',
    
    // Google Docs
    'div[contenteditable="true"][aria-label*="document" i]',
    'div[contenteditable="true"][aria-label*="editor" i]',
    'div[contenteditable="true"][data-placeholder*="content" i]',
    'div[contenteditable="true"][data-placeholder*="body" i]',
    
    // Notion
    'div[contenteditable="true"][data-block-id]',
    'div[contenteditable="true"][placeholder*="content" i]',
    'div[contenteditable="true"][placeholder*="body" i]',
    'div[contenteditable="true"][placeholder*="Write" i]',
    
    // WordPress
    'textarea[name="content"]',
    'textarea[id="content"]',
    'div[contenteditable="true"][id*="content"]',
    'div[contenteditable="true"][class*="content"]',
    
    // Ghost
    'div[contenteditable="true"][data-placeholder*="content" i]',
    'div[contenteditable="true"][data-placeholder*="body" i]',
    
    // Substack
    'div[contenteditable="true"][data-placeholder*="content" i]',
    'div[contenteditable="true"][data-placeholder*="body" i]',
    
    // Rich text editor selectors (universal)
    '.ql-editor',
    '.ProseMirror',
    '.editor-content',
    '.rich-text-editor',
    '.DraftEditor-editorContainer',
    '.public-DraftEditor-content',
    '.notion-page-content',
    '.medium-editor-element',
    '.wp-editor-area',
    '.wp-content',
    
    // Generic fallbacks
    'div[contenteditable="true"]:not([data-placeholder])',
    'div[contenteditable="true"][aria-label*="content" i]',
    'div[contenteditable="true"][aria-label*="body" i]',
    'div[contenteditable="true"][aria-label*="editor" i]',
    'div[contenteditable="true"]:not(:first-of-type)',
    'div[contenteditable="true"]'
  ];
  
  // Extract title and content from AI response
  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
  const title = titleMatch ? titleMatch[1].trim() : content.split('\n')[0].trim();
  
  // Remove title from content
  const cleanContent = content.replace(/\*\*Title:\*\*\s*.+?(?:\n|$)/i, '').trim();
  
  // Get platform-specific filling strategy
  const platform = detectWritingPlatform();
  console.log('Auto-fill: Detected platform:', platform);
  
  console.log('Auto-fill: Extracted title:', title);
  console.log('Auto-fill: Clean content:', cleanContent.substring(0, 100) + '...');
  
  let titleFilled = false;
  let contentFilled = false;
  
  // Fill title field
  for (const selector of titleSelectors) {
    const titleField = document.querySelector(selector);
    if (titleField) {
      console.log('Auto-fill: Found title field with selector:', selector);
      
      // Skip restricted input types
      if (titleField.tagName === 'INPUT') {
        const restrictedTypes = ['file', 'password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset'];
        if (restrictedTypes.includes(titleField.type)) {
          console.log(`Auto-fill: Skipping restricted title field type: ${titleField.type}`);
          continue;
        }
      }
      
      if (!titleField.value) {
        try {
          titleField.value = title;
          titleField.dispatchEvent(new Event('input', { bubbles: true }));
          titleField.dispatchEvent(new Event('change', { bubbles: true }));
          titleFilled = true;
          console.log('Auto-fill: Title field filled successfully');
          break;
        } catch (error) {
          console.log(`Auto-fill: Error filling title field:`, error.message);
          continue;
        }
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
        // Skip restricted input types
        if (contentField.tagName === 'INPUT') {
          const restrictedTypes = ['file', 'password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset'];
          if (restrictedTypes.includes(contentField.type)) {
            console.log(`Auto-fill: Skipping restricted content field type: ${contentField.type}`);
            continue;
          }
        }
        
        if (contentField.tagName === 'TEXTAREA' || contentField.tagName === 'INPUT') {
          try {
            contentField.value = cleanContent;
            contentField.dispatchEvent(new Event('input', { bubbles: true }));
            contentField.dispatchEvent(new Event('change', { bubbles: true }));
            contentFilled = true;
            console.log('Auto-fill: Content field filled successfully (textarea/input)');
            break;
          } catch (error) {
            console.log(`Auto-fill: Error filling content field:`, error.message);
            continue;
          }
        } else if (contentField.contentEditable === 'true' || contentField.getAttribute('role') === 'textbox') {
          // Platform-specific filling strategies
          try {
            let filled = false;
            
            // Method 1: Set textContent (universal)
            contentField.textContent = cleanContent;
            contentField.dispatchEvent(new Event('input', { bubbles: true }));
            contentField.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Method 2: Platform-specific approaches
            if (platform === 'medium') {
              // Medium uses Draft.js, try innerHTML with proper formatting
              contentField.innerHTML = cleanContent.replace(/\n/g, '<br>');
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (platform === 'google-docs') {
              // Google Docs needs focus and proper events
              contentField.focus();
              contentField.textContent = cleanContent;
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (platform === 'notion') {
              // Notion uses specific block structure
              contentField.textContent = cleanContent;
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              // Generic approach for other platforms
              if (!contentField.textContent || contentField.textContent.trim().length < 10) {
                contentField.innerHTML = cleanContent.replace(/\n/g, '<br>');
                contentField.dispatchEvent(new Event('input', { bubbles: true }));
                contentField.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
            
            // Method 3: Focus and retry if still empty
            if (!contentField.textContent || contentField.textContent.trim().length < 10) {
              contentField.focus();
              contentField.textContent = cleanContent;
              contentField.dispatchEvent(new Event('input', { bubbles: true }));
              contentField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            contentFilled = true;
            console.log(`Auto-fill: Content field filled successfully (${platform})`);
            break;
          } catch (error) {
            console.log(`Auto-fill: Error filling contenteditable field (${platform}):`, error);
          }
        }
      } else {
        console.log('Auto-fill: Content field not empty, skipping:', contentField.textContent?.substring(0, 50) + '...');
      }
    }
  }
  
  // If we still haven't found anything, try a more aggressive approach
  if (!titleFilled && !contentFilled) {
    console.log('Auto-fill: No fields found with standard selectors, trying aggressive approach...');
    
    // Try to find ANY input or textarea
    const allInputs = document.querySelectorAll('input, textarea, div[contenteditable="true"]');
    console.log('Auto-fill: Found all potential fields:', allInputs);
    
    for (let i = 0; i < allInputs.length; i++) {
      const field = allInputs[i];
      console.log(`Auto-fill: Checking field ${i}:`, field.tagName, field.type, field.placeholder, field.className);
      
      // Skip restricted input types
      if (field.tagName === 'INPUT') {
        const restrictedTypes = ['file', 'password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset'];
        if (restrictedTypes.includes(field.type)) {
          console.log(`Auto-fill: Skipping restricted input type: ${field.type}`);
          continue;
        }
      }
      
      // Try to fill any empty field
      if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
        if (!field.value || field.value.trim().length < 5) {
          try {
            field.value = title; // Try title first
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            titleFilled = true;
            console.log('Auto-fill: Filled field with title:', field);
            break;
          } catch (error) {
            console.log(`Auto-fill: Error filling field ${field.type}:`, error.message);
            continue;
          }
        }
      } else if (field.contentEditable === 'true') {
        if (!field.textContent || field.textContent.trim().length < 5) {
          try {
            field.textContent = cleanContent;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            contentFilled = true;
            console.log('Auto-fill: Filled contenteditable field:', field);
            break;
          } catch (error) {
            console.log(`Auto-fill: Error filling contenteditable field:`, error.message);
            continue;
          }
        }
      }
    }
  }
  
  console.log('Auto-fill: Final result - Title filled:', titleFilled, 'Content filled:', contentFilled);
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
