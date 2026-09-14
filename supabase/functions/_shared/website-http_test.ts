import { strict as assert } from "node:assert";
import { readHttpResponse } from "./website-http.ts";
function reader(text: string, split = 7) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return {
    async read(buffer: Uint8Array) {
      if (offset === bytes.length) return null;
      const n = Math.min(buffer.length, split, bytes.length - offset);
      buffer.set(bytes.subarray(offset, offset + n));
      offset += n;
      return n;
    },
  };
}
Deno.test("HTTP parser preserves UTF-8 across fragmented fixed and chunked responses", async () => {
  const body = "Bénéfices réels";
  const bytes = new TextEncoder().encode(body).length;
  const fixed = await readHttpResponse(
    reader(
      `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${bytes}\r\n\r\n${body}`,
      1,
    ),
  );
  assert.equal(fixed.body, body);
  const chunked = await readHttpResponse(
    reader(
      `HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n${
        bytes.toString(16)
      };ext=1\r\n${body}\r\n0\r\nX-Trailer: value\r\n\r\n`,
      2,
    ),
  );
  assert.equal(chunked.body, body);
});
Deno.test("HTTP parser supports redirects, informational responses and close-delimited bodies", async () => {
  assert.equal(
    (await readHttpResponse(
      reader("HTTP/1.1 301 Moved\r\nLocation: /vente\r\n\r\n"),
    )).location,
    "/vente",
  );
  assert.equal(
    (await readHttpResponse(
      reader(
        "HTTP/1.1 103 Early Hints\r\nLink: </style.css>\r\n\r\nHTTP/1.1 200 OK\r\n\r\nOffre",
      ),
    )).body,
    "Offre",
  );
});
Deno.test("HTTP parser refuses oversized, truncated and ambiguous responses", async () => {
  for (
    const raw of [
      "HTTP/1.1 200 OK\r\nContent-Length: 1000001\r\n\r\n",
      "HTTP/1.1 200 OK\r\nContent-Length: 10\r\n\r\nx",
      "HTTP/1.1 200 OK\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\nxx",
      "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nzz\r\nx\r\n0\r\n\r\n",
    ]
  ) await assert.rejects(() => readHttpResponse(reader(raw)));
});
