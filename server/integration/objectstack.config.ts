import { defineStack } from "@objectstack/spec";
import * as objects from "./src/objects";

/**
 * Integration test stack for the ObjectStack Mobile client.
 *
 * Replaces the former `server/hotcrm` git submodule. Started via the
 * ObjectStack CLI (`objectstack serve` / `start`) with an in-memory driver and
 * the auth plugin, it provides just enough surface (auth + a couple of CRM
 * objects) for `__tests__/integration/server/*` to exercise the real REST API.
 */
export default defineStack({
  manifest: {
    id: "com.objectstack.mobile.integration",
    namespace: "crm",
    version: "0.1.0",
    type: "app",
    name: "Mobile Integration Stack",
    description: "Minimal CRM stack for ObjectStack Mobile server integration tests",
  },

  objects: Object.values(objects),
});
