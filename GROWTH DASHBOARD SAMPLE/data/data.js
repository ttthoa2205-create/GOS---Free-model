// Master Data Engine for Growth Operating System V2 - Expanded Edition
window.GrowthData = (() => {
  // 1. SYSTEM CONFIGURATIONS (Tab 6 customizable values)
  const configs = {
    thresholds: {
      revenueDecreasePct: 20,
      cacIncreasePct: 30,
      cvrDecreasePct: 15,
      retentionDecreasePct: 10,
      whaleConcentrationPct: 40,
      roiNegative: 0
    },
    weights: {
      growth: 0.25,
      profitability: 0.20,
      retention: 0.20,
      capitalEfficiency: 0.20,
      risk: 0.15
    },
    benchmarks: {
      targetLtvCac: 3.5,
      targetCvr: 0.35,
      targetCacKyc: 15, // $
      targetRoi: 1.5 // 150%
    },
    rates: {
      ekycRate: 0.25,
      smsRate: 0.08
    },
    currency: "USD"
  };

  // 2. AUDIT LOG INITIAL SEED
  const auditLogs = [
    { timestamp: "2026-06-22 10:15:32", user: "CEO (Hannah)", change: "Xem báo cáo tổng quan tuần 25", impact: "Không ảnh hưởng dữ liệu" },
    { timestamp: "2026-06-21 14:20:00", user: "Growth Lead", change: "Điều chỉnh ngân sách chiến dịch Meta Ads", impact: "Tăng ngân sách $5,000 cho Campaign M-02" },
    { timestamp: "2026-06-20 09:30:11", user: "Data Analyst", change: "Cập nhật trọng số Growth Health Score", impact: "Cập nhật Trọng số Rủi ro tăng từ 0.10 lên 0.15" },
    { timestamp: "2026-06-18 16:45:22", user: "CMO (Tran)", change: "Thay đổi phân bổ ngân sách dự phòng", impact: "Chuyển $2,000 từ SMS sang Push Notification" }
  ];

  // 3. CAMPAIGN TABLE
  const campaigns = [
    { Campaign_ID: "M-01", Channel: "Meta Ads", Spend: 32000, CreativeSpend: 5400, ToolSpend: 1200, Impression: 1600000, Click: 48000, Install: 8200, KYC: 2870, Revenue: 112000, ROI: 2.50, CAC: 11.15, LTV: 39.02 },
    { Campaign_ID: "M-02", Channel: "Meta Ads", Spend: 18000, CreativeSpend: 3000, ToolSpend: 800, Impression: 900000, Click: 27000, Install: 4500, KYC: 1620, Revenue: 48600, ROI: 1.70, CAC: 11.11, LTV: 30.00 },
    { Campaign_ID: "M-03", Channel: "Meta Ads", Spend: 12000, CreativeSpend: 2500, ToolSpend: 600, Impression: 750000, Click: 20000, Install: 3100, KYC: 800, Revenue: 36000, ROI: 2.00, CAC: 15.00, LTV: 45.00 },
    { Campaign_ID: "G-01", Channel: "Google Ads", Spend: 25000, CreativeSpend: 2000, ToolSpend: 1500, Impression: 1250000, Click: 37500, Install: 6250, KYC: 2180, Revenue: 87500, ROI: 2.50, CAC: 11.47, LTV: 40.14 },
    { Campaign_ID: "G-02", Channel: "Google Ads", Spend: 15000, CreativeSpend: 1500, ToolSpend: 900, Impression: 850000, Click: 21250, Install: 3400, KYC: 1020, Revenue: 33000, ROI: 1.20, CAC: 14.71, LTV: 32.35 },
    { Campaign_ID: "G-03", Channel: "Google Ads", Spend: 8000, CreativeSpend: 800, ToolSpend: 500, Impression: 500000, Click: 15000, Install: 2500, KYC: 1200, Revenue: 40000, ROI: 4.00, CAC: 6.67, LTV: 33.33 },
    { Campaign_ID: "T-01", Channel: "TikTok Ads", Spend: 20000, CreativeSpend: 6500, ToolSpend: 1100, Impression: 2200000, Click: 66000, Install: 11000, KYC: 2750, Revenue: 54000, ROI: 1.70, CAC: 7.27, LTV: 19.64 },
    { Campaign_ID: "T-02", Channel: "TikTok Ads", Spend: 10000, CreativeSpend: 4000, ToolSpend: 600, Impression: 1100000, Click: 33000, Install: 5000, KYC: 1150, Revenue: 18000, ROI: 0.80, CAC: 8.70, LTV: 15.65 },
    { Campaign_ID: "T-03", Channel: "TikTok Ads", Spend: 14000, CreativeSpend: 4500, ToolSpend: 850, Impression: 1500000, Click: 42000, Install: 7800, KYC: 1100, Revenue: 19600, ROI: 1.40, CAC: 12.73, LTV: 17.82 },
    { Campaign_ID: "A-01", Channel: "Apple Search Ads", Spend: 15000, CreativeSpend: 1000, ToolSpend: 1200, Impression: 600000, Click: 18000, Install: 3600, KYC: 1620, Revenue: 67500, ROI: 3.50, CAC: 9.26, LTV: 41.67 },
    { Campaign_ID: "A-02", Channel: "Apple Search Ads", Spend: 9000, CreativeSpend: 800, ToolSpend: 700, Impression: 380000, Click: 11400, Install: 2280, KYC: 650, Revenue: 27000, ROI: 3.00, CAC: 13.85, LTV: 41.54 }
  ];

  // Helper to get total performance stats
  // Hệ số kỳ (app.js đặt theo dropdown). DÒNG = ×gdPF (tích lũy). gdEFF = hệ số HIỆU SUẤT theo kỳ:
  // áp lên KYC & Revenue để CÁC TỈ SỐ (CAC, ROAS, ROI, LTV/CAC) DỊCH theo kỳ thay vì đứng yên.
  const gdPF = () => (typeof window !== "undefined" && window.GD_PERIOD_FACTOR > 0) ? window.GD_PERIOD_FACTOR : 1;
  const gdEFF = () => (typeof window !== "undefined" && window.GD_EFF > 0) ? window.GD_EFF : 1;

  const getAggregatedCampaigns = () => {
    let spend = 0, installs = 0, kyc = 0, rev = 0;
    campaigns.forEach(c => {
      spend += c.Spend;
      installs += c.Install;
      kyc += c.KYC;
      rev += c.Revenue;
    });
    const f = gdPF(), eff = gdEFF();
    spend *= f; installs *= f; kyc *= f * eff; rev *= f * eff;   // KYC & Revenue mang hiệu suất → tỉ số dịch theo kỳ
    return {
      Spend: spend,
      Install: installs,
      KYC: kyc,
      Revenue: rev,
      ROI: spend > 0 ? (rev - spend) / spend : 0,
      CAC: kyc > 0 ? spend / kyc : 0,
      LTV: kyc > 0 ? rev / kyc : 0
    };
  };

  // Campaigns đã scale theo kỳ — dùng cho các BẢNG flow theo từng kênh (để khớp số tổng)
  const getScaledCampaigns = () => {
    const f = gdPF(), eff = gdEFF();
    return campaigns.map(c => Object.assign({}, c, {
      Spend: c.Spend * f, Install: c.Install * f, KYC: c.KYC * f * eff, Revenue: c.Revenue * f * eff
    }));
  };

  // 4. CUSTOMER TABLE (Detailed seeds of 500 illustrative customers)
  const countries = ["Vietnam", "Thailand", "Indonesia", "Philippines", "Singapore"];
  const devices = ["iOS", "Android"];
  const channels = ["Meta Ads", "Google Ads", "TikTok Ads", "Apple Search Ads", "Organic"];
  const assetPreferences = ["Crypto", "FX", "Gold", "Stocks", "Options"];
  const segments = ["Whale", "Core", "Casual", "Dormant", "New User"];
  const retentionStatuses = ["Active", "At Risk", "Churned"];
  const onboardingDrops = ["None", "Install", "Register", "KYC_Initiated", "KYC_Submitted", "FTD_Pending"];

  const customers = [];
  
  // Custom seed generator for reproducible and realistic metrics
  const seedCustomers = () => {
    for (let i = 1; i <= 500; i++) {
      const id = `CUST-${String(i).padStart(4, "0")}`;
      const country = countries[Math.floor(Math.abs(Math.sin(i)) * countries.length)];
      const device = devices[Math.floor(Math.abs(Math.cos(i)) * devices.length)];
      const source = channels[Math.floor(Math.abs(Math.sin(i * 2)) * channels.length)];
      const campaign = source === "Organic" ? "None" : `${source.charAt(0)}-0${(i % 2) + 1}`;
      
      // Conversion timelines - distributed from 1 to 365 days ago to ensure all timeframes have data
      const installDaysAgo = 1 + (i % 365);
      const installDate = new Date();
      installDate.setDate(installDate.getDate() - installDaysAgo);
      
      let kycDate = "None";
      let ftdDate = "None";
      let revenue = 0;
      let deposit = 0;
      let ftdVolume = 0;
      let tradeVolume = 0;
      let tradeCount = 0;
      let whaleFlag = "No";
      let onboardingStepDrop = "None";
      
      const hasKYC = i % 10 !== 0; // 90% KYC rate for seed sample
      if (hasKYC) {
        const kycDateObj = new Date(installDate);
        kycDateObj.setMinutes(kycDateObj.getMinutes() + 10 + (i % 120));
        kycDate = kycDateObj.toISOString().slice(0, 10);
        
        const hasFTD = i % 3 !== 0; // ~66% conversion from KYC to FTD
        if (hasFTD) {
          const ftdDateObj = new Date(kycDateObj);
          ftdDateObj.setDate(ftdDateObj.getDate() + (i % 5));
          ftdDate = ftdDateObj.toISOString().slice(0, 10);
          
          // Seed values for trades — whale ~4-5x non-whale (realistic, not runaway)
          ftdVolume = (i % 7 === 0) ? (5500 + (i % 25) * 230) : (600 + (i % 40) * 70); // Whale deposit if i % 7 === 0
          deposit = ftdVolume * (1.2 + (i % 3) * 0.5); // Add multiple deposits
          tradeCount = 5 + (i % 25);
          tradeVolume = deposit * (3 + (i % 10));
          revenue = deposit * 0.05 + (tradeVolume * 0.002);
          
          if (ftdVolume >= 5000) {
            whaleFlag = "Yes";
          }
        } else {
          onboardingStepDrop = "FTD_Pending";
        }
      } else {
        // Did not KYC. Choose drop-off step
        onboardingStepDrop = onboardingDrops[1 + (i % (onboardingDrops.length - 2))]; // Drop between Install, Register, KYC_Initiated, KYC_Submitted
      }
      
      // LTV Calculation (usually higher than short term revenue)
      const ltv = revenue * (1.2 + (i % 5) * 0.3);
      
      // Determine segment
      let segment = "New User";
      if (ftdDate !== "None") {
        if (whaleFlag === "Yes") segment = "Whale";
        else if (ltv > 500) segment = "Core";
        else if (installDaysAgo > 40 && (i % 5 === 0)) segment = "Dormant";
        else segment = "Casual";
      } else if (kycDate !== "None") {
        segment = "New User";
      } else {
        segment = "Dormant";
      }
      
      // Retention Status
      let retStatus = "Active";
      if (segment === "Dormant") retStatus = "Churned";
      else if (i % 6 === 0) retStatus = "At Risk";

      // Content behavioral parameters
      let assetsViewed = 0;
      if (segment === "Whale") {
        assetsViewed = 25 + (i % 25);
      } else if (segment === "Core") {
        assetsViewed = 15 + (i % 20);
      } else if (segment === "Casual") {
        assetsViewed = 6 + (i % 10);
      } else if (segment === "New User") {
        assetsViewed = 3 + (i % 6);
      } else { // Dormant
        assetsViewed = 1 + (i % 4);
      }
      
      const videosWatched = Math.floor(assetsViewed * 0.7);
      const watchTime = Math.round(videosWatched * (1.5 + (i % 3) * 0.8) * 10) / 10; // in minutes
      
      let assetsBeforeKYC = kycDate !== "None" ? 1 + (i % 5) : assetsViewed;
      let assetsBeforeFTD = ftdDate !== "None" ? assetsBeforeKYC + 1 + (i % 8) : 0;
      let assetsBeforeFirstTrade = tradeCount > 0 ? assetsBeforeFTD + (i % 4) : 0;

      // Financial parameters (Growth Economics)
      const incCost = ftdDate !== "None" ? 10.0 + (i % 4 === 0 ? 5.0 : 0.0) : 0.0;
      const eKycFee = kycDate !== "None" ? configs.rates.ekycRate : 0.0;
      const smsFee = configs.rates.smsRate * (kycDate !== "None" ? 2.0 : 1.0);
      const gatewayFee = ftdDate !== "None" ? deposit * 0.015 : 0.0;
      const onboardingCogs = eKycFee + smsFee + gatewayFee;
      const netLtv = ltv - onboardingCogs - incCost;

      const campObj = campaigns.find(c => c.Campaign_ID === campaign) || { CAC: 12.0 };
      const customerCac = campObj.CAC;
      const monthlyNetLtv = netLtv / (Math.max(10, installDaysAgo) / 30);
      const paybackVal = (ftdDate !== "None" && monthlyNetLtv > 0) ? Math.min(Math.round((customerCac / monthlyNetLtv) * 10) / 10, 24.0) : 0.0;

      customers.push({
        Customer_ID: id,
        Install_Date: installDate.toISOString().slice(0, 10),
        KYC_Date: kycDate,
        FTD_Date: ftdDate,
        Country: country,
        Device: device,
        Source: source,
        Campaign: campaign,
        Revenue: Math.round(revenue * 100) / 100,
        Deposit: Math.round(deposit * 100) / 100,
        FTD_Volume: Math.round(ftdVolume * 100) / 100,
        TradeVolume: Math.round(tradeVolume * 100) / 100,
        Trade_Count: tradeCount,
        LTV: Math.round(ltv * 100) / 100,
        Whale_Flag: whaleFlag,
        Segment: segment,
        Retention_Status: retStatus,
        Onboarding_Step_Drop: onboardingStepDrop,
        // Behavioural parameters
        SessionFrequency: 2 + (i % 15),
        AssetPreference: assetPreferences[i % assetPreferences.length],
        UsageHour: (8 + i * 7) % 24,
        AssetsViewed: assetsViewed,
        VideosWatched: videosWatched,
        WatchTime: watchTime,
        AssetsBeforeKYC: assetsBeforeKYC,
        AssetsBeforeFTD: assetsBeforeFTD,
        AssetsBeforeFirstTrade: assetsBeforeFirstTrade,
        // New Multi-touch & Interaction dimensions
        InteractionsToKyc: kycDate !== "None" ? 2 + (i % 11) : 0,
        InteractionsToFtd: ftdDate !== "None" ? (2 + (i % 11)) + 1 + (i % 8) : 0,
        TotalTouchpoints: segment === "Whale" ? 20 + (i % 25) : (segment === "Core" ? 15 + (i % 20) : (segment === "Casual" ? 8 + (i % 12) : (segment === "New User" ? 3 + (i % 7) : 1 + (i % 5)))),
        PrimaryAwarenessChannel: source,
        PrimaryConversionChannel: ftdDate !== "None" ? (source === "Organic" ? (i % 2 === 0 ? "Direct" : "Google Search") : ["Google Search", "Direct", "Email Remarketing", "Meta Ads", "Google Ads"][(i + 3) % 5]) : "None",
        // Growth Economics dimensions
        IncentiveCost: Math.round(incCost * 100) / 100,
        OnboardingCogs: Math.round(onboardingCogs * 100) / 100,
        NetLtv: Math.round(netLtv * 100) / 100,
        PaybackMonths: paybackVal
      });
    }
  };
  
  seedCustomers();

  // 5. EVENT TABLE (Dynamic interactive stream)
  const getEventStream = (limit = 50) => {
    const events = [];
    const eventNames = ["Session_Start", "View_Asset", "Click_Trade", "Deposit_Initiated", "KYC_Submit", "Trade_Executed"];
    for (let i = 0; i < limit; i++) {
      const cust = customers[i % customers.length];
      const eventName = eventNames[Math.floor(Math.abs(Math.sin(i * 3)) * eventNames.length)];
      const asset = cust.AssetPreference;
      const value = eventName === "Trade_Executed" ? Math.round(cust.Deposit * 0.1 * 100) / 100 : 0;
      
      const time = new Date();
      time.setMinutes(time.getMinutes() - i * 15);
      
      events.push({
        Customer_ID: cust.Customer_ID,
        Event_Name: eventName,
        Event_Time: time.toLocaleString("vi-VN"),
        Asset: asset,
        Value: value
      });
    }
    return events;
  };

  // 6. REVENUE TABLE (Historical aggregation daily)
  const getDailyRevenue = (days = 30) => {
    const dailyData = [];
    const baseRevenue = 8500;
    const baseDeposit = 75000;
    const baseVolume = 1200000;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add weekend cyclicality
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const multiplier = isWeekend ? 0.65 : 1.1;
      // Add some random noise
      const noise = 1 + (Math.sin(i * 0.5) * 0.15) + (Math.cos(i) * 0.08);

      dailyData.push({
        Date: date.toISOString().slice(0, 10),
        Revenue: Math.round(baseRevenue * multiplier * noise),
        Deposit: Math.round(baseDeposit * multiplier * noise),
        Trade_Volume: Math.round(baseVolume * multiplier * noise)
      });
    }
    return dailyData;
  };

  // 7. COHORT RETENTION MATRIX (Tab 3 data)
  const cohortMatrix = [
    { cohort: "2026-01 (Jan)", size: 1420, d1: 42.5, d7: 28.2, d14: 21.0, d30: 16.5, d60: 12.1, d90: 9.8 },
    { cohort: "2026-02 (Feb)", size: 1560, d1: 44.1, d7: 29.5, d14: 22.4, d30: 17.8, d60: 13.0, d90: 10.4 },
    { cohort: "2026-03 (Mar)", size: 1800, d1: 41.2, d7: 26.8, d14: 19.5, d30: 15.2, d60: 11.2, d90: 8.5 },
    { cohort: "2026-04 (Apr)", size: 2100, d1: 43.8, d7: 30.1, d14: 23.0, d30: 18.4, d60: 14.1, d90: 11.0 },
    { cohort: "2026-05 (May)", size: 2450, d1: 45.2, d7: 31.8, d14: 24.5, d30: 19.6, d60: 15.3, d90: 12.1 },
    { cohort: "2026-06 (Jun)", size: 2780, d1: 46.8, d7: 33.2, d14: 25.8, d30: 20.5, d60: null, d90: null }
  ];

  // Cumulative LTV Cohort Matrix ($ per user cumulative)
  const cohortLtvMatrix = [
    { cohort: "2026-01 (Jan)", size: 1420, d1: 15.20, d7: 28.50, d14: 42.10, d30: 68.40, d60: 92.50, d90: 112.40 },
    { cohort: "2026-02 (Feb)", size: 1560, d1: 16.40, d7: 30.15, d14: 45.20, d30: 72.80, d60: 98.12, d90: 118.50 },
    { cohort: "2026-03 (Mar)", size: 1800, d1: 12.80, d7: 21.40, d14: 31.50, d30: 52.60, d60: 70.80, d90: 89.20 },
    { cohort: "2026-04 (Apr)", size: 2100, d1: 18.10, d7: 33.50, d14: 51.20, d30: 84.60, d60: 110.45, d90: 132.80 },
    { cohort: "2026-05 (May)", size: 2450, d1: 19.50, d7: 38.20, d14: 58.40, d30: 96.10, d60: 128.50, d90: 154.60 },
    { cohort: "2026-06 (Jun)", size: 2780, d1: 21.20, d7: 42.10, d14: 64.20, d30: 104.50, d60: null, d90: null }
  ];

  // Asset Migration Probabilities Matrix
  const assetMigrationMatrix = {
    Crypto: { Stocks: 0.22, Gold: 0.15, FX: 0.08, Options: 0.05, Stay: 0.50 },
    Stocks: { Crypto: 0.18, Gold: 0.20, FX: 0.12, Options: 0.15, Stay: 0.35 },
    Gold: { Crypto: 0.10, Stocks: 0.25, FX: 0.15, Options: 0.08, Stay: 0.42 },
    FX: { Crypto: 0.14, Stocks: 0.18, Gold: 0.10, Options: 0.22, Stay: 0.36 },
    Options: { Crypto: 0.08, Stocks: 0.30, Gold: 0.12, FX: 0.18, Stay: 0.32 }
  };

  // 8. RFM DISTRIBUTION COUNTS
  const rfmSegments = [
    { Segment: "Champion", count: 180, description: "Mua gần đây, tần suất cao, chi tiêu lớn nhất", action: "Đặc quyền VIP & Co-branding" },
    { Segment: "Loyal", count: 480, description: "Giao dịch thường xuyên, phản hồi tích cực", action: "Loyalty program & Tặng thưởng" },
    { Segment: "Potential", count: 850, description: "Giao dịch gần đây, giá trị trung bình", action: "Upsell & Khuyến nghị tài sản hot" },
    { Segment: "At Risk", count: 320, description: "Đã lâu không giao dịch, trước đó mua nhiều", action: "Reactivation campaign & Khuyến mãi sốc" },
    { Segment: "Churned", count: 650, description: "Không hoạt động trong 60+ ngày", action: "Win-back qua SMS/Call center" }
  ];

  // 9. GROWTH OPPORTUNITY BACKLOG (Tab 5 data)
  const opportunityBacklog = [
    { Idea: "Chiến dịch Referral v2 - Nhận quà theo level nạp", Owner: "Growth Lead", Priority: "High", ETA: "2026-07-05", Status: "Planning", Impact: 8, Confidence: 7, Ease: 6 },
    { Idea: "A/B Testing Video Hook 3s đầu trên TikTok Ads", Owner: "Creative Lead", Priority: "Medium", ETA: "2026-06-28", Status: "In Progress", Impact: 7, Confidence: 8, Ease: 8 },
    { Idea: "Cá nhân hóa Next Best Offer qua Push Notification", Owner: "Product Manager", Priority: "High", ETA: "2026-07-15", Status: "Testing", Impact: 9, Confidence: 6, Ease: 5 },
    { Idea: "Sử dụng Geo-targeting tập trung khu vực cấp 1", Owner: "Marketing Specialist", Priority: "Low", ETA: "2026-07-20", Status: "Backlog", Impact: 5, Confidence: 7, Ease: 7 },
    { Idea: "Tối ưu hóa luồng KYC onboarding (giảm 2 bước)", Owner: "Product Manager", Priority: "Critical", ETA: "2026-07-02", Status: "In Progress", Impact: 9, Confidence: 9, Ease: 4 }
  ];

  // 10. HOOK INTELLIGENCE
  const hookIntelligence = [
    { Type: "FOMO", Angle: "Nhận free $10 token chỉ hôm nay", CTR: "4.5%", CVR: "32%", HookRate: "38%", CPA: "$8.5", Performance: "Excellent" },
    { Type: "Educational", Angle: "Cách trader 20 tuổi kiếm $1000/tháng", CTR: "3.2%", CVR: "22%", HookRate: "29%", CPA: "$12.0", Performance: "Good" },
    { Type: "Social Proof", Angle: "Hơn 500,000 người đã sử dụng app", CTR: "2.8%", CVR: "24%", HookRate: "25%", CPA: "$11.2", Performance: "Fair" },
    { Type: "Direct Offer", Angle: "Giao dịch không mất phí trọn đời", CTR: "5.1%", CVR: "38%", HookRate: "42%", CPA: "$6.8", Performance: "Outstanding" },
    { Type: "Problem-Solving", Angle: "Tránh mất tiền oan khi trade coin rác", CTR: "3.0%", CVR: "18%", HookRate: "33%", CPA: "$14.5", Performance: "Average" }
  ];

  // 11. AI ENGINE DATA (MAU MACHINE Forecasts)
  const getMauForecast = () => {
    return {
      labels: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6 (Hiện tại)", "Tháng 7 (Dự báo)", "Tháng 8 (Dự báo)", "Tháng 9 (Dự báo)"],
      actualMau: [25000, 28500, 31000, 34500, 39000, 42500, null, null, null],
      predictedMau: [null, null, null, null, null, 42500, 46200, 50100, 54500],
      churnForecast: [4.2, 4.0, 4.3, 3.8, 3.5, 3.6, 3.4, 3.2, 3.0],
      revenueForecast: [210, 240, 258, 290, 325, 360, 395, 430, 475] // $k
    };
  };

  // 12. CUSTOMER PERSONAS (Chân dung & Thói quen khách hàng)
  const customerPersonas = [
    { Name: "Cá voi Giao dịch (Whale Trader)", Share: "14%", Deposit: "$15,000 Median", ActiveHours: "19:00 - 22:00", Assets: "Gold, Stocks, Options", Device: "iOS (78%)", Habit: "Giao dịch đòn bẩy lớn, thích đọc tin vĩ mô nhanh, cực nhạy cảm với phí ẩn. Ưa thích chính sách CSKH VIP." },
    { Name: "Khách hàng casual (Core Casual)", Share: "32%", Deposit: "$800 Median", ActiveHours: "12:00 - 15:00", Assets: "Stocks, Options, Crypto", Device: "iOS & Android", Habit: "Giao dịch hàng tuần theo xu hướng báo chí, xem nhiều bài viết hướng dẫn (Educational) trước khi đặt lệnh." },
    { Name: "Thế hệ Web3 (Crypto Enthusiast)", Share: "54%", Deposit: "$350 Median", ActiveHours: "23:00 - 02:00", Assets: "Crypto, FX", Device: "Android (65%)", Habit: "Giao dịch ban đêm, nhạy cảm với biến động giá Crypto tức thời, thích video ngắn dạng FOMO 3 giây trên TikTok." }
  ];

  // 13. CONTENT PLAN & TOUCHPOINTS (Tuyến nội dung & Kế hoạch điểm chạm)
  const contentPlan = [
    { Touchpoint: "TikTok Video Ad", Angle: "FOMO (Free $10 Token)", Target: "Crypto Enthusiast", CTR: "4.5%", CVR: "32%", CPA: "$8.50", Status: "Đang chạy (Active)", Rating: "Tối ưu cho tệp trẻ" },
    { Touchpoint: "Facebook Video Ad", Angle: "Direct Offer (No-fee Trade)", Target: "Core Casual", CTR: "5.1%", CVR: "38%", CPA: "$6.80", Status: "Đang chạy (Active)", Rating: "Tuyến nội dung ROI cao nhất" },
    { Touchpoint: "Google Search Ad", Angle: "Educational (How to hedge inflation)", Target: "Whale Trader", CTR: "3.2%", CVR: "22%", CPA: "$12.00", Status: "Lên lịch (Scheduled)", Rating: "Thu hút lead chất lượng cao" },
    { Touchpoint: "Push Notification", Angle: "Personalized Next Best Offer", Target: "Loyal Segment", CTR: "12.5%", CVR: "45%", CPA: "$0.50", Status: "Đang chạy (Active)", Rating: "Kênh rẻ, chuyển đổi cực cao" },
    { Touchpoint: "Email Newsletter", Angle: "Weekly Macro Report & Gold Insights", Target: "Whale Trader", CTR: "18.2%", CVR: "15%", CPA: "$2.10", Status: "Đang chạy (Active)", Rating: "Giữ chân Whale cực tốt" }
  ];

  // 14. AD NETWORKS & SUGGESTIONS (Đánh giá kênh ads & Gợi ý adnet mới)
  const adNetworkAssessments = [
    { Network: "Meta Ads", Status: "Bão hòa nhẹ", ActiveCac: "$11.13", Trend: "CPM tăng 10%", Action: "Yêu cầu refresh Creative gấp" },
    { Network: "Google Ads", Status: "Hiệu quả cao", ActiveCac: "$10.42", Trend: "Ổn định", Action: "Tăng 15% ngân sách Brand Search" },
    { Network: "TikTok Ads", Status: "Bất ổn định", ActiveCac: "$7.27 (Install)", Trend: "Crash Luồng KYC Android", Action: "Dừng T-02, vá lỗi KYC lập tức" },
    { Network: "Apple Search Ads", Status: "LTV cao nhất", ActiveCac: "$9.26", Trend: "Tiềm năng lớn", Action: "Tập trung scale 35% ngân sách" },
    { Network: "Gợi ý: Google UAC", Status: "Đề xuất mới (New)", ActiveCac: "Est. $8.00", Trend: "Tối ưu Android Installs", Action: "Test UAC chiến dịch Android" },
    { Network: "Gợi ý: Branch Referral", Status: "Đề xuất mới (New)", ActiveCac: "Est. $4.50", Trend: "Không phụ thuộc IDFA", Action: "Kích hoạt Referral Loop v2" }
  ];

  // 15. TEAM WORK PROGRESS (Tiến độ công việc theo Team)
  const teamProgress = [
    { Team: "Data & Analytics Team", Task: "Tích hợp Conversions API (CAPI) Meta & Re-train Whale Predictor", Progress: 85, Status: "Testing", Priority: "Critical" },
    { Team: "Creative & Copywriting", Task: "Sản xuất 3 mẫu Video Hook dạng FOMO và refresh nội dung Meta Ads", Progress: 100, Status: "Hoàn tất (Done)", Priority: "High" },
    { Team: "Product & Engineering", Task: "Cập nhật bản vá API cổng thanh toán & Sửa lỗi crash SDK KYC Android", Progress: 60, Status: "In Progress", Priority: "Critical" },
    { Team: "Growth & Marketing", Task: "Chạy chiến dịch Reactivation nhắm tới nhóm At Risk & Tối ưu ASA", Progress: 40, Status: "In Progress", Priority: "High" }
  ];

  // 16. INDUSTRY BENCHMARKS (Đối chuẩn ngành)
  const industryBenchmarks = [
    { Metric: "Revenue Growth MoM", OurVal: 12.0, IndustryBench: 8.5, Unit: "%", HigherIsBetter: true, Description: "Tăng trưởng doanh thu MoM so với trung bình các sàn Fintech ASEAN." },
    { Metric: "LTV / CAC Ratio", OurVal: 3.05, IndustryBench: 3.5, Unit: "x", HigherIsBetter: true, Description: "Tỷ số LTV trên chi phí chuyển đổi (ngưỡng tối ưu là >3.5x)." },
    { Metric: "Average CAC (KYC)", OurVal: 10.50, IndustryBench: 15.00, Unit: "$", HigherIsBetter: false, Description: "Chi phí để có 1 người dùng hoàn thành KYC (thấp hơn là tốt hơn)." },
    { Metric: "Install to KYC Conversion Rate", OurVal: 29.4, IndustryBench: 25.0, Unit: "%", HigherIsBetter: true, Description: "Tỷ lệ chuyển đổi tổng thể từ tải app đến hoàn tất KYC." },
    { Metric: "D90 Customer Retention Rate", OurVal: 11.0, IndustryBench: 12.5, Unit: "%", HigherIsBetter: true, Description: "Tỷ lệ giữ chân người dùng ở ngày thứ 90." },
    { Metric: "Whale Revenue Concentration", OurVal: 41.4, IndustryBench: 35.0, Unit: "%", HigherIsBetter: false, Description: "Mức độ tập trung doanh thu vào nhóm VIP Whale (thấp hơn giúp giảm rủi ro)." }
  ];

  // 17. COMPETITOR ANALYSIS (Phân tích đối thủ & Thị trường)
  const competitorAnalysis = [
    { Competitor: "Nền tảng X-Trading (Đối thủ trực tiếp)", MarketShare: "35%", Advantage: "KYC nhanh dưới 1 phút, miễn phí nạp rút", Weakness: "Phí giao dịch Options cao, không có báo cáo vĩ mô", AdsStrategy: "Đổ mạnh ngân sách vào TikTok Ads & Youtube KOLs", DefenseAction: "Đẩy mạnh tuyến nội dung 'No-fee Trade' & KYC Patch Android" },
    { Competitor: "CD-Finvest (Đối thủ gián tiếp)", MarketShare: "18%", Advantage: "Cung cấp giỏ cổ phiếu chỉ số đa dạng", Weakness: "Giao diện phức tạp, tốc độ tải app chậm trên Android", AdsStrategy: "Tập trung Google Search Ads & SEO thương hiệu", DefenseAction: "Tối ưu hóa UX app, chạy chiến dịch Referral v2" },
    { Competitor: "TradingGlobal (Global App)", MarketShare: "12%", Advantage: "Nguồn lực tài chính khổng lồ, hỗ trợ 24/7", Weakness: "Không có hỗ trợ bản địa, nạp rút quốc tế chậm", AdsStrategy: "Chạy chiến dịch thương hiệu lớn, PR báo chí", DefenseAction: "Tập trung Localized Support, nạp rút dưới 30s" }
  ];

  // 18. GEOPOLITICAL REGIMES (Kịch bản xu hướng địa chính trị & vĩ mô)
  const geopoliticalRegimes = [
    {
      id: "geo-regime-fed",
      name: "FED cắt lãi suất & Dòng vốn đổ vào ASEAN",
      growthMul: 1.25,
      cacMul: 0.90,
      retMul: 1.10,
      probability: 45,
      horizon: "Quý 3–4 2026",
      preferredAsset: "Stocks & Crypto",
      riskLevel: "Thấp (Low)",
      description: "Lãi suất giảm làm giảm chi phí cơ hội đầu tư mạo hiểm. Dòng vốn ngoại đổ mạnh vào các sàn giao dịch tài sản mới nổi tại Đông Nam Á. Hoạt động trade Stocks và Crypto bùng nổ.",
      keyIndicators: [
        { name: "FED Funds Rate", value: "4.25%", trend: "down" },
        { name: "DXY (USD Index)", value: "99.8", trend: "down" },
        { name: "Dòng vốn ngoại ASEAN", value: "+$2.4B", trend: "up" }
      ],
      playbook: [
        "Tăng ngân sách Meta & Google +35%, kích hoạt UAC để đón đầu dòng vốn đầu cơ.",
        "Mở rộng tuyến nội dung Stocks & Crypto cho tệp Casual → Core.",
        "Khoá CAC sớm trước khi cạnh tranh đấu giá quảng cáo tăng nhiệt."
      ],
      verdict: "Khuyến nghị: Tăng ngân sách tiếp thị thêm 35% trên Meta & Google, kích hoạt UAC để đón đầu dòng vốn đầu cơ."
    },
    {
      id: "geo-regime-conflict",
      name: "Căng thẳng địa chính trị & Vàng lập đỉnh",
      growthMul: 0.95,
      cacMul: 1.05,
      retMul: 0.95,
      probability: 30,
      horizon: "Quý 3 2026",
      preferredAsset: "Gold (Vàng)",
      riskLevel: "Cao (High)",
      description: "Căng thẳng chuỗi cung ứng toàn cầu kích hoạt tâm lý phòng vệ tài sản an toàn. Giá vàng thế giới liên tục lập đỉnh. Thị trường chứng khoán và FX đi ngang.",
      keyIndicators: [
        { name: "Giá vàng (XAU)", value: "$2,780/oz", trend: "up" },
        { name: "Chỉ số sợ hãi VIX", value: "24.5", trend: "up" },
        { name: "Dầu Brent", value: "$92/bbl", trend: "up" }
      ],
      playbook: [
        "Định vị lại tuyến nội dung quanh sản phẩm Vàng bảo toàn vốn.",
        "Gửi bản tin vĩ mô cho tệp Whale để giữ chân dòng tiền.",
        "Giảm chi tiêu adnet rủi ro, ưu tiên ngân sách retention."
      ],
      verdict: "Khuyến nghị: Định vị lại tuyến nội dung tập trung vào sản phẩm Vàng bảo toàn vốn, gửi email thông tin vĩ mô cho tệp Whale."
    },
    {
      id: "geo-regime-tightening",
      name: "Siết chặt quy chế pháp lý KYC/AML khu vực",
      growthMul: 0.80,
      cacMul: 1.30,
      retMul: 1.00,
      probability: 25,
      horizon: "Quý 4 2026",
      preferredAsset: "Stocks",
      riskLevel: "Trung bình (Medium)",
      description: "Các nước ASEAN siết chặt quy định KYC, yêu cầu xác thực khuôn mặt đa tầng và liên kết dữ liệu quốc gia. Luồng Onboarding bị kéo dài, tốc độ kích hoạt tài khoản chậm lại.",
      keyIndicators: [
        { name: "Thời gian KYC TB", value: "6.2 phút", trend: "up" },
        { name: "Tỷ lệ rớt Onboarding", value: "28%", trend: "up" },
        { name: "CAC / KYC", value: "$14.8", trend: "up" }
      ],
      playbook: [
        "Dồn lực Product hoàn thiện API xác thực sinh trắc học đa tầng.",
        "Tạm dừng scale adnet để tránh lãng phí khi tỷ lệ chuyển đổi giảm.",
        "Chuẩn bị sẵn hồ sơ tuân thủ AML cho từng thị trường khu vực."
      ],
      verdict: "Khuyến nghị: Tập trung nhân lực Product hoàn thiện API xác thực sinh trắc học, tạm dừng các chiến dịch scale adnet để tránh lãng phí."
    }
  ];

  // 18.1 ECONOMIC & GEOPOLITICAL CALENDAR (Lịch sự kiện cập nhật liên tục)
  // Mốc thời gian quanh "hiện tại" = 2026-06-23. actual=null nghĩa là chưa diễn ra.
  const economicCalendar = [
    { id: "ev-fomc-jun", datetime: "2026-06-18 01:00", event: "FED công bố quyết định lãi suất (FOMC)", region: "US", category: "Tiền tệ", importance: "Cao", forecast: "4.50%", previous: "4.50%", actual: "4.25%", linkedRegimeId: "geo-regime-fed", impact: "FED cắt 25bps → kích hoạt kịch bản dòng vốn đổ vào ASEAN." },
    { id: "ev-sbv-jun", datetime: "2026-06-20 08:30", event: "NHNN họp điều hành tỷ giá & lãi suất", region: "VN", category: "Tiền tệ", importance: "Trung bình", forecast: "Giữ nguyên", previous: "Giữ nguyên", actual: "Giữ nguyên", linkedRegimeId: "geo-regime-fed", impact: "Ổn định tỷ giá, hỗ trợ tâm lý nhà đầu tư nội." },
    { id: "ev-pce-jun", datetime: "2026-06-25 19:30", event: "Mỹ công bố Core PCE (lạm phát lõi)", region: "US", category: "Lạm phát", importance: "Cao", forecast: "2.8%", previous: "2.9%", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Hạ nhiệt → củng cố lộ trình cắt lãi suất tiếp." },
    { id: "ev-ecb-jun", datetime: "2026-06-27 14:00", event: "ECB phát biểu định hướng chính sách", region: "EU", category: "Tiền tệ", importance: "Trung bình", forecast: "Ôn hoà", previous: "—", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Đồng pha nới lỏng toàn cầu." },
    { id: "ev-opec-jul", datetime: "2026-07-05 16:00", event: "OPEC+ họp chính sách sản lượng dầu", region: "Global", category: "Năng lượng", importance: "Cao", forecast: "Duy trì cắt giảm", previous: "Cắt giảm", actual: null, linkedRegimeId: "geo-regime-conflict", impact: "Giá dầu tăng → áp lực lạm phát & tâm lý phòng vệ." },
    { id: "ev-nfp-jul", datetime: "2026-07-02 19:30", event: "Mỹ công bố Bảng lương phi nông nghiệp (NFP)", region: "US", category: "Việc làm", importance: "Cao", forecast: "+155K", previous: "+177K", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Việc làm yếu đi → tăng khả năng FED nới lỏng." },
    { id: "ev-cpi-jul", datetime: "2026-07-10 19:30", event: "Mỹ công bố CPI tháng 6", region: "US", category: "Lạm phát", importance: "Cao", forecast: "2.7%", previous: "2.8%", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Chỉ báo then chốt cho cuộc họp FOMC cuối tháng." },
    { id: "ev-cn-gdp", datetime: "2026-07-15 09:00", event: "Trung Quốc công bố GDP Quý 2", region: "CN", category: "Vĩ mô", importance: "Trung bình", forecast: "4.8%", previous: "5.0%", actual: null, linkedRegimeId: "geo-regime-conflict", impact: "Cầu khu vực chậm lại có thể lan sang ASEAN." },
    { id: "ev-asean-summit", datetime: "2026-07-18 09:00", event: "Hội nghị thượng đỉnh Tài chính ASEAN", region: "ASEAN", category: "Địa chính trị", importance: "Trung bình", forecast: "Thúc đẩy hội nhập vốn", previous: "—", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Khả năng mở thêm hành lang dòng vốn xuyên biên giới." },
    { id: "ev-kyc-draft", datetime: "2026-07-22 10:00", event: "Khu vực: Dự thảo siết KYC/AML xuyên biên giới", region: "ASEAN", category: "Pháp lý", importance: "Cao", forecast: "Lấy ý kiến", previous: "—", actual: null, linkedRegimeId: "geo-regime-tightening", impact: "Nếu thông qua, CAC/KYC dự kiến tăng ~x1.3." },
    { id: "ev-fomc-jul", datetime: "2026-07-29 01:00", event: "FED công bố quyết định lãi suất (FOMC kỳ tới)", region: "US", category: "Tiền tệ", importance: "Cao", forecast: "4.00%", previous: "4.25%", actual: null, linkedRegimeId: "geo-regime-fed", impact: "Dự kiến cắt tiếp 25bps → tiếp sức dòng vốn rủi ro." },
    { id: "ev-geo-deadline", datetime: "2026-07-31 23:59", event: "Hạn chót đàm phán thương mại toàn cầu", region: "Global", category: "Địa chính trị", importance: "Cao", forecast: "Bất định", previous: "—", actual: null, linkedRegimeId: "geo-regime-conflict", impact: "Đổ vỡ → rủi ro tăng, vàng có thể lập đỉnh mới." }
  ];

  // 18.2 NORTH STAR METRIC + INPUT-METRIC TREE (the growth engine's apex metric)
  // Value & drivers are COMPUTED at render from the live funnel/cohort/customer data;
  // this object only declares the metric definition and the targets.
  const northStar = {
    metric: "Người dùng Giao dịch Hoạt động (Funded Active Traders)",
    definition: "Số người dùng đã nạp tiền (FTD) và hoàn tất giao dịch đầu tiên — thước đo giá trị thật của sản phẩm.",
    unit: "users",
    target: 3000,
    drivers: [
      { key: "activation", name: "Kích hoạt (Install → KYC)", target: 45, suffix: "%" },
      { key: "ftd",        name: "Nạp lần đầu (KYC → FTD)",    target: 65, suffix: "%" },
      { key: "retention",  name: "Giữ chân D30 (Retention)",   target: 25, suffix: "%" },
      { key: "frequency",  name: "Tần suất giao dịch",          target: 28, suffix: " lệnh" }
    ]
  };

  // 19. CREATIVE ASSETS DETAIL DATA (Drop-Off & Root Cause Engine)
  const creativeAssets = [
    { 
      id: "C-01", 
      title: "Lớp Học Đầu Tư Cơ Bản #01", 
      theme: "Beginner Education", 
      channel: "Meta Ads", 
      avgWatchTime: 42.5, 
      avgViewDurationPct: 65, 
      videoCompletionRate: 48.2, 
      drop3s: 18.5, 
      drop5s: 21.0,
      drop10s: 32.4, 
      watch25: 75.2, 
      watch50: 62.1, 
      watch75: 52.8, 
      completion100: 48.2, 
      sessions: 12400, 
      viewers: 9800, 
      revenue: 18450, 
      roi: 2.15, 
      retentionCurve: [100, 81.5, 79.0, 67.6, 62.1, 52.8, 48.2],
      diagnosticType: "CTA Problem",
      diagnosticVerdict: "CTA xuất hiện quá muộn (sau 35s), khi mà hơn 50% người xem đã thoát. Đề xuất đẩy CTA lên giây thứ 15 để tối ưu tỷ lệ nhấp.",
      designerHours: 12,
      productionCost: 1500,
      fatigue: 24
    },
    { 
      id: "C-02", 
      title: "Phân Tích Kỹ Thuật Live: Sóng Vàng Hôm Nay", 
      theme: "Technical Analysis", 
      channel: "Google Ads", 
      avgWatchTime: 125.0, 
      avgViewDurationPct: 40, 
      videoCompletionRate: 28.5, 
      drop3s: 22.0, 
      drop5s: 26.5,
      drop10s: 45.6, 
      watch25: 54.4, 
      watch50: 38.2, 
      watch75: 31.0, 
      completion100: 28.5, 
      sessions: 4200, 
      viewers: 3100, 
      revenue: 24500, 
      roi: 3.20, 
      retentionCurve: [100, 78.0, 73.5, 54.4, 38.2, 31.0, 28.5],
      diagnosticType: "Hook Problem",
      diagnosticVerdict: "Hook giới thiệu quá dài dòng (12s đầu tiên đi thẳng vào giới thiệu cá nhân thay vì tín hiệu thị trường). Cần tối ưu lại 3s đầu tiên tạo tò mò, cắt bỏ giới thiệu dài.",
      designerHours: 25,
      productionCost: 3200,
      fatigue: 12
    },
    { 
      id: "C-03", 
      title: "Nhận Ngay Quà Free Token $10", 
      theme: "Passive Income", 
      channel: "TikTok Ads", 
      avgWatchTime: 8.2, 
      avgViewDurationPct: 22, 
      videoCompletionRate: 12.0, 
      drop3s: 48.5, 
      drop5s: 55.0,
      drop10s: 72.0, 
      watch25: 28.0, 
      watch50: 16.5, 
      watch75: 14.0, 
      completion100: 12.0, 
      sessions: 45000, 
      viewers: 38000, 
      revenue: 11200, 
      roi: 0.95, 
      retentionCurve: [100, 51.5, 45.0, 28.0, 16.5, 14.0, 12.0],
      diagnosticType: "Content Consistency Problem",
      diagnosticVerdict: "Nội dung sau 3s đầu không khớp với Hook giật gân, khiến người dùng TikTok lướt đi lập tức. Sai lệch kỳ vọng nhận quà miễn phí. Đề xuất viết lại kịch bản thân sau.",
      designerHours: 8,
      productionCost: 950,
      fatigue: 35
    },
    { 
      id: "C-04", 
      title: "Mẹo Tránh Mất Tiền Oan Khi Giao Dịch", 
      theme: "Trading Psychology", 
      channel: "TikTok Ads", 
      avgWatchTime: 18.4, 
      avgViewDurationPct: 52, 
      videoCompletionRate: 35.8, 
      drop3s: 15.2, 
      drop5s: 19.9,
      drop10s: 28.5, 
      watch25: 84.8, 
      watch50: 55.2, 
      watch75: 42.0, 
      completion100: 35.8, 
      sessions: 22000, 
      viewers: 19000, 
      revenue: 28400, 
      roi: 2.45, 
      retentionCurve: [100, 84.8, 80.1, 71.5, 55.2, 42.0, 35.8],
      diagnosticType: "Creative Fatigue",
      diagnosticVerdict: "Mẫu quảng cáo đã chạy liên tục 45 ngày, tần suất lặp lại (Frequency) trên mỗi user đạt 5.2 lần. Hiệu suất giảm 30% so với tuần đầu. Đề xuất thay thế visual hoặc đổi hook mới.",
      designerHours: 18,
      productionCost: 2200,
      fatigue: 62
    },
    { 
      id: "C-05", 
      title: "Hướng Dẫn Nạp Rút Cổng Mới Dưới 30s", 
      theme: "Product Education", 
      channel: "In-App", 
      avgWatchTime: 35.2, 
      avgViewDurationPct: 78, 
      videoCompletionRate: 68.0, 
      drop3s: 5.5, 
      drop5s: 8.0,
      drop10s: 12.4, 
      watch25: 94.5, 
      watch50: 82.0, 
      watch75: 74.2, 
      completion100: 68.0, 
      sessions: 8500, 
      viewers: 7200, 
      revenue: 34000, 
      roi: 4.50, 
      retentionCurve: [100, 94.5, 92.0, 87.6, 82.0, 74.2, 68.0],
      diagnosticType: "None",
      diagnosticVerdict: "Hiệu suất xuất sắc. Tuyến nội dung giáo dục sản phẩm đạt độ tin cậy và tỷ lệ hoàn thành cao nhất. CTA rõ ràng, trực quan.",
      designerHours: 14,
      productionCost: 1800,
      fatigue: 5
    }
  ];

  // 19.1 SYSTEM INCIDENT LOG
  const incidentsLog = [
    {
      id: "INC-01",
      name: "Sự cố đứt kết nối cổng thanh toán Visa/Mastercard (PayME API Timeout)",
      system: "Payment Gateway",
      downtime: 120,
      revenueLost: 18500,
      owner: "Lead Backend Developer (Tấn Phát)",
      status: "Resolved",
      timestamp: "2026-06-22 14:30",
      resolution: "Chuyển hướng tạm thời tất cả luồng thanh toán quốc tế qua cổng PayME dự phòng và thiết lập cơ chế tự động thử lại (automatic retry)."
    },
    {
      id: "INC-02",
      name: "Lỗi Crash SDK liên kết ngân hàng đối tác trên Android v2.1.2",
      system: "KYC Service / Android App",
      downtime: 240,
      revenueLost: 24500,
      owner: "Lead Android Developer (Minh Hùng)",
      status: "Resolved",
      timestamp: "2026-06-20 09:15",
      resolution: "Tích hợp bản vá khẩn cấp v2.1.3 của SDK ngân hàng để ngăn ngừa crash khi user nhấn xác thực khuôn mặt."
    },
    {
      id: "INC-03",
      name: "Trễ truy vấn đồng bộ hóa dữ liệu giao dịch FTD (ETL Latency)",
      system: "Data Pipeline (Airflow)",
      downtime: 90,
      revenueLost: 4200,
      owner: "Data Engineer (Hoàng Nam)",
      status: "Resolved",
      timestamp: "2026-06-18 01:00",
      resolution: "Khởi động lại Airflow Scheduler và tối ưu hóa câu lệnh SQL khóa bảng tạm thời trong cơ sở dữ liệu."
    },
    {
      id: "INC-04",
      name: "Lỗi định tuyến CDN Cloudflare chặn truy cập IP tại khu vực Singapore",
      system: "Network / Infrastructure",
      downtime: 45,
      revenueLost: 9800,
      owner: "DevOps Engineer (Quốc Bảo)",
      status: "Resolved",
      timestamp: "2026-06-15 18:45",
      resolution: "Cập nhật WAF rules trên Cloudflare để bypass định tuyến lỗi và phân phối tải qua máy chủ Edge phụ."
    },
    {
      id: "INC-05",
      name: "Lỗi kết nối cơ sở dữ liệu Redis Cache gây đơ trang nạp rút tiền",
      system: "Redis Cache Cluster",
      downtime: 60,
      revenueLost: 12500,
      owner: "Lead Backend Developer (Tấn Phát)",
      status: "Resolved",
      timestamp: "2026-06-11 20:00",
      resolution: "Khởi tạo lại instance Redis Slave và cấu hình cơ chế tự động chuyển đổi Master-Slave (Failover cluster)."
    }
  ];

  // 19.2 AD CREATIVE FATIGUE DATA
  const creativeFatigueData = [
    { frequency: 1.0, ctr: 4.80, cvr: 25.0, cpa: 6.50, status: "Tối ưu (Optimal)" },
    { frequency: 2.0, ctr: 4.50, cvr: 24.2, cpa: 7.00, status: "Tối ưu (Optimal)" },
    { frequency: 3.0, ctr: 3.80, cvr: 22.0, cpa: 8.20, status: "Bình thường (Healthy)" },
    { frequency: 4.0, ctr: 2.90, cvr: 16.5, cpa: 11.50, status: "Cảnh báo (Warning)" },
    { frequency: 5.0, ctr: 1.80, cvr: 9.8, cpa: 18.00, status: "Bão hòa (Fatigued)" },
    { frequency: 6.0, ctr: 0.90, cvr: 4.5, cpa: 32.00, status: "Quá tải (Critical)" }
  ];


  // (Đã bỏ contentThemes / platformDominance / hookIntelligenceV2 — seed thừa,
  //  được tính lại động trong getDynamicContentData ở app.js)

  // 23. CONTENT CALENDAR DATA (July 2026 Scheduled Releases - Enriched)
  const contentCalendar = [
    { Date: "2026-07-02", Theme: "Beginner Education", Title: "Lớp học vĩ mô #01: FED cắt lãi suất ảnh hưởng gì tới ví tiền?", Channel: "YouTube Ads", Owner: "Copywriter Lead", Segment: "Casual", Status: "Scheduled", Objective: "Tăng lượng cài đặt tự nhiên", Hook: "FED cắt lãi suất ảnh hưởng gì tới ví tiền của bạn?", CTA: "Tải app xem phân tích vĩ mô miễn phí", TargetKPI: "CTR > 2.5%, 1,500 App Installs" },
    { Date: "2026-07-04", Theme: "Passive Income", Title: "FOMO Hook: Nhận Free $10 Token cực dễ trong 30s", Channel: "TikTok Ads", Owner: "Creative Team", Segment: "Crypto Enthusiast", Status: "In Production", Objective: "Thúc đẩy hoàn thành KYC", Hook: "Nhận Free $10 Token cực dễ trong 30 giây", CTA: "Hoàn thành KYC nhận quà ngay", TargetKPI: "KYC Rate > 35%, 500 KYC Generated" },
    { Date: "2026-07-07", Theme: "Technical Analysis", Title: "Live Gold Insight: Vàng lập đỉnh lịch sử, phòng vệ thế nào?", Channel: "Meta Ads", Owner: "Trading Analyst", Segment: "Whale Trader", Status: "Draft", Objective: "Kích hoạt nạp tiền lần đầu", Hook: "Vàng lập đỉnh lịch sử: Cơ hội hay bẫy rủi ro?", CTA: "Giao dịch Vàng chi phí thấp nhất", TargetKPI: "FTD Rate > 20%, 150 FTD Generated" },
    { Date: "2026-07-09", Theme: "Trading Psychology", Title: "Tại sao 95% trader đều lỗ ở lệnh đầu tiên? Cách tránh!", Channel: "YouTube Ads", Owner: "Copywriter Lead", Segment: "Casual", Status: "Scheduled", Objective: "Tăng tương tác thương hiệu", Hook: "Tại sao 95% trader đều lỗ ở lệnh đầu tiên?", CTA: "Đăng ký tham gia webinar tâm lý đầu tư", TargetKPI: "CTR > 3.0%, 800 Đăng ký webinar" },
    { Date: "2026-07-12", Theme: "Product Education", Title: "Hướng dẫn nạp rút cổng Banking mới cực nhanh dưới 30s", Channel: "Email", Owner: "Product Team", Segment: "Whale Trader", Status: "In Production", Objective: "Giảm tỷ lệ kẹt phễu thanh toán", Hook: "Nạp rút ngân hàng cực nhanh dưới 30 giây", CTA: "Nạp tiền trải nghiệm cổng giao dịch mới", TargetKPI: "FTD Conversion > 50%, MTTR < 10m" },
    { Date: "2026-07-15", Theme: "Success Story", Title: "Hành trình từ vốn $100 lên $5,000 của cậu sinh viên 20 tuổi", Channel: "Meta Ads", Owner: "Creative Team", Segment: "Crypto Enthusiast", Status: "Draft", Objective: "Tạo niềm tin & Kích hoạt giao dịch", Hook: "Từ vốn $100 lên $5,000: Hành trình thực tế của sinh viên", CTA: "Bắt đầu giao dịch chỉ từ $1", TargetKPI: "CVR > 2.8%, 200 First Trade Generated" },
    { Date: "2026-07-18", Theme: "Passive Income", Title: "Tối ưu hóa lãi suất kép khi gửi tiết kiệm ví coin", Channel: "Email", Owner: "Marketing Lead", Segment: "Core Casual", Status: "Scheduled", Objective: "Tăng giá trị tài sản ròng nạp vào", Hook: "Bí mật tối ưu hóa lãi suất kép khi tiết kiệm coin", CTA: "Kích hoạt ví tiết kiệm nhận lãi suất 12%/năm", TargetKPI: "FTD Vol > $1,000, 300 Ví kích hoạt" },
    { Date: "2026-07-20", Theme: "Beginner Education", Title: "Top 3 cổ phiếu công nghệ tiềm năng nhất nửa cuối năm 2026", Channel: "Meta Ads", Owner: "Trading Analyst", Segment: "Core Casual", Status: "Scheduled", Objective: "Thúc đẩy First Trade", Hook: "Top 3 cổ phiếu công nghệ bùng nổ nửa cuối năm 2026", CTA: "Mở vị thế mua cổ phiếu công nghệ ngay", TargetKPI: "First Trade Rate > 15%, 400 Lệnh giao dịch" }
  ];

  // 24. TEAM OPERATIONAL SYSTEM DATA
  const teamTasks = [
    { id: "TSK-001", department: "Marketing", taskName: "Tối ưu hóa chiến dịch Meta Ads M-02", assignee: "Tran (CMO)", owner: "CMO", priority: "High", status: "In Progress", progress: 75, impact: 8, eta: "2026-07-01", dueDate: "2026-07-02", dependency: "None", responsible: "Marketing Lead", accountable: "CMO", consulted: "Data Analyst", informed: "CEO" },
    { id: "TSK-002", department: "Content", taskName: "Tạo 3 video hook FOMO mới cho TikTok", assignee: "Creative Specialist", owner: "Creative Lead", priority: "High", status: "Review", progress: 90, impact: 9, eta: "2026-06-25", dueDate: "2026-06-26", dependency: "None", responsible: "Creative Team", accountable: "Creative Lead", consulted: "Marketing Team", informed: "CMO" },
    { id: "TSK-003", department: "Product", taskName: "Tối ưu phễu KYC Android & Vá SDK ngân hàng", assignee: "Android Dev Lead", owner: "Product Manager", priority: "High", status: "Blocked", progress: 40, impact: 10, eta: "2026-06-28", dueDate: "2026-06-30", dependency: "TSK-005", responsible: "Dev Team", accountable: "Product Manager", consulted: "Data Team", informed: "CEO" },
    { id: "TSK-004", department: "Data", taskName: "Xây dựng ETL pipeline cho tệp Whale Trader", assignee: "Data Engineer", owner: "Data Analyst", priority: "Medium", status: "Todo", progress: 10, impact: 7, eta: "2026-07-05", dueDate: "2026-07-07", dependency: "None", responsible: "Data Team", accountable: "Data Analyst", consulted: "Product Manager", informed: "CMO" },
    { id: "TSK-005", department: "Data", taskName: "Tích hợp log lỗi SDK Onboarding lên Kibana", assignee: "Data Engineer", owner: "Data Analyst", priority: "High", status: "Done", progress: 100, impact: 8, eta: "2026-06-20", dueDate: "2026-06-22", dependency: "None", responsible: "Data Team", accountable: "Data Analyst", consulted: "Dev Team", informed: "Product Manager" },
    { id: "TSK-006", department: "Customer Success", taskName: "Xử lý đợt khiếu nại nạp tiền chậm ngân hàng", assignee: "CS Lead", owner: "Customer Success Head", priority: "High", status: "In Progress", progress: 60, impact: 8, eta: "2026-06-24", dueDate: "2026-06-25", dependency: "None", responsible: "CS Agent", accountable: "CS Lead", consulted: "Product Team", informed: "CEO" },
    { id: "TSK-007", department: "Marketing", taskName: "Chạy chiến dịch email Reactivation tệp At Risk", assignee: "Growth Marketer", owner: "Marketing Lead", priority: "Medium", status: "Todo", progress: 0, impact: 7, eta: "2026-07-03", dueDate: "2026-07-05", dependency: "None", responsible: "Marketing Team", accountable: "Marketing Lead", consulted: "Data Analyst", informed: "CMO" },
    { id: "TSK-008", department: "Product", taskName: "Nghiên cứu tích hợp cổng rút tiền nhanh 24/7", assignee: "Product Manager", owner: "Product Manager", priority: "Medium", status: "Backlog", progress: 0, impact: 8, eta: "2026-07-15", dueDate: "2026-07-20", dependency: "None", responsible: "Product Team", accountable: "Product Manager", consulted: "Finance Team", informed: "CEO" },
    { id: "TSK-009", department: "Customer Success", taskName: "Xây dựng cổng tự phục vụ Self-Service FAQ", assignee: "CS Specialist", owner: "CS Lead", priority: "Low", status: "Todo", progress: 20, impact: 6, eta: "2026-07-10", dueDate: "2026-07-12", dependency: "None", responsible: "CS Team", accountable: "CS Lead", consulted: "Product Team", informed: "None" },
    { id: "TSK-010", department: "Content", taskName: "Viết kịch bản lớp học giáo dục đầu tư vĩ mô", assignee: "Copywriter Lead", owner: "Creative Lead", priority: "Medium", status: "In Progress", progress: 50, impact: 7, eta: "2026-06-29", dueDate: "2026-06-30", dependency: "None", responsible: "Copywriter Lead", accountable: "Creative Lead", consulted: "Trading Analyst", informed: "None" },
    { id: "TSK-011", department: "Design", taskName: "Thiết kế Banner và Landing Page cho chiến dịch nạp lần đầu", assignee: "UI/UX Designer", owner: "Creative Lead", priority: "Medium", status: "In Progress", progress: 60, impact: 7, eta: "2026-06-27", dueDate: "2026-06-28", dependency: "None", responsible: "UI/UX Designer", accountable: "Creative Lead", consulted: "Marketing Lead", informed: "None" },
    { id: "TSK-012", department: "Design", taskName: "Cải tiến luồng trải nghiệm đăng ký tài khoản (UX Wireframes)", assignee: "Lead Product Designer", owner: "Product Manager", priority: "High", status: "Done", progress: 100, impact: 9, eta: "2026-06-18", dueDate: "2026-06-20", dependency: "None", responsible: "Product Designer", accountable: "Product Manager", consulted: "Dev Team", informed: "CEO" }
  ];

  const departmentMetrics = {
    Marketing: { campaigns: 5, spend: 32000, revenue: 112000, roi: 2.50, kyc: 2870, cac: 11.15, todo: 2, sla: 92 },
    Content: { count: 28, hookTests: 12, creativeScore: 8.2, revenue: 45000, backlog: 8, eta: "2 ngày" },
    Design: { activeTasks: 18, completedTasks: 92, speed: "94%", satisfaction: 4.8, backlog: 5, sla: 96 },
    Product: { releases: 4, bugs: 6, timeToRelease: "14 ngày", churnImpact: "-1.5%", nps: 45 },
    Data: { freshness: "5 phút", etlSuccess: 99.8, uptime: 99.95, accuracy: 99.99, incidents: 1 },
    CustomerSuccess: { tickets: 1250, resolutionTime: "2.4 giờ", csat: 94, churnSave: 72, upsell: 8500 }
  };

  const okrCenter = {
    company: [
      { id: "OKR-COM-01", objective: "Tối ưu hóa LTV/CAC và mở rộng quy mô Whale VIP", keyResult: "Đạt tỷ lệ LTV/CAC > 3.50x (Hiện tại: 3.48x)", progress: 99, owner: "CEO" },
      { id: "OKR-COM-02", objective: "Cải thiện độ ổn định và trải nghiệm phễu nạp rút", keyResult: "Tỷ lệ chuyển đổi KYC Android > 65% (Hiện tại: 48%)", progress: 74, owner: "Product Manager" }
    ],
    team: [
      { id: "OKR-TEM-01", parentId: "OKR-COM-02", objective: "Xử lý triệt để lỗi onboarding trên thiết bị Android", keyResult: "Vá SDK liên kết ngân hàng và đưa Bug Count về < 3", progress: 50, owner: "Product Team", department: "Product" },
      { id: "OKR-TEM-02", parentId: "OKR-COM-01", objective: "Mở rộng và đa dạng hóa tuyến nội dung video marketing", keyResult: "Test 10 hook sáng tạo mới trên TikTok và đạt CTR > 2.5%", progress: 80, owner: "Creative Team", department: "Content" },
      { id: "OKR-TEM-03", parentId: "OKR-COM-01", objective: "Xây dựng hệ thống phân tích và dự báo chân dung VIP", keyResult: "Hoàn thiện mô hình Whale Prediction và Churn Early Warning", progress: 95, owner: "Data Analytics Team", department: "Data" },
      { id: "OKR-TEM-04", parentId: "OKR-COM-02", objective: "Thiết kế lại luồng KYC trực quan hơn", keyResult: "Hoàn thiện UI/UX flow mới và giảm Drop-off", progress: 60, owner: "Design Team", department: "Design" },
      { id: "OKR-TEM-05", parentId: "OKR-COM-02", objective: "Xây dựng quy trình hỗ trợ VIP nhanh gọn", keyResult: "Giảm thời gian phản hồi hỗ trợ dưới 5 phút", progress: 90, owner: "CS Team", department: "CustomerSuccess" },
      { id: "OKR-TEM-06", parentId: "OKR-COM-01", objective: "Tối ưu hóa CAC và cải thiện chất lượng kênh User Acquisition", keyResult: "Blended CAC giảm 15% và giữ ổn định volume KYC", progress: 78, owner: "Marketing Team", department: "Marketing" }
    ],
    individual: [
      { id: "OKR-IND-01", parentId: "OKR-TEM-03", objective: "Nâng cao độ chính xác mô hình dự báo Whale V2", keyResult: "Đạt AUC > 0.85 (Hiện tại: 0.86)", progress: 100, owner: "Data Analyst", department: "Data" },
      { id: "OKR-IND-02", parentId: "OKR-TEM-06", objective: "Tối ưu hóa ngân sách phân phối chiến dịch Ads", keyResult: "Giảm CAC Meta xuống dưới $11 và tăng ROI lên 1.8x", progress: 65, owner: "Marketing Lead", department: "Marketing" },
      { id: "OKR-IND-03", parentId: "OKR-TEM-02", objective: "Thử nghiệm 15 kịch bản video review mới", keyResult: "Đạt ít nhất 3 video có lượt xem > 50k", progress: 75, owner: "Content Specialist", department: "Content" },
      { id: "OKR-IND-04", parentId: "OKR-TEM-04", objective: "Thiết kế bộ banner quảng cáo Whale VIP", keyResult: "Bàn giao 10 key visuals đúng hạn trước chiến dịch", progress: 80, owner: "UI/UX Designer", department: "Design" },
      { id: "OKR-IND-05", parentId: "OKR-TEM-01", objective: "Tối ưu hóa tốc độ tải trang KYC Android", keyResult: "Giảm thời gian tải trang xuống dưới 1.5 giây", progress: 70, owner: "Front-end Dev", department: "Product" },
      { id: "OKR-IND-06", parentId: "OKR-TEM-05", objective: "Hoàn thiện FAQ và kịch bản CS tự động", keyResult: "Đưa tỷ lệ giải quyết tự động qua chatbot lên 40%", progress: 85, owner: "CS Specialist", department: "CustomerSuccess" }
    ]
  };

  const resolutionMetrics = {
    totalIssues: 45,
    openIssues: 8,
    closedIssues: 37,
    escalatedIssues: 2,
    art: "4.8 giờ",
    mttd: "25 phút",
    mttr: "3.5 giờ",
    slaRate: 88.5,
    blockerDuration: "12 giờ"
  };

  // (removed: improvementMetrics — dead data, never referenced in app.js)

  // 25. CROSS-CHANNEL JOURNEY INTELLIGENCE DATA
  const customerJourneys = [
    { path: "Meta Ads → Website Visit → Organic Search → Register → Email Remarketing → KYC → First Deposit → First Trade", users: 1250, conversionRate: 24.5, avgTime: "4.8 giờ", revenue: 182000, avgLtv: 145.6, whaleRate: 12.4 },
    { path: "YouTube → Community Group → Direct Visit → Register → KYC → Deposit", users: 840, conversionRate: 18.2, avgTime: "12.5 giờ", revenue: 145000, avgLtv: 172.6, whaleRate: 16.8 },
    { path: "TikTok Ads → Mobile App → KYC → Deposit → Trade", users: 2100, conversionRate: 15.6, avgTime: "1.2 giờ", revenue: 115000, avgLtv: 54.7, whaleRate: 4.2 },
    { path: "Google Search → Direct Visit → Register → KYC → Deposit → Trade", users: 950, conversionRate: 32.4, avgTime: "2.1 giờ", revenue: 220000, avgLtv: 231.5, whaleRate: 22.1 }
  ];

  const transitionMatrix = [
    { firstChannel: "Meta Ads", nextChannel: "Google Search", rate: 32 },
    { firstChannel: "TikTok Ads", nextChannel: "Direct Visit", rate: 25 },
    { firstChannel: "YouTube Ads", nextChannel: "Organic Search", rate: 41 },
    { firstChannel: "Google Ads", nextChannel: "Direct Visit", rate: 18 },
    { firstChannel: "Email Remarketing", nextChannel: "App Open", rate: 64 }
  ];

  const funnelMigration = [
    { stage: "Awareness → Consideration", conversionRate: 82.0, avgTime: "15 phút", dropRate: 18.0, revenue: 0 },
    { stage: "Consideration → Activation", conversionRate: 68.2, avgTime: "4.2 giờ", dropRate: 31.8, revenue: 0 },
    { stage: "Activation → Revenue", conversionRate: 45.0, avgTime: "1.8 ngày", dropRate: 55.0, revenue: 382000 },
    { stage: "Revenue → Loyalty", conversionRate: 28.4, avgTime: "14.0 ngày", dropRate: 71.6, revenue: 185000 },
    { stage: "Loyalty → Advocacy", conversionRate: 12.0, avgTime: "30.0 ngày", dropRate: 88.0, revenue: 92000 }
  ];

  // 26. UTM GOVERNANCE & EVENT DICTIONARY DATA
  const utmRules = {
    sources: ["meta", "google", "tiktok", "youtube", "affiliate", "email"],
    mediums: ["paid_social", "paid_search", "influencer", "organic", "email", "referral"],
    campaigns: [
      { format: "Quốc gia_Mục tiêu_Nhóm nội dung_Thời gian", example: "vn_acquisition_beginner_202607" },
      { format: "Quốc gia_Giữ chân_Tệp người dùng_Thời gian", example: "sg_retention_trader_202608" }
    ],
    contents: ["hook01_video01", "hook02_video05", "testimonial_video03"],
    terms: ["keyword", "audience", "adset", "persona"]
  };

  const utmViolations = [
    { timestamp: "2026-06-22 22:05:14", url: "https://growthapp.vn?utm_source=metaads&medium=cpc", issue: "Thiếu utm_ prefix ở medium; source 'metaads' không nằm trong whitelist", volume: 420, status: "Active" },
    { timestamp: "2026-06-21 11:15:00", url: "https://growthapp.vn?utm_source=tiktok&utm_medium=paid_social&utm_campaign=draft", issue: "Campaign format không chuẩn (thiếu quốc gia/mục tiêu)", volume: 85, status: "Active" },
    { timestamp: "2026-06-20 14:32:10", url: "https://growthapp.vn?utm_source=google&utm_medium=banner&utm_campaign=vn_acquisition_generic", issue: "Medium 'banner' không hợp lệ (paid_social/paid_search/etc.)", volume: 154, status: "Resolved" }
  ];

  const eventTrackingDictionary = [
    { event: "install", description: "Cài đặt ứng dụng", trigger: "First Open (Lần mở đầu tiên)", owner: "Dev Team" },
    { event: "register", description: "Đăng ký thành công", trigger: "Registration Success (Đăng ký thành công)", owner: "Dev Team" },
    { event: "kyc_complete", description: "Hoàn thành KYC", trigger: "KYC Approved (Duyệt hồ sơ KYC)", owner: "Dev Team" },
    { event: "first_deposit", description: "Nạp tiền lần đầu", trigger: "Deposit Success (Nạp tiền thành công)", owner: "Dev Team" },
    { event: "first_trade", description: "Giao dịch đầu tiên", trigger: "Trade Success (Lệnh trade khớp thành công)", owner: "Dev Team" }
  ];

  // 27. CONTENT OPERATIONS CENTER DATA
  const contentKpis = {
    production: [
      { kpi: "Số lượng nội dung xuất bản", current: 28, target: 30, unit: "Video/Bài viết", rate: 93 },
      { kpi: "Tỷ lệ hoàn thành đúng hạn", current: 95.0, target: 98.0, unit: "%", rate: 95 },
      { kpi: "Thời gian sản xuất trung bình", current: 2.2, target: 2.0, unit: "Ngày/Video", rate: 91 },
      { kpi: "Tỷ lệ nội dung bị chỉnh sửa lại", current: 15.0, target: 10.0, unit: "%", rate: 85 }
    ],
    performance: [
      { kpi: "Reach (Lượt tiếp cận)", current: "450K", target: "500K", unit: "Lượt", rate: 90 },
      { kpi: "Impressions (Lượt hiển thị)", current: "1.2M", target: "1.5M", unit: "Lượt", rate: 80 },
      { kpi: "Average Watch Time", current: "18.5 giây", target: "20 giây", unit: "Giây", rate: 92 },
      { kpi: "Video Completion Rate", current: "24.2%", target: "30%", unit: "%", rate: 81 },
      { kpi: "Average CTR", current: "2.8%", target: "2.5%", unit: "%", rate: 112 },
      { kpi: "Average CVR", current: "3.2%", target: "3.0%", unit: "%", rate: 106 },
      { kpi: "Cost Per Result", current: "$8.50", target: "$10.00", unit: "$", rate: 115 }
    ],
    business: [
      { kpi: "KYC Generated", current: 850, target: 800, unit: "User", rate: 106 },
      { kpi: "First Deposit (FTD)", current: 340, target: 300, unit: "User", rate: 113 },
      { kpi: "Revenue Generated", current: 45000, target: 40000, unit: "$", rate: 112 },
      { kpi: "LTV Generated", current: 185000, target: 150000, unit: "$", rate: 123 },
      { kpi: "Whale Generated", current: 42, target: 35, unit: "User", rate: 120 }
    ]
  };

  const contentMeasurementFramework = [
    { level: "1. Awareness (Nhận diện)", metrics: "Reach, Impressions, Video Views, CPM", target: "Reach > 500K, CPM < $5.00" },
    { level: "2. Engagement (Tương tác)", metrics: "Likes, Shares, Comments, Saves, Watch Time", target: "Tương tác > 5%, Watch Time > 15s" },
    { level: "3. Conversion (Chuyển đổi)", metrics: "CTR, Landing Page Views, App Installs, KYC Registration", target: "CTR > 2.5%, Installs-to-KYC > 30%" },
    { level: "4. Business Impact (Kinh doanh)", metrics: "First Deposit (FTD), Volume, Revenue, ROI, LTV, Whale Rate", target: "ROI > 2.0x, LTV/CAC > 3.0x" }
  ];

  const contentReviewRepository = [
    { id: "REV-001", date: "2026-06-15", creative: "FOMO Gold Loop (TikTok Ads)", whatWorked: "Hook đánh mạnh vào tâm lý sợ bỏ lỡ đợt tăng giá vàng, cảnh quay nhịp nhanh tạo tò mò", whatDidNotWork: "CTA cuối video hơi dài dòng, làm giảm tỷ lệ click-through ở 3 giây cuối", bestHook: "Vàng lập đỉnh lịch sử và bí mật lệnh trade $10,000", bestCta: "Tải app nhận ngay quà Free Token $10 trong hôm nay", insight: "Người dùng TikTok thích xem video dưới 15 giây, thông điệp cần ngắn gọn xúc tích", hypothesis: "Nếu rút ngắn CTA từ 5s xuống 2s và thay đổi màu nền nút CTA sang màu vàng neon, CTR sẽ tăng thêm 15%" },
    { id: "REV-002", date: "2026-06-18", creative: "Beginner Guide Options (Meta Ads)", whatWorked: "Cách giải thích trực quan sinh động bằng hoạt họa 2D dễ hiểu cho người mới bắt đầu", whatDidNotWork: "Không phân nhóm đối tượng rõ ràng, dẫn đến tiếp cận nhầm tệp nhà đầu tư chuyên nghiệp", bestHook: "Tránh mất tiền oan khi giao dịch Options", bestCta: "Xem video hướng dẫn chi tiết", insight: "Meta Ads hoạt động tốt nhất khi chia chiến dịch thành các nhóm quảng cáo nhắm mục tiêu riêng biệt", hypothesis: "Nếu chạy A/B test nhắm tệp sở hữu sở thích 'Personal Finance' so với tệp mở rộng, CVR sẽ tăng 20%" }
  ];

  const contentExperimentBacklog = [
    { hypothesis: "Sử dụng màu vàng Neon cho nút bấm CTA trên landing page giúp tăng tỷ lệ click thêm 12%", target: "Tăng Landing-Page-to-App-Install CVR", impact: 7, confidence: 8, ease: 9, priority: "High", owner: "Creative Specialist", startDate: "2026-07-01", endDate: "2026-07-07", status: "Planned", result: "Chờ thực thi" },
    { hypothesis: "Thử nghiệm Hook dạng Contrarian 'Tại sao 95% trader đều thua lỗ?' trên Meta Ads để giảm CPA", target: "Giảm CAC KYC xuống dưới $10.00", impact: 9, confidence: 7, ease: 7, priority: "Critical", owner: "Copywriter Lead", startDate: "2026-06-25", endDate: "2026-06-30", status: "In Progress", result: "Đang thu thập dữ liệu" },
    { hypothesis: "Tích hợp tính năng Referral Code trực tiếp vào luồng chia sẻ kết quả lệnh trade thắng", target: "Tăng organic referral signups thêm 25%", impact: 6, confidence: 6, ease: 5, priority: "Medium", owner: "Product PM", startDate: "2026-07-05", endDate: "2026-07-15", status: "Planned", result: "Chờ thực thi" },
    { hypothesis: "Gửi Email Remarketing tự động sau 2 tiếng nếu user hoàn tất KYC nhưng chưa nạp tiền", target: "Tăng KYC-to-FTD conversion rate lên trên 45%", impact: 8, confidence: 8, ease: 7, priority: "High", owner: "Growth Marketer", startDate: "2026-06-20", endDate: "2026-06-27", status: "In Progress", result: "Đạt kết quả sơ bộ +8% CVR" }
  ];

  // 27. CROSS-FUNCTIONAL COLLABORATION DATA
  const crossFunctionalCollab = [
    { department: "Marketing", activeTasks: 52, completedTasks: 180, overdueTasks: 2, onTimeRate: 91, workload: 88, utilization: 87, blockedTasks: 4, supportRequired: 3, perfIndex: 9.0 },
    { department: "Content", activeTasks: 20, completedTasks: 95, overdueTasks: 1, onTimeRate: 85, workload: 82, utilization: 85, blockedTasks: 3, supportRequired: 2, perfIndex: 8.2 },
    { department: "Design", activeTasks: 34, completedTasks: 125, overdueTasks: 5, onTimeRate: 78, workload: 92, utilization: 92, blockedTasks: 2, supportRequired: 9, perfIndex: 7.9 },
    { department: "Product", activeTasks: 18, completedTasks: 62, overdueTasks: 1, onTimeRate: 94, workload: 80, utilization: 79, blockedTasks: 5, supportRequired: 1, perfIndex: 8.8 },
    { department: "Data", activeTasks: 14, completedTasks: 50, overdueTasks: 0, onTimeRate: 100, workload: 75, utilization: 74, blockedTasks: 1, supportRequired: 4, perfIndex: 9.2 },
    { department: "CustomerSuccess", activeTasks: 22, completedTasks: 310, overdueTasks: 3, onTimeRate: 88, workload: 85, utilization: 82, blockedTasks: 2, supportRequired: 2, perfIndex: 8.5 }
  ];

  const designTasks = [
    { id: "DSN-001", project: "Campaign Options Meta v2", type: "Visual Ads", reqDept: "Marketing", requester: "Tran (CMO)", assignee: "Tuan (Lead UI)", reviewer: "Creative Lead", priority: "High", deadline: "2026-06-25", eta: "2026-06-24", version: "v2.1", status: "In Design" },
    { id: "DSN-002", project: "TikTok FOMO Hook 04", type: "Video Edit", reqDept: "Content", requester: "Creative Specialist", assignee: "Minh (Video Creator)", reviewer: "Creative Lead", priority: "High", deadline: "2026-06-24", eta: "2026-06-23", version: "v1.0", status: "Internal Review" },
    { id: "DSN-003", project: "KYC Android Flow Redesign", type: "UX/UI Design", reqDept: "Product", requester: "Product Manager", assignee: "Tuan (Lead UI)", reviewer: "Product Manager", priority: "Critical", deadline: "2026-06-28", eta: "2026-06-28", version: "v3.2", status: "Stakeholder Review" },
    { id: "DSN-004", project: "Infographic Whale Segment", type: "Social Post", reqDept: "Data", requester: "Data Analyst", assignee: "Linh (Graphic Designer)", reviewer: "Marketing Lead", priority: "Medium", deadline: "2026-07-02", eta: "2026-07-01", version: "v1.2", status: "Planning" },
    { id: "DSN-005", project: "Web Banner Trade Event", type: "Banner Web", reqDept: "Marketing", requester: "Growth Marketer", assignee: "Linh (Graphic Designer)", reviewer: "Creative Lead", priority: "High", deadline: "2026-06-21", eta: "2026-06-20", version: "v2.0", status: "Approved" },
    { id: "DSN-006", project: "Email Template At Risk", type: "HTML Template", reqDept: "Marketing", requester: "Marketing Lead", assignee: "Linh (Graphic Designer)", reviewer: "Marketing Lead", priority: "Low", deadline: "2026-06-29", eta: "2026-06-28", version: "v1.1", status: "Request Received" }
  ];

  const designKpis = {
    totalRequests: 184,
    completed: 145,
    inProgress: 34,
    overdue: 5,
    onTimeRate: 88.5,
    avgCompletionTime: "3.2 ngày",
    avgReviewTime: "1.1 ngày",
    avgRevisionTime: "0.8 ngày",
    avgRevisionRounds: 1.8
  };

  const designerWorkloads = [
    { name: "Tuan (Lead UI)", assignedTasks: 12, completedTasks: 8, activeTasks: 4, utilization: 94, avgWorkHours: 42, overdueTasks: 1, qualityScore: 9.1 },
    { name: "Minh (Video Creator)", assignedTasks: 10, completedTasks: 7, activeTasks: 3, utilization: 85, avgWorkHours: 38, overdueTasks: 2, qualityScore: 8.5 },
    { name: "Linh (Graphic Designer)", assignedTasks: 12, completedTasks: 9, activeTasks: 3, utilization: 82, avgWorkHours: 37, overdueTasks: 2, qualityScore: 8.8 }
  ];

  const teamEffectivenessKpis = {
    Marketing: {
      delivery: { completionRate: 94.2, onTimeRate: 91.0, slaRate: 92.0, cycleTime: "4.5 ngày", leadTime: "5.2 ngày", wip: 8, overdueRate: 3.8 },
      productivity: { outputPerEmp: "14 tasks/tháng", revenuePerEmp: "$28,500/tháng", completedPerWeek: 12, throughput: 1.8, focusTime: "24h/tuần", deepWork: 16 },
      quality: { reworkRate: 8.5, defectRate: 1.2, errorRate: 2.1, reviewPassRate: 85.0, stakeholderSatisfaction: 8.8 },
      collaboration: { crossTeamRate: 88.5, avgResponseTime: "1.8 giờ", escalationRate: 4.2, dependencyDelayRate: 12.5, communicationScore: 8.5 },
      innovation: { experiments: 6, successRate: 66.7, ideas: 12, automationRate: 35.0, timeSaved: "14h/tuần" }
    },
    Design: {
      delivery: { completionRate: 85.3, onTimeRate: 78.0, slaRate: 82.5, cycleTime: "3.2 ngày", leadTime: "4.0 ngày", wip: 10, overdueRate: 14.7 },
      productivity: { outputPerEmp: "22 designs/tháng", revenuePerEmp: "$18,200/tháng", completedPerWeek: 8, throughput: 1.2, focusTime: "28h/tuần", deepWork: 20 },
      quality: { reworkRate: 18.2, defectRate: 2.5, errorRate: 4.0, reviewPassRate: 72.0, stakeholderSatisfaction: 7.9 },
      collaboration: { crossTeamRate: 74.0, avgResponseTime: "2.4 giờ", escalationRate: 8.5, dependencyDelayRate: 22.0, communicationScore: 7.8 },
      innovation: { experiments: 4, successRate: 50.0, ideas: 8, automationRate: 15.0, timeSaved: "4h/tuần" }
    },
    Product: {
      delivery: { completionRate: 91.2, onTimeRate: 94.0, slaRate: 90.0, cycleTime: "14.2 ngày", leadTime: "18.0 ngày", wip: 5, overdueRate: 5.5 },
      productivity: { outputPerEmp: "2 features/tháng", revenuePerEmp: "$42,000/tháng", completedPerWeek: 3, throughput: 0.5, focusTime: "22h/tuần", deepWork: 14 },
      quality: { reworkRate: 5.0, defectRate: 4.8, errorRate: 3.5, reviewPassRate: 90.0, stakeholderSatisfaction: 8.5 },
      collaboration: { crossTeamRate: 90.0, avgResponseTime: "1.2 giờ", escalationRate: 2.1, dependencyDelayRate: 8.0, communicationScore: 9.0 },
      innovation: { experiments: 5, successRate: 60.0, ideas: 15, automationRate: 40.0, timeSaved: "20h/tuần" }
    },
    Data: {
      delivery: { completionRate: 98.0, onTimeRate: 100.0, slaRate: 99.5, cycleTime: "2.1 ngày", leadTime: "2.5 ngày", wip: 3, overdueRate: 0.0 },
      productivity: { outputPerEmp: "8 reports/tháng", revenuePerEmp: "$35,000/tháng", completedPerWeek: 4, throughput: 1.1, focusTime: "30h/tuần", deepWork: 22 },
      quality: { reworkRate: 2.0, defectRate: 0.5, errorRate: 0.8, reviewPassRate: 96.0, stakeholderSatisfaction: 9.2 },
      collaboration: { crossTeamRate: 95.5, avgResponseTime: "0.8 giờ", escalationRate: 1.0, dependencyDelayRate: 4.5, communicationScore: 9.5 },
      innovation: { experiments: 8, successRate: 75.0, ideas: 20, automationRate: 75.0, timeSaved: "35h/tuần" }
    },
    CustomerSuccess: {
      delivery: { completionRate: 95.8, onTimeRate: 88.0, slaRate: 94.0, cycleTime: "2.4 giờ", leadTime: "3.0 giờ", wip: 15, overdueRate: 6.2 },
      productivity: { outputPerEmp: "250 tickets/tháng", revenuePerEmp: "$15,000/tháng", completedPerWeek: 60, throughput: 15.0, focusTime: "15h/tuần", deepWork: 8 },
      quality: { reworkRate: 4.5, defectRate: 1.5, errorRate: 2.0, reviewPassRate: 92.0, stakeholderSatisfaction: 9.0 },
      collaboration: { crossTeamRate: 85.0, avgResponseTime: "1.5 giờ", escalationRate: 5.0, dependencyDelayRate: 10.0, communicationScore: 8.5 },
      innovation: { experiments: 3, successRate: 33.3, ideas: 6, automationRate: 25.0, timeSaved: "8h/tuần" }
    },
    Content: {
      delivery: { completionRate: 88.5, onTimeRate: 85.0, slaRate: 87.0, cycleTime: "2.5 ngày", leadTime: "3.0 ngày", wip: 6, overdueRate: 5.0 },
      productivity: { outputPerEmp: "18 creatives/tháng", revenuePerEmp: "$22,000/tháng", completedPerWeek: 14, throughput: 1.5, focusTime: "26h/tuần", deepWork: 18 },
      quality: { reworkRate: 12.0, defectRate: 1.5, errorRate: 2.5, reviewPassRate: 80.0, stakeholderSatisfaction: 8.2 },
      collaboration: { crossTeamRate: 82.0, avgResponseTime: "2.0 giờ", escalationRate: 5.0, dependencyDelayRate: 15.5, communicationScore: 8.2 },
      innovation: { experiments: 5, successRate: 50.0, ideas: 10, automationRate: 20.0, timeSaved: "8h/tuần" }
    }
  };

  const bottlenecks = [
    { id: "BTN-001", cause: "Công việc chờ Stakeholder Review quá lâu", departments: "Design & Product", impact: "Dự án KYC Android chậm 4 ngày", priority: "High", action: "Thiết lập khung giờ duyệt cố định 15h hàng ngày giữa PM và Design Lead" },
    { id: "BTN-002", cause: "Designer quá tải tài nguyên (>90% utilization)", departments: "Design Team", impact: "Các yêu cầu banner Ads bị trễ Deadline 24h", priority: "Critical", action: "Tuyển thêm 1 freelancer Graphic Designer hỗ trợ Marketing Ads" },
    { id: "BTN-003", cause: "Thời gian Data Team phản hồi chậm các ad-hoc query", departments: "Data & Marketing", impact: "Chậm tối ưu hóa ngân sách chiến dịch M-02", priority: "Medium", action: "Xây dựng dashboard tự phục vụ (Self-service Metabase) cho Marketer" },
    { id: "BTN-004", cause: "Quá nhiều tasks phụ thuộc chéo bị chặn (Blocked)", departments: "Product & Data", impact: "Feature Onboarding v2.1 bị đóng băng", priority: "High", action: "Giải quyết khẩn cấp task TSK-005 tích hợp log lỗi Kibana" }
  ];

  const resourceCapacity = {
    departments: [
      { name: "Marketing", headcount: 5, capacity: 200, used: 174, utilization: 87, forecast: 220, recruiting: 1 },
      { name: "Content", headcount: 4, capacity: 160, used: 136, utilization: 85, forecast: 170, recruiting: 0 },
      { name: "Design", headcount: 3, capacity: 120, used: 110, utilization: 92, forecast: 160, recruiting: 1 },
      { name: "Product", headcount: 4, capacity: 160, used: 126, utilization: 79, forecast: 180, recruiting: 0 },
      { name: "Data", headcount: 2, capacity: 80, used: 59, utilization: 74, forecast: 100, recruiting: 1 },
      { name: "Customer Success", headcount: 8, capacity: 320, used: 262, utilization: 82, forecast: 340, recruiting: 0 }
    ],
    individualForecasts: [
      { role: "Senior UI/UX Designer", dept: "Design", urgency: "Critical", timeline: "Q3 2026", status: "Interviewing" },
      { role: "Data Engineer (Analytics)", dept: "Data", urgency: "Medium", timeline: "Q4 2026", status: "Sourcing" },
      { role: "Performance Marketer", dept: "Marketing", urgency: "High", timeline: "Q3 2026", status: "Approved" }
    ]
  };

  // 30. GROWTH STRATEGY DATA
  const growthStrategy = {
    currentStage: "Growth",
    stageAssessedDate: "2026-06-20",
    stageAssessor: "Hannah (CEO)",
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
  };

  // 31. MARKET INTELLIGENCE DATA
  const marketIntel = {
    tam: 120000000,
    sam: 45000000,
    som: 15000000,
    searchTrends: [
      { term: "Cách mở tài khoản chứng khoán", interest: 88, trend: "+12% MoM", status: "Rising" },
      { term: "Review app giao dịch cổ phiếu", interest: 95, trend: "+18% MoM", status: "Rising" },
      { term: "Mẹo nhận token quà tặng", interest: 62, trend: "-5% MoM", status: "Stable" },
      { term: "Đầu tư tài chính vĩ mô 2026", interest: 78, trend: "+25% MoM", status: "Spike" }
    ],
    countryOpportunities: [
      { country: "Vietnam", marketSize: 15000000, cac: 11.15, revenuePotential: 3820000, growthRate: "18.5%", rank: 1 },
      { country: "Thailand", marketSize: 12000000, cac: 14.50, revenuePotential: 2900000, growthRate: "12.2%", rank: 2 },
      { country: "Indonesia", marketSize: 22000000, cac: 18.20, revenuePotential: 4400000, growthRate: "22.4%", rank: 3 },
      { country: "Philippines", marketSize: 18000000, cac: 13.10, revenuePotential: 3200000, growthRate: "15.8%", rank: 4 }
    ]
  };

  // 32. COMPETITIVE INTELLIGENCE DATA
  const competitorIntel = {
    competitors: [
      { name: "Alpha Broker", estSpend: 45000, creativesCount: 24, offer: "Free $15 Deposit bonus", pricing: "0% commission for 3 months", landingPage: "https://alphabroker.com/vn_invite" },
      { name: "Zenith Trade", estSpend: 32000, creativesCount: 15, offer: "1:1 coaching call", pricing: "$2 fixed flat rate", landingPage: "https://zenithtrade.co/academy" },
      { name: "Beta Wallet", estSpend: 15000, creativesCount: 8, offer: "8% APY on idle cash", pricing: "Free cash out first 3 times", landingPage: "https://betawallet.io/savings" }
    ],
    shareOfVoice: [
      { channel: "Google Search Ads", internalShare: 35, alphaBrokerShare: 42, zenithShare: 18, othersShare: 5 },
      { channel: "Meta Social Ads", internalShare: 28, alphaBrokerShare: 38, betaWalletShare: 24, othersShare: 10 },
      { channel: "TikTok Viral", internalShare: 45, alphaBrokerShare: 15, zenithShare: 20, othersShare: 20 }
    ],
    swot: {
      strengths: ["Attribution engine thời gian thực", "Mô hình dự báo Whale VIP chính xác cao", "IEI cao (8.2x) nhờ tối ưu hóa coupon", "Tỷ lệ viral trên TikTok đạt 45% Share Of Voice"],
      weaknesses: ["Tỷ lệ rơi bỏ KYC ở hệ điều hành Android quá cao (52%)", "Phụ thuộc lớn vào Meta Ads", "Thời gian xử lý thiết kế kéo dài (designer quá tải)"],
      opportunities: ["Mở rộng thị trường sang Thái Lan & Philippines", "Tích hợp cổng nạp rút rút tiền nhanh 24/7", "Xây dựng Referral & K-factor Loops"],
      threats: ["Chi phí quảng cáo (CAC) trên Meta ads có dấu hiệu bão hòa và tăng cao", "Thay đổi chính sách bảo mật SDK trên các thiết bị di động", "Alpha Broker tăng ngân sách gấp đôi và tung coupon Free $15"]
    }
  };

  // 33. PRODUCT GROWTH DATA
  const productGrowth = {
    metrics: {
      dau: 4200,
      mau: 35000,
      stickiness: 12.0,
      featureAdoption: [
        { name: "KYC Upload Flow", adoptionRate: 85, retentionRate: 90 },
        { name: "Whale Predictor Panel", adoptionRate: 24, retentionRate: 65 },
        { name: "Referral Invite Code", adoptionRate: 42, retentionRate: 58 },
        { name: "Attribution Selector", adoptionRate: 15, retentionRate: 80 }
      ]
    },
    activationJourney: [
      { step: "App Installed", count: 12500, pctOfTotal: 100, dropoffPct: 0 },
      { step: "Signed Up", count: 8500, pctOfTotal: 68, dropoffPct: 32 },
      { step: "KYC Submitted", count: 4800, pctOfTotal: 38.4, dropoffPct: 43.5 },
      { step: "First Deposit", count: 2870, pctOfTotal: 22.96, dropoffPct: 40.2 },
      { step: "First Trade Completed", count: 2400, pctOfTotal: 19.2, dropoffPct: 16.3 }
    ],
    userFrictionLogs: [
      { id: "FRC-001", page: "/kyc/upload", type: "Rage Click", element: "btn-submit-docs", rate: "12.4% (Critical)", count: 245 },
      { id: "FRC-002", page: "/register/phone", type: "Form Abandonment", element: "input-otp-sms", rate: "18.2% (High)", count: 320 },
      { id: "FRC-003", page: "/deposit/gateway", type: "Dead Click", element: "icon-bank-list-arrow", rate: "8.5% (Medium)", count: 150 },
      { id: "FRC-004", page: "/trade/confirm", type: "Rage Click", element: "btn-confirm-order", rate: "4.2% (Low)", count: 72 }
    ]
  };

  // 34. EXPERIMENTATION OS DATA
  const experimentation = {
    pipeline: [
      { id: "EXP-101", idea: "Tách KYC Upload làm 2 bước đơn giản hơn", hypothesis: "Chia nhỏ biểu mẫu sẽ giảm 25% tỷ lệ Drop-off", impact: 8, confidence: 7, ease: 8, score: 7.7, status: "Execution" },
      { id: "EXP-102", idea: "Push Notification nhắc nhở FTD vào giờ vàng 19h", hypothesis: "Người dùng rảnh rỗi sẽ có khả năng nạp tiền cao hơn 15%", impact: 6, confidence: 8, ease: 9, score: 7.7, status: "Prioritization" },
      { id: "EXP-103", idea: "Thêm phần thưởng Free Token $5 cho Referral", hypothesis: "Quà tặng tức thì sẽ tăng K-factor lên > 0.15", impact: 9, confidence: 6, ease: 6, score: 7.0, status: "Idea" },
      { id: "EXP-104", idea: "A/B Test Tiêu đề Landing Page theo chủ đề Passive Income", hypothesis: "Tập trung vào thu nhập thụ động tăng 30% CVR", impact: 8, confidence: 8, ease: 8, score: 8.0, status: "Analysis" },
      { id: "EXP-105", idea: "Tích hợp Widget rút tiền 24/7 trực quan", hypothesis: "Đảm bảo rút tiền nhanh làm tăng 10% lòng tin", impact: 7, confidence: 6, ease: 5, score: 6.0, status: "Idea" }
    ],
    velocity: {
      testsPerWeek: 4.5,
      totalCompleted: 68,
      winRate: 38.5
    },
    learnings: [
      { id: "LRN-001", experiment: "Test Creative Video M-02 (Contrarian Hook)", result: "Thành công", learning: "Video hook đi ngược đám đông đạt tỷ lệ giữ chân 3s > 45%.", date: "2026-06-15" },
      { id: "LRN-002", experiment: "Email Welcome Series 5 ngày vs 3 ngày", result: "Thất bại", learning: "Loạt email 5 ngày liên tục gây phiền toái, spam rate tăng 2%. Hãy rút xuống 3 ngày.", date: "2026-06-10" }
    ]
  };

  // 35. REFERRAL & VIRALITY DATA
  const referralData = {
    referralRate: 14.5,
    inviteRate: 3.2,
    kFactor: 0.12,
    viralCycleTime: "8.5 ngày",
    activeLoopsCount: 4,
    loopsList: [
      { id: "LP-001", name: "Incentivized Referral Loop", trigger: "Người dùng KYC thành công", payload: "Mã giảm giá $5 / Free Token cho cả hai", status: "Active", conversionRate: 12.5 },
      { id: "LP-002", name: "Social Sharing Loop", trigger: "Giao dịch có lợi nhuận cao > 20%", payload: "Ảnh ROI đẹp mắt để share Facebook/Telegram", status: "Active", conversionRate: 8.2 },
      { id: "LP-003", name: "Community Invite Loop", trigger: "Tham gia lớp học Edu vĩ mô", payload: "Link chia sẻ nhóm kín nhận slide tài liệu", status: "Paused", conversionRate: 4.0 }
    ]
  };

  // 36. LIFECYCLE AUTOMATION DATA
  const lifecycleAutomation = {
    campaigns: [
      { id: "AUT-001", name: "Welcome Series (Email)", trigger: "Đăng ký tài khoản thành công", steps: 3, openRate: 68.2, ctr: 22.4, cvr: 15.5, revenue: 12500 },
      { id: "AUT-002", name: "Activation Series (Push)", trigger: "KYC chưa hoàn thành sau 24h", steps: 2, openRate: 45.0, ctr: 12.8, cvr: 8.2, revenue: 8400 },
      { id: "AUT-003", name: "Reactivation Loop (Email + SMS)", trigger: "Không hoạt động > 14 ngày (Tệp At Risk)", steps: 2, openRate: 32.4, ctr: 5.2, cvr: 4.1, revenue: 18500 },
      { id: "AUT-004", name: "FTD Abandonment (Push)", trigger: "KYC rồi nhưng chưa Deposit sau 3 ngày", steps: 2, openRate: 55.2, ctr: 18.0, cvr: 11.2, revenue: 14200 }
    ]
  };

  // 37. VOICE OF CUSTOMER DATA
  const vocData = {
    nps: 48,
    csat: 86,
    sentiment: { positive: 65, neutral: 25, negative: 10 },
    feedbackTickets: [
      { id: "VOC-001", channel: "Support Ticket", feedback: "Tôi rất thích tính năng AI dự báo Whale, nó giúp tôi biết tài khoản nào cần chăm sóc.", sentiment: "Positive" },
      { id: "VOC-002", channel: "App Store Review", feedback: "Nút Upload ảnh chứng minh thư KYC rất hay bị đơ và bắt tải lại, vô cùng phiền.", sentiment: "Negative" },
      { id: "VOC-003", channel: "Telegram Community", feedback: "Lớp học edu rất chất lượng nhưng mong admin thêm nhiều phân tích macro hơn.", sentiment: "Positive" },
      { id: "VOC-004", channel: "Support Ticket", feedback: "Rút tiền lúc 2h sáng hơi chậm, mất khoảng 2 tiếng mới thấy tiền về tài khoản.", sentiment: "Neutral" }
    ]
  };

  // 38. KNOWLEDGE MANAGEMENT DATA
  const knowledgeBase = {
    playbooks: [
      { id: "KB-001", title: "Quy trình A/B Test Landing Page & Thư viện Hook", type: "Playbook", owner: "Creative Specialist", views: 124 },
      { id: "KB-002", title: "SOP Hỗ trợ và Ưu đãi dành cho tệp Whale VIP", type: "SOP", owner: "CS Head", views: 98 },
      { id: "KB-003", title: "Framework Tối ưu hóa phễu KYC Onboarding Android", type: "Framework", owner: "Product Manager", views: 245 },
      { id: "KB-004", title: "Best Practices cho các chiến dịch Google Search Ads", type: "Best Practice", owner: "Marketing Lead", views: 156 }
    ]
  };

  // 39. MEU PLANNING ENGINE DATA (ONUS Value Formation model — imported from MEU-Planning-Engine-v2.html)
  const meu = {
 activeDnaTab:'dna-tab-health',
 predInput:{
  pdDep:2000000,
  pdTrade:5,
  pdAsset:'Crypto',
  pdRec:3,
  apDep:200000,
  apTrade:2,
  apViews:4,
  apInact:1,
  wsDep:500000,
  wsTrade:3,
  wsAsset:'Crypto',
  pvDays:3,
  pvDep:2,
  pvTrade:6,
  pvPnl:'win',
  reactN:1000,
  allocBud:200000000,
  fromCh:'',
  toCh:'',
  moveAmt:50000000
 },
 dna:{
  idSources:[{src:'KYC · CCCD / Passport',have:0.45,conf:100},{src:'Self-report profile',have:0.30,conf:80},{src:'SIM / Carrier',have:0.40,conf:90},{src:'Device fingerprint',have:0.95,conf:70},{src:'Meta Audience',have:0.62,conf:60},{src:'Google Signals',have:0.55,conf:50}],
  ageSrc:[{src:'KYC',conf:100},{src:'Self-report',conf:80},{src:'Meta estimate',conf:60},{src:'Google estimate',conf:50}],
  genderConf:95,
  country:[{u:'U-A',kyc:'VN',ip:'SG',pay:'VN',resolved:'VN'},{u:'U-B',kyc:'·',ip:'VN',pay:'VN',resolved:'VN'},{u:'U-C',kyc:'JP',ip:'VN',pay:'JP',resolved:'JP'}],
  countryDist:[{k:'VN',p:.97},{k:'JP / TW / US / KR (kiều bào)',p:.03}],
  deviceTier:[{k:'Premium · iPhone 13+, flagship',p:.30,ltvX:2.4},{k:'Mid · Redmi Note, Galaxy A',p:.45,ltvX:1.0},{k:'Low · entry Android',p:.25,ltvX:0.45}],
  acqFirst:[{k:'Meta',p:.30},{k:'TikTok',p:.28},{k:'SEO / Organic',p:.22},{k:'Referral',p:.12},{k:'Apple Ads',p:.08}],
  acqPath:[{u:'U001',path:'Meta → SEO → Direct',last:'Direct',assist:'Meta · SEO'},{u:'U002',path:'TikTok → Google → Referral → Deposit',last:'Referral',assist:'TikTok · Google'},{u:'U003',path:'Organic → Direct',last:'Direct',assist:'Organic'}],
  intentScore:[{k:'Crypto / BTC',s:80},{k:'Forex',s:10},{k:'Gold / Vàng',s:10}],
  econCap:[{k:'Low · dưới 1tr',p:.45},{k:'Medium · 1-10tr',p:.38},{k:'High · trên 10tr',p:.17}],
  econPay:[{k:'Bank transfer',p:.60},{k:'E-wallet · Momo/ZaloPay',p:.20},{k:'Crypto · P2P',p:.20}],
  tta:[{step:'Signup → Verify (KYC)',med:'18 phút'},{step:'Verify → First Deposit',med:'2,4 giờ'},{step:'Deposit → First Trade',med:'12 phút'}],
  depth:[{k:'Nông · 1-3 màn',p:.40},{k:'Vừa · 4-10 màn',p:.38},{k:'Sâu · 10+ màn',p:.22}],
  assetCur:[{k:'BTC',v:50},{k:'Vàng',v:18},{k:'ETH',v:12},{k:'EUR/USD',v:8},{k:'Khác',v:12}],
  predictive:[{u:'U-A · mới, deposit nhỏ',whale:5,churn:55,ltv:480000},{u:'U-B · deposit khá, trade đều',whale:38,churn:22,ltv:2500000},{u:'U-C · deposit lớn, đa tài sản',whale:92,churn:8,ltv:18000000}]
 },
 age:[{k:'18-24',p:.28},{k:'25-34',p:.42},{k:'35-44',p:.20},{k:'45+',p:.10}],
 gender:[{k:'Nam',p:.72},{k:'Nữ',p:.28}],
 device:[{k:'Android',p:.57},{k:'iOS',p:.43}],
 city:[{k:'HCM',p:.40},{k:'Hà Nội',p:.25},{k:'Đà Nẵng',p:.08},{k:'Khác',p:.27}],
 trade:[{t:0,ltv:0},{t:1,ltv:300000},{t:2,ltv:600000},{t:3,ltv:1200000},{t:4,ltv:1600000},{t:5,ltv:2000000},{t:7,ltv:3200000},{t:10,ltv:4800000},{t:12,ltv:5800000},{t:15,ltv:7000000},{t:20,ltv:10000000}],
 intents:[{k:'Kiếm tiền / Trading',p:.40,ltv:600000},{k:'Đầu tư dài hạn',p:.25,ltv:1200000},{k:'Forex',p:.15,ltv:800000},{k:'Vàng',p:.12,ltv:500000},{k:'Bitcoin',p:.08,ltv:400000}],
 funnelStart:35400,
 trust:[{step:'Install → Registration',drop:.5782,val:300000},{step:'Registration → KYC',drop:.5684,val:900000},{step:'KYC → KYC nâng cao',drop:.481,val:2500000}],
 act:{
  funnel:[{step:'Signup',u:100000},{step:'Email Verify',u:65000},{step:'Phone Verify',u:58000},{step:'KYC',u:34000},{step:'First Deposit',u:18000},{step:'First Trade',u:12000}],
  def:[{rule:'Deposit > 0',rate:18,users:1800,avgDep:450000,avgRev:1200000},{rule:'First Trade',rate:12,users:1200,avgDep:680000,avgRev:2100000},{rule:'Trade × 3',rate:7,users:700,avgDep:1200000,avgRev:4500000}],
  tta:[{seg:'Referral',med:'30 phút',rate:36,act:180},{seg:'Organic',med:'2 giờ',rate:26,act:260},{seg:'Paid Ads',med:'1,8 ngày',rate:12,act:1680}],
  cohort:[{m:'T1',d:[5,12,18,22,25,27]},{m:'T2',d:[7,15,23,28,31,33]},{m:'T3',d:[8,17,25,30,34,36]}],
  aha:[{ev:'View BTC',lift:12,type:'Khám phá',act:22,avgT:'1,2 ngày'},{ev:'Add Watchlist',lift:28,type:'Cam kết',act:41,avgT:'3 giờ'},{ev:'Set Price Alert',lift:35,type:'Ý định',act:53,avgT:'5 giờ'}],
  driver:[{act:'View 1 asset',rate:10},{act:'View 5 assets',rate:25},{act:'View 10 assets',rate:42}],
  byChannel:[{ch:'Meta',signup:10000,act:800},{ch:'Google',signup:4000,act:720},{ch:'SEO',signup:1000,act:260},{ch:'Referral',signup:500,act:180}],
  byIntent:[{k:'Crypto',rate:25},{k:'Forex',rate:15},{k:'Gold',rate:8}],
  byDevice:[{k:'iPhone',rate:28},{k:'Android High-end',rate:22},{k:'Android Low-end',rate:9}],
  byDeposit:[{dep:'50k',rate:32},{dep:'100k',rate:47},{dep:'500k',rate:71},{dep:'1 triệu',rate:83}],
  predictor:[{u:'User A',prob:10,note:'Rủi ro · chưa nạp',cac:250000,cpau:1800000},{u:'User B',prob:52,note:'Cơ hội · xem nhiều',cac:280000,cpau:980000},{u:'User C',prob:88,note:'Referral · sắp activate',cac:120000,cpau:240000}],
  cpau:[{ch:'Meta',cac:250000,cpau:1800000},{ch:'Google',cac:400000,cpau:900000},{ch:'SEO',cac:150000,cpau:300000},{ch:'Referral',cac:120000,cpau:220000}]
 },
 dep:{
  events:[
   {u:'u1',amt:37000,day:0,ch:'Meta',asset:'Crypto',motiv:'thử nghiệm',emo:'stable',wd:'Low',status:'New'},
   {u:'u1',amt:120000,day:2,ch:'Meta',asset:'Crypto',motiv:'thử nghiệm',emo:'FOMO',wd:'Low',status:'Active'},
   {u:'u2',amt:2500000,day:0,ch:'SEO',asset:'Gold',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u3',amt:50000,day:0,ch:'Meta',asset:'Crypto',motiv:'thử nghiệm',emo:'stable',wd:'Low',status:'New'},
   {u:'u3',amt:45000,day:10,ch:'Meta',asset:'Crypto',motiv:'thử nghiệm',emo:'panic',wd:'Low',status:'At-risk'},
   {u:'u4',amt:500000,day:0,ch:'Referral',asset:'Crypto',motiv:'săn lợi nhuận',emo:'FOMO',wd:'Low',status:'Active'},
   {u:'u4',amt:800000,day:3,ch:'Referral',asset:'Crypto',motiv:'săn lợi nhuận',emo:'FOMO',wd:'Low',status:'Active'},
   {u:'u4',amt:1200000,day:8,ch:'Referral',asset:'Gold',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u5',amt:1800000,day:0,ch:'SEO',asset:'Gold',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u5',amt:2200000,day:5,ch:'SEO',asset:'Crypto',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u6',amt:80000,day:0,ch:'Meta',asset:'Crypto',motiv:'săn lợi nhuận',emo:'FOMO',wd:'High',status:'Churned'},
   {u:'u7',amt:200000,day:0,ch:'Organic',asset:'Crypto',motiv:'học thị trường',emo:'stable',wd:'Low',status:'New'},
   {u:'u7',amt:180000,day:42,ch:'Organic',asset:'Crypto',motiv:'học thị trường',emo:'recovery',wd:'Low',status:'Reactivated'},
   {u:'u8',amt:320000,day:0,ch:'Google',asset:'Forex',motiv:'săn lợi nhuận',emo:'stable',wd:'Low',status:'New'},
   {u:'u8',amt:420000,day:1,ch:'Google',asset:'Forex',motiv:'săn lợi nhuận',emo:'FOMO',wd:'Low',status:'Active'},
   {u:'u9',amt:8000000,day:0,ch:'SEO',asset:'Gold',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u9',amt:12000000,day:7,ch:'SEO',asset:'Crypto',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u10',amt:100000,day:0,ch:'Meta',asset:'Crypto',motiv:'thử nghiệm',emo:'stable',wd:'Low',status:'New'},
   {u:'u11',amt:600000,day:0,ch:'Referral',asset:'Gold',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'},
   {u:'u11',amt:900000,day:2,ch:'Referral',asset:'Crypto',motiv:'săn lợi nhuận',emo:'FOMO',wd:'Low',status:'Active'},
   {u:'u11',amt:700000,day:6,ch:'Referral',asset:'Forex',motiv:'học thị trường',emo:'stable',wd:'Low',status:'Active'},
   {u:'u12',amt:43000000,day:0,ch:'Organic',asset:'Crypto',motiv:'đầu tư nghiêm túc',emo:'stable',wd:'Low',status:'Active'}
  ],
  lambda:0.5,cac:180000,
  mult:{fastRepeat:1.4,risingSlope:1.5,diversify:1.3,inactivity:0.8,earlyWd:0.6},
  filt:{dayMax:180,ch:'',asset:''},
  scn:{entryThr:0,frictionUp:0,bonus:0}
 },
 behav:{
  idmap:[{anon:'anon_8f2a',user:'u1',conf:1,src:'login'},{anon:'anon_a915',user:'u2',conf:1,src:'email match'},{anon:'anon_c3d7',user:'u4',conf:0.78,src:'device fingerprint'},{anon:'anon_5e0b',user:'u8',conf:0.82,src:'device fingerprint'},{anon:'anon_71f3',user:'(chưa map)',conf:0.2,src:'IP match'}],
  idsig:[{sig:'login',type:'deterministic',conf:'1.0'},{sig:'email / phone match',type:'deterministic',conf:'1.0'},{sig:'device fingerprint',type:'probabilistic',conf:'0.6-0.9'},{sig:'IP match',type:'weak',conf:'0.1-0.3'}],
  tax:[{layer:'1 · Acquisition',ev:'install · utm_click · referral_signup',src:'MMP (Adjust)',cov:100},{layer:'2 · Intent',ev:'intent_class · landing_view · onboarding_choice',src:'web/app SDK',cov:0},{layer:'3 · Trust',ev:'kyc_start · kyc_complete · kyc_drop',src:'backend',cov:80},{layer:'4 · Monetization',ev:'first_deposit · deposit · withdrawal',src:'backend',cov:60},{layer:'5 · Trading/Value',ev:'first_trade · trade · pnl_event · exposure_change',src:'matching engine',cov:0},{layer:'6 · Engagement',ev:'session · inactivity_gap · push_open',src:'app SDK',cov:55},{layer:'7 · Expansion',ev:'deposit_increase · cross_asset · portfolio_shift',src:'backend',cov:0},{layer:'8 · Reactivation',ev:'reactivated · campaign_trigger · email_click',src:'CRM',cov:40}],
  states:[{s:'Anonymous',d:'chưa định danh'},{s:'Intent detected',d:'tín hiệu mua sớm'},{s:'Signup',d:'đăng ký'},{s:'KYC',d:'xác minh'},{s:'Deposit',d:'nạp đầu'},{s:'Trade',d:'giao dịch'},{s:'Expand asset',d:'đa tài sản'},{s:'Reactivate / Churn',d:'quay lại / rời'}],
  prio:[{p:1,build:'identity_map',unlock:'mở khóa TẤT CẢ (cross-channel · cohort · LTV theo kênh)'},{p:2,build:'pnl_event',unlock:'behavior truth → whale detection'},{p:3,build:'intent_class',unlock:'pre-signup intelligence'},{p:4,build:'cross_asset tracking',unlock:'retention intelligence'},{p:5,build:'reactivation tagging',unlock:'CRM optimization'}]
 },
 depDist:[{a:50000,p:.18},{a:100000,p:.37},{a:200000,p:.20},{a:500000,p:.13},{a:1000000,p:.07},{a:10000000,p:.04},{a:200000000,p:.01}],
 depLTV:[{dep:50000,ltv:300000},{dep:100000,ltv:650000},{dep:500000,ltv:2200000},{dep:1000000,ltv:3500000},{dep:10000000,ltv:18000000}],
 trade:[{t:0,ltv:0},{t:1,ltv:300000},{t:2,ltv:600000},{t:3,ltv:1200000},{t:4,ltv:1600000},{t:5,ltv:2000000},{t:7,ltv:3200000},{t:10,ltv:4800000},{t:12,ltv:5800000},{t:15,ltv:7000000},{t:20,ltv:10000000}],
 firstAsset:[{k:'Crypto',p:.55},{k:'Forex',p:.25},{k:'Gold',p:.15},{k:'Stocks',p:.05}],
 assetMig:[{path:'Crypto → Forex',p:.22},{path:'Crypto → Gold',p:.11},{path:'Forex → Crypto',p:.34}],
 whaleConc:[{k:'Top 1%',rev:.35},{k:'Top 5%',rev:.62},{k:'Top 10%',rev:.78}],
 infx:{
  fail:[{mode:'Silent loss (mất ngầm)',signal:'event không gửi · SDK fail · volume tụt mà health vẫn xanh',risk:'cao nhất · dashboard vẫn trông bình thường'},{mode:'Identity fragmentation',signal:'anon→user mapping lỗi · iOS ATT rơi device_id',risk:'LTV bị chia nhỏ giả tạo'},{mode:'Attribution collapse',signal:'UTM mất · MMP không match click→install · organic inflate',risk:'scale sai kênh'},{mode:'Schema drift',signal:'field đổi tên · event rename · thiếu cột',risk:'metric đúng công thức nhưng sai input'}],
  conf:[{metric:'LTV per-user',w:0.92},{metric:'CAC theo kênh',w:0.86},{metric:'CVR install→KYC NC',w:0.95},{metric:'Retention D30',w:0.7},{metric:'Zalo OA conversion',w:0.62}],
  lineage:[{metric:'ROAS',chain:'ad network → click attribution → Adjust install → deposit_success event → revenue table → dbt aggregate'},{metric:'LTV d30',chain:'user_id → trade/deposit events → cohort table → LTV model d30'},{metric:'CVR install→KYC NC',chain:'Adjust install → kyc_nc event (backend) → weekly aggregate'}]
 },
 dc:{
  causal:[{change:'T1/26 CVR install→KYC NC rơi 3,6%',tag:'Measurement artifact',note:'burst install rác + traffic dilution, KHÔNG phải performance giảm'},{change:'Moloco LTV/CAC biên giảm theo scale',tag:'Structural',note:'channel saturation · audience exhaustion'},{change:'Apple Ads ROAS cao ổn định',tag:'Demand-driven',note:'iOS premium intent thật'},{change:'TikTok install vọt khi tăng budget',tag:'Supply-driven',note:'scale campaign, chưa chắc chất lượng'}],
  log:[{dec:'Tăng TikTok +20% budget',day:'14N trước',dCac:11,dLtv:-4,dRet:-2,verdict:'over-scale point'},{dec:'Giữ Organic + đẩy SEO',day:'30N trước',dCac:-6,dLtv:3,dRet:2,verdict:'đúng · giữ'},{dec:'Test Spotify branding',day:'21N trước',dCac:2,dLtv:8,dRet:1,verdict:'tín hiệu tốt · scale nhỏ'}],
  marginal:[{seg:'User 1-1.000',ltv:10},{seg:'1.000-5.000',ltv:3},{seg:'5.000-15.000',ltv:1.4},{seg:'15.000+',ltv:0.8}]
 },
 exp:[{ch:'Apple Ads',hist:[39,38,40,37],lag:4,shape:'Smooth → late saturation',behav:25,cap:60,risk:15,cannib:8},{ch:'TikTok',hist:[12,7,4,3],lag:14,shape:'Early flat → late spike',behav:60,cap:25,risk:15,cannib:35},{ch:'Moloco',hist:[8,6,4,2],lag:21,shape:'Fast saturation (lagging)',behav:30,cap:30,risk:40,cannib:18},{ch:'MAP (Aleph)',hist:[20,19,21,20],lag:7,shape:'Stable mid',behav:35,cap:45,risk:20,cannib:12},{ch:'Organic',hist:[26,25,27,26],lag:0,shape:'Unconstrained · benchmark',behav:40,cap:40,risk:20,cannib:0}],
 lab:{
  temporal:[{win:'D0-D3',share:70},{win:'D4-D30',share:22},{win:'D30+',share:8}],
  mixture:[{pop:'Fast whales',pct:6,ltv:18000000,trait:'high early velocity · multi-asset'},{pop:'Slow accumulators',pct:34,ltv:1800000,trait:'stable long tail · 1-2 asset'},{pop:'Dead cohort',pct:60,ltv:120000,trait:'1 deposit rồi im · noise'}],
  trans:[{from:'Potential',to:'Champion',rate:12},{from:'Loyal',to:'At-risk',rate:18},{from:'At-risk',to:'Lost',rate:55},{from:'At-risk',to:'Champion',rate:8}],
  churn:[{type:'Hard churn',share:35,react:5,cause:'trust / loss / failure'},{type:'Soft churn',share:65,react:42,cause:'dormant · có thể quay lại'}],
  regime:[{behav:'High trade frequency',bull:'Whale',crash:'Churn risk'},{behav:'Large deposit',bull:'Confident scale',crash:'Panic withdraw'},{behav:'Multi-asset jump',bull:'Sophistication',crash:'Loss chasing'}],
  counter:[{q:'Không chạy campaign này → ?',method:'Holdout 5-15% không nhận',out:'lift treated vs holdout'},{q:'Không RM call → user có thành whale?',method:'Holdout whale-candidate',out:'incrementality RM'},{q:'Giảm spend 20% → LTV giảm thật bao nhiêu?',method:'Geo/time split test',out:'elasticity thật'}]
 },
 rm:{tiers:[{lo:0,hi:30,zone:'Tier 1 · Cold-Warm',action:'No RM · chỉ automated nudge',sla:'-'},{lo:30,hi:60,zone:'Tier 2 · Hot',action:'Soft CRM message',sla:'24h'},{lo:60,hi:80,zone:'Tier 3 · Candidate',action:'RM prep list',sla:'4h'},{lo:80,hi:101,zone:'Tier 4 · Whale',action:'RM call BẮT BUỘC',sla:'< 1h SLA'}],flags:[{flag:'bot_flag',mean:'pattern nghi bot / scripted'},{flag:'arbitrage_flag',mean:'arbitrage trader, không sticky'},{flag:'high_cap_low_activity',mean:'vốn lớn nhưng ít hoạt động'}]},
 whaleDep:[{dep:50000,rate:0},{dep:75000,rate:.005},{dep:100000,rate:.01},{dep:200000,rate:.02},{dep:300000,rate:.03},{dep:500000,rate:.04},{dep:750000,rate:.06},{dep:1000000,rate:.09},{dep:2000000,rate:.15},{dep:5000000,rate:.25},{dep:10000000,rate:.40}],
 firstAssetNote:'',
 retDays:[0,1,3,7,14,30,60,90,180],
 retCohorts:[{name:'Crypto · TikTok · 100k',surv:[1,.55,.40,.29,.22,.15,.10,.07,.04]},{name:'Vàng · ASA · 500k',surv:[1,.65,.52,.43,.36,.30,.24,.20,.15]},{name:'Vàng · Moloco · 1tr',surv:[1,.75,.64,.55,.49,.43,.38,.34,.29]}],
 revCurve:[{d:0,rev:100000},{d:7,rev:180000},{d:30,rev:450000},{d:90,rev:1200000},{d:180,rev:2100000}],
 channels:[{name:'Apple Search (ASA)',cac:76338,ltv:1499093,cap:45000,cur:17240,n:17240},{name:'TikTok',cac:27684,ltv:211429,cap:200000,cur:145298,n:145298},{name:'Moloco',cac:55038,ltv:439613,cap:60000,cur:45544,n:45544},{name:'Facebook',cac:55833,ltv:178957,cap:12000,cur:3264,n:3264},{name:'Unity Ads',cac:25011,ltv:29697,cap:8000,cur:3815,n:3815},{name:'Twitter',cac:340190,ltv:411499,cap:2000,cur:35,n:35},{name:'MAP (Aleph)',cac:18934,ltv:380000,cap:50000,cur:24000,n:24000},{name:'Spotify (branding)',cac:54000,ltv:520000,cap:8000,cur:2200,n:2200},{name:'Organic',cac:0,ltv:384912,cap:1200000,cur:1021546,n:1021546,free:1}],
 chInteract:[{a:'TikTok',b:'Moloco',kind:'cannibal',str:.15,note:'Cùng programmatic UA, tệp trùng một phần'},{a:'Organic',b:'ASA',kind:'synergy',str:.25,note:'Brand search tăng → ASA branded keyword rẻ + chất hơn'},{a:'Organic',b:'TikTok',kind:'synergy',str:.2,note:'Content vàng/crypto tạo nhận biết → TikTok convert rẻ hơn'},{a:'TikTok',b:'ASA',kind:'synergy',str:.1,note:'TikTok awareness iOS → đẩy branded search ASA'},{a:'Moloco',b:'Unity Ads',kind:'cannibal',str:.1,note:'Cùng ad-network inventory, đấu giá chồng'}],
 assetWeight:{Crypto:1.3,Forex:1.0,Gold:0.8,Stocks:0.9},
 watchlist:[{id:'u_1042',dep:200000000,trades:8,asset:'Crypto'},{id:'u_2087',dep:1000000,trades:5,asset:'Forex'},{id:'u_4419',dep:500000,trades:3,asset:'Crypto'},{id:'u_3361',dep:100000,trades:1,asset:'Gold'},{id:'u_5530',dep:50000,trades:0,asset:'Stocks'}],
 react:[{ch:'Push notification',cost:200,rate:.04,retVal:400000},{ch:'Zalo ZNS',cost:900,rate:.07,retVal:600000},{ch:'SMS',cost:800,rate:.05,retVal:500000},{ch:'Email',cost:500,rate:.03,retVal:500000},{ch:'Telesale',cost:15000,rate:.18,retVal:1200000},{ch:'Retargeting ads',cost:12000,rate:.03,retVal:350000}],
 minN:200,
 touchpoints:[
  {st:'Acquisition',tp:'Click quảng cáo / cài app',ev:'install + utm_source/campaign',tool:'MMP: AppsFlyer / Adjust',how:'auto',have:1},
  {st:'Acquisition',tp:'Link giới thiệu',ev:'referral_signup + ref_code',tool:'Log backend (bảng referral)',how:'setup',have:1},
  {st:'Intent',tp:'Landing / quiz onboarding',ev:'intent_class (problem/solution/curious)',tool:'GA4 / Firebase + field tự định nghĩa',how:'setup',have:0},
  {st:'Trust',tp:'KYC bắt đầu/xong/bỏ',ev:'kyc_start / complete / abandon + time',tool:'Log backend + Amplitude',how:'setup',have:0},
  {st:'First Deposit',tp:'Nạp lần đầu',ev:'first_deposit + amount',tool:'Log backend',how:'auto',have:1},
  {st:'First Trade',tp:'Lệnh đầu tiên',ev:'first_trade, trade (mỗi lệnh)',tool:'Log backend',how:'auto',have:1},
  {st:'Value',tp:'Lãi/lỗ + hành vi sau',ev:'pnl_event + magnitude + deposit/withdraw sau',tool:'Log backend (phải build)',how:'manual',have:0},
  {st:'Habit',tp:'Tần suất dùng',ev:'session, DAU/WAU, inactivity_gap',tool:'Firebase / Amplitude',how:'auto',have:1},
  {st:'Expansion',tp:'Tăng nạp / cross-asset',ev:'deposit_increase, cross_asset',tool:'Log backend',how:'setup',have:0},
  {st:'Reactivation',tp:'Mở lại từ push/email',ev:'push_open, reactivate + lý do',tool:'MMP + ESP (Insider/CleverTap/MoEngage)',how:'setup',have:0},
  {st:'Cross-channel',tp:'Gộp đa kênh theo userID',ev:'identity_map (anon_id ↔ user_id)',tool:'CDP: Segment / RudderStack (hoặc tự xây)',how:'manual',have:0}
 ],
 plan:[{ch:'TikTok',planU:12100,actU:7872,planCAC:24916,actCAC:27684},{ch:'ASA',planU:14160,actU:6403,planCAC:68704,actCAC:76338},{ch:'Moloco',planU:8900,actU:8544,planCAC:49534,actCAC:55038}],
 weeks:[{w:'28/04-04/05',budget:410400000,install:7728,kycnc:819,deposit:6480,rev:14904000000},{w:'05-11/05',budget:427500000,install:8400,kycnc:890,deposit:6720,rev:15523200000},{w:'12-18/05',budget:444600000,install:8736,kycnc:926,deposit:6950,rev:16193500000},{w:'19-25/05',budget:427500000,install:8736,kycnc:927,deposit:7180,rev:16873000000},{w:'26/05-01/06',budget:427200000,install:8496,kycnc:935,deposit:7050,rev:16638000000},{w:'02-08/06',budget:445000000,install:8850,kycnc:974,deposit:7320,rev:17421600000},{w:'09-15/06',budget:445000000,install:8850,kycnc:974,deposit:7560,rev:18144000000},{w:'16-22/06',budget:462800000,install:9204,kycnc:1011,deposit:7840,rev:19051200000}],
 months:[{m:'T7/25',spend:340568905,install:16384,kycnc:1680},{m:'T8/25',spend:795979478,install:26641,kycnc:3386},{m:'T9/25',spend:1521095626,install:44009,kycnc:5102},{m:'T10/25',spend:2036460300,install:39648,kycnc:6322},{m:'T11/25',spend:1338868124,install:24152,kycnc:5462},{m:'T12/25',spend:1603482467,install:23630,kycnc:5214},{m:'T1/26',spend:1490816856,install:87044,kycnc:3150},{m:'T2/26',spend:1539281923,install:28826,kycnc:2723},{m:'T3/26',spend:1560000000,install:30100,kycnc:2950},{m:'T4/26',spend:1635000000,install:31800,kycnc:3244},{m:'T5/26',spend:1710000000,install:33600,kycnc:3562},{m:'T6/26',spend:1780000000,install:35400,kycnc:3894}],
 lifecycle:[{st:'Anonymous',u:2000000,rev:0},{st:'Lead/Identified',u:760000,rev:0},{st:'Registered',u:380000,rev:0},{st:'Verified (KYC)',u:171000,rev:0},{st:'Activated (KYC NC)',u:89000,rev:0},{st:'First Deposit',u:76000,rev:0},{st:'Engaged',u:52000,rev:0},{st:'Power User',u:17000,rev:0},{st:'VIP (whale)',u:3800,rev:0},{st:'At-Risk',u:24000,rev:0},{st:'Dormant',u:68000,rev:0},{st:'Reactivated',u:12000,rev:0},{st:'Churned',u:41000,rev:0}],
 content:{
  campaigns:[
   {name:'BTC Bull Run',status:'running',idea:'FOMO',spend:420000000,signup:12400,activated:3820,revenue:9200000000},
   {name:'New User Bonus',status:'running',idea:'Promotion',spend:280000000,signup:9600,activated:2910,revenue:4100000000},
   {name:'DCA Education',status:'running',idea:'Education',spend:185000000,signup:5200,activated:2140,revenue:3850000000},
   {name:'Case Study · User thật',status:'running',idea:'Social Proof',spend:160000000,signup:4300,activated:1880,revenue:4200000000},
   {name:'Altseason FOMO',status:'paused',idea:'FOMO',spend:320000000,signup:8800,activated:1920,revenue:2600000000},
   {name:'Meme Coin Awareness',status:'paused',idea:'FOMO',spend:150000000,signup:6100,activated:720,revenue:480000000}
  ],
  ideas:[
   {name:'Education',desc:'DCA · quản lý vốn · phân tích kỹ thuật',spend:345000000,activated:5180,revenue:9650000000},
   {name:'FOMO',desc:'Bitcoin tăng giá · altseason · bullrun',spend:560000000,activated:4260,revenue:7180000000},
   {name:'Social Proof',desc:'Case study · user success',spend:230000000,activated:2640,revenue:5220000000},
   {name:'Promotion',desc:'Bonus · cashback · ưu đãi nạp',spend:295000000,activated:2310,revenue:3920000000}
  ],
  formats:[
   {fmt:'Video',count:24,spend:520000000,activated:8240,revenue:14200000000,ctr:0.032},
   {fmt:'Image',count:38,spend:680000000,activated:4120,revenue:8350000000,ctr:0.018},
   {fmt:'Carousel',count:11,spend:230000000,activated:2030,revenue:3420000000,ctr:0.024}
  ],
  creatives:[
   {id:'CR-101',camp:'BTC Bull Run',idea:'FOMO',fmt:'Video',hook:'Bitcoin sắp ATH',persona:'Trader',stage:'Winning',impr:480000,ctr:0.041,signup:2100,activated:910,revenue:3100000000,freq:2.1},
   {id:'CR-088',camp:'DCA Education',idea:'Education',fmt:'Video',hook:'95% trader mắc sai lầm này',persona:'Newbie',stage:'Winning',impr:360000,ctr:0.038,signup:1680,activated:840,revenue:1950000000,freq:1.8},
   {id:'CR-095',camp:'Case Study · User thật',idea:'Social Proof',fmt:'Video',hook:'Câu chuyện anh Minh x3 vốn',persona:'Investor',stage:'Winning',impr:300000,ctr:0.035,signup:1240,activated:680,revenue:2400000000,freq:1.6},
   {id:'CR-072',camp:'New User Bonus',idea:'Promotion',fmt:'Image',hook:'Nhận thưởng ngay 100k',persona:'Newbie',stage:'Learning',impr:520000,ctr:0.019,signup:1450,activated:520,revenue:680000000,freq:1.2},
   {id:'CR-060',camp:'DCA Education',idea:'Education',fmt:'Carousel',hook:'5 bước quản lý vốn',persona:'Trader',stage:'Winning',impr:240000,ctr:0.027,signup:820,activated:410,revenue:1250000000,freq:1.4},
   {id:'CR-044',camp:'Altseason FOMO',idea:'FOMO',fmt:'Image',hook:'Altseason đã bắt đầu',persona:'Trader',stage:'Fatigue',impr:610000,ctr:0.012,signup:980,activated:240,revenue:520000000,freq:4.2},
   {id:'CR-031',camp:'Meme Coin Awareness',idea:'FOMO',fmt:'Image',hook:'Meme coin x100',persona:'Newbie',stage:'Retire',impr:540000,ctr:0.009,signup:610,activated:90,revenue:120000000,freq:5.1},
   {id:'CR-118',camp:'BTC Bull Run',idea:'FOMO',fmt:'Carousel',hook:'3 lý do BTC còn tăng',persona:'Investor',stage:'Learning',impr:180000,ctr:0.023,signup:520,activated:260,revenue:890000000,freq:1.1}
  ],
  hooks:[
   {hook:'95% trader mắc sai lầm này',cat:'Curiosity',ch:'TikTok',reach:420000,tsr:0.34,ctr:0.038,cta:0.052,activated:840,cpa:92000,revenue:1950000000},
   {hook:'Câu chuyện anh Minh x3 vốn',cat:'Social Proof',ch:'Facebook',reach:388000,tsr:0.31,ctr:0.035,cta:0.048,activated:680,cpa:110000,revenue:2400000000},
   {hook:'Bitcoin sắp ATH',cat:'Greed',ch:'YouTube',reach:455000,tsr:0.42,ctr:0.041,cta:0.061,activated:910,cpa:78000,revenue:3100000000},
   {hook:'Nhận thưởng ngay 100k',cat:'Urgency',ch:'Facebook',reach:274000,tsr:0.22,ctr:0.019,cta:0.033,activated:520,cpa:145000,revenue:680000000},
   {hook:'Bạn đang mất tiền vì điều này',cat:'Fear',ch:'TikTok',reach:296000,tsr:0.28,ctr:0.029,cta:0.039,activated:430,cpa:128000,revenue:1100000000},
   {hook:'5 bước quản lý vốn',cat:'Education',ch:'YouTube',reach:312000,tsr:0.30,ctr:0.027,cta:0.041,activated:410,cpa:118000,revenue:1250000000}
  ],
  personas:[
   {name:'Newbie',spend:430000000,activated:4180,revenue:5200000000},
   {name:'Trader',spend:480000000,activated:3560,revenue:9100000000},
   {name:'Investor',spend:320000000,activated:2240,revenue:8400000000},
   {name:'Whale',spend:140000000,activated:410,revenue:6800000000}
  ],
  matrix:[
   {persona:'Newbie',best:'Education',note:'DCA · cơ bản · ít rủi ro'},
   {persona:'Trader',best:'Market Signal',note:'tín hiệu · phân tích kỹ thuật'},
   {persona:'Investor',best:'Macro Analysis',note:'vĩ mô · dài hạn · case study'},
   {persona:'Whale',best:'1:1 / VIP',note:'RM · ưu đãi riêng · sản phẩm cao cấp'}
  ],
  backlog:[
   {idea:'Series Video Education "DCA 30 ngày"',status:'Đang làm',owner:'Content',eta:'T7/26'},
   {idea:'Case study 3 user Investor mới',status:'Kế hoạch',owner:'Content',eta:'T7/26'},
   {idea:'Hook Social Proof cho Trader',status:'Kế hoạch',owner:'Creative',eta:'T8/26'},
   {idea:'Video Deposit-stage (giảm rớt)',status:'Backlog',owner:'Growth',eta:'T8/26'},
   {idea:'Carousel "5 sai lầm Newbie"',status:'Backlog',owner:'Content',eta:'-'}
  ]
 },
 exec:{totUser:380000,active:72800,dormant:68000,churned:41000,newRev:62000000000,reactRev:9000000000,retainRev:35000000000,lostRev:16000000000},
 revSrc:[{src:'New users',rev:62000000000},{src:'Existing/Retained',rev:35000000000},{src:'Reactivated',rev:9000000000},{src:'VIP (top 1%)',rev:40000000000},{src:'Referral',rev:11000000000}],
 rfm:{r:['0-7 ngày','8-30 ngày','31-90 ngày','>90 ngày'],f:['1 lần','2-3 lần','4-10 lần','>10 lần'],m:[[1200,3400,2100,820],[900,2800,1900,610],[600,1400,900,300],[1800,1200,500,150]]},
 rfmSeg:[{seg:'Champions',def:'Gần · nhiều · giá trị cao',camp:'VIP care, early access, giữ bằng mọi giá'},{seg:'Loyal',def:'Mua đều, giá trị khá',camp:'Upsell + referral'},{seg:'Potential',def:'Gần đây, chưa nhiều lần',camp:'Onboarding sâu, nudge tần suất trade'},{seg:'At-Risk',def:'Từng giá trị cao, lâu chưa quay lại',camp:'Win-back ưu tiên (giá trị lớn)'},{seg:'Hibernating',def:'Lâu + ít + giá trị thấp',camp:'Reactivation rẻ (push) hoặc thả'},{seg:'Lost',def:'Rất lâu, gần như churn',camp:'Last-touch hoặc loại khỏi target'}],
 sim:{cacAdj:0,convAdj:0,churnAdj:0,retAdj:0,extraBudget:0},
 scope:'all',cmpBasis:'prior',segFocus:-1,drillCh:'',
 infra:{
  sources:[{name:'Adjust MMP',ev:'2,1M/ngày',health:99.2,st:'ok'},{name:'GA4 / Firebase',ev:'8,4M/ngày',health:98.7,st:'ok'},{name:'Server events (BE)',ev:'3,2M/ngày',health:99.6,st:'ok'},{name:'Search Console',ev:'cập nhật T-2',health:92.0,st:'warn'},{name:'Zalo OA webhook',ev:'trễ ~15ph',health:88.5,st:'warn'},{name:'CRM / RM log',ev:'nhập tay',health:95.0,st:'ok'}],
  events:[{ev:'app_open',vol:'8,4M',err:0.2},{ev:'kyc_submit',vol:'171k',err:1.1},{ev:'kyc_success',vol:'89k',err:0.3},{ev:'deposit_success',vol:'76k',err:0.4},{ev:'trade_executed',vol:'1,2M',err:0.3},{ev:'withdraw',vol:'58k',err:0.6}],
  quality:[{dim:'Completeness · đủ field',score:96},{dim:'Uniqueness · không trùng',score:99},{dim:'Timeliness · kịp thời',score:91},{dim:'Validity · đúng schema',score:97},{dim:'Consistency · nhất quán nguồn',score:90}],
  identity:{det:0.78,prob:0.14,anon:0.08},attr:{matched:0.86,organic:0.11,self:0.03},
  missing:[{field:'utm_source (Organic)',rate:0.11,impact:'Attribution kênh'},{field:'device_id (iOS ATT)',rate:0.23,impact:'Identity match'},{field:'deposit_method',rate:0.04,impact:'Payment funnel'},{field:'age/gender (chưa khai)',rate:0.31,impact:'Demographics'}]
 },
 alerts:[{key:'roas',op:'<',thr:2500,chan:'Slack #growth'},{key:'cvr',op:'<',thr:5,chan:'Telegram ops'},{key:'mcvr',op:'<',thr:5,chan:'Email PM'},{key:'wtop1',op:'>',thr:40,chan:'Zalo RM'},{key:'ltvcac',op:'<',thr:3,chan:'Slack #growth'}],
 compare:[{key:'roas',m:'ROAS',bench:3000,tgt:3500,unit:'%',hi:1},{key:'cvr',m:'CVR install→KYC NC',bench:10,tgt:12,unit:'%',hi:1},{key:'dep',m:'Deposit / tuần',bench:5000,tgt:7000,unit:'',hi:1},{key:'ltvcac',m:'LTV/CAC blended',bench:3,tgt:5,unit:'x',hi:1},{key:'ret',m:'Retention D30',bench:20,tgt:25,unit:'%',hi:1}],
 ltvBox:[{seg:'Entry (50-100k)',min:100000,q1:200000,med:300000,q3:450000,max:800000},{seg:'Core (100-500k)',min:400000,q1:900000,med:1500000,q3:2400000,max:4000000},{seg:'Growth (500k-1tr)',min:1500000,q1:2200000,med:3000000,q3:4500000,max:7000000},{seg:'High/Whale (>1tr)',min:3000000,q1:8000000,med:18000000,q3:45000000,max:120000000}],
 events:[
  {ev:'Tết Nguyên đán',when:'T1-T2',impact:'Giá CPI/CPA và KYC NC tăng mạnh trong Tết (CVR tụt), spend đắt',camp:'Hạ budget trong Tết, dồn lại sau Tết khi CPA giảm',metric:'CPI · Cost/KYC NC · CVR install→KYC NC'},
  {ev:'Giá vàng biến động',when:'bất kỳ',impact:'Organic search "giá vàng 9999" tăng vọt (4,9tr click/tháng) kéo traffic OT',camp:'Đẩy nội dung giá vàng theo sóng, bắt intent vàng → onboard sang đa tài sản',metric:'organic click vàng · vị trí SEO · CVR vàng→deposit'},
  {ev:'Hạ budget VN 40-50k$/tháng',when:'T3 trở đi',impact:'Theo định hướng sếp, giữ TikTok/Moloco/ASA, dừng Aleph',camp:'Tối ưu CVR thay vì tăng spend, tăng ấn phẩm inhouse',metric:'CPA deposit · ROAS theo kênh'},
  {ev:'CVR Android tụt (3,52% KYC NC)',when:'T2',impact:'Android convert kém hơn iOS 5 lần, rev iOS gấp 10 lần',camp:'Dồn ngân sách iOS, sửa luồng KYC Android',metric:'CVR install→KYC NC theo HĐH'},
  {ev:'Đối thủ khuyến mãi lớn',when:'bất kỳ',impact:'CAC tăng, kéo user nhạy giá',camp:'Không đua giá, nhấn giá trị + giữ kênh ROAS cao',metric:'CAC biên · ROAS theo kênh'}
 ],
 scen:[{k:'Xấu nhất',conv:0.75,cac:1.2,ret:0.8,trig:'conversion giảm >15% HOẶC CAC biên tăng >20%'},{k:'Ổn định',conv:1.0,cac:1.0,ret:1.0,trig:'các chỉ số quanh kế hoạch ±10%'},{k:'Tốt nhất',conv:1.2,cac:0.9,ret:1.15,trig:'retention D30 tăng >10% VÀ CAC biên giảm'}],
 shock:[{ev:'Bull market (crypto surge)',cvr:'↑',dep:'↑',cac:'↑ nhẹ',resp:'Scale budget · bắt sóng nạp · pre-load creative'},{ev:'Market crash',cvr:'↓',dep:'↓',cac:'↑',resp:'Giảm risk exposure · giữ chân · nội dung trấn an'},{ev:'Regulation shock',cvr:'↓',dep:'↓',cac:'→',resp:'Pause acquire · minh bạch pháp lý · trấn an'},{ev:'Competition spike',cvr:'→',dep:'→',cac:'↑',resp:'Shift messaging · giữ CAC trần · nhấn khác biệt'},{ev:'Seasonal (Tết/holiday)',cvr:'↑',dep:'↑',cac:'↑',resp:'Pre-load creative · tăng budget có trần'}],
 seg:[{k:'Trading',ltv:600000},{k:'Đầu tư dài hạn',ltv:1500000},{k:'Đầu cơ',ltv:900000},{k:'Tò mò',ltv:150000}],
 icx:[{ch:'Meta',w:[0.45,0.10,0.30,0.15]},{ch:'Google',w:[0.30,0.40,0.20,0.10]},{ch:'SEO',w:[0.20,0.55,0.15,0.10]},{ch:'Referral',w:[0.25,0.50,0.20,0.05]}],
 assets4:['Crypto','Forex','Gold','Stocks'],
 assetT:[[0.70,0.15,0.10,0.05],[0.20,0.65,0.10,0.05],[0.10,0.10,0.75,0.05],[0.15,0.15,0.10,0.60]],
 geo:[{c:'Việt Nam',lat:14,lon:108,clicks:4932422},{c:'Nhật Bản',lat:36,lon:138,clicks:54779},{c:'Đài Loan',lat:23.5,lon:121,clicks:29838},{c:'Hoa Kỳ',lat:38,lon:-97,clicks:27921},{c:'Hàn Quốc',lat:36,lon:127.5,clicks:27049}],
 sigCats:['Acquisition','Engagement','Product Interest','Cart & Checkout','Purchase (RFM)','Lifecycle','Feature Usage','Content','Retention','Communication','Support','Revenue','Intent Signals','Predictive (AI)'],
 triggers:[
  {cat:'Price',ev:'price_breakout_signal',layer:'Market',desc:'Giá vượt ATH / break kháng cự / +20-50% nhanh',camp:'Push "đang chạy" + mở app nhanh, nội dung bắt sóng',have:0},
  {cat:'Price',ev:'price_dip_signal',layer:'Market',desc:'Giảm 10-30% / retest support, đỏ chưa panic',camp:'Push "mua rẻ" + nhắc DCA',have:0},
  {cat:'Price',ev:'reversal_signal',layer:'Market',desc:'RSI quá bán / nến đảo chiều / bounce từ support',camp:'Cảnh báo "đáy?" cho nhóm theo dõi coin đó',have:0},
  {cat:'News',ev:'listing_event',layer:'Market',desc:'Sàn lớn listing / thêm cặp giao dịch',camp:'Push tin listing → mở giao dịch sớm (thanh khoản + FOMO)',have:0},
  {cat:'News',ev:'macro_news_event',layer:'Market',desc:'Fed rate / ETF approval / luật crypto mới',camp:'Newsletter + nội dung giải thích tác động',have:0},
  {cat:'Social',ev:'social_volume_spike',layer:'Social',desc:'Coin viral X/Telegram, narrative hot (AI/meme/RWA)',camp:'Bắt narrative → nội dung + đẩy cặp giao dịch liên quan',have:0},
  {cat:'Social',ev:'influencer_shill_event',layer:'Social',desc:'KOL tweet / YouTuber shill / viral thread',camp:'Hợp tác KOC + retarget người đã xem',have:0},
  {cat:'Liquidity',ev:'liquidity_inflow_event',layer:'Liquidity',desc:'Vừa nhận lương / chốt lời coin khác / rút tài sản khác',camp:'Push đúng lúc có tiền rảnh (đầu tháng / sau chốt lời)',have:0},
  {cat:'Liquidity',ev:'deposit_ready_state',layer:'Liquidity',desc:'Hành vi báo sắp nạp (xem ví, check giá nhiều lần)',camp:'Mồi nạp + giảm friction ngay',have:0},
  {cat:'Emotion',ev:'fear_of_missing_out_signal',layer:'Emotion',desc:'Coin đã tăng mạnh mà user chưa vào → sợ bỏ lỡ',camp:'Nhắc nhẹ cơ hội còn dư địa (không bán sợ quá đà)',have:0},
  {cat:'Product',ev:'incentive_trigger',layer:'Product',desc:'Bonus nạp / giảm phí / referral reward',camp:'Campaign incentive đúng segment',have:1},
  {cat:'Product',ev:'gamification_trigger',layer:'Product',desc:'Leaderboard / airdrop eligibility / nhiệm vụ trade',camp:'Quest "trade để nhận thưởng"',have:0}
 ],
 signals:[
  {cat:'Acquisition',sig:'Đến từ TikTok chưa nạp',trig:'first_touch=TikTok & no first_deposit 7d',camp:'Remarketing ưu đãi nạp đầu',chan:'Ads/Push',pri:'TB',ev:'first_touch, first_deposit',ready:1},
  {cat:'Acquisition',sig:'Khách từ KOL cụ thể',trig:'referral_source = KOL_x',camp:'Ưu đãi riêng theo KOL',chan:'Email/Zalo',pri:'TB',ev:'referral_source',ready:0},
  {cat:'Acquisition',sig:'Organic search từ khóa mua',trig:'medium=organic & keyword intent cao',camp:'Landing chuyên sâu + bằng chứng tin cậy',chan:'SEO/Email',pri:'Cao',ev:'utm, keyword',ready:0},
  {cat:'Engagement',sig:'Xem >80% video hướng dẫn trade',trig:'video_progress ≥ 0,8',camp:'Mời onboarding / khóa trade nâng cao',chan:'Push/Email',pri:'Cao',ev:'video_progress',ready:0},
  {cat:'Engagement',sig:'Bounce ngay trang chủ',trig:'session < 10s & 1 page',camp:'Retarget nội dung lợi ích rõ',chan:'Ads',pri:'Thấp',ev:'session',ready:1},
  {cat:'Product Interest',sig:'Xem 1 asset >3 lần / 7 ngày',trig:'asset_view ≥ 3 / 7d',camp:'"Bạn đang cân nhắc [asset]?" + dữ liệu',chan:'Push',pri:'Cao',ev:'asset_view',ready:0},
  {cat:'Product Interest',sig:'Dùng filter / so sánh asset',trig:'filter_use hoặc compare',camp:'Gợi ý asset theo khẩu vị rủi ro',chan:'In-app',pri:'TB',ev:'filter_event',ready:0},
  {cat:'Cart & Checkout',sig:'Bắt đầu nạp chưa xong 24h',trig:'begin_deposit & !complete 24h',camp:'Email + SMS nhắc hoàn tất nạp',chan:'Email/SMS',pri:'Cao',ev:'begin_deposit, first_deposit',ready:1},
  {cat:'Cart & Checkout',sig:'Nạp thất bại',trig:'payment_failure',camp:'Hỗ trợ + gợi ý phương thức khác',chan:'Push/CSKH',pri:'Cao',ev:'payment_failure',ready:1},
  {cat:'Purchase (RFM)',sig:'90 ngày chưa nạp / trade',trig:'recency > 90d',camp:'Win-back ưu đãi',chan:'Email/Zalo',pri:'Cao',ev:'last_deposit',ready:1},
  {cat:'Purchase (RFM)',sig:'Tần suất + giá trị cao',trig:'frequency & monetary cao',camp:'Chăm VIP, ưu đãi phí',chan:'RM/Telesale',pri:'Cao',ev:'trade, volume',ready:1},
  {cat:'Lifecycle',sig:'At Risk (hoạt động giảm)',trig:'activity ↓ vs baseline',camp:'Giữ chân: nội dung + ưu đãi',chan:'Push/Email',pri:'Cao',ev:'session, trade_freq',ready:0},
  {cat:'Lifecycle',sig:'New (vừa đăng ký)',trig:'signup < 7d & no deposit',camp:'Onboarding tới first deposit',chan:'Push/Email',pri:'Cao',ev:'signup, first_deposit',ready:1},
  {cat:'Feature Usage',sig:'Dùng spot, chưa dùng copy-trade',trig:'used_A & !used_B',camp:'Hướng dẫn copy-trade',chan:'In-app/Push',pri:'TB',ev:'feature_open',ready:0},
  {cat:'Content',sig:'Đọc nhiều chủ đề Phân tích / Growth',trig:'topic=growth ≥ 3',camp:'Newsletter chuyên đề',chan:'Email',pri:'TB',ev:'content_topic',ready:0},
  {cat:'Retention',sig:'7 ngày không login',trig:'days_since_active ≥ 7',camp:'Re-engagement (biến động giá)',chan:'Push',pri:'Cao',ev:'last_active',ready:1},
  {cat:'Retention',sig:'Stickiness thấp',trig:'DAU/MAU < 0,1',camp:'Nudge thói quen + mục tiêu',chan:'Push',pri:'TB',ev:'DAU/MAU',ready:1},
  {cat:'Communication',sig:'Không mở email 3 lần',trig:'email_open = 0 x3',camp:'Chuyển kênh sang Push / SMS',chan:'Push/SMS',pri:'TB',ev:'email_open',ready:1},
  {cat:'Support',sig:'NPS ≥ 9 (promoter)',trig:'nps ≥ 9',camp:'Referral campaign',chan:'Email/In-app',pri:'Cao',ev:'nps',ready:0},
  {cat:'Support',sig:'Khiếu nại / ticket gắt',trig:'complaint_score cao',camp:'CSKH ưu tiên + xoa dịu',chan:'CSKH',pri:'Cao',ev:'ticket',ready:1},
  {cat:'Revenue',sig:'Sắp đạt hạng phí cao hơn',trig:'volume gần ngưỡng tier',camp:'Upsell hạng / VIP',chan:'RM',pri:'Cao',ev:'volume, tier',ready:0},
  {cat:'Intent Signals',sig:'Vào trang phí / bảng giá nhiều lần',trig:'pricing_view ≥ 3',camp:'Tư vấn 1-1 / ưu đãi đúng lúc',chan:'Sales/Push',pri:'Cao',ev:'pricing_view',ready:0},
  {cat:'Intent Signals',sig:'Tải tài liệu / xem demo nhiều',trig:'download hoặc demo_view ≥ 2',camp:'Đẩy thành SQL, sales follow',chan:'Sales',pri:'Cao',ev:'download, demo_view',ready:0},
  {cat:'Predictive (AI)',sig:'Purchase probability > 85%',trig:'p_buy > 0,85 (model)',camp:'Ưu đãi VIP đúng thời điểm',chan:'Push/RM',pri:'Cao',ev:'model_score',ready:0},
  {cat:'Predictive (AI)',sig:'Churn probability cao',trig:'p_churn > 0,7 (model)',camp:'Giữ chân chủ động',chan:'Push/RM',pri:'Cao',ev:'model_score',ready:0},
  {cat:'Predictive (AI)',sig:'Next Best Action',trig:'model gợi ý hành động kế',camp:'Tự động chọn campaign tối ưu',chan:'Tự động',pri:'Cao',ev:'model_score',ready:0}
 ],
 segments:[
  {seg:'First-time Visitors',def:'Lần đầu vào, chưa đăng ký',camp:'Onboarding + lý do tin tưởng'},
  {seg:'Returning Visitors',def:'Quay lại, chưa nạp',camp:'Nhắc giá trị + ưu đãi nạp đầu'},
  {seg:'Engaged Users',def:'Tương tác cao, chưa chuyển đổi',camp:'Đẩy tới first deposit'},
  {seg:'High Intent Users',def:'Tín hiệu mua mạnh (pricing/demo)',camp:'Tư vấn 1-1, ưu đãi đúng lúc'},
  {seg:'Cart Abandoners',def:'Bắt đầu nạp chưa xong',camp:'Nhắc hoàn tất (Email + SMS)'},
  {seg:'Recent Buyers',def:'Vừa nạp / trade lần đầu',camp:'Kích hoạt thói quen, trade thứ 2-3'},
  {seg:'Repeat Buyers',def:'Nạp / trade nhiều lần',camp:'Tăng tần suất, cross-asset'},
  {seg:'VIP Customers',def:'Giá trị cao (whale)',camp:'Chăm riêng RM, ưu đãi phí'},
  {seg:'Power Users',def:'Dùng nhiều, sâu',camp:'Beta tính năng, cộng đồng'},
  {seg:'Churn Risk Users',def:'Hoạt động giảm rõ',camp:'Giữ chân chủ động'},
  {seg:'Dormant Users',def:'Ngủ đông dài',camp:'Win-back (nối tab Reactivation)'},
  {seg:'Advocates',def:'NPS cao, hài lòng',camp:'Referral, review, KOC'},
  {seg:'Referral Users',def:'Đến từ giới thiệu',camp:'Thưởng 2 chiều, giữ chất lượng'},
  {seg:'Trial / Explorer',def:'Thử, chưa cam kết vốn',camp:'Giảm rủi ro, mồi mức sàn'},
  {seg:'Enterprise / Institutional',def:'Khách lớn / tổ chức',camp:'Sales chuyên trách, gói riêng'}
 ],
  trends: { health: {
  '7d':   { pct: '+4,2%',  trend: [-4, -2, -5,  1, -1,  3, 0] },
  '30d':  { pct: '+12,8%', trend: [-8, -6, -4, -5, -2, -1,  1, -1,  2, 0] },
  '90d':  { pct: '+24,5%', trend: [-15,-12,-14,-10, -8, -9, -6, -4, -2, -3,  1, 0] },
  '180d': { pct: '+38,2%', trend: [-22,-20,-18,-15,-12,-14,-10, -7, -8, -5, -3,  1, 0] },
  '365d': { pct: '+58,1%', trend: [-35,-32,-30,-28,-25,-22,-20,-18,-15,-12,-10, -8, -6, -4, -1, 0] }
}, deposit: {
  '7d':   { pct: '+3,5%',  trend: [-3, -1, -4,  2, 0,  2, 0] },
  '30d':  { pct: '+11,2%', trend: [-7, -5, -3, -4, -1, 0,  2, 0,  1, 0] },
  '90d':  { pct: '+21,8%', trend: [-13,-10,-12,-8, -6, -7, -4, -3, -1, -2,  1, 0] },
  '180d': { pct: '+34,5%', trend: [-20,-18,-16,-13,-10,-11,-8, -5, -6, -3, -2,  0, 0] },
  '365d': { pct: '+54,8%', trend: [-32,-30,-28,-25,-22,-20,-18,-15,-12,-10,-8, -6, -4, -2, -1, 0] }
}, channel: {
  '7d':   { pct: '+2,8%',  trend: [-2, 0, -3,  1, -1,  2, 0] },
  '30d':  { pct: '+9,5%',  trend: [-6, -4, -2, -3, 0,  1,  3,  1,  2, 0] },
  '90d':  { pct: '+18,2%', trend: [-11,-9,-10,-7, -5, -6, -3, -2,  0, -1,  2, 0] },
  '180d': { pct: '+29,4%', trend: [-18,-16,-14,-11,-8, -9, -6, -3, -4, -1, 0,  1, 0] },
  '365d': { pct: '+47,6%', trend: [-28,-26,-24,-21,-18,-16,-14,-11,-9, -7, -5, -3, -2, 0,  1, 0] }
}, content: {
  '7d':   { pct: '+4,8%',  trend: [-5, -3, -6,  2, 0,  4, 0] },
  '30d':  { pct: '+15,2%', trend: [-9, -7, -5, -6, -3, -2,  0, -2,  1, 0] },
  '90d':  { pct: '+28,4%', trend: [-17,-14,-16,-12,-10,-11,-8, -6, -4, -5, -1, 0] },
  '180d': { pct: '+44,1%', trend: [-25,-23,-21,-18,-15,-17,-13,-10,-11,-8, -6,  2, 0] },
  '365d': { pct: '+67,5%', trend: [-40,-37,-35,-33,-30,-27,-25,-22,-19,-16,-14,-12,-9, -6, -2, 0] }
} },
  cvd: {
  '7d':   {vhs:65,depQ:63,retQ:66,whale:41.8,repeat:66.7,ftd:44.4,avgLtv:5.1,ltvCac:28.5,d30:29.3,d90:20.3,interval:8.1,realized:122.9,dep:[32,47,71,83],freq:null},
  '30d':  {vhs:69,depQ:67,retQ:70,whale:40.5,repeat:69.5,ftd:46,avgLtv:5.4,ltvCac:30,d30:33,d90:23,interval:7.6,realized:128,dep:[34,50,73,85],freq:[38,27,24,11]},
  '90d':  {vhs:74,depQ:72,retQ:75,whale:38,repeat:73,ftd:49,avgLtv:6.1,ltvCac:33,d30:38,d90:27,interval:7,realized:138,dep:[37,55,77,88],freq:[34,28,27,11]},
  '180d': {vhs:80,depQ:78,retQ:81,whale:35,repeat:77.5,ftd:53,avgLtv:7.3,ltvCac:38,d30:45,d90:33,interval:6.2,realized:155,dep:[42,61,82,91],freq:[28,29,31,12]},
  '365d': {vhs:87,depQ:85,retQ:88,whale:31,repeat:82,ftd:58,avgLtv:9.2,ltvCac:45,d30:55,d90:42,interval:5.4,realized:180,dep:[48,68,88,94],freq:[22,28,35,15]}
}
};

  // 40. DATA GUIDE & SYSTEM LINKAGE (drives the "Sơ đồ & Hướng dẫn" tab — map + input guide)
  const dataGuide = [
    { id:'nsm', name:'North Star Metric', stage:'north', tab:'tab-executive', subtab:'', dataKey:'northStar + productGrowth.activationJourney', fields:'metric, target, drivers[{key,name,target}]; activationJourney[{step,count}]', example:'target=3000; drivers: Kích hoạt × FTD × Giữ chân × Tần suất', produces:'Thẻ North Star + cây 4 chỉ số đầu vào' },
    { id:'attr', name:'Attribution đa điểm chạm', stage:'acq', tab:'tab-customer-intel', subtab:'acq-subtab-attribution', dataKey:'customers[]', fields:'PrimaryAwarenessChannel, PrimaryConversionChannel, InteractionsToKyc, InteractionsToFtd, Revenue, FTD_Date', example:'Awareness=Meta Ads, Conversion=Direct, InteractionsToKyc=4, ToFtd=7', produces:'Bảng Attribution 6 model (First/Last/Linear/Decay/Position/Data-Driven)' },
    { id:'chan', name:'Hiệu suất kênh & CAC', stage:'acq', tab:'tab-capital', subtab:'cap-subtab-forecasting', dataKey:'campaigns[]', fields:'Channel, Spend, Install, KYC, Revenue, CAC, LTV', example:'Channel=Meta Ads, Spend=32000, Install=8200, KYC=2870, Revenue=112000', produces:'Ma trận chiến dịch, Blended CAC, Payback' },
    { id:'sat', name:'Bão hòa kênh', stage:'acq', tab:'tab-capital', subtab:'cap-subtab-forecasting', dataKey:'meu.exp[]', fields:'ch, hist[], lag, shape, cap, risk, cannib', example:'ch=TikTok, hist=[12,7,4,3], lag=14, cap=25, risk=15, cannib=35', produces:'Bảng đường bão hòa kênh' },
    { id:'actf', name:'Phễu Kích hoạt', stage:'act', tab:'tab-product-growth', subtab:'pg-subtab-activation', dataKey:'productGrowth.activationJourney[]', fields:'step, count', example:'step=KYC Submitted, count=4800', produces:'Phễu kích hoạt + tỷ lệ rớt từng bước' },
    { id:'retc', name:'Cohort giữ chân (thật)', stage:'ret', tab:'tab-customer-value', subtab:'cust-subtab-cohorts', dataKey:'meu.retCohorts[] + meu.retDays[]', fields:'name, surv[] theo retDays (0..180)', example:'name=Crypto·TikTok·100k, surv=[1,.55,.40,.29,.22,.15,.10,.07,.04]', produces:'Đường survival theo cohort' },
    { id:'cohm', name:'Cohort matrix D1-D90', stage:'ret', tab:'tab-customer-value', subtab:'cust-subtab-cohorts', dataKey:'cohortMatrix[]', fields:'cohort, size, d1, d7, d14, d30, d60, d90', example:'cohort=2026-06, size=2780, d30=20.5', produces:'Bảng nhiệt cohort + Retention Health' },
    { id:'pred', name:'Dự báo Whale/Churn', stage:'ret', tab:'tab-customer-value', subtab:'cust-subtab-prediction', dataKey:'customers[]', fields:'Deposit, Trade_Count, SessionFrequency, WatchTime, Segment, Retention_Status', example:'tra theo Customer_ID (CUST-0001..0500)', produces:'Điểm Whale & Churn theo từng khách' },
    { id:'cvd', name:'Value Formation / CVD', stage:'rev', tab:'tab-executive', subtab:'', dataKey:'meu.cvd{} + meu.trends{}', fields:'theo kỳ 7d/30d/90d/180d/365d: whale, repeat, ftd, avgLtv, ltvCac, d30, d90, realized; trend[]', example:'cvd[90d].whale=38, ltvCac=33; trends.health[90d].pct=+24,5%', produces:'Thẻ Value Formation (đổi theo Time-range)' },
    { id:'ts', name:'Chuỗi thời gian', stage:'rev', tab:'tab-executive', subtab:'', dataKey:'meu.weeks[] + meu.months[]', fields:'weeks: w, budget, install, kycnc, deposit, rev; months: m, spend, install, kycnc', example:'tuần: budget=462800000, deposit=7840, rev=19051200000', produces:'Biểu đồ Spend · Revenue · KYC NC (Tuần/Tháng)' },
    { id:'ltv', name:'Doanh thu & LTV theo nạp', stage:'rev', tab:'tab-customer-value', subtab:'cust-subtab-segments', dataKey:'customers[] + meu.depLTV[]', fields:'Deposit, NetLtv, PaybackMonths, IncentiveCost; depLTV[{dep,ltv}]', example:'Deposit=500000 → ltv≈2200000', produces:'IEI, Payback, phân tầng giá trị' },
    { id:'ref', name:'Vòng lặp & k-factor', stage:'ref', tab:'tab-product-growth', subtab:'pg-subtab-loops', dataKey:'referralData', fields:'inviteRate, loopsList[{conversionRate, status}]', example:'inviteRate=3.2, loop Active conv=12.5% → k≈0.33', produces:'k-factor + hệ số khuếch đại + bảng loop' },
    { id:'exp', name:'Thí nghiệm (ICE)', stage:'found', tab:'tab-experimentation', subtab:'ex-subtab-pipeline', dataKey:'experimentation.pipeline[]', fields:'idea, hypothesis, impact, confidence, ease, status', example:'impact=8, confidence=7, ease=8 → ICE=7.7', produces:'Pipeline thí nghiệm xếp hạng theo ICE' },
    { id:'cexp', name:'Backlog Content (ICE)', stage:'found', tab:'tab-content', subtab:'subtab-ops-reviews', dataKey:'contentExperimentBacklog[]', fields:'hypothesis, target, impact, confidence, ease, priority, owner', example:'impact=9, confidence=7, ease=7 → ICE=7.7', produces:'Backlog content xếp hạng ICE' },
    { id:'health', name:'Growth Health & Cảnh báo', stage:'found', tab:'tab-executive', subtab:'', dataKey:'configs + (campaigns, customers, cohortMatrix, getDailyRevenue)', fields:'configs.weights{}, configs.thresholds{}, configs.benchmarks{}', example:'weights.risk=0.15; thresholds.whaleConcentrationPct=40', produces:'Điểm Growth Health + Alert Center' },
    { id:'copilot', name:'Copilot & Cảnh báo sớm', stage:'found', tab:'tab-growth-strategy', subtab:'gs-subtab-copilot', dataKey:'campaigns + cohortMatrix + referralData + configs.thresholds', fields:'(tự suy từ các nguồn trên)', example:'CAC kênh chênh > ngưỡng → đề xuất dịch ngân sách', produces:'Khuyến nghị Copilot + Radar cảnh báo' },
    { id:'cal', name:'Lịch Kinh tế & Regime', stage:'found', tab:'tab-capital', subtab:'cap-subtab-forecasting', dataKey:'economicCalendar[] + geopoliticalRegimes[]', fields:'datetime, event, importance, linkedRegimeId; regime: growthMul, cacMul, retMul, probability', example:'event=FOMC, linkedRegimeId=geo-regime-fed', produces:'Lịch live + kịch bản địa chính trị' }
  ];

  return {
    meu,
    dataGuide,
    configs,
    auditLogs,
    campaigns,
    customers,
    cohortMatrix,
    cohortLtvMatrix,
    assetMigrationMatrix,
    rfmSegments,
    opportunityBacklog,
    hookIntelligence,
    customerPersonas,
    contentPlan,
    adNetworkAssessments,
    teamProgress,
    industryBenchmarks,
    competitorAnalysis,
    geopoliticalRegimes,
    economicCalendar,
    northStar,
    creativeAssets,
    contentCalendar,
    teamTasks,
    departmentMetrics,
    okrCenter,
    resolutionMetrics,
    customerJourneys,
    transitionMatrix,
    funnelMigration,
    utmRules,
    utmViolations,
    eventTrackingDictionary,
    contentKpis,
    contentMeasurementFramework,
    contentReviewRepository,
    contentExperimentBacklog,
    crossFunctionalCollab,
    designTasks,
    designKpis,
    designerWorkloads,
    teamEffectivenessKpis,
    bottlenecks,
    resourceCapacity,
    growthStrategy,
    marketIntel,
    competitorIntel,
    productGrowth,
    experimentation,
    referralData,
    lifecycleAutomation,
    vocData,
    knowledgeBase,
    incidentsLog,
    creativeFatigueData,
    getDailyRevenue,
    getEventStream,
    getAggregatedCampaigns,
    getScaledCampaigns,
    getMauForecast
  };
})();

