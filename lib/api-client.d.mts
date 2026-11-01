export type ApiResource = "recipes" | "history";
export class MenuApiError extends Error {
  status: number;
  constructor(message: string, status?: number);
}
export function readApiResponse<T extends object = Record<string, unknown>>(response: Response, resource: ApiResource): Promise<T>;
export function requestApiJson<T extends object = Record<string, unknown>>(url: string, resource: ApiResource, options?: RequestInit): Promise<T>;
