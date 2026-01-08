// useReadTeams: returns all teams

import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
// import { teamRepo } from '...'; // Replace with actual team repository import

// Fetches all teams from the repository
export function useReadTeams() {
  const ctx = useResolvedExecutionContext();
  // Replace with actual repository call
  // return useQuery(['teams'], () => teamRepo.find({}));
  return { teams: [] };
}
