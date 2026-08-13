import { describe, it, expect } from 'vitest';
import {
  type MergeCell,
  type RowCellPlan,
  isInMergeCell,
  getMergeInfo,
  calcRenderRect,
  generateMergeCells,
  calcMergeRowCount,
  buildMergeCoveredSet,
  planRowCells,
  buildMergeRuns,
  findMergeRun,
  clampMergeRunsToWindow,
  mergeRunsInRange,
  buildMergesFromSpan,
  type MergeRuns,
} from './merge';

/** Sum of colSpan across all cells in a plan */
function colSpanSum(plan: RowCellPlan[]): number {
  return plan.reduce((s, c) => s + c.colSpan, 0);
}

/** Convenience: extract types only */
function types(plan: RowCellPlan[]): string[] {
  return plan.map((c) => c.type);
}

/** Convenience: extract colSpans only */
function colSpans(plan: RowCellPlan[]): number[] {
  return plan.map((c) => c.colSpan);
}

// --------------- isInMergeCell ---------------

describe('isInMergeCell', () => {
  const merge: MergeCell = { rowIndex: 2, colIndex: 3, rowspan: 3, colspan: 2 };
  // covers rows 2-4, cols 3-4

  it('returns true for the primary cell', () => {
    expect(isInMergeCell(merge, 2, 3)).toBe(true);
  });

  it('returns true for cells inside the merge area', () => {
    expect(isInMergeCell(merge, 3, 3)).toBe(true);
    expect(isInMergeCell(merge, 4, 4)).toBe(true);
    expect(isInMergeCell(merge, 2, 4)).toBe(true);
  });

  it('returns true for boundary cells', () => {
    expect(isInMergeCell(merge, 4, 3)).toBe(true); // bottom-left
    expect(isInMergeCell(merge, 4, 4)).toBe(true); // bottom-right
    expect(isInMergeCell(merge, 2, 4)).toBe(true); // top-right
  });

  it('returns false for cells outside the merge area', () => {
    expect(isInMergeCell(merge, 1, 3)).toBe(false); // above
    expect(isInMergeCell(merge, 5, 3)).toBe(false); // below
    expect(isInMergeCell(merge, 2, 2)).toBe(false); // left
    expect(isInMergeCell(merge, 2, 5)).toBe(false); // right
    expect(isInMergeCell(merge, 0, 0)).toBe(false); // far away
  });

  it('handles 1x1 merge (single cell)', () => {
    const single: MergeCell = { rowIndex: 5, colIndex: 5, rowspan: 1, colspan: 1 };
    expect(isInMergeCell(single, 5, 5)).toBe(true);
    expect(isInMergeCell(single, 5, 6)).toBe(false);
    expect(isInMergeCell(single, 6, 5)).toBe(false);
  });

  it('handles merge starting at origin (0,0)', () => {
    const origin: MergeCell = { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 3 };
    expect(isInMergeCell(origin, 0, 0)).toBe(true);
    expect(isInMergeCell(origin, 1, 2)).toBe(true);
    expect(isInMergeCell(origin, 2, 0)).toBe(false);
    expect(isInMergeCell(origin, 0, 3)).toBe(false);
  });

  it('handles wide single-row merge', () => {
    const wide: MergeCell = { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 10 };
    expect(isInMergeCell(wide, 0, 0)).toBe(true);
    expect(isInMergeCell(wide, 0, 9)).toBe(true);
    expect(isInMergeCell(wide, 0, 10)).toBe(false);
    expect(isInMergeCell(wide, 1, 0)).toBe(false);
  });

  it('handles tall single-column merge', () => {
    const tall: MergeCell = { rowIndex: 0, colIndex: 5, rowspan: 10, colspan: 1 };
    expect(isInMergeCell(tall, 0, 5)).toBe(true);
    expect(isInMergeCell(tall, 9, 5)).toBe(true);
    expect(isInMergeCell(tall, 10, 5)).toBe(false);
    expect(isInMergeCell(tall, 0, 4)).toBe(false);
  });
});

// --------------- getMergeInfo ---------------

describe('getMergeInfo', () => {
  const merges: MergeCell[] = [
    { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 3 },  // A: rows 0-1, cols 0-2
    { rowIndex: 5, colIndex: 5, rowspan: 3, colspan: 2 },  // B: rows 5-7, cols 5-6
    { rowIndex: 10, colIndex: 0, rowspan: 1, colspan: 1 },  // C: single cell at (10,0)
  ];

  it('returns the correct merge for primary cell', () => {
    expect(getMergeInfo(merges, 0, 0)).toBe(merges[0]);
    expect(getMergeInfo(merges, 5, 5)).toBe(merges[1]);
    expect(getMergeInfo(merges, 10, 0)).toBe(merges[2]);
  });

  it('returns the correct merge for covered cells', () => {
    expect(getMergeInfo(merges, 0, 1)).toBe(merges[0]);
    expect(getMergeInfo(merges, 0, 2)).toBe(merges[0]);
    expect(getMergeInfo(merges, 1, 0)).toBe(merges[0]);
    expect(getMergeInfo(merges, 1, 2)).toBe(merges[0]);
    expect(getMergeInfo(merges, 7, 6)).toBe(merges[1]);
  });

  it('returns null for cells not in any merge', () => {
    expect(getMergeInfo(merges, 0, 3)).toBeNull();
    expect(getMergeInfo(merges, 2, 0)).toBeNull();
    expect(getMergeInfo(merges, 3, 3)).toBeNull();
    expect(getMergeInfo(merges, 100, 100)).toBeNull();
  });

  it('returns null for empty merges array', () => {
    expect(getMergeInfo([], 0, 0)).toBeNull();
  });

  it('returns the first matching merge when overlapping definitions exist', () => {
    const overlapping: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 2 },
      { rowIndex: 1, colIndex: 1, rowspan: 2, colspan: 2 },
    ];
    // cell (1,1) is in both — should return the first one
    expect(getMergeInfo(overlapping, 1, 1)).toBe(overlapping[0]);
  });
});

// --------------- calcRenderRect ---------------

describe('calcRenderRect', () => {
  it('returns the original rect when no merges exist', () => {
    const rect = calcRenderRect([], { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect).toEqual(expect.objectContaining({ ys: 5, ye: 15, xs: 2, xe: 8 }));
  });

  it('returns the original rect when merges are fully inside the rect', () => {
    const merges: MergeCell[] = [
      { rowIndex: 7, colIndex: 4, rowspan: 2, colspan: 2 },
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect).toEqual(expect.objectContaining({ ys: 5, ye: 15, xs: 2, xe: 8 }));
  });

  it('expands upward when a merge on the top row starts above', () => {
    const merges: MergeCell[] = [
      { rowIndex: 3, colIndex: 4, rowspan: 4, colspan: 1 },
    ];
    // merge covers rows 3-6; visible top row is 5
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.ys).toBe(3);
  });

  it('expands downward when a merge on the bottom row extends below', () => {
    const merges: MergeCell[] = [
      { rowIndex: 14, colIndex: 4, rowspan: 5, colspan: 1 },
    ];
    // merge covers rows 14-18; visible bottom row is 15
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.ye).toBe(18);
  });

  it('expands left when a merge on the left edge starts further left', () => {
    const merges: MergeCell[] = [
      { rowIndex: 5, colIndex: 0, rowspan: 1, colspan: 5 },
    ];
    // merge covers cols 0-4; visible left col is 2
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.xs).toBe(0);
  });

  it('expands right when a merge on the right edge extends further right', () => {
    const merges: MergeCell[] = [
      { rowIndex: 5, colIndex: 6, rowspan: 1, colspan: 5 },
    ];
    // merge covers cols 6-10; visible right col is 8
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.xe).toBe(10);
  });

  it('expands in multiple directions simultaneously', () => {
    const merges: MergeCell[] = [
      { rowIndex: 3, colIndex: 0, rowspan: 4, colspan: 3 },  // top-left corner
      { rowIndex: 14, colIndex: 7, rowspan: 3, colspan: 4 }, // bottom-right corner
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.ys).toBe(3);
    expect(rect.xs).toBe(0);
    expect(rect.ye).toBe(16);
    expect(rect.xe).toBe(10);
  });

  it('handles merge crossing the top-left corner', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 10, colspan: 10 },
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 8, xs: 5, xe: 8 });
    expect(rect.ys).toBe(0);
    expect(rect.xs).toBe(0);
    expect(rect.ye).toBe(9);
    expect(rect.xe).toBe(9);
  });

  it('does not shrink the rect even if merges are smaller', () => {
    const merges: MergeCell[] = [
      { rowIndex: 5, colIndex: 2, rowspan: 1, colspan: 1 },
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect).toEqual(expect.objectContaining({ ys: 5, ye: 15, xs: 2, xe: 8 }));
  });

  it('handles 1x1 visible rect with a large merge', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 20, colspan: 20 },
    ];
    const rect = calcRenderRect(merges, { ys: 10, ye: 10, xs: 10, xe: 10 });
    expect(rect.ys).toBe(0);
    expect(rect.ye).toBe(19);
    expect(rect.xs).toBe(0);
    expect(rect.xe).toBe(19);
  });

  it('handles multiple merges along the top boundary', () => {
    const merges: MergeCell[] = [
      { rowIndex: 3, colIndex: 2, rowspan: 3, colspan: 1 }, // starts above, on left
      { rowIndex: 4, colIndex: 5, rowspan: 3, colspan: 1 }, // starts above, middle
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 10, xs: 2, xe: 8 });
    expect(rect.ys).toBe(3);
  });

  it('handles merges only on left boundary expanding xs', () => {
    const merges: MergeCell[] = [
      { rowIndex: 7, colIndex: 1, rowspan: 1, colspan: 3 },
    ];
    // merge covers cols 1-3; visible xs is 2
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.xs).toBe(1);
  });

  it('handles merges only on right boundary expanding xe', () => {
    const merges: MergeCell[] = [
      { rowIndex: 7, colIndex: 7, rowspan: 1, colspan: 4 },
    ];
    // merge covers cols 7-10; visible xe is 8
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.xe).toBe(10);
  });

  it('ignores merges completely outside the visible rect', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 2 },   // above-left
      { rowIndex: 20, colIndex: 20, rowspan: 2, colspan: 2 }, // below-right
    ];
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 5, xe: 10 });
    expect(rect).toEqual(expect.objectContaining({ ys: 5, ye: 15, xs: 5, xe: 10 }));
  });

  it('expands top boundary with colspan on the top row', () => {
    const merges: MergeCell[] = [
      { rowIndex: 3, colIndex: 4, rowspan: 3, colspan: 3 },
    ];
    // merge at (3,4) with colspan 3 → cols 4-6; visible top is row 5, cols 2-8
    const rect = calcRenderRect(merges, { ys: 5, ye: 15, xs: 2, xe: 8 });
    expect(rect.ys).toBe(3);
    // xs should also expand if the merge's colIndex < xs, but here colIndex=4 > xs=2
    expect(rect.xs).toBe(2);
  });

  it('caller-expanded columns: merge at col 15 found when xe already includes 15', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 15, rowspan: 7, colspan: 1 },
    ];
    // Simulates _mergeRenderControl receiving already-expanded column range [5,17]
    const rect = calcRenderRect(merges, { ys: 6, ye: 30, xs: 5, xe: 17 });
    expect(rect.ys).toBe(0);
    expect(rect.xe).toBe(17);
  });

  it('caller-expanded columns: merge not found when xe too small', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 15, rowspan: 7, colspan: 1 },
    ];
    // With base column range [5,12], col 15 is outside scan range
    const rect = calcRenderRect(merges, { ys: 6, ye: 30, xs: 5, xe: 12 });
    expect(rect.ys).toBe(6);
    expect(rect.xe).toBe(12);
  });
});

