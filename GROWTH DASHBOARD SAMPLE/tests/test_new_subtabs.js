// Test script for new subtabs synchronization
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

const setTimeout = function(cb, ms) { cb(); };
const setInterval = function(cb, ms) { cb(); return 1; };
const clearInterval = function(id) {};
var showToast = window.showToast;

// Mock DOM elements database
const mockElements = {};

function createMockElement(tag, id = '') {
  const el = {
    tagName: tag.toUpperCase(),
    id: id,
    textContent: '',
    innerHTML: '',
    style: {},
    className: '',
    onclick: null,
    listeners: {},
    attributes: {},
    setAttribute: function(name, value) { this.attributes[name] = value; },
    getAttribute: function(name) { return this.attributes[name] || ''; },
    appendChild: function(child) {},
    click: function() {
      if (this.onclick) this.onclick();
      if (this.listeners && this.listeners.click) {
        this.listeners.click.forEach(cb => cb({ target: this }));
      }
    },
    classList: {
      add: function(c) {},
      remove: function(c) {}
    },
    addEventListener: function(ev, cb) {
      if (!this.listeners[ev]) this.listeners[ev] = [];
      this.listeners[ev].push(cb);
    },
    querySelectorAll: function(sel) {
      if (sel === 'button') {
        return this.buttons || [];
      }
      return [];
    },
    querySelector: function(sel) {
      return createMockElement('div');
    },
    closest: function(sel) { return this; },
    reset: function() {}
  };
  return el;
}

const document = {
  elements: mockElements,
  addEventListener: function(event, callback) {
    if (event === 'DOMContentLoaded') {
      this.domContentLoadedCallback = callback;
    }
  },
  createElement: function(tag) {
    return createMockElement(tag);
  },
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = createMockElement('div', id);
      this.elements[id].value = 'ALL';
      this.elements[id].options = [{ text: 'CEO (Hannah)' }];
      this.elements[id].selectedIndex = 0;
      this.elements[id].checked = true;
    }
    return this.elements[id];
  },
  querySelectorAll: function(selector) {
    if (selector === '.nav-item') {
      if (!this.navItems) {
        const item = createMockElement('div');
        item.setAttribute('data-tab', 'tab-team-ops');
        this.navItems = [item];
      }
      return this.navItems;
    }
    if (selector === '.content-ops-subpane' || selector === '.cust-journey-subpane' || selector === '.team-ops-subpane') {
      return [
        createMockElement('div', 'subtab-ops-kpi'),
        createMockElement('div', 'subtab-ops-reviews'),
        createMockElement('div', 'subtab-journey-map'),
        createMockElement('div', 'subtab-transition-matrix'),
        createMockElement('div', 'subtab-funnel-migration'),
        createMockElement('div', 'subtab-journey-attribution'),
        createMockElement('div', 'subtab-dept'),
        createMockElement('div', 'subtab-tasks')
      ];
    }
    return [];
  },
  querySelector: function(selector) {
    if (selector.indexOf('.nav-item') === 0) {
      const match = selector.match(/data-tab="([^"]+)"/);
      const tabId = match ? match[1] : '';
      if (!this.navItemMap) this.navItemMap = {};
      if (!this.navItemMap[tabId]) {
        const item = createMockElement('div');
        item.setAttribute('data-tab', tabId);
        const list = this.querySelectorAll('.nav-item');
        const found = list.find(x => x.getAttribute('data-tab') === tabId);
        if (found) return found;
        this.navItemMap[tabId] = item;
      }
      return this.navItemMap[tabId];
    }
    return createMockElement('div');
  }
};

const lucide = {
  createIcons: function() {}
};

const Chart = function(ctx, config) {
  this.destroy = function() {};
};

// Setup buttons under subtab wrappers
const contentButtons = [
  createMockElement('button'),
  createMockElement('button')
];
contentButtons[0].setAttribute('data-subtab', 'subtab-ops-kpi');
contentButtons[1].setAttribute('data-subtab', 'subtab-ops-reviews');
document.getElementById('content-ops-subtabs').buttons = contentButtons;

const journeyButtons = [
  createMockElement('button'),
  createMockElement('button'),
  createMockElement('button'),
  createMockElement('button')
];
journeyButtons[0].setAttribute('data-subtab', 'subtab-journey-map');
journeyButtons[1].setAttribute('data-subtab', 'subtab-transition-matrix');
journeyButtons[2].setAttribute('data-subtab', 'subtab-funnel-migration');
journeyButtons[3].setAttribute('data-subtab', 'subtab-journey-attribution');
document.getElementById('cust-journey-subtabs').buttons = journeyButtons;

const teamButtons = [
  createMockElement('button'),
  createMockElement('button')
];
teamButtons[0].setAttribute('data-subtab', 'subtab-dept');
teamButtons[1].setAttribute('data-subtab', 'subtab-tasks');
document.getElementById('team-ops-subtabs').buttons = teamButtons;

// Load data.js and app.js contents
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

  // Trigger DOMContentLoaded
  console.log("Triggering DOMContentLoaded...");
  if (document.domContentLoadedCallback) {
    document.domContentLoadedCallback();
  }

  console.log("Testing Content Operations sub-tabs...");
  // Simulate click on subtab-ops-reviews
  console.log("Clicking subtab-ops-reviews...");
  contentButtons[1].onclick();
  console.log("Clicked subtab-ops-reviews successfully!");

  console.log("Testing Customer Journey MTA sub-tabs...");
  // Click funnel migration
  console.log("Clicking subtab-funnel-migration...");
  journeyButtons[2].onclick();
  console.log("Clicked subtab-funnel-migration successfully!");

  console.log("Testing Team Operations sub-tabs...");
  // Activate tab to bind onclick handlers
  window.switchTab("tab-team-ops");
  // Click tasks
  console.log("Clicking subtab-tasks...");
  teamButtons[1].onclick();
  console.log("Clicked subtab-tasks successfully!");

  console.log("SUCCESS: New sub-tabs synchronization tests passed successfully!");

} catch (e) {
  console.log("ERROR: " + e.toString());
  if (e.stack) {
    console.log("Stack trace: " + e.stack);
  }
  try {
    $.NSThread.exitWithStatus(1);
  } catch(err) {}
}
