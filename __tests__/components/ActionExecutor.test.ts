/**
 * Tests for the v7 Action protocol in ActionExecutor:
 * `${param.X}` / `${ctx.X}` target interpolation, flow execution via
 * `client.automation.execute`, and `resultDialog` passthrough.
 */
import { Linking } from "react-native";
import {
  executeAction,
  interpolate,
} from "~/components/actions/ActionExecutor";
import { getByPath } from "~/components/actions/ResultDialog";
import type { ActionMeta } from "~/components/renderers/types";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const mockExecute = jest.fn();
const mockTrigger = jest.fn();
const client = { automation: { execute: mockExecute, trigger: mockTrigger } } as any;

beforeEach(() => {
  mockExecute.mockReset();
  mockTrigger.mockReset();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
});

describe("interpolate", () => {
  const ctx = {
    objectName: "crm_account",
    recordId: "acc-1",
    record: { email: "a@b.com", name: "Acme" },
    params: { reason: "cleanup" },
    userId: "user-9",
  };

  it("resolves ${ctx.X} from ids and record fields", () => {
    expect(interpolate("/r/${ctx.objectName}/${ctx.recordId}", ctx)).toBe(
      "/r/crm_account/acc-1",
    );
    expect(interpolate("mailto:${ctx.email}", ctx)).toBe("mailto:a@b.com");
    expect(interpolate("${ctx.record.name}", ctx)).toBe("Acme");
    expect(interpolate("${ctx.userId}", ctx)).toBe("user-9");
  });

  it("resolves ${param.X} from action params", () => {
    expect(interpolate("/x?reason=${param.reason}", ctx)).toBe("/x?reason=cleanup");
  });

  it("still resolves legacy {field} placeholders", () => {
    expect(interpolate("/legacy/{email}", ctx)).toBe("/legacy/a@b.com");
  });

  it("resolves unknown references to empty string", () => {
    expect(interpolate("${ctx.missing}-${param.nope}", ctx)).toBe("-");
  });
});

describe("executeAction", () => {
  it("runs a flow via client.automation.execute with the interpolated target", async () => {
    mockExecute.mockResolvedValue({ ok: true });
    const action: ActionMeta = {
      name: "archive",
      label: "Archive",
      type: "flow",
      target: "archive_${ctx.objectName}",
    };

    const res = await executeAction(action, {
      client,
      objectName: "crm_account",
      recordId: "acc-1",
      params: { reason: "cleanup" },
    });

    expect(mockExecute).toHaveBeenCalledWith(
      "archive_crm_account",
      expect.objectContaining({ object: "crm_account", recordId: "acc-1", params: { reason: "cleanup" } }),
    );
    expect(res.success).toBe(true);
  });

  it("opens a url action with an interpolated target", async () => {
    const action: ActionMeta = {
      name: "open",
      label: "Open",
      type: "url",
      target: "https://x.test/${ctx.recordId}",
    };
    await executeAction(action, { client, recordId: "acc-1" });
    expect(Linking.openURL).toHaveBeenCalledWith("https://x.test/acc-1");
  });

  it("attaches resultDialog to the result when the action declares one", async () => {
    mockTrigger.mockResolvedValue({ secret: "s3cr3t" });
    const action: ActionMeta = {
      name: "rotate",
      label: "Rotate Key",
      type: "api",
      target: "rotate_key",
      resultDialog: {
        title: "New key",
        format: "secret",
        fields: [{ path: "secret", label: "Secret", format: "secret" }],
      },
    };

    const res = await executeAction(action, { client });
    expect(res.resultDialog?.title).toBe("New key");
    expect(res.data).toEqual({ secret: "s3cr3t" });
  });
});

describe("getByPath", () => {
  it("reads dot-delimited paths", () => {
    expect(getByPath({ a: { b: { c: 7 } } }, "a.b.c")).toBe(7);
    expect(getByPath({ a: 1 }, "a.b")).toBeUndefined();
    expect(getByPath(null, "a")).toBeUndefined();
  });
});
