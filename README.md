# SolidStart 2.1.0: client environment loses Vite's default resolve conditions

Minimal reproduction, generated with `create-solid -s --v2 --ts -t basic`.
On top of the template it only adds:

- `packages/env-probe`, a local package with the same export layout as
  `@sentry/solidstart`: a `"browser"` build, and a Node build (which reads
  `process`) for `"node"` / `"default"`;
- `src/components/EnvProbe.tsx`, rendered on the index page, which reads the
  probe in the browser;
- `check.mjs` / `check-dev-overlay.mjs`, which print what Vite resolves;
- `@solidjs/start` pinned to `2.1.0`.

## The bug

`solidStart()` sets `resolve.conditions: ["generic"]` on **every** environment
(`solid-start:config` plugin, `configEnvironment` hook, added in solidjs/solid-start#2326).
Vite and vite-plugin-solid only apply their default conditions when
`resolve.conditions` is unset, so the client environment loses `"module"`,
`"browser"` and `"development|production"`.

Packages with a `"browser"` export condition then resolve to their Node /
default build in the browser. Real-world case: `@sentry/solidstart` →
`index.server.js` → `@sentry/node` → `ReferenceError: process is not defined`.

## Steps

```sh
pnpm install
pnpm check
```

```
[client] consumer=client
  resolve.conditions: [ 'solid', 'development', 'generic' ]
  env-probe → server.js
✗ BUG: the client environment does not resolve the "browser" export condition
```

Expected: Vite's client defaults are kept
(`[ 'solid', 'development', 'module', 'browser', 'development|production' ]`)
and `env-probe` resolves to `client.js`.

The same happens at runtime and in production builds:

- `pnpm dev`, open the index page: SolidStart's error overlay replaces the page
  with `ReferenceError: process is not defined` at
  `node_modules/env-probe/server.js:2:32`.
- `pnpm build && grep -rl 'process.version' .output/public`: the client bundle
  contains the Node build.

## Fix

Fixed by solidjs/solid-start PR (link to come). The same change, applied to
the published `dist`, is in `fix/@solidjs__start@2.1.0.patch`. To try it:

```yaml
# pnpm-workspace.yaml
patchedDependencies:
  '@solidjs/start@2.1.0': fix/@solidjs__start@2.1.0.patch
```

```sh
pnpm install && pnpm check && pnpm check:dev-overlay
```

`check:dev-overlay` covers a second issue the fix has to handle: once
`"browser"` is back, the dev overlay's `@jridgewell/trace-mapping` (served
unbundled) imports the UMD build of `@jridgewell/resolve-uri`, which the
browser cannot import as ESM. With the conditions fix alone, any client error
then breaks the overlay itself:

```
SyntaxError: The requested module '…/@jridgewell/resolve-uri/dist/resolve-uri.umd.js'
does not provide an export named 'default'
```

The fix pre-bundles it in dev. This check passes on unpatched 2.1.0 only
because `"browser"` is missing there.
