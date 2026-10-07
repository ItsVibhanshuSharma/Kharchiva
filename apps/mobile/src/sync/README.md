# Sync Boundary

SQLite repositories and sync metadata are the local persistence boundary. The API client is the remote transport boundary. Queue scheduling, retries, pull cursors, and conflict resolution are intentionally not implemented in the scaffold.