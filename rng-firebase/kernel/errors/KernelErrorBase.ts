// Base error for all kernel errors
export class KernelErrorBase extends Error {
  readonly code: string;
  constructor(message: string, code = 'KERNEL_ERROR') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, KernelErrorBase.prototype);
  }
}
