// useReadProfile: returns user profile

import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
// import { userRepo } from '...'; // Replace with actual user repository import

// Fetches the current user's profile from the repository
export function useReadProfile() {
  const ctx = useResolvedExecutionContext();
  // Replace with actual repository call
  // return useQuery(['userProfile', ctx.user.uid], () => userRepo.getById(ctx.user.uid));
  return { user: ctx.user };
}
