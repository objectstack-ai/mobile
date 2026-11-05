import { createHash } from "node:crypto";
import {
  base64Url,
  buildRedeemScript,
  challengeFromBase64Digest,
  HANDOFF_APP_SCHEME,
  HANDOFF_CALLBACK_URL,
  HANDOFF_FAILED_ERROR,
  isHandoffCallback,
  probeHandoffOffered,
  runSystemSignIn,
  signInEntryUrl,
  tokenFromCallback,
  type SystemSignInDeps,
} from "~/lib/shell/system-sign-in";
import appConfig from "../../../app.config";

const SERVER = "https://acme.example.com";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const sha256Base64 = async (value: string) =>
  createHash("sha256").update(value, "ascii").digest("base64");

describe("PKCE", () => {
  it("computes RFC 7636 appendix B's S256 challenge", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(challengeFromBase64Digest(await sha256Base64(verifier))).toBe(CHALLENGE);
  });

  it("encodes RFC 7636 appendix B's verifier bytes", () => {
    const bytes = Uint8Array.from([
      116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77,
      105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
    ]);
    expect(base64Url(bytes)).toBe("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
  });

  it("leaves no padding on lengths that are not a multiple of three", () => {
    expect(base64Url(Uint8Array.from([255]))).toBe("_w");
    expect(base64Url(Uint8Array.from([255, 255]))).toBe("__8");
  });
});

describe("the scheme", () => {
  it("is one the server's TrustedAppSchemeSchema accepts: lowercase reverse-domain, no suffix", () => {
    expect(HANDOFF_APP_SCHEME).toMatch(/^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/);
    expect(HANDOFF_CALLBACK_URL).toBe("ai.objectos.mobile://auth/callback");
  });

  it("is registered with the OS, next to the app-link scheme", () => {
    const { scheme } = appConfig({ config: {} } as never);
    expect(scheme).toEqual(["objectos", HANDOFF_APP_SCHEME]);
  });
});

describe("signInEntryUrl", () => {
  function redirectOf(url: string | null): string | null {
    return new URL(url!).searchParams.get("redirect");
  }

  it("opens the Console's sign-in page, going to the hand-off afterwards", () => {
    const entry = signInEntryUrl(SERVER, CHALLENGE);
    expect(entry!.startsWith(`${SERVER}/_console/login?redirect=`)).toBe(true);
    expect(redirectOf(entry)).toBe(
      "/api/v1/auth/one-time-token/handoff?redirect_uri=ai.objectos.mobile%3A%2F%2Fauth%2Fcallback" +
        `&code_challenge=${CHALLENGE}&code_challenge_method=S256`
    );
  });

  it("keeps a server's base path", () => {
    const entry = signInEntryUrl(`${SERVER}/erp`, CHALLENGE);
    expect(entry!.startsWith(`${SERVER}/erp/_console/login?`)).toBe(true);
    expect(redirectOf(entry)!.startsWith("/erp/api/v1/auth/one-time-token/handoff?")).toBe(true);
  });

  it("carries only the challenge, never a verifier", () => {
    expect(new URL(signInEntryUrl(SERVER, CHALLENGE)!).search).not.toContain("verifier");
  });
});

describe("tokenFromCallback", () => {
  it("reads the token of the one shape the hand-off answers", () => {
    expect(tokenFromCallback(`${HANDOFF_CALLBACK_URL}?token=aZ09-_`)).toBe("aZ09-_");
  });

  it.each([
    ["another scheme", "objectos://auth/callback?token=abc"],
    ["another host", "ai.objectos.mobile://open/callback?token=abc"],
    ["another path", "ai.objectos.mobile://auth/other?token=abc"],
    ["no token", HANDOFF_CALLBACK_URL],
    ["an empty token", `${HANDOFF_CALLBACK_URL}?token=`],
    ["a repeated token", `${HANDOFF_CALLBACK_URL}?token=a&token=b`],
    ["an extra parameter", `${HANDOFF_CALLBACK_URL}?token=a&next=https://evil.example`],
    ["a value that could leave the JSON string", `${HANDOFF_CALLBACK_URL}?token=a%22`],
    ["a dot, which would forge the verifier separator", `${HANDOFF_CALLBACK_URL}?token=a.b`],
    ["an https look-alike", "https://auth/callback?token=abc"],
  ])("refuses %s", (_name, link) => {
    expect(tokenFromCallback(link)).toBeNull();
  });

  it("recognizes the callback whatever it carries, so no link reaches the router", () => {
    expect(isHandoffCallback(`${HANDOFF_CALLBACK_URL}?token=a&token=b`)).toBe(true);
    expect(isHandoffCallback("objectos://auth/callback?token=a")).toBe(false);
  });
});

