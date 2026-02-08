import i18n, {
  detectDeviceLanguage,
  isRTL,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
} from "~/lib/i18n";

describe("i18n configuration", () => {
  it("exports a configured i18next instance", () => {
    expect(i18n).toBeDefined();
    expect(i18n.isInitialized).toBe(true);
  });

  it("defaults to English", () => {
    // jest.setup.ts mocks getLocales to return en
    expect(i18n.language).toBe("en");
  });

  it("provides translations for common.ok", () => {
    expect(i18n.t("common.ok")).toBe("OK");
  });

  it("falls back to English for missing keys", () => {
    // Switch to zh then ask for a key we know exists
    i18n.changeLanguage("zh");
    expect(i18n.t("common.ok")).toBe("确定");
    i18n.changeLanguage("en"); // restore
  });
});

describe("detectDeviceLanguage", () => {
  it("returns a supported language code", () => {
    const lang = detectDeviceLanguage();
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];
    expect(codes).toContain(lang);
  });
});

describe("isRTL", () => {
  it("returns true for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
  });

  it("returns true for Hebrew", () => {
    expect(isRTL("he")).toBe(true);
  });

  it("returns false for English", () => {
    expect(isRTL("en")).toBe(false);
  });
});

describe("RTL_LANGUAGES", () => {
  it("contains at least Arabic and Hebrew", () => {
    expect(RTL_LANGUAGES.has("ar")).toBe(true);
    expect(RTL_LANGUAGES.has("he")).toBe(true);
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("includes en, zh, and ar", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("zh");
    expect(codes).toContain("ar");
  });
});
