# Admin Backoffice Blueprint (Based on Current Data + DB Plan)

เอกสารนี้ออกแบบระบบหลังบ้านโดยอ้างอิงฟีเจอร์ในเว็บและโครงข้อมูลที่มีอยู่ตอนนี้

## 1) Access & Roles
- Admin login: `/admin/login`
- Admin session cookie: `aid`
- Source admin users: `data/admin-users.json` (sync จาก `users.json`)
- Roles ที่แนะนำ: `super_admin`, `admin`, `moderator`, `support`, `finance`

## 2) Dashboard (มีแล้ว/ควรเสริม)
### มีแล้ว
- จำนวนสมาชิก, VIP, ธุรกรรมเหรียญ, รายงาน, กระทู้

### ควรเสริม
- สมาชิกใหม่รายวัน/สัปดาห์
- อัตรา Match/ข้อความต่อวัน
- รายการรายงานค้างจัดการ
- ระบบเตือนพฤติกรรมเสี่ยง (spam/report surge)

## 3) Member Management
อิงข้อมูล: `users.json`, `member-users.json`
- ค้นหา/กรองสมาชิก
- ดูโปรไฟล์เต็ม + สถานะยืนยันตัวตน
- เปลี่ยนสถานะบัญชี (active/suspended/banned)
- reset password (admin action + audit)

## 4) VIP / Wallet / Store
อิงข้อมูล: `coin-transactions.json`, `frame-transactions.json`
- ดูและปรับ VIP status / expiry
- ดูประวัติเติมเหรียญ/หักเหรียญ
- อนุมัติ/ยกเลิกรายการธุรกรรมผิดปกติ
- ตรวจ inventory กรอบรูปและ active frame

## 5) Match / Chat Moderation
อิงข้อมูล: `matches.json`, `messages.json`, `gift-transactions.json`, `blocks.json`
- ดูสถิติการแมตช์และห้องแชท
- ตรวจข้อความที่ถูกรายงาน
- block/unblock ระดับระบบ
- action log ทุกการแทรกแซง

## 6) Webboard Moderation
อิงข้อมูล: `board-posts.json`, `reports.json`
- รีวิวรายงานโพสต์/คอมเมนต์
- ลบ/ซ่อน/ปักหมุดกระทู้
- ตรวจเนื้อหาผิดนโยบาย (keyword + manual)

## 7) Security Center
- review selfie verification
- privacy policy and consent settings
- admin login logs, suspicious IP/user-agent alerts

## 8) Audit & Compliance (ควรเพิ่ม)
- admin activity logs (ใครทำอะไร เมื่อไหร่)
- immutable audit trail สำหรับ action สำคัญ
- export report (CSV/JSON)

## 9) Mapping to SQL (จาก schema ปัจจุบัน)
- users/admin/member -> `users`, `roles`, `user_profiles`
- wallet/vip -> `user_wallets`, `wallet_transactions`, `vip_subscriptions`
- board -> `board_topics`, `board_comments`, `content_reports`
- moderation -> `user_reports`, `user_blocks`, `moderation_logs`

## 10) Suggested rollout
1. Login/Role hardening + audit log
2. Member moderation actions
3. Webboard moderation queue
4. Wallet/VIP finance review panel
5. Dashboard analytics + alerts
