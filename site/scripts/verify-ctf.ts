import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

// End-to-end check of the CTF gate against a running Worker (`bun run preview`
// or production), plus a scan of out/ for private slugs in public files.
//
//   CTF_PASSWORD=… bun scripts/verify-ctf.ts [base-url]   (from site/)
//
// Needs at least one note in ../notes/ctf. The rate-limit probe runs last
// because it locks this IP out of unlocking for a minute.

const base = new URL(process.argv[2] ?? "http://localhost:8787");
const password = process.env.CTF_PASSWORD;
if (!password) throw new Error("set CTF_PASSWORD");

let failures = 0;
function check(ok: boolean, what: string) {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures++;
}

interface Res {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** Raw request: the path goes on the wire verbatim (no URL normalisation), redirects are not followed. */
function request(rawPath: string, init: { method?: string; cookie?: string; body?: string } = {}): Promise<Res> {
  const client = base.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        host: base.hostname,
        port: base.port || undefined,
        path: rawPath,
        method: init.method ?? "GET",
        headers: {
          ...(init.cookie && { cookie: init.cookie }),
          ...(init.body !== undefined && { "content-type": "application/json" }),
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    req.end(init.body);
  });
}

const unlock = (pw: unknown) => request("/api/ctf", { method: "POST", body: JSON.stringify({ password: pw }) });

check((await request("/api/ctf")).status === 401, "GET /api/ctf without a session is 401");
check((await request("/ctf-index.json")).status === 404, "/ctf-index.json is hidden");
check((await unlock("definitely wrong")).status === 401, "wrong password is 401");
check((await request("/api/ctf", { method: "POST", body: "{" })).status === 400, "malformed body is 400");

const ok = await unlock(password);
check(ok.status === 200, "right password is 200");
const setCookie = [ok.headers["set-cookie"] ?? []].flat().find((c) => c.startsWith("ctf="));
check(!!setCookie && /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Lax/i.test(setCookie), "session cookie is HttpOnly, Secure, SameSite=Lax");
const cookie = setCookie?.split(";")[0] ?? "";
const notes: { slug: string; label: string }[] = JSON.parse(ok.body).notes ?? [];
check(notes.length > 0, `unlock returns the note list (${notes.length})`);
check((await request("/api/ctf", { cookie })).status === 200, "GET /api/ctf with the session is 200");

const slug = notes[0]?.slug;
if (slug) {
  const rest = slug.slice("ctf/".length);
  const gated = [
    `/notes/${slug}`,
    `/notes/${slug}.html`,
    `/notes/${slug}.txt`,
    `/notes/${slug}/`,
    `/notes/${slug}/__next._full.txt`,
    `/notes/%63tf/${rest}`,
    `/notes/%63%74%66/${rest}.html`,
    `/notes/ct%66/${rest}.txt`,
    `/notes//ctf/${rest}`,
    `/notes/./ctf/${rest}`,
    `/notes/x/../ctf/${rest}`,
    `/notes/CTF/${rest}`,
    `/%6eotes/ctf/${rest}`,
  ];
  for (const p of gated) {
    const r = await request(p);
    check(r.status !== 200 && !r.body.includes(rest), `no session: ${p} is ${r.status}, content withheld`);
  }
  for (const forged of ["ctf=9999999999.AAAA", "ctf=1.AAAA", "ctf=", `ctf=${Number(cookie.split("=")[1]?.split(".")[0]) + 1}.${cookie.split(".")[1]}`]) {
    const r = await request(`/notes/${slug}`, { cookie: forged });
    check(r.status === 302, `forged cookie ${forged.slice(0, 24)}… is redirected`);
  }
  const page = await request(`/notes/${slug}`, { cookie });
  check(page.status === 200 || page.status === 307 || page.status === 308, `with session: /notes/${slug} is ${page.status}`);
  check(/private/.test(String(page.headers["cache-control"])), "gated page is cache-control private");
  check((await request(`/notes/${slug}.txt`, { cookie })).status === 200, "with session: RSC payload is 200");
  const label = notes[0].label.split(/\s+/)[0];
  const search = await request(`/api/search?q=${encodeURIComponent(label)}`);
  check(!search.body.includes('"ctf/'), `search for "${label}" returns no CTF hits`);
}

for (const p of ["/", "/index.txt", "/__next.__PAGE__.txt", "/__next._full.txt"]) {
  const r = await request(p);
  check(!/notes\/ctf\/|"ctf\//.test(r.body), `${p} names no CTF note`);
}

const out = path.resolve(process.cwd(), "out");
const leaks: string[] = [];
(function scan(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(out, full);
    if (rel === path.join("notes", "ctf") || rel === "ctf-index.json" || rel === "search-index.json") continue;
    if (e.isDirectory()) scan(full);
    else if (/notes\/ctf\/|"ctf\//.test(readFileSync(full, "utf8"))) leaks.push(rel);
  }
})(out);
check(leaks.length === 0, `no public file in out/ names a CTF note${leaks.length ? `: ${leaks.join(", ")}` : ""}`);
const index = readFileSync(path.join(out, "search-index.json"), "utf8");
check(!index.includes('"ctf/'), "search index has no CTF note");

let limited = false;
for (let i = 0; i < 8 && !limited; i++) limited = (await unlock(`wrong ${i}`)).status === 429;
check(limited, "repeated wrong passwords hit the rate limit");

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("all CTF gate checks passed");
