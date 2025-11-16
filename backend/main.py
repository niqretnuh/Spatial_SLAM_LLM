"""
FastAPI Backend for Spatial SLAM LLM
Handles Claude API integration with tool calling for object queries
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import anthropic
import os
from dotenv import load_dotenv
from loguru import logger
import json
from datetime import datetime
import base64
from io import BytesIO
import dummy_data
from fastapi.responses import FileResponse
import numpy as np

# Load environment variables
load_dotenv()

app = FastAPI(title="Spatial SLAM LLM API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Claude client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    logger.error("ANTHROPIC_API_KEY not found in environment variables")
    raise ValueError("ANTHROPIC_API_KEY is required")

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Models
class SpatialObject(BaseModel):
    """Represents an object with spatial coordinates in a frame"""
    frame: float  # Frame value (timestamp or frame number)
    object_name: str
    x: float
    y: float
    z: float

class LLMChatRequest(BaseModel):
    message: str
    context: Optional[List[str]] = []
    userId: Optional[str] = None
    video_id: Optional[str] = None
    spatial_data: Optional[List[SpatialObject]] = []  # Structured spatial dictionary

class ToolCall(BaseModel):
    name: str
    parameters: Dict[str, Any]
    result: Optional[Any] = None

class LLMChatResponse(BaseModel):
    response: str
    toolCalls: Optional[List[ToolCall]] = []
    objects: Optional[List[Dict[str, Any]]] = []
    timestamp: str

class MapPointsData(BaseModel):
    """Represents the map points from ORB-SLAM dump_map_points.py output"""
    map_points: List[List[float]]  # List of [x, y, z] coordinates
    total_points: int
    format: str  # e.g., "3-float", "4-float", "6-float"
    metadata: Optional[Dict[str, Any]] = None

class ObjectAnnotation(BaseModel):
    """Represents an annotated object from the VLM object map"""
    key: str  # Object identifier (e.g., "chair_0")
    label: str  # Object label
    center: List[float]  # [x, y, z] center coordinates
    num_points: int
    bbox_min: List[float]  # [x, y, z] minimum bounding box
    bbox_max: List[float]  # [x, y, z] maximum bounding box
    num_obs: int  # Number of observations
    first_frame_idx: int
    first_bbox: Optional[List[float]] = None  # [x1, y1, x2, y2] in pixels
    first_frame_path: Optional[str] = None
    position: List[float]  # Alias for center
    size: List[float]  # [width, height, depth] in meters

class SpatialMapResponse(BaseModel):
    """Response containing spatial map data and object annotations"""
    object_map: Dict[str, ObjectAnnotation]
    total_objects: int
    objects_by_label: Dict[str, int]
    timestamp: str



# In-memory storage for spatial data (TODO: Replace with Redis/database)
# This stores the spatial context that's shared between chat and annotation endpoints
SPATIAL_CONTEXT_STORE: Dict[str, Dict[str, Any]] = {}

# Mock CV pipeline data (replace with real SLAM data later)
CV_PIPELINE_DATA = dummy_data.dummy_cv_results

# Tool definitions for Claude
TOOLS = [
    {
        "name": "get_object_location",
        "description": "Find the location of a specific object type in the video tracking data. Returns the object's 3D coordinates (x, y, z in meters) and the frame/time it was detected.",
        "input_schema": {
            "type": "object",
            "properties": {
                "object_class": {
                    "type": "string",
                    "description": "The type/label of object to search for (e.g., 'ladder', 'doorway', 'heavy_equipment', 'worker', 'hard_hat', 'overhead_shelf')"
                }
            },
            "required": ["object_class"]
        }
    },
    {
        "name": "list_all_objects",
        "description": "Get a complete list of all objects detected across all frames in the video, including their labels, coordinates, and timestamps. Use this to understand what objects are present in the scene.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    }
]

# Helper functions for spatial context management
def get_spatial_context(session_id: str) -> Dict[str, Any]:
    """Retrieve spatial context for a session"""
    return SPATIAL_CONTEXT_STORE.get(session_id, {})

def store_spatial_context(session_id: str, context_data: Dict[str, Any]):
    """Store spatial context for a session"""
    if session_id not in SPATIAL_CONTEXT_STORE:
        SPATIAL_CONTEXT_STORE[session_id] = {}
    
    SPATIAL_CONTEXT_STORE[session_id].update(context_data)
    SPATIAL_CONTEXT_STORE[session_id]["last_updated"] = datetime.utcnow().isoformat()
    logger.info(f"Stored spatial context for session {session_id}")

def get_or_create_session_id(video_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """Generate or retrieve a session ID for context tracking"""
    if video_id:
        return f"session_{video_id}"
    elif user_id:
        return f"session_user_{user_id}"
    else:
        return f"session_{datetime.utcnow().timestamp()}"

def format_spatial_map_for_context(object_map: Dict[str, Any]) -> str:
    """Format spatial map data for LLM context"""
    if not object_map:
        return ""
    
    formatted = "## Spatial Object Map\n\n"
    
    # Group by label
    objects_by_label = {}
    for key, obj in object_map.items():
        label = obj.get("label", "unknown")
        if label not in objects_by_label:
            objects_by_label[label] = []
        objects_by_label[label].append((key, obj))
    
    for label, objects in sorted(objects_by_label.items()):
        formatted += f"### {label.capitalize()} ({len(objects)} detected):\n"
        for key, obj in objects:
            center = obj.get("center", [0, 0, 0])
            formatted += f"  - {key}: Position ({center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f})m"
            if "first_frame_idx" in obj:
                formatted += f" | First seen: Frame {obj['first_frame_idx']}"
            formatted += "\n"
        formatted += "\n"
    
    return formatted

# Tool execution functions
def execute_get_object_location(object_class: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Find object by class in the CV pipeline data and spatial context"""
    found_objects = []
    
    # First check session context for spatial map data
    if session_context and "spatial_map" in session_context:
        spatial_map = session_context["spatial_map"]
        for key, obj in spatial_map.items():
            if obj.get("label", "").lower() == object_class.lower():
                found_objects.append({
                    "object_key": key,
                    "label": obj["label"],
                    "coordinates": {
                        "x": obj["center"][0],
                        "y": obj["center"][1],
                        "z": obj["center"][2]
                    },
                    "first_frame_idx": obj.get("first_frame_idx", 0),
                    "num_observations": obj.get("num_obs", 0),
                    "source": "spatial_map"
                })
    
    # Also search through CV pipeline data
    for frame in CV_PIPELINE_DATA["frames"]:
        for obj in frame["objects"]:
            if obj["label"].lower() == object_class.lower():
                found_objects.append({
                    "frame_number": frame["frame_number"],
                    "time": frame.get("time", frame["frame_number"] / 30.0),  # Fallback to frame/fps
                    "object_id": obj["id"],
                    "label": obj["label"],
                    "coordinates": obj["xyz_coordinates"],
                    "depth": obj["depth"],
                    "confidence": obj.get("confidence", 0),
                    "source": "cv_pipeline"
                })
    
    if found_objects:
        # Return the most recent or most reliable occurrence
        result = {
            "found": True,
            "objects": found_objects,
            "count": len(found_objects),
            "message": f"Found {len(found_objects)} instance(s) of {object_class}"
        }
        
        # Add details about the first/most prominent instance
        primary = found_objects[0]
        coords = primary["coordinates"]
        result["primary_location"] = coords
        
        if "frame_number" in primary:
            result["message"] += f" at frame {primary['frame_number']}"
        elif "first_frame_idx" in primary:
            result["message"] += f" first seen at frame {primary['first_frame_idx']}"
        
        return result
    
    return {
        "found": False,
        "message": f"No {object_class} found in the tracking data or spatial map"
    }

