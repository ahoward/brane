#!/usr/bin/env bash
#
# run-all.sh - Run all example scripts as a test suite
#
# Exit codes: 0 = all passed, 1 = some failed
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors (when terminal supports them)
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  GREEN=''
  RED=''
  YELLOW=''
  NC=''
fi

echo "=== Brane Example Scripts Test Suite ==="
echo ""

# Track results
passed=0
failed=0
start_time=$(date +%s)

# Find and run all numbered scripts
for script in "$SCRIPT_DIR"/[0-9][0-9]-*.sh; do
  if [[ ! -x "$script" ]]; then
    continue
  fi

  name=$(basename "$script")
  printf "  %-30s " "$name"

  # Run script, capture output and exit code
  if output=$("$script" 2>&1); then
    echo -e "${GREEN}PASS${NC}"
    ((passed++))
  else
    echo -e "${RED}FAIL${NC}"
    ((failed++))
    # Show last few lines of output on failure
    echo "    --- Output (last 10 lines) ---"
    echo "$output" | tail -10 | sed 's/^/    /'
    echo "    ---"
  fi
done

end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo "=== Summary ==="
echo ""
echo -e "  Passed: ${GREEN}$passed${NC}"
echo -e "  Failed: ${RED}$failed${NC}"
echo "  Total:  $((passed + failed))"
echo "  Time:   ${duration}s"
echo ""

if [[ $failed -gt 0 ]]; then
  echo -e "${RED}FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}ALL PASSED${NC}"
  exit 0
fi
