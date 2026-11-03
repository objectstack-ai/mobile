import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { AppState } from "react-native";
import i18n, {
  DEFAULT_LANGUAGE,
  detectDeviceLanguage,
  followDeviceLanguage,
  followDeviceLanguageOnForeground,
  isRTL,
  resolveLanguage,
  resolveLanguageTag,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
} from "~/lib/i18n";

/**
 * The platform's one list of 11 language tags, in the table's order
 * (objectstack-ai/objectstack#29428, ruling F of #29349). The shell must match
 * this list one-to-one.
 */
const PLATFORM_LANGUAGE_TAGS = [
  "en",
  "zh-Hans",
  "zh-Hant",
  "es",
  "ar",
  "fr",
  "pt-BR",
  "ru",
  "de",
  "ja",
  "ko",
];

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
    await i18n.changeLanguage("zh-Hans");
    expect(i18n.t("common.ok")).toBe("确定");
    await i18n.changeLanguage("zh-Hant");
    expect(i18n.t("common.ok")).toBe("確定");
    await i18n.changeLanguage("pt-BR");
    expect(i18n.t("common.cancel")).toBe("Cancelar");
    await i18n.changeLanguage("ja");
    expect(i18n.t("serverConfirm.signIn.emailPassword")).toBe("メールアドレスとパスワード");
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("is exactly the platform's 11 language tags, in the table's order", () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(PLATFORM_LANGUAGE_TAGS);
  });

  it("names every language in its own language", () => {
    for (const { label } of SUPPORTED_LANGUAGES) expect(label).not.toBe("");
  });

  it("has one bundle per language and no other bundle", () => {
    const bundles = readdirSync(LOCALES_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(bundles).toEqual([...PLATFORM_LANGUAGE_TAGS].sort());
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

  it.each(PLATFORM_LANGUAGE_TAGS.filter((c) => c !== "en"))(
    "%s carries every native string key en has, and no other",
    (code) => {
      const bundle = flatten(read(code));
      const missing = Object.keys(en).filter((k) => !(k in bundle));
      const extra = Object.keys(bundle).filter((k) => !(k in en));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    }
  );

  it.each(PLATFORM_LANGUAGE_TAGS)("%s has no empty string and keeps every placeholder", (code) => {
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

describe("resolveLanguageTag — the platform's alias rule, by script", () => {
  // objectstack-ai/objectstack#29428, phase 1: each read alias it declares.
  it.each([
    ["zh", "zh-Hans"],
    ["zh-CN", "zh-Hans"],
    ["zh-SG", "zh-Hans"],
    ["zh-TW", "zh-Hant"],
    ["zh-HK", "zh-Hant"],
    ["zh-MO", "zh-Hant"],
    ["ja-JP", "ja"],
    ["es-ES", "es"],
    ["pt", "pt-BR"],
    ["en-US", "en"],
  ])("resolves the platform alias %s to %s", (tag, code) => {
    expect(resolveLanguageTag(tag)).toBe(code);
  });

  it("lets an explicit script subtag decide over the region", () => {
    expect(resolveLanguageTag("zh-Hant-TW")).toBe("zh-Hant");
    expect(resolveLanguageTag("zh-Hant-CN")).toBe("zh-Hant");
    expect(resolveLanguageTag("zh-Hans-HK")).toBe("zh-Hans");
    expect(resolveLanguageTag("zh-Hans-MO")).toBe("zh-Hans");
  });

  it("compares subtags case-insensitively, as BCP 47 defines them", () => {
    expect(resolveLanguageTag("ZH-hant")).toBe("zh-Hant");
    expect(resolveLanguageTag("zh-tw")).toBe("zh-Hant");
    expect(resolveLanguageTag("PT-pt")).toBe("pt-BR");
    expect(resolveLanguageTag("EN")).toBe("en");
  });

  it("never reads an extension value as the region", () => {
    expect(resolveLanguageTag("zh-u-rg-twzzzz")).toBe("zh-Hans");
    expect(resolveLanguageTag("zh-CN-u-nu-hanidec")).toBe("zh-Hans");
    expect(resolveLanguageTag("zh-x-tw")).toBe("zh-Hans");
  });

  it("answers null for a language with no bundle", () => {
    expect(resolveLanguageTag("it-IT")).toBeNull();
    expect(resolveLanguageTag("yue-HK")).toBeNull();
    expect(resolveLanguageTag("")).toBeNull();
  });
});

describe("detectDeviceLanguage", () => {
  it.each(PLATFORM_LANGUAGE_TAGS)("resolves the table tag %s to itself", (code) => {
    expect(detectDeviceLanguage(tags(code))).toBe(code);
  });

  it.each([
    ["en-US", "en"],
    ["ja-JP", "ja"],
    ["ko-KR", "ko"],
    ["de-DE", "de"],
    ["fr-FR", "fr"],
    ["es-ES", "es"],
    ["es-MX", "es"],
    ["ru-RU", "ru"],
    ["ar-SA", "ar"],
  ])("resolves the region tag %s to its primary subtag %s", (tag, code) => {
    expect(detectDeviceLanguage(tags(tag))).toBe(code);
  });

  it.each(["zh-Hans-CN", "zh-CN", "zh-SG", "zh"])("resolves Simplified Chinese %s to zh-Hans", (tag) => {
    expect(detectDeviceLanguage(tags(tag))).toBe("zh-Hans");
  });

  it.each(["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-TW", "zh-Hant-HK"])(
    "resolves Traditional Chinese %s to zh-Hant",
    (tag) => {
      expect(detectDeviceLanguage(tags(tag))).toBe("zh-Hant");
    }
  );

  it.each(["pt-PT", "pt-BR", "pt-AO", "pt"])("resolves Portuguese %s to pt-BR", (tag) => {
    expect(detectDeviceLanguage(tags(tag))).toBe("pt-BR");
  });

  it("falls through an unsupported first language to the next supported one", () => {
    expect(detectDeviceLanguage(tags("he-IL", "ja-JP", "en-US"))).toBe("ja");
    expect(detectDeviceLanguage(tags("tlh", "it-IT", "pt-PT"))).toBe("pt-BR");
    expect(detectDeviceLanguage(tags("yue-HK", "zh-HK", "en-US"))).toBe("zh-Hant");
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

  it("keeps the script and region of a locale that has no languageTag", () => {
    expect(
      detectDeviceLanguage([{ languageCode: "zh", languageScriptCode: "Hant", regionCode: "TW" }])
    ).toBe("zh-Hant");
    expect(detectDeviceLanguage([{ languageCode: "zh", regionCode: "HK" }])).toBe("zh-Hant");
    expect(detectDeviceLanguage([{ languageCode: "zh", regionCode: "CN" }])).toBe("zh-Hans");
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
    expect(i18n.t("shell.retry")).toBe("Erneut versuchen");
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
    for (const code of PLATFORM_LANGUAGE_TAGS.filter((c) => c !== "ar")) {
      expect(isRTL(code)).toBe(false);
    }
  });
});

describe("RTL_LANGUAGES", () => {
  it("matches the Console's RTL list (locales/rtl.ts)", () => {
    expect([...RTL_LANGUAGES].sort()).toEqual(["ar", "fa", "he", "ur"]);
  });
});
