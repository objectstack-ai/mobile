/**
 * Screen reader optimization utilities.
 *
 * Provides helpers for generating accessibility labels, hints, live region
 * props, and screen-reader announcements for React Native components.
 */

export interface A11yAnnouncement {
  message: string;
  priority?: "polite" | "assertive";
}

export interface A11yFocusConfig {
  targetRef?: unknown;
  delay?: number;
}

/**
 * Announce a message for screen readers
 */
export function announce(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  // In real implementation, this would call AccessibilityInfo.announceForAccessibility
  // For now, a no-op that tests can verify was called
}

/**
 * Generate accessibility hints based on field type
 */
export function getFieldHint(fieldType: string, fieldName: string): string {
  const hints: Record<string, string> = {
    text: `Enter ${fieldName}`,
    number: `Enter a number for ${fieldName}`,
    email: `Enter an email address for ${fieldName}`,
    phone: `Enter a phone number for ${fieldName}`,
    date: `Select a date for ${fieldName}`,
    select: `Choose an option for ${fieldName}`,
    checkbox: `Toggle ${fieldName} on or off`,
    toggle: `Toggle ${fieldName} on or off`,
    url: `Enter a URL for ${fieldName}`,
    textarea: `Enter text for ${fieldName}`,
  };
  return hints[fieldType] ?? `Enter value for ${fieldName}`;
}

/**
 * Generate accessibility label for a list item
 */
export function getListItemLabel(
  title: string,
  subtitle?: string,
  index?: number,
  total?: number,
): string {
  let label = title;
  if (subtitle) label += `, ${subtitle}`;
  if (index !== undefined && total !== undefined)
    label += `. Item ${index + 1} of ${total}`;
  return label;
}

/**
 * Generate live region props for dynamic content
 */
export function getLiveRegionProps(
  priority: "polite" | "assertive" = "polite",
): Record<string, string> {
  return {
    accessibilityLiveRegion: priority,
  };
}
