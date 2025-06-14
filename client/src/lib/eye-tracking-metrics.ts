/**
 * EyeTrackingMetrics
 * 
 * A utility class for calculating and processing eye tracking metrics.
 * This class provides methods for analyzing eye movements, blinks,
 * and gaze patterns during conversation practice.
 * 
 * Key Features:
 * - Eye contact detection
 * - Blink rate calculation
 * - Gaze direction analysis
 * - Saccade detection
 * - Fixation analysis
 * 
 * Connections:
 * - MediaPipe Face Mesh: For facial landmark data
 * - useEyeTracking: For real-time metrics
 * - IntegrationService: For combining with other metrics
 * 
 * Usage:
 * This class is used by both basic and advanced eye tracking hooks
 * to process and analyze eye tracking data.
 */

import { EyeTrackingPoint } from "@shared/schema";
import { PerformanceOptimizer } from "./performance-optimizer";

export interface GazeMetrics {
  fixations: Array<{
    x: number;
    y: number;
    duration: number;
    startTime: number;
  }>;
  saccades: Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration: number;
    velocity: number;
  }>;
  heatmap: {
    points: Array<{ x: number; y: number; intensity: number }>;
    resolution: number;
  };
}

export interface CalibrationData {
  screenSize: { width: number; height: number };
  userDistance: number;
  calibrationPoints: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
}

export interface EyeTrackingMetrics {
  confidence: number;
  headPose: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  blinkRate: number;
  fixationPoints: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
}

export class EyeTrackingAnalyzer {
  private FIXATION_THRESHOLD = 0.1; // pixels
  private readonly FIXATION_DURATION = 100; // ms
  private readonly HEATMAP_DECAY = 0.95;
  
  private currentFixation: {
    x: number;
    y: number;
    startTime: number;
  } | null = null;
  
  private lastGazePoint: EyeTrackingPoint | null = null;
  private heatmapPoints: Array<{ x: number; y: number; intensity: number }> = [];
  
  constructor(private config: {
    screenWidth: number;
    screenHeight: number;
    userDistance: number;
  }) {}

  public analyzeGazePattern(eyeTrackingData: EyeTrackingPoint[]): GazeMetrics {
    const fixations: GazeMetrics['fixations'] = [];
    const saccades: GazeMetrics['saccades'] = [];
    
    for (let i = 1; i < eyeTrackingData.length; i++) {
      const current = eyeTrackingData[i];
      const previous = eyeTrackingData[i - 1];
      
      // Calculate movement
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Update heatmap
      this.updateHeatmap(current.x, current.y);
      
      if (distance < this.FIXATION_THRESHOLD) {
        // Potential fixation
        if (!this.currentFixation) {
          this.currentFixation = {
            x: current.x,
            y: current.y,
            startTime: current.timestamp
          };
        } else if (current.timestamp - this.currentFixation.startTime >= this.FIXATION_DURATION) {
          // Confirmed fixation
          fixations.push({
            x: this.currentFixation.x,
            y: this.currentFixation.y,
            duration: current.timestamp - this.currentFixation.startTime,
            startTime: this.currentFixation.startTime
          });
        }
      } else {
        // Saccade detected
        if (this.currentFixation) {
          saccades.push({
            startX: this.currentFixation.x,
            startY: this.currentFixation.y,
            endX: current.x,
            endY: current.y,
            duration: current.timestamp - this.currentFixation.startTime,
            velocity: distance / (current.timestamp - this.currentFixation.startTime)
          });
          this.currentFixation = null;
        }
      }
      
      this.lastGazePoint = current;
    }
    
    return {
      fixations,
      saccades,
      heatmap: {
        points: this.heatmapPoints,
        resolution: 50 // 50x50 grid
      }
    };
  }
  
  private updateHeatmap(x: number, y: number): void {
    // Add new point
    this.heatmapPoints.push({ x, y, intensity: 1.0 });
    
    // Decay existing points
    this.heatmapPoints = this.heatmapPoints
      .map(point => ({
        ...point,
        intensity: point.intensity * this.HEATMAP_DECAY
      }))
      .filter(point => point.intensity > 0.1);
  }
  
