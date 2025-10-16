let isListening = false;
let recognition = null;
let user = null;
let currentUsage = 0;
let userPlan = 'free'; // 'free', 'basic', 'pro'
const DAILY_LIMITS = {
  free: 10,
  basic: 100,
  pro: -1 // unlimited
};

document.addEventListener('DOMContentLoaded', function() {
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const promptInput = document.getElementById('promptInput');
  const submitBtn = document.getElementById('submitBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const response = document.getElementById('response');
  const loading = document.getElementById('loading');
  const usageCount = document.getElementById('usageCount');
  const premiumSection = document.getElementById('premiumSection');
  const goPremiumBtn = document.getElementById('goPremiumBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');

  // Initialize voice recognition
  initVoiceRecognition();

  // Check if user is signed in
  checkAuthStatus();

  // Event listeners
  googleSignInBtn.addEventListener('click', signInWithGoogle);
  signOutBtn.addEventListener('click', signOut);
  settingsBtn.addEventListener('click', openSettings);
  submitBtn.addEventListener('click', handleSubmit);
  voiceBtn.addEventListener('click', toggleVoiceRecognition);

  // Keyboard shortcut
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      handleSubmit();
    }
  });

  async function checkAuthStatus() {
    try {
      const result = await chrome.storage.local.get(['user', 'usageCount', 'lastReset']);
      const today = new Date().toDateString();
      
      // Reset usage count if it's a new day
      if (result.lastReset !== today) {
        await chrome.storage.local.set({ 
          usageCount: 0, 
          lastReset: today 
        });
        currentUsage = 0;
      } else {
        currentUsage = result.usageCount || 0;
      }

      if (result.user) {
        user = result.user;
        showAppScreen();
      } else {
        showLoginScreen();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    loginScreen.style.display = 'block';
    appScreen.style.display = 'none';
  }

  function showAppScreen() {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'block';
    
    if (user) {
      userAvatar.src = user.picture || '';
      userName.textContent = user.name || user.email;
    }
    
    updateUsageDisplay();
  }

  async function signInWithGoogle() {
    try {
      const token = await chrome.identity.getAuthToken({ interactive: true });
      
      // Get user info from Google
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
      const userInfo = await response.json();
      
      user = {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      };
      
      // Store user info
      await chrome.storage.local.set({ user });
      
      showAppScreen();
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in. Please try again.');
    }
  }

  async function signOut() {
    try {
      await chrome.identity.clearAllCachedAuthTokens();
      await chrome.storage.local.remove(['user']);
      user = null;
      showLoginScreen();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  function updateUsageDisplay() {
    const limit = DAILY_LIMITS[userPlan];
    if (limit === -1) {
      usageCount.textContent = `${currentUsage}/∞ (Pro)`;
    } else {
      usageCount.textContent = `${currentUsage}/${limit}`;
    }
    
    if (limit !== -1 && currentUsage >= limit) {
      premiumSection.style.display = 'block';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Daily limit reached';
    } else {
      premiumSection.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send to AI';
    }
  }

  async function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = function() {
        isListening = true;
        voiceBtn.classList.add('listening');
        voiceStatus.textContent = 'Listening...';
      };

      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        promptInput.value = transcript;
        voiceStatus.textContent = 'Got it!';
        setTimeout(() => {
          voiceStatus.textContent = '';
        }, 2000);
      };

      recognition.onerror = function(event) {
        voiceStatus.textContent = 'Error: ' + event.error;
        isListening = false;
        voiceBtn.classList.remove('listening');
      };

      recognition.onend = function() {
        isListening = false;
        voiceBtn.classList.remove('listening');
      };
    } else {
      voiceBtn.style.display = 'none';
      voiceStatus.textContent = 'Voice not supported';
    }
  }

  function toggleVoiceRecognition() {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }

  async function handleSubmit() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Please enter a prompt or use voice input.');
      return;
    }

    const limit = DAILY_LIMITS[userPlan];
    if (limit !== -1 && currentUsage >= limit) {
      showLimitReachedMessage();
      return;
    }

    try {
      // Show loading
      loading.style.display = 'flex';
      response.innerHTML = '';
      submitBtn.disabled = true;

      // Get webpage context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const webpageData = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });

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
      
      // Display response
      response.innerHTML = formatResponse(aiResponse);
      
      // Update usage count
      currentUsage++;
      await chrome.storage.local.set({ usageCount: currentUsage });
      updateUsageDisplay();

    } catch (error) {
      console.error('Error:', error);
      response.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
      loading.style.display = 'none';
      submitBtn.disabled = false;
    }
  }

  async function callAI(prompt, context, userPlan) {
    // For now, this will be a placeholder until you set up your backend
    // In the future, this will call your server with the user's plan info
    
    const systemPrompt = `You are AutoContext Voice AI, a helpful assistant that understands webpage context. 
    
    Current webpage context:
    - URL: ${context.url}
    - Title: ${context.title}
    - Content: ${context.content.substring(0, 2000)}...
    
    Help the user with their request while considering the webpage context when relevant.`;

    // TODO: Replace with your actual backend endpoint
    const response = await fetch('https://your-backend.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userPlan}` // User's plan info
      },
      body: JSON.stringify({
        model: userPlan === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }

    const data = await response.json();
    return data.response || 'AI response received successfully!';
  }

  function formatResponse(text) {
    // Convert markdown-like formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function showLimitReachedMessage() {
    const limit = DAILY_LIMITS[userPlan];
    const limitText = limit === 10 ? '10 free requests' : `${limit} requests`;
    
    response.innerHTML = `
      <div class="limit-reached">
        <h3>🚫 Daily Limit Reached</h3>
        <p>You've used all ${limitText} for today. Upgrade for more requests!</p>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button class="premium-btn" onclick="upgradeToPlan('basic')">
            Basic - $4.99/month
          </button>
          <button class="premium-btn" onclick="upgradeToPlan('pro')">
            Pro - $9.99/month
          </button>
        </div>
      </div>
    `;
  }

  function upgradeToPlan(plan) {
    // This will be implemented with your payment system
    alert(`Upgrade to ${plan} plan coming soon! Contact support@youraiasistant.com`);
  }

  // Initialize display
  checkAuthStatus();
});
