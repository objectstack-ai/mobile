/**
 * Tests for lib/server-probe — every probe outcome, against bodies shaped like
 * the platform's real answers:
 *
 * - discovery: `{ success: true, data: { name, version, routes, … } }`
 * - runtime config: bare `{ branding: { productName, logoUrl, brandColor }, … }`
 * - auth config: `{ success: true, data: { emailPassword, socialProviders, features } }`
 */
import {
  AUTH_CONFIG_PATH,
  DISCOVERY_PATH,
  RUNTIME_CONFIG_PATH,
  displayName,
  probeServer,
  serverInitial,
  xhrFetch,
  type ProbeFetch,
  type ProbeRequestInit,
  type ProbeResponse,
} from "~/lib/server-probe";

const SERVER = "https://erp.example.com";

const DISCOVERY = {
  success: true,
  data: {
    name: "ObjectOS",
    version: "17.4.0",
    environment: "production",
    routes: { data: "/api/v1/data", metadata: "/api/v1/meta" },
    capabilities: {},
  },
};

const RUNTIME_CONFIG = {
  cloudUrl: "",
  singleEnvironment: true,
  features: {},
  branding: {
    productName: "Acme ERP",
    productShortName: "Acme",
    logoUrl: "https://cdn.example.com/acme.png",
    brandColor: "#0F766E",
  },
  telemetry: {},
};

const AUTH_CONFIG = {
  success: true,
  data: {
    emailPassword: { enabled: true, disableSignUp: false },
    socialProviders: [
      { id: "github", name: "GitHub", enabled: true, type: "social" },
      { id: "okta", name: "Okta", enabled: true, type: "oidc" },
    ],
    features: { twoFactor: false, sso: true, ssoEnforced: false },
  },
};

type Reply = { status?: number; body?: unknown; url?: string } | Error | "hang";

function response(url: string, reply: { status?: number; body?: unknown; url?: string }) {
  const status = reply.status ?? 200;
  const text = typeof reply.body === "string" ? reply.body : JSON.stringify(reply.body ?? {});
  return {
    ok: status >= 200 && status < 300,
    status,
    url: reply.url ?? url,
    text: async () => text,
  } satisfies ProbeResponse;
}

/** A transport answering by path suffix; unknown paths answer 404. */
function fakeFetch(routes: Record<string, Reply>): jest.Mock & ProbeFetch {
  return jest.fn((url: string, init: ProbeRequestInit) => {
    const key = Object.keys(routes).find((path) => url.endsWith(path));
    const reply: Reply = key ? routes[key] : { status: 404, body: "Not Found" };
    if (reply === "hang") {
      return new Promise<ProbeResponse>((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("Aborted")));
      });
    }
    if (reply instanceof Error) return Promise.reject(reply);
    return Promise.resolve(response(url, reply));
  }) as jest.Mock & ProbeFetch;
}

const objectOS = (overrides: Record<string, Reply> = {}) =>
  fakeFetch({
    [DISCOVERY_PATH]: { body: DISCOVERY },
    [RUNTIME_CONFIG_PATH]: { body: RUNTIME_CONFIG },
    [AUTH_CONFIG_PATH]: { body: AUTH_CONFIG },
    ...overrides,
  });

