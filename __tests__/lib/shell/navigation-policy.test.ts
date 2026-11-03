import {
  decideNavigation,
  decideTopFrameLoad,
  isSignInSurface,
  type NavigationContext,
} from "~/lib/shell/navigation-policy";

const ctx: NavigationContext = {
  serverUrl: "https://acme.example.com",
  rules: [{ pattern: "/approvals/*", owner: "native", screen: "approvals" }],
  availableScreens: new Set(["approvals"]),
  trustedHosts: ["login.acme-idp.example"],
};

describe("decideNavigation", () => {
  it("loads Console routes on the configured server", () => {
    expect(decideNavigation("https://acme.example.com/_console/apps/crm", ctx)).toEqual({
      kind: "load",
    });
  });

  it("treats the default port as the same origin", () => {
    // WebViews report URLs without the default port; a server stored with it
    // must still own its Console instead of sending it to the system browser.
    const withPort = { ...ctx, serverUrl: "https://acme.example.com:443" };
    expect(decideNavigation("https://acme.example.com/_console/apps/crm", withPort)).toEqual({
      kind: "load",
    });
    expect(decideNavigation("https://acme.example.com:443/_console/approvals/1", ctx)).toEqual({
      kind: "native",
      screen: "approvals",
      route: "/approvals/1",
    });
  });

  it("loads non-Console paths on the server (auth callbacks, files)", () => {
    expect(decideNavigation("https://acme.example.com/api/v1/auth/callback/x", ctx)).toEqual({
      kind: "load",
    });
  });

  it("hands natively-owned routes to the native screen", () => {
    expect(decideNavigation("https://acme.example.com/_console/approvals/9?x=1", ctx)).toEqual({
      kind: "native",
      screen: "approvals",
      route: "/approvals/9?x=1",
    });
  });

  it("loads trusted hosts in the WebView", () => {
    expect(decideNavigation("https://login.acme-idp.example/authorize", ctx)).toEqual({
      kind: "load",
    });
  });

  it("sends other sites to the system browser", () => {
    expect(decideNavigation("https://docs.example.org/page", ctx)).toEqual({
      kind: "external",
      url: "https://docs.example.org/page",
    });
  });

  it("treats a different scheme on the same host as another site", () => {
    expect(decideNavigation("http://acme.example.com/_console/home", ctx).kind).toBe("external");
  });

  it("loads cross-origin sub-frames", () => {
    expect(
      decideNavigation("https://maps.example.org/embed", { ...ctx, isTopFrame: false })
    ).toEqual({ kind: "load" });
  });

  it("hands mailto/tel/app schemes to the OS from the top frame only", () => {
    expect(decideNavigation("mailto:a@b.co", ctx)).toEqual({
      kind: "external",
      url: "mailto:a@b.co",
    });
    expect(decideNavigation("tel:+123", ctx).kind).toBe("external");
    expect(decideNavigation("weixin://dl/business", ctx).kind).toBe("external");
    expect(decideNavigation("tel:+123", { ...ctx, isTopFrame: false })).toEqual({ kind: "block" });
  });

  it("blocks dangerous schemes", () => {
    expect(decideNavigation("javascript:alert(1)", ctx)).toEqual({ kind: "block" });
    expect(decideNavigation("file:///etc/passwd", ctx)).toEqual({ kind: "block" });
    expect(decideNavigation("intent://x#Intent;end", ctx)).toEqual({ kind: "block" });
    expect(decideNavigation("data:text/html,<b>x</b>", ctx)).toEqual({ kind: "block" });
    expect(decideNavigation("not a url", ctx)).toEqual({ kind: "block" });
  });

  it("allows about:, blob: and sub-frame data:", () => {
    expect(decideNavigation("about:blank", ctx)).toEqual({ kind: "load" });
    expect(decideNavigation("blob:https://acme.example.com/abc", ctx)).toEqual({ kind: "load" });
    expect(decideNavigation("data:image/png;base64,AA", { ...ctx, isTopFrame: false })).toEqual({
      kind: "load",
    });
  });
});

