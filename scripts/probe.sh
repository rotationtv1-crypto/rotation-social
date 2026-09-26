#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:5000}"
curl -sS "$BASE/api/health"; echo
curl -sS "$BASE/api/llm/health"; echo
curl -sS -X POST "$BASE/api/query" -H "Content-Type: application/json" ${LLM_GATEWAY_KEY:+-H "Authorization: Bearer $LLM_GATEWAY_KEY"} -d '{"prompt":"Rotation first-party health check","preferredProvider":"xai"}'; echo
