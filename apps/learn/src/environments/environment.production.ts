export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  // aiEnabled is intentionally omitted here. The `environment.ts` re-export
  // delegates to environment.local.ts whose sync-env.ts script now defaults
  // aiEnabled=true. To turn off AI in prod, set AI_ENABLED=false in the env
  // before running `pnpm sync-env`.
  aiEnabled: true,
};
