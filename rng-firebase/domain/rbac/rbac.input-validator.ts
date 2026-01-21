// RBACInputValidator for kernel RBAC service
// Ensures feature/action registry checks are performed before pure RBAC evaluation
import { RBACForbiddenError } from './rbac.errors';
import { RBACDenialReason } from './rbac.reasons';
import type { RBACInput } from './rbac.types';

export class RBACInputValidator {
  constructor(
    private readonly featureRegistry: { feature: string; actions: readonly string[] }[],
  ) {}

  /**
   * Validates feature and action existence. Throws on unknowns.
   */
  validate(input: RBACInput): void {
    const featureDef = this.featureRegistry.find((f) => f.feature === input.feature);
    if (!featureDef) {
      throw new RBACForbiddenError(RBACDenialReason.FEATURE_UNKNOWN, 'Feature does not exist');
    }
    if (!featureDef.actions.includes(input.action)) {
      throw new RBACForbiddenError(
        RBACDenialReason.ACTION_UNKNOWN,
        'Action does not exist for feature',
      );
    }
  }
}
