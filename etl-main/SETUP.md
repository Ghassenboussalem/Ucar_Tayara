# UCAR Data Hub - Setup Guide

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template and configure your settings:

```bash
# Copy the environment template
cp .env.example .env

# Edit the .env file with your actual values
# Use your preferred text editor
nano .env
# or
code .env
```

### 2. Required API Keys

#### Groq API Key (Required for AI features)
1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Generate an API key
4. Add it to your `.env` file:
   ```
   GROQ_API_KEY="your-actual-groq-api-key-here"
   ```

#### JWT Secret Key (Required for authentication)
Generate a secure secret key:
```bash
# Option 1: Use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Option 2: Use OpenSSL
openssl rand -base64 32
```

Add it to your `.env` file:
```
JWT_SECRET_KEY="your-generated-secret-key-here"
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run the application
python app/main.py
```

The backend will be available at: `http://localhost:8001`

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_NAME` | Application name | "UCAR Data Hub" | No |
| `APP_VERSION` | Application version | "1.0.0" | No |
| `JWT_SECRET_KEY` | JWT signing key | - | **Yes** |
| `GROQ_API_KEY` | Groq AI API key | - | **Yes** |
| `ENVIRONMENT` | Environment mode | "development" | No |
| `DEBUG` | Debug mode | "true" | No |

### Optional Features

#### Redis Queue (for production)
```bash
# Install Redis
# Ubuntu/Debian:
sudo apt install redis-server

# macOS:
brew install redis

# Start Redis
redis-server
```

Update your `.env`:
```
QUEUE_BACKEND="redis"
REDIS_URL="redis://localhost:6379/0"
```

#### Email Notifications
Configure SMTP settings in `.env`:
```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_USE_TLS="true"
```

## 🐳 Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in background
docker-compose up -d
```

## 🔍 Verification

### Check Backend Status
```bash
# Health check
curl http://localhost:8001/health

# API documentation
open http://localhost:8001/docs
```

### Check Frontend
```bash
# Open in browser
open http://localhost:5173
```

### Test Environment Loading
```bash
# Run environment checker
cd backend
python load_env.py
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Missing API Keys
**Error**: `GROQ_API_KEY not found`
**Solution**: Add your Groq API key to `.env` file

#### 2. Database Issues
**Error**: Database connection failed
**Solution**: 
```bash
# Remove existing database and restart
rm ucar_etl.db
python backend/app/main.py
```

#### 3. Port Conflicts
**Error**: Port already in use
**Solution**: Change ports in configuration or stop conflicting services

#### 4. Frontend Build Issues
**Error**: Node modules not found
**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Environment Validation

Run the environment checker to verify your setup:
```bash
cd backend
python load_env.py
```

Expected output:
```
✅ Environment variables loaded from ../.env
🔧 Environment Variables Status:
----------------------------------------
✅ APP_NAME: UCAR Data Hub
✅ APP_VERSION: 1.0.0
✅ JWT_SECRET_KEY: your-key...
✅ GROQ_API_KEY: gsk_abc...
✅ ENVIRONMENT: development
✅ DEBUG: true
----------------------------------------
```

## 📚 Next Steps

1. **Configure AI Models**: Update `GROQ_VLM_MODEL` and `GROQ_EXPLAIN_MODEL` in `.env`
2. **Set up Monitoring**: Add Sentry DSN for error tracking
3. **Configure Analytics**: Add Google Analytics tracking ID
4. **Security Review**: Update JWT secret and other security settings for production

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your `.env` configuration
3. Check application logs
4. Ensure all required services are running

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use strong, unique JWT secret keys
- Rotate API keys regularly
- Use HTTPS in production
- Enable rate limiting for production deployments