// --------------- generateMergeCells ---------------

describe('generateMergeCells', () => {
  it('generates placeholder merges for all four boundary regions', () => {
    const originRect = { ys: 3, ye: 10, xs: 2, xe: 6 };
    const renderRect = { ys: 0, ye: 13, xs: 0, xe: 8 };

    const topMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 2, colspan: 2 };
    const topMerge2: MergeCell = { rowIndex: 0, colIndex: 4, rowspan: 4, colspan: 1 };
    const topMerge3: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };

    const leftMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 2, colspan: 2 };
    const leftMerge2: MergeCell = { rowIndex: 6, colIndex: 0, rowspan: 1, colspan: 3 };
    const leftMerge3: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };

    const rightMerge1: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };
    const rightMerge2: MergeCell = { rowIndex: 6, colIndex: 6, rowspan: 1, colspan: 3 };
    const rightMerge3: MergeCell = { rowIndex: 10, colIndex: 6, rowspan: 2, colspan: 2 };

    const bottomMerge1: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };
    const bottomMerge2: MergeCell = { rowIndex: 10, colIndex: 4, rowspan: 4, colspan: 1 };
    const bottomMerge3: MergeCell = { rowIndex: 10, colIndex: 6, rowspan: 2, colspan: 2 };

    const result = generateMergeCells(originRect, renderRect, {
      top: [topMerge1, topMerge2, topMerge3],
      left: [leftMerge1, leftMerge2, leftMerge3],
      right: [rightMerge1, rightMerge2, rightMerge3],
      bottom: [bottomMerge1, bottomMerge2, bottomMerge3],
    });

    const expected: MergeCell[] = [
      // 顶部
      { rowIndex: 0, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 3, rowspan: 3, colspan: 1 },

      { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 8, rowspan: 3, colspan: 1 },

      // 左侧
      { rowIndex: 3, colIndex: 0, rowspan: 1, colspan: 1 },
      { rowIndex: 4, colIndex: 0, rowspan: 2, colspan: 2 },
      { rowIndex: 7, colIndex: 0, rowspan: 3, colspan: 2 },
      { rowIndex: 10, colIndex: 0, rowspan: 1, colspan: 1 },

      // 右侧
      { rowIndex: 2, colIndex: 8, rowspan: 2, colspan: 1 },
      { rowIndex: 4, colIndex: 7, rowspan: 2, colspan: 2 },
      { rowIndex: 7, colIndex: 7, rowspan: 3, colspan: 2 },
      { rowIndex: 10, colIndex: 8, rowspan: 2, colspan: 1 },

      // 底部
      { rowIndex: 11, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 3, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 8, rowspan: 3, colspan: 1 },
    ];

    expect(result).toEqual(expected);
  });
});

// describe('generateMergeCells', () => {
//   it('generates placeholder merges for all four boundary regions', () => {
//     const originRect = { ys: 3, ye: 10, xs: 2, xe: 6 };
//     const renderRect = { ys: 0, ye: 13, xs: 0, xe: 8 };

//     const topMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 3, colspan: 2 };
//     const topMerge2: MergeCell = { rowIndex: 0, colIndex: 4, rowspan: 4, colspan: 1 };
//     const topMerge3: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };

//     const leftMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 3, colspan: 2 };
//     const leftMerge2: MergeCell = { rowIndex: 6, colIndex: 0, rowspan: 1, colspan: 3 };
//     const leftMerge3: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };

//     const rightMerge1: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };
//     const rightMerge2: MergeCell = { rowIndex: 6, colIndex: 6, rowspan: 1, colspan: 3 };
//     const rightMerge3: MergeCell = { rowIndex: 9, colIndex: 6, rowspan: 3, colspan: 2 };

//     const bottomMerge1: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };
//     const bottomMerge2: MergeCell = { rowIndex: 10, colIndex: 4, rowspan: 4, colspan: 1 };
//     const bottomMerge3: MergeCell = { rowIndex: 9, colIndex: 6, rowspan: 3, colspan: 2 };

//     const result = generateMergeCells(originRect, renderRect, {
//       top: [topMerge1, topMerge2, topMerge3],
//       left: [leftMerge1, leftMerge2, leftMerge3],
//       right: [rightMerge1, rightMerge2, rightMerge3],
//       bottom: [bottomMerge1, bottomMerge2, bottomMerge3],
//     });

//     const expected: MergeCell[] = [
//       // 顶部
//       { rowIndex: 0, colIndex: 0, rowspan: 3, colspan: 1 },
//       { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 2 },
//       { rowIndex: 0, colIndex: 3, rowspan: 3, colspan: 1 },

//       { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 1 },
//       { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 2 },
//       { rowIndex: 0, colIndex: 8, rowspan: 3, colspan: 1 },

//       // 左侧
//       { rowIndex: 3, colIndex: 0, rowspan: 1, colspan: 1 },
//       { rowIndex: 5, colIndex: 0, rowspan: 1, colspan: 2 },
//       { rowIndex: 7, colIndex: 0, rowspan: 3, colspan: 2 },
//       { rowIndex: 10, colIndex: 0, rowspan: 1, colspan: 1 },

//       // 右侧
//       { rowIndex: 2, colIndex: 8, rowspan: 2, colspan: 1 },
//       { rowIndex: 4, colIndex: 7, rowspan: 2, colspan: 2 },
//       { rowIndex: 7, colIndex: 7, rowspan: 2, colspan: 2 },
//       { rowIndex: 9, colIndex: 8, rowspan: 3, colspan: 1 },

//       // 底部
//       { rowIndex: 11, colIndex: 0, rowspan: 3, colspan: 1 },
//       { rowIndex: 11, colIndex: 3, rowspan: 3, colspan: 1 },
//       { rowIndex: 11, colIndex: 5, rowspan: 3, colspan: 1 },
//       { rowIndex: 11, colIndex: 8, rowspan: 3, colspan: 1 },
//     ];

//     expect(result).toEqual(expected);
//   });
// });

// --------------- generateMergeCells ---------------

