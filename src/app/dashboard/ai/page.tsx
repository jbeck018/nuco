/**
 * AI Dashboard Page
 * 
 * This page demonstrates the ContextAwareAI component with proper type safety
 * and user preferences integration.
 */

import { Metadata } from 'next';
import { ContextAwareAI, Message } from '@/components/ai/ContextAwareAI';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export const metadata: Metadata = {
  title: 'AI Assistant',
  description: 'Interact with our context-aware AI assistant',
};

export default function AIDashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Example organization data
  const organizationData = {
    name: 'Acme Corporation',
    domain: 'acme.com',
    industry: 'Technology',
    customData: {
      size: 'Enterprise',
      founded: '2005',
      locations: ['San Francisco', 'New York', 'London']
    }
  };
  
  // Example user data
  const userData = {
    role: 'Product Manager',
    preferences: {
      responseStyle: 'concise',
      dataFormat: 'structured',
      includeExamples: true
    },
    customData: {
      department: 'Product',
      expertise: ['SaaS', 'B2B', 'Enterprise Software']
    }
  };
  
  // Handle new messages
  const handleMessageSent = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Handle AI responses
  const handleResponseReceived = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="AI Assistant"
        text="Interact with our context-aware AI assistant that adapts to your preferences"
      />
      
      <div className="grid gap-8">
        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="history">Conversation History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assistant" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Context-Aware AI</CardTitle>
                <CardDescription>
                  This AI assistant uses your preferences and organization context to provide more relevant responses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContextAwareAI
                  initialSystemPrompt="You are a helpful AI assistant for Acme Corporation. Provide concise, relevant information based on the user's role and preferences."
                  placeholder="Ask me anything about your organization, products, or general questions..."
                  userData={userData}
                  organizationData={organizationData}
                  onMessageSent={handleMessageSent}
                  onResponseReceived={handleResponseReceived}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>AI Preferences</CardTitle>
                <CardDescription>
                  Your AI preferences determine how the assistant interacts with you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Current Settings:</p>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Response Style: Concise</li>
                    <li>Data Format: Structured</li>
                    <li>Include Examples: Yes</li>
                    <li>Include Organization Context: Yes</li>
                    <li>Include User History: Yes</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-2">
                    You can change these settings in your AI preferences page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Conversation History</CardTitle>
                <CardDescription>
                  Your recent conversations with the AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No conversation history yet. Start chatting with the AI assistant!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary/10 ml-8' 
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1">
                          {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
} 