import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Target, Activity, RotateCw } from "lucide-react";
import { FaceTrackingData } from "@/lib/face-tracking-types";

interface FaceTrackingDisplayProps {
  faceTrackingData: FaceTrackingData | null;
  confidence: number;
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  performanceStats?: {
    avgProcessingTime: number;
    frameCount: number;
    fps: number;
  };
}

export function FaceTrackingDisplay({ 
  faceTrackingData, 
  confidence, 
  isActive, 
  videoRef, 
  performanceStats 
}: FaceTrackingDisplayProps) {
  // Draw face landmarks and gaze visualization
  useEffect(() => {
    const canvas = document.getElementById('face-tracking-canvas') as HTMLCanvasElement;
    if (!faceTrackingData || !canvas || !videoRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw faint center guide (crosshair)
    drawCenterGuide(ctx, canvas.width, canvas.height);

    // Draw face landmarks if available
    if (faceTrackingData.faceLandmarks && faceTrackingData.faceLandmarks.length > 0) {
      drawFaceLandmarks(ctx, faceTrackingData.faceLandmarks, canvas.width, canvas.height);
      // Draw improved face box overlay
      drawFaceBox(ctx, faceTrackingData.faceLandmarks, canvas.width, canvas.height, faceTrackingData.eyeContact, faceTrackingData.confidence);
    } else if (faceTrackingData.faceDetected) {
      // Draw basic face outline if no landmarks but face is detected
      drawBasicFaceOutline(ctx, canvas.width, canvas.height);
    } else {
      // Draw "No Face Detected" message prominently
      drawNoFaceMessage(ctx, canvas.width, canvas.height);
    }

    // Draw gaze indicator only if face is detected
    if (faceTrackingData.faceDetected) {
    drawGazeIndicator(ctx, faceTrackingData.eyeContact, canvas.width, canvas.height);
    drawHeadPose(ctx, faceTrackingData.headPose, canvas.width, canvas.height);
    }
  }, [faceTrackingData, videoRef]);

  const drawFaceLandmarks = (
    ctx: CanvasRenderingContext2D, 
    landmarks: Array<{ x: number; y: number; z?: number }>,
    width: number,
    height: number
  ) => {
    // Draw key facial landmarks
    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      // Draw different sizes for different landmark types
      let radius = 1;
      
      // Eye landmarks (larger)
      if ((index >= 33 && index <= 46) || (index >= 362 && index <= 398)) {
        radius = 2;
        ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
      }
      // Lip landmarks
      else if (index >= 61 && index <= 291) {
        radius = 1.5;
        ctx.fillStyle = 'rgba(255, 100, 0, 0.6)';
      }
      // Nose and face outline
      else {
        radius = 1;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
      }
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const drawGazeIndicator = (
    ctx: CanvasRenderingContext2D,
    eyeContact: { x: number; y: number; confidence: number },
    width: number,
    height: number
  ) => {
    // Draw gaze point
    const gazeX = eyeContact.x * width;
    const gazeY = eyeContact.y * height;
    
    // Draw gaze target
    ctx.strokeStyle = `rgba(255, 0, 0, ${eyeContact.confidence})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gazeX, gazeY, 20, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw crosshair at gaze point
    ctx.beginPath();
    ctx.moveTo(gazeX - 15, gazeY);
    ctx.lineTo(gazeX + 15, gazeY);
    ctx.moveTo(gazeX, gazeY - 15);
    ctx.lineTo(gazeX, gazeY + 15);
    ctx.stroke();
    
    // Draw center target (camera position)
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw line from gaze to center
    ctx.strokeStyle = `rgba(255, 255, 0, ${eyeContact.confidence * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gazeX, gazeY);
    ctx.lineTo(centerX, centerY);
    ctx.stroke();
  };

  const drawHeadPose = (
    ctx: CanvasRenderingContext2D,
    headPose: { pitch: number; yaw: number; roll: number },
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw head pose indicators
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    
    // Yaw indicator (left/right)
    const yawLength = Math.abs(headPose.yaw) * 2;
    const yawDirection = headPose.yaw > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 40);
    ctx.lineTo(centerX + (yawDirection * yawLength), centerY - 40);
    ctx.stroke();
    
    // Pitch indicator (up/down)
    const pitchLength = Math.abs(headPose.pitch) * 2;
    const pitchDirection = headPose.pitch > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY);
    ctx.lineTo(centerX - 40, centerY + (pitchDirection * pitchLength));
    ctx.stroke();
  };

  const drawBasicFaceOutline = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw face outline
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, width * 0.15, height * 0.2, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw eyes
    ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX - width * 0.08, centerY - height * 0.05, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + width * 0.08, centerY - height * 0.05, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw nose
    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(centerX, centerY + height * 0.02, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw mouth
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY + height * 0.1, width * 0.04, 0, Math.PI);
    ctx.stroke();
  };

  const drawNoFaceMessage = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw warning background
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw warning border
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(50, 50, width - 100, height - 100);
    ctx.setLineDash([]);
    
    // Draw warning text
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('NO FACE DETECTED', centerX, centerY - 20);
    
    ctx.font = '16px Arial';
    ctx.fillText('Please position your face in the camera', centerX, centerY + 10);
    
    // Draw camera icon
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(centerX, centerY + 50, 20, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '20px Arial';
    ctx.fillText('📷', centerX - 8, centerY + 60);
  };

  const getEyeContactStatus = () => {
    if (!faceTrackingData) return "No face detected";
    
    if (!faceTrackingData.faceDetected) {
      return "No face detected";
    }
    
    const gazeX = faceTrackingData.eyeContact.x;
    const gazeY = faceTrackingData.eyeContact.y;
    const centerThreshold = 0.15;
    
    const isLookingAtCamera = 
      Math.abs(gazeX - 0.5) < centerThreshold && 
      Math.abs(gazeY - 0.5) < centerThreshold;
    
    if (isLookingAtCamera && confidence > 0.7) {
      return "Excellent eye contact";
    } else if (isLookingAtCamera && confidence > 0.5) {
      return "Good eye contact";
    } else if (confidence > 0.5) {
      return "Looking away";
    } else {
      return "Poor detection";
    }
  };

  const getHeadPoseStatus = () => {
    if (!faceTrackingData) return "Unknown";
    
    const { pitch, yaw, roll } = faceTrackingData.headPose;
    const threshold = 15; // degrees
    
    if (Math.abs(pitch) < threshold && Math.abs(yaw) < threshold && Math.abs(roll) < threshold) {
      return "Optimal position";
    } else if (Math.abs(yaw) > threshold) {
      return yaw > 0 ? "Head turned right" : "Head turned left";
    } else if (Math.abs(pitch) > threshold) {
      return pitch > 0 ? "Looking down" : "Looking up";
    } else {
      return "Head tilted";
    }
  };

  const getBlinkStatus = () => {
    if (!faceTrackingData) return "Unknown";
    
    const rate = faceTrackingData.blinkRate;
    if (rate < 10) return "Low blink rate";
    if (rate > 25) return "High blink rate";
    return "Normal blink rate";
  };

  return (
    <div className="space-y-4">
      {/* Face tracking metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Eye Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={confidence > 0.7 ? "default" : confidence > 0.5 ? "secondary" : "destructive"}>
                {getEyeContactStatus()}
              </Badge>
            </div>
            <Progress value={confidence * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Confidence: {Math.round(confidence * 100)}%
            </div>
            {faceTrackingData && !faceTrackingData.faceDetected && (
              <div className="text-xs text-red-500 font-medium">
                ⚠️ No face detected - please position your face in the camera
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Head Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline">
                {getHeadPoseStatus()}
              </Badge>
            </div>
            {faceTrackingData && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Pitch: {Math.round(faceTrackingData.headPose.pitch)}°</div>
                <div>Yaw: {Math.round(faceTrackingData.headPose.yaw)}°</div>
                <div>Roll: {Math.round(faceTrackingData.headPose.roll)}°</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Blink Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rate</span>
              <Badge variant="outline">
                {getBlinkStatus()}
              </Badge>
            </div>
            {faceTrackingData && (
                <div className="text-xs text-muted-foreground">
                {Math.round(faceTrackingData.blinkRate)} blinks/min
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
                <div className="text-xs text-muted-foreground">
              {faceTrackingData?.faceDetected ? "Face detected" : "No face detected"}
            </div>
            {performanceStats && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>FPS: {Math.round(performanceStats.fps)}</div>
                <div>Avg Time: {Math.round(performanceStats.avgProcessingTime)}ms</div>
                <div>Frames: {performanceStats.frameCount}</div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Floating feedback message */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 12,
          padding: '6px 18px',
          fontWeight: 500,
          color: '#222',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          {(!faceTrackingData.faceDetected || confidence < 0.3) ? (
            'No face detected'
          ) : (Math.abs(faceCenterX - canvasCenterX) < centerThreshold && Math.abs(faceCenterY - canvasCenterY) < centerThreshold) ? (
            'Great! You’re well positioned.'
          ) : (
            'Move closer to the center.'
          )}
        </div>
      )}
    </div>
  );
}

