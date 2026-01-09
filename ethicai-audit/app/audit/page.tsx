"use client";

import Papa from "papaparse";
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

function toBinaryLabel(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();

  if (s === "1" || s.toLowerCase() === "true") return 1;
  if (s === "0" || s.toLowerCase() === "false") return 0;

  // Adult-style labels
  if (s.includes(">")) return 1;   // >50K
  if (s.includes("<")) return 0;   // <=50K

  const num = Number(s);
  if (!Number.isNaN(num)) {
    if (num === 1) return 1;
    if (num === 0) return 0;
  }
  return null;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const num = Number(String(v).trim());
  return Number.isNaN(num) ? null : num;
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

  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [colTrue, setColTrue] = useState<string>("");
  const [colPred, setColPred] = useState<string>("");
  const [colGroup, setColGroup] = useState<string>("");

  const [predIsScore, setPredIsScore] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(0.5);

  const [dq, setDq] = useState<{
    uploaded: number;
    used: number;
    dropped: number;
    reasons: Record<string, number>;
  } | null>(null);

  const [auditSource, setAuditSource] = useState<"demo" | "upload" | null>(null);

  const runDemo = (which: "sex" | "race") => {
  const rows = which === "sex" ? demoSexData : demoRaceData;
  const gm = computeGroupMetrics(rows);

  setGroupResults(gm);
  setDpd(demographicParityDifference(gm));
  setEod(equalOpportunityDifference(gm));
  setAcc(accuracy(rows));
  setMode(which);
  setAuditSource("demo");
  setDq(null);
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

  const handleFile = (file: File) => {
    setParseError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = (results.data as Record<string, any>[]) || [];
        if (!data.length) {
          setParseError("CSV parsed but contained no rows.");
          return;
        }

        const cols = Object.keys(data[0] || {}).filter(Boolean);
        setRawRows(data);
        setColumns(cols);

        // Optional: helpful guesses
        const lower = cols.map((c) => c.toLowerCase().trim());
        const findCol = (options: string[]) =>
          cols[lower.findIndex((c) => options.includes(c))] || "";

        const gTrue = findCol(["y_true", "label", "target", "income"]);
        const gPred = findCol(["y_pred", "pred", "prediction", "score", "prob", "probability"]);
        const gGroup = findCol(["group", "sex", "gender", "race"]);

        if (gTrue) setColTrue(gTrue);
        if (gPred) setColPred(gPred);
        if (gGroup) setColGroup(gGroup);

        // If pred column looks like score/probability, default to score mode
        if (gPred && ["score", "prob", "probability"].some((k) => gPred.toLowerCase().includes(k))) {
          setPredIsScore(true);
        }
      },
      error: (err) => setParseError(err.message),
    });
  };

  const runAuditFromRows = (rows: Record<string, any>[]) => {
    if (!colTrue || !colPred || !colGroup) {
      setParseError("Please select columns for y_true, y_pred/score, and group.");
      return;
    }

    const reasons: Record<string, number> = {};
    const bump = (k: string) => (reasons[k] = (reasons[k] || 0) + 1);

    const cleaned: { y_true: number; y_pred: number; group: string }[] = [];

    for (const r of rows) {
      const gRaw = r[colGroup];
      const g =
        gRaw !== undefined && gRaw !== null ? String(gRaw).trim() : "";

      if (!g) {
        bump("missing_group");
        continue;
      }

      const yTrue = toBinaryLabel(r[colTrue]);
      if (yTrue === null) {
        bump("invalid_y_true");
        continue;
      }

      if (predIsScore) {
        const score = toNumber(r[colPred]);
        if (score === null) {
          bump("invalid_score");
          continue;
        }
        const yPred = score >= threshold ? 1 : 0;
        cleaned.push({ y_true: yTrue, y_pred: yPred, group: g });
      } else {
        const yPred = toBinaryLabel(r[colPred]);
        if (yPred === null) {
          bump("invalid_y_pred");
          continue;
        }
        cleaned.push({ y_true: yTrue, y_pred: yPred, group: g });
      }
    }

    const uploaded = rows.length;
    const used = cleaned.length;
    const dropped = uploaded - used;

    setDq({ uploaded, used, dropped, reasons });
    setAuditSource("upload");

    if (used < 10) {
      setParseError("Not enough usable rows after cleaning.");
      return;
    }

    const gm = computeGroupMetrics(cleaned);
    setGroupResults(gm);
    setDpd(demographicParityDifference(gm));
    setEod(equalOpportunityDifference(gm));
    setAcc(accuracy(cleaned));
    setMode("none");
    setParseError(null);
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
              Upload a CSV and select the label, prediction, and group columns to audit fairness.
            </p>

            <input
              className="mt-4 block w-full"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {parseError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {parseError}
              </div>
            )}

            {columns.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">y_true column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colTrue}
                      onChange={(e) => setColTrue(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">y_pred / score column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colPred}
                      onChange={(e) => setColPred(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 text-gray-600">group column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colGroup}
                      onChange={(e) => setColGroup(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="predIsScore"
                    type="checkbox"
                    checked={predIsScore}
                    onChange={(e) => setPredIsScore(e.target.checked)}
                  />
                  <label htmlFor="predIsScore" className="text-sm text-gray-700">
                    Prediction column is a probability/score (use threshold)
                  </label>
                </div>

                {predIsScore && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">Threshold</p>
                      <p className="text-sm font-medium">{threshold.toFixed(2)}</p>
                    </div>
                    <input
                      className="mt-2 w-full"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                    />
                  </div>
                )}

                <button
                  onClick={() => runAuditFromRows(rawRows)}
                  className="rounded-xl bg-black px-4 py-2 text-white"
                >
                  Run Audit on Uploaded Data
                </button>
              </div>
            )}
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

        {dq && (
          <div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Data Quality Summary</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Shows how many rows were usable after validation. Processing happens locally in your browser.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                Source: Uploaded CSV
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Rows uploaded</p>
                <p className="mt-1 text-xl font-semibold">{dq.uploaded}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Rows used</p>
                <p className="mt-1 text-xl font-semibold">{dq.used}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Rows dropped</p>
                <p className="mt-1 text-xl font-semibold">{dq.dropped}</p>
              </div>
            </div>

            {dq.dropped > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-800">Top drop reasons</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {Object.entries(dq.reasons)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between border-b py-1">
                        <span className="capitalize">{k.replaceAll("_", " ")}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
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
