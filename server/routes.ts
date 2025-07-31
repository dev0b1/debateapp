import { Router } from "express";
import { debateTopics, getTopicById } from "./debate-topics";
import { liveKitService } from "./livekit-service";
import testRouter from "./test-routes";

const router = Router();

// Add test routes
router.use(testRouter);

// WebSocket-like endpoint for current question updates
router.get("/api/conversation/current-question/:roomName", (req, res) => {
  const { roomName } = req.params;
  
  // Set up Server-Sent Events for real-time question updates
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Listen for current question updates from the LiveKit service
  const questionHandler = (data: { roomName: string; question: string }) => {
    if (data.roomName === roomName) {
      res.write(`data: ${JSON.stringify({ question: data.question })}\n\n`);
    }
  };

  liveKitService.on('currentQuestion', questionHandler);

  // Clean up when client disconnects
  req.on('close', () => {
    liveKitService.off('currentQuestion', questionHandler);
  });
});

// Get current user (demo implementation)
router.get("/api/user/current", (req, res) => {
  res.json({
    id: 1,
    name: "Demo User",
    email: "demo@example.com"
  });
});







// Get debate topics
router.get("/api/conversation/topics", (req, res) => {
  console.log("Fetching debate topics:", debateTopics.length, "topics available");
  res.json(debateTopics);
});

// Create a LiveKit conversation room with AI voice agent
router.post("/api/conversation/create-room", async (req, res) => {
  try {
    const { topicId, context, famousDebater } = req.body;
    console.log("Creating debate room for topic ID:", topicId);
    console.log("Context provided:", context || "None");
    console.log("Famous debater:", famousDebater?.name || "Standard");
    
    if (!topicId) {
      console.log("Missing topicId in request body");
      return res.status(400).json({ error: "Topic ID is required" });
    }

    // Check if LiveKit is configured
    if (!liveKitService.isLiveKitConfigured()) {
      console.log("LiveKit not configured");
      return res.status(503).json({ 
        error: "LiveKit is not configured",
        message: "Please set up your LiveKit credentials in the .env file to use AI conversation features.",
        setupRequired: true
      });
    }



    const topic = getTopicById(topicId);
    console.log("Found topic:", topic ? topic.title : "Not found");
    
    if (!topic) {
      console.log("Topic not found for ID:", topicId);
      return res.status(404).json({ error: "Topic not found" });
    }

    // Create room and get token
    console.log("Creating LiveKit room for topic:", topic.title);
    const { roomName, token } = await liveKitService.createConversationRoom(topicId, context, famousDebater);
    console.log("Room created:", roomName);

    // Wait for agent to connect (with timeout)
    const maxWaitTime = 300000; // 5 minutes - increased for voice agent initialization
    const startTime = Date.now();
    
    console.log(`Waiting for voice agent to connect to room: ${roomName}`);
    while (Date.now() - startTime < maxWaitTime) {
      if (liveKitService.isAgentActive(roomName)) {
        console.log(`✅ AI conversation started in room: ${roomName}`);
        return res.json({
          roomName,
          token,
          serverUrl: liveKitService.getConnectionUrl(),
          topic
        });
      }
      console.log(`⏳ Waiting for agent... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Check every 1 second
    }

    // If we get here, the agent didn't connect in time
    console.error(`Failed to start AI conversation in room: ${roomName}`);
    await liveKitService.stopVoiceAgent(roomName);
    return res.status(500).json({ 
      error: "Failed to start AI conversation",
      message: "The AI agent failed to connect. Please try again."
    });

  } catch (error) {
    console.error("Error creating conversation room:", error);
    res.status(500).json({ error: "Failed to create conversation room" });
  }
});

// End conversation
router.post("/api/conversation/end", async (req, res) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Check if LiveKit is configured
    if (!liveKitService.isLiveKitConfigured()) {
      return res.status(503).json({ 
        error: "LiveKit is not configured",
        message: "Please set up your LiveKit credentials in the .env file to use AI conversation features."
      });
    }

    await liveKitService.stopVoiceAgent(roomName);
    res.json({ success: true });

  } catch (error) {
    console.error("Error ending conversation:", error);
    res.status(500).json({ error: "Failed to end conversation" });
  }
});

// Get conversation status
router.get("/api/conversation/status/:roomName", (req, res) => {
  try {
    const { roomName } = req.params;
    
    if (!roomName) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Check if LiveKit is configured
    if (!liveKitService.isLiveKitConfigured()) {
      return res.status(503).json({ 
        error: "LiveKit is not configured",
        message: "Please set up your LiveKit credentials in the .env file to use AI conversation features."
      });
    }

    const isActive = liveKitService.isAgentActive(roomName);
    res.json({ isActive });

  } catch (error) {
    console.error("Error getting conversation status:", error);
    res.status(500).json({ error: "Failed to get conversation status" });
  }
});

export default router;
