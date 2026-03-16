# Modules (Planned Refactor)

โครงนี้ใช้สำหรับแยก `server.js` ออกเป็นโมดูลย่อยให้อ่านง่าย/แก้ง่าย

## โครงที่แนะนำ
- `modules/auth/` — register/login/verify/forgot/google placeholder
- `modules/profile/` — profile view/edit/photos/interests/goals/privacy
- `modules/match/` — search/filter/like/super-like/pass/match/boost
- `modules/chat/` — rooms/messages/read-status/attachments/gift/block/report
- `modules/wallet/` — wallet/topup/packages/transactions
- `modules/vip/` — vip plans/subscriptions/features
- `modules/shop/` — frames/store/inventory/active frame
- `modules/board/` — categories/topics/comments/likes/reports/pin/search
- `modules/security/` — moderation/spam/selfie/privacy/reports/blocks
- `modules/admin/` — dashboard + management pages

## Refactor Strategy (Safe)
1. แยก utility ก่อน (cookies, parseForm, json-store)
2. ย้าย route ทีละโมดูลโดยคง behavior เดิม
3. ทำ regression check ทุกครั้งก่อน push
4. ปิดท้ายด้วย middleware/permission guard รวม
