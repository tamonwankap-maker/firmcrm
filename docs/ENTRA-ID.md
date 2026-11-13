# Adding Microsoft 365 (Entra ID) sign-in

The app was built so this is a small, contained change. Users keep their roles; only *how* they sign in changes.

## 1. Azure (your Microsoft 365 administrator)

1. Entra admin centre → **App registrations → New registration**: name "BD CRM", *Accounts in this organisational directory only*.
2. Redirect URI (Web): `https://crm.yourfirm.co.th/api/auth/callback/microsoft-entra-id`
3. **Certificates & secrets → New client secret** — note the value and its expiry date.
4. Note the **Application (client) ID** and **Directory (tenant) ID**.
5. Optional: **Enterprise applications → BD CRM → Properties → Assignment required = Yes**, then assign only the BD team, partners and associates who should use the CRM.

## 2. Configuration

Add to `.env`:

```
AUTH_MICROSOFT_ENTRA_ID_ID=<application client id>
AUTH_MICROSOFT_ENTRA_ID_SECRET=<client secret>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/<tenant id>/v2.0
```

## 3. Code change (developer, ~1 hour + testing)

In `src/server/auth/config.ts`:

```ts
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

providers: [
  MicrosoftEntraID({
    clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  }),
  Credentials({ /* keep for break-glass admin access, or remove */ }),
],
callbacks: {
  // Only people who already exist as active users with "Can sign in" may enter.
  async signIn({ account, profile }) {
    if (account?.provider !== "microsoft-entra-id") return true;
    const email = String(profile?.email ?? profile?.preferred_username ?? "").toLowerCase();
    const user = await db.user.findUnique({ where: { email } });
    return !!user && user.active && user.canLogin;
  },
  async jwt({ token, user, account, profile }) {
    if (account?.provider === "microsoft-entra-id") {
      const email = String(profile?.email ?? profile?.preferred_username ?? "").toLowerCase();
      const u = await db.user.findUniqueOrThrow({ where: { email } });
      token.uid = u.id;
      token.sv = u.sessionVersion;
    } else if (user?.id) {
      token.uid = user.id;
      token.sv = user.sessionVersion ?? 0;
    }
    return token;
  },
  // session callback unchanged
},
```

Then: add a "Sign in with Microsoft" button on `/login` (`signIn("microsoft-entra-id")`), audit the sign-in like the password flow, and extend the e2e tests.

What stays the same: roles, confidentiality, deactivation (still immediate via `sessionVersion`), audit log. Users are still created in **Admin › Users** — Microsoft only proves who they are.

## 4. Recommended rollout

1. Enable Microsoft sign-in alongside passwords for a week.
2. Then remove passwords for everyone except one break-glass admin account (kept in the firm safe).
