import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  cacheSize: number;
  hapticFeedback: boolean;
  reducedMotion: boolean;
  dynamicType: boolean;
  compactMode: boolean;
}

export interface UseSettingsResult {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  resetSettings: () => void;
  clearCache: () => Promise<void>;
  exportDiagnostics: () => Promise<Record<string, unknown>>;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en",
  notificationsEnabled: true,
  biometricEnabled: false,
  cacheSize: 0,
  hapticFeedback: true,
  reducedMotion: false,
  dynamicType: true,
  compactMode: false,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing application settings.
 *
 * ```ts
 * const { settings, updateSetting, resetSettings } = useSettings();
 * updateSetting("theme", "dark");
 * ```
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [isLoading, setIsLoading] = useState(false);

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const clearCache = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate async cache clearing
      await new Promise((resolve) => setTimeout(resolve, 100));
      setSettings((prev) => ({ ...prev, cacheSize: 0 }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportDiagnostics = useCallback(async (): Promise<
    Record<string, unknown>
  > => {
    return {
      platform: "ios",
      version: "1.0.0",
      settings,
      timestamp: new Date().toISOString(),
    };
  }, [settings]);

  return {
    settings,
    updateSetting,
    resetSettings,
    clearCache,
    exportDiagnostics,
    isLoading,
  };
}
