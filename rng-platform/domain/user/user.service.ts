// User Domain Service Interface
export interface UserService {
  createUser(params: { email: string; displayName: string; role: string }): Promise<void>;
  assignRole(userId: string, role: string): Promise<void>;
  transitionLifecycle(userId: string, to: string): Promise<void>;
  getUser(userId: string): Promise<import('./user.contract').User>;
}
