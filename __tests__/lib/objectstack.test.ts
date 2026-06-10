/**
 * Tests for objectstack — client factory
 */
import { ObjectStackClient } from "@objectstack/client";
import {
  createObjectStackClient,
  getObjectStackClient,
  setObjectStackApiUrl,
} from "~/lib/objectstack";

describe("createObjectStackClient", () => {
  it("creates a client with token", () => {
    createObjectStackClient("test-token");
    expect(ObjectStackClient).toHaveBeenCalledWith(
      expect.objectContaining({ token: "test-token" }),
    );
  });

  it("creates a client without token", () => {
    createObjectStackClient();
    expect(ObjectStackClient).toHaveBeenCalledWith(
      expect.objectContaining({ token: undefined }),
    );
  });
});

describe("getObjectStackClient", () => {
  // Guards against the split-brain bug a frozen module-level singleton caused:
  // it must always build against the *currently-configured* URL so a server
  // switch can't leave a client talking to the old host.
  it("always builds against the current API URL after a server switch", () => {
    setObjectStackApiUrl("https://server-a.example");
    getObjectStackClient();
    expect(ObjectStackClient).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl: "https://server-a.example" }),
    );

    setObjectStackApiUrl("https://server-b.example");
    getObjectStackClient();
    expect(ObjectStackClient).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl: "https://server-b.example" }),
    );
  });
});
