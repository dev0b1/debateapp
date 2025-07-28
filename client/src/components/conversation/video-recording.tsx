import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Camera, Video, Square, Play, Pause, Download, AlertCircle } from 'lucide-react';

interface VideoRecordingProps {
  roomName: string;
  isActive: boolean;
  onRecordingComplete?: (recordingData: any) => void;
}

export function VideoRecording({ roomName, isActive, onRecordingComplete }: VideoRecordingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingStats, setRecordingStats] = useState({
    duration: 0,
    size: 0
  });

  // Start video stream
  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false // We'll use LiveKit for audio
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoStream(stream);
      }
    } catch (err) {
      console.error('Failed to start video stream:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  // Stop video stream
  const stopVideoStream = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!videoStream) {
      await startVideoStream();
    }

    if (!videoStream) {
      setError('No video stream available');
      return;
    }

    try {
      // Create MediaRecorder with video stream
      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create recording data
        const recordingData = {
          blob,
          url,
          duration: recordingTime,
          size: blob.size,
          roomName,
          timestamp: new Date().toISOString()
        };

        // Update stats
        setRecordingStats({
          duration: recordingTime,
          size: blob.size
        });

        // Call completion callback
        if (onRecordingComplete) {
          onRecordingComplete(recordingData);
        }

        console.log('Recording completed:', recordingData);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);

      console.log('Started video recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Stopped video recording');
    }
  };

  // Download recording
  const downloadRecording = () => {
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `interview-recording-${roomName}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  // Auto-start recording when active
  useEffect(() => {
    if (isActive && !isRecording) {
      startRecording();
    } else if (!isActive && isRecording) {
      stopRecording();
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoStream();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Video Recording
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 object-cover"
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <Badge variant="destructive" className="text-xs">
                {formatTime(recordingTime)}
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={!isActive}
                className="bg-red-600 hover:bg-red-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>

          {/* Recording stats */}
          {recordingStats.duration > 0 && (
            <div className="text-sm text-gray-600">
              Duration: {formatTime(recordingStats.duration)} | 
              Size: {(recordingStats.size / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
        </div>

        {/* Download button */}
        {recordedChunksRef.current.length > 0 && !isRecording && (
          <Button
            onClick={downloadRecording}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Recording
          </Button>
        )}

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Status */}
        <div className="text-sm text-gray-500">
          {isRecording ? (
            <span className="text-red-600">Recording in progress...</span>
          ) : isActive ? (
            <span className="text-green-600">Ready to record</span>
          ) : (
            <span className="text-gray-400">Session not active</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 