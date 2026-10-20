export function supabaseHeaders(
  key: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: key,
    ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
    ...extra,
  };
}
