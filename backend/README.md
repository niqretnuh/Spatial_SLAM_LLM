# Backend API - Claude Integration

This backend service integrates Claude AI with the Spatial SLAM system to provide natural language object queries.

## Setup

1. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your Claude API key:**
   Edit the `.env` file in the project root and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

4. **Run the backend server:**
   ```bash
   # From project root
   ./start_backend.sh
   
   # Or manually
   cd backend
   python main.py
   ```

The server will start on `http://localhost:8000`

## API Endpoints

### Chat with LLM
- **POST** `/api/llm/chat`
- Send natural language queries about object locations
- Claude will use tools to find objects in the SLAM system

### Get All Objects
- **GET** `/api/objects`
- Returns all tracked objects

### Get Object Location
- **GET** `/api/objects/last_location?object_class=mug`
- Returns the last known location of a specific object type

### Health Check
- **GET** `/health`
- Check if the server is running

## Features

- Claude 3.5 Sonnet integration with tool calling
- Object location queries via natural language
- CORS enabled for frontend integration
- Comprehensive logging
- Tool execution for spatial queries

## Environment Variables

See `.env.example` for all available configuration options.
