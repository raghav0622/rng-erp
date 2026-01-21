import { KernelErrorBase } from './KernelErrorBase';

export class AssignmentErrorBase extends KernelErrorBase {
  constructor(message: string, code = 'ASSIGNMENT_ERROR') {
    super(message, code);
    Object.setPrototypeOf(this, AssignmentErrorBase.prototype);
  }
}
