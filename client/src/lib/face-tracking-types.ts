export interface FaceTrackingData {
  eyeContact: {
    x: number;
    y: number;
    confidence: number;
    timestamp: number;
  };
  headPose: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  eyeOpenness: {
    left: number;
    right: number;
  };
  blinkRate: number;
  faceLandmarks: Array<{ x: number; y: number; z?: number }>;
  faceDetected: boolean;
} 