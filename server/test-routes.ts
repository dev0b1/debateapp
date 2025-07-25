import { Router } from "express";
import { liveKitService } from "./livekit-service";

const testRouter = Router();

// Health check endpoint
testRouter.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: {
      voiceAnalysis: !!process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('your_'),
      aiConversation: !!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your_'),
      realtimeCommunication: liveKitService.isLiveKitConfigured(),
      attentionTracking: true, // Always available (client-side)
      sessionRecording: true // Always available (in-memory)
    },
    environment: process.env.NODE_ENV || "development"
  });
});

// Test environment variables
testRouter.get("/api/test/env", (req, res) => {
  const envStatus = {
    LIVEKIT_URL: !!process.env.LIVEKIT_URL && !process.env.LIVEKIT_URL.includes('your_'),
    LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY && !process.env.LIVEKIT_API_KEY.includes('your_'),
    LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET && !process.env.LIVEKIT_API_SECRET.includes('your_'),
    DEEPGRAM_API_KEY: !!process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('your_'),
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.includes('your_'),
    NODE_ENV: process.env.NODE_ENV || "development"
  };

  const allConfigured = Object.values(envStatus).every(Boolean);
  
  res.json({
    configured: allConfigured,
    variables: envStatus,
    message: allConfigured 
      ? "All environment variables are configured correctly!" 
      : "Some environment variables are missing or using placeholder values. See SETUP.md for details."
  });
});

// LiveKit status endpoint
testRouter.get("/api/test/livekit-status", (req, res) => {
  const isConfigured = liveKitService.isLiveKitConfigured();
  const connectionUrl = liveKitService.getConnectionUrl();
  
  res.json({
    configured: isConfigured,
    connectionUrl,
    message: isConfigured 
      ? "LiveKit is configured and ready to use!" 
      : "LiveKit is not configured. Please check your environment variables."
  });
});

export default testRouter; 