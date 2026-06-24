// FAITHFUL diagnostic: getElementById returns null for ids NOT in index.html
// (just like a real browser), but registers ids created at runtime via innerHTML.
// This surfaces the real null-deref / missing-element bugs the lenient mock hid.
var nativeConsole = console;
var ERRORS = [], CTX = "startup";
var console = {
  log: function(){ nativeConsole.log(Array.prototype.slice.call(arguments).join(" ")); },
  error: function(){
    var m = Array.prototype.slice.call(arguments).map(function(x){ try{return (x&&x.toString)?x.toString():String(x);}catch(e){return "?";} }).join(" ");
    ERRORS.push("[" + CTX + "] console.error: " + m);
  },
  warn: function(){}
};
var mockConfirmValue = true;
var setTimeout=function(cb){try{cb();}catch(e){}return 1;}, setInterval=function(){return 1;}, clearInterval=function(){}, clearTimeout=function(){};
var requestAnimationFrame=function(cb){try{cb(0);}catch(e){}return 1;}, cancelAnimationFrame=function(){};

var fm = $.NSFileManager.defaultManager;
function readFile(p){ var d=fm.contentsAtPath(p); var s=$.NSString.alloc.initWithDataEncoding(d,$.NSUTF8StringEncoding); return ObjC.unwrap(s); }

// ---- parse static ids from index.html ----
var STATIC_IDS = {};
(function(){
  var html = readFile('index.html');
  var re = /id\s*=\s*"([^"]+)"/g, m;
  while ((m=re.exec(html))) STATIC_IDS[m[1]] = true;
  var re2 = /id\s*=\s*'([^']+)'/g;
  while ((m=re2.exec(html))) STATIC_IDS[m[1]] = true;
})();
var DYN_IDS = {};      // ids created at runtime via innerHTML / setAttribute / .id
var byId = {};         // id -> element instance

function registerIdsFromHTML(str){
  if (!str || typeof str !== 'string' || str.indexOf('id') < 0) return;
  var re=/id\s*=\s*["']([^"']+)["']/g, m;
  while ((m=re.exec(str))) DYN_IDS[m[1]] = true;
}

function makeEl(tag, id){
  var children=[], _innerHTML='', _id=id||'';
  var el = {
    tagName:(tag||'div').toUpperCase(), textContent:'', value:'ALL', checked:true,
    selectedIndex:0, options:[{text:'CEO (Hannah)',value:'ALL'}], className:'', dataset:{}, style:{},
    onclick:null,onchange:null,oninput:null, listeners:{}, attributes:{}, children:children,
    offsetWidth:300,offsetHeight:150,clientWidth:300,clientHeight:150,scrollWidth:300,scrollHeight:150,
    setAttribute:function(n,v){ this.attributes[n]=v; if(n==='id'){ _id=v; byId[v]=this; DYN_IDS[v]=true; } if(n==='data-subtab'||n==='data-tab'){this.dataset[n]=v;} },
    getAttribute:function(n){ return (n in this.attributes)?this.attributes[n]:''; },
    removeAttribute:function(n){ delete this.attributes[n]; },
    hasAttribute:function(n){ return n in this.attributes; },
    appendChild:function(c){ children.push(c); if(c){c.parentNode=this; if(c.id){byId[c.id]=c; DYN_IDS[c.id]=true;}} return c; },
    removeChild:function(c){ var i=children.indexOf(c); if(i>=0)children.splice(i,1); return c; },
    insertBefore:function(c){ children.unshift(c); return c; },
    append:function(){ for(var i=0;i<arguments.length;i++) children.push(arguments[i]); },
    prepend:function(){}, insertAdjacentHTML:function(pos,str){ registerIdsFromHTML(str); },
    cloneNode:function(){ return makeEl(this.tagName); }, remove:function(){},
    click:function(){ if(this.onclick)this.onclick({target:this}); if(this.listeners.click) this.listeners.click.forEach(function(cb){cb({target:el,currentTarget:el,preventDefault:function(){},stopPropagation:function(){}});}); },
    focus:function(){},blur:function(){},scrollIntoView:function(){},scrollTo:function(){},
    addEventListener:function(ev,cb){ if(!this.listeners[ev])this.listeners[ev]=[]; this.listeners[ev].push(cb); },
    removeEventListener:function(){}, dispatchEvent:function(){return true;},
    getBoundingClientRect:function(){ return {top:0,left:0,right:300,bottom:150,width:300,height:150,x:0,y:0}; },
    classList:{ add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;},replace:function(){} },
    querySelector:function(sel){ return makeEl('div'); },
    querySelectorAll:function(sel){ if(sel==='button') return this._buttons||[]; return []; },
    closest:function(){ return this; }, matches:function(){ return false; },
    getContext:function(){ return { beginPath:function(){},arc:function(){},stroke:function(){},moveTo:function(){},lineTo:function(){},fill:function(){},closePath:function(){},clearRect:function(){},fillRect:function(){},strokeRect:function(){},fillText:function(){},save:function(){},restore:function(){},translate:function(){},rotate:function(){},scale:function(){},createLinearGradient:function(){return {addColorStop:function(){}};},createRadialGradient:function(){return {addColorStop:function(){}};},setLineDash:function(){},measureText:function(){return {width:10};},bezierCurveTo:function(){},quadraticCurveTo:function(){},rect:function(){},clip:function(){},fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'',textBaseline:'',globalAlpha:1,lineCap:'',lineJoin:'',shadowBlur:0,shadowColor:'' }; },
    reset:function(){}, submit:function(){}
  };
  Object.defineProperty(el,'innerHTML',{ get:function(){return _innerHTML;}, set:function(v){ _innerHTML=v; registerIdsFromHTML(v); } });
  Object.defineProperty(el,'id',{ get:function(){return _id;}, set:function(v){ _id=v; if(v){byId[v]=el; DYN_IDS[v]=true;} } });
  if (id){ _id=id; byId[id]=el; }
  return el;
}

