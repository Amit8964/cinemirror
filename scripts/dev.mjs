// `npm run dev` launcher: starts `next dev` with a cap on the JavaScript heap, so the dev server garbage-collects instead of
// growing until the OS kills one of its workers ("Jest worker encountered 2 child process exceptions").
// NODE_OPTIONS is inherited by Next's server process (a plain `node --max-old-space-size ...` flag would only reach the wrapper).
// Override the cap with DEV_MAX_OLD_SPACE_MB, e.g. DEV_MAX_OLD_SPACE_MB=2048 npm run dev
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const mb = Number(process.env.DEV_MAX_OLD_SPACE_MB) || 1024;
const flag = `--max-old-space-size=${mb}`;
const existing = process.env.NODE_OPTIONS ?? "";
const env = { ...process.env, NODE_OPTIONS: existing.includes("max-old-space-size") ? existing : `${existing} ${flag}`.trim() };

const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [next, "dev", ...process.argv.slice(2)], { stdio: "inherit", env });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
