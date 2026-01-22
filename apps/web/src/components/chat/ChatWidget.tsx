"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Shield,
  MinusCircle,
} from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  id: string;
  content: string;
  isFromAdmin: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface ChatConversation {
  id: string;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  messages: ChatMessage[];
}

export function ChatWidget() {
  const locale = useLocale();
  const t = useTranslations("chat");
  const { toast } = useToast();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  // Prevent SSR hydration mismatch - only render on client
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const POLL_INTERVAL = 5000; // 5 seconds

  // Set mounted on client-side only to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for custom event to open chat widget from other components (e.g., footer)
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener("openChatWidget", handleOpenChat);
    return () => {
      window.removeEventListener("openChatWidget", handleOpenChat);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch or create conversation when chat opens
  const initializeChat = useCallback(async () => {
    if (!isLoggedIn) return;

    setLoading(true);
    try {
      const conv = await api.post<ChatConversation>("/chat/conversations", {}, true);
      setConversation(conv);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error("Failed to initialize chat:", err);
      if (err instanceof ApiError && err.status !== 401) {
        toast("Failed to load chat", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, toast]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!conversation || !isOpen || isMinimized) return;

    try {
      const msgs = await api.get<ChatMessage[]>(
        `/chat/conversations/${conversation.id}/messages`,
        true
      );
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to poll messages:", err);
    }
  }, [conversation, isOpen, isMinimized]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const result = await api.get<{ unreadCount: number }>("/chat/unread-count", true);
      setUnreadCount(result.unreadCount);
    } catch {
      // Ignore errors
    }
  }, [isLoggedIn]);

  // Initialize chat when opened
  useEffect(() => {
    if (isOpen && isLoggedIn && !conversation) {
      initializeChat();
    }
  }, [isOpen, isLoggedIn, conversation, initializeChat]);

  // Poll for messages
  useEffect(() => {
    if (!isOpen || isMinimized || !conversation) return;

    const timer = setInterval(pollMessages, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [isOpen, isMinimized, conversation, pollMessages]);

  // Poll for unread count when widget is closed
  useEffect(() => {
    if (!isLoggedIn || isOpen) return;

    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(timer);
  }, [isLoggedIn, isOpen, fetchUnreadCount]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const msg = await api.post<ChatMessage>(
        `/chat/conversations/${conversation.id}/messages`,
        { content: messageContent },
        true
      );
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(messageContent); // Restore message on error
      toast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Don't render during SSR or auth loading to prevent hydration mismatch
  if (!mounted || authLoading) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-jemo-orange hover:bg-jemo-orange/90 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
          aria-label={t("openChat")}
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden transition-all ${
            isMinimized ? "h-14" : "h-[500px] max-h-[calc(100vh-100px)]"
          }`}
        >
          {/* Header */}
          <div className="bg-jemo-orange text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">{t("supportChat")}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded"
                aria-label={isMinimized ? t("expand") : t("minimize")}
              >
                <MinusCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                className="p-1 hover:bg-white/20 rounded"
                aria-label={t("close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Not logged in state */}
              {!isLoggedIn ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-[400px]">
                  <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {t("loginRequired")}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {t("loginRequiredDesc")}
                  </p>
                  <Button asChild>
                    <Link href={`/${locale}/login`}>{t("login")}</Link>
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex-1 flex items-center justify-center h-[400px]">
                  <Loader2 className="w-8 h-8 text-jemo-orange animate-spin" />
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[380px]">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">{t("startConversation")}</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.isFromAdmin ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              msg.isFromAdmin
                                ? "bg-gray-100 text-gray-900"
                                : "bg-jemo-orange text-white"
                            }`}
                          >
                            {msg.isFromAdmin && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Shield className="w-3 h-3" />
                                <span>{t("support")}</span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.isFromAdmin ? "text-gray-400" : "text-white/70"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-gray-200 p-3 flex gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t("typeMessage")}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                      disabled={sending || conversation?.status !== "OPEN"}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sending || conversation?.status !== "OPEN"}
                      className="bg-jemo-orange hover:bg-jemo-orange/90"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