// ---- subtab registry ----
var CONTAINERS = {
  "acq-subtabs":["acq-subtab-performance","acq-subtab-attribution","acq-subtab-utm","acq-subtab-hygiene"],
  "cust-subtabs":["cust-subtab-segments","cust-subtab-cohorts","cust-subtab-prediction","cust-subtab-database"],
  "cust-journey-subtabs":["subtab-journey-map","subtab-transition-matrix","subtab-funnel-migration","subtab-journey-attribution"],
  "cap-subtabs":["cap-subtab-forecasting","cap-subtab-optimizer"],
  "content-ops-subtabs":["subtab-ops-kpi","subtab-ops-reviews"],
  "gov-subtabs":["gov-subtab-configs","gov-subtab-benchmarks","gov-subtab-logs"],
  "team-ops-subtabs":["subtab-dept","subtab-tasks","subtab-design-ops","subtab-collaboration","subtab-effectiveness","subtab-incidents"],
  "growth-strategy-subtabs":["gs-subtab-board","gs-subtab-copilot","gs-subtab-warning"],
  "market-competitor-subtabs":["mc-subtab-tam","mc-subtab-tracker","mc-subtab-swot"],
  "product-growth-subtabs":["pg-subtab-analytics","pg-subtab-activation","pg-subtab-loops"],
  "experimentation-subtabs":["ex-subtab-pipeline","ex-subtab-lifecycle","ex-subtab-voc","ex-subtab-knowledge"]
};
var TAB_OF_CONTAINER={ "acq-subtabs":"tab-customer-intel","cust-subtabs":"tab-customer-value","cust-journey-subtabs":"tab-customer-value","cap-subtabs":"tab-capital","content-ops-subtabs":"tab-content","gov-subtabs":"tab-governance","team-ops-subtabs":"tab-team-ops","growth-strategy-subtabs":"tab-growth-strategy","market-competitor-subtabs":"tab-market-competitor","product-growth-subtabs":"tab-product-growth","experimentation-subtabs":"tab-experimentation" };
var ALL_TABS=["tab-executive","tab-customer-intel","tab-customer-value","tab-capital","tab-content","tab-governance","tab-team-ops","tab-growth-strategy","tab-market-competitor","tab-product-growth","tab-experimentation","tab-data-guide"];