describe('generateMergeCells', () => {
  it('generates placeholder merges for all four boundary regions', () => {
    const originRect = { ys: 3, ye: 10, xs: 2, xe: 6 };
    const renderRect = { ys: 0, ye: 13, xs: 0, xe: 8 };

    const topMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 2, colspan: 2 };
    const topMerge2: MergeCell = { rowIndex: 0, colIndex: 4, rowspan: 4, colspan: 1 };
    const topMerge3: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };

    const leftMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 2, colspan: 2 };
    const leftMerge2: MergeCell = { rowIndex: 6, colIndex: 0, rowspan: 1, colspan: 3 };
    const leftMerge3: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };

    const rightMerge1: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };
    const rightMerge2: MergeCell = { rowIndex: 6, colIndex: 6, rowspan: 1, colspan: 3 };
    const rightMerge3: MergeCell = { rowIndex: 10, colIndex: 6, rowspan: 2, colspan: 2 };

    const bottomMerge1: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };
    const bottomMerge2: MergeCell = { rowIndex: 10, colIndex: 4, rowspan: 4, colspan: 1 };
    const bottomMerge3: MergeCell = { rowIndex: 10, colIndex: 6, rowspan: 2, colspan: 2 };

    const result = generateMergeCells(originRect, renderRect, {
      top: [topMerge1, topMerge2, topMerge3],
      left: [leftMerge1, leftMerge2, leftMerge3],
      right: [rightMerge1, rightMerge2, rightMerge3],
      bottom: [bottomMerge1, bottomMerge2, bottomMerge3],
    });

    const expected: MergeCell[] = [
      // 顶部
      { rowIndex: 0, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 3, rowspan: 3, colspan: 1 },

      { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 8, rowspan: 3, colspan: 1 },

      // 左侧
      { rowIndex: 3, colIndex: 0, rowspan: 1, colspan: 1 },
      { rowIndex: 4, colIndex: 0, rowspan: 2, colspan: 2 },
      { rowIndex: 7, colIndex: 0, rowspan: 3, colspan: 2 },
      { rowIndex: 10, colIndex: 0, rowspan: 1, colspan: 1 },

      // 右侧
      { rowIndex: 2, colIndex: 8, rowspan: 2, colspan: 1 },
      { rowIndex: 4, colIndex: 7, rowspan: 2, colspan: 2 },
      { rowIndex: 7, colIndex: 7, rowspan: 3, colspan: 2 },
      { rowIndex: 10, colIndex: 8, rowspan: 2, colspan: 1 },

      // 底部
      { rowIndex: 11, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 3, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 8, rowspan: 3, colspan: 1 },
    ];

    expect(result).toEqual(expected);
  });
});

describe('generateMergeCells', () => {
  it('generates placeholder merges for all four boundary regions', () => {
    const originRect = { ys: 3, ye: 10, xs: 2, xe: 6 };
    const renderRect = { ys: 0, ye: 13, xs: 0, xe: 8 };

    const topMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 3, colspan: 2 };
    const topMerge2: MergeCell = { rowIndex: 0, colIndex: 4, rowspan: 4, colspan: 1 };
    const topMerge3: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };

    const leftMerge1: MergeCell = { rowIndex: 2, colIndex: 1, rowspan: 3, colspan: 2 };
    const leftMerge2: MergeCell = { rowIndex: 6, colIndex: 0, rowspan: 1, colspan: 3 };
    const leftMerge3: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };

    const rightMerge1: MergeCell = { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 };
    const rightMerge2: MergeCell = { rowIndex: 6, colIndex: 6, rowspan: 1, colspan: 3 };
    const rightMerge3: MergeCell = { rowIndex: 9, colIndex: 6, rowspan: 3, colspan: 2 };

    const bottomMerge1: MergeCell = { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 };
    const bottomMerge2: MergeCell = { rowIndex: 10, colIndex: 4, rowspan: 4, colspan: 1 };
    const bottomMerge3: MergeCell = { rowIndex: 9, colIndex: 6, rowspan: 3, colspan: 2 };

    const result = generateMergeCells(originRect, renderRect, {
      top: [topMerge1, topMerge2, topMerge3],
      left: [leftMerge1, leftMerge2, leftMerge3],
      right: [rightMerge1, rightMerge2, rightMerge3],
      bottom: [bottomMerge1, bottomMerge2, bottomMerge3],
    });

    const expected: MergeCell[] = [
      // 顶部
      { rowIndex: 0, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 3, rowspan: 3, colspan: 1 },

      { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 2 },
      { rowIndex: 0, colIndex: 8, rowspan: 3, colspan: 1 },

      // 左侧
      { rowIndex: 3, colIndex: 0, rowspan: 1, colspan: 1 },
      { rowIndex: 5, colIndex: 0, rowspan: 1, colspan: 2 },
      { rowIndex: 7, colIndex: 0, rowspan: 3, colspan: 2 },
      { rowIndex: 10, colIndex: 0, rowspan: 1, colspan: 1 },

      // 右侧
      { rowIndex: 2, colIndex: 8, rowspan: 2, colspan: 1 },
      { rowIndex: 4, colIndex: 7, rowspan: 2, colspan: 2 },
      { rowIndex: 7, colIndex: 7, rowspan: 2, colspan: 2 },
      { rowIndex: 9, colIndex: 8, rowspan: 3, colspan: 1 },

      // 底部
      { rowIndex: 11, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 3, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 5, rowspan: 3, colspan: 1 },
      { rowIndex: 11, colIndex: 8, rowspan: 3, colspan: 1 },
    ];

    expect(result).toEqual(expected);
  });
});

// --------------- calcMergeRowCount ---------------

describe('calcMergeRowCount', () => {
  it('returns defaultCount when both data and merges are undefined', () => {
    expect(calcMergeRowCount(undefined, undefined, 1)).toBe(1);
    expect(calcMergeRowCount(undefined, undefined, 0)).toBe(0);
  });

  it('returns defaultCount when data is empty and merges is undefined', () => {
    expect(calcMergeRowCount([], undefined, 1)).toBe(1);
  });

  it('returns data.length when data is provided', () => {
    expect(calcMergeRowCount([['a'], ['b']], undefined, 1)).toBe(2);
    expect(calcMergeRowCount([['a'], ['b'], ['c']], undefined, 1)).toBe(3);
  });

  it('data takes priority over merges', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 5, colspan: 1 },
    ];
    expect(calcMergeRowCount([['a'], ['b']], merges, 1)).toBe(2);
  });

  it('computes from merges when data is undefined', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
      { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
    ];
    // max(rowIndex + rowspan) = max(1, 1) = 1
    expect(calcMergeRowCount(undefined, merges, 1)).toBe(1);
  });

  it('computes multi-row from merges with varying rowspan', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
      { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 1 },
    ];
    // max(0+1, 0+2) = 2
    expect(calcMergeRowCount(undefined, merges, 1)).toBe(2);
  });

  it('computes from merges starting at non-zero rows', () => {
    const merges: MergeCell[] = [
      { rowIndex: 1, colIndex: 0, rowspan: 3, colspan: 1 },
    ];
    // rowIndex(1) + rowspan(3) = 4
    expect(calcMergeRowCount(undefined, merges, 1)).toBe(4);
  });

  it('returns defaultCount when merges is empty', () => {
    expect(calcMergeRowCount(undefined, [], 0)).toBe(0);
    expect(calcMergeRowCount(undefined, [], 1)).toBe(1);
  });

  it('handles header scenario (default=1)', () => {
    expect(calcMergeRowCount(undefined, undefined, 1)).toBe(1);
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 5 },
      { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 1 },
    ];
    expect(calcMergeRowCount(undefined, merges, 1)).toBe(3);
  });

  it('handles footer scenario (default=0)', () => {
    expect(calcMergeRowCount(undefined, undefined, 0)).toBe(0);
    expect(calcMergeRowCount([['total', '', '100']], undefined, 0)).toBe(1);
  });
});

// --------------- buildMergeCoveredSet ---------------

describe('buildMergeCoveredSet', () => {
  it('returns empty set for empty merges', () => {
    const covered = buildMergeCoveredSet([]);
    expect(covered.size).toBe(0);
  });

  it('returns empty set for a 1x1 merge (no covered cells)', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 1 },
    ]);
    expect(covered.size).toBe(0);
  });

  it('does not include the primary cell', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 2, colIndex: 3, rowspan: 2, colspan: 2 },
    ]);
    expect(covered.has('2,3')).toBe(false);
  });

  it('includes all non-primary cells for a 2x2 merge', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 2 },
    ]);
    expect(covered.has('0,0')).toBe(false); // primary
    expect(covered.has('0,1')).toBe(true);
    expect(covered.has('1,0')).toBe(true);
    expect(covered.has('1,1')).toBe(true);
    expect(covered.size).toBe(3);
  });

  it('handles a 1xN merge (single row, multiple cols)', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 4 },
    ]);
    expect(covered.has('0,0')).toBe(false); // primary
    expect(covered.has('0,1')).toBe(true);
    expect(covered.has('0,2')).toBe(true);
    expect(covered.has('0,3')).toBe(true);
    expect(covered.size).toBe(3);
  });

  it('handles an Nx1 merge (multiple rows, single col)', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 2, colIndex: 5, rowspan: 3, colspan: 1 },
    ]);
    expect(covered.has('2,5')).toBe(false); // primary
    expect(covered.has('3,5')).toBe(true);
    expect(covered.has('4,5')).toBe(true);
    expect(covered.size).toBe(2);
  });

  it('handles multiple non-overlapping merges', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 3 },
      { rowIndex: 0, colIndex: 3, rowspan: 1, colspan: 3 },
      { rowIndex: 0, colIndex: 6, rowspan: 2, colspan: 1 },
    ]);
    // merge 0: covers (0,1) (0,2) → 2 cells
    // merge 1: covers (0,4) (0,5) → 2 cells
    // merge 2: covers (1,6) → 1 cell
    expect(covered.has('0,1')).toBe(true);
    expect(covered.has('0,2')).toBe(true);
    expect(covered.has('0,4')).toBe(true);
    expect(covered.has('0,5')).toBe(true);
    expect(covered.has('1,6')).toBe(true);
    expect(covered.size).toBe(5);
  });

  it('handles a large merge', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 0, colIndex: 0, rowspan: 5, colspan: 5 },
    ]);
    // 5x5 = 25 cells, minus primary = 24
    expect(covered.size).toBe(24);
    expect(covered.has('0,0')).toBe(false);
    expect(covered.has('4,4')).toBe(true);
    expect(covered.has('2,3')).toBe(true);
  });

  it('correctly handles merges with non-zero starting position', () => {
    const covered = buildMergeCoveredSet([
      { rowIndex: 10, colIndex: 20, rowspan: 2, colspan: 3 },
    ]);
    expect(covered.has('10,20')).toBe(false); // primary
    expect(covered.has('10,21')).toBe(true);
    expect(covered.has('10,22')).toBe(true);
    expect(covered.has('11,20')).toBe(true);
    expect(covered.has('11,21')).toBe(true);
    expect(covered.has('11,22')).toBe(true);
    expect(covered.size).toBe(5);
  });
});

