import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image?: string;
}

export interface UseOnboardingResult {
  isComplete: boolean;
  currentSlide: number;
  slides: OnboardingSlide[];
  nextSlide: () => void;
  previousSlide: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  showTooltip: (key: string) => boolean;
  dismissTooltip: (key: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Default slides                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Welcome",
    description: "Welcome to ObjectStack Mobile",
  },
  {
    id: "objects",
    title: "Objects",
    description: "Manage your objects with ease",
  },
  {
    id: "views",
    title: "Views",
    description: "Customize how you see your data",
  },
  {
    id: "ai",
    title: "AI",
    description: "Let AI help you work smarter",
  },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing user onboarding flow.
 *
 * ```ts
 * const { currentSlide, nextSlide, completeOnboarding } = useOnboarding();
 * ```
 */
export function useOnboarding(): UseOnboardingResult {
  const [isComplete, setIsComplete] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(
    new Set(),
  );

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) =>
      prev < DEFAULT_SLIDES.length - 1 ? prev + 1 : prev,
    );
  }, []);

  const previousSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsComplete(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsComplete(false);
    setCurrentSlide(0);
    setDismissedTooltips(new Set());
  }, []);

  const showTooltip = useCallback(
    (key: string): boolean => {
      return !dismissedTooltips.has(key);
    },
    [dismissedTooltips],
  );

  const dismissTooltip = useCallback((key: string) => {
    setDismissedTooltips((prev) => new Set(prev).add(key));
  }, []);

  return {
    isComplete,
    currentSlide,
    slides: DEFAULT_SLIDES,
    nextSlide,
    previousSlide,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,
    showTooltip,
    dismissTooltip,
  };
}
