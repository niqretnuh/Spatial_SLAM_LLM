# Spatial SLAM LLM - Installation Guide

This guide covers the installation of both backend (Python) and frontend (Node.js) dependencies.

## Backend Installation (Python)

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Virtual environment tool (venv or conda)

### Step 1: Create Virtual Environment

#### Using venv (recommended):
```bash
# Navigate to project root
cd Spatial_SLAM_LLM

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

#### Using conda:
```bash
conda create -n spatial_slam python=3.9
conda activate spatial_slam
```

### Step 2: Install Python Dependencies

```bash
# Install all requirements
pip install -r requirements.txt

# Or install with specific CUDA version for PyTorch (GPU support)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

### Step 3: Install ORB-SLAM3 (Special Installation)

ORB-SLAM3 requires manual installation:

```bash
# Clone ORB-SLAM3 Python bindings
git clone https://github.com/shanmo/OrbSlam3-python.git
cd OrbSlam3-python

# Follow installation instructions in their README
# This typically involves:
# 1. Installing C++ dependencies (OpenCV, Eigen3, Pangolin)
# 2. Building ORB-SLAM3
# 3. Building Python bindings

# On macOS (example):
brew install cmake eigen pangolin

# Build instructions vary by system
# See: https://github.com/shanmo/OrbSlam3-python
```

### Step 4: Verify Installation

```bash
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import ultralytics; print('YOLO installed')"
python -c "import openai; print('OpenAI:', openai.__version__)"
```

---

## Frontend Installation (Node.js)

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js) or yarn

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
# Using npm:
npm install

# Or using yarn:
yarn install
```

### Step 3: Verify Installation

```bash
npm run dev
# Should start dev server at http://localhost:3000
```

---

## Package Details

### Backend Core Packages

#### Web Framework
- **FastAPI** - Modern Python web framework for APIs
- **Uvicorn** - ASGI server for FastAPI
- **Pydantic** - Data validation and settings management

#### Computer Vision & SLAM
- **OpenCV** - Computer vision library
- **NumPy** - Numerical computing
- **ORB-SLAM3** - Visual SLAM system (manual install)
- **Ultralytics (YOLOv8)** - Object detection
- **PyTorch** - Deep learning framework

#### LLM Integration
- **OpenAI** - OpenAI API client
- **Anthropic** - Claude API client
- **LangChain** - LLM application framework

#### Database
- **SQLAlchemy** - ORM for database management
- **Alembic** - Database migrations
- **psycopg2** - PostgreSQL adapter (or use SQLite)

#### Audio Processing
- **gTTS** - Google Text-to-Speech
- **SpeechRecognition** - Speech-to-text
- **pydub** - Audio file manipulation

#### Utilities
- **python-dotenv** - Environment variable management
- **loguru** - Advanced logging
- **requests/httpx** - HTTP clients

### Frontend Core Packages

#### Framework & Build
- **React 18.2** - UI library
- **TypeScript 5.2** - Type-safe JavaScript
- **Vite 5.0** - Build tool and dev server

#### API & State
- **Axios 1.6** - HTTP client for API calls
- **Zustand 4.4** - State management (optional)

#### Development
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript linting rules

---

## Environment Variables Setup

### Backend (.env file)

Create a `.env` file in the project root:

```bash
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/spatial_slam
# Or for SQLite:
# DATABASE_URL=sqlite:///./spatial_slam.db

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# SLAM Configuration
SLAM_VOCABULARY_PATH=/path/to/ORBvoc.txt
SLAM_SETTINGS_PATH=/path/to/settings.yaml

# Object Detection
YOLO_MODEL_PATH=yolov8n.pt
DETECTION_CONFIDENCE_THRESHOLD=0.5

# TTS Configuration
TTS_PROVIDER=gtts  # or 'openai' for better quality
```

### Frontend (.env file)

Create a `.env` file in the `frontend/` directory:

```bash
VITE_API_URL=http://localhost:8000
```

---

## System Dependencies

### macOS (using Homebrew)

```bash
# Install system dependencies
brew install cmake eigen3 pangolin opencv

# For audio processing
brew install portaudio ffmpeg

# PostgreSQL (optional)
brew install postgresql
```

### Ubuntu/Debian

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y \
    cmake \
    libeigen3-dev \
    libopencv-dev \
    libpangolin-dev \
    build-essential \
    pkg-config

# For audio processing
sudo apt-get install -y \
    portaudio19-dev \
    ffmpeg \
    python3-pyaudio

# PostgreSQL (optional)
sudo apt-get install -y postgresql postgresql-contrib
```

### Windows

1. Install Visual Studio Build Tools
2. Install CMake
3. Install vcpkg for C++ dependencies
4. Follow ORB-SLAM3 Windows installation guide

---

## GPU Support (Optional but Recommended)

For faster object detection and potential SLAM acceleration:

### NVIDIA GPU with CUDA

```bash
# Check CUDA version
nvidia-smi

# Install PyTorch with CUDA support
# For CUDA 11.8:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## Verification Steps

### 1. Backend Health Check

```bash
# Start backend server
cd Spatial_SLAM_LLM
source venv/bin/activate  # or conda activate spatial_slam
uvicorn main:app --reload

# In another terminal, test health endpoint
curl http://localhost:8000/health
```

### 2. Frontend Health Check

```bash
# Start frontend dev server
cd frontend
npm run dev

# Visit http://localhost:3000 in browser
```

### 3. Integration Test

1. Start backend: `uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser to `http://localhost:3000`
4. Click "Start SLAM" button
5. Try asking: "Where is my mug?"

---

## Troubleshooting

### Common Issues

#### 1. ORB-SLAM3 Installation Fails
- Ensure all C++ dependencies are installed
- Check Pangolin installation specifically
- Try using Docker for easier setup

#### 2. PyTorch CUDA Not Found
```bash
# Verify CUDA installation
nvidia-smi

# Reinstall PyTorch with correct CUDA version
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### 3. Frontend Can't Connect to Backend
- Check backend is running: `curl http://localhost:8000/health`
- Verify CORS settings in FastAPI
- Check `vite.config.ts` proxy configuration

#### 4. Audio/Voice Not Working
- Install system audio libraries (portaudio)
- Check microphone permissions
- Use HTTPS for Web Speech API (or localhost)

#### 5. Database Connection Error
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Try SQLite for development: `DATABASE_URL=sqlite:///./test.db`

---

## Docker Installation (Alternative)

For easier setup, you can use Docker:

```bash
# Backend Dockerfile example
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Build and run
docker build -t spatial-slam-backend .
docker run -p 8000:8000 spatial-slam-backend
```

```bash
# Frontend Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build
CMD ["npm", "run", "preview"]
```

---

## Next Steps

After installation:

1. **Configure SLAM**: Set up ORB-SLAM3 vocabulary and settings
2. **Train Object Detection**: Fine-tune YOLO on your kitchen objects
3. **Setup LLM**: Configure OpenAI or Anthropic API keys
4. **Test System**: Run end-to-end tests
5. **Deploy**: Follow deployment guide for production

---

For more information, see:
- Backend API documentation (coming soon)
- Frontend documentation in `frontend/README.md`
- ORB-SLAM3: https://github.com/UZ-SLAMLab/ORB_SLAM3
- YOLOv8: https://docs.ultralytics.com/
