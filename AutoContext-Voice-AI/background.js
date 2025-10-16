// Background script for AutoContext AI

// Handle keyboard shortcut (Ctrl+M)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('Side panel opened via keyboard shortcut');
    } catch (error) {
      console.error('Error opening side panel via shortcut:', error);
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    console.log('Side panel opened');
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    // This will be handled by the content script
    return true;
  }
});

// Listen for tab updates to potentially refresh content script data
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Tab has finished loading, content script will be ready
    console.log('Tab updated:', tab.url);
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AutoContext AI installed successfully!');
    
    // Set default settings
    chrome.storage.sync.set({
      openaiApiKey: '',
      premiumKey: ''
    });
    
    // Open options page for first-time setup
    chrome.runtime.openOptionsPage();
  }
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes, namespace);
});

// Utility functions
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Export for potential use by other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCurrentTab
  };
}
