import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Target, Activity, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Minus } from "lucide-react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw face direction visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!faceTrackingData || !canvas || !videoRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (faceTrackingData.faceDetected) {
      // Draw face direction indicator
      drawFaceDirectionIndicator(ctx, faceTrackingData.direction, canvas.width, canvas.height);
      // Draw head pose visualization
      drawHeadPose(ctx, faceTrackingData.headPose, canvas.width, canvas.height);
    } else {
      // Draw "No Face Detected" message
      drawNoFaceMessage(ctx, canvas.width, canvas.height);
    }
  }, [faceTrackingData, videoRef]);

  const drawFaceDirectionIndicator = (
    ctx: CanvasRenderingContext2D,
    direction: string,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.15;
    
    // Draw direction arrow
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    // Draw direction arrow based on face direction
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

    const arrowLength = radius * 0.6;
    let startX = centerX;
    let startY = centerY;
    let endX = centerX;
    let endY = centerY;

    switch (direction) {
      case 'front':
        // Draw center dot for front-facing
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fill();
        break;
      case 'left':
        endX = centerX - arrowLength;
        break;
      case 'right':
        endX = centerX + arrowLength;
        break;
      case 'up':
        endY = centerY - arrowLength;
        break;
      case 'down':
        endY = centerY + arrowLength;
        break;
      default:
        // Draw question mark for unknown
        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('?', centerX, centerY + 8);
        return;
    }

    if (direction !== 'front') {
      // Draw arrow
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw arrowhead
      const headLength = 10;
      const angle = Math.atan2(endY - startY, endX - startX);
      
    ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6)
      );
    ctx.stroke();
    }
  };

  const drawHeadPose = (
    ctx: CanvasRenderingContext2D,
    headPose: { x: number; y: number; z: number },
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;
    
    // Draw head pose visualization
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';

    // Draw pitch (up/down) indicator
    const pitchY = centerY + (headPose.x / 100) * radius;
    ctx.beginPath();
    ctx.arc(centerX, pitchY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw yaw (left/right) indicator
    const yawX = centerX + (headPose.y / 100) * radius;
    ctx.beginPath();
    ctx.arc(yawX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  };

  const drawNoFaceMessage = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No Face Detected', width / 2, height / 2 - 20);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.fillText('Please look at the camera', width / 2, height / 2 + 10);
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'front':
        return <Target className="w-4 h-4" />;
      case 'left':
        return <ArrowLeft className="w-4 h-4" />;
      case 'right':
        return <ArrowRight className="w-4 h-4" />;
      case 'up':
        return <ArrowUp className="w-4 h-4" />;
      case 'down':
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getDirectionStatus = () => {
    if (!faceTrackingData) return { status: "No data", variant: "secondary" as const };
    
    const direction = faceTrackingData.direction;
    if (direction === 'front') {
      return { status: "Front-facing", variant: "default" as const };
    } else if (direction === 'unknown') {
      return { status: "Unknown", variant: "destructive" as const };
    } else {
      return { status: `Looking ${direction}`, variant: "secondary" as const };
    }
  };

  const getConfidenceStatus = () => {
    if (confidence > 80) return { status: "High", variant: "default" as const };
    if (confidence > 50) return { status: "Medium", variant: "secondary" as const };
    return { status: "Low", variant: "destructive" as const };
  };

  const directionStatus = getDirectionStatus();
  const confidenceStatus = getConfidenceStatus();

  return (
    <div className="space-y-4">
      {/* Face Tracking Canvas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Face Direction Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-64 bg-black rounded-lg border"
              style={{ imageRendering: 'pixelated' }}
            />
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-white text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Face tracking inactive</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Face Direction Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {getDirectionIcon(faceTrackingData?.direction || 'unknown')}
              Direction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={directionStatus.variant}>{directionStatus.status}</Badge>
            </div>
            {faceTrackingData && (
            <div className="text-xs text-muted-foreground">
                Head pose: X:{faceTrackingData.headPose.x.toFixed(1)} Y:{faceTrackingData.headPose.y.toFixed(1)} Z:{faceTrackingData.headPose.z.toFixed(1)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Confidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={confidenceStatus.variant}>{confidenceStatus.status}</Badge>
            </div>
            <Progress value={confidence} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Math.round(confidence)}% confidence
              </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      {performanceStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{Math.round(performanceStats.fps)}</div>
                <div className="text-xs text-muted-foreground">FPS</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(performanceStats.avgProcessingTime)}ms</div>
                <div className="text-xs text-muted-foreground">Avg Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{performanceStats.frameCount}</div>
                <div className="text-xs text-muted-foreground">Frames</div>
            </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}