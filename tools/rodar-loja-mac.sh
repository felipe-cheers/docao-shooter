#!/usr/bin/env bash
# Testa o ATELIÊ (personalizador + loja) LOCAL no Mac. Nada vai pra Cloudflare: D1 simulado em server/.wrangler/state.
# Uso: ./tools/rodar-loja-mac.sh      (Ctrl+C para parar tudo)   ·   Portas: SITE_PORT (8135) e WORKER_PORT (8795)
# Para ganhar Torresmos de teste sem jogar horas:  ./tools/dar-torresmos-mac.sh SeuApelido 500   (só no banco LOCAL)
set -e
cd "$(dirname "$0")/.."
SITE_PORT="${SITE_PORT:-8135}"; WORKER_PORT="${WORKER_PORT:-8795}"
for p in "$SITE_PORT" "$WORKER_PORT"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "Porta $p ocupada. Rode assim: SITE_PORT=8140 WORKER_PORT=8800 $0"; exit 1; fi
done
cd server
[ -d node_modules/wrangler ] || npm install --no-audit --no-fund
npx wrangler d1 migrations apply docao-contas --local   # aplica 0001 (contas) e 0002 (loja) no banco LOCAL
npx wrangler dev --port "$WORKER_PORT" > ../wrangler-loja.log 2>&1 &
WR=$!
cd ..
python3 -m http.server "$SITE_PORT" > http-loja.log 2>&1 &
HP=$!
trap 'kill $WR $HP 2>/dev/null' EXIT INT TERM
sleep 6
URL="http://localhost:$SITE_PORT/?server=ws://localhost:$WORKER_PORT"
echo; echo "Abrindo: $URL"; echo "1) Crie uma conta  2) ATELIÊ no menu  3) dê Torresmos de teste com tools/dar-torresmos-mac.sh"
open "$URL" 2>/dev/null || true
wait
