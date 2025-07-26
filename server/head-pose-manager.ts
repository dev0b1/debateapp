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

  private async findPythonPath(): Promise<string> {
    const { execSync } = require('child_process');
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

  /**
   * Start the head pose detector server
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Head pose detector is already running');
      return true;
    }

    try {
      console.log('🚀 Starting head pose detector server...');
      console.log(`📁 Python path: ${this.pythonPath}`);
      console.log(`📁 Script path: ${this.scriptPath}`);
      console.log(`🌐 Server URL: http://${this.host}:${this.port}`);
      
      // Find Python path (using same method as livekit service)
      try {
        this.pythonPath = await this.findPythonPath();
        console.log(`✅ Python found at: ${this.pythonPath}`);
      } catch (error) {
        console.error('❌ Python not found:', error);
        return false;
      }

      // Check if the script file exists
      const fs = require('fs');
      if (!fs.existsSync(this.scriptPath)) {
        console.error(`❌ Head pose detector script not found: ${this.scriptPath}`);
        return false;
      }
      console.log(`✅ Script file found: ${this.scriptPath}`);
      
      // Try to start the original MediaPipe detector first
      const success = await this.tryStartDetector(this.scriptPath);
      
      if (!success) {
        console.log('⚠️ MediaPipe detector failed, trying simple detector...');
        const simpleScriptPath = './server/simple-head-pose-detector.py';
        if (fs.existsSync(simpleScriptPath)) {
          console.log(`🔄 Falling back to simple detector: ${simpleScriptPath}`);
          const simpleSuccess = await this.tryStartDetector(simpleScriptPath);
          if (simpleSuccess) {
            console.log('✅ Simple detector started successfully');
            return true;
          }
        }
        console.error('❌ Both detectors failed to start');
        return false;
      }
      
      return true;

    } catch (error) {
      console.error('❌ Error starting head pose detector:', error);
      this.isRunning = false;
      return false;
    }
  }

  private async tryStartDetector(scriptPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`🔄 Trying to start detector: ${scriptPath}`);
      
      const detectorProcess = spawn(this.pythonPath, [
        scriptPath,
        'dev'
      ], {
        env: {
          ...process.env,
          HOST: this.host,
          PORT: this.port.toString()
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      console.log(`✅ Python process spawned with PID: ${detectorProcess.pid}`);

      let hasStarted = false;
      let hasError = false;

      // Handle process events
      detectorProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`[Head Pose Detector] ${output.trim()}`);
        
        // Check if server is ready
        if (output.includes('Uvicorn running') || output.includes('Application startup complete') || output.includes('INFO:     Uvicorn running')) {
          if (!hasStarted) {
            hasStarted = true;
            this.isRunning = true;
            this.process = detectorProcess;
            this.emit('started');
            console.log('✅ Head pose detector server started successfully');
            resolve(true);
          }
        }
      });

      detectorProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`[Head Pose Detector Error] ${error.trim()}`);
        
        // Check for MediaPipe import errors
        if (error.includes('No module named \'mediapipe\'') || error.includes('ImportError')) {
          console.log('⚠️ MediaPipe not available, this detector will fail');
          hasError = true;
        }
      });

      detectorProcess.on('close', (code) => {
        console.log(`🛑 Head pose detector process exited with code ${code}`);
        if (!hasStarted) {
          this.isRunning = false;
          this.process = null;
          this.emit('stopped', code);
          resolve(false);
        }
      });

      detectorProcess.on('error', (error) => {
        console.error('❌ Failed to start head pose detector:', error);
        if (!hasStarted) {
          this.isRunning = false;
          this.process = null;
          this.emit('error', error);
          resolve(false);
        }
      });

      // Timeout for startup
      setTimeout(() => {
        if (!hasStarted && !hasError) {
          console.error('❌ Head pose detector failed to start within timeout');
          detectorProcess.kill();
          resolve(false);
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Stop the head pose detector server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      console.log('Head pose detector is not running');
      return;
    }

    try {
      console.log('🛑 Stopping head pose detector server...');
      
      // Send SIGTERM to gracefully stop the process
      this.process.kill('SIGTERM');
      
      // Wait for process to close
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            console.log('🔨 Force killing head pose detector process...');
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000); // 5 second timeout

        this.process?.once('close', () => {
          clearTimeout(timeout);
          this.isRunning = false;
          this.process = null;
          console.log('✅ Head pose detector server stopped');
          resolve();
        });
      });

    } catch (error) {
      console.error('❌ Error stopping head pose detector:', error);
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
      console.log('🔍 Health check: Server not running');
      return false;
    }

    try {
      console.log('🔍 Checking head pose detector health...');
      const response = await fetch(`${this.getServerUrl()}/health`);
      const isHealthy = response.ok;
      console.log(`🔍 Health check result: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      return isHealthy;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Restart the head pose detector server
   */
  async restart(): Promise<boolean> {
    console.log('🔄 Restarting head pose detector server...');
    await this.stop();
    return await this.start();
  }
}

// Create singleton instance
export const headPoseManager = new HeadPoseManager(); 