// User Domain Tests
import { describe, it } from 'vitest';
describe('UserService invariants', () => {
  it('should enforce single global role', () => {
    /* ... */
  });
  it('should enforce email uniqueness', () => {
    /* ... */
  });
  it('should enforce explicit lifecycle transitions', () => {
    /* ... */
  });
  it('should invalidate context on role change', () => {
    /* ... */
  });
  // ...edge cases, forbidden states, error typing
});
