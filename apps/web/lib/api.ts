import { initClient } from '@ts-rest/core';
import { systemContract } from '@agent-git/contracts';

// Typed API client bound to the shared contract — no codegen, fully inferred.
// Use inside TanStack Query, e.g.:
//   useQuery({ queryKey: ['system'], queryFn: () => api.info() })
// See docs/conventions/api-and-versioning.md ("Consuming the API from the frontend").
export const api = initClient(systemContract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  baseHeaders: {},
});
