/**
 * Chat Message Component
 * 
 * This component renders a single message in the chat interface.
 * It supports different message roles (user, assistant, system) with appropriate styling.
 */

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { StreamingMessage } from './streaming-message';

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  messageStatus?: 'idle' | 'streaming' | 'thinking' | 'error';
  timestamp?: string;
}

export function ChatMessage({ 
  role, 
  content, 
  isLoading = false,
  isStreaming = false,
  messageStatus = 'idle',
  timestamp 
}: ChatMessageProps) {
  if (isStreaming) {
    return (
      <StreamingMessage content={content} />
    );
  }

  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        role === 'user' ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <Avatar className="h-8 w-8">
        {role === 'user' ? (
          <>
            <AvatarImage src="/avatars/user.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/avatars/ai.png" alt="AI" />
            <AvatarFallback>AI</AvatarFallback>
          </>
        )}
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold">
            {role === 'user' ? 'You' : 'AI Assistant'}
          </div>
          {timestamp && (
            <div className="text-xs text-muted-foreground">
              {timestamp}
            </div>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {isLoading || messageStatus === 'thinking' ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner className="h-4 w-4" />
              <span>Thinking...</span>
            </div>
          ) : messageStatus === 'error' ? (
            <div className="text-destructive">
              Failed to generate a response. Please try again.
            </div>
          ) : (
            <ReactMarkdown
              components={{
                code({ className, children, ref, style, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      ref={ref as unknown as React.RefObject<SyntaxHighlighter>}
                      language={match[1]}
                      customStyle={style}
                      style={vscDarkPlus}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
} 