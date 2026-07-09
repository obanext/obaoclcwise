export function getWiseKey() {
  const wiseKey = process.env.WISE_KEY?.trim();

  if (!wiseKey) {
    throw new Error("WISE_KEY ontbreekt in de Vercel environment variables");
  }

  return wiseKey;
}
