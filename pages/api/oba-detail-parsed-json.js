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
    return { url, status: 500, body: null, error: error?.message || "fetch failed" };
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "missing id" });

  // Endpointset gekozen voor de OCLC/Wise → OBA parsed JSON-compatible detailroute.
  // De losse item-availability endpoints zijn getest en vallen af voor deze ingang.
  const [title, availability, summary, items] = await Promise.all([
    fetchSafe(`${BASE}/discovery/title/${id}`),
    fetchSafe(`${BASE}/branch/1000/titleavailability/${id}?clientType=PUBLIC`),
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
      routePurpose: "OCLC/Wise responses mapped to the current OBA debug parsed JSON detail model",
      endpointDecision: {
        included: [
          "/discovery/title/{id}",
          "/branch/1000/titleavailability/{id}?clientType=PUBLIC",
          "/discovery/titlesummary/{id}",
          "/title/{id}/iteminformation",
        ],
        excluded: [
          "/item/{itemIds}/availabilitywithstatusdescription",
          "/items/{itemIds}/availability?includeTitleAvailability=true",
        ],
      },
      calls: [title, availability, summary, items],
    },
  };

  const mapped = mapWiseToObaParsedJson(raw);

  res.status(200).json({ raw, mapped });
}
