#!/bin/bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-architect-role: federation_admin" \
  http://localhost:4000/api/v2/enterprise \
  -d '{"name":"QubitDev Technologies","domain":"qubitdev.com","contactEmail":"admin@qubitdev.com","industry":"technology","compliancePack":"soc2","tier":"enterprise"}'
echo ""
echo "---"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-architect-role: federation_admin" \
  http://localhost:4000/api/v2/enterprise \
  -d '{"name":"Carpha Commerce","domain":"carphacom.com","contactEmail":"admin@carphacom.com","industry":"ecommerce","compliancePack":"general","tier":"professional"}'
echo ""
