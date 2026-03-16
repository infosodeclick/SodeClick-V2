# SodeClick V2 — Release Notes (v1)

## ✅ Delivered Modules
1. User Registration + OTP Verify (demo OTP flow)
2. User Profile (view/edit/save)
3. Match System (Like/Pass/Super Like)
4. Chat after match (text + emoji)
5. Coin System (balance + ledger)
6. Gift System in chat (coin deduction)
7. Shop (profile frame purchase/use)
8. Membership/VIP package subscribe
9. Earnings center (daily checkin/invite simulation)
10. Admin dashboard pages for Revenue/Activities/Promotions
11. Safety baseline (Report/Block)
12. Persistence to local state file (`data/app-state.json`)

## ✅ Production-like Guards
- Action cooldown to reduce double-submit issues
- Free user chat-start limit: 10/day
- VIP unlock via membership package
- Role-based admin access (admin/manager/staff)

## ⚠️ Known MVP Constraints
- OTP is demo (shown on verify page), not email/SMS provider yet
- In-memory/session-cookie auth (no JWT/refresh tokens yet)
- Single-node local JSON persistence (not multi-instance DB yet)
- No real payment gateway yet (Omise/Stripe/PromptPay pending)

## 🔜 Next Upgrade (recommended)
- PostgreSQL migration + transactional coin ledger
- Real OTP provider + password hash/forgot-password
- WebSocket realtime chat
- Payment gateway integration
- Admin moderation queue enhancements
