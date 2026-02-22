import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RecordDetailsField {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  required?: boolean;
  readOnly?: boolean;
}

export interface RecordDetailsSection {
  id: string;
  title: string;
  columns: number;
  fields: RecordDetailsField[];
  collapsed?: boolean;
}

export interface RecordDetailsProps {
  sections: RecordDetailsSection[];
  activeTab?: string;
}

export interface UseRecordDetailsResult {
  /** Current sections configuration */
  sections: RecordDetailsSection[];
  /** Active tab identifier */
  activeTab: string;
  /** Set sections configuration */
  setSections: (sections: RecordDetailsSection[]) => void;
  /** Set the active tab */
  setActiveTab: (tab: string) => void;
  /** Toggle visibility of a field */
  toggleFieldVisibility: (sectionId: string, fieldId: string) => void;
  /** Get visible fields for a section */
  getVisibleFields: (sectionId: string) => RecordDetailsField[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing SDUI record detail layout — sections, columns,
 * field visibility, and tab navigation.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { sections, activeTab, setSections, toggleFieldVisibility, getVisibleFields } =
 *   useRecordDetails();
 * setSections([{ id: "s1", title: "Info", columns: 2, fields: [] }]);
 * toggleFieldVisibility("s1", "f1");
 * const visible = getVisibleFields("s1");
 * ```
 */
export function useRecordDetails(
  _props?: RecordDetailsProps,
): UseRecordDetailsResult {
  const [sections, setSectionsState] = useState<RecordDetailsSection[]>([]);
  const [activeTab, setActiveTabState] = useState<string>("");

  const setSections = useCallback((items: RecordDetailsSection[]) => {
    setSectionsState(items);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
  }, []);

  const toggleFieldVisibility = useCallback(
    (sectionId: string, fieldId: string) => {
      setSectionsState((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            fields: s.fields.map((f) =>
              f.id === fieldId ? { ...f, visible: !f.visible } : f,
            ),
          };
        }),
      );
    },
    [],
  );

  const getVisibleFields = useCallback(
    (sectionId: string): RecordDetailsField[] => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return [];
      return section.fields.filter((f) => f.visible);
    },
    [sections],
  );

  return {
    sections,
    activeTab,
    setSections,
    setActiveTab,
    toggleFieldVisibility,
    getVisibleFields,
  };
}
