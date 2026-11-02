/**
 * The open `scan()` call, between the bridge and the scanner screen
 * (`app/bridge-scan.tsx`).
 *
 * One scan at a time: a second `scan()` while one is open is refused and the
 * open one is left alone, so a double tap in the Console cannot close the
 * scanner under the user. The screen reads the formats from here, never from
 * its URL, and closes itself when there is no scan for it (a link that opens
 * the route directly).
 */
import type { ScanFormat } from "./protocol";

export type ScanOutcome =
  | { kind: "result"; text: string }
  | { kind: "cancel" }
  | { kind: "denied" };

export const SCAN_BUSY_MESSAGE = "A scan is already open";
export const SCAN_DENIED_MESSAGE = "Camera permission denied";

interface OpenScan {
  token: number;
  formats: readonly ScanFormat[];
  settle: (outcome: ScanOutcome) => void;
}

let open: OpenScan | null = null;
let nextToken = 1;

/**
 * Start a scan for `formats` and show the scanner with `show`. Resolves the
 * decoded text, or `null` on cancel; rejects with {@link SCAN_DENIED_MESSAGE}
 * when the camera permission is refused, with {@link SCAN_BUSY_MESSAGE} when a
 * scan is already open, and with `show`'s error when the screen cannot open.
 */
export function requestScan(
  formats: readonly ScanFormat[],
  show: () => void
): Promise<string | null> {
  if (open) return Promise.reject(new Error(SCAN_BUSY_MESSAGE));
  return new Promise<string | null>((resolve, reject) => {
    const token = nextToken++;
    open = {
      token,
      formats,
      settle: (outcome) => {
        if (outcome.kind === "result") resolve(outcome.text);
        else if (outcome.kind === "denied") reject(new Error(SCAN_DENIED_MESSAGE));
        else resolve(null);
      },
    };
    try {
      show();
    } catch (err) {
      open = null;
      reject(err);
    }
  });
}

/** The scan the screen should serve, or `null` when none is open. */
export function currentScan(): { token: number; formats: readonly ScanFormat[] } | null {
  return open ? { token: open.token, formats: open.formats } : null;
}

/**
 * Settle the scan `token` names. Returns `false`, changing nothing, when that
 * scan is no longer the open one — it was already settled.
 */
export function settleScan(token: number, outcome: ScanOutcome): boolean {
  if (!open || open.token !== token) return false;
  const { settle } = open;
  open = null;
  settle(outcome);
  return true;
}
