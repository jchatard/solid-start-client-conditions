// Once "browser" is back in the client conditions, @jridgewell/trace-mapping
// (imported by the dev overlay) resolves @jridgewell/resolve-uri to its UMD
// build: served unbundled, the browser cannot import it. It must be pre-bundled.
import { realpathSync } from "node:fs";
import { createServer } from "vite";

const server = await createServer({ logLevel: "silent", server: { port: 3918, strictPort: true } });
await server.listen();
const importer = `${realpathSync("node_modules/@solidjs/start")}/dist/shared/dev-toolbar/error-viewer/create-stack-frame.js`;
const resolved = await server.environments.client.pluginContainer.resolveId("@jridgewell/trace-mapping", importer);
const url = resolved.id.includes("/.vite/deps/")
  ? `/node_modules/.vite/deps/${resolved.id.split("/.vite/deps/")[1]}`
  : `/@fs${resolved.id.split("?")[0]}`;
const code = await (await fetch(`http://localhost:3918${url}`)).text();
await server.close();

const imports = [...code.matchAll(/from\s*["']([^"']+)["']/g)].map((m) => m[1]);
console.log("trace-mapping served from:", url);
console.log("its imports:", imports.length ? imports : "(none, pre-bundled)");
if (imports.some((i) => i.includes(".umd.js"))) {
  console.error("\n✗ the browser is served a UMD module as ESM");
  process.exit(1);
}
console.log("\n✓ no UMD module served to the browser");
process.exit(0); // nitro's dev worker keeps the event loop alive
