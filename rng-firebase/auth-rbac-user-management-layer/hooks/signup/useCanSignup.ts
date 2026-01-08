// useCanSignup: returns { allowed, reason }

// import { userRepo } from '...'; // Replace with actual user repository import

// Returns { allowed, reason } for signup (owner or invite)
export function useCanSignup() {
  // Invariant: signup allowed if no users exist (owner bootstrap) or valid invite present
  // This is a placeholder; replace with actual repository instance and invite logic
  // const userCount = await userRepo.count();
  // if (userCount === 0) return { allowed: true, reason: 'Owner bootstrap allowed' };
  // else if (validInvite) return { allowed: true, reason: 'Invite accepted' };
  // else return { allowed: false, reason: 'Signup not allowed' };

  // For now, always disallow (replace with real logic)
  return { allowed: false, reason: 'Signup not allowed (stub)' };
}
