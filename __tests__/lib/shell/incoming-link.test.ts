import {
  connectRequestFromLink,
  consoleScreenHref,
  redirectIncomingPath,
  routeFromIncomingLink,
  serverAddressFromCode,
  serverConfigHref,
} from "~/lib/shell/incoming-link";

describe("routeFromIncomingLink", () => {
  it("reads the route param of an open link", () => {
    expect(routeFromIncomingLink("objectos://open?route=%2Fapps%2Fcrm%2Flead%2F1")).toBe(
      "/apps/crm/lead/1"
    );
  });

  it("reads the path of a console link", () => {
    expect(routeFromIncomingLink("objectos://console/apps/crm")).toBe("/apps/crm");
    expect(routeFromIncomingLink("objectos://console")).toBe("/home");
  });

  it("does not depend on the scheme (EXPO_PUBLIC_APP_SCHEME white-label builds)", () => {
    expect(routeFromIncomingLink("acme-crm://console/apps/crm")).toBe("/apps/crm");
    expect(routeFromIncomingLink("acme-crm://open?route=%2Fapps")).toBe("/apps");
  });

  it("rejects routes that are not Console paths", () => {
    expect(routeFromIncomingLink("objectos://open?route=https%3A%2F%2Fevil.example")).toBeNull();
    expect(routeFromIncomingLink("objectos://open?route=%2F%2Fevil.example")).toBeNull();
    expect(routeFromIncomingLink("objectos://open")).toBeNull();
    expect(routeFromIncomingLink("objectos://open?route=%E0%A4%A")).toBeNull();
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
        routeFromIncomingLink(`objectos://open?route=${encodeURIComponent(route)}`)
      ).toBeNull();
    }
    expect(routeFromIncomingLink("objectos://console/../../api/v1/me")).toBeNull();
    expect(routeFromIncomingLink("objectos://console/%2e%2e/api/v1/me")).toBeNull();
  });

  it("ignores other hosts and non-links", () => {
    expect(routeFromIncomingLink("objectos://settings")).toBeNull();
    expect(routeFromIncomingLink("/console")).toBeNull();
  });
});

describe("connectRequestFromLink", () => {
  it("normalizes the server param of a connect link", () => {
    expect(connectRequestFromLink("objectos://connect?server=https%3A%2F%2Ferp.example.com")).toEqual(
      { ok: true, serverUrl: "https://erp.example.com" }
    );
  });

  it("decodes an encoded address and normalizes what it decodes to", () => {
    expect(
      connectRequestFromLink(
        "objectos://connect?server=HTTPS%3A%2F%2FERP.Example.com%3A443%2F_console%2Fapps%2Fcrm"
      )
    ).toEqual({ ok: true, serverUrl: "https://erp.example.com" });
    expect(connectRequestFromLink("objectos://connect?server=erp.example.com%3A8443")).toEqual({
      ok: true,
      serverUrl: "https://erp.example.com:8443",
    });
    // Not encoded at all still parses: the address holds no `&`.
    expect(connectRequestFromLink("objectos://connect/?server=https://erp.example.com/")).toEqual({
      ok: true,
      serverUrl: "https://erp.example.com",
    });
  });

  it("keeps an unusable address with its reason, for the picker to show", () => {
    expect(connectRequestFromLink("objectos://connect?server=http%3A%2F%2Ferp.example.com")).toEqual(
      { ok: false, reason: "insecure", value: "http://erp.example.com" }
    );
    expect(connectRequestFromLink("objectos://connect?server=ftp%3A%2F%2Ferp.example.com")).toEqual(
      { ok: false, reason: "invalid", value: "ftp://erp.example.com" }
    );
    expect(connectRequestFromLink("objectos://connect?server=")).toEqual({
      ok: false,
      reason: "empty",
      value: "",
    });
  });

  it("accepts plain http to a local host, as typing it would", () => {
    expect(connectRequestFromLink("objectos://connect?server=http%3A%2F%2F192.168.1.20%3A3000")).toEqual(
      { ok: true, serverUrl: "http://192.168.1.20:3000" }
    );
  });

  it("refuses a link without the server param", () => {
    expect(connectRequestFromLink("objectos://connect")).toBeNull();
    expect(connectRequestFromLink("objectos://connect?")).toBeNull();
    expect(connectRequestFromLink("objectos://connect?host=erp.example.com")).toBeNull();
  });

  it("refuses any other param, and a repeated server param", () => {
    expect(
      connectRequestFromLink("objectos://connect?server=https%3A%2F%2Ferp.example.com&token=abc")
    ).toBeNull();
    expect(
      connectRequestFromLink("objectos://connect?user=a&server=https%3A%2F%2Ferp.example.com")
    ).toBeNull();
    expect(
      connectRequestFromLink(
        "objectos://connect?server=https%3A%2F%2Fa.example.com&server=https%3A%2F%2Fb.example.com"
      )
    ).toBeNull();
  });

  it("refuses a path after the host and malformed encoding", () => {
    expect(
      connectRequestFromLink("objectos://connect/extra?server=https%3A%2F%2Ferp.example.com")
    ).toBeNull();
    expect(connectRequestFromLink("objectos://connect?server=%E0%A4%A")).toBeNull();
  });

  it("ignores non-connect hosts", () => {
    expect(connectRequestFromLink("objectos://open?server=https%3A%2F%2Ferp.example.com")).toBeNull();
    expect(connectRequestFromLink("objectos://console/apps")).toBeNull();
  });

  it("does not depend on the scheme of an incoming link (white-label builds)", () => {
    expect(connectRequestFromLink("acme-crm://connect?server=erp.example.com")).toEqual({
      ok: true,
      serverUrl: "https://erp.example.com",
    });
  });
});

