"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import {
  isRemoteState,
  type RemoteCommand,
  type RemoteState,
} from "@/lib/remote-control";
import { remoteRequest } from "@/lib/remote-request";

export default function PhoneController() {
  const [state, setState] = useState<RemoteState | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Conectando à apresentação…");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ id: string; time: number } | null>(null);
  const credentials = useRef<{ id: string; token: string } | null>(null);
  const commandAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const match = location.hash.match(/^#v2\.([a-f0-9]{32})\.([a-f0-9]{32})$/);
    if (!match) {
      setMessage(
        "Volte à capa, recarregue a apresentação e escaneie o novo QR code.",
      );
      return;
    }
    credentials.current = { id: match[1], token: match[2] };
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let paired = false;
    setConnected(false);
    setMessage("Conectando à apresentação…");
    const poll = async () => {
      let delay = 1000;
      try {
        const result = await remoteRequest(
          { action: paired ? "status" : "pair", ...credentials.current },
          abort.signal,
        );
        if (abort.signal.aborted) return;
        if (!isRemoteState(result.state))
          throw new Error("Não foi possível ler a apresentação.");
        paired = true;
        setState(result.state);
        setConnected(result.online === true);
        if (pending.current && result.applied?.includes(pending.current.id)) {
          pending.current = null;
          setBusy(false);
        }
        if (pending.current && Date.now() - pending.current.time > 30000) {
          pending.current = null;
          setBusy(false);
        }
        setMessage(
          !result.online
            ? "A tela está desconectada. Mantenha a apresentação aberta."
            : pending.current
              ? "Aplicando na tela…"
              : "Conectado à tela",
        );
      } catch (error) {
        if (!abort.signal.aborted) {
          setConnected(false);
          setMessage(
            error instanceof Error ? error.message : "Reconectando à tela…",
          );
        }
        delay = 3000;
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(poll, delay);
      }
    };
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
      commandAbort.current?.abort();
    };
  }, [attempt]);
  const send = async (command: RemoteCommand) => {
    if (!connected || pending.current || !credentials.current) return;
    const commandId = crypto.randomUUID().replaceAll("-", "");
    pending.current = { id: commandId, time: Date.now() };
    setBusy(true);
    setMessage("Aplicando na tela…");
    const abort = new AbortController();
    commandAbort.current = abort;
    try {
      // Retrying uses the same ID, so a lost response never advances twice.
      try {
        await remoteRequest(
          { action: "command", ...credentials.current, commandId, command },
          abort.signal,
        );
      } catch {
        if (!abort.signal.aborted)
          await remoteRequest(
            { action: "command", ...credentials.current, commandId, command },
            abort.signal,
          );
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        pending.current = null;
        setBusy(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o comando.",
        );
      }
    }
  };
  const disabled = !connected || busy;
  return (
    <main className="phone-controller">
      <header>
        <span>TERCEIRO ESPAÇO</span>
        <h1>Controle da apresentação</h1>
      </header>
      <p className="remote-status" data-connected={connected} role="status">
        {message}
      </p>
      {state && (
        <>
          <div className="remote-current">
            <span>
              {String(state.current + 1).padStart(2, "0")}{" "}
              <small>/ {state.pages.length}</small>
            </span>
            <p>{state.pages[state.current]?.title}</p>
          </div>
          <div className="remote-navigation">
            <button
              disabled={disabled || state.current === 0}
              onClick={() => void send({ type: "previous" })}
            >
              <ArrowLeft aria-hidden="true" />
              <span>Anterior</span>
            </button>
            <button
              disabled={disabled || state.current === state.pages.length - 1}
              onClick={() => void send({ type: "next" })}
            >
              <ArrowRight aria-hidden="true" />
              <span>Próxima</span>
            </button>
          </div>
          <button
            className="remote-play"
            disabled={disabled}
            onClick={() => void send({ type: state.paused ? "play" : "pause" })}
          >
            {state.paused ? (
              <Play aria-hidden="true" />
            ) : (
              <Pause aria-hidden="true" />
            )}
            {state.paused
              ? state.tv
                ? "Continuar apresentação"
                : "Ativar animações"
              : state.tv
                ? "Pausar apresentação"
                : "Pausar animações"}
          </button>
          <label className="remote-jump">
            Ir para página
            <select
              value={state.current}
              disabled={disabled}
              onChange={(event) =>
                void send({ type: "goto", index: Number(event.target.value) })
              }
            >
              {state.pages.map((item, index) => (
                <option key={item.number} value={index}>
                  {index + 1}. {item.title}
                </option>
              ))}
            </select>
          </label>
          {state.tv && (
            <p className="remote-note">
              Ao mudar de página pelo celular, o avanço automático pausa. Toque
              em continuar para retomar.
            </p>
          )}
        </>
      )}
      {!connected && (
        <button
          className="remote-retry"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tentar conectar novamente
        </button>
      )}
    </main>
  );
}
