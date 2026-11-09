import { functionBaseUrl } from '@neon/env';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The browser cannot read Neon's branch variables, so the `api` Function URL is
// resolved here at build time. Set VITE_API_URL to point at a different backend.
function apiUrl(env: Record<string, string>) {
  if (env.VITE_API_URL) return env.VITE_API_URL;
  const { NEON_BRANCH_ID, NEON_FUNCTION_HOST_SUFFIX } = env;
  if (!NEON_BRANCH_ID || !NEON_FUNCTION_HOST_SUFFIX) return '';
  return functionBaseUrl('api', { NEON_BRANCH_ID, NEON_FUNCTION_HOST_SUFFIX });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl(env)) },
  };
});
