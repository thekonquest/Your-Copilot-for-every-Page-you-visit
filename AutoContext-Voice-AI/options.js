// Options page script for AutoContext Voice AI

document.addEventListener('DOMContentLoaded', function() {
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const premiumKeyInput = document.getElementById('premiumKey');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const usageCount = document.getElementById('usageCount');
  const usageStatus = document.getElementById('usageStatus');
  const resetUsageBtn = document.getElementById('resetUsageBtn');
  const userEmail = document.getElementById('userEmail');
  const accountStatus = document.getElementById('accountStatus');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const messageContainer = document.getElementById('messageContainer');

  // Load saved settings
  loadSettings();
  loadUsageStats();
  loadAccountInfo();

  // Event listeners
  saveBtn.addEventListener('click', saveSettings);
  testBtn.addEventListener('click', testConnection);
  resetUsageBtn.addEventListener('click', resetUsage);
  signInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['openaiApiKey', 'premiumKey']);
      
      if (result.openaiApiKey) {
        openaiApiKeyInput.value = result.openaiApiKey;
      }
      
      if (result.premiumKey) {
        premiumKeyInput.value = result.premiumKey;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Error loading settings', 'error');
    }
  }

  async function saveSettings() {
    try {
      const openaiApiKey = openaiApiKeyInput.value.trim();
      const premiumKey = premiumKeyInput.value.trim();

      if (!openaiApiKey) {
        showMessage('Please enter your OpenAI API key', 'error');
        return;
      }

      // Validate API key format
      if (!openaiApiKey.startsWith('sk-')) {
        showMessage('Invalid API key format. OpenAI keys start with "sk-"', 'error');
        return;
      }

      // Save to storage
      await chrome.storage.sync.set({
        openaiApiKey,
        premiumKey
      });

      showMessage('Settings saved successfully!', 'success');
      
      // Update status
      usageStatus.textContent = 'Connected';
      usageStatus.className = 'status connected';
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Error saving settings', 'error');
    }
  }

  async function testConnection() {
    try {
      const result = await chrome.storage.sync.get(['openaiApiKey']);
      
      if (!result.openaiApiKey) {
        showMessage('Please save your API key first', 'error');
        return;
      }

      showMessage('Testing connection...', 'info');

      // Test API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'Hello, this is a test message.' }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        showMessage('✅ Connection successful! API key is working.', 'success');
        usageStatus.textContent = 'Connected';
        usageStatus.className = 'status connected';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Connection failed');
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      showMessage(`❌ Connection failed: ${error.message}`, 'error');
      usageStatus.textContent = 'Connection Failed';
      usageStatus.className = 'status disconnected';
    }
  }

  async function loadUsageStats() {
    try {
      const result = await chrome.storage.local.get(['usageCount', 'lastReset']);
      const today = new Date().toDateString();
      
      let currentUsage = 0;
      if (result.lastReset === today) {
        currentUsage = result.usageCount || 0;
      }
      
      usageCount.textContent = currentUsage;
      
      // Check if API key is configured
      const settings = await chrome.storage.sync.get(['openaiApiKey']);
      if (settings.openaiApiKey) {
        usageStatus.textContent = 'Connected';
        usageStatus.className = 'status connected';
      } else {
        usageStatus.textContent = 'Not Connected';
        usageStatus.className = 'status disconnected';
      }
      
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  }

  async function resetUsage() {
    try {
      const today = new Date().toDateString();
      await chrome.storage.local.set({
        usageCount: 0,
        lastReset: today
      });
      
      usageCount.textContent = '0';
      showMessage('Daily usage reset successfully!', 'success');
      
    } catch (error) {
      console.error('Error resetting usage:', error);
      showMessage('Error resetting usage', 'error');
    }
  }

  async function loadAccountInfo() {
    try {
      const result = await chrome.storage.local.get(['user']);
      
      if (result.user) {
        userEmail.textContent = result.user.email || result.user.name;
        accountStatus.textContent = 'Connected';
        accountStatus.className = 'status connected';
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'inline-block';
      } else {
        userEmail.textContent = 'Not signed in';
        accountStatus.textContent = 'Disconnected';
        accountStatus.className = 'status disconnected';
        signInBtn.style.display = 'inline-block';
        signOutBtn.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Error loading account info:', error);
    }
  }

  async function signInWithGoogle() {
    try {
      const token = await chrome.identity.getAuthToken({ interactive: true });
      
      // Get user info from Google
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
      const userInfo = await response.json();
      
      const user = {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      };
      
      // Store user info
      await chrome.storage.local.set({ user });
      
      showMessage('Successfully signed in with Google!', 'success');
      loadAccountInfo();
      
    } catch (error) {
      console.error('Sign in error:', error);
      showMessage('Failed to sign in. Please try again.', 'error');
    }
  }

  async function signOut() {
    try {
      await chrome.identity.clearAllCachedAuthTokens();
      await chrome.storage.local.remove(['user']);
      
      showMessage('Signed out successfully!', 'success');
      loadAccountInfo();
      
    } catch (error) {
      console.error('Sign out error:', error);
      showMessage('Error signing out', 'error');
    }
  }

  function showMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    
    messageContainer.innerHTML = '';
    messageContainer.appendChild(messageEl);
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.parentNode.removeChild(messageEl);
        }
      }, 3000);
    }
  }

  // Auto-save on input change (with debounce)
  let saveTimeout;
  [openaiApiKeyInput, premiumKeyInput].forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (openaiApiKeyInput.value.trim() && openaiApiKeyInput.value.startsWith('sk-')) {
          saveSettings();
        }
      }, 1000);
    });
  });
});
