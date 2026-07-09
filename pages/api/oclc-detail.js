const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = process.env.WISE_BRANCH_ID || "1000";

const headers = {
  Accept: "application/json",
  application: process.env.APPLICATION,
  WISE_KEY: process.env.WISE_KEY,
};

/**
 * Fetch one OCLC endpoint and retain the request URL, status and response body.
 * The retained metadata is used by the OCLC API calls panel.
 */
async function fetchSafe(url) {
  try {
    const response = await fetch(url, { headers });
    const bodyText = await response.text();

    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText || null;
    }

    return {
      url,
      status: response.status,
      ok: response.ok,
      body,
    };
  } catch (error) {
    return {
      url,
      status: 500,
      ok: false,
      body: null,
      error: error.message,
    };
  }
}

/**
 * ALL detail API.
 * Returns only OCLC source responses and request evidence; no OBA contract mapping is performed.
 */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "missing id" });

  const calls = await Promise.all([
    fetchSafe(`${BASE}/discovery/title/${encodeURIComponent(id)}`),
    fetchSafe(`${BASE}/title/${encodeURIComponent(id)}`),
    fetchSafe(
      `${BASE}/branch/${encodeURIComponent(BRANCH_ID)}/titleavailability/${encodeURIComponent(
        id
      )}?clientType=PUBLIC&holdsCount=true`
    ),
    fetchSafe(`${BASE}/title/${encodeURIComponent(id)}/iteminformation`),
    fetchSafe(
      `${BASE}/title/${encodeURIComponent(id)}/recommended/title?limit=5&offset=0`
    ),
  ]);

  const [
    titleCall,
    titleInfoCall,
    availabilityCall,
    itemInformationCall,
    recommendationsCall,
  ] = calls;
  const failedCall = calls.find((call) => !call.ok);

  if (failedCall && !titleCall.ok) {
    return res.status(failedCall.status || 500).json({
      error: "OCLC detail ophalen mislukt",
      debug: { calls },
    });
  }

  return res.status(200).json({
    id: String(id),
    title: titleCall.body,
    titleInfo: titleInfoCall.body,
    availability: availabilityCall.body,
    itemInformation: itemInformationCall.body,
    recommendations: recommendationsCall.body,
    debug: { calls },
  });
}
