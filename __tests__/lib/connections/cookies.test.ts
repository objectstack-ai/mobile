import { Platform } from "react-native";
import type { Cookie, IOSCookieStoreOptions } from "@preeternal/react-native-cookie-manager";
import {
  clearHostCookies,
  cookieUrls,
  planHostCookieClear,
  type CookieStore,
} from "~/lib/connections/cookies";

const HOST = "acme.objectos.ai";

describe("planHostCookieClear", () => {
  it("clears the host's own cookies: host-only, and a domain cookie for exactly this host", () => {
    const plan = planHostCookieClear(
      [
        { name: "session", domain: "acme.objectos.ai" },
        { name: "prefs", domain: ".acme.objectos.ai" },
      ],
      HOST,
      ["erp.example.com"]
    );
    expect(plan).toEqual({ names: ["session", "prefs"], kept: 0 });
  });

  it("keeps a parent-domain cookie, which sibling hosts share", () => {
    const plan = planHostCookieClear(
      [
        { name: "session", domain: "acme.objectos.ai" },
        { name: "sso", domain: ".objectos.ai" },
      ],
      HOST,
      ["partner-portal.objectos.ai"]
    );
    expect(plan).toEqual({ names: ["session"], kept: 1 });
  });

  it("keeps a name that a shared cookie also carries: clearing by name would take both", () => {
    const plan = planHostCookieClear(
      [
        { name: "session", domain: "acme.objectos.ai" },
        { name: "session", domain: ".objectos.ai" },
        { name: "theme", domain: "acme.objectos.ai" },
      ],
      HOST,
      []
    );
    expect(plan).toEqual({ names: ["theme"], kept: 2 });
  });

  it("keeps a domain cookie for this host when another saved host lies under it", () => {
    const plan = planHostCookieClear(
      [
        { name: "session", domain: "example.com" },
        { name: "shared", domain: ".example.com" },
      ],
      "example.com",
      ["erp.example.com:443"]
    );
    expect(plan).toEqual({ names: ["session"], kept: 1 });
  });

  it("keeps everything when another saved connection has the same host name on another port", () => {
    // Cookies ignore ports, so both connections see the same cookies.
    const plan = planHostCookieClear(
      [{ name: "session", domain: "192.168.1.5" }],
      "192.168.1.5:3000",
      ["192.168.1.5:4000"]
    );
    expect(plan).toEqual({ names: [], kept: 1 });
  });

  it("compares host names without case or port", () => {
    expect(
      planHostCookieClear([{ name: "s", domain: "ACME.objectos.ai" }], "acme.objectos.ai:8443", [])
    ).toEqual({ names: ["s"], kept: 0 });
  });

  it("cannot plan when a cookie has no domain", () => {
    expect(planHostCookieClear([{ name: "session" }], HOST, [])).toBeNull();
    expect(planHostCookieClear([{ name: "session", domain: null }], HOST, [])).toBeNull();
  });
});

describe("cookieUrls", () => {
  it("covers the root, the base path, the Console mount and the API mount", () => {
    expect(cookieUrls("https://acme.objectos.ai")).toEqual([
      "https://acme.objectos.ai/",
      "https://acme.objectos.ai/_console/",
      "https://acme.objectos.ai/api/",
    ]);
    expect(cookieUrls("https://erp.example.com/os")).toEqual([
      "https://erp.example.com/",
      "https://erp.example.com/os/",
      "https://erp.example.com/os/_console/",
      "https://erp.example.com/os/api/",
    ]);
    expect(cookieUrls("not a url")).toEqual([]);
  });
});

/**
 * A cookie store standing in for the native module: `getAsArray` answers what
 * applies to the URL (domain match, and on Android path match); `clearByName`
 * clears every same-name cookie that applies to the URL, as the module does.
 */
function fakeStore(cookies: Array<Cookie & { store?: "webKit" | "foundation" }>, os: "ios" | "android") {
  const jar = cookies.map((c) => ({ ...c }));
  const applies = (c: Cookie, url: string, options?: IOSCookieStoreOptions) => {
    const m = /^https?:\/\/([^/:]+)(?::\d+)?(\/.*)$/.exec(url)!;
    const domain = (c.domain ?? "").replace(/^\./, "");
    const domainOk = m[1] === domain || m[1].endsWith(`.${domain}`);
    const pathOk = os === "ios" || m[2].startsWith(c.path ?? "/");
    const storeOk =
      os === "android" || ((c as { store?: string }).store ?? "webKit") === (options?.iosCookieStore ?? "foundation");
    return domainOk && pathOk && storeOk;
  };
  const store: CookieStore & { jar: typeof jar; cleared: Array<[string, string]> } = {
    jar,
    cleared: [],
    getAsArray: jest.fn(async (url: string, options?: IOSCookieStoreOptions) =>
      jar.filter((c) => applies(c, url, options)).map(({ store: _s, ...c }) => c)
    ),
    clearByName: jest.fn(async (url: string, name: string, options?: IOSCookieStoreOptions) => {
      const before = jar.length;
      for (let i = jar.length - 1; i >= 0; i -= 1) {
        if (jar[i].name === name && applies(jar[i], url, options)) jar.splice(i, 1);
      }
      store.cleared.push([url, name]);
      return jar.length !== before;
    }),
  };
  return store;
}

