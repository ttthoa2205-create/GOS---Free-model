# 📘 PLAYBOOK — Growth Operating System (GOS)

**Tài liệu hướng dẫn sử dụng & onboarding toàn diện · Miễn phí cho mọi người từ OT Growth**
Dành cho: CEO · CMO · Growth Lead · Product Manager · Creative · Admin
Phiên bản tài liệu: 1.0 · Ngôn ngữ: Tiếng Việt

> GOS là một **bảng điều khiển vận hành tăng trưởng (Growth Operations Console)** một trang (single-page web app), gom toàn bộ dữ liệu Marketing, Khách hàng, Sản phẩm, Tài chính và Chiến lược của một doanh nghiệp fintech/crypto vào một giao diện kính mờ (glassmorphism) duy nhất. Mục tiêu của Playbook này là giúp người dùng mới **hiểu, thao tác và làm chủ toàn bộ ứng dụng trong thời gian ngắn nhất**.

> 🎬 **Bản trực quan tất-cả-trong-một:** Mở [PLAYBOOK.html](PLAYBOOK.html) — playbook trình bày đẹp (in được ra PDF) gồm **video hướng dẫn tương tác** + chi tiết 12 module + cẩm nang tùy biến (nhập liệu · thông số · thương hiệu). Miễn phí hoàn toàn từ OT Growth.

---

