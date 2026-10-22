import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createStore } from "../src/store.js";

const store = createStore();
let server;
let base;

before(async () => {
  server = createApp({ store });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const api = (path, options = {}) =>
  fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json" },
    body: options.body && JSON.stringify(options.body),
  });

test("health check", async () => {
  const res = await api("/health");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "ok");
});

test("lists seeded tasks and filters by status", async () => {
  store.reset();
  assert.equal((await (await api("/tasks")).json()).length, 5);
  const open = await (await api("/tasks?status=open")).json();
  assert.ok(open.every((t) => !t.done));
  assert.equal(open.length, 3);
});

test("creates, updates and deletes a task", async () => {
  store.reset();
  const created = await api("/tasks", { method: "POST", body: { title: "  New task ", priority: "high" } });
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.deepEqual(task, { id: 6, title: "New task", priority: "high", done: false, assignee: "You" });

  const patched = await api(`/tasks/${task.id}`, { method: "PATCH", body: { done: true } });
  assert.equal((await patched.json()).done, true);

  assert.equal((await api(`/tasks/${task.id}`, { method: "DELETE" })).status, 204);
  assert.equal((await api(`/tasks/${task.id}`)).status, 404);
});

test("stats reflect the store", async () => {
  store.reset();
  assert.deepEqual(await (await api("/tasks/stats")).json(), { total: 5, open: 3, done: 2 });
});

test("rejects invalid input", async () => {
  store.reset();
  assert.equal((await api("/tasks", { method: "POST", body: { title: "" } })).status, 400);
  assert.equal((await api("/tasks", { method: "POST", body: { title: "x", priority: "urgent" } })).status, 400);
  assert.equal((await api("/tasks/1", { method: "PATCH", body: { done: "yes" } })).status, 400);
  assert.equal((await api("/tasks/abc")).status, 400);
  const bad = await fetch(`${base}/tasks`, { method: "POST", body: "{not json" });
  assert.equal(bad.status, 400);
});

test("unknown routes and methods", async () => {
  assert.equal((await api("/nope")).status, 404);
  assert.equal((await api("/tasks", { method: "PUT" })).status, 405);
});
