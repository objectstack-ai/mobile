import {
  CONNECTIONS_STORAGE_VERSION,
  EMPTY_CONNECTIONS,
  addConnection,
  connectionFromLegacyUrl,
  connectionFromProbe,
  currentConnection,
  hostOf,
  parseConnections,
  rememberRoute,
  removeConnection,
  selectConnection,
  serializeConnections,
  type ConnectionInput,
  type Connections,
} from "~/lib/connections/model";
import { DEFAULT_BRAND_COLOR, type ProbedServer } from "~/lib/server-probe";

const erp: ConnectionInput = {
  kind: "server",
  label: "Example ERP",
  serverUrl: "https://erp.example.com",
  brandColor: "#0f766e",
  initial: "E",
};
const acme: ConnectionInput = {
  kind: "cloud",
  label: "Acme",
  serverUrl: "https://acme.objectos.ai",
  brandColor: "#4f46e5",
  initial: "A",
};
const partner: ConnectionInput = {
  kind: "cloud",
  label: "Partner portal",
  serverUrl: "https://partner-portal.objectos.ai",
  brandColor: "#334155",
  initial: "P",
};

/** erp, acme, partner — added in that order, so partner is current. */
function three(): Connections {
  let state = addConnection(EMPTY_CONNECTIONS, erp, 1);
  state = addConnection(state, acme, 2);
  return addConnection(state, partner, 3);
}

const hosts = (state: Connections) => state.list.map((c) => c.host);

describe("hostOf", () => {
  it("is the lower-cased host with the default port dropped", () => {
    expect(hostOf("https://ERP.example.com:443/os")).toBe("erp.example.com");
    expect(hostOf("http://192.168.1.5:3000")).toBe("192.168.1.5:3000");
    expect(hostOf("not a url")).toBeNull();
  });
});

describe("addConnection", () => {
  it("appends a new host and makes it current", () => {
    const state = three();
    expect(hosts(state)).toEqual([
      "erp.example.com",
      "acme.objectos.ai",
      "partner-portal.objectos.ai",
    ]);
    expect(state.current).toBe("partner-portal.objectos.ai");
    expect(state.list[0]).toEqual({ ...erp, host: "erp.example.com", lastRoute: null, addedAt: 1 });
  });

  it("dedupes by host: a second save refreshes the saved connection in place", () => {
    let state = rememberRoute(three(), "erp.example.com", "/apps/crm");
    state = addConnection(state, { ...erp, label: "Example ERP 2", brandColor: "#000" }, 9);

    expect(hosts(state)).toEqual([
      "erp.example.com",
      "acme.objectos.ai",
      "partner-portal.objectos.ai",
    ]);
    expect(state.current).toBe("erp.example.com");
    expect(state.list[0]).toMatchObject({
      label: "Example ERP 2",
      brandColor: "#000",
      addedAt: 1,
      lastRoute: "/apps/crm",
    });
  });

  it("dedupes by host however the URL was written", () => {
    const state = addConnection(three(), { ...erp, serverUrl: "https://ERP.example.com:443" }, 9);
    expect(state.list).toHaveLength(3);
  });

  it("forgets the last route when the same host is saved under another base URL", () => {
    let state = rememberRoute(three(), "erp.example.com", "/apps/crm");
    state = addConnection(state, { ...erp, serverUrl: "https://erp.example.com/os" }, 9);
    expect(state.list[0]).toMatchObject({ serverUrl: "https://erp.example.com/os", lastRoute: null });
  });

  it("drops the host from the push-left-registered record", () => {
    let state = removeConnection(three(), "erp.example.com", { pushLeftRegistered: true });
    expect(state.pushLeftRegistered).toEqual(["erp.example.com"]);
    state = addConnection(state, erp, 9);
    expect(state.pushLeftRegistered).toEqual([]);
  });

  it("ignores an input that is not a server URL", () => {
    const state = three();
    expect(addConnection(state, { ...erp, serverUrl: "nope" }, 9)).toBe(state);
  });
});

