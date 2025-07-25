/**
 * Head Pose Service
 * 
 * Service for communicating with the Python head-pose-detector server
 * that uses MediaPipe for accurate face detection and head pose estimation.
 */

export interface HeadPoseResult {
  face_detected: boolean;
  head_pose: {
    x: number;
    y: number;
    z: number;
  };
  direction: string;
  confidence: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
  }>;
  error?: string;
}

export interface HeadPoseMetrics {
  faceDetected: boolean;
  confidence: number;
  eyeContact: {
    x: number;
    y: number;
    confidence: number;
  };
  eyeAspectRatio: {
    left: number;
    right: number;
  };
  blinkRate: number;
  attentionScore: number;
  isLookingAtCamera: boolean;
  headPose: {
    x: number;
    y: number;
    z: number;
  };
}

export class HeadPoseService {
  private serverUrl: string;
  private isAvailable: boolean = false;
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // 30 seconds
  private apiBaseUrl: string;

  constructor(serverUrl: string = 'http://127.0.0.1:5001', apiBaseUrl: string = 'http://localhost:5000') {
    this.serverUrl = serverUrl;
    this.apiBaseUrl = apiBaseUrl;
  }

  async startServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/head-pose/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Head pose detector started:', data.message);
        return true;
      } else {
        console.error('Failed to start head pose detector');
        return false;
      }
    } catch (error) {
      console.error('Error starting head pose detector:', error);
      return false;
    }
  }

  async stopServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/head-pose/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Head pose detector stopped:', data.message);
        return true;
      } else {
        console.error('Failed to stop head pose detector');
        return false;
      }
    } catch (error) {
      console.error('Error stopping head pose detector:', error);
      return false;
    }
  }

  async checkAvailability(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastCheck < this.checkInterval) {
      return this.isAvailable;
    }

    try {
      // First check if the server is running via our API
      const statusResponse = await fetch(`${this.apiBaseUrl}/api/head-pose/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.isRunning) {
          // Then check if the Python server is responding
          const healthResponse = await fetch(`${this.serverUrl}/health`);
          if (healthResponse.ok) {
            const data = await healthResponse.json();
            this.isAvailable = data.status === 'healthy';
          } else {
            this.isAvailable = false;
          }
        } else {
          this.isAvailable = false;
        }
      } else {
        this.isAvailable = false;
      }
    } catch (error) {
      console.warn('Head pose detector server not available:', error);
      this.isAvailable = false;
    }

    this.lastCheck = now;
    return this.isAvailable;
  }

  async detectHeadPose(videoElement: HTMLVideoElement): Promise<HeadPoseResult | null> {
    // Try to start the server if it's not available
    if (!await this.checkAvailability()) {
      console.log('Head pose detector not available, attempting to start...');
      const started = await this.startServer();
      if (!started) {
        return null;
      }
      
      // Wait a bit for the server to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check availability again
      if (!await this.checkAvailability()) {
        return null;
      }
    }

    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1]; // Remove data:image/jpeg;base64, prefix

      // Send to server
      const response = await fetch(`${this.serverUrl}/detect-head-pose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result: HeadPoseResult = await response.json();
      return result;
    } catch (error) {
      console.error('Error detecting head pose:', error);
      return null;
    }
  }

  convertToMetrics(result: HeadPoseResult): HeadPoseMetrics {
    if (!result.face_detected) {
      return {
        faceDetected: false,
        confidence: 0,
        eyeContact: { x: 0.5, y: 0.5, confidence: 0 },
        eyeAspectRatio: { left: 0.3, right: 0.3 },
        blinkRate: 15,
        attentionScore: 0,
        isLookingAtCamera: false,
        headPose: { x: 0, y: 0, z: 0 }
      };
    }

    // Calculate eye contact based on head pose
    const { x, y, z } = result.head_pose;
    const isLookingAtCamera = Math.abs(x) < 15 && Math.abs(y) < 15;
    
    // Calculate attention score based on head pose
    const maxAngle = 45;
    const attentionScore = Math.max(0, 1 - (Math.abs(x) + Math.abs(y)) / (2 * maxAngle));
    
    // Calculate eye contact position (simplified)
    const eyeContactX = 0.5 + (y / 90) * 0.3; // Map yaw to x position
    const eyeContactY = 0.5 + (x / 90) * 0.3; // Map pitch to y position

    return {
      faceDetected: true,
      confidence: result.confidence,
      eyeContact: {
        x: Math.max(0, Math.min(1, eyeContactX)),
        y: Math.max(0, Math.min(1, eyeContactY)),
        confidence: result.confidence
      },
      eyeAspectRatio: {
        left: 0.3, // MediaPipe doesn't provide this directly
        right: 0.3
      },
      blinkRate: 15, // Would need additional processing for blink detection
      attentionScore,
      isLookingAtCamera,
      headPose: result.head_pose
    };
  }
}

export const headPoseService = new HeadPoseService(); 