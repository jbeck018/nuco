/**
 * Chat Home Page
 * 
 * This page displays a list of all chat conversations and allows starting a new one.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareIcon, PlusIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat with AI assistant',
};

export default async function ChatHomePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }
  
  // Fetch all conversations for the user
  const userConversations = await db.query.conversations.findMany({
    where: eq(conversations.userId, session.user.id),
    orderBy: [desc(conversations.updatedAt)],
    with: {
      messages: {
        limit: 1,
        orderBy: [desc(messages.createdAt)],
      },
    },
  });

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chat</h1>
        <Button asChild>
          <Link href="/chat/new" className="gap-1">
            <PlusIcon className="h-4 w-4" />
            New Chat
          </Link>
        </Button>
      </div>
      
      {userConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <MessageSquareIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No conversations yet</h2>
          <p className="mb-6 text-muted-foreground">
            Start a new conversation to chat with the AI assistant.
          </p>
          <Button asChild>
            <Link href="/chat/new" className="gap-1">
              <PlusIcon className="h-4 w-4" />
              Start a New Chat
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userConversations.map((conversation) => (
            <Card key={conversation.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="truncate">{conversation.title}</CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {conversation.messages[0]?.content || 'No messages yet'}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/chat/${conversation.id}`}>Continue Chat</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 