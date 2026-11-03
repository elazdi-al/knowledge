"""Write Arc's chatgpt.com and openai.com cookies as an agent-browser state file."""
import hashlib, json, os, sqlite3, subprocess, sys
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

DB = os.path.expanduser("~/Library/Application Support/Arc/User Data/Default/Cookies")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.agent-browser/chatgpt-state.json")
SAMESITE = {0: "None", 1: "Lax", 2: "Strict"}

password = subprocess.run(
    ["security", "find-generic-password", "-w", "-s", "Arc Safe Storage"],
    capture_output=True, text=True, check=True,
).stdout.strip().encode()
key = hashlib.pbkdf2_hmac("sha1", password, b"saltysalt", 1003, 16)

db = sqlite3.connect(f"file:{DB}?mode=ro&immutable=1", uri=True)
version = int(db.execute("select value from meta where key='version'").fetchone()[0])
rows = db.execute(
    "select host_key, name, path, expires_utc, is_secure, is_httponly, samesite, encrypted_value "
    "from cookies where host_key like '%chatgpt.com' or host_key like '%openai.com'"
).fetchall()


def decrypt(blob):
    decryptor = Cipher(algorithms.AES(key), modes.CBC(b" " * 16)).decryptor()
    plain = decryptor.update(blob[3:]) + decryptor.finalize()
    plain = plain[: -plain[-1]]
    return plain[32:] if version >= 24 else plain


cookies = []
for host, name, path, expires, secure, httponly, samesite, blob in rows:
    if not blob.startswith(b"v10"):
        continue
    cookies.append({
        "name": name,
        "value": decrypt(blob).decode(),
        "domain": host,
        "path": path,
        "expires": expires / 1e6 - 11644473600 if expires else -1,
        "httpOnly": bool(httponly),
        "secure": bool(secure),
        "sameSite": SAMESITE.get(samesite, "Lax"),
    })

if not any(c["name"].startswith("__Secure-next-auth.session-token") for c in cookies):
    sys.exit("No ChatGPT session cookie in Arc. Log in to chatgpt.com in Arc first.")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
fd = os.open(OUT, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as f:
    json.dump({"cookies": cookies, "origins": []}, f)
print(f"{len(cookies)} cookies -> {OUT}")
