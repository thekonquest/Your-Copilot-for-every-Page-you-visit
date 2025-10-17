# 🤖 Your copilot for every page you visit

A powerful Chrome extension that provides AI assistance for any webpage you're browsing. Your intelligent copilot that understands context and helps you with text generation, summaries, and smart assistance.

## ✨ Features

- **🤖 AI Assistant**: Powered by OpenAI GPT-3.5-turbo and GPT-4
- **🌐 Context Awareness**: Understands the webpage you're browsing
- **📝 Text Generation & Correction**: AI-powered writing assistance
- **📄 Auto-Summarize**: Instantly summarize any webpage without copy/paste
- **🔐 Google Sign-in**: Secure authentication with your Google account
- **📊 Usage Tracking**: Free tier with daily limits
- **⚡ Keyboard Shortcut**: Press `Ctrl+M` to open instantly
- **💬 Sidebar Interface**: Clean, modern sidebar instead of popup

## 🚀 Quick Start

### 1. Install the Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. The "Your copilot for every page you visit" icon will appear in your toolbar

### 2. Sign In with Google

1. Click the extension icon to open the sidebar
2. Click "Sign in with Google"
3. Complete the Google authentication
4. You're ready to use your copilot!

## 🎯 How to Use

### Text Input
1. Click the extension icon to open the sidebar
2. Type your question or request in the text area
3. Click "Send to AI" or press `Enter`

### Example Requests
- "Summarize this article"
- "What are the key points from this page?"
- "Explain this concept in simple terms"
- "Write a professional email about this topic"
- "Correct the grammar in this text"

## 💰 Pricing Plans

### Free Plan
- 10 requests per day
- GPT-3.5 Turbo AI
- Basic contextual understanding

### Basic Plan - $4.99/month
- 100 requests per day
- GPT-3.5 Turbo AI
- Enhanced contextual understanding

### Pro Plan - $9.99/month
- Unlimited requests
- Choice of AI model (GPT-3.5, GPT-4, Claude)
- Full contextual understanding
- Premium features

## 📁 File Structure

```
AutoContext-Voice-AI/
├── manifest.json          # Extension configuration
├── sidebar.html           # Main sidebar interface
├── sidebar.css            # Sidebar styling
├── sidebar.js             # Sidebar functionality
├── background.js          # Background service worker
├── contentScript.js       # Webpage data extraction
├── options.html           # Settings page
├── options.js             # Settings functionality
├── index.html             # Landing page
├── style.css              # Landing page styling
└── README.md              # This file
```

## 🔒 Privacy & Security

- **Google OAuth**: Uses Google's secure authentication system
- **No Data Collection**: We don't collect or store your personal data
- **Secure API Calls**: All AI requests are handled securely
- **Open Source**: All code is transparent and auditable

## 🛠️ Development

### Prerequisites
- Chrome browser
- Google Cloud Console project (for OAuth)
- OpenAI API account (for AI functionality)

### Setup for Development
1. Clone the repository
2. Update `manifest.json` with your Google OAuth Client ID
3. Load the extension in Chrome Developer mode
4. Test with your OpenAI API key

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Chrome extension type)
5. Add your extension ID to authorized origins

## 🐛 Troubleshooting

### Common Issues

**"Daily limit reached"**
- Wait until tomorrow for the limit to reset
- Or upgrade to Basic/Pro plan

**"Connection failed"**
- Check your internet connection
- Ensure OpenAI API is properly configured

**"Google Sign-in failed"**
- Check your OAuth configuration
- Ensure extension ID is correct in Google Cloud Console

### Getting Help
- Check the [Issues](https://github.com/thekonquest/AutoContext-Voice-AI/issues) page
- Create a new issue with details about your problem
- Include browser version and error messages

## 🔮 Roadmap

### Version 1.1 (Coming Soon)
- [ ] Stripe payment integration
- [ ] Advanced AI models (GPT-4, Claude)
- [ ] Custom prompts and templates
- [ ] Export functionality

### Version 1.2 (Future)
- [ ] Multiple language support
- [ ] Browser extension for Firefox
- [ ] Mobile app
- [ ] API for developers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- Google for OAuth authentication
- Chrome Extensions API for the platform
- All contributors and users

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/thekonquest/AutoContext-Voice-AI/issues)
- **Email**: support@youraiasistant.com
- **Website**: [Your landing page](https://thekonquest.github.io/Your-Copilot-for-every-Page-you-visit/)

---

Made with ❤️ by YourAIassistant

**Version**: 1.0  
**Last Updated**: January 2025