"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2Icon } from 'lucide-react';
import { useTRPCClient } from '@/lib/trpc/trpc';
import { toast } from '@/components/ui/use-toast';

interface ChatCardProps {
  id: string;
  title: string;
  updatedAt: Date;
  preview: string;
}

export function ChatCard({ id, title, updatedAt, preview }: ChatCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const trpc = useTRPCClient();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await trpc.ai.deleteConversation.mutate({ id });
      toast({
        title: "Chat deleted",
        description: "The chat has been successfully deleted.",
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "Failed to delete the chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="truncate">{title}</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2Icon className="h-4 w-4" />
                <span className="sr-only">Delete chat</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete chat</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this chat? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-between sm:justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  variant="destructive"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {preview || 'No messages yet'}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/chat/${id}`}>Continue Chat</Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 