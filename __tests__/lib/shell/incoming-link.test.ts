import {
  consoleScreenHref,
  redirectIncomingPath,
  routeFromIncomingLink,
} from "~/lib/shell/incoming-link";

describe("routeFromIncomingLink", () => {
  it("reads the route param of an open link", () => {
    expect(routeFromIncomingLink("objectstack://open?route=%2Fapps%2Fcrm%2Flead%2F1")).toBe(
      "/apps/crm/lead/1"
    );
  });

  it("reads the path of a console link", () => {
    expect(routeFromIncomingLink("objectstack://console/apps/crm")).toBe("/apps/crm");
    expect(routeFromIncomingLink("objectstack://console")).toBe("/home");
  });

  it("rejects routes that are not Console paths", () => {
    expect(routeFromIncomingLink("objectstack://open?route=https%3A%2F%2Fevil.example")).toBeNull();
    expect(routeFromIncomingLink("objectstack://open?route=%2F%2Fevil.example")).toBeNull();
    expect(routeFromIncomingLink("objectstack://open")).toBeNull();
    expect(routeFromIncomingLink("objectstack://open?route=%E0%A4%A")).toBeNull();
  });

  it("rejects routes that would escape the Console", () => {
    for (const route of [
      "/../../api/v1/me",
      "/%2e%2e/%2e%2e/api/v1/me",
      "/%2E%2E/api",
      "/..\\..\\api",
      "/.\t./api",
    ]) {
      expect(
        routeFromIncomingLink(`objectstack://open?route=${encodeURIComponent(route)}`)
      ).toBeNull();
    }
    expect(routeFromIncomingLink("objectstack://console/../../api/v1/me")).toBeNull();
    expect(routeFromIncomingLink("objectstack://console/%2e%2e/api/v1/me")).toBeNull();
  });

  it("ignores other hosts and non-links", () => {
    expect(routeFromIncomingLink("objectstack://settings")).toBeNull();
    expect(routeFromIncomingLink("/console")).toBeNull();
  });
});

describe("consoleScreenHref", () => {
  it("encodes the route and optional nonce", () => {
    expect(consoleScreenHref("/apps/crm?x=1")).toBe("/console?route=%2Fapps%2Fcrm%3Fx%3D1");
    expect(consoleScreenHref("/home", 7)).toBe("/console?route=%2Fhome&n=7");
  });
});

describe("redirectIncomingPath", () => {
  it("maps app links onto the Console screen, with a nonce", () => {
    expect(redirectIncomingPath("objectstack://console/apps/crm", () => 42)).toBe(
      "/console?route=%2Fapps%2Fcrm&n=42"
    );
  });

  it("makes the same link opened twice distinguishable", () => {
    let t = 1000;
    const now = () => (t += 1);
    const link = "objectstack://open?route=%2Fapps%2Fcrm";
    const first = redirectIncomingPath(link, now);
    const second = redirectIncomingPath(link, now);
    expect(first).not.toBe(second);
    expect(redirectIncomingPath(link)).toMatch(/^\/console\?route=%2Fapps%2Fcrm&n=\d+$/);
  });

  it("sends an escaping route to the start screen", () => {
    expect(redirectIncomingPath("objectstack://open?route=%2F..%2F..%2Fapi%2Fv1%2Fme")).toBe("/");
  });

  it("sends unknown scheme links to the start screen", () => {
    expect(redirectIncomingPath("objectstack://unknown/thing")).toBe("/");
  });

  it("passes internal paths and the dev-client launcher through", () => {
    expect(redirectIncomingPath("/server-config")).toBe("/server-config");
    const dev =
      "exp+objectstack-mobile://expo-development-client/?url=http%3A%2F%2F10.0.0.2%3A8081";
    expect(redirectIncomingPath(dev)).toBe(dev);
  });
});
