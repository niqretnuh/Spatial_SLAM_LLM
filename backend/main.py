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

# Tool execution functions
def execute_get_object_location(object_class: str) -> Dict[str, Any]:
    """Find object by class in the CV pipeline data"""
    found_objects = []
    
    # Search through all frames for the object
    for frame in CV_PIPELINE_DATA["frames"]:
        for obj in frame["objects"]:
            if obj["label"].lower() == object_class.lower():
                found_objects.append({
                    "frame_number": frame["frame_number"],
                    "time": frame["time"],
                    "object_id": obj["id"],
                    "label": obj["label"],
                    "coordinates": obj["xyz_coordinates"],
                    "depth": obj["depth"],
                    "confidence": obj["confidence"]
                })
    
    if found_objects:
        # Return the most recent occurrence (last frame)
        latest = found_objects[-1]
        return {
            "found": True,
            "object": latest,
            "coordinates": latest["coordinates"],
            "message": f"Found {object_class} at frame {latest['frame_number']} (t={latest['time']}s) at position x={latest['coordinates']['x']}m, y={latest['coordinates']['y']}m, z={latest['coordinates']['z']}m"
        }
    
    return {
        "found": False,
        "message": f"No {object_class} found in the video tracking data"
    }

def execute_list_all_objects() -> Dict[str, Any]:
    """Return all tracked objects from all frames"""
    all_objects = []
    unique_labels = set()
    
    for frame in CV_PIPELINE_DATA["frames"]:
        for obj in frame["objects"]:
            unique_labels.add(obj["label"])
            all_objects.append({
                "frame_number": frame["frame_number"],
                "time": frame["time"],
                "object_id": obj["id"],
                "label": obj["label"],
                "coordinates": obj["xyz_coordinates"],
                "depth": obj["depth"]
            })
    
    return {
        "objects": all_objects,
        "unique_objects": list(unique_labels),
        "total_detections": len(all_objects),
        "unique_count": len(unique_labels),
        "message": f"Currently tracking {len(unique_labels)} unique object types across {len(CV_PIPELINE_DATA['frames'])} frames"
    }

def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Any:
    """Execute a tool and return its result"""
    if tool_name == "get_object_location":
        return execute_get_object_location(tool_input["object_class"])
    elif tool_name == "list_all_objects":
        return execute_list_all_objects()
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
        logger.info(f"Received chat request: {request.message}")
        logger.info(f"Spatial data provided: {len(request.spatial_data) if request.spatial_data else 0} objects")
        
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
        
        # Add current message
        messages.append({
            "role": "user",
            "content": current_message_content
        })
        
        # Enhanced system prompt for spatial awareness and safety analysis
        system_prompt = """You are a safety analysis assistant with access to a 3D spatial tracking system.
        You can analyze workplace environments for OSHA compliance and safety hazards.
        
        You have access to:
        - Frame-by-frame object tracking from video with 3D coordinates (x, y, z in meters)
        - Object labels (e.g., ladder, doorway, heavy_equipment, overhead_shelf, worker, hard_hat)
        - Spatial relationships between objects
        
        2. Use get_object_location to find specific objects and their coordinates
        3. Analyze spatial relationships: calculate distances, check clearances, identify hazards
        4. Consider OSHA regulations for construction/workplace safety
        
        
        
        Provide specific, actionable safety insights with measurements and OSHA citations when applicable.
        your output should be"""

        # Call Claude API with tools
        tool_calls_made = []
        objects_found = []
        
        response = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,                # TODO: need to figure this out
            tools=TOOLS,
            system=system_prompt,
            messages=messages
        )
        
        logger.info(f"Claude response: {response}")
        
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
                    
                    # Execute the tool
                    tool_result = execute_tool(tool_name, tool_input)
                    
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
        
        logger.info(f"Returning response: {llm_response}")
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
        
        message_content.append({
            "type": "text",
            "text": text_content
        })
        
        messages.append({
            "role": "user",
            "content": message_content
        })
        
        # Enhanced system prompt for multimodal analysis
        system_prompt = """You are a helpful assistant integrated with a spatial SLAM 
        (Simultaneous Localization and Mapping) system. You have vision capabilities and can analyze images
        along with spatial data.
        
        You have access to:
        - Visual information from up to 4 images showing the environment
        - Frame-by-frame object tracking data with 3D coordinates (x, y, z)
        - Object names and their positions over time
        
        When responding:
        1. Analyze the provided images to understand the visual context
        2. Cross-reference visual information with the spatial data
        3. Use tools (get_object_location, list_all_objects) when needed
        4. Consider object trajectories, spatial relationships, and visual context
        5. Provide clear, natural language responses about object locations and environment understanding

        Always be helpful, concise, and give short instructional responses."""
        
        # Call Claude API with tools and multimodal content
        tool_calls_made = []
        objects_found = []
        
        response = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,  # Increased for multimodal responses
            tools=TOOLS,
            system=system_prompt,
            messages=messages
        )
        
        logger.info(f"Claude multimodal response received")
        
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
                    
                    # Execute the tool
                    tool_result = execute_tool(tool_name, tool_input)
                    
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
        
        logger.info(f"Returning multimodal response")
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

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
