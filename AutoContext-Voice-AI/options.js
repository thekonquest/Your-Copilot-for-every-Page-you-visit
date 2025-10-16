// Options page script for AutoContext Voice AI

document.addEventListener('DOMContentLoaded', function() {
  const currentPlan = document.getElementById('currentPlan');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const usageCount = document.getElementById('usageCount');
  const usageStatus = document.getElementById('usageStatus');
  const resetUsageBtn = document.getElementById('resetUsageBtn');
  const userEmail = document.getElementById('userEmail');
  const accountStatus = document.getElementById('accountStatus');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const messageContainer = document.getElementById('messageContainer');

  // Load saved settings
  loadPlanInfo();
  loadUsageStats();
  loadAccountInfo();

  // Event listeners
  upgradeBtn.addEventListener('click', upgradePlan);
  resetUsageBtn.addEventListener('click', resetUsage);
  signInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);

  async function loadPlanInfo() {
    try {
      const result = await chrome.storage.sync.get(['userPlan']);
      const plan = result.userPlan || 'free';
      
      const planNames = {
        free: 'Free Plan',
        basic: 'Basic Plan',
        pro: 'Pro Plan'
      };
      
      const planFeatures = {
        free: '10 requests/day with GPT-3.5',
        basic: '100 requests/day with GPT-3.5',
        pro: 'Unlimited requests with choice of AI model'
      };
      
      currentPlan.innerHTML = `
        <span class="plan-name">${planNames[plan]}</span>
        <span class="plan-features">${planFeatures[plan]}</span>
      `;
      
      if (plan === 'free') {
        upgradeBtn.style.display = 'inline-block';
      } else {
        upgradeBtn.style.display = 'none';
      }
      
    } catch (error) {
      console.error('Error loading plan info:', error);
      showMessage('Error loading plan info', 'error');
    }
  }

  async function upgradePlan() {
    try {
      showMessage('Upgrade functionality coming soon! Contact support@youraiasistant.com for early access.', 'info');
    } catch (error) {
      console.error('Error upgrading plan:', error);
      showMessage('Error upgrading plan', 'error');
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
      
      // Always show connected since we handle API keys on our end
      usageStatus.textContent = 'Connected';
      usageStatus.className = 'status connected';
      
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
