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
- `db/002_fullscale_extensions.sql` — full-scale extension schema
- `db/seed_from_json.sql` — auto-generated SQL seed from current JSON data
- `docs/DATABASE_TABLES.md` — full table map (MVP + full scale)
- `docs/JSON_TO_SQL_MAPPING.md` — mapping/steps for JSON -> SQL migration

## Scripts
- `scripts/migrate-json-to-sql.js` — export JSON runtime data to SQL seed

## Notes
- UI/logic currently runs from `server.js`
- Next.js legacy folders (if any) should be removed from tracked files
- `.next/` and `node_modules/` are ignored via `.gitignore`
