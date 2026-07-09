#!/usr/bin/env node

import { createHmac } from "node:crypto";

function requiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (typeof value !== "string" || value.length === 0) {
    console.error(`Ontbrekende environment variable: ${name}`);
    process.exit(1);
  }

  if (value.includes("\n") || value.includes("\r")) {
    console.error(
      `Environment variable ${name} mag geen regeleinde bevatten.`
    );
    process.exit(1);
  }

  return value;
}

const apiKeyId = requiredEnvironmentVariable("WISE_API_KEY_ID");
const apiKey = requiredEnvironmentVariable("WISE_API_KEY");
const applicationName = requiredEnvironmentVariable(
  "WISE_APPLICATION_NAME"
);

// Zelfde berekening als:
// Math.floor(new Date() / 8.64e7)
const epochDay = Math.floor(Date.now() / 86_400_000);

const data = `${epochDay}${applicationName}`;

const signature = createHmac("sha256", apiKey)
  .update(data, "utf8")
  .digest("hex");

// Resultaat:
// apiKeyId:hmacSha256
process.stdout.write(`${apiKeyId}:${signature}`);
