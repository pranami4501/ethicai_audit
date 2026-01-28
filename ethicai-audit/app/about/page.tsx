export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">About EthicAI</h1>

        <p className="mt-4 text-gray-800">
          EthicAI is an educational fairness monitoring tool that evaluates bias in model predictions
          across protected attributes (e.g., sex, race). It is designed to support educators,
          researchers, and practitioners with clear, visual summaries for non-technical audiences.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-gray-900">
          Ethical Framework
        </h2>
        <ul className="mt-3 list-disc pl-5 text-gray-700 space-y-2">
          <li>Use only public, de-identified data and respect dataset licensing rules.</li>
          <li>Acknowledge representation imbalance and historical bias in data.</li>
          <li>Frame results as indicators for investigation, not proof of discrimination.</li>
          <li>Explain metrics in accessible language for broad audiences.</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-gray-900">
          Fairness Metric Definitions
        </h2>

        {/* ← changed text color here to be darker for mobile readability */}
        <div className="mt-4 space-y-3 text-gray-800">
          <p>
            <span className="font-semibold text-gray-900">Selection Rate:</span>{" "}
            The fraction of predictions labeled “positive”.
          </p>
          <p>
            <span className="font-semibold text-gray-900">TPR (True Positive Rate):</span>{" "}
            Of truly positive cases, the fraction predicted positive.
          </p>
          <p>
            <span className="font-semibold text-gray-900">FPR (False Positive Rate):</span>{" "}
            Of truly negative cases, the fraction predicted positive.
          </p>
          <p>
            <span className="font-semibold text-gray-900">FNR (False Negative Rate):</span>{" "}
            Of truly positive cases, the fraction predicted negative.
          </p>
          <p>
            <span className="font-semibold text-gray-900">Demographic Parity Difference (DPD):</span>{" "}
            The max gap in selection rates between groups.
          </p>
          <p>
            <span className="font-semibold text-gray-900">Equal Opportunity Difference (EOD):</span>{" "}
            The max gap in TPR between groups.
          </p>
        </div>

        <p className="mt-10 text-sm text-gray-800">
          This tool does not make hiring, salary, or legal decisions. It supports transparency and
          responsible evaluation.
        </p>
      </div>
    </main>
  );
}
