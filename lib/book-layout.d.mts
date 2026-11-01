export const bookPageSize: number;
export type BookDivision = { x: number; width: number };
export type BookSplit = { left: number; right: number; gap: number };
export function getBookPages<T>(items: T[], page: number): {
  anchor: number;
  pageCount: number;
  primary: T[];
  extra: T[];
};
export function resolveBookSplit(width: number, division?: BookDivision | null): BookSplit | null;
