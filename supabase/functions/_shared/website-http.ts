// HTTP/1.1 over a validated IP. startTls verifies the original hostname and SNI
// without resolving it again. Supabase's node:http custom lookup is unsupported.
export type WebsiteResponse = {
  status: number;
  type: string;
  body: string;
  location?: string;
};
export async function pinnedRequest(
  url: URL,
  address: string,
): Promise<WebsiteResponse> {
  let connection: Deno.Conn | undefined;
  let expired = false;
  const deadline = setTimeout(() => {
    expired = true;
    try {
      connection?.close();
    } catch { /* Already closed. */ }
  }, 15000);
  try {
    connection = await Deno.connect({
      hostname: address,
      port: url.protocol === "https:" ? 443 : 80,
    });
    if (expired) throw new Error("HTTP_TIMEOUT");
    if (url.protocol === "https:") {
      connection = await Deno.startTls(connection as Deno.TcpConn, {
        hostname: url.hostname,
        alpnProtocols: ["http/1.1"],
      });
      if (expired) throw new Error("HTTP_TIMEOUT");
    }
    const request = new TextEncoder().encode(
      `GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.host}\r\nUser-Agent: LyadsBot/1.0\r\nAccept: text/html,text/plain;q=0.8\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`,
    );
    for (let offset = 0; offset < request.length;) {
      offset += await connection.write(request.subarray(offset));
    }
    return await readHttpResponse(connection);
  } finally {
    clearTimeout(deadline);
    try {
      connection?.close();
    } catch { /* TLS errors can close the socket. */ }
  }
}

// Bounded parser for fixed-length, chunked, and connection-close HTTP responses.
export async function readHttpResponse(
  reader: { read(buffer: Uint8Array): Promise<number | null> },
): Promise<WebsiteResponse> {
  let pending = new Uint8Array(0);
  let received = 0;
  const limit = 1_000_000;
  const fill = async () => {
    const buffer = new Uint8Array(16384);
    const n = await reader.read(buffer);
    if (n === null) return false;
    received += n;
    if (received > limit + 65536) throw new Error("HTTP_TOO_LARGE");
    const joined = new Uint8Array(pending.length + n);
    joined.set(pending);
    joined.set(buffer.subarray(0, n), pending.length);
    pending = joined;
    return true;
  };
  const exact = async (count: number) => {
    if (!Number.isSafeInteger(count) || count < 0 || count > limit) {
      throw new Error("HTTP_TOO_LARGE");
    }
    while (pending.length < count) {
      if (!await fill()) throw new Error("HTTP_TRUNCATED");
    }
    const bytes = pending.slice(0, count);
    pending = pending.subarray(count);
    return bytes;
  };
  let headerBytes = 0;
  const line = async (): Promise<string> => {
    while (true) {
      let end = -1;
      for (let i = 0; i < pending.length - 1; i++) {
        if (pending[i] === 13 && pending[i + 1] === 10) {
          end = i;
          break;
        }
      }
      if (end >= 0) {
        headerBytes += end + 2;
        if (headerBytes > 65536) throw new Error("HTTP_HEADERS_TOO_LARGE");
        const value = new TextDecoder().decode(pending.subarray(0, end));
        pending = pending.subarray(end + 2);
        return value;
      }
      if (pending.length > 16384) throw new Error("HTTP_HEADERS_TOO_LARGE");
      if (!await fill()) throw new Error("HTTP_TRUNCATED");
    }
  };
  let status = 0;
  let headers = new Headers();
  do {
    const first = await line();
    const match = /^HTTP\/1\.[01] ([1-5]\d\d)(?: |$)/.exec(first);
    if (!match) throw new Error("HTTP_INVALID_RESPONSE");
    status = Number(match[1]);
    headers = new Headers();
    for (let value = await line(); value; value = await line()) {
      const colon = value.indexOf(":");
      if (colon <= 0) throw new Error("HTTP_INVALID_RESPONSE");
      headers.append(value.slice(0, colon), value.slice(colon + 1).trim());
    }
  } while (status >= 100 && status < 200 && status !== 101);
  const response = {
    status,
    type: headers.get("content-type") || "",
    body: "",
  };
  if ([301, 302, 303, 307, 308].includes(status)) {
    return { ...response, location: headers.get("location") || undefined };
  }
  if (status === 204 || status === 304) return response;
  if (
    headers.has("content-encoding") &&
    headers.get("content-encoding") !== "identity"
  ) throw new Error("HTTP_UNSUPPORTED_ENCODING");
  const chunks: Uint8Array[] = [];
  let total = 0;
  const append = (chunk: Uint8Array) => {
    total += chunk.length;
    if (total > limit) throw new Error("HTTP_TOO_LARGE");
    chunks.push(chunk);
  };
  if (headers.has("transfer-encoding")) {
    if (headers.get("transfer-encoding")?.toLowerCase() !== "chunked") {
      throw new Error("HTTP_INVALID_RESPONSE");
    }
    while (true) {
      const sizeLine = (await line()).split(";")[0];
      if (!/^[0-9a-f]+$/i.test(sizeLine)) {
        throw new Error("HTTP_INVALID_RESPONSE");
      }
      const size = parseInt(sizeLine, 16);
      if (!size) {
        while (await line()) { /* Consume bounded trailers. */ }
        break;
      }
      append(await exact(size));
      const crlf = await exact(2);
      if (crlf[0] !== 13 || crlf[1] !== 10) {
        throw new Error("HTTP_INVALID_RESPONSE");
      }
    }
  } else if (headers.has("content-length")) {
    const length = headers.get("content-length")!;
    if (!/^\d+$/.test(length)) throw new Error("HTTP_INVALID_RESPONSE");
    append(await exact(Number(length)));
  } else {
    do {
      append(pending);
      pending = new Uint8Array(0);
    } while (await fill());
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { ...response, body: new TextDecoder().decode(body) };
}