describe("buildRedeemScript", () => {
  function run(script: string, origin: string, answer: Promise<{ ok: boolean }>) {
    const fetchMock = jest.fn(() => answer);
    const replace = jest.fn();
    new Function("location", "fetch", script)({ origin, replace }, fetchMock);
    return { fetchMock, replace };
  }

  const script = () => buildRedeemScript(SERVER, "TOKEN", "VERIFIER")!;

  it("posts T.code_verifier to the verify route with the WebView's own cookies", async () => {
    const { fetchMock, replace } = run(script(), SERVER, Promise.resolve({ ok: true }));
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/one-time-token/verify", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TOKEN.VERIFIER" }),
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(replace).toHaveBeenCalledWith("/_console/");
  });

  it("sends nothing from any other origin", () => {
    const { fetchMock, replace } = run(
      script(),
      "https://login.idp.example",
      Promise.resolve({ ok: true })
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes back to the sign-in page when the server refuses (a replay, an expired token)", async () => {
    const { replace } = run(script(), SERVER, Promise.resolve({ ok: false }));
    await new Promise((resolve) => setImmediate(resolve));
    expect(replace).toHaveBeenCalledWith(`/_console/login?error=${HANDOFF_FAILED_ERROR}`);
  });

  it("goes back to the sign-in page when the request fails", async () => {
    const { replace } = run(script(), SERVER, Promise.reject(new Error("offline")));
    await new Promise((resolve) => setImmediate(resolve));
    expect(replace).toHaveBeenCalledWith(`/_console/login?error=${HANDOFF_FAILED_ERROR}`);
  });

  it("keeps a server's base path", async () => {
    const { fetchMock, replace } = run(
      buildRedeemScript(`${SERVER}/erp`, "T", "V")!,
      SERVER,
      Promise.resolve({ ok: true })
    );
    expect(fetchMock.mock.calls[0]).toEqual(
      expect.arrayContaining(["/erp/api/v1/auth/one-time-token/verify"])
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(replace).toHaveBeenCalledWith("/erp/_console/");
  });
});

describe("probeHandoffOffered", () => {
  it.each([
    [401, true],
    [400, false],
    [404, false],
    [500, false],
    [200, false],
  ])("reads %i as %s", async (status, offered) => {
    await expect(
      probeHandoffOffered(SERVER, jest.fn().mockResolvedValue({ status }))
    ).resolves.toBe(offered);
  });

  it("asks anonymously, with this app's callback", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ status: 401 });
    await probeHandoffOffered(SERVER, fetchFn);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url.startsWith(`${SERVER}/api/v1/auth/one-time-token/handoff?`)).toBe(true);
    expect(new URL(url).searchParams.get("redirect_uri")).toBe(HANDOFF_CALLBACK_URL);
    expect(init.credentials).toBe("omit");
  });

  it("reads a failed request as not offered", async () => {
    await expect(
      probeHandoffOffered(SERVER, jest.fn().mockRejectedValue(new Error("offline")))
    ).resolves.toBe(false);
  });
});

describe("runSystemSignIn", () => {
  function deps(overrides: Partial<SystemSignInDeps> = {}): SystemSignInDeps {
    return {
      offered: jest.fn().mockResolvedValue(true),
      randomBytes: jest.fn((count: number) => new Uint8Array(count).fill(7)),
      sha256Base64,
      openAuthSession: jest
        .fn()
        .mockResolvedValue({ type: "success", url: `${HANDOFF_CALLBACK_URL}?token=T1` }),
      ...overrides,
    };
  }

  it("opens the session on the verifier's challenge and returns both halves", async () => {
    const d = deps();
    const outcome = await runSystemSignIn(SERVER, d);
    expect(outcome.kind).toBe("signed-in");
    if (outcome.kind !== "signed-in") return;
    expect(outcome.token).toBe("T1");
    expect(outcome.codeVerifier).toMatch(/^[A-Za-z0-9\-._~]{43}$/);
    const [entry, callback] = (d.openAuthSession as jest.Mock).mock.calls[0];
    expect(callback).toBe(HANDOFF_CALLBACK_URL);
    const challenge = challengeFromBase64Digest(await sha256Base64(outcome.codeVerifier));
    expect(new URL(entry).searchParams.get("redirect")).toContain(`code_challenge=${challenge}&`);
    expect(entry).not.toContain(outcome.codeVerifier);
  });

  it("opens nothing on a server that does not offer the hand-off", async () => {
    const d = deps({ offered: jest.fn().mockResolvedValue(false) });
    await expect(runSystemSignIn(SERVER, d)).resolves.toEqual({ kind: "not-offered" });
    expect(d.openAuthSession).not.toHaveBeenCalled();
  });

  it.each(["cancel", "dismiss", "locked"])("reads a %s session as cancelled", async (type) => {
    const d = deps({ openAuthSession: jest.fn().mockResolvedValue({ type }) });
    await expect(runSystemSignIn(SERVER, d)).resolves.toEqual({ kind: "cancelled" });
  });

  it("fails on a callback without a usable token", async () => {
    const d = deps({
      openAuthSession: jest
        .fn()
        .mockResolvedValue({ type: "success", url: `${HANDOFF_CALLBACK_URL}?token=a&x=1` }),
    });
    await expect(runSystemSignIn(SERVER, d)).resolves.toEqual({ kind: "failed" });
  });

  it("fails, and never rejects, when the session throws", async () => {
    const d = deps({ openAuthSession: jest.fn().mockRejectedValue(new Error("no browser")) });
    await expect(runSystemSignIn(SERVER, d)).resolves.toEqual({ kind: "failed" });
  });
});
