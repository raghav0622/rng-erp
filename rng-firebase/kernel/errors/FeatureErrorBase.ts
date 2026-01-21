import { KernelErrorBase } from './KernelErrorBase';

export class FeatureErrorBase extends KernelErrorBase {
  constructor(message: string, code = 'FEATURE_ERROR') {
    super(message, code);
    Object.setPrototypeOf(this, FeatureErrorBase.prototype);
  }
}
