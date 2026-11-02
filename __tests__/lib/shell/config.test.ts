import { parseHostList } from "~/lib/shell/config";

describe("parseHostList", () => {
  it("splits, trims, lower-cases and de-duplicates", () => {
    expect(parseHostList(" Login.IdP.example , idp.example,,login.idp.example")).toEqual([
      "login.idp.example",
      "idp.example",
    ]);
  });

  it("drops a default port so entries match parsed URL hosts", () => {
    expect(parseHostList("idp.example.com:443, sso.example.com:80, alt.example.com:8443")).toEqual([
      "idp.example.com",
      "sso.example.com",
      "alt.example.com:8443",
    ]);
    expect(parseHostList("idp.example.com, IDP.example.com:443")).toEqual(["idp.example.com"]);
  });

  it("returns an empty list for nothing", () => {
    expect(parseHostList(undefined)).toEqual([]);
    expect(parseHostList("")).toEqual([]);
  });
});