  public calibrate(calibrationPoints: CalibrationData['calibrationPoints']): void {
    // Calculate average distance and adjust thresholds
    const distances = calibrationPoints.map((point, i) => {
      if (i === 0) return 0;
      const prev = calibrationPoints[i - 1];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    this.FIXATION_THRESHOLD = avgDistance * 0.1;
  }
}

export class EyeTrackingMetricsCalculator {
  private readonly DEFAULT_FIXATION_THRESHOLD = 0.1; // pixels
  private fixationThreshold: number;
  private lastFixationPoint: { x: number; y: number } | null = null;
  private fixationStartTime: number | null = null;
  private fixationPoints: Array<{ x: number; y: number; timestamp: number }> = [];
  private blinkCount: number = 0;
  private lastBlinkTime: number = 0;

  constructor() {
    this.fixationThreshold = this.DEFAULT_FIXATION_THRESHOLD;
  }

  calculateMetrics(faceMesh: any): EyeTrackingMetrics {
    const confidence = this.calculateConfidence(faceMesh);
    const headPose = this.calculateHeadPose(faceMesh);
    const blinkRate = this.calculateBlinkRate(faceMesh);
    const fixationPoints = this.updateFixationPoints(faceMesh);

    return {
      confidence,
      headPose,
      blinkRate,
      fixationPoints
    };
  }

  private calculateConfidence(faceMesh: any): number {
    if (!faceMesh || !faceMesh.length) return 0;
    
    // Calculate confidence based on face mesh visibility
    const visiblePoints = faceMesh.filter((point: any) => point.visibility > 0.5).length;
    return Math.min(1, visiblePoints / faceMesh.length);
  }

  private calculateHeadPose(faceMesh: any): { yaw: number; pitch: number; roll: number } {
    if (!faceMesh || faceMesh.length < 468) return { yaw: 0, pitch: 0, roll: 0 };

    // Calculate head pose using face mesh points
    const nose = faceMesh[1];
    const leftEye = faceMesh[33];
    const rightEye = faceMesh[263];
    const leftMouth = faceMesh[61];
    const rightMouth = faceMesh[291];

    // Calculate yaw (left-right rotation)
    const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const mouthDistance = Math.hypot(rightMouth.x - leftMouth.x, rightMouth.y - leftMouth.y);
    const yaw = Math.atan2(mouthDistance - eyeDistance, eyeDistance) * (180 / Math.PI);

    // Calculate pitch (up-down rotation)
    const noseToEyes = (leftEye.y + rightEye.y) / 2 - nose.y;
    const pitch = Math.atan2(noseToEyes, eyeDistance) * (180 / Math.PI);

    // Calculate roll (tilt)
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    return { yaw, pitch, roll };
  }

  private calculateBlinkRate(faceMesh: any): number {
    if (!faceMesh || faceMesh.length < 468) return 0;

    const leftEye = faceMesh[33];
    const rightEye = faceMesh[263];
    const leftEyeTop = faceMesh[159];
    const leftEyeBottom = faceMesh[145];
    const rightEyeTop = faceMesh[386];
    const rightEyeBottom = faceMesh[374];

    // Calculate eye aspect ratio
    const leftEAR = this.calculateEyeAspectRatio(leftEye, leftEyeTop, leftEyeBottom);
    const rightEAR = this.calculateEyeAspectRatio(rightEye, rightEyeTop, rightEyeBottom);
    const ear = (leftEAR + rightEAR) / 2;

    // Detect blink
    const now = Date.now();
    if (ear < 0.2 && now - this.lastBlinkTime > 200) {
      this.blinkCount++;
      this.lastBlinkTime = now;
    }

    // Calculate blink rate (blinks per minute)
    const timeWindow = 60000; // 1 minute in milliseconds
    const recentBlinks = this.blinkCount;
    return recentBlinks;
  }

  private calculateEyeAspectRatio(eye: any, top: any, bottom: any): number {
    const height = Math.hypot(top.x - bottom.x, top.y - bottom.y);
    const width = Math.hypot(eye.x - top.x, eye.y - top.y);
    return height / width;
  }

  private updateFixationPoints(faceMesh: any): Array<{ x: number; y: number; timestamp: number }> {
    if (!faceMesh || faceMesh.length < 468) return this.fixationPoints;

    const nose = faceMesh[1];
    const now = Date.now();

    if (!this.lastFixationPoint) {
      this.lastFixationPoint = { x: nose.x, y: nose.y };
      this.fixationStartTime = now;
      return this.fixationPoints;
    }

    const distance = Math.hypot(
      nose.x - this.lastFixationPoint.x,
      nose.y - this.lastFixationPoint.y
    );

    if (distance < this.fixationThreshold) {
      // Still in fixation
      if (this.fixationStartTime && now - this.fixationStartTime > 100) {
        this.fixationPoints.push({
          x: nose.x,
          y: nose.y,
          timestamp: now
        });
      }
    } else {
      // New fixation point
      this.lastFixationPoint = { x: nose.x, y: nose.y };
      this.fixationStartTime = now;
    }

    // Keep only recent fixation points
    const timeWindow = 5000; // 5 seconds
    this.fixationPoints = this.fixationPoints.filter(
      point => now - point.timestamp < timeWindow
    );

    return this.fixationPoints;
  }

  calibrate(faceMesh: any): void {
    if (!faceMesh || faceMesh.length < 468) return;

    // Calculate average distance between consecutive points
    let totalDistance = 0;
    let count = 0;

    for (let i = 1; i < faceMesh.length; i++) {
      const prev = faceMesh[i - 1];
      const curr = faceMesh[i];
      const distance = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      totalDistance += distance;
      count++;
    }

    const avgDistance = totalDistance / count;
    this.fixationThreshold = avgDistance * 0.1;
  }

  // Create web workers for performance optimization
  static createWorkers(): void {
    const eyeTrackingWorker = PerformanceOptimizer.createWebWorker(`
      self.onmessage = function(e) {
        const { faceMesh } = e.data;
        // Process face mesh data
        const metrics = calculateMetrics(faceMesh);
        self.postMessage(metrics);
      };
    `);

    const voiceAnalysisWorker = PerformanceOptimizer.createWebWorker(`
      self.onmessage = function(e) {
        const { audioData } = e.data;
        // Process audio data
        const metrics = analyzeAudio(audioData);
        self.postMessage(metrics);
      };
    `);

    PerformanceOptimizer.setWorker('eyeTracking', eyeTrackingWorker);
    PerformanceOptimizer.setWorker('voiceAnalysis', voiceAnalysisWorker);
  }
}

// Create a worker for eye tracking
const eyeTrackingWorker = PerformanceOptimizer.createWebWorker(`
  importScripts('eye-tracking-metrics.js');
  self.onmessage = async (e) => {
    const result = await EyeTrackingAnalyzer.processFrame(e.data);
    self.postMessage(result);
  };
`);

// Create a worker for voice analysis
const voiceAnalysisWorker = PerformanceOptimizer.createWebWorker(`
  importScripts('voice-analysis-service.js');
  self.onmessage = async (e) => {
    const result = await VoiceAnalysisService.analyzeVoice(e.data);
    self.postMessage(result);
  };
`); 