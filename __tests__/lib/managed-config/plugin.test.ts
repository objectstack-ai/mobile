/**
 * The module's config plugin (Android `app_restrictions.xml`). A full
 * `expo prebuild --platform android` run is recorded in the PR; this pins what
 * the file declares against the keys the shell reads.
 */
import { MANAGED_CONFIG_KEYS } from "~/lib/managed-config/model";

const plugin = require("~/modules/managed-config/app.plugin.js");

describe("managed-config config plugin", () => {
  it("declares exactly the keys the shell reads", () => {
    expect(plugin.RESTRICTIONS.map((r: { key: string }) => r.key)).toEqual([
      ...MANAGED_CONFIG_KEYS,
    ]);
  });

  it("writes a restrictions file with each key's type and string-resource title", () => {
    const xml: string = plugin.restrictionsXml();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="utf-8"\?>\n<restrictions /);
    expect(xml).toContain('android:key="serverUrl"');
    expect(xml).toContain('android:restrictionType="string"');
    expect(xml).toContain('android:key="lockServer"');
    expect(xml).toContain('android:restrictionType="bool"');
    expect(xml).toContain('android:defaultValue="false"');
    expect(xml).toContain('android:title="@string/managed_config_server_url_title"');
    expect(xml).not.toContain("trustedHosts");
  });

  it("is a config plugin function", () => {
    expect(typeof plugin).toBe("function");
  });
});
