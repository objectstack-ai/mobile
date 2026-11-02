import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { AppState } from "react-native";
import i18n, {
  DEFAULT_LANGUAGE,
  detectDeviceLanguage,
  followDeviceLanguage,
  followDeviceLanguageOnForeground,
  isRTL,
  matchLanguageTag,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
} from "~/lib/i18n";

/**
 * The Console UI's ten built-in catalogue codes, in its order (objectstack
 * `ui/packages/i18n/src/locales/registry.ts`, `BUILT_IN_LANGUAGE_CODES`).
 * The shell must match this list one-to-one.
 */
const CONSOLE_LANGUAGE_CODES = ["en", "zh", "ja", "ko", "de", "fr", "es", "pt", "ru", "ar"];

// jest.setup.ts mocks this module without a `default`, which is what
// `react-native`'s `AppState` getter reads; give it one for this file.
jest.mock("react-native/Libraries/AppState/AppState", () => {
  const appState = {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return { __esModule: true, default: appState, ...appState };
});

// The module object `~/lib/i18n` calls `getLocales` on, so a spy reaches it.
const Localization = jest.requireMock("expo-localization") as typeof import("expo-localization");

const LOCALES_DIR = join(__dirname, "..", "..", "locales");

const tags = (...languageTags: string[]) => languageTags.map((languageTag) => ({ languageTag }));

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("i18n configuration", () => {
  it("exports a configured i18next instance", () => {
    expect(i18n).toBeDefined();
    expect(i18n.isInitialized).toBe(true);
  });

  it("starts in English when the phone is set to English", () => {
    // jest.setup.ts mocks getLocales to return en-US
    expect(i18n.language).toBe("en");
  });

  it("provides translations for common.ok", () => {
    expect(i18n.t("common.ok")).toBe("OK");
  });

  it("translates through the active bundle", async () => {
    await i18n.changeLanguage("zh");
    expect(i18n.t("common.ok")).toBe("确定");
    await i18n.changeLanguage("ja");
    expect(i18n.t("serverConfirm.signIn.emailPassword")).toBe("メールアドレスとパスワード");
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("is exactly the Console UI's ten locale codes, in the Console's order", () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(CONSOLE_LANGUAGE_CODES);
  });

  it("names every language in its own language", () => {
    for (const { label } of SUPPORTED_LANGUAGES) expect(label).not.toBe("");
  });

  it("has one bundle per language and no other bundle", () => {
    const bundles = readdirSync(LOCALES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(bundles).toEqual([...CONSOLE_LANGUAGE_CODES].sort());
  });
});

describe("locale bundles", () => {
  type Tree = { [key: string]: string | Tree };
  const read = (code: string): Tree =>
    JSON.parse(readFileSync(join(LOCALES_DIR, `${code}.json`), "utf8")) as Tree;
  const flatten = (tree: Tree, prefix = ""): Record<string, string> =>
    Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string"
        ? { ...out, [path]: value }
        : { ...out, ...flatten(value, path) };
    }, {});
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

  const en = flatten(read("en"));

  it.each(CONSOLE_LANGUAGE_CODES.filter((c) => c !== "en"))(
    "%s carries every native string key en has, and no other",
    (code) => {
      const bundle = flatten(read(code));
      const missing = Object.keys(en).filter((k) => !(k in bundle));
      const extra = Object.keys(bundle).filter((k) => !(k in en));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    }
  );

  it.each(CONSOLE_LANGUAGE_CODES)("%s has no empty string and keeps every placeholder", (code) => {
    const bundle = flatten(read(code));
    for (const [key, value] of Object.entries(bundle)) {
      expect({ key, empty: value.trim() === "" }).toEqual({ key, empty: false });
      expect({ key, placeholders: placeholders(value) }).toEqual({
        key,
        placeholders: placeholders(en[key] ?? ""),
      });
    }
  });
});

describe("matchLanguageTag — the Console's exact-then-base rule", () => {
  // The Console's own pins (region-locale-fallback-11326.test.tsx), ported.
  it("prefers an exact match over the base language, and falls back to the base", () => {
    const has = (code: string) => code === "pt" || code === "pt-BR";
    expect(matchLanguageTag("pt-BR", has)).toBe("pt-BR");
    expect(matchLanguageTag("pt-PT", has)).toBe("pt");
    expect(matchLanguageTag("pt", has)).toBe("pt");
    expect(matchLanguageTag("xx-YY", has)).toBeNull();
  });
});

describe("detectDeviceLanguage", () => {
  it.each(CONSOLE_LANGUAGE_CODES)("resolves the bare code %s to itself", (code) => {
    expect(detectDeviceLanguage(tags(code))).toBe(code);
  });

  it.each([
    ["en-US", "en"],
    ["zh-CN", "zh"],
    ["ja-JP", "ja"],
    ["ko-KR", "ko"],
    ["de-DE", "de"],
    ["fr-FR", "fr"],
    ["es-ES", "es"],
    ["pt-PT", "pt"],
    ["ru-RU", "ru"],
    ["ar-SA", "ar"],
  ])("resolves the region tag %s to %s", (tag, code) => {
    expect(detectDeviceLanguage(tags(tag))).toBe(code);
  });

  it.each([
    ["zh-Hans-CN", "zh"],
    ["pt-BR", "pt"],
    ["es-MX", "es"],
  ])("resolves %s to %s", (tag, code) => {
    expect(detectDeviceLanguage(tags(tag))).toBe(code);
  });

  // The Console has no Traditional Chinese catalogue, and its rule resolves a
  // `zh-*` tag to its base `zh` (registry.ts `matchLanguageTag`). The shell
  // follows that rule rather than inventing a different one.
  it.each(["zh-TW", "zh-HK", "zh-Hant", "zh-Hant-TW", "zh-Hant-HK"])(
    "resolves Traditional Chinese %s to zh, as the Console does",
    (tag) => {
      expect(detectDeviceLanguage(tags(tag))).toBe("zh");
    }
  );

  it("falls through an unsupported first language to the next supported one", () => {
    expect(detectDeviceLanguage(tags("he-IL", "ja-JP", "en-US"))).toBe("ja");
    expect(detectDeviceLanguage(tags("tlh", "it-IT", "pt-BR"))).toBe("pt");
  });

  it("falls back to en when no preferred language is supported", () => {
    expect(detectDeviceLanguage(tags("it-IT", "nl-NL"))).toBe(DEFAULT_LANGUAGE);
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("falls back to en for an empty locale list", () => {
    expect(detectDeviceLanguage([])).toBe("en");
  });

  it("uses languageCode when a locale has no languageTag", () => {
    expect(detectDeviceLanguage([{ languageTag: "", languageCode: "ko" }])).toBe("ko");
  });

  it("reads the phone's languages when none are passed", () => {
    const spy = jest
      .spyOn(Localization, "getLocales")
      .mockReturnValue(tags("fr-CA") as ReturnType<typeof Localization.getLocales>);
    expect(detectDeviceLanguage()).toBe("fr");
    spy.mockRestore();
  });

  it("falls back to en when reading the phone's languages throws", () => {
    const spy = jest.spyOn(Localization, "getLocales").mockImplementation(() => {
      throw new Error("native module unavailable");
    });
    expect(detectDeviceLanguage()).toBe("en");
    spy.mockRestore();
  });
});

describe("resolveLanguage", () => {
  it("skips empty entries", () => {
    expect(resolveLanguage([null, undefined, "", "ru-RU"])).toBe("ru");
  });
});

describe("following the phone language", () => {
  it("switches the shell to the phone's current language", async () => {
    await expect(followDeviceLanguage(tags("de-AT"))).resolves.toBe("de");
    expect(i18n.language).toBe("de");
    expect(i18n.t("shell.changeServer")).toBe("Anderen Server verwenden");
  });

  it("re-reads the phone's languages when the app comes back to the foreground", async () => {
    const addEventListener = AppState.addEventListener as jest.Mock;
    const remove = jest.fn();
    addEventListener.mockReturnValueOnce({ remove });
    const spy = jest
      .spyOn(Localization, "getLocales")
      .mockReturnValue(tags("ar-EG") as ReturnType<typeof Localization.getLocales>);

    const stop = followDeviceLanguageOnForeground();
    const [event, listener] = addEventListener.mock.calls.at(-1) as [
      string,
      (state: string) => void,
    ];
    expect(event).toBe("change");

    // Going to the background changes nothing yet.
    listener("background");
    expect(i18n.language).toBe("en");

    listener("active");
    await new Promise((r) => setTimeout(r, 0));
    expect(i18n.language).toBe("ar");

    stop();
    expect(remove).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("isRTL", () => {
  it("returns true for Arabic", () => {
    expect(isRTL("ar")).toBe(true);
  });

  it("returns true for Hebrew", () => {
    expect(isRTL("he")).toBe(true);
  });

  it("returns false for every other shell language", () => {
    for (const code of CONSOLE_LANGUAGE_CODES.filter((c) => c !== "ar")) {
      expect(isRTL(code)).toBe(false);
    }
  });
});

describe("RTL_LANGUAGES", () => {
  it("matches the Console's RTL list (locales/rtl.ts)", () => {
    expect([...RTL_LANGUAGES].sort()).toEqual(["ar", "fa", "he", "ur"]);
  });
});
