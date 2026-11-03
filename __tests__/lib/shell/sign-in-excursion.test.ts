import { decideNavigation, type NavigationContext } from "~/lib/shell/navigation-policy";
import {
  EXCURSION_MAX_NAVIGATIONS,
  EXCURSION_TIMEOUT_MS,
  IDLE_EXCURSION,
  refusesEmbeddedWebView,
  stepExcursion,
  type ExcursionState,
  type ExcursionStep,
} from "~/lib/shell/sign-in-excursion";

const SERVER = "https://acme.example.com";
const LOGIN = `${SERVER}/_console/login?redirect=%2Fhome`;
const IDP = "https://login.idp-corp.example/oauth2/authorize?client_id=acme";
const T0 = 1_700_000_000_000;

const ctx: NavigationContext = {
  serverUrl: SERVER,
  rules: [{ pattern: "/approvals/*", owner: "native", screen: "approvals" }],
  availableScreens: new Set(["approvals"]),
  trustedHosts: ["sso.trusted-idp.example"],
};

/** A top-frame request, with the plain policy's decision, as the component sends it. */
function request(state: ExcursionState, url: string, now = T0, serverUrl = SERVER): ExcursionStep {
  return stepExcursion(
    state,
    { type: "request", url, base: decideNavigation(url, { ...ctx, serverUrl }), now },
    serverUrl
  );
}

function report(state: ExcursionState, url: string, loaded: boolean, now = T0): ExcursionStep {
  return stepExcursion(state, { type: "location", url, loaded, now }, SERVER);
}

/** The shell's record says the top frame is at `url`. */
const at = (url: string): ExcursionState => report(IDLE_EXCURSION, url, true).state;

/** An excursion started from the Console's sign-in page, its first page loaded. */
function started(now = T0): ExcursionState {
  const step = request(at(LOGIN), IDP, now);
  expect(step.started).toBe(true);
  return report(step.state, IDP, true, now).state;
}

