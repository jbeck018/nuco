/**
 * useOptimisticForm.ts
 * 
 * A hook for handling forms with optimistic updates.
 * Combines React Hook Form with our optimistic mutations.
 */
import { useForm, UseFormProps, FieldValues, UseFormReturn, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { UseTRPCMutationResult } from '@trpc/react-query/shared';
import { toast } from '@/components/ui/use-toast';
import { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@/lib/trpc/router';

/**
 * Options for optimistic form hook
 */
interface UseOptimisticFormOptions<
  TFormValues extends FieldValues,
  TInput,
  TOutput
> {
  // Form configuration
  defaultValues: UseFormProps<TFormValues>['defaultValues'];
  validationSchema?: z.ZodSchema<TFormValues>;
  
  // Submit configuration
  onSubmit: (values: TFormValues) => Promise<TOutput>;
  
  // Optional transformation function to convert form values to mutation input
  transformValues?: (values: TFormValues) => TInput;
  
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
  
  // Optional callbacks
  onSuccess?: (data: TOutput, values: TFormValues) => void;
  onError?: (error: Error, values: TFormValues) => void;
}

// Extend UseFormReturn with our additional properties
export interface OptimisticFormReturn<TFormValues extends FieldValues> extends UseFormReturn<TFormValues> {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: Error | null;
}

/**
 * A hook for handling forms with optimistic updates
 */
export function useOptimisticForm<
  TFormValues extends FieldValues,
  TInput = TFormValues,
  TOutput = unknown
>(
  options: UseOptimisticFormOptions<TFormValues, TInput, TOutput>
): OptimisticFormReturn<TFormValues> {
  const {
    defaultValues,
    validationSchema,
    onSubmit,
    successToast = { title: 'Success', description: 'Form submitted successfully' },
    errorToast = { title: 'Error', description: 'An error occurred' },
    showToasts = true,
    onSuccess,
    onError,
  } = options;
  
  // Create a properly typed resolver
  const resolver: Resolver<TFormValues> | undefined = validationSchema 
    ? zodResolver(validationSchema) 
    : undefined;
  
  // Set up form with React Hook Form
  const form = useForm<TFormValues>({
    defaultValues,
    resolver,
    mode: 'onChange',
  });
  
  // State for tracking submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Create a custom submit function
  const customSubmit = async (values: TFormValues) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Call the submit function (typically a mutation)
      const result = await onSubmit(values);
      
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Show success toast if enabled
      if (showToasts) {
        toast({
          title: successToast.title,
          description: successToast.description,
          variant: 'default',
        });
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result, values);
      }
      
      return result;
    } catch (err) {
      setIsSubmitting(false);
      setIsSuccess(false);
      
      const caughtError = err as Error;
      setError(caughtError);
      
      // Show error toast if enabled
      if (showToasts && errorToast) {
        toast({
          title: errorToast.title || 'Error',
          description: caughtError.message || errorToast.description,
          variant: 'destructive',
        });
      }
      
      // Call error callback if provided
      if (onError) {
        onError(caughtError, values);
      }
      
      throw caughtError;
    }
  };
  
  // Override the handleSubmit function to use our custom submit
  const originalHandleSubmit = form.handleSubmit;
  form.handleSubmit = ((onValid) => {
    return originalHandleSubmit((data) => {
      // First call the user's submit handler
      const result = onValid(data);
      
      // Then call our custom submit function
      if (result instanceof Promise) {
        return result.then(() => customSubmit(data));
      }
      
      // If the handler isn't async, just call our submit
      return customSubmit(data);
    });
  }) as typeof form.handleSubmit;
  
  return {
    ...form,
    isSubmitting,
    isSuccess,
    error,
  };
}

// Extend UseFormReturn with tRPC-specific properties
export interface TRPCFormReturn<TFormValues extends FieldValues, TError> extends UseFormReturn<TFormValues> {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: TError | null;
}

/**
 * A hook that combines tRPC mutation with React Hook Form
 * for optimistic updates
 */
export function useTRPCForm<
  TFormValues extends FieldValues,
  TData,
  TError extends TRPCClientErrorLike<AppRouter>,
  TInput,
  TContext
>(
  mutation: UseTRPCMutationResult<TData, TError, TInput, TContext>,
  options: {
    defaultValues: UseFormProps<TFormValues>['defaultValues'];
    validationSchema?: z.ZodSchema<TFormValues>;
    transformValues?: (values: TFormValues) => TInput;
    onSuccess?: (data: TData, values: TFormValues) => void;
    successToast?: {
      title?: string;
      description: string;
    };
    showToasts?: boolean;
  }
): TRPCFormReturn<TFormValues, TError> {
  const {
    defaultValues,
    validationSchema,
    transformValues,
    onSuccess,
    successToast = { title: 'Success', description: 'Operation completed successfully' },
    showToasts = true,
  } = options;
  
  // Create a properly typed resolver
  const resolver: Resolver<TFormValues> | undefined = validationSchema 
    ? zodResolver(validationSchema) 
    : undefined;
  
  // Set up form with React Hook Form
  const form = useForm<TFormValues>({
    defaultValues,
    resolver,
    mode: 'onChange',
  });
  
  // Create a custom submit function
  const customSubmit = async (values: TFormValues) => {
    try {
      // Transform values if needed
      const inputData = transformValues ? 
        transformValues(values) : 
        values as unknown as TInput;
      
      // Trigger the mutation
      const result = await mutation.mutateAsync(inputData);
      
      // Show success toast if enabled
      if (showToasts) {
        toast({
          title: successToast.title,
          description: successToast.description,
          variant: 'default',
        });
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result, values);
      }
      
      return result;
    } catch (err) {
      // Error handling is done in the mutation itself
      throw err;
    }
  };
  
  // Override the handleSubmit function to use our custom submit
  const originalHandleSubmit = form.handleSubmit;
  form.handleSubmit = ((onValid) => {
    return originalHandleSubmit((data) => {
      // First call the user's submit handler
      const result = onValid(data);
      
      // Then call our custom submit function
      if (result instanceof Promise) {
        return result.then(() => customSubmit(data));
      }
      
      // If the handler isn't async, just call our submit
      return customSubmit(data);
    });
  }) as typeof form.handleSubmit;
  
  return {
    ...form,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
} 