// --------------- optional perf benchmark ---------------

function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function intBetween(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function makeBenchmarkMerges(
  count: number,
  rowCount: number,
  colCount: number,
  seed: number,
): MergeCell[] {
  const rand = createSeededRandom(seed);
  const merges: MergeCell[] = [];
  for (let i = 0; i < count; i++) {
    const rowIndex = intBetween(rand, 0, rowCount - 1);
    const colIndex = intBetween(rand, 0, colCount - 1);
    const maxRowspan = Math.min(8, rowCount - rowIndex);
    const maxColspan = Math.min(6, colCount - colIndex);
    merges.push({
      rowIndex,
      colIndex,
      rowspan: intBetween(rand, 1, Math.max(1, maxRowspan)),
      colspan: intBetween(rand, 1, Math.max(1, maxColspan)),
    });
  }
  return merges;
}

function hrtimeMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

if (process.env.MERGE_BENCH === '1') {
  describe('merge perf benchmark (opt-in)', () => {
    it('benchmarks calcRenderRect + planRowCells', () => {
      const rowCount = 20000;
      const colCount = 200;
      const mergeCount = 12000;
      const merges = makeBenchmarkMerges(mergeCount, rowCount, colCount, 20260408);
      const windows = 120;

      let calcTotal = 0;
      let planTotal = 0;
      let checksum = 0;

      for (let i = 0; i < windows; i++) {
        const ys = (i * 137) % (rowCount - 80);
        const ye = ys + 60;
        const xs = (i * 17) % (colCount - 40);
        const xe = xs + 25;

        const t1 = hrtimeMs();
        const rect = calcRenderRect(merges, { ys, ye, xs, xe });
        const t2 = hrtimeMs();
        calcTotal += t2 - t1;

        const renderMerges = rect.placeholderMerges.length > 0
          ? [...rect.placeholderMerges, ...merges]
          : merges;

        const p1 = hrtimeMs();
        for (let r = rect.ys; r <= rect.ye; r++) {
          const plan = planRowCells(
            renderMerges,
            r,
            rect.xs,
            rect.xe,
            colCount,
          );
          checksum += colSpanSum(plan);
        }
        const p2 = hrtimeMs();
        planTotal += p2 - p1;
      }

      // eslint-disable-next-line no-console
      console.log(
        `[MERGE_BENCH] merges=${mergeCount} windows=${windows} ` +
          `calcRenderRect=${calcTotal.toFixed(2)}ms ` +
          `planRowCells=${planTotal.toFixed(2)}ms checksum=${checksum}`,
      );

      expect(checksum).toBeGreaterThan(0);
    });
  });
}

// --------------- planRowCells ---------------
// These tests simulate "scroll to column X" by setting renderColBegin / renderColEnd.
// totalCenterCols = 30 in most tests (mimics a table with 30 non-fixed columns).

describe('planRowCells', () => {
  const TOTAL = 30;

  // ---- no merges ----

  describe('without merges', () => {
    it('all columns visible (no padding needed)', () => {
      const plan = planRowCells([], 0, 0, 29, TOTAL);
      expect(plan.length).toBe(30);
      expect(plan.every((c) => c.type === 'cell')).toBe(true);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });

    it('scrolled to middle — left pad + visible + right pad', () => {
      const plan = planRowCells([], 0, 5, 15, TOTAL);
      expect(types(plan)).toEqual(['pad', ...Array(11).fill('cell'), 'pad']);
      expect(plan[0].colSpan).toBe(5);                // left pad
      expect(plan[plan.length - 1].colSpan).toBe(14);  // right pad (30 - 16)
      expect(colSpanSum(plan)).toBe(TOTAL);
    });

    it('scrolled to far right — left pad + visible cells, no right pad', () => {
      const plan = planRowCells([], 0, 20, 29, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(20);
      expect(plan.filter((c) => c.type === 'cell').length).toBe(10);
      expect(plan.filter((c) => c.type === 'pad').length).toBe(1); // left only
      expect(colSpanSum(plan)).toBe(TOTAL);
    });

    it('scrolled to far left — visible cells + right pad', () => {
      const plan = planRowCells([], 0, 0, 9, TOTAL);
      expect(plan[0].type).toBe('cell');
      expect(plan.filter((c) => c.type === 'cell').length).toBe(10);
      expect(plan[plan.length - 1].type).toBe('pad');
      expect(plan[plan.length - 1].colSpan).toBe(20);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- merge fully inside the visible area ----

  describe('merge fully inside visible area', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 7, rowspan: 3, colspan: 2 },
    ];

    it('primary row sees merge cell with colspan + rowspan', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const mergeCells = plan.filter((c) => c.type === 'merge');
      expect(mergeCells.length).toBe(1);
      expect(mergeCells[0].colIndex).toBe(7);
      expect(mergeCells[0].colSpan).toBe(2);
      expect(mergeCells[0].rowSpan).toBe(3);
    });

    it('covered row skips the merged columns', () => {
      // Row 1 is covered by the merge at (0,7) rowspan=3
      const plan = planRowCells(merges, 1, 5, 15, TOTAL);
      const visibleIndices = plan
        .filter((c) => c.type === 'cell' || c.type === 'merge')
        .map((c) => c.colIndex);
      expect(visibleIndices).not.toContain(7);
      expect(visibleIndices).not.toContain(8);
    });

    it('primary row: colSpanSum equals TOTAL', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });

    it('covered rows: colSpanSum < TOTAL (rowSpan from above occupies cols)', () => {
      for (const row of [1, 2]) {
        const plan = planRowCells(merges, row, 5, 15, TOTAL);
        // 2 columns (7,8) are covered by rowSpan from above in visible area
        expect(colSpanSum(plan)).toBe(TOTAL - 2);
        // no 'merge' type on covered rows
        expect(plan.filter((c) => c.type === 'merge').length).toBe(0);
      }
    });
  });

  // ---- merge crosses left padding boundary ----

  describe('merge starts in left pad area, extends into visible', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 2, rowspan: 1, colspan: 4 },
    ];
    // merge covers cols 2-5; visible cols start at 5

    it('left pad keeps cb width (Vue-compatible)', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(5);
      const firstData = plan.find((c) => c.type === 'cell');
      expect(firstData?.colIndex).toBe(6);
    });

    it('covered rows also have expanded left pad', () => {
      // This merge is rowspan=1, so row 1 should not be affected
      const plan = planRowCells(merges, 1, 5, 15, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(5); // normal, no expansion
    });
  });

  // ---- merge crosses right padding boundary ----

  describe('merge starts in visible area, extends into right pad', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 14, rowspan: 1, colspan: 4 },
    ];
    // merge covers cols 14-17; visible cols end at 15

    it('primary row sees the merge cell even though it extends into pad', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const mergeCells = plan.filter((c) => c.type === 'merge');
      expect(mergeCells.length).toBe(1);
      expect(mergeCells[0].colIndex).toBe(14);
      expect(mergeCells[0].colSpan).toBe(4);
    });

    it('right pad keeps fixed width by viewport end', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const rightPad = plan[plan.length - 1];
      expect(rightPad.type).toBe('pad');
      expect(rightPad.colSpan).toBe(14);
    });
  });

  // ---- merge fully in left pad ----

  describe('merge fully inside left pad (not visible at all)', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 2 },
    ];

    it('does not create a merge cell; pad absorbs it', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      // merge cols 0-1 are entirely within pad 0-4
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(5); // not expanded beyond cb=5
      const mergeCells = plan.filter((c) => c.type === 'merge');
      expect(mergeCells.length).toBe(0);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- merge fully in right pad ----

  describe('merge fully inside right pad (not visible at all)', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 25, rowspan: 1, colspan: 3 },
    ];

    it('does not create a merge cell; pad is normal', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const mergeCells = plan.filter((c) => c.type === 'merge');
      expect(mergeCells.length).toBe(0);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- multiple merges on the same row ----

  describe('multiple merges on the same row', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 2, rowspan: 1, colspan: 2 },  // cols 2-3 (left pad area when cb=5)
      { rowIndex: 0, colIndex: 7, rowspan: 1, colspan: 3 },  // cols 7-9 (visible)
      { rowIndex: 0, colIndex: 14, rowspan: 2, colspan: 3 }, // cols 14-16 (crosses right pad)
    ];

    it('handles all merges correctly in one row', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const mergeCells = plan.filter((c) => c.type === 'merge');
      // merge at col 2-3 is in pad area → no merge cell
      // merge at col 7-9 is visible → 1 merge cell
      // merge at col 14-16 starts visible, extends into pad → 1 merge cell
      expect(mergeCells.length).toBe(2);
      expect(mergeCells[0].colIndex).toBe(7);
      expect(mergeCells[0].colSpan).toBe(3);
      expect(mergeCells[1].colIndex).toBe(14);
      expect(mergeCells[1].colSpan).toBe(3);
      expect(colSpanSum(plan)).toBe(31);
    });
  });

  // ---- rowspan: primary on one row, covered on another ----

  describe('rowspan spanning multiple rows', () => {
    const merges: MergeCell[] = [
      { rowIndex: 5, colIndex: 10, rowspan: 4, colspan: 2 },
    ];

    it('row 5 (primary): merge cell with rowSpan=4', () => {
      const plan = planRowCells(merges, 5, 5, 15, TOTAL);
      const m = plan.find((c) => c.type === 'merge');
      expect(m).toBeDefined();
      expect(m!.colIndex).toBe(10);
      expect(m!.rowSpan).toBe(4);
      expect(m!.colSpan).toBe(2);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });

    it('rows 6-8 (covered): cols 10-11 are skipped', () => {
      for (const row of [6, 7, 8]) {
        const plan = planRowCells(merges, row, 5, 15, TOTAL);
        const allDataCols = plan
          .filter((c) => c.type === 'cell')
          .map((c) => c.colIndex);
        expect(allDataCols).not.toContain(10);
        expect(allDataCols).not.toContain(11);
        // no merge type cells on covered rows
        expect(plan.filter((c) => c.type === 'merge').length).toBe(0);
      }
    });

    it('row 9 (outside merge): cols 10-11 are normal cells again', () => {
      const plan = planRowCells(merges, 9, 5, 15, TOTAL);
      const allDataCols = plan
        .filter((c) => c.type === 'cell')
        .map((c) => c.colIndex);
      expect(allDataCols).toContain(10);
      expect(allDataCols).toContain(11);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- colspan=1 rowspan=1 (degenerate merge, behaves like normal cell) ----

  describe('1x1 merge', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 10, rowspan: 1, colspan: 1 },
    ];

    it('renders as a merge cell with no extra span', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      const m = plan.find((c) => c.type === 'merge');
      expect(m).toBeDefined();
      expect(m!.colSpan).toBe(1);
      expect(m!.rowSpan).toBe(1);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- scroll so visible window is exactly one column ----

  describe('single visible column', () => {
    it('normal cell — pad + cell + pad', () => {
      const plan = planRowCells([], 0, 10, 10, TOTAL);
      expect(types(plan)).toEqual(['pad', 'cell', 'pad']);
      expect(colSpans(plan)).toEqual([10, 1, 19]);
    });

    it('merge primary covers several cols — pad + merge + pad', () => {
      const merges: MergeCell[] = [
        { rowIndex: 0, colIndex: 10, rowspan: 1, colspan: 5 },
      ];
      const plan = planRowCells(merges, 0, 10, 10, TOTAL);
      expect(types(plan)).toEqual(['pad', 'merge', 'pad']);
      expect(plan[1].colSpan).toBe(5);
      expect(plan[2].colSpan).toBe(19);
      expect(colSpanSum(plan)).toBe(34);
    });

    it('covered cell — pad + pad only (no data cell)', () => {
      const merges: MergeCell[] = [
        { rowIndex: 0, colIndex: 9, rowspan: 1, colspan: 3 },
      ];
      // col 10 is covered (primary is at col 9)
      const plan = planRowCells(merges, 0, 10, 10, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(10);
      // no data cells, just right pad
      const rightPad = plan[plan.length - 1];
      expect(rightPad.type).toBe('pad');
      expect(rightPad.colSpan).toBe(19);
      expect(colSpanSum(plan)).toBe(29);
    });
  });

  // ---- real-world scenario: the bug from the user's earlier report ----
  // merge { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 2 }, scrolled so cb=0

  describe('merge at origin with colspan=2, scrolled to col 0', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 2 },
    ];

    it('renders merge cell with colSpan=2 + remaining cells', () => {
      const plan = planRowCells(merges, 0, 0, 9, TOTAL);
      expect(plan[0].type).toBe('merge');
      expect(plan[0].colIndex).toBe(0);
      expect(plan[0].colSpan).toBe(2);
      // next cells: 2,3,4,5,6,7,8,9
      expect(plan[1].type).toBe('cell');
      expect(plan[1].colIndex).toBe(2);
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- large merge spanning most of the visible area ----

  describe('large merge spanning entire visible area', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 3, rowspan: 2, colspan: 20 },
    ];

    it('primary row: pad + merge + pad', () => {
      const plan = planRowCells(merges, 0, 5, 15, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(5);
      const rightPad = plan[plan.length - 1];
      expect(rightPad.type).toBe('pad');
      expect(rightPad.colSpan).toBe(14);
      expect(colSpanSum(plan)).toBe(19);
    });

    it('covered row: all visible cols are covered', () => {
      const plan = planRowCells(merges, 1, 5, 15, TOTAL);
      expect(plan[0].type).toBe('pad');
      expect(plan[0].colSpan).toBe(5);
      expect(colSpanSum(plan)).toBe(19);
    });

    it('row outside merge: normal rendering', () => {
      const plan = planRowCells(merges, 2, 5, 15, TOTAL);
      const cells = plan.filter((c) => c.type === 'cell');
      expect(cells.length).toBe(11); // cols 5-15
      expect(colSpanSum(plan)).toBe(TOTAL);
    });
  });

  // ---- structural invariants across many scroll positions ----

  describe('structural invariants across scroll positions', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 1, rowspan: 2, colspan: 1 },
      { rowIndex: 0, colIndex: 5, rowspan: 3, colspan: 3 },
      { rowIndex: 2, colIndex: 10, rowspan: 1, colspan: 4 },
      { rowIndex: 5, colIndex: 25, rowspan: 2, colspan: 5 },
    ];

    const scrollPositions = [
      [0, 29], [0, 9], [10, 19], [20, 29],
      [5, 5], [0, 0], [29, 29], [3, 12], [7, 26],
    ] as const;

    for (const [cb, ce] of scrollPositions) {
      for (let row = 0; row < 8; row++) {
        it(`row=${row} cb=${cb} ce=${ce}: valid plan structure`, () => {
          const plan = planRowCells(merges, row, cb, ce, TOTAL);

          expect(plan.length).toBeGreaterThan(0);

          for (const cell of plan) {
            expect(cell.colSpan).toBeGreaterThan(0);
            expect(cell.rowSpan).toBeGreaterThan(0);
          }

          expect(colSpanSum(plan)).toBeLessThanOrEqual(TOTAL + 8);
          expect(colSpanSum(plan)).toBeGreaterThan(0);

          // pad cells only at edges, data/merge cells contiguous in middle
          const firstData = plan.findIndex((c) => c.type !== 'pad');
          const lastData =
            plan.length -
            1 -
            [...plan].reverse().findIndex((c) => c.type !== 'pad');
          if (firstData >= 0 && lastData >= firstData) {
            for (let i = firstData; i <= lastData; i++) {
              expect(['cell', 'merge']).toContain(plan[i].type);
            }
          }

          // merge cells have correct info
          for (const cell of plan) {
            if (cell.type === 'merge') {
              const info = getMergeInfo(merges, row, cell.colIndex);
              expect(info).not.toBeNull();
              expect(info!.rowIndex).toBe(row);
              expect(info!.colIndex).toBe(cell.colIndex);
              expect(cell.colSpan).toBe(info!.colspan);
              expect(cell.rowSpan).toBe(info!.rowspan);
            }
          }

          // no merge cell on covered rows
          const hasMergeFromAbove = merges.some(
            (m) => m.rowIndex < row && m.rowIndex + m.rowspan > row,
          );
          for (const cell of plan) {
            if (cell.type === 'merge') {
              const info = getMergeInfo(merges, row, cell.colIndex);
              expect(info!.rowIndex).toBe(row);
            }
          }
        });
      }
    }
  });

  // ---- primary rows: colSpanSum == TOTAL (no rowSpan from above) ----

  describe('primary rows (no rowSpan from above): colSpanSum is stable and positive', () => {
    const merges: MergeCell[] = [
      { rowIndex: 0, colIndex: 5, rowspan: 1, colspan: 3 },
      { rowIndex: 0, colIndex: 15, rowspan: 1, colspan: 2 },
      { rowIndex: 3, colIndex: 10, rowspan: 1, colspan: 5 },
    ];

    const scrollPositions = [
      [0, 29], [0, 9], [10, 19], [20, 29], [5, 5], [3, 12],
    ] as const;

    for (const [cb, ce] of scrollPositions) {
      for (const row of [0, 3, 5, 10]) {
        it(`row=${row} cb=${cb} ce=${ce}: colSpanSum > 0`, () => {
          const plan = planRowCells(merges, row, cb, ce, TOTAL);
          expect(colSpanSum(plan)).toBeGreaterThan(0);
        });
      }
    }
  });
});

