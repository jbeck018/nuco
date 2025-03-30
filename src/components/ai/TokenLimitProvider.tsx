'use client';

/**
 * TokenLimitProvider.tsx
 * 
 * A provider component that checks if the organization's token usage limit has been exceeded
 * and displays a modal when necessary.
 */
import { ReactNode, createContext, useContext, useEffect } from 'react';
import { useTokenLimitCheck } from '@/hooks/useTokenLimitCheck';
import { TokenLimitExceededModal } from './TokenLimitExceededModal';
import { useOrganization } from '@/lib/organizations/context';

// Context to provide token limit checking functionality
interface TokenLimitContextType {
  isLimitExceeded: boolean;
  isChecking: boolean;
  checkTokenLimit: () => Promise<boolean>;
  currentUsage: number;
  usageLimit: number;
}

const TokenLimitContext = createContext<TokenLimitContextType | null>(null);

// Hook to use the token limit context
export function useTokenLimit(): TokenLimitContextType {
  const context = useContext(TokenLimitContext);
  if (!context) {
    throw new Error('useTokenLimit must be used within a TokenLimitProvider');
  }
  return context;
}

interface TokenLimitProviderProps {
  children: ReactNode;
  checkOnMount?: boolean;
}

export function TokenLimitProvider({ 
  children, 
  checkOnMount = true 
}: TokenLimitProviderProps) {
  const { currentOrganization } = useOrganization();
  const { 
    isLimitExceeded,
    isModalOpen,
    isChecking,
    currentUsage,
    usageLimit,
    checkTokenLimit,
    closeModal
  } = useTokenLimitCheck();
  
  // Check token limit on mount if enabled
  useEffect(() => {
    if (checkOnMount && currentOrganization?.id) {
      checkTokenLimit().catch(error => {
        console.error('Error checking token limit on mount:', error);
      });
    }
  }, [checkOnMount, currentOrganization?.id, checkTokenLimit]);
  
  // Create the context value
  const contextValue: TokenLimitContextType = {
    isLimitExceeded,
    isChecking,
    checkTokenLimit,
    currentUsage,
    usageLimit
  };
  
  return (
    <TokenLimitContext.Provider value={contextValue}>
      {children}
      
      {/* Modal that appears when token limit is exceeded */}
      <TokenLimitExceededModal
        isOpen={isModalOpen}
        onClose={closeModal}
        currentUsage={currentUsage}
        usageLimit={usageLimit}
      />
    </TokenLimitContext.Provider>
  );
} 