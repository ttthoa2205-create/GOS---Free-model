#!/bin/bash
echo "=== Running Growth Dashboard Sample JXA Validation Tests ==="
echo ""
echo "[1/5] Running syntax and load compilation checks..."
osascript -l JavaScript tests/test_load.js
if [ $? -ne 0 ]; then
  echo "❌ Load test failed!"
  exit 1
fi
echo ""
echo "[2/5] Running Product Virality click simulations..."
osascript -l JavaScript tests/test_product.js
if [ $? -ne 0 ]; then
  echo "❌ Product subtab test failed!"
  exit 1
fi
echo ""
echo "[3/5] Running new subtabs click simulations..."
osascript -l JavaScript tests/test_new_subtabs.js
if [ $? -ne 0 ]; then
  echo "❌ New subtabs test failed!"
  exit 1
fi
echo ""
echo "[4/5] Running CRUD operations tests..."
osascript -l JavaScript tests/test_crud.js
if [ $? -ne 0 ]; then
  echo "❌ CRUD tests failed!"
  exit 1
fi
echo ""
echo "[5/5] Running full render sweep (every tab + subtab, browser-faithful)..."
osascript -l JavaScript tests/test_all_tabs.js
if [ $? -ne 0 ]; then
  echo "❌ Full render sweep failed!"
  exit 1
fi
echo ""
echo "✅ All validation tests passed successfully!"
