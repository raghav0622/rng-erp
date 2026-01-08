// User type is not available in this abstraction layer; use a minimal placeholder.
export interface User {
  id: string;
  email?: string;
}

export interface ExecutionContext {
  user: User | null;
  role: string | null;
  teamId?: string;
  isAssigned?: boolean;
}
