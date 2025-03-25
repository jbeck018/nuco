"use client";

import { ChatCard } from '@/components/chat/chat-card';

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
  messages: Array<{ content: string }>;
}

interface ChatListProps {
  conversations: Conversation[];
}

export function ChatList({ conversations }: ChatListProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {conversations.map((conversation) => (
        <ChatCard
          key={conversation.id}
          id={conversation.id}
          title={conversation.title}
          updatedAt={conversation.updatedAt}
          preview={conversation.messages[0]?.content || ''}
        />
      ))}
    </div>
  );
} 