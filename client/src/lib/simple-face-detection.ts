/**
 * Simple Face Detection Service
 * 
 * Browser-based MediaPipe face detection for practice sessions.
 * Detects if user is facing front, left, right, or other directions.
 * No backend integration - pure browser implementation.
 */

export interface FaceDirection {
  direction: 'front' | 'left' | 'right' | 'up' | 'down' | 'unknown';
  confidence: number;
  faceDetected: boolean;
  headPose: {
    x: number;
    y: number;
    z: number;
  };
}

export class SimpleFaceDetector {
  private faceMesh: any = null;
  private isInitialized: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private onResultsCallback: ((result: FaceDirection) => void) | null = null;

  // Face mesh connections for visualization
  private readonly FACE_CONNECTIONS = [
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
    [154, 155], [155, 133], [33, 246], [246, 161], [161, 160], [160, 159],
    [159, 158], [158, 157], [157, 173], [173, 133],
    [263, 249], [249, 390], [390, 373], [373, 374], [374, 380],
    [380, 381], [381, 382], [382, 362], [263, 466], [466, 388],
    [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]
  ];

  async initialize(): Promise<boolean> {
    try {
      // Load MediaPipe Face Mesh
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      const { Camera } = await import('@mediapipe/camera_utils');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      this.faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Set up results callback
      this.faceMesh.onResults((results: any) => this.onResults(results));

      this.isInitialized = true;
      console.log('✅ Simple face detector initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize simple face detector:', error);
      return false;
    }
  }

