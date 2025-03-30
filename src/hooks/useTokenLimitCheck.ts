/**
 * useTokenLimitCheck.ts
 * 
 * A hook to check if the organization's token usage limit has been exceeded.
 * It provides a function to check the limit and a modal to show when the limit is exceeded.
 */
import { useState, useCallback } from 'react';
import { useOrganization } from '@/lib/organizations/context';
import { useOrganizationSettings } from './useOrganizationSettings';
import { hasExceededTokenLimit } from '@/lib/ai/service';

export function useTokenLimitCheck() {
  const { currentOrganization } = useOrganization();
  const [isLimitExceeded, setIsLimitExceeded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const { aiSettings } = useOrganizationSettings(currentOrganization?.id || '');
  
  const currentUsage = aiSettings?.usageLimit?.currentMonthUsage || 0;
  const usageLimit = aiSettings?.usageLimit?.monthlyTokenLimit || 1000000;
  
  // Check if the token limit has been exceeded
  const checkTokenLimit = useCallback(async () => {
    if (!currentOrganization?.id) return false;
    
    try {
      setIsChecking(true);
      
      // Skip the check if using custom tokens
      if (aiSettings?.useCustomTokens) {
        setIsLimitExceeded(false);
        return false;
      }
      
      // Check if the limit has been exceeded
      const exceeded = await hasExceededTokenLimit(currentOrganization.id);
      setIsLimitExceeded(exceeded);
      
      // Show the modal if the limit has been exceeded
      if (exceeded) {
        setIsModalOpen(true);
      }
      
      return exceeded;
    } catch (error) {
      console.error('Error checking token limit:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [currentOrganization?.id, aiSettings?.useCustomTokens]);
  
  // Close the modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  return {
    isLimitExceeded,
    isModalOpen,
    isChecking,
    currentUsage,
    usageLimit,
    checkTokenLimit,
    closeModal,
  };
} 