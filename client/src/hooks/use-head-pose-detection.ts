import { useState, useRef, useCallback, useEffect } from 'react';

interface HeadPoseData {
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
}

interface UseHeadPoseDetectionOptions {
  enabled?: boolean;
  frameRate?: number;
  backendUrl?: string;
  autoStartServer?: boolean;
}

export function useHeadPoseDetection(
  videoRef: React.RefObject<HTMLVideoElement>,
  isActive: boolean,
  options: UseHeadPoseDetectionOptions = {}
) {
  const {
    enabled = true,
    frameRate = 10,
    backendUrl = 'http://localhost:5001',
    autoStartServer = true
  } = options;

  const [headPoseData, setHeadPoseData] = useState<HeadPoseData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-start Python server
  const startHeadPoseServer = useCallback(async () => {
    if (!autoStartServer) return;

    try {
      console.log('🔍 Checking head pose detection server...');
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        setIsServerRunning(true);
        setIsConnected(true);
        setError(null);
        console.log('✅ Head pose detection server is running');
        return true;
      }
    } catch (err) {
      console.warn('⚠️ Head pose detection server not available, using fallback:', err);
      setIsServerRunning(false);
      setIsConnected(false);
      setError('Advanced head pose detection not available, using basic detection');
      return false;
    }

    return false;
  }, [backendUrl, autoStartServer]);

  // Initialize server when hook is first used
  useEffect(() => {
    if (enabled && autoStartServer) {
      startHeadPoseServer();
    }
  }, [enabled, autoStartServer, startHeadPoseServer]);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [videoRef]);

  const sendFrameToBackend = useCallback(async (frameData: string): Promise<HeadPoseData | null> => {
    if (!isServerRunning) return null;

    try {
      const response = await fetch(`${backendUrl}/detect-head-pose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameData }),
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('❌ Error sending frame to head pose detection server:', err);
      setIsServerRunning(false);
      setIsConnected(false);
      return null;
    }
  }, [backendUrl, isServerRunning]);

  const processFrame = useCallback(async () => {
    if (!isActive || !enabled || isProcessing) return;

    setIsProcessing(true);

    try {
      // Capture frame
      const frameData = await captureFrame();
      if (!frameData) {
        setIsProcessing(false);
        return;
      }

      // Send to backend if server is running
      if (isServerRunning) {
        const result = await sendFrameToBackend(frameData);
        if (result) {
          setHeadPoseData(result);
          setIsConnected(true);
          setError(null);
        } else {
          // Server failed, fall back to simple detection
          setIsServerRunning(false);
          setIsConnected(false);
          setError('Advanced detection failed, using basic detection');
        }
      }
    } catch (err) {
      console.error('❌ Error processing head pose frame:', err);
      setError('Head pose detection error');
    } finally {
      setIsProcessing(false);
    }
  }, [isActive, enabled, isProcessing, captureFrame, isServerRunning, sendFrameToBackend]);

  // Start/stop processing
  useEffect(() => {
    if (isActive && enabled) {
      const interval = setInterval(processFrame, 1000 / frameRate);
      intervalRef.current = interval;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, enabled, processFrame, frameRate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    headPoseData,
    isConnected,
    isServerRunning,
    error,
    isProcessing,
    canvasRef,
    startHeadPoseServer,
    retryConnection: startHeadPoseServer
  };
} 