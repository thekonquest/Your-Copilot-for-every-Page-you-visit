const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['chrome-extension://ionkccbkjikklcjdnmkkolbhilednipj', 'http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Import OpenAI
const OpenAI = require('openai');

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// User plan limits
const PLAN_LIMITS = {
  free: 10,
  basic: 100,
  pro: -1 // unlimited
};

// In-memory storage for demo (in production, use a database)
const userUsage = new Map();

// Helper function to get user usage
function getUserUsage(userId) {
  const today = new Date().toDateString();
  const key = `${userId}-${today}`;
  
  if (!userUsage.has(key)) {
    userUsage.set(key, { count: 0, plan: 'free' });
  }
  
  return userUsage.get(key);
}

// Helper function to check if user can make request
function canMakeRequest(userId, plan = 'free') {
  const usage = getUserUsage(userId);
  const limit = PLAN_LIMITS[plan];
  
  if (limit === -1) return true; // unlimited
  return usage.count < limit;
}

// Helper function to increment usage
function incrementUsage(userId) {
  const usage = getUserUsage(userId);
  usage.count++;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Main AI endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { 
      message, 
      context, 
      userId = 'anonymous', 
      userPlan = 'free' 
    } = req.body;

    // Validate request
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Check usage limits
    if (!canMakeRequest(userId, userPlan)) {
      return res.status(429).json({ 
        error: 'Daily limit reached',
        limit: PLAN_LIMITS[userPlan],
        currentUsage: getUserUsage(userId).count
      });
    }

    // Prepare system prompt with context
    let systemPrompt = `You are a helpful AI assistant that understands webpage context.`;
    
    if (context) {
      systemPrompt += `\n\nCurrent webpage context:
- URL: ${context.url || 'Unknown'}
- Title: ${context.title || 'Unknown'}
- Content: ${context.content ? context.content.substring(0, 2000) + '...' : 'No content available'}

Help the user with their request while considering the webpage context when relevant.`;
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: userPlan === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    // Increment usage
    incrementUsage(userId);

    // Return response
    res.json({
      success: true,
      response: completion.choices[0].message.content,
      usage: {
        count: getUserUsage(userId).count,
        limit: PLAN_LIMITS[userPlan],
        plan: userPlan
      }
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        error: 'API quota exceeded. Please check your OpenAI account.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your OpenAI configuration.' 
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get usage stats endpoint
app.get('/api/usage/:userId', (req, res) => {
  const { userId } = req.params;
  const usage = getUserUsage(userId);
  
  res.json({
    userId,
    usage: {
      count: usage.count,
      limit: PLAN_LIMITS[usage.plan],
      plan: usage.plan,
      remaining: PLAN_LIMITS[usage.plan] === -1 ? -1 : PLAN_LIMITS[usage.plan] - usage.count
    }
  });
});

// Update user plan endpoint
app.post('/api/plan', (req, res) => {
  const { userId, plan } = req.body;
  
  if (!userId || !plan || !PLAN_LIMITS.hasOwnProperty(plan)) {
    return res.status(400).json({ 
      error: 'Invalid userId or plan' 
    });
  }
  
  const usage = getUserUsage(userId);
  usage.plan = plan;
  
  res.json({
    success: true,
    plan: plan,
    limit: PLAN_LIMITS[plan]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Your Copilot Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI endpoint: http://localhost:${PORT}/api/chat`);
});

module.exports = app;
