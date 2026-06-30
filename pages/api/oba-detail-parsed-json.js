import { mapWiseToObaParsedJson } from "../../mapping/mapWiseToObaParsedJson";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";

const headers = {
  Accept: "application/json",
  application: process.env.APPLICATION,
  WISE_KEY: process.env.WISE_KEY,
};

async function fetchSafe(url) {
  try {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => null);
    return { url, status: res.status, body };
  } catch (error) {
    return { url, status: 500, body: null, error: error.message };
  }
}

export default async function handler(req, res) {
  const { id, branchId = "1000" } = req.query;

  if (!id) return res.status(400).json({ error: "missing id" });

  const [title, availability, summary, items] = await Promise.all([
    fetchSafe(`${BASE}/discovery/title/${id}`),
    fetchSafe(`${BASE}/branch/${encodeURIComponent(branchId)}/titleavailability/${id}?clientType=PUBLIC`),
    fetchSafe(`${BASE}/discovery/titlesummary/${id}`),
    fetchSafe(`${BASE}/title/${id}/iteminformation`),
  ]);

  const raw = {
    title: title.body,
    availability: availability.body,
    summary: summary.body,
    itemInformation: items.body,
    debug: {
      contract: "oba-parsed-json-compatible",
      branchId,
      calls: [title, availability, summary, items],
    },
  };

  const mapped = mapWiseToObaParsedJson(raw);

  res.status(200).json({ raw, mapped });
}
