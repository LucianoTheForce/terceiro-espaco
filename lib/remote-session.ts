import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  isCommand,
  isRemoteState,
  type RemoteCommand,
  type RemoteState,
} from "./remote-control";

export type QueuedCommand = {
  id: string;
  command: RemoteCommand;
  createdAt: number;
};
export type Session = {
  hostHash: string;
  controlHash: string;
  state: RemoteState;
  updatedAt: number;
  expiresAt: number;
  paired: boolean;
  commands: QueuedCommand[];
  seen: string[];
  applied: string[];
};
export interface SessionStore {
  read(id: string): Promise<{ session: Session; version: string } | null>;
  write(id: string, session: Session, version?: string): Promise<boolean>;
}
export class RemoteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const ttl = 24 * 60 * 60 * 1000;

export async function remoteSession(
  store: SessionStore,
  body: Record<string, unknown>,
) {
  const now = Date.now();
  if (body.action === "create") {
    if (!isRemoteState(body.state))
      throw new RemoteError("Apresentação inválida.", 400);
    const id = randomUUID().replaceAll("-", "");
    const hostToken = randomUUID().replaceAll("-", "");
    const token = randomUUID().replaceAll("-", "");
    const created = await store.write(id, {
      hostHash: hash(hostToken),
      controlHash: hash(token),
      state: body.state,
      updatedAt: now,
      expiresAt: now + ttl,
      paired: false,
      commands: [],
      seen: [],
      applied: [],
    });
    if (!created) throw new RemoteError("Tente conectar novamente.", 503);
    return { id, hostToken, token };
  }
  if (!identifier(body.id) || !identifier(body.token))
    throw new RemoteError("Escaneie o QR code novamente.", 401);
  for (let attempt = 0; attempt < 5; attempt++) {
    const saved = await store.read(body.id);
    if (!saved || saved.session.expiresAt < now)
      throw new RemoteError(
        "Esta sessão expirou. Escaneie o QR code da tela.",
        410,
      );
    const session = saved.session;
    const host = body.action === "sync";
    const expected = Buffer.from(
      host ? session.hostHash : session.controlHash,
      "hex",
    );
    if (!timingSafeEqual(expected, Buffer.from(hash(body.token), "hex")))
      throw new RemoteError("Escaneie o QR code novamente.", 401);
    let changed = false;
    if (host) {
      if (
        !isRemoteState(body.state) ||
        !Array.isArray(body.ack) ||
        body.ack.length > 128 ||
        !body.ack.every(identifier)
      )
        throw new RemoteError("Estado inválido.", 400);
      const ack = body.ack as string[];
      const accepted = session.commands
        .filter((item) => ack.includes(item.id))
        .map((item) => item.id);
      const commands = session.commands.filter(
        (item) => !ack.includes(item.id) && now - item.createdAt < 30000,
      );
      changed =
        JSON.stringify(body.state) !== JSON.stringify(session.state) ||
        commands.length !== session.commands.length ||
        now - session.updatedAt >= 10000;
      session.state = body.state;
      session.commands = commands;
      session.applied = [...session.applied, ...accepted].slice(-128);
      if (changed) {
        session.updatedAt = now;
        session.expiresAt = now + ttl;
      }
    } else if (body.action === "command") {
      if (!identifier(body.commandId) || !isCommand(body.command))
        throw new RemoteError("Comando inválido.", 400);
      if (now - session.updatedAt > 30000)
        throw new RemoteError(
          "A tela está desconectada. Mantenha a apresentação aberta.",
          409,
        );
      if (!session.seen.includes(body.commandId)) {
        if (session.commands.length >= 20)
          throw new RemoteError("Aguarde a tela responder.", 429);
        if (
          body.command.type === "goto" &&
          body.command.index >= session.state.pages.length
        )
          throw new RemoteError("Página indisponível nesta versão.", 400);
        session.commands.push({
          id: body.commandId,
          command: body.command,
          createdAt: now,
        });
        session.seen = [...session.seen, body.commandId].slice(-128);
        session.paired = true;
        changed = true;
      }
    } else if (body.action === "pair") {
      if (!session.paired) {
        session.paired = true;
        changed = true;
      }
    } else if (body.action !== "status")
      throw new RemoteError("Comando inválido.", 400);
    if (changed && !(await store.write(body.id, session, saved.version)))
      continue;
    return host
      ? { commands: session.commands, paired: session.paired }
      : {
          state: session.state,
          online: now - session.updatedAt < 30000,
          applied: session.applied,
        };
  }
  throw new RemoteError("Aguarde e tente novamente.", 503);
}
