# JSON Runtime → SQL Mapping Plan

## Current JSON Files
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

## Target SQL Mapping
- `users.json` → `users`, `user_profiles`, `user_wallets`, `user_active_profile_frame`
- `pending.json` → `email_verifications` / `phone_verifications` / temp auth table
- `likes.json` → `user_likes`
- `matches.json` → `matches`, `chat_rooms`
- `messages.json` → `chat_messages`, `chat_message_reads`
- `blocks.json` → `user_blocks`
- `reports.json` → `user_reports` or `content_reports`
- `gift-transactions.json` → `gift_transactions`
- `coin-transactions.json` → `wallet_transactions`
- `frame-transactions.json` → `profile_frame_purchase_logs`, `user_profile_frame_inventory`
- `board-posts.json` → `board_topics`, `board_comments`, `board_topic_likes`

## Migration Steps (safe)
1. Create SQL tables (001 + 002)
2. Build importer script `scripts/migrate-json-to-sql.js`
3. Run in staging DB first
4. Verify row counts + relation integrity
5. Switch runtime writes from JSON -> SQL repository layer
6. Keep JSON in read-only fallback for rollback window

## Integrity Checks
- unique email/username
- unique frame inventory (`user_id`, `frame_id`)
- unique match pair (normalized pair)
- wallet transaction balance consistency
- foreign keys for user/message/match/thread
