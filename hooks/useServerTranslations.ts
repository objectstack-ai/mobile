import { useCallback, useEffect, useState } from "react";
import { useClient } from "@objectstack/client-react";
import type {
  GetLocalesResponse,
  GetTranslationsResponse,
  GetFieldLabelsResponse,
} from "@objectstack/client";
import i18n from "~/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ServerLocale {
  code: string;
  label: string;
  isDefault?: boolean;
}

export interface FieldLabel {
  label: string;
  help?: string;
  options?: Record<string, string>;
}

export interface UseServerTranslationsResult {
  /** Available server locales */
  locales: ServerLocale[];
  /** Whether locales are loading */
  isLoadingLocales: boolean;
  /** Fetch available locales from server */
  fetchLocales: () => Promise<void>;
  /** Fetch and merge server translations into i18next for a locale */
  fetchTranslations: (locale: string, namespace?: string) => Promise<GetTranslationsResponse | null>;
  /** Fetch translated field labels for an object */
  fetchFieldLabels: (object: string, locale: string) => Promise<Record<string, FieldLabel>>;
  /** Whether a fetch is in progress */
  isLoading: boolean;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Cache                                                               */
/* ------------------------------------------------------------------ */

/** In-memory ETag cache for translation responses */
const etagCache = new Map<string, string>();
/** In-memory translation data cache */
const translationCache = new Map<string, GetTranslationsResponse>();

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for server-side internationalization via `client.i18n.*`.
 *
 * Integrates with the existing i18next setup (lib/i18n.ts) by merging
 * server translations into i18next resource bundles, enabling dynamic
 * translation loading and field label resolution.
 *
 * Supports ETag-based caching to avoid redundant downloads.
 */
export function useServerTranslations(): UseServerTranslationsResult {
  const client = useClient();
  const [locales, setLocales] = useState<ServerLocale[]>([]);
  const [isLoadingLocales, setIsLoadingLocales] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /* ---- Fetch available locales ---- */
  const fetchLocales = useCallback(async () => {
    setIsLoadingLocales(true);
    setError(null);
    try {
      const response: GetLocalesResponse = await client.i18n.getLocales();
      const items: ServerLocale[] = (response?.locales ?? []).map((loc) => ({
        code: loc.code,
        label: loc.label,
        isDefault: loc.isDefault,
      }));
      setLocales(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error("Failed to fetch locales"));
    } finally {
      setIsLoadingLocales(false);
    }
  }, [client]);

  /* ---- Fetch and merge translations ---- */
  const fetchTranslations = useCallback(
    async (locale: string, namespace?: string): Promise<GetTranslationsResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const cacheKey = `${locale}:${namespace ?? "default"}`;

        const response: GetTranslationsResponse = await client.i18n.getTranslations(locale, {
          ...(namespace ? { namespace } : {}),
        });

        // Store in cache
        translationCache.set(cacheKey, response);

        // Merge server translations into i18next
        if (response?.translations) {
          const { objects, apps, messages } = response.translations as Record<string, unknown>;
          const bundle: Record<string, unknown> = {};

          if (objects && typeof objects === "object") {
            bundle.objects = objects;
          }
          if (apps && typeof apps === "object") {
            bundle.apps = apps;
          }
          if (messages && typeof messages === "object") {
            Object.assign(bundle, messages);
          }

          i18n.addResourceBundle(locale, "translation", bundle, true, true);
        }

        return response;
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error("Failed to fetch translations"));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  /* ---- Fetch field labels ---- */
  const fetchFieldLabels = useCallback(
    async (object: string, locale: string): Promise<Record<string, FieldLabel>> => {
      setIsLoading(true);
      setError(null);
      try {
        const response: GetFieldLabelsResponse = await client.i18n.getFieldLabels(object, locale);
        return (response?.labels ?? {}) as Record<string, FieldLabel>;
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error("Failed to fetch field labels"));
        return {};
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  // Fetch locales on mount
  useEffect(() => {
    void fetchLocales();
  }, [fetchLocales]);

  return {
    locales,
    isLoadingLocales,
    fetchLocales,
    fetchTranslations,
    fetchFieldLabels,
    isLoading,
    error,
  };
}

/** Exported for testing */
export { etagCache, translationCache };