describe("clearHostCookies", () => {
  const originalOS = Platform.OS;
  const setOS = (os: string) => Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  afterEach(() => setOS(originalOS));

  describe("on iOS", () => {
    beforeEach(() => setOS("ios"));

    it("clears the host's own cookies from the WebKit store and from HTTPCookieStorage", async () => {
      const store = fakeStore(
        [
          { name: "session", value: "1", domain: "acme.objectos.ai", path: "/", store: "webKit" },
          { name: "session", value: "1", domain: "acme.objectos.ai", path: "/", store: "foundation" },
          { name: "session", value: "2", domain: "partner-portal.objectos.ai", path: "/", store: "webKit" },
          { name: "sso", value: "3", domain: ".objectos.ai", path: "/", store: "webKit" },
          { name: "session", value: "4", domain: "erp.example.com", path: "/", store: "foundation" },
        ],
        "ios"
      );
      const outcome = await clearHostCookies(
        "https://acme.objectos.ai",
        ["https://partner-portal.objectos.ai", "https://erp.example.com"],
        store
      );
      expect(outcome).toEqual({ kind: "cleared", cleared: 2, kept: 1 });
      expect(store.jar.map((c) => `${c.name}@${c.domain}/${c.store}`)).toEqual([
        "session@partner-portal.objectos.ai/webKit",
        "sso@.objectos.ai/webKit",
        "session@erp.example.com/foundation",
      ]);
      expect(store.getAsArray).toHaveBeenCalledWith("https://acme.objectos.ai/", {
        iosCookieStore: "webKit",
      });
      expect(store.getAsArray).toHaveBeenCalledWith("https://acme.objectos.ai/", {
        iosCookieStore: "foundation",
      });
      // iOS clears a name on every path in one call.
      expect(store.cleared).toEqual([
        ["https://acme.objectos.ai/", "session"],
        ["https://acme.objectos.ai/", "session"],
      ]);
    });

    it("never clears a name a shared cookie also carries", async () => {
      const store = fakeStore(
        [
          { name: "session", value: "1", domain: "acme.objectos.ai", path: "/" },
          { name: "session", value: "2", domain: ".objectos.ai", path: "/" },
        ],
        "ios"
      );
      await expect(clearHostCookies("https://acme.objectos.ai", [], store)).resolves.toEqual({
        kind: "cleared",
        cleared: 0,
        kept: 2,
      });
      expect(store.clearByName).not.toHaveBeenCalled();
      expect(store.jar).toHaveLength(2);
    });
  });

  describe("on Android", () => {
    beforeEach(() => setOS("android"));

    it("clears through every URL a cookie was visible from, so path-restricted ones go too", async () => {
      const store = fakeStore(
        [
          { name: "session", value: "1", domain: "acme.objectos.ai", path: "/" },
          { name: "csrf", value: "1", domain: "acme.objectos.ai", path: "/api" },
          { name: "session", value: "2", domain: "partner-portal.objectos.ai", path: "/" },
        ],
        "android"
      );
      await expect(
        clearHostCookies("https://acme.objectos.ai", ["https://partner-portal.objectos.ai"], store)
      ).resolves.toEqual({ kind: "cleared", cleared: 2, kept: 0 });
      expect(store.jar.map((c) => `${c.name}@${c.domain}`)).toEqual([
        "session@partner-portal.objectos.ai",
      ]);
      expect(store.getAsArray).toHaveBeenCalledWith("https://acme.objectos.ai/", undefined);
      expect(store.cleared).toContainEqual(["https://acme.objectos.ai/api/", "csrf"]);
    });

    it("clears nothing when the WebView reports cookies without a domain (no GET_COOKIE_INFO)", async () => {
      const store = fakeStore([], "android");
      store.getAsArray = jest.fn(async () => [{ name: "session", value: "1" }]);
      await expect(clearHostCookies("https://acme.objectos.ai", [], store)).resolves.toEqual({
        kind: "unscoped",
      });
      expect(store.clearByName).not.toHaveBeenCalled();
    });

    it("reads a not_supported refusal as unscoped, and any other failure as failed", async () => {
      const store = fakeStore(
        [{ name: "session", value: "1", domain: "acme.objectos.ai", path: "/" }],
        "android"
      );
      store.clearByName = jest.fn(async () => {
        throw Object.assign(new Error("needs GET_COOKIE_INFO"), { code: "not_supported" });
      });
      await expect(clearHostCookies("https://acme.objectos.ai", [], store)).resolves.toEqual({
        kind: "unscoped",
      });
      store.clearByName = jest.fn(async () => {
        throw new Error("storage broke");
      });
      await expect(clearHostCookies("https://acme.objectos.ai", [], store)).resolves.toEqual({
        kind: "failed",
        message: "storage broke",
      });
    });
  });

  it("is unavailable without the native module", async () => {
    await expect(clearHostCookies("https://acme.objectos.ai", [], null)).resolves.toEqual({
      kind: "unavailable",
    });
    setOS("web");
    await expect(clearHostCookies("https://acme.objectos.ai", [])).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("refuses a server URL it cannot read", async () => {
    await expect(clearHostCookies("not a url", [], fakeStore([], "ios"))).resolves.toMatchObject({
      kind: "failed",
    });
  });
});
