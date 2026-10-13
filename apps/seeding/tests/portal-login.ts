/**
 * Quick check: can an OrderCloud API client ID + secret authenticate
 * against the Portal's Auth.Login endpoint?
 *
 * Usage:
 *   npx tsx tests/portal-login.ts <clientId> <clientSecret>
 *
 * Pass your API client ID as "username" and client secret as "password".
 * The test prints the result so you can see exactly what the Portal returns.
 */

import { Auth, Configuration } from "@ordercloud/portal-javascript-sdk";

const [, , username, password] = process.argv;

if (!username || !password) {
    console.error("Usage: npx tsx tests/portal-login.ts <username> <password>");
    process.exit(1);
}

Configuration.Set({ baseApiUrl: "https://portal.ordercloud.io/api/v1" });

console.log(`\nAttempting portal login with username="${username}" ...`);

Auth.Login(username, password)
    .then((auth) => {
        console.log("\n✓ Login succeeded.");
        console.log("  access_token :", auth.access_token ? auth.access_token.slice(0, 40) + "…" : "(none)");
        console.log("  refresh_token:", auth.refresh_token ? auth.refresh_token.slice(0, 20) + "…" : "(none)");
    })
    .catch((err) => {
        console.error("\n✗ Login failed.");
        const status = err?.response?.status;
        const body = err?.response?.data;
        if (status) console.error("  HTTP status :", status);
        if (body)   console.error("  Response    :", JSON.stringify(body, null, 2));
        if (!status && !body) console.error("  Error       :", err?.message ?? err);
    });
