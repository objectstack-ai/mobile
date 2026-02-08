/**
 * MSW server setup for integration tests.
 *
 * Import and start this server in beforeAll/afterAll of integration test suites.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
