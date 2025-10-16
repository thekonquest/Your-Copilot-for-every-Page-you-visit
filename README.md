# 🎤 AutoContext Voice AI

A powerful Chrome extension that combines voice recognition with AI assistance, providing context-aware help for any webpage you're browsing.

## ✨ Features

- **🎤 Voice Input**: Speak your requests instead of typing
- **🤖 AI Assistant**: Powered by OpenAI GPT-3.5-turbo
- **🌐 Context Awareness**: Understands the webpage you're browsing
- **📝 Text Generation & Correction**: AI-powered writing assistance
- **🔐 Google Sign-in**: Secure authentication with your Google account
- **📊 Usage Tracking**: 15 free requests per day
- **⚡ Keyboard Shortcut**: Press `Ctrl+M` to open instantly

## 🚀 Quick Start

### 1. Install the Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. The AutoContext Voice AI icon will appear in your toolbar

### 2. Set Up Your API Key

1. Click the extension icon and then click "Options" (or right-click → Options)
2. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
3. Paste your API key in the settings page
4. Click "Save Settings"

### 3. Sign In with Google

1. Click the extension icon
2. Click "Sign in with Google"
3. Complete the Google authentication
4. You're ready to use AutoContext Voice AI!

## 🎯 How to Use

### Voice Input
1. Click the microphone button (🎙️) in the extension popup
2. Speak your request clearly
3. Your speech will be converted to text automatically

### Text Input
1. Type your question or request in the text area
2. Click "Send to AI" or press `Ctrl+M`

### Example Requests
- "Summarize this article"
- "What's the main argument on this page?"
- "Write a professional email about this topic"
- "Correct the grammar in this text"
- "Explain this concept in simple terms"

## 🔧 Configuration

### API Keys
- **OpenAI API Key**: Required for AI functionality
- **Premium License Key**: Optional (for future premium features)

### Usage Limits
- **Free**: 15 requests per day
- **Premium**: Unlimited requests (coming soon)

## 📁 File Structure

```
AutoContext-Voice-AI/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── contentScript.js       # Webpage data extraction
├── options.html           # Settings page
├── options.js             # Settings functionality
└── README.md              # This file
```

## 🔒 Privacy & Security

- **Local Storage**: Your API keys are stored securely in Chrome's sync storage
- **Google OAuth**: Uses Google's secure authentication system
- **No Data Collection**: We don't collect or store your personal data
- **Open Source**: All code is transparent and auditable

## 🛠️ Development

### Prerequisites
- Chrome browser
- OpenAI API key
- Google Cloud Console project (for OAuth)

### Setup for Development
1. Clone the repository
2. Update `manifest.json` with your Google OAuth Client ID
3. Load the extension in Chrome Developer mode
4. Test with your OpenAI API key

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your extension's URLs to authorized origins

## 🐛 Troubleshooting

### Common Issues

**"Please set your OpenAI API key"**
- Go to Options page and enter your API key
- Make sure the key starts with `sk-`

**"Voice not supported"**
- Ensure you're using a modern browser
- Check microphone permissions
- Try refreshing the page

**"Daily limit reached"**
- Wait until tomorrow for the limit to reset
- Or upgrade to premium (coming soon)

**"Connection failed"**
- Check your internet connection
- Verify your OpenAI API key is correct
- Ensure you have sufficient OpenAI credits

### Getting Help
- Check the [Issues](https://github.com/thekonquest/AutoContext-Voice-AI/issues) page
- Create a new issue with details about your problem
- Include browser version and error messages

## 🔮 Roadmap

### Version 1.1 (Coming Soon)
- [ ] Premium subscription with Stripe integration
- [ ] Advanced AI models (GPT-4)
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
- **Email**: [Your support email]
- **Discord**: [Your Discord server]

---

Made with ❤️ by [Your Name](https://github.com/thekonquest)

**Version**: 1.0  
**Last Updated**: January 2025
