/**
 * Tests for deriveStateMachines — validates field matching, initial/final
 * classification, transition extraction, and current-state resolution.
 */
import { deriveStateMachines } from "~/hooks/useStateMachines";
import type { ObjectMeta } from "~/hooks/useObjectMeta";
import type { FieldDefinition } from "~/components/renderers";

const META: ObjectMeta = {
  name: "crm_opportunity",
  stateMachines: {
    lifecycle: {
      id: "opportunity_pipeline",
      initial: "prospecting",
      states: {
        prospecting: {
          on: {
            QUALIFY: { target: "qualification", description: "Qualified" },
            LOSE: { target: "closed_lost", description: "Lost early" },
          },
        },
        qualification: { on: { WIN: { target: "closed_won" } } },
        closed_won: {},
        closed_lost: {},
      },
    },
  },
} as unknown as ObjectMeta;

const FIELDS: FieldDefinition[] = [
  { name: "name", type: "text" } as FieldDefinition,
  {
    name: "stage",
    type: "select",
    options: [
      { value: "prospecting", label: "Prospecting" },
      { value: "qualification", label: "Qualification" },
      { value: "closed_won", label: "Won" },
      { value: "closed_lost", label: "Lost" },
    ],
  } as FieldDefinition,
];

describe("deriveStateMachines", () => {
  it("derives states, transitions, and current state from a matched field", () => {
    const result = deriveStateMachines(META, FIELDS, { stage: "qualification" });
    expect(result).toHaveLength(1);
    const sm = result[0];

    expect(sm.key).toBe("lifecycle");
    expect(sm.field).toBe("stage");
    expect(sm.currentState).toBe("qualification");

    // Initial / normal / final classification.
    const byName = Object.fromEntries(sm.states.map((s) => [s.name, s]));
    expect(byName.prospecting.type).toBe("initial");
    expect(byName.qualification.type).toBe("normal");
    expect(byName.closed_won.type).toBe("final");
    expect(byName.closed_lost.type).toBe("final");

    // Labels come from the matched field's option labels.
    expect(byName.closed_won.label).toBe("Won");

    // Transitions carry event + description.
    expect(sm.transitions).toContainEqual({
      from: "prospecting",
      to: "qualification",
      event: "QUALIFY",
      label: "Qualified",
    });
    expect(sm.transitions.filter((t) => t.from === "prospecting")).toHaveLength(2);
  });

  it("returns no current state when no field matches the state names", () => {
    const result = deriveStateMachines(META, [FIELDS[0]], { stage: "qualification" });
    expect(result[0].field).toBeUndefined();
    expect(result[0].currentState).toBeUndefined();
    // Falls back to humanized labels without a matched field.
    const won = result[0].states.find((s) => s.name === "closed_won");
    expect(won?.label).toBe("Closed Won");
  });

  it("returns an empty array when the object has no state machines", () => {
    expect(deriveStateMachines({ name: "x" } as ObjectMeta, FIELDS, {})).toEqual([]);
    expect(deriveStateMachines(null, FIELDS, null)).toEqual([]);
  });
});
