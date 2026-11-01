export const bookPageSize = 9;

export function getBookPages(items, page) {
  const pageCount = Math.max(1, Math.ceil(items.length / bookPageSize));
  const anchor = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  const start = (anchor - 1) * bookPageSize;
  return {
    anchor,
    pageCount,
    primary: items.slice(start, start + bookPageSize),
    extra: items.slice(start + bookPageSize, start + bookPageSize * 2)
  };
}

export function resolveBookSplit(width, division) {
  const minimumPaneWidth = 260;
  if (division && Number.isFinite(division.x) && Number.isFinite(division.width) && division.width >= 0) {
    const gap = Math.max(12, division.width);
    const left = division.x - (gap - division.width) / 2;
    const right = width - left - gap;
    if (left >= minimumPaneWidth && right >= minimumPaneWidth) {
      return { left, right, gap };
    }
  }
  if (width < 600) return null;
  return { left: (width - 16) / 2, right: (width - 16) / 2, gap: 16 };
}