describe("sign-in excursion: the start", () => {
  it("starts from the Console's sign-in page, loading the provider in the WebView", () => {
    const step = request(at(LOGIN), IDP);
    expect(step.decision).toEqual({ kind: "load" });
    expect(step.started).toBe(true);
    expect(step.state.active).toEqual({
      host: "login.idp-corp.example",
      startedAt: T0,
      navigations: 1,
      shown: false,
    });
  });

  it("starts from a server redirect out of the auth API", () => {
    // `/api/v1/auth/sign-in/social?…` answers with a redirect to the provider:
    // the request the policy let load is the record when the redirect arrives.
    const api = request(at(`${SERVER}/_console/apps/crm`), `${SERVER}/api/v1/auth/sign-in/social`);
    expect(api.decision).toEqual({ kind: "load" });
    const step = request(api.state, IDP);
    expect(step.started).toBe(true);
    expect(step.decision).toEqual({ kind: "load" });
  });

  it("does not start from any other page on the server", () => {
    for (const from of [
      `${SERVER}/_console/apps/crm`,
      `${SERVER}/_console/login-help`,
      `${SERVER}/_console/settings/login`,
      `${SERVER}/api/v1/data/account`,
      `${SERVER}/api/v1/authx/sign-in`,
    ]) {
      const step = request(at(from), IDP);
      expect(step.started).toBeUndefined();
      expect(step.decision).toEqual({ kind: "external", url: IDP });
      expect(step.state.active).toBeNull();
    }
  });

  it("does not start before the WebView has reported where it is", () => {
    const step = request(IDLE_EXCURSION, IDP);
    expect(step.started).toBeUndefined();
    expect(step.decision).toEqual({ kind: "external", url: IDP });
  });

  it("does not start from a sign-in page of another origin", () => {
    // Same path, another host: only the server's own origin is its surface.
    const step = request(at("https://evil.example/_console/login"), IDP);
    expect(step.decision).toEqual({ kind: "external", url: IDP });
    // Same host, plain http: another origin as well.
    const http = request(at("http://acme.example.com/_console/login"), IDP);
    expect(http.decision).toEqual({ kind: "external", url: IDP });
  });

  it("takes the record only from navigation the WebView reports, so leaving the sign-in page ends the right to start", () => {
    // The Console moved on from /login (an SPA history change, a load).
    const moved = report(at(LOGIN), `${SERVER}/_console/home`, true).state;
    expect(request(moved, IDP).decision).toEqual({ kind: "external", url: IDP });
  });

  it("refuses plain http, which keeps the existing policy (system browser)", () => {
    const step = request(at(LOGIN), "http://login.idp-corp.example/authorize");
    expect(step.started).toBeUndefined();
    expect(step.decision).toEqual({
      kind: "external",
      url: "http://login.idp-corp.example/authorize",
    });
    expect(step.state.active).toBeNull();
  });

  it("refuses an identity provider that refuses embedded WebViews, before its page loads", () => {
    const google = "https://accounts.google.com/o/oauth2/v2/auth?client_id=x";
    const step = request(at(LOGIN), google);
    expect(step.decision).toEqual({ kind: "block" });
    expect(step.refused).toBe("unsupported");
    expect(step.started).toBeUndefined();
    expect(step.state.active).toBeNull();
  });

  it("works under a server base path", () => {
    const base = "https://acme.example.com/erp";
    const step = stepExcursion(
      report(IDLE_EXCURSION, `${base}/_console/login`, true).state,
      {
        type: "request",
        url: IDP,
        base: decideNavigation(IDP, { ...ctx, serverUrl: base }),
        now: T0,
      },
      base
    );
    expect(step.started).toBe(true);
  });

  it("leaves the trusted-host and server routes of the plain policy as they are", () => {
    const trusted = request(at(LOGIN), "https://sso.trusted-idp.example/authorize");
    expect(trusted.decision).toEqual({ kind: "load" });
    expect(trusted.started).toBeUndefined();
    const native = request(at(LOGIN), `${SERVER}/_console/approvals/7`);
    expect(native.decision).toEqual({ kind: "native", screen: "approvals", route: "/approvals/7" });
    expect(request(at(LOGIN), "mailto:it@acme.example.com").decision).toEqual({
      kind: "external",
      url: "mailto:it@acme.example.com",
    });
  });
});

describe("sign-in excursion: while it lasts", () => {
  it("admits the provider's further https pages and counts them, the bar following the host", () => {
    const mfa = request(started(), "https://mfa.idp-corp.example:8443/verify");
    expect(mfa.decision).toEqual({ kind: "load" });
    expect(mfa.state.active).toMatchObject({ host: "mfa.idp-corp.example:8443", navigations: 2 });
  });

  it("follows a page the WebView reports without asking (an Android form POST)", () => {
    const step = report(started(), "https://federation.partner.example/saml/sso", true);
    expect(step.ended).toBeUndefined();
    expect(step.state.active?.host).toBe("federation.partner.example");
  });

  it("ends with an error when a page is plain http", () => {
    const step = request(started(), "http://login.idp-corp.example/next");
    expect(step.decision).toEqual({ kind: "block" });
    expect(step.ended).toBe("insecure");
    expect(step.state.active).toBeNull();
    // Reported without a request (Android does not ask before a form POST).
    expect(report(started(), "http://login.idp-corp.example/next", false).ended).toBe("insecure");
  });

  it("ends when the provider hands over to one that refuses embedded WebViews", () => {
    expect(request(started(), "https://accounts.google.com/signin").ended).toBe("unsupported");
    const marker = request(
      started(),
      "https://login.idp-corp.example/error?code=disallowed_useragent"
    );
    expect(marker.ended).toBe("unsupported");
    expect(marker.decision).toEqual({ kind: "block" });
  });

  it(`ends after ${EXCURSION_MAX_NAVIGATIONS} navigations`, () => {
    let state = started();
    for (let n = 2; n <= EXCURSION_MAX_NAVIGATIONS; n += 1) {
      const step = request(state, `https://login.idp-corp.example/step/${n}`);
      expect(step.decision).toEqual({ kind: "load" });
      state = step.state;
    }
    expect(state.active?.navigations).toBe(EXCURSION_MAX_NAVIGATIONS);
    const over = request(state, "https://login.idp-corp.example/loop");
    expect(over.decision).toEqual({ kind: "block" });
    expect(over.ended).toBe("redirects");
    expect(over.state.active).toBeNull();
  });

  it("ends after the time limit, at the timer or at the next navigation", () => {
    const late = T0 + EXCURSION_TIMEOUT_MS;
    expect(stepExcursion(started(), { type: "tick", now: late - 1 }, SERVER).ended).toBeUndefined();
    expect(stepExcursion(started(), { type: "tick", now: late }, SERVER).ended).toBe("timeout");
    const next = request(started(), "https://login.idp-corp.example/next", late);
    expect(next.ended).toBe("timeout");
    expect(next.decision).toEqual({ kind: "block" });
    expect(report(started(), "https://login.idp-corp.example/next", true, late).ended).toBe(
      "timeout"
    );
  });

  it("does not count or end on a trusted host", () => {
    const step = request(started(), "https://sso.trusted-idp.example/x");
    expect(step.decision).toEqual({ kind: "load" });
    expect(step.state.active).toMatchObject({ navigations: 1, host: "sso.trusted-idp.example" });
  });
});

