"use client";

import { buildHtmlReport } from "@/lib/report";
import { useMemo, useState } from "react";
import {
  accuracy,
  computeGroupMetrics,
  demographicParityDifference,
  equalOpportunityDifference,
  GroupMetrics,
} from "@/lib/metrics";
import { demoRaceData, demoSexData } from "@/lib/demoData";
import GroupBarChart from "../../components/GroupBarChart";

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function riskFromGaps(dpd: number, eod: number) {
  // thresholds (simple + defensible for an educational tool)
  const gap = Math.max(dpd, eod);

  if (gap < 0.1) {
    return {
      level: "Low",
      badgeClass: "bg-green-100 text-green-800 border-green-200",
      message:
        "Gaps are small in this audit. Continue monitoring and validate on additional data.",
    };
  }

  if (gap < 0.2) {
    return {
      level: "Medium",
      badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
      message:
        "Noticeable gaps detected. Consider reviewing features, thresholds, and subgroup performance before deployment.",
    };
  }

  return {
    level: "High",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    message:
      "Large fairness gaps detected. Deployment is not recommended without mitigation (e.g., threshold tuning, reweighting, or additional data review).",
    };
}

export default function AuditPage() {
  const [mode, setMode] = useState<"none" | "sex" | "race">("none");
  const [groupResults, setGroupResults] = useState<GroupMetrics[]>([]);
  const [dpd, setDpd] = useState<number | null>(null);
  const [eod, setEod] = useState<number | null>(null);
  const [acc, setAcc] = useState<number | null>(null);

  const runDemo = (which: "sex" | "race") => {
  const rows = which === "sex" ? demoSexData : demoRaceData;
  const gm = computeGroupMetrics(rows);

  setGroupResults(gm);
  setDpd(demographicParityDifference(gm));
  setEod(equalOpportunityDifference(gm));
  setAcc(accuracy(rows));
  setMode(which);
};

  const title = useMemo(() => {
    if (mode === "sex") return "Demo Audit — Sex";
    if (mode === "race") return "Demo Audit — Race";
    return "Fairness Audit";
  }, [mode]);
  const risk = dpd !== null && eod !== null ? riskFromGaps(dpd, eod) : null;

  const downloadReport = () => {
  if (dpd === null || eod === null || acc === null || groupResults.length === 0) return;

  const risk = riskFromGaps(dpd, eod);

  const html = buildHtmlReport({
    title,
    accuracy: acc,
    dpd,
    eod,
    riskLevel: risk.level,
    riskMessage: risk.message,
    groupMetrics: groupResults,
  });

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `ethicai-fairness-report-${mode}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};


  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-gray-700">
          Start with a demo audit (instant) or upload your own CSV (coming next).
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Demo Mode</h2>
            <p className="mt-2 text-gray-600">
              Run a demo audit on built-in sample data.
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => runDemo("sex")}
                className="rounded-xl bg-black px-4 py-2 text-white"
              >
                Run Demo (Sex)
              </button>
              <button
                onClick={() => runDemo("race")}
                className="rounded-xl border border-gray-300 px-4 py-2"
              >
                Run Demo (Race)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Upload CSV</h2>
            <p className="mt-2 text-gray-600">
              CSV upload + column selection will be added next.
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              Upload mode is coming next. For now, use Demo Mode to explore how fairness metrics behave.
            </div>
          </div>
        </div>

        {dpd !== null && eod !== null && acc !== null && (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">Accuracy (demo)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(acc)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">Demographic Parity Diff (DPD)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(dpd)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-500">Equal Opportunity Diff (EOD)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(eod)}</p>
            </div>
          </div>
        )}

        {risk && (
          <div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Fairness Risk Rating</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Based on the larger of Demographic Parity Difference (DPD) and Equal Opportunity Difference (EOD).
                </p>
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${risk.badgeClass}`}
              >
                {risk.level} Risk
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">DPD</p>
                <p className="mt-1 text-lg font-semibold">{formatPct(dpd!)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">EOD</p>
                <p className="mt-1 text-lg font-semibold">{formatPct(eod!)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Decision</p>
                <p className="mt-1 text-sm text-gray-700">{risk.message}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Note: These thresholds are educational defaults. Real deployments should use domain requirements and stakeholder policy.
            </p>
          </div>
        )}

        {groupResults.length > 0 && (
          <div className="mt-4">
            <button
              onClick={downloadReport}
              className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              Download Fairness Report (HTML)
            </button>
          </div>
        )}

        {groupResults.length > 0 && (
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <GroupBarChart
              title="Selection Rate by Group"
              valueLabel="Predicted positive rate"
              data={groupResults.map((g) => ({ group: g.group, value: g.selectionRate }))}
            />
            <GroupBarChart
              title="True Positive Rate (TPR) by Group"
              valueLabel="Opportunity (recall on positives)"
              data={groupResults.map((g) => ({ group: g.group, value: g.tpr }))}
            />
          </div>
        )}

        {groupResults.length > 0 && (
          <div className="mt-10 rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold">Metrics by Group</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2">Group</th>
                    <th className="py-2">Count</th>
                    <th className="py-2">Selection Rate</th>
                    <th className="py-2">TPR</th>
                    <th className="py-2">FPR</th>
                    <th className="py-2">FNR</th>
                  </tr>
                </thead>
                <tbody>
                  {groupResults.map((r) => (
                    <tr key={r.group} className="border-t">
                      <td className="py-2 font-medium">{r.group}</td>
                      <td className="py-2">{r.count}</td>
                      <td className="py-2">{formatPct(r.selectionRate)}</td>
                      <td className="py-2">{formatPct(r.tpr)}</td>
                      <td className="py-2">{formatPct(r.fpr)}</td>
                      <td className="py-2">{formatPct(r.fnr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Note: demo data is small and illustrative. Upload mode will support real datasets.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