// --------------- generateMergeCells vs vue-virt-grid reference ---------------

describe('generateMergeCells vs vue-virt-grid reference', () => {
  /**
   * 边界扫描辅助函数 — 提取 renderRect 和四个方向的边界 merge 数组。
   * 逻辑与 calcRenderRect 中的扫描完全一致。
   */
  function scanBoundaries(
    merges: MergeCell[],
    originRect: { ys: number; ye: number; xs: number; xe: number },
  ) {
    const { ys: oys, ye: oye, xs: oxs, xe: oxe } = originRect;
    let rys = oys,
      rye = oye,
      rxs = oxs,
      rxe = oxe;
    const topMerges: MergeCell[] = [];
    const leftMerges: MergeCell[] = [];
    const rightMerges: MergeCell[] = [];
    const bottomMerges: MergeCell[] = [];

    for (let y = oys; y <= oye; y++) {
      for (let x = oxs; x <= oxe; x++) {
        if (y === oys) {
          const info = getMergeInfo(merges, y, x);
          if (info) {
            rys = Math.min(rys, info.rowIndex);
            rxs = Math.min(rxs, info.colIndex);
            rxe = Math.max(rxe, info.colIndex + info.colspan - 1);
            if (y > info.rowIndex) topMerges.push(info);
          }
        }
        if (x === oxs) {
          const info = getMergeInfo(merges, y, x);
          if (info) {
            rxs = Math.min(rxs, info.colIndex);
            if (x > info.colIndex) leftMerges.push(info);
          }
        }
        if (x === oxe) {
          const info = getMergeInfo(merges, y, x);
          if (info) {
            rxe = Math.max(rxe, info.colIndex + info.colspan - 1);
            rightMerges.push(info);
          }
        }
        if (y === oye) {
          const info = getMergeInfo(merges, y, x);
          if (info) {
            rye = Math.max(rye, info.rowIndex + info.rowspan - 1);
            bottomMerges.push(info);
          }
        }
      }
    }

    return {
      renderRect: { ys: rys, ye: rye, xs: rxs, xe: rxe },
      boundary: {
        top: topMerges,
        left: leftMerges,
        right: rightMerges,
        bottom: bottomMerges,
      },
    };
  }

  /**
   * vue-virt-grid 原始占位合并单元格生成逻辑（忠实移植，保留原始 bug）。
   * 来源: vue-virt-grid-kolarorz/src/store/merges.ts calcRect() lines 56-296
   */
  function refGenerate(
    originRect: { ys: number; ye: number; xs: number; xe: number },
    renderRect: { ys: number; ye: number; xs: number; xe: number },
    boundaryMerges: {
      top: MergeCell[];
      left: MergeCell[];
      right: MergeCell[];
      bottom: MergeCell[];
    },
  ): MergeCell[] {
    const { ys: oys, ye: oye, xs: oxs, xe: oxe } = originRect;
    const { ys: rys, ye: rye, xs: rxs, xe: rxe } = renderRect;
    const result: MergeCell[] = [];

    function unique(arr: MergeCell[]): MergeCell[] {
      return arr.filter(
        (m, i) =>
          arr.findIndex(
            (n) =>
              n.rowIndex === m.rowIndex &&
              n.colIndex === m.colIndex &&
              n.rowspan === m.rowspan &&
              n.colspan === m.colspan,
          ) === i,
      );
    }

    // 顶部（与 clamp 版本逻辑一致，不涉及 clamp 问题）
    if (oys > rys) {
      const cells: MergeCell[] = [
        {
          rowIndex: rys,
          colIndex: rxs,
          rowspan: oys - rys,
          colspan: rxe - rxs + 1,
        },
      ];
      for (const merge of unique(boundaryMerges.top)) {
        const { rowIndex, colIndex, colspan } = merge;
        const last = cells.pop()!;
        const {
          rowIndex: lr,
          colIndex: lc,
          rowspan: lrs,
          colspan: lcs,
        } = last;
        if (colIndex > lc)
          cells.push({
            rowIndex: lr,
            colIndex: lc,
            rowspan: lrs,
            colspan: colIndex - lc,
          });
        if (rowIndex > lr)
          cells.push({
            rowIndex: lr,
            colIndex,
            rowspan: rowIndex - lr,
            colspan,
          });
        if (colIndex + colspan - 1 < lc + lcs - 1)
          cells.push({
            rowIndex: lr,
            colIndex: colIndex + colspan,
            rowspan: lrs,
            colspan: lc + lcs - 1 - (colIndex + colspan - 1),
          });
      }
      result.push(...cells);
    }

    // 左边（使用 isTop/isLast 手动 clamp，有 isTop && isLast 同时为 true 的 bug）
    if (oxs > rxs) {
      const cells: MergeCell[] = [
        {
          rowIndex: oys,
          colIndex: rxs,
          rowspan: oye - oys + 1,
          colspan: oxs - rxs,
        },
      ];
      for (const merge of unique(boundaryMerges.left)) {
        const { rowIndex, colIndex, rowspan } = merge;
        const last = cells.pop()!;
        const {
          rowIndex: lr,
          colIndex: lc,
          colspan: lcs,
          rowspan: lrs,
        } = last;
        if (rowIndex > lr)
          cells.push({
            rowIndex: lr,
            colIndex: lc,
            rowspan: rowIndex - lr,
            colspan: lcs,
          });
        if (colIndex > lc) {
          const isTop = rowIndex < lr;
          const isLast = rowIndex + rowspan - 1 > lr + lrs - 1;
          cells.push({
            rowIndex: isTop ? lr : rowIndex,
            colIndex: lc,
            rowspan: isTop
              ? lr - rowIndex
              : isLast
                ? lr + lrs - rowIndex
                : rowspan,
            colspan: colIndex - lc,
          });
        }
        if (rowIndex + rowspan - 1 < lr + lrs - 1)
          cells.push({
            rowIndex: rowIndex + rowspan,
            colIndex: lc,
            rowspan: lr + lrs - 1 - (rowIndex + rowspan - 1),
            colspan: lcs,
          });
      }
      result.push(...cells);
    }

    // 右边（使用原始 merge 坐标，未做 clamp）
    if (oxe < rxe) {
      const cells: MergeCell[] = [
        {
          rowIndex: oys,
          colIndex: oxe + 1,
          rowspan: oye - oys + 1,
          colspan: rxe - oxe,
        },
      ];
      for (const merge of unique(boundaryMerges.right)) {
        const { rowIndex, colIndex, rowspan, colspan } = merge;
        const last = cells.pop()!;
        const {
          rowIndex: lr,
          colIndex: lc,
          colspan: lcs,
          rowspan: lrs,
        } = last;
        if (rowIndex > lr)
          cells.push({
            rowIndex: lr,
            colIndex: lc,
            rowspan: rowIndex - lr,
            colspan: lcs,
          });
        if (colIndex + colspan - 1 < lc + lcs - 1)
          cells.push({
            rowIndex,
            colIndex: colIndex + colspan,
            rowspan,
            colspan: lc + lcs - 1 - (colIndex + colspan - 1),
          });
        if (rowIndex + rowspan - 1 < lr + lrs - 1)
          cells.push({
            rowIndex: rowIndex + rowspan,
            colIndex: lc,
            rowspan: lr + lrs - 1 - (rowIndex + rowspan - 1),
            colspan: lcs,
          });
      }
      result.push(...cells);
    }

    // 底边（有 colspanLast 混用 bug）
    if (oye < rye) {
      const cells: MergeCell[] = [
        {
          rowIndex: oye + 1,
          colIndex: rxs,
          rowspan: rye - oye,
          colspan: rxe - rxs + 1,
        },
      ];
      for (const merge of unique(boundaryMerges.bottom)) {
        const { rowIndex, colIndex, rowspan, colspan } = merge;
        const last = cells.pop()!;
        const {
          rowIndex: lr,
          colIndex: lc,
          colspan: lcs,
          rowspan: lrs,
        } = last;
        if (colIndex > lc)
          cells.push({
            rowIndex: lr,
            colIndex: lc,
            rowspan: lrs,
            colspan: colIndex - lc,
          });
        if (rowIndex + rowspan - 1 < lr)
          cells.push({
            rowIndex: lr,
            colIndex,
            rowspan: lr + lcs - rowIndex - colspan,
            colspan,
          });
        if (colIndex + colspan - 1 < lc + lcs - 1)
          cells.push({
            rowIndex: lr,
            colIndex: colIndex + colspan,
            rowspan: lrs,
            colspan: lc + lcs - colIndex - colspan,
          });
      }
      result.push(...cells);
    }

    return result;
  }

  // 5 个不同场景
  const scenarios: Array<{
    name: string;
    merges: MergeCell[];
    originRect: { ys: number; ye: number; xs: number; xe: number };
  }> = [
    {
      name: '场景1: 简单四边各一个 merge，无越界',
      merges: [
        { rowIndex: 0, colIndex: 3, rowspan: 4, colspan: 1 },
        { rowIndex: 5, colIndex: 0, rowspan: 1, colspan: 3 },
        { rowIndex: 5, colIndex: 8, rowspan: 1, colspan: 2 },
        { rowIndex: 9, colIndex: 3, rowspan: 3, colspan: 1 },
      ],
      originRect: { ys: 3, ye: 9, xs: 2, xe: 8 },
    },
    {
      name: '场景2: 右侧 merge 跨越区域上方 (raw coords bug)',
      merges: [
        { rowIndex: 1, colIndex: 7, rowspan: 4, colspan: 1 },
        { rowIndex: 5, colIndex: 7, rowspan: 1, colspan: 3 },
      ],
      originRect: { ys: 3, ye: 8, xs: 2, xe: 7 },
    },
    {
      name: '场景3: 底部有 merge 不越界 + merge 越界 (colspanLast bug)',
      merges: [
        { rowIndex: 8, colIndex: 3, rowspan: 1, colspan: 1 },
        { rowIndex: 8, colIndex: 6, rowspan: 3, colspan: 1 },
      ],
      originRect: { ys: 3, ye: 8, xs: 2, xe: 7 },
    },
    {
      name: '场景4: 综合验证 (已通过的测试用例)',
      merges: [
        { rowIndex: 0, colIndex: 4, rowspan: 4, colspan: 1 },
        { rowIndex: 2, colIndex: 1, rowspan: 2, colspan: 2 },
        { rowIndex: 2, colIndex: 6, rowspan: 2, colspan: 2 },
        { rowIndex: 6, colIndex: 0, rowspan: 1, colspan: 3 },
        { rowIndex: 6, colIndex: 6, rowspan: 1, colspan: 3 },
        { rowIndex: 10, colIndex: 1, rowspan: 2, colspan: 2 },
        { rowIndex: 10, colIndex: 4, rowspan: 4, colspan: 1 },
        { rowIndex: 10, colIndex: 6, rowspan: 2, colspan: 2 },
      ],
      originRect: { ys: 3, ye: 10, xs: 2, xe: 6 },
    },
    {
      name: '场景5: 顶部+底部密集 merge，多个 merge 同一方向',
      merges: [
        { rowIndex: 0, colIndex: 1, rowspan: 3, colspan: 1 },
        { rowIndex: 0, colIndex: 4, rowspan: 2, colspan: 2 },
        { rowIndex: 8, colIndex: 2, rowspan: 3, colspan: 1 },
        { rowIndex: 8, colIndex: 5, rowspan: 4, colspan: 1 },
      ],
      originRect: { ys: 2, ye: 8, xs: 0, xe: 6 },
    },
  ];

  for (const s of scenarios) {
    it(s.name, () => {
      const { renderRect, boundary } = scanBoundaries(s.merges, s.originRect);
      const ours = generateMergeCells(s.originRect, renderRect, boundary);
      const ref = refGenerate(s.originRect, renderRect, boundary);

      // 在测试输出中打印两者对比
      console.log(`\n=== ${s.name} ===`);
      console.log('originRect:', s.originRect);
      console.log('renderRect:', renderRect);
      console.log(
        'boundary (unique refs):',
        JSON.stringify({
          top: [...new Set(boundary.top)].length,
          left: [...new Set(boundary.left)].length,
          right: [...new Set(boundary.right)].length,
          bottom: [...new Set(boundary.bottom)].length,
        }),
      );
      console.log('OURS  :', JSON.stringify(ours));
      console.log('REF   :', JSON.stringify(ref));

      const match = JSON.stringify(ours) === JSON.stringify(ref);
      console.log('MATCH :', match ? '✅ 一致' : '❌ 不一致');

      if (!match) {
        console.log('--- 差异分析 ---');
        const maxLen = Math.max(ours.length, ref.length);
        for (let i = 0; i < maxLen; i++) {
          const o = ours[i];
          const r = ref[i];
          const same = JSON.stringify(o) === JSON.stringify(r);
          if (!same) {
            console.log(
              `  [${i}] OURS: ${JSON.stringify(o) ?? 'undefined'}`,
            );
            console.log(
              `  [${i}] REF : ${JSON.stringify(r) ?? 'undefined'}`,
            );
          }
        }
      }

      // 不用 expect 断言，仅对比记录差异（vue-virt-grid 原版有已知 bug）
    });
  }
});

