import React, { useRef, useState } from 'react';
import { useCamera } from '../hooks/use-camera';
import { useFaceDetection } from '../hooks/use-face-detection';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Eye, Camera, Play, Pause } from 'lucide-react';

export function FaceDetectionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  
  const { startCamera, stopCamera, isCameraActive } = useCamera();
  
  const {
    faceDirection,
    currentMetrics,
    isInitialized,
    performanceStats
  } = useFaceDetection(videoRef, isActive, {
    enableVisualization: true,
    enableRealtime: true
  });

  const handleStartCamera = async () => {
    try {
      await startCamera();
      setIsActive(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
    }
  };

  const handleStopCamera = () => {
    stopCamera();
    setIsActive(false);
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'front':
        return 'bg-green-500';
      case 'left':
      case 'right':
        return 'bg-yellow-500';
      case 'up':
      case 'down':
        return 'bg-orange-500';
      default:
        return 'bg-red-500';
    }
  };

  const getDirectionText = (direction: string) => {
    switch (direction) {
      case 'front':
        return 'Front-facing';
      case 'left':
        return 'Looking Left';
      case 'right':
        return 'Looking Right';
      case 'up':
        return 'Looking Up';
      case 'down':
        return 'Looking Down';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Face Detection Demo</h1>
        <p className="text-gray-600">Real-time face direction detection using MediaPipe</p>
      </div>

      {/* Camera Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleStartCamera}
              disabled={isCameraActive}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Camera
            </Button>
            <Button 
              onClick={handleStopCamera}
              disabled={!isCameraActive}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Camera
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">
              Camera: {isCameraActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Video Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Video Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded-lg border"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-white text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2" />
                    <p>Camera not active</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Face Detection Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Direction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Direction</span>
                <Badge 
                  variant="outline" 
                  className={`${getDirectionColor(faceDirection.direction)} text-white`}
                >
                  {getDirectionText(faceDirection.direction)}
                </Badge>
              </div>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-sm text-gray-600">
                  {Math.round(faceDirection.confidence)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${faceDirection.confidence}%` }}
                />
              </div>
            </div>

            {/* Face Detected */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Face Detected</span>
              <Badge variant={faceDirection.faceDetected ? "default" : "destructive"}>
                {faceDirection.faceDetected ? 'Yes' : 'No'}
              </Badge>
            </div>

            {/* Head Pose */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Head Pose</span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-100 p-2 rounded">
                  <div className="font-medium">X (Pitch)</div>
                  <div>{faceDirection.headPose.x.toFixed(1)}</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <div className="font-medium">Y (Yaw)</div>
                  <div>{faceDirection.headPose.y.toFixed(1)}</div>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <div className="font-medium">Z (Roll)</div>
                  <div>{faceDirection.headPose.z.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      {performanceStats && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{Math.round(performanceStats.fps)}</div>
                <div className="text-xs text-gray-600">FPS</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(performanceStats.avgProcessingTime)}ms</div>
                <div className="text-xs text-gray-600">Avg Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{performanceStats.frameCount}</div>
                <div className="text-xs text-gray-600">Frames</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Face Detector Initialized</span>
              <Badge variant={isInitialized ? "default" : "destructive"}>
                {isInitialized ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Detection Active</span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 