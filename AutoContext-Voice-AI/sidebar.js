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

  // Event listeners
  googleSignInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);
  settingsBtn.addEventListener('click', openSettings);
  submitBtn.addEventListener('click', handleSubmit);
  
  
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
    
    // Add auto-fill buttons for AI messages
    let autoFillButtons = '';
    if (role === 'ai') {
      const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      autoFillButtons = `
        <div class="auto-fill-buttons">
          <button class="auto-fill-btn fill-form-btn" data-message-id="${messageId}">
            📝 Fill Form
          </button>
          <button class="auto-fill-btn fill-title-btn" data-message-id="${messageId}">
            📋 Fill Title
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
    
    // Add event listeners for auto-fill buttons
    if (role === 'ai') {
      const fillFormBtn = messageDiv.querySelector('.fill-form-btn');
      const fillTitleBtn = messageDiv.querySelector('.fill-title-btn');
      
      if (fillFormBtn) {
        fillFormBtn.addEventListener('click', () => {
          fillFormFields(content);
        });
      }
      
      if (fillTitleBtn) {
        fillTitleBtn.addEventListener('click', () => {
          fillTitleField(content);
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

  // Auto-fill functions
  async function fillFormFields(content) {
    try {
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
      
      // Send message to content script to fill form fields
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillFormFields',
        content: content
      });
      
      if (response && response.success) {
        addMessageToChat('✅ Form fields filled successfully!', 'ai');
      } else {
        addMessageToChat('❌ No form fields found to fill. Make sure you\'re on a webpage with form fields.', 'ai');
      }
    } catch (error) {
      console.error('Error filling form fields:', error);
      addMessageToChat('❌ Error filling form fields. Make sure you\'re on a webpage with form fields.', 'ai');
    }
  }

  async function fillTitleField(content) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Extract title from content (look for **Title:** pattern)
      const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : content.split('\n')[0].trim();
      
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
      
      // Send message to content script to fill title field
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillTitleField',
        title: title
      });
      
      if (response && response.success) {
        addMessageToChat('✅ Title field filled successfully!', 'ai');
      } else {
        addMessageToChat('❌ No title field found to fill. Make sure you\'re on a webpage with a title field.', 'ai');
      }
    } catch (error) {
      console.error('Error filling title field:', error);
      addMessageToChat('❌ Error filling title field. Make sure you\'re on a webpage with a title field.', 'ai');
    }
  }

  // Global functions for inline event handlers
  window.upgradeToPlan = upgradeToPlan;
});
