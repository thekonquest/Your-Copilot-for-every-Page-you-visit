# Your Copilot Backend API

A secure backend API for the "Your copilot for every page you visit" Chrome extension.

## Features

- 🔒 **Secure API key handling** - OpenAI key never exposed to clients
- 📊 **Usage tracking** - Per-user daily limits and plan management
- 🚀 **Rate limiting** - Protection against abuse
- 🛡️ **Security headers** - Helmet.js for security
- 🌐 **CORS configured** - For Chrome extension access

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file:
```bash
cp env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your-openai-api-key-here
PORT=3000
NODE_ENV=development
```

**Important:** The `.env` file is in `.gitignore` and will NOT be committed to GitHub. This keeps your API key secure!

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```

## API Endpoints

### POST /api/chat
Send a message to the AI assistant.

**Request:**
```json
{
  "message": "Summarize this page",
  "context": {
    "url": "https://example.com",
    "title": "Example Page",
    "content": "Page content here..."
  },
  "userId": "user123",
  "userPlan": "free"
}
```

**Response:**
```json
{
  "success": true,
  "response": "AI response here...",
  "usage": {
    "count": 5,
    "limit": 10,
    "plan": "free"
  }
}
```

### GET /api/usage/:userId
Get usage statistics for a user.

**Response:**
```json
{
  "userId": "user123",
  "usage": {
    "count": 5,
    "limit": 10,
    "plan": "free",
    "remaining": 5
  }
}
```

### POST /api/plan
Update user plan.

**Request:**
```json
{
  "userId": "user123",
  "plan": "basic"
}
```

## Deployment

### Render.com
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variable: `OPENAI_API_KEY`

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Security

- API keys are stored securely in environment variables
- Rate limiting prevents abuse
- CORS is configured for Chrome extension
- Helmet.js provides security headers
- Input validation and error handling

## Plan Limits

- **Free**: 10 requests/day
- **Basic**: 100 requests/day  
- **Pro**: Unlimited requests
