export type Row = {
  y_true: number;   // 0 or 1
  y_pred: number;   // 0 or 1
  group: string;    // e.g., "Male", "Female"
};

export type GroupMetrics = {
  group: string;
  count: number;
  selectionRate: number;
  tpr: number;
  fpr: number;
  fnr: number;
};

function safeDiv(num: number, den: number) {
  return den === 0 ? 0 : num / den;
}

export function computeGroupMetrics(rows: Row[]): GroupMetrics[] {
  const groups = Array.from(new Set(rows.map(r => r.group)));

  return groups.map(g => {
    const subset = rows.filter(r => r.group === g);
    const count = subset.length;

    const tp = subset.filter(r => r.y_true === 1 && r.y_pred === 1).length;
    const tn = subset.filter(r => r.y_true === 0 && r.y_pred === 0).length;
    const fp = subset.filter(r => r.y_true === 0 && r.y_pred === 1).length;
    const fn = subset.filter(r => r.y_true === 1 && r.y_pred === 0).length;

    const selectionRate = safeDiv(subset.filter(r => r.y_pred === 1).length, count);
    const tpr = safeDiv(tp, tp + fn);
    const fpr = safeDiv(fp, fp + tn);
    const fnr = safeDiv(fn, tp + fn);

    return { group: g, count, selectionRate, tpr, fpr, fnr };
  });
}

export function demographicParityDifference(metrics: GroupMetrics[]): number {
  const rates = metrics.map(m => m.selectionRate);
  return Math.max(...rates) - Math.min(...rates);
}

export function equalOpportunityDifference(metrics: GroupMetrics[]): number {
  const tprs = metrics.map(m => m.tpr);
  return Math.max(...tprs) - Math.min(...tprs);
}

export function accuracy(rows: { y_true: number; y_pred: number }[]): number {
  const correct = rows.filter(r => r.y_true === r.y_pred).length;
  return safeDiv(correct, rows.length);
}