def execute_list_all_objects(session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Return all tracked objects from all frames and spatial context"""
    all_objects = []
    unique_labels = set()
    
    # Get objects from spatial map if available
    if session_context and "spatial_map" in session_context:
        spatial_map = session_context["spatial_map"]
        for key, obj in spatial_map.items():
            label = obj.get("label", "unknown")
            unique_labels.add(label)
            all_objects.append({
                "object_key": key,
                "label": label,
                "coordinates": {
                    "x": obj["center"][0],
                    "y": obj["center"][1],
                    "z": obj["center"][2]
                },
                "first_frame": obj.get("first_frame_idx", 0),
                "num_observations": obj.get("num_obs", 0),
                "source": "spatial_map"
            })
    
    # Get objects from CV pipeline
    for frame in CV_PIPELINE_DATA["frames"]:
        for obj in frame["objects"]:
            unique_labels.add(obj["label"])
            all_objects.append({
                "frame_number": frame["frame_number"],
                "time": frame.get("time", frame["frame_number"] / 30.0),  # Fallback to frame/fps
                "object_id": obj["id"],
                "label": obj["label"],
                "coordinates": obj["xyz_coordinates"],
                "depth": obj["depth"],
                "source": "cv_pipeline"
            })
    
    return {
        "objects": all_objects,
        "unique_objects": list(unique_labels),
        "total_detections": len(all_objects),
        "unique_count": len(unique_labels),
        "message": f"Currently tracking {len(unique_labels)} unique object types with {len(all_objects)} total detections"
    }

def execute_tool(tool_name: str, tool_input: Dict[str, Any], session_context: Optional[Dict[str, Any]] = None) -> Any:
    """Execute a tool and return its result"""
    if tool_name == "get_object_location":
        return execute_get_object_location(tool_input["object_class"], session_context)
    elif tool_name == "list_all_objects":
        return execute_list_all_objects(session_context)
    else:
        return {"error": f"Unknown tool: {tool_name}"}

def encode_image_to_base64(image_bytes: bytes) -> str:
    """Convert image bytes to base64 string"""
    return base64.b64encode(image_bytes).decode('utf-8')

def format_spatial_data_for_llm(spatial_data: List[SpatialObject]) -> str:
    """Format spatial data dictionary into a readable string for LLM"""
    if not spatial_data:
        return ""
    
    formatted = "## Spatial Data (Frame-by-Frame Object Tracking)\n\n"
    
    # Group by frame
    frames = {}
    for obj in spatial_data:
        frame_key = obj.frame
        if frame_key not in frames:
            frames[frame_key] = []
        frames[frame_key].append(obj)
    
    # Format each frame
    for frame in sorted(frames.keys()):
        formatted += f"**Frame {frame}:**\n"
        for obj in frames[frame]:
            formatted += f"  - {obj.object_name}: Position (x={obj.x:.2f}, y={obj.y:.2f}, z={obj.z:.2f})\n"
        formatted += "\n"
    
    return formatted

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/llm/chat", response_model=LLMChatResponse)
async def chat_with_llm(request: LLMChatRequest):
    """
    Chat endpoint with Claude integration, tool calling, and spatial data support
    Accepts text query, conversation context, and optional spatial data
    """
    try:
        logger.info("=" * 60)
        logger.info("📤 PREPARING DATA FOR CLAUDE (TEXT-ONLY)")
        logger.info("=" * 60)
        logger.info(f"💬 User Message: {request.message}")
        logger.info(f"📊 Spatial data provided: {len(request.spatial_data) if request.spatial_data else 0} objects")
        
        # Get or create session for context management
        session_id = get_or_create_session_id(request.video_id, request.userId)
        session_context = get_spatial_context(session_id)
        logger.info(f"🔑 Using session ID: {session_id}")
        
        if request.spatial_data:
            logger.info("   Sample spatial objects:")
            for i, obj in enumerate(request.spatial_data[:5]):
                logger.info(f"   {i+1}. Frame {obj.frame}: {obj.object_name}")
                logger.info(f"      Position: (x={obj.x:.2f}, y={obj.y:.2f}, z={obj.z:.2f})")
            if len(request.spatial_data) > 5:
                logger.info(f"   ... and {len(request.spatial_data) - 5} more objects")
        logger.info("=" * 60)
        
        # Build conversation history
        messages = []
        
        # Add context if provided
        if request.context:
            for i, ctx in enumerate(request.context):
                role = "user" if i % 2 == 0 else "assistant"
                messages.append({
                    "role": role,
                    "content": ctx
                })
        
        # Build current message content with spatial data if provided
        current_message_content = request.message
        
        # Add spatial data to the message context
        if request.spatial_data and len(request.spatial_data) > 0:
            spatial_context = format_spatial_data_for_llm(request.spatial_data)
            current_message_content = f"{current_message_content}\n\n{spatial_context}"
            logger.info(f"Added spatial context with {len(request.spatial_data)} objects")
        
        # Add spatial map context if available in session
        if "spatial_map" in session_context:
            map_context = format_spatial_map_for_context(session_context["spatial_map"])
            current_message_content = f"{current_message_content}\n\n{map_context}"
            logger.info(f"Added spatial map context from session")
        
        # Add current message
        messages.append({
            "role": "user",
            "content": current_message_content
        })
        
        # Enhanced system prompt for spatial awareness
        system_prompt = """You are JARVIS, an advanced AI assistant with spatial awareness capabilities.
        You have access to a 3D spatial tracking system that provides detailed environmental data.
        
        SPATIAL DATA:
        - Object labels from the environment (e.g., car, tree, building, traffic light, pole, fence)
        - Distance from viewer/camera in meters (z-coordinate represents depth from origin 0,0,0)
        - Object dimensions: length x width in meters
        - 3D position coordinates (x, y, z) relative to the camera/viewer
        - Frame-by-frame tracking showing where objects appear in the video
        
        TOOLS AVAILABLE:
        - get_object_location: Find specific objects and their coordinates
        - list_all_objects: Get complete inventory of detected objects
        
        RESPONSE GUIDELINES:
        - Be concise and actionable (under 100 words)
        - Report distances from the viewer (you are at position 0,0,0)
        - Focus on answering the user's specific question
        - For navigation: mention obstacles, clearances, and safe paths
        - For safety: identify hazards with their locations and measurements
        - Translate coordinates to natural language (e.g., "2.5m ahead" not "z=2.5")
        
        Use the tools when needed to find specific objects or get a complete scene overview."""

        # Call Claude API with tools
        tool_calls_made = []
        objects_found = []
        
        logger.info("🚀 Calling Claude API...")
        logger.info(f"   Model: claude-sonnet-4-20250514")
        logger.info(f"   Max tokens: 1024")
        logger.info(f"   Tools available: {len(TOOLS)}")
        
        response = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,                # TODO: need to figure this out
            tools=TOOLS,
            system=system_prompt,
            messages=messages
        )
        
        logger.info(f"✅ Claude response received")
        logger.info(f"   Stop reason: {response.stop_reason}")
        
        # Process the response
        final_text = ""
        
        # Handle tool use
        while response.stop_reason == "tool_use":
            # Extract tool calls
            for content_block in response.content:
                if content_block.type == "tool_use":
                    tool_name = content_block.name
                    tool_input = content_block.input
                    tool_id = content_block.id
                    
                    logger.info(f"Tool call: {tool_name} with input: {tool_input}")
                    
                    # Execute the tool with session context
                    tool_result = execute_tool(tool_name, tool_input, session_context)
                    
                    # Track tool call
                    tool_call = ToolCall(
                        name=tool_name,
                        parameters=tool_input,
                        result=tool_result
                    )
                    tool_calls_made.append(tool_call)
                    
                    # Track objects if found
                    if tool_result.get("found") and tool_result.get("object"):
                        objects_found.append(tool_result["object"])
                    elif tool_result.get("objects"):
                        objects_found.extend(tool_result["objects"])
                    
                    # Continue conversation with tool result
                    messages.append({
                        "role": "assistant",
                        "content": response.content
                    })
                    
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_id,
                                "content": json.dumps(tool_result)
                            }
                        ]
                    })
                    
                    # Get next response
                    response = claude_client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=1024,
                        tools=TOOLS,
                        system=system_prompt,
                        messages=messages
                    )
        
        # Extract final text response
        for content_block in response.content:
            if hasattr(content_block, "text"):
                final_text += content_block.text
        
        # Build response
        llm_response = LLMChatResponse(
            response=final_text,
            toolCalls=tool_calls_made if tool_calls_made else None,
            objects=objects_found if objects_found else None,
            timestamp=datetime.utcnow().isoformat()
        )
        
        logger.info("=" * 60)
        logger.info("📥 CLAUDE RESPONSE")
        logger.info("=" * 60)
        logger.info(f"💬 Response: {final_text[:200]}{'...' if len(final_text) > 200 else ''}")
        logger.info(f"🔧 Tools called: {len(tool_calls_made) if tool_calls_made else 0}")
        logger.info(f"📍 Objects found: {len(objects_found) if objects_found else 0}")
        logger.info("=" * 60)
        
        return llm_response
        
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/api/llm/chat-multimodal", response_model=LLMChatResponse)
async def chat_with_llm_multimodal(
    message: str = Form(...),
    spatial_data: str = Form(None),  # JSON string of spatial data
    context: str = Form(None),  # JSON string of context array
    userId: str = Form(None),
    video_id: str = Form(None),
    image1: UploadFile = File(None),
    image2: UploadFile = File(None),
    image3: UploadFile = File(None),
    image4: UploadFile = File(None),
):
    """
    Multimodal chat endpoint with image support
    Accepts up to 4 images along with text query and spatial data
    """
    try:
        logger.info(f"Received multimodal chat request: {message}")
        
        # Get or create session for context management
        session_id = get_or_create_session_id(video_id, userId)
        session_context = get_spatial_context(session_id)
        logger.info(f"Using session ID: {session_id}")
        
        # Parse spatial data
        parsed_spatial_data = []
        if spatial_data:
            try:
                spatial_list = json.loads(spatial_data)
                parsed_spatial_data = [SpatialObject(**obj) for obj in spatial_list]
                logger.info(f"Parsed {len(parsed_spatial_data)} spatial objects")
            except Exception as e:
                logger.error(f"Error parsing spatial data: {e}")
        
        # Parse context
        parsed_context = []
        if context:
            try:
                parsed_context = json.loads(context)
            except Exception as e:
                logger.error(f"Error parsing context: {e}")
        
        # Process images
        image_files = [image1, image2, image3, image4]
        images_base64 = []
        
        for img in image_files:
            if img is not None:
                try:
                    image_bytes = await img.read()
                    # Detect image type from filename
                    image_type = "image/jpeg"
                    if img.filename:
                        if img.filename.lower().endswith('.png'):
                            image_type = "image/png"
                        elif img.filename.lower().endswith('.webp'):
                            image_type = "image/webp"
                        elif img.filename.lower().endswith('.gif'):
                            image_type = "image/gif"
                    
                    images_base64.append({
                        "data": encode_image_to_base64(image_bytes),
                        "media_type": image_type
                    })
                    logger.info(f"Processed image: {img.filename} ({len(image_bytes)} bytes)")
                except Exception as e:
                    logger.error(f"Error processing image {img.filename}: {e}")
        
        logger.info(f"Total images processed: {len(images_base64)}")
        
        # Log what we're sending to Claude
        logger.info("=" * 60)
        logger.info("📤 PREPARING DATA FOR CLAUDE (MULTIMODAL)")
        logger.info("=" * 60)
        logger.info(f"💬 User Message: {message}")
        logger.info(f"🖼️  Images: {len(images_base64)} frames")
        for i, img_data in enumerate(images_base64):
            data_size_kb = len(img_data["data"]) * 3 / 4 / 1024  # Approximate base64 size
            logger.info(f"   {i+1}. {img_data['media_type']} (~{data_size_kb:.1f}KB)")
        logger.info(f"📊 Spatial Objects: {len(parsed_spatial_data)}")
        if parsed_spatial_data:
            logger.info(f"   Frames covered: {len(set(obj.frame for obj in parsed_spatial_data))}")
            logger.info("   Sample objects:")
            for i, obj in enumerate(parsed_spatial_data[:5]):
                logger.info(f"   {i+1}. Frame {obj.frame}: {obj.object_name}")
                logger.info(f"      Position: (x={obj.x:.2f}, y={obj.y:.2f}, z={obj.z:.2f})")
            if len(parsed_spatial_data) > 5:
                logger.info(f"   ... and {len(parsed_spatial_data) - 5} more objects")
        logger.info("=" * 60)
        
        # Build conversation history
        messages = []
        
        # Add context if provided
        if parsed_context:
            for i, ctx in enumerate(parsed_context):
                role = "user" if i % 2 == 0 else "assistant"
                messages.append({
                    "role": role,
                    "content": ctx
                })
        
        # Build current message with images and spatial data
        message_content = []
        
        # Add images first
        for img_data in images_base64:
            message_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img_data["media_type"],
                    "data": img_data["data"]
                }
            })
        
        # Add text with spatial data
        text_content = message
        if parsed_spatial_data:
            spatial_context = format_spatial_data_for_llm(parsed_spatial_data)
            text_content = f"{message}\n\n{spatial_context}"
            logger.info("📝 Text content with spatial data formatted for LLM:")
            logger.info(f"   Total length: {len(text_content)} characters")
            logger.info(f"   Spatial context preview: {spatial_context[:200]}...")
        
        # Add spatial map context if available in session
        if "spatial_map" in session_context:
            map_context = format_spatial_map_for_context(session_context["spatial_map"])
            text_content = f"{text_content}\n\n{map_context}"
            logger.info(f"Added spatial map context from session")
        
        message_content.append({
            "type": "text",
            "text": text_content
        })
        
        messages.append({
            "role": "user",
            "content": message_content
        })
        
        # Enhanced system prompt for multimodal analysis with spatial awareness
        system_prompt = """You are JARVIS, an advanced AI assistant with computer vision and spatial awareness capabilities. 
        You have access to a 3D spatial mapping system that provides detailed environmental analysis.
        
        VISUAL CONTEXT:
        - You are provided with a single frame from a video showing the current view of the environment
        - This frame shows the scene with detected objects and their spatial measurements
        - The user can navigate through different frames, and you'll see one frame at a time
        
        SPATIAL DATA:
        - Object labels (e.g., car, tree, building, road, traffic light, pole, window, fence)
        - Distance from viewer/camera in meters (z-coordinate represents depth)
        - Object dimensions: length x width in meters
        - 3D position coordinates (x, y, z) relative to the camera/viewer at origin (0,0,0)
        - Frame number where each object first appears
        
        ANALYSIS APPROACH:
        1. **Visual Analysis**: Examine the provided images to understand the scene layout
        2. **Spatial Context**: Use the distance and dimension data to understand object relationships
        3. **Safety/Navigation**: Identify relevant objects based on the user's question
        4. **Measurements**: Report distances from the viewer (you are at position 0,0,0)
        
        RESPONSE GUIDELINES:
        - Be concise and actionable (under 100 words)
        - Reference specific objects with their distances (e.g., "There's a car 2.8m ahead")
        - Focus on answering the user's specific question
        - For navigation: mention obstacles, clearances, and paths
        - For safety: identify hazards with their locations and measurements
        - Do NOT list raw coordinates; translate them to natural language descriptions
        
        Remember: The viewer is at the origin (0,0,0), and the z-coordinate indicates how far away objects are."""
        
        # Call Claude API with tools and multimodal content
        tool_calls_made = []
        objects_found = []
        
        logger.info("🚀 Calling Claude API...")
        logger.info(f"   Model: claude-sonnet-4-20250514")
        logger.info(f"   Max tokens: 2048")
        logger.info(f"   Tools available: {len(TOOLS)}")
        logger.info(f"   Message content blocks: {len(message_content)}")
        
        response = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,  # Increased for multimodal responses
            tools=TOOLS,
            system=system_prompt,
            messages=messages
        )
        
        logger.info("✅ Claude multimodal response received")
        logger.info(f"   Stop reason: {response.stop_reason}")
        logger.info(f"   Response content blocks: {len(response.content)}")
        
        # Process the response (same tool handling as before)
        final_text = ""
        
        # Handle tool use
        while response.stop_reason == "tool_use":
            for content_block in response.content:
                if content_block.type == "tool_use":
                    tool_name = content_block.name
                    tool_input = content_block.input
                    tool_id = content_block.id
                    
                    logger.info(f"Tool call: {tool_name} with input: {tool_input}")
                    
                    # Execute the tool with session context
                    tool_result = execute_tool(tool_name, tool_input, session_context)
                    
                    # Track tool call
                    tool_call = ToolCall(
                        name=tool_name,
                        parameters=tool_input,
                        result=tool_result
                    )
                    tool_calls_made.append(tool_call)
                    
                    # Track objects if found
                    if tool_result.get("found") and tool_result.get("object"):
                        objects_found.append(tool_result["object"])
                    elif tool_result.get("objects"):
                        objects_found.extend(tool_result["objects"])
                    
                    # Continue conversation with tool result
                    messages.append({
                        "role": "assistant",
                        "content": response.content
                    })
                    
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_id,
                                "content": json.dumps(tool_result)
                            }
                        ]
                    })
                    
                    # Get next response
                    response = claude_client.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=2048,
                        tools=TOOLS,
                        system=system_prompt,
                        messages=messages
                    )
        
        # Extract final text response
        for content_block in response.content:
            if hasattr(content_block, "text"):
                final_text += content_block.text
        
        # Build response
        llm_response = LLMChatResponse(
            response=final_text,
            toolCalls=tool_calls_made if tool_calls_made else None,
            objects=objects_found if objects_found else None,
            timestamp=datetime.utcnow().isoformat()
        )
        
        logger.info("=" * 60)
        logger.info("📥 CLAUDE RESPONSE")
        logger.info("=" * 60)
        logger.info(f"💬 Response text: {final_text[:200]}{'...' if len(final_text) > 200 else ''}")
        logger.info(f"🔧 Tools called: {len(tool_calls_made) if tool_calls_made else 0}")
        logger.info(f"📍 Objects found: {len(objects_found) if objects_found else 0}")
        logger.info("=" * 60)
        
        return llm_response
        
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/objects")
async def get_all_objects():
    """Get all tracked objects from CV pipeline"""
    return execute_list_all_objects()

@app.get("/api/objects/last_location")
async def get_object_last_location(object_class: str):
    """Get last known location of an object"""
    result = execute_get_object_location(object_class)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@app.get("/api/cv-data")
async def get_cv_pipeline_data():
    """Get raw CV pipeline data"""
    return CV_PIPELINE_DATA



@app.post("/api/slam/map-points")
async def upload_map_points(data: MapPointsData):
    """
    Endpoint to receive map points data from dump_map_points.py
    
    Expects data in the format:
    {
        "map_points": [[x1, y1, z1], [x2, y2, z2], ...],
        "total_points": 1234,
        "format": "3-float",
        "metadata": {
            "possible_interpretations": [["3-float", 1234], ["4-float", 925]],
            "source": "orbSlam_Map",
            "timestamp": "2025-11-16T12:00:00"
        }
    }
    """
    try:
        logger.info(f"Received map points data: {data.total_points} points in {data.format} format")
        
        # Validate map points
        if not data.map_points:
            raise HTTPException(status_code=400, detail="Map points cannot be empty")
        
        if data.total_points < 50:
            logger.warning(f"Map only has {data.total_points} points - SLAM likely didn't map correctly")
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient map points ({data.total_points}). Need at least 50 points for a valid map."
            )
        
        # Validate point format (should be 3D coordinates)
        for i, point in enumerate(data.map_points[:5]):  # Check first 5 points
            if len(point) != 3:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid point format at index {i}. Expected [x, y, z], got {len(point)} values"
                )
        
        # Here you can store the map points or process them further
        # For now, we'll just acknowledge receipt
        
        logger.info(f"Successfully validated {data.total_points} map points")
        logger.info(f"First few points: {data.map_points[:min(5, len(data.map_points))]}")
        
        return {
            "status": "success",
            "message": f"Received and validated {data.total_points} map points",
            "points_received": data.total_points,
            "format": data.format,
            "sample_points": data.map_points[:min(5, len(data.map_points))],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing map points: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing map points: {str(e)}")

@app.post("/api/slam/spatial-map", response_model=SpatialMapResponse)
async def upload_spatial_map(object_map: Dict[str, Dict[str, Any]]):
    """
    Endpoint to receive spatial object map data from vlm_object_map.py
    
    Expects data in the dictionary format produced by vlm_object_map.py:
    {
        "chair_0": {
            "label": "chair",
            "center": [x, y, z],
            "indices": [array of point indices],
            "num_points": 123,
            "bbox_min": [x, y, z],
            "bbox_max": [x, y, z],
            "num_obs": 5,
            "first_frame_idx": 10,
            "first_bbox": [x1, y1, x2, y2],
            "first_frame_path": "/path/to/image.jpg",
            "position": [x, y, z],
            "size": [width, height, depth],
            "point_cloud": [[x, y, z], ...]
        },
        ...
    }
    """
    try:
        logger.info(f"Received spatial map with {len(object_map)} objects")
        
        # Validate and process object map
        if not object_map:
            raise HTTPException(status_code=400, detail="Object map cannot be empty")
        
        # Count objects by label
        objects_by_label = {}
        validated_objects = {}
        
        for key, obj_data in object_map.items():
            # Validate required fields
            required_fields = ["label", "center", "num_points", "bbox_min", "bbox_max", 
                             "num_obs", "first_frame_idx", "position", "size"]
            
            missing_fields = [field for field in required_fields if field not in obj_data]
            if missing_fields:
                logger.warning(f"Object {key} missing fields: {missing_fields}")
                continue
            
            # Count by label
            label = obj_data["label"]
            objects_by_label[label] = objects_by_label.get(label, 0) + 1
            
            # Convert numpy arrays to lists if needed
            validated_obj = ObjectAnnotation(
                key=key,
                label=label,
                center=obj_data["center"] if isinstance(obj_data["center"], list) else obj_data["center"].tolist(),
                num_points=int(obj_data["num_points"]),
                bbox_min=obj_data["bbox_min"] if isinstance(obj_data["bbox_min"], list) else obj_data["bbox_min"].tolist(),
                bbox_max=obj_data["bbox_max"] if isinstance(obj_data["bbox_max"], list) else obj_data["bbox_max"].tolist(),
                num_obs=int(obj_data["num_obs"]),
                first_frame_idx=int(obj_data["first_frame_idx"]),
                first_bbox=obj_data.get("first_bbox"),
                first_frame_path=obj_data.get("first_frame_path"),
                position=obj_data["position"] if isinstance(obj_data["position"], list) else obj_data["position"].tolist(),
                size=obj_data["size"] if isinstance(obj_data["size"], list) else obj_data["size"].tolist()
            )
            
            validated_objects[key] = validated_obj
            
            # Log sample object info
            if len(validated_objects) <= 3:
                logger.info(f"  {key}: {label} at {validated_obj.center}, {validated_obj.num_points} points, {validated_obj.num_obs} observations")
        
        logger.info(f"Successfully validated {len(validated_objects)} objects")
        logger.info(f"Objects by label: {objects_by_label}")
        
        # Store this data in session context for chat/annotation integration
        # Generate a session ID based on the object map structure
        # Use the first object's first_frame_path to infer a session/video ID
        session_id = "default_session"
        if validated_objects:
            first_obj = list(validated_objects.values())[0]
            if hasattr(first_obj, 'first_frame_path') and first_obj.first_frame_path:
                # Extract video/session ID from path
                import hashlib
                session_id = f"session_{hashlib.md5(first_obj.first_frame_path.encode()).hexdigest()[:12]}"
        
        # Store the spatial map in the session context
        store_spatial_context(session_id, {
            "spatial_map": {key: obj.dict() for key, obj in validated_objects.items()},
            "objects_by_label": objects_by_label,
            "total_objects": len(validated_objects)
        })
        
        response = SpatialMapResponse(
            object_map=validated_objects,
            total_objects=len(validated_objects),
            objects_by_label=objects_by_label,
            timestamp=datetime.utcnow().isoformat()
        )
        
        logger.info(f"Stored spatial map in session: {session_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing spatial map: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing spatial map: {str(e)}")

@app.get("/api/annotations/{session_id}")
async def get_annotations_with_callouts(session_id: str = "default_session"):
    """
    Get frame annotations with LLM-generated callouts for the slideshow.
    This integrates spatial map data with callout generation for each detected object.
    """
    try:
        # Get spatial context for the session
        session_context = get_spatial_context(session_id)
        
        if not session_context or "spatial_map" not in session_context:
            # Return empty/mock data if no spatial map available
            raise HTTPException(
                status_code=404,
                detail=f"No spatial map data found for session {session_id}"
            )
        
        spatial_map = session_context["spatial_map"]
        
        # Group objects by frame
        frames_data = {}
        for key, obj in spatial_map.items():
            frame_idx = obj.get("first_frame_idx", 0)
            if frame_idx not in frames_data:
                frames_data[frame_idx] = []
            
            # Convert spatial object to annotation format
            annotated_obj = {
                "id": key,
                "label": obj.get("label", "unknown"),
                "bbox": obj.get("first_bbox", [0, 0, 100, 100]),
                "distance": float(np.linalg.norm(obj.get("center", [0, 0, 0]))),
                "dimensions": {
                    "length": float(obj.get("size", [0, 0, 0])[0]),
                    "width": float(obj.get("size", [0, 0, 0])[1]),
                },
                "callout": f"{obj.get('label', 'Object').capitalize()} detected at position ({obj.get('center', [0,0,0])[0]:.2f}, {obj.get('center', [0,0,0])[1]:.2f}, {obj.get('center', [0,0,0])[2]:.2f})m. Observed {obj.get('num_obs', 0)} times."
            }
            frames_data[frame_idx].append(annotated_obj)
        
        # Build legacy frame format for the slideshow
        legacy_frames = []
        for frame_idx in sorted(frames_data.keys()):
            # Get image path from first object in frame
            objects = frames_data[frame_idx]
            image_path = ""
            if objects:
                obj_key = objects[0]["id"]
                if obj_key in spatial_map:
                    image_path = spatial_map[obj_key].get("first_frame_path", "")
            
            legacy_frames.append({
                "frameNumber": frame_idx,
                "imagePath": image_path,
                "objects": objects
            })
        
        response = {
            "domain": "spatial_slam",
            "total_frames": len(legacy_frames),
            "summary": session_context.get("objects_by_label", {}),
            "frames": [],  # Empty for JSON annotation compatibility
            "legacyFrames": legacy_frames,
            "totalFrames": len(legacy_frames)
        }
        
        logger.info(f"Returning {len(legacy_frames)} annotated frames for session {session_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating annotations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/api/slam/annotated-frame/{object_key}")
async def get_annotated_frame(object_key: str, object_map_path: Optional[str] = None):
    """
    Endpoint to retrieve the first detection frame with annotation for a specific object
    
    Args:
        object_key: The object identifier (e.g., "chair_0")
        object_map_path: Optional path to the object map .npy file
    
    Returns:
        The image file with the object's first detection bounding box
    """
    try:
        # Load object map if path provided
        if object_map_path and os.path.exists(object_map_path):
            object_map = np.load(object_map_path, allow_pickle=True).item()
        else:
            # Use default path or return error
            raise HTTPException(
                status_code=400, 
                detail="Object map path required. Please provide object_map_path parameter."
            )
        
        # Get object data
        if object_key not in object_map:
            raise HTTPException(
                status_code=404,
                detail=f"Object '{object_key}' not found in object map"
            )
        
        obj_data = object_map[object_key]
        
        # Get first frame path
        first_frame_path = obj_data.get("first_frame_path")
        if not first_frame_path or not os.path.exists(first_frame_path):
            raise HTTPException(
                status_code=404,
                detail=f"First frame image not found for object '{object_key}'"
            )
        
        # Return the image file
        return FileResponse(
            first_frame_path,
            media_type="image/jpeg",
            filename=f"{object_key}_first_detection.jpg"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving annotated frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
