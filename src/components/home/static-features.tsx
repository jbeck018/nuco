"use client";

import { Bot, Layers, Zap } from "lucide-react";

export function StaticFeatures() {
  return (
    <section id="features" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
            <Bot className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">AI-Powered Prompting</h3>
            <p className="text-muted-foreground">
              Interact with your business data using natural language prompts and get intelligent responses.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
            <Layers className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">Seamless Integrations</h3>
            <p className="text-muted-foreground">
              Connect with Salesforce, HubSpot, Google, and Slack with just a few clicks.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
            <Zap className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">Real-time Updates</h3>
            <p className="text-muted-foreground">
              Stay informed with real-time data synchronization across all your connected platforms.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 