# SodeClick V2 – Database Tables

เอกสารนี้ยึดตามสเปกที่กำหนด (สมาชิก/โปรไฟล์/แมตช์/แชท/เหรียญ/VIP/ร้านค้า/เว็บบอร์ด/ความปลอดภัย/หลังบ้าน)

## MVP Core (เริ่มใช้งานจริงก่อน)
1. users
2. roles
3. user_profiles
4. user_profile_photos
5. user_interests
6. user_profile_interest_map
7. relationship_goals
8. provinces
9. user_likes
10. matches
11. chat_rooms
12. chat_messages
13. board_categories
14. board_topics
15. board_comments
16. user_wallets
17. wallet_transactions
18. vip_plans
19. vip_subscriptions
20. profile_frames
21. user_profile_frame_inventory
22. user_active_profile_frame
23. payments

## Full Scale (ตามรายการเต็ม)
- users, roles, user_sessions, password_resets, email_verifications, phone_verifications
- user_profiles, user_profile_photos, user_interests, user_profile_interest_map, relationship_goals, provinces
- user_likes, user_passes, matches, profile_boosts, user_search_logs
- chat_rooms, chat_room_members, chat_messages, chat_message_reads, chat_attachments
- gifts, gift_transactions, store_categories, store_items
- profile_frames, user_profile_frame_inventory, user_active_profile_frame, profile_frame_purchase_logs
- user_wallets, wallet_transactions, coin_packages, coin_topups
- vip_plans, vip_subscriptions, vip_features, vip_plan_feature_map
- board_categories, board_topics, board_topic_tags, board_comments, board_topic_likes, board_comment_likes
- notifications
- user_reports, content_reports, report_reasons, user_blocks, moderation_logs
- payments, payment_logs
- admin_login_logs, system_settings, feature_flags

## Key Constraints
- `users.email` UNIQUE
- `users.username` UNIQUE
- `user_profile_frame_inventory` UNIQUE (`user_id`, `frame_id`)  // กันซื้อซ้ำ
- `matches` UNIQUE pair (`user1_id`, `user2_id`) แบบเรียง normalized
- `wallet_transactions` ต้องเก็บ `balance_before`, `balance_after`

## Key Relations (ย่อ)
- users 1:1 user_profiles
- users 1:N user_profile_photos
- users N:N user_interests (via user_profile_interest_map)
- users N:N users (via matches)
- matches 1:1 chat_rooms
- chat_rooms 1:N chat_messages
- users 1:1 user_wallets
- user_wallets 1:N wallet_transactions
- users N:N profile_frames (via user_profile_frame_inventory)
- users 1:1 user_active_profile_frame
- board_categories 1:N board_topics
- board_topics 1:N board_comments
