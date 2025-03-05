/**
 * useOptimisticEntity.ts
 * 
 * A specialized hook for optimistic updates on a single entity.
 * This hook builds on top of useOptimisticMutation for a more specialized use case.
 */
import { useOptimisticMutation } from './useOptimisticMutation';
import { toast } from '@/components/ui/use-toast';

// Use the updated Path type without the unused generic parameter
type Path = string;

// Type helpers for better intellisense - but we'll use unknown in actual implementation
// to avoid type indexing errors
interface UseOptimisticEntityOptions<
  TPath extends Path,
  TMutationPath extends Path,
  TInput = unknown
> {
  // Path to the query that will be optimistically updated
  queryPath: TPath;
  
  // Path to the mutation that will be executed
  mutationPath: TMutationPath;
  
  // The ID of the entity to update
  entityId: string;
  
  // Parameter name for the entity ID in the query
  idParamName?: string;
  
  // Success toast configuration
  successToast?: {
    title?: string;
    description: string;
  };
  
  // Error toast configuration
  errorToast?: {
    title?: string;
    description?: string;
  };
  
  // Whether to show toasts on success/error
  showToasts?: boolean;
  
  // Function to transform the mutation input to what should be applied to the entity
  // Useful when mutation input and entity structure are different
  transformInput?: (input: TInput) => Partial<unknown>;
}

/**
 * A hook for optimistic updates on a single entity
 * This simplifies common operations on entity CRUD
 */
export function useOptimisticEntity<
  TPath extends Path,
  TMutationPath extends Path,
  TInput = unknown
>(options: UseOptimisticEntityOptions<TPath, TMutationPath, TInput>) {
  const {
    queryPath,
    mutationPath,
    entityId,
    idParamName = 'id',
    successToast,
    errorToast,
    showToasts = true,
    transformInput,
  } = options;
  
  // Create query input with the entity ID
  const queryInput = { [idParamName]: entityId } as unknown;
  
  // Define update function that merges the input with the existing entity
  const updateFn = (oldData: unknown | undefined, mutationInput: TInput) => {
    if (!oldData) return oldData;
    
    const inputToApply = transformInput ? transformInput(mutationInput) : mutationInput;
    
    // Merge the old data with the new input
    return {
      ...(oldData as Record<string, unknown>),
      ...(inputToApply as Record<string, unknown>),
    };
  };
  
  const mutation = useOptimisticMutation({
    queryPath,
    mutationPath,
    queryInput,
    updateFn,
    
    onSuccess: () => {
      if (showToasts && successToast) {
        toast({
          title: successToast.title || 'Success',
          description: successToast.description,
        });
      }
    },
    
    onError: (error) => {
      if (showToasts && errorToast) {
        // Extract error message with explicit type safety
        let errorMessage = 'An error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          // Use type assertion for 'message' property
          const errorObj = error as { message?: string };
          if (errorObj.message) {
            errorMessage = String(errorObj.message);
          }
        }
            
        toast({
          title: errorToast.title || 'Error',
          description: errorToast.description || errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  return mutation;
}

/**
 * A hook for optimistic updates on related entities (like a list of items belonging to a parent)
 * This simplifies operations on nested collections
 */
export function useOptimisticRelatedEntities<
  TPath extends Path,
  TMutationPath extends Path,
  TItem,
  TInput = unknown
>(options: {
  // Path to the query that will be optimistically updated
  queryPath: TPath;
  
  // Path to the mutation that will be executed
  mutationPath: TMutationPath;
  
  // The parent entity ID (e.g., organization ID for members)
  parentId: string;
  
  // Parameter name for the parent ID in the query
  parentIdParamName?: string;
  
  // Function to get an item ID - not directly used but needed for type
  getItemId?: (item: TItem) => string;
  
  // Function to check if the input refers to a specific item
  matchesItem: (item: TItem, input: TInput) => boolean;
  
  // Functions to update/add/remove items in the list
  updateItem: (item: TItem, input: TInput) => TItem;
  createItem?: (input: TInput) => TItem;
  
  // Toast configuration
  successToast?: {
    title?: string;
    description: string;
  };
  errorToast?: {
    title?: string;
    description?: string;
  };
  showToasts?: boolean;
}) {
  const {
    queryPath,
    mutationPath,
    parentId,
    parentIdParamName = 'id',
    matchesItem,
    updateItem,
    createItem,
    successToast,
    errorToast,
    showToasts = true,
  } = options;
  
  // Create query input with the parent ID
  const queryInput = { [parentIdParamName]: parentId } as unknown;
  
  // Define update function for the list of related entities
  const updateFn = (oldData: unknown, mutationInput: TInput) => {
    if (!oldData || !Array.isArray(oldData)) {
      // If we're adding a new item and there's no existing list
      if (createItem && Array.isArray(oldData)) {
        return [...oldData, createItem(mutationInput)];
      }
      return oldData;
    }
    
    // Try to find the matching item to update
    const itemIndex = oldData.findIndex(item => matchesItem(item, mutationInput));
    
    // If item exists, update it
    if (itemIndex !== -1) {
      const updatedList = [...oldData];
      updatedList[itemIndex] = updateItem(oldData[itemIndex], mutationInput);
      return updatedList;
    }
    
    // If item doesn't exist and we have a createItem function, add it
    if (createItem) {
      return [...oldData, createItem(mutationInput)];
    }
    
    // Otherwise, return the original list
    return oldData;
  };
  
  // Create the mutation
  const mutation = useOptimisticMutation({
    queryPath,
    mutationPath,
    queryInput,
    updateFn,
    
    onSuccess: () => {
      if (showToasts && successToast) {
        toast({
          title: successToast.title || 'Success',
          description: successToast.description,
        });
      }
    },
    
    onError: (error) => {
      if (showToasts && errorToast) {
        // Extract error message with explicit type safety
        let errorMessage = 'An error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          // Use type assertion for 'message' property
          const errorObj = error as { message?: string };
          if (errorObj.message) {
            errorMessage = String(errorObj.message);
          }
        }
            
        toast({
          title: errorToast.title || 'Error',
          description: errorToast.description || errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  return mutation;
} 