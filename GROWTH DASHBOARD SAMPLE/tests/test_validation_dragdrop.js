var nativeConsole = console;
var console = {
  log: function() { nativeConsole.log(Array.prototype.slice.call(arguments).join(" ")); },
  error: function() { nativeConsole.log("ERROR: " + Array.prototype.slice.call(arguments).join(" ")); },
  warn: function() { nativeConsole.log("WARN: " + Array.prototype.slice.call(arguments).join(" ")); }
};

var toastMessage = "";
var toastType = "";
var showToast = function(msg, type) {
  console.log("TOAST [" + type + "]: " + msg);
  toastMessage = msg;
  toastType = type;
};

const window = {
  GrowthData: null,
  showToast: showToast,
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

// Mock FileReader
const FileReader = function() {
  this.readAsText = function(file) {
    var self = this;
    if (self.onload) {
      self.onload({ target: { result: file.content } });
    }
  };
};

const document = {
  elements: {},
  addEventListener: function(event, callback) {
    if (event === 'DOMContentLoaded') {
      this.domContentLoadedCallback = callback;
    }
  },
  createElement: function(tag) {
    var el = {
      tagName: tag.toUpperCase(),
      textContent: '',
      innerHTML: '',
      style: { display: '' },
      className: '',
      onclick: null,
      attributes: {},
      listeners: {},
      _classes: [],
      setAttribute: function(name, value) { this.attributes[name] = value; },
      getAttribute: function(name) { return this.attributes[name] || ''; },
      appendChild: function(child) {},
      addEventListener: function(ev, cb) {
        this.listeners[ev] = cb;
      },
      click: function() {
        if (this.onclick) {
          this.onclick({ target: this });
        }
        if (this.listeners["click"]) {
          this.listeners["click"]({ target: this, preventDefault: function() {} });
        }
      },
      querySelectorAll: function(sel) {
        if (sel === "button" && this.id === "io-format") {
          if (!this._buttons) {
            var btnCsv = document.createElement("button");
            btnCsv.setAttribute("data-fmt", "csv");
            btnCsv.id = "btn-fmt-csv";
            var btnJson = document.createElement("button");
            btnJson.setAttribute("data-fmt", "json");
            btnJson.id = "btn-fmt-json";
            btnJson.classList.add("active"); // default is active json
            this._buttons = [btnCsv, btnJson];
          }
          return this._buttons;
        }
        return [];
      },
      querySelector: function(sel) {
        return null;
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
          lineWidth: 1,
          createLinearGradient: function(x0, y0, x1, y1) {
            return {
              addColorStop: function(offset, color) {}
            };
          }
        };
      }
    };
    el.classList = {
      add: function(c) {
        if (el._classes.indexOf(c) < 0) el._classes.push(c);
      },
      remove: function(c) {
        var idx = el._classes.indexOf(c);
        if (idx >= 0) el._classes.splice(idx, 1);
      },
      contains: function(c) {
        return el._classes.indexOf(c) >= 0;
      }
    };
    return el;
  },
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = this.createElement('div');
      this.elements[id].id = id;
      this.elements[id].value = '';
      this.elements[id].options = [];
      this.elements[id].selectedIndex = 0;
      this.elements[id].checked = true;
    }
    return this.elements[id];
  },
  querySelectorAll: function(selector) {
    if (selector === '.nav-item') {
      var item1 = this.getElementById("nav-item-executive");
      item1.setAttribute("data-tab", "tab-executive");
      item1.classList.add("active");
      
      var item2 = this.getElementById("nav-item-data-guide");
      item2.setAttribute("data-tab", "tab-data-guide");
      
      return [item1, item2];
    }
    return [];
  },
  querySelector: function(selector) {
    if (selector === ".nav-item.active") {
      var item1 = this.getElementById("nav-item-executive");
      if (item1.classList.contains("active")) return item1;
      var item2 = this.getElementById("nav-item-data-guide");
      if (item2.classList.contains("active")) return item2;
      return item1;
    }
    if (selector.indexOf('.nav-item[data-tab="tab-data-guide"]') >= 0) {
      return this.getElementById("nav-item-data-guide");
    }
    if (selector.indexOf('.nav-item[data-tab="tab-executive"]') >= 0) {
      return this.getElementById("nav-item-executive");
    }
    return this.getElementById("generic-selector-" + selector.replace(/[^\w]/g, ""));
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
  }

  // Switch to data-guide tab to invoke initIoSection()
  console.log("Switching tab to tab-data-guide...");
  if (window.switchTab) {
    window.switchTab("tab-data-guide");
  }

  // Retrieve elements in ioSection
  var sel = document.getElementById("io-dataset");
  var ta = document.getElementById("io-textarea");
  var status = document.getElementById("io-status");
  var btnExport = document.getElementById("io-export");
  var btnImport = document.getElementById("io-import");
  var fmtBar = document.getElementById("io-format");

  // Verify elements exist
  if (!sel || !ta || !status || !btnExport || !btnImport || !fmtBar) {
    throw new Error("Missing IO dataset elements in DOM");
  }

  console.log("\n--- Testing Row-by-Row Schema Validation (Step 5) ---");

  // Set dataset to campaigns
  sel.value = "campaigns";
  
  // Export initial data
  if (btnExport.listeners && btnExport.listeners["click"]) {
    btnExport.listeners["click"]();
  } else {
    throw new Error("Export button click listener not registered");
  }
  var exportedJson = ta.value;
  console.log("Exported data length:", exportedJson.length);
  
  // Test case 1: Valid Import
  if (btnImport.listeners && btnImport.listeners["click"]) {
    btnImport.listeners["click"]();
  } else {
    throw new Error("Import button click listener not registered");
  }
  console.log("Valid import status message:", status.textContent);
  if (status.textContent.indexOf("✓ Đã nạp") < 0) {
    throw new Error("Valid import failed. Status: " + status.textContent);
  }
  console.log("✓ Valid data import passed");

  // Test case 2: Deep row-by-row check failure
  var invalidData = JSON.parse(exportedJson);
  var targetKey = Object.keys(invalidData[0])[0];
  // Delete targetKey from row 3 (index 2)
  delete invalidData[2][targetKey];
  ta.value = JSON.stringify(invalidData);
  
  btnImport.listeners["click"]();
  console.log("Invalid import status message:", status.textContent);
  if (status.textContent.indexOf("Sai schema — Dòng 3 thiếu trường bắt buộc") < 0) {
    throw new Error("Failed to catch missing key on row 3 via DOM. Status: " + status.textContent);
  }
  console.log("✓ Deep validation correctly caught line 3 missing field '" + targetKey + "' via click simulation");

  // Test case 3: Extra fields warning
  var extraData = JSON.parse(exportedJson);
  extraData[1]["extra_weird_field"] = "hello";
  ta.value = JSON.stringify(extraData);
  
  btnImport.listeners["click"]();
  console.log("Extra field status message:", status.textContent);
  console.log("Toast message received:", toastMessage);
  if (toastMessage.indexOf("extra_weird_field") < 0) {
    throw new Error("Failed to warning of extra fields on import");
  }
  console.log("✓ Validation warning correctly reported extra fields via click simulation");

  console.log("\n--- Testing Drag & Drop file loading (Step 4) ---");

  // Verify drop listener is registered
  if (!ta.listeners || !ta.listeners["drop"]) {
    throw new Error("No drop event listener registered on #io-textarea");
  }
  console.log("✓ 'drop' event listener successfully registered on #io-textarea");

  // Mock drop event for CSV file
  var csvContent = "c_id,name,budget,channels\nCAM-01,Test Campaign,5000,Facebook";
  var mockCsvFile = { name: "campaigns_upload.csv", content: csvContent };
  var dropCsvEvent = {
    preventDefault: function() {},
    dataTransfer: {
      files: [mockCsvFile]
    }
  };
  
  // Trigger CSV drop
  ta.listeners["drop"](dropCsvEvent);
  console.log("Triggered CSV drop. Resulting ta.value length:", ta.value.length);
  if (ta.value !== csvContent) {
    throw new Error("Textarea value was not updated with CSV contents");
  }
  
  // Check active format button
  var formatButtons = fmtBar.querySelectorAll("button");
  var activeFmt = "";
  formatButtons.forEach(function(b) {
    if (b.classList.contains("active")) {
      activeFmt = b.getAttribute("data-fmt");
    }
  });
  console.log("Active format after CSV drop:", activeFmt);
  if (activeFmt !== "csv") {
    throw new Error("Active format button did not synchronize to 'csv'");
  }
  console.log("✓ CSV file drop parsed, set content, and synchronized formatting state");

  // Mock drop event for JSON file
  var jsonContent = '[{"c_id":"CAM-01","name":"Test JSON"}]';
  var mockJsonFile = { name: "campaigns_upload.json", content: jsonContent };
  var dropJsonEvent = {
    preventDefault: function() {},
    dataTransfer: {
      files: [mockJsonFile]
    }
  };

  // Trigger JSON drop
  ta.listeners["drop"](dropJsonEvent);
  console.log("Triggered JSON drop. Resulting ta.value length:", ta.value.length);
  if (ta.value !== jsonContent) {
    throw new Error("Textarea value was not updated with JSON contents");
  }
  
  // Check active format button
  activeFmt = "";
  formatButtons.forEach(function(b) {
    if (b.classList.contains("active")) {
      activeFmt = b.getAttribute("data-fmt");
    }
  });
  console.log("Active format after JSON drop:", activeFmt);
  if (activeFmt !== "json") {
    throw new Error("Active format button did not synchronize to 'json'");
  }
  console.log("✓ JSON file drop parsed, set content, and synchronized formatting state");

  console.log("\n✅ All validation and Drag & Drop tests passed successfully!");

} catch (e) {
  console.log("ERROR: " + e.toString());
  if (e.stack) {
    console.log("Stack trace: " + e.stack);
  }
  try {
    $.NSThread.exitWithStatus(1);
  } catch(err) {}
}
