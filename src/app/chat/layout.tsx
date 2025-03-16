import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Chat',
    template: '%s | Chat',
  },
  description: 'Chat with AI assistant',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
} 