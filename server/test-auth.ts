/**
 * Smoke-test for the ObjectStack dev server authentication flow.
 *
 * Requires the dev server to be running (`pnpm server:dev`).
 *
 * @see https://protocol.objectstack.ai/docs/guides/authentication
 */

import { ObjectStackClient } from "@objectstack/client";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function testAuthFlow() {
  console.log("🧪 Testing Authentication Flow\n");

  const client = new ObjectStackClient({ baseUrl: BASE_URL });

  // 1. Register
  console.log("📝 Registering new user…");
  const reg = await client.auth.register({
    email: "test@example.com",
    password: "SecurePassword123!",
    name: "Test User",
  });

  if (reg.data?.user) {
    console.log("   ✅ Registered:", reg.data.user.email);
  }

  // 2. Logout
  console.log("🚪 Logging out…");
  await client.auth.logout();
  console.log("   ✅ Logged out");

  // 3. Login
  console.log("🔐 Logging in…");
  const login = await client.auth.login({
    type: "email",
    email: "test@example.com",
    password: "SecurePassword123!",
  });

  if (login.data?.user) {
    console.log("   ✅ Logged in:", login.data.user.email);
  }

  // 4. Session
  console.log("👤 Getting session…");
  const session = await client.auth.me();

  if (session.data?.user) {
    console.log("   ✅ Session user:", session.data.user.email);
  }

  console.log("\n✨ All authentication tests passed!\n");
}

testAuthFlow().catch((err) => {
  console.error("\n❌ Auth test failed:", err.message);
  console.error("💡 Make sure the server is running: pnpm server:dev\n");
  process.exit(1);
});
