import { EMPTY_CONNECTIONS, addConnection, type Connections } from "~/lib/connections/model";
import {
  NO_MANAGED_CONFIG,
  findManagedConnection,
  initialAddress,
  isLocked,
  lockedHost,
  managedPending,
  managedServerKey,
  parseManagedConfig,
  sameManagedConfig,
  type ManagedConfig,
} from "~/lib/managed-config/model";

const server = (serverUrl: string, managedFrom?: string) => ({
  kind: "server" as const,
  label: serverUrl,
  serverUrl,
  brandColor: "#0f766e",
  initial: "E",
  ...(managedFrom ? { managedFrom } : {}),
});

function saved(...inputs: ReturnType<typeof server>[]): Connections {
  return inputs.reduce<Connections>(
    (s, input, i) => addConnection(s, input, i + 1),
    EMPTY_CONNECTIONS
  );
}

const MANAGED: ManagedConfig = { serverUrl: "https://erp.example.com", lockServer: false };
const LOCKED: ManagedConfig = { serverUrl: "https://erp.example.com", lockServer: true };

describe("parseManagedConfig", () => {
  it("reads serverUrl and lockServer", () => {
    expect(
      parseManagedConfig({ serverUrl: " https://erp.example.com ", lockServer: true })
    ).toEqual(LOCKED);
  });

  it.each([null, undefined, "serverUrl", 42, [], [{ serverUrl: "x" }]])(
    "reads %j as no managed config",
    (raw) => {
      expect(parseManagedConfig(raw)).toEqual(NO_MANAGED_CONFIG);
    }
  );

  it("an empty dictionary (no MDM) is no managed config", () => {
    expect(parseManagedConfig({})).toEqual(NO_MANAGED_CONFIG);
  });

  it.each([[""], ["   "], [42], [true]])("a serverUrl of %j is no managed address", (value) => {
    expect(parseManagedConfig({ serverUrl: value }).serverUrl).toBeNull();
  });

  it.each<[unknown, boolean]>([
    [undefined, false],
    [false, false],
    [true, true],
    ["true", true],
    ["TRUE", true],
    ["false", false],
    [" False ", false],
    // A value that is present but unreadable locks rather than silently unlocking.
    ["yes", true],
    [1, true],
    [0, true],
  ])("lockServer %j reads as %s", (value, expected) => {
    expect(
      parseManagedConfig({ serverUrl: "https://erp.example.com", lockServer: value }).lockServer
    ).toBe(expected);
  });

  it("ignores keys it does not read, trustedHosts included", () => {
    expect(
      parseManagedConfig({ serverUrl: "https://erp.example.com", trustedHosts: "idp.example.com" })
    ).toEqual(MANAGED);
  });
});

describe("matching the managed connection", () => {
  it("keys a managed address by its normalized URL, or its text when it does not normalize", () => {
    expect(managedServerKey("erp.example.com/_console/home")).toBe("https://erp.example.com");
    expect(managedServerKey("not a url")).toBe("not a url");
  });

  it("finds the connection confirmed from the managed address, even after a redirect", () => {
    const state = saved(
      server("https://acme.example.com"),
      server("https://www.erp.example.com", "https://erp.example.com")
    );
    expect(findManagedConnection(state.list, MANAGED)?.host).toBe("www.erp.example.com");
  });

  it("finds a connection the user saved at exactly the managed address", () => {
    const state = saved(server("https://erp.example.com"));
    expect(
      findManagedConnection(state.list, { ...MANAGED, serverUrl: "erp.example.com" })?.host
    ).toBe("erp.example.com");
  });

  it("finds nothing without a managed address, or before it was confirmed", () => {
    const state = saved(server("https://acme.example.com"));
    expect(findManagedConnection(state.list, NO_MANAGED_CONFIG)).toBeNull();
    expect(findManagedConnection(state.list, MANAGED)).toBeNull();
  });
});

describe("lock", () => {
  const state = saved(server("https://erp.example.com"), server("https://acme.example.com"));

  it("locks only the managed connection, and only with lockServer", () => {
    expect(lockedHost(state.list, LOCKED)).toBe("erp.example.com");
    expect(lockedHost(state.list, MANAGED)).toBeNull();
  });

  it("locks nothing before the managed server is saved", () => {
    expect(lockedHost(saved(server("https://acme.example.com")).list, LOCKED)).toBeNull();
  });

  it("is locked only with a managed address", () => {
    expect(isLocked(LOCKED)).toBe(true);
    expect(isLocked(MANAGED)).toBe(false);
    expect(isLocked({ serverUrl: null, lockServer: true })).toBe(false);
  });
});

describe("managedPending", () => {
  it("waits while the managed address has no saved connection", () => {
    expect(managedPending([], MANAGED, null)).toBe(true);
    expect(managedPending(saved(server("https://erp.example.com")).list, MANAGED, null)).toBe(
      false
    );
    expect(managedPending([], NO_MANAGED_CONFIG, null)).toBe(false);
  });

  it("unlocked, the user may decline it for the session", () => {
    expect(managedPending([], MANAGED, "https://erp.example.com")).toBe(false);
    // Declining one address does not decline the next one the MDM pushes.
    expect(
      managedPending(
        [],
        { ...MANAGED, serverUrl: "https://new.example.com" },
        "https://erp.example.com"
      )
    ).toBe(true);
  });

  it("locked, declining does not count", () => {
    expect(managedPending([], LOCKED, "https://erp.example.com")).toBe(true);
  });
});

describe("initialAddress — managed > build default > user entry", () => {
  const base = {
    linked: null,
    adding: false,
    current: null,
    managed: NO_MANAGED_CONFIG,
    managedSaved: false,
    buildDefault: "",
  };

  it("offers the managed address over the build default and the current server", () => {
    expect(
      initialAddress({
        ...base,
        managed: MANAGED,
        current: "https://old.example.com",
        buildDefault: "https://white-label.example.com",
      })
    ).toBe("https://erp.example.com");
  });

  it("offers the build default when there is no managed address", () => {
    expect(
      initialAddress({ ...base, adding: true, buildDefault: "https://white-label.example.com" })
    ).toBe("https://white-label.example.com");
  });

  it("leaves the field to the user with neither", () => {
    expect(initialAddress(base)).toBe("");
  });

  it("does not offer a managed address that is already saved", () => {
    expect(
      initialAddress({
        ...base,
        adding: true,
        managed: MANAGED,
        managedSaved: true,
        buildDefault: "https://d.example.com",
      })
    ).toBe("https://d.example.com");
  });

  it("an address the user asked for through a link comes first", () => {
    expect(initialAddress({ ...base, linked: "https://link.example.com", managed: MANAGED })).toBe(
      "https://link.example.com"
    );
  });
});

describe("sameManagedConfig", () => {
  it("compares both keys", () => {
    expect(sameManagedConfig(MANAGED, { ...MANAGED })).toBe(true);
    expect(sameManagedConfig(MANAGED, LOCKED)).toBe(false);
    expect(sameManagedConfig(MANAGED, NO_MANAGED_CONFIG)).toBe(false);
  });
});
