import { createServer } from "node:http";
import { createStore, PRIORITIES } from "./store.js";

const MAX_BODY_BYTES = 10_000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
  }
  if (!raw) return {};
  try {
    const body = JSON.parse(raw);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Body must be a JSON object");
  }
}

// Checks only the fields that are present. `requireTitle` is for creates.
function validate(body, { requireTitle = false } = {}) {
  const changes = {};
  if (requireTitle || "title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new HttpError(400, "title must be a non-empty string");
    }
    changes.title = body.title.trim();
  }
  if ("priority" in body) {
    if (!PRIORITIES.includes(body.priority)) {
      throw new HttpError(400, `priority must be one of: ${PRIORITIES.join(", ")}`);
    }
    changes.priority = body.priority;
  }
  if ("done" in body) {
    if (typeof body.done !== "boolean") throw new HttpError(400, "done must be a boolean");
    changes.done = body.done;
  }
  if ("assignee" in body) {
    if (typeof body.assignee !== "string" || !body.assignee.trim()) {
      throw new HttpError(400, "assignee must be a non-empty string");
    }
    changes.assignee = body.assignee.trim();
  }
  return changes;
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Task id must be a positive integer");
  return id;
}

export function createApp({ store = createStore(), latencyMs = 0 } = {}) {
  async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "OPTIONS") return send(res, 204);

    if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs));

    if (url.pathname === "/health" && req.method === "GET") {
      return send(res, 200, { status: "ok", uptime: process.uptime() });
    }

    if (parts[0] !== "tasks" || parts.length > 2) throw new HttpError(404, "Not found");

    // /tasks and /tasks/stats
    if (parts.length === 1 || parts[1] === "stats") {
      if (parts[1] === "stats") {
        if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
        return send(res, 200, store.stats());
      }
      if (req.method === "GET") {
        return send(res, 200, store.list({ status: url.searchParams.get("status") }));
      }
      if (req.method === "POST") {
        const task = store.create(validate(await readJson(req), { requireTitle: true }));
        return send(res, 201, task);
      }
      throw new HttpError(405, "Method not allowed");
    }

    // /tasks/:id
    const id = parseId(parts[1]);
    if (req.method === "GET") {
      const task = store.get(id);
      if (!task) throw new HttpError(404, "Task not found");
      return send(res, 200, task);
    }
    if (req.method === "PATCH") {
      const task = store.update(id, validate(await readJson(req)));
      if (!task) throw new HttpError(404, "Task not found");
      return send(res, 200, task);
    }
    if (req.method === "DELETE") {
      if (!store.remove(id)) throw new HttpError(404, "Task not found");
      return send(res, 204);
    }
    throw new HttpError(405, "Method not allowed");
  }

  return createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      send(res, status, { error: status === 500 ? "Internal server error" : err.message });
    }
  });
}
