import { useMemo } from "react";
import type { FieldDefinition } from "~/components/renderers";
import type { ObjectMeta } from "~/hooks/useObjectMeta";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SMState {
  name: string;
  type: "initial" | "normal" | "final";
  label?: string;
}

export interface SMTransition {
  from: string;
  to: string;
  event: string;
  label?: string;
}

/**
 * A state machine resolved against an object's metadata and (optionally) a
 * record — ready to hand straight to `StateMachineViewer`.
 */
export interface RecordStateMachine {
  /** Machine key from `meta.stateMachines` (e.g. `lifecycle`). */
  key: string;
  /** Human title for the section. */
  title: string;
  /** The record field whose value tracks the current state, if matched. */
  field?: string;
  states: SMState[];
  transitions: SMTransition[];
  /** Current state value from the record (when a field could be matched). */
  currentState?: string;
}

/* Raw XState-style shape as returned by `/meta/object` → `stateMachines`. */
interface RawMachine {
  id?: string;
  initial?: string;
  states?: Record<
    string,
    { on?: Record<string, { target?: string; description?: string }> }
  >;
}

/* ------------------------------------------------------------------ */
/*  Derivation                                                         */
/* ------------------------------------------------------------------ */

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * State machines carry no explicit field link, so match a machine to the
 * select/radio field whose option values cover every state name. That field's
 * value on the record is the current state.
 */
function findStateField(
  stateNames: string[],
  fields: FieldDefinition[],
): FieldDefinition | undefined {
  return fields.find((f) => {
    const opts = f.options;
    if (!opts || opts.length === 0) return false;
    const values = new Set(opts.map((o) => String(o.value)));
    return stateNames.every((n) => values.has(n));
  });
}

export function deriveStateMachines(
  meta: ObjectMeta | null,
  fields: FieldDefinition[],
  record: Record<string, unknown> | null,
): RecordStateMachine[] {
  const machines = (meta?.stateMachines ?? {}) as Record<string, RawMachine>;
  const result: RecordStateMachine[] = [];

  for (const [key, machine] of Object.entries(machines)) {
    const stateMap = machine.states ?? {};
    const stateNames = Object.keys(stateMap);
    if (stateNames.length === 0) continue;

    const field = findStateField(stateNames, fields);
    const optionLabel = (value: string): string | undefined =>
      field?.options?.find((o) => String(o.value) === value)?.label;

    const states: SMState[] = stateNames.map((name) => {
      const on = stateMap[name]?.on ?? {};
      const isInitial = name === machine.initial;
      const isFinal = Object.keys(on).length === 0;
      return {
        name,
        label: optionLabel(name) ?? humanize(name),
        type: isInitial ? "initial" : isFinal ? "final" : "normal",
      };
    });

    const transitions: SMTransition[] = stateNames.flatMap((name) => {
      const on = stateMap[name]?.on ?? {};
      return Object.entries(on).map(([event, t]) => ({
        from: name,
        to: String(t?.target ?? ""),
        event,
        label: t?.description,
      }));
    });

    const rawCurrent = field && record ? record[field.name] : undefined;
    const currentState =
      rawCurrent != null && rawCurrent !== "" ? String(rawCurrent) : undefined;

    result.push({
      key,
      title: humanize(key),
      field: field?.name,
      states,
      transitions,
      currentState,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Derive the state machines defined on an object, resolved against a record's
 * current field values. Memoized on its inputs.
 */
export function useRecordStateMachines(
  meta: ObjectMeta | null,
  fields: FieldDefinition[],
  record: Record<string, unknown> | null,
): RecordStateMachine[] {
  return useMemo(
    () => deriveStateMachines(meta, fields, record),
    [meta, fields, record],
  );
}
