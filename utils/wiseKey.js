import { createHmac } from "crypto";

export function getWiseKey() {
  const apiKeyId = process.env.WISE_API_KEY_ID;
  const apiKey = process.env.WISE_API_KEY;
  const applicationName = process.env.APPLICATION;

  if (!apiKeyId || !apiKey || !applicationName) {
    throw new Error(
      "Ontbrekende WISE-configuratie: WISE_API_KEY_ID, WISE_API_KEY en APPLICATION zijn verplicht"
    );
  }

  const epochDay = Math.floor(Date.now() / 86400000);
  const data = `${epochDay}${applicationName}`;
  const signature = createHmac("sha256", apiKey).update(data, "utf8").digest("hex");

  return `${apiKeyId}:${signature}`;
}
