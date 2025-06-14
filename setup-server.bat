@echo off
REM Confidence Compass Server Setup Script for Windows
echo 🚀 Setting up Confidence Compass Server...

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v18 or higher.
    pause
    exit /b 1
)

for /f "tokens=1,2,3 delims=." %%a in ('node --version') do (
    set NODE_VERSION=%%a
    set NODE_VERSION=!NODE_VERSION:~1!
)

if !NODE_VERSION! lss 18 (
    echo ❌ Node.js version 18 or higher is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.11 or higher.
    pause
    exit /b 1
)

echo ✅ Python is installed
python --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm is installed
npm --version

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo ✅ Node.js dependencies installed

REM Install Python dependencies
echo 🐍 Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

echo ✅ Python dependencies installed

REM Check for .env file
if not exist ".env" (
    echo ⚠️  .env file not found. Creating template...
    (
        echo # LiveKit Configuration (Required for real-time communication^
        echo LIVEKIT_URL=wss://your-livekit-instance.com^
        echo LIVEKIT_API_KEY=your_livekit_api_key^
        echo LIVEKIT_API_SECRET=your_livekit_api_secret^
        echo.^
        echo # Deepgram Configuration (Required for speech-to-text and TTS^
        echo DEEPGRAM_API_KEY=your_deepgram_api_key^
        echo.^
        echo # OpenRouter Configuration (Required for AI conversation^
        echo OPENROUTER_API_KEY=your_openrouter_api_key^
        echo.^
        echo # Frontend Environment Variables^
        echo VITE_DEEPGRAM_API_KEY=your_deepgram_api_key^
        echo.^
        echo # Development Configuration^
        echo NODE_ENV=development^
        echo PORT=5000
    ) > .env
    echo 📝 Created .env template. Please update with your API keys.
) else (
    echo ✅ .env file found
)

REM Check if port 5000 is available
netstat -an | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 5000 is already in use. You may need to stop the existing process.
) else (
    echo ✅ Port 5000 is available
)

echo.
echo 🎉 Server setup complete!
echo.
echo 📋 Next steps:
echo 1. Update your .env file with your API keys
echo 2. Get API keys from:
echo    - LiveKit: https://cloud.livekit.io/
echo    - Deepgram: https://deepgram.com/
echo    - OpenRouter: https://openrouter.ai/
echo 3. Start the server with: npm run dev
echo.
echo 📚 For more information, see SERVER_SETUP.md
pause 