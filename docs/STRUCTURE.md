# SodeClick V2 Structure

## Root
- `server.js` — bootstrap entrypoint (load `src/server.js`)
- `package.json` — scripts + metadata
- `.gitignore` — ignore temporary/local files

## Source Code
- `src/server.js` — main HTTP server, routes, auth, view renderers

## Config
- `config/.env.example` — environment template

## Docs
- `docs/STRUCTURE.md` — current project map

## Notes for future edits
- Keep route handlers grouped by feature (`/login`, `/app`, `/admin/*`)
- Keep render functions grouped (`renderUser*`, `renderAdmin*`)
- Keep utility functions near the top (`parseBody`, `cookies`, auth helpers)

