// Test script for CRUD features (Tasks and Opportunity Backlog)
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
  prompt: function(msg, def) {
    console.log("PROMPT callback: " + msg + " (returning: " + mockPromptValue + ")");
    return mockPromptValue;
  },
  confirm: function(msg) {
    console.log("CONFIRM callback: " + msg + " (returning: " + mockConfirmValue + ")");
    return mockConfirmValue;
  },
  showToast: function(msg, type) { console.log("TOAST [" + type + "]: " + msg); }
};

var mockPromptValue = "";
var mockConfirmValue = true;

const setTimeout = function(cb, ms) { cb(); };
const setInterval = function(cb, ms) { cb(); return 1; };
const clearInterval = function(id) {};
var showToast = window.showToast;
var prompt = function(msg, def) { return window.prompt(msg, def); };
var confirm = function(msg) { return window.confirm(msg); };

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
    body: { classList: { add: function(c) {}, remove: function(c) {} } },
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
  body: { classList: { add: function(c) {}, remove: function(c) {} } },
  addEventListener: function(event, callback) {
    if (event === 'DOMContentLoaded') {
      this.domContentLoadedCallback = callback;
    }
  },
  createElement: function(tag) {
    return createMockElement(tag);
  },
  getElementById: function(id) {
    if (id === "custom-prompt-modal" || id === "custom-prompt-input") {
      return null;
    }
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
      return [];
    }
    return [];
  },
  querySelector: function(selector) {
    return createMockElement('div');
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

  // Verify elements exist
  console.log("Initial tasks count:", window.db.teamTasks.length);
  console.log("Initial backlog count:", window.db.opportunityBacklog.length);

  // Toggling Customize Mode
  console.log("Clicking btn-toggle-customize to enable customizations...");
  document.getElementById("btn-toggle-customize").click();

  // Test Team Task CRUD
  console.log("Testing Team Task Edit...");
  const task = window.db.teamTasks[0];
  const taskId = task.id;
  
  // Set prompts values (task name, assignee, progress)
  // Our custom prompt handler will prompt 3 times sequentially
  let promptCount = 0;
  window.prompt = function(msg, def) {
    promptCount++;
    if (promptCount === 1) return "Updated Task Name";
    if (promptCount === 2) return "Updated Assignee";
    if (promptCount === 3) return "75"; // new progress
    return def;
  };
  
  window.editOpsTask(taskId);
  console.log("After Edit - Task name:", task.taskName);
  console.log("After Edit - Task assignee:", task.assignee);
  console.log("After Edit - Task progress:", task.progress);
  if (task.taskName !== "Updated Task Name" || task.assignee !== "Updated Assignee" || task.progress !== 75) {
    throw new Error("Task editing failed to update properties correctly.");
  }
  console.log("✅ Task editing works successfully!");

  console.log("Testing Team Task Delete...");
  const initialTaskCount = window.db.teamTasks.length;
  mockConfirmValue = true;
  window.deleteOpsTask(taskId);
  console.log("After Delete - Tasks count:", window.db.teamTasks.length);
  if (window.db.teamTasks.length !== initialTaskCount - 1) {
    throw new Error("Task deletion failed to remove task.");
  }
  console.log("✅ Task deletion works successfully!");

  // Test Backlog CRUD
  console.log("Testing Backlog Idea Edit...");
  const backlogItem = window.db.opportunityBacklog[0];
  const originalIdeaName = backlogItem.Idea;

  promptCount = 0;
  window.prompt = function(msg, def) {
    promptCount++;
    if (promptCount === 1) return "Updated Idea Name";
    if (promptCount === 2) return "Updated Owner";
    if (promptCount === 3) return "Critical"; // priority
    if (promptCount === 4) return "2026-08-01"; // ETA
    return def;
  };

  window.editBacklogIdea(originalIdeaName);
  console.log("After Edit - Backlog Idea:", backlogItem.Idea);
  console.log("After Edit - Backlog Owner:", backlogItem.Owner);
  console.log("After Edit - Backlog Priority:", backlogItem.Priority);
  console.log("After Edit - Backlog ETA:", backlogItem.ETA);
  if (backlogItem.Idea !== "Updated Idea Name" || backlogItem.Owner !== "Updated Owner" || backlogItem.Priority !== "Critical" || backlogItem.ETA !== "2026-08-01") {
    throw new Error("Backlog editing failed to update properties correctly.");
  }
  console.log("✅ Backlog editing works successfully!");

  console.log("Testing Backlog Idea Delete...");
  const initialBacklogCount = window.db.opportunityBacklog.length;
  mockConfirmValue = true;
  window.deleteBacklogIdea("Updated Idea Name");
  console.log("After Delete - Backlog count:", window.db.opportunityBacklog.length);
  if (window.db.opportunityBacklog.length !== initialBacklogCount - 1) {
    throw new Error("Backlog deletion failed to remove idea.");
  }
  console.log("✅ Backlog deletion works successfully!");

  // Test Competitor CRUD
  console.log("Testing Competitor Edit...");
  // Make sure to load market tab
  window.initMarketCompetitorTab();
  const competitor = window.db.competitorIntel.competitors[0];
  const originalCompName = competitor.name;

  promptCount = 0;
  window.prompt = function(msg, def) {
    promptCount++;
    if (promptCount === 1) return "Updated Competitor Name";
    if (promptCount === 2) return "45000"; // spend
    if (promptCount === 3) return "18"; // creatives
    if (promptCount === 4) return "Updated Offer";
    if (promptCount === 5) return "Updated Pricing";
    return def;
  };

  window.editCompetitor(originalCompName);
  console.log("After Edit - Competitor Name:", competitor.name);
  console.log("After Edit - Competitor Spend:", competitor.estSpend);
  console.log("After Edit - Competitor Creatives:", competitor.creativesCount);
  console.log("After Edit - Competitor Offer:", competitor.offer);
  console.log("After Edit - Competitor Pricing:", competitor.pricing);
  if (competitor.name !== "Updated Competitor Name" || competitor.estSpend !== 45000 || competitor.creativesCount !== 18 || competitor.offer !== "Updated Offer" || competitor.pricing !== "Updated Pricing") {
    throw new Error("Competitor editing failed to update properties correctly.");
  }
  console.log("✅ Competitor editing works successfully!");

  console.log("Testing Competitor Delete...");
  const initialCompCount = window.db.competitorIntel.competitors.length;
  mockConfirmValue = true;
  window.deleteCompetitor("Updated Competitor Name");
  console.log("After Delete - Competitor count:", window.db.competitorIntel.competitors.length);
  if (window.db.competitorIntel.competitors.length !== initialCompCount - 1) {
    throw new Error("Competitor deletion failed to remove competitor.");
  }
  console.log("✅ Competitor deletion works successfully!");

  // Test Content Review CRUD
  console.log("Testing Content Review Edit...");
  const review = window.db.contentReviewRepository[0];
  const originalRevId = review.id;

  promptCount = 0;
  window.prompt = function(msg, def) {
    promptCount++;
    if (promptCount === 1) return "Updated Creative Name";
    if (promptCount === 2) return "Updated Worked description";
    if (promptCount === 3) return "Updated Not Worked description";
    if (promptCount === 4) return "Updated Insight text";
    return def;
  };

  window.editContentReview(originalRevId);
  console.log("After Edit - Creative Name:", review.creative);
  console.log("After Edit - Worked:", review.whatWorked);
  console.log("After Edit - Not Worked:", review.whatDidNotWork);
  console.log("After Edit - Insight:", review.insight);
  if (review.creative !== "Updated Creative Name" || review.whatWorked !== "Updated Worked description" || review.whatDidNotWork !== "Updated Not Worked description" || review.insight !== "Updated Insight text") {
    throw new Error("Content Review editing failed.");
  }
  console.log("✅ Content Review editing works successfully!");

  console.log("Testing Content Review Delete...");
  const initialReviewCount = window.db.contentReviewRepository.length;
  mockConfirmValue = true;
  window.deleteContentReview(originalRevId);
  console.log("After Delete - Review count:", window.db.contentReviewRepository.length);
  if (window.db.contentReviewRepository.length !== initialReviewCount - 1) {
    throw new Error("Content Review deletion failed.");
  }
  console.log("✅ Content Review deletion works successfully!");

  // Test Content Experiment CRUD
  console.log("Testing Content Experiment Edit...");
  const experiment = window.db.contentExperimentBacklog[0];

  promptCount = 0;
  window.prompt = function(msg, def) {
    promptCount++;
    if (promptCount === 1) return "Updated Hypothesis Name";
    if (promptCount === 2) return "Updated Target Objective";
    if (promptCount === 3) return "Critical"; // priority
    if (promptCount === 4) return "Updated Owner";
    return def;
  };

  window.editContentExperiment(0);
  console.log("After Edit - Hypothesis:", experiment.hypothesis);
  console.log("After Edit - Target:", experiment.target);
  console.log("After Edit - Priority:", experiment.priority);
  console.log("After Edit - Owner:", experiment.owner);
  if (experiment.hypothesis !== "Updated Hypothesis Name" || experiment.target !== "Updated Target Objective" || experiment.priority !== "Critical" || experiment.owner !== "Updated Owner") {
    throw new Error("Content Experiment editing failed.");
  }
  console.log("✅ Content Experiment editing works successfully!");

  console.log("Testing Content Experiment Delete...");
  const initialExpCount = window.db.contentExperimentBacklog.length;
  mockConfirmValue = true;
  window.deleteContentExperiment(0);
  console.log("After Delete - Experiment count:", window.db.contentExperimentBacklog.length);
  if (window.db.contentExperimentBacklog.length !== initialExpCount - 1) {
    throw new Error("Content Experiment deletion failed.");
  }
  console.log("✅ Content Experiment deletion works successfully!");

  console.log("SUCCESS: All CRUD tests passed successfully!");

} catch (e) {
  console.log("ERROR: " + e.toString());
  if (e.stack) {
    console.log("Stack trace: " + e.stack);
  }
  try {
    $.NSThread.exitWithStatus(1);
  } catch(err) {}
}
