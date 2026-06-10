/**
 * E2E test setup.
 *
 * Initialize i18n so the rendered screens show their real (English) copy rather
 * than raw translation keys — the e2e suite renders full screens that call
 * `useTranslation`, and without an initialized instance `t(key)` returns the
 * key. Importing the app's i18n module runs its synchronous inline-resource
 * init (no async backend), so translations resolve immediately.
 */
import "~/lib/i18n";
