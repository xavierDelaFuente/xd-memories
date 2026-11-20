// Next.js calls register once as a server starts, before it serves a request.
export async function register() {
  // The checks read process.env, which the edge runtime only partly has; every route here is Node.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertProductionConfig } = await import('./lib/production-config');
  assertProductionConfig(process.env);
}
