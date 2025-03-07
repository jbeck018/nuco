/**
 * Chat Conversation Page
 * 
 * This page displays a specific chat conversation.
 * It fetches the conversation data and renders the chat interface.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/chat/chat-interface';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface ChatPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with AI assistant',
};

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    return notFound();
  }
  
  // Validate conversation exists and belongs to user
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, params.id),
      eq(conversations.userId, session.user.id)
    ),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
  });
  
  if (!conversation) {
    return notFound();
  }
  
  // Format messages for the chat interface
  const formattedMessages = conversation.messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <div className="h-full w-full max-w-6xl mx-auto">
      <ChatInterface
        conversationId={params.id}
        initialMessages={formattedMessages}
      />
    </div>
  );
} 