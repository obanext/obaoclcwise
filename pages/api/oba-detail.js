import { mapWiseToObaFull } from "../../mapping/mapWiseToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";

const headers = {
  Accept: "application/json",
  application: process.env.APPLICATION,
  WISE_KEY: process.env.WISE_KEY,
};

// Fetch one OCLC detail endpoint and preserve url/status/body for the API-call debug panel.
async function fetchSafe(url) {
  try {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => null);
    return { url, status: res.status, body };
  } catch {
    return { url, status: 500, body: null };
  }
}

// IST detail API.
// Purpose: fetch the four OCLC detail sources and map them to the current OBA detail JSON contract.
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "missing id" });

  // These four calls are the detail evidence set used by the visual page, mapped output and CSV.
  const [title, titleInfo, availability, items] = await Promise.all([
    fetchSafe(`${BASE}/discovery/title/${id}`),
    fetchSafe(`${BASE}/title/${id}`),
    fetchSafe(`${BASE}/branch/1000/titleavailability/${id}?clientType=PUBLIC&holdsCount=true`),
    fetchSafe(`${BASE}/title/${id}/iteminformation`)
  ]);

  const raw = {
    title: title.body,
    titleInfo: titleInfo.body,
    availability: availability.body,
    itemInformation: items.body,
    debug: { calls: [title, titleInfo, availability, items] }
  };

  const mapped = mapWiseToObaFull(raw);

  res.status(200).json({ raw, mapped });
}
