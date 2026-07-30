// Validated categorical palette — fixed order, assigned per entity, never cycled
// per data order. Category identity = its sort_order slot.
export const CAT_COLORS = [
  "#24845a",
  "#a9761c",
  "#3b63c4",
  "#c04e2f",
  "#8b51b8",
  "#c23a6b",
];

export function categoryColor(sortOrder: number): string {
  return CAT_COLORS[sortOrder % CAT_COLORS.length];
}
