import {
  consoleUrl,
  normalizeRoute,
  normalizeServerUrl,
  originOf,
  parseUrl,
  routeFromConsoleUrl,
  routePath,
  safeConsoleRoute,
  serverUrlAfterRedirect,
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

  it("drops the scheme's default port, and only that", () => {
    expect(originOf("https://acme.example.com:443/_console")).toBe("https://acme.example.com");
    expect(originOf("http://acme.example.com:80/")).toBe("http://acme.example.com");
    expect(originOf("http://acme.example.com:443/")).toBe("http://acme.example.com:443");
    expect(originOf("https://acme.example.com:8443/")).toBe("https://acme.example.com:8443");
    expect(parseUrl("HTTPS://Acme.Example.com:443/a")?.host).toBe("acme.example.com");
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

  it("drops the default port, as WebViews report URLs without it", () => {
    expect(normalizeServerUrl("https://acme.example.com:443/")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com",
    });
    expect(normalizeServerUrl("http://localhost:80")).toEqual({
      ok: true,
      serverUrl: "http://localhost",
    });
    expect(normalizeServerUrl("https://acme.example.com:8443")).toEqual({
      ok: true,
      serverUrl: "https://acme.example.com:8443",
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

  it("matches a server written with its default port", () => {
    expect(
      routeFromConsoleUrl("https://acme.example.com:443", "https://acme.example.com/_console/home")
    ).toBe("/home");
  });

  it("returns null for a URL whose path escapes the Console", () => {
    const s = "https://acme.example.com";
    expect(routeFromConsoleUrl(s, `${s}/_console/../api/v1/me`)).toBeNull();
    expect(routeFromConsoleUrl(s, `${s}/_console/%2e%2e/api/v1/me`)).toBeNull();
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

describe("safeConsoleRoute", () => {
  it("accepts plain Console paths, with query and fragment", () => {
    expect(safeConsoleRoute("/apps/crm/opportunity/123")).toBe("/apps/crm/opportunity/123");
    expect(safeConsoleRoute("  /home  ")).toBe("/home");
    expect(safeConsoleRoute("/apps/crm?view=all&q=a%20b#top")).toBe(
      "/apps/crm?view=all&q=a%20b#top"
    );
    expect(safeConsoleRoute("/files/report.v2.pdf")).toBe("/files/report.v2.pdf");
    expect(safeConsoleRoute("/a/...")).toBe("/a/...");
    expect(safeConsoleRoute("/search/%E4%B8%AD%E6%96%87")).toBe("/search/%E4%B8%AD%E6%96%87");
    // Dots in the query are not path.
    expect(safeConsoleRoute("/home?next=../../api")).toBe("/home?next=../../api");
  });

  it("refuses non-paths and protocol-relative routes", () => {
    expect(safeConsoleRoute(null)).toBeNull();
    expect(safeConsoleRoute(5)).toBeNull();
    expect(safeConsoleRoute("")).toBeNull();
    expect(safeConsoleRoute("apps/crm")).toBeNull();
    expect(safeConsoleRoute("https://evil.example/x")).toBeNull();
    expect(safeConsoleRoute("//evil.example/x")).toBeNull();
  });

  it("refuses raw dot segments", () => {
    expect(safeConsoleRoute("/../../api/v1/me")).toBeNull();
    expect(safeConsoleRoute("/apps/../../api")).toBeNull();
    expect(safeConsoleRoute("/./api")).toBeNull();
    expect(safeConsoleRoute("/apps/..")).toBeNull();
    expect(safeConsoleRoute("/apps/..?x=1")).toBeNull();
    expect(safeConsoleRoute("/apps/..#x")).toBeNull();
  });

  it("refuses percent-encoded dot segments in any case", () => {
    expect(safeConsoleRoute("/%2e%2e/api/v1/me")).toBeNull();
    expect(safeConsoleRoute("/%2E%2E/api/v1/me")).toBeNull();
    expect(safeConsoleRoute("/.%2e/api")).toBeNull();
    expect(safeConsoleRoute("/%2e./api")).toBeNull();
    expect(safeConsoleRoute("/%2e/api")).toBeNull();
    // Double-encoded, for servers that decode twice.
    expect(safeConsoleRoute("/%252e%252e/api")).toBeNull();
  });

  it("refuses encoded separators that would form a dot segment server-side", () => {
    expect(safeConsoleRoute("/..%2f..%2fapi")).toBeNull();
    expect(safeConsoleRoute("/..%2F..%2Fapi")).toBeNull();
    expect(safeConsoleRoute("/..%5c..%5capi")).toBeNull();
  });

  it("refuses backslashes", () => {
    expect(safeConsoleRoute("/\\evil.example/x")).toBeNull();
    expect(safeConsoleRoute("/..\\..\\api")).toBeNull();
    expect(safeConsoleRoute("\\\\evil.example")).toBeNull();
  });

  it("refuses control characters, raw or encoded", () => {
    expect(safeConsoleRoute("/.\t./api")).toBeNull();
    expect(safeConsoleRoute("/apps\ncrm")).toBeNull();
    expect(safeConsoleRoute("/apps\u0000")).toBeNull();
    expect(safeConsoleRoute("/home?x=\ry")).toBeNull();
    expect(safeConsoleRoute("/.%09./api")).toBeNull();
    expect(safeConsoleRoute("/apps%00")).toBeNull();
  });

  it("refuses malformed percent-encoding", () => {
    expect(safeConsoleRoute("/apps/%E0%A4%A")).toBeNull();
    expect(safeConsoleRoute("/apps/100%")).toBeNull();
  });
});

describe("consoleUrl never leaves the Console", () => {
  const server = "https://acme.example.com";
  it.each([
    "/../../api/v1/me",
    "../../api/v1/me",
    "/%2e%2e/api/v1/me",
    "/%2E%2e/%2e%2E/api",
    "/..\\..\\api",
    "//evil.example/x",
    "/.\t./api",
  ])("falls back to the default route for %p", (route) => {
    expect(consoleUrl(server, route)).toBe(`${server}/_console/home`);
  });
});

describe("serverUrlAfterRedirect", () => {
  const health = (base: string) => `${base}/api/v1/health`;

  it("keeps the server when the probe was not redirected", () => {
    const s = "https://acme.example.com";
    expect(serverUrlAfterRedirect(s, health(s), health(s))).toBe(s);
    expect(serverUrlAfterRedirect(s, health(s), undefined)).toBe(s);
    expect(serverUrlAfterRedirect(s, health(s), "")).toBe(s);
  });

  it("adopts an apex → www redirect", () => {
    const s = "https://acme.example.com";
    expect(serverUrlAfterRedirect(s, health(s), "https://www.acme.example.com/api/v1/health")).toBe(
      "https://www.acme.example.com"
    );
  });

  it("adopts an http → https redirect, keeping a sub-path mount", () => {
    const s = "http://192.168.1.20/os";
    expect(serverUrlAfterRedirect(s, health(s), "https://192.168.1.20/os/api/v1/health")).toBe(
      "https://192.168.1.20/os"
    );
  });

  it("adopts a redirect of the plain connectivity probe", () => {
    const s = "https://acme.example.com";
    expect(serverUrlAfterRedirect(s, s, "https://www.acme.example.com/")).toBe(
      "https://www.acme.example.com"
    );
  });

  it("ignores a redirect to another path (login page, landing page)", () => {
    const s = "https://acme.example.com";
    expect(serverUrlAfterRedirect(s, health(s), "https://sso.example.com/login")).toBe(s);
    expect(serverUrlAfterRedirect(s, s, "https://www.acme.example.com/welcome")).toBe(s);
  });

  it("does not adopt a downgrade to plain http on a public host", () => {
    const s = "https://acme.example.com";
    expect(serverUrlAfterRedirect(s, health(s), "http://acme.example.com/api/v1/health")).toBe(s);
    expect(
      serverUrlAfterRedirect(s, health(s), "http://acme.example.com/api/v1/health", {
        allowInsecure: true,
      })
    ).toBe("http://acme.example.com");
  });
});
