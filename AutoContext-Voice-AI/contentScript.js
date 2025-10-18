// Content script for Your Copilot
// This script runs on every webpage and extracts page data

// Wrap everything in an IIFE to prevent variable redeclaration errors
(() => {
  // Prevent multiple injections
  if (window.copilotContentScriptLoaded) {
    console.log('Your Copilot content script already loaded, skipping...');
    return;
  }
  window.copilotContentScriptLoaded = true;

  console.log('Your Copilot content script loaded');

  // Global variables
  let clickToFillMode = false;
  let selectedField = null;
  let fillContent = '';
  let lastSelectedText = '';

  // Function to extract page data
  function extractPageData() {
    try {
      const title = document.title || 'Untitled';
      const url = window.location.href;
      
      // Get visible text content
      const bodyText = document.body ? document.body.innerText || document.body.textContent || '' : '';
      const content = bodyText.substring(0, 3000); // Limit content length
      
      return {
        url: url,
        title: title,
        content: content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting page data:', error);
      return {
        url: window.location.href,
        title: document.title || 'Untitled',
        content: 'Error extracting page content',
        error: error.message
      };
    }
  }

  // Text Selection Detection
  function setupTextSelection() {
    document.addEventListener('mouseup', () => {
      try {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0 && text !== lastSelectedText) {
          lastSelectedText = text;
          
          // Send selected text to sidebar
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              action: 'textSelected',
              text: text
            }).catch(error => {
              console.log('Could not send text selection message:', error);
            });
          }
        } else if (text.length === 0 && lastSelectedText) {
          lastSelectedText = '';
          
          // Send deselection message
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              action: 'textDeselected'
            }).catch(error => {
              console.log('Could not send text deselection message:', error);
            });
          }
        }
      } catch (error) {
        console.log('Error in text selection:', error);
      }
    });
  }

  // Replace Selected Text
  function replaceSelectedText(newText) {
    try {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        selection.removeAllRanges();
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error replacing selected text:', error);
      return false;
    }
  }

  // Click-to-fill system
  function addClickListeners() {
    document.addEventListener('click', handleFieldClick, true);
  }

  function removeClickListeners() {
    document.removeEventListener('click', handleFieldClick, true);
  }

  function handleFieldClick(event) {
    if (!clickToFillMode) return;
    
    const target = event.target;
    
    // Check if it's a fillable field
    if (isFillableField(target)) {
      event.preventDefault();
      event.stopPropagation();
      
      selectedField = target;
      target.classList.add('copilot-selected');
      target.style.backgroundColor = '#e3f2fd';
      
      // Fill the field instantly
      const success = fillSelectedField(fillContent);
      
      if (success) {
        // Exit click-to-fill mode
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
      }
    }
  }

  function isFillableField(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';
    
    // Skip restricted input types
    const restrictedTypes = ['file', 'password', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset'];
    if (restrictedTypes.includes(type)) return false;
    
    // Check for fillable elements
    return (
      (tagName === 'input' && ['text', 'email', 'search', 'url', 'tel'].includes(type)) ||
      tagName === 'textarea' ||
      (tagName === 'div' && element.contentEditable === 'true') ||
      element.getAttribute('role') === 'textbox' ||
      element.classList.contains('ql-editor') ||
      element.classList.contains('ProseMirror')
    );
  }

  function fillSelectedField(content) {
    if (!selectedField || !content) return false;
    
    try {
      const tagName = selectedField.tagName.toLowerCase();
      
      if (tagName === 'input' || tagName === 'textarea') {
        selectedField.value = content;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
        selectedField.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (tagName === 'div' && selectedField.contentEditable === 'true') {
        selectedField.textContent = content;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        selectedField.textContent = content;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      selectedField.focus();
      return true;
    } catch (error) {
      console.log('Error filling field:', error);
      return false;
    }
  }

  // Universal click-to-fill function - works EVERYWHERE, NO DETECTION
  function fillFormFields(content) {
    console.log('Universal click-to-fill: Starting with content:', content.substring(0, 100) + '...');

    // Store content for later use
    fillContent = content;

    // Enter click-to-fill mode - ALWAYS works
    clickToFillMode = true;
    addClickListeners();

    // Show instruction to user - ALWAYS works
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
    instruction.textContent = '🤖 Click on ANY field you want to fill with AI content!';
    document.body.appendChild(instruction);

    // Auto-remove instruction after 15 seconds
    setTimeout(() => {
      if (instruction.parentNode) {
        instruction.parentNode.removeChild(instruction);
      }
    }, 15000);

    return { clickToFillMode: true, message: 'Click on any field to fill it with AI content!' };
  }

  // Handle messages from sidebar
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
      // ALWAYS works - no error checking
      const result = fillFormFields(request.content);
      sendResponse({ success: true, result });
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

    if (request.action === 'replaceSelectedText') {
      try {
        const success = replaceSelectedText(request.newText);
        sendResponse({ success: success });
      } catch (error) {
        console.error('Error replacing selected text:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  });

  // Setup text selection on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Page loaded, Your Copilot ready');
      try {
        setupTextSelection();
      } catch (error) {
        console.log('Error setting up text selection:', error);
      }
    });
  } else {
    console.log('Page already loaded, Your Copilot ready');
    try {
      setupTextSelection();
    } catch (error) {
      console.log('Error setting up text selection:', error);
    }
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

  // Make functions available globally for debugging
  window.autoContext = {
    extractPageData,
    getPageSummary,
    fillFormFields
  };

})(); // End of IIFE