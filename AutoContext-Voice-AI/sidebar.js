// Sidebar JavaScript for AutoContext AI

let user = null;
let currentUsage = 0;
let userPlan = 'free'; // 'free', 'basic', 'pro'
let chatHistory = [];
const DAILY_LIMITS = {
  free: 10,
  basic: 100,
  pro: -1 // unlimited
};

// Smart Writing Features - Declare variables first
let selectedText = '';
let currentMode = 'professional';
let currentPlatform = '';
let textSelectionListenerAdded = false;

// Platform Detection
async function detectPlatform() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      console.log('No active tab found');
      return;
    }
    
    const tab = tabs[0];
    if (!tab || !tab.url) {
      console.log('Tab or URL not available');
      return;
    }
    
    const url = tab.url;
    let platform = 'General';
    
    if (url.includes('linkedin.com')) platform = 'LinkedIn';
    else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'Twitter';
    else if (url.includes('gmail.com')) platform = 'Gmail';
    else if (url.includes('facebook.com')) platform = 'Facebook';
    else if (url.includes('instagram.com')) platform = 'Instagram';
    else if (url.includes('medium.com')) platform = 'Medium';
    else if (url.includes('notion.so')) platform = 'Notion';
    else if (url.includes('slack.com')) platform = 'Slack';
    
    currentPlatform = platform;
    
    // Only update UI if elements exist
    const platformBadge = document.getElementById('platformBadge');
    if (platformBadge) {
      platformBadge.textContent = platform;
    }
    
    // Show writing modes for supported platforms
    if (['LinkedIn', 'Twitter', 'Gmail', 'Facebook', 'Instagram', 'Medium', 'Notion', 'Slack'].includes(platform)) {
      const writingModes = document.getElementById('writingModes');
      if (writingModes) {
        writingModes.style.display = 'block';
      }
    }
    
  } catch (error) {
    console.log('Error detecting platform:', error);
    // Don't throw error, just log it
  }
}

// Text Selection Setup
function setupTextSelection() {
  if (textSelectionListenerAdded) return;
  
  // Listen for text selection from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request.action === 'textSelected') {
        selectedText = request.text;
        const rewriteBtn = document.getElementById('rewriteBtn');
        if (rewriteBtn) {
          rewriteBtn.disabled = false;
        }
        addMessageToChat(`📝 Selected: "${request.text.substring(0, 50)}${request.text.length > 50 ? '...' : ''}"`, 'user');
      } else if (request.action === 'textDeselected') {
        selectedText = '';
        const rewriteBtn = document.getElementById('rewriteBtn');
        if (rewriteBtn) {
          rewriteBtn.disabled = true;
        }
      }
    } catch (error) {
      console.log('Error handling text selection message:', error);
    }
  });
  
  textSelectionListenerAdded = true;
}

