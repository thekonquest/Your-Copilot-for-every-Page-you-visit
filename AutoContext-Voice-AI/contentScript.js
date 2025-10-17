// Content script for Your Copilot
// This script runs on every webpage and extracts page data

// Wrap everything in an IIFE to prevent variable redeclaration errors
(() => {
  console.log('Your Copilot content script loaded');

  // Global variables
  let clickToFillMode = false;
  let selectedField = null;
  let fillContent = '';
  let textCorrectionMode = false;
  let selectedText = '';
  let selectedRange = null;
  let correctionButton = null;

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
    
    if (request.action === 'correctSelectedText') {
      // Handle async operation
      correctSelectedText(request.text)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          console.error('Error correcting selected text:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates we will send a response asynchronously
    }
  });

  // Optional: Send page data when page loads (for debugging)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Page loaded, Your Copilot ready');
    });
  } else {
    console.log('Page already loaded, Your Copilot ready');
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

  // Simple debug function
  function debugPageStructure() {
    console.log('=== UNIVERSAL CLICK-TO-FILL DEBUG ===');
    console.log('All input elements:', document.querySelectorAll('input'));
    console.log('All textarea elements:', document.querySelectorAll('textarea'));
    console.log('All contenteditable divs:', document.querySelectorAll('div[contenteditable="true"]'));
    console.log('All divs with role="textbox":', document.querySelectorAll('div[role="textbox"]'));
    console.log('=== END DEBUG ===');
  }

  // Click-to-fill system

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

  // Handle field click - INSTANT FILL
  function handleFieldClick(event) {
    if (!clickToFillMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    selectedField = event.target;
    
    console.log('Click-to-fill: Selected field, filling instantly:', selectedField);
    console.log('Click-to-fill: Content to fill:', fillContent);
    
    // INSTANT FILL - no confirmation needed
    const success = fillSelectedField(fillContent);
    
    console.log('Click-to-fill: Fill result:', success);
    
    if (success) {
      // Exit click-to-fill mode immediately
      clickToFillMode = false;
      removeClickListeners();
      
      // Remove instruction banner
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

  // Fill the selected field - SMART CONTENT SELECTION
  function fillSelectedField(content) {
    if (!selectedField) {
      console.log('Click-to-fill: No field selected');
      return false;
    }
    
    console.log('Click-to-fill: Filling field:', selectedField.tagName, selectedField.type, selectedField.contentEditable);
    console.log('Click-to-fill: Original content:', content);
    
    try {
      // Extract title and content from AI response
      const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : content.split('\n')[0].trim();
      const cleanContent = content.replace(/\*\*Title:\*\*\s*.+?(?:\n|$)/i, '').trim();
      
      console.log('Click-to-fill: Extracted title:', title);
      console.log('Click-to-fill: Extracted content:', cleanContent.substring(0, 100) + '...');
      
      // Smart content selection based on field type
      let contentToFill = cleanContent;
      
      // If it's a text input (likely title field), use title
      if (selectedField.tagName === 'INPUT' && selectedField.type === 'text') {
        contentToFill = title;
        console.log('Click-to-fill: Using title for input field');
      }
      // If it's a textarea or contenteditable, use full content
      else if (selectedField.tagName === 'TEXTAREA' || selectedField.contentEditable === 'true') {
        contentToFill = cleanContent;
        console.log('Click-to-fill: Using full content for textarea/contenteditable');
      }
      
      console.log('Click-to-fill: Final content to fill:', contentToFill);
      
      // Fill the field with multiple methods
      let filled = false;
      
      // Method 1: Direct value setting
      if (selectedField.tagName === 'INPUT' || selectedField.tagName === 'TEXTAREA') {
        selectedField.value = contentToFill;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
        selectedField.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
        console.log('Click-to-fill: Filled via value property');
      } else if (selectedField.contentEditable === 'true' || selectedField.getAttribute('role') === 'textbox') {
        selectedField.textContent = contentToFill;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
        selectedField.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
        console.log('Click-to-fill: Filled via textContent');
      }
      
      // Method 2: If that didn't work, try innerHTML
      if (!filled || (selectedField.value === '' && selectedField.textContent === '')) {
        console.log('Click-to-fill: Trying innerHTML method');
        selectedField.innerHTML = contentToFill.replace(/\n/g, '<br>');
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
        selectedField.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
      }
      
      // Method 3: Focus and try again
      if (!filled || (selectedField.value === '' && selectedField.textContent === '')) {
        console.log('Click-to-fill: Trying focus method');
        selectedField.focus();
        selectedField.textContent = contentToFill;
        selectedField.dispatchEvent(new Event('input', { bubbles: true }));
        selectedField.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
      }
      
      console.log('Click-to-fill: Fill successful:', filled);
      console.log('Click-to-fill: Field value after fill:', selectedField.value || selectedField.textContent);
      return filled;
    } catch (error) {
      console.error('Click-to-fill: Error filling field:', error);
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

  // Universal fillTitleField - uses click-to-fill system
  function fillTitleField(title) {
    return fillFormFields(title);
  }

  // Text Correction System - Simplified Flow

  // Correct selected text (called from sidebar)
  async function correctSelectedText(text) {
    console.log('Text Correction: Correcting text:', text);
    
    try {
      // Get the current selection
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        return { success: false, error: 'No text selected' };
      }
      
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      if (selectedText !== text) {
        return { success: false, error: 'Selected text does not match' };
      }
      
      // Get corrected text from AI
      const correctedText = await getCorrectedText(text);
      
      if (correctedText && correctedText.trim() !== '') {
        console.log('Text Correction: Got corrected text:', correctedText);
        
        // Replace text live on the page
        replaceTextLive(range, text, correctedText);
        
        // Send success message to sidebar
        chrome.runtime.sendMessage({
          action: 'textCorrected',
          originalText: text,
          correctedText: correctedText
        });
        
        return { success: true, correctedText: correctedText };
      } else {
        return { success: false, error: 'Failed to get corrected text' };
      }
      
    } catch (error) {
      console.error('Text Correction: Error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get corrected text from AI
  async function getCorrectedText(text) {
    try {
      const response = await fetch('https://your-copilot-for-every-page-you-visit.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please correct this text for grammar, spelling, and clarity. Return ONLY the corrected text, nothing else: "${text}"`,
          context: {
            title: document.title,
            url: window.location.href,
            text: text
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      return data.response.trim();
      
    } catch (error) {
      console.error('Text Correction: API Error:', error);
      return null;
    }
  }

  // Replace text live on the page with typewriter effect
  function replaceTextLive(range, originalText, correctedText) {
    try {
      console.log('Text Correction: Starting live replacement');
      console.log('Original text:', originalText);
      console.log('Corrected text:', correctedText);
      
      // Clone the range to avoid issues
      const workingRange = range.cloneRange();
      
      // Delete the original text
      workingRange.deleteContents();
      
      // Create a container for the typewriter effect
      const container = document.createElement('span');
      container.style.cssText = `
        background: linear-gradient(120deg, #fef3c7 0%, #fde68a 100%);
        padding: 2px 6px;
        border-radius: 4px;
        border: 2px solid #f59e0b;
        transition: all 0.3s ease;
      `;
      
      // Insert the container
      workingRange.insertNode(container);
      
      // Create a text node inside the container
      const textNode = document.createTextNode('');
      container.appendChild(textNode);
      
      // Type the corrected text character by character
      let index = 0;
      const typeInterval = setInterval(() => {
        if (index < correctedText.length) {
          textNode.textContent += correctedText[index];
          index++;
        } else {
          clearInterval(typeInterval);
          
          // Add success highlight effect
          container.style.cssText = `
            background: linear-gradient(120deg, #a7f3d0 0%, #d1fae5 100%);
            padding: 2px 6px;
            border-radius: 4px;
            border: 2px solid #10b981;
            transition: all 0.5s ease;
            animation: successPulse 0.6s ease-out;
          `;
          
          // Add success animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes successPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `;
          document.head.appendChild(style);
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            container.style.background = 'transparent';
            container.style.border = 'none';
            container.style.padding = '0';
            
            // Convert back to normal text
            const parent = container.parentNode;
            if (parent) {
              parent.replaceChild(textNode, container);
            }
          }, 3000);
          
          console.log('Text Correction: Live replacement completed');
        }
      }, 25); // 25ms delay between characters for smoother effect
      
    } catch (error) {
      console.error('Text Correction: Error replacing text:', error);
      
      // Fallback: simple text replacement
      try {
        range.deleteContents();
        range.insertNode(document.createTextNode(correctedText));
        console.log('Text Correction: Fallback replacement successful');
      } catch (fallbackError) {
        console.error('Text Correction: Fallback also failed:', fallbackError);
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

})(); // End of IIFE