/**
 * Function Calling Example Page
 * 
 * This page demonstrates the use of OpenAI function calling.
 */

export const runtime = 'edge';

import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FunctionCallingDemo } from '@/components/chat/function-calling-demo';

export const metadata: Metadata = {
  title: 'Function Calling Demo',
  description: 'Demonstration of OpenAI function calling capabilities',
};

export default async function FunctionCallingPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/api/auth/signin');
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Function Calling Demo</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        This demo shows how to use OpenAI function calling to get structured data from the AI.
      </p>
      <FunctionCallingDemo userId={session.user.id} />
    </div>
  );
} 