function drawFaceBox(ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number, eyeContact: any, confidence: number) {
  // Use only outermost facial landmarks for bounding box (jawline, forehead, chin)
  // MediaPipe jawline: 0-16, forehead: 10, 338, 297, 332, chin: 152
  const indices = [0, 16, 10, 338, 297, 332, 152];
  const points = indices.map(i => landmarks[i]).filter(Boolean);
  if (points.length < 3) return;
  const xs = points.map(pt => pt.x * width);
  const ys = points.map(pt => pt.y * height);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Calculate center of face box
  const faceCenterX = (minX + maxX) / 2;
  const faceCenterY = (minY + maxY) / 2;
  // Calculate distance from canvas center
  const canvasCenterX = width / 2;
  const canvasCenterY = height / 2;
  const dx = Math.abs(faceCenterX - canvasCenterX);
  const dy = Math.abs(faceCenterY - canvasCenterY);
  const centerThreshold = Math.min(width, height) * 0.12; // 12% of canvas size
  let color = '#00FF00'; // green
  if (dx > centerThreshold || dy > centerThreshold) {
    color = '#FFD600'; // yellow
  }
  if (confidence < 0.3) {
    color = '#FF3333'; // red
  }
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  // Rounded rectangle
  const radius = 18;
  ctx.moveTo(minX + radius, minY);
  ctx.lineTo(maxX - radius, minY);
  ctx.quadraticCurveTo(maxX, minY, maxX, minY + radius);
  ctx.lineTo(maxX, maxY - radius);
  ctx.quadraticCurveTo(maxX, maxY, maxX - radius, maxY);
  ctx.lineTo(minX + radius, maxY);
  ctx.quadraticCurveTo(minX, maxY, minX, maxY - radius);
  ctx.lineTo(minX, minY + radius);
  ctx.quadraticCurveTo(minX, minY, minX + radius, minY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawCenterGuide(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  // Vertical line
  ctx.beginPath();
  ctx.moveTo(width / 2, height * 0.2);
  ctx.lineTo(width / 2, height * 0.8);
  ctx.stroke();
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(width * 0.2, height / 2);
  ctx.lineTo(width * 0.8, height / 2);
  ctx.stroke();
  ctx.restore();
}