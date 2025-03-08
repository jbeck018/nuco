/**
 * New Chat Page
 * 
 * This page creates a new chat conversation and redirects to it.
 */

export const runtime = 'edge';

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { uuidv4 } from '@/lib/utils/edge-crypto';

export const metadata: Metadata = {
  title: 'New Chat',
  description: 'Start a new chat with AI assistant',
};

export default async function NewChatPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }
  
  // Create a new conversation
  const [newConversation] = await db.insert(conversations)
    .values({
      id: uuidv4(),
      userId: session.user.id,
      title: 'New Conversation',
    })
    .returning();
  
  // Redirect to the new conversation
  redirect(`/chat/${newConversation.id}`);
} 