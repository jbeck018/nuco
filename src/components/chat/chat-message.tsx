/**
 * Chat Message Component
 * 
 * This component renders a single message in the chat interface.
 * It supports different message roles (user, assistant, system) with appropriate styling.
 */

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReactMarkdown } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading = false }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        role === 'user' ? 'bg-background' : 'bg-muted/50'
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8">
        {role === 'user' ? (
          <>
            <AvatarImage src="/avatars/user.png" alt="User" />
            <AvatarFallback>U</AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/avatars/assistant.png" alt="Assistant" />
            <AvatarFallback>AI</AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        <div className="font-semibold">
          {role === 'user' ? 'You' : role === 'assistant' ? 'AI Assistant' : 'System'}
        </div>
        
        {isLoading ? (
          <div className="flex h-8 items-center">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      language={match[1]}
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
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
} 