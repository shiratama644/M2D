# prismarine-viewer Compatibility Specification

> **Status:** TEMPLATE — fill in each section by following `SPEC_WORKFLOW.md`.

---

## Baseline Commit

| Field          | Value |
|----------------|-------|
| Repository     | `https://github.com/PrismarineJS/prismarine-viewer` |
| Branch         | `master` |
| Commit SHA     | <!-- paste output of `git -C /tmp/prismarine-viewer rev-parse HEAD` --> |
| Date extracted | <!-- YYYY-MM-DD --> |
| Extracted by   | <!-- your name / agent ID --> |

---

## Event Inventory

A summary list of all events identified.  Full per-event details live in
[EVENT_MATRIX_TEMPLATE.md](./EVENT_MATRIX_TEMPLATE.md).

### bot → viewer (outbound)

| Event name | Source file | Description |
|------------|-------------|-------------|
| <!-- e.g. `entitySpawn` --> | <!-- lib/viewer.js:42 --> | <!-- brief description --> |

### viewer → bot (inbound / control)

| Event name | Source file | Description |
|------------|-------------|-------------|
| <!-- e.g. `mouseMove` --> | <!-- lib/controls.js:17 --> | <!-- brief description --> |

---

## Payload Schemas

For each event, document the exact object shape sent over the wire.
Use the following template block for every event:

---

### `<eventName>`

**Direction:** bot → viewer | viewer → bot

**Trigger:** <!-- when / which mineflayer event causes this -->

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| <!-- field --> | <!-- type --> | <!-- description --> |

**Optional fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| <!-- field --> | <!-- type --> | <!-- default --> | <!-- description --> |

**Example payload:**

```json
{
  // paste a representative JSON object here
}
```

---

*(Repeat the block above for every event in the inventory.)*

---

## Sequencing

### Initial connection sequence

```
Viewer connects
  └─ server sends:  hello
  └─ server sends:  fullSnapshot  (bot state + visible entities + loaded chunks)
  └─ server sends:  chunkData × N  (all chunks in view distance)
  └─ server sends:  entitySpawn × N  (all currently tracked entities)
  └─ server sends:  botState  (position, health, inventory, …)
```

<!-- Replace the placeholder sequence above with the actual order observed in the
     prismarine-viewer source (lib/viewer.js or equivalent). -->

### Continuous update sequence

```
Game tick
  └─ entity moved  → entityMove
  └─ block changed → blockUpdate
  └─ chunk loaded  → chunkData
  └─ chunk removed → chunkUnload
  └─ entity gone   → entityRemove
  └─ bot state Δ   → botState (delta or full, TBD from source)
```

### Hard ordering constraints

- `chunkData` for chunk (X, Z) **must** arrive before `entitySpawn` for any entity
  whose position falls within that chunk.
- `hello` **must** be the first message on every new connection.
- `fullSnapshot` **must** be sent before any incremental updates.

<!-- Verify or correct the constraints above against the actual source. -->

---

## Resync Behavior

| Scenario | Expected behavior |
|----------|-------------------|
| WebSocket disconnect + reconnect | Server re-sends `hello` + `fullSnapshot` |
| Viewer sends `snapshotRequest` | Server re-sends `fullSnapshot` immediately |
| Out-of-order sequence number detected | Viewer logs warning; requests `snapshotRequest` |
| Unknown `type` received | Viewer logs warning; ignores message |
| Protocol version mismatch (`v` field) | Connection refused or compat-mode negotiated |

<!-- Update the table with the actual behavior observed in the source. -->

---

## Test Checklist

Use this checklist to verify that a new implementation (or an updated spec) preserves
full compatibility with prismarine-viewer.

### Connection & Handshake
- [ ] Viewer receives `hello` as the very first message
- [ ] `hello` payload contains server capabilities and MC version
- [ ] `fullSnapshot` is received before any incremental event

### Chunk Handling
- [ ] `chunkData` arrives for every chunk in the initial view distance
- [ ] `chunkUnload` fires when a chunk leaves the view distance
- [ ] Re-connecting viewer receives all chunks again via `fullSnapshot`

### Entity Lifecycle
- [ ] `entitySpawn` fires for every entity present at connection time
- [ ] `entityMove` fires for every position/yaw/pitch change
- [ ] `entityRemove` fires when an entity despawns
- [ ] No `entitySpawn` arrives before the corresponding chunk's `chunkData`

### Block Updates
- [ ] `blockUpdate` fires for every single-block change
- [ ] Multi-block updates are correctly disaggregated or batched (verify from source)

### Bot State
- [ ] `botState` reflects accurate position, health, food, and selected slot
- [ ] `botState` is sent on initial snapshot and on every meaningful state change

### Chat / System Messages
- [ ] `chatMessage` fires for every in-game chat message with sender + text
- [ ] System messages (title, actionbar) are delivered if supported

### Inventory
- [ ] Hotbar / selected slot changes are reflected in `botState` or dedicated event
- [ ] Window open/close events are transmitted if supported by upstream

### Error & Resync
- [ ] Viewer recovers gracefully after disconnect and reconnect
- [ ] `snapshotRequest` from viewer triggers a full re-sync
- [ ] Unknown event types are silently ignored without crashing

### Regression
- [ ] Coordinate system matches (Y-up, 1 block = 1 unit, yaw/pitch sign convention)
- [ ] All field names match the upstream reference exactly (no renames)
- [ ] All numeric types match (no string/number coercion differences)
