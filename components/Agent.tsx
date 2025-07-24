"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Debug: Log environment variables and props
  useEffect(() => {
    console.log("=== AGENT DEBUG INFO ===");
    console.log("Environment:", {
      workflowId: process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID,
      nodeEnv: process.env.NODE_ENV,
    });
    console.log("Props:", {
      userName,
      userId,
      type,
      questions: questions?.length || 0,
      interviewId,
      feedbackId,
    });
    console.log("VAPI SDK:", vapi);
    console.log("Interviewer config:", interviewer);
  }, [userName, userId, type, questions, interviewId, feedbackId]);

  const onCallStart = useCallback(() => {
    console.log("✅ Call started successfully");
    setCallStatus(CallStatus.ACTIVE);
    setError("");
  }, []);

  const onCallEnd = useCallback(() => {
    console.log("📞 Call ended");
    setCallStatus(CallStatus.FINISHED);
    setIsSpeaking(false);
  }, []);

  const onMessage = useCallback((message: any) => {
    console.log("💬 Message received:", message);
    
    if (message.type === "transcript" && message.transcriptType === "final") {
      const newMessage = { 
        role: message.role, 
        content: message.transcript 
      };
      setMessages((prev) => [...prev, newMessage]);
    }
  }, []);

  const onSpeechStart = useCallback(() => {
    console.log("🎤 Speech started");
    setIsSpeaking(true);
  }, []);

  const onSpeechEnd = useCallback(() => {
    console.log("🔇 Speech ended");
    setIsSpeaking(false);
  }, []);

  const onError = useCallback((error: any) => {
    console.error("❌ VAPI Error details:", {
      error,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack,
    });
    
    let errorMessage = "Unknown error occurred";
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.code) {
      errorMessage = `Error code: ${error.code}`;
    }
    
    setError(errorMessage);
    setCallStatus(CallStatus.ERROR);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    console.log("🔌 Setting up VAPI event listeners");
    
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      console.log("🧹 Cleaning up VAPI event listeners");
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [onCallStart, onCallEnd, onMessage, onSpeechStart, onSpeechEnd, onError]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("📝 Generating feedback...");

      try {
        const { success, feedbackId: id } = await createFeedback({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages,
          feedbackId,
        });

        if (success && id) {
          console.log("✅ Feedback saved successfully");
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          console.error("❌ Failed to save feedback");
          router.push("/");
        }
      } catch (err) {
        console.error("❌ Error generating feedback:", err);
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      await vapi.start(
        undefined,
        undefined,
        undefined,
        process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
        {
          variableValues: {
            username: userName,
            userid: userId,
          },
        }
      );
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  };

  const handleDisconnect = () => {
    console.log("🛑 Disconnecting call");
    setCallStatus(CallStatus.FINISHED);
    try {
      vapi.stop();
    } catch (err) {
      console.error("Error stopping VAPI:", err);
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retrying call");
    setError("");
    setCallStatus(CallStatus.INACTIVE);
    setMessages([]);
    setLastMessage("");
  };

  return (
    <>
      {/* Debug Panel - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black text-white p-2 rounded text-xs max-w-xs">
          <div>Status: {callStatus}</div>
          <div>Messages: {messages.length}</div>
          <div>Speaking: {isSpeaking ? 'Yes' : 'No'}</div>
          {error && <div className="text-red-400">Error: {error}</div>}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={handleRetry}
            className="ml-4 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
          <div className="text-xs text-gray-500">
            {callStatus === CallStatus.ACTIVE ? '🟢 Active' : 
             callStatus === CallStatus.CONNECTING ? '🟡 Connecting...' :
             callStatus === CallStatus.ERROR ? '🔴 Error' : '⚪ Inactive'}
          </div>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button 
            className="relative btn-call" 
            onClick={callStatus === CallStatus.ERROR ? handleRetry : handleCall}
            disabled={callStatus === CallStatus.CONNECTING}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                ? "Call"
                : callStatus === CallStatus.CONNECTING 
                ? "Connecting..."
                : callStatus === CallStatus.ERROR
                ? "Retry"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;