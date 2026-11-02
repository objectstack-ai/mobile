import { parseHostList } from "~/lib/shell/config";

describe("parseHostList", () => {
  it("splits, trims, lower-cases and de-duplicates", () => {
    expect(parseHostList(" Login.IdP.example , idp.example,,login.idp.example")).toEqual([
      "login.idp.example",
      "idp.example",
    ]);
  });

  it("returns an empty list for nothing", () => {
    expect(parseHostList(undefined)).toEqual([]);
    expect(parseHostList("")).toEqual([]);
  });
});
