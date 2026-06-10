import { fetchServerAuthConfig } from "~/lib/server-auth-config";

describe("fetchServerAuthConfig", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns config with socialProviders on success", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ socialProviders: ["google", "apple"] }),
    }) as jest.Mock;

    const result = await fetchServerAuthConfig("https://api.example.com");
    expect(result).toEqual({ socialProviders: ["google", "apple"] });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/auth/config",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("strips trailing slashes from the base URL", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ socialProviders: ["google"] }),
    }) as jest.Mock;

    await fetchServerAuthConfig("https://api.example.com///");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/auth/config",
      expect.any(Object),
    );
  });

  it("returns null when response is not ok", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as jest.Mock;

    const result = await fetchServerAuthConfig("https://api.example.com");
    expect(result).toBeNull();
  });

  it("returns null when socialProviders is missing", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ someOtherField: "value" }),
    }) as jest.Mock;

    const result = await fetchServerAuthConfig("https://api.example.com");
    expect(result).toBeNull();
  });

  it("returns null when socialProviders is not an array", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ socialProviders: "google" }),
    }) as jest.Mock;

    const result = await fetchServerAuthConfig("https://api.example.com");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network error")) as jest.Mock;

    const result = await fetchServerAuthConfig("https://unreachable.com");
    expect(result).toBeNull();
  });

  it("returns config with empty socialProviders array", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ socialProviders: [] }),
    }) as jest.Mock;

    const result = await fetchServerAuthConfig("https://api.example.com");
    expect(result).toEqual({ socialProviders: [] });
  });
});
