#!/usr/bin/env bash
#
# Prove the published tarball is actually installable and importable.
#
# Why this exists. `npm run build` and `npm test` both passed on a package
# whose `exports.import` pointed at `dist/index.mjs` — a file `tsc` never
# emits, because the build is a single ESM pass. Every consumer doing
# `import { GonosClient } from "@gonos/sdk"` would have gotten
# ERR_MODULE_NOT_FOUND. Nothing in the repo could see it: the tests import
# from `src/`, so they never resolve through the exports map, and `tsc`
# does not read `exports` at all.
#
# npm versions are immutable. Publishing that manifest would have burned
# the version number on an artifact that cannot be imported, and the only
# fix is a new version. So the check has to run BEFORE publish, against
# the real tarball, from outside the package directory.
#
# What it does: builds, packs, installs the tarball into a scratch project
# with no relationship to this repo, then imports the package by name the
# way a consumer does. Anything the `files` allowlist forgets, or any
# exports-map entry pointing at a file that isn't emitted, fails here.
set -euo pipefail

cd "$(dirname "$0")/.."
PKG_DIR="$(pwd)"

WORK="$(mktemp -d)"
cleanup() {
  rm -rf "$WORK"
  rm -f "$PKG_DIR"/gonos-sdk-*.tgz
}
trap cleanup EXIT

echo "==> Building"
npm run build --silent

echo "==> Packing"
TARBALL_NAME="$(npm pack --silent | tail -1)"
TARBALL="$PKG_DIR/$TARBALL_NAME"
test -f "$TARBALL" || { echo "FAIL: npm pack produced no tarball"; exit 1; }

echo "==> Checking the tarball carries what the manifest promises"
CONTENTS="$(tar -tzf "$TARBALL")"
for required in package/package.json package/README.md package/LICENSE; do
  grep -qx "$required" <<<"$CONTENTS" || {
    echo "FAIL: $required missing from the tarball — check the 'files' allowlist"
    exit 1
  }
done

# Every path the manifest points at must exist in the tarball. This is the
# specific defect that shipped: an exports entry naming a file the build
# never produced.
node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const refs = new Set();
  const walk = (v) => {
    if (typeof v === "string" && v.startsWith("./")) refs.add(v);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(pkg.exports);
  for (const f of ["main", "types", "module"]) if (pkg[f]) refs.add(pkg[f]);
  const missing = [...refs].filter((p) => !fs.existsSync(p.replace(/^\.\//, "")));
  if (missing.length) {
    console.error("FAIL: manifest references files the build does not emit:");
    missing.forEach((m) => console.error("  " + m));
    process.exit(1);
  }
  console.log("    manifest references " + refs.size + " emitted files, all present");
'

echo "==> Installing the tarball into a scratch consumer"
cd "$WORK"
npm init -y >/dev/null 2>&1
npm install --no-audit --no-fund --silent "$TARBALL" >/dev/null 2>&1

echo "==> Importing by package name, the way a consumer does"
node --input-type=module -e '
  import { GonosClient, verifyWebhookSignature, ApiError } from "@gonos/sdk";
  for (const [name, v] of Object.entries({ GonosClient, verifyWebhookSignature, ApiError })) {
    if (typeof v !== "function") {
      console.error(`FAIL: ${name} did not resolve to a function (got ${typeof v})`);
      process.exit(1);
    }
  }
  new GonosClient({ apiKey: "gn_test_verify" });
  console.log("    import + construct OK");
'

echo "==> Checking the published types resolve"
cat > tsconfig.json <<'TSCONFIG'
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "files": ["probe.ts"]
}
TSCONFIG
cat > probe.ts <<'PROBE'
import { GonosClient } from "@gonos/sdk";
const client: GonosClient = new GonosClient({ apiKey: "gn_test_verify" });
void client;
PROBE
# Resolved under NodeNext rather than the package's own "Bundler" setting:
# consumers get NodeNext, and it is stricter about exports-map correctness.
npm install --no-audit --no-fund --silent typescript@^5.4.0 >/dev/null 2>&1
./node_modules/.bin/tsc -p tsconfig.json || {
  echo "FAIL: published .d.ts does not resolve under NodeNext"
  exit 1
}
echo "    types resolve under NodeNext"

echo
echo "PACKAGE OK — $TARBALL_NAME installs, imports, and type-checks from outside the repo"
