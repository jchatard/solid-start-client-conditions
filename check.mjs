// Prints the resolve conditions of each Vite environment and what a package
// exposing "browser" / "node" / "default" export conditions resolves to.
import { createServer, defaultClientConditions, defaultServerConditions } from "vite";

// env-probe is excluded from pre-bundling so resolveId returns its real file.
const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  optimizeDeps: { exclude: ["env-probe"] },
});
console.log("Vite defaults  client:", defaultClientConditions, " server:", defaultServerConditions);
let failed = false;
for (const [name, env] of Object.entries(server.environments)) {
  const resolved = await env.pluginContainer.resolveId("env-probe", `${server.config.root}/src/components/EnvProbe.tsx`);
  const file = resolved?.id.split("/").pop();
  console.log(`\n[${name}] consumer=${env.config.consumer}`);
  console.log("  resolve.conditions:", env.config.resolve.conditions);
  console.log("  env-probe →", file);
  if (env.config.consumer === "client" && !file?.startsWith("client.js")) failed = true;
}
await server.close();
if (failed) {
  console.error("\n✗ BUG: the client environment does not resolve the \"browser\" export condition");
  process.exit(1);
}
console.log("\n✓ client environment resolves the \"browser\" export condition");
process.exit(0); // nitro's dev worker keeps the event loop alive