describe("current-connection rules", () => {
  it("select makes a saved host current, and ignores one that is not saved", () => {
    const state = three();
    expect(selectConnection(state, "erp.example.com").current).toBe("erp.example.com");
    expect(selectConnection(state, "other.example.com")).toBe(state);
    expect(selectConnection(state, state.current!)).toBe(state);
  });

  it("removing the current connection makes the first remaining one current", () => {
    const state = removeConnection(three(), "partner-portal.objectos.ai");
    expect(hosts(state)).toEqual(["erp.example.com", "acme.objectos.ai"]);
    expect(state.current).toBe("erp.example.com");
  });

  it("removing another connection keeps the current one", () => {
    const state = removeConnection(three(), "erp.example.com");
    expect(hosts(state)).toEqual(["acme.objectos.ai", "partner-portal.objectos.ai"]);
    expect(state.current).toBe("partner-portal.objectos.ai");
  });

  it("removing the last connection leaves none current", () => {
    const one = addConnection(EMPTY_CONNECTIONS, erp, 1);
    expect(removeConnection(one, "erp.example.com")).toEqual(EMPTY_CONNECTIONS);
  });

  it("removing a host that is not saved changes nothing", () => {
    const state = three();
    expect(removeConnection(state, "other.example.com")).toBe(state);
  });

  it("records a push token left registered only when told to, once", () => {
    expect(removeConnection(three(), "erp.example.com").pushLeftRegistered).toEqual([]);
    let state = removeConnection(three(), "erp.example.com", { pushLeftRegistered: true });
    state = addConnection(state, erp, 9);
    state = { ...state, pushLeftRegistered: ["erp.example.com"] };
    state = removeConnection(state, "erp.example.com", { pushLeftRegistered: true });
    expect(state.pushLeftRegistered).toEqual(["erp.example.com"]);
  });

  it("currentConnection is the record of the current host", () => {
    expect(currentConnection(three())?.label).toBe("Partner portal");
    expect(currentConnection(EMPTY_CONNECTIONS)).toBeNull();
  });
});

describe("rememberRoute", () => {
  it("records a safe route on the host's connection", () => {
    const state = rememberRoute(three(), "acme.objectos.ai", "/apps/crm/lead/1?tab=2");
    expect(state.list[1].lastRoute).toBe("/apps/crm/lead/1?tab=2");
  });

  it("ignores an unsafe route, an unknown host and an unchanged route", () => {
    const state = rememberRoute(three(), "acme.objectos.ai", "/apps/crm");
    expect(rememberRoute(state, "acme.objectos.ai", "/../api/v1/me")).toBe(state);
    expect(rememberRoute(state, "other.example.com", "/apps/crm")).toBe(state);
    expect(rememberRoute(state, "acme.objectos.ai", "/apps/crm")).toBe(state);
  });
});

