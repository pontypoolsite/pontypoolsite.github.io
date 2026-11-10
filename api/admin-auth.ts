import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_LIFETIME_SECONDS = 30 * 60;

function secret(name: string, minimumLength = 32): string {
  const value = process.env[name];
  if (!value || value.length < minimumLength) {
    throw new Error(`${name} must be configured with at least ${minimumLength} characters.`);
  }
  return value;
}

function sign(value: string): Buffer {
  return createHmac("sha256", secret("ADMIN_TOKEN_SECRET"))
    .update(value)
    .digest();
}

function equalText(left: string, right: string): boolean {
  const leftDigest = createHmac("sha256", "pontypool-admin-compare").update(left).digest();
  const rightDigest = createHmac("sha256", "pontypool-admin-compare").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_PASSWORD
      && process.env.ADMIN_PASSWORD.length >= 12
      && process.env.ADMIN_TOKEN_SECRET
      && process.env.ADMIN_TOKEN_SECRET.length >= 32,
  );
}

export function createAdminToken(username: string, password: string): string | null {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = secret("ADMIN_PASSWORD", 12);
  if (!equalText(username, expectedUsername) || !equalText(password, expectedPassword)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: "admin",
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
  })).toString("base64url");
  const body = `${header}.${payload}`;
  return `${body}.${sign(body).toString("base64url")}`;
}

export function isAdminToken(token: string | null): boolean {
  if (!token) return false;

  try {
    const [header, payload, signature, extra] = token.split(".");
    if (!header || !payload || !signature || extra) return false;

    const body = `${header}.${payload}`;
    const actual = Buffer.from(signature, "base64url");
    const expected = sign(body);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
    };
    return claims.sub === "admin"
      && typeof claims.exp === "number"
      && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
