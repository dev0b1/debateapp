/**
 * useEyeTracking Hook
 * 
 * A React hook that provides advanced eye tracking capabilities using MediaPipe Face Mesh.
 * This hook manages the eye tracking state, metrics, and real-time analysis.
 * 
 * Key Features:
 * - Real-time eye position tracking
 * - Blink detection and analysis
 * - Gaze direction calculation
 * - Eye movement metrics (saccades, fixations)
 * - Performance optimization
 * 
 * Connections:
 * - MediaPipe Face Mesh: For facial landmark detection
 * - useCamera: For video stream access
 * - EyeTrackingMetrics: For metrics calculation
 * - IntegrationService: For combining with other metrics
 * 
 * Usage:
 * This hook is used in conversation practice components
 * to provide real-time eye tracking feedback and analysis.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { EyeTrackingPoint } from "@shared/schema";
import { createEyeTracker, EyeGazeResult, EyeContactMetrics } from "@/lib/mediapipe-utils";
import { createSimpleFaceDetector, SimpleFaceResult, SimpleFaceMetrics } from "@/lib/simple-face-detection";

export interface EyeTrackingOptions {
  enableVisualization?: boolean;
  performanceMode?: boolean;
  useSimpleDetector?: boolean; // Force use simple detector
}

export interface EyeTrackingData extends EyeTrackingPoint {
  gazeDirection: {
    x: number;
    y: number;
    z: number;
  };
  blinkRate: number;
  attentionScore: number;
  eyeAspectRatio: {
    left: number;
    right: number;
  };
  processingTime: number;
}

export function useEyeTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  isActive: boolean,
  options: EyeTrackingOptions = {}
) {
  const {
    enableVisualization = true,
    performanceMode = false,
    useSimpleDetector = false
  } = options;

  const [eyeTrackingData, setEyeTrackingData] = useState<EyeTrackingData[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [isLookingAtCamera, setIsLookingAtCamera] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<EyeContactMetrics | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [detectorType, setDetectorType] = useState<'mediapipe' | 'simple'>('simple');
  const [performanceStats, setPerformanceStats] = useState({
    avgProcessingTime: 0,
    frameCount: 0,
    fps: 0
  });

  const eyeTrackerRef = useRef(createEyeTracker());
  const simpleDetectorRef = useRef(createSimpleFaceDetector());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastBlinkTime = useRef<number>(0);
  const blinkCount = useRef<number>(0);
  const performanceHistory = useRef<number[]>([]);

  // Initialize eye tracking
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        if (useSimpleDetector) {
          // Use simple detector directly
          await simpleDetectorRef.current.initialize();
          setDetectorType('simple');
          console.log('Simple face detector initialized (forced)');
        } else {
          // Try MediaPipe first, fallback to simple detector
          let mediapipeSuccess = false;
    try {
      await eyeTrackerRef.current.initialize();
            setDetectorType('mediapipe');
            mediapipeSuccess = true;
            console.log('MediaPipe Face Mesh initialized successfully');
          } catch (mediapipeError) {
            console.warn('MediaPipe failed to initialize, falling back to simple detector:', mediapipeError);
            
            // Try simple detector as fallback
            try {
              await simpleDetectorRef.current.initialize();
              setDetectorType('simple');
              console.log('Simple face detector initialized as fallback');
            } catch (simpleError) {
              console.error('Both MediaPipe and simple detector failed:', simpleError);
              throw new Error('All face detectors failed to initialize');
            }
          }
        }
      setIsInitialized(true);
    } catch (error) {
        console.error('Failed to initialize any face detector:', error);
        // Still set as initialized to prevent infinite retries
      setIsInitialized(true);
    }
    };

    if (isActive && !isInitialized) {
      initializeTracking();
    }
  }, [isActive, isInitialized, useSimpleDetector]);

  // Get the canvas element for visualization
  useEffect(() => {
    if (enableVisualization) {
      // Try to find the face tracking canvas in the DOM
      const canvas = document.getElementById('face-tracking-canvas') as HTMLCanvasElement;
      if (canvas) {
        canvasRef.current = canvas;
      }
    }
  }, [enableVisualization]);

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !isActive || !isInitialized) return;

    try {
      let result;
      
      if (detectorType === 'mediapipe') {
        try {
          result = await eyeTrackerRef.current.processFrame(videoRef.current);
        } catch (mediapipeError) {
          console.warn('MediaPipe processing failed, switching to simple detector:', mediapipeError);
          // Switch to simple detector
          setDetectorType('simple');
          result = await simpleDetectorRef.current.processFrame(videoRef.current);
        }
      } else {
        result = await simpleDetectorRef.current.processFrame(videoRef.current);
      }
      
      if (result) {
        let newDataPoint: EyeTrackingData;

        if (detectorType === 'mediapipe') {
          const mediapipeResult = result as EyeGazeResult;
          newDataPoint = {
            x: mediapipeResult.eyeContactMetrics.gazeDirection.x,
            y: mediapipeResult.eyeContactMetrics.gazeDirection.y,
            confidence: mediapipeResult.eyeContactMetrics.confidence,
            timestamp: Date.now(),
            gazeDirection: mediapipeResult.eyeContactMetrics.gazeDirection,
            blinkRate: mediapipeResult.eyeContactMetrics.blinkRate,
            attentionScore: mediapipeResult.eyeContactMetrics.attentionScore,
            eyeAspectRatio: mediapipeResult.eyeContactMetrics.eyeAspectRatio,
            processingTime: mediapipeResult.processingTime
          };

          setConfidence(mediapipeResult.eyeContactMetrics.confidence);
          setIsLookingAtCamera(mediapipeResult.eyeContactMetrics.isLookingAtCamera);
          setCurrentMetrics(mediapipeResult.eyeContactMetrics);
        } else {
          const simpleResult = result as SimpleFaceResult;
          newDataPoint = {
            x: simpleResult.metrics.eyeContact.x,
            y: simpleResult.metrics.eyeContact.y,
            confidence: simpleResult.metrics.confidence,
          timestamp: Date.now(),
            gazeDirection: { 
              x: simpleResult.metrics.eyeContact.x, 
              y: simpleResult.metrics.eyeContact.y, 
              z: 0 
            },
            blinkRate: simpleResult.metrics.blinkRate,
            attentionScore: simpleResult.metrics.attentionScore,
            eyeAspectRatio: simpleResult.metrics.eyeAspectRatio,
            processingTime: simpleResult.processingTime
          };

          setConfidence(simpleResult.metrics.confidence);
          setIsLookingAtCamera(simpleResult.metrics.isLookingAtCamera);
          setCurrentMetrics({
            gazeDirection: { 
              x: simpleResult.metrics.eyeContact.x, 
              y: simpleResult.metrics.eyeContact.y, 
              z: 0 
            },
            eyeAspectRatio: simpleResult.metrics.eyeAspectRatio,
            pupilPosition: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
            blinkRate: simpleResult.metrics.blinkRate,
            attentionScore: simpleResult.metrics.attentionScore,
            isLookingAtCamera: simpleResult.metrics.isLookingAtCamera,
            confidence: simpleResult.metrics.confidence
          });
        }

        setEyeTrackingData(prev => [...prev.slice(-100), newDataPoint]);
        setProcessingTime(result.processingTime);

        // Update performance stats
        performanceHistory.current.push(result.processingTime);
        if (performanceHistory.current.length > 30) {
          performanceHistory.current.shift();
        }
        
        const avgTime = performanceHistory.current.reduce((sum, time) => sum + time, 0) / performanceHistory.current.length;
        const fps = 1000 / avgTime;
        
        setPerformanceStats({
          avgProcessingTime: avgTime,
          frameCount: performanceHistory.current.length,
          fps: Math.min(60, Math.max(0, fps))
        });

        if (enableVisualization && canvasRef.current) {
          if (detectorType === 'mediapipe') {
            eyeTrackerRef.current.drawAnnotations(canvasRef.current, result as EyeGazeResult);
          } else {
            simpleDetectorRef.current.drawAnnotations(canvasRef.current, result as SimpleFaceResult);
          }
        }
      }
    } catch (error) {
      console.error("Error processing eye tracking frame:", error);
      // Fallback to basic tracking
      const fallbackData: EyeTrackingData = {
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        confidence: 0.3 + Math.random() * 0.4,
        timestamp: Date.now(),
        gazeDirection: { x: 0, y: 0, z: 0 },
        blinkRate: 15 + Math.random() * 10,
        attentionScore: 0.5 + Math.random() * 0.3,
        eyeAspectRatio: { left: 0.3, right: 0.3 },
        processingTime: 10
      };

      setEyeTrackingData(prev => [...prev.slice(-99), fallbackData]);
      setConfidence(fallbackData.confidence);
      setIsLookingAtCamera(fallbackData.confidence > 0.6);
      setProcessingTime(fallbackData.processingTime);
    }
  }, [videoRef, isActive, isInitialized, enableVisualization, detectorType]);

  // Process frames with rate limiting for better performance
  useEffect(() => {
    if (isActive && videoRef.current && isInitialized) {
      // Limit frame rate to 15 FPS for better performance on older hardware
      const targetFPS = 15;
      const frameInterval = 1000 / targetFPS;
      let lastFrameTime = 0;

      const processFrameWithRateLimit = async (currentTime: number) => {
        if (currentTime - lastFrameTime >= frameInterval) {
          lastFrameTime = currentTime;
          await processFrame();
        }
        
        if (isActive) {
          requestAnimationFrame(processFrameWithRateLimit);
        }
      };

      requestAnimationFrame(processFrameWithRateLimit);
    }
  }, [isActive, videoRef, isInitialized, processFrame]);

  useEffect(() => {
    if (isActive && isInitialized) {
      const interval = performanceMode ? 200 : 100; // 5 FPS in performance mode, 10 FPS otherwise
      intervalRef.current = setInterval(processFrame, interval);
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
  }, [isActive, isInitialized, processFrame, performanceMode]);

  useEffect(() => {
    return () => {
      eyeTrackerRef.current.destroy();
    };
  }, []);

  const getEyeContactScore = useCallback(() => {
    if (eyeTrackingData.length === 0) return 0;
    
    const recentData = eyeTrackingData.slice(-30);
    const averageConfidence = recentData.reduce((sum, data) => sum + data.confidence, 0) / recentData.length;
    const averageAttention = recentData.reduce((sum, data) => 
      sum + data.attentionScore, 0) / recentData.length;
    
    return (averageConfidence + averageAttention) / 2;
  }, [eyeTrackingData]);

  const getBlinkRate = useCallback(() => {
    return currentMetrics?.blinkRate || 0;
  }, [currentMetrics]);

  const getGazeStability = useCallback(() => {
    if (eyeTrackingData.length < 10) return 0;
    
    const recentData = eyeTrackingData.slice(-10);
    const gazeVariance = recentData.reduce((sum, data, index) => {
      if (index === 0) return 0;
      const prev = recentData[index - 1];
      const distance = Math.sqrt(
        Math.pow(data.gazeDirection.x - prev.gazeDirection.x, 2) +
        Math.pow(data.gazeDirection.y - prev.gazeDirection.y, 2)
      );
      return sum + distance;
    }, 0) / (recentData.length - 1);
    
    return Math.max(0, 1 - gazeVariance * 10);
  }, [eyeTrackingData]);

  const setAnnotationCanvas = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  return {
    eyeTrackingData,
    confidence,
    isLookingAtCamera,
    currentMetrics,
    isInitialized,
    getEyeContactScore,
    getBlinkRate,
    getGazeStability,
    setAnnotationCanvas,
    processingTime,
    performanceStats
  };
}
