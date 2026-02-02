# UserDirectoryScreen - Pagination Implementation

## Overview

Updated UserDirectoryScreen to use cursor-based pagination as provided by the abstract repository contract, instead of in-memory client-side pagination.

## Key Changes

### **Pagination Architecture**

#### Before (Incorrect)

```tsx
// In-memory slicing - loads all users then slices
const { data: users = [] } = useListUsers();
const paginatedUsers = users.slice(0, pageSize);
```

#### After (Correct)

```tsx
// Cursor-based pagination via abstract repo
const { data: paginatedResult = { data: [], nextPageToken: undefined } } = useListUsersPaginated(
  pageSize,
  currentPageToken,
);

const users = paginatedResult.data;
const hasNextPage = !!paginatedResult.nextPageToken;
```

### **Cursor-Based Navigation**

Uses a token stack to maintain pagination history:

```tsx
// Pagination state
const [pageTokens, setPageTokens] = useState<string[]>(['']);
const currentPageIndex = pageTokens.length - 1;
const currentPageToken = pageTokens[currentPageIndex];

// Next page: push new token
const handleNextPage = () => {
  if (hasNextPage && paginatedResult.nextPageToken) {
    setPageTokens([...pageTokens, paginatedResult.nextPageToken]);
  }
};

// Previous page: pop token
const handlePreviousPage = () => {
  if (currentPageIndex > 0) {
    setPageTokens(pageTokens.slice(0, -1));
  }
};
```

### **Pagination Contract (ListUsersPaginatedResult)**

```typescript
interface ListUsersPaginatedResult {
  data: AppUser[]; // Current page of users
  nextPageToken?: string; // Cursor for next page (undefined if last page)
}
```

### **Hook Usage**

```typescript
// Signature
useListUsersPaginated(pageSize: number, pageToken?: string)

// Returns
{
  data: { data: AppUser[], nextPageToken?: string },
  isLoading: boolean,
  error?: Error
}
```

## Benefits

✅ **Server-Side Pagination**: Respects repository's pagination limits
✅ **Cursor-Based**: Efficient pagination without offset
✅ **Memory Efficient**: Only loads current page of results
✅ **Contract Compliance**: Follows abstract repository API exactly
✅ **History Support**: Can navigate back to previous pages

## Features Preserved

- ✅ Client-side sorting on current page
- ✅ Client-side filtering on current page
- ✅ Search by name/email
- ✅ Role/status/invite filters
- ✅ Action toolbar per user
- ✅ Owner-only access guard

## UI Changes

### Pagination Controls

**Before**: "Load More" button increasing page size
**After**: Previous/Next buttons with page number indicator

```tsx
<Button onClick={handlePreviousPage} disabled={currentPageIndex === 0}>
  Previous
</Button>

<Text>Page {currentPageIndex + 1}</Text>

<Button onClick={handleNextPage} disabled={!hasNextPage}>
  Next
</Button>
```

## Technical Notes

1. **Token Stack**: Maintains history for back navigation
2. **Page Size**: Default 20, can be configured per instantiation
3. **Sorting/Filtering**: Applied client-side on server-provided page
4. **Refresh**: Refetch current page without changing position
5. **Reset**: Clears filters and returns to first page

## Compliance

✅ Uses `useListUsersPaginated` hook from frozen v1 auth hooks
✅ Respects `ListUsersPaginatedResult` contract
✅ Follows abstract repository cursor-based pagination pattern
✅ Zero breaking changes to screen props or behavior
