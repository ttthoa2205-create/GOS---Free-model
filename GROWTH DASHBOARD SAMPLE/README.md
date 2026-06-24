# OT Growth Operations Dashboard

A real-time, interactive, and premium business operations and growth analytics dashboard built specifically for **OT Growth** ([ot-growth.com](https://ot-growth.com/)).

This dashboard integrates multiple data silos (Marketing, Customer Lifecycle, Product Virality, Capital Efficiency, and Strategic KPIs) into a unified, glassmorphic dark-theme console designed for modern growth leaders (CEOs, CMOs, PMs, and Growth Leads).

> 📘 **Bắt đầu tại đây:** Mở [**PLAYBOOK.html**](PLAYBOOK.html) — **playbook trực quan tất-cả-trong-một**: video hướng dẫn tương tác + chi tiết 12 module + cẩm nang tùy biến template (nhập liệu · thông số · thương hiệu). In được ra PDF (Ctrl/⌘+P).
>
> 📄 Bản markdown đọc nhanh trên GitHub: [PLAYBOOK.md](PLAYBOOK.md).

---

## 🌟 Core Features

- **Dynamic Role-Based Personas**: Toggle views dynamically between CEO, CMO, PM, and Growth Lead. Interface elements and prioritization change based on the active role.
- **11 Integrated Operations Tabs**:
  1. **Customer Value (MEU)**: RFM Matrix, customer segmentation, and Cohort retention analysis.
  2. **Content Performance**: Video retention analysis, Hook matrix, and creative efficiency tools.
  3. **Attribution Engine (MTA)**: Multi-touch attribution simulator (First-touch, Last-touch, Linear, Position-based).
  4. **Product Growth**: Live viral K-factor calculator and feature adoption insights.
  5. **Thí nghiệm ICE**: Growth hacking experiment backlog sorted by Impact, Confidence, and Ease.
  6. **Capital Optimization**: Budget reallocator recommending spend shifting based on channel saturation.
  7. **Strategy Map**: KPI trees modeling the North Star Metric dependencies.
  8. **Market Intel**: Competitor spending, creatives count, pricing track, and pricing CRUD actions.
  9. **Team Operations**: Task management board, backlog idea manager, and corporate OKR rollup mapping.
  10. **System Governance**: Configuration control center for 17 variables, with a security audit log.
  11. **Data Map & Guide**: Bulk importing/exporting tools (JSON/CSV) and schema guides.
- **Theme Toggling**: Premium glassmorphic Dark and Light mode support.
- **In-Browser Customize Mode**: Directly edit text labels and KPI benchmarks on the fly.

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.x installed.

### 1. Launch the Local Server
Run the local HTTP server script:
```bash
python3 serve.py
```
This will start serving the files locally at:
**[http://127.0.0.1:8799](http://127.0.0.1:8799)**

### 2. View in Browser
Open your web browser (Safari, Chrome, Firefox, or Edge) and navigate to `http://127.0.0.1:8799`.

---

## 🧪 Running Automated Tests

The codebase includes JXA (JavaScript for Automation) validation tests for checking tab rendering, CRUD actions, product calculation, and schema round-trips.

To run the full suite:
```bash
chmod +x run_tests.sh
./run_tests.sh
```

---

## 📂 Project Structure

```
├── PLAYBOOK.html       # All-in-one visual playbook: video + 12 modules + customization (start here)
├── PLAYBOOK.md         # Markdown version of the playbook (quick read on GitHub)
├── index.html          # Main HTML5 semantic structure
├── style.css           # Custom vanilla styling, responsive layouts, glassmorphism UI
├── app.js              # Business logic, routing, Chart.js mapping, OKR calculations
├── data/
│   └── data.js         # Seed database, RFM cohorts, and initial dataset definitions
├── serve.py            # Local Python HTTP development server
├── run_tests.sh        # Main test runner script
└── tests/              # Test suites using JXA macOS scripting
    ├── test_load.js
    ├── test_product.js
    ├── test_new_subtabs.js
    ├── test_crud.js
    └── test_all_tabs.js
```
