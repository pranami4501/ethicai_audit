export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="space-y-4">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
            Fairness Monitoring • Privacy-first • Browser-based
          </span>

          <h1 className="text-4xl font-bold tracking-tight">
            EthicAI — Fairness Audit Dashboard
          </h1>

          <p className="max-w-2xl text-lg text-gray-700">
            EthicAI helps you evaluate whether a classification model produces unequal outcomes across
            protected groups (e.g., sex, race). Run a demo audit instantly or upload your own model
            outputs to generate fairness metrics, visual summaries, and a downloadable report.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/audit"
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Open Audit
            </a>
            <a
              href="/about"
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium"
            >
              About the Metrics
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold">Upload or Guided Merge</h2>
            <p className="mt-2 text-sm text-gray-700">
              Upload a single audit-ready CSV, or use guided mode to merge a dataset and a separate
              predictions export by ID.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold">Fairness Metrics + Visuals</h2>
            <p className="mt-2 text-sm text-gray-700">
              See selection rate and error rates by group, plus Demographic Parity Difference and
              Equal Opportunity Difference.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold">Stakeholder-ready Report</h2>
            <p className="mt-2 text-sm text-gray-700">
              Download a shareable HTML Fairness Report and a risk rating summary to support
              responsible deployment decisions.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900">Privacy note</h3>
          <p className="mt-2 text-sm text-gray-700">
            Files are processed locally in your browser. No data is uploaded to a server.
          </p>
        </div>
      </div>
    </main>
  );
}
