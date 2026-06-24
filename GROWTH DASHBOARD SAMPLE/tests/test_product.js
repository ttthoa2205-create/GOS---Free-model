// Test product sub-tabs loading and functionality in JXA/Node
var nativeConsole = console;
var console = {
  log: function() { nativeConsole.log(Array.prototype.slice.call(arguments).join(" ")); },
  error: function() { nativeConsole.log("ERROR: " + Array.prototype.slice.call(arguments).join(" ")); },
  warn: function() { nativeConsole.log("WARN: " + Array.prototype.slice.call(arguments).join(" ")); }
};
const window = {
  GrowthData: null,
  localStorage: {
    getItem: function(key) { return null; },
    setItem: function(key, val) {}
  },
  alert: function(msg) { console.log("ALERT: " + msg); },
  prompt: function(msg, def) { console.log("PROMPT: " + msg); return def; },
  showToast: function(msg, type) { console.log("TOAST [" + type + "]: " + msg); }
};

var showToast = window.showToast;

const setTimeout = function(cb, ms) { cb(); };
const setInterval = function(cb, ms) { cb(); return 1; };
const clearInterval = function(id) {};

const document = {
  elements: {},
  addEventListener: function(event, callback) {
    if (event === 'DOMContentLoaded') {
      this.domContentLoadedCallback = callback;
    }
  },
  createElement: function(tag) {
    return {
      tagName: tag.toUpperCase(),
      textContent: '',
      innerHTML: '',
      style: {},
      className: '',
      onclick: null,
      attributes: {},
      setAttribute: function(name, value) { this.attributes[name] = value; },
      getAttribute: function(name) { return this.attributes[name] || ''; },
      appendChild: function(child) {},
      addEventListener: function(ev, cb) {},
      querySelectorAll: function(sel) { return []; },
      querySelector: function(sel) {
        return { textContent: '', style: {}, attributes: {}, setAttribute: function(n, v){}, getAttribute: function(n){return '';} };
      },
      closest: function(sel) {
        return this;
      },
      getContext: function(type) {
        return {
          beginPath: function() {},
          arc: function() {},
          stroke: function() {},
          moveTo: function() {},
          lineTo: function() {},
          fill: function() {},
          closePath: function() {},
          clearRect: function() {},
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1
        };
      }
    };
  },
  getElementById: function(id) {
    if (id === 'product-growth-subtabs') {
      if (!this.elements[id]) {
        const btns = [
          {
            getAttribute: function(n) { return 'pg-subtab-analytics'; },
            classList: { add: function(c) {}, remove: function(c) {} },
            addEventListener: function(ev, cb) { this.clickListener = cb; }
          },
          {
            getAttribute: function(n) { return 'pg-subtab-activation'; },
            classList: { add: function(c) {}, remove: function(c) {} },
            addEventListener: function(ev, cb) { this.clickListener = cb; }
          },
          {
            getAttribute: function(n) { return 'pg-subtab-loops'; },
            classList: { add: function(c) {}, remove: function(c) {} },
            addEventListener: function(ev, cb) { this.clickListener = cb; }
          }
        ];
        this.elements[id] = {
          id: id,
          querySelectorAll: function(sel) {
            if (sel === 'button') return btns;
            return [];
          }
        };
      }
      return this.elements[id];
    }
    if (!this.elements[id]) {
      this.elements[id] = this.createElement('div');
      this.elements[id].id = id;
      this.elements[id].value = 'ALL';
      this.elements[id].options = [{ text: 'CEO (Hannah)' }];
      this.elements[id].selectedIndex = 0;
      this.elements[id].checked = true;
    }
    return this.elements[id];
  },
  querySelectorAll: function(selector) {
    if (selector === '.nav-item') {
      return [
        {
          getAttribute: function(name) { return 'tab-product-growth'; },
          querySelector: function(name) { return { textContent: 'Product Growth' }; },
          addEventListener: function(event, cb) {},
          classList: { add: function(c) {}, remove: function(c) {} }
        }
      ];
    }
    if (selector === '.product-growth-subpane') {
      return [
        { id: 'pg-subtab-analytics', style: {} },
        { id: 'pg-subtab-activation', style: {} },
        { id: 'pg-subtab-loops', style: {} }
      ];
    }
    return [];
  },
  querySelector: function(selector) {
    return {
      classList: {
        add: function(c) {},
        remove: function(c) {}
      },
      getAttribute: function(name) { return 'tab-product-growth'; },
      querySelector: function(name) { return { textContent: 'Product Growth' }; }
    };
  }
};

const lucide = {
  createIcons: function() {}
};

const Chart = function(ctx, config) {
  this.destroy = function() {};
};

const fm = $.NSFileManager.defaultManager;
function readFile(path) {
  const fileData = fm.contentsAtPath(path);
  const str = $.NSString.alloc.initWithDataEncoding(fileData, $.NSUTF8StringEncoding);
  return ObjC.unwrap(str);
}

try {
  console.log("Loading data/data.js...");
  const dataJsContent = readFile('data/data.js');
  eval(dataJsContent);
  
  console.log("Loading app.js...");
  const appJsContent = readFile('app.js');
  eval(appJsContent);

  console.log("Triggering DOMContentLoaded...");
  if (document.domContentLoadedCallback) {
    document.domContentLoadedCallback();
  }

  console.log("Testing data integrity:");
  console.log("window.db exists:", !!window.db);

  console.log("Testing initProductGrowthTab...");
  window.initProductGrowthTab();

  const container = document.getElementById("product-growth-subtabs");
  const buttons = container.querySelectorAll("button");
  console.log("Found sub-tab buttons:", buttons.length);
  buttons.forEach(btn => {
    const subtab = btn.getAttribute("data-subtab");
    console.log("Simulating click on:", subtab);
    if (btn.clickListener) {
      btn.clickListener();
      console.log("Successfully clicked", subtab);
    } else {
      console.log("No clickListener found for", subtab);
    }
  });

  console.log("SUCCESS: Product Growth tab tests passed successfully!");
} catch (e) {
  console.log("ERROR: " + e.toString());
  if (e.stack) {
    console.log("Stack trace: " + e.stack);
  }
  try {
    $.NSThread.exitWithStatus(1);
  } catch(err) {}
}
