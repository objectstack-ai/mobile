import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';
import { AutomationServicePlugin } from '@objectstack/service-automation';
import { ApprovalsServicePlugin } from '@objectstack/plugin-approvals';
import { AuthPlugin } from '@objectstack/plugin-auth';
import * as objects from './src/objects';

// `@types/node` isn't in this package's tsconfig; the server runs under Node,
// so `process` exists at runtime. Minimal ambient declaration for the config.
declare const process: { env: Record<string, string | undefined> };

const stack: ObjectStackDefinition = defineStack({
  manifest: {
    id: 'com.example.server',
    namespace: 'server',
    version: '0.1.0',
    type: 'app',
    name: 'Server',
    description: 'Server application built with ObjectStack',
  },

  objects: Object.values(objects),

  // Enable the automation engine so flows can be triggered + leave a run log
  // (exposes /api/v1/automation/{name}/trigger and /runs). The plugin seeds the
  // built-in node executors itself (ADR-0018).
  plugins: [
    // Email/password auth mounted at /api/v1/auth (better-auth via ObjectQL).
    // Identity tables (sys_user/sys_session) live in the project's own
    // datasource. `OS_AUTH_SECRET` should be set in real deploys.
    new AuthPlugin({
      secret: process.env.OS_AUTH_SECRET ?? 'dev-only-secret-change-me-0123456789abcdef',
      emailAndPassword: { enabled: true },
      manifestDatasource: 'default',
      trustedOrigins: ['http://localhost:8081', 'http://localhost:3100'],
    }),
    new AutomationServicePlugin(),
    new ApprovalsServicePlugin(),
  ],
});

export default stack;
