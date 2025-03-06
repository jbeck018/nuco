import { cache } from 'react';
// import { db } from '@/lib/db';

/**
 * Get recent chats for a user
 * @param userId The user ID
 * @param limit The maximum number of chats to return
 * @returns Recent chats
 */
export const getRecentChats = cache(async (userId: string, limit: number = 5) => {
    if (!userId) {
        return [];
    }
  try {
    // This would typically query your database
    // For now, we'll return mock data
    return [
      {
        id: '1',
        title: 'Sales Pipeline Analysis',
        timestamp: new Date().toISOString(),
        preview: 'Analysis of Q2 sales pipeline with recommendations',
      },
      {
        id: '2',
        title: 'Customer Support Integration',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        preview: 'Setting up Zendesk integration for support tickets',
      },
      {
        id: '3',
        title: 'Marketing Campaign Planning',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        preview: 'Planning Q3 marketing campaigns across channels',
      },
    ].slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return [];
  }
}); 