describe("decideTopFrameLoad", () => {
  it("keeps the server's own pages, a route a native screen owns included", () => {
    expect(decideTopFrameLoad("https://acme.example.com/_console/apps/crm", ctx)).toEqual({
      kind: "stay",
    });
    expect(decideTopFrameLoad("https://acme.example.com/_console/approvals/9", ctx)).toEqual({
      kind: "stay",
    });
    expect(decideTopFrameLoad("https://acme.example.com/api/v1/auth/callback/x", ctx)).toEqual({
      kind: "stay",
    });
    expect(decideTopFrameLoad("https://acme.example.com:443/_console/home", ctx)).toEqual({
      kind: "stay",
    });
  });

  it("keeps what the policy loads in the top frame: trusted hosts, about:, blob:", () => {
    expect(decideTopFrameLoad("https://login.acme-idp.example/authorize", ctx)).toEqual({
      kind: "stay",
    });
    expect(decideTopFrameLoad("about:blank", ctx)).toEqual({ kind: "stay" });
    expect(decideTopFrameLoad("blob:https://acme.example.com/abc", ctx)).toEqual({ kind: "stay" });
  });

  it("stops any other page, to open it where the policy sends it", () => {
    expect(decideTopFrameLoad("https://docs.example.org/page", ctx)).toEqual({
      kind: "stop",
      open: "https://docs.example.org/page",
    });
    expect(decideTopFrameLoad("http://acme.example.com/_console/home", ctx)).toEqual({
      kind: "stop",
      open: "http://acme.example.com/_console/home",
    });
  });

  it("stops a page the policy blocks, opening nothing", () => {
    expect(decideTopFrameLoad("data:text/html,<b>x</b>", ctx)).toEqual({
      kind: "stop",
      open: null,
    });
    expect(decideTopFrameLoad("file:///etc/passwd", ctx)).toEqual({ kind: "stop", open: null });
    expect(decideTopFrameLoad("not a url", ctx)).toEqual({ kind: "stop", open: null });
  });

  it("judges every load as the top frame's, whatever the context says", () => {
    expect(
      decideTopFrameLoad("https://maps.example.org/embed", { ...ctx, isTopFrame: false })
    ).toEqual({ kind: "stop", open: "https://maps.example.org/embed" });
  });
});

describe("isSignInSurface", () => {
  const server = "https://acme.example.com";

  it("is the Console's /login route, with any query", () => {
    expect(isSignInSurface(server, `${server}/_console/login`)).toBe(true);
    expect(isSignInSurface(server, `${server}/_console/login/`)).toBe(true);
    expect(isSignInSurface(server, `${server}/_console/login?redirect=%2Fhome#x`)).toBe(true);
    expect(isSignInSurface(server, "https://acme.example.com:443/_console/login")).toBe(true);
  });

  it("is a path under the auth API", () => {
    expect(isSignInSurface(server, `${server}/api/v1/auth/sign-in/social?provider=corp`)).toBe(
      true
    );
    expect(isSignInSurface(server, `${server}/api/v1/auth/oauth2/authorize`)).toBe(true);
  });

  it("is nothing else on the server", () => {
    for (const path of [
      "/_console/home",
      "/_console/login-help",
      "/_console/login/extra",
      "/_console/apps/login",
      "/login",
      "/api/v1/auth",
      "/api/v1/authz/x",
      "/api/v1/data/account",
      "/api/v1/auth/%2e%2e/data",
    ]) {
      expect(isSignInSurface(server, `${server}${path}`)).toBe(false);
    }
  });

  it("is on the server's own origin only", () => {
    expect(isSignInSurface(server, "https://evil.example/_console/login")).toBe(false);
    expect(isSignInSurface(server, "http://acme.example.com/_console/login")).toBe(false);
    expect(isSignInSurface(server, "https://acme.example.com:8443/_console/login")).toBe(false);
    expect(isSignInSurface(server, "not a url")).toBe(false);
  });

  it("is under the server's base path", () => {
    const based = "https://acme.example.com/erp";
    expect(isSignInSurface(based, `${based}/_console/login`)).toBe(true);
    expect(isSignInSurface(based, `${based}/api/v1/auth/sign-in/sso`)).toBe(true);
    expect(isSignInSurface(based, "https://acme.example.com/_console/login")).toBe(false);
    expect(isSignInSurface(based, "https://acme.example.com/api/v1/auth/sign-in/sso")).toBe(false);
  });
});
