export function error(status: number, message: string, headers?: Record<string, string>): Response {
  return Response.json(
    { error: message },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}
