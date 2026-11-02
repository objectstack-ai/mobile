import { addBreadcrumb } from "@sentry/react-native";
import { EMPTY_CONNECTIONS, addConnection, type Connection } from "~/lib/connections/model";
import {
  removeAndSignOut,
  type ConsoleRemovalAnswer,
  type SignOutDeps,
} from "~/lib/connections/sign-out";

const ACME: Connection = addConnection(
  EMPTY_CONNECTIONS,
  {
    kind: "cloud",
    label: "Acme",
    serverUrl: "https://acme.objectos.ai",
    brandColor: "#4f46e5",
    initial: "A",
  },
  1
).list[0];

function setup(answer: ConsoleRemovalAnswer = "unregistered") {
  const steps: string[] = [];
  let remaining = ["https://acme.objectos.ai", "https://erp.example.com"];
  const deps: SignOutDeps = {
    askConsole: jest.fn(async () => {
      steps.push("askConsole");
      return answer;
    }),
    remove: jest.fn(async (host: string) => {
      steps.push(`remove ${host}`);
      remaining = remaining.filter((u) => !u.includes(host));
    }),
    remaining: () => remaining,
    clearCookies: jest.fn(async () => {
      steps.push("clearCookies");
      return { kind: "cleared" as const, cleared: 1, kept: 0 };
    }),
  };
  return { deps, steps };
}

describe("removeAndSignOut", () => {
  it("current connection: asks its Console first, then removes it, then clears its cookies", async () => {
    const { deps, steps } = setup("unregistered");
    const outcome = await removeAndSignOut(ACME, true, deps);

    expect(steps).toEqual(["askConsole", "remove acme.objectos.ai", "clearCookies"]);
    expect(deps.remove).toHaveBeenCalledWith("acme.objectos.ai", { pushLeftRegistered: false });
    // The remaining connections are read after the removal.
    expect(deps.clearCookies).toHaveBeenCalledWith("https://acme.objectos.ai", [
      "https://erp.example.com",
    ]);
    expect(outcome).toEqual({
      host: "acme.objectos.ai",
      consoleAnswer: "unregistered",
      pushToken: "unregistered",
      cookies: { kind: "cleared", cleared: 1, kept: 0 },
    });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "connections", message: "connection removed" })
    );
  });

  it.each<ConsoleRemovalAnswer>(["failed", "not-handled", "not-loaded", "no-answer"])(
    "records the push token as left registered when the Console answers %s",
    async (answer) => {
      const { deps } = setup(answer);
      const outcome = await removeAndSignOut(ACME, true, deps);
      expect(outcome.pushToken).toBe("left-registered");
      expect(deps.remove).toHaveBeenCalledWith("acme.objectos.ai", { pushLeftRegistered: true });
      expect(deps.clearCookies).toHaveBeenCalled();
    }
  );

  it("another connection: its Console is not loaded, so it is not asked and its token is left registered", async () => {
    const { deps, steps } = setup();
    const outcome = await removeAndSignOut(ACME, false, deps);
    expect(deps.askConsole).not.toHaveBeenCalled();
    expect(steps).toEqual(["remove acme.objectos.ai", "clearCookies"]);
    expect(outcome).toMatchObject({ consoleAnswer: "not-loaded", pushToken: "left-registered" });
  });
});
