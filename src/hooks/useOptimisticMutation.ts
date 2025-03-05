/**
 * useOptimisticMutation.ts
 * 
 * A custom hook that simplifies creating optimistic mutations with tRPC and TanStack Query.
 * This hook provides a standardized way to implement optimistic updates across the application.
 */
import { trpc } from '@/lib/trpc/client';
import { UseTRPCMutationOptions } from '@trpc/react-query/shared';

// Define a simple path type without unused generic parameter
type Path = string;

// Define the shape of the query utils
interface QueryUtils {
  cancel: (input?: unknown) => Promise<void>;
  getData: (input?: unknown) => unknown;
  setData: (input: unknown | undefined, data: unknown) => void;
  invalidate: (options?: { exact?: boolean }) => Promise<void>;
}

// Define the context type for mutation callbacks
interface MutationContext {
  previousData?: unknown;
}

// Define the shape of a tRPC mutation procedure with proper return type
interface MutationProcedure {
  useMutation: <TData, TError, TVariables, TContext>(
    opts?: UseTRPCMutationOptions<TData, TError, TVariables, TContext>
  ) => unknown;
}

/**
 * Options for the optimistic mutation hook
 */
export interface UseOptimisticMutationOptions<
  TPath extends Path,
  TInput,
  TMutationPath extends Path
> {
  // Path to the query that will be optimistically updated
  queryPath: TPath;
  
  // Path to the mutation that will be executed
  mutationPath: TMutationPath;
  
  // Input parameters for the query
  queryInput?: unknown;
  
  // Function to update the cache optimistically
  // Takes the current data and the mutation input, returns the updated data
  updateFn: (
    oldData: unknown | undefined, 
    mutationInput: TInput
  ) => unknown | undefined;
  
  // Optional callbacks
  onSuccess?: (data: unknown, variables: TInput, context: MutationContext) => void;
  onError?: (error: Error, variables: TInput, context: MutationContext) => void;
  onSettled?: (data: unknown | undefined, error: Error | null, variables: TInput, context: MutationContext) => void;
}

/**
 * Helper function to safely access nested properties in the tRPC context
 */
function getNestedProcedure(obj: unknown, path: string) {
  const segments = path.split('.');
  let current = obj;
  
  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  
  return current;
}

/**
 * Helper function to safely access query utils
 */
function getQueryUtils(utils: unknown, path: string): QueryUtils {
  const queryProcedure = getNestedProcedure(utils, path);
  if (!queryProcedure) {
    throw new Error(`Query not found at path: ${path}`);
  }
  
  return queryProcedure as unknown as QueryUtils;
}

/**
 * Custom hook for optimistic mutations
 * Simplifies the process of creating optimistic updates with tRPC
 */
export function useOptimisticMutation<
  TPath extends Path,
  TMutationPath extends Path,
  TInput = unknown
>(
  options: UseOptimisticMutationOptions<TPath, TInput, TMutationPath>
) {
  const utils = trpc.useContext();
  
  // Access the mutation procedure
  const mutationPath = options.mutationPath;
  const mutation = getNestedProcedure(trpc, mutationPath);
  
  if (!mutation || !mutation.hasOwnProperty('useMutation')) {
    throw new Error(`Mutation not found at path: ${mutationPath}`);
  }
  
  // Access the query utilities
  const queryPath = options.queryPath;
  const queryProcedure = getQueryUtils(utils, queryPath);
  
  // Create a mutation with optimistic updates
  const mutationFn = (mutation as MutationProcedure).useMutation;
  return mutationFn({
    onMutate: async (data: TInput) => {
      try {
        // Cancel any outgoing refetches
        await queryProcedure.cancel(options.queryInput);
        
        // Get current data from cache
        const previousData = queryProcedure.getData(options.queryInput);
        
        // Optimistically update the cache with new data
        queryProcedure.setData(options.queryInput, (old: unknown) => options.updateFn(old, data));
        
        // Return context with previous data for rollback in case of failure
        return { previousData };
      } catch (error) {
        console.error('Error in optimistic update:', error);
        return { previousData: undefined };
      }
    },
    
    onError: (error, variables, context) => {
      // Ensure context is defined to satisfy TypeScript
      const safeContext = context || { previousData: undefined };
      
      // Rollback to previous data if there was an error
      if (safeContext.previousData !== undefined) {
        queryProcedure.setData(options.queryInput, safeContext.previousData);
      }
      
      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)), variables as TInput, safeContext);
      }
    },
    
    onSuccess: (data, variables, context) => {
      // Ensure context is defined to satisfy TypeScript
      const safeContext = context || { previousData: undefined };
      
      // Invalidate the query to refetch fresh data from the server
      queryProcedure.invalidate();
      
      // Call custom success handler if provided
      if (options.onSuccess) {
        options.onSuccess(data, variables as TInput, safeContext);
      }
    },
    
    onSettled: (data, error, variables, context) => {
      // Ensure context is defined to satisfy TypeScript
      const safeContext = context || { previousData: undefined };
      
      // Call custom settled handler if provided
      if (options.onSettled) {
        options.onSettled(data, error ? (error instanceof Error ? error : new Error(String(error))) : null, variables as TInput, safeContext);
      }
    },
  });
}

/**
 * Custom hook for optimistic list mutations
 * Specialized version for operating on lists with add/update/remove operations
 */
export function useOptimisticListMutation<
  TPath extends Path,
  TMutationPath extends Path,
  TItem,
  TInput = unknown
>(options: {
  queryPath: TPath;
  mutationPath: TMutationPath;
  queryInput?: unknown;
  
  // Function to get the ID from an item or input
  getId: (item: TItem | TInput) => string | number;
  
  // Operations on the list
  onAdd?: (list: TItem[] | undefined, item: TInput) => TItem[] | undefined;
  onUpdate?: (list: TItem[] | undefined, item: TInput) => TItem[] | undefined;
  onRemove?: (list: TItem[] | undefined, item: TInput) => TItem[] | undefined;
  
  // Optional callbacks
  onSuccess?: UseOptimisticMutationOptions<TPath, TInput, TMutationPath>['onSuccess'];
  onError?: UseOptimisticMutationOptions<TPath, TInput, TMutationPath>['onError'];
  onSettled?: UseOptimisticMutationOptions<TPath, TInput, TMutationPath>['onSettled'];
}) {
  const operationMap = {
    add: options.onAdd,
    update: options.onUpdate,
    remove: options.onRemove,
  };
  
  // Create a generic update function that delegates to the appropriate operation
  const updateFn = (oldData: unknown, mutationInput: TInput & { operation: keyof typeof operationMap }) => {
    const { operation, ...input } = mutationInput;
    const operationFn = operationMap[operation];
    
    if (!operationFn) {
      console.warn(`Operation ${operation} not supported`);
      return oldData;
    }
    
    // Cast oldData to array type and apply the operation
    return operationFn(oldData as TItem[] | undefined, input as TInput);
  };
  
  // Use the basic optimistic mutation with our list-specific update function
  return useOptimisticMutation({
    queryPath: options.queryPath,
    mutationPath: options.mutationPath,
    queryInput: options.queryInput,
    updateFn: updateFn as (oldData: unknown, input: unknown) => unknown,
    onSuccess: options.onSuccess,
    onError: options.onError,
    onSettled: options.onSettled,
  });
} 