# SodeClick V2 – Project Structure

## Runtime (current)
- `server.js` — Main Node.js HTTP app (modules 1-10)
- `package.json` — start script and dependencies

## Data (JSON runtime store)
- `data/users.json`
- `data/pending.json`
- `data/likes.json`
- `data/matches.json`
- `data/messages.json`
- `data/blocks.json`
- `data/reports.json`
- `data/gift-transactions.json`
- `data/coin-transactions.json`
- `data/frame-transactions.json`
- `data/board-posts.json`

## Database Design (target SQL)
- `db/001_mvp_schema.sql` — MVP relational schema
- `docs/DATABASE_TABLES.md` — full table map (MVP + full scale)

## Notes
- UI/logic currently runs from `server.js`
- Next.js legacy folders (if any) should be removed from tracked files
- `.next/` and `node_modules/` are ignored via `.gitignore`
