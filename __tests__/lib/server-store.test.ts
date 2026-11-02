import type { Connections } from "~/lib/connections/model";
import type { ProbedServer } from "~/lib/server-probe";

const mockLoadConnections = jest.fn<Promise<Connections>, []>();
const mockSaveConnections = jest.fn<Promise<void>, [Connections]>();

jest.mock("~/lib/server-url", () => ({
  loadConnections: () => mockLoadConnections(),
  saveConnections: (state: Connections) => mockSaveConnections(state),
}));

// The native managed-config read, mocked: what the MDM configured, and the
// change subscription the first hydrate starts.
let mockManaged: ManagedConfig = { serverUrl: null, lockServer: false };
let mockOnManagedRead: ((config: ManagedConfig) => void) | null = null;
const mockUnsubscribe = jest.fn();
jest.mock("~/lib/managed-config/native", () => ({
  readManagedConfig: () => mockManaged,
  subscribeManagedConfig: (onRead: (config: ManagedConfig) => void) => {
    mockOnManagedRead = onRead;
    return mockUnsubscribe;
  },
}));

import { EMPTY_CONNECTIONS, addConnection, connectionFromProbe } from "~/lib/connections/model";
import { NO_MANAGED_CONFIG, type ManagedConfig } from "~/lib/managed-config/model";
import {
  LOCKED_SERVER_MESSAGE,
  stopManagedConfigFollowing,
  useServerStore,
} from "~/stores/server-store";

function probed(serverUrl: string, productName: string): ProbedServer {
  return {
    serverUrl,
    secure: true,
    platformName: "ObjectOS",
    version: "17.4.0",
    productName,
    logoUrl: null,
    brandColor: "#0f766e",
    signIn: null,
  };
}

const ERP = probed("https://erp.example.com", "Example ERP");
const ACME = probed("https://acme.example.com", "Acme");

/** The store as `hydrate` would leave it after loading `state`. */
async function hydrated(state: Connections) {
  mockLoadConnections.mockResolvedValue(state);
  await useServerStore.getState().hydrate();
}

/** The last document written. */
const lastSaved = () => mockSaveConnections.mock.calls.at(-1)?.[0];

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveConnections.mockResolvedValue(undefined);
  mockManaged = NO_MANAGED_CONFIG;
  stopManagedConfigFollowing();
  mockOnManagedRead = null;
  useServerStore.setState({
    connections: [],
    currentHost: null,
    pushLeftRegistered: [],
    serverUrl: null,
    isReady: false,
    managed: NO_MANAGED_CONFIG,
    managedDeclined: null,
  });
});

