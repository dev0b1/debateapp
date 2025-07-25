/**
 * Head Pose Manager
 * 
 * Manages the Python head pose detector process from the Node.js server.
 * Starts and stops the FastAPI server as needed.
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class HeadPoseManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;
  private port: number = 5001;
  private host: string = '127.0.0.1';
  private pythonPath: string = 'python';
  private scriptPath: string = './server/head-pose-detector.py';

  constructor(port: number = 5001, host: string = '127.0.0.1') {
    super();
    this.port = port;
    this.host = host;
  }

  /**
   * Start the head pose detector server
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Head pose detector is already running');
      return true;
    }

    try {
      console.log('Starting head pose detector server...');
      
      // Start the Python process
      this.process = spawn(this.pythonPath, [
        '-c',
        `
import sys
sys.path.append('./server')
from head_pose_detector import start_head_pose_server
start_head_pose_server('${this.host}', ${this.port})
        `
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Handle process events
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[Head Pose Detector] ${output.trim()}`);
        
        // Check if server is ready
        if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
          this.isRunning = true;
          this.emit('started');
          console.log('Head pose detector server started successfully');
        }
      });

      this.process.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`[Head Pose Detector Error] ${error.trim()}`);
      });

      this.process.on('close', (code) => {
        console.log(`Head pose detector process exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
        this.emit('stopped', code);
      });

      this.process.on('error', (error) => {
        console.error('Failed to start head pose detector:', error);
        this.isRunning = false;
        this.process = null;
        this.emit('error', error);
      });

      // Wait for server to start (with timeout)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (!this.isRunning) {
            console.error('Head pose detector failed to start within timeout');
            this.stop();
            resolve(false);
          }
        }, 10000); // 10 second timeout

        this.once('started', () => {
          clearTimeout(timeout);
          resolve(true);
        });

        this.once('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

    } catch (error) {
      console.error('Error starting head pose detector:', error);
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Stop the head pose detector server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    try {
      console.log('Stopping head pose detector server...');
      
      // Send SIGTERM to gracefully stop the process
      this.process.kill('SIGTERM');
      
      // Wait for process to close
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            console.log('Force killing head pose detector process...');
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000); // 5 second timeout

        this.process?.once('close', () => {
          clearTimeout(timeout);
          this.isRunning = false;
          this.process = null;
          console.log('Head pose detector server stopped');
          resolve();
        });
      });

    } catch (error) {
      console.error('Error stopping head pose detector:', error);
      this.isRunning = false;
      this.process = null;
    }
  }

  /**
   * Check if the head pose detector is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Check if the server is healthy
   */
  async checkHealth(): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    try {
      const response = await fetch(`${this.getServerUrl()}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Restart the head pose detector server
   */
  async restart(): Promise<boolean> {
    console.log('Restarting head pose detector server...');
    await this.stop();
    return await this.start();
  }
}

// Create singleton instance
export const headPoseManager = new HeadPoseManager(); 