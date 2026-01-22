"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { AdminDispute, DisputeStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Loader2,
  MessageCircle,
  Send,
  User,
  Clock,
} from "lucide-react";

const STATUS_FILTERS: { value: DisputeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

const CHAT_STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

type TabType = "disputes" | "chat";

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
  subject: string | null;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  lastMessageAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  messages: ChatMessage[];
  _count: {
    messages: number;
  };
}

export default function AdminDisputesPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  
  // Disputes state
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "ALL">("OPEN");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Chat state
  const [chatLoading, setChatLoading] = useState(true);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatStatusFilter, setChatStatusFilter] = useState<string>("OPEN");
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (activeTab === "disputes") {
      loadDisputes();
    } else {
      loadConversations();
      loadChatUnreadCount();
    }
  }, [activeTab, statusFilter, chatStatusFilter]);

  // Poll for new messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const pollMessages = async () => {
      try {
        const conv = await api.get<ChatConversation & { messages: ChatMessage[] }>(
          `/admin/chat/conversations/${selectedConversation.id}`,
          true
        );
        setChatMessages(conv.messages);
      } catch (err) {
        console.error("Failed to poll messages:", err);
      }
    };

    const timer = setInterval(pollMessages, 5000);
    return () => clearInterval(timer);
  }, [selectedConversation]);

  const loadChatUnreadCount = async () => {
    try {
      const result = await api.get<{ unreadCount: number }>("/admin/chat/unread-count", true);
      setChatUnreadCount(result.unreadCount);
    } catch {
      // Ignore
    }
  };

  const loadConversations = async () => {
    setChatLoading(true);
    try {
      const params = chatStatusFilter !== "ALL" ? `?status=${chatStatusFilter}` : "";
      const data = await api.get<ChatConversation[]>(`/admin/chat/conversations${params}`, true);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      toast.error("Failed to load conversations");
    } finally {
      setChatLoading(false);
    }
  };

  const selectConversation = async (conv: ChatConversation) => {
    setSelectedConversation(conv);
    try {
      const fullConv = await api.get<ChatConversation & { messages: ChatMessage[] }>(
        `/admin/chat/conversations/${conv.id}`,
        true
      );
      setChatMessages(fullConv.messages);
      loadChatUnreadCount();
    } catch (err) {
      console.error("Failed to load conversation:", err);
      toast.error("Failed to load conversation");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    try {
      const msg = await api.post<ChatMessage>(
        `/admin/chat/conversations/${selectedConversation.id}/messages`,
        { content },
        true
      );
      setChatMessages((prev) => [...prev, msg]);
      loadConversations(); // Refresh conversation list
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(content);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const updateConversationStatus = async (id: string, status: "OPEN" | "RESOLVED" | "CLOSED") => {
    try {
      await api.patch(`/admin/chat/conversations/${id}/status`, { status }, true);
      toast.success(`Conversation marked as ${status.toLowerCase()}`);
      loadConversations();
      if (selectedConversation?.id === id) {
        setSelectedConversation((prev) => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error("Failed to update conversation status:", err);
      toast.error("Failed to update status");
    }
  };

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await api.get<AdminDispute[]>(`/admin/disputes${params}`, true);
      setDisputes(data);
    } catch (err) {
      console.error("Failed to load disputes:", err);
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/disputes/${id}/resolve`, {}, true);
      toast.success("Dispute resolved");
      loadDisputes();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to resolve dispute");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/disputes/${id}/reject`, {}, true);
      toast.success("Dispute rejected");
      loadDisputes();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to reject dispute");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">Disputes & Support</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "chat"
              ? "border-jemo-orange text-jemo-orange"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Support Chat
          {chatUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {chatUnreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("disputes")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "disputes"
              ? "border-jemo-orange text-jemo-orange"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Order Disputes
        </button>
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Chat Filters */}
            <div className="flex flex-wrap gap-2">
              {CHAT_STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setChatStatusFilter(filter.value)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    chatStatusFilter === filter.value
                      ? "bg-jemo-orange text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Conversation List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {chatLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-orange-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate">
                              {conv.user.name}
                            </span>
                            {conv._count.messages > 0 && (
                              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {conv._count.messages}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conv.messages[0]?.content || conv.subject || "No messages"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                conv.status === "OPEN"
                                  ? "bg-green-100 text-green-700"
                                  : conv.status === "RESOLVED"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {conv.status}
                            </span>
                            {conv.lastMessageAt && (
                              <span className="text-xs text-gray-400">
                                {formatTime(conv.lastMessageAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.user.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.user.phone || selectedConversation.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.status === "OPEN" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => updateConversationStatus(selectedConversation.id, "RESOLVED")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-600"
                          onClick={() => updateConversationStatus(selectedConversation.id, "CLOSED")}
                        >
                          Close
                        </Button>
                      </>
                    )}
                    {selectedConversation.status !== "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateConversationStatus(selectedConversation.id, "OPEN")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromAdmin ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.isFromAdmin
                              ? "bg-jemo-orange text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {!msg.isFromAdmin && (
                            <p className="text-xs text-gray-500 mb-1">{msg.sender.name}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.isFromAdmin ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
                  className="border-t border-gray-200 p-4 flex gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                    disabled={sendingMessage}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-jemo-orange hover:bg-jemo-orange/90"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === "disputes" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? "bg-jemo-orange text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDisputes}
              disabled={loading}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

      {/* Disputes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          title="No disputes found"
          description={
            statusFilter === "OPEN"
              ? "No open disputes to review."
              : "No disputes match the selected filter."
          }
        />
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      Dispute #{dispute.id.slice(-8)}
                    </p>
                    <StatusBadge status={dispute.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Order #{dispute.orderId.slice(-8)}
                    {dispute.order?.totalAmount && ` • ${formatPrice(dispute.order.totalAmount)}`}
                  </p>
                  {(dispute.customer || dispute.order?.customer) && (
                    <p className="text-sm text-gray-500">
                      Customer: {dispute.customer?.name || dispute.order?.customer?.name || "Unknown"}
                      {(dispute.customer?.phone || dispute.order?.customer?.phone) && 
                        ` (${dispute.customer?.phone || dispute.order?.customer?.phone})`
                      }
                    </p>
                  )}
                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-700">Reason:</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {dispute.reason || "No reason provided"}
                    </p>
                  </div>
                  {dispute.resolution && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-700">Resolution:</p>
                      <p className="text-sm text-gray-600 mt-1">{dispute.resolution}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 pt-2">
                    Created: {new Date(dispute.createdAt).toLocaleDateString()}
                    {dispute.resolvedAt && ` • Resolved: ${new Date(dispute.resolvedAt).toLocaleDateString()}`}
                  </p>
                </div>

                {dispute.status === "OPEN" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleResolve(dispute.id)}
                      disabled={processingId === dispute.id}
                    >
                      {processingId === dispute.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Resolve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(dispute.id)}
                      disabled={processingId === dispute.id}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

