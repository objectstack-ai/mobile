/* eslint-env node */
/**
 * Config plugin of the local `managed-config` module (docs/DEPLOYMENT.md, "MDM").
 *
 * Android only: declares the managed configuration the app reads, so an EMM
 * console can show the keys to an IT admin (`res/xml/app_restrictions.xml`,
 * referenced from `<application>` as `android.content.APP_RESTRICTIONS`).
 * iOS needs nothing at build time: a managed app configuration is a plain
 * dictionary the MDM server installs under `com.apple.configuration.managed`.
 *
 * The keys must stay equal to `MANAGED_CONFIG_KEYS` in
 * `lib/managed-config/model.ts`; `__tests__/lib/managed-config/plugin.test.ts`
 * pins it.
 */
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const RESTRICTIONS_META_DATA = "android.content.APP_RESTRICTIONS";
const RESTRICTIONS_RESOURCE = "@xml/app_restrictions";

/** What the EMM console shows for each key. Not localized: one file serves every locale. */
const RESTRICTIONS = [
  {
    key: "serverUrl",
    type: "string",
    title: ["managed_config_server_url_title", "Server URL"],
    description: [
      "managed_config_server_url_description",
      "The ObjectOS server the app opens, e.g. https://erp.example.com. The app still checks the server and asks the user to confirm it before signing in.",
    ],
  },
  {
    key: "lockServer",
    type: "bool",
    defaultValue: "false",
    title: ["managed_config_lock_server_title", "Lock the server"],
    description: [
      "managed_config_lock_server_description",
      "When true, users cannot add another server or remove the managed one.",
    ],
  },
];

/** `res/xml/app_restrictions.xml`. */
function restrictionsXml() {
  const entries = RESTRICTIONS.map((r) =>
    [
      "  <restriction",
      `    android:key="${r.key}"`,
      `    android:title="@string/${r.title[0]}"`,
      `    android:description="@string/${r.description[0]}"`,
      `    android:restrictionType="${r.type}"`,
      ...(r.defaultValue !== undefined ? [`    android:defaultValue="${r.defaultValue}"`] : []),
      "  />",
    ].join("\n")
  );
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<restrictions xmlns:android="http://schemas.android.com/apk/res/android">',
    ...entries,
    "</restrictions>",
    "",
  ].join("\n");
}

/** Adds the `APP_RESTRICTIONS` meta-data to the manifest's `<application>`. */
function withRestrictionsManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      RESTRICTIONS_META_DATA,
      RESTRICTIONS_RESOURCE,
      "resource"
    );
    return mod;
  });
}

/** The titles and descriptions as string resources. */
function withRestrictionsStrings(config) {
  return withStringsXml(config, (mod) => {
    const items = RESTRICTIONS.flatMap((r) => [r.title, r.description]).map(([name, value]) =>
      AndroidConfig.Resources.buildResourceItem({ name, value, translatable: false })
    );
    mod.modResults = AndroidConfig.Strings.setStringItem(items, mod.modResults);
    return mod;
  });
}

/** Writes `res/xml/app_restrictions.xml`. */
function withRestrictionsFile(config) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const dir = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, "app_restrictions.xml"), restrictionsXml());
      return mod;
    },
  ]);
}

function withManagedConfig(config) {
  return withRestrictionsFile(withRestrictionsStrings(withRestrictionsManifest(config)));
}

module.exports = withManagedConfig;
module.exports.RESTRICTIONS = RESTRICTIONS;
module.exports.restrictionsXml = restrictionsXml;
