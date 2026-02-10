/**
 * Tests for objectstack — client factory
 */
import { ObjectStackClient } from "@objectstack/client";
import { createObjectStackClient, objectStackClient } from "~/lib/objectstack";

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

describe("objectStackClient", () => {
  it("is defined", () => {
    expect(objectStackClient).toBeDefined();
  });
});
