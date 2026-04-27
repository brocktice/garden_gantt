// src/ui/SkipToMain.tsx
// A11y skip link — first focusable element on the page (POL-08).
// Hidden via `sr-only` until focused, then becomes a visible focus chip pointing
// the user at the `<main id="main">` landmark.
//
// Source: [CITED: .planning/phases/04-polish-mobile-ship/04-06-PLAN.md Task 1]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-PATTERNS.md §src/ui/SkipToMain.tsx]
//         [CITED: .planning/phases/04-polish-mobile-ship/04-UI-SPEC.md §Accessibility Contract]

export function SkipToMain() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white border border-stone-200 px-3 py-2 rounded-md text-sm font-medium text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
    >
      Skip to main content
    </a>
  );
}
