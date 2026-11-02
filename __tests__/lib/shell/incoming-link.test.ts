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
  it("maps app links onto the Console screen", () => {
    expect(redirectIncomingPath("objectstack://console/apps/crm")).toBe(
      "/console?route=%2Fapps%2Fcrm"
    );
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
