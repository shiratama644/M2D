# Event Matrix Template

> Fill in this table by running the extraction steps in `SPEC_WORKFLOW.md`.
> One row per distinct event.  Add rows as needed.

---

## How to read the columns

| Column | Meaning |
|--------|---------|
| **Event Name** | Exact string used in `emit` / `on` calls |
| **Source File** | File path and line number in prismarine-viewer where the event is emitted or consumed (e.g., `lib/viewer.js:42`) |
| **Direction** | `bot→viewer` (server pushes to client) or `viewer→bot` (client sends to server) |
| **Required Fields** | Fields that are always present; omission is a bug |
| **Optional Fields** | Fields that may be absent; receiver must handle absence gracefully |
| **Ordering Guarantees** | Any hard constraint on when this event must arrive relative to other events |
| **Notes** | Version caveats, deprecation status, special handling, links to upstream source |

---

## Event Matrix

| Event Name | Source File | Direction | Required Fields | Optional Fields | Ordering Guarantees | Notes |
|------------|-------------|-----------|-----------------|-----------------|---------------------|-------|
| `hello` | <!-- lib/viewer.js:? --> | bot→viewer | `v`, `capabilities`, `mcVersion` | `serverName` | Must be first message on every connection | Capability list determines which optional events the server will emit |
| `fullSnapshot` | <!-- lib/viewer.js:? --> | bot→viewer | `bot`, `entities`, `chunks` | `weather`, `timeOfDay` | Must follow `hello`; must precede all incremental events | `chunks` may be empty array if world not yet loaded |
| `chunkData` | <!-- lib/world.js:? --> | bot→viewer | `x`, `z`, `data` | `skyLightSent`, `blockEntities` | Must arrive before `entitySpawn` for entities in this chunk | `data` is the raw chunk column buffer |
| `chunkUnload` | <!-- lib/world.js:? --> | bot→viewer | `x`, `z` | — | — | Viewer should discard all blocks and entities in this chunk |
| `blockUpdate` | <!-- lib/world.js:? --> | bot→viewer | `position`, `stateId` | — | Chunk must already be loaded | `position`: `{x, y, z}`; `stateId`: numeric block state |
| `entitySpawn` | <!-- lib/entities.js:? --> | bot→viewer | `id`, `type`, `position`, `yaw`, `pitch` | `uuid`, `username`, `metadata`, `velocity` | Chunk containing entity must be loaded | `type`: string enum (`player`, `mob`, `object`, …) |
| `entityMove` | <!-- lib/entities.js:? --> | bot→viewer | `id`, `position` | `yaw`, `pitch`, `onGround`, `velocity` | Entity must have been spawned via `entitySpawn` | High frequency; viewer should interpolate over ~100 ms |
| `entityRemove` | <!-- lib/entities.js:? --> | bot→viewer | `id` | — | — | Viewer must remove entity immediately; do not interpolate after this |
| `botState` | <!-- lib/bot.js:? --> | bot→viewer | `position`, `yaw`, `pitch`, `health`, `food`, `selectedSlot` | `velocity`, `onGround`, `sneaking`, `sprinting`, `oxygen` | Must be included in `fullSnapshot`; fired on every state change | `selectedSlot`: 0-indexed hotbar slot |
| `inventoryState` | <!-- lib/bot.js:? --> | bot→viewer | `slots` | `windowId`, `windowTitle`, `windowType` | — | `slots`: array of `{slot, itemId, count, metadata}`; `null` entry means empty |
| `chatMessage` | <!-- lib/chat.js:? --> | bot→viewer | `sender`, `text` | `jsonText`, `ts` | — | `ts`: Unix ms; `sender` is empty string for system messages |
| `snapshotRequest` | <!-- lib/viewer.js:? --> | viewer→bot | — | — | — | Viewer sends when it detects a gap in sequence numbers; server responds with `fullSnapshot` |
| `mouseMove` | <!-- lib/controls.js:? --> | viewer→bot | `yaw`, `pitch` | — | — | Used only in interactive/control mode; may be absent if viewer is read-only |
| `tick` | <!-- lib/world.js:? --> | bot→viewer | `seq`, `ts` | `timeOfDay`, `isRaining`, `thunderStrength` | — | Optional heartbeat; `seq`: monotonically increasing integer |

---

## Changelog

| Date | Baseline Commit | Changed Events | Author |
|------|-----------------|----------------|--------|
| <!-- YYYY-MM-DD --> | <!-- short SHA --> | <!-- list --> | <!-- name --> |
