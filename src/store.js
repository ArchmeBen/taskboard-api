// In-memory task store. Data resets whenever the server restarts.
const SEED_TASKS = [
  { id: 1, title: "Set up project repo", priority: "high", done: true, assignee: "Alex" },
  { id: 2, title: "Design landing page mockup", priority: "medium", done: false, assignee: "Sam" },
  { id: 3, title: "Write API spec draft", priority: "high", done: false, assignee: "Jordan" },
  { id: 4, title: "Pick a color palette", priority: "low", done: true, assignee: "Sam" },
  { id: 5, title: "Schedule user interviews", priority: "medium", done: false, assignee: "Alex" },
];

export const PRIORITIES = ["low", "medium", "high"];

export function createStore(seed = SEED_TASKS) {
  let tasks = structuredClone(seed);
  let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;

  return {
    list({ status } = {}) {
      if (status === "open") return tasks.filter((t) => !t.done);
      if (status === "done") return tasks.filter((t) => t.done);
      return tasks;
    },

    get(id) {
      return tasks.find((t) => t.id === id);
    },

    create({ title, priority = "medium", assignee = "You" }) {
      const task = { id: nextId++, title, priority, done: false, assignee };
      tasks.unshift(task);
      return task;
    },

    update(id, changes) {
      const task = this.get(id);
      if (!task) return undefined;
      Object.assign(task, changes);
      return task;
    },

    remove(id) {
      const before = tasks.length;
      tasks = tasks.filter((t) => t.id !== id);
      return tasks.length < before;
    },

    stats() {
      const done = tasks.filter((t) => t.done).length;
      return { total: tasks.length, open: tasks.length - done, done };
    },

    reset() {
      tasks = structuredClone(seed);
      nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    },
  };
}
