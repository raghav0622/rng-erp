import { FeatureErrorBase } from '../../kernel/errors/FeatureErrorBase';

export class FeatureExecutionError extends FeatureErrorBase {
  readonly feature: string;
  readonly action: string;
  constructor(message: string, feature: string, action: string) {
    super(message, 'FEATURE_EXECUTION_ERROR');
    this.feature = feature;
    this.action = action;
    Object.setPrototypeOf(this, FeatureExecutionError.prototype);
  }
}
