# Autosave, revisions, retries, and conflicts

`useProjectPersistence` stores current projects in a ref, acknowledged `{revision,key}` pairs in a Map, one pending promise, and a blocked flag. `source()` strips cloud metadata; `sourceKey()` serializes normalized source for dirty detection. Title normalization supplies `Untitled project` for a blank browser title.

An edit schedules `flush()` after 600 ms. The flush loop picks dirty source, captures its key and last acknowledged revision, sends a strict project PUT, and advances acknowledgement only after the validated response. It updates current revision/permissions while preserving newer local text. The loop then checks for edits made during the request. Concurrent callers wait for the pending save and then re-evaluate dirtiness.

The server locks the organization, verifies write access, compares expected revision, and updates with a matching-revision SQL predicate. A success increments revision. A stale request receives 409 instead of overwriting source.

`CloudError` carries the HTTP status. 401/403/404/409 block editing and mark a conflict/access problem. Other failures expose retry and keep text in the tab. A malformed successful API response becomes a 502-style CloudError and is not accepted as acknowledged source. Browser/server schema contracts are in [responses](../reference/contracts.md).

Navigation to other workspaces, settings, or sign-out flushes edits first. Compilation also flushes before obtaining the saved revision. An unload listener warns while local source differs from acknowledgement. This is not durable offline storage: terminating the tab can still lose dirty edits.

Recovery from a conflict is manual. Export the local source ZIP if needed, reload current server data, then reconcile edits deliberately. The app does not merge or overwrite a conflicted draft automatically. The hook's stable revision getter reads the ref Map so compilation can use current acknowledgement without recreating callbacks on every render.

## Implementation references

- [src/features/editor/hooks/use-project-persistence.ts](../../src/features/editor/hooks/use-project-persistence.ts)
- [src/shared/http/cloud-client.ts](../../src/shared/http/cloud-client.ts)
- [docs/architecture/source-structure.md](../architecture/source-structure.md)
- [tests/browser/workspace.spec.ts](../../tests/browser/workspace.spec.ts)