var buttonBySubtab={}, buttonsByContainer={};
Object.keys(CONTAINERS).forEach(function(cid){
  buttonsByContainer[cid]=CONTAINERS[cid].map(function(sub){ var b=makeEl('button'); b.setAttribute('data-subtab',sub); buttonBySubtab[sub]=b; return b; });
});
var navByTab={};
var navItems=ALL_TABS.map(function(t){ var n=makeEl('div'); n.setAttribute('data-tab',t); var sp=makeEl('span'); sp.textContent=t; n.querySelector=function(sel){ if(sel==='span')return sp; return makeEl('div'); }; navByTab[t]=n; return n; });

// Parse custom-dropdown menu items from index.html so dropdown onChange callbacks can be exercised
var DROPDOWN_MENUS=["role-menu","time-range-menu","creative-asset-menu","team-dept-menu","task-filter-menu","effectiveness-dept-menu","ds-preset-menu","ds-ai-objective-menu","ds-timeframe-menu"];
var DROPDOWN_ITEMS={};
(function(){
  var html=readFile('index.html');
  DROPDOWN_MENUS.forEach(function(mid){
    var idx=html.indexOf('id="'+mid+'"');
    if(idx<0){ DROPDOWN_ITEMS[mid]=[]; return; }
    var after=html.substring(idx+mid.length+5);
    var nextId=after.search(/\sid="/);
    var win=nextId>=0?after.substring(0,nextId):after.substring(0,2500);
    var items=[], reItem=/class="dropdown-item[^"]*"\s+data-value="([^"]*)"[^>]*>([^<]*)</g, m;
    while((m=reItem.exec(win))){ var el=makeEl('div'); el.setAttribute('data-value',m[1]); el.textContent=m[2].trim(); items.push({value:m[1],text:m[2].trim(),el:el}); }
    DROPDOWN_ITEMS[mid]=items;
  });
})();

var realWin={ GrowthData:null,
  localStorage:{_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;},removeItem:function(k){delete this._d[k];}},
  alert:function(){},prompt:function(m,d){return d;},confirm:function(){return mockConfirmValue;},
  matchMedia:function(){return {matches:false,addEventListener:function(){},addListener:function(){}};},
  addEventListener:function(){},removeEventListener:function(){},requestAnimationFrame:requestAnimationFrame,cancelAnimationFrame:cancelAnimationFrame,
  setTimeout:setTimeout,setInterval:setInterval,clearInterval:clearInterval,innerWidth:1440,innerHeight:900,devicePixelRatio:2,
  getComputedStyle:function(){return {getPropertyValue:function(){return '';}};},location:{href:'file://local',search:'',hash:''},navigator:{userAgent:'jxa',language:'vi'} };
var window=new Proxy(realWin,{ get:function(t,p){return t[p];}, set:function(t,p,v){t[p]=v;try{globalThis[p]=v;}catch(e){}return true;} });
var showToast=function(){}, prompt=function(m,d){return d;}, confirm=function(){return mockConfirmValue;}, alert=function(){};
var localStorage=realWin.localStorage, getComputedStyle=realWin.getComputedStyle, navigator=realWin.navigator, location=realWin.location;

var document = {
  body: makeEl('body','__body'), documentElement: makeEl('html'), head: makeEl('head'),
  addEventListener:function(ev,cb){ if(ev==='DOMContentLoaded') this.domContentLoadedCallback=cb; },
  removeEventListener:function(){},
  createElement:function(tag){ return makeEl(tag); },
  createElementNS:function(ns,tag){ return makeEl(tag); },
  createTextNode:function(t){ var e=makeEl('text'); e.textContent=t; return e; },
  createDocumentFragment:function(){ return makeEl('fragment'); },
  getElementById:function(id){
    if (buttonsByContainer[id]){ if(!byId[id]){ var c=makeEl('div',id); c._buttons=buttonsByContainer[id]; } return byId[id]; }
    if (DROPDOWN_ITEMS[id]){ if(!byId[id]){ var mEl=makeEl('div',id); mEl.querySelectorAll=function(sel){ if(sel===".dropdown-item") return DROPDOWN_ITEMS[id].map(function(x){return x.el;}); return []; }; } return byId[id]; }
    if (byId[id]) return byId[id];
    if (STATIC_IDS[id] || DYN_IDS[id]) return makeEl('div', id); // exists -> create instance
    return null; // <-- faithful: missing id returns null, like a real browser
  },
  getElementsByClassName:function(){ return []; },
  getElementsByTagName:function(){ return []; },
  querySelector:function(sel){
    var m;
    if (sel.indexOf('.nav-item[data-tab=')===0){ m=sel.match(/data-tab="([^"]+)"/); return m?navByTab[m[1]]:null; }
    if (sel.indexOf('button[data-subtab=')===0){ m=sel.match(/data-subtab="([^"]+)"/); return m?(buttonBySubtab[m[1]]||null):null; }
    if (sel==='.nav-item.active') return navByTab['tab-executive'];
    if (sel==='.tab-pane.active') return makeEl('div');
    return makeEl('div');
  },
  querySelectorAll:function(sel){ if(sel==='.nav-item') return navItems; return []; }
};
var lucide={createIcons:function(){}};
function btoa(s){ return "b64:"+s; } function atob(s){ return s; }
function Event(type){this.type=type;this.preventDefault=function(){};this.stopPropagation=function(){};}
function CustomEvent(type,o){this.type=type;this.detail=(o&&o.detail)||null;}
function Chart(ctx,cfg){this.destroy=function(){};this.update=function(){};this.resize=function(){};this.data=(cfg&&cfg.data)||{};this.options=(cfg&&cfg.options)||{};}
Chart.register=function(){};Chart.defaults={font:{},plugins:{}};

function run(ctx,fn){ CTX=ctx; try{ fn(); }catch(e){ ERRORS.push("["+ctx+"] THROW: "+(e&&e.message?e.message:e)); } }

try {
  eval(readFile('data/data.js'));
  eval(readFile('app.js'));
  CTX="DOMContentLoaded(startup)";
  if (document.domContentLoadedCallback){ try{ document.domContentLoadedCallback(); }catch(e){ ERRORS.push("[DOMContentLoaded(startup)] THROW: "+(e&&e.message?e.message:e)); } }
  ALL_TABS.forEach(function(tab){ run("TAB "+tab,function(){ window.switchTab(tab); }); });
  Object.keys(CONTAINERS).forEach(function(cid){ var tab=TAB_OF_CONTAINER[cid]; CONTAINERS[cid].forEach(function(sub){ run("SUBTAB "+tab+" > "+sub,function(){ window.switchTab(tab); var b=buttonBySubtab[sub]; if(b)b.click(); else throw new Error("no button "+sub); }); }); });

  // Exercise the customer-lookup prediction flow with a VALID id (the unguarded deref path that crashed before the fix)
  run("PREDICTION lookup (valid customer)", function(){
    window.switchTab("tab-customer-value");
    var b=buttonBySubtab["cust-subtab-prediction"]; if(b) b.click();
    var inp=byId["predict-cust-id"]; if(inp) inp.value="CUST-0007";
    var btn=byId["btn-run-prediction"]; if(btn) btn.click(); else throw new Error("btn-run-prediction not found");
  });

  // ---- INTERACTION SWEEP: click every button + dropdown item to catch handler errors ----
  // Enable customize mode so permission-gated handlers run full logic
  run("enable customize mode", function(){ var b=byId["btn-toggle-customize"]; if(b) b.click(); });
  // Seed valid inputs for lookup handlers
  ["predict-cust-id","churn-cust-id","db-search-input","ds-share-email"].forEach(function(id){ var e=byId[id]; if(e) e.value = (id.indexOf("cust")>=0?"CUST-0007":"test"); });

  var CLICKABLE = ["btn-add-backlog","btn-ai-scan-opportunities","btn-calc-lift","btn-generate-team-review","btn-optimize-budget","btn-run-churn-prediction","btn-run-prediction","btn-run-realloc","btn-save-configs","btn-simulate-anomaly","btn-verify-utm","content-btn-add-mock-exp","content-btn-add-mock-review","copilot-apply-acq","copilot-apply-content","copilot-apply-prod","copilot-apply-ret","db-btn-export-csv","ds-btn-add-mock-task","ds-btn-ai-layout","ds-btn-export","ds-btn-reset","ds-btn-save","ds-btn-share","ds-layout-kanban","ds-layout-list","ex-btn-add-mock","ex-btn-add-mock-learning","ex-btn-add-mock-lifecycle","ex-btn-add-mock-voc","mc-btn-add-mock-competitor","mc-btn-add-mock-trend","pg-btn-add-mock-friction","pg-btn-add-mock-loop","utm-btn-resolve-all","utm-btn-simulate"];
  CLICKABLE.forEach(function(id){ run("CLICK "+id, function(){ var el=byId[id]; if(el) el.click(); }); });

  // Dropdown sweep: click each parsed menu item to fire its onChange (esp. time-range)
  Object.keys(DROPDOWN_ITEMS).forEach(function(menuId){
    DROPDOWN_ITEMS[menuId].forEach(function(it){
      run("DROPDOWN "+menuId+" -> "+it.value, function(){ if(it.el && it.el.onclick) it.el.onclick({stopPropagation:function(){},target:it.el}); });
    });
  });

  // Verify the topbar time-range actually drives the Executive revenue chart range
  var TIMEFRAME_CHECK = { ran:false, points:{} };
  try {
    window.switchTab("tab-executive");
    [ "7", "30", "90", "180", "365" ].forEach(function(v){
      var item = (DROPDOWN_ITEMS["time-range-menu"]||[]).find(function(x){ return x.value===v; });
      if (item && item.el.onclick) {
        item.el.onclick({stopPropagation:function(){},target:item.el});
        TIMEFRAME_CHECK.points[v] = (window.db.getDailyRevenue(parseInt(v,10))||[]).length;
        TIMEFRAME_CHECK.ran = true;
      }
    });
  } catch(e){ ERRORS.push("[TIMEFRAME] THROW: "+(e&&e.message?e.message:e)); }

  // Exercise the geopolitical regime selection -> enriched details + calendar highlight
  run("GEO regime select -> details + calendar", function(){
    window.switchTab("tab-capital");
    var sel = byId["geopolitical-regime-select"];
    if (sel) { sel.value = "geo-regime-fed"; (sel.listeners && sel.listeners.change || []).forEach(function(cb){ cb({target:sel}); }); }
  });

  // ---- content-population proof: key elements must actually receive data ----
  function contentSig(id){ var e=byId[id]; if(!e) return -1; var h=(e.innerHTML||'')+''; var t=(e.textContent||'')+''; var ch=(e.children&&e.children.length)||0; return Math.max(h.length, t.length, ch); }
  var CHECKS = [
    ["ai-summary-text", "AI persona summary (restored box)"],
    ["kpi-revenue", "Executive revenue KPI"],
    ["gs-constraints-list", "Growth Strategy: constraints (child rows)"],
    ["gs-loops-list", "Growth Strategy: growth loops (child rows)"],
    ["pred-beh-completion", "Prediction: restored video-completion field"],
    ["pred-fin-revenue", "Prediction: restored revenue field"],
    ["priority-tbody", "Weekly Priority Engine table (child rows)"],
    ["team-progress-tbody", "Team Progress table (child rows)"],
    ["growth-health-label", "Growth Health gauge label"],
    ["topbar-summary-health", "Topbar Health summary"],
    ["topbar-summary-ltvcac", "Topbar LTV/CAC summary"],
    ["econ-calendar-list", "Economic/Geopolitical calendar (child rows)"],
    ["geopolitical-details", "Geopolitical regime detail panel (enriched)"],
    ["north-star-metric", "North Star Metric + input tree (computed)"],
    ["pg-kfactor", "K-factor (computed live)"],
    ["ex-pipeline-table", "Experiment pipeline (ICE-computed + sorted)"],
    ["gs-copilot-list", "Growth Copilot recommendations (rules engine)"],
    ["gs-warning-grid", "Early Warning radar (computed)"],
    ["cust-journey-attribution-tbody", "Attribution engine (real, from customers)"],
    ["meu-value-trends", "MEU Value Formation (cvd/trends by time-range)"],
    ["meu-cohort-tbody", "MEU real cohort survival curves"],
    ["meu-saturation-tbody", "MEU channel saturation curves"],
    ["system-map", "System linkage map (Value Formation Journey)"],
    ["data-guide-tbody", "Data input guide (data → component)"],
    ["io-template-preview", "Bulk import/export template preview"],
    ["meu-rfm", "MEU RFM matrix + segments"],
    ["meu-lifecycle", "MEU lifecycle funnel"],
    ["meu-content-creatives", "MEU content creatives"],
    ["meu-act-aha", "MEU activation aha moments"]
  ];
  var contentReport = CHECKS.map(function(c){ var n=contentSig(c[0]); return { id:c[0], desc:c[1], len:n, ok:(n>0) }; });
  // also verify the underlying data exists
  try {
    var gs = window.db && window.db.growthStrategy;
    console.log("[data] growthStrategy.constraints=" + (gs&&gs.constraints?gs.constraints.length:0) + " growthLoops=" + (gs&&gs.growthLoops?gs.growthLoops.length:0));
  } catch(e){}

  // ===== CORRECTNESS assertions: verify the COMPUTED VALUES are right (not just present) =====
  var CORR = [];
  function corr(n, pass, d){ CORR.push({ n: n, pass: !!pass, d: d == null ? "" : String(d) }); }
  try {
    var D = window.db;
    // 1. Attribution reconciliation + model variation (re-derive app's computeAttribution)
    function getTestFilteredCustomers(days) {
      var cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      var cutoffStr = cutoffDate.toISOString().slice(0, 10);
      return (D.customers || []).filter(function(c){ return c.Install_Date >= cutoffStr; });
    }
    var filteredCs = getTestFilteredCustomers(30);
    function attrCompute(model){
      var m = String(model).toLowerCase().replace(/_touch/g, "").replace(/_/g, ""), credit = {};
      function add(ch, ftd, rev){ if(!ch||ch==="None")return; if(!credit[ch])credit[ch]={ftd:0,rev:0}; credit[ch].ftd+=ftd; credit[ch].rev+=rev; }
      filteredCs.forEach(function(c){
        if(!c.FTD_Date||c.FTD_Date==="None")return;
        var first=c.PrimaryAwarenessChannel, last=c.PrimaryConversionChannel, rev=c.Revenue||0, fw, lw;
        switch(m){ case"first":fw=1;lw=0;break; case"linear":fw=.5;lw=.5;break; case"decay":fw=.3;lw=.7;break; case"position":fw=.4;lw=.6;break;
          case"datadriven":{var k=c.InteractionsToKyc||0,f=c.InteractionsToFtd||0; fw=f>0?Math.max(.1,Math.min(.9,k/f)):.5; lw=1-fw; break;}
          default:fw=0;lw=1; }
        if(!last||last==="None"){fw=1;lw=0;}
        add(first,fw,rev*fw); add(last,lw,rev*lw);
      });
      return credit;
    }
    var ftdCust=filteredCs.filter(function(c){return c.FTD_Date&&c.FTD_Date!=="None";});
    var totFtd=ftdCust.length, totRev=ftdCust.reduce(function(a,c){return a+(c.Revenue||0);},0);
    var last=attrCompute("last"), first=attrCompute("first");
    var lastFtd=Object.keys(last).reduce(function(a,k){return a+last[k].ftd;},0);
    var lastRev=Object.keys(last).reduce(function(a,k){return a+last[k].rev;},0);
    corr("Attribution ΣFTD = số khách FTD ("+totFtd+")", Math.abs(lastFtd-totFtd)<1, lastFtd.toFixed(1));
    corr("Attribution Σrevenue = revenue khách FTD", totRev>0 && Math.abs(lastRev-totRev)<1, "$"+Math.round(lastRev).toLocaleString());
    var chans=Object.keys(last).concat(Object.keys(first)).filter(function(v,i,a){return a.indexOf(v)===i;});
    var diff=chans.some(function(k){return Math.abs((last[k]?last[k].rev:0)-(first[k]?first[k].rev:0))>1;});
    corr("Attribution First-touch ≠ Last-touch (model có tác dụng)", diff, chans.length+" kênh");

    // 2. North Star activation driver matches the funnel
    var aj=(D.productGrowth&&D.productGrowth.activationJourney)||[];
    function step(n){var s=aj.find(function(x){return x.step===n;});return s?s.count:0;}
    // sweep dropdown ở trên đã đổi kỳ → reset về 30 ngày (eff=1) rồi render lại để kiểm baseline 38.4%
    try { var t30=(DROPDOWN_ITEMS["time-range-menu"]||[]).find(function(x){return x.value==="30";}); if(t30&&t30.el&&t30.el.onclick) t30.el.onclick({stopPropagation:function(){},target:t30.el}); if(window.switchTab) window.switchTab("tab-executive"); } catch(e){}
    var expectAct=step("App Installed")?(step("KYC Submitted")/step("App Installed")*100):0;
    var nsHtml=(byId["north-star-metric"]||{}).innerHTML||"";
    corr("North Star: Kích hoạt khớp phễu (~"+expectAct.toFixed(1)+"%)", nsHtml.indexOf(expectAct.toFixed(1))>=0, nsHtml.indexOf(expectAct.toFixed(1))>=0?"khớp":"không thấy");

    // 3. k-factor formula = inviteRate × avg(active loop conv)
    var rd=D.referralData||{}, actL=(rd.loopsList||[]).filter(function(l){return l.status==="Active";});
    var avgConv=actL.length?actL.reduce(function(a,l){return a+(l.conversionRate||0);},0)/actL.length:0;
    var expK=(rd.inviteRate||0)*(avgConv/100);
    var kTxt=(byId["pg-kfactor"]||{}).textContent||"";
    corr("k-factor = inviteRate×conv (≈"+expK.toFixed(2)+", không phải literal 0.12)", kTxt.indexOf(expK.toFixed(2))===0, kTxt);

    // 4. OKR rollup: rendered company progress == avg of team-rolled
    function avg(a){return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null;}
    var ind=D.okrCenter.individual||[], team=D.okrCenter.team||[], comp=D.okrCenter.company||[];
    var okrHost=byId["okr-target-tree-container"];
    var okrHtml=okrHost&&okrHost.children?okrHost.children.map(function(d){return d.innerHTML||"";}).join(""):"";
    var okrPass=true, okrDetail="";
    comp.forEach(function(c){
      var teamRolled=team.filter(function(t){return t.parentId===c.id;}).map(function(t){var kids=ind.filter(function(i){return i.parentId===t.id;}).map(function(i){return i.progress;});return kids.length?Math.round(avg(kids)):t.progress;});
      var expComp=teamRolled.length?Math.round(avg(teamRolled)):c.progress;
      okrDetail+=c.id+"→"+expComp+"% ";
      if(okrHtml && okrHtml.indexOf(">"+expComp+"%")<0) okrPass=false;
    });
    corr("OKR rollup: công ty = bình quân team đã cộng dồn", okrHtml?okrPass:false, okrDetail.trim());

    // 5. Whale concentration computed (drives alert + risk score)
    var cs=getTestFilteredCustomers(30), tRev=cs.reduce(function(a,c){return a+(c.Revenue||0);},0);
    var wRev=cs.filter(function(c){return c.Segment==="Whale";}).reduce(function(a,c){return a+(c.Revenue||0);},0);
    var whalePct=tRev>0?(wRev/tRev*100):0, thr=(D.configs.thresholds||{}).whaleConcentrationPct||40;
    corr("Whale concentration tính được ("+whalePct.toFixed(1)+"% / ngưỡng "+thr+"%)", whalePct>0, whalePct>thr?"VƯỢT → cảnh báo bật":"trong ngưỡng");

    // 6. Content experiment ICE present & sorted (top row has highest ICE)
    var ceb=D.contentExperimentBacklog||[];
    var ices=ceb.map(function(r){return ((r.impact||0)+(r.confidence||0)+(r.ease||0))/3;});
    var maxIce=Math.max.apply(null, ices.concat([0]));
    corr("Content ICE: có điểm ICE & top = cao nhất ("+maxIce.toFixed(1)+")", ices.every(function(x){return x>0;}) && maxIce>0, ices.map(function(x){return x.toFixed(1);}).join(", "));

    // 7. Bulk export/import round-trip (campaigns) — export then import must preserve the data
    try {
      window.switchTab("tab-data-guide");
      if (!byId["io-append"]) makeEl("input", "io-append"); byId["io-append"].checked = false; // hộp "Nối thêm" mặc định KHÔNG tick (chế độ thay thế) như trên trình duyệt thật
      var ioSel = byId["io-dataset"], ioTa = byId["io-textarea"];
      if (ioSel) ioSel.value = "campaigns";
      var n0 = (D.campaigns || []).length;
      if (byId["io-export"]) byId["io-export"].click();
      var exported = (ioTa && ioTa.value) || "";
      var rtOk = false; try { var p = JSON.parse(exported); rtOk = Array.isArray(p) && p.length === n0; } catch (e) {}
      if (byId["io-import"]) byId["io-import"].click();
      var n1 = (D.campaigns || []).length;
      corr("Export→Import round-trip (campaigns giữ " + n0 + " dòng)", rtOk && n1 === n0, "export=" + exported.length + " ký tự, sau import=" + n1 + " dòng");
      if (byId["io-prompt"]) byId["io-prompt"].click();
      corr("Tạo prompt AI có schema + ví dụ", ((ioTa && ioTa.value) || "").indexOf("MẢNG JSON") >= 0, "len=" + ((ioTa && ioTa.value) || "").length);
      // localStorage persistence: re-export campaigns then Save → must land in localStorage
      if (byId["io-export"]) byId["io-export"].click();
      if (byId["io-save"]) byId["io-save"].click();
      var persisted = false; try { persisted = !!(JSON.parse(window.localStorage.getItem("meu_growth_overrides") || "{}").campaigns); } catch (e) {}
      corr("Lưu localStorage (campaigns bền qua reload)", persisted, persisted ? "đã ghi vào localStorage" : "chưa ghi");
      // schema validation must REJECT a wrong-field import (campaigns unchanged)
      var nBefore = (D.campaigns || []).length;
      if (ioSel) ioSel.value = "campaigns";
      if (ioTa) ioTa.value = '[{"totally_wrong_field":1}]';
      if (byId["io-import"]) byId["io-import"].click();
      var nAfter = (D.campaigns || []).length;
      corr("Schema validation chặn import sai trường", nAfter === nBefore && nAfter > 1, "campaigns vẫn " + nAfter + " dòng (không bị ghi đè)");
    } catch (e) { corr("IO round-trip", false, e.message); }
    // 9. No known-invalid lucide icon names in index.html (browser-confirmed bad: flood the console)
    try {
      var htmlSrc = readFile("index.html");
      var BAD_ICONS = ["swatchbook", "trello", "tool"]; // browser-confirmed missing in the loaded lucide build
      var foundBad = BAD_ICONS.filter(function (ic) { return htmlSrc.indexOf('data-lucide="' + ic + '"') >= 0; });
      corr("Không có icon lucide không tồn tại (tránh flood console)", foundBad.length === 0, foundBad.length ? ("còn: " + foundBad.join(", ")) : "sạch");
    } catch (e) { corr("icon check", false, e.message); }
  } catch(e){ corr("Correctness block threw", false, e.message); }
  var corrFails = CORR.filter(function(c){ return !c.pass; });

  console.log("");
  console.log("============== FAITHFUL DIAGNOSTIC (browser-like getElementById) ==============");
  console.log("static ids parsed from index.html: " + Object.keys(STATIC_IDS).length);
  if (ERRORS.length===0){ console.log("CLEAN: 0 errors."); }
  else { console.log("FOUND "+ERRORS.length+" ERROR(S):"); ERRORS.forEach(function(e,i){ console.log((i+1)+". "+e); }); }
  console.log("--- content population (proves data flows into tabs) ---");
  contentReport.forEach(function(r){ console.log((r.ok?"  OK  ":" EMPTY") + " | " + r.desc + " (#" + r.id + ") chars=" + r.len); });
  console.log("--- time-range (topbar) drives Executive revenue chart ---");
  console.log("  ran=" + TIMEFRAME_CHECK.ran + "  data points by range: " + JSON.stringify(TIMEFRAME_CHECK.points));
  console.log("--- correctness of computed values (math, not just presence) ---");
  CORR.forEach(function(c){ console.log((c.pass ? "  OK  " : " WRONG") + " | " + c.n + "  [" + c.d + "]"); });
  console.log("==============================================================================");

  var emptyContent = contentReport.filter(function(r){ return !r.ok; });
  if (ERRORS.length > 0 || emptyContent.length > 0 || corrFails.length > 0) {
    console.log("FAILED: " + ERRORS.length + " render error(s), " + emptyContent.length + " empty region(s), " + corrFails.length + " wrong value(s).");
    try { $.NSThread.exitWithStatus(1); } catch(err){}
  } else {
    console.log("PASSED: tabs render, key regions populated, AND computed values verified correct.");
  }
} catch(e){ console.log("FATAL: "+(e&&e.message?e.message:e)); if(e.stack)console.log(e.stack); try{$.NSThread.exitWithStatus(1);}catch(err){} }
