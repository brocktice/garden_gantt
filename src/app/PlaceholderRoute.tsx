// src/app/PlaceholderRoute.tsx
// Per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Layout Shell §Placeholder route

interface PlaceholderRouteProps {
  heading: string;
  body: string;
}

export function PlaceholderRoute({ heading, body }: PlaceholderRouteProps) {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-semibold text-stone-900">{heading}</h1>
      <p className="mt-4 text-base text-stone-600 max-w-prose mx-auto">{body}</p>
    </div>
  );
}
