# Go-Live Checklist (SodeClick V2)

## Security
- [ ] Move secrets to env only
- [ ] Hash passwords (bcrypt/argon2)
- [ ] Enable CSRF protection
- [ ] Add rate-limit on login/register/otp

## Data
- [ ] Migrate JSON state to PostgreSQL
- [ ] Backup/restore strategy verified
- [ ] Add migration/versioning scripts

## Auth
- [ ] Replace demo OTP with real provider
- [ ] Add forgot-password flow
- [ ] Session hardening + expiry rules

## Payments
- [ ] Connect payment gateway (PromptPay/Omise/Stripe)
- [ ] Webhook verification
- [ ] Reconcile payments -> transactions

## App Quality
- [ ] Full e2e tests on register->match->chat->gift->shop
- [ ] Mobile UI pass
- [ ] Thai text QA pass

## Operations
- [ ] Error logging/alerting
- [ ] Admin moderation runbook
- [ ] Terms/Privacy pages
