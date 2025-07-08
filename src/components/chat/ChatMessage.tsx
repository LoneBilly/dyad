import type { Message } from "@/ipc/ipc_types";
import {
  DyadMarkdownParser,
  VanillaMarkdownParser,
} from "./DyadMarkdownParser";
import { motion } from "framer-motion";
import { useStreamChat } from "@/hooks/useStreamChat";
import { CheckCircle, XCircle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  isLastMessage: boolean;
}

const ChatMessage = ({ message, isLastMessage }: ChatMessageProps) => {
  const { isStreaming } = useStreamChat();
  return (
    <div
      className={`flex ${
        message.role === "assistant" ? "justify-start" : "justify-end"
      }`}
    >
      <div className={`mt-2 w-full max-w-3xl mx-auto`}>
        <div
          className={`rounded-lg p-2 ${
            message.role === "assistant" ? "" : "ml-24 bg-(--sidebar-accent)"
          }`}
        >
          {message.role === "assistant" &&
          !message.content &&
          isStreaming &&
          isLastMessage ? (
            <div className="flex items-center space-x-2 p-1 text-gray-400 dark:text-gray-500 text-xs italic">
              <span>Generating</span>
              <motion.span
                className="inline-block"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
              >
                .
              </motion.span>
              <motion.span
                className="inline-block"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
              >
                .
              </motion.span>
              <motion.span
                className="inline-block"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
              >
                .
              </motion.span>
            </div>
          ) : (
            <div
              className="prose dark:prose-invert prose-headings:mb-2 prose-p:my-1 prose-pre:my-0 max-w-none"
              suppressHydrationWarning
            >
              {message.role === "assistant" ? (
                <>
                  <DyadMarkdownParser content={message.content} />
                  {isLastMessage && isStreaming && (
                    <div className="mt-1 ml-2 text-xs text-gray-400 dark:text-gray-500 italic">
                      Generating...
                    </div>
                  )}
                </>
              ) : (
                <VanillaMarkdownParser content={message.content} />
              )}
            </div>
          )}
          {message.approvalState && (
            <div className="mt-2 flex items-center justify-end space-x-1 text-xs">
              {message.approvalState === "approved" ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Approved</span>
                </>
              ) : message.approvalState === "rejected" ? (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Rejected</span>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
