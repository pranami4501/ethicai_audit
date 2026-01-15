export type MergeResult = {
  merged: Record<string, any>[];
  stats: {
    leftRows: number;
    rightRows: number;
    matched: number;
    leftOnly: number;
    rightOnly: number;
  };
};

export function mergeOnId(args: {
  leftRows: Record<string, any>[];
  rightRows: Record<string, any>[];
  leftId: string;
  rightId: string;
}): MergeResult {
  const { leftRows, rightRows, leftId, rightId } = args;

  const rightMap = new Map<string, Record<string, any>>();
  for (const r of rightRows) {
    const k = r?.[rightId];
    if (k === undefined || k === null) continue;
    rightMap.set(String(k).trim(), r);
  }

  const merged: Record<string, any>[] = [];
  let matched = 0;
  let leftOnly = 0;

  for (const l of leftRows) {
    const k = l?.[leftId];
    if (k === undefined || k === null) {
      leftOnly++;
      continue;
    }

    const key = String(k).trim();
    const r = rightMap.get(key);

    if (!r) {
      leftOnly++;
      continue;
    }

    matched++;
    // merge: left data + right predictions (right overrides duplicates)
    merged.push({ ...l, ...r });
  }

  const rightOnly = Math.max(0, rightRows.length - matched);

  return {
    merged,
    stats: {
      leftRows: leftRows.length,
      rightRows: rightRows.length,
      matched,
      leftOnly,
      rightOnly,
    },
  };
}