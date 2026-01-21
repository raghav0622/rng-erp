import { KernelErrorBase } from './KernelErrorBase';

export class InfraErrorBase extends KernelErrorBase {
  constructor(message: string, code = 'INFRA_ERROR') {
    super(message, code);
    Object.setPrototypeOf(this, InfraErrorBase.prototype);
  }
}
