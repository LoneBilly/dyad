import { useState, useRef, useEffect, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { chatMessagesAtom, chatStreamCountAtom, selectedChatIdAtom } from "../atoms/chatAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { ArrowDown } from "lucide-react";

import { ChatHeader } from "./chat/ChatHeader";
import { MessagesList } from "./chat/MessagesList";
import { ChatInput } from "./chat/ChatInput";
import { VersionPane } from "./chat/VersionPane";
import { ChatError } from "./chat/ChatError";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { PromoMessage } from "./chat/PromoMessage";
import { useSettings } from "@/hooks/useSettings";
import { useUserBudgetInfo } from "@/hooks/useUserBudgetInfo";
import { selectedAppIdAtom } from "@/atoms/appAtoms";

interface ChatPanelProps {
  chatId?: number;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
}

export function ChatPanel({
  chatId,
  isPreviewOpen,
  onTogglePreview,
}: ChatPanelProps) {
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [isVersionPaneOpen, setIsVersionPaneOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamCount = useAtomValue(chatStreamCountAtom);
  // Reference to store the processed prompt so we don't submit it twice

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Scroll-related properties

  const userScrollTimeoutRef = useRef<number | null>(null);
  const isAutoScrollingRef = useRef(false);
  const scrollButtonRef = useRef<HTMLButtonElement | null>(null);
  const { settings } = useSettings();
  const { userBudget } = useUserBudgetInfo();
  const appId = useAtomValue(selectedAppIdAtom);
  const selectedChatId = useAtomValue(selectedChatIdAtom);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    isAutoScrollingRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior });

    // Hide the button when scrolling to bottom
    if (scrollButtonRef.current) {
      scrollButtonRef.current.style.opacity = "0";
      scrollButtonRef.current.style.visibility = "hidden";
      scrollButtonRef.current.style.pointerEvents = "none";
    }

    // Reset the auto-scrolling flag after the scroll completes
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, behavior === "smooth" ? 500 : 0);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!scrollButtonRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;

      if (isAtBottom) {
        scrollButtonRef.current.style.opacity = "0";
        scrollButtonRef.current.style.visibility = "hidden";
        scrollButtonRef.current.style.pointerEvents = "none";
      } else {
        scrollButtonRef.current.style.opacity = "1";
        scrollButtonRef.current.style.visibility = "visible";
        scrollButtonRef.current.style.pointerEvents = "auto";
      }
    };

    // Check visibility on mount and on scroll
    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [messages]);

  const fetchChatMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    try {
      const chat = await IpcClient.getInstance().getChat(chatId);
      setMessages(chat.messages);
      setError(null);
    } catch (error) {
      console.error(`Failed to load chat ${chatId}:`, error);
      setMessages([]);
      setError("Chat not found. It may have been deleted.");
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    fetchChatMessages();
  }, [fetchChatMessages]);

  // Auto-scroll effect when messages change or when streaming
  useEffect(() => {
    if (isAutoScrollingRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100;

    // Only auto-scroll if the user is already near the bottom.
    if (isNearBottom) {
      scrollToBottom("auto");
    }
  }, [messages, streamCount]);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        isVersionPaneOpen={isVersionPaneOpen}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={onTogglePreview}
        onVersionClick={() => setIsVersionPaneOpen(!isVersionPaneOpen)}
      />
      <div className="flex-1 overflow-hidden relative">
        {!isVersionPaneOpen ? (
          <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef} data-testid="messages-list">
            <MessagesList messages={messages} messagesEndRef={messagesEndRef} />
            <div ref={messagesEndRef} />
          </div>

            <div className="bg-background/95 backdrop-blur-sm">
              <div className="relative">
                <div className="relative">
                  <ChatInput 
                    chatId={chatId} 
                    onSend={() => scrollToBottom('smooth')} 
                    streamCount={streamCount}
                  />
                  
                  {/* Scroll to bottom button - positioned inside the chat container */}
                  <button
                    ref={scrollButtonRef}
                    onClick={() => scrollToBottom('smooth')}
                    // Start hidden, manage visibility with styles for smooth transitions
                    style={{
                      opacity: '0',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                    }}
                    className="absolute right-4 -top-12 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-opacity duration-200 hover:scale-110 hover:shadow-xl dark:bg-gray-800"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
                
                {/* Promo message below the input container */}
                {streamCount > 0 &&
                  !settings?.enableDyadPro &&
                  !userBudget &&
                  messages.length > 0 && (
                    <div className="px-2 text-center">
                      <PromoMessage
                        seed={messages.length * (appId ?? 1) * (selectedChatId ?? 1)}
                        className="text-xs text-white/80 [&_a]:text-blue-400 [&_a]:hover:text-blue-300 [&_a]:transition-colors"
                      />
                    </div>
                )}
                
                {/* Messages d'aide et d'erreur en bas */}
                <div className="px-4 pb-2">
                  {error && (
                    <div className="text-xs text-red-500 dark:text-red-400 mb-1">
                      <ChatError error={error} onDismiss={() => setError(null)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <VersionPane
            isVisible={isVersionPaneOpen}
            onClose={() => setIsVersionPaneOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
