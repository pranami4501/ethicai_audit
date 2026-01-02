export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">EthicAI Audit</h1>

        <p className="mt-4 text-lg text-gray-700">
          EthicAI is a fairness audit tool that evaluates whether machine learning models
          produce unequal outcomes across demographic groups such as gender and race.
        </p>

        <p className="mt-2 text-gray-700">
          Designed for educators, researchers, and practitioners who need clear, visual summaries
          without reading code.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="/audit?mode=demo"
            className="rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Try Demo Audit</h2>
            <p className="mt-2 text-gray-600">
              Instantly run a fairness audit using a built-in example dataset.
            </p>
          </a>

          <a
            href="/audit"
            className="rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold">Upload Your Data</h2>
            <p className="mt-2 text-gray-600">
              Upload a CSV of model predictions and audit fairness by group.
            </p>
          </a>
        </div>

        <div className="mt-10 rounded-2xl bg-gray-50 p-6">
          <h3 className="text-lg font-semibold">What EthicAI Measures</h3>
          <ul className="mt-3 list-disc pl-5 text-gray-700 space-y-1">
            <li><b>Selection Rate</b> (positive prediction frequency)</li>
            <li><b>True Positive Rate (TPR)</b> by group</li>
            <li><b>False Positive / False Negative Rates</b></li>
            <li><b>Demographic Parity Difference</b></li>
            <li><b>Equal Opportunity Difference</b></li>
          </ul>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Educational tool only. Use results to support investigation and responsible evaluation—not
          as final judgments.
        </p>
      </div>
    </main>
  );
}
