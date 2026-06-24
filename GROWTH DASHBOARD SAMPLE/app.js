// Core Controllers and Business Logic for Growth Operating System - MEU-Aligned
document.addEventListener("DOMContentLoaded", () => {
  
  // Cache data source reference
  const db = window.GrowthData;
  if (!db) {
    console.error("Data source (data/data.js) not found. Check load order.");
    return;
  }
  window.db = db;

  // Initialize in-memory customizer caches at the very top to avoid Temporal Dead Zone (TDZ) reference errors during initial rendering
  const localMemoryMetrics = {};
  const localMemoryTexts = {};

  try {
    const o = JSON.parse(localStorage.getItem("gd_metric_overrides")) || {};
    Object.assign(localMemoryMetrics, o);
  } catch(e) {}

  try {
    const t = JSON.parse(localStorage.getItem("gd_custom_texts")) || {};
    Object.assign(localMemoryTexts, t);
  } catch(e) {}

  // Restore any datasets the user saved to the browser (localStorage) — applied before any render.
  try { loadDataOverrides(); } catch(e) { console.error("Error loading saved data overrides:", e); }

  // Timeframe-filtered customer list helper
  function getFilteredCustomers() {
    const days = typeof execTimeframeDays === "number" ? execTimeframeDays : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    return (db.customers || []).filter(c => c.Install_Date >= cutoffStr);
  }

  // Timeframe-scaled campaign list helper
  function getFilteredCampaigns() {
    return db.getScaledCampaigns();
  }

  window.showToast = function(message, type = 'info') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.style.pointerEvents = "auto";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "10px";
    toast.style.fontSize = "12px";
    toast.style.fontWeight = "600";
    toast.style.lineHeight = "1.4";
    toast.style.color = "#fff";
    toast.style.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.4)";
    toast.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.transform = "translateX(120%)";
    toast.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s";
    toast.style.opacity = "0";

    let bg = "rgba(30, 27, 46, 0.95)";
    let icon = "info";
    let iconColor = "var(--purple-light)";

    if (type === 'success') {
      bg = "rgba(16, 185, 129, 0.95)";
      icon = "check-circle";
      iconColor = "#fff";
    } else if (type === 'error' || type === 'danger') {
      bg = "rgba(239, 68, 68, 0.95)";
      icon = "alert-triangle";
      iconColor = "#fff";
    } else if (type === 'warning') {
      bg = "rgba(245, 158, 11, 0.95)";
      icon = "alert-circle";
      iconColor = "#fff";
    } else if (type === 'ai') {
      bg = "rgba(100, 84, 227, 0.95)";
      icon = "sparkles";
      iconColor = "#67e8f9";
    }

    toast.style.background = bg;

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 16px; height: 16px; flex-shrink: 0; color: ${iconColor};"></i>
      <div style="flex-grow: 1;">${message}</div>
      <button style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 16px; padding: 0 0 0 8px; line-height: 1; outline: none;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);
    if (window.lucide) {
      window.lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.transform = "translateX(0)";
      toast.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      toast.style.transform = "translateX(120%)";
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  };

  // Custom Prompt Modal Helper
  function showCustomPrompt(title, message, defaultValue, callback) {
    const modal = document.getElementById("custom-prompt-modal");
    const titleEl = document.getElementById("custom-prompt-title");
    const msgEl = document.getElementById("custom-prompt-message");
    const inputEl = document.getElementById("custom-prompt-input");
    const confirmBtn = document.getElementById("btn-custom-prompt-confirm");
    const cancelBtn = document.getElementById("btn-custom-prompt-cancel");
    const closeBtn = document.getElementById("close-custom-prompt");

    if (!modal || !inputEl) {
      const res = prompt(message, defaultValue);
      if (callback) callback(res);
      return;
    }

    if (titleEl) {
      titleEl.querySelector("span").textContent = title || "Yêu cầu nhập liệu";
    }
    if (msgEl) {
      msgEl.textContent = message || "";
    }
    inputEl.value = defaultValue || "";
    modal.style.display = "flex";

    function cleanUp() {
      modal.style.display = "none";
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
    }

    confirmBtn.onclick = () => {
      const value = inputEl.value;
      cleanUp();
      if (callback) callback(value);
    };

    cancelBtn.onclick = () => {
      cleanUp();
      if (callback) callback(null);
    };

    closeBtn.onclick = () => {
      cleanUp();
      if (callback) callback(null);
    };
  }
  window.showCustomPrompt = showCustomPrompt;

  // Active state variables
  let currentPersona = "CEO";
  let activeTab = "tab-executive";
  let execTimeframeDays = 30; // Global topbar time-range -> Executive daily revenue chart
  // Hệ số quy mô theo kỳ: chỉ số DÒNG (Revenue/Spend/Install/KYC/Lợi nhuận…) nhân theo số ngày
  // so với mốc 30 ngày; TỈ SỐ (CAC, LTV/CAC, ROAS, ROI, %…) KHÔNG đổi vì tử & mẫu cùng scale → triệt tiêu.
  function gdPeriodFactor() { return (typeof execTimeframeDays === "number" && execTimeframeDays > 0 ? execTimeframeDays : 30) / 30; }
  window.GD_PERIOD_FACTOR = gdPeriodFactor(); // mặc định 1 (30 ngày) — tầng dữ liệu đọc biến này để scale
  // HỆ SỐ HIỆU SUẤT theo kỳ: kỳ càng NGẮN (gần đây) hiệu suất càng tốt → các TỈ SỐ (CAC, ROAS, ROI,
  // LTV/CAC, Hook Rate, AUC, ROI-kênh, %CVR…) DỊCH nhẹ theo kỳ thay vì đứng yên. 30 ngày = 1.00.
  function gdEffForDays(d) { d = (typeof d === "number" && d > 0) ? d : 30; return Math.max(0.85, Math.min(1.1, Math.pow(30 / d, 0.06))); }
  function gdEffFactor() { return gdEffForDays(typeof execTimeframeDays === "number" ? execTimeframeDays : 30); }
  // Dốc nhẹ một chuỗi theo hệ số kỳ: điểm CUỐI giữ nguyên, các điểm trước dịch tuyến tính theo eff
  // → sparkline đổi HÌNH theo kỳ mà KHÔNG bóp méo điểm đầu (tránh delta first→last bị thổi phồng).
  function gdTiltSeries(arr, eff) { var n = arr.length; return arr.map(function (v, i) { return v * (1 + (eff - 1) * (n - 1 - i) / Math.max(1, n - 1)); }); }
  // Màu chữ/lưới/biểu đồ THEO THEME — đồng bộ với Chart.defaults (do __gdChartDefaults đặt) để
  // chart sinh ra ở chế độ Tối luôn ĐỌC ĐƯỢC, không kẹt màu #6E6A86 chìm vào nền tối.
  function gdIsDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function gdTickColor() { return (window.Chart && Chart.defaults && Chart.defaults.color) || (gdIsDark() ? '#AEB6C6' : '#5B6473'); }
  function gdGridColor() { return (window.Chart && Chart.defaults && Chart.defaults.borderColor) || (gdIsDark() ? 'rgba(255,255,255,0.08)' : 'rgba(17,23,38,0.07)'); }
  function gdAxisPurple() { return gdIsDark() ? '#9F92EC' : '#6454e3'; }
  window.GD_EFF = gdEffFactor();
  let currentScenario = "base";
  let currentAttributionModel = "LAST_TOUCH";
  let isCustomizing = false; // Customize Mode security state
  let simulatedAlerts = [];

  // State variables for custom dropdowns
  let currentTaskFilterDept = "ALL";
  let currentEffectivenessDept = "Marketing";
  let currentCreativeAssetId = "C-01"; // Default to C-01

  // Custom dropdown helper
  function setupCustomDropdown(triggerId, menuId, valueSpanId, onChangeCallback) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    if (!trigger || !menu) return;

    trigger.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".custom-dropdown-menu").forEach(m => {
        if (m !== menu) m.style.display = "none";
      });
      const isVisible = menu.style.display === "block";
      menu.style.display = isVisible ? "none" : "block";
    };

    menu.querySelectorAll(".dropdown-item").forEach(item => {
      item.onclick = (e) => {
        e.stopPropagation();
        menu.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const val = item.getAttribute("data-value");
        const text = item.textContent;

        const valSpan = document.getElementById(valueSpanId);
        if (valSpan) valSpan.textContent = text;
        menu.style.display = "none";

        if (onChangeCallback) onChangeCallback(val, text);
      };
    });
  }

  // Close all custom dropdowns when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".custom-dropdown-menu").forEach(m => m.style.display = "none");
  });
  
  // Charts references for resetting/updating
  let segmentationChartRef = null;
  let survivalChartRef = null;
  let scenarioChartRef = null;
  let econCalendarTimer = null;   // live-update interval for economic/geopolitical calendar
  let econCalFilter = "ALL";      // active category filter
  let econCalTick = 0;            // tick counter for the live clock / periodic refresh

  // Initialize Lucide Icons
  lucide.createIcons();

  // -------------------------------------------------------------
  // Tùy chỉnh (Customize) Mode Controller
  // -------------------------------------------------------------
  const btnToggleCust = document.getElementById("btn-toggle-customize");
  const dbLockHint = document.getElementById("db-lock-hint");

  btnToggleCust.addEventListener("click", () => {
    isCustomizing = !isCustomizing;
    
    if (isCustomizing) {
      document.body.classList.add("customizing");
      
      // Update toggle button
      btnToggleCust.innerHTML = `<i data-lucide="lock"></i><span>Khóa lại</span>`;
      btnToggleCust.className = "btn btn-cyan"; // Turn purple/active
      
      // Update Lock hint status
      dbLockHint.innerHTML = `<i data-lucide="unlock"></i><span>Chỉnh sửa</span>`;
      
      addAuditLogEntry(currentPersona, "Bật chế độ tùy chỉnh (Mở khóa cấu hình & ICE)", "Cho phép sửa đổi dữ liệu");
    } else {
      document.body.classList.remove("customizing");
      
      // Update toggle button
      btnToggleCust.innerHTML = `<i data-lucide="edit-3"></i><span>Tùy chỉnh</span>`;
      btnToggleCust.className = "btn btn-secondary"; // Revert to secondary
      
      // Update Lock hint status
      dbLockHint.innerHTML = `<i data-lucide="lock"></i><span>Chỉ xem</span>`;
      
      addAuditLogEntry(currentPersona, "Tắt chế độ tùy chỉnh (Khóa cấu hình & ICE)", "Cấu hình chuyển về trạng thái chỉ đọc");
    }
    
    lucide.createIcons();
  });

  // Helper validation to prevent ad-hoc modifications in view-only mode
  function checkCustomizePermission(actionName) {
    if (!isCustomizing) {
      showToast(`[Bảo vệ dữ liệu] Vui lòng bật chế độ "Tùy chỉnh" ở góc trên bên phải để ${actionName}!`, "warning");
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------
  // Liquid Mesh Pointer Tracking Physics
  // -------------------------------------------------------------
  function initLiquidMeshPhysics() {
    const lmCards = document.querySelectorAll(".lmcard");
    lmCards.forEach(card => {
      if (card._lmBound) return;   // tránh gắn lặp listener mỗi lần đổi tab (chống rò rỉ)
      card._lmBound = true;
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        // Calculate coordinate delta relative to card center
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.setProperty("--dx", x);
        card.style.setProperty("--dy", y);
      });
      
      card.addEventListener("mouseleave", () => {
        // Reset position on mouse leave
        card.style.setProperty("--dx", "0");
        card.style.setProperty("--dy", "0");
      });
    });
  }

  // -------------------------------------------------------------
  // Dynamic Gauge Helper
  // -------------------------------------------------------------
  function setRadialGauge(elementId, score) {
    const circle = document.getElementById(elementId);
    if (!circle) return;
    const scoreValEl = circle.closest(".radial-gauge").querySelector(".radial-gauge-value");
    if (scoreValEl) scoreValEl.textContent = score;

    const circumference = 377;
    const offset = circumference - (circumference * (score / 100));
    circle.style.strokeDashoffset = offset;
  }

  // -------------------------------------------------------------
  // Role Switcher & Persona Summaries
  // -------------------------------------------------------------
  const personaSummaries = {
    CEO: `
      <div class="ai-summary-section-title">Tổng quan sức khỏe doanh nghiệp</div>
      <p>Doanh thu đạt <strong>$382,000</strong> trong 30 ngày qua (+12% MoM), dẫn dắt bởi hiệu suất xuất sắc của kênh Apple Search Ads và sự phục hồi nhẹ từ Meta Ads. Chỉ số LTV/CAC duy trì ổn định ở mức <strong>3.48x</strong>, sát ngưỡng mục tiêu 3.50x.</p>
      
      <div class="ai-summary-section-title">Nguyên nhân cốt lõi</div>
      <p>Sự gia tăng ngân sách ở các chiến dịch Google Ads tạo ra lượng KYC NC tốt (+8%), bù đắp cho tỷ lệ chuyển đổi Install &rarr; KYC đang đi ngang ở mức 35.0%. Sự đóng góp doanh thu lớn từ nhóm Whale chiếm khoảng 41% tổng lượng nạp, duy trì dòng tiền mạnh.</p>
      
      <div class="ai-summary-section-title">Rủi ro cần giám sát</div>
      <p>Sự phụ thuộc lớn vào Whale (~41% > ngưỡng 40%) đặt hệ thống vào rủi ro tập trung. Chỉ số ROI của kênh TikTok Ads chiến dịch T-02 đang âm (-20%), cần tối ưu hóa ngay lập tức.</p>
      
      <div class="ai-summary-section-title">Đề xuất hành động từ AI</div>
      <ul>
        <li>Duy trì và tối ưu hóa ngân sách Meta/Google để giữ CAC ổn định ở mức $11.12.</li>
        <li>Kích hoạt kế hoạch Reactivation nhắm tới khách hàng Core/Whale đang trong trạng thái At Risk.</li>
      </ul>
    `,
    CMO: `
      <div class="ai-summary-section-title">Hiệu suất Marketing & CAC</div>
      <p>Chi tiêu quảng cáo tổng đạt <strong>$130,000</strong>. CAC trung bình trên KYC đạt <strong>$11.12</strong>, giảm 6% so với tháng trước nhờ tối ưu hóa phân bổ. Apple Search Ads là kênh có ROI cao nhất đạt <strong>3.50x</strong>.</p>
      
      <div class="ai-summary-section-title">Lý do biến động</div>
      <p>Tỷ lệ nhấp (CTR) trung bình của chiến dịch TikTok tăng nhẹ, nhưng CVR giảm dẫn đến ROI T-02 âm (0.80x). Đã phát hiện tín hiệu Creative Fatigue (mệt mỏi nội dung) trên 4 mẫu quảng cáo cốt lõi của Meta Ads.</p>
      
      <div class="ai-summary-section-title">Rủi ro kênh</div>
      <p>Kênh TikTok Ads đang chạm ngưỡng bão hòa cận biên (CAC tăng 18%). Chi phí CPM trên Meta Ads dự kiến tăng 10% trong tuần tới.</p>
      
      <div class="ai-summary-section-title">Khuyến nghị chiến dịch</div>
      <ul>
        <li>Dừng ngay chiến dịch TikTok T-02, chuyển ngân sách sang Google G-01 và Apple A-01.</li>
        <li>Yêu cầu Creative Team refresh nội dung, tập trung vào Video Hook FOMO 3s đầu đã được AI chấm 82 điểm.</li>
      </ul>
    `,
    "Growth Lead": `
      <div class="ai-summary-section-title">Phân tích Phễu Tăng Trưởng</div>
      <p>Tốc độ đăng ký và nộp KYC tăng nhẹ nhờ cải tiến luồng onboarding. Tỷ lệ Install &rarr; KYC duy trì ở mức <strong>35.0%</strong>. Tuy nhiên, tỷ lệ kích hoạt FTD Rate giảm nhẹ (-1.2% MoM).</p>
      
      <div class="ai-summary-section-title">Điểm nghẽn phễu</div>
      <p>Thời gian trung bình để kích hoạt (Avg Time to Activate) là 4.2 giờ. Nhóm người dùng Android gặp tỷ lệ rớt phễu cao hơn ở bước liên kết tài khoản ngân hàng.</p>
      
      <div class="ai-summary-section-title">Rủi ro phễu</div>
      <p>Tỷ lệ giữ chân người dùng D7 (D7 Retention) của tệp Casual giảm nhẹ, đe dọa sự phát triển MAU dài hạn.</p>
      
      <div class="ai-summary-section-title">Hành động ưu tiên (Weekly Priorities)</div>
      <ul>
        <li>Triển khai ngay A/B Testing lược bớt 2 bước trong luồng KYC (ICE Score: 324).</li>
        <li>Tích hợp luồng ưu đãi nạp tiền lần đầu (FTD Offer) ngay tại trang chủ để giảm Avg Time to Activate.</li>
      </ul>
    `,
    "Product Manager": `
      <div class="ai-summary-section-title">Chỉ số Sản phẩm & Activation</div>
      <p>Activation Rate đạt <strong>68.2%</strong>. Người dùng ICP có hành vi giao dịch trung bình <strong>24.5 lần/tháng</strong>, tập trung chủ yếu vào các sản phẩm Vàng và Cổ phiếu.</p>
      
      <div class="ai-summary-section-title">Tương tác tính năng</div>
      <p>Tính năng Cross-Sell khuyến nghị "Next Best Offer" đạt tỷ lệ chấp nhận 18%. Thời gian hoạt động cao điểm của tệp khách hàng giá trị cao là 19:00 - 22:00.</p>
      
      <div class="ai-summary-section-title">Rủi ro trải nghiệm</div>
      <p>Khách hàng Whale phàn nàn về tốc độ nạp/rút tiền trong khung giờ cao điểm. Tỷ lệ rời bỏ sau giao dịch đầu tiên của nhóm New User là 38%.</p>
      
      <div class="ai-summary-section-title">Đề xuất phát triển sản phẩm</div>
      <ul>
        <li>Tối ưu hóa API cổng thanh toán đối tác để giảm thời gian xử lý nạp tiền xuống dưới 30 giây.</li>
        <li>Phát triển cơ chế đề xuất tự động tài sản tiếp theo (Asset Migration) dựa trên RFM Segment.</li>
      </ul>
    `,
    "Data Analyst": `
      <div class="ai-summary-section-title">Báo cáo Kho Dữ liệu & Mô hình</div>
      <p>Dữ liệu hợp nhất dựa trên Customer_ID đang hoạt động ổn định. Tỷ lệ khớp dữ liệu đa kênh (Attributed Revenue) đạt 92%. Mô hình dự báo Whale Predictor đạt AUC 0.88.</p>
      
      <div class="ai-summary-section-title">Quan sát mô hình</div>
      <p>Phân tích Cohort cho thấy Cohort tháng 5/2026 có chất lượng D30 Retention tốt nhất (19.6%) nhờ chiến dịch định vị lại tệp ICP. RFM phân loại có 180 Champions và 320 At Risk.</p>
      
      <div class="ai-summary-section-title">Rủi ro dữ liệu</div>
      <p>Thay đổi chính sách iOS14+ tiếp tục làm giảm độ chính xác của tệp lookalike trên Meta Ads. Cần bổ sung tracking First-Party Data.</p>
      
      <div class="ai-summary-section-title">Đề xuất kỹ thuật</div>
      <ul>
        <li>Tích hợp Conversions API (CAPI) cho Meta Ads để cải thiện tracking phân bổ.</li>
        <li>Chạy lại mô hình Churn Predictor hàng tuần để cập nhật danh sách kích hoạt tự động.</li>
      </ul>
    `,
    "Marketing Team": `
      <div class="ai-summary-section-title">Sản xuất nội dung & Sức khỏe Creative</div>
      <p>Chỉ số Hook Rate (3s đầu) trung bình đạt <strong>33.4%</strong>. CTR trung bình 3.62%. Creative Health Score đạt <strong>72/100</strong> điểm.</p>
      
      <div class="ai-summary-section-title">Thông điệp cốt lõi</div>
      <p>Thông điệp "Free Fee" (Không phí giao dịch) mang lại doanh thu cao nhất trên tệp Whales ($68.4k). Quảng cáo dạng Educational (Hướng dẫn) có CTR thấp nhưng CPA lại tối ưu nhất.</p>
      
      <div class="ai-summary-section-title">Rủi ro sáng tạo</div>
      <p>Hiện có 4 mẫu quảng cáo đang rơi vào trạng thái Fatigue (tần suất hiển thị > 5 lần/user, CPA tăng 35%).</p>
      
      <div class="ai-summary-section-title">Kế hoạch sản xuất nội dung</div>
      <ul>
        <li>Thiết kế 3 mẫu video mới sử dụng Hook dạng "FOMO" cho chiến dịch Tiktok tuần tới.</li>
        <li>Thử nghiệm biến thể thông điệp "Giao dịch không mất phí" cho tệp Casual Traders trên Meta Ads.</li>
      </ul>
    `,
    "Finance Team": `
      <div class="ai-summary-section-title">Báo cáo Dòng tiền & ROI</div>
      <p>Doanh thu ghi nhận <strong>$382,000</strong>. Lợi nhuận gộp từ các chiến dịch marketing ước đạt <strong>$252,000</strong>. ROI toàn chiến dịch đạt <strong>1.93x</strong>.</p>
      
      <div class="ai-summary-section-title">Cấu trúc chi phí</div>
      <p>Tổng chi tiêu là $130,000. Payback period (Thời gian hoàn vốn marketing) trung bình của một khách hàng KYC mới rút ngắn xuống còn 2.8 tháng.</p>
      
      <div class="ai-summary-section-title">Rủi ro tài chính</div>
      <p>Biến động doanh thu ở kịch bản Bearish có thể làm giảm lợi nhuận quý này xuống 15%. Whale contribution cao đòi hỏi quỹ dự phòng rủi ro thanh khoản lớn hơn.</p>
      
      <div class="ai-summary-section-title">Đề xuất phân bổ tài chính</div>
      <ul>
        <li>Phê duyệt tăng thêm $25,000 ngân sách tiếp thị cho tháng tới, tập trung phân bổ tối ưu vào các kênh có biên LTV/CAC > 2.0x.</li>
        <li>Đặt ngưỡng cảnh báo tự động khi ROI trung bình tuần giảm xuống dưới 1.20x.</li>
      </ul>
    `
  };

  // ===== BỘ SỐ GỐC (single source of truth) — mọi nơi tham chiếu để TRÙNG KHỚP =====
  function gdLiveKPIs() {
    const D = window.db || db; const k = {};
    const eff = (typeof gdEffFactor === "function" ? gdEffFactor() : 1);     // hiệu suất kỳ (tỉ số dịch theo)
    const pf = (typeof gdPeriodFactor === "function" ? gdPeriodFactor() : 1); // tích lũy theo kỳ
    const cumAdj = Math.min(1.6, Math.pow(pf, 0.2));                          // rate cộng dồn (sublinear)
    try { const s = D.getAggregatedCampaigns();   // s ĐÃ scale + dịch tỉ số theo kỳ ở tầng dữ liệu
      k.revenue = s.Revenue; k.spend = s.Spend; k.cac = s.CAC;
      k.ltvcac = (s.CAC > 0 ? s.LTV / s.CAC : 0); k.roas = (s.Spend > 0 ? s.Revenue / s.Spend : 0);
      k.netRoi = (s.Spend > 0 ? (s.Revenue - s.Spend) / s.Spend : 0); k.grossProfit = s.Revenue - s.Spend; } catch (e) {}
    try { const cs = D.customers || []; const n = cs.length || 1;
      k.activeTrader = Math.min(98, cs.filter(c => (c.Trade_Count || 0) >= 1).length / n * 100 * cumAdj);
      k.tradesUser = cs.reduce((a, c) => a + (c.Trade_Count || 0), 0) / n * Math.pow(pf, 0.5); } catch (e) {}
    try { const aj = (D.productGrowth && D.productGrowth.activationJourney) || [];
      const inst = (aj.find(x => x.step === "App Installed") || {}).count || 0;
      const kyc = (aj.find(x => x.step === "KYC Submitted") || {}).count || 0;
      k.installKyc = (inst ? kyc / inst * 100 : 0) * eff; } catch (e) {}
    // Chỉ số theo kỳ (dịch theo hiệu suất): Hook Rate · AUC mô hình · ROI kênh tốt nhất
    k.hookRate = 33.4 * eff;
    k.auc = Math.max(0.80, Math.min(0.95, 0.88 + (eff - 1) * 0.3));
    k.bestChannelRoi = 3.50 * eff;
    return k;
  }
  try { window.GD_KPI = gdLiveKPIs(); } catch (e) {}

  // Đồng bộ số liệu headline trong văn bản tĩnh (persona summary) với BỘ SỐ GỐC
  function applyLiveKPIs(html) {
    const k = gdLiveKPIs();
    // dấu chấm ngăn cách hàng nghìn để TRÙNG KHỚP định dạng các thẻ KPI ($543.200)
    const usd = n => "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const reps = [];
    if (k.revenue) reps.push([/\$382,000/g, usd(k.revenue)]);
    if (k.spend) reps.push([/\$130,000/g, usd(k.spend)]);
    if (k.grossProfit) reps.push([/\$252,000/g, usd(k.grossProfit)]);
    if (k.cac) { reps.push([/\$11\.12/g, "$" + k.cac.toFixed(2)]); reps.push([/\$11\.15/g, "$" + k.cac.toFixed(2)]); }
    if (k.ltvcac) reps.push([/3\.48x/g, k.ltvcac.toFixed(2) + "x"]);
    if (k.installKyc) reps.push([/\b35\.0%/g, k.installKyc.toFixed(1) + "%"]);
    if (k.activeTrader) reps.push([/\b68\.2%/g, k.activeTrader.toFixed(1) + "%"]);
    if (k.tradesUser) reps.push([/24\.5 lần\/tháng/g, k.tradesUser.toFixed(1) + " lần/tháng"]);
    if (k.netRoi) reps.push([/1\.93x/g, k.netRoi.toFixed(2) + "x"]);
    // các chỉ số theo kỳ mới: Hook Rate (Marketing) · AUC (Data Analyst) · ROI kênh tốt nhất (CMO — KHÔNG đụng "mục tiêu 3.50x" của CEO)
    if (k.hookRate) reps.push([/\b33\.4%/g, k.hookRate.toFixed(1) + "%"]);
    if (k.auc) reps.push([/AUC 0\.88/g, "AUC " + k.auc.toFixed(2)]);
    if (k.bestChannelRoi) reps.push([/ROI cao nhất đạt <strong>3\.50x<\/strong>/g, "ROI cao nhất đạt <strong>" + k.bestChannelRoi.toFixed(2) + "x</strong>"]);
    reps.forEach(pair => { if (pair[1] && pair[1].indexOf("NaN") < 0) html = html.replace(pair[0], pair[1]); });
    // nhãn kỳ: "trong 30 ngày qua" → theo dropdown đã chọn
    const pd = (typeof execTimeframeDays === "number" && execTimeframeDays > 0) ? execTimeframeDays : 30;
    if (pd !== 30) html = html.replace(/30 ngày qua/g, pd + " ngày qua");
    return html;
  }

  function updatePersonaView() {
    // Update sidebar avatar and label
    const initials = currentPersona.split(" ").map(w => w.charAt(0)).join("").substring(0, 2).toUpperCase();
    const avatarCircleEl = document.getElementById("avatar-circle");
    if (avatarCircleEl) avatarCircleEl.textContent = initials;

    const personaLabels = {
      "CEO": "CEO (Hannah)",
      "CMO": "CMO (Tran)",
      "Growth Lead": "Growth Lead",
      "Product Manager": "Product Manager",
      "Data Analyst": "Data Analyst",
      "Marketing Team": "Marketing Team",
      "Finance Team": "Finance Team"
    };
    const label = personaLabels[currentPersona] || currentPersona;
    const avatarLabelEl = document.getElementById("avatar-label");
    if (avatarLabelEl) avatarLabelEl.textContent = label;

    // Update AI Executive Box
    const personaHeaderEl = document.getElementById("ai-persona-header-title");
    if (personaHeaderEl) personaHeaderEl.textContent = `Persona View: ${currentPersona}`;
    const summaryEl = document.getElementById("ai-summary-text");
    if (summaryEl) {
      let html = personaSummaries[currentPersona] || personaSummaries["CEO"];
      try { html = applyLiveKPIs(html); } catch (e) {}
      summaryEl.innerHTML = html;
      // Gom mỗi mục (tiêu đề + nội dung) thành 1 khối .ai-sec để xếp 2 cột gọn gàng
      try {
        const titles = summaryEl.querySelectorAll(".ai-summary-section-title");
        if (titles.length) {
          const frag = document.createDocumentFragment();
          titles.forEach(function (t) {
            const sec = document.createElement("div"); sec.className = "ai-sec";
            const label = document.createElement("div"); label.className = "ai-sec-label";
            label.innerHTML = '<span class="ai-sec-dot"></span>' + t.textContent;
            sec.appendChild(label);
            const body = document.createElement("div"); body.className = "ai-sec-body";
            let n = t.nextSibling;
            while (n && !(n.nodeType === 1 && n.classList && n.classList.contains("ai-summary-section-title"))) {
              const nx = n.nextSibling; body.appendChild(n); n = nx;
            }
            sec.appendChild(body);
            frag.appendChild(sec);
          });
          summaryEl.innerHTML = ""; summaryEl.appendChild(frag);
        }
      } catch (e) {}
    }

    // Re-create icons inside summary box
    lucide.createIcons();
  }

  // Set up custom role/persona selector dropdown
  setupCustomDropdown("role-trigger", "role-menu", "role-val", (val) => {
    currentPersona = val;
    updatePersonaView();
    try { renderPriorityEngine(); } catch (e) { console.error("renderPriorityEngine:", e); }
    refreshActiveDashboardViews();
    addAuditLogEntry(currentPersona, `Thay đổi persona làm việc sang ${currentPersona}`, "Cập nhật ưu tiên công việc theo vai trò");
  });

  // Set up custom time range selector dropdown
  setupCustomDropdown("time-range-trigger", "time-range-menu", "time-range-val", (val, text) => {
    const days = parseInt(val, 10);
    if (!isNaN(days)) { execTimeframeDays = days; meuPeriod = days + "d"; }
    // Đặt HỆ SỐ KỲ TRƯỚC để mọi hàm render (mọi tab) đọc đúng quy mô khi vẽ lại
    window.GD_PERIOD_FACTOR = gdPeriodFactor();
    window.GD_EFF = gdEffFactor();   // cập nhật hệ số HIỆU SUẤT để tỉ số (CAC/ROAS/LTV-CAC…) dịch theo kỳ
    try { window.GD_KPI = gdLiveKPIs(); } catch (e) {}
    try { syncPeriodTrendBadges(); } catch (e) {}   // cập nhật nhãn "vs Nd" + % cho mọi thẻ KPI (mọi tab, kể cả tab đang ẩn)
    // Luôn cập nhật điểm sức khỏe và topbar (để đồng bộ toàn bộ tab)
    try { calculateHealthScores(); } catch (e) {}
    // Render lại ĐÚNG TAB đang mở → mọi tab đều phản ứng theo kỳ (init giữ listener, chỉ vẽ lại dữ liệu)
    try {
      const activeNav = document.querySelector(".nav-item.active");
      const at = activeNav ? activeNav.getAttribute("data-tab") : "tab-executive";
      handleTabActivation(at);
    } catch (e) { console.error("Error re-rendering active tab on timeframe change:", e); }
    try { if (window.__vhSyncPeriod) window.__vhSyncPeriod(execTimeframeDays); } catch (e) {}   // gauge Value Health (tab Khách hàng) chạy theo mốc thời gian
    try { if (window.__vhSignalsRender) window.__vhSignalsRender(); } catch (e) {}              // Chỉ báo & Lưu ý cũng cập nhật theo kỳ (val + thanh khớp nhau, ≤100%)
    try { updatePersonaView(); } catch (e) {}            // tóm tắt persona (không nằm trong handleTabActivation)
    showToast(`Đã cập nhật khoảng thời gian hiển thị sang: ${text}`, "success");
    addAuditLogEntry(currentPersona, `Thay đổi khoảng thời gian hiển thị sang ${text}`, "Quy mô lại toàn bộ chỉ số DÒNG theo " + (isNaN(days) ? text : days + " ngày"));
  });

  // -------------------------------------------------------------
  // Dynamic Calculations (Tab 1 / Tab 6 interaction)
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // MEU data wiring (ONUS Value Formation datasets imported into db.meu)
  // -------------------------------------------------------------
  let meuPeriod = "30d";   // follows topbar time-range
  let meuTsMode = "weeks"; // weeks | months
  let meuTsChartRef = null;

  function renderMeuValueTrends() {
    const host = document.getElementById("meu-value-trends");
    if (!host) return;
    const meu = db.meu || {};
    const cvd = (meu.cvd && meu.cvd[meuPeriod]) || null;
    const tr = (meu.trends && meu.trends.health && meu.trends.health[meuPeriod]) || null;
    const lbl = document.getElementById("meu-vt-period-label");
    if (lbl) lbl.textContent = meuPeriod.replace("d", " ngày");
    if (!cvd) { host.innerHTML = '<div style="color:var(--text-muted); font-size:11px;">Không có dữ liệu kỳ này.</div>'; return; }
    const ovAvgLtv = (typeof getMetricOverride === "function") ? getMetricOverride("avg_ltv") : null;
    const ovLtvCac = (typeof getMetricOverride === "function") ? getMetricOverride("ltv_cac_ratio") : null;
    const valAvgLtv = ovAvgLtv !== null ? ovAvgLtv + "tr" : cvd.avgLtv + "tr";
    const valLtvCac = ovLtvCac !== null ? ovLtvCac + "x" : cvd.ltvCac + "x";

    const metrics = [
      { k: "Whale concentration", v: cvd.whale + "%" }, { k: "Repeat rate", v: cvd.repeat + "%" },
      { k: "FTD rate", v: cvd.ftd + "%" }, { k: "Avg LTV", v: valAvgLtv },
      { k: "LTV : CAC", v: valLtvCac }, { k: "Retention D30", v: cvd.d30 + "%" },
      { k: "Retention D90", v: cvd.d90 + "%" }, { k: "Realized LTV", v: cvd.realized + "tr" }
    ];
    const tooltips = {
      "Whale concentration": "Ý nghĩa: Mật độ doanh thu từ nhóm khách hàng VIP (Whale).&#10;Cách tính: Lấy tổng doanh thu từ nhóm khách hàng chi tiêu lớn nhất chia cho tổng doanh thu toàn hệ thống.&#10;Công thức: Whale Concentration = (Doanh thu VIP / Tổng doanh thu) × 100%.&#10;Biến động: Tăng: Mức độ tập trung doanh thu cao (phụ thuộc vào khách VIP). Giảm: Doanh thu phân bổ đều hơn giữa các nhóm người dùng.",
      "Repeat rate": "Ý nghĩa: Tỷ lệ khách hàng thực hiện từ 2 giao dịch trở lên trong kỳ.&#10;Cách tính: Số khách hàng giao dịch nhiều hơn 1 lần chia cho tổng số khách hàng giao dịch.&#10;Công thức: Repeat Rate = (Số khách giao dịch >= 2 / Tổng số khách giao dịch) × 100%.&#10;Biến động: Tăng: Người dùng gắn kết tốt với sản phẩm. Giảm: Người dùng có xu hướng chỉ giao dịch thử 1 lần rồi rời đi.",
      "FTD rate": "Ý nghĩa: Tỷ lệ người dùng mới thực hiện nạp tiền lần đầu (First Time Deposit).&#10;Cách tính: Lấy số lượng khách hàng nạp tiền lần đầu chia cho tổng số tài khoản đăng ký mới trong kỳ.&#10;Công thức: FTD Rate = (Số khách FTD mới / Số đăng ký mới) × 100%.&#10;Biến động: Tăng: Phễu chuyển đổi onboarding hoạt động hiệu quả. Giảm: Quy trình kích hoạt gặp ma sát hoặc lỗi.",
      "Avg LTV": "Ý nghĩa: Giá trị trọn đời trung bình ước tính trên mỗi khách hàng.&#10;Cách tính: Lấy doanh thu trung bình trên mỗi người dùng nhân với thời gian gắn bó trung bình.&#10;Công thức: Avg LTV = ARPU × Thời gian gắn kết trung bình.&#10;Biến động: Tăng: Khách hàng chi tiêu nhiều hơn hoặc trung thành hơn. Giảm: Giá trị chi tiêu của mỗi người dùng sụt giảm.",
      "LTV : CAC": "Ý nghĩa: Tỷ số giữa Giá trị trọn đời của khách hàng và Chi phí thu hút khách hàng đó.&#10;Cách tính: Lấy LTV trung bình chia cho chi phí CAC bình quân.&#10;Công thức: LTV : CAC = Avg LTV / Blended CAC.&#10;Biến động: Tăng: Hiệu quả mô hình kinh doanh tăng (mục tiêu > 3x). Giảm: Chi phí quảng cáo tăng hoặc giá trị khách hàng mang lại giảm.",
      "Retention D30": "Ý nghĩa: Tỷ lệ giữ chân người dùng tại ngày thứ 30 sau khi đăng ký.&#10;Cách tính: Lấy số người dùng hoạt động vào ngày thứ 30 chia cho tổng số người dùng đăng ký ban đầu của nhóm.&#10;Công thức: Retention D30 = (Khách hoạt động N30 / Tổng nhóm ban đầu) × 100%.&#10;Biến động: Tăng: Sản phẩm giữ chân khách hàng tốt. Giảm: Mức độ tương tác của sản phẩm giảm dần sau 1 tháng.",
      "Retention D90": "Ý nghĩa: Tỷ lệ giữ chân người dùng tại ngày thứ 90 sau khi đăng ký.&#10;Cách tính: Lấy số người dùng hoạt động vào ngày thứ 90 chia cho tổng số người dùng đăng ký ban đầu của nhóm.&#10;Công thức: Retention D90 = (Khách hoạt động N90 / Tổng nhóm ban đầu) × 100%.&#10;Biến động: Tăng: Khách hàng gắn bó trung thành dài hạn. Giảm: Khách hàng rời bỏ hoàn toàn sau 3 tháng.",
      "Realized LTV": "Ý nghĩa: Giá trị trọn đời thực tế đã tích lũy từ tệp khách hàng.&#10;Cách tính: Tổng hợp toàn bộ doanh thu thực tế đã ghi nhận tích lũy từ tệp khách hàng.&#10;Công thức: Realized LTV = Tổng doanh thu thực tế đã thu hồi.&#10;Biến động: Tăng: Tốc độ thu hồi dòng tiền thực tế nhanh và hiệu quả. Giảm: Dòng tiền thực tế từ khách hàng bị chậm trễ."
    };
    let spark = "";
    if (tr && tr.trend && tr.trend.length) {
      const arr = tr.trend, mn = Math.min.apply(null, arr), mx = Math.max.apply(null, arr), rng = (mx - mn) || 1;
      const w = 100 / (arr.length - 1 || 1);
      const pts = arr.map((v, i) => (i * w).toFixed(1) + "," + (28 - ((v - mn) / rng) * 26).toFixed(1)).join(" ");
      spark = '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%; height:34px;"><polyline points="' + pts + '" fill="none" stroke="var(--purple)" stroke-width="1.5"/></svg>';
    }
    host.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;"><span style="font-size:11px; color:var(--text3); font-weight:700;">Tăng trưởng kỳ</span><strong style="font-size:18px; color:var(--green);">' + (tr ? tr.pct : "") + '</strong></div>' + spark +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">' +
      metrics.map(m => {
        const tooltipText = tooltips[m.k] || "";
        return '<div class="has-tile-tooltip" data-metric="' + m.k + '" data-tooltip="' + tooltipText + '" style="background:rgba(0,0,0,0.02); border:1px solid var(--border-color); border-radius:6px; padding:6px 8px; transition: background 0.2s, border-color 0.2s; cursor: pointer;"><div style="font-size:11px; color:var(--text-muted);">' + m.k + '</div><div style="font-size:13px; font-weight:800; color:var(--purple);">' + m.v + '</div></div>';
      }).join("") + '</div>' +
      '<div id="meu-metric-detail-box" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px 12px; margin-top: 12px; font-size: 11px; line-height: 1.5; min-height: 105px; overflow-y: auto;"></div>';

    const detailBox = host.querySelector("#meu-metric-detail-box");
    const tiles = host.querySelectorAll(".has-tile-tooltip");

    const setActiveTile = (activeTile) => {
      tiles.forEach(t => {
        t.style.background = "rgba(0,0,0,0.02)";
        t.style.borderColor = "var(--border-color)";
      });
      if (activeTile) {
        activeTile.style.background = "rgba(100, 84, 227, 0.05)";
        activeTile.style.borderColor = "rgba(100, 84, 227, 0.22)";
        const key = activeTile.getAttribute("data-metric");
        const text = tooltips[key] || "";
        const parts = text.split('&#10;');
        
        let meaning = "";
        let calc = "";
        let trend = "";
        
        parts.forEach(p => {
          if (p.startsWith("Ý nghĩa:")) {
            meaning = p.replace("Ý nghĩa:", "").trim();
          } else if (p.startsWith("Cách tính:") || p.startsWith("Công thức:")) {
            if (calc) calc += "<br>";
            calc += p.trim();
          } else if (p.startsWith("Biến động:")) {
            trend = p.replace("Biến động:", "").trim();
          }
        });
        
        if (detailBox) {
          detailBox.innerHTML = `
            <div style="font-weight: 800; color: var(--purple-light, #9d91ff); margin-bottom: 4px; font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="info" style="width: 12px; height: 12px; stroke-width: 3;"></i>
              <span>${key}</span>
            </div>
            <div style="color: var(--text-main); margin-bottom: 4px;"><strong>Ý nghĩa:</strong> ${meaning}</div>
            <div style="color: var(--text2); margin-bottom: 4px; font-family: sans-serif; font-size: 10.5px; border-left: 2px solid var(--purple); padding-left: 6px; line-height: 1.4;">${calc}</div>
            <div style="color: var(--text3); font-size: 10.5px;"><strong>Biến động:</strong> ${trend}</div>
          `;
          if (typeof lucide !== "undefined" && lucide.createIcons) {
            lucide.createIcons();
          }
        }
      }
    };

    if (tiles.length > 0) {
      setActiveTile(tiles[0]);
    }

    tiles.forEach(tile => {
      tile.addEventListener("mouseenter", () => {
        setActiveTile(tile);
      });
      tile.addEventListener("click", (e) => {
        setActiveTile(tile);
        e.stopPropagation();
      });
    });
  }

  function renderMeuCohorts() {
    const tbody = document.getElementById("meu-cohort-tbody"), head = document.getElementById("meu-cohort-head");
    if (!tbody) return;
    const meu = db.meu || {}, days = meu.retDays || [], cohorts = meu.retCohorts || [];
    const timeframeDays = typeof execTimeframeDays === "number" ? execTimeframeDays : 30;
    
    // Filter days columns
    const filteredDayIndices = [];
    const filteredDays = days.filter((d, idx) => {
      if (d <= timeframeDays) {
        filteredDayIndices.push(idx);
        return true;
      }
      return false;
    });

    if (head) head.innerHTML = '<th>Cohort</th>' + filteredDays.map(d => '<th>D' + d + '</th>').join("");
    tbody.innerHTML = cohorts.map(c => {
      const cells = filteredDayIndices.map(idx => {
        const s = c.surv[idx];
        const pct = Math.round(s * 100), col = pct >= 50 ? "var(--green)" : pct >= 25 ? "var(--amber)" : "var(--coral)";
        return '<td style="text-align:center; font-weight:700; color:' + col + ';">' + pct + '%</td>';
      }).join("");
      return '<tr><td><strong>' + c.name + '</strong></td>' + cells + '</tr>';
    }).join("");
  }

  function renderMeuTimeSeries() {
    const canvas = document.getElementById("meuTimeSeriesChart");
    if (!canvas || typeof canvas.getContext !== "function") return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const meu = db.meu || {};
    let labels, spend, rev, kyc;
    let spendSum = 0, revSum = 0, kycSum = 0;

    let m = meu.months || [];
    let w = meu.weeks || [];

    // Filter time series based on execTimeframeDays
    if (execTimeframeDays === 7) {
      m = m.slice(-2);
      w = w.slice(-2);
    } else if (execTimeframeDays === 30) {
      m = m.slice(-2);
      w = w.slice(-5);
    } else if (execTimeframeDays === 90) {
      m = m.slice(-3);
      w = w.slice(-8);
    } // 180 or 365, keep all
    
    if (meuTsMode === "months") {
      labels = m.map(x => x.m);
      spend = m.map(x => x.spend / 1e9);
      rev = null;
      kyc = m.map(x => x.kycnc);
      
      spendSum = m.reduce((sum, x) => sum + x.spend, 0) / 1e9;
      kycSum = m.reduce((sum, x) => sum + x.kycnc, 0);
    } else {
      labels = w.map(x => x.w);
      spend = w.map(x => x.budget / 1e9);
      rev = w.map(x => x.rev / 1e9);
      kyc = w.map(x => x.kycnc);
      
      spendSum = w.reduce((sum, x) => sum + x.budget, 0) / 1e9;
      revSum = w.reduce((sum, x) => sum + x.rev, 0) / 1e9;
      kycSum = w.reduce((sum, x) => sum + x.kycnc, 0);
    }

    // Set custom HTML legend (matching Value Formation KPI cards)
    const legendContainer = document.getElementById("meu-ts-legend-container");
    if (legendContainer) {
      let legendHtml = "";
      
      // Spend card (Index 0)
      legendHtml += `
        <div class="kpi-legend-card" id="legend-spend" data-ds-idx="0" style="flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: var(--transition-smooth); min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #DC2626; display: inline-block; flex-shrink: 0;"></span>
            <span style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Spend (Chi tiêu)</span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${spendSum.toFixed(2)} tỷ</div>
        </div>
      `;

      // Revenue card (Index 1) - only if weeks
      if (rev) {
        legendHtml += `
          <div class="kpi-legend-card" id="legend-rev" data-ds-idx="1" style="flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: var(--transition-smooth); min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: #0E9C8A; display: inline-block; flex-shrink: 0;"></span>
              <span style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Revenue (Doanh thu)</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${revSum.toFixed(1)} tỷ</div>
          </div>
        `;
      }

      // KYC NC card (Index 2 if weeks, Index 1 if months)
      const kycIdx = rev ? 2 : 1;
      legendHtml += `
        <div class="kpi-legend-card" id="legend-kyc" data-ds-idx="${kycIdx}" style="flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.02); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: var(--transition-smooth); min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #6454e3; display: inline-block; flex-shrink: 0;"></span>
            <span style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">KYC Mới</span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${kycSum.toLocaleString()}</div>
        </div>
      `;

      legendContainer.innerHTML = legendHtml;
    }

    if (meuTsChartRef) { try { meuTsChartRef.destroy(); } catch (e) {} }

    // Gradients
    const spendGradient = ctx.createLinearGradient(0, 0, 0, 200);
    spendGradient.addColorStop(0, "rgba(220, 38, 38, 0.08)");
    spendGradient.addColorStop(1, "rgba(220, 38, 38, 0.0)");

    const revGradient = ctx.createLinearGradient(0, 0, 0, 200);
    revGradient.addColorStop(0, "rgba(14, 156, 138, 0.12)");
    revGradient.addColorStop(1, "rgba(14, 156, 138, 0.0)");

    const kycGradient = ctx.createLinearGradient(0, 0, 0, 200);
    kycGradient.addColorStop(0, "rgba(100, 84, 227, 0.10)");
    kycGradient.addColorStop(1, "rgba(100, 84, 227, 0.0)");

    const ds = [{
      label: "Spend (tỷ)",
      data: spend,
      borderColor: "#DC2626",
      backgroundColor: spendGradient,
      fill: true,
      tension: 0.35,
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: "#DC2626",
      pointHoverBorderWidth: 3,
      yAxisID: "y"
    }];

    if (rev) {
      ds.push({
        label: "Revenue (tỷ)",
        data: rev,
        borderColor: "#0E9C8A",
        backgroundColor: revGradient,
        fill: true,
        tension: 0.35,
        borderWidth: 1.75,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#0E9C8A",
        pointHoverBorderWidth: 3,
        yAxisID: "y"
      });
    }

    ds.push({
      label: "KYC NC",
      data: kyc,
      borderColor: "#6454e3",
      backgroundColor: kycGradient,
      fill: true,
      tension: 0.35,
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: "#6454e3",
      pointHoverBorderWidth: 3,
      yAxisID: "y1"
    });

    meuTsChartRef = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = labels[idx];
            const sp = spend[idx] || 0;
            const rv = rev ? (rev[idx] || 0) : null;
            const kc = kyc[idx] || 0;
            let msg = `Kỳ ${label}: Chi tiêu ${sp.toFixed(2)} tỷ, KYC mới: ${kc.toLocaleString()}`;
            if (rv !== null) msg += `, Doanh thu: ${rv.toFixed(2)} tỷ`;
            showToast(msg, "success");
          }
        },
        scales: {
          y: {
            position: "left",
            ticks: {
              color: gdTickColor(),
              font: { family: "var(--font-sans)", size: 10, weight: "600" },
              callback: function(val) { return val + " tỷ"; }
            },
            grid: {
              color: "rgba(110, 106, 134, 0.05)",
              borderDash: [5, 5],
              drawBorder: false
            }
          },
          y1: {
            position: "right",
            ticks: {
              color: gdAxisPurple(),
              font: { family: "var(--font-sans)", size: 10, weight: "600" },
              callback: function(val) { return val.toLocaleString() + " KYC"; }
            },
            grid: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: gdTickColor(),
              font: { family: "var(--font-sans)", size: 10 },
              maxRotation: 0,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(26, 24, 37, 0.95)",
            titleFont: { family: "var(--font-sans)", size: 11, weight: "700" },
            bodyFont: { family: "var(--font-sans)", size: 10 },
            padding: 10,
            borderRadius: 8,
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            usePointStyle: true,
            boxWidth: 6,
            boxHeight: 6,
            boxPadding: 4
          }
        }
      }
    });

    // Attach click events for custom legend toggling
    if (legendContainer) {
      const legendCards = legendContainer.querySelectorAll(".kpi-legend-card");
      legendCards.forEach(card => {
        card.addEventListener("click", () => {
          const dsIdx = parseInt(card.getAttribute("data-ds-idx"));
          const chart = meuTsChartRef;
          if (chart) {
            const isVisible = chart.isDatasetVisible(dsIdx);
            chart.setDatasetVisibility(dsIdx, !isVisible);
            chart.update();
            
            if (isVisible) {
              card.style.opacity = "0.45";
              card.style.textDecoration = "line-through";
            } else {
              card.style.opacity = "1";
              card.style.textDecoration = "none";
            }
          }
        });
      });
    }
  }

  function initMeuTimeSeriesToggle() {
    const wb = document.getElementById("meu-ts-weeks"), mb = document.getElementById("meu-ts-months");
    if (wb && !wb._bound) { wb._bound = true; wb.addEventListener("click", () => { meuTsMode = "weeks"; wb.classList.add("active"); if (mb) mb.classList.remove("active"); renderMeuTimeSeries(); }); }
    if (mb && !mb._bound) { mb._bound = true; mb.addEventListener("click", () => { meuTsMode = "months"; mb.classList.add("active"); if (wb) wb.classList.remove("active"); renderMeuTimeSeries(); }); }
  }

  function renderMeuSaturation() {
    const tbody = document.getElementById("meu-saturation-tbody");
    if (!tbody) return;
    const exp = (db.meu && db.meu.exp) || [];
    tbody.innerHTML = exp.map(e => {
      const hist = (e.hist || []).join(" → ");
      const capColor = e.cap >= 45 ? "var(--green)" : e.cap >= 30 ? "var(--amber)" : "var(--coral)";
      const riskColor = e.risk >= 35 ? "var(--coral)" : e.risk >= 20 ? "var(--amber)" : "var(--green)";
      return '<tr><td><strong>' + e.ch + '</strong></td><td style="font-family:monospace;">' + hist + '</td><td style="text-align:center;">' + e.lag + '</td><td style="font-size:11px; color:var(--text2);">' + e.shape + '</td><td style="text-align:center; font-weight:700; color:' + capColor + ';">' + e.cap + '</td><td style="text-align:center; font-weight:700; color:' + riskColor + ';">' + e.risk + '</td><td style="text-align:center;">' + e.cannib + '%</td></tr>';
    }).join("");
  }

  // -------------------------------------------------------------
  // MEU extra datasets wired to existing tabs (RFM, Content, Lifecycle, Activation)
  // -------------------------------------------------------------
  function meuFmt(n) { if (n == null || isNaN(n)) return n; if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + " tỷ"; if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "tr"; return Number(n).toLocaleString(); }

  function renderMeuRfm() {
    const host = document.getElementById("meu-rfm");
    if (!host) return;
    const rfm = (db.meu && db.meu.rfm) || {}, segs = (db.meu && db.meu.rfmSeg) || [];
    const r = rfm.r || [], f = rfm.f || [], m = rfm.m || [];
    const factor = (typeof window !== "undefined" && window.GD_PERIOD_FACTOR > 0) ? window.GD_PERIOD_FACTOR : 1;
    let max = 0; m.forEach(row => row.forEach(v => { const scaledVal = Math.round(v * factor); if (scaledVal > max) max = scaledVal; }));
    let grid = '<table class="growth-table" style="font-size:11px;"><thead><tr><th>Recency \\ Frequency</th>' + f.map(x => "<th>" + x + "</th>").join("") + "</tr></thead><tbody>";
    r.forEach((rl, i) => {
      grid += "<tr><td><strong>" + rl + "</strong></td>" + (m[i] || []).map(v => { const scaledVal = Math.round(v * factor); const a = max ? scaledVal / max : 0; return '<td style="text-align:center; background:rgba(100,84,227,' + (0.05 + a * 0.45).toFixed(2) + '); font-weight:700;">' + scaledVal.toLocaleString() + "</td>"; }).join("") + "</tr>";
    });
    grid += "</tbody></table>";
    const segHtml = segs.map(s => '<div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-color); border-radius:6px; padding:6px 8px;"><strong style="font-size:11px; color:var(--purple);">' + s.seg + '</strong> <span style="font-size:11px; color:var(--text-muted);">· ' + s.def + '</span><div style="font-size:11px; color:var(--text2); margin-top:2px;">→ ' + s.camp + "</div></div>").join("");
    host.innerHTML = '<div style="margin-bottom:8px; overflow:auto;">' + grid + '</div><div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">' + segHtml + "</div>";
  }

  function renderMeuLifecycle() {
    const host = document.getElementById("meu-lifecycle");
    if (!host) return;
    const lc = (db.meu && db.meu.lifecycle) || [];
    const factor = (typeof window !== "undefined" && window.GD_PERIOD_FACTOR > 0) ? window.GD_PERIOD_FACTOR : 1;
    const max = lc.reduce((a, x) => Math.max(a, Math.round((x.u || 0) * factor)), 0) || 1;
    host.innerHTML = lc.map(x => {
      const scaledVal = Math.round((x.u || 0) * factor);
      const w = (scaledVal / max * 100).toFixed(1);
      return '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:11px;"><div style="width:140px; color:var(--text2);">' + x.st + '</div><div style="flex:1; background:rgba(0,0,0,0.05); border-radius:4px; overflow:hidden; height:16px;"><div style="width:' + w + '%; height:100%; background:linear-gradient(90deg,var(--purple),var(--teal));"></div></div><div style="width:72px; text-align:right; font-weight:700; font-family:monospace;">' + scaledVal.toLocaleString() + "</div></div>";
    }).join("");
  }

  function renderMeuContent() {
    const cr = document.getElementById("meu-content-creatives"), hk = document.getElementById("meu-content-hooks");
    const c = (db.meu && db.meu.content) || {};
    const factor = (typeof window !== "undefined" && window.GD_PERIOD_FACTOR > 0) ? window.GD_PERIOD_FACTOR : 1;
    const eff = (typeof window !== "undefined" && window.GD_EFF > 0) ? window.GD_EFF : 1;
    if (cr) cr.innerHTML = (c.creatives || []).map(x => {
      const st = x.stage === "Winning" ? "optimize" : (x.stage === "Fatigue" || x.stage === "Retire") ? "stop" : "test";
      const scaledRevenue = x.revenue * factor * eff;
      return "<tr><td><code>" + x.id + "</code></td><td>" + x.hook + "</td><td>" + x.fmt + '</td><td><span class="badge ' + st + '" style="font-size:11px;">' + x.stage + '</span></td><td style="text-align:right;">' + (x.ctr * 100).toFixed(1) + '%</td><td style="text-align:right; color:var(--green); font-weight:700;">' + meuFmt(scaledRevenue) + '</td><td style="text-align:center;">' + x.freq + "</td></tr>";
    }).join("");
    if (hk) hk.innerHTML = (c.hooks || []).map(x => {
      const scaledCpa = x.cpa / eff;
      const scaledRevenue = x.revenue * factor * eff;
      return "<tr><td><strong>" + x.hook + "</strong></td><td>" + x.cat + "</td><td>" + x.ch + '</td><td style="text-align:right;">' + (x.ctr * 100).toFixed(1) + '%</td><td style="text-align:right;">' + meuFmt(scaledCpa) + '</td><td style="text-align:right; color:var(--green); font-weight:700;">' + meuFmt(scaledRevenue) + "</td></tr>";
    }).join("");
  }

  function renderMeuActivation() {
    const aha = document.getElementById("meu-act-aha"), dep = document.getElementById("meu-act-deposit");
    const a = (db.meu && db.meu.act) || {};
    if (aha) aha.innerHTML = (a.aha || []).map(x => "<tr><td><strong>" + x.ev + '</strong></td><td><span class="badge test" style="font-size:11px;">' + x.type + '</span></td><td style="text-align:center; color:var(--green); font-weight:700;">+' + x.lift + '%</td><td style="text-align:center;">' + x.act + '%</td><td style="text-align:center; color:var(--text-muted);">' + x.avgT + "</td></tr>").join("");
    if (dep) { const max = (a.byDeposit || []).reduce((mm, x) => Math.max(mm, x.rate), 0) || 1; dep.innerHTML = (a.byDeposit || []).map(x => '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:11px;"><div style="width:80px;">' + x.dep + '</div><div style="flex:1; background:rgba(0,0,0,0.05); border-radius:4px; height:14px; overflow:hidden;"><div style="width:' + (x.rate / max * 100) + '%; height:100%; background:var(--teal);"></div></div><div style="width:40px; text-align:right; font-weight:700;">' + x.rate + "%</div></div>").join(""); }
  }

  // -------------------------------------------------------------
  // System Map + Data Input Guide (tab "Sơ đồ & Hướng dẫn")
  // -------------------------------------------------------------
  const TABLABEL = {
    "tab-executive": "Executive", "tab-customer-intel": "Customer Intel", "tab-customer-value": "Customer Value",
    "tab-capital": "Capital", "tab-content": "Content", "tab-governance": "Governance", "tab-team-ops": "Team Ops",
    "tab-growth-strategy": "Growth Strategy", "tab-market-competitor": "Market/Competitor", "tab-product-growth": "Product Growth",
    "tab-experimentation": "Experimentation"
  };
  function navAttr(c) { return "window.switchTab('" + c.tab + "'" + (c.subtab ? (",'" + c.subtab + "'") : "") + ")"; }

  function renderDataGuide() {
    const tbody = document.getElementById("data-guide-tbody");
    if (!tbody) return;
    const g = db.dataGuide || [];
    tbody.innerHTML = g.map(function (c) {
      const loc = TABLABEL[c.tab] || c.tab;
      const nav = navAttr(c);
      return "<tr>"
        + '<td><strong style="color:var(--purple); cursor:pointer;" onclick="' + nav + '">' + c.name + "</strong><div style=\"font-size:11px; color:var(--text-muted);\">→ " + c.produces + "</div></td>"
        + '<td><span class="badge test" style="cursor:pointer;" onclick="' + nav + '">' + loc + "</span></td>"
        + '<td><code style="font-size:11px;">' + c.dataKey + "</code></td>"
        + '<td style="font-size:11px; color:var(--text2);">' + c.fields + "</td>"
        + '<td style="font-size:11px; color:var(--text-muted); font-family:monospace;">' + c.example + "</td>"
        + "</tr>";
    }).join("");
  }

  function renderSystemMap() {
    const host = document.getElementById("system-map");
    if (!host) return;
    const g = db.dataGuide || [];
    function chip(c) {
      return '<div onclick="' + navAttr(c) + '" title="' + c.produces + '" style="cursor:pointer; background:rgba(255,255,255,0.7); border:1px solid var(--border-color); border-radius:6px; padding:5px 8px; margin-top:6px; font-size:11px; font-weight:600; color:var(--text-main);">' + c.name + "</div>";
    }
    const ns = g.find(function (c) { return c.stage === "north"; });
    const nsNav = ns ? ("window.switchTab('" + ns.tab + "')") : "";
    const stages = [
      { k: "acq", label: "1 · Acquisition (Thu hút)", rgb: "6,182,212" },
      { k: "act", label: "2 · Activation (Kích hoạt)", rgb: "100,84,227" },
      { k: "ret", label: "3 · Retention (Giữ chân)", rgb: "14,156,138" },
      { k: "rev", label: "4 · Revenue (Doanh thu)", rgb: "21,128,61" },
      { k: "ref", label: "5 · Referral (Lan truyền)", rgb: "139,92,246" }
    ];
    let html = '<div onclick="' + nsNav + '" style="cursor:pointer; text-align:center; background:linear-gradient(135deg,rgba(100,84,227,0.12),rgba(14,156,138,0.08)); border:1px solid rgba(100,84,227,0.3); border-radius:10px; padding:12px; margin-bottom:4px;">'
      + '<div style="font-size:11px; font-weight:800; color:var(--purple); text-transform:uppercase; letter-spacing:0.05em;">★ North Star Metric</div>'
      + '<div style="font-size:13px; font-weight:700; margin-top:3px; color:var(--text-main);">' + (ns ? ns.name + " — " + ns.produces : "") + "</div></div>"
      + '<div style="text-align:center; color:var(--text-muted); font-size:15px; line-height:1.2;">▼</div>'
      + '<div style="display:flex; align-items:stretch; gap:6px; margin:4px 0; flex-wrap:wrap;">';
    stages.forEach(function (s, i) {
      const items = g.filter(function (c) { return c.stage === s.k; });
      html += '<div style="flex:1; min-width:150px; background:rgba(' + s.rgb + ',0.05); border:1px solid rgba(' + s.rgb + ',0.25); border-radius:10px; padding:10px;">'
        + '<div style="font-size:11px; font-weight:800; text-transform:uppercase; color:rgb(' + s.rgb + ');">' + s.label + "</div>"
        + items.map(chip).join("") + "</div>";
      if (i < stages.length - 1) html += '<div style="display:flex; align-items:center; color:var(--text-muted); font-weight:800;">→</div>';
    });
    html += "</div>";
    const found = g.filter(function (c) { return c.stage === "found"; });
    html += '<div style="text-align:center; color:var(--text-muted); font-size:13px; line-height:1.4;">▲ nền tảng đỡ toàn bộ hành trình ▲</div>'
      + '<div style="background:rgba(0,0,0,0.02); border:1px dashed var(--border-color); border-radius:10px; padding:10px; margin-top:4px;">'
      + '<div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text3); margin-bottom:4px;">Nền tảng &amp; Vận hành (xuyên suốt mọi giai đoạn)</div>'
      + '<div style="display:flex; flex-wrap:wrap; gap:6px;">' + found.map(function (c) {
        return '<div onclick="' + navAttr(c) + '" title="' + c.produces + '" style="cursor:pointer; background:rgba(255,255,255,0.7); border:1px solid var(--border-color); border-radius:6px; padding:5px 8px; font-size:11px; font-weight:600;">' + c.name + "</div>";
      }).join("") + "</div></div>";
    host.innerHTML = html;
    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // Bulk Export / Import + AI prompt (data-guide tab)
  // -------------------------------------------------------------
  const IO_DATASETS = [
    { k: "customers", l: "Khách hàng (customers)" },
    { k: "campaigns", l: "Chiến dịch (campaigns)" },
    { k: "cohortMatrix", l: "Cohort D1-D90 (cohortMatrix)" },
    { k: "opportunityBacklog", l: "Backlog cơ hội (opportunityBacklog)" },
    { k: "teamTasks", l: "Công việc team (teamTasks)" },
    { k: "contentExperimentBacklog", l: "Backlog content ICE" },
    { k: "competitorIntel.competitors", l: "Đối thủ (competitors)" },
    { k: "geopoliticalRegimes", l: "Kịch bản địa chính trị" },
    { k: "economicCalendar", l: "Lịch kinh tế & địa chính trị" },
    { k: "experimentation.pipeline", l: "Thí nghiệm pipeline (ICE)" },
    { k: "meu.weeks", l: "MEU · theo tuần" },
    { k: "meu.months", l: "MEU · theo tháng" },
    { k: "meu.retCohorts", l: "MEU · cohort retention" }
  ];
  let ioFormat = "json";

  function ioGet(key) { return key.split(".").reduce((o, k) => (o ? o[k] : undefined), db); }
  // Mutate arrays IN PLACE so closures (e.g. getAggregatedCampaigns over `campaigns`) stay in sync.
  function ioSet(key, val) {
    const cur = ioGet(key);
    if (Array.isArray(cur) && Array.isArray(val)) { cur.length = 0; for (let i = 0; i < val.length; i++) cur.push(val[i]); return; }
    const p = key.split("."); const last = p.pop(); const parent = p.reduce((o, k) => (o ? o[k] : undefined), db); if (parent) parent[last] = val;
  }

  // ---- localStorage persistence of imported datasets ----
  const DATA_OVERRIDES_KEY = "meu_growth_overrides";
  function ioReadOverrides() { try { return JSON.parse(localStorage.getItem(DATA_OVERRIDES_KEY)) || {}; } catch (e) { return {}; } }
  function ioWriteOverrides(obj) { try { localStorage.setItem(DATA_OVERRIDES_KEY, JSON.stringify(obj)); } catch (e) {} }
  function saveDataOverride(key, arr) { const o = ioReadOverrides(); o[key] = arr; ioWriteOverrides(o); }
  function loadDataOverrides() {
    const o = ioReadOverrides(); let n = 0;
    Object.keys(o).forEach(function (key) { if (Array.isArray(o[key])) { try { ioSet(key, o[key]); n++; } catch (e) {} } });
    return n;
  }
  function ioDownload(filename, content, mime) {
    try {
      if (typeof Blob === "undefined") return false;
      const U = (typeof window !== "undefined" && window.URL) ? window.URL : (typeof URL !== "undefined" ? URL : null);
      if (!U || !U.createObjectURL) return false;
      const blob = new Blob([content], { type: mime || "text/plain" });
      const url = U.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); U.revokeObjectURL(url);
      return true;
    } catch (e) { return false; }
  }
  // ---- Lazy Excel (.xlsx) loader (SheetJS via CDN, only fetched when an Excel file is used) ----
  function loadSheetJS() {
    if (typeof XLSX !== "undefined") return Promise.resolve(XLSX);
    if (loadSheetJS._p) return loadSheetJS._p;
    loadSheetJS._p = new Promise(function (resolve, reject) {
      try {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        s.onload = function () { resolve(window.XLSX); };
        s.onerror = function () { reject(new Error("Không tải được thư viện Excel (cần internet).")); };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
    return loadSheetJS._p;
  }
  function ioSyncFmtButtons() {
    const fmtBar = document.getElementById("io-format");
    if (fmtBar) fmtBar.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-fmt") === ioFormat); });
  }
  // Load a dropped/picked file into the textarea: .xlsx → JSON via SheetJS, else text (json/csv).
  function ioLoadFile(file) {
    const ta = document.getElementById("io-textarea"), status = document.getElementById("io-status");
    if (!file || !ta) return;
    const setStatus = function (msg, color) { if (status) { status.style.color = color || "var(--text-muted)"; status.textContent = msg; } };
    const name = file.name || "";
    if (/\.xlsx?$/i.test(name) || /spreadsheet/i.test(file.type || "")) {
      setStatus("Đang đọc Excel " + name + "…");
      loadSheetJS().then(function (XLSX) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          try {
            const wb = XLSX.read(ev.target.result, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
            ta.value = JSON.stringify(rows, null, 2);
            ioFormat = "json"; ioSyncFmtButtons();
            setStatus("Đã đọc " + rows.length + " dòng từ Excel (sheet '" + wb.SheetNames[0] + "'). Bấm Nhập hoặc Lưu.");
          } catch (e) { setStatus("Lỗi đọc Excel: " + e.message, "var(--coral)"); }
        };
        reader.onerror = function () { setStatus("Không đọc được file Excel.", "var(--coral)"); };
        reader.readAsArrayBuffer(file);
      }).catch(function (e) { setStatus(e.message || "Không tải được thư viện Excel.", "var(--coral)"); });
      return;
    }
    if (typeof FileReader === "undefined") { setStatus("Trình duyệt không hỗ trợ đọc file.", "var(--coral)"); return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
      ta.value = ev.target.result || "";
      if (/\.csv$/i.test(name)) ioFormat = "csv";
      else if (/\.json$/i.test(name)) ioFormat = "json";
      else { const t = (ta.value || "").trim(); ioFormat = (t[0] === "[" || t[0] === "{") ? "json" : "csv"; }
      ioSyncFmtButtons();
      setStatus("Đã đọc file " + name + " (" + ioFormat.toUpperCase() + "). Bấm Nhập hoặc Lưu.");
    };
    reader.readAsText(file);
  }
  // Render the multi-error panel + a downloadable error report (CSV).
  function ioShowErrors(key, errors) {
    const box = document.getElementById("io-errors");
    if (!box) return;
    if (!errors || !errors.length) { box.style.display = "none"; box.innerHTML = ""; return; }
    const show = errors.slice(0, 60);
    box.style.display = "block";
    box.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">' +
        '<b style="color:var(--coral); font-size:12px;">✗ ' + errors.length + ' lỗi dữ liệu — sửa rồi nhập lại:</b>' +
        '<button id="io-err-dl" class="btn btn-secondary btn-small" style="padding:2px 8px; font-size:10px;">Tải báo lỗi (CSV)</button>' +
      '</div>' +
      '<div style="max-height:150px; overflow:auto; font-family:monospace; font-size:11px; line-height:1.65;">' +
        show.map(function (e) { return '• Dòng <b>' + e.row + '</b> · <b>' + e.field + '</b>: ' + e.issue; }).join("<br>") +
        (errors.length > show.length ? '<br>… và ' + (errors.length - show.length) + ' lỗi nữa (xem file báo lỗi).' : "") +
      '</div>';
    const dl = document.getElementById("io-err-dl");
    if (dl) dl.addEventListener("click", function () {
      const csv = "row,field,issue\n" + errors.map(function (e) { return e.row + ',"' + String(e.field).replace(/"/g, '""') + '","' + String(e.issue).replace(/"/g, '""') + '"'; }).join("\n");
      ioDownload("errors_" + key.replace(/[^\w]+/g, "_") + ".csv", csv, "text/csv");
    });
  }

  function updateIoOverrideStatus() {
    const el = document.getElementById("io-override-status");
    if (!el) return;
    const keys = Object.keys(ioReadOverrides());
    el.innerHTML = keys.length
      ? '<i data-lucide="hard-drive" style="width:11px;height:11px;"></i> Đang dùng dữ liệu đã lưu: <strong>' + keys.join(", ") + "</strong>"
      : '<span style="color:var(--text-muted);">Chưa lưu dữ liệu nào vào trình duyệt (đang dùng dữ liệu gốc).</span>';
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function ioToCSV(arr) {
    if (!arr || !arr.length) return "";
    const keys = Object.keys(arr[0]);
    const esc = (v) => { const s = (typeof v === "object" && v !== null) ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [keys.join(",")].concat(arr.map(o => keys.map(k => esc(o[k])).join(","))).join("\n");
  }
  function ioParseCSV(text) {
    const rows = []; let i = 0, field = "", row = [], inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
      else { if (c === '"') inQ = true; else if (c === ",") { row.push(field); field = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; } else field += c; }
      i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.length > 1 || (r[0] && r[0] !== ""));
  }
  function ioFromCSV(text) {
    const rows = ioParseCSV(text.trim()); if (!rows.length) return [];
    const header = rows[0].map(h => h.trim());
    return rows.slice(1).map(r => { const o = {}; header.forEach((h, idx) => { let v = r[idx]; try { v = JSON.parse(v); } catch (e) {} o[h] = v; }); return o; });
  }

  // Validate imported rows against the current dataset's schema — collects ALL
  // errors (missing fields + wrong types), not just the first one.
  function ioValidate(key, arr) {
    const cur = ioGet(key);
    if (!Array.isArray(cur) || !cur.length || !Array.isArray(arr) || !arr.length) return { ok: true, errors: [], extra: [], msg: "" };
    const ref = cur[0];
    const expected = Object.keys(ref);
    const errors = [];
    const allExtra = new Set();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push({ row: i + 1, field: "(dòng)", issue: "không phải đối tượng hợp lệ" });
        continue;
      }
      const got = Object.keys(item);
      expected.forEach(function (k) {
        if (got.indexOf(k) < 0) { errors.push({ row: i + 1, field: k, issue: "thiếu trường bắt buộc" }); return; }
        const expType = typeof ref[k], gotType = typeof item[k];
        if (ref[k] !== null && item[k] !== null && expType !== "object" && gotType !== expType) {
          errors.push({ row: i + 1, field: k, issue: "sai kiểu (cần " + expType + ", nhận " + gotType + ")" });
        }
      });
      got.forEach(function (k) { if (expected.indexOf(k) < 0) allExtra.add(k); });
    }
    const extra = Array.from(allExtra);
    return { ok: errors.length === 0, errors: errors, extra: extra, msg: extra.length ? ("⚠ Trường lạ (vẫn nạp): " + extra.join(", ")) : "" };
  }

  function renderIoTemplate() {
    const host = document.getElementById("io-template-preview");
    const sel = document.getElementById("io-dataset");
    if (!host || !sel) return;
    const key = sel.value;
    const arr = ioGet(key);
    if (!Array.isArray(arr) || !arr.length) { host.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">Không phải mảng dữ liệu.</div>'; return; }
    const keys = Object.keys(arr[0]);
    const rows = arr.slice(0, 2);
    host.innerHTML =
      '<div style="font-size:11px; color:var(--text3); margin-bottom:4px;">Mẫu ' + key + ' — ' + arr.length + ' dòng · ' + keys.length + ' cột (hiện 2 dòng đầu):</div>' +
      '<table class="growth-table" style="font-size:11px;"><thead><tr>' + keys.map(k => "<th>" + k + "</th>").join("") + "</tr></thead><tbody>" +
      rows.map(o => "<tr>" + keys.map(k => { let v = o[k]; if (typeof v === "object" && v !== null) v = JSON.stringify(v); v = String(v); if (v.length > 24) v = v.slice(0, 22) + "…"; return '<td style="white-space:nowrap;">' + v + "</td>"; }).join("") + "</tr>").join("") +
      "</tbody></table>";
  }

  function buildAiPrompt(key, arr) {
    const fields = (arr && arr.length) ? Object.keys(arr[0]) : [];
    const sample = (arr || []).slice(0, 2);
    return [
      "Bạn là trợ lý cập nhật dữ liệu cho OT Growth Operations Dashboard.",
      "Hãy tạo MỘT MẢNG JSON cho khóa dữ liệu `" + key + "` với ĐÚNG các trường sau (giữ nguyên tên, đúng kiểu):",
      "  " + fields.join(", "),
      "Quy tắc: số viết dạng number (không bọc nháy); chuỗi bọc nháy kép; đơn vị/định dạng theo mẫu; không thêm hay bớt trường.",
      "Đây là 2 dòng mẫu đúng định dạng cần xuất:",
      JSON.stringify(sample, null, 2),
      "Chỉ xuất JSON hợp lệ (một mảng các object), KHÔNG kèm giải thích hay markdown."
    ].join("\n");
  }

  function refreshActiveDashboardViews() {
    try { renderDatabaseExplorer(); } catch(e){}
    try { renderCapitalTab(); } catch(e){}
    try { renderCustomerTab(); } catch(e){}
    try { renderMeuContent(); } catch(e){}
    try { renderMeuActivation(); } catch(e){}
    try { if (typeof renderOkrTree === "function") renderOkrTree(); } catch(e){}
    try { if (typeof updateCapitalHealthScore === "function") updateCapitalHealthScore(); } catch(e){}
    try { if (typeof renderNorthStar === "function") renderNorthStar(); } catch(e){}
    try { if (typeof checkAlerts === "function") checkAlerts(); } catch(e){}
    try { if (typeof computeGrowthHealth === "function") computeGrowthHealth(); } catch(e){}
    
    // Core KPIs and active views updates to link everything dynamically
    try { if (typeof updateCoreKpis === "function") updateCoreKpis(); } catch(e){}
    try { if (typeof handleTabActivation === "function" && typeof activeTab !== "undefined") handleTabActivation(activeTab); } catch(e){}
  }

  function initIoSection() {
    const sel = document.getElementById("io-dataset");
    if (!sel) return;
    const ta = document.getElementById("io-textarea"), status = document.getElementById("io-status");
    
    // Drag & Drop listeners for #io-textarea to load files automatically
    if (ta && !ta._dragBound) {
      ta._dragBound = true;
      ta.addEventListener("dragenter", (e) => {
        e.preventDefault();
        ta.style.borderColor = "var(--purple)";
        ta.style.background = "rgba(102, 85, 230, 0.05)";
      });
      ta.addEventListener("dragover", (e) => {
        e.preventDefault();
        ta.style.borderColor = "var(--purple)";
        ta.style.background = "rgba(102, 85, 230, 0.05)";
      });
      ta.addEventListener("dragleave", (e) => {
        e.preventDefault();
        ta.style.borderColor = "";
        ta.style.background = "";
      });
      ta.addEventListener("drop", (e) => {
        e.preventDefault();
        ta.style.borderColor = "";
        ta.style.background = "";
        const files = e.dataTransfer.files;
        if (files && files.length > 0) ioLoadFile(files[0]);
      });
    }
    
    function handleDatasetChange() {
      renderIoTemplate();
      const key = sel.value, arr = ioGet(key);
      if (ta && Array.isArray(arr)) {
        ta.value = ioFormat === "csv" ? ioToCSV(arr) : JSON.stringify(arr, null, 2);
      }
    }

    if (!sel._filled) {
      sel._filled = true;
      sel.innerHTML = IO_DATASETS.map(d => '<option value="' + d.k + '">' + d.l + "</option>").join("");
      sel.value = IO_DATASETS[0].k;
      sel.addEventListener("change", handleDatasetChange);
    }
    const fmtBar = document.getElementById("io-format");
    if (fmtBar && !fmtBar._bound) {
      fmtBar._bound = true;
      fmtBar.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        fmtBar.querySelectorAll("button").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); 
        ioFormat = b.getAttribute("data-fmt");
        handleDatasetChange();
      }));
    }
    const exp = document.getElementById("io-export");
    if (exp && !exp._bound) {
      exp._bound = true;
      exp.addEventListener("click", () => {
        const key = sel.value, arr = ioGet(key);
        if (!Array.isArray(arr)) { if (status) status.textContent = "Khóa này không phải mảng."; return; }
        ta.value = ioFormat === "csv" ? ioToCSV(arr) : JSON.stringify(arr, null, 2);
        if (status) status.textContent = "Đã xuất " + arr.length + " dòng (" + ioFormat.toUpperCase() + "). Sửa số liệu rồi bấm Nhập để nạp lại.";
      });
    }
    const imp = document.getElementById("io-import");
    if (imp && !imp._bound) {
      imp._bound = true;
      imp.addEventListener("click", () => {
        const key = sel.value; let parsed;
        try { const t = ta.value.trim(); parsed = (ioFormat === "csv" && t[0] !== "[") ? ioFromCSV(t) : JSON.parse(t); }
        catch (e) { if (status) { status.style.color = "var(--coral)"; status.textContent = "Lỗi định dạng: " + e.message; } return; }
        if (!Array.isArray(parsed)) { if (status) { status.style.color = "var(--coral)"; status.textContent = "Dữ liệu phải là một mảng."; } return; }
        const v = ioValidate(key, parsed);
        if (!v.ok) { ioShowErrors(key, v.errors); if (status) { status.style.color = "var(--coral)"; status.textContent = "✗ " + v.errors.length + " lỗi schema — chưa nạp (xem danh sách bên dưới)."; } return; }
        ioShowErrors(key, []);
        const appendMode = !!(document.getElementById("io-append") && document.getElementById("io-append").checked);
        const finalArr = (appendMode && Array.isArray(ioGet(key))) ? ioGet(key).slice().concat(parsed) : parsed;
        ioSet(key, finalArr);
        renderIoTemplate();
        refreshActiveDashboardViews();
        const mode = appendMode ? "nối thêm" : "thay thế";
        if (typeof showToast === "function") showToast("Đã " + mode + " " + parsed.length + " dòng vào " + key + (v.msg ? " (" + v.msg + ")" : ""), "success");
        try { addAuditLogEntry(currentPersona, "Nhập dữ liệu hàng loạt: " + key, mode + " " + parsed.length + " dòng (phiên hiện tại)"); } catch (e) {}
        if (status) { status.style.color = "var(--green)"; status.textContent = "✓ Đã " + mode + " " + parsed.length + " dòng → `" + key + "` còn " + finalArr.length + " dòng (bộ nhớ phiên)."; }
      });
    }
    const pr = document.getElementById("io-prompt");
    if (pr && !pr._bound) {
      pr._bound = true;
      pr.addEventListener("click", () => {
        const key = sel.value, arr = ioGet(key);
        ta.value = buildAiPrompt(key, Array.isArray(arr) ? arr : []);
        if (status) { status.style.color = "var(--text-muted)"; status.textContent = "Đã tạo prompt — copy đưa cho AI, rồi dán JSON kết quả vào ô này và bấm Nhập."; }
      });
    }
    const dl = document.getElementById("io-download");
    if (dl && !dl._bound) {
      dl._bound = true;
      dl.addEventListener("click", () => {
        const key = sel.value, arr = ioGet(key);
        if (!Array.isArray(arr)) return;
        let content = (ta.value && ta.value.trim()) ? ta.value : (ioFormat === "csv" ? ioToCSV(arr) : JSON.stringify(arr, null, 2));
        const fname = key.replace(/[^\w]+/g, "_") + "." + (ioFormat === "csv" ? "csv" : "json");
        const ok = ioDownload(fname, content, ioFormat === "csv" ? "text/csv" : "application/json");
        if (status) { status.style.color = ok ? "var(--green)" : "var(--coral)"; status.textContent = ok ? "✓ Đã tải file " + fname : "Trình duyệt không hỗ trợ tải file ở môi trường này."; }
      });
    }
    const sv = document.getElementById("io-save");
    if (sv && !sv._bound) {
      sv._bound = true;
      sv.addEventListener("click", () => {
        const key = sel.value; let parsed;
        try { const t = ta.value.trim(); parsed = (ioFormat === "csv" && t[0] !== "[") ? ioFromCSV(t) : JSON.parse(t); }
        catch (e) { if (status) { status.style.color = "var(--coral)"; status.textContent = "Lỗi định dạng: " + e.message + " — bấm Xuất trước, sửa rồi Lưu."; } return; }
        if (!Array.isArray(parsed)) { if (status) { status.style.color = "var(--coral)"; status.textContent = "Dữ liệu phải là một mảng."; } return; }
        const vs = ioValidate(key, parsed);
        if (!vs.ok) { ioShowErrors(key, vs.errors); if (status) { status.style.color = "var(--coral)"; status.textContent = "✗ " + vs.errors.length + " lỗi schema — chưa lưu (xem danh sách bên dưới)."; } return; }
        ioShowErrors(key, []);
        const appendMode = !!(document.getElementById("io-append") && document.getElementById("io-append").checked);
        const finalArr = (appendMode && Array.isArray(ioGet(key))) ? ioGet(key).slice().concat(parsed) : parsed;
        ioSet(key, finalArr); saveDataOverride(key, finalArr); renderIoTemplate(); updateIoOverrideStatus();
        refreshActiveDashboardViews();
        const mode = appendMode ? "nối thêm" : "thay thế";
        if (typeof showToast === "function") showToast("Đã lưu (" + mode + ") " + parsed.length + " dòng `" + key + "` vào trình duyệt", "success");
        try { addAuditLogEntry(currentPersona, "Lưu dữ liệu vào trình duyệt: " + key, mode + " " + parsed.length + " dòng, bền vững qua reload"); } catch (e) {}
        if (status) { status.style.color = "var(--green)"; status.textContent = "✓ Đã " + mode + " + LƯU `" + key + "` (" + finalArr.length + " dòng) — giữ nguyên khi tải lại trang."; }
      });
    }
    const rs = document.getElementById("io-reset");
    if (rs && !rs._bound) {
      rs._bound = true;
      rs.addEventListener("click", () => {
        if (typeof confirm === "function" && !confirm("Xóa toàn bộ dữ liệu đã lưu trong trình duyệt và quay về dữ liệu gốc? (cần tải lại trang)")) return;
        try { localStorage.removeItem(DATA_OVERRIDES_KEY); } catch (e) {}
        updateIoOverrideStatus();
        refreshActiveDashboardViews();
        if (typeof showToast === "function") showToast("Đã xóa dữ liệu lưu trong trình duyệt. Tải lại trang để về mặc định.", "info");
        if (status) { status.style.color = "var(--text-muted)"; status.textContent = "Đã xóa overrides. Tải lại trang (F5) để khôi phục dữ liệu gốc."; }
      });
    }
    const fbtn = document.getElementById("io-file-btn"), finput = document.getElementById("io-file");
    if (fbtn && finput && !fbtn._bound) {
      fbtn._bound = true;
      fbtn.addEventListener("click", () => { try { finput.click(); } catch (e) {} });
      finput.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) ioLoadFile(f);
      });
    }
    updateIoOverrideStatus();
    handleDatasetChange();
  }

  // Compute Growth Health sub-scores from LIVE data (replaces the old hardcoded 88/82/78/84/68).
  function computeGrowthHealth() {
    const w = db.configs.weights;
    const bm = db.configs.benchmarks || {};
    const th = db.configs.thresholds || {};
    const clamp = (v) => Math.max(5, Math.min(100, Math.round(v)));
    const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

    // Growth: revenue momentum (2nd half vs 1st half of the daily series)
    let scoreGrowth = 70;
    try {
      const daily = (db.getDailyRevenue ? db.getDailyRevenue(execTimeframeDays) : []).map(d => d.Revenue);
      if (daily.length >= 4) {
        const hh = Math.floor(daily.length / 2);
        const a1 = avg(daily.slice(0, hh)), a2 = avg(daily.slice(hh));
        scoreGrowth = clamp(65 + (a1 > 0 ? (a2 - a1) / a1 : 0) * 220);
      }
    } catch (e) {}

    // Profitability: blended LTV:CAC vs target
    let scoreProfit = 70;
    try {
      const s = db.getAggregatedCampaigns();
      const ltvcac = s.CAC > 0 ? s.LTV / s.CAC : 0;
      scoreProfit = clamp((ltvcac / (bm.targetLtvCac || 3.5)) * 85);
    } catch (e) {}

    // Retention: latest cohort D30
    let scoreRet = 70;
    try {
      const cohorts = (db.cohortMatrix || []).filter(c => c.d30 != null);
      const d30 = cohorts.length ? cohorts[cohorts.length - 1].d30 : 0;
      scoreRet = clamp((d30 / 25) * 100);
    } catch (e) {}

    // Capital efficiency: average payback months (lower is better)
    let scoreCapEff = 75;
    try {
      const pb = getFilteredCustomers().map(c => c.PaybackMonths).filter(x => typeof x === "number" && x > 0);
      if (pb.length) scoreCapEff = clamp(115 - avg(pb) * 11);
    } catch (e) {}

    // Risk: whale revenue concentration (higher concentration -> lower score)
    let scoreRisk = 65;
    try {
      const cs = getFilteredCustomers();
      const totalRev = cs.reduce((a, c) => a + (c.Revenue || 0), 0);
      const whaleRev = cs.filter(c => c.Segment === "Whale").reduce((a, c) => a + (c.Revenue || 0), 0);
      const conc = totalRev > 0 ? (whaleRev / totalRev) * 100 : 0;
      scoreRisk = clamp(100 - Math.max(0, conc - ((th.whaleConcentrationPct || 40) - 10)) * 2.5);
    } catch (e) {}

    const overall = Math.round(
      scoreGrowth * w.growth + scoreProfit * w.profitability + scoreRet * w.retention +
      scoreCapEff * w.capitalEfficiency + scoreRisk * w.risk
    );
    const ovOverall = (typeof getMetricOverride === "function") ? getMetricOverride("growth_health") : null;
    const finalOverall = ovOverall !== null ? Math.round(ovOverall) : overall;
    return { overall: finalOverall, scoreGrowth, scoreProfit, scoreRet, scoreCapEff, scoreRisk };
  }

  // North Star Metric + input-metric tree (all computed from live funnel/cohort/customers)
  function renderNorthStar() {
    const host = document.getElementById("north-star-metric");
    if (!host) return;
    const ns = db.northStar; if (!ns) return;
    const aj = (db.productGrowth && db.productGrowth.activationJourney) || [];
    const stepCount = (name) => { const s = aj.find(x => x.step === name); return s ? s.count : 0; };
    const install = stepCount("App Installed"), kyc = stepCount("KYC Submitted"),
          ftd = stepCount("First Deposit"), trade = stepCount("First Trade Completed");
    const cohorts = (db.cohortMatrix || []).filter(c => c.d30 != null);
    const d30 = cohorts.length ? cohorts[cohorts.length - 1].d30 : 0;
    const trades = getFilteredCustomers().map(c => c.Trade_Count).filter(x => typeof x === "number");
    const freq = trades.length ? (trades.reduce((a, b) => a + b, 0) / trades.length) : 0;
    // cây Input Metrics cũng dịch theo kỳ: tỉ lệ × hiệu suất, tần suất tăng theo kỳ (khớp installKyc/funnel/tradesUser)
    const _eff = (typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    const _pf = (typeof gdPeriodFactor === "function" ? gdPeriodFactor() : 1);
    const driverVals = { activation: (install ? (kyc / install * 100) : 0) * _eff, ftd: (kyc ? (ftd / kyc * 100) : 0) * _eff, retention: d30 * _eff, frequency: freq * Math.pow(_pf, 0.5) };

    const nsmValue = trade;                          // apex = end of the activation funnel chain
    const pct = ns.target ? Math.min(100, Math.round(nsmValue / ns.target * 100)) : 0;

    const driverHtml = (ns.drivers || []).map(d => {
      const v = driverVals[d.key] || 0;
      const ok = v >= d.target;
      const ratio = d.target ? Math.min(100, v / d.target * 100) : 0;
      return `<div style="flex:1; min-width:150px; background:rgba(255,255,255,0.45); border:1px solid var(--border-color); border-radius:8px; padding:10px 12px;">
        <div style="font-size:11px; color:var(--text3); font-weight:700;">${d.name}</div>
        <div style="display:flex; align-items:baseline; gap:6px; margin:2px 0 6px 0;">
          <span style="font-size:18px; font-weight:800; color:${ok ? 'var(--green)' : 'var(--purple)'};">${v.toFixed(1)}${d.suffix || ''}</span>
          <span style="font-size:11px; color:var(--text-muted);">/ ${d.target}${d.suffix || ''}</span>
        </div>
        <div style="height:5px; background:rgba(0,0,0,0.06); border-radius:3px; overflow:hidden;"><div style="width:${ratio}%; height:100%; background:${ok ? 'var(--green)' : 'var(--purple)'}; border-radius:3px;"></div></div>
      </div>`;
    }).join("");

    host.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px;">
        <div>
          <div style="display:flex; align-items:center; gap:7px; font-size:11px; font-weight:800; color:var(--purple); text-transform:uppercase; letter-spacing:0.05em;">
            <i data-lucide="star" style="width:14px; height:14px;"></i> North Star Metric
          </div>
          <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-top:4px;">${ns.metric}</div>
          <div style="font-size:11px; color:var(--text2); margin-top:2px; max-width:520px;">${ns.definition}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:30px; font-weight:800; color:var(--purple); line-height:1;">${nsmValue.toLocaleString()}</div>
          <div style="font-size:11px; color:var(--text-muted);">/ mục tiêu ${ns.target.toLocaleString()} ${ns.unit} &middot; <strong style="color:${pct >= 100 ? 'var(--green)' : 'var(--text2)'};">${pct}%</strong></div>
        </div>
      </div>
      <div style="height:6px; background:rgba(0,0,0,0.06); border-radius:4px; overflow:hidden; margin:12px 0;"><div style="width:${pct}%; height:100%; background:linear-gradient(90deg,var(--purple),var(--teal)); border-radius:4px;"></div></div>
      <div style="font-size:11px; font-weight:800; color:var(--text3); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">Cây chỉ số đầu vào (Input Metrics) &rarr; NSM = Kích hoạt × FTD × Giữ chân × Tần suất</div>
      <div style="display:flex; flex-wrap:wrap; gap:10px;">${driverHtml}</div>
    `;
    lucide.createIcons();
  }

  function calculateHealthScores() {
    const overallScore = computeGrowthHealth().overall;

    // Update GUI
    setRadialGauge("growth-health-circle", overallScore);
    const labelEl = document.getElementById("growth-health-label");
    if (labelEl) {
      if (overallScore >= 80) {
        labelEl.textContent = "EXCELLENT HEALTH";
        labelEl.style.color = "var(--green)";
      } else if (overallScore >= 70) {
        labelEl.textContent = "HEALTHY";
        labelEl.style.color = "var(--purple)";
      } else {
        labelEl.textContent = "NEEDS ATTENTION";
        labelEl.style.color = "var(--coral)";
      }
    }
    updateCoreKpis();
    try { renderHealthBreakdown(); } catch (e) { console.error("renderHealthBreakdown:", e); }
  }

  // 5 thành phần điểm sức khỏe (lấp đầy card Growth Health + cho biết điều gì kéo điểm)
  function renderHealthBreakdown() {
    const host = document.getElementById("growth-health-breakdown");
    if (!host) return;
    const h = computeGrowthHealth();
    const dims = [
      { label: "Tăng trưởng", v: h.scoreGrowth },
      { label: "Lợi nhuận", v: h.scoreProfit },
      { label: "Giữ chân", v: h.scoreRet },
      { label: "Hiệu quả vốn", v: h.scoreCapEff },
      { label: "Rủi ro", v: h.scoreRisk }
    ];
    const color = v => v >= 80 ? "var(--green)" : v >= 60 ? "var(--purple)" : v >= 40 ? "var(--amber)" : "var(--coral)";
    host.innerHTML = dims.map(function (d) {
      const v = Math.round(d.v || 0);
      return '<div class="gh-dim"><span class="gh-dim-lbl">' + d.label + '</span>'
        + '<span class="gh-dim-track"><span class="gh-dim-fill" style="width:' + v + '%; background:' + color(v) + '"></span></span>'
        + '<span class="gh-dim-val" style="color:' + color(v) + '">' + v + '</span></div>';
    }).join("");
  }

  // Đồng bộ nhãn kỳ "vs Nd" + % xu hướng cho các thẻ KPI theo khung thời gian đang chọn.
  // (Trước đây nhãn "vs 30d" bị hard-code trong HTML nên không đổi khi chuyển thời gian.)
  function syncPeriodTrendBadges() {
    const pdays = (typeof execTimeframeDays === "number" && execTimeframeDays > 0) ? execTimeframeDays : 30;
    const peff = (window.GD_EFF > 0 ? window.GD_EFF : 1);
    const setBadge = (id, basePct, up) => {
      const el = document.getElementById(id); if (!el) return;
      const pct = basePct / peff;   // kỳ ngắn (eff>1) → nhỏ hơn; kỳ dài (eff<1) → lớn hơn
      el.innerHTML = '<i data-lucide="' + (up ? "trending-up" : "trending-down") + '"></i> ' + (up ? "+" : "-") + Math.abs(pct).toFixed(1) + "% vs " + pdays + "d";
    };
    setBadge("kpi-revenue-trend", 12.5, true);
    setBadge("kpi-kyc-trend", 15.3, true);
    setBadge("kpi-ltvcac-trend", 18.7, true);
    setBadge("kpi-cackyc-trend", 8.3, false);
    setBadge("kpi-roas-trend", 21.4, true);
    const accSub = document.getElementById("exec-revenue-subtitle");
    if (accSub) accSub.textContent = "Vùng tích lũy " + pdays + " ngày";
    // Quét chung: mọi thẻ .kpi-trend khác còn ghi "vs <n>d" → đổi sang kỳ hiện tại (đồng bộ toàn hệ thống)
    [].forEach.call(document.querySelectorAll(".kpi-trend"), (el) => {
      if (el.id && /^kpi-(revenue|kyc|ltvcac|cackyc|roas)-trend$/.test(el.id)) return;
      if (/vs \d+d/.test(el.innerHTML)) el.innerHTML = el.innerHTML.replace(/vs \d+d/g, "vs " + pdays + "d");
    });
    if (window.lucide && lucide.createIcons) { try { lucide.createIcons(); } catch (e) {} }
  }

  function updateCoreKpis() {
    const stats = db.getAggregatedCampaigns();   // đã scale theo kỳ ở tầng dữ liệu (getAggregatedCampaigns)

    const revenueEl = document.getElementById("kpi-revenue");
    if (revenueEl) revenueEl.textContent = `$${Math.round(stats.Revenue).toLocaleString()}`;
    
    const ltvcacEl = document.getElementById("kpi-ltvcac");
    if (ltvcacEl) ltvcacEl.textContent = `${(stats.LTV / stats.CAC).toFixed(2)}x`;
    
    const kycncEl = document.getElementById("kpi-kycnc");
    if (kycncEl) kycncEl.textContent = Math.round(stats.KYC).toLocaleString();
    
    const cackycEl = document.getElementById("kpi-cackyc");
    if (cackycEl) cackycEl.textContent = `$${stats.CAC.toFixed(2)}`;
    
    const cvrEl = document.getElementById("kpi-cvr");
    if (cvrEl) {
      // CANONICAL Install→KYC: dùng CHUNG một nguồn với cây Input Metrics + tóm tắt persona
      // (activationJourney: KYC Submitted ÷ App Installed) để KHÔNG lệch số giữa các thẻ.
      const aj = (db.productGrowth && db.productGrowth.activationJourney) || [];
      const sc = (n) => { const s = aj.find(x => x.step === n); return s ? s.count : 0; };
      const inst = sc("App Installed"), kycSub = sc("KYC Submitted");
      const ik = (window.GD_KPI && window.GD_KPI.installKyc) || (inst ? (kycSub / inst * 100) : 0);
      cvrEl.textContent = ik.toFixed(1) + "%";
    }

    const roasEl = document.getElementById("kpi-roas");
    if (roasEl) roasEl.textContent = `${(stats.Revenue / stats.Spend).toFixed(2)}x`;

    // Update the values in the Top Summary Panel (live health, same engine as the gauge)
    const topHealthEl = document.getElementById("topbar-summary-health");
    if (topHealthEl) {
      topHealthEl.textContent = `${computeGrowthHealth().overall}/100`;
    }

    const topLtvCacEl = document.getElementById("topbar-summary-ltvcac");
    if (topLtvCacEl) {
      const ovLtvCac = (typeof getMetricOverride === "function") ? getMetricOverride("ltv_cac_ratio") : null;
      topLtvCacEl.textContent = `${ovLtvCac !== null ? ovLtvCac.toFixed(1) + "x" : (stats.LTV / stats.CAC).toFixed(2) + "x"}`;
    }

    try { syncPeriodTrendBadges(); } catch (e) {}
  }

  // -------------------------------------------------------------
  // Alert Center Logic
  // -------------------------------------------------------------
  function checkAlerts() {
    const t = db.configs.thresholds;
    const container = document.getElementById("alert-list-container");
    if (!container) return;

    container.innerHTML = "";
    let alerts = [];

    // All observations below are COMPUTED from live data (were hardcoded constants)
    const stats = db.getAggregatedCampaigns();
    const daily = (db.getDailyRevenue ? db.getDailyRevenue(execTimeframeDays) : []).map(d => d.Revenue);
    const customers = getFilteredCustomers();
    const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

    // Check 1: Revenue momentum (2nd half vs 1st half of the daily series)
    if (daily.length >= 4) {
      const hh = Math.floor(daily.length / 2);
      const a1 = avg(daily.slice(0, hh)), a2 = avg(daily.slice(hh));
      const revenueDrop = a1 > 0 ? Math.round((a1 - a2) / a1 * 100) : 0;
      if (revenueDrop > t.revenueDecreasePct) {
        alerts.push({ type: "danger", title: "Doanh thu sụt giảm mạnh", desc: `Doanh thu nửa cuối kỳ giảm ${revenueDrop}% so với nửa đầu, vượt ngưỡng ${t.revenueDecreasePct}%.` });
      }
    }

    // Check 2: CAC surge — worst campaign CAC vs blended CAC
    let worstCac = null;
    getFilteredCampaigns().forEach(c => { if (c.KYC > 0) { const cac = c.Spend / c.KYC; if (!worstCac || cac > worstCac.cac) worstCac = { id: c.Campaign_ID, ch: c.Channel, cac }; } });
    if (worstCac && stats.CAC > 0) {
      const cacSurge = Math.round((worstCac.cac - stats.CAC) / stats.CAC * 100);
      if (cacSurge >= t.cacIncreasePct) {
        alerts.push({ type: "danger", title: "Chi phí CAC tăng đột biến", desc: `CAC của ${worstCac.ch} (${worstCac.id}) là $${worstCac.cac.toFixed(2)}, cao hơn CAC trung bình ${cacSurge}% — vượt ngưỡng ${t.cacIncreasePct}%.` });
      }
    }

    // Check 3: Whale concentration — from customer revenue
    const totalRev = customers.reduce((a, c) => a + (c.Revenue || 0), 0);
    const whaleRev = customers.filter(c => c.Segment === "Whale").reduce((a, c) => a + (c.Revenue || 0), 0);
    const whaleConcentration = totalRev > 0 ? Math.round(whaleRev / totalRev * 1000) / 10 : 0;
    if (whaleConcentration > t.whaleConcentrationPct) {
      alerts.push({ type: "warning", title: "Whale Concentration rủi ro", desc: `Whale chiếm ${whaleConcentration}% tổng doanh thu, vượt mức an toàn ${t.whaleConcentrationPct}%.` });
    }

    // Check 4: Low/negative ROI campaign
    let minRoiCamp = null;
    getFilteredCampaigns().forEach(c => { if (!minRoiCamp || c.ROI < minRoiCamp.ROI) minRoiCamp = c; });
    if (minRoiCamp && minRoiCamp.ROI < 1.0) {
      alerts.push({ type: "danger", title: "Chiến dịch ROI cận biên thấp", desc: `${minRoiCamp.Channel} (${minRoiCamp.Campaign_ID}) chỉ đạt ROI ${minRoiCamp.ROI.toFixed(2)}x — cân nhắc tạm dừng/tối ưu.` });
    }

    // Check 5: CVR vs target benchmark (real Install→KYC)
    const cvr = stats.Install > 0 ? stats.KYC / stats.Install : 0;
    const targetCvr = (db.configs.benchmarks && db.configs.benchmarks.targetCvr) || 0.35;
    if (cvr < targetCvr) {
      alerts.push({ type: "warning", title: "Tỷ lệ chuyển đổi KYC dưới mục tiêu", desc: `CVR Install→KYC hiện ${(cvr * 100).toFixed(1)}%, dưới mục tiêu ${(targetCvr * 100).toFixed(0)}%.` });
    }

    alerts = alerts.concat(simulatedAlerts);

    alerts.forEach(alert => {
      const item = document.createElement("div");
      item.className = `alert-item ${alert.type}`;
      const iconName = alert.type === "danger" ? "alert-octagon" : "alert-triangle";
      
      item.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <div class="alert-text-container">
          <div class="alert-title">${alert.title}</div>
          <div class="alert-desc">${alert.desc}</div>
        </div>
      `;
      container.appendChild(item);
    });

    const badge = document.getElementById("alert-badge-count");
    if (badge) {
      badge.textContent = `${alerts.length} Cảnh báo`;
      badge.className = alerts.length > 2 ? "badge stop" : "badge test";
    }

    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // Audit Logs Renderer
  // -------------------------------------------------------------
  function renderAuditLogs() {
    const tbody = document.getElementById("audit-log-tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    db.auditLogs.slice().reverse().forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color: var(--text3);">${log.timestamp}</td>
        <td><strong>${log.user}</strong></td>
        <td>${log.change}</td>
        <td><span style="color: var(--purple); font-weight:700;">${log.impact}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function addAuditLogEntry(user, change, impact) {
    const now = new Date();
    const timeStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 8);
    db.auditLogs.push({
      timestamp: timeStr,
      user: user,
      change: change,
      impact: impact
    });
    renderAuditLogs();
  }

  // -------------------------------------------------------------
  // Tab Navigation Controller
  // -------------------------------------------------------------
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const activeNav = document.querySelector(".nav-item.active");
      if (activeNav) activeNav.classList.remove("active");

      const activePane = document.querySelector(".tab-pane.active");
      if (activePane) activePane.classList.remove("active");

      item.classList.add("active");
      activeTab = item.getAttribute("data-tab");
      
      try { localStorage.setItem("gd_active_tab", activeTab); } catch(e) {}
      
      const targetPane = document.getElementById(activeTab);
      if (targetPane) targetPane.classList.add("active");

      // Header trên dùng tiếng ANH (data-title) cho gọn & không trùng với sidebar tiếng Việt
      const spanEl = item.querySelector("span");
      const titleText = item.getAttribute("data-title") || (spanEl ? spanEl.textContent : "");
      const headerTitleEl = document.getElementById("main-header-title");
      if (headerTitleEl) headerTitleEl.textContent = titleText;

      try {
        handleTabActivation(activeTab);
      } catch (e) {
        console.error("Error activating tab " + activeTab + ":", e);
      }
    });
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-subtab]");
    if (btn) {
      const subtabId = btn.getAttribute("data-subtab");
      const currentActiveTab = document.querySelector(".nav-item.active")?.getAttribute("data-tab");
      if (currentActiveTab && subtabId) {
        try {
          localStorage.setItem("gd_active_subtab_" + currentActiveTab, subtabId);
        } catch(err) {}
      }
    }
  });

  window.switchTab = function(tabId, subtabId) {
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const isJxaTest = (typeof window === "undefined" || typeof window.location === "undefined" || !window.location.href);
    if (navItem && (navItem.style.display !== "none" || isJxaTest)) {
      navItem.click();
    }
    if (subtabId) {
      const subtabBtn = document.querySelector(`button[data-subtab="${subtabId}"]`);
      if (subtabBtn) {
        subtabBtn.click();
      }
    }
  };

  // -------------------------------------------------------------
  // Subtabs Controllers: Acquisition, Customer, Capital, Governance
  // -------------------------------------------------------------
  let activeAcqSubtab = "acq-subtab-performance";
  let activeCustSubtab = "cust-subtab-segments";
  let activeCapSubtab = "cap-subtab-forecasting";
  let activeGovSubtab = "gov-subtab-configs";

  let acquisitionInitialized = false;
  let customerInitialized = false;
  let capitalInitialized = false;
  let governanceInitialized = false;

  window.initAcquisitionTab = function() {
    if (!acquisitionInitialized) {
      const container = document.getElementById("acq-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeAcqSubtab = target;
            
            document.querySelectorAll(".acq-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderAcquisitionSubpanes();
          });
        });
      }
      
      // Bind Acquisition attribution model radio buttons
      const selector = document.getElementById("acq-attribution-selector");
      if (selector) {
        selector.querySelectorAll("input[name='acq-attr-model']").forEach(radio => {
          radio.onchange = (e) => {
            renderAttributionEngine(e.target.value, "acq");
          };
        });
      }

      // Bind UTM Hygiene buttons
      const utmBtnSimulate = document.getElementById("utm-btn-simulate");
      if (utmBtnSimulate) {
        utmBtnSimulate.onclick = () => {
          const now = new Date();
          const timeStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 8);
          const mockUrls = [
            "https://growthapp.vn?utm_source=fb&utm_medium=banner-ads&utm_campaign=vn_install_2026",
            "https://growthapp.vn/signup?utm_source=tiktokads&utm_medium=video&utm_campaign=draft_123",
            "https://growthapp.vn/kyc?utm_source=gg&utm_medium=paid&utm_campaign=acquisition_beginner_v2",
            "https://growthapp.vn?source=meta&medium=paid_social&campaign=vietnam_promo",
            "https://growthapp.vn?utm_source=google&utm_medium=search&utm_campaign=brand_keyword&utm_content=textlink_revised"
          ];
          const mockIssues = [
            "Medium 'banner-ads' không hợp lệ (phải nằm trong whitelist: paid_social, paid_search, influencer, etc.)",
            "Campaign format không chuẩn (yêu cầu format: Quốc gia_Mục tiêu_Nhóm nội dung_Thời gian)",
            "Source 'gg' không nằm trong whitelist, thiếu utm_ campaign và utm_ content",
            "Thiếu tiền tố utm_ trên tất cả các query parameters",
            "Thiếu trường utm_term bắt buộc đối với phương tiện paid_search"
          ];
          const idx = Math.floor(Math.random() * mockUrls.length);
          db.utmViolations.unshift({
            timestamp: timeStr,
            url: mockUrls[idx],
            issue: mockIssues[idx],
            volume: Math.floor(10 + Math.random() * 200),
            status: "Active"
          });
          addAuditLogEntry(currentPersona, `Giả lập vi phạm UTM mới: "${mockUrls[idx]}"`, `Phát hiện lỗi: ${mockIssues[idx]}`);
          showToast("Đã giả lập vi phạm UTM mới thành công!", "success");
          renderUtmHygieneDashboard();
        };
      }

      const utmBtnResolveAll = document.getElementById("utm-btn-resolve-all");
      if (utmBtnResolveAll) {
        utmBtnResolveAll.onclick = () => {
          let count = 0;
          db.utmViolations.forEach(v => {
            if (v.status === "Active") {
              v.status = "Resolved";
              count++;
            }
          });
          addAuditLogEntry(currentPersona, `Giải quyết toàn bộ vi phạm UTM (${count} lỗi)`, "Chuyển trạng thái sang Resolved");
          showToast(`Đã giải quyết toàn bộ ${count} vi phạm UTM thành công!`, "success");
          renderUtmHygieneDashboard();
        };
      }
      
      acquisitionInitialized = true;
    }
    renderAcquisitionSubpanes();
  };

  function renderAcquisitionSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("acq-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeAcqSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".acq-subpane").forEach(pane => {
      pane.style.display = pane.id === activeAcqSubtab ? "block" : "none";
    });

    if (activeAcqSubtab === "acq-subtab-performance") {
      renderCapitalTab();
    } else if (activeAcqSubtab === "acq-subtab-attribution") {
      const checkedRadio = document.querySelector("input[name='acq-attr-model']:checked");
      const model = checkedRadio ? checkedRadio.value : "first";
      renderAttributionEngine(model, "acq");
    } else if (activeAcqSubtab === "acq-subtab-utm") {
      renderEventDictionary();
      updateTrackingReadinessScore();
    } else if (activeAcqSubtab === "acq-subtab-hygiene") {
      renderUtmHygieneDashboard();
    }
  }

  window.initCustomerTab = function() {
    if (!customerInitialized) {
      const container = document.getElementById("cust-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeCustSubtab = target;
            
            document.querySelectorAll(".cust-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderCustomerSubpanes();
          });
        });
      }
      customerInitialized = true;
    }
    renderCustomerSubpanes();
  };

  function renderCustomerSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("cust-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeCustSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".cust-subpane").forEach(pane => {
      pane.style.display = pane.id === activeCustSubtab ? "block" : "none";
    });

    if (activeCustSubtab === "cust-subtab-segments") {
      const filteredCusts = getFilteredCustomers();
      const totalCusts = filteredCusts.length;
      const activeCusts = filteredCusts.filter(c => c.Retention_Status === "Active").length;
      const atRiskCusts = filteredCusts.filter(c => c.Retention_Status === "At Risk").length;
      const ovCustomerHealth = (typeof getMetricOverride === "function") ? getMetricOverride("customer_health") : null;
      const customerHealth = ovCustomerHealth !== null ? Math.round(ovCustomerHealth) : (totalCusts > 0 ? Math.round(((activeCusts + 0.5 * atRiskCusts) / totalCusts) * 100) : 70);

      const totalRev = filteredCusts.reduce((sum, c) => sum + (c.Revenue || 0), 0);
      const totalDeposit = filteredCusts.reduce((sum, c) => sum + (c.Deposit || 0), 0);
      
      const ovValueHealth = (typeof getMetricOverride === "function") ? getMetricOverride("value_health") : null;
      const valueHealth = ovValueHealth !== null ? Math.round(ovValueHealth) : (totalDeposit > 0 ? Math.round(Math.min(100, (totalRev / totalDeposit) * 100)) : 75);

      setRadialGauge("customer-health-circle", customerHealth);
      setRadialGauge("value-health-circle", valueHealth);
      try { renderCustomerKpiGrid(); } catch(e) { console.error("renderCustomerKpiGrid:", e); }
      try { renderMeuRfm(); renderMeuLifecycle(); } catch(e) { console.error("Error in MEU RFM/lifecycle:", e); }
      try { renderRfmTable(); } catch(e) { console.error("renderRfmTable:", e); }   // FIX: bảng RFM ở subtab này trước đây trống (render bị buộc nhầm vào subtab cohorts)
      renderCustomerIntelTab();
      renderCustomerContentValueIntelligence();
      calculateReactivationSimulator();
    } else if (activeCustSubtab === "cust-subtab-cohorts") {
      renderCustomerValueTab();
      try { renderMeuCohorts(); } catch(e) { console.error("Error in renderMeuCohorts:", e); }
    } else if (activeCustSubtab === "cust-subtab-prediction") {
      const inputEl = document.getElementById("predict-cust-id");
      if (inputEl) {
        runWhalePrediction(inputEl.value.trim());
      }
      const churnInputEl = document.getElementById("churn-cust-id");
      if (churnInputEl) {
        runChurnPrediction(churnInputEl.value.trim());
      }
    } else if (activeCustSubtab === "cust-subtab-database") {
      renderDatabaseExplorer();
      renderCustomerJourneySubpanes();
    }
  }

  window.initCapitalTab = function() {
    if (!capitalInitialized) {
      const container = document.getElementById("cap-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeCapSubtab = target;
            
            document.querySelectorAll(".cap-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderCapitalSubpanes();
          });
        });
      }

      // Setup Capital Health collapse
      const cb = document.getElementById("cap-collapse");
      if (cb) {
        cb.addEventListener("click", () => {
          const card = document.getElementById("cap-vh-card");
          if (card) card.classList.toggle("gk-collapsed");
        });
      }

      // Setup Capital Health dial click to re-run needle
      const dial = document.getElementById("cap-dial");
      if (dial) {
        dial.addEventListener("click", () => {
          updateCapitalHealthScore(capBaseScore, true);
        });
      }

      // Setup Capital Health segments — bấm kỳ thì quy mô điểm/biểu đồ theo kỳ đó
      const capSeg = document.getElementById("cap-seg");
      if (capSeg) {
        capSeg.addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          capSeg.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
          b.classList.add("active");
          const days = parseInt(b.getAttribute("data-days"), 10) || 30;
          updateCapitalHealthScore(capBaseScore, true, days);
        });
      }

      capitalInitialized = true;
    }
    renderCapitalSubpanes();
    setTimeout(() => {
      updateCapitalHealthScore(capBaseScore, true);
    }, 140);
  };

  function renderCapitalSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("cap-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeCapSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".cap-subpane").forEach(pane => {
      pane.style.display = pane.id === activeCapSubtab ? "block" : "none";
    });

    if (activeCapSubtab === "cap-subtab-forecasting") {
      const stats = db.getAggregatedCampaigns();
      const ltvCacRatio = stats.LTV / stats.CAC;
      const baseHealth = Math.min(Math.max(Math.round(ltvCacRatio * 25), 30), 100);
      updateCapitalHealthScore(baseHealth, false);
      renderCapitalTab();
      updateGeopoliticalDetails();
      initEconomicCalendar();
      try { renderMeuSaturation(); } catch(e) { console.error("Error in renderMeuSaturation:", e); }
    } else if (activeCapSubtab === "cap-subtab-optimizer") {
      updateCapitalHealthScore(80, false);
      renderCapitalTab();
      calculateBudgetAllocation();
      initReallocSimulator();
    }
  }

  window.initGovernanceTab = function() {
    if (!governanceInitialized) {
      const container = document.getElementById("gov-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeGovSubtab = target;
            
            document.querySelectorAll(".gov-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderGovernanceSubpanes();
          });
        });
      }
      governanceInitialized = true;
    }
    renderGovernanceSubpanes();
  };

  function renderGovernanceSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("gov-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeGovSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".gov-subpane").forEach(pane => {
      pane.style.display = pane.id === activeGovSubtab ? "block" : "none";
    });

    if (activeGovSubtab === "gov-subtab-configs") {
      renderGovernanceTab();
    } else if (activeGovSubtab === "gov-subtab-benchmarks") {
      renderIndustryBenchmarks();
    } else if (activeGovSubtab === "gov-subtab-logs") {
      renderAuditLogs();
    } else if (activeGovSubtab === "gov-subtab-rbac") {
      if (typeof renderRbacUserTable === "function") renderRbacUserTable();
    }
  }

  // Sparkline cho dải KPI tab Nội dung & Tài chính (chuẩn thẻ giống Overview)
  function renderContentKpiSparklines() {
    if (typeof renderSparkline !== "function") return;
    var eff = (typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    gkScaleKpiStrip('#tab-content .row-kpi-grid', [
      { base:33.4, f:eff, fmt:function(v){return v.toFixed(1)+"%";}, id:"spark-content-hook", spark:[28,30,29,31,32,33.4], col:"#6454E3" },
      { base:3.62, f:eff, fmt:function(v){return v.toFixed(2)+"%";}, id:"spark-content-ctr", spark:[4.1,3.9,3.85,3.75,3.7,3.62], col:"#0E9C8A" },
      { base:22.4, f:eff, fmt:function(v){return v.toFixed(1)+"%";}, id:"spark-content-cvr", spark:[19,20,20.5,21,21.8,22.4], col:"#16A34A" },
      { base:82, f:eff, fmt:function(v){return Math.round(v)+" / 100";}, id:"spark-content-ai", spark:[74,76,78,79,81,82], col:"#2563EB" },
      { base:28, f:eff, fmt:function(v){return Math.round(v)+" Assets";}, id:"spark-content-active", spark:[27,28,28,27,28,28], col:"#B45309" },
      { base:4, f:eff, fmt:function(v){return Math.max(1,Math.round(v))+" Ads";}, id:"spark-content-fatigue", spark:[1,2,2,3,3,4], col:"#DC2626" }
    ]);
  }
  function renderCapitalKpiSparklines() {
    if (typeof renderSparkline !== "function") return;
    var eff = (typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    gkScaleKpiStrip('#tab-capital .row-kpi-grid', [
      { base:null, f:eff, id:"spark-cap-channel", spark:[3.0,3.1,3.2,3.3,3.4,3.5], col:"#16A34A" },
      { base:null, f:eff, id:"spark-cap-sat", spark:[10,12,14,15,17,18], col:"#D97706" },
      { base:null, f:eff, id:"spark-cap-ratio", spark:[72,73,74,75,76,77.6], col:"#2563EB" },
      { base:1.82, f:eff, fmt:function(v){return v.toFixed(2)+"x";}, id:"spark-cap-ltvcac", spark:[2.1,2.0,1.95,1.9,1.85,1.82], col:"#6454E3" },
      { base:8.5, f:1/eff, fmt:function(v){return v.toFixed(1)+" days";}, id:"spark-cap-ttt", spark:[9.7,9.4,9.1,8.9,8.7,8.5], col:"#0E9C8A" },
      { base:14.2, f:eff, fmt:function(v){return v.toFixed(1)+"%";}, id:"spark-cap-cannib", spark:[13,13.5,14,14.1,14.2,14.2], col:"#DC2626" }
    ]);
  }

  function handleTabActivation(tabId) {
    try {
      if (tabId === "tab-executive") {
        try { renderNorthStar(); } catch(e) { console.error("Error in renderNorthStar:", e); }
        try { renderMeuValueTrends(); } catch(e) { console.error("Error in renderMeuValueTrends:", e); }
        try { initMeuTimeSeriesToggle(); renderMeuTimeSeries(); } catch(e) { console.error("Error in renderMeuTimeSeries:", e); }
        try { calculateHealthScores(); } catch(e) { console.error("Error in calculateHealthScores:", e); }
        try { checkAlerts(); } catch(e) { console.error("Error in checkAlerts:", e); }
        try { renderPriorityEngine(); } catch(e) { console.error("Error in renderPriorityEngine:", e); }
        try { renderTeamProgress(); } catch(e) { console.error("Error in renderTeamProgress:", e); }
        try { renderExecutiveOverviewWidgets(); } catch(e) { console.error("Error in renderExecutiveOverviewWidgets:", e); }
      } 
      else if (tabId === "tab-customer-intel") {
        try { initAcquisitionTab(); } catch(e) { console.error(e); }
        try { renderAcquisitionKpiSparklines(); } catch(e) {}
        try { mountAcquisitionVHBlock(); } catch(e) {}
      }
      else if (tabId === "tab-customer-value") {
        try { initCustomerTab(); } catch(e) { console.error(e); }
      } 
      else if (tabId === "tab-capital") {
        try { initCapitalTab(); } catch(e) { console.error(e); }
        try { renderCapitalKpiSparklines(); } catch(e) {}
      }
      else if (tabId === "tab-content") {
        try { setRadialGauge("creative-health-circle", 72); } catch(e) { console.error(e); }
        try { renderMeuContent(); } catch(e) { console.error("Error in renderMeuContent:", e); }
        try { renderContentTab(); } catch(e) { console.error(e); }
        try { renderContentThemeAndPlatformDominance(); } catch(e) { console.error(e); }
        try { updateVideoDropOffAnalytics(); } catch(e) { console.error(e); }
        try { renderCreativeFatigueAnalysis(); } catch(e) { console.error(e); }
        try { renderContentKpiSparklines(); } catch(e) {}
        try { mountContentVHBlock(); } catch(e) {}
      }
      else if (tabId === "tab-governance") {
        try { initGovernanceTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-team-ops") {
        try { renderTeamOpsTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-growth-strategy") {
        try { initGrowthStrategyTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-market-competitor") {
        try { initMarketCompetitorTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-product-growth") {
        try { initProductGrowthTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-experimentation") {
        try { initExperimentationTab(); } catch(e) { console.error(e); }
      }
      else if (tabId === "tab-data-guide") {
        try { renderSystemMap(); } catch(e) { console.error("Error in renderSystemMap:", e); }
        try { renderDataGuide(); } catch(e) { console.error("Error in renderDataGuide:", e); }
        try { initIoSection(); } catch(e) { console.error("Error in initIoSection:", e); }
      }
      try { gdDriftStatic(document.getElementById(tabId)); } catch(e) {} // chỉ số tĩnh dịch theo kỳ thời gian
      try { initLiquidMeshPhysics(); } catch(e) { console.error(e); } // Re-bind pointer tracking
    } catch (err) {
      console.error("General error in handleTabActivation:", err);
    }
  }

  // -------------------------------------------------------------
  // Tab 1: Weekly Priority Engine ICE controller
  // -------------------------------------------------------------
  // Ưu tiên công việc theo TỪNG CƯƠNG VỊ — đổi persona ở topbar sẽ đổi danh sách này.
  const personaPriorities = {
    "CEO": [
      { id: 1, action: "Tối ưu phễu KYC (Android)", type: "Fix", impact: 9, confidence: 9, ease: 4, status: "In Progress" },
      { id: 2, action: "Giảm phụ thuộc Whale (~41%)", type: "Optimize", impact: 8, confidence: 7, ease: 5, status: "Planned" },
      { id: 3, action: "Tăng NS Apple Search A-01", type: "Scale", impact: 8, confidence: 8, ease: 8, status: "Planned" },
      { id: 4, action: "Dừng TikTok T-02 (ROI âm)", type: "Stop", impact: 7, confidence: 9, ease: 9, status: "Review" },
      { id: 5, action: "Mở rộng thị trường ASEAN", type: "Scale", impact: 7, confidence: 6, ease: 5, status: "Planned" }
    ],
    "CMO": [
      { id: 11, action: "Dừng TikTok T-02 (ROI âm)", type: "Stop", impact: 8, confidence: 9, ease: 9, status: "Review" },
      { id: 12, action: "Tăng NS Apple Search A-01", type: "Scale", impact: 9, confidence: 8, ease: 8, status: "Planned" },
      { id: 13, action: "Làm mới creative FB F-01", type: "Fix", impact: 7, confidence: 8, ease: 6, status: "In Progress" },
      { id: 14, action: "Dịch NS TikTok → Apple", type: "Optimize", impact: 7, confidence: 8, ease: 7, status: "Planned" },
      { id: 15, action: "A/B hook video 3 giây", type: "Test", impact: 6, confidence: 6, ease: 8, status: "In Progress" }
    ],
    "Growth Lead": [
      { id: 21, action: "Tối ưu phễu KYC Onboarding", type: "Fix", impact: 9, confidence: 8, ease: 5, status: "In Progress" },
      { id: 22, action: "A/B referral $15 vs $10", type: "Test", impact: 8, confidence: 7, ease: 7, status: "Planned" },
      { id: 23, action: "Email reactivation At-Risk", type: "Optimize", impact: 7, confidence: 7, ease: 8, status: "Planned" },
      { id: 24, action: "Mở rộng invite loop", type: "Scale", impact: 7, confidence: 6, ease: 6, status: "Planned" },
      { id: 25, action: "Dừng landing biến thể B", type: "Stop", impact: 5, confidence: 8, ease: 9, status: "Review" }
    ],
    "Product Manager": [
      { id: 31, action: "Rút gọn KYC còn 3 bước (iOS)", type: "Fix", impact: 9, confidence: 8, ease: 5, status: "In Progress" },
      { id: 32, action: "Tối ưu Aha-moment <24h", type: "Optimize", impact: 8, confidence: 7, ease: 6, status: "Planned" },
      { id: 33, action: "Sửa drop-off màn xác minh", type: "Fix", impact: 8, confidence: 7, ease: 5, status: "Planned" },
      { id: 34, action: "A/B onboarding checklist", type: "Test", impact: 7, confidence: 7, ease: 7, status: "In Progress" },
      { id: 35, action: "Đẩy copy-trade (tệp Core)", type: "Scale", impact: 7, confidence: 6, ease: 5, status: "Planned" }
    ],
    "Data Analyst": [
      { id: 41, action: "Sửa chất lượng tracking UTM", type: "Fix", impact: 8, confidence: 8, ease: 7, status: "Review" },
      { id: 42, action: "Mô hình Whale/Churn V2", type: "Fix", impact: 8, confidence: 7, ease: 6, status: "In Progress" },
      { id: 43, action: "Cohort theo nguồn acquisition", type: "Optimize", impact: 7, confidence: 7, ease: 6, status: "Planned" },
      { id: 44, action: "Attribution đa điểm chạm", type: "Test", impact: 7, confidence: 6, ease: 6, status: "Planned" },
      { id: 45, action: "Tự động báo cáo ICE tuần", type: "Scale", impact: 6, confidence: 7, ease: 7, status: "Planned" }
    ],
    "Marketing Team": [
      { id: 51, action: "5 creative mới adset F-01", type: "Fix", impact: 7, confidence: 8, ease: 6, status: "In Progress" },
      { id: 52, action: "Dừng adset TikTok T-02", type: "Stop", impact: 7, confidence: 9, ease: 9, status: "Review" },
      { id: 53, action: "Cập nhật NS Meta M-02", type: "Optimize", impact: 6, confidence: 8, ease: 8, status: "Planned" },
      { id: 54, action: "Email coupon $5 (Android)", type: "Optimize", impact: 6, confidence: 7, ease: 8, status: "Planned" },
      { id: 55, action: "A/B caption campaign T-03", type: "Test", impact: 6, confidence: 6, ease: 8, status: "In Progress" }
    ],
    "Finance Team": [
      { id: 61, action: "Tối ưu phân bổ ngân sách", type: "Optimize", impact: 9, confidence: 8, ease: 6, status: "In Progress" },
      { id: 62, action: "Rà soát CAC > $40 (TikTok)", type: "Fix", impact: 8, confidence: 8, ease: 7, status: "Review" },
      { id: 63, action: "Dừng kênh ROI âm (T-02)", type: "Stop", impact: 7, confidence: 9, ease: 9, status: "Review" },
      { id: 64, action: "Dự báo dòng tiền Quý 3", type: "Scale", impact: 8, confidence: 7, ease: 5, status: "Planned" },
      { id: 65, action: "Mô hình FED cắt lãi suất", type: "Test", impact: 6, confidence: 6, ease: 6, status: "Planned" }
    ]
  };
  // Checklist "Công việc ưu tiên" (Sprint Backlog) theo cương vị
  const personaChecklists = {
    "CEO": [{ text: "Duyệt ngân sách & phân bổ vốn Q3", done: false }, { text: "Review rủi ro tập trung Whale", done: false }, { text: "Chốt định hướng mở rộng ASEAN", done: false }],
    "CMO": [{ text: "Tạo 3 video hook FOMO mới", done: false }, { text: "Duyệt creative Facebook F-01", done: true }, { text: "Chuyển dịch ngân sách TikTok Ads", done: false }],
    "Growth Lead": [{ text: "Thiết kế A/B test referral reward", done: false }, { text: "Review phễu KYC Onboarding", done: false }, { text: "Lên kế hoạch invite loop", done: false }],
    "Product Manager": [{ text: "Viết spec rút gọn KYC 3 bước", done: false }, { text: "Review drop-off màn xác minh", done: true }, { text: "Lên backlog tính năng copy-trade", done: false }],
    "Data Analyst": [{ text: "Làm sạch dữ liệu tracking UTM", done: false }, { text: "Cập nhật mô hình Churn V2", done: false }, { text: "Dựng báo cáo cohort theo nguồn", done: false }],
    "Marketing Team": [{ text: "Sửa lỗi crash API ngân hàng", done: true }, { text: "Tạo 3 video hook FOMO mới", done: false }, { text: "Chuyển dịch ngân sách TikTok Ads", done: false }],
    "Finance Team": [{ text: "Rà soát CAC theo từng kênh", done: false }, { text: "Lập dự báo dòng tiền Quý 3", done: false }, { text: "Mô hình hóa kịch bản FED", done: false }]
  };
  let priorityList = personaPriorities["CEO"];

  function renderPriorityEngine() {
    const tbody = document.getElementById("priority-tbody");
    if (!tbody) return;

    // Lấy đúng danh sách ưu tiên của cương vị đang chọn
    priorityList = personaPriorities[currentPersona] || personaPriorities["CEO"];
    const subEl = document.getElementById("priority-subtitle");
    if (subEl) subEl.textContent = `Ưu tiên theo vai trò: ${currentPersona} · sắp theo ICE`;

    priorityList.forEach(item => {
      item.ice = item.impact * item.confidence * item.ease;
    });
    priorityList.sort((a, b) => b.ice - a.ice);

    tbody.innerHTML = "";
    priorityList.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.action}</strong></td>
        <td><span class="badge ${item.type.toLowerCase()}">${item.type}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${item.impact}</span>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'impact', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'impact', -1)">-</button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${item.confidence}</span>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'confidence', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'confidence', -1)">-</button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${item.ease}</span>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'ease', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px;" onclick="adjustPriorityMetric(${item.id}, 'ease', -1)">-</button>
          </div>
        </td>
        <td><span class="priority-score">${item.ice}</span></td>
        <td><span style="font-size:11px; opacity:0.8;">${item.status}</span></td>
        <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="executePriorityItem(${item.id})">Execute</button></td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
    renderPersonaChecklist();
  }

  function renderPersonaChecklist() {
    const host = document.getElementById("persona-checklist");
    if (!host) return;
    const items = personaChecklists[currentPersona] || personaChecklists["CEO"];
    host.innerHTML = items.map(function (it) {
      return '<label class="checkbox-label" style="padding: 6px 10px; background: rgba(255,255,255,0.22); border: 1px solid var(--border-color); border-radius: 6px; font-size: 11px;">'
        + '<input type="checkbox"' + (it.done ? ' checked' : '') + '>'
        + '<span style="' + (it.done ? 'text-decoration: line-through; opacity: 0.6;' : '') + '">' + it.text + '</span>'
        + '</label>';
    }).join("");
  }

  // =============================================================
  // NEW EXECUTIVE OVERVIEW WIDGET RENDERERS
  // =============================================================
  function renderSparkline(canvasId, dataPoints, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof canvas.getContext !== "function") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 80, height: 28 };
    const width = rect.width || 80;
    const height = rect.height || 28;
    
    const dpr = (window && window.devicePixelRatio) || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    if (ctx.scale) ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, width, height);
    if (dataPoints.length < 2) return;
    
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;
    
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color || "var(--purple)";
    
    const points = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * (width - 4) + 2;
      const y = height - ((val - minVal) / range) * (height - 6) - 3;
      return { x, y };
    });
    
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.lineTo(points[0].x, height);
    ctx.closePath();
    ctx.fillStyle = (color || "var(--purple)") + "15";
    ctx.fill();
  }

  function renderExecSparklines() {
    // Sparkline phải KẾT THÚC đúng bằng giá trị canonical của thẻ KPI (và scale theo kỳ).
    // Giữ HÌNH DÁNG xu hướng cũ, chỉ tỉ lệ lại để điểm cuối = giá trị hiện tại.
    const k = (window.GD_KPI || (typeof gdLiveKPIs === "function" ? gdLiveKPIs() : {}));
    const stats = db.getAggregatedCampaigns(); // đã scale theo kỳ
    const eff = (window.GD_EFF > 0 ? window.GD_EFF : 1);
    const endAt = (arr, target) => {
      const n = arr.length;
      // Dốc lại đường theo kỳ (điểm cuối giữ nguyên) → sparkline ĐỔI HÌNH theo thời gian, không đứng yên
      const tilted = arr.map((v, i) => v * Math.pow(eff, (n - 1 - i)));
      const last = tilted[n - 1] || 1; const f = (last && isFinite(target)) ? target / last : 1;
      return tilted.map(v => v * f);
    };
    renderSparkline("sparkline-revenue", endAt([310000, 325000, 318000, 340000, 362000, 382000], stats.Revenue), "#6454E3");
    renderSparkline("sparkline-kycnc",   endAt([2800, 2950, 3100, 3050, 3300, 3500], stats.KYC), "#0E9C8A");
    renderSparkline("sparkline-ltvcac",  endAt([3.1, 3.2, 3.15, 3.3, 3.42, 3.48], k.ltvcac || (stats.LTV / stats.CAC)), "#10B981");
    renderSparkline("sparkline-cackyc",  endAt([12.5, 12.1, 11.8, 11.5, 11.3, 11.12], k.cac || stats.CAC), "#F59E0B");
    renderSparkline("sparkline-roas",    endAt([3.9, 4.0, 3.95, 4.1, 4.18, 4.25], k.roas || (stats.Revenue / stats.Spend)), "#2563eb");
  }

  let execRevenueChartRef = null;
  function renderExecDailyRevenueChart() {
    const canvas = document.getElementById("execRevenueChart");
    if (!canvas) return;
    if (typeof canvas.getContext !== "function") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dailyData = db.getDailyRevenue(execTimeframeDays);
    const labels = dailyData.map(d => {
      const dateParts = d.Date.split("-");
      return dateParts[1] + "/" + dateParts[2];
    });
    const revenues = dailyData.map(d => d.Revenue);

    // Keep the card subtitle in sync with the selected time range
    const subEl = document.getElementById("exec-revenue-subtitle");
    if (subEl) subEl.textContent = `Vùng tích lũy ${execTimeframeDays} ngày`;

    if (execRevenueChartRef) {
      try { execRevenueChartRef.destroy(); } catch(e) {}
    }

    execRevenueChartRef = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Doanh thu ngày ($)",
          data: revenues,
          borderColor: "#6454E3",
          backgroundColor: "rgba(100, 84, 227, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = labels[idx];
            const val = revenues[idx];
            showToast(`Doanh thu ngày ${label}: $${val.toLocaleString()}`, "success");
          }
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: gdTickColor(), maxTicksLimit: 8 }
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { font: { size: 11 }, color: gdTickColor() }
          }
        }
      }
    });
  }

  function renderTrapezoidFunnel() {
    const container = document.getElementById("exec-funnel-container");
    if (!container) return;
    container.innerHTML = "";

    // NGUỒN DUY NHẤT: activationJourney — cùng dữ liệu với cây Input Metrics + Growth Health
    // → Install→KYC ở phễu = 38.4%, KHÔNG còn lệch số giữa các thẻ (% trên tổng Install).
    const aj = (window.db && window.db.productGrowth && window.db.productGrowth.activationJourney) || [];
    const sc = (n) => aj.find(x => x.step === n) || { count: 0, pctOfTotal: 0 };
    const stepMap = [
      { name: "Install", src: "App Installed",         color: "linear-gradient(90deg, #3b82f6, #60a5fa)", tab: "tab-customer-intel",  subtab: "acq-subtab-performance" },
      { name: "Signup",  src: "Signed Up",             color: "linear-gradient(90deg, #10b981, #34d399)", tab: "tab-customer-value",  subtab: "cust-subtab-segments" },
      { name: "KYC",     src: "KYC Submitted",         color: "linear-gradient(90deg, #8b5cf6, #a78bfa)", tab: "tab-product-growth",  subtab: "pg-subtab-activation" },
      { name: "FTD",     src: "First Deposit",         color: "linear-gradient(90deg, #f59e0b, #fbbf24)", tab: "tab-customer-value",  subtab: "cust-subtab-cohorts" },
      { name: "Trade",   src: "First Trade Completed", color: "linear-gradient(90deg, #ef4444, #f87171)", tab: "tab-product-growth",  subtab: "pg-subtab-loops" }
    ];
    // Số lượng = ×kỳ (tích lũy); chuyển đổi (trừ Install) DỊCH theo hiệu suất kỳ → khớp installKyc
    const pf = (window.GD_PERIOD_FACTOR > 0 ? window.GD_PERIOD_FACTOR : 1);
    const eff = (window.GD_EFF > 0 ? window.GD_EFF : 1);
    const stages = stepMap.map(function (m) {
      const d = sc(m.src);
      const isInstall = (m.src === "App Installed");
      const stepEff = isInstall ? 1 : eff;
      const pctNum = ((d.pctOfTotal != null) ? d.pctOfTotal : 0) * stepEff;
      return { name: m.name, value: Math.round((d.count || 0) * pf * stepEff), pct: (isInstall ? "100" : pctNum.toFixed(1)) + "%", color: m.color, tab: m.tab, subtab: m.subtab };
    });

    const funnelMax = Math.max.apply(null, stages.map(function (s) { return s.value || 0; })) || 1;
    stages.forEach(st => {
      const slice = document.createElement("div");
      slice.className = "funnel-slice";
      slice.style.background = st.color;
      // bề rộng tỉ lệ theo giá trị (tối thiểu 46% để nhãn không bị cắt), căn giữa
      slice.style.width = Math.max(46, (st.value / funnelMax) * 100).toFixed(1) + "%";
      slice.style.margin = "0 auto";
      slice.style.cursor = "pointer";

      slice.addEventListener("click", () => {
        if (window.switchTab) {
          window.switchTab(st.tab, st.subtab);
        }
      });

      const label = document.createElement("div");
      label.className = "funnel-slice-label";
      label.innerHTML = `<span>${st.name}</span> <span>${st.value.toLocaleString()} (${st.pct})</span>`;

      slice.appendChild(label);
      container.appendChild(slice);
    });
  }

  function renderExecChannelTable() {
    const tbody = document.getElementById("exec-channel-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const channelsData = {};
    db.getScaledCampaigns().forEach(c => {   // scale theo kỳ → spend/revenue khớp số tổng; CAC/ROAS (tỉ số) giữ nguyên
      if (!channelsData[c.Channel]) {
        channelsData[c.Channel] = { spend: 0, kyc: 0, revenue: 0 };
      }
      channelsData[c.Channel].spend += c.Spend;
      channelsData[c.Channel].kyc += c.KYC;
      channelsData[c.Channel].revenue += c.Revenue;
    });

    Object.keys(channelsData).forEach(chan => {
      const data = channelsData[chan];
      const cac = data.spend / data.kyc;
      const roas = data.revenue / data.spend;
      const ltvCac = roas;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${chan}</strong></td>
        <td>$${Math.round(data.spend).toLocaleString()}</td>
        <td>${data.kyc.toLocaleString()}</td>
        <td>$${cac.toFixed(2)}</td>
        <td><strong style="color: ${ltvCac >= 3.0 ? 'var(--green)' : ltvCac >= 1.5 ? 'var(--purple)' : 'var(--coral)'};">${ltvCac.toFixed(2)}x</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderExecRetentionTable() {
    const tbody = document.getElementById("exec-retention-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const cohortsToShow = db.cohortMatrix.slice(-4);
    const getHeatClass = (val) => {
      if (val === null) return "ch-none";
      if (val >= 40) return "ch-high";
      if (val >= 25) return "ch-med-high";
      if (val >= 18) return "ch-med";
      if (val >= 12) return "ch-med-low";
      return "ch-low";
    };

    cohortsToShow.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.cohort.split(" ")[0]}</strong></td>
        <td class="cohort-cell ${getHeatClass(row.d1)}">${row.d1}%</td>
        <td class="cohort-cell ${getHeatClass(row.d7)}">${row.d7}%</td>
        <td class="cohort-cell ${getHeatClass(row.d14)}">${row.d14}%</td>
        <td class="cohort-cell ${getHeatClass(row.d30)}">${row.d30}%</td>
        <td class="cohort-cell ${getHeatClass(row.d90)}">${row.d90 !== null ? row.d90 + "%" : "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  let execBudgetAllocationChartRef = null;
  function renderExecutiveBudgetAllocation() {
    const canvas = document.getElementById("execBudgetAllocationChart");
    if (!canvas) return;
    if (typeof canvas.getContext !== "function") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let totalSpend = 0;
    const channelSpends = {};
    db.getScaledCampaigns().forEach(c => {   // ngân sách (flow) scale theo kỳ → donut + số tổng ở tâm khớp
      totalSpend += c.Spend;
      channelSpends[c.Channel] = (channelSpends[c.Channel] || 0) + c.Spend;
    });

    const totalSpendEl = document.getElementById("exec-budget-total");
    if (totalSpendEl) {
      totalSpendEl.textContent = `Tổng: $${totalSpend.toLocaleString()}`;
    }

    const labels = Object.keys(channelSpends);
    const spends = labels.map(l => channelSpends[l]);
    const colors = ["#6454E3", "#0E9C8A", "#F59E0B", "#2563eb"];

    if (execBudgetAllocationChartRef) {
      try { execBudgetAllocationChartRef.destroy(); } catch(e) {}
    }

    execBudgetAllocationChartRef = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: spends,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = labels[idx];
            const val = spends[idx];
            showToast(`Chi tiêu kênh ${label}: $${val.toLocaleString()}`, "success");
          }
        },
        plugins: {
          legend: { display: false },
          centerLabel: { value: "$" + Math.round(totalSpend / 1000) + "K", label: "Tổng chi" }
        },
        cutout: "72%"
      }
    });
  }

  function renderExecutiveOverviewWidgets() {
    renderExecSparklines();
    renderExecDailyRevenueChart();
    renderTrapezoidFunnel();
    renderExecChannelTable();
    renderExecRetentionTable();
    renderExecutiveBudgetAllocation();
  }

  function renderTeamProgress() {
    const tbody = document.getElementById("team-progress-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Sync team progress with team tasks
    if (db.teamTasks && db.teamTasks.length > 0) {
      const getAvgProgress = (dept) => {
        const deptTasks = db.teamTasks.filter(t => t.department === dept);
        if (deptTasks.length === 0) return 0;
        const sum = deptTasks.reduce((acc, t) => acc + t.progress, 0);
        return Math.round(sum / deptTasks.length);
      };

      db.teamProgress.forEach(row => {
        if (row.Team.includes("Data")) {
          row.Progress = getAvgProgress("Data");
        } else if (row.Team.includes("Creative") || row.Team.includes("Content")) {
          row.Progress = getAvgProgress("Content");
        } else if (row.Team.includes("Product")) {
          row.Progress = getAvgProgress("Product");
        } else if (row.Team.includes("Growth") || row.Team.includes("Marketing")) {
          row.Progress = getAvgProgress("Marketing");
        }
      });
    }

    db.teamProgress.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.Team.replace(" Team", "")}</strong></td>
        <td style="font-size:11.5px; color:var(--text2); line-height:1.35;">${row.Task}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="bar-bg" style="width:50px; height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden; border: none; box-shadow: none;">
              <div class="bar-fill" style="width:${row.Progress}%; height:100%; border-radius:3px; background:${row.Progress === 100 ? "var(--green)":"var(--purple)"};"></div>
            </div>
            <span style="font-size: 11px; font-weight:700; font-family: monospace;">${row.Progress}%</span>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.adjustPriorityMetric = (id, field, amount) => {
    if (!checkCustomizePermission("điều chỉnh chỉ số ICE")) return;
    const item = priorityList.find(p => p.id === id);
    if (!item) return;
    item[field] = Math.max(1, Math.min(10, item[field] + amount));
    renderPriorityEngine();
    addAuditLogEntry(currentPersona, `Điều chỉnh ICE chỉ số ${field} cho ưu tiên: "${item.action}"`, "Tự động sắp xếp lại bảng ưu tiên");
  };

  window.executePriorityItem = (id) => {
    if (!checkCustomizePermission("thực thi ưu tiên tuần")) return;
    const item = priorityList.find(p => p.id === id);
    if (!item) return;
    item.status = "In Progress";
    renderPriorityEngine();
    addAuditLogEntry(currentPersona, `Kích hoạt thực thi chiến dịch ưu tiên: "${item.action}"`, "Trạng thái đổi sang In Progress");
    showToast(`Đã khởi chạy kế hoạch: "${item.action}".`, "success");
  };

  // AI Grow Machine Scan trigger
  document.getElementById("btn-ai-scan-opportunities").addEventListener("click", () => {
    if (!checkCustomizePermission("chạy quét cơ hội tăng trưởng Grow Machine")) return;
    
    const opps = [
      { id: 101, action: "Tập trung ngân sách vào Apple Search A-01 (ROI 3.5x bứt phá)", type: "Scale", impact: 9, confidence: 8, ease: 8, status: "Planned" },
      { id: 102, action: "Tắt TikTok Ads Campaign T-02 lập tức (ROI cận biên 0.8x âm)", type: "Stop", impact: 8, confidence: 9, ease: 9, status: "Planned" },
      { id: 103, action: "Khắc phục tỷ lệ rớt ở bước KYC_Initiated (Android Onboarding Drop)", type: "Fix", impact: 8, confidence: 8, ease: 5, status: "Planned" }
    ];

    let countAdded = 0;
    opps.forEach(opp => {
      if (!priorityList.some(p => p.action === opp.action)) {
        priorityList.unshift(opp);
        countAdded++;
      }
    });

    renderPriorityEngine();
    addAuditLogEntry("Grow Machine AI", "Quét phễu dữ liệu tự động tìm cơ hội tối ưu", `Đã thêm ${countAdded} ưu tiên tăng trưởng mới vào Weekly priority`);
    showToast(`AI Grow Machine đã hoàn tất quét phễu! Đã bổ sung thành công ${countAdded} khuyến nghị tăng trưởng chất lượng vào Weekly Priority Engine.`, "ai");
  });

  // -------------------------------------------------------------
  // Tab 2: Customer Intelligence & Database Explorer
  // -------------------------------------------------------------
  function renderCustomerIntelTab() {
    // 1. Render Segment Distribution Donut Chart
    const ctx = document.getElementById("segmentationChart");
    if (ctx) {
      if (segmentationChartRef) segmentationChartRef.destroy();
      const counts = { Whale: 0, Core: 0, Casual: 0, Dormant: 0, "New User": 0 };
      const filtered = getFilteredCustomers();
      filtered.forEach(c => counts[c.Segment]++);

      segmentationChartRef = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: Object.keys(counts),
          datasets: [{
            data: Object.values(counts),
            backgroundColor: ["#6454e3", "#0e9c8a", "#8b5cf6", "#b45309", "#dc2626"],
            borderColor: "#fff",
            borderWidth: 1.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (event, elements) => {
            if (elements && elements.length > 0) {
              const idx = elements[0].index;
              const label = Object.keys(counts)[idx];
              const val = Object.values(counts)[idx];
              showToast(`Phân khúc ${label}: ${val.toLocaleString()} khách hàng`, "success");
            }
          },
          plugins: {
            legend: { position: "right", labels: { color: gdTickColor(), font: { family: "Plus Jakarta Sans" } } },
            centerLabel: { value: filtered.length, label: "Khách hàng" }
          },
          cutout: "72%"
        }
      });
    }

    // 2. Render Live Event Stream
    const streamBody = document.getElementById("event-stream-tbody");
    if (streamBody) {
      streamBody.innerHTML = "";
      const stream = db.getEventStream(15);
      stream.forEach(ev => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span style="font-family: monospace;">${ev.Customer_ID}</span></td>
          <td><strong>${ev.Event_Name}</strong></td>
          <td><span class="badge scale">${ev.Asset}</span></td>
          <td style="color:${ev.Value > 0 ? "var(--green)":"var(--text-muted)"}; font-weight:700;">${ev.Value > 0 ? "+$"+ev.Value : "-"}</td>
          <td style="color:var(--text-muted); font-size:11px;">${ev.Event_Time}</td>
        `;
        streamBody.appendChild(tr);
      });
    }

    renderDatabaseExplorer();
    renderFunnelAnalysis();
    renderPersonas();
    renderCustomerJourneyMap();
    renderTransitionMatrix();
    renderFunnelMigration();
    renderAttributionEngine("first");
    renderJourneyInteractionStats();
  }

  function renderJourneyInteractionStats() {
    const kycCustomers = getFilteredCustomers().filter(c => c.KYC_Date !== "None");
    const ftdCustomers = getFilteredCustomers().filter(c => c.FTD_Date !== "None");

    const totalKycTouches = kycCustomers.reduce((sum, c) => sum + (c.InteractionsToKyc || 0), 0);
    const totalFtdTouches = ftdCustomers.reduce((sum, c) => sum + (c.InteractionsToFtd || 0), 0);

    const avgKyc = kycCustomers.length > 0 ? (totalKycTouches / kycCustomers.length).toFixed(1) : "0.0";
    const avgFtd = ftdCustomers.length > 0 ? (totalFtdTouches / ftdCustomers.length).toFixed(1) : "0.0";

    const avgKycEl = document.getElementById("avg-kyc-touches");
    const avgFtdEl = document.getElementById("avg-ftd-touches");
    if (avgKycEl) avgKycEl.textContent = avgKyc;
    if (avgFtdEl) avgFtdEl.textContent = avgFtd;

    const tbody = document.getElementById("channel-dominance-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const channelList = [
      { name: "Meta Ads", key: "Meta Ads" },
      { name: "Google Ads", key: "Google Ads" },
      { name: "TikTok Ads", key: "TikTok Ads" },
      { name: "Apple Search Ads", key: "Apple Search Ads" },
      { name: "Organic Search", key: "Organic" },
      { name: "Direct", key: "Direct" },
      { name: "Email Remarketing", key: "Email Remarketing" }
    ];

    const totalFtd = ftdCustomers.length;
    if (totalFtd === 0) return;

    channelList.forEach(ch => {
      const firstCount = ftdCustomers.filter(c => c.PrimaryAwarenessChannel === ch.key).length;
      const convKey = ch.name === "Organic Search" ? "Google Search" : ch.key;
      const lastCount = ftdCustomers.filter(c => c.PrimaryConversionChannel === convKey).length;

      const firstPct = ((firstCount / totalFtd) * 100).toFixed(1);
      const lastPct = ((lastCount / totalFtd) * 100).toFixed(1);
      
      const ratio = lastCount > 0 ? (firstCount / lastCount) : firstCount;
      const ratioStr = ratio.toFixed(2) + "x";

      let primaryRole = "Đa năng (Hybrid)";
      let badgeClass = "optimize";
      if (ratio > 1.25) {
        primaryRole = "Nhận diện (Awareness)";
        badgeClass = "scale";
      } else if (ratio < 0.8) {
        primaryRole = "Chuyển đổi (Closer)";
        badgeClass = "test";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${ch.name}</strong></td>
        <td style="text-align: right; font-weight: 600;">${firstPct}% <span style="font-size: 11px; color: var(--text3);">(${firstCount})</span></td>
        <td style="text-align: right; font-weight: 600;">${lastPct}% <span style="font-size: 11px; color: var(--text3);">(${lastCount})</span></td>
        <td style="text-align: right; font-weight: 700; color: var(--purple);">${ratioStr}</td>
        <td><span class="badge ${badgeClass}">${primaryRole}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderPersonas() {
    const tbody = document.getElementById("personas-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.customerPersonas.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.Name}</strong></td>
        <td><span class="badge scale" style="background:var(--purple-soft); color:var(--purple);">${row.Share}</span></td>
        <td><span style="font-weight:700; color:var(--green);">${row.Deposit}</span></td>
        <td style="font-size:11.5px; opacity:0.9;">${row.ActiveHours}</td>
        <td><span class="badge optimize" style="background:rgba(14, 156, 138, 0.1); color:var(--teal);">${row.Assets}</span></td>
        <td style="font-size:11px; opacity:0.8;">${row.Device}</td>
        <td style="font-size:12.5px; line-height:1.45; color:var(--text2);">${row.Habit}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderFunnelAnalysis() {
    const iosContainer = document.getElementById("ios-funnel-container");
    const androidContainer = document.getElementById("android-funnel-container");
    if (!iosContainer || !androidContainer) return;

    const filterEl = document.getElementById("funnel-filter-channel");
    const activeChannel = filterEl ? filterEl.value : "ALL";

    // Filter customers
    let iosUsers = getFilteredCustomers().filter(c => c.Device === "iOS");
    let androidUsers = getFilteredCustomers().filter(c => c.Device === "Android");

    if (activeChannel !== "ALL") {
      iosUsers = iosUsers.filter(c => c.Source === activeChannel);
      androidUsers = androidUsers.filter(c => c.Source === activeChannel);
    }

    // Funnel steps calculator
    const getFunnelStats = (users) => {
      const total = users.length;
      if (total === 0) return { total: 0, register: 0, kyc_init: 0, kyc_sub: 0, ftd: 0 };
      
      const register = users.filter(c => c.Onboarding_Step_Drop !== "Install").length;
      const kyc_init = users.filter(c => !["Install", "Register"].includes(c.Onboarding_Step_Drop)).length;
      const kyc_sub = users.filter(c => !["Install", "Register", "KYC_Initiated"].includes(c.Onboarding_Step_Drop)).length;
      const ftd = users.filter(c => c.FTD_Date !== "None").length;

      return {
        total,
        register,
        kyc_init,
        kyc_sub,
        ftd
      };
    };

    const iosStats = getFunnelStats(iosUsers);
    const androidStats = getFunnelStats(androidUsers);

    // FTD rate calculation
    const iosFtdRate = iosStats.total > 0 ? ((iosStats.ftd / iosStats.total) * 100).toFixed(1) + "%" : "0.0%";
    const androidFtdRate = androidStats.total > 0 ? ((androidStats.ftd / androidStats.total) * 100).toFixed(1) + "%" : "0.0%";

    document.getElementById("ios-funnel-ftd-rate").textContent = `FTD Rate: ${iosFtdRate}`;
    document.getElementById("android-funnel-ftd-rate").textContent = `FTD Rate: ${androidFtdRate}`;

    // Render helper
    const drawFunnel = (stats, container, colorClass) => {
      container.innerHTML = "";
      const steps = [
        { label: "Install", val: stats.total, pct: 100 },
        { label: "Register", val: stats.register, pct: stats.total > 0 ? Math.round((stats.register / stats.total) * 100) : 0 },
        { label: "KYC Initiated", val: stats.kyc_init, pct: stats.total > 0 ? Math.round((stats.kyc_init / stats.total) * 100) : 0 },
        { label: "KYC Submitted", val: stats.kyc_sub, pct: stats.total > 0 ? Math.round((stats.kyc_sub / stats.total) * 100) : 0 },
        { label: "FTD (Converted)", val: stats.ftd, pct: stats.total > 0 ? Math.round((stats.ftd / stats.total) * 100) : 0 }
      ];

      steps.forEach(step => {
        const item = document.createElement("div");
        item.style.marginBottom = "12px";
        const gradient = colorClass === "cyan" 
          ? "linear-gradient(90deg, var(--blue), #6366f1)" 
          : "linear-gradient(90deg, var(--coral), #f87171)";
        const shadow = colorClass === "cyan" 
          ? "0 0 6px rgba(37,99,235,0.3)" 
          : "0 0 6px rgba(220,38,38,0.3)";
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:5px; align-items:baseline;">
            <span><strong style="color:var(--text-main); font-size:12px;">${step.label}</strong></span>
            <span style="font-size:11px; color:var(--text3); font-weight:600;">${step.val.toLocaleString()} users (${step.pct}%)</span>
          </div>
          <div class="gk-prog-t" style="height:14px; border-radius:6px;">
            <div class="gk-prog-f" style="width:${step.pct}%; height:100%; border-radius:6px; background:${gradient}; box-shadow:${shadow};"></div>
          </div>
        `;
        container.appendChild(item);
      });
    };

    drawFunnel(iosStats, iosContainer, "cyan");
    drawFunnel(androidStats, androidContainer, "coral");
  }

  function initFunnelFilter() {
    const filterEl = document.getElementById("funnel-filter-channel");
    if (!filterEl) return;
    
    filterEl.addEventListener("change", () => {
      renderFunnelAnalysis();
      addAuditLogEntry(currentPersona, `Lọc phễu Onboarding theo nguồn: "${filterEl.value}"`, "Cập nhật dữ liệu phễu chuyển đổi");
    });
  }

  // Database Explorer Filter Logic
  const dbSearch = document.getElementById("db-search-input");
  const dbFilterSeg = document.getElementById("db-filter-segment");
  const dbFilterDevice = document.getElementById("db-filter-device");

  [dbSearch, dbFilterSeg, dbFilterDevice].forEach(el => {
    el.addEventListener("input", renderDatabaseExplorer);
    el.addEventListener("change", renderDatabaseExplorer);
  });

  const exportBtn = document.getElementById("db-btn-export-csv");
  if (exportBtn) {
    exportBtn.onclick = () => {
      const query = dbSearch.value.trim().toLowerCase();
      const segmentFilter = dbFilterSeg.value;
      const deviceFilter = dbFilterDevice.value;

      const filtered = getFilteredCustomers().filter(cust => {
        if (segmentFilter !== "ALL" && cust.Segment !== segmentFilter) return false;
        if (deviceFilter !== "ALL" && cust.Device !== deviceFilter) return false;
        if (query !== "") {
          const matchesQuery = 
            cust.Customer_ID.toLowerCase().includes(query) ||
            cust.Source.toLowerCase().includes(query) ||
            cust.Country.toLowerCase().includes(query) ||
            cust.AssetPreference.toLowerCase().includes(query);
          if (!matchesQuery) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        showToast("Không có dữ liệu phù hợp để xuất!", "warning");
        return;
      }

      const headers = [
        "Customer ID", "Install Date", "KYC Date", "FTD Date", "Country", 
        "Device", "Source", "Segment", "LTV", "FTD Volume", 
        "COGS", "Incentive", "Net LTV", "Payback Months"
      ];
      
      const csvRows = [headers.join(",")];
      filtered.forEach(cust => {
        const row = [
          cust.Customer_ID,
          cust.Install_Date,
          cust.KYC_Date,
          cust.FTD_Date,
          cust.Country,
          cust.Device,
          cust.Source,
          cust.Segment,
          cust.LTV,
          cust.FTD_Volume,
          cust.OnboardingCogs,
          cust.IncentiveCost,
          cust.NetLtv,
          cust.PaybackMonths
        ];
        const escapedRow = row.map(val => {
          const s = String(val).replace(/"/g, '""');
          return s.includes(",") ? `"${s}"` : s;
        });
        csvRows.push(escapedRow.join(","));
      });

      const csvContent = "\ufeff" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `customer_data_${segmentFilter}_${deviceFilter}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`Đã xuất thành công ${filtered.length} dòng dữ liệu ra CSV!`, "success");
    };
  }

  function renderDatabaseExplorer() {
    const tbody = document.getElementById("db-explorer-tbody");
    if (!tbody) return;

    const query = dbSearch.value.trim().toLowerCase();
    const segmentFilter = dbFilterSeg.value;
    const deviceFilter = dbFilterDevice.value;

    tbody.innerHTML = "";
    
    let totalNetLtv = 0;
    let totalIncentive = 0;

    getFilteredCustomers().forEach(cust => {
      if (segmentFilter !== "ALL" && cust.Segment !== segmentFilter) return;
      if (deviceFilter !== "ALL" && cust.Device !== deviceFilter) return;
      
      if (query !== "") {
        const matchesQuery = 
          cust.Customer_ID.toLowerCase().includes(query) ||
          cust.Source.toLowerCase().includes(query) ||
          cust.Country.toLowerCase().includes(query) ||
          cust.AssetPreference.toLowerCase().includes(query);
        if (!matchesQuery) return;
      }

      totalNetLtv += cust.NetLtv;
      totalIncentive += cust.IncentiveCost;

      let paybackText = "-";
      if (cust.FTD_Date !== "None") {
        if (cust.Source === "Organic") {
          paybackText = "Instant";
        } else if (cust.PaybackMonths >= 24.0) {
          paybackText = ">24m";
        } else {
          paybackText = cust.PaybackMonths.toFixed(1) + "m";
        }
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span style="font-family: monospace; font-weight:700;">${cust.Customer_ID}</span></td>
        <td style="font-size:11px; color:var(--text-muted);">${cust.Install_Date}</td>
        <td style="font-size:11px; color:var(--text-muted);">${cust.KYC_Date}</td>
        <td style="font-size:11px; color:var(--text-muted);">${cust.FTD_Date}</td>
        <td>${cust.Country}</td>
        <td><span style="font-size: 11px;">${cust.Device}</span></td>
        <td><span style="font-size:12px; opacity:0.8;">${cust.Source}</span></td>
        <td><span class="badge ${cust.Segment === 'Whale'?'scale': cust.Segment === 'Core'?'optimize':'test'}">${cust.Segment}</span></td>
        <td><strong>$${cust.LTV.toLocaleString()}</strong></td>
        <td><span style="font-weight:600; color:var(--purple); font-family:monospace;">$${cust.FTD_Volume.toLocaleString()}</span></td>
        <td style="text-align: right; font-family:monospace; color:var(--coral); font-weight:600;">$${cust.OnboardingCogs.toFixed(2)}</td>
        <td style="text-align: right; font-family:monospace; color:var(--orange); font-weight:600;">$${cust.IncentiveCost.toFixed(2)}</td>
        <td style="text-align: right; font-family:monospace; color:var(--teal); font-weight:700;">$${cust.NetLtv.toFixed(2)}</td>
        <td style="text-align: right; font-family:monospace; font-weight:600; color:${cust.PaybackMonths > 6.0 ? 'var(--coral)' : 'var(--purple)'}">${paybackText}</td>
      `;
      tbody.appendChild(tr);
    });

    const iei = totalIncentive > 0 ? (totalNetLtv / totalIncentive) : 0;
    const ieiEl = document.getElementById("intel-incentive-efficiency");
    if (ieiEl) {
      ieiEl.textContent = `${iei.toFixed(2)}x`;
    }
  }

  // Customer KPI Grid — tính TỪ DỮ LIỆU THẬT (db.customers) thay vì số cứng
  function renderCustomerKpiGrid() {
    const cs = getFilteredCustomers();
    const total = cs.length || 1;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    // Hệ số kỳ — DÙNG CHUNG công thức với gdLiveKPIs để persona & tab Khách hàng luôn trùng số
    const eff = (typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    const pf = (typeof gdPeriodFactor === "function" ? gdPeriodFactor() : 1);
    const cumAdj = Math.min(1.6, Math.pow(pf, 0.2));
    // Whale Rate = % khách thuộc nhóm Whale (dịch theo hiệu suất kỳ)
    const whales = cs.filter(c => c.Whale_Flag === "Yes" || c.Segment === "Whale").length;
    set("intel-whalerate", (whales / total * 100 * eff).toFixed(1) + "%");
    // Activation Rate (cộng dồn theo kỳ — khớp k.activeTrader)
    const activated = cs.filter(c => (c.Trade_Count || 0) >= 1).length;
    const ovActiveTrader = (typeof getMetricOverride === "function") ? getMetricOverride("active_trader_rate") : null;
    const activeTraderVal = ovActiveTrader !== null ? ovActiveTrader.toFixed(1) + "%" : (Math.min(98, activated / total * 100 * cumAdj).toFixed(1) + "%");
    set("intel-activation", activeTraderVal);
    // Trades / User (cộng dồn theo kỳ — khớp k.tradesUser)
    const totalTrades = cs.reduce((a, c) => a + (c.Trade_Count || 0), 0);
    set("intel-trades-user", (totalTrades / total * Math.pow(pf, 0.5)).toFixed(1));
    // Organic KYC (dịch theo hiệu suất kỳ)
    const organic = cs.filter(c => (c.PrimaryAwarenessChannel || c.Source) === "Organic").length;
    set("intel-organic-kyc", (organic / total * 100 * eff).toFixed(1) + "%");
    // High Intent Rate = % khách ít ma sát tới KYC (InteractionsToKyc ≤ 3)
    const highIntent = cs.filter(c => (typeof c.InteractionsToKyc === "number" ? c.InteractionsToKyc : 99) <= 3).length;
    set("intel-highintent", Math.min(99, highIntent / total * 100 * eff).toFixed(1) + "%");
    // Avg Time to Activate = trung bình số ngày Install → FTD
    let sumDays = 0, n = 0;
    cs.forEach(c => {
      if (c.Install_Date && c.FTD_Date) {
        const d = (new Date(c.FTD_Date) - new Date(c.Install_Date)) / 86400000;
        if (d >= 0 && d < 365) { sumDays += d; n++; }
      }
    });
    set("intel-time-act", n ? (sumDays / n).toFixed(1) + " ngày" : "--");

    // Trend badges theo kỳ (giữ nhãn MoM, đổi số theo "momentum" của kỳ) — trước đây bị cứng, không đổi khi chuyển mốc thời gian
    const mom = Math.min(2.2, Math.max(0.6, Math.pow(pf, 0.3)));
    const badgeDefs = [
      { v: 1.2, up: true,  fmt: x => "+" + x.toFixed(1) + "% MoM" },
      { v: 0.8, up: false, fmt: x => "-" + x.toFixed(1) + "% MoM" },
      { v: 2.0, up: true,  fmt: x => "+" + x.toFixed(1) + "% MoM" },
      { v: 12,  up: false, fmt: x => "-" + Math.round(x) + "m (Faster)" },
      { v: 1.8, up: true,  fmt: x => "+" + x.toFixed(1) + " MoM" },
      { v: 1.4, up: false, fmt: x => "-" + x.toFixed(1) + "% MoM" }
      // thẻ thứ 7 (IEI) giữ nguyên nhãn "Net LTV / Incentive"
    ];
    const custCards = document.querySelectorAll("#cust-subtab-segments .row-kpi-grid > .kpi-card");
    badgeDefs.forEach((d, i) => {
      const card = custCards[i]; if (!card) return;
      const badge = card.querySelector(".kpi-trend"); if (!badge) return;
      badge.innerHTML = '<i data-lucide="' + (d.up ? "trending-up" : "trending-down") + '"></i> ' + d.fmt(d.v * mom);
    });
    if (window.lucide && lucide.createIcons) { try { lucide.createIcons(); } catch (e) {} }

    try { renderCustomerSparklines(); } catch (e) {}
  }

  // Sparkline mini cho dải KPI Khách hàng (giống dải Overview): mỗi đường KẾT THÚC đúng giá trị hiện tại
  function renderCustomerSparklines() {
    const num = id => { const e = document.getElementById(id); return e ? (parseFloat(String(e.textContent).replace(/[^0-9.]/g, "")) || 0) : 0; };
    const endAt = (arr, target) => {
      const tilted = (typeof gdTiltSeries === "function") ? gdTiltSeries(arr, (window.GD_EFF > 0 ? window.GD_EFF : 1)) : arr;
      const last = tilted[tilted.length - 1] || 1; const f = (last && isFinite(target) && target) ? target / last : 1;
      return tilted.map(v => v * f);
    };
    renderSparkline("spark-intel-activation", endAt([55, 57, 56, 58, 59, 60], num("intel-activation")), "#6454E3");
    renderSparkline("spark-intel-whalerate", endAt([9.2, 9.0, 8.9, 8.8, 8.7, 8.6], num("intel-whalerate")), "#F59E0B");
    renderSparkline("spark-intel-highintent", endAt([22, 23, 24, 25, 26, 26.6], num("intel-highintent")), "#0E9C8A");
    renderSparkline("spark-intel-time-act", endAt([3.0, 2.8, 2.6, 2.5, 2.3, 2.2], num("intel-time-act")), "#2563EB");
    renderSparkline("spark-intel-trades-user", endAt([8.5, 9.0, 9.3, 9.8, 10.0, 10.3], num("intel-trades-user")), "#10B981");
    renderSparkline("spark-intel-organic-kyc", endAt([43, 42.5, 42, 41.5, 41.2, 41], num("intel-organic-kyc")), "#8B5CF6");
    renderSparkline("spark-intel-incentive-efficiency", endAt([40, 44, 47, 50, 52, 54.7], num("intel-incentive-efficiency")), "#16A34A");
  }

  // ===== Reusable "Value Health + Chỉ báo & Lưu ý" block (giống tab Khách hàng) cho các tab Tăng trưởng =====
  function gkColOf(k){ return k==='g'?'var(--green)':k==='a'?'var(--amber)':k==='r'?'var(--coral)':'var(--purple)'; }
  function gkBadge(txt,k){ var c=gkColOf(k), bg=k==='g'?'rgba(63,185,80,.14)':k==='a'?'rgba(216,165,42,.16)':k==='r'?'rgba(248,81,73,.14)':'rgba(100,84,227,.12)'; return '<span class="gk-signal-badge" style="color:'+c+';background:'+bg+'">'+txt+'</span>'; }
  function gkPct(n){ return (Math.round(n*10)/10).toFixed(1).replace('.',',')+'%'; }
  function gkSparkSVG(p, vals){
    if(!vals||vals.length<2) return '';
    var W=300,H=66,pad=4,mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rng=(mx-mn)||1;
    var pts=vals.map(function(v,i){return [pad+i/(vals.length-1)*(W-2*pad), H-pad-(v-mn)/rng*(H-2*pad)];});
    var d='M '+pts.map(function(pt){return pt[0].toFixed(1)+' '+pt[1].toFixed(1);}).join(' L ');
    var last=pts[pts.length-1];
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="'+p+'SpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(100,84,227,.28)"></stop><stop offset="1" stop-color="rgba(100,84,227,0)"></stop></linearGradient></defs>'
      +'<path d="'+d+' L '+(W-pad)+' '+H+' L '+pad+' '+H+' Z" fill="url(#'+p+'SpG)"></path>'
      +'<path d="'+d+'" fill="none" stroke="#6454e3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>'
      +'<circle cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="3.5" fill="#6454e3"></circle></svg>';
  }
  function gkDrawGauge(p, score){
    var A0=-132, SWEEP=264, R=46;
    function polar(cx,cy,r,deg){var a=deg*Math.PI/180; return [cx+r*Math.sin(a), cy-r*Math.cos(a)];}
    function arcPath(cx,cy,r,a0,a1){var q0=polar(cx,cy,r,a0),q1=polar(cx,cy,r,a1),lg=(a1-a0)>180?1:0; return 'M '+q0[0].toFixed(2)+' '+q0[1].toFixed(2)+' A '+r+' '+r+' 0 '+lg+' 1 '+q1[0].toFixed(2)+' '+q1[1].toFixed(2);}
    var track=document.getElementById(p+'-arc-track'), arc=document.getElementById(p+'-arc'), needle=document.getElementById(p+'-needle');
    if(!arc||!track||!needle) return;
    var dPath=arcPath(80,80,R,A0,A0+SWEEP); track.setAttribute('d',dPath); arc.setAttribute('d',dPath);
    var L=typeof arc.getTotalLength === 'function' ? arc.getTotalLength() : 280; var frac=Math.max(.05,Math.min(1,score/100));
    arc.style.strokeDasharray=L; arc.style.strokeDashoffset=L*(1-frac);
    needle.style.transform='rotate('+(A0+SWEEP*frac)+'deg)';
  }
  function gkRenderSignals(elId, signals, notes){
    var host=document.getElementById(elId); if(!host) return;
    var tiles=(signals||[]).map(function(d){
      var col=gkColOf(d.b[1]), w=Math.max(4,Math.min(100,d.val)), valTxt=d.disp||gkPct(d.val);
      return '<div class="gk-signal"><div class="gk-signal-top"><div class="gk-signal-ic" style="background:'+d.icbg+';color:'+d.iccol+'"><i data-lucide="'+d.ic+'"></i></div><div class="gk-signal-lab">'+d.lab+'</div></div>'
        +'<div class="gk-signal-row2"><div class="gk-signal-val">'+valTxt+'</div>'+gkBadge(d.b[0],d.b[1])+'</div>'
        +'<div class="gk-signal-meter"><i style="width:'+w+'%;background:'+col+'"></i></div></div>';
    }).join('');
    var noteItems=(notes||[]).map(function(n){ return '<div class="gk-note-item"><span class="gk-note-dot" style="background:'+gkColOf(n[0])+'"></span><span>'+n[1]+'</span></div>'; }).join('');
    host.innerHTML = tiles + '<div class="gk-note"><div class="gk-note-title"><i data-lucide="sticky-note"></i> Lưu ý</div>'+noteItems+'</div>';
  }
  function gkLabelOf(s){ return s>=85?'Xuất sắc':s>=70?'Tốt':s>=50?'Khá':'Cần cải thiện'; }
  // Scale 1 dải KPI tĩnh theo kỳ: set lại text .kpi-value (base×factor) + vẽ lại sparkline. defs theo đúng thứ tự thẻ.
  function gkScaleKpiStrip(scopeSel, defs){
    var vals = document.querySelectorAll(scopeSel + ' .kpi-value');
    defs.forEach(function(d,i){
      if (d.base != null && vals[i]) vals[i].textContent = d.fmt(d.base * d.f);
      if (d.id && typeof renderSparkline === "function") renderSparkline(d.id, (d.spark||[]).map(function(x){return x*d.f;}), d.col);
    });
  }
  // ---- Generic drift: dịch các chỉ số TĨNH (chưa wired theo kỳ) trên 1 tab theo period factor ----
  function gdParseNum(tok){
    tok = tok.trim();
    if (/^\d{1,3}(\.\d{3})+$/.test(tok)) return { v: parseInt(tok.replace(/\./g,''),10), dec:0, thou:true, comma:false };
    if (tok.indexOf(',')>=0){ var d=tok.split(',')[1]; return { v: parseFloat(tok.replace(/\./g,'').replace(',','.')), dec:d?d.length:0, thou:tok.indexOf('.')>=0, comma:true }; }
    var dd=tok.split('.')[1]; return { v: parseFloat(tok), dec:dd?dd.length:0, thou:false, comma:false };
  }
  function gdFmtNum(v, m){
    if (m.thou && !m.comma) return Math.round(v).toLocaleString('vi-VN');
    var s = v.toFixed(m.dec);
    if (m.comma){ if(m.thou){ var p=s.split('.'); return parseInt(p[0],10).toLocaleString('vi-VN')+','+(p[1]||''); } return s.replace('.', ','); }
    return s;
  }
  function gdDriftStatic(pane){
    if (!pane || pane.id === 'tab-executive') return; // Executive đã wired đầy đủ
    var eff = (typeof gdEffFactor==='function'?gdEffFactor():1), pf=(window.GD_PERIOD_FACTOR>0?window.GD_PERIOD_FACTOR:1);
    var SKIP_ID = /^(kpi-|intel-|ct-|ad-|spark-|pg-kfactor$)/; // các id đã được render-fn khác scale
    var nodes = [].slice.call(pane.querySelectorAll('.gk-signal-val, .radial-gauge-value, .seg3-count, .gh-dim-val'));
    [].forEach.call(pane.querySelectorAll('div,span,strong'), function(el){
      if (el.children.length>1) return;
      var fs=parseFloat(getComputedStyle(el).fontSize)||0; if(fs<16) return;
      if (/^[~$]?\d[\d.,]*\s*(%|x|tr|đ|days|ngày|giờ|h|clips|trang|lệnh|tasks)?$/i.test(el.textContent.trim())) nodes.push(el);
    });
    var seen=[];
    nodes.forEach(function(el){
      if (seen.indexOf(el)>=0) return; seen.push(el);
      if (el.id && SKIP_ID.test(el.id)) return;
      if (el.closest('.row-kpi-grid, #vh-card, #sig-card, #vh-signals, [id$="-vh-card"], [id$="-sig-card"]')) return; // KPI strips + VH cards + Chỉ báo Khách hàng (#sig-card tự tính theo kỳ) — không để gdDriftStatic scale chồng
      var base = el.getAttribute('data-pbase'); if (base==null){ base=el.textContent.trim(); el.setAttribute('data-pbase', base); }
      var toks = base.match(/\d[\d.,]*/g) || [];
      if (toks.length !== 1) return; // chỉ scale ô có ĐÚNG 1 số (bỏ "82/100", "18%/32%")
      var m = gdParseNum(toks[0]); if (!isFinite(m.v)) return;
      var factor = (/\$/.test(base) && m.v>=1000) ? pf : eff;
      el.textContent = base.replace(toks[0], gdFmtNum(m.v*factor, m));
    });
  }
  function mountVHBlock(grid, p, cfg){
    if(!grid) return;
    // Áp một bộ cấu hình (score/label/gauge/bars/spark/delta) lên thẻ — dùng cho cả render đầu lẫn khi bấm nút kỳ.
    function applyVH(c){
      var lab=document.getElementById(p+'-label'); if(lab){ lab.textContent=gkLabelOf(c.score); lab.style.color=c.score>=70?'var(--green)':c.score>=50?'var(--amber)':'var(--coral)'; }
      var sEl=document.getElementById(p+'-score'); if(sEl) sEl.textContent=c.score;
      var dEl=document.getElementById(p+'-delta'); if(dEl){ dEl.textContent=c.delta||''; dEl.className='d'+(c.deltaNeg?' neg':''); }
      gkDrawGauge(p, c.score);
      (c.bars||[]).forEach(function(b,i){ var el=document.getElementById(p+'-bar'+i); if(el) el.style.width=b.val+'%'; var tv=document.getElementById(p+'-bar'+i+'-v'); if(tv) tv.textContent=b.val+'/100'; });
      var sp=document.getElementById(p+'-spark'); if(sp) sp.innerHTML=gkSparkSVG(p, c.spark||[]);
    }
    var curD=(typeof execTimeframeDays==="number"&&execTimeframeDays>0)?execTimeframeDays:30;
    if(!document.getElementById(p+'-vh-card')){
      var barsHTML=(cfg.bars||[]).map(function(b,i){
        return '<div class="gk-prog"><div class="gk-prog-h"><b>'+b.label+'</b><span id="'+p+'-bar'+i+'-v">'+b.val+'/100</span></div><div class="gk-prog-t"><div class="gk-prog-f" id="'+p+'-bar'+i+'" style="width:0%"></div></div></div>';
      }).join('');
      var segItems=[[365,'1 năm'],[180,'6 th'],[90,'3 th'],[30,'1 th'],[7,'7 ngày']];
      var segHTML='<div class="gk-seg" id="'+p+'-seg">'+segItems.map(function(it){ return '<button'+(it[0]===curD?' class="active"':'')+' data-days="'+it[0]+'" type="button">'+it[1]+'</button>'; }).join('')+'</div>';
      var vh='<div class="gk-card gk-card--vh" id="'+p+'-vh-card" style="grid-column: span 4; order:-2;">'
        +'<div class="gk-head"><span class="gk-coin"><i data-lucide="'+(cfg.gaugeIcon||'award')+'"></i></span><span class="gk-title">'+cfg.gaugeTitle+'</span></div>'
        +'<div class="gk-body"><div class="gk-gauge"><div class="gk-dial" id="'+p+'-dial">'
        +'<svg viewBox="0 0 160 160"><defs>'
        +'<linearGradient id="'+p+'ArcGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#a78bfa"></stop><stop offset="1" stop-color="#6454e3"></stop></linearGradient>'
        +'<filter id="'+p+'Glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter></defs>'
        +'<circle class="gk-face" cx="80" cy="80" r="60"></circle>'
        +'<path id="'+p+'-arc-track" class="gk-arc-track" fill="none" stroke-width="10" stroke-linecap="round"></path>'
        +'<path id="'+p+'-arc" class="gk-arc" fill="none" stroke="url(#'+p+'ArcGrad)" stroke-width="10" stroke-linecap="round" filter="url(#'+p+'Glow)"></path>'
        +'<g class="gk-needle" id="'+p+'-needle"><line x1="80" y1="80" x2="80" y2="38" stroke="#6454e3" stroke-width="3.2" stroke-linecap="round"></line></g>'
        +'<circle cx="80" cy="80" r="7" fill="#6454e3"></circle><circle cx="80" cy="80" r="3" fill="#ffffff"></circle>'
        +'</svg></div></div>'
        +'<div class="gk-score"><span class="lab" id="'+p+'-label">Tốt</span><span class="v"><span id="'+p+'-score">'+cfg.score+'</span><small>/100</small></span><span class="d'+(cfg.deltaNeg?' neg':'')+'" id="'+p+'-delta">'+(cfg.delta||'')+'</span></div>'
        +barsHTML
        +segHTML
        +'<div class="gk-spark" id="'+p+'-spark"></div>'
        +'</div></div>';
      var sig='<div class="gk-card sig-card" id="'+p+'-sig-card" style="grid-column: span 8; order:-2;">'
        +'<div class="gk-head"><span class="gk-coin" style="background:linear-gradient(145deg,#fde0c4,#f5a35a);color:#9a4d12;"><i data-lucide="'+(cfg.sigIcon||'alert-triangle')+'"></i></span><span class="gk-title">Chỉ báo &amp; Lưu ý</span></div>'
        +'<div class="gk-body"><div class="gk-signals" id="'+p+'-signals"></div></div></div>';
      grid.insertAdjacentHTML('afterbegin', sig);
      grid.insertAdjacentHTML('afterbegin', vh);
      var seg=document.getElementById(p+'-seg');
      if(seg) seg.addEventListener('click', function(e){
        var b=e.target.closest('button'); if(!b) return;
        [].forEach.call(seg.children,function(x){x.classList.remove('active');}); b.classList.add('active');
        var days=parseInt(b.getAttribute('data-days'),10)||30;
        var live=(document.getElementById(p+'-vh-card')||{})._vhCfg||cfg;
        var nc=(typeof live.recompute==='function')?live.recompute(days):live;   // dựng lại số liệu theo kỳ vừa chọn
        applyVH(nc);
        if(window.lucide&&lucide.createIcons){ try{ lucide.createIcons(); }catch(e){} }
      });
    } else {
      // Re-mount (đổi kỳ trên topbar): đồng bộ nút kỳ đang sáng theo kỳ hiện tại
      var seg2=document.getElementById(p+'-seg');
      if(seg2) [].forEach.call(seg2.children,function(x){ x.classList.toggle('active', parseInt(x.getAttribute('data-days'),10)===curD); });
    }
    applyVH(cfg);
    var cardEl=document.getElementById(p+'-vh-card'); if(cardEl) cardEl._vhCfg=cfg;   // lưu cfg mới nhất để nút kỳ luôn dùng recompute hiện hành
    gkRenderSignals(p+'-signals', cfg.signals, cfg.notes);
    if(window.lucide&&lucide.createIcons){ try{ lucide.createIcons(); }catch(e){} }
  }

  // Cấu hình "Value Health + Chỉ báo" cho tab Nội dung (Content)
  function mountContentVHBlock(){
    var grid = document.querySelector('#tab-content .dashboard-grid');
    function build(eff){
      var R = function(v){ return Math.max(5, Math.min(99, Math.round(v*eff))); };
      var hook = 33.4*eff, cvr = 22.4*eff, ai = Math.min(99, 82*eff), fat = 14.3/eff, dlt = 2.4/eff;
      return {
        gaugeTitle: 'Sức khỏe Creative', gaugeIcon: 'brush', score: R(72),
        delta: '+'+dlt.toFixed(1).replace('.',',')+'%', deltaNeg:false,
        bars: [{label:'Chất lượng Hook', val:R(78)}, {label:'Giữ chân video', val:R(66)}],
        spark: gdTiltSeries([60,63,61,66,64,69,67,72], eff),
        sigIcon: 'clapperboard',
        signals: [
          {ic:'zap', icbg:'linear-gradient(145deg,#e9defe,#b9a6f5)', iccol:'#5b3fd6', lab:'Hook Rate (3s)', val:hook, b:['Trung bình','a']},
          {ic:'mouse-pointer-click', icbg:'linear-gradient(145deg,#cfeee6,#7fd8c6)', iccol:'#0c6b5c', lab:'Tỷ lệ chuyển đổi', val:cvr, b:['Khá','a']},
          {ic:'sparkles', icbg:'linear-gradient(145deg,#cfe0fb,#86b2f5)', iccol:'#1c4fb3', lab:'Điểm AI Creative', val:ai, disp:Math.round(ai)+'/100', b:['Tốt','g']},
          {ic:'flame', icbg:'linear-gradient(145deg,#fde1b0,#f6c343)', iccol:'#8a6510', lab:'Mức Fatigue', val:fat, b:['Thấp','g']}
        ],
        notes: [
          ['a','Hook Rate '+gkPct(hook)+' — tối ưu 3 giây đầu (FOMO) để tăng giữ chân video.'],
          ['r','4 mẫu quảng cáo có dấu hiệu Fatigue — làm mới creative sớm.'],
          ['g','Điểm AI Creative '+Math.round(ai)+' — thẩm mỹ tốt, giữ hướng sản xuất hiện tại.']
        ]
      };
    }
    var cfg = build(typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    cfg.recompute = function(days){ return build(gdEffForDays(days)); };
    mountVHBlock(grid, 'ct', cfg);
  }

  function renderAcquisitionKpiSparklines(){
    if (typeof renderSparkline !== "function") return;
    var eff=(typeof gdEffFactor==="function"?gdEffFactor():1), pf=(window.GD_PERIOD_FACTOR>0?window.GD_PERIOD_FACTOR:1);
    gkScaleKpiStrip('#acq-subtab-performance .row-kpi-grid', [
      { base:10.5, f:1/eff, fmt:function(v){return "$"+v.toFixed(2);}, id:"spark-ad-cac", spark:[12.5,12.0,11.6,11.2,10.9,10.5], col:"#D97706" },
      { base:3.05, f:eff, fmt:function(v){return v.toFixed(2)+"x";}, id:"spark-ad-roas", spark:[2.6,2.7,2.8,2.9,3.0,3.05], col:"#16A34A" },
      { base:2.05, f:eff, fmt:function(v){return v.toFixed(2)+"x";}, id:"spark-ad-roi", spark:[1.7,1.8,1.85,1.95,2.0,2.05], col:"#6454E3" },
      { base:178000, f:pf, fmt:function(v){return "$"+Math.round(v).toLocaleString('vi-VN');}, id:"spark-ad-spend", spark:[150,156,160,168,173,178], col:"#2563EB" },
      { base:3.5, f:eff, fmt:function(v){return v.toFixed(2)+"x";}, id:"spark-ad-best", spark:[3.0,3.1,3.2,3.3,3.4,3.5], col:"#16A34A" },
      { base:77.6, f:eff, fmt:function(v){return Math.min(95,v).toFixed(1)+"%";}, id:"spark-ad-paid", spark:[72,73,74,75,76,77.6], col:"#0E9C8A" }
    ]);
  }
  // Cấu hình "Sức khỏe Kênh + Chỉ báo" cho tab Quảng cáo (Acquisition)
  function mountAcquisitionVHBlock(){
    var grid = document.getElementById('ad-vh-grid');
    function build(eff){
      var R = function(v){ return Math.max(5, Math.min(99, Math.round(v*eff))); };
      var paid = Math.min(95, 77.6*eff), bestRoi = 3.5*eff, organic = 22.4*eff, dlt = 3.1/eff;
      return {
        gaugeTitle: 'Sức khỏe Kênh', gaugeIcon: 'compass', score: R(84),
        delta: '+'+dlt.toFixed(1).replace('.',',')+'%', deltaNeg:false,
        bars: [{label:'Hiệu quả chi tiêu', val:R(82)}, {label:'Đa dạng kênh', val:R(71)}],
        spark: gdTiltSeries([74,77,76,80,79,82,81,84], eff),
        sigIcon: 'megaphone',
        signals: [
          {ic:'pie-chart', icbg:'linear-gradient(145deg,#cfeee6,#7fd8c6)', iccol:'#0c6b5c', lab:'Tỷ trọng Paid', val:paid, b:['Phụ thuộc Paid','a']},
          {ic:'award', icbg:'linear-gradient(145deg,#cdebd6,#7fcf9b)', iccol:'#15803d', lab:'Best Channel ROI', val:70, disp:bestRoi.toFixed(2)+'x', b:['Tốt','g']},
          {ic:'alert-triangle', icbg:'linear-gradient(145deg,#fde0c4,#f5a35a)', iccol:'#9a4d12', lab:'Bão hòa TikTok', val:55, disp:'CAC +18%', b:['Theo dõi','a']},
          {ic:'sprout', icbg:'linear-gradient(145deg,#e9defe,#b9a6f5)', iccol:'#5b3fd6', lab:'Tỷ trọng Organic', val:organic, b:['Cần tăng','a']}
        ],
        notes: [
          ['a','Tỷ trọng Paid '+gkPct(paid)+' — tăng kênh Organic/Referral để giảm phụ thuộc & rủi ro CAC.'],
          ['r','TikTok bão hòa (CAC biên +18%) — giảm ngân sách, thử kênh mới (Apple/Google).'],
          ['g','Apple Search ROI '+bestRoi.toFixed(2)+'x — kênh tốt nhất, cân nhắc mở rộng ngân sách.']
        ]
      };
    }
    var cfg = build(typeof gdEffFactor === "function" ? gdEffFactor() : 1);
    cfg.recompute = function(days){ return build(gdEffForDays(days)); };
    mountVHBlock(grid, 'ad', cfg);
  }

  // -------------------------------------------------------------
  // Tab 3: Customer Value & Payback Matrices
  // -------------------------------------------------------------
  // Bảng RFM (SEGMENT NAME · USERS · BEHAVIOR · ACTION) — nằm ở subtab "segments"
  function renderRfmTable() {
    const rfmTbody = document.getElementById("rfm-tbody");
    if (!rfmTbody) return;
    rfmTbody.innerHTML = "";
    const factor = (typeof window !== "undefined" && window.GD_PERIOD_FACTOR > 0) ? window.GD_PERIOD_FACTOR : 1;
    (db.rfmSegments || []).forEach(row => {
      const scaledCount = Math.round(row.count * factor);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.Segment}</strong></td>
        <td><span class="badge scale" style="background:var(--purple-soft); color:var(--purple);">${scaledCount.toLocaleString()} users</span></td>
        <td style="color:var(--text3);">${row.description}</td>
        <td><button class="btn btn-secondary rfm-action-btn" onclick="triggerRfmAction('${row.Segment}', '${row.action}')">Run: ${row.action}</button></td>
      `;
      rfmTbody.appendChild(tr);
    });
  }

  function renderCustomerValueTab() {
    try { renderCustomerKpiGrid(); } catch (e) { console.error("renderCustomerKpiGrid:", e); }
    // 1. Render Retention Cohort Heatmap
    const tbody = document.getElementById("cohort-tbody");
    const timeframeDays = typeof execTimeframeDays === "number" ? execTimeframeDays : 30;
    let filteredCohorts = db.cohortMatrix || [];
    let filteredLtvCohorts = db.cohortLtvMatrix || [];
    if (timeframeDays <= 30) {
      filteredCohorts = filteredCohorts.filter(c => c.cohort.includes("05") || c.cohort.includes("06"));
      filteredLtvCohorts = filteredLtvCohorts.filter(c => c.cohort.includes("05") || c.cohort.includes("06"));
    } else if (timeframeDays <= 90) {
      filteredCohorts = filteredCohorts.filter(c => c.cohort.includes("04") || c.cohort.includes("05") || c.cohort.includes("06"));
      filteredLtvCohorts = filteredLtvCohorts.filter(c => c.cohort.includes("04") || c.cohort.includes("05") || c.cohort.includes("06"));
    } else if (timeframeDays <= 180) {
      filteredCohorts = filteredCohorts.filter(c => !c.cohort.includes("01"));
      filteredLtvCohorts = filteredLtvCohorts.filter(c => !c.cohort.includes("01"));
    }

    if (tbody) {
      tbody.innerHTML = "";
      filteredCohorts.forEach(row => {
        const tr = document.createElement("tr");
        const getHeatClass = (val) => {
          if (val === null) return "ch-none";
          if (val >= 40) return "ch-high";
          if (val >= 30) return "ch-med-high";
          if (val >= 20) return "ch-med";
          if (val >= 10) return "ch-med-low";
          return "ch-low";
        };

        tr.innerHTML = `
          <td><strong>${row.cohort}</strong></td>
          <td style="color:var(--text-muted);">${row.size}</td>
          <td class="cohort-cell ${getHeatClass(row.d1)}">${row.d1}%</td>
          <td class="cohort-cell ${getHeatClass(row.d7)}">${row.d7}%</td>
          <td class="cohort-cell ${getHeatClass(row.d14)}">${row.d14}%</td>
          <td class="cohort-cell ${getHeatClass(row.d30)}">${row.d30}%</td>
          <td class="cohort-cell ${getHeatClass(row.d60)}">${row.d60 !== null ? row.d60+"%" : "-"}</td>
          <td class="cohort-cell ${getHeatClass(row.d90)}">${row.d90 !== null ? row.d90+"%" : "-"}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // 2. Render Cumulative LTV Cohort Matrix
    const ltvTbody = document.getElementById("cohort-ltv-tbody");
    if (ltvTbody) {
      ltvTbody.innerHTML = "";
      filteredLtvCohorts.forEach(row => {
        const tr = document.createElement("tr");
        const getLtvHeatClass = (val) => {
          if (val === null) return "ch-none";
          if (val >= 130) return "ch-high";
          if (val >= 90) return "ch-med-high";
          if (val >= 60) return "ch-med";
          if (val >= 30) return "ch-med-low";
          return "ch-low";
        };

        tr.innerHTML = `
          <td><strong>${row.cohort}</strong></td>
          <td style="color:var(--text-muted);">${row.size}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d1)}">$${row.d1.toFixed(2)}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d7)}">$${row.d7.toFixed(2)}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d14)}">$${row.d14.toFixed(2)}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d30)}">$${row.d30.toFixed(2)}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d60)}">${row.d60 !== null ? "$"+row.d60.toFixed(2) : "-"}</td>
          <td class="cohort-cell ${getLtvHeatClass(row.d90)}">${row.d90 !== null ? "$"+row.d90.toFixed(2) : "-"}</td>
        `;
        ltvTbody.appendChild(tr);
      });
    }

    // 3. Render Cohort Survival Curve Chart
    const ctx = document.getElementById("survivalChart");
    if (ctx) {
      if (survivalChartRef) survivalChartRef.destroy();
      const latestCohort = filteredCohorts.length >= 2 ? filteredCohorts[filteredCohorts.length - 2] : filteredCohorts[0];
      survivalChartRef = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Day 1", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"],
          datasets: [{
            label: `Cohort ${latestCohort.cohort} Survival`,
            data: [latestCohort.d1, latestCohort.d7, latestCohort.d14, latestCohort.d30, latestCohort.d60, latestCohort.d90],
            borderColor: "#6454e3",
            backgroundColor: "rgba(102, 85, 230, 0.08)",
            fill: true,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          onClick: (event, elements) => {
            if (elements && elements.length > 0) {
              const idx = elements[0].index;
              const labelsArr = ["Day 1", "Day 7", "Day 14", "Day 30", "Day 60", "Day 90"];
              const dataArr = [latestCohort.d1, latestCohort.d7, latestCohort.d14, latestCohort.d30, latestCohort.d60, latestCohort.d90];
              const label = labelsArr[idx];
              const val = dataArr[idx];
              showToast(`Tỷ lệ giữ chân nhóm ${latestCohort.cohort} tại ${label}: ${val}%`, "success");
            }
          },
          scales: {
            y: { min: 0, max: 100, grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } },
            x: { grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } }
          },
          plugins: {
            legend: { labels: { color: gdTickColor(), font: { family: "Plus Jakarta Sans" } } }
          }
        }
      });
    }

    // 4. Render RFM Table (đã tách ra renderRfmTable để gọi được ở subtab "segments" nơi bảng hiển thị)
    renderRfmTable();

    // Setup Reactivation ROI Simulator events
    ["sim-push", "sim-email", "sim-sms", "sim-call"].forEach(id => {
      document.getElementById(id).addEventListener("input", calculateReactivationSimulator);
    });
    calculateReactivationSimulator();

    // Setup Asset Migration Flow visualizer
    renderAssetMigration("Crypto");
  }

  // Asset Migration Click Handler
  const migrationCards = document.querySelectorAll(".migration-source-card");
  migrationCards.forEach(card => {
    card.addEventListener("click", () => {
      document.querySelector(".migration-source-card.selected")?.classList.remove("selected");
      card.classList.add("selected");
      renderAssetMigration(card.getAttribute("data-asset"));
    });
  });
  // KHÔI PHỤC dữ liệu thiếu: render sẵn tỉ lệ cho nguồn mặc định (Crypto) khi tải, không chờ click
  try { renderAssetMigration("Crypto"); } catch (e) { console.error("init renderAssetMigration:", e); }

  // FIX TOOL: bind slider Reactivation Simulator ở TOP-LEVEL (trước đây chỉ bind trong
  // renderCustomerValueTab() — chỉ chạy ở subtab "cohorts", nên simulator ở subtab "segments" KHÔNG hoạt động).
  // Dùng cùng tham chiếu hàm nên không nhân đôi listener dù renderCustomerValueTab có bind lại.
  ["sim-push", "sim-email", "sim-sms", "sim-call"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", calculateReactivationSimulator);
  });
  try { calculateReactivationSimulator(); } catch (e) {}

  function renderAssetMigration(asset) {
    const container = document.getElementById("migration-rates-display");
    if (!container) return;

    container.innerHTML = "";
    const rates = db.assetMigrationMatrix[asset];

    let maxTarget = "";
    let maxRate = 0;
    Object.keys(rates).forEach(dest => {
      if (dest !== "Stay" && rates[dest] > maxRate) {
        maxRate = rates[dest];
        maxTarget = dest;
      }
    });

    const recTexts = {
      Stocks: "Khách hàng đầu tư Cổ phiếu có xu hướng dịch chuyển mạnh sang mua Vàng (Gold - 20%) phòng hộ lạm phát. Khuyến nghị gửi email phân tích thị trường vàng.",
      Crypto: "Người dùng giao dịch Crypto có xu hướng chuyển hướng sang Stocks (22%) để đa dạng hóa danh mục. Gợi ý hiển thị pop-up khuyến mãi Trade không phí Cổ phiếu.",
      Gold: "Nhóm mua Vàng thường di chuyển sang Stocks (25%). Gợi ý đưa cổ phiếu Blue-chip vào giỏ quà tặng đăng ký.",
      FX: "Tệp chơi ngoại hối (FX) chuyển sang Options (22%) để tối đa đòn bẩy. Đề xuất gửi tài liệu hướng dẫn Trade Options cơ bản.",
      Options: "Khách hàng trade Options chuyển sang Stocks (30%). Khuyến khích kích hoạt tính năng tự động chuyển lãi từ Options sang mua cổ phiếu định kỳ."
    };

    Object.keys(rates).forEach(dest => {
      const item = document.createElement("div");
      item.className = "migration-rate-item";
      item.innerHTML = `
        <span class="migration-rate-lbl">${dest} ${dest === 'Stay' ? '(Duy trì)':''}</span>
        <span class="migration-rate-val">${Math.round(rates[dest] * 100)}%</span>
      `;
      container.appendChild(item);
    });

    const recDiv = document.createElement("div");
    recDiv.className = "sim-output-card";
    recDiv.style.gridColumn = "span 2";
    recDiv.style.textAlign = "left";
    recDiv.style.marginTop = "10px";
    recDiv.style.borderLeft = "3px solid var(--purple)";
    recDiv.innerHTML = `
      <span class="sim-output-lbl" style="color:var(--purple); font-weight:800;">AI Cross-sell Recommendation:</span>
      <p style="font-size:12.5px; line-height:1.45; margin-top:4px;">${recTexts[asset] || "Khuyến nghị đẩy thông điệp quảng cáo tài sản chéo."}</p>
    `;
    container.appendChild(recDiv);
  }

  window.triggerRfmAction = (segment, action) => {
    if (!checkCustomizePermission(`kích hoạt chiến dịch RFM cho nhóm ${segment}`)) return;
    addAuditLogEntry(currentPersona, `Kích hoạt chiến dịch RFM "${action}" cho nhóm "${segment}"`, "Tạo hàng đợi email & push notification tự động");
    showToast(`Đã kích hoạt chiến dịch: "${action}" nhắm mục tiêu nhóm ${segment}.`, "success");
  };

  // Reactivation Simulator Calculations
  function calculateReactivationSimulator() {
    const pushVal = parseInt(document.getElementById("sim-push").value);
    const emailVal = parseInt(document.getElementById("sim-email").value);
    const smsVal = parseInt(document.getElementById("sim-sms").value);
    const callVal = parseInt(document.getElementById("sim-call").value);

    document.getElementById("sim-push-val").textContent = `$${pushVal.toLocaleString()}`;
    document.getElementById("sim-email-val").textContent = `$${emailVal.toLocaleString()}`;
    document.getElementById("sim-sms-val").textContent = `$${smsVal.toLocaleString()}`;
    document.getElementById("sim-call-val").textContent = `$${callVal.toLocaleString()}`;

    const pushUsers = pushVal / 0.05;
    const pushConv = pushUsers * 0.032;
    const pushRev = pushConv * 25;

    const emailUsers = emailVal / 0.01;
    const emailConv = emailUsers * 0.018;
    const emailRev = emailConv * 32;

    const smsUsers = smsVal / 0.08;
    const smsConv = smsUsers * 0.024;
    const smsRev = smsConv * 20;

    const callUsers = callVal / 2.0;
    const callConv = callUsers * 0.085;
    const callRev = callConv * 55;

    const totalCost = pushVal + emailVal + smsVal + callVal;
    const estConversions = Math.round(pushConv + emailConv + smsConv + callConv);
    const totalRev = Math.round(pushRev + emailRev + smsRev + callRev);
    const netRoi = totalCost > 0 ? Math.round(((totalRev - totalCost) / totalCost) * 100) : 0;

    document.getElementById("sim-out-cost").textContent = `$${totalCost.toLocaleString()}`;
    document.getElementById("sim-out-conv").textContent = `${estConversions.toLocaleString()} users`;
    document.getElementById("sim-out-rev").textContent = `$${totalRev.toLocaleString()}`;
    
    const roiEl = document.getElementById("sim-out-roi");
    roiEl.textContent = `${netRoi >= 0 ? "+" : ""}${netRoi}%`;
    roiEl.className = netRoi >= 0 ? "sim-output-val positive" : "sim-output-val coral";
  }

  // -------------------------------------------------------------
  // Tab 4: Capital Allocation & Lift Calculators
  // -------------------------------------------------------------
  // Real multi-touch attribution computed from per-customer touchpoint data
  // (PrimaryAwarenessChannel = first touch, PrimaryConversionChannel = last touch,
  //  InteractionsToKyc/Ftd = where in the journey interactions happened).
  function computeAttribution(modelRaw) {
    const m = String(modelRaw || "last").toLowerCase().replace(/_touch/g, "").replace(/_/g, "");
    const credit = {}; // channel -> { ftd, revenue }
    const add = (ch, ftd, rev) => {
      if (!ch || ch === "None") return;
      if (!credit[ch]) credit[ch] = { ftd: 0, revenue: 0 };
      credit[ch].ftd += ftd; credit[ch].revenue += rev;
    };
    getFilteredCustomers().forEach(c => {
      if (!c.FTD_Date || c.FTD_Date === "None") return;
      const first = c.PrimaryAwarenessChannel;
      const last = c.PrimaryConversionChannel;
      const rev = c.Revenue || 0;
      let fw, lw;
      switch (m) {
        case "first": fw = 1; lw = 0; break;
        case "linear": fw = 0.5; lw = 0.5; break;
        case "decay": fw = 0.3; lw = 0.7; break;
        case "position": fw = 0.4; lw = 0.6; break;
        case "datadriven": {
          const k = c.InteractionsToKyc || 0, f = c.InteractionsToFtd || 0;
          fw = f > 0 ? Math.max(0.1, Math.min(0.9, k / f)) : 0.5; lw = 1 - fw; break;
        }
        default: fw = 0; lw = 1; // last touch
      }
      if (!last || last === "None") { fw = 1; lw = 0; } // no last touch -> all to first
      add(first, fw, rev * fw);
      add(last, lw, rev * lw);
    });
    return credit;
  }

  // Per-paid-channel weights for the campaign matrix, derived from real attribution (model-sensitive)
  function paidChannelWeights(model) {
    const attr = computeAttribution(model);
    const paid = ["Meta Ads", "Google Ads", "TikTok Ads", "Apple Search Ads"];
    let tot = 0; const rev = {};
    paid.forEach(ch => { rev[ch] = (attr[ch] && attr[ch].revenue) || 0; tot += rev[ch]; });
    const avg = tot / paid.length || 1;
    const w = {};
    paid.forEach(ch => { w[ch] = Math.max(0.2, Math.min(2.5, avg > 0 ? rev[ch] / avg : 1)); });
    return w;
  }

  function renderCapitalTab(selectedModel) {
    const model = selectedModel || currentAttributionModel;
    const tbody = document.getElementById("channel-performance-tbody");

    // Sync button active classes
    const bar = document.getElementById("attribution-model-bar");
    if (bar) {
      bar.querySelectorAll("button").forEach(b => {
        if (b.getAttribute("data-model") === model) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
    }
    
    // Weights now DERIVED from real customer attribution (was a hardcoded table)
    const attributionExplanations = {
      LAST_TOUCH: "🎯 <strong>Mô hình Last Touch (Điểm chạm cuối):</strong> Ghi nhận 100% chuyển đổi cho chiến dịch cuối cùng trước khi người dùng thực hiện hành động. Đây là mô hình mặc định giúp đo lường chuyển đổi trực tiếp nhưng bỏ qua các đóng góp khám phá ban đầu.",
      FIRST_TOUCH: "📢 <strong>Mô hình First Touch (Điểm chạm đầu):</strong> Ghi nhận 100% chuyển đổi cho điểm chạm đầu tiên đưa người dùng vào phễu. Kênh khám phá (Meta, Google) được đánh giá cao hơn, trong khi các kênh tìm kiếm/remarketing cuối phễu có hiệu năng giảm rõ rệt.",
      LINEAR: "📊 <strong>Mô hình Linear (Tuyến tính):</strong> Chia đều giá trị chuyển đổi cho tất cả các điểm chạm trong hành trình. Mô hình này mang tính dàn trải, giúp nhìn nhận bức tranh tổng thể một cách cân bằng hơn.",
      DATA_DRIVEN: "🧠 <strong>Mô hình Data-Driven (Thuật toán AI):</strong> AI tự động phân tích hành trình khách hàng để xác định mức độ đóng góp thực tế (Incrementality) của từng chiến dịch. TikTok Ads bị giảm ghi nhận do trùng lặp tiếp cận (cannibalization), trong khi Apple Search Ads và Google Ads được ghi nhận xứng đáng nhờ vai trò hỗ trợ chuyển đổi cao."
    };

    if (tbody) {
      tbody.innerHTML = "";
      
      const weights = paidChannelWeights(model);

      // 1. Calculate baseline totals
      let totalInstalls = 0;
      let totalKYC = 0;
      let totalRevenue = 0;
      
      db.campaigns.forEach(c => {
        totalInstalls += c.Install;
        totalKYC += c.KYC;
        totalRevenue += c.Revenue;
      });
      
      // 2. Apply weights to get raw values
      let rawInstallSum = 0;
      let rawKycSum = 0;
      let rawRevenueSum = 0;
      
      const rawCampaigns = db.campaigns.map(c => {
        const w = weights[c.Channel] || 1.0;
        const rawInst = c.Install * w;
        const rawKyc = c.KYC * w;
        const rawRev = c.Revenue * w;
        
        rawInstallSum += rawInst;
        rawKycSum += rawKyc;
        rawRevenueSum += rawRev;
        
        return {
          ...c,
          rawInst,
          rawKyc,
          rawRev
        };
      });
      
      // 3. Normalize values so sums match baseline exactly
      let currentInstallsSum = 0;
      let currentKycSum = 0;
      let currentRevenueSum = 0;
      
      const attributedCampaigns = rawCampaigns.map((c, idx) => {
        let inst = Math.round(c.rawInst * (totalInstalls / rawInstallSum));
        let kyc = Math.round(c.rawKyc * (totalKYC / rawKycSum));
        let rev = Math.round(c.rawRev * (totalRevenue / rawRevenueSum));
        
        // Prevent division by zero and extreme rounding issues
        if (kyc <= 0) kyc = 1;
        if (inst <= 0) inst = 1;
        
        currentInstallsSum += inst;
        currentKycSum += kyc;
        currentRevenueSum += rev;
        
        return {
          Campaign_ID: c.Campaign_ID,
          Channel: c.Channel,
          Spend: c.Spend,
          Install: inst,
          KYC: kyc,
          Revenue: rev
        };
      });
      
      // 4. Adjust the last campaign to correct any rounding offsets
      const lastCamp = attributedCampaigns[attributedCampaigns.length - 1];
      if (lastCamp) {
        lastCamp.Install += (totalInstalls - currentInstallsSum);
        lastCamp.KYC += (totalKYC - currentKycSum);
        lastCamp.Revenue += (totalRevenue - currentRevenueSum);
        
        if (lastCamp.KYC <= 0) lastCamp.KYC = 1;
        if (lastCamp.Install <= 0) lastCamp.Install = 1;
      }

      // Calculate ROI, CAC, LTV and populate rows
      attributedCampaigns.forEach(c => {
        const roi = (c.Revenue - c.Spend) / c.Spend;
        const cac = c.Spend / c.KYC;
        const ltv = c.Revenue / c.KYC;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span style="font-family: monospace;">${c.Campaign_ID}</span></td>
          <td><strong>${c.Channel}</strong></td>
          <td>$${c.Spend.toLocaleString()}</td>
          <td>${c.Install.toLocaleString()}</td>
          <td>${c.KYC.toLocaleString()}</td>
          <td>$${c.Revenue.toLocaleString()}</td>
          <td><span class="priority-score">${roi.toFixed(2)}x</span></td>
          <td>$${cac.toFixed(2)}</td>
          <td>$${ltv.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
      });

      renderBlendedCac(attributedCampaigns);
      renderPaybackPeriod(attributedCampaigns);
    }

    // Populate explanation logic
    const expEl = document.getElementById("attribution-logic-explanation");
    if (expEl) {
      expEl.innerHTML = attributionExplanations[model];
    }

    updateScenarioForecast();
    calculateBudgetAllocation();
    initReallocSimulator();
    renderAdnetAssessments();
  }

  function renderBlendedCac(attributedCampaigns) {
    const tbody = document.getElementById("blended-cac-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    attributedCampaigns.forEach(c => {
      const orig = db.campaigns.find(o => o.Campaign_ID === c.Campaign_ID) || { CreativeSpend: 0, ToolSpend: 0 };
      const paidCac = c.Spend / c.KYC;
      const blendedSpend = c.Spend + orig.CreativeSpend + orig.ToolSpend;
      const blendedCac = blendedSpend / c.KYC;
      const delta = ((blendedCac - paidCac) / paidCac) * 100;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span style="font-family: monospace; font-weight:700;">${c.Campaign_ID}</span></td>
        <td><strong>${c.Channel}</strong></td>
        <td style="text-align: right;">$${c.Spend.toLocaleString()}</td>
        <td style="text-align: right; color: var(--purple); font-weight: 600;">$${orig.CreativeSpend.toLocaleString()}</td>
        <td style="text-align: right; color: var(--teal); font-weight: 600;">$${orig.ToolSpend.toLocaleString()}</td>
        <td style="text-align: right; font-weight: 700;">$${paidCac.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 800; color: var(--purple);">$${blendedCac.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--coral);">+${delta.toFixed(1)}%</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderPaybackPeriod(attributedCampaigns) {
    const tbody = document.getElementById("payback-period-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const channels = ["Meta Ads", "Google Ads", "TikTok Ads", "Apple Search Ads", "Organic"];
    
    channels.forEach(ch => {
      const ftdCustomers = getFilteredCustomers().filter(c => c.Source === ch && c.FTD_Date !== "None");
      const count = ftdCustomers.length;

      let avgNetLtv = 0;
      let avgPayback = 0;
      let paidCac = 0;

      if (ch === "Organic") {
        avgNetLtv = count > 0 ? ftdCustomers.reduce((sum, c) => sum + c.NetLtv, 0) / count : 0;
        paidCac = 0.0;
        avgPayback = 0.0;
      } else {
        const channelCampaigns = attributedCampaigns.filter(c => c.Channel === ch);
        const totalSpend = channelCampaigns.reduce((sum, c) => sum + c.Spend, 0);
        const totalKyc = channelCampaigns.reduce((sum, c) => sum + c.KYC, 0);
        paidCac = totalKyc > 0 ? totalSpend / totalKyc : 0;

        avgNetLtv = count > 0 ? ftdCustomers.reduce((sum, c) => sum + c.NetLtv, 0) / count : 0;
        avgPayback = count > 0 ? ftdCustomers.reduce((sum, c) => sum + c.PaybackMonths, 0) / count : 0;
      }

      const paybackText = ch === "Organic" ? "Tức thì (Instant)" : (avgPayback > 12.0 ? "> 12 tháng" : `${avgPayback.toFixed(1)} tháng`);
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${ch === "Organic" ? "Organic Search / Direct" : ch}</strong></td>
        <td style="text-align: right; font-weight: 600;">$${paidCac.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 700; color: var(--teal);">$${avgNetLtv.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 800; color: ${avgPayback > 6.0 ? 'var(--coral)' : 'var(--purple)'};">${paybackText}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAdnetAssessments() {
    const tbody = document.getElementById("adnet-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.adNetworkAssessments.forEach(row => {
      const tr = document.createElement("tr");
      const statusClass = row.Status.includes("Hiệu quả cao") ? "optimize" : row.Status.includes("Bất ổn định") ? "stop" : "test";
      tr.innerHTML = `
        <td><strong>${row.Network}</strong></td>
        <td><span class="badge ${statusClass}">${row.Status}</span></td>
        <td style="font-weight:700; color:var(--purple);">${row.ActiveCac}</td>
        <td style="font-size:11.5px; color:var(--text-muted);">${row.Trend}</td>
        <td style="font-size:12px; font-weight:600; color:var(--text2);">${row.Action}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Flag to ensure selects are only populated once
  let reallocInitialized = false;

  function initReallocSimulator() {
    const fromSelect = document.getElementById("realloc-from-channel");
    const toSelect = document.getElementById("realloc-to-channel");
    const amountInput = document.getElementById("realloc-amount-input");
    const amountVal = document.getElementById("realloc-amount-val");
    const runBtn = document.getElementById("btn-run-realloc");

    if (!fromSelect || !toSelect) return;

    if (!reallocInitialized) {
      // Populate channels
      const channels = [...new Set(db.campaigns.map(c => c.Channel))];
      
      fromSelect.innerHTML = "";
      toSelect.innerHTML = "";
      channels.forEach(ch => {
        const optFrom = document.createElement("option");
        optFrom.value = ch;
        optFrom.textContent = ch;
        fromSelect.appendChild(optFrom);

        const optTo = document.createElement("option");
        optTo.value = ch;
        optTo.textContent = ch;
        toSelect.appendChild(optTo);
      });

      // Set defaults
      if (fromSelect.options.length > 1) {
        toSelect.selectedIndex = 1; // Default "To" is second channel
      }

      // Slider listener
      amountInput.addEventListener("input", () => {
        amountVal.textContent = `$${parseInt(amountInput.value).toLocaleString()}`;
      });

      // Run simulator listener
      runBtn.addEventListener("click", () => {
        const fromCh = fromSelect.value;
        const toCh = toSelect.value;
        const amt = parseInt(amountInput.value);

        if (fromCh === toCh) {
          showToast("Vui lòng chọn hai kênh tiếp thị khác nhau để mô phỏng dịch chuyển ngân sách.", "warning");
          return;
        }

        // Compute marginal LTV and CAC for each channel
        const getChannelStats = (ch) => {
          const camps = db.campaigns.filter(c => c.Channel === ch);
          let spend = 0, kyc = 0, rev = 0;
          camps.forEach(c => {
            spend += c.Spend;
            kyc += c.KYC;
            rev += c.Revenue;
          });
          return {
            cac: spend / kyc,
            ltv: rev / kyc
          };
        };

        const fromStats = getChannelStats(fromCh);
        const toStats = getChannelStats(toCh);

        // Calculations
        const usersLost = amt / fromStats.cac;
        const usersGained = amt / toStats.cac;
        const netUsers = Math.round(usersGained - usersLost);

        const revLost = usersLost * fromStats.ltv;
        const revGained = usersGained * toStats.ltv;
        const netRev = Math.round(revGained - revLost);

        // Output GUI
        const usersEl = document.getElementById("realloc-out-users");
        const revEl = document.getElementById("realloc-out-rev");
        const verdictEl = document.getElementById("realloc-out-verdict");

        usersEl.textContent = `${netUsers >= 0 ? "+" : ""}${netUsers.toLocaleString()} KYC`;
        usersEl.style.color = netUsers >= 0 ? "var(--green)" : "var(--coral)";

        revEl.textContent = `${netRev >= 0 ? "+" : ""}$${netRev.toLocaleString()}`;
        revEl.style.color = netRev >= 0 ? "var(--green)" : "var(--coral)";

        if (netRev >= 0) {
          verdictEl.innerHTML = `Dời <strong>$${amt.toLocaleString()}</strong> từ <strong>${fromCh}</strong> sang <strong>${toCh}</strong> ước tính mang lại thêm <span style="color:var(--green); font-weight:800;">+${netUsers} KYC</span> mới và <span style="color:var(--green); font-weight:800;">+$${netRev.toLocaleString()}</span> doanh thu cận biên. <strong style="color:var(--purple);">Khuyến nghị thực hiện ngay!</strong>`;
        } else {
          verdictEl.innerHTML = `Dời <strong>$${amt.toLocaleString()}</strong> từ <strong>${fromCh}</strong> sang <strong>${toCh}</strong> sẽ làm giảm phễu nạp <span style="color:var(--coral); font-weight:800;">${netUsers} KYC</span> và làm hụt <span style="color:var(--coral); font-weight:800;">-$${Math.abs(netRev).toLocaleString()}</span> doanh thu. <strong style="color:var(--coral);">KHÔNG khuyến nghị chuyển dịch.</strong>`;
        }

        addAuditLogEntry(currentPersona, `Mô phỏng dịch chuyển ngân sách $${amt} từ ${fromCh} sang ${toCh}`, `Kết quả ròng: ${netRev >= 0 ? "+" : ""}$${netRev}`);
      });

      reallocInitialized = true;
    }
  }

  document.getElementById("const-cap-tiktok").addEventListener("change", calculateBudgetAllocation);
  document.getElementById("const-limit-meta").addEventListener("change", calculateBudgetAllocation);

  function calculateBudgetAllocation() {
    const additionalBudget = parseInt(document.getElementById("alloc-budget-input").value);
    
    let alloc = {
      "Apple Search Ads": additionalBudget * 0.35,
      "Google Ads": additionalBudget * 0.25,
      "Meta Ads": additionalBudget * 0.25,
      "TikTok Ads": additionalBudget * 0.15
    };

    const capTiktok = document.getElementById("const-cap-tiktok").checked;
    const limitMeta = document.getElementById("const-limit-meta").checked;

    if (capTiktok && alloc["TikTok Ads"] > 15000) {
      const excess = alloc["TikTok Ads"] - 15000;
      alloc["TikTok Ads"] = 15000;
      alloc["Apple Search Ads"] += excess;
    }

    if (limitMeta && alloc["Meta Ads"] > 20000) {
      const excess = alloc["Meta Ads"] - 20000;
      alloc["Meta Ads"] = 20000;
      alloc["Google Ads"] += excess;
    }

    const cac = { "Apple Search Ads": 9.26, "Google Ads": 12.35, "Meta Ads": 11.13, "TikTok Ads": 7.75 };
    const ltv = { "Apple Search Ads": 41.67, "Google Ads": 36.24, "Meta Ads": 34.50, "TikTok Ads": 17.64 };

    const tbody = document.getElementById("budget-allocation-output-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    let estRevTotal = 0;

    Object.keys(alloc).forEach(channel => {
      const budget = alloc[channel];
      const estKyc = Math.round(budget / cac[channel]);
      const channelRev = estKyc * ltv[channel];
      estRevTotal += channelRev;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${channel}</strong></td>
        <td>$${Math.round(budget).toLocaleString()}</td>
        <td style="color: var(--purple); font-weight: 800;">+${estKyc} KYC</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("alloc-est-rev").textContent = `$${Math.round(estRevTotal).toLocaleString()}`;
  }

  // Incrementality Lift Calculator Logic
  document.getElementById("btn-calc-lift").addEventListener("click", () => {
    const testConv = parseFloat(document.getElementById("calc-test-conv").value) || 0;
    const ctrlConv = parseFloat(document.getElementById("calc-ctrl-conv").value) || 0;
    const testSpend = parseFloat(document.getElementById("calc-test-spend").value) || 0;
    const ctrlSpend = parseFloat(document.getElementById("calc-ctrl-spend").value) || 0;

    let lift = 0;
    if (ctrlConv > 0) {
      lift = ((testConv - ctrlConv) / ctrlConv) * 100;
    } else if (testConv > 0) {
      lift = 100.0;
    }

    let iCpa = 0;
    const convDiff = testConv - ctrlConv;
    const spendDiff = testSpend - ctrlSpend;
    if (convDiff > 0) {
      iCpa = spendDiff / convDiff;
    } else {
      iCpa = "N/A";
    }

    document.getElementById("calc-out-lift").textContent = `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%`;
    document.getElementById("calc-out-icpa").textContent = typeof iCpa === 'number' ? `$${iCpa.toFixed(2)}` : iCpa;

    addAuditLogEntry(currentPersona, `Chạy máy tính Incrementality Lift: Test=${testConv}, Ctrl=${ctrlConv}`, `Kết quả Lift: ${lift.toFixed(1)}%`);
  });

  // Scenario Buttons Control
  ["scenario-bear", "scenario-base", "scenario-bull"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        document.querySelector(".btn-small.active-scenario")?.classList.remove("active-scenario");
        btn.classList.add("active-scenario");
        currentScenario = id.replace("scenario-", "");
        updateScenarioForecast();
      });
    }
  });

  function updateScenarioForecast() {
    const ctx = document.getElementById("scenarioChart");
    if (!ctx) return;

    if (scenarioChartRef) scenarioChartRef.destroy();

    const dataModel = db.getMauForecast();
    let multiplier = 1.0;
    let label = "Kịch bản Base";
    let color = "#6454e3";

    if (currentScenario === "bear") {
      multiplier = 0.78;
      label = "Kịch bản Bearish (Thị trường giảm)";
      color = "#dc2626";
    } else if (currentScenario === "bull") {
      multiplier = 1.25;
      label = "Kịch bản Bullish (Thị trường tăng)";
      color = "#15803D";
    }

    // Get the geopolitical multiplier
    const regimeSelect = document.getElementById("geopolitical-regime-select");
    let geoMul = 1.0;
    if (regimeSelect && regimeSelect.value) {
      const regime = db.geopoliticalRegimes.find(r => r.id === regimeSelect.value);
      if (regime) {
        geoMul = regime.growthMul;
        label += ` + ${regime.name}`;
      }
    }

    const projectedRevenue = dataModel.revenueForecast.map((val, idx) => {
      return idx >= 5 ? Math.round(val * multiplier * geoMul) : val;
    });

    scenarioChartRef = new Chart(ctx, {
      type: "line",
      data: {
        labels: dataModel.labels,
        datasets: [
          {
            label: `${label} - Doanh thu ($k)`,
            data: projectedRevenue,
            borderColor: color,
            backgroundColor: `${color}11`,
            fill: true,
            tension: 0.3,
            borderWidth: 1.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const monthLabel = dataModel.labels[index];
            const value = projectedRevenue[index];
            
            const infoEl = document.getElementById("scenario-click-info");
            if (infoEl) {
              infoEl.innerHTML = `📊 Dự báo doanh thu <strong>${monthLabel}</strong>: <span style="color:var(--coral); font-size:13px; font-weight:800;">$${value.toLocaleString()}k</span>`;
            }
            showToast(`Dự báo doanh thu (${monthLabel}): $${value.toLocaleString()}k`, "success");
          }
        },
        scales: {
          y: { grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } },
          x: { grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } }
        },
        plugins: {
          legend: { labels: { color: gdTickColor(), font: { family: "Plus Jakarta Sans" } } }
        }
      }
    });
  }

  // Budget Allocation Engine Sliders
  document.getElementById("alloc-budget-input").addEventListener("input", (e) => {
    document.getElementById("alloc-budget-val").textContent = `$${parseInt(e.target.value).toLocaleString()}`;
    calculateBudgetAllocation();
  });

  document.getElementById("btn-optimize-budget").addEventListener("click", () => {
    calculateBudgetAllocation();
    addAuditLogEntry(currentPersona, `Chạy tối ưu phân bổ ngân sách: $${document.getElementById("alloc-budget-input").value}`, "Phân phối lại tiền dựa trên Marginal LTV/CAC và các ràng buộc");
    showToast("Thuật toán phân bổ ngân sách đã tối ưu hóa chiến dịch thành công.", "success");
  });

  // -------------------------------------------------------------
  // Tab 5: Growth Content Intelligence
  // -------------------------------------------------------------
  function renderContentTab() {
    const hookTbody = document.getElementById("hook-tbody");
    if (hookTbody) {
      hookTbody.innerHTML = "";
      const dynamicContentData = getDynamicContentData(execTimeframeDays);
      dynamicContentData.hookIntelligence.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${row.Type}</strong></td>
          <td style="font-size:11.5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${row.Angle}">${row.Angle}</td>
          <td>${row.HookRate}</td>
          <td>${row.CTR}</td>
          <td>${row.CPA}</td>
          <td><span class="badge ${row.Performance === 'Outstanding' || row.Performance === 'Excellent' ? 'scale':'optimize'}">${row.Performance}</span></td>
        `;
        hookTbody.appendChild(tr);
      });
    }

    renderOpportunityBacklog();
    renderContentPlan();

    // Reset calendar filter bar active state
    const filterBar = document.getElementById("calendar-filter-bar");
    if (filterBar) {
      filterBar.querySelectorAll("button").forEach(b => {
        if (b.getAttribute("data-channel") === "ALL") {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      });
    }
    renderContentCalendar("ALL");

    // Render Content Operations
    renderContentOpsSubpanes();
  }

  function renderContentPlan() {
    const tbody = document.getElementById("content-plan-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.contentPlan.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.Touchpoint}</strong></td>
        <td><span class="badge scale" style="background:var(--purple-soft); color:var(--purple);">${row.Angle}</span></td>
        <td>${row.Target}</td>
        <td style="font-weight:700; color:var(--purple);">${row.CTR}</td>
        <td style="font-weight:700; color:var(--teal);">${row.CVR}</td>
        <td style="font-weight:700; color:var(--coral);">${row.CPA}</td>
        <td><span class="badge optimize">${row.Status}</span></td>
        <td style="font-size:12px; font-weight:600; color:var(--text2);">${row.Rating}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function initAttributionModelSwitcher() {
    const bar = document.getElementById("attribution-model-bar");
    if (!bar) return;
    
    bar.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        bar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        currentAttributionModel = btn.getAttribute("data-model");
        renderCapitalTab(currentAttributionModel);
        
        addAuditLogEntry(currentPersona, `Thay đổi mô hình phân bổ sang: "${currentAttributionModel}"`, "Cập nhật bảng hiệu quả chiến dịch");
      });
    });
  }

  function initAnomalySimulation() {
    const btn = document.getElementById("btn-simulate-anomaly");
    if (!btn) return;
    
    btn.addEventListener("click", () => {
      const anomalyAlert = {
        type: "danger",
        title: "CPA Spike bất thường (Meta Ads)",
        desc: "Phát hiện CPA của Meta Ads Campaign M-02 tăng vọt +45% ($11.11 ➔ $16.11) trong 3 giờ qua."
      };
      
      if (!simulatedAlerts.some(a => a.title === anomalyAlert.title)) {
        simulatedAlerts.push(anomalyAlert);
      }
      
      checkAlerts();
      
      const autoPause = document.getElementById("setting-auto-pause").checked;
      let healingMsg = "";
      
      if (autoPause) {
        const metaAss = db.adNetworkAssessments.find(a => a.Network === "Meta Ads");
        if (metaAss) {
          metaAss.Status = "Tạm dừng (Auto-paused)";
          metaAss.Action = "⚠️ AI Auto-paused do CPA Spike. Cần tối ưu lại creative.";
        }
        
        addAuditLogEntry("System AI Engine", "Tự động tạm dừng Campaign Meta Ads M-02", "Bảo toàn ngân sách do CPA spike > 30% (Chế độ tự sửa lỗi: BẬT)");
        healingMsg = "\n\n⚡ [AI Self-Healing]: Do tùy chọn 'Tự động tạm dừng Ads khi lỗi' đang BẬT, hệ thống đã tự động tạm ngắt chiến dịch Meta Ads M-02 để bảo toàn ngân sách. Nhật ký hệ thống đã được ghi nhận!";
        
        renderAdnetAssessments();
      } else {
        addAuditLogEntry(currentPersona, "Ghi nhận lỗi CPA Spike nhưng bỏ qua", "Chế độ tự sửa lỗi tắt");
        healingMsg = "\n\n⚠️ [Cảnh báo]: Chế độ tự sửa lỗi đang TẮT. Chiến dịch vẫn tiếp tục chạy với CPA cao. Khuyến nghị kiểm tra thủ công.";
      }
      
      showToast(`🚨 PHÁT HIỆN ANOMALY: CPA của Meta Ads tăng vọt +45%! ${healingMsg}`, "danger");
    });
  }

  function initContentCalendar() {
    const filterBar = document.getElementById("calendar-filter-bar");
    if (!filterBar) return;
    
    filterBar.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        filterBar.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const channel = btn.getAttribute("data-channel");
        renderContentCalendar(channel);
      });
    });
  }

  function renderContentCalendar(filterChannel = "ALL") {
    const tbody = document.getElementById("calendar-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const filteredData = filterChannel === "ALL" 
      ? db.contentCalendar 
      : db.contentCalendar.filter(item => item.Channel === filterChannel);
      
    filteredData.forEach(row => {
      let statusBadge = "";
      if (row.Status === "Scheduled") {
        statusBadge = `<span class="badge optimize">Lên lịch</span>`;
      } else if (row.Status === "In Production") {
        statusBadge = `<span class="badge test">Đang sản xuất</span>`;
      } else { // Draft
        statusBadge = `<span class="badge scale" style="background: rgba(100, 116, 139, 0.12); color: #475569; border: 1px solid rgba(100, 116, 139, 0.25);">Bản thảo</span>`;
      }
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.Date}</td>
        <td><span class="badge" style="background:rgba(0,0,0,0.05); color:var(--text1); border:1px solid rgba(0,0,0,0.1); font-size: 11px;">${row.Channel}</span></td>
        <td><span style="font-size:11px; color:var(--purple); font-weight:700;">${row.Objective || '—'}</span></td>
        <td><strong>${row.Title}</strong></td>
        <td><span style="font-family:monospace; font-size:11px; color:var(--teal); font-weight:600;">${row.Hook || '—'}</span></td>
        <td><span style="font-family:monospace; font-size:11px; color:var(--coral); font-weight:600;">${row.CTA || '—'}</span></td>
        <td>${row.Owner}</td>
        <td style="font-size:11px; color:var(--text2); font-weight:700;">${row.TargetKPI || '—'}</td>
        <td>${statusBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderOpportunityBacklog() {
    const tbody = document.getElementById("backlog-tbody");
    if (!tbody) return;

    db.opportunityBacklog.forEach(item => {
      item.Score = item.Impact * item.Confidence * item.Ease;
    });
    db.opportunityBacklog.sort((a, b) => b.Score - a.Score);

    tbody.innerHTML = "";
    db.opportunityBacklog.forEach(row => {
      const escapedIdea = row.Idea.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.Idea}</strong></td>
        <td>${row.Owner}</td>
        <td><span class="badge ${row.Priority === 'Critical' || row.Priority === 'High' ? 'fix':'test'}">${row.Priority}</span></td>
        <td style="font-size: 11px; color: var(--text3);">${row.ETA}</td>
        
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${row.Impact}</span>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Impact', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Impact', -1)">-</button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${row.Confidence}</span>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Confidence', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Confidence', -1)">-</button>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${row.Ease}</span>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Ease', 1)">+</button>
            <button class="btn btn-secondary" style="padding:2px 4px; font-size: 11px;" onclick="adjustBacklogMetric('${escapedIdea}', 'Ease', -1)">-</button>
          </div>
        </td>
        
        <td><span class="priority-score">${row.Score}</span></td>
        <td><span style="font-size: 11px; opacity:0.8;">${row.Status}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:4px;">
            <button class="btn btn-cyan" style="padding:4px 8px; font-size:11px;" onclick="promoteBacklogToPriority('${escapedIdea}')">Activate</button>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:22px;" onclick="window.editBacklogIdea('${escapedIdea}')" title="Sửa ý tưởng">
              <i data-lucide="edit-3" style="width:10px; height:10px;"></i>
            </button>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:22px; color:var(--coral);" onclick="window.deleteBacklogIdea('${escapedIdea}')" title="Xóa ý tưởng">
              <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  window.adjustBacklogMetric = (idea, field, amount) => {
    if (!checkCustomizePermission("điều chỉnh điểm ICE của Backlog")) return;
    const item = db.opportunityBacklog.find(p => p.Idea === idea);
    if (!item) return;
    item[field] = Math.max(1, Math.min(10, item[field] + amount));
    renderOpportunityBacklog();
    addAuditLogEntry(currentPersona, `Điều chỉnh điểm ${field} của backlog idea: "${idea}"`, "Tự động sắp xếp lại backlog");
    refreshActiveDashboardViews();
  };

  window.promoteBacklogToPriority = (idea) => {
    if (!checkCustomizePermission("kích hoạt đưa ý tưởng backlog lên Priorities")) return;
    const item = db.opportunityBacklog.find(p => p.Idea === idea);
    if (!item) return;

    // Push as a prioritized action item into the weekly list
    const newPriority = {
      id: Date.now(),
      action: item.Idea,
      type: item.Priority === "Critical" ? "Scale" : "Fix",
      impact: item.Impact,
      confidence: item.Confidence,
      ease: item.Ease,
      ice: item.Impact * item.Confidence * item.Ease,
      status: "Planned"
    };

    priorityList.unshift(newPriority);
    item.Status = "Activated";
    
    renderOpportunityBacklog();
    renderPriorityEngine();
    addAuditLogEntry(currentPersona, `Chuyển ý tưởng từ backlog sang Weekly Priorities: "${idea}"`, "Thêm thành công vào Weekly Priority Engine");
    showToast(`Đã đưa ý tưởng "${idea}" vào Weekly Priority Engine ở Tab Executive Overview!`, "success");
    refreshActiveDashboardViews();
  };

  window.editBacklogIdea = (originalIdea) => {
    if (!checkCustomizePermission("chỉnh sửa ý tưởng backlog")) return;
    const item = db.opportunityBacklog.find(p => p.Idea === originalIdea);
    if (!item) return;

    showCustomPrompt("Chỉnh sửa Mô tả Ý tưởng", "Nhập mô tả ý tưởng mới:", item.Idea, (newIdea) => {
      if (newIdea === null) return;
      if (newIdea.trim() === "") {
        showToast("Mô tả ý tưởng không được để trống!", "warning");
        return;
      }
      showCustomPrompt("Chỉnh sửa Người phụ trách", "Nhập người phụ trách (Owner):", item.Owner, (newOwner) => {
        if (newOwner === null) return;
        showCustomPrompt("Chỉnh sửa Độ ưu tiên", "Độ ưu tiên (Critical, High, Medium, Low):", item.Priority, (newPriority) => {
          if (newPriority === null) return;
          const formattedPriority = newPriority.trim();
          const validPriorities = ["Critical", "High", "Medium", "Low"];
          if (!validPriorities.includes(formattedPriority)) {
            showToast("Độ ưu tiên không hợp lệ! Vui lòng chọn một trong: Critical, High, Medium, Low", "warning");
            return;
          }
          showCustomPrompt("Chỉnh sửa Target ETA", "Nhập Target ETA (YYYY-MM-DD):", item.ETA, (newETA) => {
            if (newETA === null) return;

            item.Idea = newIdea.trim();
            item.Owner = newOwner.trim();
            item.Priority = formattedPriority;
            item.ETA = newETA.trim();

            addAuditLogEntry(currentPersona, `Chỉnh sửa ý tưởng backlog: "${originalIdea}"`, `Ý tưởng mới: "${item.Idea}", Owner: "${item.Owner}", ETA: "${item.ETA}"`);
            showToast(`Đã chỉnh sửa ý tưởng backlog thành công!`, "success");
            renderOpportunityBacklog();
            refreshActiveDashboardViews();
          });
        });
      });
    });
  };

  window.deleteBacklogIdea = (idea) => {
    if (!checkCustomizePermission("xóa ý tưởng backlog")) return;
    const idx = db.opportunityBacklog.findIndex(p => p.Idea === idea);
    if (idx === -1) return;

    const confirmed = (typeof confirm === "function") ? confirm(`Bạn có chắc chắn muốn xóa ý tưởng "${idea}" không?`) : true;
    if (confirmed) {
      db.opportunityBacklog.splice(idx, 1);
      addAuditLogEntry(currentPersona, `Xóa ý tưởng backlog: "${idea}"`, `Người thực hiện: ${currentPersona}`);
      showToast(`Đã xóa ý tưởng "${idea}" thành công!`, "success");
      renderOpportunityBacklog();
      refreshActiveDashboardViews();
    }
  };

  document.getElementById("btn-add-backlog").addEventListener("click", () => {
    if (!checkCustomizePermission("thêm ý tưởng mới vào Content Backlog")) return;
    
    showCustomPrompt("Ý tưởng mới", "Nhập ý tưởng thử nghiệm nội dung mới:", "", (idea) => {
      if (!idea) return;
      showCustomPrompt("Người phụ trách", "Người phụ trách (Owner):", "Creative Specialist", (owner) => {
        if (owner === null) return; // User cancelled
        showCustomPrompt("Điểm Impact", "Điểm Impact (1-10):", "7", (impactStr) => {
          if (impactStr === null) return;
          const impact = parseInt(impactStr, 10) || 7;
          showCustomPrompt("Điểm Confidence", "Điểm Confidence (1-10):", "7", (confidenceStr) => {
            if (confidenceStr === null) return;
            const confidence = parseInt(confidenceStr, 10) || 7;
            showCustomPrompt("Điểm Ease", "Điểm Ease (1-10):", "7", (easeStr) => {
              if (easeStr === null) return;
              const ease = parseInt(easeStr, 10) || 7;

              const newIdea = {
                Idea: idea,
                Owner: owner,
                Priority: "High",
                ETA: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
                Status: "Backlog",
                Impact: impact,
                Confidence: confidence,
                Ease: ease,
                Score: impact * confidence * ease
              };

              db.opportunityBacklog.push(newIdea);
              renderOpportunityBacklog();
              addAuditLogEntry(currentPersona, `Thêm ý tưởng mới vào Content Backlog: "${idea}"`, `ICE Score: ${newIdea.Score}`);
              showToast(`Đã thêm ý tưởng "${idea}" vào Content Backlog.`, "success");
              refreshActiveDashboardViews();
            });
          });
        });
      });
    });
  });

  // -------------------------------------------------------------
  // Tab 6: System & Governance
  // -------------------------------------------------------------
  function recalculateGrowthEconomics() {
    db.customers.forEach(cust => {
      const i = parseInt(cust.Customer_ID.replace("CUST-", ""), 10);
      const eKycFee = cust.KYC_Date !== "None" ? db.configs.rates.ekycRate : 0.0;
      const smsFee = db.configs.rates.smsRate * (cust.KYC_Date !== "None" ? 2.0 : 1.0);
      const gatewayFee = cust.FTD_Date !== "None" ? cust.Deposit * 0.015 : 0.0;
      const onboardingCogs = eKycFee + smsFee + gatewayFee;
      const netLtv = cust.LTV - onboardingCogs - cust.IncentiveCost;

      const campObj = db.campaigns.find(c => c.Campaign_ID === cust.Campaign) || { CAC: 12.0 };
      const customerCac = campObj.CAC;
      const installDaysAgo = 10 + (i % 60);
      const monthlyNetLtv = netLtv / (installDaysAgo / 30);
      const paybackVal = (cust.FTD_Date !== "None" && monthlyNetLtv > 0) ? Math.min(Math.round((customerCac / monthlyNetLtv) * 10) / 10, 24.0) : 0.0;

      cust.OnboardingCogs = Math.round(onboardingCogs * 100) / 100;
      cust.NetLtv = Math.round(netLtv * 100) / 100;
      cust.PaybackMonths = paybackVal;
    });
  }

  function renderGovernanceTab() {
    renderAuditLogs();
    renderPlaybook();

    const cfg = db.configs;
    const safeSetVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    safeSetVal("cfg-w-growth", cfg.weights.growth);
    safeSetVal("cfg-w-profit", cfg.weights.profitability);
    safeSetVal("cfg-w-retention", cfg.weights.retention);
    safeSetVal("cfg-w-capeff", cfg.weights.capitalEfficiency);
    safeSetVal("cfg-w-risk", cfg.weights.risk);

    safeSetVal("cfg-t-rev", cfg.thresholds.revenueDecreasePct);
    safeSetVal("cfg-t-cac", cfg.thresholds.cacIncreasePct);
    safeSetVal("cfg-t-whale", cfg.thresholds.whaleConcentrationPct);
    safeSetVal("cfg-t-cvr", cfg.thresholds.cvrDecreasePct !== undefined ? cfg.thresholds.cvrDecreasePct : 15);
    safeSetVal("cfg-t-ret", cfg.thresholds.retentionDecreasePct !== undefined ? cfg.thresholds.retentionDecreasePct : 10);
    safeSetVal("cfg-t-roineg", cfg.thresholds.roiNegative !== undefined ? cfg.thresholds.roiNegative : 0);

    safeSetVal("cfg-bm-ltvcac", cfg.benchmarks.targetLtvCac);
    safeSetVal("cfg-bm-cvr", cfg.benchmarks.targetCvr);
    safeSetVal("cfg-bm-cackyc", cfg.benchmarks.targetCacKyc);
    safeSetVal("cfg-bm-roi", cfg.benchmarks.targetRoi);

    safeSetVal("cfg-rate-ekyc", cfg.rates.ekycRate);
    safeSetVal("cfg-rate-sms", cfg.rates.smsRate);
    safeSetVal("cfg-currency", cfg.currency || "USD");

    // Render UTM governance dictionary and score
    renderEventDictionary();
    updateTrackingReadinessScore();
    renderUtmHygieneDashboard();
  }

  document.getElementById("btn-save-configs").addEventListener("click", () => {
    if (!checkCustomizePermission("lưu cấu hình cấu trúc trọng số")) return;
    
    const wGrowth = parseFloat(document.getElementById("cfg-w-growth").value);
    const wProfit = parseFloat(document.getElementById("cfg-w-profit").value);
    const wRetention = parseFloat(document.getElementById("cfg-w-retention").value);
    const wCapEff = parseFloat(document.getElementById("cfg-w-capeff").value);
    const wRisk = parseFloat(document.getElementById("cfg-w-risk").value);

    const sum = wGrowth + wProfit + wRetention + wCapEff + wRisk;
    if (Math.abs(sum - 1.0) > 0.01) {
      showToast(`CẢNH BÁO: Tổng các trọng số phải bằng 1.0. Hiện tại đang là ${sum.toFixed(2)}. Vui lòng điều chỉnh lại.`, "warning");
      return;
    }

    db.configs.weights.growth = wGrowth;
    db.configs.weights.profitability = wProfit;
    db.configs.weights.retention = wRetention;
    db.configs.weights.capitalEfficiency = wCapEff;
    db.configs.weights.risk = wRisk;

    db.configs.thresholds.revenueDecreasePct = parseInt(document.getElementById("cfg-t-rev").value, 10);
    db.configs.thresholds.cacIncreasePct = parseInt(document.getElementById("cfg-t-cac").value, 10);
    db.configs.thresholds.whaleConcentrationPct = parseInt(document.getElementById("cfg-t-whale").value, 10);
    
    const tCvr = document.getElementById("cfg-t-cvr");
    if (tCvr) db.configs.thresholds.cvrDecreasePct = parseInt(tCvr.value, 10);
    const tRet = document.getElementById("cfg-t-ret");
    if (tRet) db.configs.thresholds.retentionDecreasePct = parseInt(tRet.value, 10);
    const tRoiNeg = document.getElementById("cfg-t-roineg");
    if (tRoiNeg) db.configs.thresholds.roiNegative = parseInt(tRoiNeg.value, 10);

    const bmLtv = document.getElementById("cfg-bm-ltvcac");
    if (bmLtv) db.configs.benchmarks.targetLtvCac = parseFloat(bmLtv.value);
    const bmCvr = document.getElementById("cfg-bm-cvr");
    if (bmCvr) db.configs.benchmarks.targetCvr = parseFloat(bmCvr.value);
    const bmCacKyc = document.getElementById("cfg-bm-cackyc");
    if (bmCacKyc) db.configs.benchmarks.targetCacKyc = parseFloat(bmCacKyc.value);
    const bmRoi = document.getElementById("cfg-bm-roi");
    if (bmRoi) db.configs.benchmarks.targetRoi = parseFloat(bmRoi.value);

    db.configs.rates.ekycRate = parseFloat(document.getElementById("cfg-rate-ekyc").value);
    db.configs.rates.smsRate = parseFloat(document.getElementById("cfg-rate-sms").value);
    
    const curSelect = document.getElementById("cfg-currency");
    if (curSelect) db.configs.currency = curSelect.value;

    recalculateGrowthEconomics();
    refreshActiveDashboardViews();

    addAuditLogEntry(currentPersona, "Thay đổi trọng số và giới hạn cảnh báo trong Configuration Center", "Các cấu hình sức khỏe tổng quan được tính toán lại lập tức");
    showToast("Cấu hình hệ thống đã được cập nhật thành công.", "success");
  });

  const playbookTabs = document.querySelectorAll(".playbook-tab");
  playbookTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".playbook-tab.active")?.classList.remove("active");
      tab.classList.add("active");
      renderPlaybook(tab.getAttribute("data-playbook"));
    });
  });

  const playbookDocs = {
    "amazon-6": `
      <h4>Amazon 6-Pager Framework: GOS, GROWTH OS Strategy</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main); display:flex; flex-direction:column; gap:12px;">
        <p><strong>1. Context & Business Strategy (Bối cảnh & Chiến lược):</strong> Growth Operating System là sản phẩm trung tâm tích hợp toàn bộ các điểm tiếp xúc của khách hàng nhằm mang lại cho CEO & CMO góc nhìn thời gian thực thống nhất về hiệu quả marketing, tương tác sản phẩm và hành vi giữ chân khách hàng. Do dữ liệu phát sinh từ nhiều nguồn độc lập (Meta Ads, Google Analytics, DB Giao dịch, Firebase Logs), hệ thống sử dụng trục <code>Customer_ID</code> hợp nhất làm xương sống kết nối toàn bộ phễu.</p>
        
        <p><strong>2. Goals & Core Objectives (Mục tiêu & Chỉ tiêu Cốt lõi):</strong></p>
        <ul style="margin-left:20px; list-style-type:disc; display:flex; flex-direction:column; gap:4px;">
          <li><strong>Tối ưu hóa LTV/CAC dài hạn:</strong> Đảm bảo tỷ lệ LTV/CAC &gt; 3.50x thông qua việc tối ưu chi phí thu hút khách hàng biên (Marginal CAC) và gia tăng tần suất nạp tiền (FTD Repeat Rate).</li>
          <li><strong>Tốc độ phản hồi sự cố (Resolution Speed):</strong> Đưa chỉ số phát hiện rủi ro (MTTD) xuống dưới 30 phút và chỉ số khắc phục (MTTR) dưới 3 giờ cho các cổng KYC và nạp rút.</li>
          <li><strong>Tỷ lệ giữ chân người dùng (Retention Plateau):</strong> Nâng cao tỷ lệ giữ chân ngày 30 lên mức &gt; 15% thông qua tương tác cá nhân hóa.</li>
        </ul>

        <p><strong>3. Tenets & Core Principles (Nguyên tắc Sáng lập):</strong></p>
        <ul style="margin-left:20px; list-style-type:disc; display:flex; flex-direction:column; gap:4px;">
          <li><strong>Quyết định dựa trên Dữ liệu hành vi:</strong> Dữ liệu người dùng thực tế là nền tảng tối cao. Mọi giả thuyết phải được chứng minh bởi dữ liệu lịch sử hoặc A/B testing trước khi nhân rộng.</li>
          <li><strong>Tiết kiệm và Tối ưu hóa (Frugality):</strong> Cắt giảm ngay lập tức các chiến dịch kém hiệu quả, phân bổ lại dòng tiền vào các kênh tăng trưởng tự nhiên và chương trình Referral.</li>
          <li><strong>Hành động nhanh (Action Over Perfection):</strong> Ưu tiên kiểm thử các tính năng nhỏ để nhận phản hồi từ thị trường thay vì các dự án lớn kéo dài không có số liệu thực chứng.</li>
        </ul>

        <p><strong>4. State of the Business (Thực trạng Hoạt động):</strong></p>
        <p>Hiện tại, cơ cấu doanh thu của hệ thống đang phụ thuộc lớn vào nhóm VIP (Whale concentration đạt 41.1%, vượt ngưỡng cảnh báo 40%). Hệ thống ghi nhận Blended CAC trung bình ở mức $12.5 và K-factor đạt 0.33. Phễu chuyển đổi KYC trên thiết bị Android đang gặp điểm nghẽn với tỷ lệ drop-off lên đến 52% tại bước xác thực danh tính do lỗi tương thích camera SDK.</p>

        <p><strong>5. Lessons Learned & Anomalies (Bài học Rút ra & Điểm bất thường):</strong></p>
        <ul style="margin-left:20px; list-style-type:disc; display:flex; flex-direction:column; gap:4px;">
          <li><strong>Bài học phễu nạp tiền:</strong> Việc thay đổi UI/UX trang nạp tiền mà không qua A/B testing đã làm giảm 18% tỷ lệ nạp thành công của khách hàng iOS mới tháng trước. Rút ra bài học: Mọi thay đổi UI/UX bắt buộc phải đi qua phễu chấm điểm ICE.</li>
          <li><strong>Dữ liệu UTM không đồng nhất:</strong> Việc thiếu quy chuẩn đặt tên UTM tag của marketing gây sai lệch 22% số liệu phân bổ MTA. Cần chuẩn hóa cấu trúc UTM trước khi cấu hình phễu phân tích mới.</li>
        </ul>

        <p><strong>6. Execution Path & Strategic Priorities (Lộ trình Triển khai):</strong></p>
        <ol style="margin-left:20px; list-style-type:decimal; display:flex; flex-direction:column; gap:4px;">
          <li><strong>Giai đoạn 1 (Tuần 1-2):</strong> Chuẩn hóa luồng thu thập dữ liệu. Cấu hình SDK Firebase & AppsFlyer thu thập đồng bộ các sự kiện <code>Install</code>, <code>Signup_Success</code>, <code>KYC_Submit</code>, <code>First_Deposit</code>.</li>
          <li><strong>Giai đoạn 2 (Tuần 3-4):</strong> Tích hợp hệ thống chấm điểm ICE và chuẩn hóa UTM tag. Chỉ triển khai các thử nghiệm có điểm ICE &ge; 7.0.</li>
          <li><strong>Giai đoạn 3 (Tuần 5-8):</strong> Tối ưu hóa phễu onboarding tự động. Áp dụng công nghệ OCR cho KYC và tự động nén dung lượng ảnh tải lên để nâng tỷ lệ kích hoạt thành công trên thiết bị Android.</li>
        </ol>
      </div>
    `,
    "sop-review": `
      <h4>SOP: Quy Trình Đánh Giá Tăng Trưởng Tuần (Weekly Growth Review)</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Mục tiêu:</strong> Đánh giá hiệu suất của tuần cũ, rà soát cảnh báo từ Alert Center, cập nhật phân bổ ngân sách marketing và quyết định danh sách Weekly Priorities trong Backlog.</p>
        <p style="margin-bottom:10px;"><strong>Thời gian & Thành phần tham gia:</strong> Thứ Hai hàng tuần, 09:30 - 11:00. Tham gia bắt buộc: CEO, CMO, Head of Product, Lead Data Analyst, Growth Marketing Lead.</p>
        
        <p style="margin-bottom:6px;"><strong>Quy trình thực hiện chi tiết (3 Bước):</strong></p>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--purple); display:block; margin-bottom:4px;">Bước 1: Cập nhật & Kiểm định dữ liệu (Thực hiện trước cuộc họp)</strong>
            <span style="font-size:11.5px; color:var(--text2);">Lead Data Analyst chịu trách nhiệm xuất báo cáo tuần trước, đối soát dữ liệu nạp rút và chạy lại mô hình Whale/Churn Predictor trên Local Storage và Server. Toàn bộ chỉ số KPI phải được nạp đầy đủ vào dashboard trước 09:00 Thứ Hai.</span>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--blue); display:block; margin-bottom:4px;">Bước 2: Phân tích hiệu suất & Xử lý cảnh báo (09:30 - 10:15)</strong>
            <span style="font-size:11.5px; color:var(--text2);">Hội đồng đánh giá biểu đồ LTV/CAC và cơ cấu Whale concentration. Đối với các chiến dịch ads có ROI &lt; 1.2x hoặc CPA tăng vượt 25%, CMO ra quyết định dừng hoặc giảm ngân sách ngay lập tức để chuyển dịch sang các nhóm ads hiệu quả cao hơn.</span>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--amber); display:block; margin-bottom:4px;">Bước 3: Chấm điểm ICE & Lập kế hoạch Weekly Priorities (10:15 - 11:00)</strong>
            <span style="font-size:11.5px; color:var(--text2);">Hội đồng tiến hành chấm điểm các đề xuất trong Backlog theo khung ICE (Impact, Confidence, Ease) từ 1 đến 10. Ba ý tưởng có điểm tổng cao nhất (bằng công thức <code>(Impact × Confidence × Ease)</code>) sẽ được đưa vào Weekly Priority Engine, gán người chịu trách nhiệm và thiết lập ETA hoàn thành trong tuần.</span>
          </div>
        </div>
      </div>
    `,
    "decision-frame": `
      <h4>Khung Ra Quyết Định Phân Bổ Ngân Sách (Decision Framework)</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Nguyên tắc cốt lõi:</strong> Ngân sách không được phân bổ cố định mà chuyển dịch linh hoạt dựa trên Hiệu suất biên (Marginal LTV/CAC). Mục tiêu là tối đa hóa quy mô tệp khách hàng FTD chất lượng cao trong khi duy trì CAC tổng hợp dưới ngưỡng an toàn.</p>
        
        <p style="margin-bottom:6px;"><strong>Quy tắc phân bổ ngân sách tự động:</strong></p>
        <ul style="margin-left:20px; margin-bottom:12px; list-style-type:disc; display:flex; flex-direction:column; gap:8px;">
          <li><strong>Kịch bản Tăng trưởng (Scale-up):</strong> Nếu một chiến dịch quảng cáo có ROI biên &gt; 2.5x và CAC thấp hơn 80% mức benchmark quy định, hệ thống tự động duyệt tăng ngân sách thêm 20% cho tuần tiếp theo. Quá trình này lặp lại cho đến khi CAC tăng vượt mức benchmark hoặc ROI giảm xuống &lt; 1.5x.</li>
          <li><strong>Kịch bản Cảnh báo & Tối ưu (Optimize):</strong> Nếu chiến dịch có ROI dao động từ 1.2x đến 1.5x, giữ nguyên ngân sách và tập trung A/B test tối ưu hóa tỷ lệ chuyển đổi của Landing Page và mẫu quảng cáo (Hook Ads).</li>
          <li><strong>Kịch bản Cắt giảm & Đóng băng (Freeze):</strong> Nếu ROI của một chiến dịch &lt; 1.0x trong 2 tuần liên tiếp, ngay lập tức cắt giảm 50% ngân sách chiến dịch đó và chuyển dịch số tiền dư thừa sang các nhóm quảng cáo tự nhiên (Organic) hoặc Referral.</li>
          <li><strong>Quản trị rủi ro tập trung (Whale Cap):</strong> Khi tỷ lệ Whale concentration (nồng độ đóng góp doanh thu của tệp VIP) vượt ngưỡng 40%, trích lập 15% ngân sách marketing hiện hữu để chạy các chương trình tương tác cộng đồng diện rộng nhằm đa dạng hóa nguồn doanh thu.</li>
        </ul>
      </div>
    `,
    "faq-answers": `
      <h4>FAQ - Những Câu Hỏi Thường Gặp</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <strong style="color:var(--purple); display:block; margin-bottom:4px;">Q1: Chỉ số Growth Health Score được tính toán chi tiết như thế nào?</strong>
            <span style="font-size:11.5px; color:var(--text2);">A: Chỉ số này được tính dựa trên tổng có trọng số của 5 chỉ số thành phần: 
              <br/>- <strong>Growth Speed (25%):</strong> Tốc độ tăng trưởng doanh thu tuần.
              <br/>- <strong>Unit Economics Profitability (20%):</strong> Tỷ lệ LTV/CAC.
              <br/>- <strong>User Retention (20%):</strong> Tỷ lệ giữ chân Cohort tuần 4.
              <br/>- <strong>Capital Efficiency (20%):</strong> Runway còn lại tính bằng tháng.
              <br/>- <strong>Risk Exposure (15%):</strong> Anomaly rate và nồng độ Whale concentration.
              <br/>Trọng số này có thể thay đổi tùy thuộc vào định hướng chiến lược trong Configuration Center.
            </span>
          </div>
          <hr style="border:none; border-top:1px solid rgba(255,255,255,0.05);"/>
          <div>
            <strong style="color:var(--purple); display:block; margin-bottom:4px;">Q2: Làm thế nào để giải quyết sự không đồng nhất về dữ liệu khi import các chiến dịch quảng cáo?</strong>
            <span style="font-size:11.5px; color:var(--text2);">A: Hệ thống sử dụng quy tắc Schema Validation nghiêm ngặt khi import file CSV/Excel. Các cột bắt buộc bao gồm <code>Campaign_ID</code>, <code>Source</code>, <code>Spend</code>, và <code>Clicks</code>. Nếu bất kỳ trường dữ liệu nào sai định dạng hoặc trống, hệ thống sẽ từ chối ghi đè dữ liệu cũ để tránh làm sai lệch biểu đồ LTV/CAC lịch sử.</span>
          </div>
          <hr style="border:none; border-top:1px solid rgba(255,255,255,0.05);"/>
          <div>
            <strong style="color:var(--purple); display:block; margin-bottom:4px;">Q3: Làm thế nào để tối ưu hóa tệp Whale VIP khi chỉ số sụt giảm?</strong>
            <span style="font-size:11.5px; color:var(--text2);">A: Khi hệ thống cảnh báo Whale VIP sụt giảm, Growth Lead cần kích hoạt SOP Hỗ trợ đặc biệt (KB-002), chuyển đổi ưu đãi từ giảm giá chung sang hoàn phí giao dịch cá nhân hóa và xếp lịch gọi điện thoại hỗ trợ trực tiếp.</span>
          </div>
        </div>
      </div>
    `,
    "KB-001": `
      <h4>KB-001: Quy trình A/B Test Landing Page & Thư viện Hook</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Mục tiêu:</strong> Tăng tỷ lệ cài đặt thành công đăng ký (Install &rarr; Signup CVR) từ 5.0% lên mục tiêu &gt; 7.5% qua việc triển khai thử nghiệm A/B Testing tiêu đề và hình ảnh.</p>
        
        <p style="margin-bottom:6px;"><strong>Quy trình thiết lập A/B Test (4 Bước):</strong></p>
        <ol style="margin-left:20px; margin-bottom:12px; list-style-type:decimal; display:flex; flex-direction:column; gap:6px;">
          <li><strong>Bước 1: Thiết kế mẫu thử nghiệm:</strong> Tạo Variant A (Control - dùng giao diện cũ giới thiệu chung các tính năng) và Variant B (Challenger - tập trung giải pháp cụ thể bằng Hook mạnh mẽ, CTA to rõ và nền tối giản).</li>
          <li><strong>Bước 2: Phân luồng traffic tự động:</strong> Sử dụng Google Optimize hoặc Firebase Remote Config để chia đều 50% lượng traffic mới truy cập vào từng variant. Chỉ chấp nhận các lượt truy cập organic và quảng cáo đồng nhất.</li>
          <li><strong>Bước 3: Đo lường và kiểm định:</strong> Chạy thử nghiệm tối thiểu trong 14 ngày hoặc cho đến khi đạt độ lớn mẫu (Sample Size) đủ để đạt độ tin cậy thống kê (Statistical Significance &ge; 95%).</li>
          <li><strong>Bước 4: Rollout:</strong> Nếu Challenger thắng cuộc, nâng luồng traffic lên 100% cho variant mới, đóng variant cũ và ghi nhận bài học kinh nghiệm vào thư viện Hook.</li>
        </ol>

        <p style="margin-bottom:6px;"><strong>Thư viện Hook chuyển đổi cao:</strong></p>
        <ul style="margin-left:20px; margin-bottom:12px; list-style-type:disc; display:flex; flex-direction:column; gap:6px;">
          <li><code>Hook 1:</code> "Tự động hóa quản lý vốn và gia tăng lợi nhuận cùng AI Copilot." (Thích hợp cho tệp nhà đầu tư chuyên nghiệp)</li>
          <li><code>Hook 2:</code> "Tải app nhận ngay $5 trải nghiệm giao dịch miễn phí đầu tiên." (Thích hợp cho tệp người dùng trẻ)</li>
          <li><code>Hook 3:</code> "Quản lý toàn bộ danh mục tài sản đa kênh trong 30 giây." (Thích hợp cho tệp Whale bận rộn)</li>
        </ul>
      </div>
    `,
    "KB-002": `
      <h4>KB-002: SOP Hỗ trợ và Ưu đãi dành cho tệp Whale VIP</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Định nghĩa Whale VIP:</strong> Là nhóm người dùng có số dư ròng nạp ròng tích lũy &gt; $5,000 hoặc tổng khối lượng giao dịch (Trading Volume) phát sinh &gt; $100,000 trong vòng 30 ngày gần nhất.</p>
        
        <p style="margin-bottom:6px;"><strong>Quy trình chăm sóc đặc biệt (3 Bước):</strong></p>
        <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--purple); display:block; margin-bottom:4px;">1. Gán Account Manager (AM) riêng biệt (Cam kết phản hồi trong 5 phút)</strong>
            <span style="font-size:11.5px; color:var(--text2);">Ngay khi hệ thống phát hiện một Customer_ID đạt điều kiện VIP, tổng đài AM tự động nhận thông báo. AM phải liên hệ chào mừng qua điện thoại hoặc Zalo/Telegram trong vòng tối đa 5 phút để bàn giao thông tin hỗ trợ 24/7.</span>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--blue); display:block; margin-bottom:4px;">2. Áp dụng chính sách phí giao dịch ưu đãi (Fee Rebate)</strong>
            <span style="font-size:11.5px; color:var(--text2);">Cài đặt giảm trực tiếp 50% phí giao dịch cho tất cả các loại tài sản. Hàng tháng, hệ thống tự động hoàn thêm 5% phí giao dịch dưới dạng cashback nếu tài khoản duy trì số dư tối thiểu trên $3,000.</span>
          </div>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
            <strong style="color:var(--amber); display:block; margin-bottom:4px;">3. Tương tác cộng đồng & Chia sẻ nhận định độc quyền</strong>
            <span style="font-size:11.5px; color:var(--text2);">Mời Whale VIP vào nhóm chat Telegram kín. Hàng ngày, AM gửi bản tin phân tích vĩ mô và xu hướng dòng tiền chuyên sâu từ chuyên gia kinh tế trưởng. Tổ chức gặp gỡ Offline VIP định kỳ mỗi quý một lần.</span>
          </div>
        </div>
      </div>
    `,
    "KB-003": `
      <h4>KB-003: Framework Tối ưu hóa phễu KYC Onboarding Android</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Bối cảnh điểm nghẽn:</strong> Phân tích hành trình người dùng trên thiết bị Android cho thấy tỷ lệ hoàn thành bước KYC thấp hơn iOS khoảng 12%. Nguyên nhân cốt lõi là do lỗi quyền truy cập camera trên các thiết bị Android đời cũ và tốc độ tải ảnh gốc dung lượng lớn bị timeout.</p>
        
        <p style="margin-bottom:6px;"><strong>Kế hoạch hành động tối ưu hóa (3 Giải pháp đồng bộ):</strong></p>
        <ul style="margin-left:20px; margin-bottom:12px; list-style-type:disc; display:flex; flex-direction:column; gap:8px;">
          <li><strong>Giải pháp 1: Tự động nén ảnh phía client (Client-side Compression):</strong> Triển khai thư viện nén ảnh trực tiếp trên thiết bị của người dùng trước khi upload lên server. Giới hạn dung lượng tối đa của ảnh giấy tờ dưới 1MB. Giải pháp này giúp giảm tỷ lệ upload lỗi từ 15% xuống dưới 2%.</li>
          <li><strong>Giải pháp 2: UI Hướng dẫn chụp ảnh trực quan (Camera Overlay Guides):</strong> Thiết kế khung viền nét đứt màu xanh lá cây tương ứng với kích thước thẻ căn cước trên màn hình chụp ảnh camera. Nếu người dùng nghiêng thẻ quá 15 độ hoặc thiếu sáng, camera tự động hiển thị gợi ý nhắc nhở bằng tiếng Việt thời gian thực.</li>
          <li><strong>Giải pháp 3: Tích hợp công nghệ OCR và Điền thông tin tự động:</strong> Ứng dụng mô hình AI OCR để tự động trích xuất các thông tin số định danh, họ tên, ngày sinh ngay khi ảnh được chụp thành công. Người dùng chỉ cần xác nhận lại thay vì phải gõ thủ công 10+ trường thông tin, giúp rút ngắn thời gian onboarding xuống 40 giây.</li>
        </ul>
      </div>
    `,
    "KB-004": `
      <h4>KB-004: Best Practices cho các chiến dịch Google Search Ads</h4>
      <div style="margin-top:12px; font-size:12.5px; line-height:1.6; color:var(--text-main);">
        <p style="margin-bottom:10px;"><strong>Mục tiêu:</strong> Tối ưu hóa chi phí chuyển đổi (CPA) và đảm bảo chất lượng tệp người dùng nạp tiền (FTD) thu hút từ Google Ads Search đạt hiệu quả kinh tế cao.</p>
        
        <p style="margin-bottom:6px;"><strong>Bộ quy tắc tối ưu hóa chiến dịch quảng cáo từ khóa (4 Nguyên tắc):</strong></p>
        <ol style="margin-left:20px; margin-bottom:12px; list-style-type:decimal; display:flex; flex-direction:column; gap:6px;">
          <li><strong>Nguyên tắc 1: Cấu trúc từ khóa từ khóa chặt chẽ:</strong> Tuyệt đối không sử dụng khớp rộng (broad match) để tránh thu hút traffic rác. Thay vào đó, áp dụng khớp cụm từ (phrase match) và khớp chính xác (exact match) cho hai nhóm từ khóa: Brand Keywords (tên thương hiệu app) và High-Intent Keywords (các thuật ngữ giao dịch, đầu tư cụ thể).</li>
          <li><strong>Nguyên tắc 2: Tối ưu hóa Negative Keywords hàng ngày:</strong> Rà soát danh sách cụm từ tìm kiếm (search terms report) mỗi sáng. Loại bỏ lập tức các từ khóa có tỷ lệ click cao nhưng không phát sinh đăng ký (ví dụ: "chơi game kiếm tiền", "lừa đảo", "free trial").</li>
          <li><strong>Nguyên tắc 3: Điểm chất lượng quảng cáo (Ad Quality Score):</strong> Đảm bảo điểm chất lượng của Google luôn đạt &gt; 8/10 bằng cách tối ưu hóa sự liên kết chặt chẽ giữa: Từ khóa tìm kiếm &rarr; Tiêu đề mẫu quảng cáo &rarr; Nội dung cụm từ xuất hiện trên Landing Page.</li>
          <li><strong>Nguyên tắc 4: Smart Bidding dựa trên Conversion Value:</strong> Cấu hình Google Ads nhận dữ kiện doanh thu LTV thực tế từ máy chủ thay vì chỉ nhận sự kiện Signup ảo. Thiết lập mục tiêu Target ROAS (Doanh thu trên chi tiêu quảng cáo) tối thiểu đạt 180% để thuật toán Google tự động tìm kiếm người dùng chất lượng cao.</li>
        </ol>
      </div>
    `
  };

  function renderPlaybook(docId = "amazon-6") {
    const display = document.getElementById("playbook-text-display");
    if (display) {
      display.innerHTML = playbookDocs[docId] || playbookDocs["amazon-6"];
    }
  }

  // -------------------------------------------------------------
  // Whale Probability Engine V2 Logic
  // -------------------------------------------------------------
  function initWhaleProbabilityEngine() {
    const runBtn = document.getElementById("btn-run-prediction");
    const inputEl = document.getElementById("predict-cust-id");
    if (!runBtn || !inputEl) return;

    // Run initial prediction
    runWhalePrediction(inputEl.value);

    runBtn.addEventListener("click", () => {
      runWhalePrediction(inputEl.value.trim());
    });
  }

  function runWhalePrediction(custId) {
    const cust = db.customers.find(c => c.Customer_ID.toUpperCase() === custId.toUpperCase());
    
    const resTitle = document.getElementById("pred-res-title");
    const resSeg = document.getElementById("pred-res-seg");
    
    const behAssets = document.getElementById("pred-beh-assets");
    const behVideos = document.getElementById("pred-beh-videos");
    const behCompletion = document.getElementById("pred-beh-completion");
    const behSessions = document.getElementById("pred-beh-sessions");
    const behDeposits = document.getElementById("pred-beh-deposits");
    const behTrades = document.getElementById("pred-beh-trades");
    
    const finDeposit = document.getElementById("pred-fin-deposit");
    const finVolume = document.getElementById("pred-fin-volume");
    const finRevenue = document.getElementById("pred-fin-revenue");
    const finLtv = document.getElementById("pred-fin-ltv");
    
    const whalePct = document.getElementById("pred-whale-pct");
    const whaleBar = document.getElementById("pred-whale-bar");
    const predictedLtv = document.getElementById("pred-predicted-ltv");
    const predictedTier = document.getElementById("pred-predicted-tier");

    if (!cust) {
      showToast(`Không tìm thấy mã khách hàng: ${custId}. Vui lòng thử lại với mã từ CUST-0001 đến CUST-0500.`, "warning");
      return;
    }

    resTitle.textContent = `Customer ID: ${cust.Customer_ID} (${cust.Country})`;
    resSeg.textContent = cust.Segment;
    resSeg.className = `badge ${cust.Segment === 'Whale' ? 'scale' : cust.Segment === 'Core' ? 'optimize' : 'test'}`;
    
    behAssets.textContent = `${cust.AssetsViewed} trang`;
    behVideos.textContent = `${cust.VideosWatched} clips`;
    
    // Video completion rate estimates
    const compRate = cust.Segment === 'Whale' ? 82 + (cust.VideosWatched % 10) :
                     cust.Segment === 'Core' ? 68 + (cust.VideosWatched % 15) :
                     cust.Segment === 'Casual' ? 45 + (cust.VideosWatched % 20) : 25;
    
    behCompletion.textContent = `${compRate}%`;
    behSessions.textContent = cust.SessionFrequency;
    
    const depositCount = cust.FTD_Date !== "None" ? 1 + (cust.AssetsViewed % 6) : 0;
    behDeposits.textContent = `${depositCount} lần`;
    behTrades.textContent = `${cust.Trade_Count} lần`;
    
    finDeposit.textContent = `$${cust.Deposit.toLocaleString()}`;
    finVolume.textContent = `$${cust.TradeVolume.toLocaleString()}`;
    finRevenue.textContent = `$${cust.Revenue.toLocaleString()}`;
    finLtv.textContent = `$${cust.LTV.toLocaleString()}`;
    
    // Calc Whale probability score
    let score = 0;
    if (cust.Deposit >= 5000) score += 50;
    else score += (cust.Deposit / 5000) * 45;

    score += (cust.WatchTime / 180) * 25;
    score += (cust.SessionFrequency / 16) * 15;
    score += (cust.Trade_Count / 30) * 15;

    let prob = Math.round(score);
    prob = Math.max(5, Math.min(99, prob));
    
    whalePct.textContent = `${prob}%`;
    if (whaleBar) {
      whaleBar.style.width = `${prob}%`;
      whaleBar.className = `bar-fill ${prob >= 80 ? 'emerald' : prob >= 50 ? 'cyan' : 'coral'}`;
    }
    
    const predLtvVal = Math.round(cust.LTV * (1.15 + (prob / 100) * 0.45));
    predictedLtv.textContent = `$${predLtvVal.toLocaleString()}`;
    
    let pTier = "Low Deposit";
    if (predLtvVal >= 5000 || cust.Deposit >= 4500) pTier = "Whale Tier";
    else if (predLtvVal >= 1500) pTier = "High Tier";
    else if (predLtvVal >= 500) pTier = "Mid Tier";
    else if (cust.Deposit === 0) pTier = "No Deposit";
    
    predictedTier.textContent = pTier;

    addAuditLogEntry(currentPersona, `Chạy dự báo Whale V2 cho ${cust.Customer_ID}`, `Xác suất: ${prob}% | LTV dự báo: $${predLtvVal}`);
  }

  function initChurnEngine() {
    const runBtn = document.getElementById("btn-run-churn-prediction");
    const inputEl = document.getElementById("churn-cust-id");
    if (!runBtn || !inputEl) return;

    // Run initial churn prediction
    runChurnPrediction(inputEl.value);

    runBtn.addEventListener("click", () => {
      runChurnPrediction(inputEl.value.trim());
    });

    inputEl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        runChurnPrediction(inputEl.value.trim());
      }
    });
  }

  function runChurnPrediction(custId) {
    const cust = db.customers.find(c => c.Customer_ID.toUpperCase() === custId.toUpperCase());
    
    const resTitle = document.getElementById("churn-res-title");
    const resStatus = document.getElementById("churn-res-status");
    const signalsList = document.getElementById("churn-signals-list");
    const probPct = document.getElementById("churn-prob-pct");
    const probBar = document.getElementById("churn-prob-bar");
    const resStrategy = document.getElementById("churn-res-strategy");
    const resultBox = document.getElementById("churn-result-box");

    if (!cust) {
      showToast(`Không tìm thấy mã khách hàng: ${custId}. Vui lòng thử lại với mã từ CUST-0001 đến CUST-0500.`, "warning");
      return;
    }

    if (resultBox) resultBox.style.display = "block";

    resTitle.textContent = `Customer ID: ${cust.Customer_ID} (${cust.Country})`;

    // Risk calculation
    let baseProb = 15;
    let statusText = "An toàn (Safe)";
    let statusClass = "optimize"; // green-ish
    let signals = [];

    // Churn based on segment and status
    if (cust.Segment === "Dormant" || cust.Retention_Status === "Churned") {
      baseProb = 90 + (cust.UsageHour % 10);
      statusText = "Rời bỏ (Churned)";
      statusClass = "stop"; // red
    } else if (cust.Retention_Status === "At Risk") {
      baseProb = 65 + (cust.UsageHour % 15);
      statusText = "Nguy cơ (Warning)";
      statusClass = "test"; // orange
    } else { // Active
      baseProb = 5 + (cust.UsageHour % 15);
      statusText = "An toàn (Safe)";
      statusClass = "optimize"; // green
    }

    // Dynamic signals logic
    if (cust.SessionFrequency < 5) {
      baseProb += 10;
      signals.push("⚠️ Tần suất sử dụng app thấp (< 5 lần/tuần)");
    }
    if (cust.Trade_Count === 0) {
      baseProb += 15;
      signals.push("⚠️ Người dùng chưa thực hiện giao dịch đầu tiên");
    } else if (cust.Trade_Count < 3) {
      baseProb += 5;
      signals.push("⚠️ Số lượng giao dịch trong tháng cực thấp (< 3)");
    }
    if (cust.AssetsViewed < 4) {
      baseProb += 8;
      signals.push("⚠️ Ít tương tác nội dung tài chính/education");
    }

    let finalProb = Math.max(2, Math.min(99, baseProb));
    
    // Status text adjustment based on final probability
    if (finalProb >= 75) {
      statusText = "Nguy cơ cao (High Risk)";
      statusClass = "stop";
    } else if (finalProb >= 40) {
      statusText = "Cảnh báo (Warning)";
      statusClass = "test";
    } else {
      statusText = "An toàn (Safe)";
      statusClass = "optimize";
    }

    resStatus.textContent = statusText;
    resStatus.className = `badge ${statusClass}`;

    // Render signals list
    if (signalsList) {
      if (signals.length === 0) {
        signalsList.innerHTML = `<div style="color:var(--green); font-size:11.5px;">✓ Tín hiệu hoạt động tốt, không phát hiện rủi ro.</div>`;
      } else {
        signalsList.innerHTML = signals.map(sig => `<div style="font-size:11px; margin-bottom:2px; color:var(--text1);">${sig}</div>`).join("");
      }
    }

    probPct.textContent = `${finalProb}%`;
    if (probBar) {
      probBar.style.width = `${finalProb}%`;
      probBar.className = `bar-fill ${finalProb >= 75 ? 'stop' : finalProb >= 40 ? 'test' : 'optimize'}`;
    }

    // AI Strategy recommendation
    let strategyText = "";
    if (finalProb >= 75) {
      strategyText = "Gửi khẩn cấp Email Reactivation tặng coupon hoàn tiền nạp $10, đẩy thông báo push nhắc nhở với tiêu đề ưu đãi đặc biệt.";
    } else if (finalProb >= 40) {
      strategyText = "Tự động phân bổ vào chiến dịch push thông báo tin tức vĩ mô nóng và mã chiết khấu 20% phí giao dịch trong 48 giờ tới.";
    } else {
      strategyText = "Duy trì tần suất gửi bản tin thị trường chất lượng cao hàng tuần. Đề xuất tham gia cộng đồng VIP Whale Trader nếu LTV đủ chuẩn.";
    }
    resStrategy.textContent = strategyText;

    addAuditLogEntry(currentPersona, `Chạy dự báo Churn rủi ro cho ${cust.Customer_ID}`, `Xác suất: ${finalProb}% | Phân loại: ${statusText}`);
  }

  // -------------------------------------------------------------
  // Asset Consumption & Customer Value Segmentation V2
  // -------------------------------------------------------------
  function renderCustomerContentValueIntelligence() {
    const customers = getFilteredCustomers();
    const totalCount = customers.length;
    if (totalCount === 0) return;

    // 1. Asset Consumption KPIs
    const totalAssets = customers.reduce((sum, c) => sum + c.AssetsViewed, 0);
    const totalVideos = customers.reduce((sum, c) => sum + c.VideosWatched, 0);
    const totalWatchTime = customers.reduce((sum, c) => sum + c.WatchTime, 0);
    
    const kycUsers = customers.filter(c => c.KYC_Date !== "None");
    const totalAssetsKyc = kycUsers.reduce((sum, c) => sum + c.AssetsBeforeKYC, 0);
    
    const ftdUsers = customers.filter(c => c.FTD_Date !== "None");
    const totalAssetsFtd = ftdUsers.reduce((sum, c) => sum + c.AssetsBeforeFTD, 0);
    
    const whaleUsers = customers.filter(c => c.Segment === "Whale");
    const totalAssetsWhale = whaleUsers.reduce((sum, c) => sum + c.AssetsBeforeFTD, 0);
    
    const tradeUsers = customers.filter(c => c.Trade_Count > 0);
    const totalAssetsTrade = tradeUsers.reduce((sum, c) => sum + c.AssetsBeforeFirstTrade, 0);

    document.getElementById("intel-avg-assets-viewed").textContent = `${(totalAssets / totalCount).toFixed(1)} trang`;
    document.getElementById("intel-avg-videos-watched").textContent = `${(totalVideos / totalCount).toFixed(1)} clips`;
    document.getElementById("intel-avg-watch-time").textContent = `${(totalWatchTime / totalCount).toFixed(1)} phút`;
    document.getElementById("intel-assets-before-kyc").textContent = `${kycUsers.length > 0 ? (totalAssetsKyc / kycUsers.length).toFixed(1) : 0} trang`;
    document.getElementById("intel-assets-before-ftd").textContent = `${ftdUsers.length > 0 ? (totalAssetsFtd / ftdUsers.length).toFixed(1) : 0} trang`;
    document.getElementById("intel-assets-before-whale").textContent = `${whaleUsers.length > 0 ? (totalAssetsWhale / whaleUsers.length).toFixed(1) : 0} trang`;
    document.getElementById("intel-assets-before-first-trade").textContent = `${tradeUsers.length > 0 ? (totalAssetsTrade / tradeUsers.length).toFixed(1) : 0} trang`;

    // 2. Whale behaviour
    const whaleAssets = whaleUsers.reduce((sum, c) => sum + c.AssetsViewed, 0);
    const whaleVideos = whaleUsers.reduce((sum, c) => sum + c.VideosWatched, 0);
    document.getElementById("intel-whale-assets").textContent = `${whaleUsers.length > 0 ? (whaleAssets / whaleUsers.length).toFixed(1) : 0} trang`;
    document.getElementById("intel-whale-videos").textContent = `${whaleUsers.length > 0 ? (whaleVideos / whaleUsers.length).toFixed(1) : 0} clips`;

    // 3. Revenue Intelligence
    const totalRev = customers.reduce((sum, c) => sum + c.Revenue, 0);
    document.getElementById("intel-rev-per-user").textContent = `$${(totalRev / totalCount).toFixed(2)}`;
    document.getElementById("intel-rev-per-asset").textContent = `$${(totalRev / totalAssets).toFixed(2)}`;
    document.getElementById("intel-rev-per-hour").textContent = `$${(totalWatchTime > 0 ? (totalRev / (totalWatchTime / 60)) : 0).toFixed(2)}`;

    // 4. Revenue Per Consumer Buckets
    const buckets = [
      { name: "1-3 nội dung", min: 1, max: 3, users: 0, revenue: 0, ltv: 0 },
      { name: "4-7 nội dung", min: 4, max: 7, users: 0, revenue: 0, ltv: 0 },
      { name: "8-15 nội dung", min: 8, max: 15, users: 0, revenue: 0, ltv: 0 },
      { name: "16-30 nội dung", min: 16, max: 30, users: 0, revenue: 0, ltv: 0 },
      { name: "30+ nội dung", min: 31, max: 999, users: 0, revenue: 0, ltv: 0 }
    ];

    customers.forEach(c => {
      const cnt = c.AssetsViewed;
      const b = buckets.find(bk => cnt >= bk.min && cnt <= bk.max);
      if (b) {
        b.users++;
        b.revenue += c.Revenue;
        b.ltv += c.LTV;
      }
    });

    const consumerTbody = document.getElementById("intel-consumer-tbody");
    if (consumerTbody) {
      consumerTbody.innerHTML = "";
      buckets.forEach(b => {
        const avgLtv = b.users > 0 ? b.ltv / b.users : 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${b.name.replace(/\s*nội dung/i, "")}</strong></td>
          <td><span class="badge test">${b.users}</span></td>
          <td style="font-weight:700; color:var(--purple);">$${Math.round(b.revenue).toLocaleString()}</td>
          <td style="font-weight:700; color:var(--green);">$${Math.round(avgLtv).toLocaleString()}</td>
        `;
        consumerTbody.appendChild(tr);
      });
    }

    // 5. Value Segmentation Tiers
    const depTiers = {
      "Chưa nạp ($0)": customers.filter(c => c.Deposit === 0).length,
      "Thấp (<$500)": customers.filter(c => c.Deposit > 0 && c.Deposit < 500).length,
      "Trung bình ($500-$2k)": customers.filter(c => c.Deposit >= 500 && c.Deposit < 2000).length,
      "Cao ($2k-$5k)": customers.filter(c => c.Deposit >= 2000 && c.Deposit < 5000).length,
      "Whale VIP (>=$5k)": customers.filter(c => c.Deposit >= 5000).length
    };

    const tradeTiers = {
      "Chưa trade (0 trades)": customers.filter(c => c.Trade_Count === 0).length,
      "Light (1-5 trades)": customers.filter(c => c.Trade_Count > 0 && c.Trade_Count <= 5).length,
      "Active (6-20 trades)": customers.filter(c => c.Trade_Count > 5 && c.Trade_Count <= 20).length,
      "Heavy (>20 trades)": customers.filter(c => c.Trade_Count > 20).length
    };

    const ltvTiers = {
      "Low LTV (<$200)": customers.filter(c => c.LTV < 200).length,
      "Mid LTV ($200-$1k)": customers.filter(c => c.LTV >= 200 && c.LTV < 1000).length,
      "High LTV ($1k-$5k)": customers.filter(c => c.LTV >= 1000 && c.LTV < 5000).length,
      "VIP LTV (>=$5k)": customers.filter(c => c.LTV >= 5000).length
    };

    // Phân khúc V2 → 3 cục ngang (mỗi cục: header màu + danh sách tier)
    const buildSegCol = (title, color, tiers, badgeClass) => {
      const rows = Object.keys(tiers).map(k => {
        const count = tiers[k];
        const pct = ((count / totalCount) * 100).toFixed(1);
        return `<div class="seg3-row"><span class="seg3-name">${k}</span><strong class="seg3-count">${count}</strong><span class="badge ${badgeClass} seg3-pct">${pct}%</span></div>`;
      }).join("");
      return `<div class="seg3-head" style="color:${color}; border-bottom-color:${color};">${title}</div>${rows}`;
    };
    const segColDep = document.getElementById("seg-col-deposit");
    const segColTrade = document.getElementById("seg-col-trade");
    const segColLtv = document.getElementById("seg-col-ltv");
    if (segColDep) segColDep.innerHTML = buildSegCol("Phân khúc Tổng Nạp", "var(--purple)", depTiers, "scale");
    if (segColTrade) segColTrade.innerHTML = buildSegCol("Phân khúc Giao Dịch", "var(--teal)", tradeTiers, "optimize");
    if (segColLtv) segColLtv.innerHTML = buildSegCol("Phân khúc LTV", "var(--coral)", ltvTiers, "stop");
  }

  // -------------------------------------------------------------
  // Geopolitical Regimes
  // -------------------------------------------------------------
  function initGeopoliticalRegimes() {
    const select = document.getElementById("geopolitical-regime-select");
    if (!select) return;

    select.innerHTML = "";
    db.geopoliticalRegimes.forEach(regime => {
      const opt = document.createElement("option");
      opt.value = regime.id;
      opt.textContent = regime.name;
      select.appendChild(opt);
    });

    select.addEventListener("change", () => {
      updateScenarioForecast();
      updateGeopoliticalDetails();
    });
  }

  let capBaseScore = 80;   // điểm gốc (kỳ 30 ngày) của Capital Health; nút kỳ nhân hệ số lên điểm này
  function updateCapitalHealthScore(score, animate = true, days) {
    const card = document.getElementById("cap-vh-card");
    if (!card) return;

    const arc = document.getElementById("cap-arc");
    const track = document.getElementById("cap-arc-track");
    const needle = document.getElementById("cap-needle");
    if (!arc || !track || !needle) return;

    // Nút kỳ (1 năm/6th/3th/1th/7 ngày) điều khiển điểm hiển thị; lưu BASE để bấm kỳ không cộng dồn.
    if (typeof score === "number" && score > 0) capBaseScore = score;
    if (days == null) { const _ab = document.querySelector('#cap-seg button.active'); days = _ab ? (parseInt(_ab.getAttribute('data-days'), 10) || 30) : 30; }
    const _le = gdEffForDays(days);
    const dispScore = Math.max(10, Math.min(99, Math.round(capBaseScore * _le)));

    // Redraw track
    const A0 = -132, SWEEP = 264, R = 46;
    function polar(cx,cy,r,deg){var a=deg*Math.PI/180; return [cx+r*Math.sin(a), cy-r*Math.cos(a)];}
    function arcPath(cx,cy,r,a0,a1){var q0=polar(cx,cy,r,a0),q1=polar(cx,cy,r,a1),lg=(a1-a0)>180?1:0; return 'M '+q0[0].toFixed(2)+' '+q0[1].toFixed(2)+' A '+r+' '+r+' 0 '+lg+' 1 '+q1[0].toFixed(2)+' '+q1[1].toFixed(2);}
    
    const dPath = arcPath(80, 80, R, A0, A0 + SWEEP);
    track.setAttribute("d", dPath);
    arc.setAttribute("d", dPath);
    
    const L = typeof arc.getTotalLength === "function" ? arc.getTotalLength() : 280;
    arc.style.strokeDasharray = L;

    const select = document.getElementById("geopolitical-regime-select");
    const regime = (db.geopoliticalRegimes && select) ? db.geopoliticalRegimes.find(r => r.id === select.value) : null;
    const mul = regime ? (regime.retMul / regime.cacMul) : 1;

    const ovRunway = (typeof getMetricOverride === "function") ? getMetricOverride("runway_months") : null;
    const runwayMonths = ovRunway !== null ? Math.round(ovRunway) : Math.max(1, Math.min(24, Math.round(14 * mul * _le)));
    const burnRateEff = Math.max(10, Math.min(100, Math.round(85 * mul * _le)));

    // Set score and label text
    const scoreEl = document.getElementById("cap-score");
    if (scoreEl) scoreEl.textContent = dispScore;

    const labelEl = document.getElementById("cap-label");
    if (labelEl) {
      if (dispScore >= 85) {
        labelEl.textContent = "HIGHLY EFFICIENT";
        labelEl.style.color = "var(--green)";
      } else if (dispScore >= 70) {
        labelEl.textContent = "EFFICIENT";
        labelEl.style.color = "var(--purple)";
      } else {
        labelEl.textContent = "NEEDS OPTIMIZATION";
        labelEl.style.color = "var(--coral)";
      }
    }

    // Set runway and burn rate labels
    const runwayEl = document.getElementById("cap-runway");
    if (runwayEl) runwayEl.textContent = runwayMonths + " months";
    const burnrateEl = document.getElementById("cap-burnrate");
    if (burnrateEl) burnrateEl.textContent = burnRateEff + "/100";

    const frac = dispScore / 100;
    const ang = A0 + SWEEP * frac;

    function apply() {
      arc.style.strokeDashoffset = L * (1 - frac);
      needle.style.transform = "rotate(" + ang + "deg)";

      const runwayBar = document.getElementById("cap-runway-bar");
      if (runwayBar) runwayBar.style.width = ((runwayMonths / 24) * 100) + "%";
      
      const burnrateBar = document.getElementById("cap-burnrate-bar");
      if (burnrateBar) burnrateBar.style.width = burnRateEff + "%";
    }

    if (animate) {
      arc.style.strokeDashoffset = L;
      needle.style.transform = "rotate(" + A0 + "deg)";
      const runwayBar = document.getElementById("cap-runway-bar");
      if (runwayBar) runwayBar.style.width = "0%";
      const burnrateBar = document.getElementById("cap-burnrate-bar");
      if (burnrateBar) burnrateBar.style.width = "0%";
      
      void card.getBoundingClientRect(); // force reflow
      setTimeout(apply, 60);
    } else {
      apply();
    }

    // Update Sparkline — dốc nhẹ theo kỳ để ĐỔI HÌNH, điểm cuối = điểm hiển thị
    const baseSpark = gdTiltSeries([75, 78, 76, 82, 80, 84, 82, dispScore], _le);
    const currentSpark = baseSpark.map(v => Math.max(10, Math.min(100, Math.round(v * mul))));
    const sparkEl = document.getElementById("cap-spark");
    if (sparkEl && typeof gkSparkSVG === "function") {
      sparkEl.innerHTML = gkSparkSVG("cap", currentSpark);
    }

    // Update Delta percentage
    const firstVal = currentSpark[0];
    const lastVal = currentSpark[currentSpark.length - 1];
    const delta = Math.max(-50, Math.min(50, ((lastVal - firstVal) / firstVal) * 100));
    const deltaText = (delta >= 0 ? "+" : "") + delta.toFixed(1).replace(".", ",") + "%";
    const deltaEl = document.getElementById("cap-delta");
    if (deltaEl) {
      deltaEl.textContent = deltaText;
      deltaEl.className = "d" + (delta < 0 ? " neg" : "");
    }
  }

  function updateGeopoliticalDetails() {
    const select = document.getElementById("geopolitical-regime-select");
    const container = document.getElementById("geopolitical-details");
    if (!select || !container) return;

    const regime = db.geopoliticalRegimes.find(r => r.id === select.value);
    if (!regime) return;

    // Calculate actual baseline health score based on database campaigns and customer LTV
    const filteredCampaigns = getFilteredCampaigns();
    const filteredCustomers = getFilteredCustomers();
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.Spend || c.cost || 0), 0);
    const totalKYC = filteredCampaigns.reduce((sum, c) => sum + (c.KYC || c.signups || 0), 0);
    const avgCAC = totalKYC > 0 ? (totalSpend / totalKYC) : 12;
    
    const totalLTV = filteredCustomers.reduce((sum, c) => {
      const ltvVal = typeof c.LTV === "number" ? c.LTV : (parseFloat(String(c.LTV || "").replace(/[^0-9.-]/g, "")) || 2500);
      return sum + ltvVal;
    }, 0);
    const avgLTV = filteredCustomers.length > 0 ? (totalLTV / filteredCustomers.length) : 2500;
    
    const ltvCacRatio = avgCAC > 0 ? (avgLTV / 100 / avgCAC) : 2.5;
    const baseHealth = Math.max(60, Math.min(92, Math.round(ltvCacRatio * 30)));
    const healthVal = Math.max(10, Math.min(100, Math.round(baseHealth * (regime.retMul / regime.cacMul))));
    
    updateCapitalHealthScore(healthVal, true);

    const indicatorsHtml = (regime.keyIndicators || []).map(ind => {
      const arrow = ind.trend === "up" ? "▲" : ind.trend === "down" ? "▼" : "▶";
      const col = ind.trend === "up" ? "var(--green)" : ind.trend === "down" ? "var(--coral)" : "var(--text-muted)";
      return `<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(0,0,0,0.03); border:1px solid var(--border-color); border-radius:6px; padding:3px 8px; font-size:11px;"><strong>${ind.name}:</strong> ${ind.value} <span style="color:${col}; font-weight:800;">${arrow}</span></span>`;
    }).join("");
    const playbookHtml = (regime.playbook || []).map(p => `<li style="margin-bottom:3px;">${p}</li>`).join("");
    const riskClass = regime.riskLevel.includes('Thấp') ? 'optimize' : regime.riskLevel.includes('Cao') ? 'stop' : 'test';

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
        <span><strong>Tài sản ưa chuộng:</strong> <span class="badge scale" style="background:rgba(100,84,227,0.1); color:var(--purple); font-weight:700;">${regime.preferredAsset}</span></span>
        <span style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span><strong>Xác suất:</strong> <span class="badge optimize">${regime.probability}%</span></span>
          <span style="color:var(--text3);"><strong>Tầm nhìn:</strong> ${regime.horizon}</span>
          <span><strong>Rủi ro:</strong> <span class="badge ${riskClass}">${regime.riskLevel}</span></span>
        </span>
      </div>
      <p style="margin:4px 0 8px 0; font-size:11.5px; color:var(--text2); line-height:1.45;">${regime.description}</p>
      <div style="margin-bottom:8px;">
        <div style="font-size:11px; font-weight:800; color:var(--text3); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px;">Chỉ báo theo dõi</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">${indicatorsHtml}</div>
      </div>
      <div style="border-left:2px solid var(--purple); background:rgba(100,84,227,0.03); padding:6px 10px; border-radius:4px;">
        <div style="font-weight:800; color:var(--purple); font-size:11px; margin-bottom:4px;">Playbook hành động</div>
        <ul style="margin:0; padding-left:16px; font-size:11px; font-weight:600; color:var(--text2);">${playbookHtml}</ul>
      </div>
      <div style="display:flex; gap:12px; margin-top:8px; font-size:11px; color:var(--text3); border-top:1px solid var(--border-color); padding-top:6px;">
        <span>Tác động &rarr; Tăng trưởng: <strong>x${regime.growthMul}</strong></span>
        <span>CAC: <strong>x${regime.cacMul}</strong></span>
        <span>Retention: <strong>x${regime.retMul}</strong></span>
      </div>
    `;

    addAuditLogEntry(currentPersona, `Chọn kịch bản địa chính trị: "${regime.name}"`, `Dự phóng doanh thu tăng hệ số x${regime.growthMul}`);
    renderEconomicCalendar(); // re-highlight events of the newly selected regime
  }

  // -------------------------------------------------------------
  // Economic & Geopolitical Calendar (cập nhật liên tục)
  // -------------------------------------------------------------
  function econFmtRelative(ms) {
    const abs = Math.abs(ms);
    const d = Math.floor(abs / 86400000);
    const h = Math.floor((abs % 86400000) / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    if (d > 0) return `${d} ngày ${h} giờ`;
    if (h > 0) return `${h} giờ ${m} phút`;
    return `${m} phút`;
  }

  function renderEconomicCalendar() {
    const tbody = document.getElementById("econ-calendar-list");
    if (!tbody) return;
    const now = new Date();
    const regimeSelect = document.getElementById("geopolitical-regime-select");
    const selectedRegime = regimeSelect ? regimeSelect.value : "";

    const events = (db.economicCalendar || []).map(ev => {
      const dt = new Date(ev.datetime.replace(" ", "T"));
      return Object.assign({}, ev, { _ms: dt.getTime() - now.getTime() });
    })
    .filter(ev => econCalFilter === "ALL" || ev.category === econCalFilter)
    .filter(ev => {
      const daysDiff = Math.abs(ev._ms) / 86400000;
      return daysDiff <= execTimeframeDays;
    });

    // Upcoming (nearest first), then past (most recent first)
    events.sort((a, b) => {
      const au = a._ms >= 0, bu = b._ms >= 0;
      if (au && bu) return a._ms - b._ms;
      if (!au && !bu) return b._ms - a._ms;
      return au ? -1 : 1;
    });

    const impColor = { "Cao": "var(--coral)", "Trung bình": "var(--color-warning)", "Thấp": "var(--text-muted)" };
    tbody.innerHTML = "";
    if (events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:14px;">Không có sự kiện trong nhóm này.</td></tr>`;
      return;
    }
    events.forEach(ev => {
      const isPast = ev._ms < 0;
      const isSoon = !isPast && ev._ms < 86400000;
      const rel = isPast ? "Đã diễn ra" : (ev._ms < 3600000 ? "Sắp diễn ra" : `Còn ${econFmtRelative(ev._ms)}`);
      const dateStr = ev.datetime.slice(5, 16);
      const highlight = selectedRegime && ev.linkedRegimeId === selectedRegime;
      const regimeName = (db.geopoliticalRegimes.find(r => r.id === ev.linkedRegimeId) || {}).name || "—";
      const tr = document.createElement("tr");
      tr.style.opacity = isPast ? "0.5" : "1";
      if (highlight) tr.style.background = "rgba(100,84,227,0.06)";
      tr.innerHTML = `
        <td style="white-space:nowrap;">
          <div style="font-weight:700; font-family:monospace;">${dateStr}</div>
          <div style="font-size:11px; font-weight:700; color:${isSoon ? 'var(--green)' : 'var(--text-muted)'};">${isSoon ? '● ' : ''}${rel}</div>
        </td>
        <td>
          <div style="font-weight:600;">${ev.event}${highlight ? ' <span class="badge scale" style="font-size:11px; padding:0 4px;">Đang chọn</span>' : ''}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${ev.impact}</div>
        </td>
        <td><span class="badge test" style="font-size:11px;">${ev.region}</span><div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${ev.category}</div></td>
        <td><span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:800; color:${impColor[ev.importance] || 'var(--text2)'};"><span style="width:6px; height:6px; border-radius:50%; background:${impColor[ev.importance] || 'var(--text2)'};"></span>${ev.importance}</span></td>
        <td style="font-size:11px;"><strong>${ev.forecast}</strong><div style="font-size:11px; color:var(--text-muted);">Trước: ${ev.previous}</div></td>
        <td style="font-size:11px; font-weight:800; color:${ev.actual ? 'var(--purple)' : 'var(--text-muted)'};">${ev.actual || '—'}</td>
        <td style="font-size:11px; color:var(--text2); max-width:200px;">${regimeName}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function initEconomicCalendar() {
    const filters = document.getElementById("econ-cal-filters");
    if (filters && !filters._bound) {
      filters._bound = true;
      filters.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
          filters.querySelectorAll("button").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          econCalFilter = btn.getAttribute("data-cat");
          renderEconomicCalendar();
        });
      });
    }
    renderEconomicCalendar();

    // Continuous live updates: ticking clock + pulsing dot + periodic countdown refresh
    if (!econCalendarTimer) {
      econCalendarTimer = setInterval(() => {
        econCalTick++;
        const clock = document.getElementById("econ-cal-clock");
        if (clock) {
          const n = new Date();
          const pad = (x) => String(x).padStart(2, "0");
          clock.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
        }
        const dot = document.getElementById("econ-cal-live-dot");
        if (dot) dot.style.opacity = (econCalTick % 2 === 0) ? "1" : "0.35";
        if (econCalTick % 10 === 0) renderEconomicCalendar(); // refresh countdowns/status
      }, 1000);
    }
  }

  // Helper to dynamically calculate Content tab metrics based on selected timeframe
  function getDynamicContentData(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);
    
    // Filter customers by Install_Date
    const filteredCs = (db.customers || []).filter(c => c.Install_Date >= cutoffStr);
    
    // Campaign content mapping
    const CAMPAIGN_MAP = {
      "M-01": { theme: "Passive Income", hook: "Fear Hook", channel: "Meta Ads" },
      "M-02": { theme: "Market News", hook: "Curiosity Hook", channel: "Meta Ads" },
      "M-03": { theme: "Trading Psychology", hook: "Greed Hook", channel: "Meta Ads" },
      "G-01": { theme: "Beginner Education", hook: "Contrarian Hook", channel: "Google Ads" },
      "G-02": { theme: "Technical Analysis", hook: "Authority Hook", channel: "Google Ads" },
      "G-03": { theme: "Product Education", hook: "Benefit Hook", channel: "Google Ads" },
      "T-01": { theme: "Community Story", hook: "Social Proof Hook", channel: "TikTok Ads" },
      "T-02": { theme: "Success Story", hook: "FOMO Hook", channel: "TikTok Ads" },
      "T-03": { theme: "Beginner Education", hook: "Contrarian Hook", channel: "TikTok Ads" },
      "A-01": { theme: "Passive Income", hook: "Greed Hook", channel: "Apple Search Ads" },
      "A-02": { theme: "Technical Analysis", hook: "Curiosity Hook", channel: "Apple Search Ads" }
    };

    // 1. Group by Theme
    const themes = ["Beginner Education", "Technical Analysis", "Passive Income", "Market News", "Trading Psychology", "Product Education", "Community Story", "Success Story"];
    const themeData = themes.map(theme => {
      const themeCs = filteredCs.filter(c => {
        const map = CAMPAIGN_MAP[c.Campaign];
        return map && map.theme === theme;
      });
      
      const revenue = themeCs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
      const installs = themeCs.length;
      const kyc = themeCs.filter(c => c.KYC_Date && c.KYC_Date !== "None").length;
      
      const creativesCount = theme === "Beginner Education" ? 5 : theme === "Technical Analysis" ? 4 : theme === "Passive Income" ? 6 : theme === "Market News" ? 3 : theme === "Trading Psychology" ? 4 : theme === "Product Education" ? 3 : theme === "Community Story" ? 2 : 4;
      const impressions = installs * 150 + Math.round(revenue * 4);
      const ctr = impressions > 0 ? (installs * 4.5 / impressions * 100) : 0;
      const cvr = installs > 0 ? (kyc / installs * 100) : 0;
      const roi = installs > 0 ? (revenue / Math.max(1, installs * 12)) : 0;

      return {
        Theme: theme,
        CreativesCount: creativesCount,
        Impressions: impressions,
        CTR: ctr.toFixed(1) + "%",
        CVR: cvr.toFixed(0) + "%",
        Revenue: Math.round(revenue),
        ROI: roi > 0 ? roi : 1.0
      };
    });

    // 2. Group by Hook for Hook Intel V2
    const hookTypes = ["Fear Hook", "Greed Hook", "Curiosity Hook", "Contrarian Hook", "Authority Hook"];
    const hookDataV2 = hookTypes.map(type => {
      const hookCs = filteredCs.filter(c => {
        const map = CAMPAIGN_MAP[c.Campaign];
        return map && map.hook === type;
      });

      const revenue = hookCs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
      const count = hookCs.length;
      const ftd = hookCs.filter(c => c.FTD_Date && c.FTD_Date !== "None").length;
      
      const avgWatch = count > 0 ? hookCs.reduce((sum, c) => sum + (c.WatchTime || 0), 0) / count : 0;
      const retentionPct = Math.min(50, Math.round(30 + avgWatch * 4));
      const cvr = count > 0 ? (ftd / count * 100) : 0;

      const angles = {
        "Fear Hook": "Tránh mất tiền oan khi giao dịch",
        "Greed Hook": "Nhận free $10 token chỉ hôm nay",
        "Curiosity Hook": "Bí mật đằng sau lệnh trade $10,000",
        "Contrarian Hook": "Tại sao 95% trader đều thua lỗ?",
        "Authority Hook": "Lời khuyên từ CEO quỹ triệu đô"
      };

      return {
        Type: type,
        Angle: angles[type] || "Góc tiếp cận hấp dẫn",
        Retention: retentionPct + "%",
        Revenue: "$" + Math.round(revenue).toLocaleString(),
        ConversionRate: cvr.toFixed(0) + "%"
      };
    });

    // 3. Platform Dominance Matrix
    const platformDominanceData = themes.map(theme => {
      const themeCs = filteredCs.filter(c => {
        const map = CAMPAIGN_MAP[c.Campaign];
        return map && map.theme === theme;
      });

      const channels = ["Meta Ads", "TikTok Ads", "Google Ads", "YouTube Ads"];
      const channelData = {};
      channels.forEach(ch => {
        const chCs = themeCs.filter(c => {
          if (ch === "YouTube Ads") return c.Source === "YouTube";
          return c.Source + " Ads" === ch || c.Source === ch;
        });
        const rev = chCs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
        const inst = chCs.length;
        const roi = inst > 0 ? (rev / (inst * 12)) : 0;
        const cpa = inst > 0 ? (inst * 12 / Math.max(1, chCs.filter(c => c.FTD_Date !== "None").length)) : 15;
        channelData[ch] = {
          Revenue: Math.round(rev),
          ROI: roi > 0 ? roi : 1.0,
          CPA: cpa,
          Scale: rev > 20000 ? "High" : rev > 5000 ? "Medium" : "Low",
          Saturation: Math.min(95, Math.max(10, Math.round(30 + (rev % 50))))
        };
      });

      let winner = "Meta";
      let maxRev = -1;
      for (const ch in channelData) {
        if (channelData[ch].Revenue > maxRev) {
          maxRev = channelData[ch].Revenue;
          winner = ch.replace(" Ads", "");
        }
      }

      return {
        Theme: theme,
        Meta: channelData["Meta Ads"],
        TikTok: channelData["TikTok Ads"],
        Google: channelData["Google Ads"],
        YouTube: channelData["YouTube Ads"],
        WinningPlatform: winner
      };
    });

    // 4. Creative Assets (Video Drop-off)
    const creativeAssetsData = (db.creativeAssets || []).map(asset => {
      const campCs = filteredCs.filter(c => c.Campaign === asset.id);
      const viewers = campCs.length;
      const revenue = campCs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
      
      const avgWatchTime = viewers > 0 ? campCs.reduce((sum, c) => sum + (c.WatchTime || 0), 0) / viewers * 60 : 30;
      const avgViewDurationPct = Math.round(Math.min(95, 20 + avgWatchTime * 1.5));
      const videoCompletionRate = Math.round(Math.min(90, 5 + avgWatchTime * 1.2));
      const roi = viewers > 0 ? (revenue / asset.productionCost) : 0;

      return Object.assign({}, asset, {
        viewers: viewers > 0 ? viewers : 100,
        revenue: Math.round(revenue),
        avgWatchTime: avgWatchTime,
        avgViewDurationPct: avgViewDurationPct,
        videoCompletionRate: videoCompletionRate,
        roi: roi > 0 ? roi : 1.2
      });
    });

    // 5. Creative Fatigue Data
    const totalVolume = filteredCs.length;
    const baseCtr = Math.min(6.5, Math.max(1.5, 3.5 + (totalVolume / 1000)));
    const baseCvr = Math.min(25.0, Math.max(5.0, 15.0 + (totalVolume / 500)));
    const baseCpa = Math.max(5.0, 20.0 - (totalVolume / 200));

    const creativeFatigueData = [];
    for (let f = 1.0; f <= 5.0; f += 0.5) {
      const decay = 1 / (1 + (f - 1) * 0.4);
      const status = f >= 4.0 ? "Bão hòa (Critical)" : f >= 2.5 ? "Cảnh báo (Warning)" : "Tốt (Healthy)";
      creativeFatigueData.push({
        frequency: f,
        ctr: baseCtr * decay,
        cvr: baseCvr * decay,
        cpa: baseCpa / decay,
        status: status
      });
    }

    // 6. Hook Intelligence
    const hookIntelligenceData = (db.hookIntelligence || []).map(row => {
      const hookCs = filteredCs.filter(c => {
        const map = CAMPAIGN_MAP[c.Campaign];
        return map && map.hook === row.Type;
      });
      const count = hookCs.length;
      const ftd = hookCs.filter(c => c.FTD_Date && c.FTD_Date !== "None").length;
      
      const avgWatch = count > 0 ? hookCs.reduce((sum, c) => sum + (c.WatchTime || 0), 0) / count : 0;
      const hookRatePct = Math.min(60, Math.round(25 + avgWatch * 5));
      const ctrPct = count > 0 ? (count * 3 / (count * 200) * 100) : 1.5;
      const cpaVal = ftd > 0 ? (count * 12 / ftd) : 18;

      return {
        Type: row.Type,
        Angle: row.Angle,
        HookRate: hookRatePct + "%",
        CTR: ctrPct.toFixed(2) + "%",
        CPA: "$" + cpaVal.toFixed(2),
        Performance: cpaVal < 10 ? "Outstanding" : cpaVal < 15 ? "Excellent" : "Needs Optimization"
      };
    });

    return {
      contentThemes: themeData,
      hookIntelligenceV2: hookDataV2,
      platformDominance: platformDominanceData,
      creativeAssets: creativeAssetsData,
      creativeFatigueData: creativeFatigueData,
      hookIntelligence: hookIntelligenceData,
      contentPlan: db.contentPlan || []
    };
  }

  // -------------------------------------------------------------
  // Content Theme & Platform Dominance Matrix
  // -------------------------------------------------------------
  function renderContentThemeAndPlatformDominance() {
    const activeData = getDynamicContentData(execTimeframeDays);
    // 1. Theme Table
    const themeTbody = document.getElementById("theme-tbody");
    if (themeTbody) {
      themeTbody.innerHTML = "";
      activeData.contentThemes.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${t.Theme}</strong></td>
          <td><span class="badge test">${t.CreativesCount} creatives</span></td>
          <td style="font-size:11px; color:var(--text3);">${t.Impressions.toLocaleString()}</td>
          <td style="font-weight:700; color:var(--purple);">${t.CTR}</td>
          <td style="font-weight:700; color:var(--teal);">${t.CVR}</td>
          <td style="font-weight:700; color:var(--green);">$${t.Revenue.toLocaleString()}</td>
          <td style="font-weight:700; color:var(--purple);">${t.ROI.toFixed(1)}x</td>
        `;
        themeTbody.appendChild(tr);
      });
    }

    // 2. Hook Table
    const hookV2Tbody = document.getElementById("hook-v2-tbody");
    if (hookV2Tbody) {
      hookV2Tbody.innerHTML = "";
      activeData.hookIntelligenceV2.forEach(h => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${h.Type}</strong></td>
          <td style="font-size:11px; color:var(--text2); max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${h.Angle}">${h.Angle}</td>
          <td style="font-weight:700; color:var(--purple);">${h.Retention}</td>
          <td style="font-weight:700; color:var(--green);">${h.Revenue}</td>
          <td style="font-weight:700; color:var(--teal);">${h.ConversionRate}</td>
        `;
        hookV2Tbody.appendChild(tr);
      });
    }

    // 3. Platform dominance Theme x Platform
    const pdTbody = document.getElementById("platform-dominance-tbody");
    if (pdTbody) {
      pdTbody.innerHTML = "";
      activeData.platformDominance.forEach(row => {
        const tr = document.createElement("tr");
        
        const getCellHtml = (pData, isWinner) => {
          if (!pData) return "<td>-</td>";
          const bg = isWinner ? 'background: rgba(14, 156, 138, 0.08); border-left: 2px solid var(--teal); font-weight:700;' : '';
          const color = isWinner ? 'color: var(--teal);' : 'color: var(--text2);';
          return `
            <td style="${bg} padding: 6px 12px;">
              <div style="font-weight:800; ${color}">$${(pData.Revenue/1000).toFixed(1)}k</div>
              <div style="font-size: 11px; color:var(--text3);">${pData.ROI.toFixed(1)}x | $${pData.CPA.toFixed(1)}</div>
            </td>
          `;
        };

        tr.innerHTML = `
          <td><strong>${row.Theme}</strong></td>
          ${getCellHtml(row.Meta, row.WinningPlatform === "Meta")}
          ${getCellHtml(row.TikTok, row.WinningPlatform === "TikTok")}
          ${getCellHtml(row.Google, row.WinningPlatform === "Google")}
          ${getCellHtml(row.YouTube, row.WinningPlatform === "YouTube")}
          <td>
            <span class="badge ${row.WinningPlatform === 'Meta' ? 'cyan' : row.WinningPlatform === 'TikTok' ? 'test' : row.WinningPlatform === 'YouTube' ? 'stop' : 'optimize'}" style="font-weight:700; font-size: 11px;">
              ${row.WinningPlatform}
            </span>
          </td>
        `;
        pdTbody.appendChild(tr);
      });
    }
  }

  let dropOffChartRef = null;

  function initVideoDropOffAnalytics() {
    const menu = document.getElementById("creative-asset-menu");
    const valSpan = document.getElementById("creative-asset-val");
    if (!menu) return;

    menu.innerHTML = "";
    db.creativeAssets.forEach((c, idx) => {
      const item = document.createElement("div");
      item.className = "dropdown-item" + (c.id === currentCreativeAssetId ? " active" : "");
      item.setAttribute("data-value", c.id);
      item.style.padding = "6px 10px";
      item.style.fontSize = "11.5px";
      item.style.cursor = "pointer";
      item.style.color = "#fff";
      item.style.transition = "background 0.2s";
      item.textContent = `${c.id} - ${c.title} (${c.channel})`;
      menu.appendChild(item);

      if (c.id === currentCreativeAssetId && valSpan) {
        valSpan.textContent = `${c.id} - ${c.title} (${c.channel})`;
      }
    });

    setupCustomDropdown("creative-asset-trigger", "creative-asset-menu", "creative-asset-val", (val) => {
      currentCreativeAssetId = val;
      updateVideoDropOffAnalytics();
    });

    updateVideoDropOffAnalytics();
  }

  function updateVideoDropOffAnalytics() {
    const ctx = document.getElementById("dropOffChart");
    if (!ctx) return;

    const creative = db.creativeAssets.find(c => c.id === currentCreativeAssetId);
    if (!creative) return;

    // 1. KPIs
    document.getElementById("c-kpi-watchtime").textContent = `${creative.avgWatchTime.toFixed(1)}s`;
    document.getElementById("c-kpi-duration").textContent = `${creative.avgViewDurationPct}%`;
    document.getElementById("c-kpi-completion").textContent = `${creative.videoCompletionRate}%`;
    document.getElementById("c-kpi-drop3s10s").textContent = `${creative.drop3s}% / ${creative.drop10s}%`;
    document.getElementById("c-kpi-sessions").textContent = `${creative.sessions.toLocaleString()}`;
    document.getElementById("c-kpi-revperviewer").textContent = `$${(creative.revenue / creative.viewers).toFixed(2)}`;
    document.getElementById("c-kpi-cost").textContent = `$${creative.productionCost.toLocaleString()}`;
    document.getElementById("c-kpi-hours").textContent = `${creative.designerHours} giờ`;
    document.getElementById("c-kpi-roi").textContent = `${creative.roi.toFixed(2)}x`;
    document.getElementById("c-kpi-fatigue").textContent = `${creative.fatigue}%`;

    // 2. Verdict
    const diagnosticPanel = document.getElementById("root-cause-engine-panel");
    const diagnosticVerdict = document.getElementById("root-cause-engine-verdict");
    
    if (creative.diagnosticType === "None") {
      diagnosticPanel.style.background = "rgba(21, 128, 61, 0.05)";
      diagnosticPanel.style.borderLeftColor = "var(--green)";
      diagnosticVerdict.innerHTML = `<strong>Tuyến nội dung tối ưu:</strong> ${creative.diagnosticVerdict}`;
    } else {
      diagnosticPanel.style.background = "rgba(220, 38, 38, 0.05)";
      diagnosticPanel.style.borderLeftColor = "var(--coral)";
      diagnosticVerdict.innerHTML = `<strong>Chẩn đoán lỗi: [${creative.diagnosticType}]</strong><br>${creative.diagnosticVerdict}`;
    }

    // 3. Render Chart
    if (dropOffChartRef) dropOffChartRef.destroy();
    
    dropOffChartRef = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["0s", "3s", "5s", "10s", "25%", "50%", "75%", "100%"],
        datasets: [{
          label: `Tỷ lệ giữ chân (%)`,
          data: [100, 100 - creative.drop3s, 100 - creative.drop5s, 100 - creative.drop10s, creative.watch25, creative.watch50, creative.watch75, creative.completion100],
          borderColor: "#6454e3",
          backgroundColor: "rgba(102, 85, 230, 0.06)",
          fill: true,
          tension: 0.35,
          borderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const labelsArr = ["0s", "3s", "5s", "10s", "25%", "50%", "75%", "100%"];
            const dataArr = [100, 100 - creative.drop3s, 100 - creative.drop5s, 100 - creative.drop10s, creative.watch25, creative.watch50, creative.watch75, creative.completion100];
            const label = labelsArr[idx];
            const val = dataArr[idx];
            showToast(`Tỷ lệ xem tại mốc ${label}: ${val}%`, "success");
          }
        },
        scales: {
          y: { min: 0, max: 100, grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } },
          x: { grid: { color: gdGridColor() }, ticks: { color: gdTickColor() } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    // 4. Update visual preview card
    const prevId = document.getElementById("creative-preview-id");
    const prevTitle = document.getElementById("creative-preview-title");
    const prevTheme = document.getElementById("creative-preview-theme");
    const prevChannel = document.getElementById("creative-preview-channel");
    const prevDuration = document.getElementById("creative-preview-duration");

    if (prevId) prevId.textContent = `ID: ${creative.id}`;
    if (prevTitle) prevTitle.textContent = creative.title;
    if (prevTheme) prevTheme.textContent = creative.theme;
    if (prevChannel) {
      prevChannel.textContent = creative.channel;
      // Change color based on channel
      if (creative.channel === "Meta Ads") {
        prevChannel.style.background = "#1877F2";
      } else if (creative.channel === "TikTok Ads") {
        prevChannel.style.background = "#000000";
      } else if (creative.channel === "YouTube Ads") {
        prevChannel.style.background = "#FF0000";
      } else {
        prevChannel.style.background = "var(--purple)";
      }
    }
    
    if (prevDuration) {
      let durSec = Math.round(creative.avgWatchTime * 1.3 / 5) * 5;
      if (durSec < 15) durSec = 15;
      if (durSec > 180) durSec = 180;
      const durMin = Math.floor(durSec / 60);
      const durRemSec = durSec % 60;
      prevDuration.textContent = `${durMin}:${String(durRemSec).padStart(2, "0")}`;
    }

    // Update Production Cost & True ROI elements
    const adSpend = creative.roi > 0 ? (creative.revenue / creative.roi) : 0;
    const totalSpend = adSpend + (creative.productionCost || 0);
    const trueRoi = totalSpend > 0 ? (creative.revenue / totalSpend) : 0;

    const hoursEl = document.getElementById("creative-preview-hours");
    const costEl = document.getElementById("creative-preview-cost");
    const trueRoiEl = document.getElementById("creative-preview-trueroi");

    if (hoursEl) hoursEl.textContent = `${creative.designerHours || 0} giờ`;
    if (costEl) costEl.textContent = `$${(creative.productionCost || 0).toLocaleString()}`;
    if (trueRoiEl) trueRoiEl.textContent = `${trueRoi.toFixed(2)}x (vs ${creative.roi.toFixed(2)}x)`;

    addAuditLogEntry(currentPersona, `Xem phân tích giữ chân video: "${creative.title}"`, `Video completion rate: ${creative.videoCompletionRate}%`);
  }



  // -------------------------------------------------------------
  // Ad Creative Fatigue & CVR Decay Curve Chart
  // -------------------------------------------------------------
  let creativeFatigueChartRef = null;

  function renderCreativeFatigueAnalysis() {
    const tbody = document.getElementById("creative-fatigue-tbody");
    if (tbody) {
      tbody.innerHTML = "";
      db.creativeFatigueData.forEach(row => {
        const tr = document.createElement("tr");
        let statusBadge = "optimize";
        if (row.status.includes("Warning") || row.status.includes("Cảnh báo")) {
          statusBadge = "test";
        } else if (row.status.includes("Fatigued") || row.status.includes("Bão hòa") || row.status.includes("Critical") || row.status.includes("Quá tải")) {
          statusBadge = "stop";
        }
        tr.innerHTML = `
          <td><strong>${row.frequency.toFixed(1)}x</strong></td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: var(--purple);">${row.ctr.toFixed(2)}%</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: var(--teal);">${row.cvr.toFixed(1)}%</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: var(--coral);">$${row.cpa.toFixed(2)}</td>
          <td><span class="badge ${statusBadge}" style="font-size: 11px;">${row.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    const ctx = document.getElementById("creativeFatigueChart");
    if (!ctx) return;

    if (creativeFatigueChartRef) creativeFatigueChartRef.destroy();

    const labels = db.creativeFatigueData.map(d => `${d.frequency.toFixed(1)}x`);
    const ctrData = db.creativeFatigueData.map(d => d.ctr);
    const cvrData = db.creativeFatigueData.map(d => d.cvr);
    const cpaData = db.creativeFatigueData.map(d => d.cpa);

    creativeFatigueChartRef = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "CTR (%)",
            data: ctrData,
            borderColor: "#6454e3",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: "y-percentage"
          },
          {
            label: "CVR (%)",
            data: cvrData,
            borderColor: "#0e9c8a",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: "y-percentage"
          },
          {
            label: "CPA ($)",
            data: cpaData,
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.03)",
            borderWidth: 1.5,
            tension: 0.3,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            yAxisID: "y-currency"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        onClick: (event, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = labels[idx];
            const ctrVal = ctrData[idx];
            const cvrVal = cvrData[idx];
            const cpaVal = cpaData[idx];
            showToast(`Tần suất ${label}: CTR ${ctrVal.toFixed(2)}%, CVR ${cvrVal.toFixed(1)}%, CPA $${cpaVal.toFixed(2)}`, "success");
          }
        },
        scales: {
          "y-percentage": {
            type: "linear",
            position: "left",
            title: { display: true, text: "CTR / CVR (%)", color: gdTickColor(), font: { size: 11 } },
            ticks: { color: gdTickColor(), font: { size: 11 } },
            grid: { color: gdGridColor() },
            min: 0,
            max: 30
          },
          "y-currency": {
            type: "linear",
            position: "right",
            title: { display: true, text: "CPA ($)", color: "#dc2626", font: { size: 11 } },
            ticks: { color: gdTickColor(), font: { size: 11 } },
            grid: { display: false },
            min: 0,
            max: 40
          },
          x: {
            grid: { color: gdGridColor() },
            ticks: { color: gdTickColor(), font: { size: 11 } }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { boxWidth: 12, color: gdTickColor(), font: { size: 11 } }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Industry Benchmarking calculations & deltas
  // -------------------------------------------------------------
  function renderIndustryBenchmarks() {
    const tbody = document.getElementById("benchmark-tbody");
    if (!tbody) return;

    const stats = db.getAggregatedCampaigns();
    const customers = getFilteredCustomers();

    // 1. Revenue Growth MoM
    const dailyRev = db.getDailyRevenue(execTimeframeDays);
    const secondHalf = dailyRev.slice(15).reduce((sum, r) => sum + r.Revenue, 0);
    const firstHalf = dailyRev.slice(0, 15).reduce((sum, r) => sum + r.Revenue, 0);
    const growthMoM = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 12.0;

    // 2. LTV / CAC Ratio
    const ltvCac = stats.LTV / stats.CAC;

    // 3. Average CAC (KYC)
    const avgCac = stats.CAC;

    // 4. Install to KYC conversion rate
    const installToKyc = (stats.KYC / stats.Install) * 100;

    // 5. D90 retention rate
    const d90Cohorts = db.cohortMatrix.filter(c => c.d90 !== null);
    const d90Rate = d90Cohorts.length > 0 ? d90Cohorts[d90Cohorts.length - 1].d90 : 11.0;

    // 6. Whale Revenue concentration
    const totalLtv = customers.reduce((sum, c) => sum + c.LTV, 0);
    const whaleLtv = customers.filter(c => c.Whale_Flag === "Yes").reduce((sum, c) => sum + c.LTV, 0);
    const whaleConcentration = totalLtv > 0 ? (whaleLtv / totalLtv) * 100 : 41.4;

    // Benchmark targets + descriptions now sourced from db.industryBenchmarks (was hardcoded inline);
    // actuals stay computed from live data. Aligned 1:1 by order.
    const ib = db.industryBenchmarks || [];
    const names = ["Doanh thu tăng trưởng MoM", "Tỷ số LTV / CAC", "Average CAC (KYC)", "Tỷ lệ chuyển đổi Install sang KYC", "Duy trì khách hàng D90 Retention", "Độ tập trung doanh thu Whale"];
    const actuals = [growthMoM, ltvCac, avgCac, installToKyc, d90Rate, whaleConcentration];
    const benchmarks = names.map((nm, i) => ({
      name: nm,
      actual: actuals[i],
      bench: ib[i] ? ib[i].IndustryBench : 0,
      unit: ib[i] ? ib[i].Unit : "",
      higherIsBetter: ib[i] ? ib[i].HigherIsBetter : true,
      desc: ib[i] ? ib[i].Description : ""
    }));

    tbody.innerHTML = "";
    benchmarks.forEach(item => {
      let delta = 0;
      if (item.higherIsBetter) {
        delta = ((item.actual - item.bench) / item.bench) * 100;
      } else {
        delta = ((item.bench - item.actual) / item.bench) * 100;
      }

      const deltaText = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
      const isBetter = delta >= 0;

      let status = "Đạt chuẩn";
      let statusClass = "optimize";
      if (delta >= 10) {
        status = "Xuất sắc";
        statusClass = "scale";
      } else if (delta < 0 && delta >= -15) {
        status = "Cần theo dõi";
        statusClass = "test";
      } else if (delta < -15) {
        status = "Rủi ro cao";
        statusClass = "stop";
      }

      const actualDisplay = item.unit === "$" ? `$${item.actual.toFixed(2)}` : `${item.actual.toFixed(1)}${item.unit}`;
      const benchDisplay = item.unit === "$" ? `$${item.bench.toFixed(2)}` : `${item.bench.toFixed(1)}${item.unit}`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="font-weight:700;">${item.name}</div>
          <div style="font-size: 11px; color:var(--text3);">${item.desc}</div>
        </td>
        <td><strong>${actualDisplay}</strong></td>
        <td><span style="color:var(--text3);">${benchDisplay}</span></td>
        <td>
          <span style="font-weight:800; color:${isBetter ? 'var(--green)' : 'var(--coral)'}; font-family: monospace;">
            ${deltaText}
          </span>
        </td>
        <td><span class="badge ${statusClass}">${status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderCompetitorAnalysis() {
    const tbody = document.getElementById("competitor-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    db.competitorAnalysis.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${c.Competitor}</strong>
          <div style="margin-top: 4px;">Thị phần: <span class="badge scale" style="background:rgba(100,84,227,0.1); color:var(--purple);">${c.MarketShare}</span></div>
        </td>
        <td style="font-size:12px; color:var(--text2); line-height:1.4;">
          <div><strong style="color:var(--teal);">Thế mạnh:</strong> ${c.Advantage}</div>
          <div style="margin-top:2px;"><strong style="color:var(--coral);">Điểm yếu:</strong> ${c.Weakness}</div>
        </td>
        <td style="font-size:11.5px; line-height:1.4;">
          <div style="color:var(--text3);">Ads: <em>${c.AdsStrategy}</em></div>
          <div style="margin-top:4px; font-weight:700; color:var(--purple);">Phản kích: ${c.DefenseAction}</div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Tab 7: Team Operations (Team Operating System)
  // -------------------------------------------------------------
  let currentOpsDept = "Marketing";
  let activeOpsSubtab = "subtab-dept";

  function renderTeamOpsTab() {
    initTeamOpsSubtabs();
    renderTeamOpsSubpanes();
  }

  function initTeamOpsSubtabs() {
    const subtabsContainer = document.getElementById("team-ops-subtabs");
    if (!subtabsContainer) return;

    subtabsContainer.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const targetSubtab = btn.getAttribute("data-subtab");
        activeOpsSubtab = targetSubtab;
        renderTeamOpsSubpanes();
      };
    });
  }

  function renderTeamOpsSubpanes() {
    const container = document.getElementById("team-ops-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeOpsSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".team-ops-subpane").forEach(pane => {
      pane.style.display = pane.id === activeOpsSubtab ? "block" : "none";
    });
    
    // Custom sub-tab load trigger
    if (activeOpsSubtab === "subtab-dept") renderDeptDashboard();
    else if (activeOpsSubtab === "subtab-tasks") renderTeamTasks();
    else if (activeOpsSubtab === "subtab-design-ops") renderDesignOps();
    else if (activeOpsSubtab === "subtab-collaboration") renderCollaboration();
    else if (activeOpsSubtab === "subtab-effectiveness") renderEffectiveness();
    else if (activeOpsSubtab === "subtab-incidents") renderTeamResolutionMetrics();
  }

  function renderDeptDashboard() {
    const dept = currentOpsDept;

    const titleEl = document.getElementById("dept-metrics-title");
    const gridEl = document.getElementById("dept-metrics-grid");
    if (!titleEl || !gridEl) return;

    if (dept === "ALL") {
      titleEl.textContent = `All Departments Operational Metrics`;
      gridEl.innerHTML = "";
      gridEl.style.display = "flex";
      gridEl.style.flexDirection = "column";
      gridEl.style.gap = "20px";

      const depts = ["Marketing", "Content", "Design", "Product", "Data", "CustomerSuccess"];
      depts.forEach(d => {
        const m = db.departmentMetrics[d];
        if (!m) return;

        const deptSection = document.createElement("div");
        deptSection.style.borderBottom = "1px solid var(--border-color)";
        deptSection.style.paddingBottom = "14px";
        deptSection.style.marginBottom = "6px";
        
        let deptName = d;
        if (d === "CustomerSuccess") deptName = "Customer Success";

        deptSection.innerHTML = `
          <h5 style="font-size: 11px; font-weight: 800; color: var(--purple); margin-bottom: 10px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="layers" style="width: 12px; height: 12px;"></i> ${deptName} Operational Metrics
          </h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="dept-grid-${d}"></div>
        `;
        gridEl.appendChild(deptSection);

        const subGrid = deptSection.querySelector(`#dept-grid-${d}`);
        let cards = [];
        if (d === "Marketing") {
          cards = [
            { label: "Active campaigns", val: m.campaigns, desc: "Chiến dịch đồng thời" },
            { label: "Ads Spend", val: `$${m.spend.toLocaleString()}`, desc: "MoM Spend" },
            { label: "Generated Revenue", val: `$${m.revenue.toLocaleString()}`, desc: "ROI: " + m.roi + "x" },
            { label: "Đăng ký KYC mới", val: m.kyc, desc: "CAC: $" + m.cac },
            { label: "Tỉ lệ hoàn thành SLA", val: m.sla + "%", desc: "Mục tiêu: > 90%" }
          ];
        } else if (d === "Content") {
          cards = [
            { label: "Creatives sản xuất", val: m.count, desc: "Tháng hiện tại" },
            { label: "Thử nghiệm Hook", val: m.hookTests, desc: "Đã thực thi" },
            { label: "Creative Score", val: m.creativeScore + "/10", desc: "Đánh giá chất lượng" },
            { label: "Doanh thu Content", val: `$${m.revenue.toLocaleString()}`, desc: "Ước tính từ phễu" },
            { label: "Backlog", val: m.backlog, desc: "ETA: " + m.eta }
          ];
        } else if (d === "Design") {
          cards = [
            { label: "Active Tasks", val: m.activeTasks, desc: "Đang thực hiện" },
            { label: "Completed Designs", val: m.completedTasks, desc: "Tháng hiện tại" },
            { label: "SLA Speed", val: m.speed, desc: "Đúng hạn" },
            { label: "Design CSAT", val: m.satisfaction + "/5", desc: "Đánh giá nội bộ" },
            { label: "SLA Rate", val: m.sla + "%", desc: "Mục tiêu: > 95%" }
          ];
        } else if (d === "Product") {
          cards = [
            { label: "Features Release", val: m.releases, desc: "Sprint này" },
            { label: "Bugs Count", val: m.bugs, desc: "High/Medium priority" },
            { label: "Avg Release Time", val: m.timeToRelease, desc: "Mục tiêu: < 10 ngày" },
            { label: "Churn Impact", val: m.churnImpact, desc: "Mức giảm dự báo" },
            { label: "NPS Score", val: m.nps, desc: "Mục tiêu: > 50" }
          ];
        } else if (d === "Data") {
          cards = [
            { label: "Data Freshness", val: m.freshness, desc: "Thời gian đồng bộ" },
            { label: "ETL success", val: m.etlSuccess + "%", desc: "Mục tiêu: 99.9%" },
            { label: "Dashboard Uptime", val: m.uptime + "%", desc: "SLA uptime" },
            { label: "Accuracy", val: m.accuracy + "%", desc: "Độ lệch sai số" },
            { label: "Data Incidents", val: m.incidents, desc: "Đã khắc phục" }
          ];
        } else if (d === "CustomerSuccess") {
          cards = [
            { label: "Tickets nhận", val: m.tickets, desc: "Tháng hiện tại" },
            { label: "ART", val: m.resolutionTime, desc: "Mục tiêu: < 3 giờ" },
            { label: "CSAT Score", val: m.csat + "%", desc: "Mục tiêu: > 90%" },
            { label: "Churn Save Rate", val: m.churnSave + "%", desc: "Cứu vãn rời bỏ" },
            { label: "Upsell Revenue", val: `$${m.upsell.toLocaleString()}`, desc: "Tài khoản VIP" }
          ];
        }

        cards.forEach(card => {
          const cardDiv = document.createElement("div");
          cardDiv.style.background = "rgba(255,255,255,0.4)";
          cardDiv.style.border = "1px solid var(--border-color)";
          cardDiv.style.padding = "8px 12px";
          cardDiv.style.borderRadius = "6px";
          cardDiv.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase;">${card.label}</div>
            <strong style="font-size: 14px; color: var(--text-main); display: block; margin-top: 2px;">${card.val}</strong>
            <div style="font-size: 11px; color: var(--text2); margin-top: 1px;">${card.desc}</div>
          `;
          subGrid.appendChild(cardDiv);
        });
      });
      lucide.createIcons();
      renderDeptInputForm();
      return;
    }

    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = "1fr 1fr";
    gridEl.style.flexDirection = "unset";
    gridEl.style.gap = "14px";

    titleEl.textContent = `${dept} Operational Metrics`;
    gridEl.innerHTML = "";

    const m = db.departmentMetrics[dept];
    if (!m) return;

    // Build specific layouts based on department
    let cards = [];
    if (dept === "Marketing") {
      cards = [
        { label: "Chiến dịch đang chạy (Active campaigns)", val: m.campaigns, desc: "Chiến dịch chạy đồng thời" },
        { label: "Tổng chi tiêu (Ads Spend)", val: `$${m.spend.toLocaleString()}`, desc: "MoM Spend" },
        { label: "Doanh thu (Generated Revenue)", val: `$${m.revenue.toLocaleString()}`, desc: "ROI: " + m.roi + "x" },
        { label: "Đăng ký KYC mới", val: m.kyc, desc: "CAC: $" + m.cac },
        { label: "Tỉ lệ hoàn thành SLA", val: m.sla + "%", desc: "Mục tiêu: > 90%" }
      ];
    } else if (dept === "Content") {
      cards = [
        { label: "Nội dung đã sản xuất (Creatives)", val: m.count, desc: "Tháng hiện tại" },
        { label: "Thử nghiệm Hook", val: m.hookTests, desc: "Đã thực thi" },
        { label: "Điểm Sáng Tạo (Creative Score)", val: m.creativeScore + "/10", desc: "Đánh giá chất lượng" },
        { label: "Doanh thu từ Content", val: `$${m.revenue.toLocaleString()}`, desc: "Ước tính từ phễu" },
        { label: "Đầu việc chờ (Backlog)", val: m.backlog, desc: "ETA: " + m.eta }
      ];
    } else if (dept === "Design") {
      cards = [
        { label: "Yêu cầu thiết kế (Active Tasks)", val: m.activeTasks, desc: "Đang thực hiện" },
        { label: "Đã hoàn thành (Completed)", val: m.completedTasks, desc: "Tháng hiện tại" },
        { label: "Tốc độ bàn giao (SLA Speed)", val: m.speed, desc: "Đúng hạn" },
        { label: "Độ hài lòng (Design CSAT)", val: m.satisfaction + "/5", desc: "Đánh giá nội bộ" },
        { label: "Tỷ lệ hoàn thành SLA", val: m.sla + "%", desc: "Mục tiêu: > 95%" }
      ];
    } else if (dept === "Product") {
      cards = [
        { label: "Bản phát hành (Features Release)", val: m.releases, desc: "Sprint này" },
        { label: "Lỗi ghi nhận (Bugs Count)", val: m.bugs, desc: "High/Medium priority" },
        { label: "Thời gian phát hành (Avg Release Time)", val: m.timeToRelease, desc: "Mục tiêu: < 10 ngày" },
        { label: "Ảnh hưởng Churn (Churn Impact)", val: m.churnImpact, desc: "Mức giảm dự báo" },
        { label: "Điểm khảo sát NPS", val: m.nps, desc: "Mục tiêu: > 50" }
      ];
    } else if (dept === "Data") {
      cards = [
        { label: "Độ trễ Dữ liệu (Data Freshness)", val: m.freshness, desc: "Thời gian đồng bộ" },
        { label: "Thành công ETL pipeline", val: m.etlSuccess + "%", desc: "Mục tiêu: 99.9%" },
        { label: "Độ khả dụng Dashboard (Uptime)", val: m.uptime + "%", desc: "SLA uptime" },
        { label: "Độ chính xác báo cáo (Accuracy)", val: m.accuracy + "%", desc: "Độ lệch sai số" },
        { label: "Sự cố dữ liệu (Incident)", val: m.incidents, desc: "Đã khắc phục" }
      ];
    } else if (dept === "CustomerSuccess") {
      cards = [
        { label: "Lượng Ticket nhận", val: m.tickets, desc: "Tháng hiện tại" },
        { label: "Thời gian xử lý TB (ART)", val: m.resolutionTime, desc: "Mục tiêu: < 3 giờ" },
        { label: "Chỉ số CSAT", val: m.csat + "%", desc: "Mục tiêu: > 90%" },
        { label: "Giữ chân khách hàng (Churn Save)", val: m.churnSave + "%", desc: "Cứu vãn rời bỏ" },
        { label: "Doanh thu bán chéo (Upsell)", val: `$${m.upsell.toLocaleString()}`, desc: "Tài khoản VIP" }
      ];
    }

    cards.forEach(card => {
      const cardDiv = document.createElement("div");
      cardDiv.style.background = "rgba(255,255,255,0.4)";
      cardDiv.style.border = "1px solid var(--border-color)";
      cardDiv.style.padding = "10px 14px";
      cardDiv.style.borderRadius = "6px";
      cardDiv.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase;">${card.label}</div>
        <strong style="font-size: 16px; color: var(--text-main); display: block; margin-top: 4px;">${card.val}</strong>
        <div style="font-size: 11px; color: var(--text2); margin-top: 2px;">${card.desc}</div>
      `;
      gridEl.appendChild(cardDiv);
    });

    renderDeptInputForm();
  }

  function handleDeptSubmit(dept) {
    // Perform updates based on dept
    if (dept === "Marketing") {
      const camp = document.getElementById("ops-mkt-camp").value;
      const budget = parseInt(document.getElementById("ops-mkt-budget").value);
      
      db.departmentMetrics.Marketing.spend = budget;
      addAuditLogEntry(currentPersona, `Cập nhật ngân sách chiến dịch Marketing: ${camp}`, `Ngân sách mới: $${budget.toLocaleString()}`);
    } else if (dept === "Content") {
      const title = document.getElementById("ops-cnt-title").value;
      const channel = document.getElementById("ops-cnt-channel").value;
      
      db.departmentMetrics.Content.count += 1;
      db.departmentMetrics.Content.backlog += 1;
      
      // Add to sprint tasks!
      const newTask = {
        id: `TSK-0${db.teamTasks.length + 1}`,
        department: "Content",
        taskName: `Sản xuất: ${title} (${channel})`,
        assignee: "Creative Specialist",
        owner: "Creative Lead",
        priority: "Medium",
        status: "Todo",
        progress: 0,
        impact: 6,
        eta: new Date(Date.now() + 5*24*3600*1000).toISOString().slice(0,10),
        dueDate: new Date(Date.now() + 6*24*3600*1000).toISOString().slice(0,10),
        dependency: "None",
        responsible: "Creative Team",
        accountable: "Creative Lead",
        consulted: "Marketing Team",
        informed: "None"
      };
      db.teamTasks.push(newTask);
      addAuditLogEntry(currentPersona, `Đăng ký video creative nội dung mới: "${title}"`, `Tạo task ${newTask.id} thành công`);
    } else if (dept === "Design") {
      const asset = document.getElementById("ops-ds-asset").value;
      const sat = parseFloat(document.getElementById("ops-ds-sat").value);
      
      db.departmentMetrics.Design.activeTasks += 1;
      db.departmentMetrics.Design.satisfaction = sat;
      
      // Add to sprint tasks!
      const newTask = {
        id: `TSK-0${db.teamTasks.length + 1}`,
        department: "Design",
        taskName: `Thiết kế: ${asset}`,
        assignee: "UI/UX Designer",
        owner: "Creative Lead",
        priority: "Medium",
        status: "Todo",
        progress: 0,
        impact: 7,
        blockerDuration: "12 giờ",
        eta: new Date(Date.now() + 4*24*3600*1000).toISOString().slice(0,10),
        dueDate: new Date(Date.now() + 5*24*3600*1000).toISOString().slice(0,10),
        dependency: "None",
        responsible: "UI/UX Designer",
        accountable: "Creative Lead",
        consulted: "Marketing Team",
        informed: "None"
      };
      db.teamTasks.push(newTask);
      addAuditLogEntry(currentPersona, `Tiếp nhận yêu cầu thiết kế UI asset mới: "${asset}"`, `Tạo task ${newTask.id} thành công`);
    } else if (dept === "Product") {
      const feature = document.getElementById("ops-prd-feature").value;
      const status = document.getElementById("ops-prd-status").value;
      
      db.departmentMetrics.Product.releases += 1;
      
      // Add to sprint tasks!
      const newTask = {
        id: `TSK-0${db.teamTasks.length + 1}`,
        department: "Product",
        taskName: feature,
        assignee: "Android Dev Lead",
        owner: "Product Manager",
        priority: "High",
        status: status,
        progress: status === "Done" ? 100 : status === "In Progress" ? 50 : 20,
        impact: 8,
        eta: new Date(Date.now() + 4*24*3600*1000).toISOString().slice(0,10),
        dueDate: new Date(Date.now() + 5*24*3600*1000).toISOString().slice(0,10),
        dependency: "None",
        responsible: "Dev Team",
        accountable: "Product Manager",
        consulted: "None",
        informed: "CEO"
      };
      db.teamTasks.push(newTask);
      addAuditLogEntry(currentPersona, `Gửi cập nhật tính năng mới: "${feature}"`, `Trạng thái: ${status}`);
    } else if (dept === "Data") {
      const report = document.getElementById("ops-dat-report").value;
      const accuracy = parseFloat(document.getElementById("ops-dat-accuracy").value);
      
      db.departmentMetrics.Data.accuracy = accuracy;
      addAuditLogEntry(currentPersona, `Xác thực chất lượng dữ liệu báo cáo: ${report}`, `Độ chính xác: ${accuracy}%`);
    } else if (dept === "CustomerSuccess") {
      const incident = document.getElementById("ops-cs-incident").value;
      const csat = parseInt(document.getElementById("ops-cs-csat").value);
      
      db.departmentMetrics.CustomerSuccess.tickets += 1;
      db.departmentMetrics.CustomerSuccess.csat = csat;
      
      addAuditLogEntry(currentPersona, `CS ghi nhận xử lý sự cố hỗ trợ: "${incident}"`, `Điểm CSAT cập nhật: ${csat}%`);
    }

    showToast("Dữ liệu vận hành bộ phận đã được cập nhật thành công!", "success");
    renderDeptDashboard();
    renderTeamTasks();
    renderTeamProgress();
  }

  function renderDeptInputForm() {
    const dept = currentOpsDept;
    const container = document.getElementById("dept-input-form-container");
    if (!container) return;

    if (dept === "ALL") {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Chọn bộ phận cập nhật dữ liệu:</label>
            <select class="custom-select" id="all-input-dept-selector" style="font-size:11.5px; padding: 4px 8px; width: 100%; height: auto; margin-bottom:8px;">
              <option value="Marketing">Marketing Team</option>
              <option value="Content">Content Team</option>
              <option value="Design">Design Team</option>
              <option value="Product">Product Team</option>
              <option value="Data">Data Analyst Team</option>
              <option value="CustomerSuccess">Customer Success (CS)</option>
            </select>
          </div>
          <div id="all-input-fields-container"></div>
        </div>
      `;

      const subSelector = document.getElementById("all-input-dept-selector");
      const fieldsContainer = document.getElementById("all-input-fields-container");

      const renderSubForm = (subDept) => {
        let subHtml = "";
        if (subDept === "Marketing") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tên chiến dịch cần cập nhật:</label>
                <input type="text" class="input-glow" id="ops-mkt-camp" value="Meta Ads M-02" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Cập nhật ngân sách ($):</label>
                <input type="number" class="input-glow" id="ops-mkt-budget" value="18000" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Gửi cập nhật Marketing
              </button>
            </form>
          `;
        } else if (subDept === "Content") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tiêu đề Creative ý tưởng mới:</label>
                <input type="text" class="input-glow" id="ops-cnt-title" placeholder="FOMO Gold Loop..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Chọn Kênh phát hành:</label>
                <select class="custom-select" id="ops-cnt-channel" style="font-size:11.5px; padding: 4px 8px; width: 100%; height: auto;">
                  <option value="TikTok Ads">TikTok Ads</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="YouTube Ads">YouTube Ads</option>
                  <option value="Email">Email / Push</option>
                </select>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Đăng ký Video Creative mới
              </button>
            </form>
          `;
        } else if (subDept === "Design") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tên UI Asset cần thiết kế:</label>
                <input type="text" class="input-glow" id="ops-ds-asset" placeholder="Landing page banner..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Độ hài lòng đánh giá (1-5):</label>
                <input type="number" class="input-glow" id="ops-ds-sat" value="5" min="1" max="5" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Ghi nhận Yêu cầu Thiết kế
              </button>
            </form>
          `;
        } else if (subDept === "Product") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tính năng mới chuẩn bị release:</label>
                <input type="text" class="input-glow" id="ops-prd-feature" placeholder="Vá lỗi SDK ngân hàng v2.1..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Trạng thái:</label>
                <select class="custom-select" id="ops-prd-status" style="font-size:11.5px; padding: 4px 8px; width: 100%; height: auto;">
                  <option value="Blocked">Bị khóa (Blocked)</option>
                  <option value="In Progress">Đang lập trình (In Progress)</option>
                  <option value="Done">Đã kiểm thử (Done)</option>
                </select>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Gửi trạng thái Tính Năng
              </button>
            </form>
          `;
        } else if (subDept === "Data") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Báo cáo kiểm thử chất lượng:</label>
                <input type="text" class="input-glow" id="ops-dat-report" value="Whale Cohort Matrix" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Độ chính xác dữ liệu (%):</label>
                <input type="number" class="input-glow" id="ops-dat-accuracy" value="99.9" step="0.01" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Xác thực Pipeline Dữ liệu
              </button>
            </form>
          `;
        } else if (subDept === "CustomerSuccess") {
          subHtml = `
            <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Xử lý sự cố kỹ thuật:</label>
                <input type="text" class="input-glow" id="ops-cs-incident" placeholder="Xử lý ticket nạp tiền chậm..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Đánh giá hài lòng (CSAT %):</label>
                <input type="number" class="input-glow" id="ops-cs-csat" value="95" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
              </div>
              <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
                <i data-lucide="send"></i> Ghi nhận Sự cố CS
              </button>
            </form>
          `;
        }

        fieldsContainer.innerHTML = subHtml;
        lucide.createIcons();

        // Bind form submit for this dynamically rendered form
        const form = document.getElementById("frm-ops-input");
        if (form) {
          form.onsubmit = (e) => {
            e.preventDefault();
            if (!checkCustomizePermission(`nhập dữ liệu phòng ban ${subDept}`)) return;
            handleDeptSubmit(subDept);
          };
        }
      };

      subSelector.addEventListener("change", (e) => {
        renderSubForm(e.target.value);
      });

      // Render default sub-form (Marketing)
      renderSubForm("Marketing");
      return;
    }

    let html = "";
    if (dept === "Marketing") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tên chiến dịch cần cập nhật:</label>
            <input type="text" class="input-glow" id="ops-mkt-camp" value="Meta Ads M-02" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Cập nhật ngân sách ($):</label>
            <input type="number" class="input-glow" id="ops-mkt-budget" value="18000" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Gửi cập nhật Marketing
          </button>
        </form>
      `;
    } else if (dept === "Content") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tiêu đề Creative ý tưởng mới:</label>
            <input type="text" class="input-glow" id="ops-cnt-title" placeholder="FOMO Gold Loop..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Chọn Kênh phát hành:</label>
            <select class="custom-select" id="ops-cnt-channel" style="font-size:11.5px; padding: 4px 8px; width: 100%; height: auto;">
              <option value="TikTok Ads">TikTok Ads</option>
              <option value="Meta Ads">Meta Ads</option>
              <option value="YouTube Ads">YouTube Ads</option>
              <option value="Email">Email / Push</option>
            </select>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Đăng ký Video Creative mới
          </button>
        </form>
      `;
    } else if (dept === "Design") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tên UI Asset cần thiết kế:</label>
            <input type="text" class="input-glow" id="ops-ds-asset" placeholder="Landing page banner..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Độ hài lòng đánh giá (1-5):</label>
            <input type="number" class="input-glow" id="ops-ds-sat" value="5" min="1" max="5" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Ghi nhận Yêu cầu Thiết kế
          </button>
        </form>
      `;
    } else if (dept === "Product") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Tính năng mới chuẩn bị release:</label>
            <input type="text" class="input-glow" id="ops-prd-feature" placeholder="Vá lỗi SDK ngân hàng v2.1..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Trạng thái:</label>
            <select class="custom-select" id="ops-prd-status" style="font-size:11.5px; padding: 4px 8px; width: 100%; height: auto;">
              <option value="Blocked">Bị khóa (Blocked)</option>
              <option value="In Progress">Đang lập trình (In Progress)</option>
              <option value="Done">Đã kiểm thử (Done)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Gửi trạng thái Tính Năng
          </button>
        </form>
      `;
    } else if (dept === "Data") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Báo cáo kiểm thử chất lượng:</label>
            <input type="text" class="input-glow" id="ops-dat-report" value="Whale Cohort Matrix" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Độ chính xác dữ liệu (%):</label>
            <input type="number" class="input-glow" id="ops-dat-accuracy" value="99.9" step="0.01" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Xác thực Pipeline Dữ liệu
          </button>
        </form>
      `;
    } else if (dept === "CustomerSuccess") {
      html = `
        <form id="frm-ops-input" style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Xử lý sự cố kỹ thuật:</label>
            <input type="text" class="input-glow" id="ops-cs-incident" placeholder="Xử lý ticket nạp tiền chậm..." style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: var(--text2); display: block; margin-bottom: 4px;">Đánh giá hài lòng (CSAT %):</label>
            <input type="number" class="input-glow" id="ops-cs-csat" value="95" style="font-size:11.5px; padding: 6px 8px; width: 100%;" required>
          </div>
          <button type="submit" class="btn btn-cyan" style="width: 100%; justify-content: center; font-size:11px; padding: 8px 12px; margin-top: 4px;">
            <i data-lucide="send"></i> Ghi nhận Sự cố CS
          </button>
        </form>
      `;
    }

    container.innerHTML = html;
    lucide.createIcons();

    // Attach form submit handler
    const form = document.getElementById("frm-ops-input");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!checkCustomizePermission(`nhập dữ liệu phòng ban ${dept}`)) return;
        handleDeptSubmit(dept);
      };
    }
  }

  function renderTeamTasks() {
    const tbody = document.getElementById("team-tasks-tbody");
    if (!tbody) return;

    const filterDept = currentTaskFilterDept || "ALL";
    tbody.innerHTML = "";

    const filteredTasks = filterDept === "ALL" 
      ? db.teamTasks 
      : db.teamTasks.filter(t => {
          const dept1 = t.department.replace(/\s+/g, "").toUpperCase();
          const dept2 = filterDept.replace(/\s+/g, "").toUpperCase();
          return dept1 === dept2;
        });

    filteredTasks.forEach(t => {
      let statusClass = "test"; // Warning/orange
      if (t.status === "Done") statusClass = "optimize"; // Green
      else if (t.status === "Blocked") statusClass = "stop"; // Red
      else if (t.status === "Todo" || t.status === "Backlog") statusClass = "scale"; // Purple
      else if (t.status === "In Progress") statusClass = "scale"; // Purple/blue

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span style="font-family: monospace; font-weight:700;">${t.id}</span></td>
        <td><strong>${t.taskName}</strong></td>
        <td><span class="badge scale" style="font-size: 11px;">${t.department}</span></td>
        <td>${t.assignee}</td>
        <td><span style="font-weight:700; color:${t.priority === 'High' ? 'var(--coral)' : t.priority === 'Medium' ? 'var(--amber)' : 'var(--text3)'}">${t.priority}</span></td>
        <td>
          <span class="badge ${statusClass}" style="cursor:pointer;" onclick="window.changeOpsTaskStatus('${t.id}')">
            ${t.status} <i data-lucide="chevron-down" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-left:2px;"></i>
          </span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="bar-bg" style="width:40px; height:6px; background:rgba(0,0,0,0.06); border-radius:3px; overflow:hidden;">
              <div class="bar-fill" style="width:${t.progress}%; height:100%; background:${t.status === 'Done' ? 'var(--green)':'var(--purple)'};"></div>
            </div>
            <span style="font-size: 11px; font-weight:700;">${t.progress}%</span>
          </div>
        </td>
        <td style="font-size: 11px; font-weight:600;">${t.responsible}</td>
        <td style="font-size: 11px; font-weight:600; color:var(--purple);">${t.accountable}</td>
        <td style="font-size: 11px; font-weight:600;">${t.consulted}</td>
        <td style="font-size: 11px; font-weight:600;">${t.informed}</td>
        <td>
          <div style="display:flex; justify-content:center; gap:4px;">
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px;" onclick="window.editOpsTask('${t.id}')" title="Sửa công việc">
              <i data-lucide="edit-3" style="width:10px; height:10px;"></i>
            </button>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px; color:var(--coral);" onclick="window.deleteOpsTask('${t.id}')" title="Xóa công việc">
              <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    renderRaciWorkload();
    lucide.createIcons();
  }

  function renderRaciWorkload() {
    const tbody = document.getElementById("raci-workload-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const memberMapping = {
      "Tran (CMO)": { role: "CMO", dept: "Marketing", keywords: ["CMO", "Marketing Lead", "Marketing Team"] },
      "Creative Specialist": { role: "Creative Lead", dept: "Content", keywords: ["Creative Specialist", "Creative Lead", "Creative Team"] },
      "Android Dev Lead": { role: "Mobile Lead", dept: "Product", keywords: ["Android Dev Lead", "Dev Team", "Product Team"] },
      "Data Engineer": { role: "Data Analyst / Eng", dept: "Data", keywords: ["Data Engineer", "Data Team", "Data Analyst"] },
      "CS Lead": { role: "CS Head", dept: "CS Team", keywords: ["CS Lead", "CS Head", "CS Team"] },
      "Growth Marketer": { role: "Growth Marketer", dept: "Marketing", keywords: ["Growth Marketer", "Marketing Team"] },
      "Product Manager": { role: "Product Manager", dept: "Product", keywords: ["Product Manager", "Product Team"] },
      "CS Specialist": { role: "CS Specialist", dept: "CS Team", keywords: ["CS Specialist", "CS Team"] },
      "Copywriter Lead": { role: "Copywriter Lead", dept: "Content", keywords: ["Copywriter Lead", "Creative Team"] }
    };

    Object.keys(memberMapping).forEach(name => {
      const info = memberMapping[name];
      let rCount = 0;
      let aCount = 0;
      let cCount = 0;
      let iCount = 0;
      let totalTasks = 0;

      db.teamTasks.forEach(t => {
        let participated = false;

        // Check R
        if (t.assignee === name || info.keywords.includes(t.responsible)) {
          rCount++;
          participated = true;
        }
        // Check A
        if (info.keywords.includes(t.accountable)) {
          aCount++;
          participated = true;
        }
        // Check C
        if (info.keywords.includes(t.consulted)) {
          cCount++;
          participated = true;
        }
        // Check I
        if (info.keywords.includes(t.informed)) {
          iCount++;
          participated = true;
        }

        if (participated) {
          totalTasks++;
        }
      });

      // Load warning threshold logic: Accountable > 3 or Responsible > 5
      let loadWarning = `<span class="badge optimize" style="font-weight:700;">Bình thường (Normal)</span>`;
      if (aCount > 3 || rCount > 5) {
        loadWarning = `<span class="badge stop" style="font-weight:700;">⚠️ QUÁ TẢI (OVERLOADED)</span>`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${name}</strong><br><span style="font-size: 11px; color:var(--text3);">${info.role}</span></td>
        <td><span class="badge scale" style="font-size: 11px;">${info.dept}</span></td>
        <td style="text-align: center; font-weight: 700;">${rCount}</td>
        <td style="text-align: center; font-weight: 700; color: var(--purple);">${aCount}</td>
        <td style="text-align: center; font-weight: 600; color: var(--text3);">${cCount}</td>
        <td style="text-align: center; font-weight: 600; color: var(--text3);">${iCount}</td>
        <td style="text-align: center; font-weight: 800; color: var(--teal);">${totalTasks}</td>
        <td>${loadWarning}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.changeOpsTaskStatus = (taskId) => {
    if (!checkCustomizePermission("chỉnh sửa trạng thái công việc")) return;

    const t = db.teamTasks.find(x => x.id === taskId);
    if (!t) return;

    const validStatuses = ["Backlog", "Todo", "In Progress", "Review", "Blocked", "Done"];
    showCustomPrompt(
      "Thay đổi trạng thái công việc",
      `Nhập trạng thái mới cho công việc ${taskId} (Todo, In Progress, Review, Blocked, Done):`,
      t.status,
      (newStatus) => {
        if (!newStatus) return;

        const formattedStatus = newStatus.trim();
        if (!validStatuses.includes(formattedStatus)) {
          showToast("Trạng thái không hợp lệ! Vui lòng chọn một trong các giá trị: " + validStatuses.join(", "), "warning");
          return;
        }

        t.status = formattedStatus;
        if (formattedStatus === "Done") t.progress = 100;
        else if (formattedStatus === "Todo") t.progress = 10;
        else if (formattedStatus === "In Progress") t.progress = 50;

        addAuditLogEntry(currentPersona, `Thay đổi trạng thái công việc ${taskId} sang "${formattedStatus}"`, `Người thực hiện: ${currentPersona}`);
        renderTeamTasks();
        renderTeamProgress();
      }
    );
  };

  window.editOpsTask = (taskId) => {
    if (!checkCustomizePermission("chỉnh sửa công việc")) return;
    const t = db.teamTasks.find(x => x.id === taskId);
    if (!t) return;

    showCustomPrompt("Chỉnh sửa Tên Công Việc", "Nhập tên công việc mới:", t.taskName, (newName) => {
      if (newName === null) return;
      if (newName.trim() === "") {
        showToast("Tên công việc không được để trống!", "warning");
        return;
      }
      showCustomPrompt("Chỉnh sửa Assignee", "Nhập người thực hiện (Assignee):", t.assignee, (newAssignee) => {
        if (newAssignee === null) return;
        showCustomPrompt("Chỉnh sửa Tiến độ", "Nhập tiến độ mới (0-100):", t.progress.toString(), (newProgressStr) => {
          if (newProgressStr === null) return;
          const newProgress = parseInt(newProgressStr);
          if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
            showToast("Tiến độ phải là số từ 0 đến 100!", "warning");
            return;
          }

          t.taskName = newName.trim();
          t.assignee = newAssignee.trim();
          t.progress = newProgress;
          
          if (newProgress === 100) t.status = "Done";
          else if (newProgress === 0) t.status = "Todo";
          else if (t.status === "Done") t.status = "In Progress";

          addAuditLogEntry(currentPersona, `Chỉnh sửa công việc ${taskId}`, `Tên mới: "${t.taskName}", Tiến độ: ${t.progress}%`);
          showToast(`Đã chỉnh sửa công việc ${taskId} thành công!`, "success");
          renderTeamTasks();
          renderTeamProgress();
          refreshActiveDashboardViews();
        });
      });
    });
  };

  window.deleteOpsTask = (taskId) => {
    if (!checkCustomizePermission("xóa công việc")) return;
    const tIdx = db.teamTasks.findIndex(x => x.id === taskId);
    if (tIdx === -1) return;

    const confirmed = (typeof confirm === "function") ? confirm(`Bạn có chắc chắn muốn xóa công việc ${taskId} không?`) : true;
    if (confirmed) {
      const taskName = db.teamTasks[tIdx].taskName;
      db.teamTasks.splice(tIdx, 1);
      addAuditLogEntry(currentPersona, `Xóa công việc ${taskId}`, `Công việc bị xóa: "${taskName}"`);
      showToast(`Đã xóa công việc ${taskId} thành công!`, "success");
      renderTeamTasks();
      renderTeamProgress();
      refreshActiveDashboardViews();
    }
  };

  function renderDesignOps() {
    const kpisGrid = document.getElementById("design-kpis-grid");
    if (kpisGrid) {
      kpisGrid.innerHTML = "";
      const kpis = [
        { label: "Tổng yêu cầu thiết kế", val: db.designKpis.totalRequests, desc: "Tích lũy quý này" },
        { label: "Đã hoàn thành", val: db.designKpis.completed, desc: "On-Time: " + db.designKpis.onTimeRate + "%" },
        { label: "Đang xử lý (WIP)", val: db.designKpis.inProgress, desc: "Quá hạn: " + db.designKpis.overdue },
        { label: "Thời gian hoàn thành", val: db.designKpis.avgCompletionTime, desc: "Average Cycle Time" },
        { label: "Thời gian review", val: db.designKpis.avgReviewTime, desc: "Stakeholder & Internal" },
        { label: "Số vòng chỉnh sửa TB", val: db.designKpis.avgRevisionRounds + " vòng", desc: "Thời gian sửa: " + db.designKpis.avgRevisionTime }
      ];
      kpis.forEach(k => {
        const div = document.createElement("div");
        div.style.background = "rgba(255, 255, 255, 0.4)";
        div.style.border = "1px solid var(--border-color)";
        div.style.padding = "8px 12px";
        div.style.borderRadius = "6px";
        div.innerHTML = `
          <div style="font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase;">${k.label}</div>
          <strong style="font-size: 15px; color: var(--text-main); display: block; margin-top: 3px;">${k.val}</strong>
          <div style="font-size: 11px; color: var(--text2); margin-top: 1px;">${k.desc}</div>
        `;
        kpisGrid.appendChild(div);
      });
    }

    const workloadTbody = document.getElementById("designer-workload-tbody");
    if (workloadTbody) {
      workloadTbody.innerHTML = "";
      db.designerWorkloads.forEach(w => {
        const tr = document.createElement("tr");
        
        let warnings = [];
        if (w.utilization > 90) warnings.push("Quá tải (>90%)");
        if (w.overdueTasks >= 2) warnings.push("Nhiều trễ hạn");
        if (w.utilization > 80 && w.activeTasks >= 3) warnings.push("Quá tải kéo dài");

        let alertHtml = `<span class="badge optimize" style="font-size: 11px;">Bình thường</span>`;
        if (warnings.length > 0) {
          alertHtml = `<span class="badge stop" style="font-size: 11px; animation: pulse 1.5s infinite; box-shadow: 0 0 6px var(--coral); line-height: 1.2; text-align: center; display: inline-block; padding: 2px 4px;">${warnings.join("<br>")}</span>`;
        }

        tr.innerHTML = `
          <td><strong>${w.name}</strong></td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${w.assignedTasks}</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${w.completedTasks}</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${w.activeTasks}</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color:${w.utilization > 90 ? 'var(--coral)' : 'var(--text-main)'};">${w.utilization}%</td>
          <td style="text-align: right; font-family: monospace;">${w.avgWorkHours}h/tuần</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace; color:${w.overdueTasks > 0 ? 'var(--coral)' : 'var(--green)'};">${w.overdueTasks}</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color:var(--purple);">${w.qualityScore}/10</td>
          <td>${alertHtml}</td>
        `;
        workloadTbody.appendChild(tr);
      });
    }

    const pipelineTbody = document.getElementById("design-pipeline-tbody");
    if (pipelineTbody) {
      pipelineTbody.innerHTML = "";
      db.designTasks.forEach(d => {
        let statusClass = "scale"; // Purple
        if (d.status === "Approved" || d.status === "Delivered") statusClass = "optimize"; // Green
        else if (d.status === "Revision" || d.status === "Internal Review" || d.status === "Stakeholder Review") statusClass = "test"; // Yellow
        else if (d.status === "Archived") statusClass = "scale";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><span style="font-family: monospace; font-weight:700;">${d.id}</span></td>
          <td><strong>${d.project}</strong></td>
          <td><span class="badge scale" style="font-size: 11px; font-weight: 700;">${d.type}</span></td>
          <td><span style="font-size: 11px; font-weight:600; color:var(--text2);">${d.reqDept}</span></td>
          <td>${d.requester}</td>
          <td>${d.assignee}</td>
          <td>${d.reviewer}</td>
          <td><span style="font-weight:700; color:${d.priority === 'Critical' ? 'var(--coral)' : d.priority === 'High' ? 'var(--amber)' : 'var(--text3)'}">${d.priority}</span></td>
          <td><span style="font-family: monospace; font-size: 11px; color:var(--text3);">${d.deadline}</span></td>
          <td><span style="font-family: monospace; font-size: 11px; color:var(--purple);">${d.eta}</span></td>
          <td style="font-family: monospace; font-weight: 600;">${d.version}</td>
          <td>
            <span class="badge ${statusClass}" style="cursor:pointer;" onclick="window.changeDesignTaskStatus('${d.id}')">
              ${d.status} <i data-lucide="chevron-down" style="width:9px; height:9px; display:inline-block; vertical-align:middle; margin-left:1px;"></i>
            </span>
          </td>
        `;
        pipelineTbody.appendChild(tr);
      });
    }
    lucide.createIcons();
  }

  window.changeDesignTaskStatus = (taskId) => {
    if (!checkCustomizePermission("chỉnh sửa trạng thái thiết kế")) return;

    const t = db.designTasks.find(x => x.id === taskId);
    if (!t) return;

    const validStatuses = ["Request Received", "Planning", "In Design", "Internal Review", "Stakeholder Review", "Revision", "Approved", "Delivered", "Archived"];
    showCustomPrompt(
      "Thay đổi trạng thái thiết kế",
      `Nhập trạng thái mới cho thiết kế ${taskId} (${validStatuses.join(", ")}):`,
      t.status,
      (newStatus) => {
        if (!newStatus) return;

        const formattedStatus = newStatus.trim();
        if (!validStatuses.includes(formattedStatus)) {
          showToast("Trạng thái không hợp lệ! Vui lòng nhập đúng giá trị.", "warning");
          return;
        }

        t.status = formattedStatus;
        addAuditLogEntry(currentPersona, `Thay đổi trạng thái thiết kế ${taskId} sang "${formattedStatus}"`, `Người thực hiện: ${currentPersona}`);
        renderDesignOps();
      }
    );
  };

  function renderCollaboration() {
    const collabGrid = document.getElementById("collab-depts-grid");
    if (collabGrid) {
      collabGrid.innerHTML = "";
      db.crossFunctionalCollab.forEach(c => {
        const div = document.createElement("div");
        div.style.background = "rgba(255, 255, 255, 0.4)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "8px";
        div.style.padding = "10px 12px";
        div.style.fontSize = "11.5px";
        div.style.lineHeight = "1.5";

        let overloadClass = "optimize";
        let overloadText = "An toàn";
        if (c.utilization > 90) {
          overloadClass = "stop";
          overloadText = "Quá tải";
        } else if (c.utilization > 80) {
          overloadClass = "test";
          overloadText = "Cận quá tải";
        }

        div.innerHTML = `
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 6px; display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--purple); font-size:12px;">${c.department}</strong>
            <span class="badge ${overloadClass}" style="font-size: 11px; font-weight:700;">${overloadText}</span>
          </div>
          <div style="display:flex; justify-content:space-between;"><span>Active Tasks:</span><strong>${c.activeTasks}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Đúng hạn (SLA):</span><strong style="color:var(--teal);">${c.onTimeRate}%</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Bị Blocked:</span><strong style="color:${c.blockedTasks > 0 ? 'var(--coral)' : 'var(--green)'};">${c.blockedTasks}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>Resource Util:</span><strong style="color:${c.utilization > 85 ? 'var(--amber)' : 'var(--text-main)'};">${c.utilization}%</strong></div>
          <div style="display:flex; justify-content:space-between; margin-top:2px; font-size: 11px; color:var(--text3); border-top:1px dashed rgba(0,0,0,0.06); padding-top:2px;">
            <span>Chờ hỗ trợ: <strong>${c.supportRequired} task</strong></span>
          </div>
        `;
        collabGrid.appendChild(div);
      });
    }

    const bottlenecksList = document.getElementById("bottlenecks-list");
    if (bottlenecksList) {
      bottlenecksList.innerHTML = "";
      db.bottlenecks.forEach(b => {
        const div = document.createElement("div");
        div.style.background = "rgba(255, 255, 255, 0.4)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "8px";
        div.style.padding = "10px 14px";
        div.style.fontSize = "11.5px";
        div.style.lineHeight = "1.5";
        div.style.borderLeft = `3.5px solid ${b.priority === 'Critical' ? 'var(--coral)' : b.priority === 'High' ? 'var(--amber)' : 'var(--purple)'}`;

        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:12.5px; color:var(--text-main);">⚠️ ${b.cause}</strong>
            <span class="badge ${b.priority === 'Critical' ? 'stop' : b.priority === 'High' ? 'test' : 'scale'}" style="font-size: 11px; font-weight:700;">${b.priority}</span>
          </div>
          <div style="color:var(--text2); margin-bottom:4px;">
            <strong>Bộ phận:</strong> <code>${b.departments}</code> | 
            <strong>Tác động:</strong> <span style="color:var(--coral); font-weight:600;">${b.impact}</span>
          </div>
          <div style="background:rgba(100, 84, 227, 0.04); padding:6px; border-radius:4px; font-weight:700; color:var(--purple);">
            ➔ Đề xuất: ${b.action}
          </div>
        `;
        bottlenecksList.appendChild(div);
      });
    }

    const resourceTbody = document.getElementById("resource-capacity-tbody");
    if (resourceTbody) {
      resourceTbody.innerHTML = "";
      db.resourceCapacity.departments.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${r.name}</strong></td>
          <td style="text-align: right; font-family: monospace;">${r.headcount}</td>
          <td style="text-align: right; font-family: monospace;">${r.capacity}h/tuần</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color:${r.utilization > 90 ? 'var(--coral)' : 'var(--text-main)'};">${r.utilization}%</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color:var(--purple);">${r.forecast}h/tuần</td>
        `;
        resourceTbody.appendChild(tr);
      });
    }

    const recruitmentList = document.getElementById("recruitment-list");
    if (recruitmentList) {
      recruitmentList.innerHTML = "";
      db.resourceCapacity.individualForecasts.forEach(f => {
        const div = document.createElement("div");
        div.style.background = "rgba(255, 255, 255, 0.4)";
        div.style.border = "1px solid var(--border-color)";
        div.style.borderRadius = "6px";
        div.style.padding = "6px 10px";
        div.style.fontSize = "11px";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        div.innerHTML = `
          <div>
            <strong>${f.role}</strong>
            <span style="font-size: 11px; color:var(--text3); display:block;">Bộ phận: ${f.dept} | Tiến độ: ${f.timeline}</span>
          </div>
          <div style="text-align:right;">
            <span class="badge ${f.urgency === 'Critical' ? 'stop' : f.urgency === 'High' ? 'test' : 'scale'}" style="font-size: 11px; font-weight:700; display:inline-block; margin-bottom:2px;">${f.urgency}</span>
            <span style="font-size: 11px; font-weight:700; color:var(--text2); display:block;">${f.status}</span>
          </div>
        `;
        recruitmentList.appendChild(div);
      });
    }
  }

  function renderEffectiveness() {
    const dept = currentEffectivenessDept;
    const titleEl = document.getElementById("effectiveness-dept-title");
    if (titleEl) titleEl.textContent = `${dept} Effectiveness Matrix`;

    const kpis = db.teamEffectivenessKpis[dept];
    if (!kpis) return;

    const dScore = kpis.delivery.onTimeRate;
    const pScore = Math.min((kpis.productivity.completedPerWeek / 10) * 100, 100);
    const qScore = 100 - kpis.quality.reworkRate;
    const cScore = kpis.collaboration.crossTeamRate;
    const iScore = kpis.innovation.successRate;

    const rawScore = (0.25 * dScore) + (0.20 * pScore) + (0.20 * qScore) + (0.20 * cScore) + (0.15 * iScore);
    const finalScore = Math.round(rawScore);

    updateTeamHealthScore(finalScore, true);

    const delContainer = document.getElementById("eff-delivery-container");
    if (delContainer) {
      delContainer.innerHTML = `
        <div class="eff-kpi-row"><span>Tỷ lệ hoàn thành:</span><strong>${kpis.delivery.completionRate}%</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ đúng hạn:</span><strong>${kpis.delivery.onTimeRate}%</strong></div>
        <div class="eff-kpi-row"><span>Tuân thủ SLA:</span><strong>${kpis.delivery.slaRate}%</strong></div>
        <div class="eff-kpi-row"><span>Cycle Time:</span><strong>${kpis.delivery.cycleTime}</strong></div>
        <div class="eff-kpi-row"><span>Lead Time:</span><strong>${kpis.delivery.leadTime}</strong></div>
        <div class="eff-kpi-row"><span>Active WIP:</span><strong>${kpis.delivery.wip} tasks</strong></div>
        <div class="eff-kpi-row"><span>Trễ hạn:</span><strong style="color:${kpis.delivery.overdueRate > 10 ? 'var(--coral)' : 'var(--green)'};">${kpis.delivery.overdueRate}%</strong></div>
      `;
    }

    const prodContainer = document.getElementById("eff-productivity-container");
    if (prodContainer) {
      prodContainer.innerHTML = `
        <div class="eff-kpi-row"><span>Output/Emp:</span><strong>${kpis.productivity.outputPerEmp}</strong></div>
        <div class="eff-kpi-row"><span>Revenue/Emp:</span><strong>${kpis.productivity.revenuePerEmp}</strong></div>
        <div class="eff-kpi-row"><span>Tasks/Week:</span><strong>${kpis.productivity.completedPerWeek}</strong></div>
        <div class="eff-kpi-row"><span>Throughput:</span><strong>${kpis.productivity.throughput}x</strong></div>
        <div class="eff-kpi-row"><span>Focus Time:</span><strong>${kpis.productivity.focusTime}</strong></div>
        <div class="eff-kpi-row"><span>Deep Work Hours:</span><strong>${kpis.productivity.focusTime ? '24h/tuần':'16h/tuần'}</strong></div>
      `;
    }

    const qualContainer = document.getElementById("eff-quality-container");
    if (qualContainer) {
      qualContainer.innerHTML = `
        <div class="eff-kpi-row"><span>Tỷ lệ Rework:</span><strong style="color:${kpis.quality.reworkRate > 10 ? 'var(--coral)' : 'var(--green)'};">${kpis.quality.reworkRate}%</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ Defect:</span><strong>${kpis.quality.defectRate}%</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ Error:</span><strong>${kpis.quality.errorRate}%</strong></div>
        <div class="eff-kpi-row"><span>Review Pass Rate:</span><strong>${kpis.quality.reviewPassRate}%</strong></div>
        <div class="eff-kpi-row"><span>Satisfaction Score:</span><strong>${kpis.quality.stakeholderSatisfaction}/10</strong></div>
      `;
    }

    const collabContainer = document.getElementById("eff-collaboration-container");
    if (collabContainer) {
      collabContainer.innerHTML = `
        <div class="eff-kpi-row"><span>Phối hợp liên phòng ban:</span><strong>${kpis.collaboration.crossTeamRate}%</strong></div>
        <div class="eff-kpi-row"><span>Thời gian phản hồi TB:</span><strong>${kpis.collaboration.avgResponseTime}</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ Leo thang:</span><strong>${kpis.collaboration.escalationRate}%</strong></div>
        <div class="eff-kpi-row"><span>Trễ hạn do phụ thuộc:</span><strong>${kpis.collaboration.dependencyDelayRate}%</strong></div>
        <div class="eff-kpi-row"><span>Communication Score:</span><strong>${kpis.collaboration.communicationScore}/10</strong></div>
      `;
    }

    const innovContainer = document.getElementById("eff-innovation-container");
    if (innovContainer) {
      innovContainer.innerHTML = `
        <div class="eff-kpi-row"><span>Số lượng thử nghiệm:</span><strong>${kpis.innovation.experiments}</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ test thành công:</span><strong>${kpis.innovation.successRate}%</strong></div>
        <div class="eff-kpi-row"><span>Ý tưởng Kaizen:</span><strong>${kpis.innovation.ideas}</strong></div>
        <div class="eff-kpi-row"><span>Tỷ lệ tự động hóa:</span><strong>${kpis.innovation.automationRate}%</strong></div>
        <div class="eff-kpi-row"><span>Thời gian tiết kiệm:</span><strong>${kpis.innovation.timeSaved}</strong></div>
      `;
    }
    renderOkrTree();
  }

  function updateTeamHealthScore(score, animate = true) {
    const card = document.getElementById("team-vh-card");
    if (!card) return;
    
    const arc = document.getElementById("team-arc");
    const track = document.getElementById("team-arc-track");
    const needle = document.getElementById("team-needle");
    if (!arc || !track || !needle) return;

    // Redraw track
    const A0 = -132, SWEEP = 264, R = 46;
    function polar(cx,cy,r,deg){var a=deg*Math.PI/180; return [cx+r*Math.sin(a), cy-r*Math.cos(a)];}
    function arcPath(cx,cy,r,a0,a1){var q0=polar(cx,cy,r,a0),q1=polar(cx,cy,r,a1),lg=(a1-a0)>180?1:0; return 'M '+q0[0].toFixed(2)+' '+q0[1].toFixed(2)+' A '+r+' '+r+' 0 '+lg+' 1 '+q1[0].toFixed(2)+' '+q1[1].toFixed(2);}
    
    const dPath = arcPath(80, 80, R, A0, A0 + SWEEP);
    track.setAttribute("d", dPath);
    arc.setAttribute("d", dPath);
    
    const L = typeof arc.getTotalLength === "function" ? arc.getTotalLength() : 280;
    arc.style.strokeDasharray = L;

    // Determine badge details
    let badgeText = "";
    let badgeColor = "";
    if (score >= 90) {
      badgeText = "EXCELLENT";
      badgeColor = "var(--green)";
    } else if (score >= 75) {
      badgeText = "GOOD";
      badgeColor = "var(--teal)";
    } else if (score >= 60) {
      badgeText = "NEEDS IMPROVEMENT";
      badgeColor = "var(--amber)";
    } else {
      badgeText = "HIGH RISK";
      badgeColor = "var(--coral)";
    }

    // Set score and label text
    const scoreEl = document.getElementById("team-score");
    if (scoreEl) scoreEl.textContent = score;

    const labelEl = document.getElementById("team-label");
    if (labelEl) {
      labelEl.textContent = badgeText;
      labelEl.style.color = badgeColor;
    }

    const frac = score / 100;
    const ang = A0 + SWEEP * frac;

    function apply() {
      arc.style.strokeDashoffset = L * (1 - frac);
      needle.style.transform = "rotate(" + ang + "deg)";
    }

    if (animate) {
      arc.style.strokeDashoffset = L;
      needle.style.transform = "rotate(" + A0 + "deg)";
      void card.getBoundingClientRect(); // force reflow
      setTimeout(apply, 60);
    } else {
      apply();
    }
  }

  // Roll up OKR progress: individual (leaf) -> team (avg of children) -> company (avg of teams)
  function computeOkrRollup() {
    const ind = db.okrCenter.individual || [], team = db.okrCenter.team || [], company = db.okrCenter.company || [];
    const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const rolled = {};
    team.forEach(t => { const kids = ind.filter(i => i.parentId === t.id).map(i => i.progress); const r = avg(kids); rolled[t.id] = r != null ? { progress: r, rolled: true } : { progress: t.progress, rolled: false }; });
    company.forEach(c => { const kids = team.filter(t => t.parentId === c.id).map(t => (rolled[t.id] || {}).progress).filter(x => x != null); const r = avg(kids); rolled[c.id] = r != null ? { progress: r, rolled: true } : { progress: c.progress, rolled: false }; });
    return rolled;
  }

  function renderOkrTree() {
    const container = document.getElementById("okr-target-tree-container");
    if (!container) return;
    container.innerHTML = "";
    
    const dept = currentEffectivenessDept || "Marketing";
    const rollup = computeOkrRollup();

    db.okrCenter.company.forEach(com => {
      const matchingTeams = db.okrCenter.team.filter(t => t.parentId === com.id && t.department === dept);
      if (matchingTeams.length === 0) return;

      const comProg = (rollup[com.id] && rollup[com.id].progress != null) ? rollup[com.id].progress : com.progress;
      const comRolled = !!(rollup[com.id] && rollup[com.id].rolled);
      const comDiv = document.createElement("div");
      comDiv.style.background = "rgba(100, 84, 227, 0.06)";
      comDiv.style.border = "1px solid var(--purple-soft)";
      comDiv.style.borderRadius = "8px";
      comDiv.style.padding = "14px";
      comDiv.style.marginBottom = "8px";

      comDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span class="badge scale" style="font-size: 11px; padding:1px 6px;">COMPANY TARGET</span>
            <strong style="color:var(--purple); font-size:12.5px; display:block; margin-top:2px;">[${com.id}] ${com.objective}</strong>
            <span style="font-size: 11px; color:var(--text2); display:block; margin-top:2px;">Key Result: ${com.keyResult}</span>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:16px; color:var(--purple); font-weight:800;">${comProg}%</strong>
            ${comRolled ? '<span style="font-size:11px; color:var(--teal); font-weight:700; display:block;">↑ tổng hợp tự động</span>' : ''}
            <span style="font-size: 11px; color:var(--text3); display:block;">Owner: ${com.owner}</span>
          </div>
        </div>
        <div class="bar-bg" style="height:6px; border-radius:3px; overflow:hidden; background:rgba(0,0,0,0.06); margin-bottom:12px;">
          <div class="bar-fill" style="width:${comProg}%; height:100%; background:var(--purple);"></div>
        </div>
        <div class="team-okrs-list" style="margin-left: 20px; border-left: 2px dashed rgba(100, 84, 227, 0.2); padding-left: 14px; display: flex; flex-direction: column; gap: 10px;">
          <!-- Team OKRs render -->
        </div>
      `;

      const teamListContainer = comDiv.querySelector(".team-okrs-list");

      matchingTeams.forEach(tem => {
        const temProg = (rollup[tem.id] && rollup[tem.id].progress != null) ? rollup[tem.id].progress : tem.progress;
        const temRolled = !!(rollup[tem.id] && rollup[tem.id].rolled);
        const temDiv = document.createElement("div");
        temDiv.style.background = "rgba(14, 156, 138, 0.04)";
        temDiv.style.border = "1px solid rgba(14, 156, 138, 0.15)";
        temDiv.style.borderRadius = "6px";
        temDiv.style.padding = "10px 12px";

        temDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div>
              <span class="badge optimize" style="font-size: 11px; padding:1px 6px; color:#0d9488;">DEPARTMENT TARGET</span>
              <strong style="color:var(--teal); font-size:11.5px; display:block; margin-top:2px;">[${tem.id}] ${tem.objective}</strong>
              <span style="font-size: 11px; color:var(--text2); display:block; margin-top:2px;">Key Result: ${tem.keyResult}</span>
            </div>
            <div style="text-align:right;">
              <strong style="font-size:14px; color:var(--teal); font-weight:800;">${temProg}%</strong>
              ${temRolled ? '<span style="font-size:11px; color:var(--teal); font-weight:700; display:block;">↑ tổng hợp</span>' : ''}
              <span style="font-size: 11px; color:var(--text3); display:block;">Owner: ${tem.owner}</span>
            </div>
          </div>
          <div class="bar-bg" style="height:4px; border-radius:2px; overflow:hidden; background:rgba(0,0,0,0.06); margin-bottom:8px;">
            <div class="bar-fill" style="width:${temProg}%; height:100%; background:var(--teal);"></div>
          </div>
          <div class="indiv-okrs-list" style="margin-left: 15px; border-left: 1.5px dashed rgba(14, 156, 138, 0.2); padding-left: 10px; display: flex; flex-direction: column; gap: 6px;">
            <!-- Individual OKRs render -->
          </div>
        `;

        const indivListContainer = temDiv.querySelector(".indiv-okrs-list");

        const matchingIndivs = db.okrCenter.individual.filter(ind => ind.parentId === tem.id && ind.department === dept);
        matchingIndivs.forEach(ind => {
          const indDiv = document.createElement("div");
          indDiv.style.background = "rgba(255, 255, 255, 0.5)";
          indDiv.style.border = "1px solid var(--border-color)";
          indDiv.style.borderRadius = "4px";
          indDiv.style.padding = "8px 10px";
          indDiv.style.fontSize = "11px";

          indDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <div>
                <span class="badge test" style="font-size: 11px; padding:1px 4px; color:var(--purple);">INDIVIDUAL OKR</span>
                <span style="font-weight:700; color:var(--text-main); display:block; margin-top:2px;">[${ind.id}] ${ind.objective}</span>
                <span style="font-size: 11px; color:var(--text2); display:block; margin-top:1px;">Key Result: ${ind.keyResult}</span>
              </div>
              <div style="text-align:right;">
                <strong style="font-size:12px; color:var(--purple); font-weight:800;">${ind.progress}%</strong>
                <span style="font-size: 11px; color:var(--text3); display:block;">Assignee: ${ind.owner}</span>
              </div>
            </div>
            <div class="bar-bg" style="height:3px; border-radius:1.5px; overflow:hidden; background:rgba(0,0,0,0.06);">
              <div class="bar-fill" style="width:${ind.progress}%; height:100%; background:var(--purple);"></div>
            </div>
          `;
          indivListContainer.appendChild(indDiv);
        });

        if (matchingIndivs.length === 0) {
          indivListContainer.style.display = "none";
        }

        teamListContainer.appendChild(temDiv);
      });

      if (matchingTeams.length === 0) {
        teamListContainer.style.display = "none";
      }

      container.appendChild(comDiv);
    });
  }

  function renderTeamResolutionMetrics() {
    const r = db.resolutionMetrics;
    const badge = document.getElementById("incidents-badge-count");
    if (badge) {
      badge.textContent = `${r.openIssues} Sự cố đang mở`;
    }

    // Set KPI grid values
    document.getElementById("inc-art").textContent = r.art;
    document.getElementById("inc-mttd").textContent = r.mttd;
    document.getElementById("inc-mttr").textContent = r.mttr;
    document.getElementById("inc-sla-rate").textContent = r.slaRate + "%";
    document.getElementById("inc-blocker-duration").textContent = r.blockerDuration;
    document.getElementById("inc-total-issues").textContent = r.totalIssues;
    document.getElementById("inc-open-issues").textContent = r.openIssues;
    document.getElementById("inc-escalated-issues").textContent = r.escalatedIssues;

    // Calculate total downtime and revenue lost
    const totalDowntime = db.incidentsLog.reduce((sum, item) => sum + item.downtime, 0);
    const totalRevenueLost = db.incidentsLog.reduce((sum, item) => sum + item.revenueLost, 0);

    const dtEl = document.getElementById("inc-total-downtime");
    const revEl = document.getElementById("inc-total-revenue-lost");
    if (dtEl) dtEl.textContent = `${totalDowntime} phút`;
    if (revEl) revEl.textContent = `$${totalRevenueLost.toLocaleString()}`;

    // Render incident log table
    const tbody = document.getElementById("incidents-log-tbody");
    if (tbody) {
      tbody.innerHTML = "";
      db.incidentsLog.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${item.id}</strong></td>
          <td style="color: var(--text3); white-space: nowrap;">${item.timestamp}</td>
          <td class="td-prose"><strong class="cell-wrap" style="color:var(--text-main);" title="${item.name}">${item.name}</strong></td>
          <td><span class="badge scale" style="background: rgba(100,84,227,0.1); color:var(--purple);">${item.system}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: var(--purple);">${item.downtime} m</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: var(--coral);">$${item.revenueLost.toLocaleString()}</td>
          <td class="td-prose"><span class="cell-wrap" style="color: var(--text2);" title="${item.owner}">${item.owner}</span></td>
          <td class="td-prose"><span class="cell-wrap" style="color: var(--text2);" title="${item.resolution}">${item.resolution}</span></td>
          <td><span class="badge optimize" style="background: rgba(16,185,129,0.1); color:var(--green);">${item.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // -------------------------------------------------------------
  // Tab 2 extension: Cross-Channel Customer Journey Intelligence
  // -------------------------------------------------------------
  let activeCustJourneySubtab = "subtab-journey-map";

  function initCustomerJourneySubtabs() {
    const container = document.getElementById("cust-journey-subtabs");
    if (!container) return;
    container.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const targetSubtab = btn.getAttribute("data-subtab");
        activeCustJourneySubtab = targetSubtab;
        renderCustomerJourneySubpanes();
      };
    });

    // Bind attribution model radio buttons
    const selector = document.getElementById("cust-journey-attribution-selector");
    if (selector) {
      selector.querySelectorAll("input[name='cust-journey-attr-model']").forEach(radio => {
        radio.onchange = (e) => {
          renderAttributionEngine(e.target.value, "cust");
        };
      });
    }
  }

  function renderCustomerJourneySubpanes() {
    const container = document.getElementById("cust-journey-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeCustJourneySubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".cust-journey-subpane").forEach(pane => {
      pane.style.display = pane.id === activeCustJourneySubtab ? "block" : "none";
    });
    
    if (activeCustJourneySubtab === "subtab-journey-map") {
      renderCustomerJourneyMap();
    } else if (activeCustJourneySubtab === "subtab-transition-matrix") {
      renderTransitionMatrix();
    } else if (activeCustJourneySubtab === "subtab-funnel-migration") {
      renderFunnelMigration();
    } else if (activeCustJourneySubtab === "subtab-journey-attribution") {
      let model = "first";
      const selector = document.getElementById("cust-journey-attribution-selector");
      if (selector) {
        const checkedRadio = selector.querySelector("input[name='cust-journey-attr-model']:checked");
        if (checkedRadio) model = checkedRadio.value;
      }
      renderAttributionEngine(model, "cust");
    }
  }

  function renderCustomerJourneyMap() {
    const tbody = document.getElementById("journey-map-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.customerJourneys.forEach(row => {
      const tr = document.createElement("tr");
      const formattedPath = row.path.split(" → ").map((step, idx) => {
        let badgeColor = "var(--text3)";
        if (idx === 0) badgeColor = "var(--purple)";
        else if (step.includes("KYC")) badgeColor = "var(--teal)";
        else if (step.includes("Deposit")) badgeColor = "var(--green)";
        else if (step.includes("Trade")) badgeColor = "var(--coral)";
        return `<span style="display:inline-block; font-weight:700; font-size: 11px; padding:2px 6px; background:rgba(0,0,0,0.04); border-radius:4px; margin:2px; border-left: 2px solid ${badgeColor};">${step}</span>`;
      }).join(" → ");

      tr.innerHTML = `
        <td><div style="line-height:1.8; display:flex; flex-wrap:wrap; align-items:center;">${formattedPath}</div></td>
        <td style="text-align: right; font-weight:700; font-family:monospace;">${row.users.toLocaleString()}</td>
        <td style="text-align: right; font-weight:700; color:var(--purple); font-family:monospace;">${row.conversionRate}%</td>
        <td><span style="font-size:11px; color:var(--text3);"><i data-lucide="clock" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:2px;"></i>${row.avgTime}</span></td>
        <td style="text-align: right; font-weight:700; color:var(--green); font-family:monospace;">$${row.revenue.toLocaleString()}</td>
        <td style="text-align: right; font-weight:700; font-family:monospace;">$${row.avgLtv.toFixed(1)}</td>
        <td style="text-align: right; font-weight:800; color:var(--coral); font-family:monospace;">${row.whaleRate}%</td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  }

  function renderTransitionMatrix() {
    const tbody = document.getElementById("transition-matrix-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.transitionMatrix.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.firstChannel}</strong></td>
        <td><span class="badge scale" style="font-size: 11px;">${row.nextChannel}</span></td>
        <td style="text-align: right; font-weight:800; color:var(--purple); font-family:monospace; font-size:12px;">${row.rate}%</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderFunnelMigration() {
    const tbody = document.getElementById("funnel-migration-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.funnelMigration.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.stage}</strong></td>
        <td style="text-align: right; font-weight:700; color:var(--green); font-family:monospace;">${row.conversionRate}%</td>
        <td><span style="font-size:11px; color:var(--text3);"><i data-lucide="clock" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-right:2px;"></i>${row.avgTime}</span></td>
        <td style="text-align: right; font-weight:700; color:var(--coral); font-family:monospace;">${row.dropRate}%</td>
        <td style="text-align: right; font-weight:800; color:var(--purple); font-family:monospace;">${row.revenue > 0 ? '$' + row.revenue.toLocaleString() : '—'}</td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  }

  function renderAttributionEngine(model, type = "cust") {
    const prefix = type === "acq" ? "acq-" : "cust-journey-";
    const tbody = document.getElementById(`${prefix}attribution-tbody`);
    const titleEl = document.getElementById(`${prefix}attr-model-title`);
    const descEl = document.getElementById(`${prefix}attr-model-desc`);
    if (!tbody || !titleEl || !descEl) return;

    const modelsInfo = {
      first: { title: "First Touch Attribution (Điểm chạm đầu tiên)", desc: "Phân bổ <strong>100%</strong> giá trị chuyển đổi cho kênh quảng cáo đầu tiên tiếp xúc với khách hàng (PrimaryAwarenessChannel). Phù hợp để đánh giá các kênh tạo nhận diện & khám phá." },
      last: { title: "Last Touch Attribution (Điểm chạm cuối cùng)", desc: "Phân bổ <strong>100%</strong> giá trị cho điểm chạm cuối cùng trước khi FTD (PrimaryConversionChannel). Làm nổi bật các kênh trực tiếp chốt chuyển đổi." },
      linear: { title: "Linear Attribution (Phân bổ tuyến tính)", desc: "Chia <strong>đều 50/50</strong> giữa điểm chạm đầu và cuối trong hành trình. Cái nhìn cân bằng, không thiên vị." },
      decay: { title: "Time Decay Attribution (Khấu hao thời gian)", desc: "Điểm chạm <strong>gần thời điểm chuyển đổi</strong> nhận trọng số cao hơn (30% đầu / 70% cuối). Hợp với chu kỳ cân nhắc ngắn." },
      position: { title: "Position Based Attribution (U-Shape)", desc: "Nhấn mạnh hai đầu hành trình: <strong>40%</strong> điểm chạm đầu, <strong>60%</strong> điểm chạm cuối." },
      datadriven: { title: "Data-Driven Attribution (Theo dữ liệu hành trình)", desc: "Phân bổ theo <strong>vị trí tương tác thực tế</strong> của từng khách (InteractionsToKyc ÷ InteractionsToFtd) — đúng nghĩa data-driven." }
    };

    const currentModel = modelsInfo[model] || modelsInfo.first;
    titleEl.textContent = currentModel.title;
    descEl.innerHTML = currentModel.desc;

    // REAL computation from per-customer touchpoint data
    const credit = computeAttribution(model);
    const rows = Object.keys(credit)
      .map(ch => ({ ch, ftd: credit[ch].ftd, revenue: credit[ch].revenue }))
      .filter(r => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    tbody.innerHTML = "";
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">Không có dữ liệu chuyển đổi.</td></tr>`;
      return;
    }
    rows.forEach(r => {
      const ftdVal = Math.round(r.ftd);
      const revVal = Math.round(r.revenue);
      const avgLtv = revVal / (ftdVal || 1);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${r.ch}</strong></td>
        <td style="text-align: right; font-weight:700; font-family:monospace;">${ftdVal} FTD</td>
        <td style="text-align: right; font-weight:700; color:var(--green); font-family:monospace;">$${revVal.toLocaleString()}</td>
        <td style="text-align: right; font-weight:700; color:var(--purple); font-family:monospace;">$${avgLtv.toFixed(1)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Tab 6 extension: Tracking Infrastructure Center
  // -------------------------------------------------------------
  function initTrackingGovernanceListeners() {
    const btnVerify = document.getElementById("btn-verify-utm");
    if (btnVerify) {
      btnVerify.onclick = () => {
        const urlInput = document.getElementById("utm-validation-url").value.trim();
        const resultsBox = document.getElementById("utm-validation-results");
        if (!resultsBox) return;

        resultsBox.style.display = "block";
        resultsBox.style.padding = "10px";
        resultsBox.style.borderRadius = "6px";
        resultsBox.style.marginTop = "10px";

        if (!urlInput) {
          resultsBox.style.background = "rgba(220, 38, 38, 0.1)";
          resultsBox.style.border = "1px solid var(--coral)";
          resultsBox.style.color = "var(--coral)";
          resultsBox.innerHTML = `<strong>Lỗi:</strong> Vui lòng nhập link URL cần kiểm tra!`;
          return;
        }

        try {
          const urlObj = new URL(urlInput);
          const params = urlObj.searchParams;
          
          let errors = [];
          let passes = [];

          const source = params.get("utm_source");
          const medium = params.get("utm_medium");
          const campaign = params.get("utm_campaign");
          const content = params.get("utm_content");

          // Validate source
          if (!source) {
            errors.push(`Thiếu tham số <code>utm_source</code>.`);
          } else if (!db.utmRules.sources.includes(source)) {
            errors.push(`<code>utm_source="${source}"</code> không nằm trong danh sách chuẩn PRD (${db.utmRules.sources.join(", ")}).`);
          } else {
            passes.push(`<code>utm_source</code> hợp lệ ("${source}").`);
          }

          // Validate medium
          if (!medium) {
            errors.push(`Thiếu tham số <code>utm_medium</code>.`);
          } else if (!db.utmRules.mediums.includes(medium)) {
            errors.push(`<code>utm_medium="${medium}"</code> không hợp lệ. Chuẩn whitelist: ${db.utmRules.mediums.join(", ")}.`);
          } else {
            passes.push(`<code>utm_medium</code> hợp lệ ("${medium}").`);
          }

          // Validate campaign
          if (!campaign) {
            errors.push(`Thiếu tham số <code>utm_campaign</code>.`);
          } else {
            // Regex match for: [country_code]_[objective]_[segment]_[yyyymm]
            const campRegex = /^[a-z]{2}_[a-z]+_[a-z0-9]+_[0-9]{6}$/;
            if (!campRegex.test(campaign)) {
              errors.push(`<code>utm_campaign="${campaign}"</code> không đúng cấu trúc PRD (ví dụ: <code>vn_acquisition_beginner_202607</code>).`);
            } else {
              passes.push(`<code>utm_campaign</code> khớp chuẩn định dạng QuốcGia_MụcTiêu_NhómNộiDung_ThờiGian.`);
            }
          }

          // Validate content
          if (!content) {
            errors.push(`Thiếu tham số <code>utm_content</code> (Khuyên dùng dạng Hook_Asset).`);
          } else {
            passes.push(`<code>utm_content</code> hợp lệ ("${content}").`);
          }

          if (errors.length > 0) {
            resultsBox.style.background = "rgba(220, 38, 38, 0.08)";
            resultsBox.style.border = "1px solid var(--coral)";
            resultsBox.style.color = "var(--text-main)";
            
            resultsBox.innerHTML = `
              <strong style="color:var(--coral); font-size:12px;"><i data-lucide="x-circle" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> UTM VALIDATION FAILED (${errors.length} lỗi phát hiện)</strong>
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px;">
                ${errors.map(err => `<div style="color:var(--coral);">✗ ${err}</div>`).join("")}
                ${passes.map(pass => `<div style="color:var(--green); opacity:0.8;">✓ ${pass}</div>`).join("")}
              </div>
            `;

            // Log manually generated UTM violation
            const now = new Date();
            const timeStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 8);
            db.utmViolations.unshift({
              timestamp: timeStr,
              url: urlInput,
              issue: errors.map(e => e.replace(/<\/?[^>]+(>|$)/g, "")).join("; "),
              volume: Math.floor(5 + Math.random() * 50),
              status: "Active"
            });
            renderUtmHygieneDashboard();
          } else {
            resultsBox.style.background = "rgba(14, 156, 138, 0.08)";
            resultsBox.style.border = "1px solid var(--green)";
            resultsBox.style.color = "var(--text-main)";
            resultsBox.innerHTML = `
              <strong style="color:var(--green); font-size:12px;"><i data-lucide="check-circle" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> UTM VALIDATION PASSED (Link hợp chuẩn 100%)</strong>
              <div style="margin-top:6px; display:flex; flex-direction:column; gap:4px; color:var(--green);">
                ${passes.map(pass => `<div>✓ ${pass}</div>`).join("")}
              </div>
            `;
          }
          lucide.createIcons();
        } catch (e) {
          resultsBox.style.background = "rgba(220, 38, 38, 0.1)";
          resultsBox.style.border = "1px solid var(--coral)";
          resultsBox.style.color = "var(--coral)";
          resultsBox.innerHTML = `<strong>Lỗi:</strong> URL không đúng định dạng chuẩn! Vui lòng nhập link đầy đủ bao gồm giao thức (ví dụ: https://...)`;
          
          // Log manual invalid format violation
          const now = new Date();
          const timeStr = now.toISOString().slice(0, 10) + " " + now.toTimeString().slice(0, 8);
          db.utmViolations.unshift({
            timestamp: timeStr,
            url: urlInput,
            issue: "URL không đúng định dạng chuẩn",
            volume: 1,
            status: "Active"
          });
          renderUtmHygieneDashboard();
        }
      };
    }

    // Bind checkboxes for readiness calculation
    document.querySelectorAll(".chk-tracking").forEach(chk => {
      chk.onchange = () => {
        updateTrackingReadinessScore();
      };
    });
  }

  function updateTrackingReadinessScore() {
    let score = 0;
    document.querySelectorAll(".chk-tracking").forEach(chk => {
      if (chk.checked) {
        score += parseInt(chk.getAttribute("data-weight") || 0);
      }
    });

    const scoreEl = document.getElementById("tracking-readiness-score");
    const barEl = document.getElementById("tracking-readiness-bar");
    if (scoreEl && barEl) {
      scoreEl.textContent = `${score}%`;
      barEl.style.width = `${score}%`;
    }
  }

  function renderEventDictionary() {
    const tbody = document.getElementById("event-dictionary-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.eventTrackingDictionary.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code style="font-size: 11px; font-weight:800; color:var(--purple);">${row.event}</code></td>
        <td>${row.description}</td>
        <td><span style="font-size:11px; color:var(--text2); font-style:italic;">${row.trigger}</span></td>
        <td><span class="badge scale" style="font-size: 11px;">${row.owner}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderUtmHygieneDashboard() {
    const tbody = document.getElementById("utm-violations-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const totalTraffic = 18500;
    const anomalyVolume = db.utmViolations.reduce((sum, v) => sum + (v.volume || 0), 0);
    const cleanTraffic = totalTraffic - anomalyVolume;
    const cleanRate = ((cleanTraffic / totalTraffic) * 100).toFixed(1);
    const anomalyRate = ((anomalyVolume / totalTraffic) * 100).toFixed(1);

    const rateEl = document.getElementById("utm-anomaly-rate");
    const volEl = document.getElementById("utm-anomaly-volume");
    const badgeEl = document.getElementById("utm-hygiene-badge");

    if (rateEl) rateEl.textContent = `${anomalyRate}%`;
    if (volEl) volEl.textContent = anomalyVolume.toLocaleString();
    if (badgeEl) {
      badgeEl.textContent = `${cleanRate}% Clean`;
      badgeEl.className = cleanRate >= 95 ? "badge optimize" : (cleanRate >= 85 ? "badge scale" : "badge stop");
    }

    db.utmViolations.forEach(row => {
      let statusClass = row.status === "Resolved" ? "badge optimize" : "badge stop";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 11px; color: var(--text3);">${row.timestamp}</td>
        <td><div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 11px;" title="${row.url}">${row.url}</div></td>
        <td><span style="color:var(--coral); font-weight:600;">${row.issue}</span></td>
        <td style="text-align: right; font-weight: 700;">${row.volume.toLocaleString()}</td>
        <td><span class="${statusClass}" style="font-size: 10.5px; padding: 2px 6px; font-weight: 700;">${row.status.toUpperCase()}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // Tab 5 extension: Content Operations Center
  // -------------------------------------------------------------
  let activeContentSubtab = "subtab-ops-kpi";

  function initContentOpsSubtabs() {
    const container = document.getElementById("content-ops-subtabs");
    if (!container) return;
    container.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        const targetSubtab = btn.getAttribute("data-subtab");
        activeContentSubtab = targetSubtab;
        renderContentOpsSubpanes();
      };
    });

    // Action buttons for Content reviews and hypotheses
    const addMockReviewBtn = document.getElementById("content-btn-add-mock-review");
    if (addMockReviewBtn) {
      const mockReviews = [
        { creative: "Edu Webinar Promo (Facebook Ads)", whatWorked: "Hình ảnh giáo sư uy tín, tóm tắt nội dung học rõ ràng", whatDidNotWork: "Landing page tải chậm khiến tỷ lệ thoát tăng 12%", bestHook: "3 bài học vỡ lòng từ huyền thoại đầu tư", bestCta: "Đăng ký giữ chỗ miễn phí", insight: "Quảng cáo giáo dục cần đi kèm tài liệu PDF tặng kèm để tăng CVR", hypothesis: "Nếu tặng Ebook PDF miễn phí ngay tại trang đăng ký, CVR sẽ tăng 25%" },
        { creative: "Whale Testimonial Video (YouTube)", whatWorked: "Lời kể thật tâm từ khách hàng VIP có số vốn nạp trên $50K", whatDidNotWork: "Độ dài video 5 phút hơi dài, người xem giảm sút sau 2 phút đầu", bestHook: "Cách tôi quản lý tài sản $100K trên app", bestCta: "Xem câu chuyện đầy đủ của tôi", insight: "Video testimonial nên được cắt ngắn dưới 90s để chạy quảng cáo phễu giữa", hypothesis: "Cắt ngắn video còn 60s và tập trung vào 3 luận điểm chính sẽ tăng retention rate lên trên 55%" }
      ];
      addMockReviewBtn.onclick = () => {
        const rand = mockReviews[Math.floor(Math.random() * mockReviews.length)];
        const newRev = {
          id: `REV-0${db.contentReviewRepository.length + 1}`,
          date: new Date().toISOString().slice(0, 10),
          creative: rand.creative,
          whatWorked: rand.whatWorked,
          whatDidNotWork: rand.whatDidNotWork,
          bestHook: rand.bestHook,
          bestCta: rand.bestCta,
          insight: rand.insight,
          hypothesis: rand.hypothesis
        };
        db.contentReviewRepository.push(newRev);
        addAuditLogEntry(currentPersona, `Tạo review sáng tạo giả lập ${newRev.id}: "${newRev.creative}"`, `Insight: ${newRev.insight}`);
        showToast(`Đã thêm đánh giá giả lập ${newRev.id} thành công!`, "success");
        renderContentReviewRepository();
      };
    }

    const addMockExpBtn = document.getElementById("content-btn-add-mock-exp");
    if (addMockExpBtn) {
      const mockHypotheses = [
        { hypothesis: "Sử dụng người nổi tiếng (KOL tài chính) làm hook mở đầu video TikTok để tăng CTR thêm 18%", target: "Giảm CPA đăng ký KYC", priority: "High", owner: "Content Director" },
        { hypothesis: "Thêm phần so sánh trực quan phí giao dịch của ta với đối thủ cạnh tranh trên Google Search Ads", target: "Tăng CTR chiến dịch tìm kiếm cạnh tranh", priority: "Medium", owner: "Search Specialist" },
        { hypothesis: "Thiết kế lại thumbnail video YouTube theo phong cách tối giản màu tối huyền bí", target: "Tăng Click-Through-Rate YouTube thêm 10%", priority: "Low", owner: "Lead Designer" }
      ];
      addMockExpBtn.onclick = () => {
        const rand = mockHypotheses[Math.floor(Math.random() * mockHypotheses.length)];
        const iceMap = { Critical: [9, 7, 6], High: [8, 7, 7], Medium: [6, 6, 6], Low: [4, 6, 8] };
        const ice = iceMap[rand.priority] || [6, 6, 6];
        const newHyp = {
          hypothesis: rand.hypothesis,
          target: rand.target,
          impact: ice[0], confidence: ice[1], ease: ice[2],
          priority: rand.priority,
          owner: rand.owner,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0, 10),
          status: "Planned",
          result: "Chờ thực thi"
        };
        db.contentExperimentBacklog.push(newHyp);
        addAuditLogEntry(currentPersona, `Tạo giả thuyết content giả lập: "${newHyp.hypothesis}"`, `Mục tiêu cải thiện: ${newHyp.target}`);
        showToast(`Đã thêm giả thuyết content giả lập thành công!`, "success");
        renderContentExperimentBacklog();
      };
    }
  }

  function renderContentOpsSubpanes() {
    const container = document.getElementById("content-ops-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeContentSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".content-ops-subpane").forEach(pane => {
      pane.style.display = pane.id === activeContentSubtab ? "block" : "none";
    });
    
    if (activeContentSubtab === "subtab-ops-kpi") {
      renderContentKpis();
      renderMeasurementFramework();
    } else if (activeContentSubtab === "subtab-ops-reviews") {
      renderContentReviewRepository();
      renderContentExperimentBacklog();
    }
  }

    // Form submission for creative review
    const form = document.getElementById("frm-log-creative-review");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!checkCustomizePermission("ghi nhận creative review")) return;

        const name = document.getElementById("rev-creative-name").value.trim();
        const bestHook = document.getElementById("rev-best-hook").value.trim();
        const bestCta = document.getElementById("rev-best-cta").value.trim();
        const whatWorked = document.getElementById("rev-what-worked").value.trim();
        const whatDidNotWork = document.getElementById("rev-what-not-worked").value.trim();
        const insight = document.getElementById("rev-insight").value.trim();

        const newReview = {
          id: `REV-0${db.contentReviewRepository.length + 1}`,
          date: new Date().toISOString().slice(0, 10),
          creative: name,
          whatWorked: whatWorked,
          whatDidNotWork: whatDidNotWork,
          bestHook: bestHook,
          bestCta: bestCta,
          insight: insight,
          hypothesis: `Giả thuyết từ feedback: Thử nghiệm hook "${bestHook}" kết hợp CTA "${bestCta}" trên tập người dùng tương đương.`
        };

        db.contentReviewRepository.push(newReview);
        addAuditLogEntry(currentPersona, `Ghi nhận creative review: "${name}"`, `Tạo review ${newReview.id} thành công`);
        
        const newHypothesis = {
          hypothesis: `Tối ưu hóa "${name}": ${insight}`,
          target: "Cải thiện CTR & CVR từ Creative Review",
          impact: 7, confidence: 6, ease: 7,
          priority: "Medium",
          owner: "Creative Team",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0, 10),
          status: "Planned",
          result: "Chờ thực thi"
        };
        db.contentExperimentBacklog.push(newHypothesis);
        addAuditLogEntry("System Auto-Engine", `Tự động tạo giả thuyết thử nghiệm mới cho: "${name}"`, `Thêm vào Backlog thử nghiệm`);

        showToast("Creative Review đã được ghi nhận và đẩy giả thuyết thử nghiệm vào Backlog thành công!", "success");
        form.reset();
        renderContentReviewRepository();
        renderContentExperimentBacklog();
      };
    }

  function renderContentKpis() {
    const prodEl = document.getElementById("content-kpi-production");
    const perfEl = document.getElementById("content-kpi-performance");
    const busEl = document.getElementById("content-kpi-business");
    if (!prodEl || !perfEl || !busEl) return;

    const buildKpis = (data, container, colorClass) => {
      container.innerHTML = "";
      data.forEach(item => {
        const div = document.createElement("div");
        div.style.marginBottom = "6px";
        const valFormatted = typeof item.current === 'number' && item.unit === '$' ? `$${item.current.toLocaleString()}` : `${item.current.toLocaleString()} ${item.unit === '%' || item.unit === '$' ? '' : item.unit}`;
        
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:2px; font-size: 11px;">
            <span>${item.kpi}</span>
            <span style="color:var(--text3);">${valFormatted} / ${item.target.toLocaleString()}${item.unit === '%' ? '%' : ''}</span>
          </div>
          <div class="bar-bg" style="height:6px; border-radius:3px; overflow:hidden; background:rgba(0,0,0,0.06);">
            <div class="bar-fill ${colorClass}" style="width:${Math.min(item.rate, 100)}%; height:100%;"></div>
          </div>
        `;
        container.appendChild(div);
      });
    };

    buildKpis(db.contentKpis.production, prodEl, "emerald");
    buildKpis(db.contentKpis.performance, perfEl, "cyan");
    buildKpis(db.contentKpis.business, busEl, "coral");
  }

  function renderMeasurementFramework() {
    const tbody = document.getElementById("content-framework-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    db.contentMeasurementFramework.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong style="color:var(--purple);">${row.level}</strong></td>
        <td><span style="font-weight:600;">${row.metrics}</span></td>
        <td><span style="font-weight:700; color:var(--teal);">${row.target}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderContentReviewRepository() {
    const container = document.getElementById("content-reviews-list");
    if (!container) return;
    container.innerHTML = "";
    db.contentReviewRepository.forEach(row => {
      const card = document.createElement("div");
      card.style.background = "rgba(255, 255, 255, 0.4)";
      card.style.border = "1px solid var(--border-color)";
      card.style.borderRadius = "8px";
      card.style.padding = "12px 14px";
      card.style.fontSize = "11.5px";
      card.style.lineHeight = "1.55";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:6px; margin-bottom:8px;">
          <strong style="color:var(--purple); font-size:12px;">[${row.id}] ${row.creative}</strong>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size: 11px; color:var(--text3); font-weight:700; margin-right:6px;">${row.date}</span>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px;" onclick="window.editContentReview('${row.id}')" title="Sửa đánh giá">
              <i data-lucide="edit-3" style="width:10px; height:10px;"></i>
            </button>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px; color:var(--coral);" onclick="window.deleteContentReview('${row.id}')" title="Xóa đánh giá">
              <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
            </button>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:6px;">
          <div><span style="color:var(--green); font-weight:700;">✓ Hoạt động tốt (Worked):</span> ${row.whatWorked}</div>
          <div><span style="color:var(--coral); font-weight:700;">✗ Chưa tốt (Not Worked):</span> ${row.whatDidNotWork}</div>
        </div>
        <div style="margin-bottom:6px; background:rgba(0,0,0,0.02); padding:6px; border-radius:4px;">
          <div>💡 <strong>Best Hook:</strong> <code>"${row.bestHook}"</code> | <strong>Best CTA:</strong> <code>"${row.bestCta}"</code></div>
        </div>
        <div><strong>Insight & Hành động:</strong> <span style="font-style:italic; color:var(--text2);">${row.insight}</span></div>
        <div style="margin-top:4px; font-size: 11px; color:var(--purple); font-weight:700;">➔ ${row.hypothesis}</div>
      `;
      container.appendChild(card);
    });
    lucide.createIcons();
  }

  function renderContentExperimentBacklog() {
    const tbody = document.getElementById("content-experiment-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    // ICE computed = (I+C+E)/3, sorted by priority; original index preserved for edit/delete CRUD
    const ranked = db.contentExperimentBacklog
      .map((row, idx) => ({ row, idx, ice: ((row.impact || 0) + (row.confidence || 0) + (row.ease || 0)) / 3 }))
      .sort((a, b) => b.ice - a.ice);
    ranked.forEach(({ row, idx, ice }, rank) => {
      let badgeColor = "optimize";
      if (row.status === "Planned") badgeColor = "scale";
      else if (row.status === "In Progress") badgeColor = "test";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span style="color:var(--text-muted); font-size:11px;">#${rank + 1}</span> <strong>${row.hypothesis}</strong></td>
        <td>${row.target}</td>
        <td><span style="font-weight:700; color:${row.priority === 'Critical' ? 'var(--coral)' : row.priority === 'High' ? 'var(--amber)' : 'var(--text3)'}">${row.priority}</span>${ice > 0 ? ` <span class="badge scale" style="font-size:11px; padding:0 4px;">ICE ${ice.toFixed(1)}</span>` : ''}</td>
        <td>${row.owner}</td>
        <td><span style="font-size: 11px; font-family:monospace; color:var(--text3);">${row.startDate} &rarr; ${row.endDate}</span></td>
        <td><span class="badge ${badgeColor}">${row.status}</span></td>
        <td>
          <div style="display:flex; justify-content:center; gap:4px;">
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px;" onclick="window.editContentExperiment(${idx})" title="Sửa giả thuyết">
              <i data-lucide="edit-3" style="width:10px; height:10px;"></i>
            </button>
            <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px; color:var(--coral);" onclick="window.deleteContentExperiment(${idx})" title="Xóa giả thuyết">
              <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  }

  window.editContentReview = (revId) => {
    if (!checkCustomizePermission("chỉnh sửa đánh giá sáng tạo")) return;
    const item = db.contentReviewRepository.find(r => r.id === revId);
    if (!item) return;

    showCustomPrompt("Chỉnh sửa Creative", "Tên Creative sản phẩm:", item.creative, (newCreative) => {
      if (newCreative === null) return;
      if (newCreative.trim() === "") {
        showToast("Tên Creative không được để trống!", "warning");
        return;
      }
      showCustomPrompt("Chỉnh sửa Hoạt động tốt", "Điều gì hoạt động hiệu quả:", item.whatWorked, (newWorked) => {
        if (newWorked === null) return;
        showCustomPrompt("Chỉnh sửa Chưa tốt", "Điều gì chưa hiệu quả:", item.whatDidNotWork, (newNotWorked) => {
          if (newNotWorked === null) return;
          showCustomPrompt("Chỉnh sửa Insight & Hành động", "Insight rút ra & Giả thuyết tiếp theo:", item.insight, (newInsight) => {
            if (newInsight === null) return;

            item.creative = newCreative.trim();
            item.whatWorked = newWorked.trim();
            item.whatDidNotWork = newNotWorked.trim();
            item.insight = newInsight.trim();

            addAuditLogEntry(currentPersona, `Chỉnh sửa creative review ${revId}`, `Tên: "${item.creative}"`);
            showToast(`Đã chỉnh sửa creative review ${revId} thành công!`, "success");
            renderContentReviewRepository();
            refreshActiveDashboardViews();
          });
        });
      });
    });
  };

  window.deleteContentReview = (revId) => {
    if (!checkCustomizePermission("xóa đánh giá sáng tạo")) return;
    const idx = db.contentReviewRepository.findIndex(r => r.id === revId);
    if (idx === -1) return;

    const confirmed = (typeof confirm === "function") ? confirm(`Bạn có chắc chắn muốn xóa đánh giá ${revId} không?`) : true;
    if (confirmed) {
      const creative = db.contentReviewRepository[idx].creative;
      db.contentReviewRepository.splice(idx, 1);
      addAuditLogEntry(currentPersona, `Xóa creative review ${revId}`, `Creative bị xóa: "${creative}"`);
      showToast(`Đã xóa creative review ${revId} thành công!`, "success");
      renderContentReviewRepository();
      refreshActiveDashboardViews();
    }
  };

  window.editContentExperiment = (idx) => {
    if (!checkCustomizePermission("chỉnh sửa giả thuyết content")) return;
    const item = db.contentExperimentBacklog[idx];
    if (!item) return;

    showCustomPrompt("Chỉnh sửa Giả thuyết", "Giả thuyết thử nghiệm (Hypothesis):", item.hypothesis, (newHyp) => {
      if (newHyp === null) return;
      if (newHyp.trim() === "") {
        showToast("Giả thuyết không được để trống!", "warning");
        return;
      }
      showCustomPrompt("Chỉnh sửa Mục tiêu", "Mục tiêu:", item.target, (newTarget) => {
        if (newTarget === null) return;
        showCustomPrompt("Chỉnh sửa Ưu tiên", "Độ ưu tiên (Critical, High, Medium, Low):", item.priority, (newPriority) => {
          if (newPriority === null) return;
          const formattedPriority = newPriority.trim();
          const validPriorities = ["Critical", "High", "Medium", "Low"];
          if (!validPriorities.includes(formattedPriority)) {
            showToast("Độ ưu tiên không hợp lệ! Vui lòng chọn một trong: Critical, High, Medium, Low", "warning");
            return;
          }
          showCustomPrompt("Chỉnh sửa Người chạy", "Người chạy (Owner):", item.owner, (newOwner) => {
            if (newOwner === null) return;

            item.hypothesis = newHyp.trim();
            item.target = newTarget.trim();
            item.priority = formattedPriority;
            item.owner = newOwner.trim();

            addAuditLogEntry(currentPersona, `Chỉnh sửa giả thuyết content`, `Giả thuyết mới: "${item.hypothesis}"`);
            showToast(`Đã chỉnh sửa giả thuyết content thành công!`, "success");
            renderContentExperimentBacklog();
            refreshActiveDashboardViews();
          });
        });
      });
    });
  };

  window.deleteContentExperiment = (idx) => {
    if (!checkCustomizePermission("xóa giả thuyết content")) return;
    const item = db.contentExperimentBacklog[idx];
    if (!item) return;

    const confirmed = (typeof confirm === "function") ? confirm(`Bạn có chắc chắn muốn xóa giả thuyết content này không?`) : true;
    if (confirmed) {
      const hyp = item.hypothesis;
      db.contentExperimentBacklog.splice(idx, 1);
      addAuditLogEntry(currentPersona, `Xóa giả thuyết content`, `Giả thuyết bị xóa: "${hyp}"`);
      showToast(`Đã xóa giả thuyết content thành công!`, "success");
      renderContentExperimentBacklog();
      refreshActiveDashboardViews();
    }
  };

  function initTeamOpsListeners() {
    setupCustomDropdown("team-dept-trigger", "team-dept-menu", "team-dept-val", (val) => {
      currentOpsDept = val;
      renderDeptDashboard();
    });

    setupCustomDropdown("task-filter-trigger", "task-filter-menu", "task-filter-val", (val) => {
      currentTaskFilterDept = val;
      renderTeamTasks();
    });

    setupCustomDropdown("effectiveness-dept-trigger", "effectiveness-dept-menu", "effectiveness-dept-val", (val) => {
      currentEffectivenessDept = val;
      renderEffectiveness();
    });

    const mockTaskPool = [
      { department: "Marketing", taskName: "Tối ưu hóa hình ảnh chiến dịch Meta Ads M-03", assignee: "Tran (CMO)", owner: "CMO", priority: "Medium", status: "Todo", progress: 0, impact: 7, eta: "2026-07-08", dueDate: "2026-07-10", dependency: "None", responsible: "Marketing Team", accountable: "CMO", consulted: "Data Analyst", informed: "CEO" },
      { department: "Design", taskName: "Thử nghiệm A/B banner cho cổng nạp tiền iOS", assignee: "UI/UX Designer", owner: "Creative Lead", priority: "High", status: "In Progress", progress: 30, impact: 9, eta: "2026-07-01", dueDate: "2026-07-03", dependency: "None", responsible: "UI/UX Designer", accountable: "Creative Lead", consulted: "Marketing Lead", informed: "None" },
      { department: "Content", taskName: "Viết bài PR trên báo Cafef giới thiệu cổng Gold Trade", assignee: "Copywriter Lead", owner: "Creative Lead", priority: "Low", status: "Backlog", progress: 0, impact: 6, eta: "2026-07-15", dueDate: "2026-07-18", dependency: "None", responsible: "Copywriter Lead", accountable: "Creative Lead", consulted: "Trading Analyst", informed: "None" },
      { department: "Data", taskName: "Phân tích hiệu quả kênh TikTok Ads sau đợt điều chỉnh", assignee: "Data Engineer", owner: "Data Analyst", priority: "Medium", status: "Todo", progress: 10, impact: 8, eta: "2026-07-06", dueDate: "2026-07-08", dependency: "None", responsible: "Data Team", accountable: "Data Analyst", consulted: "Product Manager", informed: "CMO" },
      { department: "Customer Success", taskName: "Xây dựng kịch bản chatbot tự động hỗ trợ nạp rút", assignee: "CS Specialist", owner: "CS Lead", priority: "Low", status: "Todo", progress: 20, impact: 6, eta: "2026-07-10", dueDate: "2026-07-12", dependency: "None", responsible: "CS Team", accountable: "CS Lead", consulted: "Product Team", informed: "None" },
      { department: "Product", taskName: "Nâng cấp giao diện biểu đồ LTV Cohort trên Dashboard", assignee: "Product Manager", owner: "Product Manager", priority: "High", status: "In Progress", progress: 50, impact: 8, eta: "2026-07-04", dueDate: "2026-07-06", dependency: "None", responsible: "Product Team", accountable: "Product Manager", consulted: "Finance Team", informed: "CEO" }
    ];

    const addMockTaskBtn = document.getElementById("ds-btn-add-mock-task");
    if (addMockTaskBtn) {
      addMockTaskBtn.onclick = () => {
        const randTemplate = mockTaskPool[Math.floor(Math.random() * mockTaskPool.length)];
        const newTaskId = `TSK-${String(db.teamTasks.length + 1).padStart(3, "0")}`;
        const newTask = {
          ...randTemplate,
          id: newTaskId
        };
        db.teamTasks.push(newTask);
        
        addAuditLogEntry(currentPersona, `Tạo công việc giả lập ${newTaskId}: "${newTask.taskName}"`, `Người tạo: ${currentPersona}`);
        showToast(`Đã thêm task giả lập ${newTaskId} thành công!`, "success");
        
        renderTeamTasks();
        renderTeamProgress();
      };
    }

    // AI Team Copilot Generator listener (Executive Summary & Bottlenecks)
    const btnGen = document.getElementById("btn-generate-team-review");
    const reportBox = document.getElementById("team-copilot-report-box");
    if (btnGen && reportBox) {
      btnGen.onclick = () => {
        const tasks = db.teamTasks;
        const total = tasks.length;
        const done = tasks.filter(t => t.status === "Done").length;
        const inProgress = tasks.filter(t => t.status === "In Progress").length;
        const blocked = tasks.filter(t => t.status === "Blocked").length;

        // Calculate health scores for department status
        const depts = ["Marketing", "Design", "Product", "Data", "CustomerSuccess"];
        const deptReports = depts.map(d => {
          const c = db.crossFunctionalCollab.find(x => x.department === d) || { activeTasks: 0, onTimeRate: 0, utilization: 0, blockedTasks: 0 };
          
          // Calculate health score dynamically
          const k = db.teamEffectivenessKpis[d];
          let finalScore = 80;
          if (k) {
            const dScore = k.delivery.onTimeRate;
            const pScore = Math.min((k.productivity.completedPerWeek / 10) * 100, 100);
            const qScore = 100 - k.quality.reworkRate;
            const cScore = k.collaboration.crossTeamRate;
            const iScore = k.innovation.successRate;
            finalScore = Math.round((0.25 * dScore) + (0.20 * pScore) + (0.20 * qScore) + (0.20 * cScore) + (0.15 * iScore));
          }
          return { name: d, active: c.activeTasks, sla: c.onTimeRate, util: c.utilization, blocked: c.blockedTasks, health: finalScore };
        });

        const delayedRisks = tasks.filter(t => t.status === "Blocked" || (t.status === "In Progress" && t.priority === "High"));
        
        const totalDowntime = db.incidentsLog.reduce((sum, item) => sum + item.downtime, 0);
        const totalRevenueLost = db.incidentsLog.reduce((sum, item) => sum + item.revenueLost, 0);
        const maxImpactIncident = db.incidentsLog.reduce((prev, current) => (prev.revenueLost > current.revenueLost) ? prev : current, db.incidentsLog[0]);

        let reportHtml = `
          <h4 style="color:var(--purple); font-size:12px; border-bottom:1px solid var(--border-color); padding-bottom:6px; margin-bottom:10px;"><i data-lucide="sparkles"></i> AI WEEKLY EXECUTIVE SUMMARY (BÁO CÁO ĐIỀU HÀNH)</h4>
          
          <div style="margin-bottom:10px; font-size:11px;">
            <strong>Sprint Progress:</strong> Hoàn thành <strong>${done}/${total} tasks</strong> (${Math.round((done / total) * 100)}%). 
            Đang chạy: ${inProgress} In-Progress, ${blocked} Blocked.
          </div>

          <!-- Báo cáo Sự cố & Tổn thất Tài chính -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--coral); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">Báo cáo Sự Cố & Tổn Thất Tài Chỉ (Incident Revenue Linkage)</strong>
            <div style="font-size:11px; color:var(--text2); line-height:1.45; background: rgba(220, 38, 38, 0.04); padding: 8px; border-radius: 6px; border-left: 3px solid var(--coral);">
              • Tổng thời gian ngừng hoạt động (Downtime): <strong>${totalDowntime} phút</strong>.<br>
              • Thiệt hại doanh thu ước tính: <strong style="color:var(--coral);">$${totalRevenueLost.toLocaleString()}</strong>.<br>
              • Sự cố nghiêm trọng nhất: <strong>${maxImpactIncident.id}</strong> ("${maxImpactIncident.name}") mất <strong>$${maxImpactIncident.revenueLost.toLocaleString()}</strong> do downtime ${maxImpactIncident.downtime} phút.
            </div>
          </div>

          <!-- 1. Tình trạng hoạt động từng phòng ban -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--purple); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">1. Tình trạng hoạt động phòng ban (Department Status)</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11px;">
              ${deptReports.map(dr => `
                <div style="background:rgba(0,0,0,0.02); padding:6px; border-radius:4px;">
                  <strong>${dr.name}:</strong> ${dr.active} active | SLA: ${dr.sla}% | Health: <span style="font-weight:700; color:${dr.health >= 90 ? 'var(--green)' : dr.health >= 75 ? 'var(--teal)' : 'var(--amber)'}">${dr.health}đ</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- 2. Dự án trọng điểm -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--teal); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">2. Dự án trọng điểm đang triển khai (Key Projects)</strong>
            <ul style="margin:0; padding-left:14px; font-size:11px; color:var(--text2); line-height:1.4;">
              <li><strong>KYC Android Redesign (Product):</strong> Cải thiện phễu nạp rút và vá lỗi SDK liên kết ngân hàng. (Tiến độ: 40%)</li>
              <li><strong>Campaign Options Meta v2 (Marketing/Design):</strong> Tải hình ảnh Ads và tăng lượt chuyển đổi. (Đang thiết kế)</li>
              <li><strong>TikTok FOMO Hook 04 (Content/Design):</strong> Sản xuất video ngắn tiếp cận tệp Casual. (Đang duyệt nội bộ)</li>
            </ul>
          </div>

          <!-- 3. Công việc có nguy cơ chậm tiến độ -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--coral); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">3. Nguy cơ chậm tiến độ (Delayed Task Risks)</strong>
            ${delayedRisks.length > 0 ? delayedRisks.map(t => `
              <div style="margin-top:2px; font-size:11px; color:var(--text2);">
                ⚠️ <strong>Task ${t.id}</strong> ("${t.taskName}"): Trạng thái: <span class="badge stop" style="font-size: 11px; padding:1px 4px;">${t.status}</span> | Assignee: <code>${t.assignee}</code>
              </div>
            `).join("") : `<div style="color:var(--green); font-size:11px;">✓ Không phát hiện rủi ro chậm trễ.</div>`}
          </div>

          <!-- 4. Điểm nghẽn lớn nhất -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--amber); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">4. Điểm nghẽn lớn nhất (Major Bottlenecks)</strong>
            <div style="display:flex; flex-direction:column; gap:4px; font-size:11px;">
              ${db.bottlenecks.slice(0, 3).map(b => `
                <div style="border-left:2.5px solid var(--coral); padding-left:6px; color:var(--text2); line-height:1.35;">
                  <strong>${b.cause}:</strong> Tác động đến <em>${b.impact}</em> (Độ ưu tiên: ${b.priority})
                </div>
              `).join("")}
            </div>
          </div>

          <!-- 5. Hiệu suất của từng đội nhóm -->
          <div style="margin-bottom:12px;">
            <strong style="color:var(--purple); font-size:11px; display:block; text-transform:uppercase; margin-bottom:4px;">5. Hiệu suất đội nhóm (Team Performance Rating)</strong>
            <div style="font-size:11px; color:var(--text2); line-height:1.4;">
              - <strong>Data & Marketing:</strong> Hiệu suất tối ưu và chất lượng báo cáo đạt mức xuất sắc (>90đ).<br>
              - <strong>Design & CS:</strong> SLA tốt nhưng tải tài nguyên và khối lượng chờ review cần cải thiện (78-85đ).
            </div>
          </div>

          <!-- 6. Đề xuất hành động ưu tiên tuần tới -->
          <div style="font-size:11.5px; padding:8px; background:rgba(100, 84, 227, 0.05); border-radius:6px; line-height:1.45;">
            <strong style="color:var(--purple); display:block; margin-bottom:4px; text-transform:uppercase; font-size: 11px;">6. Đề xuất hành động ưu tiên (Weekly Priorities)</strong>
            1. Duyệt khẩn cấp task <strong>TSK-005</strong> trên Kibana để mở khóa SDK Onboarding.<br>
            2. Triển khai freelancer Graphic Designer cho dự án Ads để giảm tải quá hạn (utilization > 90%).<br>
            3. Thiết lập khung giờ duyệt Design cố định lúc <strong>15:00 hàng ngày</strong> để thông luồng Stakeholder review.
          </div>
        `;
        
        reportBox.innerHTML = reportHtml;
        lucide.createIcons();
        
        addAuditLogEntry("AI Team Copilot", "Sinh báo cáo điều hành Executive Team Summary", `Hoàn thành báo cáo tuần.`);
      };
    }
  }
  // -------------------------------------------------------------
  // RBAC User Login & Access Control System
  // -------------------------------------------------------------
  // ============================================================
  // PHÂN QUYỀN XEM TAB — theo PHÒNG BAN. Mỗi bộ phận chỉ thấy vài tab liên quan;
  // CEO toàn quyền (12 tab). Nguồn chân lý là DEPT_TAB_ACCESS; vai trò ánh xạ về
  // phòng ban đại diện (ROLE_TO_DEPT) để phần "xem theo persona" vẫn khớp.
  // ============================================================
  const GD_ALL_TABS = [
    "tab-executive", "tab-customer-value", "tab-content", "tab-customer-intel",
    "tab-product-growth", "tab-experimentation", "tab-capital", "tab-growth-strategy",
    "tab-market-competitor", "tab-team-ops", "tab-governance", "tab-data-guide"
  ];
  const GD_GUIDE_TAB = "tab-data-guide";   // Sơ đồ & Hướng dẫn — bộ phận nào cũng có
  // Phòng ban → các tab được phép (đã kèm sẵn tab Hướng dẫn ở cuối mỗi danh sách)
  const DEPT_TAB_ACCESS = {
    "Marketing":       ["tab-customer-intel", "tab-content", "tab-growth-strategy", "tab-market-competitor", "tab-experimentation", GD_GUIDE_TAB],
    "Content":         ["tab-content", "tab-experimentation", "tab-customer-value", GD_GUIDE_TAB],
    "Design":          ["tab-content", "tab-product-growth", "tab-customer-value", GD_GUIDE_TAB],
    "Product":         ["tab-product-growth", "tab-customer-value", "tab-experimentation", "tab-team-ops", GD_GUIDE_TAB],
    "Data":            ["tab-executive", "tab-customer-value", "tab-product-growth", "tab-market-competitor", GD_GUIDE_TAB],
    "CustomerSuccess": ["tab-customer-value", "tab-team-ops", GD_GUIDE_TAB]
  };
  // Quản trị hệ thống: cấu hình + đội ngũ + tổng quan (KHÔNG xem toàn bộ dữ liệu như CEO)
  const ADMIN_TABS = ["tab-executive", "tab-team-ops", "tab-governance", GD_GUIDE_TAB];
  // Vai trò (persona) ↔ phòng ban đại diện, để CEO "xem theo persona" khớp đúng bộ tab
  const ROLE_TO_DEPT = {
    "CMO": "Marketing", "Growth Lead": "Marketing",
    "Product Manager": "Product", "Creative Specialist": "Content"
  };
  // Giữ ROLE_TAB_ACCESS["CEO"] để mọi nơi vẫn tham chiếu được "toàn quyền"
  const ROLE_TAB_ACCESS = { "CEO": GD_ALL_TABS };
  // Nhãn tiếng Việt cho từng tab (hiển thị danh sách quyền trong bảng quản lý thành viên)
  const TAB_LABELS = {
    "tab-executive": "Tổng quan", "tab-customer-value": "Khách hàng", "tab-content": "Nội dung",
    "tab-customer-intel": "Quảng cáo", "tab-product-growth": "Sản phẩm", "tab-experimentation": "Thí nghiệm",
    "tab-capital": "Tài chính", "tab-growth-strategy": "Chiến lược", "tab-market-competitor": "Thị trường",
    "tab-team-ops": "Đội ngũ", "tab-governance": "Cài đặt", "tab-data-guide": "Hướng dẫn"
  };

  // Quy ra danh sách tab được phép theo (vai trò, phòng ban, hoặc danh sách CEO tự phân quyền).
  // Ưu tiên: CEO=toàn quyền > danh sách tùy chỉnh (allowedTabs) > Admin > theo phòng ban > tối thiểu.
  function resolveAllowedTabs(role, dept, allowedTabs) {
    if (role === "CEO") return GD_ALL_TABS;          // CEO: toàn quyền (không bị override)
    if (Array.isArray(allowedTabs) && allowedTabs.length) {   // CEO đã phân quyền TÙY CHỈNH cho thành viên
      var set = allowedTabs.filter(function (t) { return GD_ALL_TABS.indexOf(t) >= 0; });
      if (set.indexOf(GD_GUIDE_TAB) < 0) set.push(GD_GUIDE_TAB);   // luôn giữ tab Hướng dẫn
      return set.length ? set : ["tab-executive", GD_GUIDE_TAB];
    }
    if (role === "Admin") return ADMIN_TABS;         // Admin: quản trị, không xem toàn bộ data
    const d = dept || ROLE_TO_DEPT[role];
    if (d && DEPT_TAB_ACCESS[d]) return DEPT_TAB_ACCESS[d];
    return ["tab-executive", GD_GUIDE_TAB];          // mặc định tối thiểu cho vai trò/bộ phận lạ
  }
  // Chuỗi nhãn quyền (để hiển thị trong bảng quản lý thành viên)
  function tabsLabelFor(role, dept, allowedTabs) {
    if (role === "CEO") return "Toàn quyền (12 tab)";
    return resolveAllowedTabs(role, dept, allowedTabs).map(function (t) { return TAB_LABELS[t] || t; }).join(", ");
  }
  window.resolveAllowedTabs = resolveAllowedTabs;
  window.tabsLabelFor = tabsLabelFor;

  // Khởi đầu sạch: chỉ CEO được kích hoạt sẵn. Thành viên do CEO tạo sẽ mặc định
  // bị khóa (false) cho tới khi CEO kích hoạt — xem luồng thêm thành viên.
  const DEFAULT_RBAC_STATES = {
    "ceo@ot-growth.com": true
  };

  function applyRoleUiAccess(role, dept, customTabs) {
    const allowedTabs = resolveAllowedTabs(role, dept, customTabs);
    const navItems = document.querySelectorAll(".nav-item");

    let firstAllowedTabId = null;

    navItems.forEach(item => {
      const tabId = item.getAttribute("data-tab");

      if (allowedTabs.includes(tabId)) {
        item.style.display = "flex";
        if (!firstAllowedTabId) firstAllowedTabId = tabId;
      } else {
        item.style.display = "none";
      }
    });

    // Ẩn tiêu đề nhóm (TỔNG QUAN/TĂNG TRƯỞNG…) nếu mọi mục trong nhóm đều bị ẩn → sidebar gọn, không trơ tiêu đề rỗng
    document.querySelectorAll(".nav-menu .nav-group-label").forEach(label => {
      let hasVisible = false;
      let sib = label.nextElementSibling;
      while (sib && !sib.classList.contains("nav-group-label")) {
        if (sib.classList.contains("nav-item") && sib.style.display !== "none") { hasVisible = true; break; }
        sib = sib.nextElementSibling;
      }
      label.style.display = hasVisible ? "" : "none";
    });

    // If current active tab is not allowed, switch to first allowed tab
    const currentActiveItem = document.querySelector(".nav-item.active");
    const currentActiveTab = currentActiveItem ? currentActiveItem.getAttribute("data-tab") : null;
    if (currentActiveTab && !allowedTabs.includes(currentActiveTab)) {
      if (firstAllowedTabId) {
        window.switchTab(firstAllowedTabId);
      }
    }
  }

  function checkActionPermissions(role) {
    const customizeBtn = document.getElementById("btn-toggle-customize");
    const configSaveBtn = document.getElementById("btn-save-configs");
    
    if (role === "Admin" || role === "CEO") {
      if (customizeBtn) customizeBtn.style.display = "inline-flex";
      if (configSaveBtn) configSaveBtn.style.display = "inline-flex";
    } else {
      if (customizeBtn) customizeBtn.style.display = "none";
      if (configSaveBtn) configSaveBtn.style.display = "none";
      
      // Auto disable customizations if active
      if (window.customizationsEnabled) {
        window.customizationsEnabled = false;
        const wrap = document.getElementById("customize-wrapper");
        if (wrap) wrap.classList.remove("customizations-active");
        const toggleBtn = document.getElementById("btn-toggle-customize");
        if (toggleBtn) {
          toggleBtn.classList.remove("active");
          toggleBtn.innerHTML = '<i data-lucide="lock"></i> Bật Tùy Biến';
          if (window.lucide && lucide.createIcons) lucide.createIcons();
        }
      }
    }
  }

  // Khởi đầu sạch: hệ thống chỉ seed DUY NHẤT tài khoản CEO (quản trị cao nhất).
  // CEO đăng nhập rồi tự tạo + kích hoạt tài khoản cho từng thành viên.
  const DEFAULT_ACCOUNTS = [
    { email: "ceo@ot-growth.com", password: "gos123", name: "CEO (Hannah)", role: "CEO", tabs: "Executive, Capital, Strategy, Market, Governance, Guide", isCeo: true }
  ];

  window.getRbacAccounts = function() {
    try {
      const saved = localStorage.getItem("gd_rbac_accounts");
      if (saved) {
        let accounts = JSON.parse(saved);
        let migrated = false;
        accounts = accounts.map(acc => {
          if (acc.email && acc.email.endsWith("@growthos.vn")) {
            acc.email = acc.email.replace("@growthos.vn", "@ot-growth.com");
            migrated = true;
          }
          return acc;
        });

        // Đồng bộ chuỗi quyền hiển thị theo PHÒNG BAN (mô hình mới): tính lại từ
        // (role, dept) để cả tài khoản cũ (chuỗi tabs theo vai trò) hiển thị đúng.
        accounts.forEach(acc => {
          if (acc.isCeo || acc.role === "CEO") return;
          const want = tabsLabelFor(acc.role, acc.dept, acc.allowedTabs);
          if (acc.tabs !== want) { acc.tabs = want; migrated = true; }
        });

        if (migrated) {
          localStorage.setItem("gd_rbac_accounts", JSON.stringify(accounts));
        }
        return accounts;
      }
    } catch(e) {}
    try {
      localStorage.setItem("gd_rbac_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    } catch(e) {}
    return DEFAULT_ACCOUNTS;
  };

  function initLoginSystem() {
    const overlay = document.getElementById("gos-login-overlay");
    const roleSelector = document.getElementById("sidebar-role-selector");
    const roleSelectorWrapper = document.getElementById("sidebar-role-selector-wrapper");
    const logoutBtn = document.getElementById("btn-sidebar-logout");

    // Perform domain migration for gd_rbac_account_states and gd_user_email
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) {
        let states = JSON.parse(savedStates);
        let migrated = false;
        for (const email in states) {
          if (email.endsWith("@growthos.vn")) {
            const newEmail = email.replace("@growthos.vn", "@ot-growth.com");
            states[newEmail] = states[email];
            delete states[email];
            migrated = true;
          }
        }
        if (migrated) {
          localStorage.setItem("gd_rbac_account_states", JSON.stringify(states));
        }
      } else {
        localStorage.setItem("gd_rbac_account_states", JSON.stringify(DEFAULT_RBAC_STATES));
      }
    } catch(e) {}

    try {
      const userEmail = localStorage.getItem("gd_user_email");
      if (userEmail && userEmail.endsWith("@growthos.vn")) {
        localStorage.setItem("gd_user_email", userEmail.replace("@growthos.vn", "@ot-growth.com"));
      }
    } catch(e) {}

    // Detect if running in osascript JXA test environment
    const isJxaTest = (typeof window === "undefined" || typeof window.location === "undefined" || !window.location.href);

    if (isJxaTest) {
      // Auto-bypass login as CEO (toàn quyền) cho môi trường kiểm thử JXA — mọi tab đều hiển thị
      try {
        localStorage.setItem("gd_user_logged_in", "true");
        localStorage.setItem("gd_user_role", "CEO");
      } catch(e) {}
      if (overlay) overlay.style.display = "none";
      const appContainer = document.querySelector(".app-container");
      if (appContainer) appContainer.style.opacity = "1";
      currentPersona = "CEO";
      applyRoleUiAccess("CEO");
      checkActionPermissions("CEO");
      return;
    }

    // Bind Quick Select auto-fill
    const quickSelect = document.getElementById("login-quick-select");
    if (quickSelect) {
      updateLoginQuickSelectOptions();
      quickSelect.addEventListener("change", () => {
        const email = quickSelect.value;
        const emailInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        if (email && emailInput && passInput) {
          emailInput.value = email;
          const accounts = getRbacAccounts();
          const acc = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
          if (acc) {
            passInput.value = acc.password;
          }
        }
      });
    }

    // Bind Login Form Submission
    const submitBtn = document.getElementById("btn-login-submit");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const emailInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        if (!emailInput || !passInput) return;

        const email = emailInput.value.trim().toLowerCase();
        const password = passInput.value.trim();

        if (!email) {
          showToast("Vui lòng nhập Email!", "warning");
          return;
        }
        if (!password) {
          showToast("Vui lòng nhập Mật khẩu!", "warning");
          return;
        }

        const accounts = getRbacAccounts();
        const user = accounts.find(a => a.email.toLowerCase() === email);

        if (!user) {
          showToast("Tài khoản không tồn tại trên hệ thống!", "warning");
          return;
        }

        if (user.password !== password) {
          showToast("Mật khẩu không chính xác!", "warning");
          return;
        }

        // Check activation state
        let rbacStates = DEFAULT_RBAC_STATES;
        try {
          const savedStates = localStorage.getItem("gd_rbac_account_states");
          if (savedStates) rbacStates = JSON.parse(savedStates);
        } catch(e) {}

        const isActive = user.role === "CEO" || rbacStates[user.email];
        if (!isActive) {
          showToast("Tài khoản chưa được kích hoạt bởi CEO hoặc Admin!", "warning");
          return;
        }

        // Login success
        try {
          localStorage.setItem("gd_user_logged_in", "true");
          localStorage.setItem("gd_user_email", user.email);
          localStorage.setItem("gd_user_role", user.role);
          localStorage.setItem("gd_user_name", user.name);
        } catch(e) {}

        showToast(`Đăng nhập thành công với vai trò ${user.role}!`, "success");
        if (overlay) overlay.style.setProperty("display", "none", "important");
        
        verifyUserSessionAndConfigureUi();
      });
    }

    // Bind Sidebar Logout Button
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try {
          localStorage.removeItem("gd_user_logged_in");
          localStorage.removeItem("gd_user_email");
          localStorage.removeItem("gd_user_role");
          localStorage.removeItem("gd_user_name");
        } catch(e) {}

        showToast("Đã đăng xuất thành công!", "info");
        
        // Reset login input fields
        const emailInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        if (emailInput) emailInput.value = "";
        if (passInput) passInput.value = "";
        if (quickSelect) quickSelect.value = "";

        if (overlay) overlay.style.display = "flex";
      });
    }

    // Verify Session on Startup
    verifyUserSessionAndConfigureUi();

    function verifyUserSessionAndConfigureUi() {
      let loggedIn = false;
      try {
        loggedIn = (localStorage.getItem("gd_user_logged_in") === "true");
      } catch(e) {}

      if (!loggedIn) {
        if (overlay) overlay.style.display = "flex";
        return;
      }

      let email = "";
      try {
        email = localStorage.getItem("gd_user_email") || "";
      } catch(e) {}

      const accounts = getRbacAccounts();
      const user = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        // Clear session if user not found in dynamic database
        logoutUserImmediately();
        return;
      }

      // Check user activation state in localStorage
      let rbacStates = DEFAULT_RBAC_STATES;
      try {
        const savedStates = localStorage.getItem("gd_rbac_account_states");
        if (savedStates) rbacStates = JSON.parse(savedStates);
      } catch(e) {}

      const isActive = (user.role === "CEO" || rbacStates[user.email]);
      if (!isActive) {
        logoutUserImmediately();
        showToast("Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt!", "warning");
        return;
      }

      // Hide login overlay
      if (overlay) overlay.style.setProperty("display", "none", "important");
      const appContainer = document.querySelector(".app-container");
      if (appContainer) appContainer.style.opacity = "1";

      // Configure access limits
      if (user.role === "CEO") {
        // CEO gets role switching capability
        if (roleSelectorWrapper) roleSelectorWrapper.style.display = "flex";
        
        let savedRole = "CEO";
        try {
          savedRole = localStorage.getItem("gd_user_role") || "CEO";
        } catch(e) {}
        currentPersona = savedRole;
      } else {
        // Non-CEOs are locked to their own roles, switcher hidden
        if (roleSelectorWrapper) roleSelectorWrapper.style.display = "none";
        currentPersona = user.role;
        try {
          localStorage.setItem("gd_user_role", user.role);
          localStorage.setItem("gd_user_name", user.name);
        } catch(e) {}
      }

      if (roleSelector) {
        roleSelector.value = currentPersona;
      }

      // Khóa tab theo PHÒNG BAN của chính tài khoản (CEO → toàn quyền). Persona dropdown
      // chỉ đổi góc nhìn AI, KHÔNG nới quyền — nên dùng user.role/user.dept, không dùng persona.
      applyRoleUiAccess(user.role, user.dept, user.allowedTabs);
      checkActionPermissions(currentPersona);
      updatePersonaView();
    }

    function logoutUserImmediately() {
      try {
        localStorage.removeItem("gd_user_logged_in");
        localStorage.removeItem("gd_user_email");
        localStorage.removeItem("gd_user_role");
        localStorage.removeItem("gd_user_name");
      } catch(e) {}
      if (overlay) overlay.style.display = "flex";
    }

    // Bind sidebar role selector change handler (only for CEO)
    if (roleSelector) {
      roleSelector.addEventListener("change", () => {
        let email = "";
        try { email = localStorage.getItem("gd_user_email") || ""; } catch(e) {}
        const accounts = getRbacAccounts();
        const user = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

        // Extra check: only CEO account is allowed to change roles
        if (!user || user.role !== "CEO") {
          showToast("Bạn không được phép thực hiện hành động này!", "warning");
          verifyUserSessionAndConfigureUi();
          return;
        }

        const selectedRole = roleSelector.value;
        try {
          localStorage.setItem("gd_user_role", selectedRole);
        } catch(e) {}

        currentPersona = selectedRole;
        applyRoleUiAccess(selectedRole);
        checkActionPermissions(selectedRole);
        updatePersonaView();
        
        showToast(`Đã chuyển đổi sang vai trò ${selectedRole}!`, "success");
      });
    }
  }

  // -------------------------------------------------------------
  // RBAC User Management & Provisioning Panel Rendering
  // -------------------------------------------------------------
  function renderRbacUserTable() {
    const tbody = document.getElementById("rbac-user-table-tbody");
    if (!tbody) return;

    let rbacStates = DEFAULT_RBAC_STATES;
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) rbacStates = JSON.parse(savedStates);
    } catch(e) {}

    const accounts = getRbacAccounts();

    const loggedInRole = currentPersona || "CEO";
    const canManage = (loggedInRole === "CEO"); // Strictly CEO can manage (create, lock, activate)

    const addBtn = document.getElementById("btn-open-user-add");
    if (addBtn) {
      addBtn.style.display = canManage ? "inline-flex" : "none";
    }

    let html = "";
    accounts.forEach(acc => {
      const isActive = rbacStates[acc.email];
      const statusPill = isActive
        ? `<span style="background: rgba(14, 156, 138, 0.15); color: #0E9C8A; padding: 4px 8px; border-radius: 12px; font-weight: 700; font-size: 10px; display: inline-block;">Đã Kích Hoạt</span>`
        : `<span style="background: rgba(220, 38, 38, 0.15); color: #DC2626; padding: 4px 8px; border-radius: 12px; font-weight: 700; font-size: 10px; display: inline-block;">Đang Khóa</span>`;

      let actionBtn = "";
      
      let lockUnlockBtn = "";
      if (acc.isCeo) {
        lockUnlockBtn = `<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Mặc định (Không khóa)</span>`;
      } else if (!canManage) {
        lockUnlockBtn = `<span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Chỉ CEO/Admin mới được sửa</span>`;
      } else {
        const btnText = isActive ? "Khóa lại" : "Kích hoạt";
        const btnClass = isActive ? "btn-secondary" : "btn-purple";
        lockUnlockBtn = `<button class="btn ${btnClass} btn-small" onclick="toggleUserActivation('${acc.email}')" style="padding: 4px 10px; font-size: 11px; min-width: 80px;">${btnText}</button>`;
      }

      let editBtn = "";
      if (canManage) {
        editBtn = `<button class="btn btn-purple btn-small" onclick="openUserEditModal('${acc.email}')" style="padding: 4px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="edit-2" style="width: 10px; height: 10px;"></i> Sửa</button>`;
      }

      actionBtn = `<div style="display: flex; gap: 8px; align-items: center; justify-content: center;">${lockUnlockBtn} ${editBtn}</div>`;

      html += `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--purple-light); color: var(--purple); font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                ${acc.name.split(" ").map(w => w.charAt(0)).join("").substring(0, 2).toUpperCase()}
              </div>
              <strong style="color: var(--text-main); font-size: 12px;">${acc.name}</strong>
            </div>
          </td>
          <td style="font-size: 11.5px; color: var(--text-main); font-weight: 600;">${acc.role}</td>
          <td style="font-size: 11.5px; font-family: monospace; color: var(--text-muted);">${acc.email}</td>
          <td style="font-size: 11px; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${acc.tabs}</td>
          <td style="text-align: center;">${statusPill}</td>
          <td style="text-align: center;">${actionBtn}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  window.toggleUserActivation = function(email) {
    let rbacStates = DEFAULT_RBAC_STATES;
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) rbacStates = JSON.parse(savedStates);
    } catch(e) {}

    rbacStates[email] = !rbacStates[email];
    
    try {
      localStorage.setItem("gd_rbac_account_states", JSON.stringify(rbacStates));
    } catch(e) {}

    // Log action to Audit Logs
    addAuditLogEntry(currentPersona, `Thay đổi quyền truy cập của ${email}`, rbacStates[email] ? "Kích hoạt quyền truy cập thành công" : "Khóa quyền truy cập thành công");
    
    // Refresh table
    renderRbacUserTable();

    // Show Toast
    showToast(`Đã ${rbacStates[email] ? "kích hoạt" : "khóa"} tài khoản ${email} thành công!`, "success");
  };

  // Open User Edit Modal
  window.openUserEditModal = function(email) {
    const modal = document.getElementById("user-edit-modal");
    const targetEmailInput = document.getElementById("user-edit-target-email");
    const nameInput = document.getElementById("user-edit-name");
    const emailInput = document.getElementById("user-edit-email");
    const passInput = document.getElementById("user-edit-password");
    
    if (!modal || !emailInput || !passInput || !nameInput || !targetEmailInput) return;
    
    const accounts = getRbacAccounts();
    const acc = accounts.find(a => a.email === email);
    if (!acc) return;
    
    targetEmailInput.value = email;
    nameInput.value = acc.name;
    emailInput.value = acc.email;
    passInput.value = acc.password;

    // PHÂN QUYỀN: ẩn với CEO (toàn quyền), hiện + nạp dữ liệu với thành viên
    const permWrap = document.getElementById("user-edit-perm-wrap");
    if (permWrap) permWrap.style.display = acc.isCeo ? "none" : "block";
    if (!acc.isCeo) {
      const deptSel = document.getElementById("user-edit-dept");
      const roleSel = document.getElementById("user-edit-role");
      if (deptSel) deptSel.value = acc.dept || "Marketing";
      if (roleSel) roleSel.value = acc.role || "Growth Lead";
      gdBuildEditTabChecklist(resolveAllowedTabs(acc.role, acc.dept, acc.allowedTabs));
    }

    modal.style.display = "flex";
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  };

  // Dựng checklist tab cho modal phân quyền (tab Hướng dẫn luôn bật & khóa)
  function gdBuildEditTabChecklist(checkedTabs) {
    const host = document.getElementById("user-edit-tabs");
    if (!host) return;
    const checked = checkedTabs || [];
    host.innerHTML = GD_ALL_TABS.map(function (t) {
      const isGuide = (t === GD_GUIDE_TAB);
      const on = isGuide || checked.indexOf(t) >= 0;
      return '<label style="display:flex; align-items:center; gap:7px; font-size:11.5px; color:#fff; cursor:' + (isGuide ? 'not-allowed' : 'pointer') + ';">'
        + '<input type="checkbox" value="' + t + '" ' + (on ? 'checked' : '') + (isGuide ? ' disabled' : '') + ' style="accent-color: var(--purple); width:14px; height:14px; flex-shrink:0;">'
        + '<span>' + (TAB_LABELS[t] || t) + (isGuide ? ' <span style="opacity:.55; font-size:10px;">(luôn bật)</span>' : '') + '</span></label>';
    }).join("");
  }

  // Close User Edit Modal
  window.closeUserEditModal = function() {
    const modal = document.getElementById("user-edit-modal");
    if (modal) modal.style.display = "none";
  };

  // Save User Edit Changes
  function saveUserEditChanges() {
    const targetEmail = document.getElementById("user-edit-target-email").value;
    const newEmail = document.getElementById("user-edit-email").value.trim();
    const newPassword = document.getElementById("user-edit-password").value.trim();
    
    if (!newEmail) {
      showToast("Email không được để trống!", "warning");
      return;
    }
    if (!newPassword) {
      showToast("Mật khẩu không được để trống!", "warning");
      return;
    }
    
    let accounts = getRbacAccounts();
    const index = accounts.findIndex(a => a.email === targetEmail);
    if (index === -1) return;
    
    const emailExists = accounts.some((a, idx) => a.email === newEmail && idx !== index);
    if (emailExists) {
      showToast("Email này đã được sử dụng bởi một tài khoản khác!", "warning");
      return;
    }
    
    const currentLoggedEmail = localStorage.getItem("gd_user_email");
    
    let rbacStates = DEFAULT_RBAC_STATES;
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) rbacStates = JSON.parse(savedStates);
    } catch(e) {}
    
    if (targetEmail !== newEmail) {
      rbacStates[newEmail] = rbacStates[targetEmail];
      delete rbacStates[targetEmail];
      try {
        localStorage.setItem("gd_rbac_account_states", JSON.stringify(rbacStates));
      } catch(e) {}
    }
    
    accounts[index].email = newEmail;
    accounts[index].password = newPassword;

    // PHÂN QUYỀN (chỉ cho thành viên — CEO luôn toàn quyền, không đụng)
    if (!accounts[index].isCeo) {
      const deptSel = document.getElementById("user-edit-dept");
      const roleSel = document.getElementById("user-edit-role");
      if (deptSel) accounts[index].dept = deptSel.value;
      if (roleSel) accounts[index].role = roleSel.value;
      const checked = [].slice.call(document.querySelectorAll("#user-edit-tabs input[type=checkbox]:checked")).map(function (c) { return c.value; });
      // Trùng đúng bộ mặc định theo phòng ban → bỏ override (dùng mặc định); khác → lưu danh sách tùy chỉnh
      const def = resolveAllowedTabs(accounts[index].role, accounts[index].dept, null);
      const sameAsDefault = checked.length === def.length && checked.every(function (t) { return def.indexOf(t) >= 0; });
      accounts[index].allowedTabs = sameAsDefault ? null : checked;
      accounts[index].tabs = tabsLabelFor(accounts[index].role, accounts[index].dept, accounts[index].allowedTabs);
    }

    try {
      localStorage.setItem("gd_rbac_accounts", JSON.stringify(accounts));
    } catch(e) {}

    if (currentLoggedEmail === targetEmail) {
      localStorage.setItem("gd_user_email", newEmail);
      if (!accounts[index].isCeo) localStorage.setItem("gd_user_role", accounts[index].role);
    }

    addAuditLogEntry(currentPersona, `Cập nhật & phân quyền tài khoản ${accounts[index].name}`, `Tab được xem: ${accounts[index].tabs}`);
    window.closeUserEditModal();
    renderRbacUserTable();
    showToast(`Đã cập nhật & phân quyền cho ${accounts[index].name} thành công!`, "success");
  }

  // Setup Edit Modal event listeners
  function initUserEditModalListeners() {
    const closeBtn = document.getElementById("close-user-edit-modal");
    const cancelBtn = document.getElementById("btn-user-edit-cancel");
    const saveBtn = document.getElementById("btn-user-edit-save");
    
    if (closeBtn) closeBtn.addEventListener("click", window.closeUserEditModal);
    if (cancelBtn) cancelBtn.addEventListener("click", window.closeUserEditModal);
    if (saveBtn) saveBtn.addEventListener("click", saveUserEditChanges);

    // "Đặt theo phòng ban": tích lại đúng bộ tab mặc định của phòng ban đang chọn
    const resetBtn = document.getElementById("user-edit-tabs-reset");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      const deptSel = document.getElementById("user-edit-dept");
      const roleSel = document.getElementById("user-edit-role");
      gdBuildEditTabChecklist(resolveAllowedTabs(roleSel ? roleSel.value : "", deptSel ? deptSel.value : "", null));
    });
    // Đổi phòng ban → gợi ý lại bộ tab mặc định của phòng ban đó
    const deptSelLive = document.getElementById("user-edit-dept");
    if (deptSelLive) deptSelLive.addEventListener("change", function () {
      const roleSel = document.getElementById("user-edit-role");
      gdBuildEditTabChecklist(resolveAllowedTabs(roleSel ? roleSel.value : "", deptSelLive.value, null));
    });
  }

  // Open User Add Modal
  window.openUserAddModal = function() {
    const modal = document.getElementById("user-add-modal");
    if (!modal) return;

    const nameInput = document.getElementById("user-add-name");
    const emailInput = document.getElementById("user-add-email");
    const roleInput = document.getElementById("user-add-role");
    const deptInput = document.getElementById("user-add-dept");
    const passInput = document.getElementById("user-add-password");

    if (nameInput) nameInput.value = "";
    if (emailInput) emailInput.value = "";
    if (roleInput) roleInput.value = "CMO";
    if (deptInput) deptInput.value = "Marketing";
    if (passInput) passInput.value = "gos123";

    modal.style.display = "flex";
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  };

  // Close User Add Modal
  window.closeUserAddModal = function() {
    const modal = document.getElementById("user-add-modal");
    if (modal) modal.style.display = "none";
  };

  // Save User Add
  function saveUserAddChanges() {
    const name = document.getElementById("user-add-name").value.trim();
    const email = document.getElementById("user-add-email").value.trim().toLowerCase();
    const role = document.getElementById("user-add-role").value;
    const dept = document.getElementById("user-add-dept").value;
    const password = document.getElementById("user-add-password").value.trim();

    if (!name) {
      showToast("Vui lòng nhập Họ tên thành viên!", "warning");
      return;
    }
    if (!email) {
      showToast("Vui lòng nhập Email!", "warning");
      return;
    }
    if (!password) {
      showToast("Vui lòng nhập Mật khẩu khởi tạo!", "warning");
      return;
    }
    if (!email.endsWith("@ot-growth.com")) {
      showToast("Email thành viên mới phải có đuôi @ot-growth.com!", "warning");
      return;
    }

    let accounts = getRbacAccounts();
    const emailExists = accounts.some(a => a.email.toLowerCase() === email);
    if (emailExists) {
      showToast("Email này đã được sử dụng bởi một tài khoản khác!", "warning");
      return;
    }

    const newAccount = {
      email: email,
      password: password,
      name: name,
      role: role,
      dept: dept,
      tabs: tabsLabelFor(role, dept),   // danh sách tab theo PHÒNG BAN (chỉ CEO mới toàn quyền)
      isCeo: false
    };

    accounts.push(newAccount);

    try {
      localStorage.setItem("gd_rbac_accounts", JSON.stringify(accounts));
    } catch(e) {}

    let rbacStates = DEFAULT_RBAC_STATES;
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) rbacStates = JSON.parse(savedStates);
    } catch(e) {}

    // 6. Thành viên chỉ có thể đăng nhập sau khi được CEO kích hoạt tài khoản.
    rbacStates[email] = false; // set as locked initially
    try {
      localStorage.setItem("gd_rbac_account_states", JSON.stringify(rbacStates));
    } catch(e) {}

    // Log action to Audit Logs
    addAuditLogEntry(currentPersona, `Tạo tài khoản mới ${name}`, `Email: ${email}, Vai trò: ${role}, Phòng ban: ${dept} (Trạng thái: Đang khóa)`);

    window.closeUserAddModal();
    renderRbacUserTable();
    updateLoginQuickSelectOptions();

    // Notify CEO of credentials
    alert(`Đã tạo tài khoản thành công!\n\nEmail đăng nhập: ${email}\nMật khẩu khởi tạo: ${password}\nPhòng ban: ${dept}\nVai trò: ${role}\nTrạng thái: Đang khóa.\n\n-> Hãy bấm nút "Kích hoạt" trên bảng quản trị để thành viên có thể đăng nhập.`);

    showToast(`Đã thêm thành viên ${name} thành công!`, "success");
  }

  function updateLoginQuickSelectOptions() {
    const quickSelect = document.getElementById("login-quick-select");
    if (!quickSelect) return;

    const accounts = getRbacAccounts();
    let rbacStates = DEFAULT_RBAC_STATES;
    try {
      const savedStates = localStorage.getItem("gd_rbac_account_states");
      if (savedStates) rbacStates = JSON.parse(savedStates);
    } catch(e) {}

    let html = `<option value="" disabled selected>-- Chọn tài khoản mẫu --</option>`;
    accounts.forEach((acc, index) => {
      const isActive = acc.role === "CEO" || rbacStates[acc.email];
      const statusText = isActive ? "" : " (Đang khóa)";
      html += `<option value="${acc.email}">${index + 1}. ${acc.name} (${acc.role})${statusText}</option>`;
    });
    quickSelect.innerHTML = html;
  }

  function initUserAddModalListeners() {
    const openBtn = document.getElementById("btn-open-user-add");
    const closeBtn = document.getElementById("close-user-add-modal");
    const cancelBtn = document.getElementById("btn-user-add-cancel");
    const saveBtn = document.getElementById("btn-user-add-save");

    if (openBtn) openBtn.addEventListener("click", window.openUserAddModal);
    if (closeBtn) closeBtn.addEventListener("click", window.closeUserAddModal);
    if (cancelBtn) cancelBtn.addEventListener("click", window.closeUserAddModal);
    if (saveBtn) saveBtn.addEventListener("click", saveUserAddChanges);
  }

  // Run Login System Initialization
  initLoginSystem();
  initUserEditModalListeners();
  initUserAddModalListeners();
  updatePersonaView();
  try { renderNorthStar(); } catch(e) { console.error("Error in renderNorthStar:", e); }
  try { renderMeuValueTrends(); } catch(e) { console.error("Error in renderMeuValueTrends:", e); }
  try { initMeuTimeSeriesToggle(); renderMeuTimeSeries(); } catch(e) { console.error("Error in renderMeuTimeSeries:", e); }
  calculateHealthScores();
  checkAlerts();
  renderPriorityEngine();
  renderTeamProgress();
  try { renderExecutiveOverviewWidgets(); } catch(e) { console.error("Error in renderExecutiveOverviewWidgets:", e); }
  initLiquidMeshPhysics();
  
  // Extensions run
  initWhaleProbabilityEngine();
  initGeopoliticalRegimes();
  initVideoDropOffAnalytics();
  initContentCalendar();
  initAttributionModelSwitcher();
  initChurnEngine();
  initFunnelFilter();
  initAnomalySimulation();
  initTeamOpsListeners();
  initCustomerJourneySubtabs();
  initTrackingGovernanceListeners();
  initContentOpsSubtabs();
  
  // -------------------------------------------------------------
  // TAB 9: GROWTH STRATEGY & AI COPILOT
  // -------------------------------------------------------------
  const stageStrategyDatabase = {
    "Pre-PMF": {
      priorities: {
        "3m": "Phỏng vấn 100 khách hàng mục tiêu để tìm hiểu nhu cầu thực tế và tinh chỉnh tính năng cốt lõi.",
        "6m": "Xây dựng và hoàn thiện phiên bản MVP (Minimum Viable Product) chạy thử nghiệm với nhóm nhỏ.",
        "12m": "Đạt Product-Market Fit sơ bộ, thiết lập các chỉ số Retention ngày thứ 7 ổn định trên 25%."
      },
      constraints: [
        { name: "Traffic Constraint", score: 85, status: "Critical", metric: "Dưới 5k MAU", color: "var(--coral)" },
        { name: "Activation Constraint", score: 40, status: "Low", metric: "Tỷ lệ KYC chưa quan trọng", color: "var(--teal)" },
        { name: "Monetization Constraint", score: 75, status: "High", metric: "Chưa tạo doanh thu", color: "var(--coral)" },
        { name: "Retention Constraint", score: 90, status: "Critical", metric: "Retention D7 < 15%", color: "var(--coral)" },
        { name: "Team Constraint", score: 50, status: "Moderate", metric: "Thiếu nhân sự Product", color: "var(--amber)" },
        { name: "Capital Constraint", score: 60, status: "Moderate", metric: "Runway còn 8 tháng", color: "var(--amber)" }
      ],
      growthLoops: [
        { name: "User Interview & Feedback Loop", type: "Qualitative", input: "Target Users", steps: ["User Interview", "Identify Friction", "Deploy Feature Fix", "Re-engage User", "Collect Feedback"], output: "Improved Product Value" },
        { name: "Founder Led Outreach Loop", type: "Organic", input: "Personal Network", steps: ["Direct Cold Message", "Product Demo Call", "Beta Signup", "Manual Support", "Referral Request"], output: "First 100 Loyal Users" }
      ]
    },
    "PMF": {
      priorities: {
        "3m": "Tập trung tối ưu hóa Retention D30 bằng cách nâng cao trải nghiệm sử dụng các tính năng lõi.",
        "6m": "Xây dựng tài liệu hướng dẫn và onboarding chuẩn hóa để tăng tỷ lệ tự phục vụ của khách hàng.",
        "12m": "Xác định được ít nhất 1 kênh marketing trả phí có hiệu quả CAC/LTV khả quan để chuẩn bị tăng trưởng."
      },
      constraints: [
        { name: "Traffic Constraint", score: 70, status: "Moderate", metric: "15k MAU", color: "var(--amber)" },
        { name: "Activation Constraint", score: 50, status: "Moderate", metric: "35% KYC Rate", color: "var(--amber)" },
        { name: "Monetization Constraint", score: 55, status: "Moderate", metric: "LTV/CAC ~ 1.5x", color: "var(--amber)" },
        { name: "Retention Constraint", score: 80, status: "Critical", metric: "Retention D30 < 22%", color: "var(--coral)" },
        { name: "Team Constraint", score: 45, status: "Low", metric: "Đủ core team", color: "var(--teal)" },
        { name: "Capital Constraint", score: 65, status: "Moderate", metric: "Runway còn 10 tháng", color: "var(--amber)" }
      ],
      growthLoops: [
        { name: "Content Value & SEO Loop", type: "Organic", input: "Search Demand", steps: ["Keyword Research", "High Quality Article", "Search Engine Rank", "Organic Visit", "Newsletter Signup"], output: "Inbound Leads" },
        { name: "Product Value Core Loop", type: "Engagement", input: "New Signup", steps: ["Quick Onboarding", "First Value Moment", "Repeat Usage", "Notification Push", "Habit Formation"], output: "High Retention" }
      ]
    },
    "Growth": {
      priorities: {
        "3m": "Tối ưu hóa LTV/CAC qua các kênh High-Intent và giảm chi phí KYC bằng cách tinh chỉnh UI/UX.",
        "6m": "Xây dựng Referral Engine và các vòng lặp Viral Loops để kích hoạt tập người dùng organic không trả phí.",
        "12m": "Mở rộng hoạt động quốc tế tại thị trường Đông Nam Á (Thái Lan & Philippines) và thiết lập phễu định danh quốc tế."
      },
      constraints: [
        { name: "Traffic Constraint", score: 65, status: "Moderate", metric: "35k MAU", color: "var(--amber)" },
        { name: "Activation Constraint", score: 85, status: "Critical", metric: "48% KYC Rate", color: "var(--coral)" },
        { name: "Monetization Constraint", score: 40, status: "Low", metric: "IEI 8.2x", color: "var(--teal)" },
        { name: "Retention Constraint", score: 70, status: "Moderate", metric: "D30 32% retention", color: "var(--amber)" },
        { name: "Team Constraint", score: 55, status: "Low", metric: "82% SLA Delivery", color: "var(--teal)" },
        { name: "Capital Constraint", score: 45, status: "Low", metric: "Cash Runway 14 tháng", color: "var(--teal)" }
      ],
      growthLoops: [
        { name: "Paid Ads Acquisition Loop", type: "Viral/Paid", input: "Paid Budget ($)", steps: ["Paid Ads Impression", "Install & Register", "KYC Completion", "First Deposit", "Re-invest Revenue"], output: "Incremental Revenue" },
        { name: "Referral & Virality Loop", type: "Viral", input: "Active Users", steps: ["Active Users Invite", "Referral Signups", "KYC Verification", "Free Token Gift", "Referrer Reward"], output: "K-Factor Growth" },
        { name: "Content Consumption Loop", type: "Organic", input: "Creative Assets", steps: ["Read Educational Post", "Learn Macro Strategy", "Execute First Trade", "Share ROI Screenshot", "Attract New Leads"], output: "Retention Rate Boost" }
      ]
    },
    "Scale": {
      priorities: {
        "3m": "Tự động hóa quy trình phân bổ ngân sách marketing qua API của các ad networks lớn.",
        "6m": "Tuyển dụng và mở rộng các bộ phận kỹ thuật, CSKH để đáp ứng lượng traffic tăng đột biến.",
        "12m": "Đạt cột mốc 500k người dùng đăng ký, tối ưu hóa hạ tầng máy chủ giảm latency."
      },
      constraints: [
        { name: "Traffic Constraint", score: 50, status: "Moderate", metric: "120k MAU", color: "var(--amber)" },
        { name: "Activation Constraint", score: 60, status: "Moderate", metric: "52% KYC Rate", color: "var(--amber)" },
        { name: "Monetization Constraint", score: 45, status: "Low", metric: "LTV/CAC 3.2x", color: "var(--teal)" },
        { name: "Retention Constraint", score: 65, status: "Moderate", metric: "Retention ổn định", color: "var(--amber)" },
        { name: "Team Constraint", score: 90, status: "Critical", metric: "Quá tải hỗ trợ kỹ thuật", color: "var(--coral)" },
        { name: "Capital Constraint", score: 80, status: "Critical", metric: "Burn rate tăng nhanh", color: "var(--coral)" }
      ],
      growthLoops: [
        { name: "Paid Performance Scaling Loop", type: "Paid", input: "Capital Infusion", steps: ["Deploy High Budget", "Ad Net Algorithms Optimization", "Scale Impressions", "High Volume Installs", "Increased FTDs"], output: "Scale Acceleration" },
        { name: "Affiliate Networks Loop", type: "Partnership", input: "Affiliates", steps: ["Partner Onboarding", "Affiliate Link Share", "Referred FTDs", "Commission Payout", "Partner Recruiting"], output: "Exponential Network Growth" }
      ]
    },
    "Expansion": {
      priorities: {
        "3m": "Khảo sát và chuẩn bị giấy phép pháp lý để thâm nhập thị trường Thái Lan & Philippines.",
        "6m": "Địa phương hóa ngôn ngữ sản phẩm, tích hợp các cổng thanh toán phổ biến tại Đông Nam Á.",
        "12m": "Thành lập văn phòng đại diện tại Thái Lan, tuyển dụng nhân sự vận hành bản địa."
      },
      constraints: [
        { name: "Traffic Constraint", score: 40, status: "Low", metric: "MAU nước ngoài thấp", color: "var(--teal)" },
        { name: "Activation Constraint", score: 75, status: "High", metric: "Rào cản thanh toán nội địa", color: "var(--coral)" },
        { name: "Monetization Constraint", score: 60, status: "Moderate", metric: "ARPU chưa đồng đều", color: "var(--amber)" },
        { name: "Retention Constraint", score: 55, status: "Low", metric: "Văn hóa dùng app khác biệt", color: "var(--teal)" },
        { name: "Team Constraint", score: 85, status: "Critical", metric: "Thiếu Leader am hiểu bản địa", color: "var(--coral)" },
        { name: "Capital Constraint", score: 70, status: "Moderate", metric: "Chi phí đầu tư ban đầu cao", color: "var(--amber)" }
      ],
      growthLoops: [
        { name: "Cross-Border Localization Loop", type: "Expansion", input: "Localized Content", steps: ["Local Social Media Buzz", "KOL Endorsement", "Local Registration", "Regional Support", "Word of Mouth"], output: "New Market Share" },
        { name: "Product Adaptation Loop", type: "Product", input: "Local Feedback", steps: ["Analyze Local Habits", "Add Regional Features", "Integrate Local Payment", "Increase Engagement", "PR Campaigns"], output: "Local Market Penetration" }
      ]
    },
    "Mature": {
      priorities: {
        "3m": "Tối ưu hóa chi phí máy chủ, cắt giảm các kênh marketing không mang lại ROI dương.",
        "6m": "Triển khai chương trình khách hàng thân thiết VIP (Whale VIP Club) để giữ chân tệp tạo doanh thu chính.",
        "12m": "Tập trung nâng cao biên lợi nhuận ròng (Net Profit Margin) lên trên 35%."
      },
      constraints: [
        { name: "Traffic Constraint", score: 30, status: "Low", metric: "Tốc độ tăng trưởng MAU chậm", color: "var(--teal)" },
        { name: "Activation Constraint", score: 45, status: "Low", metric: "KYC đã bão hòa", color: "var(--teal)" },
        { name: "Monetization Constraint", score: 90, status: "Critical", metric: "Whale Churn rủi ro lớn", color: "var(--coral)" },
        { name: "Retention Constraint", score: 85, status: "Critical", metric: "Churn Rate tăng nhẹ", color: "var(--coral)" },
        { name: "Team Constraint", score: 40, status: "Low", metric: "Vận hành trơn tru", color: "var(--teal)" },
        { name: "Capital Constraint", score: 35, status: "Low", metric: "Dòng tiền dương tốt", color: "var(--teal)" }
      ],
      growthLoops: [
        { name: "Kaizen Optimization Loop", type: "Operational", input: "Waste Identification", steps: ["Analyze Costs", "Negotiate Vendor Rates", "Refactor System Code", "Reduce COGS", "Improve Margin"], output: "Higher Free Cash Flow" },
        { name: "Whale VIP Retention Loop", type: "Loyalty", input: "VIP Segment", steps: ["Direct Account Manager", "Exclusive Investment Deals", "High Value Trading Incentives", "VIP Community Dinner", "High Value Assets Locked"], output: "LTV Maximization" }
      ]
    }
  };

  let strategyInitialized = false;
  let activeStrategySubtab = "gs-subtab-board";

  window.initGrowthStrategyTab = function() {
    if (!strategyInitialized) {
      // Bind sub-tabs selector
      const container = document.getElementById("growth-strategy-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeStrategySubtab = target;
            
            document.querySelectorAll(".growth-strategy-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderGrowthStrategySubpanes();
          });
        });
      }

      // Bind Stage selector
      const stageSelect = document.getElementById("gs-stage-selector");
      if (stageSelect) {
        stageSelect.addEventListener("change", () => {
          const val = stageSelect.value;
          if (window.db && window.db.growthStrategy) {
            window.db.growthStrategy.currentStage = val;
            
            // Sync with dynamic strategy database
            const stageData = stageStrategyDatabase[val];
            if (stageData) {
              window.db.growthStrategy.priorities = stageData.priorities;
              window.db.growthStrategy.constraints = stageData.constraints;
              window.db.growthStrategy.growthLoops = stageData.growthLoops;
            }

            // Update UI indicators
            document.querySelectorAll(".stage-item").forEach(item => {
              item.classList.remove("active");
              item.style.background = "rgba(255,255,255,0.03)";
              item.style.border = "1px solid rgba(255,255,255,0.05)";
              item.style.boxShadow = "none";
              item.style.opacity = "0.5";
              const labelEl = item.querySelector("div");
              if (labelEl) labelEl.style.color = "var(--text-muted)";
            });

            const activeItem = document.getElementById(`stage-${val.toLowerCase().replace("-", "")}`);
            if (activeItem) {
              activeItem.classList.add("active");
              activeItem.style.background = "rgba(139, 92, 246, 0.15)";
              activeItem.style.border = "1px solid var(--purple)";
              activeItem.style.boxShadow = "0 0 10px rgba(139, 92, 246, 0.2)";
              activeItem.style.opacity = "1";
              const labelEl = activeItem.querySelector("div");
              if (labelEl) labelEl.style.color = "var(--purple-light)";
            }

            // Update Active Stage badge to uppercase
            const activeBadge = document.getElementById("gs-active-stage-badge");
            if (activeBadge) {
              activeBadge.textContent = `ACTIVE STAGE: ${val.toUpperCase()}`;
            }

            // Update weights dynamically based on stage
            const stageWeights = {
              "Pre-PMF": { growth: 0.35, profitability: 0.05, retention: 0.40, capitalEfficiency: 0.10, risk: 0.10 },
              "PMF": { growth: 0.20, profitability: 0.10, retention: 0.50, capitalEfficiency: 0.10, risk: 0.10 },
              "Growth": { growth: 0.25, profitability: 0.20, retention: 0.20, capitalEfficiency: 0.20, risk: 0.15 },
              "Scale": { growth: 0.35, profitability: 0.15, retention: 0.15, capitalEfficiency: 0.25, risk: 0.10 },
              "Expansion": { growth: 0.30, profitability: 0.15, retention: 0.15, capitalEfficiency: 0.25, risk: 0.15 },
              "Mature": { growth: 0.10, profitability: 0.40, retention: 0.20, capitalEfficiency: 0.20, risk: 0.10 }
            };
            const weights = stageWeights[val];
            if (weights && window.db.configs && window.db.configs.weights) {
              window.db.configs.weights.growth = weights.growth;
              window.db.configs.weights.profitability = weights.profitability;
              window.db.configs.weights.retention = weights.retention;
              window.db.configs.weights.capitalEfficiency = weights.capitalEfficiency;
              window.db.configs.weights.risk = weights.risk;
              
              // Recalculate health scores and customer economics
              try { calculateHealthScores(); } catch(e) {}
              try { recalculateGrowthEconomics(); } catch(e) {}
            }

            // Explanations
            const explanations = {
              "Pre-PMF": "Doanh nghiệp tập trung phỏng vấn khách hàng, xây dựng MVP và thử nghiệm các kênh phân phối nhỏ để tìm kiếm sản phẩm phù hợp thị trường.",
              "PMF": "Sản phẩm đã phù hợp thị trường. Tập trung tối ưu hóa Retention định kỳ và chuẩn bị các kênh Acquisition có khả năng mở rộng.",
              "Growth": "Doanh nghiệp tập trung tối ưu hóa các phễu chuyển đổi hiện có, cải thiện hiệu năng LTV/CAC và chuẩn bị các vòng lặp Referral lan truyền để tăng trưởng phi tuyến tính.",
              "Scale": "Mở rộng tối đa ngân sách marketing, tự động hóa quy trình phối hợp và tuyển dụng nhân lực mở rộng quy mô sản xuất.",
              "Expansion": "Thâm nhập các phân khúc thị trường mới, phát triển tính năng mới và mở rộng ra thị trường nước ngoài (ASEAN).",
              "Mature": "Tối ưu hóa lợi nhuận ròng, Kaizen quy trình vận hành và khai thác tối đa tệp khách hàng trung thành Whale VIP."
            };
            const expl = explanations[val] || "";
            const stageExplEl = document.getElementById("gs-stage-explanation");
            if (stageExplEl) stageExplEl.textContent = expl;

            // Re-render panels with new data
            renderGrowthStrategySubpanes();

            addAuditLogEntry(currentPersona, `Thay đổi đánh giá giai đoạn tăng trưởng`, `Giai đoạn mới: ${val}`);
          }
        });
      }

      // Bind Stage grid items click handlers
      document.querySelectorAll(".stage-item").forEach(item => {
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          const id = item.id;
          let val = "Growth";
          if (id === "stage-prepmf") val = "Pre-PMF";
          else if (id === "stage-pmf") val = "PMF";
          else if (id === "stage-growth") val = "Growth";
          else if (id === "stage-scale") val = "Scale";
          else if (id === "stage-expansion") val = "Expansion";
          else if (id === "stage-mature") val = "Mature";

          if (stageSelect) {
            stageSelect.value = val;
            stageSelect.dispatchEvent(new Event("change"));
          }
        });
      });

      // Initialize defaults
      if (stageSelect) {
        stageSelect.dispatchEvent(new Event("change"));
      }

      // Bind AI Recommendation Apply Buttons
      const acqBtn = document.getElementById("copilot-apply-acq");
      if (acqBtn) {
        acqBtn.addEventListener("click", () => {
          if (window.db && window.db.campaigns) {
            // Shift $3000 spend from Meta Ads to Google Ads (corrected channel name & spend properties)
            const metaCampaign = window.db.campaigns.find(c => c.Channel === "Meta Ads");
            const googleCampaign = window.db.campaigns.find(c => c.Channel === "Google Ads");
            if (metaCampaign && googleCampaign) {
              metaCampaign.Spend = Math.max(0, metaCampaign.Spend - 3000);
              googleCampaign.Spend += 3000;
              // Recalculate campaign ROI and CAC metrics
              metaCampaign.CAC = metaCampaign.KYC > 0 ? metaCampaign.Spend / metaCampaign.KYC : 0;
              metaCampaign.ROI = metaCampaign.Spend > 0 ? (metaCampaign.Revenue - metaCampaign.Spend) / metaCampaign.Spend : 0;
              googleCampaign.CAC = googleCampaign.KYC > 0 ? googleCampaign.Spend / googleCampaign.KYC : 0;
              googleCampaign.ROI = googleCampaign.Spend > 0 ? (googleCampaign.Revenue - googleCampaign.Spend) / googleCampaign.Spend : 0;
              
              // Recalculate overall health
              try { calculateHealthScores(); } catch(e) {}
              // Force campaign performance table render
              try { renderCapitalTab(); } catch(e) {}
              
              addAuditLogEntry(currentPersona, "Áp dụng khuyến nghị AI: Dịch chuyển $3k ngân sách Meta -> Google Ads", "Meta Spend: $" + metaCampaign.Spend + ", Google Spend: $" + googleCampaign.Spend);
              showToast("Đã áp dụng thành công: Dịch chuyển $3,000 ngân sách từ Meta Ads sang Google Ads. Các báo cáo phân bổ và tài chính đã được cập nhật!", "success");
              window.switchTab("tab-customer-intel", "acq-subtab-performance");
            }
          }
        });
      }

      const contentBtn = document.getElementById("copilot-apply-content");
      if (contentBtn) {
        contentBtn.addEventListener("click", () => {
          if (window.db && window.db.contentPlan) {
            const existing = window.db.contentPlan.find(p => p.Touchpoint === "TikTok Video Ad" && p.Angle.includes("Passive Income"));
            if (!existing) {
              window.db.contentPlan.push({
                Touchpoint: "TikTok Video Ad",
                Angle: "Passive Income (How to earn $100/day)",
                Target: "Core Casual",
                CTR: "5.8%",
                CVR: "35%",
                CPA: "$7.20",
                Status: "Đang chạy (Active)",
                Rating: "Tối ưu hóa LTV (+30% Sản lượng)"
              });
              try { renderContentPlan(); } catch(e) {}
            }
          }
          addAuditLogEntry(currentPersona, "Áp dụng khuyến nghị AI: Tăng 30% sản xuất nội dung 'Passive Income'", "Tỷ trọng content tối ưu hóa LTV");
          showToast("Đã áp dụng thành công: Tăng tỷ trọng sản xuất content 'Passive Income' thêm 30% trong Content Plan của bộ phận Content.", "success");
          window.switchTab("tab-content");
        });
      }

      const retBtn = document.getElementById("copilot-apply-ret");
      if (retBtn) {
        retBtn.addEventListener("click", () => {
          if (window.db && window.db.lifecycleAutomation && window.db.lifecycleAutomation.campaigns) {
            const existing = window.db.lifecycleAutomation.campaigns.find(c => c.id === "AUT-005");
            if (!existing) {
              window.db.lifecycleAutomation.campaigns.push({
                id: "AUT-005",
                name: "Drip Activation (Email + Push)",
                trigger: "Đăng ký chưa trade ngày 3 & 5",
                steps: 2,
                openRate: 48.0,
                ctr: 15.2,
                cvr: 9.5,
                revenue: 9800
              });
              try { renderExperimentationSubpanes(); } catch(e) {}
            }
          }
          addAuditLogEntry(currentPersona, "Áp dụng khuyến nghị AI: Kích hoạt drip email/push ngày 3 & 5 cho người dùng chưa trade", "Mục tiêu: Giảm 45% churn rate");
          showToast("Đã áp dụng thành công: Thiết lập và kích hoạt tự động chuỗi Email + Push Notification vào ngày thứ 3 và thứ 5 dành cho tệp người dùng đăng ký chưa phát sinh giao dịch.", "success");
          window.switchTab("tab-experimentation", "ex-subtab-lifecycle");
        });
      }

      const prodBtn = document.getElementById("copilot-apply-prod");
      if (prodBtn) {
        prodBtn.addEventListener("click", () => {
          if (window.db && window.db.experimentation && window.db.experimentation.pipeline) {
            const exp = window.db.experimentation.pipeline.find(e => e.id === "EXP-101");
            if (exp) {
              exp.status = "Execution";
              try { renderExperimentationSubpanes(); } catch(e) {}
            }
          }
          addAuditLogEntry(currentPersona, "Áp dụng khuyến nghị AI: Khởi chạy EXP-101 A/B Test giao diện KYC Android", "Tỷ lệ KYC mục tiêu: > 55%");
          showToast("Đã áp dụng thành công: Thiết lập A/B Test kiểm thử mẫu KYC rút gọn (EXP-101) cho hệ điều hành Android. Đã đẩy vào Backlog kiểm thử.", "success");
          window.switchTab("tab-experimentation", "ex-subtab-pipeline");
        });
      }

      strategyInitialized = true;
    }
    
    renderGrowthStrategySubpanes();
  }

  function renderGrowthStrategySubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("growth-strategy-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeStrategySubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".growth-strategy-subpane").forEach(pane => {
      pane.style.display = pane.id === activeStrategySubtab ? "block" : "none";
    });

    if (activeStrategySubtab === "gs-subtab-board") {
      const data = (window.db && window.db.growthStrategy) || {};
      
      // Render priorities
      if (data.priorities) {
        const p3m = document.getElementById("gs-priority-3m");
        if (p3m) p3m.textContent = data.priorities["3m"] || "";
        const p6m = document.getElementById("gs-priority-6m");
        if (p6m) p6m.textContent = data.priorities["6m"] || "";
        const p12m = document.getElementById("gs-priority-12m");
        if (p12m) p12m.textContent = data.priorities["12m"] || "";
      }

      // Render Constraints
      const constraintsList = document.getElementById("gs-constraints-list");
      if (constraintsList && data.constraints) {
        constraintsList.innerHTML = "";
        data.constraints.forEach(c => {
          const row = document.createElement("div");
          row.style.marginBottom = "8px";
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:var(--text3); margin-bottom:4px;">
              <span>${c.name} (${c.metric})</span>
              <span class="badge" style="background:${c.color}22; color:${c.color}; font-size: 11px; padding:1px 5px;">Score: ${c.score} | ${c.status}</span>
            </div>
            <div style="background:rgba(255,255,255,0.05); height:8px; border-radius:4px; overflow:hidden;">
              <div style="width:${c.score}%; height:100%; background:${c.color}; border-radius:4px;"></div>
            </div>
          `;
          constraintsList.appendChild(row);
        });
      }

      // Render Growth Loops
      const loopsList = document.getElementById("gs-loops-list");
      if (loopsList && data.growthLoops) {
        loopsList.innerHTML = "";
        data.growthLoops.forEach(l => {
          const item = document.createElement("div");
          item.style.background = "rgba(255,255,255,0.02)";
          item.style.border = "1px solid rgba(255,255,255,0.05)";
          item.style.borderRadius = "8px";
          item.style.padding = "10px 12px";
          item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="font-size:11.5px; color:var(--purple-light);">${l.name}</strong>
              <span style="font-size: 11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">${l.type}</span>
            </div>
            <div style="font-size: 11px; color:var(--text2); line-height:1.45;">
              <span style="color:var(--text-muted);">Input:</span> ${l.input} <br/>
              <span style="color:var(--cyan); font-weight:800;">Loop:</span> ${l.steps.join(" &rarr; ")} <br/>
              <span style="color:var(--teal); font-weight:800;">Output:</span> ${l.output}
            </div>
          `;
          loopsList.appendChild(item);
        });
      }
    } else if (activeStrategySubtab === "gs-subtab-copilot") {
      renderCopilotRecs();
    } else if (activeStrategySubtab === "gs-subtab-warning") {
      renderEarlyWarnings();
    }
    lucide.createIcons();
  }

  // AI Growth Copilot — rules engine over LIVE db data (was 4 hardcoded cards)
  function generateCopilotRecommendations() {
    const recs = [];
    // 1. Acquisition: worst vs best paid-channel CAC
    let worst = null, best = null;
    db.campaigns.forEach(c => {
      if (c.KYC > 0) { const cac = c.Spend / c.KYC;
        if (!worst || cac > worst.cac) worst = { ch: c.Channel, cac };
        if (!best || cac < best.cac) best = { ch: c.Channel, cac };
      }
    });
    if (worst && best && worst.ch !== best.ch) {
      const delta = Math.round((worst.cac - best.cac) / best.cac * 100);
      recs.push({ rgb: "6,182,212", icon: "trending-up", area: "Acquisition Optimization", badge: `CAC chênh ${delta}%`,
        text: `CAC của <strong>${worst.ch}</strong> ($${worst.cac.toFixed(2)}) cao hơn <strong>${best.ch}</strong> ($${best.cac.toFixed(2)}) tới ${delta}%. Đề xuất dịch ngân sách từ ${worst.ch} sang ${best.ch}.`, apply: "acq" });
    }
    // 2. Product: biggest funnel dropoff
    const aj = (db.productGrowth && db.productGrowth.activationJourney) || [];
    let drop = null; aj.forEach(s => { if (s.dropoffPct != null && (!drop || s.dropoffPct > drop.d)) drop = { step: s.step, d: s.dropoffPct }; });
    if (drop) recs.push({ rgb: "16,185,129", icon: "layers", area: "Product UI Optimization", badge: `Drop ${drop.d}%`,
      text: `Bước <strong>${drop.step}</strong> đang rớt ${drop.d}% — điểm nghẽn lớn nhất của phễu kích hoạt. Đề xuất chạy <strong>EXP-101</strong> (tách KYC 2 bước) + A/B test.`, apply: "prod" });
    // 3. Retention: latest cohort D7 churn
    const cohorts = (db.cohortMatrix || []).filter(c => c.d7 != null);
    if (cohorts.length) { const c = cohorts[cohorts.length - 1]; const churn7 = (100 - c.d7).toFixed(0);
      recs.push({ rgb: "245,158,11", icon: "mail", area: "Retention Automation", badge: `Churn D7 ${churn7}%`,
        text: `Cohort gần nhất chỉ giữ ${c.d7}% sau 7 ngày (churn ~${churn7}%). Đề xuất bật chuỗi Email + Push onboarding ngày 3 & 5.`, apply: "ret" }); }
    // 4. Virality: computed k-factor
    const rd = db.referralData || {}; const active = (rd.loopsList || []).filter(l => l.status === "Active");
    const avgConv = active.length ? active.reduce((a, l) => a + (l.conversionRate || 0), 0) / active.length : 0;
    const k = (rd.inviteRate || 0) * (avgConv / 100);
    recs.push({ rgb: "139,92,246", icon: "share-2", area: "Virality / Referral", badge: `k = ${k.toFixed(2)}`,
      text: `Hệ số lan truyền k = ${k.toFixed(2)} (${k < 1 ? "dưới ngưỡng viral 1.0" : "viral"}). Đề xuất tăng thưởng referral và kích hoạt lại loop đang Paused để nâng k.`, apply: "loop" });
    return recs;
  }

  function renderCopilotRecs() {
    const host = document.getElementById("gs-copilot-list");
    if (!host) return;
    const recs = generateCopilotRecommendations();
    host.innerHTML = "";
    recs.forEach(r => {
      const div = document.createElement("div");
      div.style.cssText = `background:rgba(${r.rgb},0.06); border:1px solid rgba(${r.rgb},0.22); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;`;
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:rgb(${r.rgb}); font-size:12.5px;"><i data-lucide="${r.icon}" style="width:14px;height:14px;display:inline;vertical-align:middle;"></i> ${r.area}</strong>
          <span class="badge test" style="font-size:11px; padding:2px 6px;">${r.badge}</span>
        </div>
        <p style="font-size:11px; margin:0; line-height:1.5; color:var(--text2);">${r.text}</p>
        <button class="btn btn-secondary btn-small" onclick="applyCopilotRec('${r.apply}')" style="align-self:flex-end; font-size:11px; background:rgba(${r.rgb},0.15); border-color:rgba(${r.rgb},0.3); color:rgb(${r.rgb});"><i data-lucide="check"></i> Áp dụng Đề xuất</button>
      `;
      host.appendChild(div);
    });
    lucide.createIcons();
  }

  window.applyCopilotRec = (type) => {
    if (typeof checkCustomizePermission === "function" && !checkCustomizePermission("áp dụng đề xuất AI Copilot")) return;
    if (type === "acq" && db.campaigns) {
      const meta = db.campaigns.find(c => c.Channel === "Meta Ads"), google = db.campaigns.find(c => c.Channel === "Google Ads");
      if (meta && google) {
        meta.Spend = Math.max(0, meta.Spend - 3000); google.Spend += 3000;
        meta.CAC = meta.KYC > 0 ? meta.Spend / meta.KYC : 0; meta.ROI = meta.Spend > 0 ? (meta.Revenue - meta.Spend) / meta.Spend : 0;
        google.CAC = google.KYC > 0 ? google.Spend / google.KYC : 0; google.ROI = google.Spend > 0 ? (google.Revenue - google.Spend) / google.Spend : 0;
      }
      showToast("Đã dịch $3,000 ngân sách từ Meta Ads sang Google Ads.", "success");
      addAuditLogEntry(currentPersona, "Áp dụng đề xuất Copilot: dịch ngân sách Meta → Google", "Cập nhật CAC/ROI chiến dịch");
    } else if (type === "prod") {
      showToast("Đã ưu tiên EXP-101 (tối ưu KYC) vào pipeline.", "success");
      addAuditLogEntry(currentPersona, "Áp dụng đề xuất Copilot: ưu tiên EXP-101", "Đẩy thí nghiệm tối ưu KYC");
    } else if (type === "ret") {
      showToast("Đã kích hoạt chuỗi lifecycle onboarding ngày 3 & 5.", "success");
      addAuditLogEntry(currentPersona, "Áp dụng đề xuất Copilot: bật automation retention", "Kích hoạt email + push");
    } else {
      showToast("Đã ghi nhận đề xuất nâng k-factor vào backlog tăng trưởng.", "success");
      addAuditLogEntry(currentPersona, "Áp dụng đề xuất Copilot: nâng k-factor referral", "Thêm vào backlog");
    }
    renderCopilotRecs();
  };

  // Early Warning Radar — computed from live metrics vs db.configs.thresholds (was 4 static cards)
  function renderEarlyWarnings() {
    const host = document.getElementById("gs-warning-grid");
    if (!host) return;
    const t = db.configs.thresholds || {};
    const stats = db.getAggregatedCampaigns();
    const daily = (db.getDailyRevenue ? db.getDailyRevenue(execTimeframeDays) : []).map(d => d.Revenue);
    const customers = getFilteredCustomers();
    const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

    let mom = 0;
    if (daily.length >= 4) { const h = Math.floor(daily.length / 2); const a1 = avg(daily.slice(0, h)), a2 = avg(daily.slice(h)); mom = a1 > 0 ? Math.round((a2 - a1) / a1 * 100) : 0; }
    let worst = null; getFilteredCampaigns().forEach(c => { if (c.KYC > 0) { const cac = c.Spend / c.KYC; if (!worst || cac > worst.cac) worst = { ch: c.Channel, cac }; } });
    const cacSpike = worst && stats.CAC > 0 ? Math.round((worst.cac - stats.CAC) / stats.CAC * 100) : 0;
    const totalRev = customers.reduce((a, c) => a + (c.Revenue || 0), 0);
    const whaleRev = customers.filter(c => c.Segment === "Whale").reduce((a, c) => a + (c.Revenue || 0), 0);
    const whale = totalRev > 0 ? Math.round(whaleRev / totalRev * 1000) / 10 : 0;
    const cvr = stats.Install > 0 ? stats.KYC / stats.Install * 100 : 0;
    const tcvr = ((db.configs.benchmarks && db.configs.benchmarks.targetCvr) || 0.35) * 100;

    const cards = [
      { label: "Đà doanh thu", value: (mom >= 0 ? "+" : "") + mom + "%", sub: mom < 0 ? `Giảm so với nửa đầu kỳ (ngưỡng -${t.revenueDecreasePct}%)` : "Tăng so với nửa đầu kỳ", danger: mom < -(t.revenueDecreasePct || 20), warn: mom < 0 },
      { label: "CAC Spike", value: (cacSpike >= 0 ? "+" : "") + cacSpike + "%", sub: `${worst ? worst.ch : ""} vs CAC TB (ngưỡng +${t.cacIncreasePct}%)`, danger: cacSpike >= (t.cacIncreasePct || 30), warn: cacSpike > 0 },
      { label: "Whale Concentration", value: whale + "%", sub: `Tỷ trọng doanh thu Whale (ngưỡng ${t.whaleConcentrationPct}%)`, danger: whale > (t.whaleConcentrationPct || 40), warn: whale > (t.whaleConcentrationPct || 40) - 10 },
      { label: "CVR Install→KYC", value: cvr.toFixed(1) + "%", sub: `Mục tiêu ${tcvr.toFixed(0)}%`, danger: cvr < tcvr * 0.85, warn: cvr < tcvr }
    ];
    const col = (c) => c.danger ? "var(--coral)" : c.warn ? "var(--amber)" : "var(--teal)";
    const rgb = (c) => c.danger ? "220,38,38" : c.warn ? "245,158,11" : "16,185,129";
    host.innerHTML = cards.map(c => `
      <div style="background:rgba(${rgb(c)},0.05); border:1px solid rgba(${rgb(c)},0.15); border-radius:8px; padding:14px;">
        <div style="font-size:11px; color:var(--text3); font-weight:800; text-transform:uppercase;">${c.label}</div>
        <div style="font-size:22px; font-weight:900; color:${col(c)}; margin:6px 0;">${c.value}</div>
        <div style="font-size:11px; color:var(--text-muted);">${c.sub}</div>
      </div>`).join("");
  }

  // -------------------------------------------------------------
  // TAB 10: MARKET & COMPETITOR INTEL
  // -------------------------------------------------------------
  let marketCompetitorInitialized = false;
  let activeMarketSubtab = "mc-subtab-tam";

  window.initMarketCompetitorTab = function() {
    if (!marketCompetitorInitialized) {
      const container = document.getElementById("market-competitor-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeMarketSubtab = target;
            
            document.querySelectorAll(".market-competitor-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderMarketCompetitorSubpanes();
          });
        });
      }

      // Bind Market Trends simulator button
      const mcBtnAddMockTrend = document.getElementById("mc-btn-add-mock-trend");
      if (mcBtnAddMockTrend) {
        mcBtnAddMockTrend.onclick = () => {
          const mockTrends = [
            { term: "Lãi suất tiết kiệm online tốt nhất", interest: Math.floor(60 + Math.random() * 40), trend: `+${Math.floor(5 + Math.random() * 30)}% MoM`, status: "Rising" },
            { term: "App đào coin miễn phí uy tín", interest: Math.floor(40 + Math.random() * 60), trend: `+${Math.floor(10 + Math.random() * 40)}% MoM`, status: "Spike" },
            { term: "Khóa học trading cho người mới bắt đầu", interest: Math.floor(50 + Math.random() * 30), trend: "+3% MoM", status: "Stable" },
            { term: "Lọc cổ phiếu theo phương pháp CANSLIM", interest: Math.floor(70 + Math.random() * 30), trend: `+${Math.floor(8 + Math.random() * 20)}% MoM`, status: "Rising" }
          ];
          const newTrend = mockTrends[Math.floor(Math.random() * mockTrends.length)];
          db.marketIntel.searchTrends.unshift(newTrend);
          addAuditLogEntry(currentPersona, `Thêm xu hướng tìm kiếm giả lập: "${newTrend.term}"`, `Độ quan tâm: ${newTrend.interest}, Trạng thái: ${newTrend.status}`);
          showToast(`Đã thêm xu hướng tìm kiếm "${newTrend.term}" thành công!`, "success");
          renderMarketCompetitorSubpanes();
        };
      }

      // Bind Competitors simulator button
      const mcBtnAddMockCompetitor = document.getElementById("mc-btn-add-mock-competitor");
      if (mcBtnAddMockCompetitor) {
        mcBtnAddMockCompetitor.onclick = () => {
          if (!checkCustomizePermission("thêm đối thủ cạnh tranh mới")) return;

          showCustomPrompt("Thêm Đối Thủ Mới", "Nhập tên đối thủ cạnh tranh:", "", (name) => {
            if (!name) return;
            showCustomPrompt("Chi phí quảng cáo", "Ngân sách ước tính hàng tháng (USD):", "15000", (spendStr) => {
              if (spendStr === null) return;
              const estSpend = parseInt(spendStr, 10) || 15000;
              showCustomPrompt("Creative Test", "Số lượng Creative test chạy thử:", "10", (creativesStr) => {
                if (creativesStr === null) return;
                const creativesCount = parseInt(creativesStr, 10) || 10;
                showCustomPrompt("Ưu đãi chính", "Chương trình ưu đãi/khuyến mãi chính:", "Trải nghiệm miễn phí", (offer) => {
                  if (offer === null) return;
                  showCustomPrompt("Mức giá / Phí", "Mức phí/Pricing Model:", "Phí cố định", (pricing) => {
                    if (pricing === null) return;

                    const newComp = {
                      name: name.trim(),
                      estSpend: estSpend,
                      creativesCount: creativesCount,
                      offer: offer.trim(),
                      pricing: pricing.trim(),
                      landingPage: "https://growthapp.vn"
                    };
                    db.competitorIntel.competitors.unshift(newComp);
                    addAuditLogEntry(currentPersona, `Thêm đối thủ cạnh tranh mới: "${newComp.name}"`, `Ngân sách ước tính: $${newComp.estSpend}`);
                    showToast(`Đã thêm đối thủ cạnh tranh "${newComp.name}" thành công!`, "success");
                    renderMarketCompetitorSubpanes();
                  });
                });
              });
            });
          });
        };
      }

      window.editCompetitor = (originalName) => {
        if (!checkCustomizePermission("chỉnh sửa đối thủ cạnh tranh")) return;
        const item = db.competitorIntel.competitors.find(c => c.name === originalName);
        if (!item) return;

        showCustomPrompt("Chỉnh sửa Tên Đối Thủ", "Nhập tên mới của đối thủ:", item.name, (newName) => {
          if (newName === null) return;
          if (newName.trim() === "") {
            showToast("Tên đối thủ không được để trống!", "warning");
            return;
          }
          showCustomPrompt("Chỉnh sửa Chi phí", "Nhập ngân sách ước tính hàng tháng (USD):", item.estSpend.toString(), (newSpendStr) => {
            if (newSpendStr === null) return;
            const newSpend = parseInt(newSpendStr, 10);
            if (isNaN(newSpend) || newSpend < 0) {
              showToast("Ngân sách phải là số dương!", "warning");
              return;
            }
            showCustomPrompt("Chỉnh sửa Creative Test", "Nhập số lượng Creative Test:", item.creativesCount.toString(), (newCreativesStr) => {
              if (newCreativesStr === null) return;
              const newCreatives = parseInt(newCreativesStr, 10);
              if (isNaN(newCreatives) || newCreatives < 0) {
                showToast("Số lượng creative phải là số dương!", "warning");
                return;
              }
              showCustomPrompt("Chỉnh sửa Ưu đãi chính", "Nhập ưu đãi chính:", item.offer, (newOffer) => {
                if (newOffer === null) return;
                showCustomPrompt("Chỉnh sửa Mức giá / Phí", "Nhập mức giá / phí:", item.pricing, (newPricing) => {
                  if (newPricing === null) return;

                  item.name = newName.trim();
                  item.estSpend = newSpend;
                  item.creativesCount = newCreatives;
                  item.offer = newOffer.trim();
                  item.pricing = newPricing.trim();

                  addAuditLogEntry(currentPersona, `Chỉnh sửa đối thủ cạnh tranh: "${originalName}"`, `Tên mới: "${item.name}", Spend: $${item.estSpend}`);
                  showToast(`Đã chỉnh sửa thông tin đối thủ cạnh tranh thành công!`, "success");
                  renderMarketCompetitorSubpanes();
                  refreshActiveDashboardViews();
                });
              });
            });
          });
        });
      };

      window.deleteCompetitor = (name) => {
        if (!checkCustomizePermission("xóa đối thủ cạnh tranh")) return;
        const idx = db.competitorIntel.competitors.findIndex(c => c.name === name);
        if (idx === -1) return;

        const confirmed = (typeof confirm === "function") ? confirm(`Bạn có chắc chắn muốn xóa đối thủ "${name}" không?`) : true;
        if (confirmed) {
          db.competitorIntel.competitors.splice(idx, 1);
          addAuditLogEntry(currentPersona, `Xóa đối thủ cạnh tranh: "${name}"`, `Người thực hiện: ${currentPersona}`);
          showToast(`Đã xóa đối thủ cạnh tranh "${name}" thành công!`, "success");
          renderMarketCompetitorSubpanes();
          refreshActiveDashboardViews();
        }
      };
      
      marketCompetitorInitialized = true;
    }
    renderMarketCompetitorSubpanes();
  }

  function renderMarketCompetitorSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("market-competitor-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeMarketSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".market-competitor-subpane").forEach(pane => {
      pane.style.display = pane.id === activeMarketSubtab ? "block" : "none";
    });

    if (activeMarketSubtab === "mc-subtab-tam") {
      const mData = (window.db && window.db.marketIntel) || {};
      
      // Render TAM/SAM/SOM
      if (mData.tam) {
        const tamValEl = document.getElementById("mc-tam-val");
        if (tamValEl) tamValEl.textContent = "$" + mData.tam.toLocaleString();
      }
      if (mData.sam) {
        const samValEl = document.getElementById("mc-sam-val");
        if (samValEl && mData.tam) {
          const samPct = ((mData.sam / mData.tam) * 100).toFixed(1);
          samValEl.textContent = "$" + mData.sam.toLocaleString() + " (" + samPct + "%)";
          const samBarEl = document.getElementById("mc-sam-bar");
          if (samBarEl) samBarEl.style.width = samPct + "%";
        }
      }
      if (mData.som) {
        const somValEl = document.getElementById("mc-som-val");
        if (somValEl && mData.tam) {
          const somPct = ((mData.som / mData.tam) * 100).toFixed(1);
          somValEl.textContent = "$" + mData.som.toLocaleString() + " (" + somPct + "%)";
          const somBarEl = document.getElementById("mc-som-bar");
          if (somBarEl) somBarEl.style.width = somPct + "%";
        }
      }

      // Trends Table
      const trendsTable = document.getElementById("mc-trends-table");
      if (trendsTable && mData.searchTrends) {
        trendsTable.innerHTML = "";
        mData.searchTrends.forEach(t => {
          const tr = document.createElement("tr");
          let trendClass = t.status === "Rising" || t.status === "Spike" ? "kpi-trend up" : "kpi-trend neutral";
          tr.innerHTML = `
            <td><strong>${t.term}</strong></td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="background:rgba(255,255,255,0.05); width:60px; height:6px; border-radius:3px; overflow:hidden;">
                  <div style="width:${t.interest}%; height:100%; background:var(--cyan); border-radius:3px;"></div>
                </div>
                <span>${t.interest}/100</span>
              </div>
            </td>
            <td><span class="${trendClass}">${t.trend}</span></td>
            <td><span class="badge ${t.status === 'Rising' ? 'optimize' : t.status === 'Spike' ? 'stop' : 'scale'}" style="font-size: 11px; padding:1px 5px;">${t.status}</span></td>
          `;
          trendsTable.appendChild(tr);
        });
      }

      // ASEAN Countries Opportunity Matrix
      const countriesTable = document.getElementById("mc-countries-table");
      if (countriesTable && mData.countryOpportunities) {
        countriesTable.innerHTML = "";
        mData.countryOpportunities.forEach(c => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${c.country}</strong></td>
            <td>$${c.marketSize.toLocaleString()}</td>
            <td>$${c.cac.toFixed(2)}</td>
            <td>$${c.revenuePotential.toLocaleString()}</td>
            <td><span class="kpi-trend up">${c.growthRate}</span></td>
            <td><span class="badge ${c.rank === 1 ? 'optimize' : c.rank === 2 ? 'scale' : 'scale'}" style="font-size: 11px; padding:2px 6px;">Priority #${c.rank}</span></td>
          `;
          countriesTable.appendChild(tr);
        });
      }
    } else if (activeMarketSubtab === "mc-subtab-tracker") {
      const cData = (window.db && window.db.competitorIntel) || {};

      // Deep competitor analysis card (was defined but never called -> empty table)
      try { renderCompetitorAnalysis(); } catch (e) { console.error("Error in renderCompetitorAnalysis:", e); }

      // Competitors tracker list
      const competitorsList = document.getElementById("mc-competitors-list");
      if (competitorsList && cData.competitors) {
        competitorsList.innerHTML = "";
        cData.competitors.forEach(c => {
          const escapedName = c.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>$${c.estSpend.toLocaleString()}</td>
            <td>${c.creativesCount} video/image ads</td>
            <td><span style="color:var(--cyan); font-weight:700;">${c.offer}</span></td>
            <td>${c.pricing}</td>
            <td>
              <div style="display:flex; justify-content:center; gap:4px;">
                <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px;" onclick="window.editCompetitor('${escapedName}')" title="Sửa đối thủ">
                  <i data-lucide="edit-3" style="width:10px; height:10px;"></i>
                </button>
                <button class="btn btn-secondary btn-small" style="padding:2px 4px; font-size:11px; display:inline-flex; align-items:center; height:20px; color:var(--coral);" onclick="window.deleteCompetitor('${escapedName}')" title="Xóa đối thủ">
                  <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
                </button>
              </div>
            </td>
          `;
          competitorsList.appendChild(tr);
        });
      }

      // Share of Voice
      const sovTable = document.getElementById("mc-sov-table");
      if (sovTable && cData.shareOfVoice) {
        sovTable.innerHTML = "";
        cData.shareOfVoice.forEach(s => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${s.channel}</strong></td>
            <td style="color:var(--purple-light); font-weight:800;">${s.internalShare}%</td>
            <td>${s.alphaBrokerShare}%</td>
            <td>${s.zenithShare || s.betaWalletShare || 0}%</td>
            <td>${s.othersShare}%</td>
          `;
          sovTable.appendChild(tr);
        });
      }
    } else if (activeMarketSubtab === "mc-subtab-swot") {
      const swot = (window.db && window.db.competitorIntel && window.db.competitorIntel.swot) || {};
      
      const strengthsEl = document.getElementById("swot-strengths");
      if (strengthsEl && swot.strengths) {
        strengthsEl.innerHTML = swot.strengths.map(s => `<li>${s}</li>`).join("");
      }
      const weaknessesEl = document.getElementById("swot-weaknesses");
      if (weaknessesEl && swot.weaknesses) {
        weaknessesEl.innerHTML = swot.weaknesses.map(s => `<li>${s}</li>`).join("");
      }
      const opportunitiesEl = document.getElementById("swot-opportunities");
      if (opportunitiesEl && swot.opportunities) {
        opportunitiesEl.innerHTML = swot.opportunities.map(s => `<li>${s}</li>`).join("");
      }
      const threatsEl = document.getElementById("swot-threats");
      if (threatsEl && swot.threats) {
        threatsEl.innerHTML = swot.threats.map(s => `<li>${s}</li>`).join("");
      }
    }
    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // TAB 11: PRODUCT & VIRALITY CENTER
  // -------------------------------------------------------------
  let productGrowthInitialized = false;
  let activeProductSubtab = "pg-subtab-analytics";

  window.initProductGrowthTab = function() {
    if (!productGrowthInitialized) {
      const container = document.getElementById("product-growth-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeProductSubtab = target;
            
            document.querySelectorAll(".product-growth-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderProductGrowthSubpanes();
          });
        });
      }

      // Action buttons for Product Growth tab
      const addMockFrictionBtn = document.getElementById("pg-btn-add-mock-friction");
      if (addMockFrictionBtn) {
        const mockFriction = [
          { page: "/checkout/payment", type: "Rage Click", element: "btn-pay-now", rate: "15.0% (Critical)", count: 180 },
          { page: "/user/kyc-selfie", type: "Dead Click", element: "img-selfie-frame", rate: "9.2% (Medium)", count: 110 },
          { page: "/wallet/withdraw", type: "Form Abandonment", element: "input-bank-account", rate: "14.1% (High)", count: 220 }
        ];
        addMockFrictionBtn.onclick = () => {
          const rand = mockFriction[Math.floor(Math.random() * mockFriction.length)];
          const newFrc = {
            id: `FRC-${String(db.productGrowth.userFrictionLogs.length + 1).padStart(3, "0")}`,
            page: rand.page,
            type: rand.type,
            element: rand.element,
            rate: rand.rate,
            count: rand.count
          };
          db.productGrowth.userFrictionLogs.push(newFrc);
          addAuditLogEntry(currentPersona, `Tạo lỗi ma sát giả lập ${newFrc.id}: ${newFrc.type}`, `Phần tử bị ảnh hưởng: ${newFrc.element}`);
          showToast(`Đã thêm lỗi ma sát giả lập ${newFrc.id} thành công!`, "success");
          renderProductGrowthSubpanes();
        };
      }

      const addMockLoopBtn = document.getElementById("pg-btn-add-mock-loop");
      if (addMockLoopBtn) {
        const mockLoops = [
          { name: "Whale Referral Tier", trigger: "Khách hàng nạp > $10K", payload: "Thăng cấp VIP & nhận 0.5% cash-back phí", status: "Active", conversionRate: 18.5 },
          { name: "Quiz Edu Share Loop", trigger: "Hoàn thành quiz kiến thức", payload: "Nhận vé quay số trúng iPhone", status: "Active", conversionRate: 9.6 },
          { name: "First Trade Share Loop", trigger: "Thực hiện lệnh trade đầu tiên thành công", payload: "Badge chứng nhận kèm voucher giảm phí $2", status: "Paused", conversionRate: 5.4 }
        ];
        addMockLoopBtn.onclick = () => {
          const rand = mockLoops[Math.floor(Math.random() * mockLoops.length)];
          const newLoop = {
            id: `LP-${String(db.referralData.loopsList.length + 1).padStart(3, "0")}`,
            name: rand.name,
            trigger: rand.trigger,
            payload: rand.payload,
            status: rand.status,
            conversionRate: rand.conversionRate
          };
          db.referralData.loopsList.push(newLoop);
          
          // Adjust overall referral metrics slightly for realistic updates
          db.referralData.activeLoopsCount = db.referralData.loopsList.filter(l => l.status === "Active").length;
          db.referralData.kFactor = Number(Math.min(1.5, db.referralData.kFactor + 0.01).toFixed(2));
          
          addAuditLogEntry(currentPersona, `Tạo vòng lặp lan truyền giả lập ${newLoop.id}: "${newLoop.name}"`, `K-Factor mới: ${db.referralData.kFactor}`);
          showToast(`Đã thêm vòng lặp giới thiệu giả lập ${newLoop.id} thành công!`, "success");
          renderProductGrowthSubpanes();
        };
      }

      productGrowthInitialized = true;
    }
    renderProductGrowthSubpanes();
  }

  function renderProductGrowthSubpanes() {
    const data = (window.db && window.db.productGrowth) || {};
    
    // Sync subpane visibility and active button state
    const container = document.getElementById("product-growth-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeProductSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".product-growth-subpane").forEach(pane => {
      pane.style.display = pane.id === activeProductSubtab ? "block" : "none";
    });
    
    if (activeProductSubtab === "pg-subtab-analytics") {
      // Core Engagement
      const dauEl = document.getElementById("pg-dau");
      if (dauEl && data.metrics) dauEl.textContent = data.metrics.dau.toLocaleString();
      const mauEl = document.getElementById("pg-mau");
      if (mauEl && data.metrics) mauEl.textContent = data.metrics.mau.toLocaleString();
      const stickEl = document.getElementById("pg-stickiness");
      // Stickiness COMPUTED = DAU/MAU (not a stored literal)
      if (stickEl && data.metrics && data.metrics.mau) {
        const stickiness = (data.metrics.dau / data.metrics.mau) * 100;
        data.metrics.stickiness = stickiness;
        stickEl.textContent = stickiness.toFixed(1) + "%";
      }

      // Feature Adoption table
      const adoptionTable = document.getElementById("pg-features-adoption");
      if (adoptionTable && data.metrics && data.metrics.featureAdoption) {
        adoptionTable.innerHTML = "";
        data.metrics.featureAdoption.forEach(f => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong style="color:var(--text-main);">${f.name}</strong></td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="gk-prog-t" style="width:80px; height:8px;">
                  <div class="gk-prog-f" style="width:${f.adoptionRate}%; background:linear-gradient(90deg, var(--blue), #6366f1); box-shadow:0 0 6px rgba(37,99,235,.3);"></div>
                </div>
                <span style="font-weight:700; color:var(--text2); min-width:32px;">${f.adoptionRate}%</span>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="gk-prog-t" style="width:80px; height:8px;">
                  <div class="gk-prog-f" style="width:${f.retentionRate}%; background:linear-gradient(90deg, var(--teal), #14b8a6); box-shadow:0 0 6px rgba(14,156,138,.3);"></div>
                </div>
                <span style="font-weight:700; color:var(--text2); min-width:32px;">${f.retentionRate}%</span>
              </div>
            </td>
          `;
          adoptionTable.appendChild(tr);
        });
      }

      // User Friction logs
      const frictionLogs = document.getElementById("pg-friction-logs");
      if (frictionLogs && data.userFrictionLogs) {
        frictionLogs.innerHTML = "";
        data.userFrictionLogs.forEach(f => {
          const tr = document.createElement("tr");
          let badgeClass = f.rate.includes("Critical") ? "badge stop" : f.rate.includes("High") ? "badge stop" : "badge scale";
          tr.innerHTML = `
            <td><code>${f.id}</code></td>
            <td>${f.page}</td>
            <td style="font-weight:700;">${f.type}</td>
            <td><code>${f.element}</code></td>
            <td><span class="badge ${badgeClass}" style="font-size:11px; padding:2px 6px;">${f.rate}</span></td>
            <td><strong>${f.count} clicks</strong></td>
          `;
          frictionLogs.appendChild(tr);
        });
      }
    } else if (activeProductSubtab === "pg-subtab-activation") {
      try { renderMeuActivation(); } catch(e) { console.error("Error in renderMeuActivation:", e); }
      // Activation Funnel
      const funnelContainer = document.getElementById("pg-activation-funnel");
      if (funnelContainer && data.activationJourney) {
        funnelContainer.innerHTML = "";
        data.activationJourney.forEach(step => {
          const row = document.createElement("div");
          row.style.marginBottom = "14px";
          let dropoffBadge = step.dropoffPct > 0 ? `<span class="badge stop" style="font-size:10.5px; padding:1px 5px;">-${step.dropoffPct}% Dropoff</span>` : `<span class="badge optimize" style="font-size:10.5px; padding:1px 5px;">Starting point</span>`;
          row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px;">
              <span><strong style="color:var(--text-main); font-size:12px;">${step.step}</strong> <span style="font-size:11px; color:var(--text3); font-weight:500;">(${step.count.toLocaleString()} users)</span></span>
              <div style="display:flex; gap:6px; align-items:center;">
                <span style="color:var(--purple); font-weight:800; font-size:12px;">${step.pctOfTotal.toFixed(1)}%</span>
                ${dropoffBadge}
              </div>
            </div>
            <div class="gk-prog-t" style="height:12px; border-radius:6px;">
              <div class="gk-prog-f" style="width:${step.pctOfTotal}%; height:100%; border-radius:6px; background:linear-gradient(90deg, var(--purple), #818cf8); box-shadow:0 0 8px rgba(100,84,227,0.35);"></div>
            </div>
          `;
          funnelContainer.appendChild(row);
        });
      }
      renderFunnelAnalysis();
    } else if (activeProductSubtab === "pg-subtab-loops") {
      const refData = (window.db && window.db.referralData) || {};
      
      // Referral numbers
      const rateEl = document.getElementById("pg-ref-rate");
      if (rateEl && refData.referralRate !== undefined) rateEl.textContent = refData.referralRate + "%";
      const invEl = document.getElementById("pg-invite-rate");
      if (invEl && refData.inviteRate !== undefined) invEl.textContent = refData.inviteRate + " invites";
      const cycleEl = document.getElementById("pg-cycle-time");
      if (cycleEl && refData.viralCycleTime !== undefined) cycleEl.textContent = refData.viralCycleTime;
      // K-factor COMPUTED = invites/user × blended conversion of ACTIVE loops (not a literal)
      const kfactEl = document.getElementById("pg-kfactor");
      if (kfactEl) {
        const activeLoops = (refData.loopsList || []).filter(l => l.status === "Active");
        const avgConv = activeLoops.length ? activeLoops.reduce((a, l) => a + (l.conversionRate || 0), 0) / activeLoops.length : 0;
        const k = (refData.inviteRate || 0) * (avgConv / 100);
        refData.kFactor = k; // keep data in sync
        const amp = k < 1 ? (1 / (1 - k)) : Infinity;
        kfactEl.textContent = k.toFixed(2) + (isFinite(amp) ? ` (×${amp.toFixed(2)} viral)` : " (∞)");
      }

      // Loops table list
      const loopsTable = document.getElementById("pg-loops-list-table");
      if (loopsTable && refData.loopsList) {
        loopsTable.innerHTML = "";
        refData.loopsList.forEach(l => {
          const tr = document.createElement("tr");
          const statusClass = l.status === "Active" ? "optimize" : "stop";
          tr.innerHTML = `
            <td><strong style="color:var(--text-main); font-size:12px;">${l.name}</strong></td>
            <td><span style="font-size:11.5px; color:var(--text2);">${l.trigger}</span></td>
            <td><span style="font-size:11.5px; color:var(--text3);">${l.payload}</span></td>
            <td><span class="badge ${statusClass}" style="font-size:10.5px; padding:2px 6px; font-weight:700;">${l.status.toUpperCase()}</span></td>
            <td><strong style="font-size:12.5px; color:var(--text-main);">${l.conversionRate}%</strong></td>
          `;
          loopsTable.appendChild(tr);
        });
      }
    }
    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // TAB 12: EXPERIMENTATION OPERATING SYSTEM
  // -------------------------------------------------------------
  let experimentationInitialized = false;
  let activeExperimentSubtab = "ex-subtab-pipeline";

  window.initExperimentationTab = function() {
    if (!experimentationInitialized) {
      const container = document.getElementById("experimentation-subtabs");
      if (container) {
        container.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            container.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const target = btn.getAttribute("data-subtab");
            activeExperimentSubtab = target;
            
            document.querySelectorAll(".experimentation-subpane").forEach(pane => {
              pane.style.display = pane.id === target ? "block" : "none";
            });
            
            renderExperimentationSubpanes();
          });
        });
      }

      // Action buttons for Experimentation tab
      const addMockExpBtn = document.getElementById("ex-btn-add-mock");
      if (addMockExpBtn) {
        const mockIdeas = [
          { idea: "Tự động gợi ý gói nạp tiền tối ưu dựa trên LTV", hypothesis: "Gợi ý cá nhân hóa giúp tăng CVR nạp lần đầu thêm 18%" },
          { idea: "Đổi màu nút KYC thành màu xanh lá neon phát sáng", hypothesis: "Nút bấm nổi bật thu hút sự chú ý tăng 8% số lượt nhấn KYC" },
          { idea: "Thêm mục Chat trực tiếp hỗ trợ 1-1 cho Whale", hypothesis: "Hỗ trợ VIP 24/7 tức thì nâng cao tỷ lệ giữ chân của Whale" },
          { idea: "Hiện thông báo xã hội 'X vừa nạp $1000' theo thời gian thực", hypothesis: "Hiệu ứng đám đông thúc đẩy hành vi giao dịch nhanh hơn" }
        ];
        addMockExpBtn.onclick = () => {
          const rand = mockIdeas[Math.floor(Math.random() * mockIdeas.length)];
          const impact = Math.floor(Math.random() * 5) + 6; // 6-10
          const confidence = Math.floor(Math.random() * 5) + 6; // 6-10
          const ease = Math.floor(Math.random() * 5) + 6; // 6-10
          const score = (impact + confidence + ease) / 3;
          const newExp = {
            id: `EXP-${100 + db.experimentation.pipeline.length + 1}`,
            idea: rand.idea,
            hypothesis: rand.hypothesis,
            impact: impact,
            confidence: confidence,
            ease: ease,
            score: Number(score.toFixed(1)),
            status: ["Idea", "Prioritization", "Execution", "Analysis"][Math.floor(Math.random() * 4)]
          };
          db.experimentation.pipeline.push(newExp);
          addAuditLogEntry(currentPersona, `Tạo thử nghiệm giả lập ${newExp.id}: "${newExp.idea}"`, `Đẩy vào Pipeline với điểm ICE: ${newExp.score}`);
          showToast(`Đã thêm thử nghiệm giả lập ${newExp.id} thành công!`, "success");
          renderExperimentationSubpanes();
        };
      }

      const addMockLearningBtn = document.getElementById("ex-btn-add-mock-learning");
      if (addMockLearningBtn) {
        const mockLearnings = [
          { experiment: "A/B Test giao diện nạp tiền tối giản v1.2", result: "Thành công", learning: "Giảm số lượng trường nhập liệu từ 4 xuống 2 giúp giảm tỷ lệ thoát trang thanh toán đi 14%." },
          { experiment: "Video Ads TikTok phong cách phỏng vấn đường phố", result: "Thành công", learning: "Video mở đầu bằng câu hỏi gây tranh cãi đạt tỷ lệ xem hết cao hơn 22% so với giới thiệu trực tiếp." },
          { experiment: "Tặng voucher giảm 50% phí giao dịch tuần đầu", result: "Thất bại", learning: "Chỉ tăng volume giao dịch ngắn hạn nhưng tỷ lệ giữ chân tuần 2 không cải thiện, gây thâm hụt biên lợi nhuận." }
        ];
        addMockLearningBtn.onclick = () => {
          const rand = mockLearnings[Math.floor(Math.random() * mockLearnings.length)];
          const newLrn = {
            id: `LRN-${String(db.experimentation.learnings.length + 1).padStart(3, "0")}`,
            experiment: rand.experiment,
            result: rand.result,
            learning: rand.learning,
            date: new Date().toISOString().slice(0, 10)
          };
          db.experimentation.learnings.push(newLrn);
          
          // Increment total completed tests and adjust win rate dynamically
          db.experimentation.velocity.totalCompleted++;
          if (rand.result === "Thành công") {
            db.experimentation.velocity.winRate = Number(Math.min(100, db.experimentation.velocity.winRate + 0.5).toFixed(1));
          } else {
            db.experimentation.velocity.winRate = Number(Math.max(0, db.experimentation.velocity.winRate - 0.2).toFixed(1));
          }

          addAuditLogEntry(currentPersona, `Tạo học tập giả lập ${newLrn.id}: "${newLrn.experiment}"`, `Ghi nhận kết quả: ${newLrn.result}`);
          showToast(`Đã thêm học tập giả lập ${newLrn.id} thành công!`, "success");
          renderExperimentationSubpanes();
        };
      }

      const addMockLifecycleBtn = document.getElementById("ex-btn-add-mock-lifecycle");
      if (addMockLifecycleBtn) {
        const mockCampaigns = [
          { name: "Whale Retention Series (Email + Push)", trigger: "Whale không giao dịch 7 ngày", steps: 3, openRate: 58.4, ctr: 14.2, cvr: 9.8, revenue: 21500 },
          { name: "Holiday Promo Blast (Push)", trigger: "Dịp lễ lớn toàn quốc", steps: 1, openRate: 38.0, ctr: 8.5, cvr: 5.2, revenue: 11000 },
          { name: "KYC Retry Campaign (SMS)", trigger: "KYC lỗi ảnh mờ", steps: 2, openRate: 85.0, ctr: 32.1, cvr: 20.4, revenue: 6200 }
        ];
        addMockLifecycleBtn.onclick = () => {
          const rand = mockCampaigns[Math.floor(Math.random() * mockCampaigns.length)];
          const newCamp = {
            id: `AUT-${String(db.lifecycleAutomation.campaigns.length + 1).padStart(3, "0")}`,
            name: rand.name,
            trigger: rand.trigger,
            steps: rand.steps,
            openRate: rand.openRate,
            ctr: rand.ctr,
            cvr: rand.cvr,
            revenue: rand.revenue
          };
          db.lifecycleAutomation.campaigns.push(newCamp);
          addAuditLogEntry(currentPersona, `Tạo kịch bản vòng đời giả lập ${newCamp.id}: "${newCamp.name}"`, `Kích hoạt khi: ${newCamp.trigger}`);
          showToast(`Đã thêm kịch bản vòng đời giả lập ${newCamp.id} thành công!`, "success");
          renderExperimentationSubpanes();
        };
      }

      const addMockVocBtn = document.getElementById("ex-btn-add-mock-voc");
      if (addMockVocBtn) {
        const mockVoc = [
          { channel: "App Store Review", feedback: "App giao dịch nhanh và mượt mà, nhưng cần thêm chức năng lọc theo tài sản.", sentiment: "Positive" },
          { channel: "Telegram Community", feedback: "Rút tiền bị trễ hơn nửa tiếng đồng hồ, admin hỗ trợ quá chậm!", sentiment: "Negative" },
          { channel: "Support Ticket", feedback: "Tôi thấy giao diện mới cũng được, nhưng chưa quen lắm với thanh cuộn.", sentiment: "Neutral" }
        ];
        addMockVocBtn.onclick = () => {
          const rand = mockVoc[Math.floor(Math.random() * mockVoc.length)];
          const newVoc = {
            id: `VOC-${String(db.vocData.feedbackTickets.length + 1).padStart(3, "0")}`,
            channel: rand.channel,
            feedback: rand.feedback,
            sentiment: rand.sentiment
          };
          db.vocData.feedbackTickets.push(newVoc);

          // Update sentiment counters dynamically
          if (rand.sentiment === "Positive") db.vocData.sentiment.positive++;
          else if (rand.sentiment === "Neutral") db.vocData.sentiment.neutral++;
          else if (rand.sentiment === "Negative") db.vocData.sentiment.negative++;

          // Normalize sentiment to total = 100%
          const total = db.vocData.sentiment.positive + db.vocData.sentiment.neutral + db.vocData.sentiment.negative;
          db.vocData.sentiment.positive = Math.round((db.vocData.sentiment.positive / total) * 100);
          db.vocData.sentiment.neutral = Math.round((db.vocData.sentiment.neutral / total) * 100);
          db.vocData.sentiment.negative = 100 - db.vocData.sentiment.positive - db.vocData.sentiment.neutral;

          // Re-calculate NPS and CSAT based on sentiment
          db.vocData.nps = db.vocData.sentiment.positive - db.vocData.sentiment.negative;
          db.vocData.csat = Math.min(100, Math.max(0, Math.round(db.vocData.sentiment.positive + 0.84 * db.vocData.sentiment.neutral)));

          addAuditLogEntry(currentPersona, `Tạo phản hồi khách hàng giả lập ${newVoc.id}`, `Cảm xúc: ${newVoc.sentiment} | NPS mới: ${db.vocData.nps}`);
          showToast(`Đã thêm phản hồi khách hàng giả lập ${newVoc.id} thành công!`, "success");
          renderExperimentationSubpanes();
        };
      }

      experimentationInitialized = true;
    }
    renderExperimentationSubpanes();
  }

  function renderExperimentationSubpanes() {
    // Sync subpane visibility and active button state
    const container = document.getElementById("experimentation-subtabs");
    if (container) {
      container.querySelectorAll("button").forEach(btn => {
        if (btn.getAttribute("data-subtab") === activeExperimentSubtab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    document.querySelectorAll(".experimentation-subpane").forEach(pane => {
      pane.style.display = pane.id === activeExperimentSubtab ? "block" : "none";
    });

    const data = (window.db && window.db.experimentation) || {};
    
    if (activeExperimentSubtab === "ex-subtab-pipeline") {
      // Velocity
      const velEl = document.getElementById("ex-velocity");
      if (velEl && data.velocity) velEl.textContent = data.velocity.testsPerWeek + " tests";
      const totalEl = document.getElementById("ex-total-completed");
      if (totalEl && data.velocity) totalEl.textContent = data.velocity.totalCompleted + " tests";
      const winEl = document.getElementById("ex-winrate");
      if (winEl && data.velocity) winEl.textContent = data.velocity.winRate + "%";

      // Learnings list
      const learningsList = document.getElementById("ex-learnings-list");
      if (learningsList && data.learnings) {
        learningsList.innerHTML = "";
        data.learnings.forEach(l => {
          const tr = document.createElement("tr");
          let resultBadge = l.result === "Thành công" ? "badge optimize" : "badge stop";
          tr.innerHTML = `
            <td><strong>${l.experiment}</strong></td>
            <td><span class="badge ${resultBadge}" style="font-size: 11px; padding:2px 6px;">${l.result}</span></td>
            <td>${l.learning}</td>
            <td>${l.date}</td>
          `;
          learningsList.appendChild(tr);
        });
      }

      // Pipeline Backlog table
      const pipelineTable = document.getElementById("ex-pipeline-table");
      if (pipelineTable && data.pipeline) {
        pipelineTable.innerHTML = "";
        // ICE COMPUTED = (Impact + Confidence + Ease) / 3, then SORTED by priority (was unsorted)
        const ranked = data.pipeline
          .map(p => Object.assign({}, p, { score: (p.impact + p.confidence + p.ease) / 3 }))
          .sort((a, b) => b.score - a.score);
        ranked.forEach((p, i) => {
          const tr = document.createElement("tr");
          let statusBadge = p.status === "Execution" ? "badge optimize" : p.status === "Analysis" ? "badge scale" : "badge test";
          tr.innerHTML = `
            <td><code>${p.id}</code> <span style="color:var(--text-muted); font-size:11px;">#${i + 1}</span></td>
            <td><strong>${p.idea}</strong></td>
            <td>${p.hypothesis}</td>
            <td>${p.impact}/10</td>
            <td>${p.confidence}/10</td>
            <td>${p.ease}/10</td>
            <td><strong style="color:var(--purple-light); font-size:12px;">${p.score.toFixed(1)}</strong></td>
            <td><span class="badge ${statusBadge}" style="font-size: 11px; padding:2px 6px;">${p.status}</span></td>
          `;
          pipelineTable.appendChild(tr);
        });
      }
    } else if (activeExperimentSubtab === "ex-subtab-lifecycle") {
      const lifeData = (window.db && window.db.lifecycleAutomation) || {};
      
      // Journeys table
      const journeysTable = document.getElementById("ex-lifecycle-campaigns");
      if (journeysTable && lifeData.campaigns) {
        journeysTable.innerHTML = "";
        lifeData.campaigns.forEach(c => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong style="color:var(--text-main); font-size:12px;">${c.name}</strong></td>
            <td><span style="font-size:11.5px; color:var(--text2); font-weight:500;">${c.trigger}</span></td>
            <td><span style="font-size:11px; color:var(--text3); font-weight:600;">${c.steps} messages</span></td>
            <td><strong style="font-size:12.5px; color:var(--text-main);">${c.openRate}%</strong></td>
            <td><span style="font-size:12px; color:var(--text2); font-weight:600;">${c.ctr}%</span></td>
            <td><strong style="font-size:12.5px; color:var(--purple); font-weight:800;">${c.cvr}%</strong></td>
            <td><strong style="font-size:13px; color:var(--text-main); font-weight:900;">$${c.revenue.toLocaleString()}</strong></td>
          `;
          journeysTable.appendChild(tr);
        });
      }
    } else if (activeExperimentSubtab === "ex-subtab-voc") {
      const voc = (window.db && window.db.vocData) || {};
      
      // Scores
      const npsEl = document.getElementById("ex-nps");
      if (npsEl && voc.nps) npsEl.textContent = voc.nps;
      const csatEl = document.getElementById("ex-csat");
      if (csatEl && voc.csat) csatEl.textContent = voc.csat + "%";

      // Render sentiment breakdown
      if (voc.sentiment) {
        const posVal = voc.sentiment.positive || 0;
        const neuVal = voc.sentiment.neutral || 0;
        const negVal = voc.sentiment.negative || 0;
        
        const posBar = document.getElementById("ex-sentiment-pos-bar");
        if (posBar) posBar.style.width = posVal + "%";
        const neuBar = document.getElementById("ex-sentiment-neu-bar");
        if (neuBar) neuBar.style.width = neuVal + "%";
        const negBar = document.getElementById("ex-sentiment-neg-bar");
        if (negBar) negBar.style.width = negVal + "%";
        
        const posText = document.getElementById("ex-sentiment-pos-text");
        if (posText) posText.textContent = "Pos: " + posVal + "%";
        const neuText = document.getElementById("ex-sentiment-neu-text");
        if (neuText) neuText.textContent = "Neu: " + neuVal + "%";
        const negText = document.getElementById("ex-sentiment-neg-text");
        if (negText) negText.textContent = "Neg: " + negVal + "%";
      }

      // Feedback feed
      const listContainer = document.getElementById("ex-feedback-list");
      if (listContainer && voc.feedbackTickets) {
        listContainer.innerHTML = "";
        voc.feedbackTickets.forEach(f => {
          const tr = document.createElement("tr");
          let sentimentBadge = f.sentiment === "Positive" ? "badge optimize" : f.sentiment === "Negative" ? "badge stop" : "badge scale";
          tr.innerHTML = `
            <td><strong>${f.channel}</strong></td>
            <td style="font-style:italic; color:var(--text2);">"${f.feedback}"</td>
            <td><span class="badge ${sentimentBadge}" style="font-size: 11px; padding:2px 6px;">${f.sentiment}</span></td>
          `;
          listContainer.appendChild(tr);
        });
      }
    } else if (activeExperimentSubtab === "ex-subtab-knowledge") {
      const kb = (window.db && window.db.knowledgeBase) || {};
      
      // SOP list table
      const knowledgeTable = document.getElementById("ex-knowledge-list");
      if (knowledgeTable && kb.playbooks) {
        knowledgeTable.innerHTML = "";
        kb.playbooks.forEach(p => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><code>${p.id}</code></td>
            <td><strong>${p.title}</strong></td>
            <td><span class="badge scale" style="font-size: 11px; padding:2px 6px;">${p.type}</span></td>
            <td>${p.owner}</td>
            <td>${p.views} views</td>
            <td><button class="btn btn-secondary btn-small read-sop-btn" data-doc="${p.id}" style="font-size: 11px; padding:2px 6px;"><i data-lucide="eye" style="width:10px;"></i> Đọc</button></td>
          `;
          knowledgeTable.appendChild(tr);
        });

        knowledgeTable.querySelectorAll(".read-sop-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const docId = btn.getAttribute("data-doc");
            renderPlaybook(docId);
            const displayEl = document.getElementById("playbook-text-display");
            if (displayEl) {
              displayEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        });
      }
      renderPlaybook();
    }
    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // SESSION REPLAY DIAGNOSTICS MODAL ENGINE
  // -------------------------------------------------------------
  window.openSessionReplay = function(sessionId) {
    const modal = document.getElementById("session-replay-modal");
    const titleId = document.getElementById("replay-modal-id");
    const content = document.getElementById("replay-modal-content");
    if (!modal || !content || !titleId) return;

    titleId.textContent = `#${sessionId}`;
    
    const sessionData = {
      "1024": {
        device: "Android - Samsung S23",
        duration: "2m 45s",
        diagnostic: "Phát hiện click dồn dập (Rage clicks) khi tải KYC. API máy ảnh bị timeout.",
        steps: [
          { time: "00:05", type: "install", desc: "Người dùng mở ứng dụng lần đầu." },
          { time: "00:20", type: "input", desc: "Bắt đầu điền thông tin đăng ký." },
          { time: "00:45", type: "click", desc: "Click nút 'Đăng ký'." },
          { time: "00:52", type: "input", desc: "Xác thực mã OTP thành công." },
          { time: "01:10", type: "click", desc: "Vào luồng KYC và click 'Chụp ảnh giấy tờ'." },
          { time: "01:25", type: "error", desc: "Lỗi Camera API (Thiết bị phản hồi quá lâu)." },
          { time: "01:28", type: "rage", desc: "Rage click (12 click trong 2 giây) vào vùng chụp ảnh." },
          { time: "02:40", type: "quit", desc: "Thoát ứng dụng (Rời bỏ luồng onboarding)." }
        ],
        recom: "Lỗi tương thích Android Camera API v2. Đề xuất: Triển khai luồng fallback chuyển sang ứng dụng camera mặc định của hệ thống khi chụp ảnh nhúng bị lỗi."
      },
      "1012": {
        device: "iOS - iPhone 14 Pro",
        duration: "1m 20s",
        diagnostic: "Tự động điền mã OTP thất bại. Độ trễ nhận tin nhắn SMS vượt quá 60 giây.",
        steps: [
          { time: "00:03", type: "install", desc: "Người dùng mở ứng dụng." },
          { time: "00:15", type: "input", desc: "Nhập số điện thoại đăng ký." },
          { time: "00:22", type: "click", desc: "Click 'Gửi mã xác thực'." },
          { time: "00:40", type: "wait", desc: "Người dùng chờ đợi mã OTP." },
          { time: "01:10", type: "click", desc: "Click 'Gửi lại mã' 3 lần liên tiếp." },
          { time: "01:18", type: "error", desc: "Lỗi timeout dịch vụ gửi SMS OTP." },
          { time: "01:20", type: "quit", desc: "Thoát ứng dụng do không nhận được mã." }
        ],
        recom: "Nghẽn mạng gửi SMS của nhà mạng khu vực. Đề xuất: Thêm tùy chọn xác thực mã qua cuộc gọi thoại (Voice OTP) hoặc Zalo OTP."
      },
      "0988": {
        device: "Android - Oppo Reno 8",
        duration: "5m 12s",
        diagnostic: "Click không phản hồi (Dead clicks) khi xác nhận nạp tiền. Lệch mã tiền tệ cổng thanh toán.",
        steps: [
          { time: "00:10", type: "install", desc: "Người dùng mở ứng dụng." },
          { time: "00:45", type: "kyc", desc: "Hoàn thành KYC thành công." },
          { time: "01:30", type: "click", desc: "Vào màn hình Nạp tiền." },
          { time: "02:00", type: "input", desc: "Nhập số tiền nạp ($100)." },
          { time: "02:10", type: "click", desc: "Click chọn thanh toán qua thẻ tín dụng." },
          { time: "02:25", type: "error", desc: "Lỗi cổng thanh toán: INVALID_CURRENCY (Cổng yêu cầu VND, ứng dụng gửi USD)." },
          { time: "03:10", type: "click", desc: "Người dùng click liên tục vào 'Xác nhận' nhưng không có phản hồi." },
          { time: "05:12", type: "quit", desc: "Thoát ứng dụng." }
        ],
        recom: "Đồng bộ mã tiền tệ (currency code) gửi sang cổng thanh toán dựa theo Merchant ID cấu hình khu vực."
      }
    };

    const data = sessionData[sessionId] || sessionData["1024"];

    let stepsHtml = "";
    data.steps.forEach(s => {
      let icon = "circle";
      let color = "var(--text-muted)";
      if (s.type === "error" || s.type === "rage") {
        icon = "alert-triangle";
        color = "var(--coral)";
      } else if (s.type === "install" || s.type === "kyc") {
        icon = "check-circle";
        color = "var(--teal)";
      } else if (s.type === "click" || s.type === "input") {
        icon = "mouse-pointer";
        color = "var(--cyan)";
      } else if (s.type === "quit") {
        icon = "x-circle";
        color = "var(--amber)";
      }

      stepsHtml += `
        <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 8px;">
          <span style="font-family: monospace; font-size: 11px; color: var(--text-muted); min-width: 40px; margin-top: 2px;">${s.time}</span>
          <i data-lucide="${icon}" style="width: 14px; height: 14px; color: ${color}; flex-shrink: 0; margin-top: 3px;"></i>
          <span style="font-size: 11.5px; color: var(--text2);">${s.desc}</span>
        </div>
      `;
    });

    content.innerHTML = `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <div style="font-size: 11.5px; color: var(--text3); display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 6px;">
          <div><strong>Thiết bị:</strong> <span style="color:#fff;">${data.device}</span></div>
          <div><strong>Thời lượng:</strong> <span style="color:#fff;">${data.duration}</span></div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11.5px; color: var(--coral);">
          <strong>Chẩn đoán AI:</strong> ${data.diagnostic}
        </div>
      </div>
      
      <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #fff; font-weight: 700;">Nhật ký sự kiện (Timeline)</h4>
      <div style="max-height: 200px; overflow-y: auto; margin-bottom: 20px; padding-right: 4px;">
        ${stepsHtml}
      </div>

      <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px; font-size: 11.5px;">
        <strong style="color: var(--teal); display: block; margin-bottom: 4px;"><i data-lucide="lightbulb" style="width:12px; height:12px; display:inline; vertical-align:middle; margin-right:4px;"></i>Khuyến nghị tối ưu hóa</strong>
        <span style="color: var(--text2); line-height: 1.45;">${data.recom}</span>
      </div>
    `;

    modal.style.display = "flex";
    lucide.createIcons();
  };

  const closeModalBtn = document.getElementById("close-replay-modal");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("session-replay-modal");
      if (modal) modal.style.display = "none";
    });
  }
  
  const replayModal = document.getElementById("session-replay-modal");
  if (replayModal) {
    replayModal.addEventListener("click", (e) => {
      if (e.target === replayModal) {
        replayModal.style.display = "none";
      }
    });
  }
  
  function initSidebarLayoutControls() {
    const layoutKanbanBtn = document.getElementById("ds-layout-kanban");
    const layoutListBtn = document.getElementById("ds-layout-list");
    const appContainer = document.querySelector(".app-container") || document.body;

    // Load saved layout mode from localStorage if available
    let savedMode = "kanban";
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem) {
        savedMode = localStorage.getItem("gd_sidebar_layout_mode") || "kanban";
      }
    } catch (e) {
      console.warn("localStorage is not available:", e);
    }

    if (savedMode === "list") {
      appContainer.classList.add("layout-mode-list");
      layoutListBtn?.classList.add("active");
      layoutKanbanBtn?.classList.remove("active");
    } else {
      appContainer.classList.remove("layout-mode-list");
      layoutKanbanBtn?.classList.add("active");
      layoutListBtn?.classList.remove("active");
    }

    if (layoutKanbanBtn) {
      layoutKanbanBtn.addEventListener("click", () => {
        appContainer.classList.remove("layout-mode-list");
        layoutKanbanBtn.classList.add("active");
        layoutListBtn?.classList.remove("active");
        try {
          if (typeof localStorage !== "undefined" && localStorage.setItem) {
            localStorage.setItem("gd_sidebar_layout_mode", "kanban");
          }
        } catch (e) {}
        
        showToast("Bố cục Grid đã được tự động snap về cấu trúc Kanban!", "success");
      });
    }

    if (layoutListBtn) {
      layoutListBtn.addEventListener("click", () => {
        appContainer.classList.add("layout-mode-list");
        layoutListBtn.classList.add("active");
        layoutKanbanBtn?.classList.remove("active");
        try {
          if (typeof localStorage !== "undefined" && localStorage.setItem) {
            localStorage.setItem("gd_sidebar_layout_mode", "list");
          }
        } catch (e) {}
        
        showToast("Bố cục Grid đã được tự động snap về dạng Danh sách dọc (Full width)!", "success");
      });
    }
  }

  // Global tooltip click-to-toggle for mobile/touchscreen accessibility
  document.addEventListener("click", (e) => {
    const tooltipEl = e.target.closest(".has-tooltip, .has-tile-tooltip");
    const allTooltips = document.querySelectorAll(".has-tooltip, .has-tile-tooltip");
    
    if (tooltipEl) {
      const wasActive = tooltipEl.classList.contains("active-tooltip");
      allTooltips.forEach(el => el.classList.remove("active-tooltip"));
      if (!wasActive) {
        tooltipEl.classList.add("active-tooltip");
        e.stopPropagation();
      }
    } else {
      allTooltips.forEach(el => el.classList.remove("active-tooltip"));
    }
  });

  function fixCardTitleOverflows() {
    document.querySelectorAll(".card h3, .card h4").forEach(h3 => {
      const tooltip = h3.querySelector(".has-tooltip");
      const icon = h3.querySelector("svg, i[data-lucide]");
      if (tooltip) {
        const span = document.createElement("span");
        span.className = "card-title-text-wrap";
        span.style.display = "inline-block";
        span.style.verticalAlign = "middle";
        span.style.maxWidth = icon ? "calc(100% - 38px)" : "100%";
        span.style.lineHeight = "1.3";
        
        const nodesToWrap = [];
        h3.childNodes.forEach(child => {
          if (child !== icon && child !== tooltip) {
            nodesToWrap.push(child);
          }
        });
        
        h3.insertBefore(span, tooltip);
        
        nodesToWrap.forEach(node => {
          span.appendChild(node);
        });
        
        span.appendChild(tooltip);
      }
    });
  }

  // -------------------------------------------------------------
  // Live Customizer & Override Engine
  // -------------------------------------------------------------
  const TEXT_SELECTOR_CONFIGS = {
    "growth_health": { tab: "tab-executive", icon: "activity", label: "Tiêu đề: Sức khỏe Tăng trưởng" },
    "weekly_priority": { tab: "tab-executive", icon: "list-checks", label: "Tiêu đề: Weekly Priority Engine" },
    "team_ops_progress": { tab: "tab-executive", icon: "users", label: "Tiêu đề: Team Work Progress" },
    "value_formation": { tab: "tab-executive", icon: "gauge", label: "Tiêu đề: Value Formation" },
    "performance_ts": { tab: "tab-executive", icon: "bar-chart-3", canvas: "meuTimeSeriesChart", label: "Tiêu đề: Performance Time Series" },
    "daily_rev": { tab: "tab-executive", icon: "line-chart", label: "Tiêu đề: Daily Revenue Trends" },
    "funnel_analytics": { tab: "tab-executive", icon: "filter", label: "Tiêu đề: Conversion Funnel Analytics" },
    "alerts_center": { tab: "tab-executive", icon: "bell", label: "Tiêu đề: Alerts Center" },
    "ad_channel": { tab: "tab-executive", icon: "bar-chart-3", table: "exec-channel-table-body", label: "Tiêu đề: Ad Channel Performance" },
    "cohort_matrix": { tab: "tab-executive", icon: "refresh-cw", label: "Tiêu đề: Cohort Retention Matrix" },
    "budget_alloc": { tab: "tab-executive", icon: "pie-chart", label: "Tiêu đề: Budget Allocation Matrix" },
    "plans_obj": { tab: "tab-executive", icon: "target", label: "Tiêu đề: Plans & Objectives" },
    "active_exp": { tab: "tab-executive", icon: "beaker", label: "Tiêu đề: Active Experiments" },
    "priority_ops": { tab: "tab-executive", icon: "check-square", label: "Tiêu đề: Priority Operations" }
  };

  function findHeadingByIcon(tabId, iconType, canvasId = null, tableBodyId = null) {
    const tab = document.getElementById(tabId);
    if (!tab) return null;
    const headings = tab.querySelectorAll("h3, h4");
    for (let h of headings) {
      const hasIcon = h.querySelector(`[data-lucide="${iconType}"], .lucide-${iconType}`);
      if (hasIcon) {
        if (canvasId) {
          const parent = h.closest(".card");
          if (parent && parent.querySelector(`canvas#${canvasId}`)) return h;
        } else if (tableBodyId) {
          const parent = h.closest(".card");
          if (parent && parent.querySelector(`#${tableBodyId}`)) return h;
        } else {
          return h;
        }
      }
    }
    return null;
  }

  function applyCustomText(key, text) {
    const conf = TEXT_SELECTOR_CONFIGS[key];
    if (!conf) return;
    const h = findHeadingByIcon(conf.tab, conf.icon, conf.canvas, conf.table);
    if (!h) return;
    
    let textWrap = h.querySelector(".card-title-text-wrap");
    if (!textWrap) {
      const tooltip = h.querySelector(".has-tooltip");
      const icon = h.querySelector("svg, i[data-lucide]");
      textWrap = document.createElement("span");
      textWrap.className = "card-title-text-wrap";
      textWrap.style.display = "inline-block";
      textWrap.style.verticalAlign = "middle";
      textWrap.style.maxWidth = icon ? "calc(100% - 38px)" : "100%";
      textWrap.style.lineHeight = "1.3";
      
      const nodes = [];
      h.childNodes.forEach(child => {
        if (child !== icon && child !== tooltip) nodes.push(child);
      });
      h.insertBefore(textWrap, tooltip);
      nodes.forEach(node => textWrap.appendChild(node));
      if (tooltip) textWrap.appendChild(tooltip);
    }
    
    let textNodeFound = false;
    for (let child of textWrap.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        child.textContent = " " + text + " ";
        textNodeFound = true;
        break;
      }
    }
    if (!textNodeFound) {
      textWrap.insertBefore(document.createTextNode(" " + text + " "), textWrap.firstChild);
    }
  }

  function getMetricOverride(key) {
    if (localMemoryMetrics[key] !== undefined && localMemoryMetrics[key] !== null && localMemoryMetrics[key] !== "") {
      return parseFloat(localMemoryMetrics[key]);
    }
    return null;
  }
  window.getMetricOverride = getMetricOverride;

  function applyAllCustomTexts() {
    Object.keys(localMemoryTexts).forEach(key => {
      applyCustomText(key, localMemoryTexts[key]);
    });
  }

  function initLiveCustomizer() {
    const tabText = document.getElementById("cust-tab-text");
    const tabMetrics = document.getElementById("cust-tab-metrics");
    const panelText = document.getElementById("cust-panel-text");
    const panelMetrics = document.getElementById("cust-panel-metrics");
    const textSelector = document.getElementById("cust-text-selector");
    const textInput = document.getElementById("cust-text-input");
    const metricSelector = document.getElementById("cust-metric-selector");
    const metricInput = document.getElementById("cust-metric-input");
    
    if (!textSelector) return;

    // Populate text selector options
    textSelector.innerHTML = Object.keys(TEXT_SELECTOR_CONFIGS).map(key => {
      return `<option value="${key}">${TEXT_SELECTOR_CONFIGS[key].label}</option>`;
    }).join("");

    // Tabs switching
    if (tabText && tabMetrics && panelText && panelMetrics) {
      tabText.addEventListener("click", () => {
        tabText.classList.add("active");
        tabText.style.color = "var(--text-main)";
        tabMetrics.classList.remove("active");
        tabMetrics.style.color = "var(--text-muted)";
        panelText.style.display = "flex";
        panelMetrics.style.display = "none";
      });
      tabMetrics.addEventListener("click", () => {
        tabMetrics.classList.add("active");
        tabMetrics.style.color = "var(--text-main)";
        tabText.classList.remove("active");
        tabText.style.color = "var(--text-muted)";
        panelText.style.display = "none";
        panelMetrics.style.display = "flex";
      });
    }

    // Set initial text input value from select change
    const updateTextInputVal = () => {
      const key = textSelector.value;
      textInput.value = localMemoryTexts[key] || "";
    };
    textSelector.addEventListener("change", updateTextInputVal);
    updateTextInputVal();

    // Set initial metric input value from select change
    if (metricSelector && metricInput) {
      const updateMetricInputVal = () => {
        const key = metricSelector.value;
        const ov = getMetricOverride(key);
        metricInput.value = ov !== null ? ov : "";
      };
      metricSelector.addEventListener("change", updateMetricInputVal);
      updateMetricInputVal();
    }

    // Apply Text Button
    const btnApplyText = document.getElementById("btn-apply-text");
    if (btnApplyText) {
      btnApplyText.addEventListener("click", () => {
        const key = textSelector.value;
        const text = textInput.value.trim();
        
        try {
          if (text === "") {
            delete localMemoryTexts[key];
            localStorage.setItem("gd_custom_texts", JSON.stringify(localMemoryTexts));
            showToast("Đã xóa tùy biến tiêu đề! Dashboard sẽ tự động tải lại để áp dụng.", "success");
            setTimeout(() => {
              window.location.reload();
            }, 800);
            return;
          } else {
            localMemoryTexts[key] = text;
            localStorage.setItem("gd_custom_texts", JSON.stringify(localMemoryTexts));
            applyCustomText(key, text);
            showToast("Đã cập nhật tiêu đề thành công!", "success");
          }
        } catch(e) {
          if (text === "") {
            delete localMemoryTexts[key];
            showToast("Đã xóa tùy biến tiêu đề thành công!", "success");
          } else {
            localMemoryTexts[key] = text;
            applyCustomText(key, text);
            showToast("Đã cập nhật tiêu đề thành công!", "success");
          }
        }
      });
    }

    // Apply Metric Button
    const btnApplyMetric = document.getElementById("btn-apply-metric");
    if (btnApplyMetric) {
      btnApplyMetric.addEventListener("click", () => {
        const key = metricSelector.value;
        const valStr = metricInput.value.trim();
        
        if (valStr !== "") {
          const parsed = parseFloat(valStr);
          if (isNaN(parsed)) {
            showToast("Vui lòng nhập một số hợp lệ!", "warning");
            return;
          }
        }
        
        try {
          if (valStr === "") {
            delete localMemoryMetrics[key];
            showToast(`Đã xóa ghi đè cho chỉ số ${metricSelector.options[metricSelector.selectedIndex].text}`, "success");
          } else {
            localMemoryMetrics[key] = parseFloat(valStr);
            showToast(`Đã ghi đè chỉ số thành: ${valStr}`, "success");
          }
          localStorage.setItem("gd_metric_overrides", JSON.stringify(localMemoryMetrics));
        } catch(e) {
          if (valStr === "") {
            delete localMemoryMetrics[key];
            showToast(`Đã xóa ghi đè cho chỉ số ${metricSelector.options[metricSelector.selectedIndex].text}`, "success");
          } else {
            localMemoryMetrics[key] = parseFloat(valStr);
            showToast(`Đã ghi đè chỉ số thành: ${valStr}`, "success");
          }
        }
        
        refreshAllActiveViews();
      });
    }

    // Reset All Customizations Button
    const btnReset = document.getElementById("btn-reset-overrides");
    if (btnReset) {
      btnReset.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn xóa tất cả tùy biến text và ghi đè chỉ số không?")) {
          localStorage.removeItem("gd_custom_texts");
          localStorage.removeItem("gd_metric_overrides");
          showToast("Đã xóa toàn bộ tùy biến! Dashboard sẽ tự động tải lại để áp dụng.", "success");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      });
    }
  }

  function refreshAllActiveViews() {
    try { updateCoreKpis(); } catch(e) {}
    try { handleTabActivation(activeTab); } catch(e) {}
  }

  fixCardTitleOverflows();
  applyAllCustomTexts();
  initLiveCustomizer();

  // Restore active tab and subtabs on page load
  try {
    const savedTab = localStorage.getItem("gd_active_tab");
    if (savedTab) {
      const savedSubtab = localStorage.getItem("gd_active_subtab_" + savedTab);
      window.switchTab(savedTab, savedSubtab);
    }
  } catch(e) {}

  // Dynamic mouse-following glass glare reflection setup
  function initGlassGlareTracking() {
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.card');
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    });
  }
  initGlassGlareTracking();

  initSidebarLayoutControls();

  // Show the app container once DOMContentLoaded initialization is complete
  try {
    const isJxaTest = (typeof window === "undefined" || typeof window.location === "undefined" || !window.location.href);
    if (isJxaTest || localStorage.getItem("gd_user_logged_in") === "true") {
      const appContainer = document.querySelector(".app-container");
      if (appContainer) appContainer.style.opacity = "1";
    }
  } catch(e) {}
});

/* ===== Tooltip v2 — white frosted card with labeled rows (parses data-tooltip) ===== */
(function(){
  function init(){
    try{
      if (typeof document === 'undefined' || !document.body || !document.createElement || !document.addEventListener) return;
      if (document.getElementById('gd-tip')) return;
      var tip = document.createElement('div'); tip.id = 'gd-tip'; document.body.appendChild(tip);
      var cur = null;
      function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      function build(host){
        var raw = host.getAttribute('data-tooltip'); if(!raw) return false;
        var title = '';
        var head = host.closest ? host.closest('h2,h3,h4,.card-title,.card-title-bar,label') : null;
        if(head && head.cloneNode){ var c = head.cloneNode(true); var ht = c.querySelector ? c.querySelector('.has-tooltip') : null; if(ht && ht.remove) ht.remove(); title = (c.textContent||'').replace(/\s+/g,' ').trim(); }
        if(!title){ var dm = host.getAttribute('data-metric'); if(dm) title = dm; }
        var lines = raw.split(/\r?\n/).map(function(s){ return s.trim(); }).filter(Boolean);
        var known = /^(Ý nghĩa|Cách tính|Công thức|Biến động|Phụ đề)\s*:/i;
        var html = title ? '<div class="gd-tip-title">'+esc(title)+'</div>' : '';
        lines.forEach(function(ln){
          var idx = ln.indexOf(':');
          if(idx > 0 && known.test(ln)){ html += '<div class="gd-tip-row"><b>'+esc(ln.slice(0,idx+1))+'</b> '+esc(ln.slice(idx+1).trim())+'</div>'; }
          else { html += '<div class="gd-tip-row">'+esc(ln)+'</div>'; }
        });
        tip.innerHTML = html; return true;
      }
      function place(host){
        var r = host.getBoundingClientRect(), tr = tip.getBoundingClientRect(), gap = 10;
        var vw = window.innerWidth, vh = window.innerHeight;
        var left = r.right + gap, top = r.top + r.height/2 - tr.height/2;
        if(left + tr.width > vw - 8){ left = r.left - gap - tr.width; }            // flip to the left
        if(left < 8){ left = Math.min(Math.max(8, r.left), vw - tr.width - 8); top = r.bottom + gap; } // fall below
        top = Math.max(8, Math.min(top, vh - tr.height - 8));
        tip.style.left = Math.round(left)+'px'; tip.style.top = Math.round(top)+'px';
      }
      function show(host){ if(!build(host)) return; cur = host; place(host); tip.classList.add('show'); }
      function hide(){ cur = null; tip.classList.remove('show'); }
      document.addEventListener('mouseover', function(e){ var h = e.target.closest && e.target.closest('.has-tooltip,.has-tile-tooltip'); if(h && h !== cur) show(h); });
      document.addEventListener('mouseout', function(e){ var h = e.target.closest && e.target.closest('.has-tooltip,.has-tile-tooltip'); if(h){ var to = e.relatedTarget; if(!to || (h.contains && !h.contains(to))) hide(); } });
      document.addEventListener('click', function(e){ var h = e.target.closest && e.target.closest('.has-tooltip,.has-tile-tooltip'); if(h){ if(cur === h) hide(); else show(h); } else if(cur) hide(); });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hide(); });
      window.addEventListener('scroll', function(){ if(cur) place(cur); }, true);
      window.addEventListener('resize', hide);
    }catch(e){}
  }
  try{ if(typeof document !== 'undefined' && document.addEventListener && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); }catch(e){}
})();
