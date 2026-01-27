"use client";

import { mergeOnId } from "@/lib/csvBuilder";
import Papa from "papaparse";
import { buildHtmlReport } from "@/lib/report";
import { useMemo, useState, useRef, useEffect} from "react";
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
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [wizardMode, setWizardMode] = useState<boolean>(true);

  const [datasetName, setDatasetName] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");

  // Main dataset
  const [mainRows, setMainRows] = useState<Record<string, any>[]>([]);
  const [mainCols, setMainCols] = useState<string[]>([]);
  const [mainError, setMainError] = useState<string | null>(null);

  // Predictions dataset
  const [predRows, setPredRows] = useState<Record<string, any>[]>([]);
  const [predCols, setPredCols] = useState<string[]>([]);
  const [predError, setPredError] = useState<string | null>(null);

  const [idMain, setIdMain] = useState<string>("");
  const [idPred, setIdPred] = useState<string>("");

  const [mergedRows, setMergedRows] = useState<Record<string, any>[]>([]);
  const [mergeStats, setMergeStats] = useState<any | null>(null);


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

useEffect(() => {
  const ready = groupResults.length > 0 && dpd !== null && eod !== null && acc !== null;
  if (ready && resultsRef.current) {
    resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, [groupResults, dpd, eod, acc]);



  const title = useMemo(() => {
    if (mode === "sex") return "Demo Audit — Sex";
    if (mode === "race") return "Demo Audit — Race";
    return "Fairness Audit";
  }, [mode]);
  const risk = dpd !== null && eod !== null ? riskFromGaps(dpd, eod) : null;

  const downloadSampleCsv = () => {
    const sample = `y_true,y_pred,group
  1,1,Female
  1,0,Female
  0,1,Male
  0,0,Male
  1,1,Male
  0,0,Female
  1,0,Female
  0,1,Male
  `;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ethicai-sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };


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
    datasetName,
    modelName,
    threshold: predIsScore ? threshold : null,
    generatedAt: new Date().toISOString(),
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

  const parseCsvFile = (file: File, onDone: (rows: Record<string, any>[], cols: string[]) => void, onErr: (msg: string) => void) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as Record<string, any>[]) || [];
        if (!rows.length) {
          onErr("CSV parsed but contained no rows.");
          return;
        }
        const cols = Object.keys(rows[0] || {}).filter(Boolean);
        onDone(rows, cols);
      },
      error: (err) => onErr(err.message),
    });
  };

  const doMerge = () => {
    if (!mainRows.length) {
      setMainError("Please upload a Main Dataset CSV first.");
      return;
    }
    if (!predRows.length) {
      setPredError("Please upload a Predictions CSV first.");
      return;
    }
    if (!idMain || !idPred) {
      setMainError("Select ID columns for both files.");
      return;
    }

    const res = mergeOnId({
      leftRows: mainRows,
      rightRows: predRows,
      leftId: idMain,
      rightId: idPred,
    });

    setMergedRows(res.merged);
    setMergeStats(res.stats);

    // After merge, reuse your existing upload audit pipeline:
    setRawRows(res.merged);

    // Create combined columns list for dropdowns
    const cols = Object.keys(res.merged[0] || {}).filter(Boolean);
    setColumns(cols);

    setParseError(null);
  };

  const handleMainFile = (file: File) => {
    setMainError(null);
    parseCsvFile(
      file,
      (rows, cols) => {
        setMainRows(rows);
        setMainCols(cols);
        // helpful guess for id
        const guess = cols.find((c) => ["id", "user_id", "case_id"].includes(c.toLowerCase().trim()));
        if (guess) setIdMain(guess);
      },
      (msg) => setMainError(msg)
    );
  };

  const handlePredFile = (file: File) => {
    setPredError(null);
    parseCsvFile(
      file,
      (rows, cols) => {
        setPredRows(rows);
        setPredCols(cols);
        const guess = cols.find((c) => ["id", "user_id", "case_id"].includes(c.toLowerCase().trim()));
        if (guess) setIdPred(guess);
      },
      (msg) => setPredError(msg)
    );
  };


  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-gray-700">
          Explore an example audit (demo) or audit your own model outputs using a CSV workflow.
        </p>

        <details className="mt-6 rounded-2xl border border-gray-200 p-4 bg-gray-50">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">
            How does this tool work? (for non-technical users)
          </summary>

          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <p>
              This tool helps you check whether a classification model treats different groups
              (such as gender or race) differently in its predictions.
            </p>

            <div>
              <p className="font-medium">What data do I need?</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>
                  <b>y_true</b>: the real outcome that actually happened (for example:
                  did someone repay a loan, was income above 50K, etc.).
                </li>
                <li>
                  <b>y_pred</b> or <b>score</b>: what the model predicted.
                  <ul className="ml-4 mt-1 list-disc">
                    <li><b>y_pred</b> = predicted class (0 or 1)</li>
                    <li><b>score</b> = probability (between 0 and 1)</li>
                  </ul>
                </li>
                <li>
                  <b>group</b>: the group you want to audit fairness for
                  (for example: Male/Female, race categories, age groups).
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium">Where does this data usually come from?</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>
                  <b>y_true</b> comes from historical outcomes in your dataset.
                </li>
                <li>
                  <b>y_pred / score</b> comes from running your model and exporting its predictions.
                </li>
                <li>
                  <b>group</b> comes from demographic or categorical fields you already track.
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium">What if I don’t have a model?</p>
              <p className="mt-1">
                You can use the <b>Demo Mode</b> to see how fairness metrics behave,
                or upload example data using the provided sample CSV template.
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 border border-gray-200">
              <p className="text-xs text-gray-700">
                🔒 <b>Privacy note:</b> All files are processed locally in your browser.
                No data is uploaded to any server.
              </p>
            </div>
          </div>
        </details>


        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Example Model (Demo)</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                Demo
              </span>
            </div>

            <p className="mt-2 text-gray-700">
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
                className="rounded-xl border border-gray-700 px-4 py-2"
              >
                Run Demo (Race)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-300 p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">Audit Your Model</h2>
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700">
                    Upload
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={wizardMode}
                  onChange={(e) => setWizardMode(e.target.checked)}
                />
                Guided mode
              </label>
            </div>

            <p className="mt-2 text-gray-700">
              {wizardMode
                ? "Upload a main dataset + a predictions file, then merge by an ID column."
                : "Upload a CSV and select the label, prediction, and group columns to audit fairness."}
            </p>

            {/* ---------------- Guided Mode (P1.7) ---------------- */}
            {wizardMode && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-700 font-medium">Step 1 — Main Dataset CSV</p>
                  <p className="text-xs text-gray-700">
                    Contains demographics (group) and real outcomes (y_true). Example: a historical dataset.
                  </p>

                  <input
                    className="mt-2 block w-full"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleMainFile(f);
                    }}
                  />

                  {mainError && <p className="mt-2 text-sm text-red-700">{mainError}</p>}

                  {mainCols.length > 0 && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-700">Main ID column</label>
                      <select
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={idMain}
                        onChange={(e) => setIdMain(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {mainCols.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-700 font-medium">Step 2 — Predictions CSV</p>
                  <p className="text-xs text-gray-700">
                    Contains model outputs (y_pred or score) and an ID column to match rows.
                  </p>

                  <input
                    className="mt-2 block w-full"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePredFile(f);
                    }}
                  />

                  {predError && <p className="mt-2 text-sm text-red-700">{predError}</p>}

                  {predCols.length > 0 && (
                    <div className="mt-2">
                      <label className="text-sm text-gray-700">Predictions ID column</label>
                      <select
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={idPred}
                        onChange={(e) => setIdPred(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {predCols.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button onClick={doMerge} className="rounded-xl bg-black px-4 py-2 text-white">
                  Merge files and continue
                </button>

                {mergeStats && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    <p className="font-medium">Merge summary</p>
                    <ul className="mt-2 space-y-1">
                      <li>Main rows: {mergeStats.leftRows}</li>
                      <li>Prediction rows: {mergeStats.rightRows}</li>
                      <li>Matched rows: {mergeStats.matched}</li>
                      <li>Main-only rows: {mergeStats.leftOnly}</li>
                      <li>Prediction-only rows: {mergeStats.rightOnly}</li>
                    </ul>
                  </div>
                )}

                {columns.length > 0 && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700">Step 3 — Select audit columns</p>
                    <p className="mt-1 text-xs text-gray-700">
                      Choose which columns represent the ground truth outcome, model prediction, and group.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ---------------- Simple Mode (your existing upload UI) ---------------- */}
            {!wizardMode && (
              <div className="mt-4">
                <input
                  className="block w-full"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />

                <div className="mt-3">
                  <button
                    onClick={downloadSampleCsv}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Download Sample CSV
                  </button>
                  <p className="mt-2 text-xs text-gray-700">
                    Tip: Use this template to format your data (y_true, y_pred/score, group).
                  </p>
                </div>
              </div>
            )}

            {parseError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {parseError}
              </div>
            )}

            {/* Shared: column selection + audit button (works for both modes) */}
            {columns.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">
                    <div className="mb-1 text-gray-700">y_true column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colTrue}
                      onChange={(e) => setColTrue(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 text-gray-700">y_pred / score column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colPred}
                      onChange={(e) => setColPred(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="mb-1 text-gray-700">group column</div>
                    <select
                      className="w-full rounded-xl border border-gray-300 px-3 py-2"
                      value={colGroup}
                      onChange={(e) => setColGroup(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700">
                      Dataset name (optional)
                    </label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="e.g., Adult Income (UCI)"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700">
                      Model name / version (optional)
                    </label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g., Logistic Regression v1"
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={() => runAuditFromRows(rawRows)}
                  className="rounded-xl bg-black px-4 py-2 text-white"
                >
                  Run Audit
                </button>
              </div>
            )}
          </div>
        </div>

        {dpd !== null && eod !== null && acc !== null && (
          <div ref={resultsRef} className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-700">Accuracy (demo)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(acc)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-700">Demographic Parity Diff (DPD)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(dpd)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-6">
              <p className="text-sm text-gray-700">Equal Opportunity Diff (EOD)</p>
              <p className="mt-2 text-2xl font-semibold">{formatPct(eod)}</p>
            </div>
          </div>
        )}

        {risk && (
          <div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Fairness Risk Rating</h3>
                <p className="mt-1 text-sm text-gray-700">
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
                <p className="text-xs text-gray-700">DPD</p>
                <p className="mt-1 text-lg font-semibold">{formatPct(dpd!)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-700">EOD</p>
                <p className="mt-1 text-lg font-semibold">{formatPct(eod!)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-700">Decision</p>
                <p className="mt-1 text-sm text-gray-700">{risk.message}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-700">
              Note: These thresholds are educational defaults. Real deployments should use domain requirements and stakeholder policy.
            </p>
          </div>
        )}

        {dq && (
          <div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Data Quality Summary</h3>
                <p className="mt-1 text-sm text-gray-700">
                  Shows how many rows were usable after validation. Processing happens locally in your browser.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                Source: Uploaded CSV
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-700">Rows uploaded</p>
                <p className="mt-1 text-xl font-semibold">{dq.uploaded}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-700">Rows used</p>
                <p className="mt-1 text-xl font-semibold">{dq.used}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-700">Rows dropped</p>
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
                <thead className="text-left text-gray-700">
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

            <p className="mt-4 text-sm text-gray-700">
              Note: demo data is small and illustrative. Upload mode will support real datasets.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
