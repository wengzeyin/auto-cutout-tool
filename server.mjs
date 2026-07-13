import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const qaToken = process.env.QA_SERVER_TOKEN || "";
const imglyPublicBase = "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/";
const imglyCacheRoot = join(root, ".cache-imgly");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  if (url.pathname === "/__qa_health") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ ok: true, port, token: qaToken }));
    return;
  }
  if (url.pathname === "/__imgly" || url.pathname.startsWith("/__imgly/")) {
    await proxyImglyResource(url, res);
    return;
  }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, requested));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, () => {
  console.log(`Auto cutout tool: http://localhost:${port}`);
});

async function proxyImglyResource(url, res) {
  const relativePath = decodeURIComponent(url.pathname.replace(/^\/__imgly\/?/, "")) || "resources.json";
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const cachePath = normalize(join(imglyCacheRoot, safePath));

  if (!cachePath.startsWith(imglyCacheRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const cached = await readFile(cachePath);
    sendResource(res, cachePath, cached, "HIT");
    return;
  } catch {}

  try {
    const resourceUrl = new URL(safePath, imglyPublicBase);
    const data = await fetchResourceWithRetry(resourceUrl);
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, data);
    sendResource(res, cachePath, data, "MISS");
  } catch (error) {
    res.writeHead(502, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(`Failed to proxy IMG.LY resource: ${error?.message || String(error)}`);
  }
}

async function fetchResourceWithRetry(resourceUrl) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(resourceUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`${resourceUrl}: ${lastError?.message || String(lastError)}`);
}

function sendResource(res, filePath, data, cacheState) {
  res.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Imgly-Cache": cacheState,
  });
  res.end(data);
}
