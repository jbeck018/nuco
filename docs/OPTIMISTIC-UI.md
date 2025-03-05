# Optimistic UI Updates

This document explains the optimistic UI update pattern implemented in the Nuco-App to provide immediate feedback for user actions.

## Overview

Optimistic UI updates create a more responsive user experience by immediately updating the UI based on the expected result of an action, rather than waiting for the server to respond. If the action fails, we can roll back to the previous state.

## Implementation

We've created a set of reusable hooks that standardize and simplify the implementation of optimistic updates throughout the application:

1. **useOptimisticMutation**: A base hook that provides the core functionality for optimistic updates with tRPC and TanStack Query.
2. **useOptimisticEntity**: A specialized hook for updating a single entity optimistically.
3. **useOptimisticRelatedEntities**: A specialized hook for updating collections of related entities.
4. **useOptimisticForm**: A hook that combines React Hook Form with optimistic mutations.
5. **useTRPCForm**: A specialized hook that integrates tRPC mutations with React Hook Form.

## Usage Examples

### Basic Optimistic Mutation

```tsx
// Basic example using the core hook
const mutation = useOptimisticMutation({
  queryPath: 'user.me',
  mutationPath: 'user.updateProfile',
  queryInput: undefined, // No parameters for 'me' query
  updateFn: (oldData, newData) => ({
    ...oldData,
    ...newData,
  }),
  onSuccess: (data) => {
    console.log('Profile updated successfully', data);
  },
  onError: (error) => {
    console.error('Error updating profile', error);
  },
});

// Use the mutation
mutation.mutate({ name: 'New Name' });
```

### Optimistic Entity Update

```tsx
// Using the specialized entity hook
const { updateOrganization, isUpdating } = useOptimisticEntity({
  queryPath: 'organization.getById',
  mutationPath: 'organization.update',
  entityId: '123',
  successToast: {
    description: 'Organization updated successfully',
  },
});

// Use the mutation
updateOrganization({ name: 'New Org Name' });
```

### Optimistic List Operations

```tsx
// Using the specialized related entities hook
const { inviteMember, isInviting } = useOptimisticRelatedEntities({
  queryPath: 'organization.getMembers',
  mutationPath: 'organization.inviteMember',
  parentId: orgId,
  getItemId: (item) => item.id,
  matchesItem: (item, input) => item.email === input.email,
  updateItem: (item, input) => ({ ...item, role: input.role }),
  createItem: (input) => ({
    id: `temp-${Date.now()}`,
    email: input.email,
    role: input.role,
    status: 'pending',
  }),
});

// Use the mutation
inviteMember({ email: 'new@example.com', role: 'member' });
```

### Form with Optimistic Updates

```tsx
// Using the form hook
const form = useTRPCForm(
  trpc.organization.update.useMutation(),
  {
    defaultValues: {
      name: 'Current Name',
      website: 'https://example.com',
    },
    validationSchema: formSchema,
    transformValues: (values) => ({
      id: '123',
      ...values,
    }),
    successToast: {
      description: 'Settings updated successfully',
    },
  }
);

// In your component
<form onSubmit={form.handleSubmit}>
  {/* Form fields */}
  <Button type="submit" disabled={form.isSubmitting}>
    Save Changes
  </Button>
</form>
```

## Best Practices

1. **Always handle errors**: Ensure that your optimistic updates handle error cases gracefully by rolling back to the previous state.

2. **Keep it simple**: Only update what's necessary in the `updateFn`. Don't try to simulate complex server-side logic.

3. **Use temporary IDs**: When adding new items to a list, assign temporary IDs until the server responds with real ones.

4. **Use toast notifications**: Provide clear feedback about the success or failure of an operation.

5. **Invalidate queries after mutations**: After a mutation completes successfully, invalidate related queries to ensure fresh data.

## Advanced Techniques

### Handling Race Conditions

When multiple mutations might happen in quick succession, use the `onMutate` callback to cancel any pending queries to prevent them from overwriting your optimistic update:

```tsx
onMutate: async (newData) => {
  // Cancel pending refetches
  await queryClient.cancelQueries(['myQuery', id]);
  
  // Save previous value
  const previousData = queryClient.getQueryData(['myQuery', id]);
  
  // Optimistically update
  queryClient.setQueryData(['myQuery', id], newData);
  
  // Return previous data for rollback
  return { previousData };
},
```

### Consistent Rollbacks

Always return the previous state from `onMutate` and use it in `onError` to ensure consistent rollbacks:

```tsx
onError: (err, newData, context) => {
  // Revert to previous state if available
  if (context?.previousData) {
    queryClient.setQueryData(['myQuery', id], context.previousData);
  }
},
```

## Debugging Tips

1. **Monitor the cache**: Use React DevTools to monitor the TanStack Query cache and see how optimistic updates affect it.

2. **Log state transitions**: Add logging to `onMutate`, `onSuccess`, and `onError` to track the flow of your optimistic updates.

3. **Test failure scenarios**: Deliberately introduce errors to ensure your rollback logic works correctly.

4. **Check network timing**: Use browser DevTools to ensure that optimistic updates happen before the network request completes.

## Performance Considerations

Optimistic UI updates should be fast and lightweight to provide a good user experience. Some tips:

1. **Keep optimistic updates minimal**: Only update the necessary parts of the UI.

2. **Avoid complex calculations**: Keep the `updateFn` simple and efficient.

3. **Use memoization**: Memoize expensive calculations to prevent unnecessary re-renders.

4. **Batch updates**: If multiple related updates need to happen, batch them together to minimize re-renders.

## Conclusion

By implementing optimistic UI updates, we've significantly improved the perceived performance of our application, creating a more responsive and user-friendly experience. These patterns are now used throughout the application for all data mutations. 