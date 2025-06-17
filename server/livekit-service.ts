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
  private readonly TOKEN_EXPIRY = 24 * 60 * 60; // 24 hours in seconds

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

  async createConversationRoom(topicId: string): Promise<{ roomName: string; token: string; serverUrl: string; topic: ConversationTopic }> {
    if (!this.isConfigured) {
      throw new Error("LiveKit is not configured. Please set up your LiveKit credentials in the .env file.");
    }

    try {
      const topic = getTopicById(topicId);
      if (!topic) {
        throw new Error("Topic not found");
      }

      const roomName = `practice-${Date.now()}`;
      
      // Create user token
      const userToken = new AccessToken(this.apiKey, this.apiSecret, {
        identity: "user",
        name: "Practice User",
        ttl: this.TOKEN_EXPIRY
      });

      userToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true
      });

      // Create agent token
      const agentToken = new AccessToken(this.apiKey, this.apiSecret, {
        identity: "ai-agent",
        name: "AI Conversation Partner",
        ttl: this.TOKEN_EXPIRY
      });

      agentToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true
      });

      // Start the voice agent with topic information
      await this.startVoiceAgent(roomName, {
        topic: topic.title,
        difficulty: topic.difficulty,
        prompt: topic.prompt,
        token: await agentToken.toJwt()
      });

      return {
        roomName,
        token: await userToken.toJwt(),
        serverUrl: this.wsUrl,
        topic
      };
    } catch (error) {
      console.error("Error creating conversation room:", error);
      throw error;
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
    token: string;
  }): Promise<void> {
    try {
      // Create metadata for the voice agent
      const metadata = JSON.stringify({
        topic: options.topic,
        difficulty: options.difficulty,
        prompt: options.prompt,
        timestamp: Date.now()
      });

      // Find Python path
      const pythonPath = await this.findPythonPath();

      // Start the Python voice agent process
      const agentProcess = spawn(pythonPath, [
        'server/livekit-voice-agent.py',
        'dev'
      ], {
        env: {
          ...process.env,
          LIVEKIT_URL: this.wsUrl,
          LIVEKIT_TOKEN: options.token,
          LIVEKIT_ROOM_NAME: roomName,
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
          DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
          ROOM_METADATA: metadata
        },
        cwd: process.cwd()
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

    } catch (error) {
      console.error("Error starting voice agent:", error);
      throw error;
    }
  }

  private startHealthCheck(roomName: string): void {
    const healthCheck = setInterval(() => {
      const agent = this.activeAgents.get(roomName);
      if (!agent || agent.killed) {
        console.error(`Voice Agent ${roomName} is not responding`);
        this.emit('agentError', { roomName, error: 'Agent not responding' });
        this.cleanupAgent(roomName);
      }
    }, 30000); // Check every 30 seconds

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
    const agent = this.activeAgents.get(roomName);
    if (agent) {
      agent.kill();
      this.activeAgents.delete(roomName);
    }
    this.stopHealthCheck(roomName);
  }

  async stopVoiceAgent(roomName: string): Promise<void> {
    try {
      const agent = this.activeAgents.get(roomName);
      if (agent) {
        agent.kill();
        this.activeAgents.delete(roomName);
        this.stopHealthCheck(roomName);
      }
    } catch (error) {
      console.error("Error stopping voice agent:", error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Stop all active agents
    const roomNames = Array.from(this.activeAgents.keys());
    for (const roomName of roomNames) {
      await this.stopVoiceAgent(roomName);
    }
  }

  isAgentActive(roomName: string): boolean {
    const agent = this.activeAgents.get(roomName);
    return !!agent && !agent.killed;
  }
}

export const liveKitService = new LiveKitService();