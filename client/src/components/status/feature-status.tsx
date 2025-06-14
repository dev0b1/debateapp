import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface FeatureStatus {
  status: "healthy" | "error" | "loading";
  features: {
    voiceAnalysis: boolean;
    aiConversation: boolean;
    realtimeCommunication: boolean;
    eyeTracking: boolean;
    sessionRecording: boolean;
  };
  environment: string;
  timestamp: string;
}

export function FeatureStatus() {
  const [status, setStatus] = useState<FeatureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          setError("Failed to check server status");
        }
      } catch (err) {
        setError("Cannot connect to server");
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking System Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            System Status Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const features = [
    {
      name: "Voice Analysis",
      enabled: status.features.voiceAnalysis,
      description: "Real-time speech analysis and transcription",
      required: "Deepgram API Key"
    },
    {
      name: "AI Conversation",
      enabled: status.features.aiConversation,
      description: "AI-powered conversation practice",
      required: "OpenRouter API Key"
    },
    {
      name: "Real-time Communication",
      enabled: status.features.realtimeCommunication,
      description: "Live voice conversations",
      required: "LiveKit Configuration"
    },
    {
      name: "Eye Tracking",
      enabled: status.features.eyeTracking,
      description: "Face detection and eye contact tracking",
      required: "Camera Permission"
    },
    {
      name: "Session Recording",
      enabled: status.features.sessionRecording,
      description: "Practice session recording and metrics",
      required: "None (In-Memory)"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {features.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {feature.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <div>
                  <h4 className="font-medium">{feature.name}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={feature.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {feature.enabled ? "Ready" : "Setup Required"}
                </Badge>
                {!feature.enabled && (
                  <p className="text-xs text-gray-500 mt-1">{feature.required}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">
            Environment: <Badge className="bg-blue-100 text-blue-800">{status.environment}</Badge>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Last checked: {new Date(status.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 