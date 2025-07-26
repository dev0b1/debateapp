export interface FaceTrackingData {
  faceDetected: boolean;
  confidence: number;
  direction: 'front' | 'left' | 'right' | 'up' | 'down' | 'unknown';
  headPose: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: number;
} 