// ============================================================================
// 按值自动合并：分段索引 + 窗口裁剪
// ============================================================================

/** 从一列值造分段索引，默认 colIndex 0 */
function runsOf(values: unknown[], opts: Partial<Parameters<typeof buildMergeRuns>[0]> = {}): MergeRuns {
  return buildMergeRuns({
    colIndex: 0,
    rowCount: values.length,
    keyOf: (i) => values[i],
    ...opts,
  });
}

const startsOf = (runs: MergeRuns): number[] => Array.from(runs.starts);

describe('buildMergeRuns', () => {
  it('相邻同值成段', () => {
    // A A A B B C
    expect(startsOf(runsOf(['A', 'A', 'A', 'B', 'B', 'C']))).toEqual([0, 3, 5]);
  });

  it('全同值 → 一段；全不同 → 每行一段', () => {
    expect(startsOf(runsOf(['A', 'A', 'A', 'A']))).toEqual([0]);
    expect(startsOf(runsOf(['A', 'B', 'C']))).toEqual([0, 1, 2]);
  });

  it('空列表不报错', () => {
    const runs = runsOf([]);
    expect(startsOf(runs)).toEqual([]);
    expect(findMergeRun(runs, 0)).toBeNull();
  });

  it('undefined 键表示该行不参与合并，且会打断两侧', () => {
    // A A undefined A A —— 中间那行自成一段，前后两段不能连起来
    expect(startsOf(runsOf(['A', 'A', undefined, 'A', 'A']))).toEqual([0, 2, 3]);
  });

  it('null 与 0 / 空串都是正常键，不当作「不参与」', () => {
    expect(startsOf(runsOf([null, null, 0, 0, '', '']))).toEqual([0, 2, 4]);
  });

  it('键用 !== 比较，不做深比较（对象每行都断）', () => {
    const a = { v: 1 };
    expect(startsOf(runsOf([{ v: 1 }, { v: 1 }]))).toEqual([0, 1]);
    expect(startsOf(runsOf([a, a]))).toEqual([0]);
  });

  it('isBoundary 强制断开（分组行 / 树层级变化）', () => {
    // 值全同，但第 2 行是结构边界
    const runs = runsOf(['A', 'A', 'A', 'A'], { isBoundary: (i) => i === 2 });
    expect(startsOf(runs)).toEqual([0, 2]);
  });

  it('maxSpan 限制单段跨度', () => {
    // 7 行同值，maxSpan=3 → 0-2 / 3-5 / 6
    expect(startsOf(runsOf(Array(7).fill('A'), { maxSpan: 3 }))).toEqual([0, 3, 6]);
  });

  it('maxSpan 为 0 或负数视为不限', () => {
    expect(startsOf(runsOf(Array(5).fill('A'), { maxSpan: 0 }))).toEqual([0]);
  });
});

