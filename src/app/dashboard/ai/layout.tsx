import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Assistant',
  description: 'Interact with our context-aware AI assistant',
};

export default function AIDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 