import { useCallback, useState } from "react";
import * as Linking from "expo-linking";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ContextualAction {
  type: "phone" | "email" | "url" | "address";
  label: string;
  value: string;
  field: string;
}

export interface UseContextualActionsResult {
  /** Currently detected actions */
  actions: ContextualAction[];
  /** Scan fields to detect actionable items */
  detectActions: (
    fields: Array<{ name: string; type: string; value: unknown }>,
  ) => ContextualAction[];
  /** Execute an action (open URL scheme) */
  executeAction: (action: ContextualAction) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for contextual record actions.
 * Detects actionable fields (phone, email, url, address) and opens
 * the appropriate URL scheme when executed.
 *
 * ```ts
 * const { actions, detectActions, executeAction } = useContextualActions();
 * const detected = detectActions(fields);
 * await executeAction(detected[0]);
 * ```
 */
export function useContextualActions(): UseContextualActionsResult {
  const [actions, setActions] = useState<ContextualAction[]>([]);

  const detectActions = useCallback(
    (
      fields: Array<{ name: string; type: string; value: unknown }>,
    ): ContextualAction[] => {
      const detected: ContextualAction[] = [];

      for (const field of fields) {
        if (field.value == null || field.value === "") continue;
        const strValue = String(field.value);

        if (field.type === "phone") {
          detected.push({
            type: "phone",
            label: `Call ${field.name}`,
            value: strValue,
            field: field.name,
          });
        } else if (field.type === "email") {
          detected.push({
            type: "email",
            label: `Email ${field.name}`,
            value: strValue,
            field: field.name,
          });
        } else if (field.type === "url") {
          detected.push({
            type: "url",
            label: `Open ${field.name}`,
            value: strValue,
            field: field.name,
          });
        } else if (field.type === "address") {
          detected.push({
            type: "address",
            label: `Map ${field.name}`,
            value: strValue,
            field: field.name,
          });
        }
      }

      setActions(detected);
      return detected;
    },
    [],
  );

  const executeAction = useCallback(
    async (action: ContextualAction): Promise<void> => {
      let url: string;
      switch (action.type) {
        case "phone":
          url = `tel:${action.value}`;
          break;
        case "email":
          url = `mailto:${action.value}`;
          break;
        case "url":
          url = action.value.startsWith("http")
            ? action.value
            : `https://${action.value}`;
          break;
        case "address":
          url = `maps:?q=${encodeURIComponent(action.value)}`;
          break;
        default:
          throw new Error(`Unsupported action type: ${(action as ContextualAction).type}`);
      }
      await Linking.openURL(url);
    },
    [],
  );

  return { actions, detectActions, executeAction };
}
