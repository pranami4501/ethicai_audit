"use client";
console.log("AUDIT PAGE LOADED - CLIENT");

import { useMemo, useState } from "react";
import {
  accuracy,
  computeGroupMetrics,
  demographicParityDifference,
  equalOpportunityDifference,
  GroupMetrics,
} from "@/lib/metrics";
import { demoRaceData, demoSexData } from "@/lib/demoData";

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function AuditPage() {
  const [mode, setMode] = useState<"none" | "sex" | "race">("none");
  const [groupResults, setGroupResults] = useState<GroupMetrics[]>([]);
  const [dpd, setDpd] = useState<number | null>(null);
  const [eod, setEod] = useState<number | null>(null);
  const [acc, setAcc] = useState<number | null>(null);

  const runDemo = (which: "sex" | "race") => {
    console.log("runDemo clicked:", which);

    try {
      const rows = which === "sex" ? demoSexData : demoRaceData;
      console.log("rows length:", rows.length, "first row:", rows[0]);

      const gm = computeGroupMetrics(rows);
      console.log("group metrics:", gm);

      setGroupResults(gm);
      setDpd(demographicParityDifference(gm));
      setEod(equalOpportunityDifference(gm));
      setAcc(accuracy(rows));
      setMode(which);

      console.log("state set successfully");
    } catch (err) {
      console.error("runDemo failed:", err);
      alert("runDemo failed — open Console to see error");
    }
  };

  const title = useMemo(() => {
    if (mode === "sex") return "Demo Audit — Sex";
    if (mode === "race") return "Demo Audit — Race";
    return "Fairness Audit";
  }, [mode]);

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
            <input className="mt-4 block w-full" type="file" accept=".csv" disabled />
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
