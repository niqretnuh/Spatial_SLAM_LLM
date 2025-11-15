"""
FastAPI Backend for Spatial SLAM LLM
Handles Claude API integration with tool calling for object queries
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import anthropic
import os
from dotenv import load_dotenv
from loguru import logger
import json
from datetime import datetime

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
class LLMChatRequest(BaseModel):
    message: str
    context: Optional[List[str]] = []
    userId: Optional[str] = None

class ToolCall(BaseModel):
    name: str
    parameters: Dict[str, Any]
    result: Optional[Any] = None

class LLMChatResponse(BaseModel):
    response: str
    toolCalls: Optional[List[ToolCall]] = []
    objects: Optional[List[Dict[str, Any]]] = []
    timestamp: str

# Mock object database (replace with real SLAM data later)
MOCK_OBJECTS = [
    {
        "object_id": "mug_001",
        "class": "mug",
        "last_position": {"x": 0.5, "y": 1.2, "z": 0.3},
        "last_seen_ts": "2025-11-15T10:30:00Z",
        "zone_label": "kitchen_counter",
        "relative_direction": "left",
        "distance_m": 1.5
    },
    {
        "object_id": "knife_001",
        "class": "knife",
        "last_position": {"x": -0.3, "y": 1.1, "z": 0.2},
        "last_seen_ts": "2025-11-15T10:25:00Z",
        "zone_label": "kitchen_drawer",
        "relative_direction": "right",
        "distance_m": 2.0
    },
    {
        "object_id": "cutting_board_001",
        "class": "cutting_board",
        "last_position": {"x": 0.0, "y": 1.15, "z": 0.1},
        "last_seen_ts": "2025-11-15T10:28:00Z",
        "zone_label": "kitchen_counter",
        "relative_direction": "center",
        "distance_m": 1.2
    }
]

# Tool definitions for Claude
TOOLS = [
    {
        "name": "get_object_location",
        "description": "Find the last known location of an object by its class (type). Returns position, zone, and relative direction information.",
        "input_schema": {
            "type": "object",
            "properties": {
                "object_class": {
                    "type": "string",
                    "description": "The class/type of object to find (e.g., 'mug', 'knife', 'pan', 'cutting_board')",
                    "enum": ["mug", "pan", "knife", "fire", "cutting_board"]
                }
            },
            "required": ["object_class"]
        }
    },
    {
        "name": "list_all_objects",
        "description": "Get a list of all objects currently tracked by the SLAM system with their locations.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    }
]

# Tool execution functions
def execute_get_object_location(object_class: str) -> Dict[str, Any]:
    """Find object by class in the mock database"""
    for obj in MOCK_OBJECTS:
        if obj["class"].lower() == object_class.lower():
            return {
                "found": True,
                "object": obj,
                "zone": obj.get("zone_label"),
                "relative_direction": obj.get("relative_direction"),
                "distance_m": obj.get("distance_m"),
                "message": f"Found {object_class} in {obj.get('zone_label')} ({obj.get('relative_direction')} direction, ~{obj.get('distance_m')}m away)"
            }
    
    return {
        "found": False,
        "message": f"No {object_class} found in the current tracking system"
    }

def execute_list_all_objects() -> Dict[str, Any]:
    """Return all tracked objects"""
    return {
        "objects": MOCK_OBJECTS,
        "count": len(MOCK_OBJECTS),
        "message": f"Currently tracking {len(MOCK_OBJECTS)} objects"
    }

def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Any:
    """Execute a tool and return its result"""
    if tool_name == "get_object_location":
        return execute_get_object_location(tool_input["object_class"])
    elif tool_name == "list_all_objects":
        return execute_list_all_objects()
    else:
        return {"error": f"Unknown tool: {tool_name}"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/llm/chat", response_model=LLMChatResponse)
async def chat_with_llm(request: LLMChatRequest):
    """
    Chat endpoint with Claude integration and tool calling
    """
    try:
        logger.info(f"Received chat request: {request.message}")
        
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
        
        # Add current message
        messages.append({
            "role": "user",
            "content": request.message
        })
        
        # System prompt
        system_prompt = """You are a helpful assistant integrated with a spatial SLAM 
        (Simultaneous Localization and Mapping) system. when user asks a spatial question about their
        environment, 
        1. Use the get_object_location tool to find specific objects and their location in the 3d cloud space
        2. Use the list_all_objects tool to see all tracked objects
        3. Provide clear, natural language responses about where objects are located

        Always be helpful, concise, and give short intructional responses"""

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

@app.get("/api/objects")
async def get_all_objects():
    """Get all tracked objects"""
    return MOCK_OBJECTS

@app.get("/api/objects/last_location")
async def get_object_last_location(object_class: str):
    """Get last known location of an object"""
    result = execute_get_object_location(object_class)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=result["message"])
    return result

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
