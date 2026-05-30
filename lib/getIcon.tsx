/**
 * Icon resolver for server-driven navigation metadata.
 *
 * ObjectStack apps publish Lucide icon names (kebab-case, e.g. `user-plus`,
 * `chart-line`) on their navigation items. lucide-react-native exports each
 * icon as a PascalCase component (`UserPlus`, `ChartLine`), so we convert the
 * name and look it up from the module namespace, caching the result.
 *
 * Mirrors the web console's `getIcon` (objectui app-shell), degrading silently
 * to a neutral fallback when a name isn't a valid Lucide icon — server metadata
 * occasionally references icons from other libraries.
 */
import * as LucideIcons from "lucide-react-native";
import { List } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

/** Convert kebab/snake/space names to PascalCase (`user-plus` → `UserPlus`). */
function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const cache = new Map<string, LucideIcon>();
const registry = LucideIcons as unknown as Record<string, LucideIcon>;

/**
 * Resolve a Lucide icon component by name (kebab-case or PascalCase).
 * Falls back to the `List` icon when the name is missing or unknown.
 */
export function getIcon(name?: string): LucideIcon {
  if (!name) return List;
  const cached = cache.get(name);
  if (cached) return cached;

  const resolved = registry[toPascalCase(name)] ?? List;
  cache.set(name, resolved);
  return resolved;
}