describe("server-store", () => {
  it("starts with no connections and not ready", () => {
    const s = useServerStore.getState();
    expect(s.connections).toEqual([]);
    expect(s.serverUrl).toBeNull();
    expect(s.isReady).toBe(false);
  });

  it("hydrates the saved connections (a migrated single URL among them) and becomes ready", async () => {
    await hydrated(addConnection(EMPTY_CONNECTIONS, connectionFromProbe(ERP), 1));
    expect(useServerStore.getState()).toMatchObject({
      currentHost: "erp.example.com",
      serverUrl: "https://erp.example.com",
      isReady: true,
    });
  });

  it("becomes ready with no server on first launch", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    expect(useServerStore.getState()).toMatchObject({ serverUrl: null, isReady: true });
  });

  it("connect persists, then publishes the server as the current connection", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    let publishedBeforeSave: string | null = "unset";
    mockSaveConnections.mockImplementation(async () => {
      publishedBeforeSave = useServerStore.getState().serverUrl;
    });
    await useServerStore.getState().connect(ERP);

    expect(publishedBeforeSave).toBeNull();
    expect(lastSaved()?.current).toBe("erp.example.com");
    expect(useServerStore.getState()).toMatchObject({
      serverUrl: "https://erp.example.com",
      currentHost: "erp.example.com",
    });
    expect(useServerStore.getState().connections[0]).toMatchObject({
      kind: "server",
      label: "Example ERP",
      brandColor: "#0f766e",
      initial: "E",
    });
  });

  it("connect publishes nothing when storage refuses it", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    mockSaveConnections.mockRejectedValueOnce(new Error("keychain unavailable"));
    await expect(useServerStore.getState().connect(ERP)).rejects.toThrow("keychain unavailable");
    expect(useServerStore.getState().serverUrl).toBeNull();
  });

  it("connect to a saved host refreshes that connection instead of adding one", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().connect(ACME);
    await useServerStore.getState().connect({ ...ERP, productName: "ERP 2" });
    const { connections, currentHost } = useServerStore.getState();
    expect(connections.map((c) => [c.host, c.label])).toEqual([
      ["erp.example.com", "ERP 2"],
      ["acme.example.com", "Acme"],
    ]);
    expect(currentHost).toBe("erp.example.com");
  });

  it("select switches the current connection and persists it", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().connect(ACME);
    await useServerStore.getState().select("erp.example.com");
    expect(useServerStore.getState().serverUrl).toBe("https://erp.example.com");
    expect(lastSaved()?.current).toBe("erp.example.com");

    mockSaveConnections.mockClear();
    await useServerStore.getState().select("erp.example.com");
    await useServerStore.getState().select("unknown.example.com");
    expect(mockSaveConnections).not.toHaveBeenCalled();
  });

  it("remove of the current connection hands over to the first remaining one", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().connect(ACME);
    await useServerStore.getState().remove("acme.example.com", { pushLeftRegistered: true });
    expect(useServerStore.getState()).toMatchObject({
      currentHost: "erp.example.com",
      serverUrl: "https://erp.example.com",
      pushLeftRegistered: ["acme.example.com"],
    });
    expect(lastSaved()?.list.map((c) => c.host)).toEqual(["erp.example.com"]);
  });

  it("keeps the change in memory when a quiet write fails", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    mockSaveConnections.mockRejectedValueOnce(new Error("keychain unavailable"));
    await expect(useServerStore.getState().remove("erp.example.com")).resolves.toBeUndefined();
    expect(useServerStore.getState().serverUrl).toBeNull();
  });

  it("rememberRoute records the route on the connection it belongs to", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().connect(ACME);
    useServerStore.getState().rememberRoute("https://erp.example.com", "/apps/crm");
    useServerStore.getState().rememberRoute("https://unknown.example.com", "/apps/hr");
    useServerStore.getState().rememberRoute("not a url", "/apps/hr");
    await Promise.resolve();
    expect(useServerStore.getState().connections.map((c) => c.lastRoute)).toEqual([
      "/apps/crm",
      null,
    ]);
    expect(lastSaved()?.list[0].lastRoute).toBe("/apps/crm");
  });

  it("writes in the order the changes were made", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().connect(ACME);
    let release: () => void = () => {};
    mockSaveConnections.mockClear();
    mockSaveConnections.mockImplementationOnce(() => new Promise<void>((r) => (release = r)));
    const first = useServerStore.getState().select("erp.example.com");
    useServerStore.getState().rememberRoute("https://erp.example.com", "/apps/crm");
    await Promise.resolve();
    expect(mockSaveConnections).toHaveBeenCalledTimes(1);
    release();
    await first;
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSaveConnections).toHaveBeenCalledTimes(2);
    expect(lastSaved()?.list[0].lastRoute).toBe("/apps/crm");
  });

  it("reset forgets the current connection", async () => {
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(ERP);
    await useServerStore.getState().reset();
    expect(useServerStore.getState()).toMatchObject({ serverUrl: null, connections: [] });
    expect(lastSaved()).toEqual(EMPTY_CONNECTIONS);
    await expect(useServerStore.getState().reset()).resolves.toBeUndefined();
  });
});

