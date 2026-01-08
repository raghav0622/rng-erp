import { defineQueryFeature } from '../../../feature-execution-engine/src/feature-query-dsl';
import { useFeatureQuery } from '../../../feature-execution-engine/src/useFeatureQuery';
import { userRepository } from '../../UserRepository';
import { writeAuditEvent } from '../../shared/audit-log';

const readProfileFeature = defineQueryFeature({
  name: 'ReadProfile',
  feature: 'user',
  action: 'read',
  permissions: true,
  query: async (ctx) => {
    const user = await userRepository.getById(ctx.user.id);
    writeAuditEvent({
      type: 'profile_read',
      userId: ctx.user.id,
      timestamp: ctx.now,
    });
    return user;
  },
});

export function useReadProfile() {
  return useFeatureQuery(readProfileFeature);
}
