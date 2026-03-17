# User Storage Structure

ระบบจัดเก็บผู้ใช้ถูกปรับให้เป็นระเบียบมากขึ้น โดยยังคง backward-compatible

## Source of truth
- `data/users.json`

## Split storage (auto-generated/synced)
- `data/admin-users.json` — ผู้ใช้ role `admin`
- `data/member-users.json` — ผู้ใช้ทั่วไป role `member`

> ทุกครั้งที่ระบบเขียน `users.json` จะ sync 2 ไฟล์แยกให้อัตโนมัติ

## Signup flow
- สมาชิกใหม่ที่สมัครผ่าน `/register` + `/verify` จะถูกบันทึก role เป็น `member`
- ระบบ seed บัญชีพื้นฐานอัตโนมัติ:
  - `admin / 123456` (role: admin)
  - `user / 123456` (role: member)

## Admin auth
- `/admin/login` ตรวจจาก `data/admin-users.json` ก่อน
- มี fallback demo credential (`admin/123456`) เพื่อกันระบบใช้งานไม่ได้ในช่วงเริ่มต้น
