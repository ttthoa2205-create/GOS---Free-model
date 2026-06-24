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
  prompt: function(msg, def) { console.log("PROMPT: " + msg); return def; }
};

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
    if (!this.elements[id]) {
      this.elements[id] = this.createElement('div');
      this.elements[id].id = id;
      this.elements[id].value = 'CUST-0007';
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
          getAttribute: function(name) { return 'tab-executive'; },
          querySelector: function(name) { return { textContent: 'Executive Overview' }; },
          addEventListener: function(event, cb) {},
          classList: { add: function(c) {}, remove: function(c) {} }
        }
      ];
    }
    if (selector === '.playbook-tab') {
      return [];
    }
    return [];
  },
  querySelector: function(selector) {
    return {
      classList: {
        add: function(c) {},
        remove: function(c) {}
      },
      getAttribute: function(name) { return 'tab-executive'; },
      querySelector: function(name) { return { textContent: 'Executive Overview' }; }
    };
  }
};

const lucide = {
  createIcons: function() {}
};

const Chart = function(ctx, config) {
  this.destroy = function() {};
};

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
    console.log("SUCCESS: DOMContentLoaded callback executed successfully without errors!");
  } else {
    console.log("WARNING: DOMContentLoaded callback not registered.");
  }
} catch (e) {
  console.log("ERROR: " + e.toString());
  if (e.stack) {
    console.log("Stack trace: " + e.stack);
  }
  // Exit with error status
  try {
    $.NSThread.exitWithStatus(1);
  } catch(err) {}
}