describe("server-store — managed config", () => {
  const MANAGED: ManagedConfig = { serverUrl: "https://erp.example.com", lockServer: false };
  const LOCKED: ManagedConfig = { ...MANAGED, lockServer: true };
  /** ERP and Acme saved, Acme current. */
  const bothSavedAcmeCurrent = () => {
    const both = addConnection(
      addConnection(EMPTY_CONNECTIONS, connectionFromProbe(ERP), 1),
      connectionFromProbe(ACME),
      2
    );
    return { ...both, current: "acme.example.com" };
  };

  it("hydrate publishes the managed config and starts following it once", async () => {
    mockManaged = LOCKED;
    await hydrated(EMPTY_CONNECTIONS);
    expect(useServerStore.getState().managed).toEqual(LOCKED);
    expect(mockOnManagedRead).not.toBeNull();
    const first = mockOnManagedRead;
    await hydrated(EMPTY_CONNECTIONS);
    expect(mockOnManagedRead).toBe(first);
  });

  it("managed wins over the stored current connection on launch", async () => {
    mockManaged = MANAGED;
    await hydrated(bothSavedAcmeCurrent());
    expect(useServerStore.getState()).toMatchObject({
      currentHost: "erp.example.com",
      serverUrl: "https://erp.example.com",
    });
    expect(lastSaved()?.current).toBe("erp.example.com");
  });

  it("without managed config, the stored current connection stays and nothing is written", async () => {
    await hydrated(bothSavedAcmeCurrent());
    expect(useServerStore.getState().currentHost).toBe("acme.example.com");
    expect(mockSaveConnections).not.toHaveBeenCalled();
  });

  it("connect records the managed address a server was confirmed from (the probe may redirect)", async () => {
    mockManaged = MANAGED;
    await hydrated(EMPTY_CONNECTIONS);
    await useServerStore.getState().connect(probed("https://www.erp.example.com", "Example ERP"), {
      managedFrom: "https://erp.example.com",
    });
    expect(lastSaved()?.list[0]).toMatchObject({
      host: "www.erp.example.com",
      managedFrom: "https://erp.example.com",
    });
    // A later save of that host without it keeps the record's origin.
    await useServerStore.getState().connect(probed("https://www.erp.example.com", "ERP 2"));
    expect(useServerStore.getState().connections[0].managedFrom).toBe("https://erp.example.com");
  });

  it("a changed managed config is published and its saved connection made current", async () => {
    await hydrated(bothSavedAcmeCurrent());
    mockOnManagedRead?.(MANAGED);
    expect(useServerStore.getState()).toMatchObject({
      managed: MANAGED,
      currentHost: "erp.example.com",
    });
    await Promise.resolve();
    expect(lastSaved()?.current).toBe("erp.example.com");
  });

  it("an unchanged reading (every foreground) leaves the user's own switch alone", async () => {
    mockManaged = MANAGED;
    await hydrated(bothSavedAcmeCurrent());
    await useServerStore.getState().select("acme.example.com");
    mockSaveConnections.mockClear();
    mockOnManagedRead?.({ ...MANAGED });
    expect(useServerStore.getState().currentHost).toBe("acme.example.com");
    expect(mockSaveConnections).not.toHaveBeenCalled();
  });

  it("declining is for the unlocked managed address only, and ends when the MDM pushes another", async () => {
    mockManaged = MANAGED;
    await hydrated(EMPTY_CONNECTIONS);
    useServerStore.getState().declineManaged();
    expect(useServerStore.getState().managedDeclined).toBe("https://erp.example.com");

    useServerStore.getState().applyManaged({ ...MANAGED, lockServer: true });
    expect(useServerStore.getState().managedDeclined).toBe("https://erp.example.com");
    useServerStore
      .getState()
      .applyManaged({ serverUrl: "https://new.example.com", lockServer: false });
    expect(useServerStore.getState().managedDeclined).toBeNull();

    useServerStore
      .getState()
      .applyManaged({ serverUrl: "https://new.example.com", lockServer: true });
    useServerStore.getState().declineManaged();
    expect(useServerStore.getState().managedDeclined).toBeNull();
  });

  it("reset refuses the managed connection while the server is locked", async () => {
    mockManaged = LOCKED;
    await hydrated(addConnection(EMPTY_CONNECTIONS, connectionFromProbe(ERP), 1));
    await expect(useServerStore.getState().reset()).rejects.toThrow(LOCKED_SERVER_MESSAGE);
    expect(useServerStore.getState().connections).toHaveLength(1);
    expect(mockSaveConnections).not.toHaveBeenCalled();

    // Unlocked, it forgets it as before.
    useServerStore.getState().applyManaged(MANAGED);
    await useServerStore.getState().reset();
    expect(useServerStore.getState().connections).toHaveLength(0);
  });
});
