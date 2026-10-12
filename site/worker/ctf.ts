import { PRIVATE_COURSE } from "../src/lib/private-course";
import { error } from "./http";
import type { Env } from "./index";

/**
 * The password gate for the private course (src/lib/private-course.ts):
 *
 *   GET  /api/ctf        the private index for a session, else 401
 *   POST /api/ctf        { password } → the index plus a session cookie,
 *                        rate limited per IP
 *   /notes/ctf/*         the static pages for a session, else back to /#ctf
 *
 * A session is `ctf=<exp>.<sig>`: an expiry in unix seconds and its HMAC
 * keyed with CTF_PASSWORD itself, so changing the secret revokes every
 * session. Without the secret nothing is ever authorized.
 */

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION = /(?:^|;\s*)ctf=(\d{1,12})\.([\w-]{43})(?:;|$)/;
const enc = new TextEncoder();

let memo: { password: string; key: Promise<CryptoKey> } | undefined;

function hmacKey(password: string): Promise<CryptoKey> {
  if (memo?.password === password) return memo.key;
  const key = crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  memo = { password, key };
  return key;
}

const sessionData = (exp: string | number) => enc.encode(`session:${exp}`);

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function hasSession(request: Request, password: string | undefined): Promise<boolean> {
  const match = request.headers.get("cookie")?.match(SESSION);
  if (!password || !match || Number(match[1]) <= Date.now() / 1000) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(password), fromBase64url(match[2]), sessionData(match[1]));
}

async function sessionCookie(password: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(password), sessionData(exp));
  return `ctf=${exp}.${base64url(sig)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

/** Constant time: verifies the input's MAC against the password itself. */
async function passwordMatches(input: string, password: string): Promise<boolean> {
  const key = await hmacKey(password);
  return crypto.subtle.verify("HMAC", key, await crypto.subtle.sign("HMAC", key, enc.encode(input)), enc.encode(password));
}

function privately(asset: Response): Response {
  const res = new Response(asset.body, asset);
  res.headers.set("cache-control", "private, no-store");
  return res;
}

async function privateIndex(env: Env, origin: string, cookie?: string): Promise<Response> {
  const asset = await env.ASSETS.fetch(new URL("/ctf-index.json", origin));
  if (!asset.ok) return error(503, "unavailable");
  const res = privately(asset);
  if (cookie) res.headers.set("set-cookie", cookie);
  return res;
}

export async function handleCtfApi(request: Request, env: Env, origin: string): Promise<Response> {
  const password = env.CTF_PASSWORD;

  if (request.method === "GET") {
    return (await hasSession(request, password)) ? privateIndex(env, origin) : error(401, "unauthorized");
  }
  if (request.method !== "POST") {
    return error(405, "method_not_allowed", { allow: "GET, POST" });
  }

  if (env.CTF_UNLOCK_LIMIT) {
    const ip = request.headers.get("cf-connecting-ip") ?? "anonymous";
    const { success } = await env.CTF_UNLOCK_LIMIT.limit({ key: ip });
    if (!success) return error(429, "rate_limited", { "retry-after": "60" });
  }
  if (!password) return error(503, "unavailable");

  const input: unknown = (await request.json().catch(() => null))?.password;
  if (typeof input !== "string") return error(400, "bad_request");
  if (!(await passwordMatches(input, password))) return error(401, "wrong_password");

  return privateIndex(env, origin, await sessionCookie(password));
}

export async function gateNote(request: Request, env: Env): Promise<Response> {
  if (!(await hasSession(request, env.CTF_PASSWORD))) {
    return new Response(null, {
      status: 302,
      headers: { location: `/#${PRIVATE_COURSE}`, "cache-control": "no-store" },
    });
  }
  return privately(await env.ASSETS.fetch(request));
}
