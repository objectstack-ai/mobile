/**
 * E2E test — Flows (detail / run / run history)
 *
 * Renders the real Flow detail screen under the native preset and exercises the
 * full journey: metadata + diagram render, run history empty state, and the
 * Run button opening the input-collection dialog and triggering with params.
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "~/components/ui/Toast";
import { ConfirmProvider } from "~/components/ui/ConfirmDialog";

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/* ---- Mocks ---- */

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ name: "lead_conversion" }),
  useSegments: () => [],
  Stack: { Screen: () => null },
}));

// Flow definition served by the metadata API (consumed by useFlows via apiFetch).
const FLOW = {
  name: "lead_conversion",
  label: "Lead Conversion Process",
  description: "Convert qualified leads",
  version: 1,
  status: "draft",
  type: "screen",
  variables: [
    { name: "leadId", type: "text", isInput: true },
    { name: "opportunityName", type: "text", isInput: true },
  ],
  nodes: [
    { id: "start", type: "start", label: "Start" },
    { id: "create", type: "create_record", label: "Create Account" },
  ],
  edges: [{ id: "e1", source: "start", target: "create" }],
};

jest.mock("~/lib/objectstack", () => ({
  apiFetch: jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ type: "flow", items: [FLOW] }),
  }),
}));

const mockExecute = jest.fn().mockResolvedValue({ success: false, error: "Flow 'lead_conversion' not found" });
const mockListRuns = jest.fn().mockResolvedValue({ runs: [], hasMore: false });
jest.mock("@objectstack/client-react", () => ({
  useClient: () => ({
    automation: { execute: mockExecute, listRuns: mockListRuns, getRun: jest.fn() },
  }),
}));

import FlowDetailScreen from "~/app/flows/[name]/index";

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <FlowDetailScreen />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe("E2E: Flows", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockExecute.mockClear();
    mockListRuns.mockClear();
  });

  it("renders the flow metadata, diagram, and an empty run history", async () => {
    const { getAllByText, getByText } = renderScreen();

    // Title appears (header + subtitle/metadata may repeat it).
    await waitFor(() => expect(getAllByText("Lead Conversion Process").length).toBeGreaterThan(0));
    // Diagram nodes render.
    expect(getByText("Create Account")).toBeTruthy();
    // Run history starts empty.
    expect(getByText("No runs yet.")).toBeTruthy();
    // listRuns was queried for this flow.
    expect(mockListRuns).toHaveBeenCalledWith("lead_conversion", { limit: 25 });
  });

  it("opens the input dialog on Run and triggers with collected params", async () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = renderScreen();

    await waitFor(() => expect(getAllByText("Lead Conversion Process").length).toBeGreaterThan(0));

    // Tap the header Run button (input-driven flow → dialog, not a confirm).
    fireEvent.press(getAllByText("Run")[0]);
    await waitFor(() => expect(getByText("Lead Id")).toBeTruthy());
    expect(getByText("Opportunity Name")).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText("Lead Id"), "lead-9");
    fireEvent.changeText(getByPlaceholderText("Opportunity Name"), "Acme Deal");

    // Press the dialog's Run button (the last "Run" in the tree).
    const runButtons = getAllByText("Run");
    fireEvent.press(runButtons[runButtons.length - 1]);

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith("lead_conversion", {
      params: { leadId: "lead-9", opportunityName: "Acme Deal" },
    });

    // The draft flow's inner failure surfaces (dialog closed; no crash).
    await waitFor(() => expect(queryByText("Lead Id")).toBeNull());
  });
});
