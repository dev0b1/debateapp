import { AccessToken } from "livekit-server-sdk";
import { ConversationTopic, LiveKitSession } from "@shared/schema";
import { getTopicById } from "./conversation-topics";
import { spawn, execSync } from "child_process";
import { EventEmitter } from "events";

export class LiveKitService extends EventEmitter {
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;
  private activeAgents: Map<string, any> = new Map();
  private agentHealthChecks: Map<string, NodeJS.Timeout> = new Map();
  private isConfigured: boolean = false;

  constructor() {
    super();
    console.log('Environment variables:', {
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET
    });
    
    this.apiKey = process.env.LIVEKIT_API_KEY || "";
    this.apiSecret = process.env.LIVEKIT_API_SECRET || "";
    this.wsUrl = process.env.LIVEKIT_URL || "";

    // Check if we have real credentials (not placeholder values)
    this.isConfigured = !!(this.apiKey && this.apiSecret && this.wsUrl && 
      !this.apiKey.includes('your_') && !this.apiSecret.includes('your_') && !this.wsUrl.includes('your_'));

    if (!this.isConfigured) {
      console.warn("⚠️  LiveKit credentials not configured or using placeholder values");
      console.warn("   Real-time communication features will be disabled");
      console.warn("   Please set up LiveKit credentials in your .env file");
    }
  }

  getConnectionUrl(): string {
    return this.wsUrl;
  }

  isLiveKitConfigured(): boolean {
    return this.isConfigured;
  }

  async createConversationRoom(topicId: string): Promise<{ roomName: string; token: string }> {
    if (!this.isConfigured) {
      throw new Error("LiveKit is not configured. Please set up your LiveKit credentials in the .env file.");
    }

    try {
      const topic = getTopicById(topicId);
      if (!topic) {
        throw new Error("Topic not found");
      }

      const roomName = `practice-${Date.now()}`;
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: "user",
        name: "Practice User",
      });

      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      // Start the voice agent with topic information
      await this.startVoiceAgent(roomName, {
        topic: topic.title,
        difficulty: topic.difficulty,
        prompt: topic.prompt
      });

      return {
        roomName,
        token: await token.toJwt(),
      };
    } catch (error) {
      console.error("Error creating conversation room:", error);
      throw error;
    }
  }

  async createAIAgentToken(roomName: string): Promise<string> {
    try {
      const agentToken = new AccessToken(this.apiKey, this.apiSecret, {
        identity: "ai-agent",
        name: "AI Conversation Partner",
      });

      agentToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return agentToken.toJwt();
    } catch (error) {
      console.error("Error creating AI agent token:", error);
      throw new Error("Failed to create AI agent token");
    }
  }

  private async findPythonPath(): Promise<string> {
    const possiblePaths = [
      'python',
      'python3',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
      'C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      'C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
      'C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python310\\python.exe'
    ];

    for (const path of possiblePaths) {
      try {
        execSync(`${path} --version`, { stdio: 'ignore' });
        console.log(`Found Python at: ${path}`);
        return path;
      } catch (error) {
        // Continue to next path
      }
    }
    
    throw new Error('Python not found. Please ensure Python is installed and in PATH.');
  }

  async startVoiceAgent(roomName: string, options: { 
    topic: string; 
    difficulty: string; 
    prompt: string; 
  }): Promise<void> {
    try {
      // Create metadata for the voice agent
      const metadata = JSON.stringify({
        topic: options.topic,
        difficulty: options.difficulty,
        prompt: options.prompt
      });

      // Find Python path
      const pythonPath = await this.findPythonPath();

      // Start the Python voice agent process with connect command
      const agentProcess = spawn(pythonPath, [
        'server/livekit-voice-agent.py',
        'connect',
        '--room',
        roomName
      ], {
        env: {
          ...process.env,
          LIVEKIT_URL: this.wsUrl,
          LIVEKIT_API_KEY: this.apiKey,
          LIVEKIT_API_SECRET: this.apiSecret,
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
          DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
          ROOM_METADATA: metadata
        },
        cwd: process.cwd() // Ensure we're in the right directory
      });

      // Store the agent process
      this.activeAgents.set(roomName, agentProcess);

      // Set up process monitoring
      agentProcess.stdout?.on('data', (data) => {
        console.log(`Voice Agent ${roomName}:`, data.toString());
        this.emit('agentLog', { roomName, type: 'stdout', data: data.toString() });
      });

      agentProcess.stderr?.on('data', (data) => {
        console.error(`Voice Agent ${roomName} Error:`, data.toString());
        this.emit('agentLog', { roomName, type: 'stderr', data: data.toString() });
      });

      agentProcess.on('error', (error) => {
        console.error(`Voice Agent ${roomName} Process Error:`, error);
        this.emit('agentError', { roomName, error });
        this.cleanupAgent(roomName);
      });

      agentProcess.on('close', (code) => {
        console.log(`Voice Agent ${roomName} exited with code ${code}`);
        this.emit('agentClosed', { roomName, code });
        this.cleanupAgent(roomName);
      });

      // Start health check
      this.startHealthCheck(roomName);

      // Wait a moment for the agent to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error('Failed to start voice agent:', error);
      this.emit('agentError', { roomName, error });
      throw new Error('Failed to start voice agent');
    }
  }

  private startHealthCheck(roomName: string): void {
    // Clear any existing health check
    this.stopHealthCheck(roomName);

    // Start new health check
    const healthCheck = setInterval(() => {
      const agentProcess = this.activeAgents.get(roomName);
      if (!agentProcess || agentProcess.killed) {
        console.log(`Voice Agent ${roomName} health check failed - agent not running`);
        this.emit('agentError', { roomName, error: new Error('Agent process not running') });
        this.cleanupAgent(roomName);
      }
    }, 5000); // Check every 5 seconds

    this.agentHealthChecks.set(roomName, healthCheck);
  }

  private stopHealthCheck(roomName: string): void {
    const healthCheck = this.agentHealthChecks.get(roomName);
    if (healthCheck) {
      clearInterval(healthCheck);
      this.agentHealthChecks.delete(roomName);
    }
  }

  private cleanupAgent(roomName: string): void {
    const agentProcess = this.activeAgents.get(roomName);
    if (agentProcess) {
      try {
        agentProcess.kill();
      } catch (error) {
        console.error(`Error killing agent process for room ${roomName}:`, error);
      }
      this.activeAgents.delete(roomName);
    }
    this.stopHealthCheck(roomName);
  }

  async stopVoiceAgent(roomName: string): Promise<void> {
    try {
      const agentProcess = this.activeAgents.get(roomName);
      if (agentProcess) {
        agentProcess.kill();
        this.cleanupAgent(roomName);
        console.log(`Voice Agent ${roomName} stopped successfully`);
      }
    } catch (error) {
      console.error(`Error stopping voice agent for room ${roomName}:`, error);
      throw error;
    }
  }

  // Cleanup all active agents
  async cleanup(): Promise<void> {
    const roomNames = Array.from(this.activeAgents.keys());
    await Promise.all(roomNames.map(roomName => this.stopVoiceAgent(roomName)));
  }

  isAgentActive(roomName: string): boolean {
    const agentProcess = this.activeAgents.get(roomName);
    return !!agentProcess && !agentProcess.killed;
  }
}

export const liveKitService = new LiveKitService();