import { signOut, revokeSession, listSessions, getCurrentUser } from "~/lib/session-manager";

/* Mock auth-client */
jest.mock("~/lib/auth-client", () => ({
  authClient: {
    signOut: jest.fn().mockResolvedValue(undefined),
    listSessions: jest.fn().mockResolvedValue({
      data: [
        {
          id: "sess-1",
          userEmail: "user@example.com",
          userAgent: "iPhone 15",
          isCurrent: true,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "sess-2",
          userEmail: "user@example.com",
          userAgent: "iPad Pro",
          isCurrent: false,
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    }),
    revokeSession: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("session-manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("returns user data from client.auth.me()", async () => {
      const fakeClient = {
        auth: {
          me: jest.fn().mockResolvedValue({
            id: "u1",
            email: "user@example.com",
            name: "Test User",
          }),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await getCurrentUser(fakeClient as any);
      expect(user).toEqual({
        id: "u1",
        email: "user@example.com",
        name: "Test User",
      });
    });

    it("returns null when auth.me() throws", async () => {
      const fakeClient = {
        auth: {
          me: jest.fn().mockRejectedValue(new Error("unauthenticated")),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await getCurrentUser(fakeClient as any);
      expect(user).toBeNull();
    });
  });

  describe("listSessions", () => {
    it("returns mapped session list", async () => {
      const sessions = await listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toMatchObject({
        id: "sess-1",
        isCurrent: true,
        deviceName: "iPhone 15",
      });
      expect(sessions[1]).toMatchObject({
        id: "sess-2",
        isCurrent: false,
      });
    });
  });

  describe("signOut", () => {
    it("calls authClient.signOut", async () => {
      await signOut();
      const { authClient } = require("~/lib/auth-client");
      expect(authClient.signOut).toHaveBeenCalled();
    });
  });

  describe("revokeSession", () => {
    it("calls authClient.revokeSession with session id", async () => {
      const result = await revokeSession("sess-2");
      expect(result).toBe(true);
      const { authClient } = require("~/lib/auth-client");
      expect(authClient.revokeSession).toHaveBeenCalledWith({ id: "sess-2" });
    });
  });
});
