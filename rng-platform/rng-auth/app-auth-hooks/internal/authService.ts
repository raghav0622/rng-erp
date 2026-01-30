/**
 * Internal service access point for dependency control.
 *
 * CRITICAL: All hooks MUST import appAuthService from here, not directly from
 * app-auth-service/app-auth.service. This enables:
 *
 * 1. **Testing**: Mock appAuthService in tests by overriding this module
 * 2. **Future overrides**: Replace service implementation without touching all hooks
 * 3. **Single point of control**: Changes to service access pattern are local
 *
 * Zero abstraction — pure re-export of singleton. Do not add logic here.
 *
 * @private For app-auth-hooks internal use only
 */

export { appAuthService } from '../../app-auth-service/app-auth.service';
