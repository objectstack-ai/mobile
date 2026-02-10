/**
 * ObjectStack Development Server
 *
 * Minimal test server following the ObjectStack Authentication Guide.
 * Uses in-memory driver so no external database is required.
 *
 * Usage:
 *   pnpm server:dev          # Start the dev server on port 3000
 *   pnpm server:test         # Run the auth flow smoke test
 *
 * @see https://protocol.objectstack.ai/docs/guides/authentication
 */

import { ObjectKernel } from "@objectstack/core";
import { ObjectQL } from "@objectstack/objectql";
import { InMemoryDriver } from "@objectstack/driver-memory";
import { HonoServerPlugin } from "@objectstack/plugin-hono-server";
import { AuthPlugin } from "@objectstack/plugin-auth";

const PORT = Number(process.env.PORT) || 3000;
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "dev-secret-please-change-in-production-min-32-chars";

async function main() {
  console.log("🚀 Starting ObjectStack dev server…\n");

  // 1. Data layer — in-memory, zero config
  const objectql = new ObjectQL();
  await objectql.registerDriver(new InMemoryDriver());

  // 2. Microkernel
  const kernel = new ObjectKernel();
  kernel.registerService("data", objectql);

  // 3. HTTP adapter (Hono)
  await kernel.use(
    new HonoServerPlugin({
      port: PORT,
    })
  );

  // 4. Authentication plugin (better-auth)
  await kernel.use(
    new AuthPlugin({
      secret: AUTH_SECRET,
      baseUrl: `http://localhost:${PORT}`,
    })
  );

  // 5. Boot
  await kernel.bootstrap();

  console.log("✅ Server started successfully!\n");
  console.log("📍 Authentication Endpoints:");
  console.log(
    `   POST http://localhost:${PORT}/api/v1/auth/sign-up/email`
  );
  console.log(
    `   POST http://localhost:${PORT}/api/v1/auth/sign-in/email`
  );
  console.log(
    `   POST http://localhost:${PORT}/api/v1/auth/sign-out`
  );
  console.log(
    `   GET  http://localhost:${PORT}/api/v1/auth/get-session`
  );
  console.log(
    `\n💡 Point the mobile app at http://localhost:${PORT}\n`
  );

  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down…");
    await kernel.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