  async detectFaceDirection(videoElement: HTMLVideoElement): Promise<FaceDirection> {
    if (!this.isInitialized || !this.faceMesh) {
      return {
        direction: 'unknown',
        confidence: 0,
        faceDetected: false,
        headPose: { x: 0, y: 0, z: 0 }
      };
    }

    try {
      // Create canvas for processing if not exists
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
      this.canvas.width = videoElement.videoWidth;
      this.canvas.height = videoElement.videoHeight;
        this.ctx = this.canvas.getContext('2d');
      }

      // Draw video frame to canvas
      if (this.ctx) {
        this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
      }

      // Process frame with MediaPipe
      const results = await this.faceMesh.send({ image: this.canvas });
      
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        return this.calculateFaceDirection(landmarks, results.image);
      } else {
      return {
          direction: 'unknown',
          confidence: 0,
          faceDetected: false,
          headPose: { x: 0, y: 0, z: 0 }
        };
      }
    } catch (error) {
      console.error('Error detecting face direction:', error);
      return {
        direction: 'unknown',
        confidence: 0,
        faceDetected: false,
        headPose: { x: 0, y: 0, z: 0 }
      };
    }
  }

  private onResults(results: any) {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    // Draw face landmarks and connections
    this.drawFaceMesh(landmarks);
    
    // Calculate and return face direction
    const faceDirection = this.calculateFaceDirection(landmarks, results.image);
    
    if (this.onResultsCallback) {
      this.onResultsCallback(faceDirection);
    }
  }

  private drawFaceMesh(landmarks: any[]) {
    if (!this.ctx || !this.canvas) return;

    // Draw all face landmarks (tiny points)
    this.ctx.fillStyle = "cyan";
    landmarks.forEach(pt => {
      const x = pt.x * this.canvas!.width;
      const y = pt.y * this.canvas!.height;
      this.ctx!.beginPath();
      this.ctx!.arc(x, y, 1.5, 0, 2 * Math.PI);
      this.ctx!.fill();
    });

    // Draw connections (face mesh lines)
    this.ctx.strokeStyle = "magenta";
    this.ctx.lineWidth = 0.8;
    for (const [startIdx, endIdx] of this.FACE_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      this.ctx.beginPath();
      this.ctx.moveTo(start.x * this.canvas!.width, start.y * this.canvas!.height);
      this.ctx.lineTo(end.x * this.canvas!.width, end.y * this.canvas!.height);
      this.ctx.stroke();
    }

    // Draw key points for pose estimation
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[199];

    const noseX = nose.x * this.canvas!.width;
    const noseY = nose.y * this.canvas!.height;
    const eyeCenterX = ((leftEye.x + rightEye.x) / 2) * this.canvas!.width;
    const eyeCenterY = ((leftEye.y + rightEye.y) / 2) * this.canvas!.height;

    // Draw main nose line
    this.ctx.beginPath();
    this.ctx.moveTo(eyeCenterX, eyeCenterY);
    this.ctx.lineTo(noseX, noseY);
    this.ctx.strokeStyle = "lime";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw nose point
    this.ctx.beginPath();
    this.ctx.arc(noseX, noseY, 4, 0, 2 * Math.PI);
    this.ctx.fillStyle = "red";
    this.ctx.fill();
  }

  private calculateFaceDirection(landmarks: any[], image?: any): FaceDirection {
    // Key points for pose estimation
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[199];

    const noseX = nose.x * (this.canvas?.width || 640);
    const noseY = nose.y * (this.canvas?.height || 480);
    const eyeCenterX = ((leftEye.x + rightEye.x) / 2) * (this.canvas?.width || 640);
    const eyeCenterY = ((leftEye.y + rightEye.y) / 2) * (this.canvas?.height || 480);
    const chinY = chin.y * (this.canvas?.height || 480);

    // Heuristics for pose classification (improved from template)
    const dx = noseX - eyeCenterX;
    const dy = noseY - eyeCenterY;
    const verticalGap = chinY - noseY;

    let direction: 'front' | 'left' | 'right' | 'up' | 'down' | 'unknown' = 'front';
    
    if (dx > 20) {
      direction = 'left';
    } else if (dx < -20) {
      direction = 'right';
    } else if (dy > 10 || verticalGap < 60) {
      direction = 'down';
    } else if (dy < -10) {
      direction = 'up';
    }

    // Calculate head pose values
    const headPose = this.estimateHeadPose(landmarks);
    
    // Calculate confidence based on landmark visibility
    const confidence = this.calculateConfidence(landmarks);

    return {
      direction,
      confidence,
      faceDetected: true,
      headPose
    };
  }

  private estimateHeadPose(landmarks: any[]): { x: number; y: number; z: number } {
    // Simple head pose estimation using key landmarks
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    // Calculate roll (z-axis rotation)
    const eyeVector = {
      x: rightEye.x - leftEye.x,
      y: rightEye.y - leftEye.y
    };
    const roll = Math.atan2(eyeVector.y, eyeVector.x) * (180 / Math.PI);
    
    // Calculate yaw (y-axis rotation) - improved
    const eyeDistance = Math.sqrt(eyeVector.x * eyeVector.x + eyeVector.y * eyeVector.y);
    const yaw = (eyeDistance - 0.1) * 1000; // Normalized to -100 to 100
    
    // Calculate pitch (x-axis rotation) - improved
    const noseY = nose.y;
    const pitch = (noseY - 0.5) * 200; // Normalized to -100 to 100
    
    return {
      x: Math.max(-100, Math.min(100, pitch)), // Pitch
      y: Math.max(-100, Math.min(100, yaw)),   // Yaw
      z: Math.max(-100, Math.min(100, roll))   // Roll
    };
  }

  private calculateConfidence(landmarks: any[]): number {
    // Simple confidence calculation based on landmark visibility
    let visibleLandmarks = 0;
    const keyLandmarks = [1, 33, 263, 61, 291]; // Nose, eyes, mouth corners
    
    for (const index of keyLandmarks) {
      if (landmarks[index] && landmarks[index].z > 0) {
        visibleLandmarks++;
      }
    }
    
    return (visibleLandmarks / keyLandmarks.length) * 100;
  }

  // Method to set up real-time processing with callback
  setupRealtimeProcessing(callback: (result: FaceDirection) => void) {
    this.onResultsCallback = callback;
  }

  // Method to get the canvas for external drawing
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  destroy(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    this.isInitialized = false;
    this.canvas = null;
    this.ctx = null;
    this.onResultsCallback = null;
  }
}

// Export a singleton instance
export const simpleFaceDetector = new SimpleFaceDetector(); 