describe("inputs", () => {
  const probed: ProbedServer = {
    serverUrl: "https://www.erp.example.com",
    secure: true,
    platformName: "ObjectOS",
    version: "17.4.0",
    productName: "Example ERP",
    logoUrl: null,
    brandColor: "#0f766e",
    signIn: null,
  };

  it("a confirmed server is a private server labelled with its product name", () => {
    expect(connectionFromProbe(probed)).toEqual({
      kind: "server",
      label: "Example ERP",
      serverUrl: "https://www.erp.example.com",
      brandColor: "#0f766e",
      initial: "E",
    });
  });

  it("a server with no branding falls back to the platform name and the default colour", () => {
    expect(connectionFromProbe({ ...probed, productName: null, brandColor: null })).toMatchObject({
      label: "ObjectOS",
      brandColor: DEFAULT_BRAND_COLOR,
      initial: "O",
    });
  });

  it("a legacy single URL becomes a private server labelled with its host", () => {
    expect(connectionFromLegacyUrl("https://erp.example.com")).toEqual({
      kind: "server",
      label: "erp.example.com",
      serverUrl: "https://erp.example.com",
      brandColor: DEFAULT_BRAND_COLOR,
      initial: "E",
    });
    // A development build may have saved a plain-http server.
    expect(connectionFromLegacyUrl("http://dev.example.com:3000")?.serverUrl).toBe(
      "http://dev.example.com:3000"
    );
    expect(connectionFromLegacyUrl("")).toBeNull();
    expect(connectionFromLegacyUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("storage form", () => {
  it("round-trips", () => {
    const state = removeConnection(
      rememberRoute(three(), "acme.objectos.ai", "/apps/crm"),
      "erp.example.com",
      { pushLeftRegistered: true }
    );
    const text = serializeConnections(state);
    expect(JSON.parse(text).version).toBe(CONNECTIONS_STORAGE_VERSION);
    expect(parseConnections(text)).toEqual(state);
  });

  it("is not read when it is not this version's document", () => {
    expect(parseConnections("not json")).toBeNull();
    expect(parseConnections("[]")).toBeNull();
    expect(parseConnections(JSON.stringify({ version: 2, connections: [] }))).toBeNull();
    expect(parseConnections(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("drops records that do not check out, and a second record for a host", () => {
    const good = JSON.parse(serializeConnections(three())).connections;
    const text = JSON.stringify({
      version: 1,
      current: "acme.objectos.ai",
      connections: [
        good[0],
        { ...good[0], label: "duplicate" },
        { ...good[1], kind: "workspace" },
        { ...good[2], serverUrl: "javascript:alert(1)" },
        { ...good[2], serverUrl: "https://partner-portal.objectos.ai/" },
        "garbage",
      ],
      pushLeftRegistered: ["x.example.com", 7, "x.example.com"],
    });
    const state = parseConnections(text)!;
    expect(hosts(state)).toEqual(["erp.example.com"]);
    expect(state.list[0].label).toBe("Example ERP");
    // The current host is gone: the first connection is current.
    expect(state.current).toBe("erp.example.com");
    expect(state.pushLeftRegistered).toEqual(["x.example.com"]);
  });

  it("repairs fields it can: label, colour, initial, an unsafe route, the date", () => {
    const text = JSON.stringify({
      version: 1,
      current: null,
      connections: [
        {
          kind: "server",
          label: "  ",
          host: "spoofed.example.com",
          serverUrl: "https://erp.example.com",
          brandColor: "red",
          initial: "",
          lastRoute: "/../api/v1/me",
          addedAt: "yesterday",
        },
      ],
    });
    expect(parseConnections(text)).toEqual({
      list: [
        {
          kind: "server",
          label: "erp.example.com",
          host: "erp.example.com",
          serverUrl: "https://erp.example.com",
          brandColor: DEFAULT_BRAND_COLOR,
          initial: "E",
          lastRoute: null,
          addedAt: 0,
        },
      ],
      current: "erp.example.com",
      pushLeftRegistered: [],
    });
  });
});

describe("managedFrom", () => {
  const managedErp: ConnectionInput = {
    ...erp,
    serverUrl: "https://www.erp.example.com",
    managedFrom: "https://erp.example.com",
  };

  it("is stored and read back; connections the user added carry none", () => {
    const state = addConnection(addConnection(EMPTY_CONNECTIONS, managedErp, 1), acme, 2);
    const read = parseConnections(serializeConnections(state));
    expect(read?.list[0].managedFrom).toBe("https://erp.example.com");
    expect(read?.list[1]).not.toHaveProperty("managedFrom");
  });

  it("a later save of the host without one keeps it; a save with one replaces it", () => {
    let state = addConnection(EMPTY_CONNECTIONS, managedErp, 1);
    state = addConnection(state, { ...erp, serverUrl: "https://www.erp.example.com" }, 2);
    expect(state.list[0].managedFrom).toBe("https://erp.example.com");
    state = addConnection(state, { ...managedErp, managedFrom: "https://erp2.example.com" }, 3);
    expect(state.list[0].managedFrom).toBe("https://erp2.example.com");
  });

  it("a stored value that is not a non-empty string is dropped", () => {
    const text = JSON.stringify({
      version: CONNECTIONS_STORAGE_VERSION,
      current: "erp.example.com",
      connections: [
        { ...erp, managedFrom: 42 },
        { ...acme, managedFrom: "" },
      ],
    });
    const read = parseConnections(text);
    expect(read?.list.map((c) => "managedFrom" in c)).toEqual([false, false]);
  });
});
