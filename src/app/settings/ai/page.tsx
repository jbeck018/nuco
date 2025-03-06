/**
 * AI Settings Page
 * 
 * This page provides a user interface for configuring AI preferences
 * including model selection, token limits, and context settings.
 */
import { Metadata } from 'next';
import { AiSettingsForm } from '@/components/settings/AiSettingsForm';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'AI Settings - Nuco',
  description: 'Configure your AI preferences for contextual, personalized AI interactions',
};

export default function AiSettingsPage() {
  return (
    <div className="container max-w-5xl py-8">
      <PageHeader
        heading="AI Settings"
        subheading="Configure your AI preferences for more relevant and personalized interactions"
      />
      
      <div className="mt-8">
        <AiSettingsForm />
      </div>
    </div>
  );
} 