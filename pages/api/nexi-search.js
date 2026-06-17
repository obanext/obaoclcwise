const DEFAULT_NEXI_BASE_URL = "http://localhost:8000";

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const responseText = await response.text();
  let json = null;

  try {
    json = responseText ? JSON.parse(responseText) : null;
  } catch {
    json = { raw: responseText };
  }

  return {
    url,
    status: response.status,
    ok: response.ok,
    body: json,
  };
}

export default async function handler(req, res) {
  const query = text(req.query.q);
  const incomingThreadId = text(req.query.thread_id);
  const nexiBaseUrl = text(process.env.NEXI_BASE_URL || DEFAULT_NEXI_BASE_URL).replace(/\/$/, "");

  if (!query) {
    return res.status(200).json({
      query,
      thread_id: incomingThreadId || "",
      response: null,
      results: [],
      debug: { calls: [] },
    });
  }

  const calls = [];
  let threadId = incomingThreadId;

  if (!threadId) {
    const startCall = await postJson(`${nexiBaseUrl}/start_thread`, {});
    calls.push(startCall);

    if (!startCall.ok) {
      return res.status(502).json({
        error: "Nexi start_thread mislukt",
        query,
        thread_id: "",
        response: null,
        results: [],
        debug: { calls },
      });
    }

    threadId = text(startCall.body?.thread_id);
  }

  const sendCall = await postJson(`${nexiBaseUrl}/send_message`, {
    thread_id: threadId,
    user_input: query,
  });
  calls.push(sendCall);

  if (!sendCall.ok) {
    return res.status(502).json({
      error: "Nexi send_message mislukt",
      query,
      thread_id: threadId,
      response: null,
      results: [],
      debug: { calls },
    });
  }

  const body = sendCall.body || {};
  const nexiResponse = body.response || body;
  const results = Array.isArray(nexiResponse?.results) ? nexiResponse.results : [];

  return res.status(200).json({
    query,
    thread_id: text(body.thread_id || nexiResponse.thread_id || threadId),
    response: nexiResponse,
    results,
    debug: {
      calls,
      nexiDebug: body.debug || null,
    },
  });
}