describe("sign-in excursion: the end", () => {
  it("ends on a request back to the server's origin", () => {
    const step = request(started(), `${SERVER}/api/v1/auth/callback/corp?code=abc`);
    expect(step.decision).toEqual({ kind: "load" });
    expect(step.ended).toBe("returned");
    expect(step.state).toEqual({
      location: `${SERVER}/api/v1/auth/callback/corp?code=abc`,
      active: null,
    });
  });

  it("ends on a server page the WebView reports loaded, after an excursion page loaded", () => {
    // A SAML response is a form POST, which Android loads without asking.
    const step = report(started(), `${SERVER}/_console/home`, true);
    expect(step.ended).toBe("returned");
    expect(step.state.active).toBeNull();
  });

  it("ignores a late report of the server page left behind", () => {
    const fresh = request(at(LOGIN), IDP).state;
    // Before the provider's first page loaded: the old document's events.
    expect(report(fresh, LOGIN, true).state.active).not.toBeNull();
    expect(report(fresh, LOGIN, true).ended).toBeUndefined();
    // A load start on the server is not a return either.
    expect(report(started(), `${SERVER}/_console/home`, false).ended).toBeUndefined();
  });

  it("ends on 取消", () => {
    const step = stepExcursion(started(), { type: "cancel" }, SERVER);
    expect(step.ended).toBe("cancelled");
    expect(step.state.active).toBeNull();
    expect(stepExcursion(IDLE_EXCURSION, { type: "cancel" }, SERVER).ended).toBeUndefined();
  });

  it("does not start again from the provider's pages once it has returned", () => {
    const back = request(started(), `${SERVER}/_console/home`).state;
    expect(request(back, IDP).decision).toEqual({ kind: "external", url: IDP });
  });

  it("is judged against the current connection only", () => {
    // Another saved connection's sign-in page is not this server's surface.
    const other = "https://erp.example.com";
    const step = request(at(LOGIN), IDP, T0, other);
    expect(step.started).toBeUndefined();
  });
});

describe("refusesEmbeddedWebView", () => {
  it("names Google's sign-in host and the disallowed_useragent code", () => {
    expect(refusesEmbeddedWebView("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);
    expect(refusesEmbeddedWebView("https://x.example/err?error=DISALLOWED_USERAGENT")).toBe(true);
    expect(refusesEmbeddedWebView("https://accounts.google.com.evil.example/")).toBe(false);
    expect(refusesEmbeddedWebView(IDP)).toBe(false);
    expect(refusesEmbeddedWebView("not a url")).toBe(false);
  });
});
