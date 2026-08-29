# Shopee RIMU Frontend Agent Guide

This repository owns the browser frontend. It should call `rimu-be-go` for
authenticated application APIs and must not call the internal MSP controller
directly.

## Endpoint and Postman ledger

Collection: `postman/shopee-rimu-fe.postman_collection.json`.

Endpoint changes for the current collection PR:

- Added: none
- Modified: none
- Deleted: none

The Vite app exposes no backend API of its own. The collection documents the
frontend entrypoint plus the outbound requests declared in `src/services/`.
Keep this ledger and the collection synchronized for every future request or
route addition, modification, or deletion. The legacy NPG request remains in
the collection as a known frontend/backend integration gap because no matching
route is registered in the backend at the pinned workspace commit.

Current integration groups:

- `GET /` — frontend entrypoint
- Auth: login, register, self, logout
- Shops/logistics: list/update shops, read/replace logistics config, sync channels
- Products/HPP: product listing, HPP upsert, HPP CSV preview/apply
- Legacy NPG: `POST /api/excel/npg/upload` declared by the frontend but currently unregistered in `rimu-be-go`
