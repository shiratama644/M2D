# Compatibility Spec Workflow

This document describes the exact process for mirroring and analyzing the upstream
`PrismarineJS/prismarine-viewer` repository and extracting a full protocol/event
compatibility specification against its latest HEAD.

---

## 1. Prerequisites

- Node.js ≥ 18 and npm installed
- Git installed
- Write access to this repository (for committing spec updates)

---

## 2. Mirror / Clone Upstream

```bash
# Clone (or update) prismarine-viewer at latest HEAD
git clone --depth 1 https://github.com/PrismarineJS/prismarine-viewer.git /tmp/prismarine-viewer

# Record the exact commit used as the compatibility baseline
git -C /tmp/prismarine-viewer rev-parse HEAD
```

Paste the resulting SHA into
`docs/compat/prismarine-viewer/README.md` → **Baseline Commit** section.

---

## 3. Install Dependencies

```bash
cd /tmp/prismarine-viewer
npm install
```

This ensures all transitive type definitions and mineflayer plugin hooks are available for
static analysis.

---

## 4. Extract the Event Inventory

### 4a. Find all `emit` calls (server → viewer direction)

```bash
grep -rn "\.emit(" /tmp/prismarine-viewer/lib \
  --include="*.js" --include="*.ts" \
  | sort -u
```

### 4b. Find all `on` / `once` listeners (viewer receiving)

```bash
grep -rn "\.\(on\|once\)(" /tmp/prismarine-viewer/lib \
  --include="*.js" --include="*.ts" \
  | sort -u
```

### 4c. Find WebSocket / postMessage send calls

```bash
grep -rn "ws\.send\|socket\.send\|postMessage" /tmp/prismarine-viewer \
  --include="*.js" --include="*.ts" \
  | sort -u
```

Record each event in `docs/compat/prismarine-viewer/EVENT_MATRIX_TEMPLATE.md`.

---

## 5. Extract Payload Schemas

For each event found in step 4, locate the object literal or destructuring pattern at the
call site.  Document:

- Required fields (always present)
- Optional fields (conditionally present)
- Field types (number / string / boolean / object / array)
- Units / coordinate system notes

Populate the **Payload Schemas** section of
`docs/compat/prismarine-viewer/README.md`.

---

## 6. Determine Sequencing

Trace the call path from `bot.on('spawn', …)` through the viewer plugin entry point to
understand:

1. Which events fire during **initial connection** (handshake / snapshot phase)
2. Which events fire **continuously** (incremental update phase)
3. Hard ordering constraints (e.g., `chunkData` must arrive before `entitySpawn` for
   the same chunk)

Document findings in the **Sequencing** section of
`docs/compat/prismarine-viewer/README.md`.

---

## 7. Determine Resync / Error Behavior

Check how the viewer handles:

- Missing / out-of-order sequence numbers
- Dropped WebSocket connection and reconnect
- Full-state resync requests from the viewer
- Unknown event types

Document findings in the **Resync Behavior** section of
`docs/compat/prismarine-viewer/README.md`.

---

## 8. Run Existing Tests (Upstream)

```bash
cd /tmp/prismarine-viewer
npm test
```

Note which test cases cover protocol serialization / deserialization — these are the most
valuable regression reference points.

---

## 9. Commit the Spec Update

After filling in all sections:

```bash
cd /path/to/this/repo   # M2D

git checkout -b spec/prismarine-viewer-$(date +%Y%m%d)
git add docs/compat/prismarine-viewer/
git commit -m "spec: update prismarine-viewer compat spec ($(git -C /tmp/prismarine-viewer rev-parse --short HEAD))"
git push origin HEAD
# Open a PR against main
```

---

## 10. Keeping the Spec Current

Run this workflow whenever:

- A new prismarine-viewer release is published
- A breaking change is merged into `PrismarineJS/prismarine-viewer` `main`
- This project's Three.js viewer diverges from the reference behavior

Use the **Test Checklist** in `docs/compat/prismarine-viewer/README.md` to verify
compatibility after each update.
