# Package Reference Guide

Quick reference for what each package is used for in the Spatial SLAM LLM project.

## Installation Options

```bash
# Full installation (all features)
pip install -r requirements.txt

# Minimal installation (development/testing only)
pip install -r requirements-minimal.txt

# Frontend
cd frontend && npm install
```

---

## Backend Packages by Category

### 🌐 Web Framework & API
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.104.1 | Modern Python web framework for building APIs |
| `uvicorn[standard]` | 0.24.0 | ASGI server to run FastAPI applications |
| `python-multipart` | 0.0.6 | Handle file uploads and form data |
| `pydantic` | 2.5.0 | Data validation and settings management |
| `pydantic-settings` | 2.1.0 | Environment variable management |

**Used in:**
- API endpoints (`/api/objects`, `/api/llm`, `/api/slam`)
- Request/response validation
- Configuration management

---

### 🗺️ SLAM & Computer Vision
| Package | Version | Purpose |
|---------|---------|---------|
| `numpy` | 1.24.3 | Numerical computing, array operations |
| `opencv-python` | 4.8.1.78 | Computer vision library (core) |
| `opencv-contrib-python` | 4.8.1.78 | Additional OpenCV modules |
| ORB-SLAM3 | N/A | Visual SLAM system (manual install) |

**Used in:**
- Camera frame processing
- 3D position estimation
- Map building and tracking
- Pose estimation

**Note:** ORB-SLAM3 requires separate installation. See INSTALLATION.md

---

### 🔍 Object Detection
| Package | Version | Purpose |
|---------|---------|---------|
| `ultralytics` | 8.0.227 | YOLOv8 object detection framework |
| `torch` | 2.1.1 | PyTorch deep learning framework |
| `torchvision` | 0.16.1 | Computer vision models and transforms |
| `pillow` | 10.1.0 | Image processing library |

**Used in:**
- Detecting objects in camera frames (mug, pan, knife, fire, cutting board)
- Real-time object classification
- Bounding box generation

**GPU Support:** Install with CUDA for faster detection:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

---

### 🤖 LLM Integration
| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | 1.3.7 | OpenAI API client (GPT models) |
| `anthropic` | 0.7.7 | Claude API client |
| `langchain` | 0.0.350 | LLM application framework |
| `langchain-openai` | 0.0.2 | LangChain OpenAI integration |

**Used in:**
- Natural language query processing
- Tool calling for object location queries
- Generating human-friendly responses
- Context management

**Example Usage:**
```python
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="claude-sonnet-4-5",
    messages=[{"role": "user", "content": "Where is my mug?"}],
    tools=[get_last_location_tool]
)
```

---

### 🗄️ Database
| Package | Version | Purpose |
|---------|---------|---------|
| `sqlalchemy` | 2.0.23 | SQL toolkit and ORM |
| `alembic` | 1.13.0 | Database migration tool |
| `psycopg2-binary` | 2.9.9 | PostgreSQL adapter |

**Used in:**
- Storing object positions and metadata
- Session management
- Query history
- Zone definitions

**Schema Example:**
```python
objects:
  - object_id (PK)
  - class (string)
  - last_x, last_y, last_z (float)
  - last_seen_ts (timestamp)
  - zone_label (string)
```

**Note:** Can use SQLite for development (no external DB needed)

---

### 🎤 Audio Processing (Voice Interface)
| Package | Version | Purpose |
|---------|---------|---------|
| `gTTS` | 2.4.0 | Google Text-to-Speech |
| `speechrecognition` | 3.10.0 | Speech-to-text (browser-based in frontend) |
| `pydub` | 0.25.1 | Audio file manipulation |
| `soundfile` | 0.12.1 | Audio file I/O |

**Used in:**
- `/api/voice/tts` endpoint
- Converting LLM responses to speech
- Audio format conversion

**Frontend also uses:**
- Web Speech API (browser-based, no backend needed)

---

### 🔧 Networking & HTTP
| Package | Version | Purpose |
|---------|---------|---------|
| `httpx` | 0.25.2 | Async HTTP client |
| `requests` | 2.31.0 | HTTP client library |
| `websockets` | 12.0 | WebSocket support (future feature) |
| `aiofiles` | 23.2.1 | Async file operations |

**Used in:**
- Calling external APIs (LLM providers)
- Async operations in FastAPI
- File uploads/downloads

---

