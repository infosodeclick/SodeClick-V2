# auth module (phase-in)

Scope:
- register
- verify (email/otp)
- login/logout
- forgot-password
- google oauth placeholder

Current state:
- logic still in `server.js`
- this module folder is the migration target

Next step:
1. Move render/auth pages here
2. Move POST handlers here
3. Export route handlers and wire in `server.js`