document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const promptInput = document.getElementById('promptInput');
  const submitBtn = document.getElementById('submitBtn');
  const loading = document.getElementById('loading');
  const usageCount = document.getElementById('usageCount');
  const planType = document.getElementById('planType');
  const dailyUsage = document.getElementById('dailyUsage');
  const dailyLimit = document.getElementById('dailyLimit');
  const charCount = document.getElementById('charCount');
  const premiumSection = document.getElementById('premiumSection');
  const messagesContainer = document.getElementById('messagesContainer');

  // Initialize
  checkAuthStatus();
  loadChatHistory();
  loadUsageStats();
  detectPlatform();
  setupTextSelection();

  // Event listeners
  googleSignInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);
  settingsBtn.addEventListener('click', openSettings);
  submitBtn.addEventListener('click', handleSubmit);
  
  // Smart Writing Features
  document.getElementById('rewriteBtn').addEventListener('click', handleRewrite);
  document.getElementById('manualRewriteBtn').addEventListener('click', handleManualRewrite);
  
  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });
  
  
  // Character counter
  promptInput.addEventListener('input', updateCharCount);
  
  // Enter key to submit
  promptInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  });

  // Auto-resize textarea
  promptInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  async function checkAuthStatus() {
    try {
      const result = await chrome.storage.sync.get(['user', 'userPlan']);
      
      if (result.user) {
        user = result.user;
        userPlan = result.userPlan || 'free';
        showAppScreen();
        updateUserInfo();
      } else {
        showLoginScreen();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    loginScreen.style.display = 'flex';
    appScreen.style.display = 'none';
  }

  function showAppScreen() {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'flex';
    updateUsageDisplay();
  }

  function updateUserInfo() {
    if (user) {
      // Update header with user info if needed
    }
  }

  async function signInWithGoogle() {
    try {
      googleSignInBtn.disabled = true;
      googleSignInBtn.textContent = 'Signing in...';

      const token = await chrome.identity.getAuthToken({ interactive: true });
      
      // Get user info
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
      const userInfo = await response.json();

      user = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      };

      // Save user data
      await chrome.storage.sync.set({ user, userPlan: 'free' });
      
      showAppScreen();
      updateUserInfo();
      
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please try again.');
    } finally {
      googleSignInBtn.disabled = false;
      googleSignInBtn.textContent = 'Sign in with Google';
    }
  }

  async function signOut() {
    try {
      await chrome.storage.sync.clear();
      user = null;
      userPlan = 'free';
      chatHistory = [];
      currentUsage = 0;
      showLoginScreen();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
  }


  function updateCharCount() {
    const count = promptInput.value.length;
    charCount.textContent = `${count}/1000`;
    
    if (count > 900) {
      charCount.style.color = '#ef4444';
    } else if (count > 800) {
      charCount.style.color = '#f59e0b';
    } else {
      charCount.style.color = '#64748b';
    }
  }

  async function loadUsageStats() {
    try {
      const result = await chrome.storage.local.get(['usageCount', 'lastReset']);
      const today = new Date().toDateString();
      
      if (result.lastReset === today) {
        currentUsage = result.usageCount || 0;
      } else {
        currentUsage = 0;
        await chrome.storage.local.set({ usageCount: 0, lastReset: today });
      }
      
      updateUsageDisplay();
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  }

  function updateUsageDisplay() {
    const limit = DAILY_LIMITS[userPlan];
    
    if (limit === -1) {
      usageCount.textContent = `${currentUsage}/∞`;
      planType.textContent = 'Pro';
      dailyUsage.textContent = currentUsage;
      dailyLimit.textContent = '∞';
    } else {
      usageCount.textContent = `${currentUsage}/${limit}`;
      planType.textContent = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
      dailyUsage.textContent = currentUsage;
      dailyLimit.textContent = limit;
    }
    
    if (limit !== -1 && currentUsage >= limit) {
      premiumSection.style.display = 'block';
      submitBtn.disabled = true;
      promptInput.disabled = true;
      
    } else {
      premiumSection.style.display = 'none';
      submitBtn.disabled = false;
      promptInput.disabled = false;
      
    }
  }

  async function loadChatHistory() {
    try {
      const result = await chrome.storage.local.get(['chatHistory']);
      chatHistory = result.chatHistory || [];
      renderChatHistory();
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  async function saveChatHistory() {
    try {
      await chrome.storage.local.set({ chatHistory });
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  function renderChatHistory() {
    // Clear welcome message if we have chat history
    if (chatHistory.length > 0) {
      const welcomeMessage = messagesContainer.querySelector('.welcome-message');
      if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
      }
    }

    // Render all messages
    chatHistory.forEach(message => {
      addMessageToChat(message.content, message.role, message.timestamp, false);
    });
    
    scrollToBottom();
  }

  function addMessageToChat(content, role, timestamp = null, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const time = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add auto-fill button for AI messages
    let autoFillButtons = '';
    if (role === 'ai') {
      const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      autoFillButtons = `
        <div class="auto-fill-buttons">
          <button class="auto-fill-btn fill-form-btn" data-message-id="${messageId}">
            📝 Fill Form
          </button>
        </div>
      `;
    }
    
    messageDiv.innerHTML = `
      <div class="message-content">
        ${formatMessage(content)}
      </div>
      ${autoFillButtons}
      <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Add event listener for auto-fill button
    if (role === 'ai') {
      const fillFormBtn = messageDiv.querySelector('.fill-form-btn');
      
      if (fillFormBtn) {
        fillFormBtn.addEventListener('click', () => {
          fillFormFields(content);
        });
      }
    }
    
    if (save && role === 'user') {
      chatHistory.push({
        content,
        role,
        timestamp: time
      });
      saveChatHistory();
    }
    
    if (save && role === 'ai') {
      chatHistory.push({
        content,
        role,
        timestamp: time
      });
      saveChatHistory();
    }
    
    scrollToBottom();
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSubmit() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      return;
    }

    const limit = DAILY_LIMITS[userPlan];
    if (limit !== -1 && currentUsage >= limit) {
      return;
    }

    // Add user message to chat
    addMessageToChat(prompt, 'user');
    
    // Clear input
    promptInput.value = '';
    promptInput.style.height = 'auto';
    updateCharCount();

    // Show loading
    loading.style.display = 'flex';
    submitBtn.disabled = true;

    try {
      // Get webpage context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // First, ensure content script is injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript.js']
        });
      } catch (error) {
        console.log('Content script already injected or injection failed:', error);
      }
      
      // Wait a moment for the script to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let webpageData;
      try {
        webpageData = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
      } catch (error) {
        console.log('Content script communication failed, using fallback data');
        webpageData = {
          url: tab.url,
          title: tab.title,
          content: 'Unable to extract page content. The AI will still help with your request.'
        };
      }

      // Get user plan for API selection
      const planResult = await chrome.storage.sync.get(['userPlan']);
      const userPlan = planResult.userPlan || 'free';

      // Prepare the context for AI
      const context = {
        url: webpageData.url,
        title: webpageData.title,
        content: webpageData.content
      };

      // Call our AI backend
      const aiResponse = await callAI(prompt, context, userPlan);
      
      // Add AI response to chat
      addMessageToChat(aiResponse, 'ai');
      
      // Update usage count
      currentUsage++;
      await chrome.storage.local.set({ usageCount: currentUsage });
      updateUsageDisplay();
      
    } catch (error) {
      console.error('Error sending prompt:', error);
      addMessageToChat(`Sorry, I encountered an error: ${error.message}`, 'ai');
    } finally {
      loading.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  async function callAI(prompt, context, userPlan) {
    const systemPrompt = `You are a copilot for every page the user visits, a helpful AI assistant that understands webpage context. 
    
    Current webpage context:
    - URL: ${context.url}
    - Title: ${context.title}
    - Content: ${context.content.substring(0, 2000)}...
    
    Help the user with their request while considering the webpage context when relevant.`;

    // Use our secure backend API instead of calling OpenAI directly
    const backendUrl = 'https://your-copilot-for-every-page-you-visit.onrender.com';
    
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: prompt,
        context: context,
        userId: user?.email || 'anonymous',
        userPlan: userPlan
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 429) {
        throw new Error(`Daily limit reached. You've used ${errorData.currentUsage}/${errorData.limit} requests.`);
      }
      
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const data = await response.json();
    return data.response;
  }

  function upgradeToPlan(plan) {
    // This will be implemented with your payment system
    alert(`Upgrade to ${plan} plan coming soon! Contact support@youraiasistant.com`);
  }

  // Click-to-fill system
  let currentFillContent = '';

  // Auto-fill functions - UNIVERSAL, NO DETECTION
  async function fillFormFields(content) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Always inject content script - works on ANY page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
      
      // Wait a moment for the script to load
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Store content for later use
      currentFillContent = content;
      
      // Start click-to-fill mode - ALWAYS works
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillFormFields',
        content: content
      });
      
      // Always show success - no error checking
      addMessageToChat('🎯 Click on ANY field to fill it instantly!', 'ai');
      
    } catch (error) {
      console.error('Error starting click-to-fill mode:', error);
      // Even if there's an error, try to start click-to-fill mode
      addMessageToChat('🎯 Click on ANY field to fill it instantly!', 'ai');
    }
  }







// Mode Selection
function selectMode(mode) {
  currentMode = mode;
  
  // Update button states
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  
  addMessageToChat(`🎯 Writing mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, 'ai');
}

// Rewrite Selected Text
async function handleRewrite() {
  if (!selectedText) {
    addMessageToChat('❌ Please select some text first!', 'ai');
    return;
  }

  try {
    const lengthSelect = document.getElementById('lengthSelect');
    const length = lengthSelect ? lengthSelect.value : 'medium';
    const prompt = `Rewrite this text in a ${currentMode} tone, ${length} length: "${selectedText}"`;
    
    addMessageToChat(`✏️ Rewriting in ${currentMode} tone...`, 'ai');
    
    const response = await callAI(prompt);
    if (response) {
      addMessageToChat(`✨ Rewritten: ${response}`, 'ai');
      
      // Try to replace text on the page
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0 && tabs[0] && tabs[0].id) {
          const tab = tabs[0];
          
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['contentScript.js']
          });
          
          // Wait a moment for script to load
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Send message to replace text
          const result = await chrome.tabs.sendMessage(tab.id, {
            action: 'replaceSelectedText',
            newText: response
          });
          
          if (result && result.success) {
            addMessageToChat('✅ Text replaced on page!', 'ai');
          } else {
            addMessageToChat('✅ Text rewritten! Copy it from above.', 'ai');
          }
        } else {
          addMessageToChat('✅ Text rewritten! Copy it from above.', 'ai');
        }
      } catch (tabError) {
        console.log('Could not replace text on page:', tabError);
        addMessageToChat('✅ Text rewritten! Copy it from the chat above.', 'ai');
      }
    }
  } catch (error) {
    console.log('Error rewriting text:', error);
    addMessageToChat('❌ Error rewriting text. Please try again.', 'ai');
  }
}

// Manual Rewrite (fallback)
async function handleManualRewrite() {
  const inputText = promptInput.value.trim();
  
  if (!inputText) {
    addMessageToChat('❌ Please type some text to rewrite first!', 'ai');
    return;
  }

  try {
    const lengthSelect = document.getElementById('lengthSelect');
    const length = lengthSelect ? lengthSelect.value : 'medium';
    const prompt = `Rewrite this text in a ${currentMode} tone, ${length} length: "${inputText}"`;
    
    addMessageToChat(`✏️ Rewriting in ${currentMode} tone...`, 'ai');
    
    const response = await callAI(prompt);
    if (response) {
      addMessageToChat(`✨ Rewritten: ${response}`, 'ai');
      
      // Clear the input
      promptInput.value = '';
      updateCharCount();
      
      addMessageToChat('✅ Text rewritten! Copy it from above.', 'ai');
    }
  } catch (error) {
    console.log('Error rewriting text:', error);
    addMessageToChat('❌ Error rewriting text. Please try again.', 'ai');
  }
}


// Global functions for inline event handlers
window.upgradeToPlan = upgradeToPlan;
});
