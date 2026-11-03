#!/usr/bin/env bash
# ChatGPT in a headless agent-browser session, logged in with Arc's cookies.
#   chatgpt.sh start                       log in and open a new chat
#   chatgpt.sh new                         open a new chat
#   chatgpt.sh send <prompt-file> [img...] send a message, print the reply's markdown
#   chatgpt.sh reply                       print the last reply's markdown
#   chatgpt.sh url                         print the conversation URL
#   chatgpt.sh stop                        close the browser
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
state="$HOME/.agent-browser/chatgpt-state.json"
plist=/Applications/Arc.app/Contents/Frameworks/ArcCore.framework/Resources/Info.plist

ab() { agent-browser --session chatgpt "$@"; }
js() { ab --json eval "$1" | jq -r '.data.result'; }

conversation_js='(async () => {
  const id = location.pathname.split("/c/")[1];
  if (!id) return JSON.stringify({ users: 0, done: false });
  const { accessToken } = await (await fetch("/api/auth/session")).json();
  const res = await fetch("/backend-api/conversation/" + id, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) return JSON.stringify({ users: 0, done: false });
  const c = await res.json();
  const path = [];
  for (let n = c.mapping[c.current_node]; n; n = c.mapping[n.parent]) if (n.message) path.unshift(n.message);
  const last = path[path.length - 1];
  const done = last.author.role === "assistant" && last.content.content_type === "text"
    && last.status === "finished_successfully" && last.end_turn !== false;
  return JSON.stringify({ users: path.filter((m) => m.author.role === "user").length, done, text: done ? last.content.parts.join("") : null });
})()'

wait_until() {
  local deadline=$((SECONDS + $1))
  until [ "$(js "$2")" = true ]; do
    [ $SECONDS -lt $deadline ] || { echo "timed out waiting for: $2" >&2; return 1; }
    sleep 2
  done
}

new() {
  ab open https://chatgpt.com/ >/dev/null
  wait_until 30 'document.title !== "Just a moment..." && !!document.querySelector(".ProseMirror")'
}

start() {
  python3 "$here/arc-cookies.py" "$state" >&2
  local major
  major=$(defaults read "$plist" CFBundleShortVersionString | cut -d. -f1)
  ab close >/dev/null 2>&1 || true
  ab --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/$major.0.0.0 Safari/537.36" \
    --args "--disable-blink-features=AutomationControlled" open about:blank >/dev/null
  ab state load "$state" >/dev/null
  new
  [ "$(js 'fetch("/api/auth/session").then((r) => r.json()).then((s) => String(!!s.user))')" = true ] ||
    { echo "Not logged in. Log in to chatgpt.com in Arc's Default profile, then rerun start." >&2; exit 1; }
  echo "ChatGPT ready" >&2
}

send() {
  local prompt=$1
  shift
  local before
  before=$(js "$conversation_js" | jq .users)
  [ $# -eq 0 ] || ab upload 'input[type=file]:not([accept])' "$@" >/dev/null
  ab click .ProseMirror >/dev/null
  ab keyboard inserttext "$(cat "$prompt")" >/dev/null
  wait_until 180 '(() => {
    const ready = !document.querySelector("form .animate-spin, form [role=progressbar], form [aria-busy=true]");
    if (ready) document.querySelector("button[aria-label=Send]:not(:disabled)")?.click();
    return !document.querySelector(".ProseMirror").innerText.trim();
  })()'
  local deadline=$((SECONDS + ${CHATGPT_TIMEOUT:-900})) status
  while :; do
    sleep 5
    status=$(js "$conversation_js") || continue
    if [ "$(jq -r --argjson b "$before" '.done and .users > $b' <<<"$status")" = true ]; then
      jq -r .text <<<"$status"
      return
    fi
    [ $SECONDS -lt $deadline ] || { echo "Still generating. Run: chatgpt.sh reply" >&2; exit 1; }
  done
}

reply() {
  local status
  status=$(js "$conversation_js")
  [ "$(jq -r .done <<<"$status")" = true ] || { echo "No finished reply yet." >&2; exit 1; }
  jq -r .text <<<"$status"
}

case "${1:-}" in
  start) start ;;
  new) new ;;
  send) shift; send "$@" ;;
  reply) reply ;;
  url) ab get url ;;
  stop) ab close ;;
  *) sed -n '2,8p' "$0" >&2; exit 2 ;;
esac
