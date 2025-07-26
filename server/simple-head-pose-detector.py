import cv2
import numpy as np
import time
import base64
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import asyncio
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenCV face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Pydantic models for request/response
class HeadPoseRequest(BaseModel):
    image: str

class HeadPoseResponse(BaseModel):
    face_detected: bool
    head_pose: dict
    direction: str
    confidence: float
    landmarks: list
    error: Optional[str] = None

def process_frame_for_head_pose(image_data: str) -> HeadPoseResponse:
    """
    Process a video frame and return head pose data using OpenCV
    image_data: base64 encoded image
    """
    try:
        # Convert base64 to numpy array
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return HeadPoseResponse(
                face_detected=False,
                head_pose={'x': 0, 'y': 0, 'z': 0},
                direction='Invalid Image',
                confidence=0,
                landmarks=[],
                error='Failed to decode image'
            )
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) > 0:
            # Get the largest face
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            
            # Calculate face center
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            
            # Calculate image center
            img_h, img_w = image.shape[:2]
            img_center_x = img_w // 2
            img_center_y = img_h // 2
            
            # Calculate head pose (simplified)
            # X: left-right movement (yaw)
            # Y: up-down movement (pitch)
            # Z: forward-backward movement (roll)
            
            # Normalize position relative to image center
            x_offset = (face_center_x - img_center_x) / img_center_x  # -1 to 1
            y_offset = (face_center_y - img_center_y) / img_center_y  # -1 to 1
            
            # Convert to degrees (simplified)
            yaw = x_offset * 30  # Max 30 degrees left/right
            pitch = y_offset * 20  # Max 20 degrees up/down
            roll = 0  # We can't detect roll with simple face detection
            
            # Determine direction
            if yaw < -10:
                direction = "Looking Left"
            elif yaw > 10:
                direction = "Looking Right"
            elif pitch < -5:
                direction = "Looking Down"
            elif pitch > 5:
                direction = "Looking Up"
            else:
                direction = "Looking Forward"
            
            # Calculate confidence based on face size and position
            face_area = w * h
            max_area = img_w * img_h * 0.3  # Max 30% of image
            size_confidence = min(face_area / max_area, 1.0)
            
            # Position confidence (closer to center = higher confidence)
            position_confidence = 1.0 - (abs(x_offset) + abs(y_offset)) / 2
            confidence = (size_confidence + position_confidence) / 2
            
            # Create simplified landmarks (face rectangle corners)
            landmarks = [
                {'x': x / img_w, 'y': y / img_h, 'z': 0},  # Top-left
                {'x': (x + w) / img_w, 'y': y / img_h, 'z': 0},  # Top-right
                {'x': (x + w) / img_w, 'y': (y + h) / img_h, 'z': 0},  # Bottom-right
                {'x': x / img_w, 'y': (y + h) / img_h, 'z': 0},  # Bottom-left
                {'x': face_center_x / img_w, 'y': face_center_y / img_h, 'z': 0}  # Center
            ]
            
            return HeadPoseResponse(
                face_detected=True,
                head_pose={'x': float(pitch), 'y': float(yaw), 'z': float(roll)},
                direction=direction,
                confidence=float(confidence),
                landmarks=landmarks
            )
        
        # No face detected
        return HeadPoseResponse(
            face_detected=False,
            head_pose={'x': 0, 'y': 0, 'z': 0},
            direction='No Face Detected',
            confidence=0,
            landmarks=[]
        )
        
    except Exception as e:
        logger.error(f"Error processing head pose: {str(e)}")
        return HeadPoseResponse(
            face_detected=False,
            head_pose={'x': 0, 'y': 0, 'z': 0},
            direction='Error',
            confidence=0,
            landmarks=[],
            error=str(e)
        )

# Create FastAPI app
app = FastAPI(title="Simple Head Pose Detector", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect-head-pose", response_model=HeadPoseResponse)
async def detect_head_pose(request: HeadPoseRequest):
    """Detect head pose from base64 encoded image"""
    try:
        if not request.image:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        result = process_frame_for_head_pose(request.image)
        return result
        
    except Exception as e:
        logger.error(f"Error in detect_head_pose endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "simple-head-pose-detector"}

# Function to start the server programmatically
def start_head_pose_server(host: str = "127.0.0.1", port: int = 5001):
    """Start the head pose detector server"""
    logger.info(f"Starting Simple Head Pose Detection Service on {host}:{port}...")
    uvicorn.run(app, host=host, port=port, log_level="info")

# Function to run the server in a separate process
def run_head_pose_server():
    """Run the head pose detector server (for standalone use)"""
    # Get host and port from environment variables (set by Node.js)
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5001"))
    start_head_pose_server(host, port)

if __name__ == '__main__':
    import sys
    
    # Check if running in dev mode (like livekit agent)
    if len(sys.argv) > 1 and sys.argv[1] == 'dev':
        logger.info("Starting in development mode...")
        run_head_pose_server()
    else:
        # Default behavior
        run_head_pose_server() 