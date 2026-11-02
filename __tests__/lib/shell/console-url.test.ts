import {
  consoleUrl,
  normalizeRoute,
  normalizeServerUrl,
  originOf,
  parseUrl,
  routeFromConsoleUrl,
  routePath,
} from "~/lib/shell/console-url";

describe("parseUrl / originOf", () => {
  it("parses scheme, host, path and rest", () => {
    expect(parseUrl("HTTPS://Acme.Example.com:8443/a/b?x=1#y")).toEqual({
      scheme: "https",
      host: "acme.example.com:8443",
      path: "/a/b",
      rest: "?x=1#y",
    });
  });

  it("defaults an empty path to /", () => {
    expect(parseUrl("https://acme.example.com")?.path).toBe("/");
  });

  it("returns null for non-URLs", () => {
    expect(parseUrl("acme.example.com")).toBeNull();
    expect(originOf("mailto:a@b.c")).toBeNull();
  });

  it("derives the origin", () => {
    expect(originOf("https://acme.example.com/_console/home")).toBe("https://acme.example.com");
  });
});

describe("normalizeServerUrl", () => {
  it("adds https to a bare host", () => {
    expect(normalizeServerUrl("acme.example.com")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com",
    });
  });

  it("drops trailing slashes, query and case", () => {
    expect(normalizeServerUrl("  HTTPS://Acme.Example.com/// ")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com",
    });
  });

  it("keeps a sub-path mount", () => {
    expect(normalizeServerUrl("https://acme.example.com/os/")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com/os",
    });
  });

  it("accepts a pasted Console link", () => {
    expect(normalizeServerUrl("https://acme.example.com/_console/apps/crm?x=1")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com",
    });
  });

  it("does not cut at a path that merely starts like the Console mount", () => {
    expect(normalizeServerUrl("https://acme.example.com/_consoles")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com/_consoles",
    });
  });

  it("rejects empty and malformed input", () => {
    expect(normalizeServerUrl("   ")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeServerUrl("ftp://acme.example.com")).toEqual({ ok: false, reason: "invalid" });
    expect(normalizeServerUrl("https://acme example.com")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("refuses plain http for public hosts", () => {
    expect(normalizeServerUrl("http://acme.example.com")).toEqual({
      ok: false,
      reason: "insecure",
    });
  });

  it("allows plain http for local hosts or when allowed", () => {
    expect(normalizeServerUrl("http://localhost:3000").ok).toBe(true);
    expect(normalizeServerUrl("http://192.168.1.20:3000").ok).toBe(true);
    expect(normalizeServerUrl("http://acme.example.com", { allowInsecure: true }).ok).toBe(true);
  });
});

describe("routes", () => {
  it("normalizes routes", () => {
    expect(normalizeRoute(undefined)).toBe("/home");
    expect(normalizeRoute("/")).toBe("/home");
    expect(normalizeRoute("apps/crm")).toBe("/apps/crm");
  });

  it("builds Console URLs", () => {
    expect(consoleUrl("https://acme.example.com")).toBe("https://acme.example.com/_console/home");
    expect(consoleUrl("https://acme.example.com/os", "/apps/crm")).toBe(
      "https://acme.example.com/os/_console/apps/crm"
    );
  });

  it("maps a Console URL back to its route", () => {
    expect(
      routeFromConsoleUrl(
        "https://acme.example.com",
        "https://acme.example.com/_console/apps/crm?a=1#b"
      )
    ).toBe("/apps/crm?a=1#b");
    expect(
      routeFromConsoleUrl("https://acme.example.com", "https://acme.example.com/_console")
    ).toBe("/");
    expect(
      routeFromConsoleUrl(
        "https://acme.example.com/os",
        "https://acme.example.com/os/_console/home"
      )
    ).toBe("/home");
  });

  it("returns null outside the Console", () => {
    const s = "https://acme.example.com";
    expect(routeFromConsoleUrl(s, "https://acme.example.com/api/v1/auth/callback")).toBeNull();
    expect(routeFromConsoleUrl(s, "https://acme.example.com/_consoles/x")).toBeNull();
    expect(routeFromConsoleUrl(s, "https://other.example.com/_console/home")).toBeNull();
    expect(routeFromConsoleUrl(s, "http://acme.example.com/_console/home")).toBeNull();
  });

  it("strips query and fragment from a route", () => {
    expect(routePath("/a/b?x=1#y")).toBe("/a/b");
    expect(routePath("/a")).toBe("/a");
  });
});