describe("serverAddressFromCode", () => {
  it("accepts objectos://connect codes", () => {
    expect(serverAddressFromCode("objectos://connect?server=https%3A%2F%2Ferp.example.com")).toBe(
      "https://erp.example.com"
    );
    expect(serverAddressFromCode("  OBJECTOS://connect?server=erp.example.com\n")).toBe(
      "https://erp.example.com"
    );
  });

  it("hands an unusable connect address on raw, so the picker shows it with the error", () => {
    expect(serverAddressFromCode("objectos://connect?server=http%3A%2F%2Ferp.example.com")).toBe(
      "http://erp.example.com"
    );
  });

  it("accepts a plain https server URL as a convenience", () => {
    expect(serverAddressFromCode("https://erp.example.com/_console/apps/crm")).toBe(
      "https://erp.example.com"
    );
  });

  it("refuses everything else", () => {
    for (const code of [
      "http://erp.example.com",
      "erp.example.com",
      "objectos://open?route=%2Fapps",
      "objectos://connect?server=https%3A%2F%2Ferp.example.com&token=abc",
      "objectos://connect",
      "acme-crm://connect?server=https%3A%2F%2Ferp.example.com",
      "https://",
      "WIFI:S:office;T:WPA;P:secret;;",
      "",
    ]) {
      expect(serverAddressFromCode(code)).toBeNull();
    }
  });
});

describe("serverConfigHref", () => {
  it("encodes the address and optional nonce", () => {
    expect(serverConfigHref("https://erp.example.com")).toBe(
      "/server-config?server=https%3A%2F%2Ferp.example.com"
    );
    expect(serverConfigHref("a b&c", 3)).toBe("/server-config?server=a%20b%26c&n=3");
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
    expect(redirectIncomingPath("objectos://console/apps/crm", () => 42)).toBe(
      "/console?route=%2Fapps%2Fcrm&n=42"
    );
  });

  it("makes the same link opened twice distinguishable", () => {
    let t = 1000;
    const now = () => (t += 1);
    const link = "objectos://open?route=%2Fapps%2Fcrm";
    const first = redirectIncomingPath(link, now);
    const second = redirectIncomingPath(link, now);
    expect(first).not.toBe(second);
    expect(redirectIncomingPath(link)).toMatch(/^\/console\?route=%2Fapps%2Fcrm&n=\d+$/);
  });

  it("sends an escaping route to the start screen", () => {
    expect(redirectIncomingPath("objectos://open?route=%2F..%2F..%2Fapi%2Fv1%2Fme")).toBe("/");
  });

  it("opens the server picker for a connect link, never the Console", () => {
    expect(
      redirectIncomingPath("objectos://connect?server=https%3A%2F%2Ferp.example.com", () => 9)
    ).toBe("/server-config?server=https%3A%2F%2Ferp.example.com&n=9");
  });

  it("opens the picker with the raw value when the connect address is unusable", () => {
    expect(
      redirectIncomingPath("objectos://connect?server=http%3A%2F%2Ferp.example.com", () => 9)
    ).toBe("/server-config?server=http%3A%2F%2Ferp.example.com&n=9");
  });

  it("sends a connect link with other params to the start screen", () => {
    expect(
      redirectIncomingPath("objectos://connect?server=https%3A%2F%2Ferp.example.com&token=abc")
    ).toBe("/");
    expect(redirectIncomingPath("objectos://connect")).toBe("/");
  });

  it("sends unknown scheme links to the start screen", () => {
    expect(redirectIncomingPath("objectos://unknown/thing")).toBe("/");
  });

  it("passes internal paths and the dev-client launcher through", () => {
    expect(redirectIncomingPath("/server-config")).toBe("/server-config");
    const dev =
      "exp+objectos://expo-development-client/?url=http%3A%2F%2F10.0.0.2%3A8081";
    expect(redirectIncomingPath(dev)).toBe(dev);
  });
});