describe('findMergeRun', () => {
  const runs = runsOf(['A', 'A', 'A', 'B', 'B', 'C']);

  it('段内任意一行都能定位到同一段', () => {
    expect(findMergeRun(runs, 0)).toEqual({ start: 0, end: 2 });
    expect(findMergeRun(runs, 1)).toEqual({ start: 0, end: 2 });
    expect(findMergeRun(runs, 2)).toEqual({ start: 0, end: 2 });
    expect(findMergeRun(runs, 3)).toEqual({ start: 3, end: 4 });
    expect(findMergeRun(runs, 5)).toEqual({ start: 5, end: 5 });
  });

  it('越界返回 null', () => {
    expect(findMergeRun(runs, -1)).toBeNull();
    expect(findMergeRun(runs, 6)).toBeNull();
  });

  it('大数据下二分定位正确（抽样对比线性扫描）', () => {
    const rows = 100_000;
    const big = buildMergeRuns({
      colIndex: 0,
      rowCount: rows,
      keyOf: (i) => (i / 7) | 0,
    });
    for (const r of [0, 1, 6, 7, 50_000, 99_998, 99_999]) {
      const got = findMergeRun(big, r)!;
      const expectStart = ((r / 7) | 0) * 7;
      expect(got.start).toBe(expectStart);
      expect(got.end).toBe(Math.min(expectStart + 6, rows - 1));
    }
  });
});

