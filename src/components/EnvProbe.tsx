import { build } from "env-probe";
import { createSignal, onMount } from "solid-js";

// env-probe has the same export layout as @sentry/solidstart: a "browser"
// build, and a Node build (which reads `process`) for every other condition.
export default function EnvProbe() {
  const [clientBuild, setClientBuild] = createSignal("not hydrated");
  // Read in the browser: expected "client". With @solidjs/start 2.1.0 the
  // browser gets the Node build and throws "process is not defined".
  onMount(() => setClientBuild(build));
  return <p id="env-probe">env-probe build in the browser: {clientBuild()}</p>;
}
