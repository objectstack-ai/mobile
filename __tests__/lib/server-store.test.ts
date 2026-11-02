import type { Connections } from "~/lib/connections/model";
import type { ProbedServer } from "~/lib/server-probe";

const mockLoadConnections = jest.fn<Promise<Connections>, []>();
const mockSaveConnections = jest.fn<Promise<void>, [Connections]>();

jest.mock("~/lib/server-url", () => ({
  loadConnections: () => mockLoadConnections(),
  saveConnections: (state: Connections) => mockSaveConnections(state),
}));

import { EMPTY_CONNECTIONS, addConnection, connectionFromProbe } from "~/lib/connections/model";
import { useServerStore } from "~/stores/server-store";

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
  useServerStore.setState({
    connections: [],
    currentHost: null,
    pushLeftRegistered: [],
    serverUrl: null,
    isReady: false,
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
