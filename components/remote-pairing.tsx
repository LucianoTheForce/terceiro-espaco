"use client";
import { useEffect, useRef, useState } from "react";
import {
  isCommand,
  type RemoteCommand,
  type RemoteState,
} from "@/lib/remote-control";
import { remoteRequest } from "@/lib/remote-request";

export default function RemotePairing({
  state,
  onCommand,
}: {
  state: RemoteState;
  onCommand: (command: RemoteCommand) => void;
}) {
  const latest = useRef({ state, onCommand });
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Preparando controle…");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    latest.current = { state, onCommand };
  }, [state, onCommand]);
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const applied = new Set<string>();
    let ack: string[] = [];
    setQr("");
    setStatus("Preparando controle…");
    const start = async () => {
      const session = await remoteRequest(
        { action: "create", state: latest.current.state },
        abort.signal,
      );
      if (abort.signal.aborted) return;
      const link = `${location.origin}/controle#v2.${session.id}.${session.token}`;
      const { default: QRCode } = await import("qrcode");
      const image = await QRCode.toDataURL(link, {
        width: 360,
        margin: 4,
        errorCorrectionLevel: "M",
      });
      if (abort.signal.aborted) return;
      setUrl(link);
      setQr(image);
      setStatus("Controle pelo celular");
      const sync = async () => {
        let delay = 1000;
        try {
          const sentAck = ack;
          const result = await remoteRequest(
            {
              action: "sync",
              id: session.id,
              token: session.hostToken,
              state: latest.current.state,
              ack: sentAck,
            },
            abort.signal,
          );
          if (abort.signal.aborted) return;
          ack = ack.filter((id) => !sentAck.includes(id));
          for (const item of result.commands ?? []) {
            if (typeof item.id !== "string" || !isCommand(item.command))
              continue;
            if (!applied.has(item.id)) {
              latest.current.onCommand(item.command);
              applied.add(item.id);
            }
            if (!ack.includes(item.id)) ack.push(item.id);
          }
          // Retain enough IDs to suppress retries without growing over a long TV run.
          while (applied.size > 256)
            applied.delete(applied.values().next().value!);
          setStatus(
            result.paired ? "Celular pareado" : "Controle pelo celular",
          );
        } catch {
          if (!abort.signal.aborted) setStatus("Reconectando controle…");
          delay = 3000;
        } finally {
          if (!abort.signal.aborted) timer = setTimeout(sync, delay);
        }
      };
      void sync();
    };
    start().catch(() => {
      if (!abort.signal.aborted)
        setStatus("Controle indisponível. Tentar novamente");
    });
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [retry]);
  return (
    <aside className="remote-pairing" aria-label="Controle pelo celular">
      {qr ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir controle desta apresentação no celular"
        >
          <img
            src={qr}
            alt="Escaneie para controlar esta apresentação pelo celular"
            width={360}
            height={360}
          />
          <span>{status}</span>
        </a>
      ) : (
        <button onClick={() => setRetry((value) => value + 1)}>{status}</button>
      )}
    </aside>
  );
}
