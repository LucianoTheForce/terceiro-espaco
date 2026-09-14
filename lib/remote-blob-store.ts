import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import type { Session, SessionStore } from "./remote-session";

export const remoteBlobStore: SessionStore = {
  async read(id) {
    const result = await get(`remote/v2/${id}.json`, {
      access: "private",
      useCache: false,
    });
    if (!result || !result.stream) return null;
    return {
      session: (await new Response(result.stream).json()) as Session,
      version: result.blob.etag,
    };
  },
  async write(id, session, version) {
    try {
      await put(`remote/v2/${id}.json`, JSON.stringify(session), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: Boolean(version),
        ...(version ? { ifMatch: version } : {}),
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
      return true;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) return false;
      throw error;
    }
  },
};