### 📊 Data Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `pandas` | 2.1.3 | Data analysis and manipulation |
| `scipy` | 1.11.4 | Scientific computing |
| `scikit-image` | 0.22.0 | Image processing algorithms |
| `matplotlib` | 3.8.2 | Plotting and visualization |

**Used in:**
- 3D coordinate transformations
- Data analysis and reporting
- Visualization (debugging)

---

### 🛠️ Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `python-dotenv` | 1.0.0 | Load environment variables from .env |
| `loguru` | 0.7.2 | Advanced logging with colors |
| `pyyaml` | 6.0.1 | YAML configuration files |
| `pytz` | 2023.3 | Timezone support |

**Used in:**
- Configuration management
- Logging API requests and errors
- SLAM settings files

---

### 🔐 Security
| Package | Version | Purpose |
|---------|---------|---------|
| `python-jose[cryptography]` | 3.3.0 | JWT token handling |
| `passlib[bcrypt]` | 1.7.4 | Password hashing |

**Used in:**
- API authentication (if implemented)
- Secure token generation
- User management

---

### 🧪 Testing
| Package | Version | Purpose |
|---------|---------|---------|
| `pytest` | 7.4.3 | Testing framework |
| `pytest-asyncio` | 0.21.1 | Async test support |
| `pytest-cov` | 4.1.0 | Code coverage reporting |

**Used in:**
- Unit tests for API endpoints
- Integration tests
- Coverage reports

---

### 👨‍💻 Development Tools
| Package | Version | Purpose |
|---------|---------|---------|
| `black` | 23.11.0 | Code formatter |
| `flake8` | 6.1.0 | Linter |
| `mypy` | 1.7.1 | Type checker |
| `pre-commit` | 3.5.0 | Git hooks |

**Used in:**
- Code formatting
- Linting
- Type checking
- Pre-commit validation

---

### 📈 Monitoring (Optional)
| Package | Version | Purpose |
|---------|---------|---------|
| `prometheus-client` | 0.19.0 | Metrics collection |
| `sentry-sdk[fastapi]` | 1.38.0 | Error tracking |

**Used in:**
- Performance monitoring
- Error reporting
- Production observability

---

## Frontend Packages

### Core
- **React 18.2** - UI library
- **TypeScript 5.2** - Type safety
- **Vite 5.0** - Build tool

### API
- **Axios 1.6** - HTTP client for backend communication

### State (Optional)
- **Zustand 4.4** - Lightweight state management

### Development
- **ESLint** - Linting
- **TypeScript ESLint** - TS linting

---

## Package Size & Impact

### Heavy Packages (Large downloads)
- `torch` + `torchvision` (~2GB) - Can skip for CPU-only or use `requirements-minimal.txt`
- `opencv-python` (~100MB) - Required for vision
- ORB-SLAM3 (~500MB) - Required for SLAM

### Lightweight Alternatives
For development/testing without full ML stack:
```bash
pip install -r requirements-minimal.txt
```

This skips PyTorch, YOLO, and OpenCV but keeps FastAPI, LLM clients, and basic functionality.

---

## Common Issues & Solutions

### Issue: Torch installation fails or wrong version
```bash
# Uninstall all torch packages
pip uninstall torch torchvision torchaudio

# Install CPU version (smaller, no GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Or GPU version (check your CUDA version first)
nvidia-smi  # Check CUDA version
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Issue: OpenCV import errors
```bash
# Try opencv-python-headless (no GUI dependencies)
pip uninstall opencv-python opencv-contrib-python
pip install opencv-python-headless
```

### Issue: SQLAlchemy errors
```bash
# Update to latest
pip install --upgrade sqlalchemy

# For PostgreSQL
pip install psycopg2-binary

# For MySQL
pip install pymysql
```

---

## Version Compatibility

### Python Version
- **Minimum:** Python 3.9
- **Recommended:** Python 3.10 or 3.11
- **Not supported:** Python 3.12+ (some packages not yet compatible)

### Node.js Version
- **Minimum:** Node.js 18
- **Recommended:** Node.js 20 LTS

---

## Docker Alternative

Instead of installing packages individually, use Docker:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Quick Start Commands

```bash
# Backend setup
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install

# Start development servers
# Terminal 1 (Backend):
uvicorn main:app --reload

# Terminal 2 (Frontend):
cd frontend && npm run dev
```

---

For detailed installation instructions, see **INSTALLATION.md**
