import cv2
import mediapipe as mp
import numpy as np
import time
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5)

def process_frame_for_head_pose(image_data):
    """
    Process a video frame and return head pose data
    image_data: base64 encoded image or numpy array
    """
    try:
        # Convert base64 to numpy array if needed
        if isinstance(image_data, str):
            # Assuming base64 encoded image
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        else:
            image = image_data
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # To improve performance
        image.flags.writeable = False
        
        # Get the result
        results = face_mesh.process(image)
        
        # To improve performance
        image.flags.writeable = True
        
        # Convert back to BGR
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        img_h, img_w, img_c = image.shape
        face_3d = []
        face_2d = []
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                for idx, lm in enumerate(face_landmarks.landmark):
                    if idx == 33 or idx == 263 or idx == 1 or idx == 61 or idx == 291 or idx == 199:
                        if idx == 1:
                            nose_2d = (lm.x * img_w, lm.y * img_h)
                            nose_3d = (lm.x * img_w, lm.y * img_h, lm.z * 3000)
                        
                        x, y = int(lm.x * img_w), int(lm.y * img_h)
                        
                        # Get the 2D Coordinates
                        face_2d.append([x, y])
                        
                        # Get the 3D Coordinates
                        face_3d.append([x, y, lm.z])
                
                # Convert it to the NumPy array
                face_2d = np.array(face_2d, dtype=np.float64)
                face_3d = np.array(face_3d, dtype=np.float64)
                
                # The camera matrix
                focal_length = 1 * img_w
                
                cam_matrix = np.array([[focal_length, 0, img_h / 2],
                                      [0, focal_length, img_w / 2],
                                      [0, 0, 1]])
                
                # The distortion parameters
                dist_matrix = np.zeros((4, 1), dtype=np.float64)
                
                # Solve PnP
                success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_matrix)
                
                # Get rotational matrix
                rmat, jac = cv2.Rodrigues(rot_vec)
                
                # Get angles
                angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)
                
                # Get the rotation degrees
                x = angles[0] * 360
                y = angles[1] * 360
                z = angles[2] * 360
                
                # Determine head direction
                if y < -10:
                    direction = "Looking Left"
                elif y > 10:
                    direction = "Looking Right"
                elif x < -10:
                    direction = "Looking Down"
                elif x > 10:
                    direction = "Looking Up"
                else:
                    direction = "Looking Forward"
                
                # Calculate confidence based on face detection
                confidence = 0.8  # You can make this more sophisticated
                
                # Extract landmarks for visualization
                landmarks = []
                for idx, lm in enumerate(face_landmarks.landmark):
                    landmarks.append({
                        'x': lm.x,
                        'y': lm.y,
                        'z': lm.z
                    })
                
                return {
                    'face_detected': True,
                    'head_pose': {
                        'x': float(x),
                        'y': float(y),
                        'z': float(z)
                    },
                    'direction': direction,
                    'confidence': confidence,
                    'landmarks': landmarks[:100]  # Limit to first 100 landmarks
                }
        
        # No face detected
        return {
            'face_detected': False,
            'head_pose': {'x': 0, 'y': 0, 'z': 0},
            'direction': 'No Face Detected',
            'confidence': 0,
            'landmarks': []
        }
        
    except Exception as e:
        return {
            'face_detected': False,
            'error': str(e),
            'head_pose': {'x': 0, 'y': 0, 'z': 0},
            'direction': 'Error',
            'confidence': 0,
            'landmarks': []
        }

@app.route('/detect-head-pose', methods=['POST'])
def detect_head_pose():
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        result = process_frame_for_head_pose(image_data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'head-pose-detector'})

if __name__ == '__main__':
    print("Starting Head Pose Detection Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True) 