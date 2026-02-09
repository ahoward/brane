#!/usr/bin/env bash
#
# 02-impact-analysis.sh — what does my change actually touch?
#
# You're refactoring PaymentService. You know it talks to OrderProcessor.
# But do you know about RefundHandler? ChargebackWebhook? BillingReconciler?
# Grep won't help if you don't know the names.
#

set -e
source "$(dirname "$0")/../lib/common.sh"
setup_workspace

echo "═══════════════════════════════════════════════════════════════"
echo "  IMPACT ANALYSIS: what does my change actually touch?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# initialize
# ─────────────────────────────────────────────────────────────────

brane_q init > /dev/null

# ─────────────────────────────────────────────────────────────────
# a realistic e-commerce backend — 12 services
# ─────────────────────────────────────────────────────────────────

echo "--- building the service graph ---"
echo ""

# Core services
brane_q concept create --name "ApiGateway" --type Service > /dev/null          # 1
brane_q concept create --name "AuthService" --type Service > /dev/null         # 2
brane_q concept create --name "UserService" --type Service > /dev/null         # 3
brane_q concept create --name "ProductCatalog" --type Service > /dev/null      # 4
brane_q concept create --name "PaymentService" --type Service > /dev/null      # 5
brane_q concept create --name "OrderProcessor" --type Service > /dev/null      # 6

# Payment ecosystem
brane_q concept create --name "RefundHandler" --type Service > /dev/null       # 7
brane_q concept create --name "ChargebackWebhook" --type Service > /dev/null   # 8
brane_q concept create --name "BillingReconciler" --type Service > /dev/null   # 9

# Infrastructure
brane_q concept create --name "EventBus" --type Infrastructure > /dev/null     # 10
brane_q concept create --name "AuditLog" --type Infrastructure > /dev/null     # 11
brane_q concept create --name "MetricsCollector" --type Infrastructure > /dev/null # 12

echo "  12 concepts created."
echo ""

# Wire them up
# Gateway layer
brane_q edge create --from ApiGateway --to AuthService --rel DEPENDS_ON > /dev/null
brane_q edge create --from ApiGateway --to UserService --rel DEPENDS_ON > /dev/null
brane_q edge create --from ApiGateway --to ProductCatalog --rel DEPENDS_ON > /dev/null
brane_q edge create --from ApiGateway --to OrderProcessor --rel DEPENDS_ON > /dev/null

# Order flow
brane_q edge create --from OrderProcessor --to PaymentService --rel DEPENDS_ON > /dev/null
brane_q edge create --from OrderProcessor --to ProductCatalog --rel DEPENDS_ON > /dev/null
brane_q edge create --from OrderProcessor --to UserService --rel DEPENDS_ON > /dev/null
brane_q edge create --from OrderProcessor --to EventBus --rel PUBLISHES_TO > /dev/null

# Payment ecosystem — all roads lead through PaymentService
brane_q edge create --from RefundHandler --to PaymentService --rel DEPENDS_ON > /dev/null
brane_q edge create --from ChargebackWebhook --to PaymentService --rel DEPENDS_ON > /dev/null
brane_q edge create --from BillingReconciler --to PaymentService --rel DEPENDS_ON > /dev/null
brane_q edge create --from PaymentService --to AuditLog --rel WRITES_TO > /dev/null
brane_q edge create --from PaymentService --to EventBus --rel PUBLISHES_TO > /dev/null

# Cross-cutting
brane_q edge create --from EventBus --to MetricsCollector --rel FEEDS > /dev/null
brane_q edge create --from AuditLog --to MetricsCollector --rel FEEDS > /dev/null

echo "  15 edges created."
echo ""

# ─────────────────────────────────────────────────────────────────
# THE SCENARIO: you need to refactor PaymentService
# ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  You're refactoring PaymentService."
echo "  What's the blast radius?"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "--- search: what's related to 'payment'? ---"
echo ""

brane search "payment"

echo "--- PaymentService's direct connections ---"
echo ""

brane graph neighbors PaymentService

echo ""
echo "  PaymentService has 6 connections:"
echo "    → OrderProcessor depends on it (breaks checkout)"
echo "    → RefundHandler depends on it (breaks refunds)"
echo "    → ChargebackWebhook depends on it (breaks disputes)"
echo "    → BillingReconciler depends on it (breaks accounting)"
echo "    → It writes to AuditLog (compliance dependency)"
echo "    → It publishes to EventBus (downstream consumers)"
echo ""

echo "--- what about the things that depend on PaymentService? ---"
echo ""

brane graph neighbors RefundHandler
brane graph neighbors ChargebackWebhook

echo ""
echo "  RefundHandler and ChargebackWebhook have exactly 1"
echo "  dependency each — PaymentService. If you change its"
echo "  interface, both break with no fallback."
echo ""
echo "  You thought you were refactoring one service."
echo "  You're changing the contract for 4 consumers,"
echo "  2 infrastructure systems, and every downstream"
echo "  event listener."
echo ""
echo "  'grep PaymentService' finds import statements."
echo "  'brane graph neighbors' finds blast radius."
echo ""