describe('clampMergeRunsToWindow', () => {
  it('段完整落在窗口内 → 原样产出', () => {
    const runs = runsOf(['A', 'A', 'A', 'B', 'B', 'C']);
    expect(clampMergeRunsToWindow([runs], 0, 5)).toEqual([
      { rowIndex: 0, colIndex: 0, rowspan: 3, colspan: 1 },
      { rowIndex: 3, colIndex: 0, rowspan: 2, colspan: 1 },
      // 单行段 C 不产出
    ]);
  });

  it('跨窗口上沿的段被抬到窗口起点（重锚）', () => {
    // 0-99 一整段，窗口 50-60 → 起点抬到 50，跨度 11
    const runs = runsOf(Array(100).fill('A'));
    expect(clampMergeRunsToWindow([runs], 50, 60)).toEqual([
      { rowIndex: 50, colIndex: 0, rowspan: 11, colspan: 1 },
    ]);
  });

  it('产出的起点永不早于窗口起点（这是虚拟滚动不被打穿的前提）', () => {
    const runs = runsOf(Array(50_000).fill('A'));
    for (const begin of [0, 1, 999, 25_000, 49_990]) {
      const cells = clampMergeRunsToWindow([runs], begin, begin + 20);
      for (const c of cells) {
        expect(c.rowIndex).toBeGreaterThanOrEqual(begin);
        expect(c.rowIndex + c.rowspan - 1).toBeLessThanOrEqual(begin + 20);
      }
    }
  });

  it('裁剪后只剩 1 行的段不产出', () => {
    const runs = runsOf(['A', 'A', 'A', 'A']);
    // 窗口只盖到段的最后一行
    expect(clampMergeRunsToWindow([runs], 3, 3)).toEqual([]);
    // 窗口盖到段的最后两行 → 跨度 2
    expect(clampMergeRunsToWindow([runs], 2, 3)).toEqual([
      { rowIndex: 2, colIndex: 0, rowspan: 2, colspan: 1 },
    ]);
  });

  it('窗口超出数据尾部时按 rowCount 收口', () => {
    const runs = runsOf(Array(10).fill('A'));
    expect(clampMergeRunsToWindow([runs], 5, 999)).toEqual([
      { rowIndex: 5, colIndex: 0, rowspan: 5, colspan: 1 },
    ]);
  });

  it('多列各自独立产出，colIndex 跟着列走', () => {
    const colA = runsOf(['A', 'A', 'B', 'B'], { colIndex: 0 });
    const colB = runsOf(['X', 'Y', 'Y', 'Y'], { colIndex: 2 });
    expect(clampMergeRunsToWindow([colA, colB], 0, 3)).toEqual([
      { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 1 },
      { rowIndex: 2, colIndex: 0, rowspan: 2, colspan: 1 },
      { rowIndex: 1, colIndex: 2, rowspan: 3, colspan: 1 },
    ]);
  });

  it('空段列表 / 反向窗口不报错', () => {
    expect(clampMergeRunsToWindow([], 0, 10)).toEqual([]);
    expect(clampMergeRunsToWindow([runsOf(['A', 'A'])], 5, 1)).toEqual([]);
  });

  it('产出数量以窗口大小为界，与数据规模无关', () => {
    // 50 万行，每 2 行一段；窗口 40 行 → 至多 20 个
    const runs = buildMergeRuns({
      colIndex: 0,
      rowCount: 500_000,
      keyOf: (i) => (i / 2) | 0,
    });
    expect(clampMergeRunsToWindow([runs], 250_000, 250_039).length).toBeLessThanOrEqual(20);
  });

  it('与 getMergeInfo 契合：裁剪结果能被现有管线正确解释', () => {
    const runs = runsOf(Array(100).fill('A'));
    const cells = clampMergeRunsToWindow([runs], 50, 60);
    // 段首是 primary，段内其余行查到的是同一个合并块
    expect(getMergeInfo(cells, 50, 0)).toEqual(cells[0]);
    expect(getMergeInfo(cells, 55, 0)).toEqual(cells[0]);
    expect(getMergeInfo(cells, 60, 0)).toEqual(cells[0]);
    expect(getMergeInfo(cells, 61, 0)).toBeNull();
  });
});

describe('mergeRunsInRange', () => {
  it('返回真实段起止，不做裁剪（与 clamp 版对照）', () => {
    const runs = runsOf(Array(100).fill('A'));
    // 窗口 50-60：clamp 版抬到 50、跨度 11；真实版给完整的 0-99
    expect(clampMergeRunsToWindow([runs], 50, 60)).toEqual([
      { rowIndex: 50, colIndex: 0, rowspan: 11, colspan: 1 },
    ]);
    expect(mergeRunsInRange([runs], 50, 60)).toEqual([
      { rowIndex: 0, colIndex: 0, rowspan: 100, colspan: 1 },
    ]);
  });

  it('只返回与区间有交集的段', () => {
    // 0-2 / 3-5 / 6-8 三段
    const runs = runsOf(['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C']);
    expect(mergeRunsInRange([runs], 4, 4)).toEqual([
      { rowIndex: 3, colIndex: 0, rowspan: 3, colspan: 1 },
    ]);
    expect(mergeRunsInRange([runs], 2, 3).map((m) => m.rowIndex)).toEqual([0, 3]);
  });

  it('跨度 1 的段不产出', () => {
    expect(mergeRunsInRange([runsOf(['A', 'B', 'C'])], 0, 2)).toEqual([]);
  });

  it('反向区间 / 空段返回空', () => {
    expect(mergeRunsInRange([runsOf(['A', 'A'])], 5, 1)).toEqual([]);
    expect(mergeRunsInRange([], 0, 10)).toEqual([]);
  });
});

describe('buildMergesFromSpan', () => {
  const list = Array.from({ length: 6 }, (_, i) => ({ id: i, v: 'v' + i }));
  const cols = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

  it('el-table 的经典写法：偶数行首列纵向合并 2 行', () => {
    // 对齐 el-table 文档里的例子：primary 返回 [2,1]，被覆盖的格返回 [0,0]
    expect(
      buildMergesFromSpan(list, cols, ({ rowIndex, columnIndex }) => {
        if (columnIndex !== 0) return;
        return rowIndex % 2 === 0 ? [2, 1] : [0, 0];
      }),
    ).toEqual([
      { rowIndex: 0, colIndex: 0, rowspan: 2, colspan: 1 },
      { rowIndex: 2, colIndex: 0, rowspan: 2, colspan: 1 },
      { rowIndex: 4, colIndex: 0, rowspan: 2, colspan: 1 },
    ]);
  });

  it('对象写法与数组写法等价', () => {
    const arr = buildMergesFromSpan(list, cols, ({ rowIndex }) =>
      rowIndex === 0 ? [2, 3] : undefined,
    );
    const obj = buildMergesFromSpan(list, cols, ({ rowIndex }) =>
      rowIndex === 0 ? { rowspan: 2, colspan: 3 } : undefined,
    );
    expect(arr).toEqual(obj);
    // 三列都会被问到，但只有 columnIndex 0 产出（1、2 也返回了同样的跨度）
    expect(arr.length).toBe(3);
  });

  it('跳过 [1,1]（普通格）与 [0,0]（被覆盖）', () => {
    expect(buildMergesFromSpan(list, cols, () => [1, 1])).toEqual([]);
    expect(buildMergesFromSpan(list, cols, () => [0, 0])).toEqual([]);
    expect(buildMergesFromSpan(list, cols, () => undefined)).toEqual([]);
    expect(buildMergesFromSpan(list, cols, () => null)).toEqual([]);
  });

  it('负数 / NaN 跨度视为不产出', () => {
    expect(buildMergesFromSpan(list, cols, () => [-1, 2])).toEqual([]);
    expect(buildMergesFromSpan(list, cols, () => [NaN, 2])).toEqual([]);
  });

  it('横向合并（colspan）也支持 —— 这正是 mergeKey 表达不了的部分', () => {
    expect(
      buildMergesFromSpan(list, cols, ({ rowIndex, columnIndex }) =>
        rowIndex === 1 && columnIndex === 0 ? [1, 3] : undefined,
      ),
    ).toEqual([{ rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 3 }]);
  });

  it('ctx 带上 row / column / 两个索引', () => {
    const seen: string[] = [];
    buildMergesFromSpan(list.slice(0, 2), cols.slice(0, 2), (ctx) => {
      seen.push(`${ctx.rowIndex},${ctx.columnIndex},${(ctx.row as any).v},${(ctx.column as any).key}`);
    });
    expect(seen).toEqual(['0,0,v0,a', '0,1,v0,b', '1,0,v1,a', '1,1,v1,b']);
  });

  it('columnIndex 与 MergeCell.colIndex 同坐标系（可直接喂 getMergeInfo）', () => {
    const merges = buildMergesFromSpan(list, cols, ({ rowIndex, columnIndex }) =>
      rowIndex === 0 && columnIndex === 2 ? [3, 1] : undefined,
    );
    expect(getMergeInfo(merges, 1, 2)).toEqual(merges[0]);
    expect(getMergeInfo(merges, 1, 0)).toBeNull();
  });

  it('空列表 / 空列不报错', () => {
    expect(buildMergesFromSpan([], cols, () => [2, 2])).toEqual([]);
    expect(buildMergesFromSpan(list, [], () => [2, 2])).toEqual([]);
  });

  it('回调次数正好是 行数 × 列数（代价可预期）', () => {
    let n = 0;
    buildMergesFromSpan(list, cols, () => { n++; });
    expect(n).toBe(list.length * cols.length);
  });
});
