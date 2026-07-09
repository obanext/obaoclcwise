const crypto = require("crypto");

function getWiseKey() {
  const apiKeyId = process.env.WISE_API_KEY_ID;
  const apiKey = process.env.WISE_API_KEY;
  const applicationName = process.env.APPLICATION;

  if (!apiKeyId || !apiKey || !applicationName) {
    throw new Error("WISE environment variables ontbreken");
  }

  const epochDay = Math.floor(Date.now() / 86400000);
  const data = `${epochDay}${applicationName}`;

  const signature = crypto
    .createHmac("sha256", apiKey)
    .update(data)
    .digest("hex");

  return `${apiKeyId}:${signature}`;
}

module.exports = { getWiseKey };
