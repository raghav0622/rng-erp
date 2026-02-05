import { AppAuthError } from '@/rng-platform';

export const handleMutationError = (
  error: unknown,
  setExternalErrors: (errors: string[]) => void,
  customHandlers?: Record<string, string | string[]>,
) => {
  const appError = error as AppAuthError;
  const customMsg = customHandlers?.[appError.code];
  const msg = typeof customMsg === 'string' ? [customMsg] : customMsg;
  setExternalErrors(msg || [appError.message]);
};

export const clearErrorsOnMount = (setExternalErrors: (errors: string[]) => void) => {
  setExternalErrors([]);
};
