import { remoteSession, RemoteError } from "@/lib/remote-session";
import { remoteBlobStore } from "@/lib/remote-blob-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new RemoteError("Origem inválida.", 403);
    if (Number(request.headers.get("content-length")) > 24000)
      throw new RemoteError("Requisição inválida.", 413);
    const text = await request.text();
    if (text.length > 24000) throw new RemoteError("Requisição inválida.", 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new RemoteError("Requisição inválida.", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new RemoteError("Requisição inválida.", 400);
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID)
      throw new RemoteError(
        "O controle por servidor ainda não está ativado.",
        503,
      );
    return Response.json(await remoteSession(remoteBlobStore, body), {
      headers,
    });
  } catch (error) {
    if (error instanceof RemoteError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    console.error(
      "Remote control storage request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "Conexão temporariamente indisponível. Tentando novamente…" },
      { status: 503, headers },
    );
  }
}