describe("probeServer", () => {
  it("identifies an ObjectOS server with branding and sign-in methods", async () => {
    const fetch = objectOS();
    const result = await probeServer("erp.example.com", { fetch });

    expect(result).toEqual({
      kind: "ok",
      server: {
        serverUrl: SERVER,
        secure: true,
        platformName: "ObjectOS",
        version: "17.4.0",
        productName: "Acme ERP",
        logoUrl: "https://cdn.example.com/acme.png",
        brandColor: "#0F766E",
        signIn: { emailPassword: true, sso: true, ssoEnforced: false, providers: ["GitHub", "Okta"] },
      },
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      `${SERVER}/.well-known/objectstack`,
      `${SERVER}/api/v1/runtime/config`,
      `${SERVER}/api/v1/auth/config`,
    ]);
  });

  it("probes anonymously — no cookies, JSON accepted", async () => {
    const fetch = objectOS();
    await probeServer(SERVER, { fetch });
    for (const [, init] of fetch.mock.calls) {
      expect(init).toMatchObject({
        method: "GET",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
    }
  });

  it("calls a 200 HTML page not an ObjectOS server", async () => {
    const fetch = fakeFetch({ [DISCOVERY_PATH]: { body: "<!doctype html><title>Hi</title>" } });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "not-objectos" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("calls 200 JSON that is not ObjectOS discovery not an ObjectOS server", async () => {
    for (const body of [
      { name: "ObjectOS", version: "1" },
      { success: true, data: { name: "Other", version: "1" } },
      { success: false, data: DISCOVERY.data },
    ]) {
      const fetch = fakeFetch({ [DISCOVERY_PATH]: { body } });
      await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "not-objectos" });
    }
  });

  it("calls a 404 not an ObjectOS server", async () => {
    const fetch = fakeFetch({});
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "not-objectos" });
  });

  it("reports a 5xx discovery answer as a server error with its status", async () => {
    const fetch = fakeFetch({ [DISCOVERY_PATH]: { status: 503, body: "busy" } });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({
      kind: "server-error",
      status: 503,
    });
  });

  it("times out a server that never answers", async () => {
    const fetch = fakeFetch({ [DISCOVERY_PATH]: "hang" });
    await expect(probeServer(SERVER, { fetch, timeoutMs: 20 })).resolves.toEqual({
      kind: "timeout",
    });
  });

  it.each([
    // iOS NSURLErrorServerCertificateUntrusted
    "The certificate for this server is invalid. You might be connecting to a server that is pretending to be “erp.example.com”.",
    // iOS NSURLErrorSecureConnectionFailed
    "An SSL error has occurred and a secure connection to the server cannot be made.",
    // Android OkHttp, self-signed / private CA
    "java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.",
    "javax.net.ssl.SSLHandshakeException: Chain validation failed",
    // Android OkHttp, wrong host on the certificate
    "Hostname erp.example.com not verified",
  ])("reports a TLS failure: %s", async (message) => {
    const fetch = fakeFetch({ [DISCOVERY_PATH]: new Error(message) });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "tls" });
  });

  it.each([
    "Network request failed",
    "The Internet connection appears to be offline.",
    "A server with the specified hostname could not be found.",
    "Unable to resolve host \"erp.example.com\": No address associated with hostname",
    "Failed to connect to erp.example.com/10.0.0.5:443",
  ])("reports an unreachable server: %s", async (message) => {
    const fetch = fakeFetch({ [DISCOVERY_PATH]: new Error(message) });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "unreachable" });
  });

  it("adopts the origin discovery was redirected to", async () => {
    const fetch = objectOS({
      [DISCOVERY_PATH]: { body: DISCOVERY, url: "https://www.erp.example.com/.well-known/objectstack" },
    });
    const result = await probeServer(SERVER, { fetch });
    expect(result.kind === "ok" && result.server.serverUrl).toBe("https://www.erp.example.com");
    expect(fetch.mock.calls.slice(1).map(([url]) => url)).toEqual([
      "https://www.erp.example.com/api/v1/runtime/config",
      "https://www.erp.example.com/api/v1/auth/config",
    ]);
  });

  it("keeps the typed server when a redirect changes the path (a login page)", async () => {
    const fetch = fakeFetch({
      [DISCOVERY_PATH]: { body: "<html>Sign in</html>", url: "https://sso.example.com/login" },
    });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "not-objectos" });
  });

  it("refuses a redirect to plain http on a public host", async () => {
    const fetch = objectOS({
      [DISCOVERY_PATH]: { body: DISCOVERY, url: "http://erp.example.com/.well-known/objectstack" },
    });
    await expect(probeServer(SERVER, { fetch })).resolves.toEqual({ kind: "insecure-http" });
  });

  it("refuses typed plain http on a public host without probing", async () => {
    const fetch = objectOS();
    await expect(probeServer("http://erp.example.com", { fetch })).resolves.toEqual({
      kind: "insecure-http",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows plain http to a local host, without the lock", async () => {
    const fetch = objectOS();
    const result = await probeServer("http://192.168.1.20:3000", { fetch });
    expect(result.kind === "ok" && result.server).toMatchObject({
      serverUrl: "http://192.168.1.20:3000",
      secure: false,
    });
  });

  it("refuses empty and invalid input without probing", async () => {
    const fetch = objectOS();
    await expect(probeServer("  ", { fetch })).resolves.toEqual({ kind: "empty" });
    await expect(probeServer("ftp://x", { fetch })).resolves.toEqual({ kind: "invalid" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("probes the server part of a pasted Console link", async () => {
    const fetch = objectOS();
    const result = await probeServer(`${SERVER}/_console/apps/crm`, { fetch });
    expect(result.kind === "ok" && result.server.serverUrl).toBe(SERVER);
  });

  describe("partial answers", () => {
    it("discovery OK but branding missing → no name, logo or colour (initial on default colour)", async () => {
      const fetch = objectOS({ [RUNTIME_CONFIG_PATH]: { status: 404, body: "Not Found" } });
      const result = await probeServer(SERVER, { fetch });
      if (result.kind !== "ok") throw new Error(result.kind);
      expect(result.server).toMatchObject({ productName: null, logoUrl: null, brandColor: null });
      expect(displayName(result.server)).toBe("ObjectOS");
      expect(serverInitial(result.server)).toBe("O");
    });

    it("branding endpoint failing at transport level is still a success", async () => {
      const fetch = objectOS({ [RUNTIME_CONFIG_PATH]: new Error("Network request failed") });
      const result = await probeServer(SERVER, { fetch });
      expect(result.kind).toBe("ok");
    });

    it("auth config missing → sign-in methods unknown", async () => {
      const fetch = objectOS({ [AUTH_CONFIG_PATH]: { status: 500, body: "{}" } });
      const result = await probeServer(SERVER, { fetch });
      expect(result.kind === "ok" && result.server.signIn).toBeNull();
    });

    it("drops a brand colour that is not a hex colour", async () => {
      const fetch = objectOS({
        [RUNTIME_CONFIG_PATH]: { body: { branding: { brandColor: "teal" } } },
      });
      const result = await probeServer(SERVER, { fetch });
      expect(result.kind === "ok" && result.server.brandColor).toBeNull();
    });

    it("resolves a root-relative logo against the server origin and drops other relative forms", async () => {
      const relative = objectOS({
        [RUNTIME_CONFIG_PATH]: { body: { branding: { logoUrl: "/assets/logo.png" } } },
      });
      const a = await probeServer(SERVER, { fetch: relative });
      expect(a.kind === "ok" && a.server.logoUrl).toBe(`${SERVER}/assets/logo.png`);

      const bare = objectOS({
        [RUNTIME_CONFIG_PATH]: { body: { branding: { logoUrl: "logo.png" } } },
      });
      const b = await probeServer(SERVER, { fetch: bare });
      expect(b.kind === "ok" && b.server.logoUrl).toBeNull();
    });
  });

  describe("sign-in methods", () => {
    it("SSO-only mode hides the password form", async () => {
      const fetch = objectOS({
        [AUTH_CONFIG_PATH]: {
          body: {
            success: true,
            data: {
              emailPassword: { enabled: true },
              socialProviders: [],
              features: { sso: false, ssoEnforced: true },
            },
          },
        },
      });
      const result = await probeServer(SERVER, { fetch });
      expect(result.kind === "ok" && result.server.signIn).toEqual({
        emailPassword: false,
        sso: true,
        ssoEnforced: true,
        providers: [],
      });
    });

    it("skips disabled providers", async () => {
      const fetch = objectOS({
        [AUTH_CONFIG_PATH]: {
          body: {
            success: true,
            data: {
              emailPassword: { enabled: false },
              socialProviders: [
                { id: "google", name: "Google", enabled: false },
                { id: "gitlab", name: "GitLab", enabled: true },
              ],
              features: {},
            },
          },
        },
      });
      const result = await probeServer(SERVER, { fetch });
      expect(result.kind === "ok" && result.server.signIn).toEqual({
        emailPassword: false,
        sso: false,
        ssoEnforced: false,
        providers: ["GitLab"],
      });
    });
  });
});

describe("serverInitial", () => {
  it("takes the first character of a non-Latin name", () => {
    const server = {
      serverUrl: SERVER,
      secure: true,
      platformName: "ObjectOS",
      version: "1",
      productName: "云端 ERP",
      logoUrl: null,
      brandColor: null,
      signIn: null,
    };
    expect(serverInitial(server)).toBe("云");
  });
});

/** A minimal stand-in for React Native's XMLHttpRequest. */
class FakeXhr {
  static last: FakeXhr;
  status = 0;
  responseText = "";
  responseURL = "";
  withCredentials = true;
  headers: Record<string, string> = {};
  method = "";
  url = "";
  aborted = false;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send() {}
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

describe("xhrFetch", () => {
  const realXhr = globalThis.XMLHttpRequest;
  beforeEach(() => {
    (globalThis as any).XMLHttpRequest = FakeXhr;
  });
  afterEach(() => {
    globalThis.XMLHttpRequest = realXhr;
  });

  const init = (signal = new AbortController().signal): ProbeRequestInit => ({
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
    signal,
  });

  it("sends no credentials and resolves with status, final URL and body", async () => {
    const pending = xhrFetch(`${SERVER}/.well-known/objectstack`, init());
    const xhr = FakeXhr.last;
    expect(xhr.withCredentials).toBe(false);
    expect(xhr.headers).toEqual({ Accept: "application/json" });
    xhr.status = 200;
    xhr.responseText = '{"ok":1}';
    xhr.responseURL = "https://www.erp.example.com/.well-known/objectstack";
    xhr.onload?.();
    const res = await pending;
    expect(res).toMatchObject({
      ok: true,
      status: 200,
      url: "https://www.erp.example.com/.well-known/objectstack",
    });
    await expect(res.text()).resolves.toBe('{"ok":1}');
  });

  it("rejects with the native error text, so a TLS failure stays recognisable", async () => {
    const pending = xhrFetch(SERVER, init());
    FakeXhr.last.responseText = "javax.net.ssl.SSLHandshakeException: Chain validation failed";
    FakeXhr.last.onerror?.();
    await expect(pending).rejects.toThrow("SSLHandshakeException");
  });

  it("aborts the request when the signal fires", async () => {
    const controller = new AbortController();
    const pending = xhrFetch(SERVER, init(controller.signal));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeXhr.last.aborted).toBe(true);
  });
});
