const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const output = path.join(__dirname, "../.cache/remote-tests");
fs.mkdirSync(output, { recursive: true });
for (const name of ["remote-control", "remote-session"]) {
  const source = fs.readFileSync(
    path.join(__dirname, "../lib", name + ".ts"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(output, name + ".js"),
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  );
}
const { remoteSession } = require(path.join(output, "remote-session.js"));
const initial = {
  type: "state",
  current: 0,
  paused: false,
  tv: true,
  pages: Array.from({ length: 43 }, (_, index) => ({
    number: index === 42 ? 45 : index + 1,
    title: "Página",
  })),
};
function memoryStore() {
  const data = new Map();
  return {
    data,
    async read(id) {
      return data.has(id) ? structuredClone(data.get(id)) : null;
    },
    async write(id, session, version) {
      const old = data.get(id);
      if (old ? version !== old.version : version !== undefined) return false;
      data.set(id, {
        session: structuredClone(session),
        version: String(Number(old?.version || 0) + 1),
      });
      return true;
    },
  };
}
async function setup() {
  const store = memoryStore();
  const session = await remoteSession(store, {
    action: "create",
    state: initial,
  });
  return { store, ...session };
}
test("pairs without exposing host credentials and rejects incorrect/controller-as-host tokens", async () => {
  const s = await setup();
  const paired = await remoteSession(s.store, {
    action: "pair",
    id: s.id,
    token: s.token,
  });
  assert.equal(paired.online, true);
  assert.equal(paired.state.pages.length, 43);
  assert.equal(paired.hostHash, undefined);
  await assert.rejects(
    remoteSession(s.store, {
      action: "status",
      id: s.id,
      token: "0".repeat(32),
    }),
    { status: 401 },
  );
  await assert.rejects(
    remoteSession(s.store, {
      action: "sync",
      id: s.id,
      token: s.token,
      state: initial,
      ack: [],
    }),
    { status: 401 },
  );
});
test("deduplicates retries, acknowledges exactly once, and excludes unavailable pages", async () => {
  const s = await setup();
  const command = {
    action: "command",
    id: s.id,
    token: s.token,
    commandId: "1".repeat(32),
    command: { type: "next" },
  };
  await remoteSession(s.store, command);
  await remoteSession(s.store, command);
  let sync = await remoteSession(s.store, {
    action: "sync",
    id: s.id,
    token: s.hostToken,
    state: initial,
    ack: [],
  });
  assert.equal(sync.commands.length, 1);
  sync = await remoteSession(s.store, {
    action: "sync",
    id: s.id,
    token: s.hostToken,
    state: { ...initial, current: 1, paused: true },
    ack: [command.commandId],
  });
  assert.equal(sync.commands.length, 0);
  await remoteSession(s.store, command);
  const status = await remoteSession(s.store, {
    action: "status",
    id: s.id,
    token: s.token,
  });
  assert.equal(status.state.current, 1);
  assert.equal(status.applied.length, 1);
  await assert.rejects(
    remoteSession(s.store, {
      ...command,
      commandId: "2".repeat(32),
      command: { type: "goto", index: 43 },
    }),
    { status: 400 },
  );
});
test("preserves concurrent commands and host state through conditional-write conflicts", async () => {
  const s = await setup();
  await Promise.all([
    remoteSession(s.store, {
      action: "command",
      id: s.id,
      token: s.token,
      commandId: "3".repeat(32),
      command: { type: "next" },
    }),
    remoteSession(s.store, {
      action: "command",
      id: s.id,
      token: s.token,
      commandId: "4".repeat(32),
      command: { type: "pause" },
    }),
    remoteSession(s.store, {
      action: "sync",
      id: s.id,
      token: s.hostToken,
      state: { ...initial, current: 5 },
      ack: [],
    }),
  ]);
  const saved = await s.store.read(s.id);
  assert.equal(saved.session.commands.length, 2);
  assert.equal(saved.session.state.current, 5);
});
test("rejects offline commands and expired sessions", async () => {
  const s = await setup();
  const saved = s.store.data.get(s.id);
  saved.session.updatedAt = Date.now() - 40000;
  await assert.rejects(
    remoteSession(s.store, {
      action: "command",
      id: s.id,
      token: s.token,
      commandId: "5".repeat(32),
      command: { type: "next" },
    }),
    { status: 409 },
  );
  saved.session.expiresAt = Date.now() - 1;
  await assert.rejects(
    remoteSession(s.store, { action: "status", id: s.id, token: s.token }),
    { status: 410 },
  );
});
test("rejects malformed commands without changing the presentation", async () => {
  const s = await setup();
  for (const command of [
    { type: ["next"] },
    { type: "goto", index: -1 },
    { type: "goto", index: 1.5 },
    { type: "delete" },
  ]) {
    await assert.rejects(
      remoteSession(s.store, {
        action: "command",
        id: s.id,
        token: s.token,
        commandId: "6".repeat(32),
        command,
      }),
      { status: 400 },
    );
  }
  assert.equal((await s.store.read(s.id)).session.commands.length, 0);
});
