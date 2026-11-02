import {
  DEFAULT_ROUTE_RULES,
  matchRoutePattern,
  resolveRoute,
  type RouteRule,
} from "~/lib/shell/route-owner";
import { AVAILABLE_NATIVE_SCREENS } from "~/lib/shell/native-screens";

describe("matchRoutePattern", () => {
  it("matches exact paths, ignoring query and trailing slash", () => {
    expect(matchRoutePattern("/approvals", "/approvals")).toBe(true);
    expect(matchRoutePattern("/approvals", "/approvals/?tab=mine")).toBe(true);
    expect(matchRoutePattern("/approvals", "/approvals/1")).toBe(false);
  });

  it("matches prefixes with /*", () => {
    expect(matchRoutePattern("/apps/*", "/apps")).toBe(true);
    expect(matchRoutePattern("/apps/*", "/apps/crm/lead")).toBe(true);
    expect(matchRoutePattern("/apps/*", "/applications")).toBe(false);
    expect(matchRoutePattern("/*", "/anything")).toBe(true);
  });
});

describe("resolveRoute", () => {
  const screens = new Set(["approvals"]);

  it("defaults to web", () => {
    expect(resolveRoute("/home", [], screens)).toEqual({ owner: "web" });
  });

  it("hands a matching native rule to its screen", () => {
    const rules: RouteRule[] = [{ pattern: "/approvals/*", owner: "native", screen: "approvals" }];
    expect(resolveRoute("/approvals/42", rules, screens)).toEqual({
      owner: "native",
      screen: "approvals",
    });
  });

  it("falls back to web when the build lacks the screen", () => {
    const rules: RouteRule[] = [{ pattern: "/inbox", owner: "native", screen: "inbox" }];
    expect(resolveRoute("/inbox", rules, screens)).toEqual({ owner: "web" });
  });

  it("falls back to web for a native rule without a screen", () => {
    const rules: RouteRule[] = [{ pattern: "/approvals", owner: "native" }];
    expect(resolveRoute("/approvals", rules, screens)).toEqual({ owner: "web" });
  });

  it("is first-match-wins", () => {
    const rules: RouteRule[] = [
      { pattern: "/approvals/settings", owner: "web" },
      { pattern: "/approvals/*", owner: "native", screen: "approvals" },
    ];
    expect(resolveRoute("/approvals/settings", rules, screens)).toEqual({ owner: "web" });
  });

  it("ships with every route on the web", () => {
    expect(DEFAULT_ROUTE_RULES).toHaveLength(0);
    expect(AVAILABLE_NATIVE_SCREENS.size).toBe(0);
  });
});