## 🧭 Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Giao diện chung & các thành phần lặp lại](#2-giao-diện-chung--các-thành-phần-lặp-lại)
3. [Đăng nhập, tài khoản & phân quyền (RBAC)](#3-đăng-nhập-tài-khoản--phân-quyền-rbac)
4. [Hướng dẫn chi tiết từng module (12 tab)](#4-hướng-dẫn-chi-tiết-từng-module-12-tab)
5. [Nhập liệu, chỉnh sửa, lọc, tìm kiếm & xuất báo cáo](#5-nhập-liệu-chỉnh-sửa-lọc-tìm-kiếm--xuất-báo-cáo)
6. [Luồng thao tác chuẩn của người dùng](#6-luồng-thao-tác-chuẩn-của-người-dùng)
7. [Use Cases — Ví dụ sử dụng thực tế](#7-use-cases--ví-dụ-sử-dụng-thực-tế)
8. [Mẹo, lưu ý & lỗi thường gặp](#8-mẹo-lưu-ý--lỗi-thường-gặp)
9. [Xử lý sự cố cơ bản (Troubleshooting)](#9-xử-lý-sự-cố-cơ-bản-troubleshooting)
10. [Tham khảo: Cấu trúc dữ liệu & công thức](#10-tham-khảo-cấu-trúc-dữ-liệu--công-thức)

---

## 1. Tổng quan hệ thống

### 1.1 GOS là gì?
GOS hợp nhất nhiều "kho dữ liệu rời rạc" (Marketing, Vòng đời Khách hàng, Virality Sản phẩm, Hiệu quả Vốn, KPI Chiến lược) thành một **trung tâm chỉ huy tăng trưởng** thống nhất. Hệ thống được thiết kế quanh mô hình phễu **AARRR / Value Formation** (Thu hút → Kích hoạt → Giữ chân → Doanh thu → Lan truyền), giúp lãnh đạo "đọc trạng thái sức khỏe doanh nghiệp trong 5 giây" rồi đi sâu vào từng module.

### 1.2 Đối tượng sử dụng & vai trò
Hệ thống dùng cơ chế **RBAC (Role-Based Access Control)** — mỗi vai trò chỉ thấy đúng phần dữ liệu được cấp:

| Vai trò | Trọng tâm công việc | Tab được cấp mặc định |
| :--- | :--- | :--- |
| **CEO** | Toàn cảnh, OKR, vốn, chiến lược | **Tất cả tab** (toàn quyền) |
| **CMO** | Marketing, chi tiêu, thương hiệu | Tổng quan, Quảng cáo, Nội dung, Chiến lược, Thị trường, Hướng dẫn |
| **Growth Lead** | Acquisition, spend, bão hòa kênh | Quảng cáo, Nội dung, Chiến lược, Thị trường, Hướng dẫn |
| **Product Manager** | Sản phẩm, khách hàng, vận hành | Khách hàng, Sản phẩm, Đội ngũ, Hướng dẫn |
| **Creative Specialist** | Sáng tạo nội dung, thư viện hook | Nội dung, Đội ngũ, Hướng dẫn |
| **Admin** | Toàn quyền hệ thống + cấu hình | Tất cả tab + Cài đặt (không gồm Tổng quan) |

### 1.3 Triết lý dữ liệu
Toàn bộ ứng dụng chạy trên hai tập dữ liệu sống chính:
- **`db.customers`** — sổ cái khách hàng (mỗi dòng = 1 user, với hành vi + tài chính). Nguồn cho attribution, LTV, cohort, health.
- **`db.campaigns`** — bảng tổng hợp hiệu suất quảng cáo theo kênh/chiến dịch. Nguồn cho CAC, ROAS, ROI, saturation.

Các tập phụ trợ: `db.meu` (Monthly Effective Users / cohort sáng tạo), `db.teamTasks`, `db.configs`, `db.auditLogs`, `db.competitorIntel`, `db.geopoliticalRegimes`, `db.economicCalendar`… (chi tiết ở [Phần 10](#10-tham-khảo-cấu-trúc-dữ-liệu--công-thức)).

### 1.4 Yêu cầu & cách chạy
- **Yêu cầu:** Python 3.x; trình duyệt hiện đại (Chrome/Safari/Firefox/Edge).
- **Khởi động server cục bộ:**
  ```bash
  python3 serve.py
  ```
  Mở trình duyệt tới **http://127.0.0.1:8799**.
- **Cấu trúc thư mục:** `index.html` (giao diện) · `app.js` (logic) · `style.css` (giao diện kính mờ) · `data/data.js` (cơ sở dữ liệu mẫu) · `data/backups/` (sao lưu JSON) · `tests/` (bộ kiểm thử).

---

## 2. Giao diện chung & các thành phần lặp lại

### 2.1 Bố cục màn hình (4 vùng)
```
┌──────────────────────────────────────────────────────────────────────┐
│ TOPBAR: Tên trang · Tìm nhanh (⌘K) · Theme · Chỉ xem · Tùy chỉnh ·     │
│         Persona · Bộ chọn thời gian       │  Health 78/100 · LTV/CAC   │
├────────────┬──────────────────────────────────────────┬───────────────┤
│            │                                          │               │
│  SIDEBAR   │       VÙNG NỘI DUNG CHÍNH (75–85%)        │  PANEL PHẢI   │
│  (điều     │   Dải KPI · Thẻ phân tích · Biểu đồ ·     │  Growth       │
│  hướng)    │   Bảng · Gauge sức khỏe · Chỉ báo         │  Recommend·   │
│            │                                          │  Tùy biến live│
└────────────┴──────────────────────────────────────────┴───────────────┘
```

### 2.2 Thanh điều hướng (Sidebar) — 12 module, 4 nhóm
- **Tổng quan**
- **Tăng trưởng:** Khách hàng · Sản phẩm · Quảng cáo · Nội dung · Thí nghiệm
- **Chiến lược & Vốn:** Tài chính · Chiến lược · Thị trường
- **Vận hành & Hệ thống:** Đội ngũ · Cài đặt · Sơ đồ & Hướng dẫn

> Bấm logo **GROWTH OS** ở góc trên-trái để quay nhanh về Tổng quan. Các tab không thuộc quyền của bạn sẽ được **ẩn tự động**.

### 2.3 Topbar — các công cụ luôn hiện
| Thành phần | Chức năng |
| :--- | :--- |
| **Tìm nhanh (⌘K)** | Ô tìm kiếm toàn cục. |
| **Theme (🌙/☀️)** | Chuyển giao diện Sáng ↔ Tối (glassmorphism cả hai). |
| **Chỉ xem** | Khóa thao tác chỉnh sửa để trình bày/đọc an toàn. |
| **Tùy chỉnh** | Bật chế độ sửa nhãn chữ & ngưỡng KPI ngay trên giao diện (chỉ CEO/Admin). |
| **Active Persona** | (CEO) chuyển vai trò để xem dashboard dưới góc nhìn từng phòng ban. |
| **Bộ chọn thời gian** | 7 / 30 / 90 / 180 / 365 ngày — đổi kỳ phân tích (xem 2.4). |
| **Health · LTV/CAC** | Hai chỉ số sức khỏe luôn hiển thị bên phải topbar. |

### 2.4 Công cụ thời gian — dữ liệu đổi theo kỳ như thế nào?
Khi bạn đổi kỳ (7/30/90/180/365 ngày), hệ thống áp dụng **hai cơ chế đồng bộ**:
- **Lọc theo thời gian** (dữ liệu dựa trên khách hàng): chỉ giữ khách có `Install_Date ≥ Hôm nay − số ngày`. Áp cho phân khúc, database explorer, payback, attribution, benchmark.
- **Co giãn theo thời gian** (dữ liệu chiến dịch tổng hợp): nhân theo hệ số kỳ.
  - `GD_PERIOD_FACTOR = số ngày / 30` → nhân các đại lượng **dòng chảy** (Spend, Revenue, KYC…).
  - `GD_EFF` (drift hiệu suất nhẹ) → nhân các **tỷ lệ** (CVR, Hook Rate…); CAC và "thời gian" nhân nghịch `1/GD_EFF`.

> **8 tab dữ liệu** (Tổng quan, Khách hàng, Sản phẩm, Quảng cáo, Nội dung, Thí nghiệm, Tài chính, Đội ngũ) **phản hồi theo kỳ thời gian**.
> **4 tab tham chiếu** (Chiến lược, Thị trường, Cài đặt, Sơ đồ & Hướng dẫn) **cố ý không đổi theo kỳ** — vì số liệu ở đó là **mục tiêu/định nghĩa cố định** (OKR, quy mô thị trường, cấu hình, tài liệu); nếu cho "trôi" theo kỳ sẽ hiển thị số sai.

### 2.5 Các khối UI lặp lại (xuất hiện ở nhiều tab)
- **Dải KPI (KPI strip):** hàng thẻ ở đầu trang — mỗi thẻ gồm *icon · giá trị lớn · xu hướng (▲/▼ % MoM) · biểu đồ sparkline*. Đây là "đọc trạng thái trong 5 giây".
- **Value Health Score (đồng hồ gauge):** mặt đồng hồ kim chỉ 0–100, kèm nhãn (Tốt/Khá/Cảnh báo), 2 thanh thành phần, và **dải nút kỳ thời gian riêng** (1 năm/6th/3th/1th/7 ngày).
- **Chỉ báo & Lưu ý (Signals):** các ô tín hiệu (xanh = tốt, cam = chú ý, đỏ = rủi ro) + hộp **Lưu ý** ghi khuyến nghị hành động.
- **Tooltip 4 lớp (rất quan trọng):** rê chuột vào biểu tượng **ℹ️** cạnh tên mỗi chỉ số để xem:
  > **Ý nghĩa** (chỉ số nói lên điều gì) · **Cách tính** (logic) · **Công thức** (toán học) · **Biến động** (tăng/giảm nghĩa là gì). Mọi chỉ số đều minh bạch theo thiết kế — khi không chắc, hãy hover.

### 2.6 Persona View & phân quyền hiển thị
Thẻ **"Persona View"** (ở Tổng quan) tự sinh tóm tắt điều hành theo vai trò đang chọn (Tổng quan sức khỏe · Nguyên nhân cốt lõi · Rủi ro cần giám sát · Đề xuất hành động từ AI). CEO có thể đổi persona để xem nhanh ưu tiên của từng phòng ban.

---

## 3. Đăng nhập, tài khoản & phân quyền (RBAC)

### 3.1 Khởi đầu sạch — đăng nhập CEO mặc định
Hệ thống khởi tạo với **một tài khoản quản trị cao nhất duy nhất: CEO**. Mọi tài khoản khác do CEO tạo về sau.
1. Mở app → màn hình **đăng nhập** hiện ra (kèm ô hướng dẫn "Khởi tạo & phân quyền hệ thống").
2. Đăng nhập bằng tài khoản CEO mặc định:
   - **Email:** `ceo@ot-growth.com`
   - **Mật khẩu:** `gos123`
3. Bấm **Đăng Nhập** → vào thẳng dashboard với toàn quyền.

### 3.2 Đổi email & mật khẩu của chính mình
Sau khi vào, hãy bảo mật tài khoản:
1. Vào tab **Cài đặt → Phân quyền Thành viên**.
2. Ở dòng tài khoản của bạn, bấm **Sửa** (✎).
3. Nhập **Email mới** và/hoặc **Mật khẩu mới** → **Lưu thay đổi**.

### 3.3 Tạo thành viên mới (chỉ CEO)
1. Vào **Cài đặt → Phân quyền Thành viên** → bấm **+ Thêm thành viên mới**.
2. Điền form:
   | Trường | Mô tả |
   | :--- | :--- |
   | **Họ tên thành viên** | Tên hiển thị (vd: "Growth Lead"). |
   | **Email đăng nhập** | Bắt buộc đuôi `@ot-growth.com`; không trùng. |
   | **Phòng ban** | Marketing / Content / Design / Product / Data / Customer Success. |
   | **Vai trò & Quyền hạn** | CMO / Growth Lead / Product Manager / Creative Specialist / Admin (quyết định tab được cấp). |
   | **Mật khẩu khởi tạo** | Mặc định `gos123` (nên đổi). |
3. Bấm **Thêm thành viên** → tài khoản được tạo ở trạng thái **Đang Khóa**.

### 3.4 Kích hoạt / Khóa / Sửa tài khoản
- Trên bảng RBAC, mỗi tài khoản có nút **Kích hoạt / Khóa lại** và **Sửa**.
- Thành viên **chỉ đăng nhập được sau khi CEO bấm Kích hoạt**. Khóa lại = chặn đăng nhập ngay.
- Tài khoản **CEO luôn ở trạng thái "Mặc định (Không khóa)"** — không thể bị khóa, đảm bảo hệ thống luôn có quản trị viên.

### 3.5 Luồng chuẩn onboarding một thành viên
```
CEO đăng nhập → Thêm thành viên (email, tên, phòng ban, vai trò, mật khẩu)
        → Tài khoản ở trạng thái KHÓA → CEO bấm "Kích hoạt"
        → Gửi email + mật khẩu khởi tạo cho thành viên
        → Thành viên đăng nhập → đổi mật khẩu → chỉ thấy tab theo vai trò
```

### 3.6 Ghi nhận an ninh
Mọi thao tác RBAC (tạo/sửa/kích hoạt/khóa) đều được ghi vào **Nhật ký Hoạt động (Audit Logs)** ở tab Cài đặt — phục vụ truy vết.

---

## 4. Hướng dẫn chi tiết từng module (12 tab)

> Mỗi module trình bày theo cấu trúc: **Mục đích → Sub-tab → Thành phần chính → Chỉ số & ý nghĩa → Tương tác → Ví dụ nhanh.**

### 4.1 🏠 Tổng quan (Overview)
**Mục đích:** Ảnh chụp nhanh sức khỏe doanh nghiệp hằng ngày cho lãnh đạo; nơi bắt đầu mỗi phiên làm việc.

**Thành phần chính:**
- **North Star Metric:** chỉ số ngôi sao dẫn đường (vd: *Người dùng Giao dịch Hoạt động — Funded Active Traders*) kèm cây chỉ số đầu vào: `NSM = Kích hoạt × FTD × Giữ chân × Tần suất`.
- **Persona View (CEO):** tóm tắt 4 ô (sức khỏe · nguyên nhân · rủi ro · đề xuất AI).
- **Dải KPI:** Doanh thu · KYC Onboarding · Hệ số LTV/CAC · CAC/KYC · ROAS.
- **Growth Health Score (gauge):** điểm sức khỏe tổng hợp 0–100 (xem công thức ở [10.2](#102-các-công-thức-cốt-lõi)).
- **Biểu đồ Spend/Revenue/KYC theo thời gian**, **Phễu chuyển đổi** (Views→Register→KYC→FTD), **Cohort giữ chân**, **Phân bổ ngân sách (donut)**, **Bảng hiệu suất kênh**.
- **Trung tâm Cảnh báo (Alerts):** có nút *Mô phỏng CPA Spike* và tùy chọn *tự động tạm dừng Ads*.

**Chỉ số tiêu biểu:** Growth Health, LTV/CAC, ROAS, tỷ lệ chuyển đổi từng bước phễu.

**Tương tác:** đổi kỳ thời gian (đồng bộ toàn trang) · thu/mở Persona · mô phỏng cảnh báo · đổi Tuần/Tháng cho biểu đồ.

**Ví dụ nhanh:** Mỗi sáng, xem Growth Health + dải KPI → nếu CAC/KYC ▲ bất thường, mở Phễu chuyển đổi để tìm bước nghẽn.

---

### 4.2 👥 Khách hàng (Customer)
**Mục đích:** Phân tích sâu phân khúc, cohort, LTV, dự báo churn/whale và hành trình đa kênh của khách hàng.

**Sub-tab:**
| Sub-tab | Nội dung |
| :--- | :--- |
| **Phân khúc & KPIs** | Dải KPI khách hàng (Active Trader Rate, Whale Rate, High Intent, Avg Time to Activate, Trades/User, Organic KYC, Incentive Efficiency) + **Value Health Score** + **Chỉ báo & Lưu ý** + phân bố phân khúc + Chân dung Khách hàng Lý tưởng (ICP). |
| **Cohorts & LTV** | Đường cong sống sót cohort, ma trận giữ chân D1–D90, LTV tích lũy theo cohort. |
| **Dự báo & Churn** | **Whale Predictor** & **Churn Engine**: nhập `Customer_ID` → dự báo xác suất Whale/Churn + chiến lược AI. |
| **Cơ sở Dữ liệu & Event Stream** | Trình khám phá 360° (14 cột) + dòng sự kiện thời gian thực; có **tìm kiếm, lọc, xuất CSV**. |
| **Hành trình (4 mục)** | Sơ đồ hành trình · Ma trận dịch chuyển kênh · Phễu di cư vòng đời · Mô hình phân bổ điểm chạm (5 mô hình). |

**Chỉ số & ý nghĩa:**
- **Whale Flag:** khách có Deposit ≥ **$5,000**.
- **Phân khúc:** Whale / Core / Casual / Dormant / New User.
- **Retention Status:** Active / At Risk / Churned.
- **Cohort Survival %** = Users hoạt động ngày *t* / Users ban đầu × 100%.

**Tương tác:** chọn mô hình phân bổ (First/Last/Linear/Time-Decay/Position) → bảng đóng góp doanh thu tính lại; chạy dự báo theo `Customer_ID`; lọc/tìm/xuất ở Database Explorer.

**Ví dụ nhanh:** Nhập `CUST-0007` vào Whale Predictor → nếu xác suất Whale cao → đưa vào danh sách chăm sóc VIP.

---

### 4.3 🚀 Sản phẩm (Product)
**Mục đích:** Đo gắn kết sản phẩm, phễu kích hoạt, điểm ma sát UX và hiệu quả vòng lặp lan truyền.

**Sub-tab:**
- **Chỉ số Sản phẩm & Ma sát:** DAU/MAU, **Stickiness = DAU/MAU × 100%**, bảng Feature Adoption/Retention, nhật ký ma sát (rage-click, dead-click, crash, form-abandon).
- **Phễu Kích hoạt (Activation):** phễu Install→Register→KYC→FTD→First Trade; Session Replay; so sánh onboarding iOS vs Android; Aha Moment.
- **Hệ số Lan truyền (K-Factor):** Referral Rate, Invite Rate, Viral Cycle Time, **K-Factor**, bảng các Growth Loop.

**Chỉ số & ý nghĩa:**
- **K-Factor** = Tỷ lệ gửi lời mời × Trung bình tỷ lệ chuyển đổi vòng lặp × Hệ số virality. K > 0.5 ⇒ lan truyền tốt; K > 1 ⇒ tăng trưởng cấp số nhân. *(Giá trị được tính sống ≈ 0.32 từ dữ liệu mẫu, không phải số cứng.)*
- **Activation Rate** = Users đạt kích hoạt / Tổng signup mới × 100%.
- **Friction Rate** = Sessions có ma sát / Tổng sessions × 100% (giảm ⇒ UX tốt hơn ⇒ CVR phễu tăng).

**Tương tác:** thêm lỗi ma sát giả lập; thêm vòng lặp giới thiệu; lọc onboarding theo kênh; xem session replay.

**Ví dụ nhanh:** Thấy `form_abandon` cao ở bước OTP → mở Session Replay phiên tương ứng để chẩn đoán.

---

### 4.4 📣 Quảng cáo (Acquisition)
**Mục đích:** Theo dõi hiệu suất kênh quảng cáo, phân bổ đa điểm chạm và chất lượng tracking UTM.

**Sub-tab:** Hiệu suất Chiến dịch · Mô hình Phân bổ · Cấu trúc UTM · Sức khỏe UTM.

**Thành phần chính:** Dải KPI (Blended CAC, ROAS, ROI ròng, Chi tiêu Ads, Best Channel ROI, Tỷ trọng Paid) · Ma trận phân bổ kênh theo mô hình · Đánh giá & mở rộng kênh · So sánh Paid vs Blended CAC · Trung tâm hạ tầng tracking · Bộ kiểm tra/checklist UTM.

**Chỉ số & ý nghĩa:**
- **Blended CAC** = Tổng chi Ads / Tổng khách KYC. ▲ = kém hiệu quả; ▼ = mix kênh tốt hoặc organic cao.
- **ROAS** = Doanh thu / Chi tiêu. ≥ 3.0x là khỏe với fintech/crypto.
- **LTV/CAC** ≥ 3.0x là bền vững; < 2.0x là báo động.
- **Data Quality Rate** = Sự kiện hợp lệ / Tổng sự kiện × 100% (< 95% ⇒ "nợ tracking").

**Tương tác:** chuyển mô hình phân bổ (Last/First/Linear/Data-Driven) · lọc theo kênh · kiểm tra link UTM · xuất báo cáo.

**Ví dụ nhanh:** So sánh First-touch vs Last-touch → nếu Last-touch "ăn" hết công của kênh cuối phễu, hãy tăng ngân sách kênh đầu phễu bị định giá thấp.

---

### 4.5 🎬 Nội dung (Content)
**Mục đích:** Quản lý vòng đời sáng tạo, hiệu suất hook/thông điệp và vận hành sản xuất nội dung.

**Sub-tab:** (mặc định) Hiệu suất Sáng tạo · **KPI & Khung đo lường** · **Thử nghiệm & Đánh giá Creative**.

**Thành phần chính:** Dải KPI nội dung (Hook Rate 3s, CTR, CVR, AI Creative Score, Active Creatives, Fatigue Signals) + **Value Health "Sức khỏe Creative"** + **Chỉ báo & Lưu ý** · Win/Loss creative · **Message-Market Fit Matrix** · **Hook Intelligence** · phân tích retention video & drop-off · đường cong **Frequency × CVR Decay** · ma trận Theme × Platform · lịch xuất bản nội dung · backlog ý tưởng (ICE).

**Chỉ số & ý nghĩa:**
- **Hook Rate (3s)** = Lượt xem 3 giây đầu / Impressions × 100% (≥ 30% là tốt).
- **Fatigue Index:** tổ hợp tần suất × suy giảm CVR; > ngưỡng ⇒ cần làm mới creative.
- **Creative ROI** = Doanh thu / Chi phí sản xuất.

**Tương tác:** chọn creative để xem đường cong retention + "Root Cause Engine"; lọc lịch theo kênh; thêm ý tưởng sáng tạo; CRUD backlog.

**Ví dụ nhanh:** Fatigue Signals = 4 ads → mở Frequency Decay → ad nào > 4.0x tần suất thì lên lịch làm mới.

---

### 4.6 🧪 Thí nghiệm (Experiments)
**Mục đích:** Vận hành văn hóa thử nghiệm: pipeline A/B theo ICE, tốc độ học hỏi, tự động hóa vòng đời, lắng nghe khách hàng (VoC), kho SOP.

**Sub-tab:** Backlog Thử nghiệm (ICE) · Lifecycle Automation · Ý kiến Khách hàng (VoC) · Kho SOP & Playbooks.

**Thành phần chính:** KPI Velocity & Win Rate · Learning Repository · **Bảng pipeline ICE** · **Incrementality Lab (máy tính Lift)** · các journey email/push tự động · NPS/CSAT + sentiment + feed phản hồi · thư viện SOP/Playbook (Amazon 6-pager, A/B runbook, Whale VIP, KYC…).

**Chỉ số & ý nghĩa:**
- **ICE Score** = Impact × Confidence × Ease (mỗi yếu tố 1–10) → sắp xếp ưu tiên backlog.
- **Incremental Lift** = (CVR_test − CVR_control) / CVR_control × 100% (> 20% là đáng kể; < 0 cảnh báo).
- **NPS** = %Promoters (9–10) − %Detractors (0–6).

**Tương tác:** sắp xếp/di chuyển trạng thái thí nghiệm; nhập số vào máy tính Lift → ra Lift & iCPA; thêm learning/feedback; đọc playbook.

**Ví dụ nhanh:** Trước khi nhân rộng một chiến dịch, vào Incrementality Lab nhập CVR test/control để xác minh tác động thật (không chỉ tương quan).

---

### 4.7 🧭 Chiến lược (Strategy) · *(tab tham chiếu — không đổi theo kỳ)*
**Mục đích:** Định vị giai đoạn tăng trưởng, ưu tiên chiến lược theo mốc thời gian, nhận diện điểm nghẽn và nhận đề xuất từ AI Copilot.

**Sub-tab:** Strategy Board · AI Growth Copilot · Early Warning Radar.

**Thành phần chính:** đánh giá Giai đoạn tăng trưởng (Pre-PMF→Mature) · Ưu tiên chiến lược 3/6/12 tháng · Khung điểm nghẽn (Constraint) · Sơ đồ Growth Loop · **Đề xuất AI Copilot** (kèm nút *Áp dụng Đề xuất*) · Chợ giải pháp (vấn đề → cách xử lý) · **Radar cảnh báo sớm** (Churn Risk, CAC Spike, Cash Runway, Team Bottlenecks).

**Chỉ số & ý nghĩa:** *Constraint Index* = tỷ lệ chuyển đổi bước thấp nhất / trung bình phễu; *K-factor* cho growth loop; trọng số sức khỏe **thay đổi theo giai đoạn** (vd: Pre-PMF ưu tiên Retention 40%).

**Tương tác:** chọn giai đoạn → ưu tiên & đề xuất cập nhật; bấm "Áp dụng Đề xuất".

---

### 4.8 🌐 Thị trường (Market) · *(tab tham chiếu — không đổi theo kỳ)*
**Mục đích:** Quy mô thị trường (TAM/SAM/SOM), xu hướng tìm kiếm, theo dõi đối thủ và định vị SWOT.

**Sub-tab:** Quy mô Thị trường & Quốc gia · Theo dõi Đối thủ · SWOT Engine.

**Thành phần chính:** TAM/SAM/SOM (thanh tỷ lệ) · xu hướng từ khóa · ma trận cơ hội quốc gia ASEAN · **Bảng theo dõi đối thủ (CRUD)** · Share of Voice · phân tích chiến lược đối thủ · **ma trận SWOT 2×2**.

**Chỉ số & ý nghĩa:** *TAM* = số khách tiềm năng × chi tiêu TB/năm; *SOV %* = lượt hiển thị của ta / tổng ngành × 100%; *Opportunity Score* (quốc gia) = Dân số×0.3 + Tăng trưởng GDP×0.3 + Độ chín số×0.4.

**Tương tác:** thêm đối thủ / xu hướng giả lập; sửa/xóa đối thủ; SWOT render từ dữ liệu.

---

### 4.9 💰 Tài chính (Capital)
**Mục đích:** Dự báo doanh thu theo kịch bản vĩ mô, tối ưu phân bổ ngân sách, tính payback theo kênh và đánh giá sức khỏe vốn.

**Sub-tab:** Dự báo Vĩ mô & Kịch bản · Tối ưu hóa Ngân sách.

**Thành phần chính:** **Capital Health Score (gauge)** · dải KPI phân bổ vốn (Best Channel ROI, Saturation Signal, Paid/Organic, Marginal LTV/CAC, Time-to-Truth, Cannibalization) · biểu đồ kịch bản Bear/Base/Bull · bộ chọn **Kịch bản địa chính trị** · **Lịch kinh tế & địa chính trị (LIVE)** · đường cong bão hòa kênh · **Bộ máy phân bổ ngân sách** · **Payback & Break-even** · **Mô phỏng tái phân bổ ngân sách**.

**Chỉ số & ý nghĩa:**
- **Runway (tháng)** = Tiền mặt / Chi phí ròng hàng tháng.
- **Payback Month** = tháng đầu tiên mà Doanh thu tích lũy ≥ CAC.
- **Marginal CAC** = ΔSpend / ΔFTD (tăng ⇒ kênh bão hòa).

**Tương tác:** chọn kịch bản Bear/Base/Bull; kéo slider ngân sách & bật ràng buộc (cap kênh) → "Re-allocate Optimally"; chọn kênh From/To + số tiền → "Run Reallocation Simulator" → xem ΔKYC, ΔRevenue + khuyến nghị AI; lọc lịch kinh tế theo nhóm sự kiện.

**Ví dụ nhanh:** Kéo $25k thêm vào, bật "Cap TikTok < $15k" → bộ máy đề xuất phân bổ tối ưu kèm doanh thu tăng thêm ước tính.

---

### 4.10 🧑‍🤝‍🧑 Đội ngũ (Team Ops)
**Mục đích:** Quản trị hiệu suất đội ngũ, công việc, nguồn lực, OKR và sự cố.

**Sub-tab:** Dashboard Bộ phận · Công việc & RACI · Vận hành Thiết kế · Điều phối & Nguồn lực · Hiệu suất & Sức khỏe (OKR) · Xử lý Sự cố.

**Thành phần chính:** KPI & ngân sách phòng ban · **bảng Kanban công việc + ma trận RACI** · pipeline & tải Designer · phát hiện điểm nghẽn liên phòng ban · hoạch định năng lực (Capacity) · **Sơ đồ liên kết OKR 3 cấp** · theo dõi sự cố (MTTR) + AI Team Copilot.

**Chỉ số & ý nghĩa:**
- **RACI Workload** = số task vai trò R × 1 + số task vai trò A × 1.5.
- **Capacity Utilization %** = Giờ cần / Giờ khả dụng × 100% (tối ưu 80–85%).
- **MTTR** = Tổng thời gian khắc phục / Số sự cố (càng thấp càng tốt).
- **OKR Progress** = trung bình tiến độ các Key Result thành phần.

**Tương tác:** thêm/sửa/xóa task; kéo-thả task qua các cột Kanban; lọc theo người/phòng ban/độ ưu tiên; ghi nhận & cập nhật sự cố; cập nhật tiến độ OKR.

---

### 4.11 ⚙️ Cài đặt (Governance) · *(chỉ CEO/Admin)*
**Mục đích:** Cấu hình hệ thống, định nghĩa metadata/công thức, benchmark ngành, nhật ký kiểm toán và **quản trị tài khoản (RBAC)**.

**Sub-tab:** Cấu hình Hệ thống · Điểm chuẩn Ngành · Nhật ký Hoạt động · **Phân quyền Thành viên**.

**Thành phần chính:**
- **Trung tâm Cấu hình động (18 tham số):** 5 trọng số sức khỏe (`growth 0.25 · profit 0.20 · retention 0.20 · capeff 0.20 · risk 0.15` — **tổng phải = 1.00**), các ngưỡng cảnh báo, benchmark mục tiêu (LTV/CAC, CVR, CAC/KYC, ROI), tỷ phí (eKYC, SMS), đơn vị tiền tệ. Bấm **Apply & Save** để lưu + tính lại toàn bộ.
- **Metadata Center & Formula Repository:** bảng tra cứu khóa chính/khóa ngoại và công thức chính thức (Growth Health, ICE, LTV/CAC, Whale Flag…).
- **Industry Benchmarking:** so sánh chỉ số của ta vs trung bình ngành (Δ% + đánh giá màu).
- **Audit Logs:** mọi thay đổi (cấu hình, RBAC, import) — thời gian, người thao tác, mô tả, tác động.
- **Phân quyền Thành viên:** bảng tài khoản + modal Thêm/Sửa + Kích hoạt/Khóa (xem [Phần 3](#3-đăng-nhập-tài-khoản--phân-quyền-rbac)).

> ⚠️ **Quan trọng:** Tổng 5 trọng số phải bằng **1.00 (100%)**; nếu không, hệ thống sẽ cảnh báo và không lưu.

---

### 4.12 🗺️ Sơ đồ & Hướng dẫn (Data Guide)
**Mục đích:** Trực quan hóa "dữ liệu nào → ra thành phần nào", cung cấp công cụ **nhập/xuất dữ liệu hàng loạt** và prompt AID.

**Thành phần chính:**
- **System Diagram (Value Formation Journey):** sơ đồ AARRR; **bấm vào ô bất kỳ để nhảy tới thành phần tương ứng**.
- **Data Input Guide:** bảng *Thành phần · Vị trí (bấm để mở) · Khóa dữ liệu (data.js) · Trường cần nhập · Ví dụ*.
- **Trung tâm Import/Export & AI Prompt:** chọn dataset → JSON/CSV → Xuất/Tải file/Chọn file/Nhập (phiên)/Lưu vào trình duyệt/Prompt cho AI/Khôi phục mặc định (xem [Phần 5.5](#55-nhậpxuất-dữ-liệu-hàng-loạt-data-guide)).

---

## 5. Nhập liệu, chỉnh sửa, lọc, tìm kiếm & xuất báo cáo

### 5.1 Tùy chỉnh nhanh trên giao diện (Tùy chỉnh)
1. Bấm **Tùy chỉnh** trên topbar (chỉ CEO/Admin) → bật chế độ chỉnh sửa.
2. Sửa **nhãn chữ** (tiêu đề thẻ/chỉ số) hoặc **ngưỡng KPI** ngay tại chỗ (qua panel "Tùy biến live & Ghi đè" bên phải: *Sửa Text* / *Nhập Chỉ Số*).
3. Bấm **Cập nhật** để áp dụng, hoặc **Xóa tất cả Tùy biến** để hoàn nguyên.

### 5.2 CRUD (Thêm/Sửa/Xóa bản ghi)
Có ở nhiều tab: đối thủ (Thị trường), công việc & sự cố (Đội ngũ), tài khoản (Cài đặt), backlog ý tưởng/thí nghiệm (Nội dung/Thí nghiệm), pricing (Thị trường)… Nút thường có nhãn **"+ Thêm…"**, biểu tượng **✎ Sửa**, **🗑 Xóa**. Hành động xóa/ghi đè luôn có xác nhận.

### 5.3 Lọc & tìm kiếm
- **Tìm nhanh ⌘K** trên topbar (toàn cục).
- **Database Explorer** (Khách hàng → Cơ sở Dữ liệu): ô tìm theo `Customer_ID`/nguồn/quốc gia/tài sản; dropdown lọc theo **Phân khúc** và **Thiết bị**.
- Nhiều bảng có nút lọc theo **kênh / phòng ban / nhóm sự kiện**.

### 5.4 Xuất CSV / báo cáo
- **Xuất CSV** trực tiếp ở Database Explorer (nút **Xuất CSV**).
- Báo cáo phân tích (attribution, audit) xuất từ tab tương ứng.
- Xuất dữ liệu hàng loạt cho mọi dataset ở **Sơ đồ & Hướng dẫn** (xem 5.5).

### 5.5 Nhập/Xuất dữ liệu hàng loạt (Data Guide)
Tại **Sơ đồ & Hướng dẫn → Trung tâm Import/Export**:
1. **Chọn dataset** (Khách hàng, Chiến dịch, Cohort, Công việc team, MEU…) và **định dạng** (JSON/CSV).
2. **Xuất ra ô dưới** → nội dung hiện trong ô soạn thảo → sửa số liệu.
3. Nạp lại bằng một trong hai cách:
   - **Nhập (phiên):** nạp vào phiên hiện tại — *mất khi tải lại trang*.
   - **Lưu vào trình duyệt:** nạp **và** lưu localStorage — *giữ nguyên khi F5*.
4. **Tải file** để lưu ra máy; **Chọn file…** để tải file JSON/CSV lên (có thể **kéo-thả** file vào ô).
5. **Prompt cho AI:** sinh mẫu câu lệnh để nhờ AI tạo dữ liệu đúng schema → dán JSON trả về vào ô → **Nhập**.
6. **Khôi phục mặc định:** xóa toàn bộ override đã lưu → tải lại trang để về dữ liệu gốc.

> Hệ thống **kiểm tra schema** khi Nhập/Lưu: thiếu trường bắt buộc sẽ báo lỗi và **không ghi đè** (an toàn dữ liệu). Mọi lần Nhập/Lưu đều được ghi Audit Log.

---

## 6. Luồng thao tác chuẩn của người dùng

**Luồng đăng nhập tổng quát:**
`Đăng nhập → Tổng quan (đọc sức khỏe) → chọn module → lọc/tìm → mở chi tiết → hành động → phản hồi (toast/biểu đồ cập nhật)`

**Nhịp công việc theo vai trò (gợi ý):**
| Nhịp | CEO | Growth/CMO | Product/Creative |
| :--- | :--- | :--- | :--- |
| **Hằng ngày** | Tổng quan: Health, Alerts | Quảng cáo: CAC/ROAS, Sức khỏe UTM | Sản phẩm: ma sát; Nội dung: Fatigue |
| **Hằng tuần** | Chiến lược: Copilot, Radar | Thí nghiệm: chốt ICE backlog | Khách hàng: cohort; Nội dung: lịch xuất bản |
| **Hằng tháng** | Tài chính: kịch bản & runway | Tài chính: tối ưu ngân sách | Đội ngũ: OKR, Capacity |
| **Khi cần** | Cài đặt: cấu hình, RBAC | Quảng cáo: đổi mô hình phân bổ | Data Guide: cập nhật dữ liệu |

---

## 7. Use Cases — Ví dụ sử dụng thực tế

**UC-1 · Onboard một Growth Lead mới (CEO):**
Cài đặt → Phân quyền Thành viên → *+ Thêm thành viên* (email, vai trò "Growth Lead") → *Kích hoạt* → gửi mật khẩu khởi tạo → thành viên đăng nhập, đổi mật khẩu, chỉ thấy 5 tab được cấp.

**UC-2 · CAC tăng đột biến:**
Tổng quan thấy CAC/KYC ▲ → Quảng cáo → so sánh mô hình phân bổ → phát hiện Meta bão hòa → Tài chính → *Reallocation Simulator* chuyển ngân sách Meta→Apple Search → xem ΔKYC/ΔRevenue → áp dụng.

**UC-3 · Giữ chân khách Whale:**
Khách hàng → Dự báo & Churn → nhập `Customer_ID` Whale có dấu hiệu rủi ro → đọc tín hiệu + chiến lược AI → kích hoạt journey win-back ở Thí nghiệm → Lifecycle Automation.

**UC-4 · Creative bị "chai" (fatigue):**
Nội dung → dải KPI thấy *Fatigue Signals = 4* → Frequency × CVR Decay → ad > 4.0x tần suất → tạo ý tưởng mới ở backlog ICE → lên *Lịch xuất bản*.

**UC-5 · Xác minh hiệu quả thật của thử nghiệm:**
Thí nghiệm → Incrementality Lab → nhập CVR/Spend test & control → đọc **Incremental Lift** + **iCPA** → nếu Lift > 20% và iCPA < CAC nền → nhân rộng.

**UC-6 · Cập nhật dữ liệu chiến dịch hàng loạt:**
Sơ đồ & Hướng dẫn → chọn *Chiến dịch* → *Xuất* (CSV) → sửa số → *Lưu vào trình duyệt* → mở lại tab Quảng cáo để xem cập nhật (giữ qua F5).

---

## 8. Mẹo, lưu ý & lỗi thường gặp

**Mẹo:**
- 🔍 **Khi không hiểu một con số**, rê chuột vào **ℹ️** để xem Ý nghĩa/Cách tính/Công thức/Biến động.
- ⏱️ **Đổi kỳ thời gian** để xem xu hướng ngắn/dài hạn — nhớ 4 tab tham chiếu (Chiến lược/Thị trường/Cài đặt/Hướng dẫn) **không** đổi theo kỳ (đúng thiết kế).
- 💾 Muốn dữ liệu **giữ qua F5**, dùng **"Lưu vào trình duyệt"** (không phải "Nhập (phiên)").
- 🎛️ Tổng 5 trọng số ở Cài đặt **phải = 1.00**.
- 🧪 Ưu tiên backlog theo **ICE Score**, không theo cảm tính.

**Lưu ý / lỗi thường gặp:**
| Hiện tượng | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| Thành viên không đăng nhập được | Tài khoản **chưa được CEO kích hoạt** | Cài đặt → Phân quyền → *Kích hoạt* |
| Email tạo bị từ chối | Sai đuôi `@ot-growth.com` hoặc trùng | Dùng đúng đuôi, email duy nhất |
| Lưu cấu hình không được | Tổng trọng số ≠ 1.00 | Chỉnh để tổng = 1.00 rồi lưu lại |
| Nhập dữ liệu báo lỗi | Thiếu trường bắt buộc / sai định dạng | Đối chiếu *Data Input Guide*; dùng *Prompt cho AI* để sinh đúng schema |
| Dữ liệu mất sau khi F5 | Đã dùng "Nhập (phiên)" | Dùng "Lưu vào trình duyệt" |
| Vài tab "không đổi theo thời gian" | Là **tab tham chiếu** (cố ý) | Không phải lỗi — số là mục tiêu/định nghĩa cố định |

---

## 9. Xử lý sự cố cơ bản (Troubleshooting)

| Sự cố | Cách khắc phục |
| :--- | :--- |
| **Trang trắng / không tải** | Kiểm tra `python3 serve.py` đang chạy; mở đúng `http://127.0.0.1:8799`; đảm bảo có `data/data.js`. |
| **Đăng nhập đúng nhưng không vào** | Xóa cache trang & thử lại; kiểm tra đúng email/mật khẩu CEO mặc định. |
| **Vẫn thấy 6 tài khoản mẫu cũ** | Trình duyệt còn dữ liệu cũ — **xóa site-data** một lần để về "khởi đầu sạch" (chỉ CEO). |
| **Muốn về dữ liệu gốc** | Data Guide → **Khôi phục mặc định** → tải lại trang (F5). |
| **Biểu đồ/icon không hiện** | Kiểm tra kết nối mạng (Chart.js & lucide tải từ CDN); tải lại trang. |
| **Quên đã chỉnh gì** | Cài đặt → **Nhật ký Hoạt động** để truy vết mọi thay đổi. |

> Kiểm thử kỹ thuật: chạy `./run_tests.sh` (bộ JXA, kỳ vọng **5/5 PASS**) để xác nhận mọi tab render và các giá trị tính toán đúng.

---

## 10. Tham khảo: Cấu trúc dữ liệu & công thức

### 10.1 Hai bảng dữ liệu cốt lõi

**`db.customers`** (sổ cái khách hàng) — các trường chính:
`Customer_ID` · `Install_Date` · `KYC_Date` · `FTD_Date` · `Country` · `Device` (iOS/Android) · `Source` (Meta/Google/TikTok/Apple Search/Organic) · `Campaign` · `Revenue` · `Deposit` · `FTD_Volume` · `TradeVolume` · `Trade_Count` · `LTV` · `Whale_Flag` (Yes nếu Deposit ≥ $5,000) · `Segment` (Whale/Core/Casual/Dormant/New User) · `Retention_Status` (Active/At Risk/Churned) · `Onboarding_Step_Drop` · `InteractionsToKyc` · `InteractionsToFtd` · `AssetsViewed` · `VideosWatched` · `WatchTime` · `SessionFrequency`.

**`db.campaigns`** (hiệu suất quảng cáo):
`Campaign_ID` · `Channel` · `Spend` · `Impression` · `Click` · `Install` · `KYC` · `Revenue`.

### 10.2 Các công thức cốt lõi
- **Growth Health** = trung bình **có trọng số** của 5 điểm thành phần (clamp 5–100%):
  `Health = S_Growth·W_growth + S_Profit·W_profit + S_Ret·W_ret + S_CapEff·W_capeff + S_Risk·W_risk`
  với trọng số mặc định `0.25 / 0.20 / 0.20 / 0.20 / 0.15` (tổng = 1.00), trong đó:
  - `S_Growth = 65 + (Avg(R₂) − Avg(R₁))/Avg(R₁) × 220` (so nửa sau vs nửa đầu kỳ)
  - `S_Profit = (Blended LTV/CAC ÷ Target LTV/CAC) × 85`
  - `S_Ret = (D30 Retention% ÷ 25%) × 100`
  - `S_CapEff = 115 − Avg(Payback tháng) × 11`
  - `S_Risk = 100 − max(0, Whale Concentration% − (Whale Limit − 10%)) × 2.5`
- **Customer Health** = (Active + 0.5×At-Risk) / Tổng khách trong kỳ × 100%.
- **Value Health** = Doanh thu tích lũy / Deposit tích lũy × 100% (tối đa 100%).
- **K-Factor** = Invite Rate × Avg(tỷ lệ chuyển đổi vòng lặp) × Hệ số virality.
- **ICE Score** = Impact × Confidence × Ease.
- **LTV/CAC** = ΣRevenue / ΣSpend (theo phân bổ chiến dịch).

### 10.3 Co giãn theo kỳ thời gian
- `GD_PERIOD_FACTOR = số ngày kỳ / 30` → `Spend_scaled = Spend × GD_PERIOD_FACTOR`; `Revenue_scaled = Revenue × GD_PERIOD_FACTOR × GD_EFF`.
- Dữ liệu dựa-trên-khách-hàng lọc theo `Install_Date ≥ Hôm nay − số ngày`.

### 10.4 Khóa localStorage quan trọng
| Khóa | Ý nghĩa |
| :--- | :--- |
| `gd_rbac_accounts` | Danh sách tài khoản RBAC |
| `gd_rbac_account_states` | Trạng thái kích hoạt/khóa từng tài khoản |
| `gd_user_logged_in` / `gd_user_email` / `gd_user_role` / `gd_user_name` | Phiên đăng nhập hiện tại |
| `meu_growth_overrides` | Dữ liệu đã "Lưu vào trình duyệt" (override data.js) |

### 10.5 Quy tắc vận hành để số liệu chính xác
1. **Trọng số** ở Cài đặt phải **tổng = 1.00**.
2. Cập nhật **benchmark** (Target LTV:CAC, Target CVR) khi danh mục kênh thay đổi.
3. **Kịch bản địa chính trị** điều chỉnh LTV qua hệ số `retMul`/`cacMul` — chọn đúng kịch bản trước khi đọc dự báo Tài chính.

---

> 📎 **Tài liệu liên quan:** [README.md](README.md) · [data/data_flow_guide.md](data/data_flow_guide.md) (chi tiết kỹ thuật về dòng dữ liệu & schema).
> 💡 Trong ứng dụng, tab **Sơ đồ & Hướng dẫn** là phiên bản tương tác của tài liệu này — bấm vào sơ đồ để mở đúng thành phần.

*— Hết Playbook —*
