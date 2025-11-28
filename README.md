# 📚 SeggWeb - AI-Powered Quiz Generator

A professional educational platform that uses Google Gemini AI to automatically generate quiz games from PDF documents.

## 🎯 Features

- **Multi-Mode Quiz System**: Multiple Choice, True/False, Flashcards, Fill-in-the-Blank, Q&A
- **AI-Powered Generation**: Uses Google Gemini 2.5 Pro to generate questions from PDFs
- **User Management**: Student and Admin roles with authentication
- **Premium Features**: Advanced modes for premium users
- **Secure API**: JWT authentication, input validation, rate limiting
- **Modern UI**: Glass-morphism design with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Google Gemini API key

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Add your Google API key to .env
GOOGLE_API_KEY=your_api_key_here
JWT_SECRET=your-random-secret
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## 📁 Project Structure

```
seggweb/
├── src/
│   ├── server.js              # Main Express server
│   ├── middleware/            # Express middlewares
│   │   ├── auth.js           # JWT authentication
│   │   ├── validation.js     # Input validation schemas
│   │   └── errorHandler.js   # Error handling
│   └── routes/               # API route handlers
│       ├── auth.js          # Login/Register
│       ├── games.js         # Game management
│       ├── admin.js         # Admin endpoints
│       └── generate.js      # PDF & AI generation
├── public/
│   ├── index.html           # Main UI
│   ├── admin.html          # Admin dashboard
│   └── GameComponents.js   # React game components
├── config/
│   └── database.json       # Local data storage
├── docs/
│   └── SECURITY.md         # Security documentation
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies & scripts
└── README.md             # This file
```

## 🔐 Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT token authentication
- ✅ Input validation with Joi
- ✅ Rate limiting (login: 5/15min, API: 30/min)
- ✅ CORS configuration
- ✅ Security headers with Helmet
- ✅ Role-based access control
- ✅ Environment variable protection

See [SECURITY.md](docs/SECURITY.md) for detailed security documentation.

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Student | student | Student@123 |
| Admin | admin | Admin@123 |

⚠️ **Change these in production!**

## 📋 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/user/:id` - Get user info (protected)

### Games
- `POST /api/generate` - Generate quiz from PDF (protected)
- `POST /api/game/rename` - Rename a game (protected)
- `POST /api/game/delete` - Delete a game (protected)
- `GET /api/logs/:userId` - Get user's games (protected)

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/all-logs` - List all games (admin only)
- `POST /api/admin/toggle-premium` - Toggle premium status (admin only)

## 🎮 Supported Game Modes

1. **Multiple Choice** - 4 options with randomized correct answer
2. **True/False** - Boolean statements for quick assessment
3. **Flashcards** - Vocabulary and definition learning
4. **Fill-in-the-Blank** - Text input with hidden keywords
5. **Q&A** - Essay-style questions with suggested answers

## 📝 Environment Variables

```env
# Google AI API
GOOGLE_API_KEY=your_gemini_api_key

# JWT Secret (generate random in production)
JWT_SECRET=your-random-secret-key

# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

## 🛠️ Development

### Frontend Updates

When making API calls from frontend:

```javascript
// Get token from login
const token = localStorage.getItem('token');

// Use token in requests
fetch('/api/logs/123', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

### Adding New Endpoints

1. Create handler in `src/routes/`
2. Add Joi validation if needed
3. Use `authenticateToken` middleware for protected routes
4. Update this README

## 📦 Dependencies

- **express** - Web framework
- **multer** - File upload handling
- **pdf-parse** - PDF parsing
- **@google/generative-ai** - Gemini AI integration
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **joi** - Input validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

## 🚀 Production Deployment

1. **Use HTTPS**: Deploy with SSL certificates
2. **Set environment variables**: Use secure environment management
3. **Database**: Migrate from JSON to MongoDB/PostgreSQL
4. **Monitoring**: Add logging and error tracking
5. **Backups**: Implement automated backups
6. **CORS**: Configure to production domain
7. **Rate limits**: Adjust based on traffic

See [SECURITY.md](docs/SECURITY.md) for detailed production recommendations.

## 🐛 Troubleshooting

### Port 5000 already in use
```bash
# Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### PDF upload fails
- Check file is valid PDF
- Ensure file size < 10MB
- Verify `multer` configuration

### API returns 403 (Forbidden)
- Token might be expired (7 days)
- User might not have premium access
- Check admin role for admin endpoints

### Gemini API errors
- Verify `GOOGLE_API_KEY` in `.env`
- Check API quota and billing
- Ensure model `gemini-2.5-pro` is available

## 📞 Support & Contributing

For issues, security concerns, or contributions:
1. Check existing documentation
2. Review SECURITY.md
3. Test changes locally first
4. Keep commits organized

## 📄 License

ISC

## 👥 Team

Vibe Edutainment Team

---

**Last Updated**: November 28, 2025  
**Version**: 1.0.0
