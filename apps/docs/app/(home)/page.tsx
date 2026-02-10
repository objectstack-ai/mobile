import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1 px-4">
      <h1 className="text-4xl font-bold mb-4">ObjectStack Mobile</h1>
      <p className="text-lg text-fd-muted-foreground mb-8 max-w-2xl mx-auto">
        Enterprise-grade mobile runtime for the ObjectStack low-code platform.
        Metadata-driven, offline-first, built with Expo &amp; React Native.
      </p>
      <div className="flex flex-row gap-4 justify-center">
        <Link
          href="/docs"
          className="inline-flex items-center justify-center rounded-lg bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground shadow hover:bg-fd-primary/90"
        >
          Get Started
        </Link>
        <Link
          href="/docs/hooks"
          className="inline-flex items-center justify-center rounded-lg border border-fd-border px-6 py-3 text-sm font-medium shadow-sm hover:bg-fd-accent"
        >
          API Reference
        </Link>
      </div>
    </div>
  );
}
