/**
 * Streaming Message Component
 * 
 * Provides enhanced visual feedback for streaming text responses
 * with cursor animation and highlighting of new content.
 */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingMessageProps {
  content: string;
  className?: string;
  speed?: 'fast' | 'normal' | 'slow';
  highlightNewText?: boolean;
  showCursor?: boolean;
}

export function StreamingMessage({
  content,
  className,
  speed = 'normal',
  highlightNewText = true,
  showCursor = true,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [newChunk, setNewChunk] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const previousContentRef = useRef('');
  
  // Determine the highlight fade duration based on speed
  const highlightDuration = {
    fast: 0.3,
    normal: 0.5,
    slow: 0.8,
  }[speed];
  
  // Blink cursor effect
  useEffect(() => {
    if (!showCursor) return;
    
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [showCursor]);
  
  // Update displayed content when content prop changes
  useEffect(() => {
    if (content === displayedContent) return;
    
    // Find the new chunk that was added
    const newText = content.slice(previousContentRef.current.length);
    
    if (newText) {
      setNewChunk(newText);
      setDisplayedContent(content);
      previousContentRef.current = content;
      
      // Reset the highlight after a delay
      if (highlightNewText) {
        const timer = setTimeout(() => {
          setNewChunk('');
        }, highlightDuration * 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [content, displayedContent, highlightNewText, highlightDuration]);
  
  // Render with highlight effect
  const renderWithHighlight = () => {
    if (!highlightNewText || !newChunk) {
      return (
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
      );
    }
    
    // Split content into already displayed part and new chunk
    const displayedPart = content.slice(0, content.length - newChunk.length);
    
    return (
      <div>
        <ReactMarkdown
          components={{
            code({ className, children, style, ref, ...props }) {
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
          {displayedPart}
        </ReactMarkdown>
        
        <AnimatePresence>
          <motion.span
            initial={{ backgroundColor: 'rgba(144, 202, 249, 0.2)' }}
            animate={{ backgroundColor: 'rgba(144, 202, 249, 0)' }}
            transition={{ duration: highlightDuration }}
            className="inline"
          >
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
              {newChunk}
            </ReactMarkdown>
          </motion.span>
        </AnimatePresence>
      </div>
    );
  };
  
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {renderWithHighlight()}
      
      {showCursor && (
        <span className={cn("ml-0.5 animate-pulse", cursorVisible ? "opacity-100" : "opacity-0")}>
          ▌
        </span>
      )}
    </div>
  );
} 