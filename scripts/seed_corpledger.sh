#!/bin/bash
# CorpLedger entries for hackathon sponsors — uses x-enterprise-key header
API="http://localhost:4000/api/v2"
CT="Content-Type: application/json"

VEEA_KEY="ark_d908ce76a1174dbab05ddac711795160"
DM_KEY="ark_a46905c425e04171ac2b41906115e3f1"
LL_KEY="ark_9e123cf6980d46698721e9cdf987e979"

echo "=== CorpLedger: Veea Inc. ==="
curl -s -X POST "$API/enterprise/veea-inc/corpledger" \
  -H "x-enterprise-key: $VEEA_KEY" -H "$CT" \
  -d '{
    "department": "Executive",
    "counterparty": "SEC/NASDAQ",
    "amount": 15000000,
    "currency": "USD",
    "category": "revenue",
    "purpose": "FY2024 estimated annual revenue - NASDAQ: VEEA - AI edge infrastructure platform, VeeaONE, SecureConnect, TerraFabric products"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

curl -s -X POST "$API/enterprise/veea-inc/corpledger" \
  -H "x-enterprise-key: $VEEA_KEY" -H "$CT" \
  -d '{
    "department": "R&D",
    "counterparty": "USPTO",
    "amount": 25000000,
    "currency": "USD",
    "category": "investment",
    "purpose": "Cumulative R&D investment - 117 patents across 26 patent families covering edge computing, AI orchestration, network security technologies"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

echo ""
echo "=== CorpLedger: Google DeepMind ==="
curl -s -X POST "$API/enterprise/google-deepmind/corpledger" \
  -H "x-enterprise-key: $DM_KEY" -H "$CT" \
  -d '{
    "department": "Finance",
    "counterparty": "Alphabet Inc.",
    "amount": 1700000000,
    "currency": "USD",
    "category": "revenue",
    "purpose": "FY2024 revenue GBP 1.33B (~USD 1.7B) - Gemini, AlphaFold, AI research services to Alphabet. Source: Companies House UK filing Oct 2025"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

curl -s -X POST "$API/enterprise/google-deepmind/corpledger" \
  -H "x-enterprise-key: $DM_KEY" -H "$CT" \
  -d '{
    "department": "Finance",
    "counterparty": "Companies House UK",
    "amount": 222000000,
    "currency": "USD",
    "category": "profit",
    "purpose": "FY2024 net income GBP 174M (~USD 222M). Operating income GBP 217M (~USD 277M). First significant profit after years of R&D losses. Source: Companies House UK"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

curl -s -X POST "$API/enterprise/google-deepmind/corpledger" \
  -H "x-enterprise-key: $DM_KEY" -H "$CT" \
  -d '{
    "department": "Corporate",
    "counterparty": "Google/Alphabet",
    "amount": 650000000,
    "currency": "USD",
    "category": "acquisition",
    "purpose": "Google acquisition of DeepMind Technologies (January 2014). Reported price range USD 400-650M. Acquired after Facebook ended negotiations in 2013."
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

echo ""
echo "=== CorpLedger: LabLab.ai ==="
curl -s -X POST "$API/enterprise/lablab-ai/corpledger" \
  -H "x-enterprise-key: $LL_KEY" -H "$CT" \
  -d '{
    "department": "Operations",
    "counterparty": "Hackathon Sponsors",
    "amount": 5000000,
    "currency": "USD",
    "category": "revenue",
    "purpose": "FY2025 estimated revenue from hackathon sponsorships (AMD, IBM, Google, Veea, Arc, Circle), Surge accelerator fees, and NativelyAI platform"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

curl -s -X POST "$API/enterprise/lablab-ai/corpledger" \
  -H "x-enterprise-key: $LL_KEY" -H "$CT" \
  -d '{
    "department": "Community",
    "counterparty": "Hackathon Participants",
    "amount": 193500,
    "currency": "USD",
    "category": "grants",
    "purpose": "2026 YTD hackathon prize pools distributed - AMD Developer $21500, AI Trading Agents $55000, AI Agent Olympics $32000, Rise of AI Agents $60000, IBM Bob $10000, Agentic Economy on Arc $15000"
  }' | python3 -m json.tool 2>/dev/null || echo "FAILED"

echo ""
echo "=== Done ==="
