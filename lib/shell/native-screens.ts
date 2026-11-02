/**
 * Native screens a route rule may hand a Console route to, keyed by the name
 * a `RouteRule.screen` uses. Each value is the expo-router pathname that
 * renders it; the screen receives the original Console route as the `route`
 * search param so it can offer "open the full page" back to the WebView.
 *
 * Empty in this release — the shell ships no business screens yet.
 */
export const NATIVE_SCREENS: Readonly<Record<string, string>> = {};

export const AVAILABLE_NATIVE_SCREENS: ReadonlySet<string> = new Set(Object.keys(NATIVE_SCREENS));
