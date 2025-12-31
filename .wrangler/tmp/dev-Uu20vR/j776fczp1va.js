var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x2) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: (a2, b2) => (typeof require !== "undefined" ? require : a2)[b2]
}) : x2)(function(x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir4, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x2, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count4, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd3) {
    this.#cwd = cwd3;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// .wrangler/tmp/pages-ei5W3I/functionsWorker-0.3249423294892062.mjs
import { Writable as Writable2 } from "node:stream";
import { EventEmitter as EventEmitter2 } from "node:events";
import libDefault from "events";
import libDefault2 from "util";
import libDefault3 from "crypto";
import libDefault4 from "dns";
import libDefault5 from "net";
import libDefault6 from "tls";
import libDefault7 from "path";
import libDefault8 from "stream";
import libDefault9 from "string_decoder";
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __require2 = /* @__PURE__ */ ((x2) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: /* @__PURE__ */ __name((a2, b2) => (typeof __require !== "undefined" ? __require : a2)[b2], "get")
}) : x2)(function(x2) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require22() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require2"), "__commonJS");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, "__export");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
// @__NO_SIDE_EFFECTS__
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw /* @__PURE__ */ createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedAsync(name) {
  const fn = /* @__PURE__ */ notImplemented2(name);
  fn.__promisify__ = () => /* @__PURE__ */ notImplemented2(name + ".__promisify__");
  fn.native = fn;
  return fn;
}
__name(notImplementedAsync, "notImplementedAsync");
// @__NO_SIDE_EFFECTS__
function notImplementedClass2(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass2, "notImplementedClass");
var init_utils = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(createNotImplementedError2, "createNotImplementedError");
    __name2(notImplemented2, "notImplemented");
    __name2(notImplementedAsync, "notImplementedAsync");
    __name2(notImplementedClass2, "notImplementedClass");
  }
});
var _timeOrigin2;
var _performanceNow2;
var nodeTiming2;
var PerformanceEntry2;
var PerformanceMark3;
var PerformanceMeasure2;
var PerformanceResourceTiming2;
var PerformanceObserverEntryList2;
var Performance2;
var PerformanceObserver2;
var performance2;
var init_performance = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
    nodeTiming2 = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry2 = class {
      static {
        __name(this, "PerformanceEntry");
      }
      static {
        __name2(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow2();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow2() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark3 = class PerformanceMark2 extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceMark2");
      }
      static {
        __name2(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure2 = class extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceMeasure");
      }
      static {
        __name2(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming2 = class extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      static {
        __name2(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList2 = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      static {
        __name2(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance2 = class {
      static {
        __name(this, "Performance");
      }
      static {
        __name2(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin2;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming2;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming2("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin2) {
          return _performanceNow2();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark3(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure2(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver2 = class {
      static {
        __name(this, "PerformanceObserver");
      }
      static {
        __name2(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
  }
});
var init_perf_hooks = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});
var init_performance2 = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    globalThis.performance = performance2;
    globalThis.Performance = Performance2;
    globalThis.PerformanceEntry = PerformanceEntry2;
    globalThis.PerformanceMark = PerformanceMark3;
    globalThis.PerformanceMeasure = PerformanceMeasure2;
    globalThis.PerformanceObserver = PerformanceObserver2;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
  }
});
var noop_default2;
var init_noop = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default2 = Object.assign(() => {
    }, { __unenv__: true });
  }
});
var _console2;
var _ignoreErrors2;
var _stderr2;
var _stdout2;
var log3;
var info3;
var trace3;
var debug3;
var table3;
var error3;
var warn3;
var createTask3;
var clear3;
var count3;
var countReset3;
var dir3;
var dirxml3;
var group3;
var groupEnd3;
var groupCollapsed3;
var profile3;
var profileEnd3;
var time3;
var timeEnd3;
var timeLog3;
var timeStamp3;
var Console2;
var _times2;
var _stdoutErrorHandler2;
var _stderrErrorHandler2;
var init_console = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console2 = globalThis.console;
    _ignoreErrors2 = true;
    _stderr2 = new Writable2();
    _stdout2 = new Writable2();
    log3 = _console2?.log ?? noop_default2;
    info3 = _console2?.info ?? log3;
    trace3 = _console2?.trace ?? info3;
    debug3 = _console2?.debug ?? log3;
    table3 = _console2?.table ?? log3;
    error3 = _console2?.error ?? log3;
    warn3 = _console2?.warn ?? error3;
    createTask3 = _console2?.createTask ?? /* @__PURE__ */ notImplemented2("console.createTask");
    clear3 = _console2?.clear ?? noop_default2;
    count3 = _console2?.count ?? noop_default2;
    countReset3 = _console2?.countReset ?? noop_default2;
    dir3 = _console2?.dir ?? noop_default2;
    dirxml3 = _console2?.dirxml ?? noop_default2;
    group3 = _console2?.group ?? noop_default2;
    groupEnd3 = _console2?.groupEnd ?? noop_default2;
    groupCollapsed3 = _console2?.groupCollapsed ?? noop_default2;
    profile3 = _console2?.profile ?? noop_default2;
    profileEnd3 = _console2?.profileEnd ?? noop_default2;
    time3 = _console2?.time ?? noop_default2;
    timeEnd3 = _console2?.timeEnd ?? noop_default2;
    timeLog3 = _console2?.timeLog ?? noop_default2;
    timeStamp3 = _console2?.timeStamp ?? noop_default2;
    Console2 = _console2?.Console ?? /* @__PURE__ */ notImplementedClass2("console.Console");
    _times2 = /* @__PURE__ */ new Map();
    _stdoutErrorHandler2 = noop_default2;
    _stderrErrorHandler2 = noop_default2;
  }
});
var workerdConsole2;
var assert3;
var clear22;
var context2;
var count22;
var countReset22;
var createTask22;
var debug22;
var dir22;
var dirxml22;
var error22;
var group22;
var groupCollapsed22;
var groupEnd22;
var info22;
var log22;
var profile22;
var profileEnd22;
var table22;
var time22;
var timeEnd22;
var timeLog22;
var timeStamp22;
var trace22;
var warn22;
var console_default2;
var init_console2 = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole2 = globalThis["console"];
    ({
      assert: assert3,
      clear: clear22,
      context: (
        // @ts-expect-error undocumented public API
        context2
      ),
      count: count22,
      countReset: countReset22,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask22
      ),
      debug: debug22,
      dir: dir22,
      dirxml: dirxml22,
      error: error22,
      group: group22,
      groupCollapsed: groupCollapsed22,
      groupEnd: groupEnd22,
      info: info22,
      log: log22,
      profile: profile22,
      profileEnd: profileEnd22,
      table: table22,
      time: time22,
      timeEnd: timeEnd22,
      timeLog: timeLog22,
      timeStamp: timeStamp22,
      trace: trace22,
      warn: warn22
    } = workerdConsole2);
    Object.assign(workerdConsole2, {
      Console: Console2,
      _ignoreErrors: _ignoreErrors2,
      _stderr: _stderr2,
      _stderrErrorHandler: _stderrErrorHandler2,
      _stdout: _stdout2,
      _stdoutErrorHandler: _stdoutErrorHandler2,
      _times: _times2
    });
    console_default2 = workerdConsole2;
  }
});
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default2;
  }
});
var hrtime4;
var init_hrtime = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
      return BigInt(Date.now() * 1e6);
    }, "bigint"), "bigint") });
  }
});
var ReadStream2;
var init_read_stream = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream2 = class {
      static {
        __name(this, "ReadStream");
      }
      static {
        __name2(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});
var WriteStream2;
var init_write_stream = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream2 = class {
      static {
        __name(this, "WriteStream");
      }
      static {
        __name2(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir32, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x2, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env22) {
        return 1;
      }
      hasColors(count32, env22) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});
var init_tty = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});
var NODE_VERSION2;
var init_node_version = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION2 = "22.14.0";
  }
});
var Process2;
var init_process = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process2 = class _Process extends EventEmitter2 {
      static {
        __name(this, "_Process");
      }
      static {
        __name2(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream2(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream2(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream2(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd22) {
        this.#cwd = cwd22;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION2}`;
      }
      get versions() {
        return { node: NODE_VERSION2 };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw /* @__PURE__ */ createNotImplementedError2("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw /* @__PURE__ */ createNotImplementedError2("process.getActiveResourcesInfo");
      }
      exit() {
        throw /* @__PURE__ */ createNotImplementedError2("process.exit");
      }
      reallyExit() {
        throw /* @__PURE__ */ createNotImplementedError2("process.reallyExit");
      }
      kill() {
        throw /* @__PURE__ */ createNotImplementedError2("process.kill");
      }
      abort() {
        throw /* @__PURE__ */ createNotImplementedError2("process.abort");
      }
      dlopen() {
        throw /* @__PURE__ */ createNotImplementedError2("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw /* @__PURE__ */ createNotImplementedError2("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw /* @__PURE__ */ createNotImplementedError2("process.loadEnvFile");
      }
      disconnect() {
        throw /* @__PURE__ */ createNotImplementedError2("process.disconnect");
      }
      cpuUsage() {
        throw /* @__PURE__ */ createNotImplementedError2("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw /* @__PURE__ */ createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw /* @__PURE__ */ createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw /* @__PURE__ */ createNotImplementedError2("process.initgroups");
      }
      openStdin() {
        throw /* @__PURE__ */ createNotImplementedError2("process.openStdin");
      }
      assert() {
        throw /* @__PURE__ */ createNotImplementedError2("process.assert");
      }
      binding() {
        throw /* @__PURE__ */ createNotImplementedError2("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name2(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});
var globalProcess2;
var getBuiltinModule2;
var workerdProcess2;
var isWorkerdProcessV22;
var unenvProcess2;
var exit2;
var features2;
var platform2;
var env2;
var hrtime32;
var nextTick2;
var _channel2;
var _disconnect2;
var _events2;
var _eventsCount2;
var _handleQueue2;
var _maxListeners2;
var _pendingMessage2;
var _send2;
var assert22;
var disconnect2;
var mainModule2;
var _debugEnd2;
var _debugProcess2;
var _exiting2;
var _fatalException2;
var _getActiveHandles2;
var _getActiveRequests2;
var _kill2;
var _linkedBinding2;
var _preload_modules2;
var _rawDebug2;
var _startProfilerIdleNotifier2;
var _stopProfilerIdleNotifier2;
var _tickCallback2;
var abort2;
var addListener2;
var allowedNodeEnvironmentFlags2;
var arch2;
var argv2;
var argv02;
var availableMemory2;
var binding2;
var channel2;
var chdir2;
var config2;
var connected2;
var constrainedMemory2;
var cpuUsage2;
var cwd2;
var debugPort2;
var dlopen2;
var domain2;
var emit2;
var emitWarning2;
var eventNames2;
var execArgv2;
var execPath2;
var exitCode2;
var finalization2;
var getActiveResourcesInfo2;
var getegid2;
var geteuid2;
var getgid2;
var getgroups2;
var getMaxListeners2;
var getuid2;
var hasUncaughtExceptionCaptureCallback2;
var initgroups2;
var kill2;
var listenerCount2;
var listeners2;
var loadEnvFile2;
var memoryUsage2;
var moduleLoadList2;
var off2;
var on2;
var once2;
var openStdin2;
var permission2;
var pid2;
var ppid2;
var prependListener2;
var prependOnceListener2;
var rawListeners2;
var reallyExit2;
var ref2;
var release2;
var removeAllListeners2;
var removeListener2;
var report2;
var resourceUsage2;
var send2;
var setegid2;
var seteuid2;
var setgid2;
var setgroups2;
var setMaxListeners2;
var setSourceMapsEnabled2;
var setuid2;
var setUncaughtExceptionCaptureCallback2;
var sourceMapsEnabled2;
var stderr2;
var stdin2;
var stdout2;
var throwDeprecation2;
var title2;
var traceDeprecation2;
var umask2;
var unref2;
var uptime2;
var version2;
var versions2;
var _process2;
var process_default2;
var init_process2 = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess2 = globalThis["process"];
    getBuiltinModule2 = globalProcess2.getBuiltinModule;
    workerdProcess2 = getBuiltinModule2("node:process");
    isWorkerdProcessV22 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
    unenvProcess2 = new Process2({
      env: globalProcess2.env,
      // `hrtime` is only available from workerd process v2
      hrtime: isWorkerdProcessV22 ? workerdProcess2.hrtime : hrtime4,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess2.nextTick
    });
    ({ exit: exit2, features: features2, platform: platform2 } = workerdProcess2);
    ({
      env: (
        // Always implemented by workerd
        env2
      ),
      hrtime: (
        // Only implemented in workerd v2
        hrtime32
      ),
      nextTick: (
        // Always implemented by workerd
        nextTick2
      )
    } = unenvProcess2);
    ({
      _channel: _channel2,
      _disconnect: _disconnect2,
      _events: _events2,
      _eventsCount: _eventsCount2,
      _handleQueue: _handleQueue2,
      _maxListeners: _maxListeners2,
      _pendingMessage: _pendingMessage2,
      _send: _send2,
      assert: assert22,
      disconnect: disconnect2,
      mainModule: mainModule2
    } = unenvProcess2);
    ({
      _debugEnd: (
        // @ts-expect-error `_debugEnd` is missing typings
        _debugEnd2
      ),
      _debugProcess: (
        // @ts-expect-error `_debugProcess` is missing typings
        _debugProcess2
      ),
      _exiting: (
        // @ts-expect-error `_exiting` is missing typings
        _exiting2
      ),
      _fatalException: (
        // @ts-expect-error `_fatalException` is missing typings
        _fatalException2
      ),
      _getActiveHandles: (
        // @ts-expect-error `_getActiveHandles` is missing typings
        _getActiveHandles2
      ),
      _getActiveRequests: (
        // @ts-expect-error `_getActiveRequests` is missing typings
        _getActiveRequests2
      ),
      _kill: (
        // @ts-expect-error `_kill` is missing typings
        _kill2
      ),
      _linkedBinding: (
        // @ts-expect-error `_linkedBinding` is missing typings
        _linkedBinding2
      ),
      _preload_modules: (
        // @ts-expect-error `_preload_modules` is missing typings
        _preload_modules2
      ),
      _rawDebug: (
        // @ts-expect-error `_rawDebug` is missing typings
        _rawDebug2
      ),
      _startProfilerIdleNotifier: (
        // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
        _startProfilerIdleNotifier2
      ),
      _stopProfilerIdleNotifier: (
        // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
        _stopProfilerIdleNotifier2
      ),
      _tickCallback: (
        // @ts-expect-error `_tickCallback` is missing typings
        _tickCallback2
      ),
      abort: abort2,
      addListener: addListener2,
      allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
      arch: arch2,
      argv: argv2,
      argv0: argv02,
      availableMemory: availableMemory2,
      binding: (
        // @ts-expect-error `binding` is missing typings
        binding2
      ),
      channel: channel2,
      chdir: chdir2,
      config: config2,
      connected: connected2,
      constrainedMemory: constrainedMemory2,
      cpuUsage: cpuUsage2,
      cwd: cwd2,
      debugPort: debugPort2,
      dlopen: dlopen2,
      domain: (
        // @ts-expect-error `domain` is missing typings
        domain2
      ),
      emit: emit2,
      emitWarning: emitWarning2,
      eventNames: eventNames2,
      execArgv: execArgv2,
      execPath: execPath2,
      exitCode: exitCode2,
      finalization: finalization2,
      getActiveResourcesInfo: getActiveResourcesInfo2,
      getegid: getegid2,
      geteuid: geteuid2,
      getgid: getgid2,
      getgroups: getgroups2,
      getMaxListeners: getMaxListeners2,
      getuid: getuid2,
      hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
      initgroups: (
        // @ts-expect-error `initgroups` is missing typings
        initgroups2
      ),
      kill: kill2,
      listenerCount: listenerCount2,
      listeners: listeners2,
      loadEnvFile: loadEnvFile2,
      memoryUsage: memoryUsage2,
      moduleLoadList: (
        // @ts-expect-error `moduleLoadList` is missing typings
        moduleLoadList2
      ),
      off: off2,
      on: on2,
      once: once2,
      openStdin: (
        // @ts-expect-error `openStdin` is missing typings
        openStdin2
      ),
      permission: permission2,
      pid: pid2,
      ppid: ppid2,
      prependListener: prependListener2,
      prependOnceListener: prependOnceListener2,
      rawListeners: rawListeners2,
      reallyExit: (
        // @ts-expect-error `reallyExit` is missing typings
        reallyExit2
      ),
      ref: ref2,
      release: release2,
      removeAllListeners: removeAllListeners2,
      removeListener: removeListener2,
      report: report2,
      resourceUsage: resourceUsage2,
      send: send2,
      setegid: setegid2,
      seteuid: seteuid2,
      setgid: setgid2,
      setgroups: setgroups2,
      setMaxListeners: setMaxListeners2,
      setSourceMapsEnabled: setSourceMapsEnabled2,
      setuid: setuid2,
      setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
      sourceMapsEnabled: sourceMapsEnabled2,
      stderr: stderr2,
      stdin: stdin2,
      stdout: stdout2,
      throwDeprecation: throwDeprecation2,
      title: title2,
      traceDeprecation: traceDeprecation2,
      umask: umask2,
      unref: unref2,
      uptime: uptime2,
      version: version2,
      versions: versions2
    } = isWorkerdProcessV22 ? workerdProcess2 : unenvProcess2);
    _process2 = {
      abort: abort2,
      addListener: addListener2,
      allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
      hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
      setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
      loadEnvFile: loadEnvFile2,
      sourceMapsEnabled: sourceMapsEnabled2,
      arch: arch2,
      argv: argv2,
      argv0: argv02,
      chdir: chdir2,
      config: config2,
      connected: connected2,
      constrainedMemory: constrainedMemory2,
      availableMemory: availableMemory2,
      cpuUsage: cpuUsage2,
      cwd: cwd2,
      debugPort: debugPort2,
      dlopen: dlopen2,
      disconnect: disconnect2,
      emit: emit2,
      emitWarning: emitWarning2,
      env: env2,
      eventNames: eventNames2,
      execArgv: execArgv2,
      execPath: execPath2,
      exit: exit2,
      finalization: finalization2,
      features: features2,
      getBuiltinModule: getBuiltinModule2,
      getActiveResourcesInfo: getActiveResourcesInfo2,
      getMaxListeners: getMaxListeners2,
      hrtime: hrtime32,
      kill: kill2,
      listeners: listeners2,
      listenerCount: listenerCount2,
      memoryUsage: memoryUsage2,
      nextTick: nextTick2,
      on: on2,
      off: off2,
      once: once2,
      pid: pid2,
      platform: platform2,
      ppid: ppid2,
      prependListener: prependListener2,
      prependOnceListener: prependOnceListener2,
      rawListeners: rawListeners2,
      release: release2,
      removeAllListeners: removeAllListeners2,
      removeListener: removeListener2,
      report: report2,
      resourceUsage: resourceUsage2,
      setMaxListeners: setMaxListeners2,
      setSourceMapsEnabled: setSourceMapsEnabled2,
      stderr: stderr2,
      stdin: stdin2,
      stdout: stdout2,
      title: title2,
      throwDeprecation: throwDeprecation2,
      traceDeprecation: traceDeprecation2,
      umask: umask2,
      uptime: uptime2,
      version: version2,
      versions: versions2,
      // @ts-expect-error old API
      domain: domain2,
      initgroups: initgroups2,
      moduleLoadList: moduleLoadList2,
      reallyExit: reallyExit2,
      openStdin: openStdin2,
      assert: assert22,
      binding: binding2,
      send: send2,
      exitCode: exitCode2,
      channel: channel2,
      getegid: getegid2,
      geteuid: geteuid2,
      getgid: getgid2,
      getgroups: getgroups2,
      getuid: getuid2,
      setegid: setegid2,
      seteuid: seteuid2,
      setgid: setgid2,
      setgroups: setgroups2,
      setuid: setuid2,
      permission: permission2,
      mainModule: mainModule2,
      _events: _events2,
      _eventsCount: _eventsCount2,
      _exiting: _exiting2,
      _maxListeners: _maxListeners2,
      _debugEnd: _debugEnd2,
      _debugProcess: _debugProcess2,
      _fatalException: _fatalException2,
      _getActiveHandles: _getActiveHandles2,
      _getActiveRequests: _getActiveRequests2,
      _kill: _kill2,
      _preload_modules: _preload_modules2,
      _rawDebug: _rawDebug2,
      _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
      _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
      _tickCallback: _tickCallback2,
      _disconnect: _disconnect2,
      _handleQueue: _handleQueue2,
      _pendingMessage: _pendingMessage2,
      _channel: _channel2,
      _send: _send2,
      _linkedBinding: _linkedBinding2
    };
    process_default2 = _process2;
  }
});
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default2;
  }
});
async function onRequest(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const limit = parseInt(url.searchParams.get("limit") || "500", 10);
    const stateFilter = url.searchParams.get("state")?.toUpperCase();
    let query = `
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.state_code as state,
        e.level,
        e.lat,
        e.lng,
        e.type,
        e.committee_name as committee,
        e.description,
        e.source_url as detailsUrl,
        e.scraped_at as scrapedAt
      FROM events e
      WHERE e.date >= date('now')
    `;
    const params = [];
    if (stateFilter) {
      query += ` AND e.state_code = ?`;
      params.push(stateFilter);
      query += ` ORDER BY e.date ASC, e.time ASC LIMIT ?`;
    } else {
      query += ` ORDER BY (SELECT COUNT(*) FROM event_bills WHERE event_id = e.id) DESC, e.date ASC, e.time ASC LIMIT ?`;
    }
    params.push(limit);
    const { results: events } = await env22.DB.prepare(query).bind(...params).all();
    if (events.length > 0) {
      const eventIds = events.map((e) => `'${e.id}'`).join(",");
      const billsMap = /* @__PURE__ */ new Map();
      const tagsMap = /* @__PURE__ */ new Map();
      for (const event of events) {
        billsMap.set(event.id, []);
        tagsMap.set(event.id, []);
      }
      const { results: allBills } = await env22.DB.prepare(`
        SELECT 
          eb.event_id,
          b.bill_number as number,
          b.title,
          b.url,
          b.summary
        FROM event_bills eb
        INNER JOIN bills b ON eb.bill_id = b.id
        WHERE eb.event_id IN (${eventIds})
        ORDER BY eb.event_id, b.bill_number
      `).all();
      const { results: allTags } = await env22.DB.prepare(`
        SELECT event_id, tag
        FROM event_tags
        WHERE event_id IN (${eventIds})
        ORDER BY event_id, tag
      `).all();
      for (const bill of allBills || []) {
        if (billsMap.has(bill.event_id)) {
          billsMap.get(bill.event_id).push(bill);
        }
      }
      for (const tagRow of allTags || []) {
        if (tagsMap.has(tagRow.event_id)) {
          tagsMap.get(tagRow.event_id).push(tagRow.tag);
        }
      }
      for (const event of events) {
        event.bills = billsMap.get(event.id) || [];
        event.tags = tagsMap.get(event.id) || [];
      }
    }
    return new Response(JSON.stringify({ events }), {
      headers: corsHeaders
    });
  } catch (error32) {
    console.error("Error:", error32);
    return new Response(JSON.stringify({
      error: "Failed to fetch events",
      message: error32.message,
      stack: error32.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest, "onRequest");
var init_admin_events = __esm({
  "api/admin-events.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest, "onRequest");
  }
});
function ha(r) {
  return 0;
}
__name(ha, "ha");
function Yt(r, e = false) {
  let { protocol: t } = new URL(r), n = "http:" + r.substring(
    t.length
  ), { username: i, password: s, host: o, hostname: u, port: c, pathname: l, search: f, searchParams: y, hash: g } = new URL(
    n
  );
  s = decodeURIComponent(s), i = decodeURIComponent(i), l = decodeURIComponent(l);
  let A = i + ":" + s, C = e ? Object.fromEntries(y.entries()) : f;
  return {
    href: r,
    protocol: t,
    auth: A,
    username: i,
    password: s,
    host: o,
    hostname: u,
    port: c,
    pathname: l,
    search: f,
    query: C,
    hash: g
  };
}
__name(Yt, "Yt");
function Xe(r) {
  let e = 1779033703, t = 3144134277, n = 1013904242, i = 2773480762, s = 1359893119, o = 2600822924, u = 528734635, c = 1541459225, l = 0, f = 0, y = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ], g = a((I, w) => I >>> w | I << 32 - w, "rrot"), A = new Uint32Array(64), C = new Uint8Array(64), D = a(() => {
    for (let R = 0, j = 0; R < 16; R++, j += 4) A[R] = C[j] << 24 | C[j + 1] << 16 | C[j + 2] << 8 | C[j + 3];
    for (let R = 16; R < 64; R++) {
      let j = g(A[R - 15], 7) ^ g(A[R - 15], 18) ^ A[R - 15] >>> 3, le = g(
        A[R - 2],
        17
      ) ^ g(A[R - 2], 19) ^ A[R - 2] >>> 10;
      A[R] = A[R - 16] + j + A[R - 7] + le | 0;
    }
    let I = e, w = t, Z = n, W = i, J = s, X = o, se = u, oe = c;
    for (let R = 0; R < 64; R++) {
      let j = g(J, 6) ^ g(J, 11) ^ g(J, 25), le = J & X ^ ~J & se, de = oe + j + le + y[R] + A[R] | 0, We = g(I, 2) ^ g(
        I,
        13
      ) ^ g(I, 22), fe = I & w ^ I & Z ^ w & Z, _e = We + fe | 0;
      oe = se, se = X, X = J, J = W + de | 0, W = Z, Z = w, w = I, I = de + _e | 0;
    }
    e = e + I | 0, t = t + w | 0, n = n + Z | 0, i = i + W | 0, s = s + J | 0, o = o + X | 0, u = u + se | 0, c = c + oe | 0, f = 0;
  }, "process"), Y = a((I) => {
    typeof I == "string" && (I = new TextEncoder().encode(I));
    for (let w = 0; w < I.length; w++) C[f++] = I[w], f === 64 && D();
    l += I.length;
  }, "add"), P = a(() => {
    if (C[f++] = 128, f == 64 && D(), f + 8 > 64) {
      for (; f < 64; ) C[f++] = 0;
      D();
    }
    for (; f < 58; ) C[f++] = 0;
    let I = l * 8;
    C[f++] = I / 1099511627776 & 255, C[f++] = I / 4294967296 & 255, C[f++] = I >>> 24, C[f++] = I >>> 16 & 255, C[f++] = I >>> 8 & 255, C[f++] = I & 255, D();
    let w = new Uint8Array(
      32
    );
    return w[0] = e >>> 24, w[1] = e >>> 16 & 255, w[2] = e >>> 8 & 255, w[3] = e & 255, w[4] = t >>> 24, w[5] = t >>> 16 & 255, w[6] = t >>> 8 & 255, w[7] = t & 255, w[8] = n >>> 24, w[9] = n >>> 16 & 255, w[10] = n >>> 8 & 255, w[11] = n & 255, w[12] = i >>> 24, w[13] = i >>> 16 & 255, w[14] = i >>> 8 & 255, w[15] = i & 255, w[16] = s >>> 24, w[17] = s >>> 16 & 255, w[18] = s >>> 8 & 255, w[19] = s & 255, w[20] = o >>> 24, w[21] = o >>> 16 & 255, w[22] = o >>> 8 & 255, w[23] = o & 255, w[24] = u >>> 24, w[25] = u >>> 16 & 255, w[26] = u >>> 8 & 255, w[27] = u & 255, w[28] = c >>> 24, w[29] = c >>> 16 & 255, w[30] = c >>> 8 & 255, w[31] = c & 255, w;
  }, "digest");
  return r === void 0 ? { add: Y, digest: P } : (Y(r), P());
}
__name(Xe, "Xe");
function gu(r) {
  return crypto.getRandomValues(d.alloc(r));
}
__name(gu, "gu");
function bu(r) {
  if (r === "sha256") return { update: a(function(e) {
    return { digest: a(
      function() {
        return d.from(Xe(e));
      },
      "digest"
    ) };
  }, "update") };
  if (r === "md5") return { update: a(function(e) {
    return {
      digest: a(function() {
        return typeof e == "string" ? et.hashStr(e) : et.hashByteArray(e);
      }, "digest")
    };
  }, "update") };
  throw new Error(`Hash type '${r}' not supported`);
}
__name(bu, "bu");
function vu(r, e) {
  if (r !== "sha256") throw new Error(`Only sha256 is supported (requested: '${r}')`);
  return { update: a(function(t) {
    return { digest: a(
      function() {
        typeof e == "string" && (e = new TextEncoder().encode(e)), typeof t == "string" && (t = new TextEncoder().encode(
          t
        ));
        let n = e.length;
        if (n > 64) e = Xe(e);
        else if (n < 64) {
          let c = new Uint8Array(64);
          c.set(e), e = c;
        }
        let i = new Uint8Array(
          64
        ), s = new Uint8Array(64);
        for (let c = 0; c < 64; c++) i[c] = 54 ^ e[c], s[c] = 92 ^ e[c];
        let o = new Uint8Array(t.length + 64);
        o.set(i, 0), o.set(t, 64);
        let u = new Uint8Array(96);
        return u.set(s, 0), u.set(Xe(o), 64), d.from(Xe(u));
      },
      "digest"
    ) };
  }, "update") };
}
__name(vu, "vu");
function ju(...r) {
  return r.join("/");
}
__name(ju, "ju");
function Hu(r, e) {
  e(new Error("No filesystem"));
}
__name(Hu, "Hu");
function $c({ socket: r, servername: e }) {
  return r.startTls(e), r;
}
__name($c, "$c");
function Ea(r, { alphabet: e, scratchArr: t } = {}) {
  if (!He) if (He = new Uint16Array(256), wt = new Uint16Array(256), xi) for (let C = 0; C < 256; C++) He[C] = yt[C & 15] << 8 | yt[C >>> 4], wt[C] = mt[C & 15] << 8 | mt[C >>> 4];
  else for (let C = 0; C < 256; C++) He[C] = yt[C & 15] | yt[C >>> 4] << 8, wt[C] = mt[C & 15] | mt[C >>> 4] << 8;
  r.byteOffset % 4 !== 0 && (r = new Uint8Array(r));
  let n = r.length, i = n >>> 1, s = n >>> 2, o = t || new Uint16Array(n), u = new Uint32Array(
    r.buffer,
    r.byteOffset,
    s
  ), c = new Uint32Array(o.buffer, o.byteOffset, i), l = e === "upper" ? wt : He, f = 0, y = 0, g;
  if (xi)
    for (; f < s; ) g = u[f++], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255];
  else for (; f < s; )
    g = u[f++], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255];
  for (f <<= 2; f < n; ) o[f] = l[r[f++]];
  return xa.decode(o.subarray(0, n));
}
__name(Ea, "Ea");
function Aa(r, e = {}) {
  let t = "", n = r.length, i = va >>> 1, s = Math.ceil(n / i), o = new Uint16Array(s > 1 ? i : n);
  for (let u = 0; u < s; u++) {
    let c = u * i, l = c + i;
    t += Ea(r.subarray(c, l), ba(ga(
      {},
      e
    ), { scratchArr: o }));
  }
  return t;
}
__name(Aa, "Aa");
function Ei(r, e = {}) {
  return e.alphabet !== "upper" && typeof r.toHex == "function" ? r.toHex() : Aa(r, e);
}
__name(Ei, "Ei");
function bt() {
  typeof window < "u" && typeof document < "u" && typeof console < "u" && typeof console.warn == "function" && console.warn(`          
        ************************************************************
        *                                                          *
        *  WARNING: Running SQL directly from the browser can have *
        *  security implications. Even if your database is         *
        *  protected by Row-Level Security (RLS), use it at your   *
        *  own risk. This approach is great for fast prototyping,  *
        *  but ensure proper safeguards are in place to prevent    *
        *  misuse or execution of expensive SQL queries by your    *
        *  end users.                                              *
        *                                                          *
        *  If you've assessed the risks, suppress this message     *
        *  using the disableWarningInBrowsers configuration        *
        *  parameter.                                              *
        *                                                          *
        ************************************************************`);
}
__name(bt, "bt");
function Lu(r) {
  return r instanceof d ? "\\x" + Ei(r) : r;
}
__name(Lu, "Lu");
function ss(r) {
  let { query: e, params: t } = r instanceof $e ? r.toParameterizedQuery() : r;
  return { query: e, params: t.map((n) => Lu((0, us.prepareValue)(n))) };
}
__name(ss, "ss");
function cs(r, {
  arrayMode: e,
  fullResults: t,
  fetchOptions: n,
  isolationLevel: i,
  readOnly: s,
  deferrable: o,
  authToken: u,
  disableWarningInBrowsers: c
} = {}) {
  if (!r) throw new Error("No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?");
  let l;
  try {
    l = Yt(r);
  } catch {
    throw new Error(
      "Database connection string provided to `neon()` is not a valid URL. Connection string: " + String(r)
    );
  }
  let { protocol: f, username: y, hostname: g, port: A, pathname: C } = l;
  if (f !== "postgres:" && f !== "postgresql:" || !y || !g || !C) throw new Error("Database connection string format for `neon()` should be: postgresql://user:password@host.tld/dbname?option=value");
  function D(P, ...I) {
    if (!(Array.isArray(P) && Array.isArray(P.raw) && Array.isArray(I))) throw new Error('This function can now be called only as a tagged-template function: sql`SELECT ${value}`, not sql("SELECT $1", [value], options). For a conventional function call with value placeholders ($1, $2, etc.), use sql.query("SELECT $1", [value], options).');
    return new Ce(
      Y,
      new $e(P, I)
    );
  }
  __name(D, "D");
  __name2(D, "D");
  a(D, "templateFn"), D.query = (P, I, w) => new Ce(Y, { query: P, params: I ?? [] }, w), D.unsafe = (P) => new Ge(
    P
  ), D.transaction = async (P, I) => {
    if (typeof P == "function" && (P = P(D)), !Array.isArray(P)) throw new Error(is);
    P.forEach((W) => {
      if (!(W instanceof Ce)) throw new Error(is);
    });
    let w = P.map((W) => W.queryData), Z = P.map((W) => W.opts ?? {});
    return Y(w, Z, I);
  };
  async function Y(P, I, w) {
    let { fetchEndpoint: Z, fetchFunction: W } = ce, J = Array.isArray(
      P
    ) ? { queries: P.map((ee) => ss(ee)) } : ss(P), X = n ?? {}, se = e ?? false, oe = t ?? false, R = i, j = s, le = o;
    w !== void 0 && (w.fetchOptions !== void 0 && (X = { ...X, ...w.fetchOptions }), w.arrayMode !== void 0 && (se = w.arrayMode), w.fullResults !== void 0 && (oe = w.fullResults), w.isolationLevel !== void 0 && (R = w.isolationLevel), w.readOnly !== void 0 && (j = w.readOnly), w.deferrable !== void 0 && (le = w.deferrable)), I !== void 0 && !Array.isArray(I) && I.fetchOptions !== void 0 && (X = { ...X, ...I.fetchOptions });
    let de = u;
    !Array.isArray(I) && I?.authToken !== void 0 && (de = I.authToken);
    let We = typeof Z == "function" ? Z(g, A, { jwtAuth: de !== void 0 }) : Z, fe = { "Neon-Connection-String": r, "Neon-Raw-Text-Output": "true", "Neon-Array-Mode": "true" }, _e = await Fu(de);
    _e && (fe.Authorization = `Bearer ${_e}`), Array.isArray(P) && (R !== void 0 && (fe["Neon-Batch-Isolation-Level"] = R), j !== void 0 && (fe["Neon-Batch-Read-Only"] = String(j)), le !== void 0 && (fe["Neon-Batch-Deferrable"] = String(le))), c || ce.disableWarningInBrowsers || bt();
    let ye;
    try {
      ye = await (W ?? fetch)(We, { method: "POST", body: JSON.stringify(J), headers: fe, ...X });
    } catch (ee) {
      let M = new be(
        `Error connecting to database: ${ee}`
      );
      throw M.sourceError = ee, M;
    }
    if (ye.ok) {
      let ee = await ye.json();
      if (Array.isArray(P)) {
        let M = ee.results;
        if (!Array.isArray(M)) throw new be("Neon internal error: unexpected result format");
        return M.map(($, me) => {
          let Ot = I[me] ?? {}, vo = Ot.arrayMode ?? se, xo = Ot.fullResults ?? oe;
          return os(
            $,
            { arrayMode: vo, fullResults: xo, types: Ot.types }
          );
        });
      } else {
        let M = I ?? {}, $ = M.arrayMode ?? se, me = M.fullResults ?? oe;
        return os(ee, { arrayMode: $, fullResults: me, types: M.types });
      }
    } else {
      let { status: ee } = ye;
      if (ee === 400) {
        let M = await ye.json(), $ = new be(M.message);
        for (let me of Ru) $[me] = M[me] ?? void 0;
        throw $;
      } else {
        let M = await ye.text();
        throw new be(
          `Server error (HTTP status ${ee}): ${M}`
        );
      }
    }
  }
  __name(Y, "Y");
  __name2(Y, "Y");
  return a(Y, "execute"), D;
}
__name(cs, "cs");
function os(r, {
  arrayMode: e,
  fullResults: t,
  types: n
}) {
  let i = new as.default(n), s = r.fields.map((c) => c.name), o = r.fields.map((c) => i.getTypeParser(
    c.dataTypeID
  )), u = e === true ? r.rows.map((c) => c.map((l, f) => l === null ? null : o[f](l))) : r.rows.map((c) => Object.fromEntries(
    c.map((l, f) => [s[f], l === null ? null : o[f](l)])
  ));
  return t ? (r.viaNeonFetch = true, r.rowAsArray = e, r.rows = u, r._parsers = o, r._types = i, r) : u;
}
__name(os, "os");
async function Fu(r) {
  if (typeof r == "string") return r;
  if (typeof r == "function") try {
    return await Promise.resolve(r());
  } catch (e) {
    let t = new be("Error getting auth token.");
    throw e instanceof Error && (t = new be(`Error getting auth token: ${e.message}`)), t;
  }
}
__name(Fu, "Fu");
function vl(r, e) {
  if (e) return { callback: e, result: void 0 };
  let t, n, i = a(function(o, u) {
    o ? t(o) : n(u);
  }, "cb"), s = new r(function(o, u) {
    n = o, t = u;
  });
  return { callback: i, result: s };
}
__name(vl, "vl");
var So;
var Ie;
var Eo;
var Ao;
var Co;
var _o;
var Io;
var a;
var G;
var T;
var ie;
var Dn;
var Se;
var O;
var E;
var Qn;
var Nn;
var ii;
var b;
var v;
var x;
var d;
var m;
var p;
var ge;
var wi;
var mi;
var yi;
var S;
var ce;
var Fe;
var gi;
var Zt;
var tr;
var rr;
var Ti;
var Bi;
var Fi;
var Mi;
var Wi;
var Hi;
var Ki;
var Zi;
var Je;
var At;
var es;
var U;
var et;
var ts;
var lr;
var fr;
var tt;
var rt;
var nt;
var ku;
var it;
var ds;
var mr;
var wr;
var gr;
var br;
var vr;
var $u;
var xr;
var ys;
var Er;
var Sr;
var ms;
var vs;
var Es;
var Cs;
var _s;
var cc;
var Is;
var Ps;
var Bt;
var Ms;
var qs;
var ln;
var Qs;
var Ws;
var js;
var Gs;
var vn;
var Vs;
var zs;
var En;
var eo;
var io;
var so;
var ol;
var oo;
var ao;
var lo;
var yo;
var Ln;
var ot;
var pa;
var da;
var ya;
var bi;
var ma;
var wa;
var vi;
var ga;
var ba;
var va;
var xi;
var xa;
var Jt;
var yt;
var mt;
var Sa;
var Si;
var He;
var wt;
var gt;
var $e;
var Xt;
var Ge;
var as;
var us;
var _t;
var be;
var is;
var Ru;
var dr;
var Ce;
var go;
var wo;
var kn;
var ut;
var bo;
var Un;
var ct;
var export_DatabaseError;
var export_defaults;
var export_escapeIdentifier;
var export_escapeLiteral;
var export_types;
var init_serverless = __esm({
  "../node_modules/@neondatabase/serverless/index.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    So = Object.create;
    Ie = Object.defineProperty;
    Eo = Object.getOwnPropertyDescriptor;
    Ao = Object.getOwnPropertyNames;
    Co = Object.getPrototypeOf;
    _o = Object.prototype.hasOwnProperty;
    Io = /* @__PURE__ */ __name2((r, e, t) => e in r ? Ie(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t, "Io");
    a = /* @__PURE__ */ __name2((r, e) => Ie(r, "name", { value: e, configurable: true }), "a");
    G = /* @__PURE__ */ __name2((r, e) => () => (r && (e = r(r = 0)), e), "G");
    T = /* @__PURE__ */ __name2((r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports), "T");
    ie = /* @__PURE__ */ __name2((r, e) => {
      for (var t in e) Ie(r, t, {
        get: e[t],
        enumerable: true
      });
    }, "ie");
    Dn = /* @__PURE__ */ __name2((r, e, t, n) => {
      if (e && typeof e == "object" || typeof e == "function") for (let i of Ao(e)) !_o.call(r, i) && i !== t && Ie(r, i, { get: /* @__PURE__ */ __name2(() => e[i], "get"), enumerable: !(n = Eo(e, i)) || n.enumerable });
      return r;
    }, "Dn");
    Se = /* @__PURE__ */ __name2((r, e, t) => (t = r != null ? So(Co(r)) : {}, Dn(e || !r || !r.__esModule ? Ie(t, "default", { value: r, enumerable: true }) : t, r)), "Se");
    O = /* @__PURE__ */ __name2((r) => Dn(Ie({}, "__esModule", { value: true }), r), "O");
    E = /* @__PURE__ */ __name2((r, e, t) => Io(r, typeof e != "symbol" ? e + "" : e, t), "E");
    Qn = T((lt) => {
      "use strict";
      p();
      lt.byteLength = Po;
      lt.toByteArray = Ro;
      lt.fromByteArray = ko;
      var ae = [], te = [], To = typeof Uint8Array < "u" ? Uint8Array : Array, qt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (Ee = 0, On = qt.length; Ee < On; ++Ee) ae[Ee] = qt[Ee], te[qt.charCodeAt(Ee)] = Ee;
      var Ee, On;
      te[45] = 62;
      te[95] = 63;
      function qn(r) {
        var e = r.length;
        if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
        var t = r.indexOf("=");
        t === -1 && (t = e);
        var n = t === e ? 0 : 4 - t % 4;
        return [t, n];
      }
      __name(qn, "qn");
      __name2(qn, "qn");
      a(qn, "getLens");
      function Po(r) {
        var e = qn(r), t = e[0], n = e[1];
        return (t + n) * 3 / 4 - n;
      }
      __name(Po, "Po");
      __name2(Po, "Po");
      a(Po, "byteLength");
      function Bo(r, e, t) {
        return (e + t) * 3 / 4 - t;
      }
      __name(Bo, "Bo");
      __name2(Bo, "Bo");
      a(Bo, "_byteLength");
      function Ro(r) {
        var e, t = qn(r), n = t[0], i = t[1], s = new To(Bo(r, n, i)), o = 0, u = i > 0 ? n - 4 : n, c;
        for (c = 0; c < u; c += 4) e = te[r.charCodeAt(c)] << 18 | te[r.charCodeAt(c + 1)] << 12 | te[r.charCodeAt(c + 2)] << 6 | te[r.charCodeAt(c + 3)], s[o++] = e >> 16 & 255, s[o++] = e >> 8 & 255, s[o++] = e & 255;
        return i === 2 && (e = te[r.charCodeAt(
          c
        )] << 2 | te[r.charCodeAt(c + 1)] >> 4, s[o++] = e & 255), i === 1 && (e = te[r.charCodeAt(c)] << 10 | te[r.charCodeAt(c + 1)] << 4 | te[r.charCodeAt(c + 2)] >> 2, s[o++] = e >> 8 & 255, s[o++] = e & 255), s;
      }
      __name(Ro, "Ro");
      __name2(Ro, "Ro");
      a(Ro, "toByteArray");
      function Lo(r) {
        return ae[r >> 18 & 63] + ae[r >> 12 & 63] + ae[r >> 6 & 63] + ae[r & 63];
      }
      __name(Lo, "Lo");
      __name2(Lo, "Lo");
      a(Lo, "tripletToBase64");
      function Fo(r, e, t) {
        for (var n, i = [], s = e; s < t; s += 3) n = (r[s] << 16 & 16711680) + (r[s + 1] << 8 & 65280) + (r[s + 2] & 255), i.push(Lo(n));
        return i.join("");
      }
      __name(Fo, "Fo");
      __name2(Fo, "Fo");
      a(Fo, "encodeChunk");
      function ko(r) {
        for (var e, t = r.length, n = t % 3, i = [], s = 16383, o = 0, u = t - n; o < u; o += s) i.push(Fo(
          r,
          o,
          o + s > u ? u : o + s
        ));
        return n === 1 ? (e = r[t - 1], i.push(ae[e >> 2] + ae[e << 4 & 63] + "==")) : n === 2 && (e = (r[t - 2] << 8) + r[t - 1], i.push(ae[e >> 10] + ae[e >> 4 & 63] + ae[e << 2 & 63] + "=")), i.join("");
      }
      __name(ko, "ko");
      __name2(ko, "ko");
      a(ko, "fromByteArray");
    });
    Nn = T((Qt) => {
      p();
      Qt.read = function(r, e, t, n, i) {
        var s, o, u = i * 8 - n - 1, c = (1 << u) - 1, l = c >> 1, f = -7, y = t ? i - 1 : 0, g = t ? -1 : 1, A = r[e + y];
        for (y += g, s = A & (1 << -f) - 1, A >>= -f, f += u; f > 0; s = s * 256 + r[e + y], y += g, f -= 8) ;
        for (o = s & (1 << -f) - 1, s >>= -f, f += n; f > 0; o = o * 256 + r[e + y], y += g, f -= 8) ;
        if (s === 0) s = 1 - l;
        else {
          if (s === c) return o ? NaN : (A ? -1 : 1) * (1 / 0);
          o = o + Math.pow(2, n), s = s - l;
        }
        return (A ? -1 : 1) * o * Math.pow(2, s - n);
      };
      Qt.write = function(r, e, t, n, i, s) {
        var o, u, c, l = s * 8 - i - 1, f = (1 << l) - 1, y = f >> 1, g = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, A = n ? 0 : s - 1, C = n ? 1 : -1, D = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
        for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, o = f) : (o = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -o)) < 1 && (o--, c *= 2), o + y >= 1 ? e += g / c : e += g * Math.pow(2, 1 - y), e * c >= 2 && (o++, c /= 2), o + y >= f ? (u = 0, o = f) : o + y >= 1 ? (u = (e * c - 1) * Math.pow(2, i), o = o + y) : (u = e * Math.pow(2, y - 1) * Math.pow(2, i), o = 0)); i >= 8; r[t + A] = u & 255, A += C, u /= 256, i -= 8) ;
        for (o = o << i | u, l += i; l > 0; r[t + A] = o & 255, A += C, o /= 256, l -= 8) ;
        r[t + A - C] |= D * 128;
      };
    });
    ii = T((Re) => {
      "use strict";
      p();
      var Nt = Qn(), Pe = Nn(), Wn = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
      Re.Buffer = h;
      Re.SlowBuffer = Qo;
      Re.INSPECT_MAX_BYTES = 50;
      var ft = 2147483647;
      Re.kMaxLength = ft;
      h.TYPED_ARRAY_SUPPORT = Mo();
      !h.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
      function Mo() {
        try {
          let r = new Uint8Array(1), e = { foo: a(function() {
            return 42;
          }, "foo") };
          return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(r, e), r.foo() === 42;
        } catch {
          return false;
        }
      }
      __name(Mo, "Mo");
      __name2(Mo, "Mo");
      a(Mo, "typedArraySupport");
      Object.defineProperty(h.prototype, "parent", { enumerable: true, get: a(function() {
        if (h.isBuffer(this)) return this.buffer;
      }, "get") });
      Object.defineProperty(h.prototype, "offset", { enumerable: true, get: a(function() {
        if (h.isBuffer(
          this
        )) return this.byteOffset;
      }, "get") });
      function he(r) {
        if (r > ft) throw new RangeError('The value "' + r + '" is invalid for option "size"');
        let e = new Uint8Array(r);
        return Object.setPrototypeOf(e, h.prototype), e;
      }
      __name(he, "he");
      __name2(he, "he");
      a(he, "createBuffer");
      function h(r, e, t) {
        if (typeof r == "number") {
          if (typeof e == "string") throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
          return $t(r);
        }
        return Gn(r, e, t);
      }
      __name(h, "h");
      __name2(h, "h");
      a(h, "Buffer");
      h.poolSize = 8192;
      function Gn(r, e, t) {
        if (typeof r == "string") return Do(r, e);
        if (ArrayBuffer.isView(r)) return Oo(r);
        if (r == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
        if (ue(r, ArrayBuffer) || r && ue(r.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (ue(r, SharedArrayBuffer) || r && ue(
          r.buffer,
          SharedArrayBuffer
        ))) return jt(r, e, t);
        if (typeof r == "number") throw new TypeError('The "value" argument must not be of type number. Received type number');
        let n = r.valueOf && r.valueOf();
        if (n != null && n !== r) return h.from(n, e, t);
        let i = qo(r);
        if (i) return i;
        if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof r[Symbol.toPrimitive] == "function") return h.from(r[Symbol.toPrimitive]("string"), e, t);
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
      }
      __name(Gn, "Gn");
      __name2(Gn, "Gn");
      a(Gn, "from");
      h.from = function(r, e, t) {
        return Gn(r, e, t);
      };
      Object.setPrototypeOf(
        h.prototype,
        Uint8Array.prototype
      );
      Object.setPrototypeOf(h, Uint8Array);
      function Vn(r) {
        if (typeof r != "number") throw new TypeError(
          '"size" argument must be of type number'
        );
        if (r < 0) throw new RangeError('The value "' + r + '" is invalid for option "size"');
      }
      __name(Vn, "Vn");
      __name2(Vn, "Vn");
      a(Vn, "assertSize");
      function Uo(r, e, t) {
        return Vn(r), r <= 0 ? he(r) : e !== void 0 ? typeof t == "string" ? he(r).fill(e, t) : he(r).fill(e) : he(r);
      }
      __name(Uo, "Uo");
      __name2(Uo, "Uo");
      a(Uo, "alloc");
      h.alloc = function(r, e, t) {
        return Uo(r, e, t);
      };
      function $t(r) {
        return Vn(r), he(r < 0 ? 0 : Gt(r) | 0);
      }
      __name($t, "$t");
      __name2($t, "$t");
      a($t, "allocUnsafe");
      h.allocUnsafe = function(r) {
        return $t(
          r
        );
      };
      h.allocUnsafeSlow = function(r) {
        return $t(r);
      };
      function Do(r, e) {
        if ((typeof e != "string" || e === "") && (e = "utf8"), !h.isEncoding(e)) throw new TypeError("Unknown encoding: " + e);
        let t = zn(r, e) | 0, n = he(t), i = n.write(
          r,
          e
        );
        return i !== t && (n = n.slice(0, i)), n;
      }
      __name(Do, "Do");
      __name2(Do, "Do");
      a(Do, "fromString");
      function Wt(r) {
        let e = r.length < 0 ? 0 : Gt(r.length) | 0, t = he(e);
        for (let n = 0; n < e; n += 1) t[n] = r[n] & 255;
        return t;
      }
      __name(Wt, "Wt");
      __name2(Wt, "Wt");
      a(Wt, "fromArrayLike");
      function Oo(r) {
        if (ue(r, Uint8Array)) {
          let e = new Uint8Array(r);
          return jt(e.buffer, e.byteOffset, e.byteLength);
        }
        return Wt(r);
      }
      __name(Oo, "Oo");
      __name2(Oo, "Oo");
      a(Oo, "fromArrayView");
      function jt(r, e, t) {
        if (e < 0 || r.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds');
        if (r.byteLength < e + (t || 0)) throw new RangeError('"length" is outside of buffer bounds');
        let n;
        return e === void 0 && t === void 0 ? n = new Uint8Array(r) : t === void 0 ? n = new Uint8Array(r, e) : n = new Uint8Array(
          r,
          e,
          t
        ), Object.setPrototypeOf(n, h.prototype), n;
      }
      __name(jt, "jt");
      __name2(jt, "jt");
      a(jt, "fromArrayBuffer");
      function qo(r) {
        if (h.isBuffer(r)) {
          let e = Gt(r.length) | 0, t = he(e);
          return t.length === 0 || r.copy(t, 0, 0, e), t;
        }
        if (r.length !== void 0) return typeof r.length != "number" || zt(r.length) ? he(0) : Wt(r);
        if (r.type === "Buffer" && Array.isArray(r.data)) return Wt(r.data);
      }
      __name(qo, "qo");
      __name2(qo, "qo");
      a(qo, "fromObject");
      function Gt(r) {
        if (r >= ft) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + ft.toString(16) + " bytes");
        return r | 0;
      }
      __name(Gt, "Gt");
      __name2(Gt, "Gt");
      a(Gt, "checked");
      function Qo(r) {
        return +r != r && (r = 0), h.alloc(+r);
      }
      __name(Qo, "Qo");
      __name2(Qo, "Qo");
      a(Qo, "SlowBuffer");
      h.isBuffer = a(function(e) {
        return e != null && e._isBuffer === true && e !== h.prototype;
      }, "isBuffer");
      h.compare = a(function(e, t) {
        if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), ue(t, Uint8Array) && (t = h.from(t, t.offset, t.byteLength)), !h.isBuffer(e) || !h.isBuffer(t)) throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
        if (e === t) return 0;
        let n = e.length, i = t.length;
        for (let s = 0, o = Math.min(n, i); s < o; ++s) if (e[s] !== t[s]) {
          n = e[s], i = t[s];
          break;
        }
        return n < i ? -1 : i < n ? 1 : 0;
      }, "compare");
      h.isEncoding = a(function(e) {
        switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      }, "isEncoding");
      h.concat = a(function(e, t) {
        if (!Array.isArray(e)) throw new TypeError(
          '"list" argument must be an Array of Buffers'
        );
        if (e.length === 0) return h.alloc(0);
        let n;
        if (t === void 0)
          for (t = 0, n = 0; n < e.length; ++n) t += e[n].length;
        let i = h.allocUnsafe(t), s = 0;
        for (n = 0; n < e.length; ++n) {
          let o = e[n];
          if (ue(o, Uint8Array)) s + o.length > i.length ? (h.isBuffer(o) || (o = h.from(o)), o.copy(i, s)) : Uint8Array.prototype.set.call(i, o, s);
          else if (h.isBuffer(o)) o.copy(i, s);
          else throw new TypeError('"list" argument must be an Array of Buffers');
          s += o.length;
        }
        return i;
      }, "concat");
      function zn(r, e) {
        if (h.isBuffer(r)) return r.length;
        if (ArrayBuffer.isView(r) || ue(r, ArrayBuffer)) return r.byteLength;
        if (typeof r != "string") throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof r
        );
        let t = r.length, n = arguments.length > 2 && arguments[2] === true;
        if (!n && t === 0) return 0;
        let i = false;
        for (; ; ) switch (e) {
          case "ascii":
          case "latin1":
          case "binary":
            return t;
          case "utf8":
          case "utf-8":
            return Ht(r).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return t * 2;
          case "hex":
            return t >>> 1;
          case "base64":
            return ni(r).length;
          default:
            if (i) return n ? -1 : Ht(r).length;
            e = ("" + e).toLowerCase(), i = true;
        }
      }
      __name(zn, "zn");
      __name2(zn, "zn");
      a(zn, "byteLength");
      h.byteLength = zn;
      function No(r, e, t) {
        let n = false;
        if ((e === void 0 || e < 0) && (e = 0), e > this.length || ((t === void 0 || t > this.length) && (t = this.length), t <= 0) || (t >>>= 0, e >>>= 0, t <= e)) return "";
        for (r || (r = "utf8"); ; ) switch (r) {
          case "hex":
            return Zo(this, e, t);
          case "utf8":
          case "utf-8":
            return Yn(this, e, t);
          case "ascii":
            return Ko(this, e, t);
          case "latin1":
          case "binary":
            return Yo(
              this,
              e,
              t
            );
          case "base64":
            return Vo(this, e, t);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return Jo(
              this,
              e,
              t
            );
          default:
            if (n) throw new TypeError("Unknown encoding: " + r);
            r = (r + "").toLowerCase(), n = true;
        }
      }
      __name(No, "No");
      __name2(No, "No");
      a(
        No,
        "slowToString"
      );
      h.prototype._isBuffer = true;
      function Ae(r, e, t) {
        let n = r[e];
        r[e] = r[t], r[t] = n;
      }
      __name(Ae, "Ae");
      __name2(Ae, "Ae");
      a(Ae, "swap");
      h.prototype.swap16 = a(function() {
        let e = this.length;
        if (e % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (let t = 0; t < e; t += 2) Ae(this, t, t + 1);
        return this;
      }, "swap16");
      h.prototype.swap32 = a(function() {
        let e = this.length;
        if (e % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (let t = 0; t < e; t += 4) Ae(this, t, t + 3), Ae(this, t + 1, t + 2);
        return this;
      }, "swap32");
      h.prototype.swap64 = a(
        function() {
          let e = this.length;
          if (e % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
          for (let t = 0; t < e; t += 8) Ae(this, t, t + 7), Ae(this, t + 1, t + 6), Ae(this, t + 2, t + 5), Ae(this, t + 3, t + 4);
          return this;
        },
        "swap64"
      );
      h.prototype.toString = a(function() {
        let e = this.length;
        return e === 0 ? "" : arguments.length === 0 ? Yn(
          this,
          0,
          e
        ) : No.apply(this, arguments);
      }, "toString");
      h.prototype.toLocaleString = h.prototype.toString;
      h.prototype.equals = a(function(e) {
        if (!h.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
        return this === e ? true : h.compare(this, e) === 0;
      }, "equals");
      h.prototype.inspect = a(function() {
        let e = "", t = Re.INSPECT_MAX_BYTES;
        return e = this.toString("hex", 0, t).replace(/(.{2})/g, "$1 ").trim(), this.length > t && (e += " ... "), "<Buffer " + e + ">";
      }, "inspect");
      Wn && (h.prototype[Wn] = h.prototype.inspect);
      h.prototype.compare = a(function(e, t, n, i, s) {
        if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), !h.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
        if (t === void 0 && (t = 0), n === void 0 && (n = e ? e.length : 0), i === void 0 && (i = 0), s === void 0 && (s = this.length), t < 0 || n > e.length || i < 0 || s > this.length) throw new RangeError("out of range index");
        if (i >= s && t >= n) return 0;
        if (i >= s) return -1;
        if (t >= n) return 1;
        if (t >>>= 0, n >>>= 0, i >>>= 0, s >>>= 0, this === e) return 0;
        let o = s - i, u = n - t, c = Math.min(o, u), l = this.slice(
          i,
          s
        ), f = e.slice(t, n);
        for (let y = 0; y < c; ++y) if (l[y] !== f[y]) {
          o = l[y], u = f[y];
          break;
        }
        return o < u ? -1 : u < o ? 1 : 0;
      }, "compare");
      function Kn(r, e, t, n, i) {
        if (r.length === 0) return -1;
        if (typeof t == "string" ? (n = t, t = 0) : t > 2147483647 ? t = 2147483647 : t < -2147483648 && (t = -2147483648), t = +t, zt(t) && (t = i ? 0 : r.length - 1), t < 0 && (t = r.length + t), t >= r.length) {
          if (i) return -1;
          t = r.length - 1;
        } else if (t < 0) if (i) t = 0;
        else return -1;
        if (typeof e == "string" && (e = h.from(
          e,
          n
        )), h.isBuffer(e)) return e.length === 0 ? -1 : jn(r, e, t, n, i);
        if (typeof e == "number") return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(r, e, t) : Uint8Array.prototype.lastIndexOf.call(r, e, t) : jn(r, [e], t, n, i);
        throw new TypeError("val must be string, number or Buffer");
      }
      __name(Kn, "Kn");
      __name2(Kn, "Kn");
      a(Kn, "bidirectionalIndexOf");
      function jn(r, e, t, n, i) {
        let s = 1, o = r.length, u = e.length;
        if (n !== void 0 && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
          if (r.length < 2 || e.length < 2) return -1;
          s = 2, o /= 2, u /= 2, t /= 2;
        }
        function c(f, y) {
          return s === 1 ? f[y] : f.readUInt16BE(y * s);
        }
        __name(c, "c");
        __name2(c, "c");
        a(c, "read");
        let l;
        if (i) {
          let f = -1;
          for (l = t; l < o; l++) if (c(r, l) === c(e, f === -1 ? 0 : l - f)) {
            if (f === -1 && (f = l), l - f + 1 === u) return f * s;
          } else f !== -1 && (l -= l - f), f = -1;
        } else for (t + u > o && (t = o - u), l = t; l >= 0; l--) {
          let f = true;
          for (let y = 0; y < u; y++) if (c(r, l + y) !== c(e, y)) {
            f = false;
            break;
          }
          if (f) return l;
        }
        return -1;
      }
      __name(jn, "jn");
      __name2(jn, "jn");
      a(jn, "arrayIndexOf");
      h.prototype.includes = a(function(e, t, n) {
        return this.indexOf(
          e,
          t,
          n
        ) !== -1;
      }, "includes");
      h.prototype.indexOf = a(function(e, t, n) {
        return Kn(this, e, t, n, true);
      }, "indexOf");
      h.prototype.lastIndexOf = a(function(e, t, n) {
        return Kn(this, e, t, n, false);
      }, "lastIndexOf");
      function Wo(r, e, t, n) {
        t = Number(t) || 0;
        let i = r.length - t;
        n ? (n = Number(n), n > i && (n = i)) : n = i;
        let s = e.length;
        n > s / 2 && (n = s / 2);
        let o;
        for (o = 0; o < n; ++o) {
          let u = parseInt(e.substr(o * 2, 2), 16);
          if (zt(u)) return o;
          r[t + o] = u;
        }
        return o;
      }
      __name(Wo, "Wo");
      __name2(Wo, "Wo");
      a(Wo, "hexWrite");
      function jo(r, e, t, n) {
        return ht(Ht(e, r.length - t), r, t, n);
      }
      __name(jo, "jo");
      __name2(jo, "jo");
      a(jo, "utf8Write");
      function Ho(r, e, t, n) {
        return ht(ra(e), r, t, n);
      }
      __name(Ho, "Ho");
      __name2(Ho, "Ho");
      a(
        Ho,
        "asciiWrite"
      );
      function $o(r, e, t, n) {
        return ht(ni(e), r, t, n);
      }
      __name($o, "$o");
      __name2($o, "$o");
      a($o, "base64Write");
      function Go(r, e, t, n) {
        return ht(
          na(e, r.length - t),
          r,
          t,
          n
        );
      }
      __name(Go, "Go");
      __name2(Go, "Go");
      a(Go, "ucs2Write");
      h.prototype.write = a(function(e, t, n, i) {
        if (t === void 0) i = "utf8", n = this.length, t = 0;
        else if (n === void 0 && typeof t == "string") i = t, n = this.length, t = 0;
        else if (isFinite(t))
          t = t >>> 0, isFinite(n) ? (n = n >>> 0, i === void 0 && (i = "utf8")) : (i = n, n = void 0);
        else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        let s = this.length - t;
        if ((n === void 0 || n > s) && (n = s), e.length > 0 && (n < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
        i || (i = "utf8");
        let o = false;
        for (; ; ) switch (i) {
          case "hex":
            return Wo(this, e, t, n);
          case "utf8":
          case "utf-8":
            return jo(this, e, t, n);
          case "ascii":
          case "latin1":
          case "binary":
            return Ho(this, e, t, n);
          case "base64":
            return $o(this, e, t, n);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return Go(this, e, t, n);
          default:
            if (o) throw new TypeError("Unknown encoding: " + i);
            i = ("" + i).toLowerCase(), o = true;
        }
      }, "write");
      h.prototype.toJSON = a(function() {
        return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
      }, "toJSON");
      function Vo(r, e, t) {
        return e === 0 && t === r.length ? Nt.fromByteArray(r) : Nt.fromByteArray(r.slice(e, t));
      }
      __name(Vo, "Vo");
      __name2(Vo, "Vo");
      a(Vo, "base64Slice");
      function Yn(r, e, t) {
        t = Math.min(r.length, t);
        let n = [], i = e;
        for (; i < t; ) {
          let s = r[i], o = null, u = s > 239 ? 4 : s > 223 ? 3 : s > 191 ? 2 : 1;
          if (i + u <= t) {
            let c, l, f, y;
            switch (u) {
              case 1:
                s < 128 && (o = s);
                break;
              case 2:
                c = r[i + 1], (c & 192) === 128 && (y = (s & 31) << 6 | c & 63, y > 127 && (o = y));
                break;
              case 3:
                c = r[i + 1], l = r[i + 2], (c & 192) === 128 && (l & 192) === 128 && (y = (s & 15) << 12 | (c & 63) << 6 | l & 63, y > 2047 && (y < 55296 || y > 57343) && (o = y));
                break;
              case 4:
                c = r[i + 1], l = r[i + 2], f = r[i + 3], (c & 192) === 128 && (l & 192) === 128 && (f & 192) === 128 && (y = (s & 15) << 18 | (c & 63) << 12 | (l & 63) << 6 | f & 63, y > 65535 && y < 1114112 && (o = y));
            }
          }
          o === null ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | o & 1023), n.push(o), i += u;
        }
        return zo(n);
      }
      __name(Yn, "Yn");
      __name2(Yn, "Yn");
      a(Yn, "utf8Slice");
      var Hn = 4096;
      function zo(r) {
        let e = r.length;
        if (e <= Hn) return String.fromCharCode.apply(String, r);
        let t = "", n = 0;
        for (; n < e; ) t += String.fromCharCode.apply(String, r.slice(n, n += Hn));
        return t;
      }
      __name(zo, "zo");
      __name2(zo, "zo");
      a(zo, "decodeCodePointsArray");
      function Ko(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i] & 127);
        return n;
      }
      __name(Ko, "Ko");
      __name2(Ko, "Ko");
      a(Ko, "asciiSlice");
      function Yo(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i]);
        return n;
      }
      __name(Yo, "Yo");
      __name2(Yo, "Yo");
      a(Yo, "latin1Slice");
      function Zo(r, e, t) {
        let n = r.length;
        (!e || e < 0) && (e = 0), (!t || t < 0 || t > n) && (t = n);
        let i = "";
        for (let s = e; s < t; ++s) i += ia[r[s]];
        return i;
      }
      __name(Zo, "Zo");
      __name2(Zo, "Zo");
      a(Zo, "hexSlice");
      function Jo(r, e, t) {
        let n = r.slice(e, t), i = "";
        for (let s = 0; s < n.length - 1; s += 2) i += String.fromCharCode(n[s] + n[s + 1] * 256);
        return i;
      }
      __name(Jo, "Jo");
      __name2(Jo, "Jo");
      a(Jo, "utf16leSlice");
      h.prototype.slice = a(function(e, t) {
        let n = this.length;
        e = ~~e, t = t === void 0 ? n : ~~t, e < 0 ? (e += n, e < 0 && (e = 0)) : e > n && (e = n), t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), t < e && (t = e);
        let i = this.subarray(e, t);
        return Object.setPrototypeOf(i, h.prototype), i;
      }, "slice");
      function q(r, e, t) {
        if (r % 1 !== 0 || r < 0) throw new RangeError("offset is not uint");
        if (r + e > t) throw new RangeError("Trying to access beyond buffer length");
      }
      __name(q, "q");
      __name2(q, "q");
      a(q, "checkOffset");
      h.prototype.readUintLE = h.prototype.readUIntLE = a(
        function(e, t, n) {
          e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
          let i = this[e], s = 1, o = 0;
          for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
          return i;
        },
        "readUIntLE"
      );
      h.prototype.readUintBE = h.prototype.readUIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(
          e,
          t,
          this.length
        );
        let i = this[e + --t], s = 1;
        for (; t > 0 && (s *= 256); ) i += this[e + --t] * s;
        return i;
      }, "readUIntBE");
      h.prototype.readUint8 = h.prototype.readUInt8 = a(
        function(e, t) {
          return e = e >>> 0, t || q(e, 1, this.length), this[e];
        },
        "readUInt8"
      );
      h.prototype.readUint16LE = h.prototype.readUInt16LE = a(function(e, t) {
        return e = e >>> 0, t || q(
          e,
          2,
          this.length
        ), this[e] | this[e + 1] << 8;
      }, "readUInt16LE");
      h.prototype.readUint16BE = h.prototype.readUInt16BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 2, this.length), this[e] << 8 | this[e + 1];
      }, "readUInt16BE");
      h.prototype.readUint32LE = h.prototype.readUInt32LE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
      }, "readUInt32LE");
      h.prototype.readUint32BE = h.prototype.readUInt32BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
      }, "readUInt32BE");
      h.prototype.readBigUInt64LE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, s = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24;
        return BigInt(i) + (BigInt(s) << BigInt(32));
      }, "readBigUInt64LE"));
      h.prototype.readBigUInt64BE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], s = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n;
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(s);
      }, "readBigUInt64BE"));
      h.prototype.readIntLE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(
          e,
          t,
          this.length
        );
        let i = this[e], s = 1, o = 0;
        for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
        return s *= 128, i >= s && (i -= Math.pow(2, 8 * t)), i;
      }, "readIntLE");
      h.prototype.readIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
        let i = t, s = 1, o = this[e + --i];
        for (; i > 0 && (s *= 256); ) o += this[e + --i] * s;
        return s *= 128, o >= s && (o -= Math.pow(2, 8 * t)), o;
      }, "readIntBE");
      h.prototype.readInt8 = a(function(e, t) {
        return e = e >>> 0, t || q(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
      }, "readInt8");
      h.prototype.readInt16LE = a(function(e, t) {
        e = e >>> 0, t || q(
          e,
          2,
          this.length
        );
        let n = this[e] | this[e + 1] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16LE");
      h.prototype.readInt16BE = a(function(e, t) {
        e = e >>> 0, t || q(e, 2, this.length);
        let n = this[e + 1] | this[e] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16BE");
      h.prototype.readInt32LE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
      }, "readInt32LE");
      h.prototype.readInt32BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
      }, "readInt32BE");
      h.prototype.readBigInt64LE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24);
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
      }, "readBigInt64LE"));
      h.prototype.readBigInt64BE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
        return (BigInt(i) << BigInt(32)) + BigInt(
          this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n
        );
      }, "readBigInt64BE"));
      h.prototype.readFloatLE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, true, 23, 4);
      }, "readFloatLE");
      h.prototype.readFloatBE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, false, 23, 4);
      }, "readFloatBE");
      h.prototype.readDoubleLE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 8, this.length), Pe.read(this, e, true, 52, 8);
      }, "readDoubleLE");
      h.prototype.readDoubleBE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 8, this.length), Pe.read(
          this,
          e,
          false,
          52,
          8
        );
      }, "readDoubleBE");
      function V(r, e, t, n, i, s) {
        if (!h.isBuffer(r)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (e > i || e < s) throw new RangeError('"value" argument is out of bounds');
        if (t + n > r.length) throw new RangeError("Index out of range");
      }
      __name(V, "V");
      __name2(V, "V");
      a(V, "checkInt");
      h.prototype.writeUintLE = h.prototype.writeUIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          V(
            this,
            e,
            t,
            n,
            u,
            0
          );
        }
        let s = 1, o = 0;
        for (this[t] = e & 255; ++o < n && (s *= 256); ) this[t + o] = e / s & 255;
        return t + n;
      }, "writeUIntLE");
      h.prototype.writeUintBE = h.prototype.writeUIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          V(this, e, t, n, u, 0);
        }
        let s = n - 1, o = 1;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) this[t + s] = e / o & 255;
        return t + n;
      }, "writeUIntBE");
      h.prototype.writeUint8 = h.prototype.writeUInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 1, 255, 0), this[t] = e & 255, t + 1;
      }, "writeUInt8");
      h.prototype.writeUint16LE = h.prototype.writeUInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeUInt16LE");
      h.prototype.writeUint16BE = h.prototype.writeUInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeUInt16BE");
      h.prototype.writeUint32LE = h.prototype.writeUInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = e & 255, t + 4;
      }, "writeUInt32LE");
      h.prototype.writeUint32BE = h.prototype.writeUInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeUInt32BE");
      function Zn(r, e, t, n, i) {
        ri(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, t;
      }
      __name(Zn, "Zn");
      __name2(Zn, "Zn");
      a(Zn, "wrtBigUInt64LE");
      function Jn(r, e, t, n, i) {
        ri(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t + 7] = s, s = s >> 8, r[t + 6] = s, s = s >> 8, r[t + 5] = s, s = s >> 8, r[t + 4] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t + 3] = o, o = o >> 8, r[t + 2] = o, o = o >> 8, r[t + 1] = o, o = o >> 8, r[t] = o, t + 8;
      }
      __name(Jn, "Jn");
      __name2(Jn, "Jn");
      a(Jn, "wrtBigUInt64BE");
      h.prototype.writeBigUInt64LE = we(a(function(e, t = 0) {
        return Zn(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
      }, "writeBigUInt64LE"));
      h.prototype.writeBigUInt64BE = we(a(function(e, t = 0) {
        return Jn(this, e, t, BigInt(0), BigInt(
          "0xffffffffffffffff"
        ));
      }, "writeBigUInt64BE"));
      h.prototype.writeIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          V(this, e, t, n, c - 1, -c);
        }
        let s = 0, o = 1, u = 0;
        for (this[t] = e & 255; ++s < n && (o *= 256); )
          e < 0 && u === 0 && this[t + s - 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntLE");
      h.prototype.writeIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          V(this, e, t, n, c - 1, -c);
        }
        let s = n - 1, o = 1, u = 0;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) e < 0 && u === 0 && this[t + s + 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntBE");
      h.prototype.writeInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = e & 255, t + 1;
      }, "writeInt8");
      h.prototype.writeInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeInt16LE");
      h.prototype.writeInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeInt16BE");
      h.prototype.writeInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), this[t] = e & 255, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4;
      }, "writeInt32LE");
      h.prototype.writeInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeInt32BE");
      h.prototype.writeBigInt64LE = we(a(function(e, t = 0) {
        return Zn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      }, "writeBigInt64LE"));
      h.prototype.writeBigInt64BE = we(
        a(function(e, t = 0) {
          return Jn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
        }, "writeBigInt64BE")
      );
      function Xn(r, e, t, n, i, s) {
        if (t + n > r.length) throw new RangeError("Index out of range");
        if (t < 0) throw new RangeError("Index out of range");
      }
      __name(Xn, "Xn");
      __name2(Xn, "Xn");
      a(Xn, "checkIEEE754");
      function ei(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || Xn(r, e, t, 4, 34028234663852886e22, -34028234663852886e22), Pe.write(r, e, t, n, 23, 4), t + 4;
      }
      __name(ei, "ei");
      __name2(ei, "ei");
      a(
        ei,
        "writeFloat"
      );
      h.prototype.writeFloatLE = a(function(e, t, n) {
        return ei(this, e, t, true, n);
      }, "writeFloatLE");
      h.prototype.writeFloatBE = a(function(e, t, n) {
        return ei(this, e, t, false, n);
      }, "writeFloatBE");
      function ti(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || Xn(r, e, t, 8, 17976931348623157e292, -17976931348623157e292), Pe.write(
          r,
          e,
          t,
          n,
          52,
          8
        ), t + 8;
      }
      __name(ti, "ti");
      __name2(ti, "ti");
      a(ti, "writeDouble");
      h.prototype.writeDoubleLE = a(function(e, t, n) {
        return ti(this, e, t, true, n);
      }, "writeDoubleLE");
      h.prototype.writeDoubleBE = a(function(e, t, n) {
        return ti(this, e, t, false, n);
      }, "writeDoubleBE");
      h.prototype.copy = a(function(e, t, n, i) {
        if (!h.isBuffer(e)) throw new TypeError("argument should be a Buffer");
        if (n || (n = 0), !i && i !== 0 && (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < n && (i = n), i === n || e.length === 0 || this.length === 0) return 0;
        if (t < 0) throw new RangeError("targetStart out of bounds");
        if (n < 0 || n >= this.length) throw new RangeError("Index out of range");
        if (i < 0) throw new RangeError("sourceEnd out of bounds");
        i > this.length && (i = this.length), e.length - t < i - n && (i = e.length - t + n);
        let s = i - n;
        return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(t, n, i) : Uint8Array.prototype.set.call(e, this.subarray(n, i), t), s;
      }, "copy");
      h.prototype.fill = a(function(e, t, n, i) {
        if (typeof e == "string") {
          if (typeof t == "string" ? (i = t, t = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== void 0 && typeof i != "string") throw new TypeError("encoding must be a string");
          if (typeof i == "string" && !h.isEncoding(i)) throw new TypeError(
            "Unknown encoding: " + i
          );
          if (e.length === 1) {
            let o = e.charCodeAt(0);
            (i === "utf8" && o < 128 || i === "latin1") && (e = o);
          }
        } else typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
        if (t < 0 || this.length < t || this.length < n) throw new RangeError("Out of range index");
        if (n <= t) return this;
        t = t >>> 0, n = n === void 0 ? this.length : n >>> 0, e || (e = 0);
        let s;
        if (typeof e == "number") for (s = t; s < n; ++s) this[s] = e;
        else {
          let o = h.isBuffer(e) ? e : h.from(
            e,
            i
          ), u = o.length;
          if (u === 0) throw new TypeError('The value "' + e + '" is invalid for argument "value"');
          for (s = 0; s < n - t; ++s) this[s + t] = o[s % u];
        }
        return this;
      }, "fill");
      var Te = {};
      function Vt(r, e, t) {
        var n;
        Te[r] = (n = class extends t {
          static {
            __name(this, "n");
          }
          static {
            __name2(this, "n");
          }
          constructor() {
            super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${r}]`, this.stack, delete this.name;
          }
          get code() {
            return r;
          }
          set code(s) {
            Object.defineProperty(
              this,
              "code",
              { configurable: true, enumerable: true, value: s, writable: true }
            );
          }
          toString() {
            return `${this.name} [${r}]: ${this.message}`;
          }
        }, a(n, "NodeError"), n);
      }
      __name(Vt, "Vt");
      __name2(Vt, "Vt");
      a(Vt, "E");
      Vt("ERR_BUFFER_OUT_OF_BOUNDS", function(r) {
        return r ? `${r} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
      }, RangeError);
      Vt(
        "ERR_INVALID_ARG_TYPE",
        function(r, e) {
          return `The "${r}" argument must be of type number. Received type ${typeof e}`;
        },
        TypeError
      );
      Vt("ERR_OUT_OF_RANGE", function(r, e, t) {
        let n = `The value of "${r}" is out of range.`, i = t;
        return Number.isInteger(t) && Math.abs(t) > 2 ** 32 ? i = $n(String(t)) : typeof t == "bigint" && (i = String(
          t
        ), (t > BigInt(2) ** BigInt(32) || t < -(BigInt(2) ** BigInt(32))) && (i = $n(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n;
      }, RangeError);
      function $n(r) {
        let e = "", t = r.length, n = r[0] === "-" ? 1 : 0;
        for (; t >= n + 4; t -= 3) e = `_${r.slice(t - 3, t)}${e}`;
        return `${r.slice(0, t)}${e}`;
      }
      __name($n, "$n");
      __name2($n, "$n");
      a($n, "addNumericalSeparator");
      function Xo(r, e, t) {
        Be(e, "offset"), (r[e] === void 0 || r[e + t] === void 0) && je(e, r.length - (t + 1));
      }
      __name(Xo, "Xo");
      __name2(Xo, "Xo");
      a(Xo, "checkBounds");
      function ri(r, e, t, n, i, s) {
        if (r > t || r < e) {
          let o = typeof e == "bigint" ? "n" : "", u;
          throw s > 3 ? e === 0 || e === BigInt(0) ? u = `>= 0${o} and < 2${o} ** ${(s + 1) * 8}${o}` : u = `>= -(2${o} ** ${(s + 1) * 8 - 1}${o}) and < 2 ** ${(s + 1) * 8 - 1}${o}` : u = `>= ${e}${o} and <= ${t}${o}`, new Te.ERR_OUT_OF_RANGE("value", u, r);
        }
        Xo(n, i, s);
      }
      __name(ri, "ri");
      __name2(ri, "ri");
      a(ri, "checkIntBI");
      function Be(r, e) {
        if (typeof r != "number") throw new Te.ERR_INVALID_ARG_TYPE(e, "number", r);
      }
      __name(Be, "Be");
      __name2(Be, "Be");
      a(Be, "validateNumber");
      function je(r, e, t) {
        throw Math.floor(r) !== r ? (Be(r, t), new Te.ERR_OUT_OF_RANGE(t || "offset", "an integer", r)) : e < 0 ? new Te.ERR_BUFFER_OUT_OF_BOUNDS() : new Te.ERR_OUT_OF_RANGE(t || "offset", `>= ${t ? 1 : 0} and <= ${e}`, r);
      }
      __name(je, "je");
      __name2(je, "je");
      a(je, "boundsError");
      var ea = /[^+/0-9A-Za-z-_]/g;
      function ta(r) {
        if (r = r.split("=")[0], r = r.trim().replace(ea, ""), r.length < 2) return "";
        for (; r.length % 4 !== 0; ) r = r + "=";
        return r;
      }
      __name(ta, "ta");
      __name2(ta, "ta");
      a(ta, "base64clean");
      function Ht(r, e) {
        e = e || 1 / 0;
        let t, n = r.length, i = null, s = [];
        for (let o = 0; o < n; ++o) {
          if (t = r.charCodeAt(o), t > 55295 && t < 57344) {
            if (!i) {
              if (t > 56319) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              } else if (o + 1 === n) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              }
              i = t;
              continue;
            }
            if (t < 56320) {
              (e -= 3) > -1 && s.push(239, 191, 189), i = t;
              continue;
            }
            t = (i - 55296 << 10 | t - 56320) + 65536;
          } else i && (e -= 3) > -1 && s.push(239, 191, 189);
          if (i = null, t < 128) {
            if ((e -= 1) < 0) break;
            s.push(t);
          } else if (t < 2048) {
            if ((e -= 2) < 0) break;
            s.push(t >> 6 | 192, t & 63 | 128);
          } else if (t < 65536) {
            if ((e -= 3) < 0) break;
            s.push(t >> 12 | 224, t >> 6 & 63 | 128, t & 63 | 128);
          } else if (t < 1114112) {
            if ((e -= 4) < 0) break;
            s.push(t >> 18 | 240, t >> 12 & 63 | 128, t >> 6 & 63 | 128, t & 63 | 128);
          } else throw new Error("Invalid code point");
        }
        return s;
      }
      __name(Ht, "Ht");
      __name2(Ht, "Ht");
      a(Ht, "utf8ToBytes");
      function ra(r) {
        let e = [];
        for (let t = 0; t < r.length; ++t) e.push(r.charCodeAt(t) & 255);
        return e;
      }
      __name(ra, "ra");
      __name2(ra, "ra");
      a(
        ra,
        "asciiToBytes"
      );
      function na(r, e) {
        let t, n, i, s = [];
        for (let o = 0; o < r.length && !((e -= 2) < 0); ++o) t = r.charCodeAt(
          o
        ), n = t >> 8, i = t % 256, s.push(i), s.push(n);
        return s;
      }
      __name(na, "na");
      __name2(na, "na");
      a(na, "utf16leToBytes");
      function ni(r) {
        return Nt.toByteArray(
          ta(r)
        );
      }
      __name(ni, "ni");
      __name2(ni, "ni");
      a(ni, "base64ToBytes");
      function ht(r, e, t, n) {
        let i;
        for (i = 0; i < n && !(i + t >= e.length || i >= r.length); ++i)
          e[i + t] = r[i];
        return i;
      }
      __name(ht, "ht");
      __name2(ht, "ht");
      a(ht, "blitBuffer");
      function ue(r, e) {
        return r instanceof e || r != null && r.constructor != null && r.constructor.name != null && r.constructor.name === e.name;
      }
      __name(ue, "ue");
      __name2(ue, "ue");
      a(ue, "isInstance");
      function zt(r) {
        return r !== r;
      }
      __name(zt, "zt");
      __name2(zt, "zt");
      a(zt, "numberIsNaN");
      var ia = (function() {
        let r = "0123456789abcdef", e = new Array(256);
        for (let t = 0; t < 16; ++t) {
          let n = t * 16;
          for (let i = 0; i < 16; ++i) e[n + i] = r[t] + r[i];
        }
        return e;
      })();
      function we(r) {
        return typeof BigInt > "u" ? sa : r;
      }
      __name(we, "we");
      __name2(we, "we");
      a(we, "defineBigIntMethod");
      function sa() {
        throw new Error("BigInt not supported");
      }
      __name(sa, "sa");
      __name2(sa, "sa");
      a(sa, "BufferBigIntNotDefined");
    });
    p = G(() => {
      "use strict";
      b = globalThis, v = globalThis.setImmediate ?? ((r) => setTimeout(r, 0)), x = globalThis.clearImmediate ?? ((r) => clearTimeout(r)), d = typeof globalThis.Buffer == "function" && typeof globalThis.Buffer.allocUnsafe == "function" ? globalThis.Buffer : ii().Buffer, m = globalThis.process ?? {};
      m.env ?? (m.env = {});
      try {
        m.nextTick(() => {
        });
      } catch {
        let e = Promise.resolve();
        m.nextTick = e.then.bind(e);
      }
    });
    ge = T((Rl, Kt) => {
      "use strict";
      p();
      var Le = typeof Reflect == "object" ? Reflect : null, si = Le && typeof Le.apply == "function" ? Le.apply : a(function(e, t, n) {
        return Function.prototype.apply.call(e, t, n);
      }, "ReflectApply"), pt;
      Le && typeof Le.ownKeys == "function" ? pt = Le.ownKeys : Object.getOwnPropertySymbols ? pt = a(function(e) {
        return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
      }, "ReflectOwnKeys") : pt = a(function(e) {
        return Object.getOwnPropertyNames(e);
      }, "ReflectOwnKeys");
      function oa(r) {
        console && console.warn && console.warn(r);
      }
      __name(oa, "oa");
      __name2(oa, "oa");
      a(
        oa,
        "ProcessEmitWarning"
      );
      var ai = Number.isNaN || a(function(e) {
        return e !== e;
      }, "NumberIsNaN");
      function B() {
        B.init.call(this);
      }
      __name(B, "B");
      __name2(B, "B");
      a(B, "EventEmitter");
      Kt.exports = B;
      Kt.exports.once = la;
      B.EventEmitter = B;
      B.prototype._events = void 0;
      B.prototype._eventsCount = 0;
      B.prototype._maxListeners = void 0;
      var oi = 10;
      function dt(r) {
        if (typeof r != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof r);
      }
      __name(dt, "dt");
      __name2(dt, "dt");
      a(dt, "checkListener");
      Object.defineProperty(B, "defaultMaxListeners", { enumerable: true, get: a(function() {
        return oi;
      }, "get"), set: a(
        function(r) {
          if (typeof r != "number" || r < 0 || ai(r)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + r + ".");
          oi = r;
        },
        "set"
      ) });
      B.init = function() {
        (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
      };
      B.prototype.setMaxListeners = a(function(e) {
        if (typeof e != "number" || e < 0 || ai(e)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");
        return this._maxListeners = e, this;
      }, "setMaxListeners");
      function ui(r) {
        return r._maxListeners === void 0 ? B.defaultMaxListeners : r._maxListeners;
      }
      __name(ui, "ui");
      __name2(ui, "ui");
      a(ui, "_getMaxListeners");
      B.prototype.getMaxListeners = a(function() {
        return ui(this);
      }, "getMaxListeners");
      B.prototype.emit = a(function(e) {
        for (var t = [], n = 1; n < arguments.length; n++) t.push(arguments[n]);
        var i = e === "error", s = this._events;
        if (s !== void 0) i = i && s.error === void 0;
        else if (!i) return false;
        if (i) {
          var o;
          if (t.length > 0 && (o = t[0]), o instanceof Error) throw o;
          var u = new Error("Unhandled error." + (o ? " (" + o.message + ")" : ""));
          throw u.context = o, u;
        }
        var c = s[e];
        if (c === void 0) return false;
        if (typeof c == "function") si(c, this, t);
        else for (var l = c.length, f = pi(c, l), n = 0; n < l; ++n) si(f[n], this, t);
        return true;
      }, "emit");
      function ci(r, e, t, n) {
        var i, s, o;
        if (dt(
          t
        ), s = r._events, s === void 0 ? (s = r._events = /* @__PURE__ */ Object.create(null), r._eventsCount = 0) : (s.newListener !== void 0 && (r.emit("newListener", e, t.listener ? t.listener : t), s = r._events), o = s[e]), o === void 0) o = s[e] = t, ++r._eventsCount;
        else if (typeof o == "function" ? o = s[e] = n ? [t, o] : [o, t] : n ? o.unshift(t) : o.push(t), i = ui(r), i > 0 && o.length > i && !o.warned) {
          o.warned = true;
          var u = new Error("Possible EventEmitter memory leak detected. " + o.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
          u.name = "MaxListenersExceededWarning", u.emitter = r, u.type = e, u.count = o.length, oa(u);
        }
        return r;
      }
      __name(ci, "ci");
      __name2(ci, "ci");
      a(ci, "_addListener");
      B.prototype.addListener = a(function(e, t) {
        return ci(this, e, t, false);
      }, "addListener");
      B.prototype.on = B.prototype.addListener;
      B.prototype.prependListener = a(function(e, t) {
        return ci(this, e, t, true);
      }, "prependListener");
      function aa() {
        if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
      }
      __name(aa, "aa");
      __name2(aa, "aa");
      a(aa, "onceWrapper");
      function li(r, e, t) {
        var n = {
          fired: false,
          wrapFn: void 0,
          target: r,
          type: e,
          listener: t
        }, i = aa.bind(n);
        return i.listener = t, n.wrapFn = i, i;
      }
      __name(li, "li");
      __name2(li, "li");
      a(li, "_onceWrap");
      B.prototype.once = a(function(e, t) {
        return dt(t), this.on(e, li(this, e, t)), this;
      }, "once");
      B.prototype.prependOnceListener = a(function(e, t) {
        return dt(t), this.prependListener(e, li(this, e, t)), this;
      }, "prependOnceListener");
      B.prototype.removeListener = a(function(e, t) {
        var n, i, s, o, u;
        if (dt(t), i = this._events, i === void 0) return this;
        if (n = i[e], n === void 0) return this;
        if (n === t || n.listener === t) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete i[e], i.removeListener && this.emit("removeListener", e, n.listener || t));
        else if (typeof n != "function") {
          for (s = -1, o = n.length - 1; o >= 0; o--) if (n[o] === t || n[o].listener === t) {
            u = n[o].listener, s = o;
            break;
          }
          if (s < 0) return this;
          s === 0 ? n.shift() : ua(n, s), n.length === 1 && (i[e] = n[0]), i.removeListener !== void 0 && this.emit("removeListener", e, u || t);
        }
        return this;
      }, "removeListener");
      B.prototype.off = B.prototype.removeListener;
      B.prototype.removeAllListeners = a(function(e) {
        var t, n, i;
        if (n = this._events, n === void 0) return this;
        if (n.removeListener === void 0) return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : n[e] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete n[e]), this;
        if (arguments.length === 0) {
          var s = Object.keys(n), o;
          for (i = 0; i < s.length; ++i) o = s[i], o !== "removeListener" && this.removeAllListeners(
            o
          );
          return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
        }
        if (t = n[e], typeof t == "function") this.removeListener(e, t);
        else if (t !== void 0) for (i = t.length - 1; i >= 0; i--) this.removeListener(e, t[i]);
        return this;
      }, "removeAllListeners");
      function fi(r, e, t) {
        var n = r._events;
        if (n === void 0) return [];
        var i = n[e];
        return i === void 0 ? [] : typeof i == "function" ? t ? [i.listener || i] : [i] : t ? ca(i) : pi(i, i.length);
      }
      __name(fi, "fi");
      __name2(fi, "fi");
      a(fi, "_listeners");
      B.prototype.listeners = a(function(e) {
        return fi(this, e, true);
      }, "listeners");
      B.prototype.rawListeners = a(function(e) {
        return fi(this, e, false);
      }, "rawListeners");
      B.listenerCount = function(r, e) {
        return typeof r.listenerCount == "function" ? r.listenerCount(e) : hi.call(r, e);
      };
      B.prototype.listenerCount = hi;
      function hi(r) {
        var e = this._events;
        if (e !== void 0) {
          var t = e[r];
          if (typeof t == "function")
            return 1;
          if (t !== void 0) return t.length;
        }
        return 0;
      }
      __name(hi, "hi");
      __name2(hi, "hi");
      a(hi, "listenerCount");
      B.prototype.eventNames = a(function() {
        return this._eventsCount > 0 ? pt(this._events) : [];
      }, "eventNames");
      function pi(r, e) {
        for (var t = new Array(e), n = 0; n < e; ++n) t[n] = r[n];
        return t;
      }
      __name(pi, "pi");
      __name2(pi, "pi");
      a(pi, "arrayClone");
      function ua(r, e) {
        for (; e + 1 < r.length; e++) r[e] = r[e + 1];
        r.pop();
      }
      __name(ua, "ua");
      __name2(ua, "ua");
      a(ua, "spliceOne");
      function ca(r) {
        for (var e = new Array(r.length), t = 0; t < e.length; ++t) e[t] = r[t].listener || r[t];
        return e;
      }
      __name(ca, "ca");
      __name2(ca, "ca");
      a(ca, "unwrapListeners");
      function la(r, e) {
        return new Promise(function(t, n) {
          function i(o) {
            r.removeListener(e, s), n(o);
          }
          __name(i, "i");
          __name2(i, "i");
          a(i, "errorListener");
          function s() {
            typeof r.removeListener == "function" && r.removeListener("error", i), t([].slice.call(arguments));
          }
          __name(s, "s");
          __name2(s, "s");
          a(s, "resolver"), di(r, e, s, { once: true }), e !== "error" && fa(r, i, { once: true });
        });
      }
      __name(la, "la");
      __name2(la, "la");
      a(la, "once");
      function fa(r, e, t) {
        typeof r.on == "function" && di(r, "error", e, t);
      }
      __name(fa, "fa");
      __name2(fa, "fa");
      a(
        fa,
        "addErrorHandlerIfEventEmitter"
      );
      function di(r, e, t, n) {
        if (typeof r.on == "function") n.once ? r.once(e, t) : r.on(e, t);
        else if (typeof r.addEventListener == "function") r.addEventListener(e, a(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function i(s) {
          n.once && r.removeEventListener(e, i), t(s);
        }, "i"), "i"), "wrapListener"));
        else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof r);
      }
      __name(di, "di");
      __name2(di, "di");
      a(di, "eventTargetAgnosticAddListener");
    });
    wi = {};
    ie(wi, { Socket: /* @__PURE__ */ __name2(() => ce, "Socket"), isIP: /* @__PURE__ */ __name2(() => ha, "isIP") });
    __name2(ha, "ha");
    Fe = G(() => {
      "use strict";
      p();
      mi = Se(ge(), 1);
      a(ha, "isIP");
      yi = /^[^.]+\./, S = class S2 extends mi.EventEmitter {
        static {
          __name(this, "S2");
        }
        static {
          __name2(this, "S");
        }
        constructor() {
          super(...arguments);
          E(this, "opts", {});
          E(this, "connecting", false);
          E(this, "pending", true);
          E(
            this,
            "writable",
            true
          );
          E(this, "encrypted", false);
          E(this, "authorized", false);
          E(this, "destroyed", false);
          E(this, "ws", null);
          E(this, "writeBuffer");
          E(this, "tlsState", 0);
          E(this, "tlsRead");
          E(this, "tlsWrite");
        }
        static get poolQueryViaFetch() {
          return S2.opts.poolQueryViaFetch ?? S2.defaults.poolQueryViaFetch;
        }
        static set poolQueryViaFetch(t) {
          S2.opts.poolQueryViaFetch = t;
        }
        static get fetchEndpoint() {
          return S2.opts.fetchEndpoint ?? S2.defaults.fetchEndpoint;
        }
        static set fetchEndpoint(t) {
          S2.opts.fetchEndpoint = t;
        }
        static get fetchConnectionCache() {
          return true;
        }
        static set fetchConnectionCache(t) {
          console.warn("The `fetchConnectionCache` option is deprecated (now always `true`)");
        }
        static get fetchFunction() {
          return S2.opts.fetchFunction ?? S2.defaults.fetchFunction;
        }
        static set fetchFunction(t) {
          S2.opts.fetchFunction = t;
        }
        static get webSocketConstructor() {
          return S2.opts.webSocketConstructor ?? S2.defaults.webSocketConstructor;
        }
        static set webSocketConstructor(t) {
          S2.opts.webSocketConstructor = t;
        }
        get webSocketConstructor() {
          return this.opts.webSocketConstructor ?? S2.webSocketConstructor;
        }
        set webSocketConstructor(t) {
          this.opts.webSocketConstructor = t;
        }
        static get wsProxy() {
          return S2.opts.wsProxy ?? S2.defaults.wsProxy;
        }
        static set wsProxy(t) {
          S2.opts.wsProxy = t;
        }
        get wsProxy() {
          return this.opts.wsProxy ?? S2.wsProxy;
        }
        set wsProxy(t) {
          this.opts.wsProxy = t;
        }
        static get coalesceWrites() {
          return S2.opts.coalesceWrites ?? S2.defaults.coalesceWrites;
        }
        static set coalesceWrites(t) {
          S2.opts.coalesceWrites = t;
        }
        get coalesceWrites() {
          return this.opts.coalesceWrites ?? S2.coalesceWrites;
        }
        set coalesceWrites(t) {
          this.opts.coalesceWrites = t;
        }
        static get useSecureWebSocket() {
          return S2.opts.useSecureWebSocket ?? S2.defaults.useSecureWebSocket;
        }
        static set useSecureWebSocket(t) {
          S2.opts.useSecureWebSocket = t;
        }
        get useSecureWebSocket() {
          return this.opts.useSecureWebSocket ?? S2.useSecureWebSocket;
        }
        set useSecureWebSocket(t) {
          this.opts.useSecureWebSocket = t;
        }
        static get forceDisablePgSSL() {
          return S2.opts.forceDisablePgSSL ?? S2.defaults.forceDisablePgSSL;
        }
        static set forceDisablePgSSL(t) {
          S2.opts.forceDisablePgSSL = t;
        }
        get forceDisablePgSSL() {
          return this.opts.forceDisablePgSSL ?? S2.forceDisablePgSSL;
        }
        set forceDisablePgSSL(t) {
          this.opts.forceDisablePgSSL = t;
        }
        static get disableSNI() {
          return S2.opts.disableSNI ?? S2.defaults.disableSNI;
        }
        static set disableSNI(t) {
          S2.opts.disableSNI = t;
        }
        get disableSNI() {
          return this.opts.disableSNI ?? S2.disableSNI;
        }
        set disableSNI(t) {
          this.opts.disableSNI = t;
        }
        static get disableWarningInBrowsers() {
          return S2.opts.disableWarningInBrowsers ?? S2.defaults.disableWarningInBrowsers;
        }
        static set disableWarningInBrowsers(t) {
          S2.opts.disableWarningInBrowsers = t;
        }
        get disableWarningInBrowsers() {
          return this.opts.disableWarningInBrowsers ?? S2.disableWarningInBrowsers;
        }
        set disableWarningInBrowsers(t) {
          this.opts.disableWarningInBrowsers = t;
        }
        static get pipelineConnect() {
          return S2.opts.pipelineConnect ?? S2.defaults.pipelineConnect;
        }
        static set pipelineConnect(t) {
          S2.opts.pipelineConnect = t;
        }
        get pipelineConnect() {
          return this.opts.pipelineConnect ?? S2.pipelineConnect;
        }
        set pipelineConnect(t) {
          this.opts.pipelineConnect = t;
        }
        static get subtls() {
          return S2.opts.subtls ?? S2.defaults.subtls;
        }
        static set subtls(t) {
          S2.opts.subtls = t;
        }
        get subtls() {
          return this.opts.subtls ?? S2.subtls;
        }
        set subtls(t) {
          this.opts.subtls = t;
        }
        static get pipelineTLS() {
          return S2.opts.pipelineTLS ?? S2.defaults.pipelineTLS;
        }
        static set pipelineTLS(t) {
          S2.opts.pipelineTLS = t;
        }
        get pipelineTLS() {
          return this.opts.pipelineTLS ?? S2.pipelineTLS;
        }
        set pipelineTLS(t) {
          this.opts.pipelineTLS = t;
        }
        static get rootCerts() {
          return S2.opts.rootCerts ?? S2.defaults.rootCerts;
        }
        static set rootCerts(t) {
          S2.opts.rootCerts = t;
        }
        get rootCerts() {
          return this.opts.rootCerts ?? S2.rootCerts;
        }
        set rootCerts(t) {
          this.opts.rootCerts = t;
        }
        wsProxyAddrForHost(t, n) {
          let i = this.wsProxy;
          if (i === void 0) throw new Error("No WebSocket proxy is configured. Please see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#wsproxy-string--host-string-port-number--string--string");
          return typeof i == "function" ? i(t, n) : `${i}?address=${t}:${n}`;
        }
        setNoDelay() {
          return this;
        }
        setKeepAlive() {
          return this;
        }
        ref() {
          return this;
        }
        unref() {
          return this;
        }
        connect(t, n, i) {
          this.connecting = true, i && this.once("connect", i);
          let s = a(() => {
            this.connecting = false, this.pending = false, this.emit("connect"), this.emit("ready");
          }, "handleWebSocketOpen"), o = a((c, l = false) => {
            c.binaryType = "arraybuffer", c.addEventListener("error", (f) => {
              this.emit("error", f), this.emit("close");
            }), c.addEventListener("message", (f) => {
              if (this.tlsState === 0) {
                let y = d.from(f.data);
                this.emit("data", y);
              }
            }), c.addEventListener("close", () => {
              this.emit("close");
            }), l ? s() : c.addEventListener(
              "open",
              s
            );
          }, "configureWebSocket"), u;
          try {
            u = this.wsProxyAddrForHost(n, typeof t == "string" ? parseInt(t, 10) : t);
          } catch (c) {
            this.emit("error", c), this.emit("close");
            return;
          }
          try {
            let l = (this.useSecureWebSocket ? "wss:" : "ws:") + "//" + u;
            if (this.webSocketConstructor !== void 0) this.ws = new this.webSocketConstructor(l), o(this.ws);
            else try {
              this.ws = new WebSocket(l), o(this.ws);
            } catch {
              this.ws = new __unstable_WebSocket(l), o(this.ws);
            }
          } catch (c) {
            let f = (this.useSecureWebSocket ? "https:" : "http:") + "//" + u;
            fetch(f, { headers: { Upgrade: "websocket" } }).then(
              (y) => {
                if (this.ws = y.webSocket, this.ws == null) throw c;
                this.ws.accept(), o(this.ws, true);
              }
            ).catch((y) => {
              this.emit(
                "error",
                new Error(`All attempts to open a WebSocket to connect to the database failed. Please refer to https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined. Details: ${y}`)
              ), this.emit("close");
            });
          }
        }
        async startTls(t) {
          if (this.subtls === void 0) throw new Error(
            "For Postgres SSL connections, you must set `neonConfig.subtls` to the subtls library. See https://github.com/neondatabase/serverless/blob/main/CONFIG.md for more information."
          );
          this.tlsState = 1;
          let n = await this.subtls.TrustedCert.databaseFromPEM(this.rootCerts), i = new this.subtls.WebSocketReadQueue(this.ws), s = i.read.bind(i), o = this.rawWrite.bind(this), { read: u, write: c } = await this.subtls.startTls(t, n, s, o, { useSNI: !this.disableSNI, expectPreData: this.pipelineTLS ? new Uint8Array([83]) : void 0 });
          this.tlsRead = u, this.tlsWrite = c, this.tlsState = 2, this.encrypted = true, this.authorized = true, this.emit("secureConnection", this), this.tlsReadLoop();
        }
        async tlsReadLoop() {
          for (; ; ) {
            let t = await this.tlsRead();
            if (t === void 0) break;
            {
              let n = d.from(t);
              this.emit("data", n);
            }
          }
        }
        rawWrite(t) {
          if (!this.coalesceWrites) {
            this.ws && this.ws.send(t);
            return;
          }
          if (this.writeBuffer === void 0) this.writeBuffer = t, setTimeout(() => {
            this.ws && this.ws.send(this.writeBuffer), this.writeBuffer = void 0;
          }, 0);
          else {
            let n = new Uint8Array(
              this.writeBuffer.length + t.length
            );
            n.set(this.writeBuffer), n.set(t, this.writeBuffer.length), this.writeBuffer = n;
          }
        }
        write(t, n = "utf8", i = (s) => {
        }) {
          return t.length === 0 ? (i(), true) : (typeof t == "string" && (t = d.from(t, n)), this.tlsState === 0 ? (this.rawWrite(t), i()) : this.tlsState === 1 ? this.once("secureConnection", () => {
            this.write(
              t,
              n,
              i
            );
          }) : (this.tlsWrite(t), i()), true);
        }
        end(t = d.alloc(0), n = "utf8", i = () => {
        }) {
          return this.write(t, n, () => {
            this.ws.close(), i();
          }), this;
        }
        destroy() {
          return this.destroyed = true, this.end();
        }
      };
      a(S, "Socket"), E(S, "defaults", {
        poolQueryViaFetch: false,
        fetchEndpoint: a((t, n, i) => {
          let s;
          return i?.jwtAuth ? s = t.replace(yi, "apiauth.") : s = t.replace(yi, "api."), "https://" + s + "/sql";
        }, "fetchEndpoint"),
        fetchConnectionCache: true,
        fetchFunction: void 0,
        webSocketConstructor: void 0,
        wsProxy: a((t) => t + "/v2", "wsProxy"),
        useSecureWebSocket: true,
        forceDisablePgSSL: true,
        coalesceWrites: true,
        pipelineConnect: "password",
        subtls: void 0,
        rootCerts: "",
        pipelineTLS: false,
        disableSNI: false,
        disableWarningInBrowsers: false
      }), E(S, "opts", {});
      ce = S;
    });
    gi = {};
    ie(gi, { parse: /* @__PURE__ */ __name2(() => Yt, "parse") });
    __name2(Yt, "Yt");
    Zt = G(() => {
      "use strict";
      p();
      a(Yt, "parse");
    });
    tr = T((Ai) => {
      "use strict";
      p();
      Ai.parse = function(r, e) {
        return new er(r, e).parse();
      };
      var vt = class vt2 {
        static {
          __name(this, "vt2");
        }
        static {
          __name2(this, "vt");
        }
        constructor(e, t) {
          this.source = e, this.transform = t || Ca, this.position = 0, this.entries = [], this.recorded = [], this.dimension = 0;
        }
        isEof() {
          return this.position >= this.source.length;
        }
        nextCharacter() {
          var e = this.source[this.position++];
          return e === "\\" ? { value: this.source[this.position++], escaped: true } : { value: e, escaped: false };
        }
        record(e) {
          this.recorded.push(
            e
          );
        }
        newEntry(e) {
          var t;
          (this.recorded.length > 0 || e) && (t = this.recorded.join(""), t === "NULL" && !e && (t = null), t !== null && (t = this.transform(t)), this.entries.push(t), this.recorded = []);
        }
        consumeDimensions() {
          if (this.source[0] === "[") for (; !this.isEof(); ) {
            var e = this.nextCharacter();
            if (e.value === "=") break;
          }
        }
        parse(e) {
          var t, n, i;
          for (this.consumeDimensions(); !this.isEof(); ) if (t = this.nextCharacter(), t.value === "{" && !i) this.dimension++, this.dimension > 1 && (n = new vt2(this.source.substr(this.position - 1), this.transform), this.entries.push(n.parse(
            true
          )), this.position += n.position - 2);
          else if (t.value === "}" && !i) {
            if (this.dimension--, !this.dimension && (this.newEntry(), e)) return this.entries;
          } else t.value === '"' && !t.escaped ? (i && this.newEntry(true), i = !i) : t.value === "," && !i ? this.newEntry() : this.record(t.value);
          if (this.dimension !== 0) throw new Error("array dimension not balanced");
          return this.entries;
        }
      };
      a(vt, "ArrayParser");
      var er = vt;
      function Ca(r) {
        return r;
      }
      __name(Ca, "Ca");
      __name2(Ca, "Ca");
      a(Ca, "identity");
    });
    rr = T((Zl, Ci) => {
      p();
      var _a = tr();
      Ci.exports = { create: a(function(r, e) {
        return { parse: a(function() {
          return _a.parse(r, e);
        }, "parse") };
      }, "create") };
    });
    Ti = T((ef, Ii) => {
      "use strict";
      p();
      var Ia = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/, Ta = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/, Pa = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/, Ba = /^-?infinity$/;
      Ii.exports = a(function(e) {
        if (Ba.test(e)) return Number(e.replace("i", "I"));
        var t = Ia.exec(e);
        if (!t) return Ra(
          e
        ) || null;
        var n = !!t[8], i = parseInt(t[1], 10);
        n && (i = _i(i));
        var s = parseInt(t[2], 10) - 1, o = t[3], u = parseInt(
          t[4],
          10
        ), c = parseInt(t[5], 10), l = parseInt(t[6], 10), f = t[7];
        f = f ? 1e3 * parseFloat(f) : 0;
        var y, g = La(e);
        return g != null ? (y = new Date(Date.UTC(i, s, o, u, c, l, f)), nr(i) && y.setUTCFullYear(i), g !== 0 && y.setTime(y.getTime() - g)) : (y = new Date(i, s, o, u, c, l, f), nr(i) && y.setFullYear(i)), y;
      }, "parseDate");
      function Ra(r) {
        var e = Ta.exec(r);
        if (e) {
          var t = parseInt(e[1], 10), n = !!e[4];
          n && (t = _i(t));
          var i = parseInt(e[2], 10) - 1, s = e[3], o = new Date(t, i, s);
          return nr(
            t
          ) && o.setFullYear(t), o;
        }
      }
      __name(Ra, "Ra");
      __name2(Ra, "Ra");
      a(Ra, "getDate");
      function La(r) {
        if (r.endsWith("+00")) return 0;
        var e = Pa.exec(r.split(" ")[1]);
        if (e) {
          var t = e[1];
          if (t === "Z") return 0;
          var n = t === "-" ? -1 : 1, i = parseInt(e[2], 10) * 3600 + parseInt(
            e[3] || 0,
            10
          ) * 60 + parseInt(e[4] || 0, 10);
          return i * n * 1e3;
        }
      }
      __name(La, "La");
      __name2(La, "La");
      a(La, "timeZoneOffset");
      function _i(r) {
        return -(r - 1);
      }
      __name(_i, "_i");
      __name2(_i, "_i");
      a(_i, "bcYearToNegativeYear");
      function nr(r) {
        return r >= 0 && r < 100;
      }
      __name(nr, "nr");
      __name2(nr, "nr");
      a(nr, "is0To99");
    });
    Bi = T((nf, Pi) => {
      p();
      Pi.exports = ka;
      var Fa = Object.prototype.hasOwnProperty;
      function ka(r) {
        for (var e = 1; e < arguments.length; e++) {
          var t = arguments[e];
          for (var n in t) Fa.call(t, n) && (r[n] = t[n]);
        }
        return r;
      }
      __name(ka, "ka");
      __name2(ka, "ka");
      a(ka, "extend");
    });
    Fi = T((af, Li) => {
      "use strict";
      p();
      var Ma = Bi();
      Li.exports = ke;
      function ke(r) {
        if (!(this instanceof ke))
          return new ke(r);
        Ma(this, Va(r));
      }
      __name(ke, "ke");
      __name2(ke, "ke");
      a(ke, "PostgresInterval");
      var Ua = [
        "seconds",
        "minutes",
        "hours",
        "days",
        "months",
        "years"
      ];
      ke.prototype.toPostgres = function() {
        var r = Ua.filter(this.hasOwnProperty, this);
        return this.milliseconds && r.indexOf("seconds") < 0 && r.push("seconds"), r.length === 0 ? "0" : r.map(function(e) {
          var t = this[e] || 0;
          return e === "seconds" && this.milliseconds && (t = (t + this.milliseconds / 1e3).toFixed(6).replace(
            /\.?0+$/,
            ""
          )), t + " " + e;
        }, this).join(" ");
      };
      var Da = { years: "Y", months: "M", days: "D", hours: "H", minutes: "M", seconds: "S" }, Oa = ["years", "months", "days"], qa = ["hours", "minutes", "seconds"];
      ke.prototype.toISOString = ke.prototype.toISO = function() {
        var r = Oa.map(t, this).join(""), e = qa.map(t, this).join("");
        return "P" + r + "T" + e;
        function t(n) {
          var i = this[n] || 0;
          return n === "seconds" && this.milliseconds && (i = (i + this.milliseconds / 1e3).toFixed(6).replace(
            /0+$/,
            ""
          )), i + Da[n];
        }
        __name(t, "t");
        __name2(t, "t");
      };
      var ir = "([+-]?\\d+)", Qa = ir + "\\s+years?", Na = ir + "\\s+mons?", Wa = ir + "\\s+days?", ja = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?", Ha = new RegExp([Qa, Na, Wa, ja].map(function(r) {
        return "(" + r + ")?";
      }).join("\\s*")), Ri = { years: 2, months: 4, days: 6, hours: 9, minutes: 10, seconds: 11, milliseconds: 12 }, $a = ["hours", "minutes", "seconds", "milliseconds"];
      function Ga(r) {
        var e = r + "000000".slice(r.length);
        return parseInt(
          e,
          10
        ) / 1e3;
      }
      __name(Ga, "Ga");
      __name2(Ga, "Ga");
      a(Ga, "parseMilliseconds");
      function Va(r) {
        if (!r) return {};
        var e = Ha.exec(r), t = e[8] === "-";
        return Object.keys(Ri).reduce(function(n, i) {
          var s = Ri[i], o = e[s];
          return !o || (o = i === "milliseconds" ? Ga(o) : parseInt(o, 10), !o) || (t && ~$a.indexOf(i) && (o *= -1), n[i] = o), n;
        }, {});
      }
      __name(Va, "Va");
      __name2(Va, "Va");
      a(Va, "parse");
    });
    Mi = T((lf, ki) => {
      "use strict";
      p();
      ki.exports = a(function(e) {
        if (/^\\x/.test(e)) return new d(e.substr(
          2
        ), "hex");
        for (var t = "", n = 0; n < e.length; ) if (e[n] !== "\\") t += e[n], ++n;
        else if (/[0-7]{3}/.test(e.substr(n + 1, 3))) t += String.fromCharCode(parseInt(e.substr(n + 1, 3), 8)), n += 4;
        else {
          for (var i = 1; n + i < e.length && e[n + i] === "\\"; ) i++;
          for (var s = 0; s < Math.floor(i / 2); ++s) t += "\\";
          n += Math.floor(i / 2) * 2;
        }
        return new d(t, "binary");
      }, "parseBytea");
    });
    Wi = T((pf, Ni) => {
      p();
      var Ve = tr(), ze = rr(), xt = Ti(), Di = Fi(), Oi = Mi();
      function St(r) {
        return a(function(t) {
          return t === null ? t : r(t);
        }, "nullAllowed");
      }
      __name(St, "St");
      __name2(St, "St");
      a(St, "allowNull");
      function qi(r) {
        return r === null ? r : r === "TRUE" || r === "t" || r === "true" || r === "y" || r === "yes" || r === "on" || r === "1";
      }
      __name(qi, "qi");
      __name2(qi, "qi");
      a(qi, "parseBool");
      function za(r) {
        return r ? Ve.parse(r, qi) : null;
      }
      __name(za, "za");
      __name2(za, "za");
      a(za, "parseBoolArray");
      function Ka(r) {
        return parseInt(r, 10);
      }
      __name(Ka, "Ka");
      __name2(Ka, "Ka");
      a(Ka, "parseBaseTenInt");
      function sr(r) {
        return r ? Ve.parse(r, St(Ka)) : null;
      }
      __name(sr, "sr");
      __name2(sr, "sr");
      a(sr, "parseIntegerArray");
      function Ya(r) {
        return r ? Ve.parse(r, St(function(e) {
          return Qi(e).trim();
        })) : null;
      }
      __name(Ya, "Ya");
      __name2(Ya, "Ya");
      a(Ya, "parseBigIntegerArray");
      var Za = a(function(r) {
        if (!r) return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = cr(t)), t;
        });
        return e.parse();
      }, "parsePointArray"), or = a(function(r) {
        if (!r) return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = parseFloat(t)), t;
        });
        return e.parse();
      }, "parseFloatArray"), re = a(function(r) {
        if (!r) return null;
        var e = ze.create(r);
        return e.parse();
      }, "parseStringArray"), ar = a(function(r) {
        if (!r) return null;
        var e = ze.create(
          r,
          function(t) {
            return t !== null && (t = xt(t)), t;
          }
        );
        return e.parse();
      }, "parseDateArray"), Ja = a(function(r) {
        if (!r)
          return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = Di(t)), t;
        });
        return e.parse();
      }, "parseIntervalArray"), Xa = a(function(r) {
        return r ? Ve.parse(r, St(Oi)) : null;
      }, "parseByteAArray"), ur = a(function(r) {
        return parseInt(r, 10);
      }, "parseInteger"), Qi = a(function(r) {
        var e = String(r);
        return /^\d+$/.test(e) ? e : r;
      }, "parseBigInteger"), Ui = a(function(r) {
        return r ? Ve.parse(r, St(JSON.parse)) : null;
      }, "parseJsonArray"), cr = a(
        function(r) {
          return r[0] !== "(" ? null : (r = r.substring(1, r.length - 1).split(","), { x: parseFloat(r[0]), y: parseFloat(
            r[1]
          ) });
        },
        "parsePoint"
      ), eu = a(function(r) {
        if (r[0] !== "<" && r[1] !== "(") return null;
        for (var e = "(", t = "", n = false, i = 2; i < r.length - 1; i++) {
          if (n || (e += r[i]), r[i] === ")") {
            n = true;
            continue;
          } else if (!n) continue;
          r[i] !== "," && (t += r[i]);
        }
        var s = cr(e);
        return s.radius = parseFloat(t), s;
      }, "parseCircle"), tu = a(function(r) {
        r(20, Qi), r(21, ur), r(23, ur), r(26, ur), r(700, parseFloat), r(701, parseFloat), r(16, qi), r(1082, xt), r(1114, xt), r(1184, xt), r(
          600,
          cr
        ), r(651, re), r(718, eu), r(1e3, za), r(1001, Xa), r(1005, sr), r(1007, sr), r(1028, sr), r(1016, Ya), r(1017, Za), r(1021, or), r(1022, or), r(1231, or), r(1014, re), r(1015, re), r(1008, re), r(1009, re), r(1040, re), r(1041, re), r(
          1115,
          ar
        ), r(1182, ar), r(1185, ar), r(1186, Di), r(1187, Ja), r(17, Oi), r(114, JSON.parse.bind(JSON)), r(3802, JSON.parse.bind(JSON)), r(199, Ui), r(3807, Ui), r(3907, re), r(2951, re), r(791, re), r(1183, re), r(1270, re);
      }, "init");
      Ni.exports = { init: tu };
    });
    Hi = T((mf, ji) => {
      "use strict";
      p();
      var z = 1e6;
      function ru(r) {
        var e = r.readInt32BE(0), t = r.readUInt32BE(
          4
        ), n = "";
        e < 0 && (e = ~e + (t === 0), t = ~t + 1 >>> 0, n = "-");
        var i = "", s, o, u, c, l, f;
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        return s = e % z, o = 4294967296 * s + t, u = "" + o % z, n + u + i;
      }
      __name(ru, "ru");
      __name2(ru, "ru");
      a(ru, "readInt8");
      ji.exports = ru;
    });
    Ki = T((bf, zi) => {
      p();
      var nu = Hi(), L = a(function(r, e, t, n, i) {
        t = t || 0, n = n || false, i = i || function(A, C, D) {
          return A * Math.pow(2, D) + C;
        };
        var s = t >> 3, o = a(function(A) {
          return n ? ~A & 255 : A;
        }, "inv"), u = 255, c = 8 - t % 8;
        e < c && (u = 255 << 8 - e & 255, c = e), t && (u = u >> t % 8);
        var l = 0;
        t % 8 + e >= 8 && (l = i(0, o(r[s]) & u, c));
        for (var f = e + t >> 3, y = s + 1; y < f; y++) l = i(l, o(
          r[y]
        ), 8);
        var g = (e + t) % 8;
        return g > 0 && (l = i(l, o(r[f]) >> 8 - g, g)), l;
      }, "parseBits"), Vi = a(function(r, e, t) {
        var n = Math.pow(2, t - 1) - 1, i = L(r, 1), s = L(r, t, 1);
        if (s === 0) return 0;
        var o = 1, u = a(function(l, f, y) {
          l === 0 && (l = 1);
          for (var g = 1; g <= y; g++) o /= 2, (f & 1 << y - g) > 0 && (l += o);
          return l;
        }, "parsePrecisionBits"), c = L(r, e, t + 1, false, u);
        return s == Math.pow(
          2,
          t + 1
        ) - 1 ? c === 0 ? i === 0 ? 1 / 0 : -1 / 0 : NaN : (i === 0 ? 1 : -1) * Math.pow(2, s - n) * c;
      }, "parseFloatFromBits"), iu = a(function(r) {
        return L(r, 1) == 1 ? -1 * (L(r, 15, 1, true) + 1) : L(r, 15, 1);
      }, "parseInt16"), $i = a(function(r) {
        return L(r, 1) == 1 ? -1 * (L(
          r,
          31,
          1,
          true
        ) + 1) : L(r, 31, 1);
      }, "parseInt32"), su = a(function(r) {
        return Vi(r, 23, 8);
      }, "parseFloat32"), ou = a(function(r) {
        return Vi(r, 52, 11);
      }, "parseFloat64"), au = a(function(r) {
        var e = L(r, 16, 32);
        if (e == 49152) return NaN;
        for (var t = Math.pow(1e4, L(r, 16, 16)), n = 0, i = [], s = L(r, 16), o = 0; o < s; o++) n += L(r, 16, 64 + 16 * o) * t, t /= 1e4;
        var u = Math.pow(10, L(
          r,
          16,
          48
        ));
        return (e === 0 ? 1 : -1) * Math.round(n * u) / u;
      }, "parseNumeric"), Gi = a(function(r, e) {
        var t = L(e, 1), n = L(
          e,
          63,
          1
        ), i = new Date((t === 0 ? 1 : -1) * n / 1e3 + 9466848e5);
        return r || i.setTime(i.getTime() + i.getTimezoneOffset() * 6e4), i.usec = n % 1e3, i.getMicroSeconds = function() {
          return this.usec;
        }, i.setMicroSeconds = function(s) {
          this.usec = s;
        }, i.getUTCMicroSeconds = function() {
          return this.usec;
        }, i;
      }, "parseDate"), Ke = a(
        function(r) {
          for (var e = L(
            r,
            32
          ), t = L(r, 32, 32), n = L(r, 32, 64), i = 96, s = [], o = 0; o < e; o++) s[o] = L(r, 32, i), i += 32, i += 32;
          var u = a(function(l) {
            var f = L(r, 32, i);
            if (i += 32, f == 4294967295) return null;
            var y;
            if (l == 23 || l == 20) return y = L(r, f * 8, i), i += f * 8, y;
            if (l == 25) return y = r.toString(this.encoding, i >> 3, (i += f << 3) >> 3), y;
            console.log("ERROR: ElementType not implemented: " + l);
          }, "parseElement"), c = a(function(l, f) {
            var y = [], g;
            if (l.length > 1) {
              var A = l.shift();
              for (g = 0; g < A; g++) y[g] = c(l, f);
              l.unshift(A);
            } else for (g = 0; g < l[0]; g++) y[g] = u(f);
            return y;
          }, "parse");
          return c(s, n);
        },
        "parseArray"
      ), uu = a(function(r) {
        return r.toString("utf8");
      }, "parseText"), cu = a(function(r) {
        return r === null ? null : L(r, 8) > 0;
      }, "parseBool"), lu = a(function(r) {
        r(20, nu), r(21, iu), r(23, $i), r(26, $i), r(1700, au), r(700, su), r(701, ou), r(16, cu), r(1114, Gi.bind(null, false)), r(1184, Gi.bind(null, true)), r(1e3, Ke), r(1007, Ke), r(1016, Ke), r(1008, Ke), r(1009, Ke), r(25, uu);
      }, "init");
      zi.exports = { init: lu };
    });
    Zi = T((Sf, Yi) => {
      p();
      Yi.exports = {
        BOOL: 16,
        BYTEA: 17,
        CHAR: 18,
        INT8: 20,
        INT2: 21,
        INT4: 23,
        REGPROC: 24,
        TEXT: 25,
        OID: 26,
        TID: 27,
        XID: 28,
        CID: 29,
        JSON: 114,
        XML: 142,
        PG_NODE_TREE: 194,
        SMGR: 210,
        PATH: 602,
        POLYGON: 604,
        CIDR: 650,
        FLOAT4: 700,
        FLOAT8: 701,
        ABSTIME: 702,
        RELTIME: 703,
        TINTERVAL: 704,
        CIRCLE: 718,
        MACADDR8: 774,
        MONEY: 790,
        MACADDR: 829,
        INET: 869,
        ACLITEM: 1033,
        BPCHAR: 1042,
        VARCHAR: 1043,
        DATE: 1082,
        TIME: 1083,
        TIMESTAMP: 1114,
        TIMESTAMPTZ: 1184,
        INTERVAL: 1186,
        TIMETZ: 1266,
        BIT: 1560,
        VARBIT: 1562,
        NUMERIC: 1700,
        REFCURSOR: 1790,
        REGPROCEDURE: 2202,
        REGOPER: 2203,
        REGOPERATOR: 2204,
        REGCLASS: 2205,
        REGTYPE: 2206,
        UUID: 2950,
        TXID_SNAPSHOT: 2970,
        PG_LSN: 3220,
        PG_NDISTINCT: 3361,
        PG_DEPENDENCIES: 3402,
        TSVECTOR: 3614,
        TSQUERY: 3615,
        GTSVECTOR: 3642,
        REGCONFIG: 3734,
        REGDICTIONARY: 3769,
        JSONB: 3802,
        REGNAMESPACE: 4089,
        REGROLE: 4096
      };
    });
    Je = T((Ze) => {
      p();
      var fu = Wi(), hu = Ki(), pu = rr(), du = Zi();
      Ze.getTypeParser = yu;
      Ze.setTypeParser = mu;
      Ze.arrayParser = pu;
      Ze.builtins = du;
      var Ye = { text: {}, binary: {} };
      function Ji(r) {
        return String(r);
      }
      __name(Ji, "Ji");
      __name2(Ji, "Ji");
      a(Ji, "noParse");
      function yu(r, e) {
        return e = e || "text", Ye[e] && Ye[e][r] || Ji;
      }
      __name(yu, "yu");
      __name2(yu, "yu");
      a(yu, "getTypeParser");
      function mu(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), Ye[e][r] = t;
      }
      __name(mu, "mu");
      __name2(mu, "mu");
      a(mu, "setTypeParser");
      fu.init(function(r, e) {
        Ye.text[r] = e;
      });
      hu.init(function(r, e) {
        Ye.binary[r] = e;
      });
    });
    At = T((If, Xi) => {
      "use strict";
      p();
      var wu = Je();
      function Et(r) {
        this._types = r || wu, this.text = {}, this.binary = {};
      }
      __name(Et, "Et");
      __name2(Et, "Et");
      a(Et, "TypeOverrides");
      Et.prototype.getOverrides = function(r) {
        switch (r) {
          case "text":
            return this.text;
          case "binary":
            return this.binary;
          default:
            return {};
        }
      };
      Et.prototype.setTypeParser = function(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), this.getOverrides(e)[r] = t;
      };
      Et.prototype.getTypeParser = function(r, e) {
        return e = e || "text", this.getOverrides(e)[r] || this._types.getTypeParser(r, e);
      };
      Xi.exports = Et;
    });
    __name2(Xe, "Xe");
    es = G(() => {
      "use strict";
      p();
      a(Xe, "sha256");
    });
    ts = G(() => {
      "use strict";
      p();
      U = class U2 {
        static {
          __name(this, "U2");
        }
        static {
          __name2(this, "U");
        }
        constructor() {
          E(this, "_dataLength", 0);
          E(this, "_bufferLength", 0);
          E(this, "_state", new Int32Array(4));
          E(this, "_buffer", new ArrayBuffer(68));
          E(this, "_buffer8");
          E(this, "_buffer32");
          this._buffer8 = new Uint8Array(this._buffer, 0, 68), this._buffer32 = new Uint32Array(this._buffer, 0, 17), this.start();
        }
        static hashByteArray(e, t = false) {
          return this.onePassHasher.start().appendByteArray(
            e
          ).end(t);
        }
        static hashStr(e, t = false) {
          return this.onePassHasher.start().appendStr(e).end(t);
        }
        static hashAsciiStr(e, t = false) {
          return this.onePassHasher.start().appendAsciiStr(e).end(t);
        }
        static _hex(e) {
          let t = U2.hexChars, n = U2.hexOut, i, s, o, u;
          for (u = 0; u < 4; u += 1) for (s = u * 8, i = e[u], o = 0; o < 8; o += 2) n[s + 1 + o] = t.charAt(i & 15), i >>>= 4, n[s + 0 + o] = t.charAt(
            i & 15
          ), i >>>= 4;
          return n.join("");
        }
        static _md5cycle(e, t) {
          let n = e[0], i = e[1], s = e[2], o = e[3];
          n += (i & s | ~i & o) + t[0] - 680876936 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[2] + 606105819 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[3] - 1044525330 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[4] - 176418897 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[6] - 1473231341 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[7] - 45705983 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[8] + 1770035416 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[10] - 42063 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[11] - 1990404162 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[12] + 1804603682 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[14] - 1502002290 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[15] + 1236535329 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & o | s & ~o) + t[1] - 165796510 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[11] + 643717713 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[0] - 373897302 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[5] - 701558691 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[15] - 660478335 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[4] - 405537848 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[9] + 568446438 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[3] - 187363961 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[8] + 1163531501 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[13] - 1444681467 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[7] + 1735328473 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[12] - 1926607734 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i ^ s ^ o) + t[5] - 378558 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[11] + 1839030562 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[14] - 35309556 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[1] - 1530992060 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[7] - 155497632 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[10] - 1094730640 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[13] + 681279174 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[3] - 722521979 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[6] + 76029189 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[9] - 640364487 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[15] + 530742520 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[2] - 995338651 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (s ^ (i | ~o)) + t[0] - 198630844 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[14] - 1416354905 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[5] - 57434055 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[12] + 1700485571 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[10] - 1051523 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[1] - 2054922799 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[8] + 1873313359 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[6] - 1560198380 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[13] + 1309151649 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[4] - 145523070 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[2] + 718787259 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[9] - 343485551 | 0, i = (i << 21 | i >>> 11) + s | 0, e[0] = n + e[0] | 0, e[1] = i + e[1] | 0, e[2] = s + e[2] | 0, e[3] = o + e[3] | 0;
        }
        start() {
          return this._dataLength = 0, this._bufferLength = 0, this._state.set(U2.stateIdentity), this;
        }
        appendStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o;
          for (o = 0; o < e.length; o += 1) {
            if (s = e.charCodeAt(o), s < 128) t[i++] = s;
            else if (s < 2048) t[i++] = (s >>> 6) + 192, t[i++] = s & 63 | 128;
            else if (s < 55296 || s > 56319) t[i++] = (s >>> 12) + 224, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            else {
              if (s = (s - 55296) * 1024 + (e.charCodeAt(++o) - 56320) + 65536, s > 1114111) throw new Error(
                "Unicode standard supports code points up to U+10FFFF"
              );
              t[i++] = (s >>> 18) + 240, t[i++] = s >>> 12 & 63 | 128, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            }
            i >= 64 && (this._dataLength += 64, U2._md5cycle(this._state, n), i -= 64, n[0] = n[16]);
          }
          return this._bufferLength = i, this;
        }
        appendAsciiStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e.charCodeAt(o++);
            if (i < 64) break;
            this._dataLength += 64, U2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        appendByteArray(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e[o++];
            if (i < 64) break;
            this._dataLength += 64, U2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        getState() {
          let e = this._state;
          return { buffer: String.fromCharCode.apply(null, Array.from(this._buffer8)), buflen: this._bufferLength, length: this._dataLength, state: [e[0], e[1], e[2], e[3]] };
        }
        setState(e) {
          let t = e.buffer, n = e.state, i = this._state, s;
          for (this._dataLength = e.length, this._bufferLength = e.buflen, i[0] = n[0], i[1] = n[1], i[2] = n[2], i[3] = n[3], s = 0; s < t.length; s += 1) this._buffer8[s] = t.charCodeAt(s);
        }
        end(e = false) {
          let t = this._bufferLength, n = this._buffer8, i = this._buffer32, s = (t >> 2) + 1;
          this._dataLength += t;
          let o = this._dataLength * 8;
          if (n[t] = 128, n[t + 1] = n[t + 2] = n[t + 3] = 0, i.set(U2.buffer32Identity.subarray(s), s), t > 55 && (U2._md5cycle(this._state, i), i.set(U2.buffer32Identity)), o <= 4294967295) i[14] = o;
          else {
            let u = o.toString(16).match(/(.*?)(.{0,8})$/);
            if (u === null) return;
            let c = parseInt(
              u[2],
              16
            ), l = parseInt(u[1], 16) || 0;
            i[14] = c, i[15] = l;
          }
          return U2._md5cycle(this._state, i), e ? this._state : U2._hex(
            this._state
          );
        }
      };
      a(U, "Md5"), E(U, "stateIdentity", new Int32Array([1732584193, -271733879, -1732584194, 271733878])), E(U, "buffer32Identity", new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), E(U, "hexChars", "0123456789abcdef"), E(U, "hexOut", []), E(U, "onePassHasher", new U());
      et = U;
    });
    lr = {};
    ie(lr, { createHash: /* @__PURE__ */ __name2(() => bu, "createHash"), createHmac: /* @__PURE__ */ __name2(() => vu, "createHmac"), randomBytes: /* @__PURE__ */ __name2(() => gu, "randomBytes") });
    __name2(gu, "gu");
    __name2(bu, "bu");
    __name2(vu, "vu");
    fr = G(() => {
      "use strict";
      p();
      es();
      ts();
      a(gu, "randomBytes");
      a(bu, "createHash");
      a(vu, "createHmac");
    });
    tt = T((Qf, hr) => {
      "use strict";
      p();
      hr.exports = {
        host: "localhost",
        user: m.platform === "win32" ? m.env.USERNAME : m.env.USER,
        database: void 0,
        password: null,
        connectionString: void 0,
        port: 5432,
        rows: 0,
        binary: false,
        max: 10,
        idleTimeoutMillis: 3e4,
        client_encoding: "",
        ssl: false,
        application_name: void 0,
        fallback_application_name: void 0,
        options: void 0,
        parseInputDatesAsUTC: false,
        statement_timeout: false,
        lock_timeout: false,
        idle_in_transaction_session_timeout: false,
        query_timeout: false,
        connect_timeout: 0,
        keepalives: 1,
        keepalives_idle: 0
      };
      var Me = Je(), xu = Me.getTypeParser(20, "text"), Su = Me.getTypeParser(
        1016,
        "text"
      );
      hr.exports.__defineSetter__("parseInt8", function(r) {
        Me.setTypeParser(20, "text", r ? Me.getTypeParser(
          23,
          "text"
        ) : xu), Me.setTypeParser(1016, "text", r ? Me.getTypeParser(1007, "text") : Su);
      });
    });
    rt = T((Wf, ns) => {
      "use strict";
      p();
      var Eu = (fr(), O(lr)), Au = tt();
      function Cu(r) {
        var e = r.replace(
          /\\/g,
          "\\\\"
        ).replace(/"/g, '\\"');
        return '"' + e + '"';
      }
      __name(Cu, "Cu");
      __name2(Cu, "Cu");
      a(Cu, "escapeElement");
      function rs(r) {
        for (var e = "{", t = 0; t < r.length; t++) t > 0 && (e = e + ","), r[t] === null || typeof r[t] > "u" ? e = e + "NULL" : Array.isArray(r[t]) ? e = e + rs(r[t]) : r[t] instanceof d ? e += "\\\\x" + r[t].toString("hex") : e += Cu(Ct(r[t]));
        return e = e + "}", e;
      }
      __name(rs, "rs");
      __name2(rs, "rs");
      a(rs, "arrayString");
      var Ct = a(function(r, e) {
        if (r == null) return null;
        if (r instanceof d) return r;
        if (ArrayBuffer.isView(r)) {
          var t = d.from(r.buffer, r.byteOffset, r.byteLength);
          return t.length === r.byteLength ? t : t.slice(r.byteOffset, r.byteOffset + r.byteLength);
        }
        return r instanceof Date ? Au.parseInputDatesAsUTC ? Tu(r) : Iu(r) : Array.isArray(r) ? rs(r) : typeof r == "object" ? _u(r, e) : r.toString();
      }, "prepareValue");
      function _u(r, e) {
        if (r && typeof r.toPostgres == "function") {
          if (e = e || [], e.indexOf(r) !== -1) throw new Error('circular reference detected while preparing "' + r + '" for query');
          return e.push(r), Ct(r.toPostgres(Ct), e);
        }
        return JSON.stringify(r);
      }
      __name(_u, "_u");
      __name2(_u, "_u");
      a(_u, "prepareObject");
      function N(r, e) {
        for (r = "" + r; r.length < e; ) r = "0" + r;
        return r;
      }
      __name(N, "N");
      __name2(N, "N");
      a(N, "pad");
      function Iu(r) {
        var e = -r.getTimezoneOffset(), t = r.getFullYear(), n = t < 1;
        n && (t = Math.abs(t) + 1);
        var i = N(t, 4) + "-" + N(r.getMonth() + 1, 2) + "-" + N(r.getDate(), 2) + "T" + N(
          r.getHours(),
          2
        ) + ":" + N(r.getMinutes(), 2) + ":" + N(r.getSeconds(), 2) + "." + N(r.getMilliseconds(), 3);
        return e < 0 ? (i += "-", e *= -1) : i += "+", i += N(Math.floor(e / 60), 2) + ":" + N(e % 60, 2), n && (i += " BC"), i;
      }
      __name(Iu, "Iu");
      __name2(Iu, "Iu");
      a(Iu, "dateToString");
      function Tu(r) {
        var e = r.getUTCFullYear(), t = e < 1;
        t && (e = Math.abs(e) + 1);
        var n = N(e, 4) + "-" + N(r.getUTCMonth() + 1, 2) + "-" + N(r.getUTCDate(), 2) + "T" + N(r.getUTCHours(), 2) + ":" + N(r.getUTCMinutes(), 2) + ":" + N(r.getUTCSeconds(), 2) + "." + N(
          r.getUTCMilliseconds(),
          3
        );
        return n += "+00:00", t && (n += " BC"), n;
      }
      __name(Tu, "Tu");
      __name2(Tu, "Tu");
      a(Tu, "dateToStringUTC");
      function Pu(r, e, t) {
        return r = typeof r == "string" ? { text: r } : r, e && (typeof e == "function" ? r.callback = e : r.values = e), t && (r.callback = t), r;
      }
      __name(Pu, "Pu");
      __name2(Pu, "Pu");
      a(Pu, "normalizeQueryConfig");
      var pr = a(function(r) {
        return Eu.createHash("md5").update(r, "utf-8").digest("hex");
      }, "md5"), Bu = a(
        function(r, e, t) {
          var n = pr(e + r), i = pr(d.concat([d.from(n), t]));
          return "md5" + i;
        },
        "postgresMd5PasswordHash"
      );
      ns.exports = {
        prepareValue: a(function(e) {
          return Ct(e);
        }, "prepareValueWrapper"),
        normalizeQueryConfig: Pu,
        postgresMd5PasswordHash: Bu,
        md5: pr
      };
    });
    nt = {};
    ie(nt, { default: /* @__PURE__ */ __name2(() => ku, "default") });
    it = G(() => {
      "use strict";
      p();
      ku = {};
    });
    ds = T((th, ps) => {
      "use strict";
      p();
      var yr = (fr(), O(lr));
      function Mu(r) {
        if (r.indexOf("SCRAM-SHA-256") === -1) throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
        let e = yr.randomBytes(
          18
        ).toString("base64");
        return { mechanism: "SCRAM-SHA-256", clientNonce: e, response: "n,,n=*,r=" + e, message: "SASLInitialResponse" };
      }
      __name(Mu, "Mu");
      __name2(Mu, "Mu");
      a(Mu, "startSession");
      function Uu(r, e, t) {
        if (r.message !== "SASLInitialResponse") throw new Error(
          "SASL: Last message was not SASLInitialResponse"
        );
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
        if (typeof t != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
        let n = qu(t);
        if (n.nonce.startsWith(r.clientNonce)) {
          if (n.nonce.length === r.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        var i = d.from(n.salt, "base64"), s = Wu(e, i, n.iteration), o = Ue(s, "Client Key"), u = Nu(
          o
        ), c = "n=*,r=" + r.clientNonce, l = "r=" + n.nonce + ",s=" + n.salt + ",i=" + n.iteration, f = "c=biws,r=" + n.nonce, y = c + "," + l + "," + f, g = Ue(u, y), A = hs(o, g), C = A.toString("base64"), D = Ue(s, "Server Key"), Y = Ue(D, y);
        r.message = "SASLResponse", r.serverSignature = Y.toString("base64"), r.response = f + ",p=" + C;
      }
      __name(Uu, "Uu");
      __name2(Uu, "Uu");
      a(Uu, "continueSession");
      function Du(r, e) {
        if (r.message !== "SASLResponse") throw new Error("SASL: Last message was not SASLResponse");
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
        let { serverSignature: t } = Qu(
          e
        );
        if (t !== r.serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
      __name(Du, "Du");
      __name2(Du, "Du");
      a(Du, "finalizeSession");
      function Ou(r) {
        if (typeof r != "string") throw new TypeError("SASL: text must be a string");
        return r.split("").map((e, t) => r.charCodeAt(t)).every((e) => e >= 33 && e <= 43 || e >= 45 && e <= 126);
      }
      __name(Ou, "Ou");
      __name2(Ou, "Ou");
      a(Ou, "isPrintableChars");
      function ls(r) {
        return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(r);
      }
      __name(ls, "ls");
      __name2(ls, "ls");
      a(ls, "isBase64");
      function fs(r) {
        if (typeof r != "string") throw new TypeError("SASL: attribute pairs text must be a string");
        return new Map(r.split(",").map((e) => {
          if (!/^.=/.test(e)) throw new Error("SASL: Invalid attribute pair entry");
          let t = e[0], n = e.substring(2);
          return [t, n];
        }));
      }
      __name(fs, "fs");
      __name2(fs, "fs");
      a(fs, "parseAttributePairs");
      function qu(r) {
        let e = fs(r), t = e.get("r");
        if (t) {
          if (!Ou(t)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
        let n = e.get("s");
        if (n) {
          if (!ls(n)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
        let i = e.get("i");
        if (i) {
          if (!/^[1-9][0-9]*$/.test(i)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
        let s = parseInt(i, 10);
        return { nonce: t, salt: n, iteration: s };
      }
      __name(qu, "qu");
      __name2(qu, "qu");
      a(qu, "parseServerFirstMessage");
      function Qu(r) {
        let t = fs(r).get("v");
        if (t) {
          if (!ls(t)) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
        return { serverSignature: t };
      }
      __name(Qu, "Qu");
      __name2(Qu, "Qu");
      a(Qu, "parseServerFinalMessage");
      function hs(r, e) {
        if (!d.isBuffer(r)) throw new TypeError("first argument must be a Buffer");
        if (!d.isBuffer(e)) throw new TypeError(
          "second argument must be a Buffer"
        );
        if (r.length !== e.length) throw new Error("Buffer lengths must match");
        if (r.length === 0) throw new Error("Buffers cannot be empty");
        return d.from(r.map((t, n) => r[n] ^ e[n]));
      }
      __name(hs, "hs");
      __name2(hs, "hs");
      a(hs, "xorBuffers");
      function Nu(r) {
        return yr.createHash("sha256").update(r).digest();
      }
      __name(Nu, "Nu");
      __name2(Nu, "Nu");
      a(Nu, "sha256");
      function Ue(r, e) {
        return yr.createHmac("sha256", r).update(e).digest();
      }
      __name(Ue, "Ue");
      __name2(Ue, "Ue");
      a(Ue, "hmacSha256");
      function Wu(r, e, t) {
        for (var n = Ue(
          r,
          d.concat([e, d.from([0, 0, 0, 1])])
        ), i = n, s = 0; s < t - 1; s++) n = Ue(r, n), i = hs(i, n);
        return i;
      }
      __name(Wu, "Wu");
      __name2(Wu, "Wu");
      a(Wu, "Hi");
      ps.exports = { startSession: Mu, continueSession: Uu, finalizeSession: Du };
    });
    mr = {};
    ie(mr, { join: /* @__PURE__ */ __name2(() => ju, "join") });
    __name2(ju, "ju");
    wr = G(() => {
      "use strict";
      p();
      a(
        ju,
        "join"
      );
    });
    gr = {};
    ie(gr, { stat: /* @__PURE__ */ __name2(() => Hu, "stat") });
    __name2(Hu, "Hu");
    br = G(() => {
      "use strict";
      p();
      a(Hu, "stat");
    });
    vr = {};
    ie(vr, { default: /* @__PURE__ */ __name2(() => $u, "default") });
    xr = G(() => {
      "use strict";
      p();
      $u = {};
    });
    ys = {};
    ie(ys, { StringDecoder: /* @__PURE__ */ __name2(() => Sr, "StringDecoder") });
    ms = G(() => {
      "use strict";
      p();
      Er = class Er {
        static {
          __name(this, "Er");
        }
        static {
          __name2(this, "Er");
        }
        constructor(e) {
          E(this, "td");
          this.td = new TextDecoder(e);
        }
        write(e) {
          return this.td.decode(e, { stream: true });
        }
        end(e) {
          return this.td.decode(e);
        }
      };
      a(Er, "StringDecoder");
      Sr = Er;
    });
    vs = T((fh, bs) => {
      "use strict";
      p();
      var { Transform: Gu } = (xr(), O(vr)), { StringDecoder: Vu } = (ms(), O(ys)), ve = Symbol(
        "last"
      ), It = Symbol("decoder");
      function zu(r, e, t) {
        let n;
        if (this.overflow) {
          if (n = this[It].write(r).split(
            this.matcher
          ), n.length === 1) return t();
          n.shift(), this.overflow = false;
        } else this[ve] += this[It].write(r), n = this[ve].split(this.matcher);
        this[ve] = n.pop();
        for (let i = 0; i < n.length; i++) try {
          gs(this, this.mapper(n[i]));
        } catch (s) {
          return t(s);
        }
        if (this.overflow = this[ve].length > this.maxLength, this.overflow && !this.skipOverflow) {
          t(new Error(
            "maximum buffer reached"
          ));
          return;
        }
        t();
      }
      __name(zu, "zu");
      __name2(zu, "zu");
      a(zu, "transform");
      function Ku(r) {
        if (this[ve] += this[It].end(), this[ve])
          try {
            gs(this, this.mapper(this[ve]));
          } catch (e) {
            return r(e);
          }
        r();
      }
      __name(Ku, "Ku");
      __name2(Ku, "Ku");
      a(Ku, "flush");
      function gs(r, e) {
        e !== void 0 && r.push(e);
      }
      __name(gs, "gs");
      __name2(gs, "gs");
      a(gs, "push");
      function ws(r) {
        return r;
      }
      __name(ws, "ws");
      __name2(ws, "ws");
      a(ws, "noop");
      function Yu(r, e, t) {
        switch (r = r || /\r?\n/, e = e || ws, t = t || {}, arguments.length) {
          case 1:
            typeof r == "function" ? (e = r, r = /\r?\n/) : typeof r == "object" && !(r instanceof RegExp) && !r[Symbol.split] && (t = r, r = /\r?\n/);
            break;
          case 2:
            typeof r == "function" ? (t = e, e = r, r = /\r?\n/) : typeof e == "object" && (t = e, e = ws);
        }
        t = Object.assign({}, t), t.autoDestroy = true, t.transform = zu, t.flush = Ku, t.readableObjectMode = true;
        let n = new Gu(t);
        return n[ve] = "", n[It] = new Vu("utf8"), n.matcher = r, n.mapper = e, n.maxLength = t.maxLength, n.skipOverflow = t.skipOverflow || false, n.overflow = false, n._destroy = function(i, s) {
          this._writableState.errorEmitted = false, s(i);
        }, n;
      }
      __name(Yu, "Yu");
      __name2(Yu, "Yu");
      a(Yu, "split");
      bs.exports = Yu;
    });
    Es = T((dh, pe) => {
      "use strict";
      p();
      var xs = (wr(), O(mr)), Zu = (xr(), O(vr)).Stream, Ju = vs(), Ss = (it(), O(nt)), Xu = 5432, Tt = m.platform === "win32", st = m.stderr, ec = 56, tc = 7, rc = 61440, nc = 32768;
      function ic(r) {
        return (r & rc) == nc;
      }
      __name(ic, "ic");
      __name2(ic, "ic");
      a(ic, "isRegFile");
      var De = ["host", "port", "database", "user", "password"], Ar = De.length, sc = De[Ar - 1];
      function Cr() {
        var r = st instanceof Zu && st.writable === true;
        if (r) {
          var e = Array.prototype.slice.call(arguments).concat(`
`);
          st.write(Ss.format.apply(Ss, e));
        }
      }
      __name(Cr, "Cr");
      __name2(Cr, "Cr");
      a(Cr, "warn");
      Object.defineProperty(pe.exports, "isWin", { get: a(function() {
        return Tt;
      }, "get"), set: a(function(r) {
        Tt = r;
      }, "set") });
      pe.exports.warnTo = function(r) {
        var e = st;
        return st = r, e;
      };
      pe.exports.getFileName = function(r) {
        var e = r || m.env, t = e.PGPASSFILE || (Tt ? xs.join(e.APPDATA || "./", "postgresql", "pgpass.conf") : xs.join(e.HOME || "./", ".pgpass"));
        return t;
      };
      pe.exports.usePgPass = function(r, e) {
        return Object.prototype.hasOwnProperty.call(m.env, "PGPASSWORD") ? false : Tt ? true : (e = e || "<unkn>", ic(r.mode) ? r.mode & (ec | tc) ? (Cr('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', e), false) : true : (Cr('WARNING: password file "%s" is not a plain file', e), false));
      };
      var oc = pe.exports.match = function(r, e) {
        return De.slice(0, -1).reduce(function(t, n, i) {
          return i == 1 && Number(r[n] || Xu) === Number(
            e[n]
          ) ? t && true : t && (e[n] === "*" || e[n] === r[n]);
        }, true);
      };
      pe.exports.getPassword = function(r, e, t) {
        var n, i = e.pipe(
          Ju()
        );
        function s(c) {
          var l = ac(c);
          l && uc(l) && oc(r, l) && (n = l[sc], i.end());
        }
        __name(s, "s");
        __name2(s, "s");
        a(s, "onLine");
        var o = a(function() {
          e.destroy(), t(n);
        }, "onEnd"), u = a(function(c) {
          e.destroy(), Cr("WARNING: error on reading file: %s", c), t(
            void 0
          );
        }, "onErr");
        e.on("error", u), i.on("data", s).on("end", o).on("error", u);
      };
      var ac = pe.exports.parseLine = function(r) {
        if (r.length < 11 || r.match(/^\s+#/)) return null;
        for (var e = "", t = "", n = 0, i = 0, s = 0, o = {}, u = false, c = a(
          function(f, y, g) {
            var A = r.substring(y, g);
            Object.hasOwnProperty.call(m.env, "PGPASS_NO_DEESCAPE") || (A = A.replace(/\\([:\\])/g, "$1")), o[De[f]] = A;
          },
          "addToObj"
        ), l = 0; l < r.length - 1; l += 1) {
          if (e = r.charAt(l + 1), t = r.charAt(
            l
          ), u = n == Ar - 1, u) {
            c(n, i);
            break;
          }
          l >= 0 && e == ":" && t !== "\\" && (c(n, i, l + 1), i = l + 2, n += 1);
        }
        return o = Object.keys(o).length === Ar ? o : null, o;
      }, uc = pe.exports.isValidEntry = function(r) {
        for (var e = { 0: function(o) {
          return o.length > 0;
        }, 1: function(o) {
          return o === "*" ? true : (o = Number(o), isFinite(o) && o > 0 && o < 9007199254740992 && Math.floor(o) === o);
        }, 2: function(o) {
          return o.length > 0;
        }, 3: function(o) {
          return o.length > 0;
        }, 4: function(o) {
          return o.length > 0;
        } }, t = 0; t < De.length; t += 1) {
          var n = e[t], i = r[De[t]] || "", s = n(i);
          if (!s) return false;
        }
        return true;
      };
    });
    Cs = T((gh, _r) => {
      "use strict";
      p();
      var wh = (wr(), O(mr)), As = (br(), O(gr)), Pt = Es();
      _r.exports = function(r, e) {
        var t = Pt.getFileName();
        As.stat(t, function(n, i) {
          if (n || !Pt.usePgPass(i, t)) return e(void 0);
          var s = As.createReadStream(
            t
          );
          Pt.getPassword(r, s, e);
        });
      };
      _r.exports.warnTo = Pt.warnTo;
    });
    _s = {};
    ie(_s, { default: /* @__PURE__ */ __name2(() => cc, "default") });
    Is = G(() => {
      "use strict";
      p();
      cc = {};
    });
    Ps = T((xh, Ts) => {
      "use strict";
      p();
      var lc = (Zt(), O(gi)), Ir = (br(), O(gr));
      function Tr(r) {
        if (r.charAt(0) === "/") {
          var t = r.split(" ");
          return { host: t[0], database: t[1] };
        }
        var e = lc.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(r) ? encodeURI(r).replace(/\%25(\d\d)/g, "%$1") : r, true), t = e.query;
        for (var n in t) Array.isArray(t[n]) && (t[n] = t[n][t[n].length - 1]);
        var i = (e.auth || ":").split(":");
        if (t.user = i[0], t.password = i.splice(1).join(
          ":"
        ), t.port = e.port, e.protocol == "socket:") return t.host = decodeURI(e.pathname), t.database = e.query.db, t.client_encoding = e.query.encoding, t;
        t.host || (t.host = e.hostname);
        var s = e.pathname;
        if (!t.host && s && /^%2f/i.test(s)) {
          var o = s.split("/");
          t.host = decodeURIComponent(o[0]), s = o.splice(1).join("/");
        }
        switch (s && s.charAt(
          0
        ) === "/" && (s = s.slice(1) || null), t.database = s && decodeURI(s), (t.ssl === "true" || t.ssl === "1") && (t.ssl = true), t.ssl === "0" && (t.ssl = false), (t.sslcert || t.sslkey || t.sslrootcert || t.sslmode) && (t.ssl = {}), t.sslcert && (t.ssl.cert = Ir.readFileSync(t.sslcert).toString()), t.sslkey && (t.ssl.key = Ir.readFileSync(t.sslkey).toString()), t.sslrootcert && (t.ssl.ca = Ir.readFileSync(t.sslrootcert).toString()), t.sslmode) {
          case "disable": {
            t.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            break;
          case "no-verify": {
            t.ssl.rejectUnauthorized = false;
            break;
          }
        }
        return t;
      }
      __name(Tr, "Tr");
      __name2(Tr, "Tr");
      a(Tr, "parse");
      Ts.exports = Tr;
      Tr.parse = Tr;
    });
    Bt = T((Ah, Ls) => {
      "use strict";
      p();
      var fc = (Is(), O(_s)), Rs = tt(), Bs = Ps().parse, H = a(function(r, e, t) {
        return t === void 0 ? t = m.env["PG" + r.toUpperCase()] : t === false || (t = m.env[t]), e[r] || t || Rs[r];
      }, "val"), hc = a(function() {
        switch (m.env.PGSSLMODE) {
          case "disable":
            return false;
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            return true;
          case "no-verify":
            return { rejectUnauthorized: false };
        }
        return Rs.ssl;
      }, "readSSLConfigFromEnvironment"), Oe = a(function(r) {
        return "'" + ("" + r).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
      }, "quoteParamValue"), ne = a(function(r, e, t) {
        var n = e[t];
        n != null && r.push(t + "=" + Oe(n));
      }, "add"), Br = class Br {
        static {
          __name(this, "Br");
        }
        static {
          __name2(this, "Br");
        }
        constructor(e) {
          e = typeof e == "string" ? Bs(e) : e || {}, e.connectionString && (e = Object.assign({}, e, Bs(e.connectionString))), this.user = H("user", e), this.database = H("database", e), this.database === void 0 && (this.database = this.user), this.port = parseInt(H("port", e), 10), this.host = H("host", e), Object.defineProperty(this, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: H("password", e)
          }), this.binary = H("binary", e), this.options = H("options", e), this.ssl = typeof e.ssl > "u" ? hc() : e.ssl, typeof this.ssl == "string" && this.ssl === "true" && (this.ssl = true), this.ssl === "no-verify" && (this.ssl = { rejectUnauthorized: false }), this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this.client_encoding = H("client_encoding", e), this.replication = H("replication", e), this.isDomainSocket = !(this.host || "").indexOf("/"), this.application_name = H("application_name", e, "PGAPPNAME"), this.fallback_application_name = H("fallback_application_name", e, false), this.statement_timeout = H("statement_timeout", e, false), this.lock_timeout = H("lock_timeout", e, false), this.idle_in_transaction_session_timeout = H("idle_in_transaction_session_timeout", e, false), this.query_timeout = H("query_timeout", e, false), e.connectionTimeoutMillis === void 0 ? this.connect_timeout = m.env.PGCONNECT_TIMEOUT || 0 : this.connect_timeout = Math.floor(e.connectionTimeoutMillis / 1e3), e.keepAlive === false ? this.keepalives = 0 : e.keepAlive === true && (this.keepalives = 1), typeof e.keepAliveInitialDelayMillis == "number" && (this.keepalives_idle = Math.floor(e.keepAliveInitialDelayMillis / 1e3));
        }
        getLibpqConnectionString(e) {
          var t = [];
          ne(t, this, "user"), ne(t, this, "password"), ne(t, this, "port"), ne(t, this, "application_name"), ne(
            t,
            this,
            "fallback_application_name"
          ), ne(t, this, "connect_timeout"), ne(t, this, "options");
          var n = typeof this.ssl == "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
          if (ne(t, n, "sslmode"), ne(t, n, "sslca"), ne(t, n, "sslkey"), ne(t, n, "sslcert"), ne(t, n, "sslrootcert"), this.database && t.push("dbname=" + Oe(this.database)), this.replication && t.push("replication=" + Oe(this.replication)), this.host && t.push("host=" + Oe(this.host)), this.isDomainSocket) return e(null, t.join(" "));
          this.client_encoding && t.push("client_encoding=" + Oe(this.client_encoding)), fc.lookup(this.host, function(i, s) {
            return i ? e(i, null) : (t.push("hostaddr=" + Oe(s)), e(null, t.join(" ")));
          });
        }
      };
      a(Br, "ConnectionParameters");
      var Pr = Br;
      Ls.exports = Pr;
    });
    Ms = T((Ih, ks) => {
      "use strict";
      p();
      var pc = Je(), Fs = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/, Lr = class Lr {
        static {
          __name(this, "Lr");
        }
        static {
          __name2(this, "Lr");
        }
        constructor(e, t) {
          this.command = null, this.rowCount = null, this.oid = null, this.rows = [], this.fields = [], this._parsers = void 0, this._types = t, this.RowCtor = null, this.rowAsArray = e === "array", this.rowAsArray && (this.parseRow = this._parseRowAsArray);
        }
        addCommandComplete(e) {
          var t;
          e.text ? t = Fs.exec(e.text) : t = Fs.exec(e.command), t && (this.command = t[1], t[3] ? (this.oid = parseInt(
            t[2],
            10
          ), this.rowCount = parseInt(t[3], 10)) : t[2] && (this.rowCount = parseInt(t[2], 10)));
        }
        _parseRowAsArray(e) {
          for (var t = new Array(
            e.length
          ), n = 0, i = e.length; n < i; n++) {
            var s = e[n];
            s !== null ? t[n] = this._parsers[n](s) : t[n] = null;
          }
          return t;
        }
        parseRow(e) {
          for (var t = {}, n = 0, i = e.length; n < i; n++) {
            var s = e[n], o = this.fields[n].name;
            s !== null ? t[o] = this._parsers[n](
              s
            ) : t[o] = null;
          }
          return t;
        }
        addRow(e) {
          this.rows.push(e);
        }
        addFields(e) {
          this.fields = e, this.fields.length && (this._parsers = new Array(e.length));
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            this._types ? this._parsers[t] = this._types.getTypeParser(n.dataTypeID, n.format || "text") : this._parsers[t] = pc.getTypeParser(n.dataTypeID, n.format || "text");
          }
        }
      };
      a(Lr, "Result");
      var Rr = Lr;
      ks.exports = Rr;
    });
    qs = T((Bh, Os) => {
      "use strict";
      p();
      var { EventEmitter: dc } = ge(), Us = Ms(), Ds = rt(), kr = class kr extends dc {
        static {
          __name(this, "kr");
        }
        static {
          __name2(this, "kr");
        }
        constructor(e, t, n) {
          super(), e = Ds.normalizeQueryConfig(e, t, n), this.text = e.text, this.values = e.values, this.rows = e.rows, this.types = e.types, this.name = e.name, this.binary = e.binary, this.portal = e.portal || "", this.callback = e.callback, this._rowMode = e.rowMode, m.domain && e.callback && (this.callback = m.domain.bind(e.callback)), this._result = new Us(this._rowMode, this.types), this._results = this._result, this.isPreparedStatement = false, this._canceledDueToError = false, this._promise = null;
        }
        requiresPreparation() {
          return this.name || this.rows ? true : !this.text || !this.values ? false : this.values.length > 0;
        }
        _checkForMultirow() {
          this._result.command && (Array.isArray(this._results) || (this._results = [this._result]), this._result = new Us(this._rowMode, this.types), this._results.push(this._result));
        }
        handleRowDescription(e) {
          this._checkForMultirow(), this._result.addFields(e.fields), this._accumulateRows = this.callback || !this.listeners("row").length;
        }
        handleDataRow(e) {
          let t;
          if (!this._canceledDueToError) {
            try {
              t = this._result.parseRow(
                e.fields
              );
            } catch (n) {
              this._canceledDueToError = n;
              return;
            }
            this.emit("row", t, this._result), this._accumulateRows && this._result.addRow(t);
          }
        }
        handleCommandComplete(e, t) {
          this._checkForMultirow(), this._result.addCommandComplete(
            e
          ), this.rows && t.sync();
        }
        handleEmptyQuery(e) {
          this.rows && e.sync();
        }
        handleError(e, t) {
          if (this._canceledDueToError && (e = this._canceledDueToError, this._canceledDueToError = false), this.callback) return this.callback(e);
          this.emit("error", e);
        }
        handleReadyForQuery(e) {
          if (this._canceledDueToError) return this.handleError(
            this._canceledDueToError,
            e
          );
          if (this.callback) try {
            this.callback(null, this._results);
          } catch (t) {
            m.nextTick(() => {
              throw t;
            });
          }
          this.emit(
            "end",
            this._results
          );
        }
        submit(e) {
          if (typeof this.text != "string" && typeof this.name != "string") return new Error(
            "A query must have either text or a name. Supplying neither is unsupported."
          );
          let t = e.parsedStatements[this.name];
          return this.text && t && this.text !== t ? new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`) : this.values && !Array.isArray(this.values) ? new Error("Query values must be an array") : (this.requiresPreparation() ? this.prepare(e) : e.query(this.text), null);
        }
        hasBeenParsed(e) {
          return this.name && e.parsedStatements[this.name];
        }
        handlePortalSuspended(e) {
          this._getRows(e, this.rows);
        }
        _getRows(e, t) {
          e.execute({ portal: this.portal, rows: t }), t ? e.flush() : e.sync();
        }
        prepare(e) {
          this.isPreparedStatement = true, this.hasBeenParsed(e) || e.parse({ text: this.text, name: this.name, types: this.types });
          try {
            e.bind({ portal: this.portal, statement: this.name, values: this.values, binary: this.binary, valueMapper: Ds.prepareValue });
          } catch (t) {
            this.handleError(t, e);
            return;
          }
          e.describe({ type: "P", name: this.portal || "" }), this._getRows(e, this.rows);
        }
        handleCopyInResponse(e) {
          e.sendCopyFail("No source stream defined");
        }
        handleCopyData(e, t) {
        }
      };
      a(kr, "Query");
      var Fr = kr;
      Os.exports = Fr;
    });
    ln = T((_) => {
      "use strict";
      p();
      Object.defineProperty(_, "__esModule", { value: true });
      _.NoticeMessage = _.DataRowMessage = _.CommandCompleteMessage = _.ReadyForQueryMessage = _.NotificationResponseMessage = _.BackendKeyDataMessage = _.AuthenticationMD5Password = _.ParameterStatusMessage = _.ParameterDescriptionMessage = _.RowDescriptionMessage = _.Field = _.CopyResponse = _.CopyDataMessage = _.DatabaseError = _.copyDone = _.emptyQuery = _.replicationStart = _.portalSuspended = _.noData = _.closeComplete = _.bindComplete = _.parseComplete = void 0;
      _.parseComplete = { name: "parseComplete", length: 5 };
      _.bindComplete = { name: "bindComplete", length: 5 };
      _.closeComplete = { name: "closeComplete", length: 5 };
      _.noData = { name: "noData", length: 5 };
      _.portalSuspended = { name: "portalSuspended", length: 5 };
      _.replicationStart = { name: "replicationStart", length: 4 };
      _.emptyQuery = { name: "emptyQuery", length: 4 };
      _.copyDone = { name: "copyDone", length: 4 };
      var Kr = class Kr extends Error {
        static {
          __name(this, "Kr");
        }
        static {
          __name2(this, "Kr");
        }
        constructor(e, t, n) {
          super(e), this.length = t, this.name = n;
        }
      };
      a(Kr, "DatabaseError");
      var Mr = Kr;
      _.DatabaseError = Mr;
      var Yr = class Yr {
        static {
          __name(this, "Yr");
        }
        static {
          __name2(this, "Yr");
        }
        constructor(e, t) {
          this.length = e, this.chunk = t, this.name = "copyData";
        }
      };
      a(Yr, "CopyDataMessage");
      var Ur = Yr;
      _.CopyDataMessage = Ur;
      var Zr = class Zr {
        static {
          __name(this, "Zr");
        }
        static {
          __name2(this, "Zr");
        }
        constructor(e, t, n, i) {
          this.length = e, this.name = t, this.binary = n, this.columnTypes = new Array(i);
        }
      };
      a(Zr, "CopyResponse");
      var Dr = Zr;
      _.CopyResponse = Dr;
      var Jr = class Jr {
        static {
          __name(this, "Jr");
        }
        static {
          __name2(this, "Jr");
        }
        constructor(e, t, n, i, s, o, u) {
          this.name = e, this.tableID = t, this.columnID = n, this.dataTypeID = i, this.dataTypeSize = s, this.dataTypeModifier = o, this.format = u;
        }
      };
      a(Jr, "Field");
      var Or = Jr;
      _.Field = Or;
      var Xr = class Xr {
        static {
          __name(this, "Xr");
        }
        static {
          __name2(this, "Xr");
        }
        constructor(e, t) {
          this.length = e, this.fieldCount = t, this.name = "rowDescription", this.fields = new Array(this.fieldCount);
        }
      };
      a(Xr, "RowDescriptionMessage");
      var qr = Xr;
      _.RowDescriptionMessage = qr;
      var en = class en {
        static {
          __name(this, "en");
        }
        static {
          __name2(this, "en");
        }
        constructor(e, t) {
          this.length = e, this.parameterCount = t, this.name = "parameterDescription", this.dataTypeIDs = new Array(this.parameterCount);
        }
      };
      a(en, "ParameterDescriptionMessage");
      var Qr = en;
      _.ParameterDescriptionMessage = Qr;
      var tn = class tn {
        static {
          __name(this, "tn");
        }
        static {
          __name2(this, "tn");
        }
        constructor(e, t, n) {
          this.length = e, this.parameterName = t, this.parameterValue = n, this.name = "parameterStatus";
        }
      };
      a(tn, "ParameterStatusMessage");
      var Nr = tn;
      _.ParameterStatusMessage = Nr;
      var rn = class rn {
        static {
          __name(this, "rn");
        }
        static {
          __name2(this, "rn");
        }
        constructor(e, t) {
          this.length = e, this.salt = t, this.name = "authenticationMD5Password";
        }
      };
      a(rn, "AuthenticationMD5Password");
      var Wr = rn;
      _.AuthenticationMD5Password = Wr;
      var nn = class nn {
        static {
          __name(this, "nn");
        }
        static {
          __name2(this, "nn");
        }
        constructor(e, t, n) {
          this.length = e, this.processID = t, this.secretKey = n, this.name = "backendKeyData";
        }
      };
      a(nn, "BackendKeyDataMessage");
      var jr = nn;
      _.BackendKeyDataMessage = jr;
      var sn = class sn {
        static {
          __name(this, "sn");
        }
        static {
          __name2(this, "sn");
        }
        constructor(e, t, n, i) {
          this.length = e, this.processId = t, this.channel = n, this.payload = i, this.name = "notification";
        }
      };
      a(sn, "NotificationResponseMessage");
      var Hr = sn;
      _.NotificationResponseMessage = Hr;
      var on22 = class on {
        static {
          __name(this, "on");
        }
        static {
          __name2(this, "on");
        }
        constructor(e, t) {
          this.length = e, this.status = t, this.name = "readyForQuery";
        }
      };
      a(on22, "ReadyForQueryMessage");
      var $r = on22;
      _.ReadyForQueryMessage = $r;
      var an = class an {
        static {
          __name(this, "an");
        }
        static {
          __name2(this, "an");
        }
        constructor(e, t) {
          this.length = e, this.text = t, this.name = "commandComplete";
        }
      };
      a(an, "CommandCompleteMessage");
      var Gr = an;
      _.CommandCompleteMessage = Gr;
      var un = class un {
        static {
          __name(this, "un");
        }
        static {
          __name2(this, "un");
        }
        constructor(e, t) {
          this.length = e, this.fields = t, this.name = "dataRow", this.fieldCount = t.length;
        }
      };
      a(un, "DataRowMessage");
      var Vr = un;
      _.DataRowMessage = Vr;
      var cn = class cn {
        static {
          __name(this, "cn");
        }
        static {
          __name2(this, "cn");
        }
        constructor(e, t) {
          this.length = e, this.message = t, this.name = "notice";
        }
      };
      a(cn, "NoticeMessage");
      var zr = cn;
      _.NoticeMessage = zr;
    });
    Qs = T((Rt) => {
      "use strict";
      p();
      Object.defineProperty(Rt, "__esModule", { value: true });
      Rt.Writer = void 0;
      var hn = class hn {
        static {
          __name(this, "hn");
        }
        static {
          __name2(this, "hn");
        }
        constructor(e = 256) {
          this.size = e, this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(e);
        }
        ensure(e) {
          if (this.buffer.length - this.offset < e) {
            let n = this.buffer, i = n.length + (n.length >> 1) + e;
            this.buffer = d.allocUnsafe(i), n.copy(
              this.buffer
            );
          }
        }
        addInt32(e) {
          return this.ensure(4), this.buffer[this.offset++] = e >>> 24 & 255, this.buffer[this.offset++] = e >>> 16 & 255, this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addInt16(e) {
          return this.ensure(2), this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addCString(e) {
          if (!e) this.ensure(1);
          else {
            let t = d.byteLength(e);
            this.ensure(t + 1), this.buffer.write(e, this.offset, "utf-8"), this.offset += t;
          }
          return this.buffer[this.offset++] = 0, this;
        }
        addString(e = "") {
          let t = d.byteLength(e);
          return this.ensure(t), this.buffer.write(e, this.offset), this.offset += t, this;
        }
        add(e) {
          return this.ensure(
            e.length
          ), e.copy(this.buffer, this.offset), this.offset += e.length, this;
        }
        join(e) {
          if (e) {
            this.buffer[this.headerPosition] = e;
            let t = this.offset - (this.headerPosition + 1);
            this.buffer.writeInt32BE(t, this.headerPosition + 1);
          }
          return this.buffer.slice(e ? 0 : 5, this.offset);
        }
        flush(e) {
          let t = this.join(e);
          return this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(this.size), t;
        }
      };
      a(hn, "Writer");
      var fn = hn;
      Rt.Writer = fn;
    });
    Ws = T((Ft) => {
      "use strict";
      p();
      Object.defineProperty(Ft, "__esModule", { value: true });
      Ft.serialize = void 0;
      var pn = Qs(), F = new pn.Writer(), yc = a((r) => {
        F.addInt16(3).addInt16(0);
        for (let n of Object.keys(r)) F.addCString(
          n
        ).addCString(r[n]);
        F.addCString("client_encoding").addCString("UTF8");
        let e = F.addCString("").flush(), t = e.length + 4;
        return new pn.Writer().addInt32(t).add(e).flush();
      }, "startup"), mc = a(() => {
        let r = d.allocUnsafe(
          8
        );
        return r.writeInt32BE(8, 0), r.writeInt32BE(80877103, 4), r;
      }, "requestSsl"), wc = a((r) => F.addCString(r).flush(
        112
      ), "password"), gc = a(function(r, e) {
        return F.addCString(r).addInt32(d.byteLength(e)).addString(e), F.flush(112);
      }, "sendSASLInitialResponseMessage"), bc = a(function(r) {
        return F.addString(r).flush(112);
      }, "sendSCRAMClientFinalMessage"), vc = a((r) => F.addCString(r).flush(81), "query"), Ns = [], xc = a((r) => {
        let e = r.name || "";
        e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
        let t = r.types || Ns, n = t.length, i = F.addCString(e).addCString(r.text).addInt16(n);
        for (let s = 0; s < n; s++) i.addInt32(t[s]);
        return F.flush(80);
      }, "parse"), qe = new pn.Writer(), Sc = a(function(r, e) {
        for (let t = 0; t < r.length; t++) {
          let n = e ? e(r[t], t) : r[t];
          n == null ? (F.addInt16(0), qe.addInt32(-1)) : n instanceof d ? (F.addInt16(
            1
          ), qe.addInt32(n.length), qe.add(n)) : (F.addInt16(0), qe.addInt32(d.byteLength(n)), qe.addString(n));
        }
      }, "writeValues"), Ec = a((r = {}) => {
        let e = r.portal || "", t = r.statement || "", n = r.binary || false, i = r.values || Ns, s = i.length;
        return F.addCString(e).addCString(t), F.addInt16(s), Sc(i, r.valueMapper), F.addInt16(s), F.add(qe.flush()), F.addInt16(n ? 1 : 0), F.flush(66);
      }, "bind"), Ac = d.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]), Cc = a((r) => {
        if (!r || !r.portal && !r.rows) return Ac;
        let e = r.portal || "", t = r.rows || 0, n = d.byteLength(e), i = 4 + n + 1 + 4, s = d.allocUnsafe(1 + i);
        return s[0] = 69, s.writeInt32BE(i, 1), s.write(e, 5, "utf-8"), s[n + 5] = 0, s.writeUInt32BE(t, s.length - 4), s;
      }, "execute"), _c = a(
        (r, e) => {
          let t = d.allocUnsafe(16);
          return t.writeInt32BE(16, 0), t.writeInt16BE(1234, 4), t.writeInt16BE(
            5678,
            6
          ), t.writeInt32BE(r, 8), t.writeInt32BE(e, 12), t;
        },
        "cancel"
      ), dn = a((r, e) => {
        let n = 4 + d.byteLength(e) + 1, i = d.allocUnsafe(1 + n);
        return i[0] = r, i.writeInt32BE(n, 1), i.write(e, 5, "utf-8"), i[n] = 0, i;
      }, "cstringMessage"), Ic = F.addCString("P").flush(68), Tc = F.addCString("S").flush(68), Pc = a((r) => r.name ? dn(68, `${r.type}${r.name || ""}`) : r.type === "P" ? Ic : Tc, "describe"), Bc = a((r) => {
        let e = `${r.type}${r.name || ""}`;
        return dn(67, e);
      }, "close"), Rc = a((r) => F.add(r).flush(100), "copyData"), Lc = a((r) => dn(102, r), "copyFail"), Lt = a((r) => d.from([r, 0, 0, 0, 4]), "codeOnlyBuffer"), Fc = Lt(72), kc = Lt(83), Mc = Lt(88), Uc = Lt(99), Dc = {
        startup: yc,
        password: wc,
        requestSsl: mc,
        sendSASLInitialResponseMessage: gc,
        sendSCRAMClientFinalMessage: bc,
        query: vc,
        parse: xc,
        bind: Ec,
        execute: Cc,
        describe: Pc,
        close: Bc,
        flush: a(
          () => Fc,
          "flush"
        ),
        sync: a(() => kc, "sync"),
        end: a(() => Mc, "end"),
        copyData: Rc,
        copyDone: a(() => Uc, "copyDone"),
        copyFail: Lc,
        cancel: _c
      };
      Ft.serialize = Dc;
    });
    js = T((kt) => {
      "use strict";
      p();
      Object.defineProperty(kt, "__esModule", { value: true });
      kt.BufferReader = void 0;
      var Oc = d.allocUnsafe(0), mn = class mn {
        static {
          __name(this, "mn");
        }
        static {
          __name2(this, "mn");
        }
        constructor(e = 0) {
          this.offset = e, this.buffer = Oc, this.encoding = "utf-8";
        }
        setBuffer(e, t) {
          this.offset = e, this.buffer = t;
        }
        int16() {
          let e = this.buffer.readInt16BE(this.offset);
          return this.offset += 2, e;
        }
        byte() {
          let e = this.buffer[this.offset];
          return this.offset++, e;
        }
        int32() {
          let e = this.buffer.readInt32BE(
            this.offset
          );
          return this.offset += 4, e;
        }
        uint32() {
          let e = this.buffer.readUInt32BE(this.offset);
          return this.offset += 4, e;
        }
        string(e) {
          let t = this.buffer.toString(this.encoding, this.offset, this.offset + e);
          return this.offset += e, t;
        }
        cstring() {
          let e = this.offset, t = e;
          for (; this.buffer[t++] !== 0; ) ;
          return this.offset = t, this.buffer.toString(this.encoding, e, t - 1);
        }
        bytes(e) {
          let t = this.buffer.slice(this.offset, this.offset + e);
          return this.offset += e, t;
        }
      };
      a(mn, "BufferReader");
      var yn = mn;
      kt.BufferReader = yn;
    });
    Gs = T((Mt) => {
      "use strict";
      p();
      Object.defineProperty(Mt, "__esModule", { value: true });
      Mt.Parser = void 0;
      var k = ln(), qc = js(), wn = 1, Qc = 4, Hs = wn + Qc, $s = d.allocUnsafe(0), bn = class bn {
        static {
          __name(this, "bn");
        }
        static {
          __name2(this, "bn");
        }
        constructor(e) {
          if (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0, this.reader = new qc.BufferReader(), e?.mode === "binary") throw new Error("Binary mode not supported yet");
          this.mode = e?.mode || "text";
        }
        parse(e, t) {
          this.mergeBuffer(e);
          let n = this.bufferOffset + this.bufferLength, i = this.bufferOffset;
          for (; i + Hs <= n; ) {
            let s = this.buffer[i], o = this.buffer.readUInt32BE(
              i + wn
            ), u = wn + o;
            if (u + i <= n) {
              let c = this.handlePacket(i + Hs, s, o, this.buffer);
              t(c), i += u;
            } else break;
          }
          i === n ? (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0) : (this.bufferLength = n - i, this.bufferOffset = i);
        }
        mergeBuffer(e) {
          if (this.bufferLength > 0) {
            let t = this.bufferLength + e.byteLength;
            if (t + this.bufferOffset > this.buffer.byteLength) {
              let i;
              if (t <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) i = this.buffer;
              else {
                let s = this.buffer.byteLength * 2;
                for (; t >= s; ) s *= 2;
                i = d.allocUnsafe(s);
              }
              this.buffer.copy(i, 0, this.bufferOffset, this.bufferOffset + this.bufferLength), this.buffer = i, this.bufferOffset = 0;
            }
            e.copy(this.buffer, this.bufferOffset + this.bufferLength), this.bufferLength = t;
          } else this.buffer = e, this.bufferOffset = 0, this.bufferLength = e.byteLength;
        }
        handlePacket(e, t, n, i) {
          switch (t) {
            case 50:
              return k.bindComplete;
            case 49:
              return k.parseComplete;
            case 51:
              return k.closeComplete;
            case 110:
              return k.noData;
            case 115:
              return k.portalSuspended;
            case 99:
              return k.copyDone;
            case 87:
              return k.replicationStart;
            case 73:
              return k.emptyQuery;
            case 68:
              return this.parseDataRowMessage(e, n, i);
            case 67:
              return this.parseCommandCompleteMessage(
                e,
                n,
                i
              );
            case 90:
              return this.parseReadyForQueryMessage(e, n, i);
            case 65:
              return this.parseNotificationMessage(
                e,
                n,
                i
              );
            case 82:
              return this.parseAuthenticationResponse(e, n, i);
            case 83:
              return this.parseParameterStatusMessage(
                e,
                n,
                i
              );
            case 75:
              return this.parseBackendKeyData(e, n, i);
            case 69:
              return this.parseErrorMessage(e, n, i, "error");
            case 78:
              return this.parseErrorMessage(e, n, i, "notice");
            case 84:
              return this.parseRowDescriptionMessage(
                e,
                n,
                i
              );
            case 116:
              return this.parseParameterDescriptionMessage(e, n, i);
            case 71:
              return this.parseCopyInMessage(
                e,
                n,
                i
              );
            case 72:
              return this.parseCopyOutMessage(e, n, i);
            case 100:
              return this.parseCopyData(e, n, i);
            default:
              return new k.DatabaseError("received invalid response: " + t.toString(16), n, "error");
          }
        }
        parseReadyForQueryMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.string(1);
          return new k.ReadyForQueryMessage(t, i);
        }
        parseCommandCompleteMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.cstring();
          return new k.CommandCompleteMessage(t, i);
        }
        parseCopyData(e, t, n) {
          let i = n.slice(e, e + (t - 4));
          return new k.CopyDataMessage(t, i);
        }
        parseCopyInMessage(e, t, n) {
          return this.parseCopyMessage(
            e,
            t,
            n,
            "copyInResponse"
          );
        }
        parseCopyOutMessage(e, t, n) {
          return this.parseCopyMessage(e, t, n, "copyOutResponse");
        }
        parseCopyMessage(e, t, n, i) {
          this.reader.setBuffer(e, n);
          let s = this.reader.byte() !== 0, o = this.reader.int16(), u = new k.CopyResponse(t, i, s, o);
          for (let c = 0; c < o; c++) u.columnTypes[c] = this.reader.int16();
          return u;
        }
        parseNotificationMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int32(), s = this.reader.cstring(), o = this.reader.cstring();
          return new k.NotificationResponseMessage(t, i, s, o);
        }
        parseRowDescriptionMessage(e, t, n) {
          this.reader.setBuffer(
            e,
            n
          );
          let i = this.reader.int16(), s = new k.RowDescriptionMessage(t, i);
          for (let o = 0; o < i; o++) s.fields[o] = this.parseField();
          return s;
        }
        parseField() {
          let e = this.reader.cstring(), t = this.reader.uint32(), n = this.reader.int16(), i = this.reader.uint32(), s = this.reader.int16(), o = this.reader.int32(), u = this.reader.int16() === 0 ? "text" : "binary";
          return new k.Field(e, t, n, i, s, o, u);
        }
        parseParameterDescriptionMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int16(), s = new k.ParameterDescriptionMessage(t, i);
          for (let o = 0; o < i; o++)
            s.dataTypeIDs[o] = this.reader.int32();
          return s;
        }
        parseDataRowMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int16(), s = new Array(i);
          for (let o = 0; o < i; o++) {
            let u = this.reader.int32();
            s[o] = u === -1 ? null : this.reader.string(u);
          }
          return new k.DataRowMessage(t, s);
        }
        parseParameterStatusMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.cstring(), s = this.reader.cstring();
          return new k.ParameterStatusMessage(
            t,
            i,
            s
          );
        }
        parseBackendKeyData(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int32(), s = this.reader.int32();
          return new k.BackendKeyDataMessage(t, i, s);
        }
        parseAuthenticationResponse(e, t, n) {
          this.reader.setBuffer(
            e,
            n
          );
          let i = this.reader.int32(), s = { name: "authenticationOk", length: t };
          switch (i) {
            case 0:
              break;
            case 3:
              s.length === 8 && (s.name = "authenticationCleartextPassword");
              break;
            case 5:
              if (s.length === 12) {
                s.name = "authenticationMD5Password";
                let o = this.reader.bytes(4);
                return new k.AuthenticationMD5Password(t, o);
              }
              break;
            case 10:
              {
                s.name = "authenticationSASL", s.mechanisms = [];
                let o;
                do
                  o = this.reader.cstring(), o && s.mechanisms.push(o);
                while (o);
              }
              break;
            case 11:
              s.name = "authenticationSASLContinue", s.data = this.reader.string(t - 8);
              break;
            case 12:
              s.name = "authenticationSASLFinal", s.data = this.reader.string(t - 8);
              break;
            default:
              throw new Error("Unknown authenticationOk message type " + i);
          }
          return s;
        }
        parseErrorMessage(e, t, n, i) {
          this.reader.setBuffer(e, n);
          let s = {}, o = this.reader.string(1);
          for (; o !== "\0"; ) s[o] = this.reader.cstring(), o = this.reader.string(1);
          let u = s.M, c = i === "notice" ? new k.NoticeMessage(t, u) : new k.DatabaseError(u, t, i);
          return c.severity = s.S, c.code = s.C, c.detail = s.D, c.hint = s.H, c.position = s.P, c.internalPosition = s.p, c.internalQuery = s.q, c.where = s.W, c.schema = s.s, c.table = s.t, c.column = s.c, c.dataType = s.d, c.constraint = s.n, c.file = s.F, c.line = s.L, c.routine = s.R, c;
        }
      };
      a(bn, "Parser");
      var gn = bn;
      Mt.Parser = gn;
    });
    vn = T((xe) => {
      "use strict";
      p();
      Object.defineProperty(xe, "__esModule", { value: true });
      xe.DatabaseError = xe.serialize = xe.parse = void 0;
      var Nc = ln();
      Object.defineProperty(xe, "DatabaseError", { enumerable: true, get: a(
        function() {
          return Nc.DatabaseError;
        },
        "get"
      ) });
      var Wc = Ws();
      Object.defineProperty(xe, "serialize", {
        enumerable: true,
        get: a(function() {
          return Wc.serialize;
        }, "get")
      });
      var jc = Gs();
      function Hc(r, e) {
        let t = new jc.Parser();
        return r.on("data", (n) => t.parse(n, e)), new Promise((n) => r.on("end", () => n()));
      }
      __name(Hc, "Hc");
      __name2(Hc, "Hc");
      a(Hc, "parse");
      xe.parse = Hc;
    });
    Vs = {};
    ie(Vs, { connect: /* @__PURE__ */ __name2(() => $c, "connect") });
    __name2($c, "$c");
    zs = G(
      () => {
        "use strict";
        p();
        a($c, "connect");
      }
    );
    En = T((Xh, Zs) => {
      "use strict";
      p();
      var Ks = (Fe(), O(wi)), Gc = ge().EventEmitter, { parse: Vc, serialize: Q } = vn(), Ys = Q.flush(), zc = Q.sync(), Kc = Q.end(), Sn = class Sn extends Gc {
        static {
          __name(this, "Sn");
        }
        static {
          __name2(this, "Sn");
        }
        constructor(e) {
          super(), e = e || {}, this.stream = e.stream || new Ks.Socket(), this._keepAlive = e.keepAlive, this._keepAliveInitialDelayMillis = e.keepAliveInitialDelayMillis, this.lastBuffer = false, this.parsedStatements = {}, this.ssl = e.ssl || false, this._ending = false, this._emitMessage = false;
          var t = this;
          this.on("newListener", function(n) {
            n === "message" && (t._emitMessage = true);
          });
        }
        connect(e, t) {
          var n = this;
          this._connecting = true, this.stream.setNoDelay(true), this.stream.connect(e, t), this.stream.once("connect", function() {
            n._keepAlive && n.stream.setKeepAlive(true, n._keepAliveInitialDelayMillis), n.emit("connect");
          });
          let i = a(function(s) {
            n._ending && (s.code === "ECONNRESET" || s.code === "EPIPE") || n.emit("error", s);
          }, "reportStreamError");
          if (this.stream.on("error", i), this.stream.on("close", function() {
            n.emit("end");
          }), !this.ssl) return this.attachListeners(
            this.stream
          );
          this.stream.once("data", function(s) {
            var o = s.toString("utf8");
            switch (o) {
              case "S":
                break;
              case "N":
                return n.stream.end(), n.emit("error", new Error("The server does not support SSL connections"));
              default:
                return n.stream.end(), n.emit("error", new Error("There was an error establishing an SSL connection"));
            }
            var u = (zs(), O(Vs));
            let c = { socket: n.stream };
            n.ssl !== true && (Object.assign(c, n.ssl), "key" in n.ssl && (c.key = n.ssl.key)), Ks.isIP(t) === 0 && (c.servername = t);
            try {
              n.stream = u.connect(c);
            } catch (l) {
              return n.emit(
                "error",
                l
              );
            }
            n.attachListeners(n.stream), n.stream.on("error", i), n.emit("sslconnect");
          });
        }
        attachListeners(e) {
          e.on(
            "end",
            () => {
              this.emit("end");
            }
          ), Vc(e, (t) => {
            var n = t.name === "error" ? "errorMessage" : t.name;
            this._emitMessage && this.emit("message", t), this.emit(n, t);
          });
        }
        requestSsl() {
          this.stream.write(Q.requestSsl());
        }
        startup(e) {
          this.stream.write(Q.startup(e));
        }
        cancel(e, t) {
          this._send(Q.cancel(e, t));
        }
        password(e) {
          this._send(Q.password(e));
        }
        sendSASLInitialResponseMessage(e, t) {
          this._send(Q.sendSASLInitialResponseMessage(e, t));
        }
        sendSCRAMClientFinalMessage(e) {
          this._send(Q.sendSCRAMClientFinalMessage(
            e
          ));
        }
        _send(e) {
          return this.stream.writable ? this.stream.write(e) : false;
        }
        query(e) {
          this._send(Q.query(e));
        }
        parse(e) {
          this._send(Q.parse(e));
        }
        bind(e) {
          this._send(Q.bind(e));
        }
        execute(e) {
          this._send(Q.execute(e));
        }
        flush() {
          this.stream.writable && this.stream.write(Ys);
        }
        sync() {
          this._ending = true, this._send(Ys), this._send(zc);
        }
        ref() {
          this.stream.ref();
        }
        unref() {
          this.stream.unref();
        }
        end() {
          if (this._ending = true, !this._connecting || !this.stream.writable) {
            this.stream.end();
            return;
          }
          return this.stream.write(Kc, () => {
            this.stream.end();
          });
        }
        close(e) {
          this._send(Q.close(e));
        }
        describe(e) {
          this._send(Q.describe(e));
        }
        sendCopyFromChunk(e) {
          this._send(Q.copyData(e));
        }
        endCopyFrom() {
          this._send(Q.copyDone());
        }
        sendCopyFail(e) {
          this._send(Q.copyFail(e));
        }
      };
      a(Sn, "Connection");
      var xn = Sn;
      Zs.exports = xn;
    });
    eo = T((np, Xs) => {
      "use strict";
      p();
      var Yc = ge().EventEmitter, rp = (it(), O(nt)), Zc = rt(), An = ds(), Jc = Cs(), Xc = At(), el = Bt(), Js = qs(), tl = tt(), rl = En(), Cn = class Cn extends Yc {
        static {
          __name(this, "Cn");
        }
        static {
          __name2(this, "Cn");
        }
        constructor(e) {
          super(), this.connectionParameters = new el(e), this.user = this.connectionParameters.user, this.database = this.connectionParameters.database, this.port = this.connectionParameters.port, this.host = this.connectionParameters.host, Object.defineProperty(
            this,
            "password",
            { configurable: true, enumerable: false, writable: true, value: this.connectionParameters.password }
          ), this.replication = this.connectionParameters.replication;
          var t = e || {};
          this._Promise = t.Promise || b.Promise, this._types = new Xc(t.types), this._ending = false, this._connecting = false, this._connected = false, this._connectionError = false, this._queryable = true, this.connection = t.connection || new rl({ stream: t.stream, ssl: this.connectionParameters.ssl, keepAlive: t.keepAlive || false, keepAliveInitialDelayMillis: t.keepAliveInitialDelayMillis || 0, encoding: this.connectionParameters.client_encoding || "utf8" }), this.queryQueue = [], this.binary = t.binary || tl.binary, this.processID = null, this.secretKey = null, this.ssl = this.connectionParameters.ssl || false, this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this._connectionTimeoutMillis = t.connectionTimeoutMillis || 0;
        }
        _errorAllQueries(e) {
          let t = a((n) => {
            m.nextTick(() => {
              n.handleError(e, this.connection);
            });
          }, "enqueueError");
          this.activeQuery && (t(this.activeQuery), this.activeQuery = null), this.queryQueue.forEach(t), this.queryQueue.length = 0;
        }
        _connect(e) {
          var t = this, n = this.connection;
          if (this._connectionCallback = e, this._connecting || this._connected) {
            let i = new Error("Client has already been connected. You cannot reuse a client.");
            m.nextTick(
              () => {
                e(i);
              }
            );
            return;
          }
          this._connecting = true, this.connectionTimeoutHandle, this._connectionTimeoutMillis > 0 && (this.connectionTimeoutHandle = setTimeout(() => {
            n._ending = true, n.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis)), this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
            t.ssl ? n.requestSsl() : n.startup(t.getStartupConf());
          }), n.on("sslconnect", function() {
            n.startup(t.getStartupConf());
          }), this._attachListeners(
            n
          ), n.once("end", () => {
            let i = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
            clearTimeout(this.connectionTimeoutHandle), this._errorAllQueries(i), this._ending || (this._connecting && !this._connectionError ? this._connectionCallback ? this._connectionCallback(i) : this._handleErrorEvent(i) : this._connectionError || this._handleErrorEvent(i)), m.nextTick(() => {
              this.emit("end");
            });
          });
        }
        connect(e) {
          if (e) {
            this._connect(e);
            return;
          }
          return new this._Promise((t, n) => {
            this._connect((i) => {
              i ? n(i) : t();
            });
          });
        }
        _attachListeners(e) {
          e.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this)), e.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this)), e.on("authenticationSASL", this._handleAuthSASL.bind(this)), e.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this)), e.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this)), e.on("backendKeyData", this._handleBackendKeyData.bind(this)), e.on("error", this._handleErrorEvent.bind(this)), e.on("errorMessage", this._handleErrorMessage.bind(this)), e.on("readyForQuery", this._handleReadyForQuery.bind(this)), e.on("notice", this._handleNotice.bind(this)), e.on("rowDescription", this._handleRowDescription.bind(this)), e.on("dataRow", this._handleDataRow.bind(this)), e.on("portalSuspended", this._handlePortalSuspended.bind(
            this
          )), e.on("emptyQuery", this._handleEmptyQuery.bind(this)), e.on("commandComplete", this._handleCommandComplete.bind(this)), e.on("parseComplete", this._handleParseComplete.bind(this)), e.on("copyInResponse", this._handleCopyInResponse.bind(this)), e.on("copyData", this._handleCopyData.bind(this)), e.on("notification", this._handleNotification.bind(this));
        }
        _checkPgPass(e) {
          let t = this.connection;
          typeof this.password == "function" ? this._Promise.resolve().then(() => this.password()).then((n) => {
            if (n !== void 0) {
              if (typeof n != "string") {
                t.emit("error", new TypeError(
                  "Password must be a string"
                ));
                return;
              }
              this.connectionParameters.password = this.password = n;
            } else this.connectionParameters.password = this.password = null;
            e();
          }).catch((n) => {
            t.emit("error", n);
          }) : this.password !== null ? e() : Jc(
            this.connectionParameters,
            (n) => {
              n !== void 0 && (this.connectionParameters.password = this.password = n), e();
            }
          );
        }
        _handleAuthCleartextPassword(e) {
          this._checkPgPass(() => {
            this.connection.password(this.password);
          });
        }
        _handleAuthMD5Password(e) {
          this._checkPgPass(
            () => {
              let t = Zc.postgresMd5PasswordHash(this.user, this.password, e.salt);
              this.connection.password(t);
            }
          );
        }
        _handleAuthSASL(e) {
          this._checkPgPass(() => {
            this.saslSession = An.startSession(e.mechanisms), this.connection.sendSASLInitialResponseMessage(
              this.saslSession.mechanism,
              this.saslSession.response
            );
          });
        }
        _handleAuthSASLContinue(e) {
          An.continueSession(
            this.saslSession,
            this.password,
            e.data
          ), this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        }
        _handleAuthSASLFinal(e) {
          An.finalizeSession(this.saslSession, e.data), this.saslSession = null;
        }
        _handleBackendKeyData(e) {
          this.processID = e.processID, this.secretKey = e.secretKey;
        }
        _handleReadyForQuery(e) {
          this._connecting && (this._connecting = false, this._connected = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback && (this._connectionCallback(null, this), this._connectionCallback = null), this.emit("connect"));
          let { activeQuery: t } = this;
          this.activeQuery = null, this.readyForQuery = true, t && t.handleReadyForQuery(this.connection), this._pulseQueryQueue();
        }
        _handleErrorWhileConnecting(e) {
          if (!this._connectionError) {
            if (this._connectionError = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback) return this._connectionCallback(e);
            this.emit("error", e);
          }
        }
        _handleErrorEvent(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          this._queryable = false, this._errorAllQueries(e), this.emit("error", e);
        }
        _handleErrorMessage(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          let t = this.activeQuery;
          if (!t) {
            this._handleErrorEvent(e);
            return;
          }
          this.activeQuery = null, t.handleError(
            e,
            this.connection
          );
        }
        _handleRowDescription(e) {
          this.activeQuery.handleRowDescription(e);
        }
        _handleDataRow(e) {
          this.activeQuery.handleDataRow(e);
        }
        _handlePortalSuspended(e) {
          this.activeQuery.handlePortalSuspended(this.connection);
        }
        _handleEmptyQuery(e) {
          this.activeQuery.handleEmptyQuery(this.connection);
        }
        _handleCommandComplete(e) {
          this.activeQuery.handleCommandComplete(e, this.connection);
        }
        _handleParseComplete(e) {
          this.activeQuery.name && (this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text);
        }
        _handleCopyInResponse(e) {
          this.activeQuery.handleCopyInResponse(this.connection);
        }
        _handleCopyData(e) {
          this.activeQuery.handleCopyData(
            e,
            this.connection
          );
        }
        _handleNotification(e) {
          this.emit("notification", e);
        }
        _handleNotice(e) {
          this.emit("notice", e);
        }
        getStartupConf() {
          var e = this.connectionParameters, t = { user: e.user, database: e.database }, n = e.application_name || e.fallback_application_name;
          return n && (t.application_name = n), e.replication && (t.replication = "" + e.replication), e.statement_timeout && (t.statement_timeout = String(parseInt(e.statement_timeout, 10))), e.lock_timeout && (t.lock_timeout = String(parseInt(e.lock_timeout, 10))), e.idle_in_transaction_session_timeout && (t.idle_in_transaction_session_timeout = String(parseInt(e.idle_in_transaction_session_timeout, 10))), e.options && (t.options = e.options), t;
        }
        cancel(e, t) {
          if (e.activeQuery === t) {
            var n = this.connection;
            this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
              n.cancel(
                e.processID,
                e.secretKey
              );
            });
          } else e.queryQueue.indexOf(t) !== -1 && e.queryQueue.splice(e.queryQueue.indexOf(t), 1);
        }
        setTypeParser(e, t, n) {
          return this._types.setTypeParser(e, t, n);
        }
        getTypeParser(e, t) {
          return this._types.getTypeParser(e, t);
        }
        escapeIdentifier(e) {
          return '"' + e.replace(/"/g, '""') + '"';
        }
        escapeLiteral(e) {
          for (var t = false, n = "'", i = 0; i < e.length; i++) {
            var s = e[i];
            s === "'" ? n += s + s : s === "\\" ? (n += s + s, t = true) : n += s;
          }
          return n += "'", t === true && (n = " E" + n), n;
        }
        _pulseQueryQueue() {
          if (this.readyForQuery === true) if (this.activeQuery = this.queryQueue.shift(), this.activeQuery) {
            this.readyForQuery = false, this.hasExecuted = true;
            let e = this.activeQuery.submit(this.connection);
            e && m.nextTick(() => {
              this.activeQuery.handleError(e, this.connection), this.readyForQuery = true, this._pulseQueryQueue();
            });
          } else this.hasExecuted && (this.activeQuery = null, this.emit("drain"));
        }
        query(e, t, n) {
          var i, s, o, u, c;
          if (e == null) throw new TypeError(
            "Client was passed a null or undefined query"
          );
          return typeof e.submit == "function" ? (o = e.query_timeout || this.connectionParameters.query_timeout, s = i = e, typeof t == "function" && (i.callback = i.callback || t)) : (o = this.connectionParameters.query_timeout, i = new Js(e, t, n), i.callback || (s = new this._Promise((l, f) => {
            i.callback = (y, g) => y ? f(y) : l(g);
          }))), o && (c = i.callback, u = setTimeout(() => {
            var l = new Error("Query read timeout");
            m.nextTick(
              () => {
                i.handleError(l, this.connection);
              }
            ), c(l), i.callback = () => {
            };
            var f = this.queryQueue.indexOf(i);
            f > -1 && this.queryQueue.splice(f, 1), this._pulseQueryQueue();
          }, o), i.callback = (l, f) => {
            clearTimeout(u), c(l, f);
          }), this.binary && !i.binary && (i.binary = true), i._result && !i._result._types && (i._result._types = this._types), this._queryable ? this._ending ? (m.nextTick(() => {
            i.handleError(new Error("Client was closed and is not queryable"), this.connection);
          }), s) : (this.queryQueue.push(i), this._pulseQueryQueue(), s) : (m.nextTick(() => {
            i.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          }), s);
        }
        ref() {
          this.connection.ref();
        }
        unref() {
          this.connection.unref();
        }
        end(e) {
          if (this._ending = true, !this.connection._connecting) if (e) e();
          else return this._Promise.resolve();
          if (this.activeQuery || !this._queryable ? this.connection.stream.destroy() : this.connection.end(), e) this.connection.once("end", e);
          else return new this._Promise((t) => {
            this.connection.once("end", t);
          });
        }
      };
      a(Cn, "Client");
      var Ut = Cn;
      Ut.Query = Js;
      Xs.exports = Ut;
    });
    io = T((op, no) => {
      "use strict";
      p();
      var nl = ge().EventEmitter, to = a(function() {
      }, "NOOP"), ro = a((r, e) => {
        let t = r.findIndex(e);
        return t === -1 ? void 0 : r.splice(t, 1)[0];
      }, "removeWhere"), Tn = class Tn {
        static {
          __name(this, "Tn");
        }
        static {
          __name2(this, "Tn");
        }
        constructor(e, t, n) {
          this.client = e, this.idleListener = t, this.timeoutId = n;
        }
      };
      a(Tn, "IdleItem");
      var _n = Tn, Pn = class Pn {
        static {
          __name(this, "Pn");
        }
        static {
          __name2(this, "Pn");
        }
        constructor(e) {
          this.callback = e;
        }
      };
      a(Pn, "PendingItem");
      var Qe = Pn;
      function il() {
        throw new Error("Release called on client which has already been released to the pool.");
      }
      __name(il, "il");
      __name2(il, "il");
      a(il, "throwOnDoubleRelease");
      function Dt(r, e) {
        if (e)
          return { callback: e, result: void 0 };
        let t, n, i = a(function(o, u) {
          o ? t(o) : n(u);
        }, "cb"), s = new r(function(o, u) {
          n = o, t = u;
        }).catch((o) => {
          throw Error.captureStackTrace(o), o;
        });
        return { callback: i, result: s };
      }
      __name(Dt, "Dt");
      __name2(Dt, "Dt");
      a(Dt, "promisify");
      function sl(r, e) {
        return a(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function t(n) {
          n.client = e, e.removeListener("error", t), e.on("error", () => {
            r.log(
              "additional client error after disconnection due to error",
              n
            );
          }), r._remove(e), r.emit("error", n, e);
        }, "t"), "t"), "idleListener");
      }
      __name(sl, "sl");
      __name2(sl, "sl");
      a(sl, "makeIdleListener");
      var Bn = class Bn extends nl {
        static {
          __name(this, "Bn");
        }
        static {
          __name2(this, "Bn");
        }
        constructor(e, t) {
          super(), this.options = Object.assign({}, e), e != null && "password" in e && Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: e.password
          }), e != null && e.ssl && e.ssl.key && Object.defineProperty(this.options.ssl, "key", { enumerable: false }), this.options.max = this.options.max || this.options.poolSize || 10, this.options.min = this.options.min || 0, this.options.maxUses = this.options.maxUses || 1 / 0, this.options.allowExitOnIdle = this.options.allowExitOnIdle || false, this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0, this.log = this.options.log || function() {
          }, this.Client = this.options.Client || t || ot().Client, this.Promise = this.options.Promise || b.Promise, typeof this.options.idleTimeoutMillis > "u" && (this.options.idleTimeoutMillis = 1e4), this._clients = [], this._idle = [], this._expired = /* @__PURE__ */ new WeakSet(), this._pendingQueue = [], this._endCallback = void 0, this.ending = false, this.ended = false;
        }
        _isFull() {
          return this._clients.length >= this.options.max;
        }
        _isAboveMin() {
          return this._clients.length > this.options.min;
        }
        _pulseQueue() {
          if (this.log("pulse queue"), this.ended) {
            this.log("pulse queue ended");
            return;
          }
          if (this.ending) {
            this.log("pulse queue on ending"), this._idle.length && this._idle.slice().map((t) => {
              this._remove(t.client);
            }), this._clients.length || (this.ended = true, this._endCallback());
            return;
          }
          if (!this._pendingQueue.length) {
            this.log("no queued requests");
            return;
          }
          if (!this._idle.length && this._isFull()) return;
          let e = this._pendingQueue.shift();
          if (this._idle.length) {
            let t = this._idle.pop();
            clearTimeout(
              t.timeoutId
            );
            let n = t.client;
            n.ref && n.ref();
            let i = t.idleListener;
            return this._acquireClient(n, e, i, false);
          }
          if (!this._isFull()) return this.newClient(e);
          throw new Error("unexpected condition");
        }
        _remove(e) {
          let t = ro(
            this._idle,
            (n) => n.client === e
          );
          t !== void 0 && clearTimeout(t.timeoutId), this._clients = this._clients.filter(
            (n) => n !== e
          ), e.end(), this.emit("remove", e);
        }
        connect(e) {
          if (this.ending) {
            let i = new Error("Cannot use a pool after calling end on the pool");
            return e ? e(i) : this.Promise.reject(i);
          }
          let t = Dt(this.Promise, e), n = t.result;
          if (this._isFull() || this._idle.length) {
            if (this._idle.length && m.nextTick(() => this._pulseQueue()), !this.options.connectionTimeoutMillis) return this._pendingQueue.push(new Qe(t.callback)), n;
            let i = a((u, c, l) => {
              clearTimeout(o), t.callback(u, c, l);
            }, "queueCallback"), s = new Qe(i), o = setTimeout(() => {
              ro(
                this._pendingQueue,
                (u) => u.callback === i
              ), s.timedOut = true, t.callback(new Error("timeout exceeded when trying to connect"));
            }, this.options.connectionTimeoutMillis);
            return o.unref && o.unref(), this._pendingQueue.push(s), n;
          }
          return this.newClient(new Qe(t.callback)), n;
        }
        newClient(e) {
          let t = new this.Client(this.options);
          this._clients.push(
            t
          );
          let n = sl(this, t);
          this.log("checking client timeout");
          let i, s = false;
          this.options.connectionTimeoutMillis && (i = setTimeout(() => {
            this.log("ending client due to timeout"), s = true, t.connection ? t.connection.stream.destroy() : t.end();
          }, this.options.connectionTimeoutMillis)), this.log("connecting new client"), t.connect((o) => {
            if (i && clearTimeout(i), t.on("error", n), o) this.log("client failed to connect", o), this._clients = this._clients.filter((u) => u !== t), s && (o = new Error("Connection terminated due to connection timeout", { cause: o })), this._pulseQueue(), e.timedOut || e.callback(o, void 0, to);
            else {
              if (this.log("new client connected"), this.options.maxLifetimeSeconds !== 0) {
                let u = setTimeout(() => {
                  this.log("ending client due to expired lifetime"), this._expired.add(t), this._idle.findIndex((l) => l.client === t) !== -1 && this._acquireClient(
                    t,
                    new Qe((l, f, y) => y()),
                    n,
                    false
                  );
                }, this.options.maxLifetimeSeconds * 1e3);
                u.unref(), t.once("end", () => clearTimeout(u));
              }
              return this._acquireClient(t, e, n, true);
            }
          });
        }
        _acquireClient(e, t, n, i) {
          i && this.emit("connect", e), this.emit("acquire", e), e.release = this._releaseOnce(e, n), e.removeListener("error", n), t.timedOut ? i && this.options.verify ? this.options.verify(e, e.release) : e.release() : i && this.options.verify ? this.options.verify(e, (s) => {
            if (s) return e.release(s), t.callback(s, void 0, to);
            t.callback(void 0, e, e.release);
          }) : t.callback(void 0, e, e.release);
        }
        _releaseOnce(e, t) {
          let n = false;
          return (i) => {
            n && il(), n = true, this._release(e, t, i);
          };
        }
        _release(e, t, n) {
          if (e.on("error", t), e._poolUseCount = (e._poolUseCount || 0) + 1, this.emit("release", n, e), n || this.ending || !e._queryable || e._ending || e._poolUseCount >= this.options.maxUses) {
            e._poolUseCount >= this.options.maxUses && this.log("remove expended client"), this._remove(e), this._pulseQueue();
            return;
          }
          if (this._expired.has(e)) {
            this.log("remove expired client"), this._expired.delete(e), this._remove(e), this._pulseQueue();
            return;
          }
          let s;
          this.options.idleTimeoutMillis && this._isAboveMin() && (s = setTimeout(() => {
            this.log("remove idle client"), this._remove(e);
          }, this.options.idleTimeoutMillis), this.options.allowExitOnIdle && s.unref()), this.options.allowExitOnIdle && e.unref(), this._idle.push(new _n(
            e,
            t,
            s
          )), this._pulseQueue();
        }
        query(e, t, n) {
          if (typeof e == "function") {
            let s = Dt(this.Promise, e);
            return v(function() {
              return s.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
            }), s.result;
          }
          typeof t == "function" && (n = t, t = void 0);
          let i = Dt(this.Promise, n);
          return n = i.callback, this.connect((s, o) => {
            if (s) return n(s);
            let u = false, c = a((l) => {
              u || (u = true, o.release(l), n(l));
            }, "onError");
            o.once("error", c), this.log("dispatching query");
            try {
              o.query(e, t, (l, f) => {
                if (this.log("query dispatched"), o.removeListener(
                  "error",
                  c
                ), !u) return u = true, o.release(l), l ? n(l) : n(void 0, f);
              });
            } catch (l) {
              return o.release(l), n(l);
            }
          }), i.result;
        }
        end(e) {
          if (this.log("ending"), this.ending) {
            let n = new Error("Called end on pool more than once");
            return e ? e(n) : this.Promise.reject(n);
          }
          this.ending = true;
          let t = Dt(this.Promise, e);
          return this._endCallback = t.callback, this._pulseQueue(), t.result;
        }
        get waitingCount() {
          return this._pendingQueue.length;
        }
        get idleCount() {
          return this._idle.length;
        }
        get expiredCount() {
          return this._clients.reduce((e, t) => e + (this._expired.has(t) ? 1 : 0), 0);
        }
        get totalCount() {
          return this._clients.length;
        }
      };
      a(Bn, "Pool");
      var In = Bn;
      no.exports = In;
    });
    so = {};
    ie(so, { default: /* @__PURE__ */ __name2(() => ol, "default") });
    oo = G(() => {
      "use strict";
      p();
      ol = {};
    });
    ao = T((lp, al) => {
      al.exports = { name: "pg", version: "8.8.0", description: "PostgreSQL client - pure javascript & libpq with the same API", keywords: [
        "database",
        "libpq",
        "pg",
        "postgre",
        "postgres",
        "postgresql",
        "rdbms"
      ], homepage: "https://github.com/brianc/node-postgres", repository: { type: "git", url: "git://github.com/brianc/node-postgres.git", directory: "packages/pg" }, author: "Brian Carlson <brian.m.carlson@gmail.com>", main: "./lib", dependencies: { "buffer-writer": "2.0.0", "packet-reader": "1.0.0", "pg-connection-string": "^2.5.0", "pg-pool": "^3.5.2", "pg-protocol": "^1.5.0", "pg-types": "^2.1.0", pgpass: "1.x" }, devDependencies: {
        async: "2.6.4",
        bluebird: "3.5.2",
        co: "4.6.0",
        "pg-copy-streams": "0.3.0"
      }, peerDependencies: { "pg-native": ">=3.0.1" }, peerDependenciesMeta: { "pg-native": { optional: true } }, scripts: { test: "make test-all" }, files: ["lib", "SPONSORS.md"], license: "MIT", engines: { node: ">= 8.0.0" }, gitHead: "c99fb2c127ddf8d712500db2c7b9a5491a178655" };
    });
    lo = T((fp, co) => {
      "use strict";
      p();
      var uo = ge().EventEmitter, ul = (it(), O(nt)), Rn = rt(), Ne = co.exports = function(r, e, t) {
        uo.call(this), r = Rn.normalizeQueryConfig(r, e, t), this.text = r.text, this.values = r.values, this.name = r.name, this.callback = r.callback, this.state = "new", this._arrayMode = r.rowMode === "array", this._emitRowEvents = false, this.on("newListener", function(n) {
          n === "row" && (this._emitRowEvents = true);
        }.bind(this));
      };
      ul.inherits(Ne, uo);
      var cl = { sqlState: "code", statementPosition: "position", messagePrimary: "message", context: "where", schemaName: "schema", tableName: "table", columnName: "column", dataTypeName: "dataType", constraintName: "constraint", sourceFile: "file", sourceLine: "line", sourceFunction: "routine" };
      Ne.prototype.handleError = function(r) {
        var e = this.native.pq.resultErrorFields();
        if (e) for (var t in e) {
          var n = cl[t] || t;
          r[n] = e[t];
        }
        this.callback ? this.callback(r) : this.emit("error", r), this.state = "error";
      };
      Ne.prototype.then = function(r, e) {
        return this._getPromise().then(
          r,
          e
        );
      };
      Ne.prototype.catch = function(r) {
        return this._getPromise().catch(r);
      };
      Ne.prototype._getPromise = function() {
        return this._promise ? this._promise : (this._promise = new Promise(function(r, e) {
          this._once("end", r), this._once("error", e);
        }.bind(this)), this._promise);
      };
      Ne.prototype.submit = function(r) {
        this.state = "running";
        var e = this;
        this.native = r.native, r.native.arrayMode = this._arrayMode;
        var t = a(function(s, o, u) {
          if (r.native.arrayMode = false, v(function() {
            e.emit("_done");
          }), s) return e.handleError(s);
          e._emitRowEvents && (u.length > 1 ? o.forEach(
            (c, l) => {
              c.forEach((f) => {
                e.emit("row", f, u[l]);
              });
            }
          ) : o.forEach(function(c) {
            e.emit("row", c, u);
          })), e.state = "end", e.emit("end", u), e.callback && e.callback(null, u);
        }, "after");
        if (m.domain && (t = m.domain.bind(t)), this.name) {
          this.name.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", this.name, this.name.length), console.error("This can cause conflicts and silent errors executing queries"));
          var n = (this.values || []).map(Rn.prepareValue);
          if (r.namedQueries[this.name]) {
            if (this.text && r.namedQueries[this.name] !== this.text) {
              let s = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
              return t(s);
            }
            return r.native.execute(this.name, n, t);
          }
          return r.native.prepare(this.name, this.text, n.length, function(s) {
            return s ? t(s) : (r.namedQueries[e.name] = e.text, e.native.execute(e.name, n, t));
          });
        } else if (this.values) {
          if (!Array.isArray(
            this.values
          )) {
            let s = new Error("Query values must be an array");
            return t(s);
          }
          var i = this.values.map(Rn.prepareValue);
          r.native.query(this.text, i, t);
        } else r.native.query(this.text, t);
      };
    });
    yo = T((yp, po) => {
      "use strict";
      p();
      var ll = (oo(), O(so)), fl = At(), dp = ao(), fo = ge().EventEmitter, hl = (it(), O(nt)), pl = Bt(), ho = lo(), K = po.exports = function(r) {
        fo.call(this), r = r || {}, this._Promise = r.Promise || b.Promise, this._types = new fl(r.types), this.native = new ll({ types: this._types }), this._queryQueue = [], this._ending = false, this._connecting = false, this._connected = false, this._queryable = true;
        var e = this.connectionParameters = new pl(r);
        this.user = e.user, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: e.password }), this.database = e.database, this.host = e.host, this.port = e.port, this.namedQueries = {};
      };
      K.Query = ho;
      hl.inherits(K, fo);
      K.prototype._errorAllQueries = function(r) {
        let e = a((t) => {
          m.nextTick(() => {
            t.native = this.native, t.handleError(r);
          });
        }, "enqueueError");
        this._hasActiveQuery() && (e(this._activeQuery), this._activeQuery = null), this._queryQueue.forEach(e), this._queryQueue.length = 0;
      };
      K.prototype._connect = function(r) {
        var e = this;
        if (this._connecting) {
          m.nextTick(() => r(new Error("Client has already been connected. You cannot reuse a client.")));
          return;
        }
        this._connecting = true, this.connectionParameters.getLibpqConnectionString(function(t, n) {
          if (t) return r(t);
          e.native.connect(n, function(i) {
            if (i) return e.native.end(), r(i);
            e._connected = true, e.native.on("error", function(s) {
              e._queryable = false, e._errorAllQueries(s), e.emit("error", s);
            }), e.native.on("notification", function(s) {
              e.emit("notification", { channel: s.relname, payload: s.extra });
            }), e.emit("connect"), e._pulseQueryQueue(true), r();
          });
        });
      };
      K.prototype.connect = function(r) {
        if (r) {
          this._connect(r);
          return;
        }
        return new this._Promise((e, t) => {
          this._connect((n) => {
            n ? t(n) : e();
          });
        });
      };
      K.prototype.query = function(r, e, t) {
        var n, i, s, o, u;
        if (r == null) throw new TypeError("Client was passed a null or undefined query");
        if (typeof r.submit == "function") s = r.query_timeout || this.connectionParameters.query_timeout, i = n = r, typeof e == "function" && (r.callback = e);
        else if (s = this.connectionParameters.query_timeout, n = new ho(r, e, t), !n.callback) {
          let c, l;
          i = new this._Promise((f, y) => {
            c = f, l = y;
          }), n.callback = (f, y) => f ? l(f) : c(y);
        }
        return s && (u = n.callback, o = setTimeout(() => {
          var c = new Error(
            "Query read timeout"
          );
          m.nextTick(() => {
            n.handleError(c, this.connection);
          }), u(c), n.callback = () => {
          };
          var l = this._queryQueue.indexOf(n);
          l > -1 && this._queryQueue.splice(l, 1), this._pulseQueryQueue();
        }, s), n.callback = (c, l) => {
          clearTimeout(o), u(c, l);
        }), this._queryable ? this._ending ? (n.native = this.native, m.nextTick(() => {
          n.handleError(
            new Error("Client was closed and is not queryable")
          );
        }), i) : (this._queryQueue.push(n), this._pulseQueryQueue(), i) : (n.native = this.native, m.nextTick(() => {
          n.handleError(new Error("Client has encountered a connection error and is not queryable"));
        }), i);
      };
      K.prototype.end = function(r) {
        var e = this;
        this._ending = true, this._connected || this.once("connect", this.end.bind(this, r));
        var t;
        return r || (t = new this._Promise(function(n, i) {
          r = a((s) => s ? i(s) : n(), "cb");
        })), this.native.end(function() {
          e._errorAllQueries(new Error("Connection terminated")), m.nextTick(() => {
            e.emit("end"), r && r();
          });
        }), t;
      };
      K.prototype._hasActiveQuery = function() {
        return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
      };
      K.prototype._pulseQueryQueue = function(r) {
        if (this._connected && !this._hasActiveQuery()) {
          var e = this._queryQueue.shift();
          if (!e) {
            r || this.emit("drain");
            return;
          }
          this._activeQuery = e, e.submit(this);
          var t = this;
          e.once("_done", function() {
            t._pulseQueryQueue();
          });
        }
      };
      K.prototype.cancel = function(r) {
        this._activeQuery === r ? this.native.cancel(function() {
        }) : this._queryQueue.indexOf(r) !== -1 && this._queryQueue.splice(this._queryQueue.indexOf(r), 1);
      };
      K.prototype.ref = function() {
      };
      K.prototype.unref = function() {
      };
      K.prototype.setTypeParser = function(r, e, t) {
        return this._types.setTypeParser(
          r,
          e,
          t
        );
      };
      K.prototype.getTypeParser = function(r, e) {
        return this._types.getTypeParser(r, e);
      };
    });
    Ln = T((gp, mo) => {
      "use strict";
      p();
      mo.exports = yo();
    });
    ot = T((vp, at) => {
      "use strict";
      p();
      var dl = eo(), yl = tt(), ml = En(), wl = io(), { DatabaseError: gl } = vn(), bl = a(
        (r) => {
          var e;
          return e = class extends wl {
            static {
              __name(this, "e");
            }
            static {
              __name2(this, "e");
            }
            constructor(n) {
              super(n, r);
            }
          }, a(e, "BoundPool"), e;
        },
        "poolFactory"
      ), Fn = a(
        function(r) {
          this.defaults = yl, this.Client = r, this.Query = this.Client.Query, this.Pool = bl(this.Client), this._pools = [], this.Connection = ml, this.types = Je(), this.DatabaseError = gl;
        },
        "PG"
      );
      typeof m.env.NODE_PG_FORCE_NATIVE < "u" ? at.exports = new Fn(Ln()) : (at.exports = new Fn(dl), Object.defineProperty(at.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          var r = null;
          try {
            r = new Fn(Ln());
          } catch (e) {
            if (e.code !== "MODULE_NOT_FOUND") throw e;
          }
          return Object.defineProperty(at.exports, "native", { value: r }), r;
        }
      }));
    });
    p();
    p();
    Fe();
    Zt();
    p();
    pa = Object.defineProperty;
    da = Object.defineProperties;
    ya = Object.getOwnPropertyDescriptors;
    bi = Object.getOwnPropertySymbols;
    ma = Object.prototype.hasOwnProperty;
    wa = Object.prototype.propertyIsEnumerable;
    vi = a(
      (r, e, t) => e in r ? pa(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t,
      "__defNormalProp"
    );
    ga = a((r, e) => {
      for (var t in e || (e = {})) ma.call(e, t) && vi(r, t, e[t]);
      if (bi) for (var t of bi(e)) wa.call(e, t) && vi(r, t, e[t]);
      return r;
    }, "__spreadValues");
    ba = a((r, e) => da(r, ya(e)), "__spreadProps");
    va = 1008e3;
    xi = new Uint8Array(
      new Uint16Array([258]).buffer
    )[0] === 2;
    xa = new TextDecoder();
    Jt = new TextEncoder();
    yt = Jt.encode("0123456789abcdef");
    mt = Jt.encode("0123456789ABCDEF");
    Sa = Jt.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    Si = Sa.slice();
    Si[62] = 45;
    Si[63] = 95;
    __name2(Ea, "Ea");
    a(Ea, "_toHex");
    __name2(Aa, "Aa");
    a(Aa, "_toHexChunked");
    __name2(Ei, "Ei");
    a(Ei, "toHex");
    p();
    gt = class gt2 {
      static {
        __name(this, "gt2");
      }
      static {
        __name2(this, "gt");
      }
      constructor(e, t) {
        this.strings = e;
        this.values = t;
      }
      toParameterizedQuery(e = { query: "", params: [] }) {
        let { strings: t, values: n } = this;
        for (let i = 0, s = t.length; i < s; i++) if (e.query += t[i], i < n.length) {
          let o = n[i];
          if (o instanceof Ge) e.query += o.sql;
          else if (o instanceof Ce) if (o.queryData instanceof gt2) o.queryData.toParameterizedQuery(
            e
          );
          else {
            if (o.queryData.params?.length) throw new Error("This query is not composable");
            e.query += o.queryData.query;
          }
          else {
            let { params: u } = e;
            u.push(o), e.query += "$" + u.length, (o instanceof d || ArrayBuffer.isView(o)) && (e.query += "::bytea");
          }
        }
        return e;
      }
    };
    a(gt, "SqlTemplate");
    $e = gt;
    Xt = class Xt2 {
      static {
        __name(this, "Xt2");
      }
      static {
        __name2(this, "Xt");
      }
      constructor(e) {
        this.sql = e;
      }
    };
    a(Xt, "UnsafeRawSql");
    Ge = Xt;
    p();
    __name2(bt, "bt");
    a(bt, "warnIfBrowser");
    Fe();
    as = Se(At());
    us = Se(rt());
    _t = class _t2 extends Error {
      static {
        __name(this, "_t2");
      }
      static {
        __name2(this, "_t");
      }
      constructor(t) {
        super(t);
        E(this, "name", "NeonDbError");
        E(this, "severity");
        E(this, "code");
        E(this, "detail");
        E(this, "hint");
        E(this, "position");
        E(this, "internalPosition");
        E(
          this,
          "internalQuery"
        );
        E(this, "where");
        E(this, "schema");
        E(this, "table");
        E(this, "column");
        E(this, "dataType");
        E(this, "constraint");
        E(this, "file");
        E(this, "line");
        E(this, "routine");
        E(this, "sourceError");
        "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, _t2);
      }
    };
    a(
      _t,
      "NeonDbError"
    );
    be = _t;
    is = "transaction() expects an array of queries, or a function returning an array of queries";
    Ru = ["severity", "code", "detail", "hint", "position", "internalPosition", "internalQuery", "where", "schema", "table", "column", "dataType", "constraint", "file", "line", "routine"];
    __name2(Lu, "Lu");
    a(Lu, "encodeBuffersAsBytea");
    __name2(ss, "ss");
    a(ss, "prepareQuery");
    __name2(cs, "cs");
    a(cs, "neon");
    dr = class dr2 {
      static {
        __name(this, "dr2");
      }
      static {
        __name2(this, "dr");
      }
      constructor(e, t, n) {
        this.execute = e;
        this.queryData = t;
        this.opts = n;
      }
      then(e, t) {
        return this.execute(this.queryData, this.opts).then(e, t);
      }
      catch(e) {
        return this.execute(this.queryData, this.opts).catch(e);
      }
      finally(e) {
        return this.execute(
          this.queryData,
          this.opts
        ).finally(e);
      }
    };
    a(dr, "NeonQueryPromise");
    Ce = dr;
    __name2(os, "os");
    a(os, "processQueryResult");
    __name2(Fu, "Fu");
    a(Fu, "getAuthToken");
    p();
    go = Se(ot());
    p();
    wo = Se(ot());
    kn = class kn2 extends wo.Client {
      static {
        __name(this, "kn2");
      }
      static {
        __name2(this, "kn");
      }
      constructor(t) {
        super(t);
        this.config = t;
      }
      get neonConfig() {
        return this.connection.stream;
      }
      connect(t) {
        let { neonConfig: n } = this;
        n.forceDisablePgSSL && (this.ssl = this.connection.ssl = false), this.ssl && n.useSecureWebSocket && console.warn("SSL is enabled for both Postgres (e.g. ?sslmode=require in the connection string + forceDisablePgSSL = false) and the WebSocket tunnel (useSecureWebSocket = true). Double encryption will increase latency and CPU usage. It may be appropriate to disable SSL in the Postgres connection parameters or set forceDisablePgSSL = true.");
        let i = typeof this.config != "string" && this.config?.host !== void 0 || typeof this.config != "string" && this.config?.connectionString !== void 0 || m.env.PGHOST !== void 0, s = m.env.USER ?? m.env.USERNAME;
        if (!i && this.host === "localhost" && this.user === s && this.database === s && this.password === null) throw new Error(`No database host or connection string was set, and key parameters have default values (host: localhost, user: ${s}, db: ${s}, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.`);
        let o = super.connect(t), u = n.pipelineTLS && this.ssl, c = n.pipelineConnect === "password";
        if (!u && !n.pipelineConnect) return o;
        let l = this.connection;
        if (u && l.on(
          "connect",
          () => l.stream.emit("data", "S")
        ), c) {
          l.removeAllListeners("authenticationCleartextPassword"), l.removeAllListeners("readyForQuery"), l.once("readyForQuery", () => l.on("readyForQuery", this._handleReadyForQuery.bind(this)));
          let f = this.ssl ? "sslconnect" : "connect";
          l.on(f, () => {
            this.neonConfig.disableWarningInBrowsers || bt(), this._handleAuthCleartextPassword(), this._handleReadyForQuery();
          });
        }
        return o;
      }
      async _handleAuthSASLContinue(t) {
        if (typeof crypto > "u" || crypto.subtle === void 0 || crypto.subtle.importKey === void 0) throw new Error("Cannot use SASL auth when `crypto.subtle` is not defined");
        let n = crypto.subtle, i = this.saslSession, s = this.password, o = t.data;
        if (i.message !== "SASLInitialResponse" || typeof s != "string" || typeof o != "string") throw new Error(
          "SASL: protocol error"
        );
        let u = Object.fromEntries(o.split(",").map((M) => {
          if (!/^.=/.test(M)) throw new Error(
            "SASL: Invalid attribute pair entry"
          );
          let $ = M[0], me = M.substring(2);
          return [$, me];
        })), c = u.r, l = u.s, f = u.i;
        if (!c || !/^[!-+--~]+$/.test(c)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing/unprintable");
        if (!l || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(l)) throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing/not base64"
        );
        if (!f || !/^[1-9][0-9]*$/.test(f)) throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: missing/invalid iteration count"
        );
        if (!c.startsWith(i.clientNonce))
          throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        if (c.length === i.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        let y = parseInt(f, 10), g = d.from(l, "base64"), A = new TextEncoder(), C = A.encode(s), D = await n.importKey(
          "raw",
          C,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), Y = new Uint8Array(await n.sign("HMAC", D, d.concat(
          [g, d.from([0, 0, 0, 1])]
        ))), P = Y;
        for (var I = 0; I < y - 1; I++) Y = new Uint8Array(await n.sign("HMAC", D, Y)), P = d.from(
          P.map((M, $) => P[$] ^ Y[$])
        );
        let w = P, Z = await n.importKey(
          "raw",
          w,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), W = new Uint8Array(await n.sign("HMAC", Z, A.encode("Client Key"))), J = await n.digest(
          "SHA-256",
          W
        ), X = "n=*,r=" + i.clientNonce, se = "r=" + c + ",s=" + l + ",i=" + y, oe = "c=biws,r=" + c, R = X + "," + se + "," + oe, j = await n.importKey(
          "raw",
          J,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        );
        var le = new Uint8Array(await n.sign(
          "HMAC",
          j,
          A.encode(R)
        )), de = d.from(W.map((M, $) => W[$] ^ le[$])), We = de.toString("base64");
        let fe = await n.importKey(
          "raw",
          w,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), _e = await n.sign("HMAC", fe, A.encode("Server Key")), ye = await n.importKey("raw", _e, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
        var ee = d.from(
          await n.sign("HMAC", ye, A.encode(R))
        );
        i.message = "SASLResponse", i.serverSignature = ee.toString("base64"), i.response = oe + ",p=" + We, this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
      }
    };
    a(
      kn,
      "NeonClient"
    );
    ut = kn;
    Fe();
    bo = Se(Bt());
    __name2(vl, "vl");
    a(vl, "promisify");
    Un = class Un2 extends go.Pool {
      static {
        __name(this, "Un2");
      }
      static {
        __name2(this, "Un");
      }
      constructor() {
        super(...arguments);
        E(this, "Client", ut);
        E(this, "hasFetchUnsupportedListeners", false);
        E(this, "addListener", this.on);
      }
      on(t, n) {
        return t !== "error" && (this.hasFetchUnsupportedListeners = true), super.on(t, n);
      }
      query(t, n, i) {
        if (!ce.poolQueryViaFetch || this.hasFetchUnsupportedListeners || typeof t == "function") return super.query(
          t,
          n,
          i
        );
        typeof n == "function" && (i = n, n = void 0);
        let s = vl(this.Promise, i);
        i = s.callback;
        try {
          let o = new bo.default(
            this.options
          ), u = encodeURIComponent, c = encodeURI, l = `postgresql://${u(o.user)}:${u(o.password)}@${u(o.host)}/${c(o.database)}`, f = typeof t == "string" ? t : t.text, y = n ?? t.values ?? [];
          cs(l, { fullResults: true, arrayMode: t.rowMode === "array" }).query(f, y, { types: t.types ?? this.options?.types }).then((A) => i(void 0, A)).catch((A) => i(
            A
          ));
        } catch (o) {
          i(o);
        }
        return s.result;
      }
    };
    a(Un, "NeonPool");
    Fe();
    ct = Se(ot());
    export_DatabaseError = ct.DatabaseError;
    export_defaults = ct.defaults;
    export_escapeIdentifier = ct.escapeIdentifier;
    export_escapeLiteral = ct.escapeLiteral;
    export_types = ct.types;
  }
});
function getSQL(env22) {
  const connectionString = env22?.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return cs(connectionString);
}
__name(getSQL, "getSQL");
var init_connection = __esm({
  "utils/db/connection.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_serverless();
    ce.fetchConnectionCache = true;
    __name2(getSQL, "getSQL");
  }
});
async function onRequest2(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const method = request.method;
  if (method !== "GET") {
    const apiKey = request.headers.get("X-API-Key");
    if (apiKey !== env22.ADMIN_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
  const sql = getSQL(context22.env);
  try {
    if (method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const result = await sql`
        SELECT 
          e.id,
          e.name,
          e.date,
          e.time,
          e.location_name as location,
          e.state_code as state,
          e.level,
          e.type,
          e.committee_name as committee,
          e.description,
          e.source_url as "detailsUrl",
          e.scraped_at as "scrapedAt",
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'number', b.bill_number,
                'title', b.title,
                'url', b.url,
                'summary', b.summary
              )
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::json
          ) as bills,
          COALESCE(
            array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
            ARRAY[]::text[]
          ) as tags
        FROM events e
        LEFT JOIN event_bills eb ON e.id = eb.event_id
        LEFT JOIN bills b ON eb.bill_id = b.id
        LEFT JOIN event_tags et ON e.id = et.event_id
        WHERE e.date >= CURRENT_DATE
        GROUP BY e.id
        ORDER BY e.date ASC, e.time ASC
        LIMIT ${limit}
      `;
      const events = result.map((event) => ({
        ...event,
        bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
        tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null ? event.tags.filter((t) => t !== null) : []
      }));
      const response = {
        events,
        pagination: {
          total: events.length,
          limit,
          offset: 0,
          hasMore: events.length === limit
        },
        filters: {
          state: null,
          level: null,
          date: null
        },
        stats: {
          withBills: events.filter((e) => e.bills && e.bills.length > 0).length,
          withTags: events.filter((e) => e.tags && e.tags.length > 0).length,
          withParticipation: 0
        }
      };
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    if (method === "POST") {
      const body = await request.json();
      const result = await sql`
        INSERT INTO events (id, name, date, time, location_name, state_code, level, type)
        VALUES (${body.id}, ${body.name}, ${body.date}, ${body.time}, ${body.location}, ${body.state}, ${body.level}, ${body.type})
        RETURNING *
      `;
      return new Response(
        JSON.stringify(result[0]),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    if (method === "DELETE") {
      const eventId = url.searchParams.get("id");
      await sql`DELETE FROM events WHERE id = ${eventId}`;
      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Admin events error:", error32);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest2, "onRequest2");
var init_admin_events_backup = __esm({
  "api/admin-events-backup.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_connection();
    __name2(onRequest2, "onRequest");
  }
});
async function onRequest3(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const connectionString = env22.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not configured");
    }
    const sql = cs(connectionString);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = await sql`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.state_code as state,
        e.level,
        e.type,
        e.committee_name as committee,
        e.description,
        e.source_url as "detailsUrl",
        e.scraped_at as "scrapedAt",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'number', b.bill_number,
              'title', b.title,
              'url', b.url,
              'summary', b.summary
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bills,
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      LEFT JOIN event_tags et ON e.id = et.event_id
      WHERE e.date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
      LIMIT ${limit}
    `;
    const events = result.map((event) => ({
      ...event,
      bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
      tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null ? event.tags.filter((t) => t !== null) : []
    }));
    return new Response(JSON.stringify({
      events,
      pagination: {
        total: events.length,
        limit,
        offset: 0,
        hasMore: events.length === limit
      }
    }), {
      headers: corsHeaders
    });
  } catch (error32) {
    console.error("Error:", error32);
    return new Response(JSON.stringify({
      error: "Failed to fetch events",
      message: error32.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest3, "onRequest3");
var init_admin_events_simple = __esm({
  "api/admin-events-simple.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_serverless();
    ce.fetchConnectionCache = true;
    __name2(onRequest3, "onRequest");
  }
});
async function onRequest4(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const stateFilter = url.searchParams.get("state")?.toUpperCase();
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    let query = `
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.state_code as state,
        e.committee_name as committee,
        e.docket_url,
        e.details_url,
        a.id as agenda_id,
        a.agenda_url,
        a.summary as agenda_summary,
        a.last_summarized_at
      FROM events e
      LEFT JOIN agenda_summaries a ON e.id = a.event_id
      WHERE e.date >= date('now')
      AND e.docket_url IS NOT NULL
    `;
    const params = [];
    if (stateFilter) {
      query += ` AND e.state_code = ?`;
      params.push(stateFilter);
    }
    query += ` ORDER BY e.date ASC, e.time ASC LIMIT ?`;
    params.push(limit);
    const stmt = env22.DB.prepare(query);
    const { results: agendas } = await stmt.bind(...params).all();
    return new Response(JSON.stringify({ agendas }), {
      headers: corsHeaders
    });
  } catch (error32) {
    console.error("Error:", error32);
    return new Response(JSON.stringify({
      error: "Failed to fetch agenda summaries",
      details: error32.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest4, "onRequest4");
var init_agenda_summaries = __esm({
  "api/agenda-summaries.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest4, "onRequest");
  }
});
var onRequest5;
var init_cache_info = __esm({
  "api/cache-info.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequest5 = /* @__PURE__ */ __name2(async (context22) => {
      const { SCRAPER_CACHE } = context22.env;
      try {
        const list = await SCRAPER_CACHE.list({ prefix: "scraper:" });
        const caches = await Promise.all(
          list.keys.map(async (key) => {
            const metadata = key.metadata;
            const state = key.name.replace("scraper:", "");
            return {
              state,
              exists: true,
              age: metadata?.timestamp ? Math.floor((Date.now() - metadata.timestamp) / 1e3 / 60) : null,
              timestamp: metadata?.timestamp || null
            };
          })
        );
        return new Response(JSON.stringify(caches), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error32) {
        console.error("Cache info error:", error32);
        return new Response(JSON.stringify({ error: "Failed to fetch cache info" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequest");
  }
});
async function onRequest6(context22) {
  const { request, env: env22 } = context22;
  const apiKey = env22.CONGRESS_API_KEY || env22.VITE_CONGRESS_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Congress.gov API key not configured",
        message: "Please add VITE_CONGRESS_API_KEY to your environment variables"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  try {
    console.log("Congress API: Returning empty array - API typically has historical data only");
    const upcomingMeetings = [];
    return new Response(
      JSON.stringify(upcomingMeetings),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=300",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Congress API error:", error32);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch congressional meetings",
        details: error32 instanceof Error ? error32.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest6, "onRequest6");
var init_congress_meetings = __esm({
  "api/congress-meetings.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest6, "onRequest");
  }
});
async function onRequest7(context22) {
  const { request, env: env22 } = context22;
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey !== env22.ADMIN_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  try {
    const sql = getSQL(context22.env);
    const results = {};
    const cleanupResult = await sql`
      DELETE FROM events WHERE date < CURRENT_DATE - INTERVAL '7 days'
    `;
    results.deletedEvents = cleanupResult.length;
    const healthResult = await sql`
      DELETE FROM scraper_health WHERE scraped_at < NOW() - INTERVAL '30 days'
    `;
    results.deletedHealthLogs = healthResult.length;
    await sql`VACUUM ANALYZE events`;
    await sql`VACUUM ANALYZE bills`;
    results.vacuumed = true;
    console.log("Database maintenance complete:", results);
    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Database maintenance error:", error32);
    return new Response(
      JSON.stringify({
        error: "Maintenance failed",
        details: error32 instanceof Error ? error32.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest7, "onRequest7");
var init_db_maintenance = __esm({
  "api/db-maintenance.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_connection();
    __name2(onRequest7, "onRequest");
  }
});
var onRequest8;
var init_invalidate_cache = __esm({
  "api/invalidate-cache.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequest8 = /* @__PURE__ */ __name2(async (context22) => {
      const { SCRAPER_CACHE } = context22.env;
      const url = new URL(context22.request.url);
      const state = url.searchParams.get("state");
      if (!state) {
        return new Response(JSON.stringify({ error: "State parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        await SCRAPER_CACHE.delete(`scraper:${state}`);
        return new Response(JSON.stringify({
          success: true,
          state,
          message: `Cache cleared for ${state}`
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error32) {
        console.error("Cache invalidation error:", error32);
        return new Response(JSON.stringify({ error: "Failed to invalidate cache" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequest");
  }
});
async function onRequest9(context22) {
  const { request, env: env22 } = context22;
  console.log("\u{1F3D8}\uFE0F LOCAL-MEETINGS: Request received");
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = parseInt(url.searchParams.get("radius") || "50");
  console.log(`Parsed: lat=${lat}, lng=${lng}, radius=${radius}`);
  if (isNaN(lat) || isNaN(lng)) {
    console.error("Invalid lat/lng parameters");
    return new Response(
      JSON.stringify({
        error: "Valid latitude and longitude required",
        message: "Please provide lat and lng query parameters"
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  try {
    const { results: allEvents } = await env22.DB.prepare(`
      SELECT 
        id, name, date, time, location_name as location, lat, lng,
        level, type, state_code as state, committee_name as committee, description,
        source_url as sourceUrl,
        details_url as detailsUrl,
        docket_url as docketUrl,
        agenda_url as agendaUrl,
        virtual_meeting_url as virtualMeetingUrl
      FROM events
      WHERE level = 'local'
        AND date >= date('now')
      ORDER BY date ASC, time ASC
      LIMIT 500
    `).all();
    const eventsWithinRadius = allEvents.filter((event) => {
      const dLat = (event.lat - lat) * 69;
      const dLng = (event.lng - lng) * 69 * Math.cos(lat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return distance <= radius;
    }).slice(0, 100);
    for (const event of eventsWithinRadius) {
      const { results: agendaSummaries } = await env22.DB.prepare(`
        SELECT summary FROM agenda_summaries WHERE event_id = ? LIMIT 1
      `).bind(event.id).all();
      if (agendaSummaries && agendaSummaries.length > 0 && agendaSummaries[0].summary) {
        event.agendaSummary = agendaSummaries[0].summary;
      }
    }
    console.log(`Found ${eventsWithinRadius.length} local events within ${radius} miles`);
    return new Response(
      JSON.stringify(eventsWithinRadius),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800",
          // 30 minutes
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Error in local-meetings:", error32);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch local meetings",
        message: error32.message,
        stack: error32.stack
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest9, "onRequest9");
var init_local_meetings = __esm({
  "api/local-meetings.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest9, "onRequest");
  }
});
var require_events = __commonJS({
  "node-built-in-modules:events"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault;
  }
});
var require_postgres_array = __commonJS({
  "../node_modules/postgres-array/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      static {
        __name(this, "_ArrayParser");
      }
      static {
        __name2(this, "ArrayParser");
      }
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
    __name(identity, "identity");
    __name2(identity, "identity");
  }
});
var require_arrayParser = __commonJS({
  "../node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var array = require_postgres_array();
    module.exports = {
      create: /* @__PURE__ */ __name2(function(source, transform) {
        return {
          parse: /* @__PURE__ */ __name2(function() {
            return array.parse(source, transform);
          }, "parse")
        };
      }, "create")
    };
  }
});
var require_postgres_date = __commonJS({
  "../node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms2 = matches[7];
      ms2 = ms2 ? 1e3 * parseFloat(ms2) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms2));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms2);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    }, "parseDate"), "parseDate");
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    __name(getDate, "getDate");
    __name2(getDate, "getDate");
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    __name(timeZoneOffset, "timeZoneOffset");
    __name2(timeZoneOffset, "timeZoneOffset");
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    __name(bcYearToNegativeYear, "bcYearToNegativeYear");
    __name2(bcYearToNegativeYear, "bcYearToNegativeYear");
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
    __name(is0To99, "is0To99");
    __name2(is0To99, "is0To99");
  }
});
var require_mutable = __commonJS({
  "../node_modules/xtend/mutable.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
    __name(extend, "extend");
    __name2(extend, "extend");
  }
});
var require_postgres_interval = __commonJS({
  "../node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse2(raw));
    }
    __name(PostgresInterval, "PostgresInterval");
    __name2(PostgresInterval, "PostgresInterval");
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
      __name(buildProperty, "buildProperty");
      __name2(buildProperty, "buildProperty");
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    __name(parseMilliseconds, "parseMilliseconds");
    __name2(parseMilliseconds, "parseMilliseconds");
    function parse2(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
    __name(parse2, "parse2");
    __name2(parse2, "parse");
  }
});
var require_postgres_bytea = __commonJS({
  "../node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var bufferFrom = Buffer.from || Buffer;
    module.exports = /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    }, "parseBytea"), "parseBytea");
  }
});
var require_textParsers = __commonJS({
  "../node_modules/pg-types/lib/textParsers.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      }, "nullAllowed"), "nullAllowed");
    }
    __name(allowNull, "allowNull");
    __name2(allowNull, "allowNull");
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    __name(parseBool, "parseBool");
    __name2(parseBool, "parseBool");
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    __name(parseBoolArray, "parseBoolArray");
    __name2(parseBoolArray, "parseBoolArray");
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    __name(parseBaseTenInt, "parseBaseTenInt");
    __name2(parseBaseTenInt, "parseBaseTenInt");
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    __name(parseIntegerArray, "parseIntegerArray");
    __name2(parseIntegerArray, "parseIntegerArray");
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    __name(parseBigIntegerArray, "parseBigIntegerArray");
    __name2(parseBigIntegerArray, "parseBigIntegerArray");
    var parsePointArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      var p2 = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p2.parse();
    }, "parsePointArray");
    var parseFloatArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      var p2 = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p2.parse();
    }, "parseFloatArray");
    var parseStringArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      var p2 = arrayParser.create(value);
      return p2.parse();
    }, "parseStringArray");
    var parseDateArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      var p2 = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p2.parse();
    }, "parseDateArray");
    var parseIntervalArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      var p2 = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p2.parse();
    }, "parseIntervalArray");
    var parseByteAArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    }, "parseByteAArray");
    var parseInteger = /* @__PURE__ */ __name2(function(value) {
      return parseInt(value, 10);
    }, "parseInteger");
    var parseBigInteger = /* @__PURE__ */ __name2(function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    }, "parseBigInteger");
    var parseJsonArray = /* @__PURE__ */ __name2(function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    }, "parseJsonArray");
    var parsePoint = /* @__PURE__ */ __name2(function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    }, "parsePoint");
    var parseCircle = /* @__PURE__ */ __name2(function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    }, "parseCircle");
    var init = /* @__PURE__ */ __name2(function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    }, "init");
    module.exports = {
      init
    };
  }
});
var require_pg_int8 = __commonJS({
  "../node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    __name(readInt8, "readInt8");
    __name2(readInt8, "readInt8");
    module.exports = readInt8;
  }
});
var require_binaryParsers = __commonJS({
  "../node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var parseInt64 = require_pg_int8();
    var parseBits = /* @__PURE__ */ __name2(function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = /* @__PURE__ */ __name2(function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      }, "inv");
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    }, "parseBits");
    var parseFloatFromBits = /* @__PURE__ */ __name2(function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = /* @__PURE__ */ __name2(function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      }, "parsePrecisionBits");
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    }, "parseFloatFromBits");
    var parseInt16 = /* @__PURE__ */ __name2(function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    }, "parseInt16");
    var parseInt32 = /* @__PURE__ */ __name2(function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    }, "parseInt32");
    var parseFloat32 = /* @__PURE__ */ __name2(function(value) {
      return parseFloatFromBits(value, 23, 8);
    }, "parseFloat32");
    var parseFloat64 = /* @__PURE__ */ __name2(function(value) {
      return parseFloatFromBits(value, 52, 11);
    }, "parseFloat64");
    var parseNumeric = /* @__PURE__ */ __name2(function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    }, "parseNumeric");
    var parseDate = /* @__PURE__ */ __name2(function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    }, "parseDate");
    var parseArray = /* @__PURE__ */ __name2(function(value) {
      var dim = parseBits(value, 32);
      var flags2 = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = /* @__PURE__ */ __name2(function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      }, "parseElement");
      var parse2 = /* @__PURE__ */ __name2(function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count32 = dimension.shift();
          for (i2 = 0; i2 < count32; i2++) {
            array[i2] = parse2(dimension, elementType2);
          }
          dimension.unshift(count32);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      }, "parse");
      return parse2(dims, elementType);
    }, "parseArray");
    var parseText = /* @__PURE__ */ __name2(function(value) {
      return value.toString("utf8");
    }, "parseText");
    var parseBool = /* @__PURE__ */ __name2(function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    }, "parseBool");
    var init = /* @__PURE__ */ __name2(function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    }, "init");
    module.exports = {
      init
    };
  }
});
var require_builtins = __commonJS({
  "../node_modules/pg-types/lib/builtins.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});
var require_pg_types = __commonJS({
  "../node_modules/pg-types/index.js"(exports) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    __name(noParse, "noParse");
    __name2(noParse, "noParse");
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    __name(getTypeParser, "getTypeParser");
    __name2(getTypeParser, "getTypeParser");
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    __name(setTypeParser, "setTypeParser");
    __name2(setTypeParser, "setTypeParser");
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});
var require_defaults = __commonJS({
  "../node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user: process.platform === "win32" ? process.env.USERNAME : process.env.USER,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});
var require_util = __commonJS({
  "node-built-in-modules:util"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault2;
  }
});
var require_utils = __commonJS({
  "../node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var defaults2 = require_defaults();
    var util = require_util();
    var { isDate } = util.types || util;
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    __name(escapeElement, "escapeElement");
    __name2(escapeElement, "escapeElement");
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result = result + ",";
        }
        if (val[i] === null || typeof val[i] === "undefined") {
          result = result + "NULL";
        } else if (Array.isArray(val[i])) {
          result = result + arrayString(val[i]);
        } else if (ArrayBuffer.isView(val[i])) {
          let item = val[i];
          if (!(item instanceof Buffer)) {
            const buf = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
            if (buf.length === item.byteLength) {
              item = buf;
            } else {
              item = buf.slice(item.byteOffset, item.byteOffset + item.byteLength);
            }
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(val[i]));
        }
      }
      result = result + "}";
      return result;
    }
    __name(arrayString, "arrayString");
    __name2(arrayString, "arrayString");
    var prepareValue = /* @__PURE__ */ __name2(function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          const buf = Buffer.from(val.buffer, val.byteOffset, val.byteLength);
          if (buf.length === val.byteLength) {
            return buf;
          }
          return buf.slice(val.byteOffset, val.byteOffset + val.byteLength);
        }
        if (isDate(val)) {
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    }, "prepareValue");
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    __name(prepareObject, "prepareObject");
    __name2(prepareObject, "prepareObject");
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    __name(dateToString, "dateToString");
    __name2(dateToString, "dateToString");
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    __name(dateToStringUTC, "dateToStringUTC");
    __name2(dateToStringUTC, "dateToStringUTC");
    function normalizeQueryConfig(config22, values, callback) {
      config22 = typeof config22 === "string" ? { text: config22 } : config22;
      if (values) {
        if (typeof values === "function") {
          config22.callback = values;
        } else {
          config22.values = values;
        }
      }
      if (callback) {
        config22.callback = callback;
      }
      return config22;
    }
    __name(normalizeQueryConfig, "normalizeQueryConfig");
    __name2(normalizeQueryConfig, "normalizeQueryConfig");
    var escapeIdentifier2 = /* @__PURE__ */ __name2(function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    }, "escapeIdentifier");
    var escapeLiteral2 = /* @__PURE__ */ __name2(function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    }, "escapeLiteral");
    module.exports = {
      prepareValue: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function prepareValueWrapper(value) {
        return prepareValue(value);
      }, "prepareValueWrapper"), "prepareValueWrapper"),
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});
var require_crypto = __commonJS({
  "node-built-in-modules:crypto"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault3;
  }
});
var require_utils_legacy = __commonJS({
  "../node_modules/pg/lib/crypto/utils-legacy.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var nodeCrypto = require_crypto();
    function md5(string) {
      return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
    }
    __name(md5, "md5");
    __name2(md5, "md5");
    function postgresMd5PasswordHash(user, password, salt) {
      const inner = md5(password + user);
      const outer = md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    __name(postgresMd5PasswordHash, "postgresMd5PasswordHash");
    __name2(postgresMd5PasswordHash, "postgresMd5PasswordHash");
    function sha256(text) {
      return nodeCrypto.createHash("sha256").update(text).digest();
    }
    __name(sha256, "sha256");
    __name2(sha256, "sha256");
    function hashByName(hashName, text) {
      hashName = hashName.replace(/(\D)-/, "$1");
      return nodeCrypto.createHash(hashName).update(text).digest();
    }
    __name(hashByName, "hashByName");
    __name2(hashByName, "hashByName");
    function hmacSha256(key, msg) {
      return nodeCrypto.createHmac("sha256", key).update(msg).digest();
    }
    __name(hmacSha256, "hmacSha256");
    __name2(hmacSha256, "hmacSha256");
    async function deriveKey(password, salt, iterations) {
      return nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    }
    __name(deriveKey, "deriveKey");
    __name2(deriveKey, "deriveKey");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes: nodeCrypto.randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
  }
});
var require_utils_webcrypto = __commonJS({
  "../node_modules/pg/lib/crypto/utils-webcrypto.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var nodeCrypto = require_crypto();
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    __name(randomBytes, "randomBytes");
    __name2(randomBytes, "randomBytes");
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b2) => b2.toString(16).padStart(2, "0")).join("");
      }
    }
    __name(md5, "md5");
    __name2(md5, "md5");
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    __name(postgresMd5PasswordHash, "postgresMd5PasswordHash");
    __name2(postgresMd5PasswordHash, "postgresMd5PasswordHash");
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    __name(sha256, "sha256");
    __name2(sha256, "sha256");
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    __name(hashByName, "hashByName");
    __name2(hashByName, "hashByName");
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    __name(hmacSha256, "hmacSha256");
    __name2(hmacSha256, "hmacSha256");
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
    __name(deriveKey, "deriveKey");
    __name2(deriveKey, "deriveKey");
  }
});
var require_utils2 = __commonJS({
  "../node_modules/pg/lib/crypto/utils.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var useLegacyCrypto = parseInt(process.versions && process.versions.node && process.versions.node.split(".")[0]) < 15;
    if (useLegacyCrypto) {
      module.exports = require_utils_legacy();
    } else {
      module.exports = require_utils_webcrypto();
    }
  }
});
var require_cert_signatures = __commonJS({
  "../node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    __name(x509Error, "x509Error");
    __name2(x509Error, "x509Error");
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    __name(readASN1Length, "readASN1Length");
    __name2(readASN1Length, "readASN1Length");
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    __name(readASN1OID, "readASN1OID");
    __name2(readASN1OID, "readASN1OID");
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    __name(expectASN1Seq, "expectASN1Seq");
    __name2(expectASN1Seq, "expectASN1Seq");
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    __name(signatureAlgorithmHashFromCertificate, "signatureAlgorithmHashFromCertificate");
    __name2(signatureAlgorithmHashFromCertificate, "signatureAlgorithmHashFromCertificate");
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});
var require_sasl = __commonJS({
  "../node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var crypto2 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function startSession(mechanisms, stream) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse"
      };
    }
    __name(startSession, "startSession");
    __name2(startSession, "startSession");
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto2.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto2.deriveKey(password, saltBytes, sv.iteration);
      const clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto2.sha256(clientKey);
      const clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    __name(continueSession, "continueSession");
    __name2(continueSession, "continueSession");
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    __name(finalizeSession, "finalizeSession");
    __name2(finalizeSession, "finalizeSession");
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    __name(isPrintableChars, "isPrintableChars");
    __name2(isPrintableChars, "isPrintableChars");
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    __name(isBase64, "isBase64");
    __name2(isBase64, "isBase64");
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    __name(parseAttributePairs, "parseAttributePairs");
    __name2(parseAttributePairs, "parseAttributePairs");
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    __name(parseServerFirstMessage, "parseServerFirstMessage");
    __name2(parseServerFirstMessage, "parseServerFirstMessage");
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const serverSignature = attrPairs.get("v");
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    __name(parseServerFinalMessage, "parseServerFinalMessage");
    __name2(parseServerFinalMessage, "parseServerFinalMessage");
    function xorBuffers(a2, b2) {
      if (!Buffer.isBuffer(a2)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b2)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a2.length !== b2.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a2.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a2.map((_, i) => a2[i] ^ b2[i]));
    }
    __name(xorBuffers, "xorBuffers");
    __name2(xorBuffers, "xorBuffers");
    module.exports = {
      startSession,
      continueSession,
      finalizeSession
    };
  }
});
var require_type_overrides = __commonJS({
  "../node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    __name(TypeOverrides2, "TypeOverrides2");
    __name2(TypeOverrides2, "TypeOverrides");
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides2;
  }
});
var require_dns = __commonJS({
  "node-built-in-modules:dns"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault4;
  }
});
var access;
var copyFile;
var cp;
var open;
var opendir;
var rename;
var truncate;
var rm;
var rmdir;
var mkdir;
var readdir;
var readlink;
var symlink;
var lstat;
var stat;
var link;
var unlink;
var chmod;
var lchmod;
var lchown;
var chown;
var utimes;
var lutimes;
var realpath;
var mkdtemp;
var writeFile;
var appendFile;
var readFile;
var watch;
var statfs;
var glob;
var init_promises = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/fs/promises.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    access = /* @__PURE__ */ notImplemented2("fs.access");
    copyFile = /* @__PURE__ */ notImplemented2("fs.copyFile");
    cp = /* @__PURE__ */ notImplemented2("fs.cp");
    open = /* @__PURE__ */ notImplemented2("fs.open");
    opendir = /* @__PURE__ */ notImplemented2("fs.opendir");
    rename = /* @__PURE__ */ notImplemented2("fs.rename");
    truncate = /* @__PURE__ */ notImplemented2("fs.truncate");
    rm = /* @__PURE__ */ notImplemented2("fs.rm");
    rmdir = /* @__PURE__ */ notImplemented2("fs.rmdir");
    mkdir = /* @__PURE__ */ notImplemented2("fs.mkdir");
    readdir = /* @__PURE__ */ notImplemented2("fs.readdir");
    readlink = /* @__PURE__ */ notImplemented2("fs.readlink");
    symlink = /* @__PURE__ */ notImplemented2("fs.symlink");
    lstat = /* @__PURE__ */ notImplemented2("fs.lstat");
    stat = /* @__PURE__ */ notImplemented2("fs.stat");
    link = /* @__PURE__ */ notImplemented2("fs.link");
    unlink = /* @__PURE__ */ notImplemented2("fs.unlink");
    chmod = /* @__PURE__ */ notImplemented2("fs.chmod");
    lchmod = /* @__PURE__ */ notImplemented2("fs.lchmod");
    lchown = /* @__PURE__ */ notImplemented2("fs.lchown");
    chown = /* @__PURE__ */ notImplemented2("fs.chown");
    utimes = /* @__PURE__ */ notImplemented2("fs.utimes");
    lutimes = /* @__PURE__ */ notImplemented2("fs.lutimes");
    realpath = /* @__PURE__ */ notImplemented2("fs.realpath");
    mkdtemp = /* @__PURE__ */ notImplemented2("fs.mkdtemp");
    writeFile = /* @__PURE__ */ notImplemented2("fs.writeFile");
    appendFile = /* @__PURE__ */ notImplemented2("fs.appendFile");
    readFile = /* @__PURE__ */ notImplemented2("fs.readFile");
    watch = /* @__PURE__ */ notImplemented2("fs.watch");
    statfs = /* @__PURE__ */ notImplemented2("fs.statfs");
    glob = /* @__PURE__ */ notImplemented2("fs.glob");
  }
});
var constants_exports = {};
__export(constants_exports, {
  COPYFILE_EXCL: /* @__PURE__ */ __name(() => COPYFILE_EXCL, "COPYFILE_EXCL"),
  COPYFILE_FICLONE: /* @__PURE__ */ __name(() => COPYFILE_FICLONE, "COPYFILE_FICLONE"),
  COPYFILE_FICLONE_FORCE: /* @__PURE__ */ __name(() => COPYFILE_FICLONE_FORCE, "COPYFILE_FICLONE_FORCE"),
  EXTENSIONLESS_FORMAT_JAVASCRIPT: /* @__PURE__ */ __name(() => EXTENSIONLESS_FORMAT_JAVASCRIPT, "EXTENSIONLESS_FORMAT_JAVASCRIPT"),
  EXTENSIONLESS_FORMAT_WASM: /* @__PURE__ */ __name(() => EXTENSIONLESS_FORMAT_WASM, "EXTENSIONLESS_FORMAT_WASM"),
  F_OK: /* @__PURE__ */ __name(() => F_OK, "F_OK"),
  O_APPEND: /* @__PURE__ */ __name(() => O_APPEND, "O_APPEND"),
  O_CREAT: /* @__PURE__ */ __name(() => O_CREAT, "O_CREAT"),
  O_DIRECT: /* @__PURE__ */ __name(() => O_DIRECT, "O_DIRECT"),
  O_DIRECTORY: /* @__PURE__ */ __name(() => O_DIRECTORY, "O_DIRECTORY"),
  O_DSYNC: /* @__PURE__ */ __name(() => O_DSYNC, "O_DSYNC"),
  O_EXCL: /* @__PURE__ */ __name(() => O_EXCL, "O_EXCL"),
  O_NOATIME: /* @__PURE__ */ __name(() => O_NOATIME, "O_NOATIME"),
  O_NOCTTY: /* @__PURE__ */ __name(() => O_NOCTTY, "O_NOCTTY"),
  O_NOFOLLOW: /* @__PURE__ */ __name(() => O_NOFOLLOW, "O_NOFOLLOW"),
  O_NONBLOCK: /* @__PURE__ */ __name(() => O_NONBLOCK, "O_NONBLOCK"),
  O_RDONLY: /* @__PURE__ */ __name(() => O_RDONLY, "O_RDONLY"),
  O_RDWR: /* @__PURE__ */ __name(() => O_RDWR, "O_RDWR"),
  O_SYNC: /* @__PURE__ */ __name(() => O_SYNC, "O_SYNC"),
  O_TRUNC: /* @__PURE__ */ __name(() => O_TRUNC, "O_TRUNC"),
  O_WRONLY: /* @__PURE__ */ __name(() => O_WRONLY, "O_WRONLY"),
  R_OK: /* @__PURE__ */ __name(() => R_OK, "R_OK"),
  S_IFBLK: /* @__PURE__ */ __name(() => S_IFBLK, "S_IFBLK"),
  S_IFCHR: /* @__PURE__ */ __name(() => S_IFCHR, "S_IFCHR"),
  S_IFDIR: /* @__PURE__ */ __name(() => S_IFDIR, "S_IFDIR"),
  S_IFIFO: /* @__PURE__ */ __name(() => S_IFIFO, "S_IFIFO"),
  S_IFLNK: /* @__PURE__ */ __name(() => S_IFLNK, "S_IFLNK"),
  S_IFMT: /* @__PURE__ */ __name(() => S_IFMT, "S_IFMT"),
  S_IFREG: /* @__PURE__ */ __name(() => S_IFREG, "S_IFREG"),
  S_IFSOCK: /* @__PURE__ */ __name(() => S_IFSOCK, "S_IFSOCK"),
  S_IRGRP: /* @__PURE__ */ __name(() => S_IRGRP, "S_IRGRP"),
  S_IROTH: /* @__PURE__ */ __name(() => S_IROTH, "S_IROTH"),
  S_IRUSR: /* @__PURE__ */ __name(() => S_IRUSR, "S_IRUSR"),
  S_IRWXG: /* @__PURE__ */ __name(() => S_IRWXG, "S_IRWXG"),
  S_IRWXO: /* @__PURE__ */ __name(() => S_IRWXO, "S_IRWXO"),
  S_IRWXU: /* @__PURE__ */ __name(() => S_IRWXU, "S_IRWXU"),
  S_IWGRP: /* @__PURE__ */ __name(() => S_IWGRP, "S_IWGRP"),
  S_IWOTH: /* @__PURE__ */ __name(() => S_IWOTH, "S_IWOTH"),
  S_IWUSR: /* @__PURE__ */ __name(() => S_IWUSR, "S_IWUSR"),
  S_IXGRP: /* @__PURE__ */ __name(() => S_IXGRP, "S_IXGRP"),
  S_IXOTH: /* @__PURE__ */ __name(() => S_IXOTH, "S_IXOTH"),
  S_IXUSR: /* @__PURE__ */ __name(() => S_IXUSR, "S_IXUSR"),
  UV_DIRENT_BLOCK: /* @__PURE__ */ __name(() => UV_DIRENT_BLOCK, "UV_DIRENT_BLOCK"),
  UV_DIRENT_CHAR: /* @__PURE__ */ __name(() => UV_DIRENT_CHAR, "UV_DIRENT_CHAR"),
  UV_DIRENT_DIR: /* @__PURE__ */ __name(() => UV_DIRENT_DIR, "UV_DIRENT_DIR"),
  UV_DIRENT_FIFO: /* @__PURE__ */ __name(() => UV_DIRENT_FIFO, "UV_DIRENT_FIFO"),
  UV_DIRENT_FILE: /* @__PURE__ */ __name(() => UV_DIRENT_FILE, "UV_DIRENT_FILE"),
  UV_DIRENT_LINK: /* @__PURE__ */ __name(() => UV_DIRENT_LINK, "UV_DIRENT_LINK"),
  UV_DIRENT_SOCKET: /* @__PURE__ */ __name(() => UV_DIRENT_SOCKET, "UV_DIRENT_SOCKET"),
  UV_DIRENT_UNKNOWN: /* @__PURE__ */ __name(() => UV_DIRENT_UNKNOWN, "UV_DIRENT_UNKNOWN"),
  UV_FS_COPYFILE_EXCL: /* @__PURE__ */ __name(() => UV_FS_COPYFILE_EXCL, "UV_FS_COPYFILE_EXCL"),
  UV_FS_COPYFILE_FICLONE: /* @__PURE__ */ __name(() => UV_FS_COPYFILE_FICLONE, "UV_FS_COPYFILE_FICLONE"),
  UV_FS_COPYFILE_FICLONE_FORCE: /* @__PURE__ */ __name(() => UV_FS_COPYFILE_FICLONE_FORCE, "UV_FS_COPYFILE_FICLONE_FORCE"),
  UV_FS_O_FILEMAP: /* @__PURE__ */ __name(() => UV_FS_O_FILEMAP, "UV_FS_O_FILEMAP"),
  UV_FS_SYMLINK_DIR: /* @__PURE__ */ __name(() => UV_FS_SYMLINK_DIR, "UV_FS_SYMLINK_DIR"),
  UV_FS_SYMLINK_JUNCTION: /* @__PURE__ */ __name(() => UV_FS_SYMLINK_JUNCTION, "UV_FS_SYMLINK_JUNCTION"),
  W_OK: /* @__PURE__ */ __name(() => W_OK, "W_OK"),
  X_OK: /* @__PURE__ */ __name(() => X_OK, "X_OK")
});
var UV_FS_SYMLINK_DIR;
var UV_FS_SYMLINK_JUNCTION;
var O_RDONLY;
var O_WRONLY;
var O_RDWR;
var UV_DIRENT_UNKNOWN;
var UV_DIRENT_FILE;
var UV_DIRENT_DIR;
var UV_DIRENT_LINK;
var UV_DIRENT_FIFO;
var UV_DIRENT_SOCKET;
var UV_DIRENT_CHAR;
var UV_DIRENT_BLOCK;
var EXTENSIONLESS_FORMAT_JAVASCRIPT;
var EXTENSIONLESS_FORMAT_WASM;
var S_IFMT;
var S_IFREG;
var S_IFDIR;
var S_IFCHR;
var S_IFBLK;
var S_IFIFO;
var S_IFLNK;
var S_IFSOCK;
var O_CREAT;
var O_EXCL;
var UV_FS_O_FILEMAP;
var O_NOCTTY;
var O_TRUNC;
var O_APPEND;
var O_DIRECTORY;
var O_NOATIME;
var O_NOFOLLOW;
var O_SYNC;
var O_DSYNC;
var O_DIRECT;
var O_NONBLOCK;
var S_IRWXU;
var S_IRUSR;
var S_IWUSR;
var S_IXUSR;
var S_IRWXG;
var S_IRGRP;
var S_IWGRP;
var S_IXGRP;
var S_IRWXO;
var S_IROTH;
var S_IWOTH;
var S_IXOTH;
var F_OK;
var R_OK;
var W_OK;
var X_OK;
var UV_FS_COPYFILE_EXCL;
var COPYFILE_EXCL;
var UV_FS_COPYFILE_FICLONE;
var COPYFILE_FICLONE;
var UV_FS_COPYFILE_FICLONE_FORCE;
var COPYFILE_FICLONE_FORCE;
var init_constants = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/fs/constants.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    UV_FS_SYMLINK_DIR = 1;
    UV_FS_SYMLINK_JUNCTION = 2;
    O_RDONLY = 0;
    O_WRONLY = 1;
    O_RDWR = 2;
    UV_DIRENT_UNKNOWN = 0;
    UV_DIRENT_FILE = 1;
    UV_DIRENT_DIR = 2;
    UV_DIRENT_LINK = 3;
    UV_DIRENT_FIFO = 4;
    UV_DIRENT_SOCKET = 5;
    UV_DIRENT_CHAR = 6;
    UV_DIRENT_BLOCK = 7;
    EXTENSIONLESS_FORMAT_JAVASCRIPT = 0;
    EXTENSIONLESS_FORMAT_WASM = 1;
    S_IFMT = 61440;
    S_IFREG = 32768;
    S_IFDIR = 16384;
    S_IFCHR = 8192;
    S_IFBLK = 24576;
    S_IFIFO = 4096;
    S_IFLNK = 40960;
    S_IFSOCK = 49152;
    O_CREAT = 64;
    O_EXCL = 128;
    UV_FS_O_FILEMAP = 0;
    O_NOCTTY = 256;
    O_TRUNC = 512;
    O_APPEND = 1024;
    O_DIRECTORY = 65536;
    O_NOATIME = 262144;
    O_NOFOLLOW = 131072;
    O_SYNC = 1052672;
    O_DSYNC = 4096;
    O_DIRECT = 16384;
    O_NONBLOCK = 2048;
    S_IRWXU = 448;
    S_IRUSR = 256;
    S_IWUSR = 128;
    S_IXUSR = 64;
    S_IRWXG = 56;
    S_IRGRP = 32;
    S_IWGRP = 16;
    S_IXGRP = 8;
    S_IRWXO = 7;
    S_IROTH = 4;
    S_IWOTH = 2;
    S_IXOTH = 1;
    F_OK = 0;
    R_OK = 4;
    W_OK = 2;
    X_OK = 1;
    UV_FS_COPYFILE_EXCL = 1;
    COPYFILE_EXCL = 1;
    UV_FS_COPYFILE_FICLONE = 2;
    COPYFILE_FICLONE = 2;
    UV_FS_COPYFILE_FICLONE_FORCE = 4;
    COPYFILE_FICLONE_FORCE = 4;
  }
});
var promises_default;
var init_promises2 = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/fs/promises.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_promises();
    init_constants();
    init_promises();
    promises_default = {
      constants: constants_exports,
      access,
      appendFile,
      chmod,
      chown,
      copyFile,
      cp,
      glob,
      lchmod,
      lchown,
      link,
      lstat,
      lutimes,
      mkdir,
      mkdtemp,
      open,
      opendir,
      readFile,
      readdir,
      readlink,
      realpath,
      rename,
      rm,
      rmdir,
      stat,
      statfs,
      symlink,
      truncate,
      unlink,
      utimes,
      watch,
      writeFile
    };
  }
});
var Dir;
var Dirent;
var Stats;
var ReadStream22;
var WriteStream22;
var FileReadStream;
var FileWriteStream;
var init_classes = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/fs/classes.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    Dir = /* @__PURE__ */ notImplementedClass2("fs.Dir");
    Dirent = /* @__PURE__ */ notImplementedClass2("fs.Dirent");
    Stats = /* @__PURE__ */ notImplementedClass2("fs.Stats");
    ReadStream22 = /* @__PURE__ */ notImplementedClass2("fs.ReadStream");
    WriteStream22 = /* @__PURE__ */ notImplementedClass2("fs.WriteStream");
    FileReadStream = ReadStream22;
    FileWriteStream = WriteStream22;
  }
});
function callbackify(fn) {
  const fnc = /* @__PURE__ */ __name2(function(...args) {
    const cb = args.pop();
    fn().catch((error32) => cb(error32)).then((val) => cb(void 0, val));
  }, "fnc");
  fnc.__promisify__ = fn;
  fnc.native = fnc;
  return fnc;
}
__name(callbackify, "callbackify");
var access2;
var appendFile2;
var chown2;
var chmod2;
var copyFile2;
var cp2;
var lchown2;
var lchmod2;
var link2;
var lstat2;
var lutimes2;
var mkdir2;
var mkdtemp2;
var realpath2;
var open2;
var opendir2;
var readdir2;
var readFile2;
var readlink2;
var rename2;
var rm2;
var rmdir2;
var stat2;
var symlink2;
var truncate2;
var unlink2;
var utimes2;
var writeFile2;
var statfs2;
var close;
var createReadStream;
var createWriteStream;
var exists;
var fchown;
var fchmod;
var fdatasync;
var fstat;
var fsync;
var ftruncate;
var futimes;
var lstatSync;
var read;
var readv;
var realpathSync;
var statSync;
var unwatchFile;
var watch2;
var watchFile;
var write;
var writev;
var _toUnixTimestamp;
var openAsBlob;
var glob2;
var appendFileSync;
var accessSync;
var chownSync;
var chmodSync;
var closeSync;
var copyFileSync;
var cpSync;
var existsSync;
var fchownSync;
var fchmodSync;
var fdatasyncSync;
var fstatSync;
var fsyncSync;
var ftruncateSync;
var futimesSync;
var lchownSync;
var lchmodSync;
var linkSync;
var lutimesSync;
var mkdirSync;
var mkdtempSync;
var openSync;
var opendirSync;
var readdirSync;
var readSync;
var readvSync;
var readFileSync;
var readlinkSync;
var renameSync;
var rmSync;
var rmdirSync;
var symlinkSync;
var truncateSync;
var unlinkSync;
var utimesSync;
var writeFileSync;
var writeSync;
var writevSync;
var statfsSync;
var globSync;
var init_fs = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/internal/fs/fs.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    init_promises();
    __name2(callbackify, "callbackify");
    access2 = callbackify(access);
    appendFile2 = callbackify(appendFile);
    chown2 = callbackify(chown);
    chmod2 = callbackify(chmod);
    copyFile2 = callbackify(copyFile);
    cp2 = callbackify(cp);
    lchown2 = callbackify(lchown);
    lchmod2 = callbackify(lchmod);
    link2 = callbackify(link);
    lstat2 = callbackify(lstat);
    lutimes2 = callbackify(lutimes);
    mkdir2 = callbackify(mkdir);
    mkdtemp2 = callbackify(mkdtemp);
    realpath2 = callbackify(realpath);
    open2 = callbackify(open);
    opendir2 = callbackify(opendir);
    readdir2 = callbackify(readdir);
    readFile2 = callbackify(readFile);
    readlink2 = callbackify(readlink);
    rename2 = callbackify(rename);
    rm2 = callbackify(rm);
    rmdir2 = callbackify(rmdir);
    stat2 = callbackify(stat);
    symlink2 = callbackify(symlink);
    truncate2 = callbackify(truncate);
    unlink2 = callbackify(unlink);
    utimes2 = callbackify(utimes);
    writeFile2 = callbackify(writeFile);
    statfs2 = callbackify(statfs);
    close = /* @__PURE__ */ notImplementedAsync("fs.close");
    createReadStream = /* @__PURE__ */ notImplementedAsync("fs.createReadStream");
    createWriteStream = /* @__PURE__ */ notImplementedAsync("fs.createWriteStream");
    exists = /* @__PURE__ */ notImplementedAsync("fs.exists");
    fchown = /* @__PURE__ */ notImplementedAsync("fs.fchown");
    fchmod = /* @__PURE__ */ notImplementedAsync("fs.fchmod");
    fdatasync = /* @__PURE__ */ notImplementedAsync("fs.fdatasync");
    fstat = /* @__PURE__ */ notImplementedAsync("fs.fstat");
    fsync = /* @__PURE__ */ notImplementedAsync("fs.fsync");
    ftruncate = /* @__PURE__ */ notImplementedAsync("fs.ftruncate");
    futimes = /* @__PURE__ */ notImplementedAsync("fs.futimes");
    lstatSync = /* @__PURE__ */ notImplementedAsync("fs.lstatSync");
    read = /* @__PURE__ */ notImplementedAsync("fs.read");
    readv = /* @__PURE__ */ notImplementedAsync("fs.readv");
    realpathSync = /* @__PURE__ */ notImplementedAsync("fs.realpathSync");
    statSync = /* @__PURE__ */ notImplementedAsync("fs.statSync");
    unwatchFile = /* @__PURE__ */ notImplementedAsync("fs.unwatchFile");
    watch2 = /* @__PURE__ */ notImplementedAsync("fs.watch");
    watchFile = /* @__PURE__ */ notImplementedAsync("fs.watchFile");
    write = /* @__PURE__ */ notImplementedAsync("fs.write");
    writev = /* @__PURE__ */ notImplementedAsync("fs.writev");
    _toUnixTimestamp = /* @__PURE__ */ notImplementedAsync("fs._toUnixTimestamp");
    openAsBlob = /* @__PURE__ */ notImplementedAsync("fs.openAsBlob");
    glob2 = /* @__PURE__ */ notImplementedAsync("fs.glob");
    appendFileSync = /* @__PURE__ */ notImplemented2("fs.appendFileSync");
    accessSync = /* @__PURE__ */ notImplemented2("fs.accessSync");
    chownSync = /* @__PURE__ */ notImplemented2("fs.chownSync");
    chmodSync = /* @__PURE__ */ notImplemented2("fs.chmodSync");
    closeSync = /* @__PURE__ */ notImplemented2("fs.closeSync");
    copyFileSync = /* @__PURE__ */ notImplemented2("fs.copyFileSync");
    cpSync = /* @__PURE__ */ notImplemented2("fs.cpSync");
    existsSync = /* @__PURE__ */ __name2(() => false, "existsSync");
    fchownSync = /* @__PURE__ */ notImplemented2("fs.fchownSync");
    fchmodSync = /* @__PURE__ */ notImplemented2("fs.fchmodSync");
    fdatasyncSync = /* @__PURE__ */ notImplemented2("fs.fdatasyncSync");
    fstatSync = /* @__PURE__ */ notImplemented2("fs.fstatSync");
    fsyncSync = /* @__PURE__ */ notImplemented2("fs.fsyncSync");
    ftruncateSync = /* @__PURE__ */ notImplemented2("fs.ftruncateSync");
    futimesSync = /* @__PURE__ */ notImplemented2("fs.futimesSync");
    lchownSync = /* @__PURE__ */ notImplemented2("fs.lchownSync");
    lchmodSync = /* @__PURE__ */ notImplemented2("fs.lchmodSync");
    linkSync = /* @__PURE__ */ notImplemented2("fs.linkSync");
    lutimesSync = /* @__PURE__ */ notImplemented2("fs.lutimesSync");
    mkdirSync = /* @__PURE__ */ notImplemented2("fs.mkdirSync");
    mkdtempSync = /* @__PURE__ */ notImplemented2("fs.mkdtempSync");
    openSync = /* @__PURE__ */ notImplemented2("fs.openSync");
    opendirSync = /* @__PURE__ */ notImplemented2("fs.opendirSync");
    readdirSync = /* @__PURE__ */ notImplemented2("fs.readdirSync");
    readSync = /* @__PURE__ */ notImplemented2("fs.readSync");
    readvSync = /* @__PURE__ */ notImplemented2("fs.readvSync");
    readFileSync = /* @__PURE__ */ notImplemented2("fs.readFileSync");
    readlinkSync = /* @__PURE__ */ notImplemented2("fs.readlinkSync");
    renameSync = /* @__PURE__ */ notImplemented2("fs.renameSync");
    rmSync = /* @__PURE__ */ notImplemented2("fs.rmSync");
    rmdirSync = /* @__PURE__ */ notImplemented2("fs.rmdirSync");
    symlinkSync = /* @__PURE__ */ notImplemented2("fs.symlinkSync");
    truncateSync = /* @__PURE__ */ notImplemented2("fs.truncateSync");
    unlinkSync = /* @__PURE__ */ notImplemented2("fs.unlinkSync");
    utimesSync = /* @__PURE__ */ notImplemented2("fs.utimesSync");
    writeFileSync = /* @__PURE__ */ notImplemented2("fs.writeFileSync");
    writeSync = /* @__PURE__ */ notImplemented2("fs.writeSync");
    writevSync = /* @__PURE__ */ notImplemented2("fs.writevSync");
    statfsSync = /* @__PURE__ */ notImplemented2("fs.statfsSync");
    globSync = /* @__PURE__ */ notImplemented2("fs.globSync");
  }
});
var fs_default;
var init_fs2 = __esm({
  "../../AppData/Roaming/npm/node_modules/wrangler/node_modules/unenv/dist/runtime/node/fs.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_promises2();
    init_classes();
    init_fs();
    init_constants();
    init_constants();
    init_fs();
    init_classes();
    fs_default = {
      F_OK,
      R_OK,
      W_OK,
      X_OK,
      constants: constants_exports,
      promises: promises_default,
      Dir,
      Dirent,
      FileReadStream,
      FileWriteStream,
      ReadStream: ReadStream22,
      Stats,
      WriteStream: WriteStream22,
      _toUnixTimestamp,
      access: access2,
      accessSync,
      appendFile: appendFile2,
      appendFileSync,
      chmod: chmod2,
      chmodSync,
      chown: chown2,
      chownSync,
      close,
      closeSync,
      copyFile: copyFile2,
      copyFileSync,
      cp: cp2,
      cpSync,
      createReadStream,
      createWriteStream,
      exists,
      existsSync,
      fchmod,
      fchmodSync,
      fchown,
      fchownSync,
      fdatasync,
      fdatasyncSync,
      fstat,
      fstatSync,
      fsync,
      fsyncSync,
      ftruncate,
      ftruncateSync,
      futimes,
      futimesSync,
      glob: glob2,
      lchmod: lchmod2,
      globSync,
      lchmodSync,
      lchown: lchown2,
      lchownSync,
      link: link2,
      linkSync,
      lstat: lstat2,
      lstatSync,
      lutimes: lutimes2,
      lutimesSync,
      mkdir: mkdir2,
      mkdirSync,
      mkdtemp: mkdtemp2,
      mkdtempSync,
      open: open2,
      openAsBlob,
      openSync,
      opendir: opendir2,
      opendirSync,
      read,
      readFile: readFile2,
      readFileSync,
      readSync,
      readdir: readdir2,
      readdirSync,
      readlink: readlink2,
      readlinkSync,
      readv,
      readvSync,
      realpath: realpath2,
      realpathSync,
      rename: rename2,
      renameSync,
      rm: rm2,
      rmSync,
      rmdir: rmdir2,
      rmdirSync,
      stat: stat2,
      statSync,
      statfs: statfs2,
      statfsSync,
      symlink: symlink2,
      symlinkSync,
      truncate: truncate2,
      truncateSync,
      unlink: unlink2,
      unlinkSync,
      unwatchFile,
      utimes: utimes2,
      utimesSync,
      watch: watch2,
      watchFile,
      write,
      writeFile: writeFile2,
      writeFileSync,
      writeSync,
      writev,
      writevSync
    };
  }
});
var require_fs = __commonJS({
  "node-built-in-modules:fs"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_fs2();
    module.exports = fs_default;
  }
});
var require_pg_connection_string = __commonJS({
  "../node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    function parse2(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config3 = str.split(" ");
        return { host: config3[0], database: config3[1] };
      }
      const config22 = {};
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
      }
      for (const entry of result.searchParams.entries()) {
        config22[entry[0]] = entry[1];
      }
      config22.user = config22.user || decodeURIComponent(result.username);
      config22.password = config22.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config22.host = decodeURI(result.pathname);
        config22.database = result.searchParams.get("db");
        config22.client_encoding = result.searchParams.get("encoding");
        return config22;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config22.host) {
        config22.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config22.port) {
        config22.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config22.database = pathname ? decodeURI(pathname) : null;
      if (config22.ssl === "true" || config22.ssl === "1") {
        config22.ssl = true;
      }
      if (config22.ssl === "0") {
        config22.ssl = false;
      }
      if (config22.sslcert || config22.sslkey || config22.sslrootcert || config22.sslmode) {
        config22.ssl = {};
      }
      const fs = config22.sslcert || config22.sslkey || config22.sslrootcert ? require_fs() : null;
      if (config22.sslcert) {
        config22.ssl.cert = fs.readFileSync(config22.sslcert).toString();
      }
      if (config22.sslkey) {
        config22.ssl.key = fs.readFileSync(config22.sslkey).toString();
      }
      if (config22.sslrootcert) {
        config22.ssl.ca = fs.readFileSync(config22.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config22.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config22.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config22.sslmode) {
          case "disable": {
            config22.ssl = false;
            break;
          }
          case "prefer": {
            config22.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config22.sslrootcert) {
              config22.ssl.checkServerIdentity = function() {
              };
            } else {
              config22.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config22.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config22.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config22.sslmode) {
          case "disable": {
            config22.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            break;
          }
          case "no-verify": {
            config22.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config22;
    }
    __name(parse2, "parse2");
    __name2(parse2, "parse");
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, {});
      return connectionOptions;
    }
    __name(toConnectionOptions, "toConnectionOptions");
    __name2(toConnectionOptions, "toConnectionOptions");
    function toClientConfig(config22) {
      const poolConfig = Object.entries(config22).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v2 = parseInt(value, 10);
              if (isNaN(v2)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v2;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, {});
      return poolConfig;
    }
    __name(toClientConfig, "toClientConfig");
    __name2(toClientConfig, "toClientConfig");
    function parseIntoClientConfig(str) {
      return toClientConfig(parse2(str));
    }
    __name(parseIntoClientConfig, "parseIntoClientConfig");
    __name2(parseIntoClientConfig, "parseIntoClientConfig");
    module.exports = parse2;
    parse2.parse = parse2;
    parse2.toClientConfig = toClientConfig;
    parse2.parseIntoClientConfig = parseIntoClientConfig;
  }
});
var require_connection_parameters = __commonJS({
  "../node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var dns = require_dns();
    var defaults2 = require_defaults();
    var parse2 = require_pg_connection_string().parse;
    var val = /* @__PURE__ */ __name2(function(key, config22, envVar) {
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return config22[key] || envVar || defaults2[key];
    }, "val");
    var readSSLConfigFromEnvironment = /* @__PURE__ */ __name2(function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    }, "readSSLConfigFromEnvironment");
    var quoteParamValue = /* @__PURE__ */ __name2(function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    }, "quoteParamValue");
    var add = /* @__PURE__ */ __name2(function(params, config22, paramName) {
      const value = config22[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    }, "add");
    var ConnectionParameters = class {
      static {
        __name(this, "ConnectionParameters");
      }
      static {
        __name2(this, "ConnectionParameters");
      }
      constructor(config22) {
        config22 = typeof config22 === "string" ? parse2(config22) : config22 || {};
        if (config22.connectionString) {
          config22 = Object.assign({}, config22, parse2(config22.connectionString));
        }
        this.user = val("user", config22);
        this.database = val("database", config22);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config22), 10);
        this.host = val("host", config22);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config22)
        });
        this.binary = val("binary", config22);
        this.options = val("options", config22);
        this.ssl = typeof config22.ssl === "undefined" ? readSSLConfigFromEnvironment() : config22.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.client_encoding = val("client_encoding", config22);
        this.replication = val("replication", config22);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config22, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config22, false);
        this.statement_timeout = val("statement_timeout", config22, false);
        this.lock_timeout = val("lock_timeout", config22, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config22, false);
        this.query_timeout = val("query_timeout", config22, false);
        if (config22.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config22.connectionTimeoutMillis / 1e3);
        }
        if (config22.keepAlive === false) {
          this.keepalives = 0;
        } else if (config22.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config22.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config22.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});
var require_result = __commonJS({
  "../node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      static {
        __name(this, "Result2");
      }
      static {
        __name2(this, "Result");
      }
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match2;
        if (msg.text) {
          match2 = matchRegexp.exec(msg.text);
        } else {
          match2 = matchRegexp.exec(msg.command);
        }
        if (match2) {
          this.command = match2[1];
          if (match2[3]) {
            this.oid = parseInt(match2[2], 10);
            this.rowCount = parseInt(match2[3], 10);
          } else if (match2[2]) {
            this.rowCount = parseInt(match2[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v2 = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v2);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = {};
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});
var require_query = __commonJS({
  "../node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var { EventEmitter: EventEmitter22 } = require_events();
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter22 {
      static {
        __name(this, "Query2");
      }
      static {
        __name2(this, "Query");
      }
      constructor(config22, values, callback) {
        super();
        config22 = utils.normalizeQueryConfig(config22, values, callback);
        this.text = config22.text;
        this.values = config22.values;
        this.rows = config22.rows;
        this.types = config22.types;
        this.name = config22.name;
        this.queryMode = config22.queryMode;
        this.binary = config22.binary;
        this.portal = config22.portal || "";
        this.callback = config22.callback;
        this._rowMode = config22.rowMode;
        if (process.domain && config22.callback) {
          this.callback = process.domain.bind(config22.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && connection.parsedStatements[this.name];
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});
var require_messages = __commonJS({
  "../node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      static {
        __name(this, "DatabaseError2");
      }
      static {
        __name2(this, "DatabaseError");
      }
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      static {
        __name(this, "CopyDataMessage");
      }
      static {
        __name2(this, "CopyDataMessage");
      }
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      static {
        __name(this, "CopyResponse");
      }
      static {
        __name2(this, "CopyResponse");
      }
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      static {
        __name(this, "Field");
      }
      static {
        __name2(this, "Field");
      }
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      static {
        __name(this, "RowDescriptionMessage");
      }
      static {
        __name2(this, "RowDescriptionMessage");
      }
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      static {
        __name(this, "ParameterDescriptionMessage");
      }
      static {
        __name2(this, "ParameterDescriptionMessage");
      }
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      static {
        __name(this, "ParameterStatusMessage");
      }
      static {
        __name2(this, "ParameterStatusMessage");
      }
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      static {
        __name(this, "AuthenticationMD5Password");
      }
      static {
        __name2(this, "AuthenticationMD5Password");
      }
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      static {
        __name(this, "BackendKeyDataMessage");
      }
      static {
        __name2(this, "BackendKeyDataMessage");
      }
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      static {
        __name(this, "NotificationResponseMessage");
      }
      static {
        __name2(this, "NotificationResponseMessage");
      }
      constructor(length, processId, channel22, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel22;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      static {
        __name(this, "ReadyForQueryMessage");
      }
      static {
        __name2(this, "ReadyForQueryMessage");
      }
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      static {
        __name(this, "CommandCompleteMessage");
      }
      static {
        __name2(this, "CommandCompleteMessage");
      }
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      static {
        __name(this, "DataRowMessage");
      }
      static {
        __name2(this, "DataRowMessage");
      }
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      static {
        __name(this, "NoticeMessage");
      }
      static {
        __name2(this, "NoticeMessage");
      }
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});
var require_buffer_writer = __commonJS({
  "../node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      static {
        __name(this, "Writer");
      }
      static {
        __name2(this, "Writer");
      }
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
    };
    exports.Writer = Writer;
  }
});
var require_serializer = __commonJS({
  "../node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = /* @__PURE__ */ __name2((opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    }, "startup");
    var requestSsl = /* @__PURE__ */ __name2(() => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    }, "requestSsl");
    var password = /* @__PURE__ */ __name2((password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    }, "password");
    var sendSASLInitialResponseMessage = /* @__PURE__ */ __name2(function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32(Buffer.byteLength(initialResponse)).addString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    }, "sendSASLInitialResponseMessage");
    var sendSCRAMClientFinalMessage = /* @__PURE__ */ __name2(function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    }, "sendSCRAMClientFinalMessage");
    var query = /* @__PURE__ */ __name2((text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    }, "query");
    var emptyArray = [];
    var parse2 = /* @__PURE__ */ __name2((query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    }, "parse");
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = /* @__PURE__ */ __name2(function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(Buffer.byteLength(mappedVal));
          paramWriter.addString(mappedVal);
        }
      }
    }, "writeValues");
    var bind = /* @__PURE__ */ __name2((config22 = {}) => {
      const portal = config22.portal || "";
      const statement = config22.statement || "";
      const binary = config22.binary || false;
      const values = config22.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      writeValues(values, config22.valueMapper);
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    }, "bind");
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = /* @__PURE__ */ __name2((config22) => {
      if (!config22 || !config22.portal && !config22.rows) {
        return emptyExecute;
      }
      const portal = config22.portal || "";
      const rows = config22.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    }, "execute");
    var cancel = /* @__PURE__ */ __name2((processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    }, "cancel");
    var cstringMessage = /* @__PURE__ */ __name2((code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    }, "cstringMessage");
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = /* @__PURE__ */ __name2((msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    }, "describe");
    var close2 = /* @__PURE__ */ __name2((msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    }, "close");
    var copyData = /* @__PURE__ */ __name2((chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    }, "copyData");
    var copyFail = /* @__PURE__ */ __name2((message) => {
      return cstringMessage(102, message);
    }, "copyFail");
    var codeOnlyBuffer = /* @__PURE__ */ __name2((code) => Buffer.from([code, 0, 0, 0, 4]), "codeOnlyBuffer");
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse: parse2,
      bind,
      execute,
      describe,
      close: close2,
      flush: /* @__PURE__ */ __name2(() => flushBuffer, "flush"),
      sync: /* @__PURE__ */ __name2(() => syncBuffer, "sync"),
      end: /* @__PURE__ */ __name2(() => endBuffer, "end"),
      copyData,
      copyDone: /* @__PURE__ */ __name2(() => copyDoneBuffer, "copyDone"),
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});
var require_buffer_reader = __commonJS({
  "../node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var BufferReader = class {
      static {
        __name(this, "BufferReader");
      }
      static {
        __name2(this, "BufferReader");
      }
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = emptyBuffer;
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++] !== 0) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});
var require_parser = __commonJS({
  "../node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      static {
        __name(this, "Parser");
      }
      static {
        __name2(this, "Parser");
      }
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        switch (code) {
          case 50:
            return messages_1.bindComplete;
          case 49:
            return messages_1.parseComplete;
          case 51:
            return messages_1.closeComplete;
          case 110:
            return messages_1.noData;
          case 115:
            return messages_1.portalSuspended;
          case 99:
            return messages_1.copyDone;
          case 87:
            return messages_1.replicationStart;
          case 73:
            return messages_1.emptyQuery;
          case 68:
            return this.parseDataRowMessage(offset, length, bytes);
          case 67:
            return this.parseCommandCompleteMessage(offset, length, bytes);
          case 90:
            return this.parseReadyForQueryMessage(offset, length, bytes);
          case 65:
            return this.parseNotificationMessage(offset, length, bytes);
          case 82:
            return this.parseAuthenticationResponse(offset, length, bytes);
          case 83:
            return this.parseParameterStatusMessage(offset, length, bytes);
          case 75:
            return this.parseBackendKeyData(offset, length, bytes);
          case 69:
            return this.parseErrorMessage(offset, length, bytes, "error");
          case 78:
            return this.parseErrorMessage(offset, length, bytes, "notice");
          case 84:
            return this.parseRowDescriptionMessage(offset, length, bytes);
          case 116:
            return this.parseParameterDescriptionMessage(offset, length, bytes);
          case 71:
            return this.parseCopyInMessage(offset, length, bytes);
          case 72:
            return this.parseCopyOutMessage(offset, length, bytes);
          case 100:
            return this.parseCopyData(offset, length, bytes);
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
      }
      parseReadyForQueryMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const status = this.reader.string(1);
        return new messages_1.ReadyForQueryMessage(length, status);
      }
      parseCommandCompleteMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const text = this.reader.cstring();
        return new messages_1.CommandCompleteMessage(length, text);
      }
      parseCopyData(offset, length, bytes) {
        const chunk = bytes.slice(offset, offset + (length - 4));
        return new messages_1.CopyDataMessage(length, chunk);
      }
      parseCopyInMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyInResponse");
      }
      parseCopyOutMessage(offset, length, bytes) {
        return this.parseCopyMessage(offset, length, bytes, "copyOutResponse");
      }
      parseCopyMessage(offset, length, bytes, messageName) {
        this.reader.setBuffer(offset, bytes);
        const isBinary = this.reader.byte() !== 0;
        const columnCount = this.reader.int16();
        const message = new messages_1.CopyResponse(length, messageName, isBinary, columnCount);
        for (let i = 0; i < columnCount; i++) {
          message.columnTypes[i] = this.reader.int16();
        }
        return message;
      }
      parseNotificationMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processId = this.reader.int32();
        const channel22 = this.reader.cstring();
        const payload = this.reader.cstring();
        return new messages_1.NotificationResponseMessage(length, processId, channel22, payload);
      }
      parseRowDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const message = new messages_1.RowDescriptionMessage(length, fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          message.fields[i] = this.parseField();
        }
        return message;
      }
      parseField() {
        const name = this.reader.cstring();
        const tableID = this.reader.uint32();
        const columnID = this.reader.int16();
        const dataTypeID = this.reader.uint32();
        const dataTypeSize = this.reader.int16();
        const dataTypeModifier = this.reader.int32();
        const mode = this.reader.int16() === 0 ? "text" : "binary";
        return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
      }
      parseParameterDescriptionMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const parameterCount = this.reader.int16();
        const message = new messages_1.ParameterDescriptionMessage(length, parameterCount);
        for (let i = 0; i < parameterCount; i++) {
          message.dataTypeIDs[i] = this.reader.int32();
        }
        return message;
      }
      parseDataRowMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const fieldCount = this.reader.int16();
        const fields = new Array(fieldCount);
        for (let i = 0; i < fieldCount; i++) {
          const len = this.reader.int32();
          fields[i] = len === -1 ? null : this.reader.string(len);
        }
        return new messages_1.DataRowMessage(length, fields);
      }
      parseParameterStatusMessage(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const name = this.reader.cstring();
        const value = this.reader.cstring();
        return new messages_1.ParameterStatusMessage(length, name, value);
      }
      parseBackendKeyData(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const processID = this.reader.int32();
        const secretKey = this.reader.int32();
        return new messages_1.BackendKeyDataMessage(length, processID, secretKey);
      }
      parseAuthenticationResponse(offset, length, bytes) {
        this.reader.setBuffer(offset, bytes);
        const code = this.reader.int32();
        const message = {
          name: "authenticationOk",
          length
        };
        switch (code) {
          case 0:
            break;
          case 3:
            if (message.length === 8) {
              message.name = "authenticationCleartextPassword";
            }
            break;
          case 5:
            if (message.length === 12) {
              message.name = "authenticationMD5Password";
              const salt = this.reader.bytes(4);
              return new messages_1.AuthenticationMD5Password(length, salt);
            }
            break;
          case 10:
            {
              message.name = "authenticationSASL";
              message.mechanisms = [];
              let mechanism;
              do {
                mechanism = this.reader.cstring();
                if (mechanism) {
                  message.mechanisms.push(mechanism);
                }
              } while (mechanism);
            }
            break;
          case 11:
            message.name = "authenticationSASLContinue";
            message.data = this.reader.string(length - 8);
            break;
          case 12:
            message.name = "authenticationSASLFinal";
            message.data = this.reader.string(length - 8);
            break;
          default:
            throw new Error("Unknown authenticationOk message type " + code);
        }
        return message;
      }
      parseErrorMessage(offset, length, bytes, name) {
        this.reader.setBuffer(offset, bytes);
        const fields = {};
        let fieldType = this.reader.string(1);
        while (fieldType !== "\0") {
          fields[fieldType] = this.reader.cstring();
          fieldType = this.reader.string(1);
        }
        const messageValue = fields.M;
        const message = name === "notice" ? new messages_1.NoticeMessage(length, messageValue) : new messages_1.DatabaseError(messageValue, length, name);
        message.severity = fields.S;
        message.code = fields.C;
        message.detail = fields.D;
        message.hint = fields.H;
        message.position = fields.P;
        message.internalPosition = fields.p;
        message.internalQuery = fields.q;
        message.where = fields.W;
        message.schema = fields.s;
        message.table = fields.t;
        message.column = fields.c;
        message.dataType = fields.d;
        message.constraint = fields.n;
        message.file = fields.F;
        message.line = fields.L;
        message.routine = fields.R;
        return message;
      }
    };
    exports.Parser = Parser;
  }
});
var require_dist = __commonJS({
  "../node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = exports.parse = void 0;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return messages_1.DatabaseError;
    }, "get") });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return serializer_1.serialize;
    }, "get") });
    var parser_1 = require_parser();
    function parse2(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
    __name(parse2, "parse2");
    __name2(parse2, "parse");
    exports.parse = parse2;
  }
});
var require_net = __commonJS({
  "node-built-in-modules:net"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault5;
  }
});
var require_tls = __commonJS({
  "node-built-in-modules:tls"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault6;
  }
});
var require_dist2 = __commonJS({
  "../node_modules/pg-cloudflare/dist/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CloudflareSocket = void 0;
    var events_1 = require_events();
    var CloudflareSocket = class extends events_1.EventEmitter {
      static {
        __name(this, "CloudflareSocket");
      }
      static {
        __name2(this, "CloudflareSocket");
      }
      constructor(ssl) {
        super();
        this.ssl = ssl;
        this.writable = false;
        this.destroyed = false;
        this._upgrading = false;
        this._upgraded = false;
        this._cfSocket = null;
        this._cfWriter = null;
        this._cfReader = null;
      }
      setNoDelay() {
        return this;
      }
      setKeepAlive() {
        return this;
      }
      ref() {
        return this;
      }
      unref() {
        return this;
      }
      async connect(port, host, connectListener) {
        try {
          log32("connecting");
          if (connectListener)
            this.once("connect", connectListener);
          const options = this.ssl ? { secureTransport: "starttls" } : {};
          const mod = await import("cloudflare:sockets");
          const connect = mod.connect;
          this._cfSocket = connect(`${host}:${port}`, options);
          this._cfWriter = this._cfSocket.writable.getWriter();
          this._addClosedHandler();
          this._cfReader = this._cfSocket.readable.getReader();
          if (this.ssl) {
            this._listenOnce().catch((e) => this.emit("error", e));
          } else {
            this._listen().catch((e) => this.emit("error", e));
          }
          await this._cfWriter.ready;
          log32("socket ready");
          this.writable = true;
          this.emit("connect");
          return this;
        } catch (e) {
          this.emit("error", e);
        }
      }
      async _listen() {
        while (true) {
          log32("awaiting receive from CF socket");
          const { done, value } = await this._cfReader.read();
          log32("CF socket received:", done, value);
          if (done) {
            log32("done");
            break;
          }
          this.emit("data", Buffer.from(value));
        }
      }
      async _listenOnce() {
        log32("awaiting first receive from CF socket");
        const { done, value } = await this._cfReader.read();
        log32("First CF socket received:", done, value);
        this.emit("data", Buffer.from(value));
      }
      write(data, encoding = "utf8", callback = () => {
      }) {
        if (data.length === 0)
          return callback();
        if (typeof data === "string")
          data = Buffer.from(data, encoding);
        log32("sending data direct:", data);
        this._cfWriter.write(data).then(() => {
          log32("data sent");
          callback();
        }, (err) => {
          log32("send error", err);
          callback(err);
        });
        return true;
      }
      end(data = Buffer.alloc(0), encoding = "utf8", callback = () => {
      }) {
        log32("ending CF socket");
        this.write(data, encoding, (err) => {
          this._cfSocket.close();
          if (callback)
            callback(err);
        });
        return this;
      }
      destroy(reason) {
        log32("destroying CF socket", reason);
        this.destroyed = true;
        return this.end();
      }
      startTls(options) {
        if (this._upgraded) {
          this.emit("error", "Cannot call `startTls()` more than once on a socket");
          return;
        }
        this._cfWriter.releaseLock();
        this._cfReader.releaseLock();
        this._upgrading = true;
        this._cfSocket = this._cfSocket.startTls(options);
        this._cfWriter = this._cfSocket.writable.getWriter();
        this._cfReader = this._cfSocket.readable.getReader();
        this._addClosedHandler();
        this._listen().catch((e) => this.emit("error", e));
      }
      _addClosedHandler() {
        this._cfSocket.closed.then(() => {
          if (!this._upgrading) {
            log32("CF socket closed");
            this._cfSocket = null;
            this.emit("close");
          } else {
            this._upgrading = false;
            this._upgraded = true;
          }
        }).catch((e) => this.emit("error", e));
      }
    };
    exports.CloudflareSocket = CloudflareSocket;
    var debug32 = false;
    function dump(data) {
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        const hex = Buffer.from(data).toString("hex");
        const str = new TextDecoder().decode(data);
        return `
>>> STR: "${str.replace(/\n/g, "\\n")}"
>>> HEX: ${hex}
`;
      } else {
        return data;
      }
    }
    __name(dump, "dump");
    __name2(dump, "dump");
    function log32(...args) {
      debug32 && console.log(...args.map(dump));
    }
    __name(log32, "log3");
    __name2(log32, "log");
  }
});
var require_stream = __commonJS({
  "../node_modules/pg/lib/stream.js"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require_net();
        return new net.Socket();
      }
      __name(getStream2, "getStream2");
      __name2(getStream2, "getStream");
      function getSecureStream2(options) {
        const tls = require_tls();
        return tls.connect(options);
      }
      __name(getSecureStream2, "getSecureStream2");
      __name2(getSecureStream2, "getSecureStream");
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    __name(getNodejsStreamFuncs, "getNodejsStreamFuncs");
    __name2(getNodejsStreamFuncs, "getNodejsStreamFuncs");
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_dist2();
        return new CloudflareSocket(ssl);
      }
      __name(getStream2, "getStream2");
      __name2(getStream2, "getStream");
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      __name(getSecureStream2, "getSecureStream2");
      __name2(getSecureStream2, "getSecureStream");
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    __name(getCloudflareStreamFuncs, "getCloudflareStreamFuncs");
    __name2(getCloudflareStreamFuncs, "getCloudflareStreamFuncs");
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && true) {
        return true;
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    __name(isCloudflareRuntime, "isCloudflareRuntime");
    __name2(isCloudflareRuntime, "isCloudflareRuntime");
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
    __name(getStreamFuncs, "getStreamFuncs");
    __name2(getStreamFuncs, "getStreamFuncs");
  }
});
var require_connection = __commonJS({
  "../node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var EventEmitter22 = require_events().EventEmitter;
    var { parse: parse2, serialize } = require_dist();
    var { getStream, getSecureStream } = require_stream();
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter22 {
      static {
        __name(this, "Connection2");
      }
      static {
        __name2(this, "Connection");
      }
      constructor(config22) {
        super();
        config22 = config22 || {};
        this.stream = config22.stream || getStream(config22.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config22);
        }
        this._keepAlive = config22.keepAlive;
        this._keepAliveInitialDelayMillis = config22.keepAliveInitialDelayMillis;
        this.lastBuffer = false;
        this.parsedStatements = {};
        this.ssl = config22.ssl || false;
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = /* @__PURE__ */ __name2(function(error32) {
          if (self._ending && (error32.code === "ECONNRESET" || error32.code === "EPIPE")) {
            return;
          }
          self.emit("error", error32);
        }, "reportStreamError");
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          const options = {
            socket: self.stream
          };
          if (self.ssl !== true) {
            Object.assign(options, self.ssl);
            if ("key" in self.ssl) {
              options.key = self.ssl.key;
            }
          }
          const net = require_net();
          if (net.isIP && net.isIP(host) === 0) {
            options.servername = host;
          }
          try {
            self.stream = getSecureStream(options);
          } catch (err) {
            return self.emit("error", err);
          }
          self.attachListeners(self.stream);
          self.stream.on("error", reportStreamError);
          self.emit("sslconnect");
        });
      }
      attachListeners(stream) {
        parse2(stream, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config22) {
        this.stream.write(serialize.startup(config22));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config22) {
        this._send(serialize.bind(config22));
      }
      // send execute message
      execute(config22) {
        this._send(serialize.execute(config22));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});
var require_path = __commonJS({
  "node-built-in-modules:path"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault7;
  }
});
var require_stream2 = __commonJS({
  "node-built-in-modules:stream"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault8;
  }
});
var require_string_decoder = __commonJS({
  "node-built-in-modules:string_decoder"(exports, module) {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = libDefault9;
  }
});
var require_split2 = __commonJS({
  "../node_modules/split2/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var { Transform } = require_stream2();
    var { StringDecoder } = require_string_decoder();
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error32) {
          return cb(error32);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    __name(transform, "transform");
    __name2(transform, "transform");
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error32) {
          return cb(error32);
        }
      }
      cb();
    }
    __name(flush, "flush");
    __name2(flush, "flush");
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    __name(push, "push");
    __name2(push, "push");
    function noop(incoming) {
      return incoming;
    }
    __name(noop, "noop");
    __name2(noop, "noop");
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    __name(split, "split");
    __name2(split, "split");
    module.exports = split;
  }
});
var require_helper = __commonJS({
  "../node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var path = require_path();
    var Stream = require_stream2().Stream;
    var split = require_split2();
    var util = require_util();
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG2 = 56;
    var S_IRWXO2 = 7;
    var S_IFMT2 = 61440;
    var S_IFREG2 = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT2) == S_IFREG2;
    }
    __name(isRegFile, "isRegFile");
    __name2(isRegFile, "isRegFile");
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn32() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    __name(warn32, "warn3");
    __name2(warn32, "warn");
    Object.defineProperty(module.exports, "isWin", {
      get: /* @__PURE__ */ __name2(function() {
        return isWin;
      }, "get"),
      set: /* @__PURE__ */ __name2(function(val) {
        isWin = val;
      }, "set")
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env22 = rawEnv || process.env;
      var file = env22.PGPASSFILE || (isWin ? path.join(env22.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env22.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn32('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG2 | S_IRWXO2)) {
        warn32('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      __name(onLine, "onLine");
      __name2(onLine, "onLine");
      var onEnd = /* @__PURE__ */ __name2(function() {
        stream.destroy();
        cb(pass);
      }, "onEnd");
      var onErr = /* @__PURE__ */ __name2(function(err) {
        stream.destroy();
        warn32("WARNING: error on reading file: %s", err);
        cb(void 0);
      }, "onErr");
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = /* @__PURE__ */ __name2(function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      }, "addToObj");
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x2) {
          return x2.length > 0;
        },
        // port
        1: function(x2) {
          if (x2 === "*") {
            return true;
          }
          x2 = Number(x2);
          return isFinite(x2) && x2 > 0 && x2 < 9007199254740992 && Math.floor(x2) === x2;
        },
        // database
        2: function(x2) {
          return x2.length > 0;
        },
        // username
        3: function(x2) {
          return x2.length > 0;
        },
        // password
        4: function(x2) {
          return x2.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});
var require_lib = __commonJS({
  "../node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var path = require_path();
    var fs = require_fs();
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat3) {
        if (err || !helper.usePgPass(stat3, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});
var require_client = __commonJS({
  "../node_modules/pg/lib/client.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var EventEmitter22 = require_events().EventEmitter;
    var utils = require_utils();
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var crypto2 = require_utils2();
    var Client2 = class extends EventEmitter22 {
      static {
        __name(this, "Client2");
      }
      static {
        __name2(this, "Client");
      }
      constructor(config22) {
        super();
        this.connectionParameters = new ConnectionParameters(config22);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config22 || {};
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this.queryQueue = [];
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      _errorAllQueries(err) {
        const enqueueError = /* @__PURE__ */ __name2((query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        }, "enqueueError");
        if (this.activeQuery) {
          enqueueError(this.activeQuery);
          this.activeQuery = null;
        }
        this.queryQueue.forEach(enqueueError);
        this.queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            con.requestSsl();
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error32 = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error32);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error32);
              } else {
                this._handleErrorEvent(error32);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error32);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error32) => {
            if (error32) {
              reject(error32);
            } else {
              resolve();
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      // TODO(bmc): deprecate pgpass "built in" integration since this.password can be a function
      // it can be supplied by the user if required - this is a breaking change!
      _checkPgPass(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password()).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._checkPgPass(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._checkPgPass(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._checkPgPass(() => {
          try {
            this.saslSession = sasl.startSession(msg.mechanisms, this.enableChannelBinding && this.connection.stream);
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const { activeQuery } = this;
        this.activeQuery = null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this.activeQuery;
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this.activeQuery = null;
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        this.activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        this.activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        this.activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        this.activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        if (this.activeQuery == null) {
          const error32 = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error32);
          return;
        }
        this.activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        if (this.activeQuery == null) {
          const error32 = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error32);
          return;
        }
        if (this.activeQuery.name) {
          this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text;
        }
      }
      _handleCopyInResponse(msg) {
        this.activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        this.activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client.queryQueue.indexOf(query) !== -1) {
          client.queryQueue.splice(client.queryQueue.indexOf(query), 1);
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.readyForQuery === true) {
          this.activeQuery = this.queryQueue.shift();
          if (this.activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = this.activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                this.activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this.activeQuery = null;
            this.emit("drain");
          }
        }
      }
      query(config22, values, callback) {
        let query;
        let result;
        let readTimeout;
        let readTimeoutTimer;
        let queryCallback;
        if (config22 === null || config22 === void 0) {
          throw new TypeError("Client was passed a null or undefined query");
        } else if (typeof config22.submit === "function") {
          readTimeout = config22.query_timeout || this.connectionParameters.query_timeout;
          result = query = config22;
          if (typeof values === "function") {
            query.callback = query.callback || values;
          }
        } else {
          readTimeout = config22.query_timeout || this.connectionParameters.query_timeout;
          query = new Query2(config22, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          }
        }
        if (readTimeout) {
          queryCallback = query.callback;
          readTimeoutTimer = setTimeout(() => {
            const error32 = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error32, this.connection);
            });
            queryCallback(error32);
            query.callback = () => {
            };
            const index = this.queryQueue.indexOf(query);
            if (index > -1) {
              this.queryQueue.splice(index, 1);
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        this.queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
          } else {
            return this._Promise.resolve();
          }
        }
        if (this.activeQuery || !this._queryable) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});
var require_pg_pool = __commonJS({
  "../node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var EventEmitter22 = require_events().EventEmitter;
    var NOOP = /* @__PURE__ */ __name2(function() {
    }, "NOOP");
    var removeWhere = /* @__PURE__ */ __name2((list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    }, "removeWhere");
    var IdleItem = class {
      static {
        __name(this, "IdleItem");
      }
      static {
        __name2(this, "IdleItem");
      }
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      static {
        __name(this, "PendingItem");
      }
      static {
        __name2(this, "PendingItem");
      }
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    __name(throwOnDoubleRelease, "throwOnDoubleRelease");
    __name2(throwOnDoubleRelease, "throwOnDoubleRelease");
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = /* @__PURE__ */ __name2(function(err, client) {
        err ? rej(err) : res(client);
      }, "cb");
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    __name(promisify, "promisify");
    __name2(promisify, "promisify");
    function makeIdleListener(pool, client) {
      return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      }, "idleListener"), "idleListener");
    }
    __name(makeIdleListener, "makeIdleListener");
    __name2(makeIdleListener, "makeIdleListener");
    var Pool2 = class extends EventEmitter22 {
      static {
        __name(this, "Pool2");
      }
      static {
        __name2(this, "Pool");
      }
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context22 = this;
        client.end(() => {
          context22.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = /* @__PURE__ */ __name2((err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          }, "queueCallback");
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            this.log("ending client due to timeout");
            timeoutHit = true;
            client.connection ? client.connection.stream.destroy() : client.end();
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.maxLifetimeSeconds !== 0) {
              const maxLifetimeTimeout = setTimeout(() => {
                this.log("ending client due to expired lifetime");
                this._expired.add(client);
                const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
                if (idleIndex !== -1) {
                  this._acquireClient(
                    client,
                    new PendingItem((err2, client2, clientRelease) => clientRelease()),
                    idleListener,
                    false
                  );
                }
              }, this.options.maxLifetimeSeconds * 1e3);
              maxLifetimeTimeout.unref();
              client.once("end", () => clearTimeout(maxLifetimeTimeout));
            }
            return this._acquireClient(client, pendingItem, idleListener, true);
          }
        });
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            this.log("remove idle client");
            this._remove(client, this._pulseQueue.bind(this));
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = /* @__PURE__ */ __name2((err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          }, "onError");
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});
var require_query2 = __commonJS({
  "../node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var EventEmitter22 = require_events().EventEmitter;
    var util = require_util();
    var utils = require_utils();
    var NativeQuery = module.exports = function(config22, values, callback) {
      EventEmitter22.call(this);
      config22 = utils.normalizeQueryConfig(config22, values, callback);
      this.text = config22.text;
      this.values = config22.values;
      this.name = config22.name;
      this.queryMode = config22.queryMode;
      this.callback = config22.callback;
      this.state = "new";
      this._arrayMode = config22.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter22);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = /* @__PURE__ */ __name2(function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      }, "after");
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});
var require_client2 = __commonJS({
  "../node_modules/pg/lib/native/client.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Native;
    try {
      Native = __require2("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter22 = require_events().EventEmitter;
    var util = require_util();
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var Client2 = module.exports = function(config22) {
      EventEmitter22.call(this);
      config22 = config22 || {};
      this._Promise = config22.Promise || global.Promise;
      this._types = new TypeOverrides2(config22.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      const cp3 = this.connectionParameters = new ConnectionParameters(config22);
      if (config22.nativeConnectionString) cp3.nativeConnectionString = config22.nativeConnectionString;
      this.user = cp3.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp3.password
      });
      this.database = cp3.database;
      this.host = cp3.host;
      this.port = cp3.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter22);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = /* @__PURE__ */ __name2((query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      }, "enqueueError");
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb();
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error32) => {
          if (error32) {
            reject(error32);
          } else {
            resolve();
          }
        });
      });
    };
    Client2.prototype.query = function(config22, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config22 === null || config22 === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config22.submit === "function") {
        readTimeout = config22.query_timeout || this.connectionParameters.query_timeout;
        result = query = config22;
        if (typeof values === "function") {
          config22.callback = values;
        }
      } else {
        readTimeout = config22.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config22, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback;
        readTimeoutTimer = setTimeout(() => {
          const error32 = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error32, this.connection);
          });
          queryCallback(error32);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (!this._connected) {
        this.once("connect", this.end.bind(this, cb));
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = /* @__PURE__ */ __name2((err) => err ? reject(err) : resolve(), "cb");
        });
      }
      this.native.end(function() {
        self._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self.emit("end");
          if (cb) cb();
        });
      });
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
  }
});
var require_native = __commonJS({
  "../node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    module.exports = require_client2();
  }
});
var require_lib2 = __commonJS({
  "../node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var Client2 = require_client();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = /* @__PURE__ */ __name2((Client3) => {
      return class BoundPool extends Pool2 {
        static {
          __name(this, "BoundPool");
        }
        static {
          __name2(this, "BoundPool");
        }
        constructor(options) {
          super(options, Client3);
        }
      };
    }, "poolFactory");
    var PG = /* @__PURE__ */ __name2(function(clientConstructor) {
      this.defaults = defaults2;
      this.Client = clientConstructor;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    }, "PG");
    if (typeof process.env.NODE_PG_FORCE_NATIVE !== "undefined") {
      module.exports = new PG(require_native());
    } else {
      module.exports = new PG(Client2);
      Object.defineProperty(module.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          let native = null;
          try {
            native = new PG(require_native());
          } catch (err) {
            if (err.code !== "MODULE_NOT_FOUND") {
              throw err;
            }
          }
          Object.defineProperty(module.exports, "native", {
            value: native
          });
          return native;
        }
      });
    }
  }
});
var import_lib;
var Client;
var Pool;
var Connection;
var types;
var Query;
var DatabaseError;
var escapeIdentifier;
var escapeLiteral;
var Result;
var TypeOverrides;
var defaults;
var esm_default;
var init_esm = __esm({
  "../node_modules/pg/esm/index.mjs"() {
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_lib = __toESM(require_lib2(), 1);
    Client = import_lib.default.Client;
    Pool = import_lib.default.Pool;
    Connection = import_lib.default.Connection;
    types = import_lib.default.types;
    Query = import_lib.default.Query;
    DatabaseError = import_lib.default.DatabaseError;
    escapeIdentifier = import_lib.default.escapeIdentifier;
    escapeLiteral = import_lib.default.escapeLiteral;
    Result = import_lib.default.Result;
    TypeOverrides = import_lib.default.TypeOverrides;
    defaults = import_lib.default.defaults;
    esm_default = import_lib.default;
  }
});
async function onRequest10(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  let client = null;
  try {
    client = new esm_default.Client({
      connectionString: env22.DATABASE_URL
    });
    await client.connect();
    if (request.method === "GET") {
      const result = await client.query(`
        SELECT id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
        FROM scraper_configs
        ORDER BY updated_at DESC
      `);
      const configs = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        startUrl: row.start_url,
        fields: row.fields,
        aiFields: row.ai_fields,
        storage: row.storage,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      return new Response(JSON.stringify({ configs }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "POST") {
      const config22 = await request.json();
      const result = await client.query(`
        INSERT INTO scraper_configs (name, description, start_url, fields, ai_fields, storage)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
      `, [
        config22.name,
        config22.description || null,
        config22.startUrl,
        JSON.stringify(config22.fields),
        config22.aiFields ? JSON.stringify(config22.aiFields) : null,
        config22.storage ? JSON.stringify(config22.storage) : null
      ]);
      const saved = result.rows[0];
      return new Response(JSON.stringify({
        success: true,
        config: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          startUrl: saved.start_url,
          fields: saved.fields,
          aiFields: saved.ai_fields,
          storage: saved.storage,
          createdAt: saved.created_at,
          updatedAt: saved.updated_at
        }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "PUT") {
      const config22 = await request.json();
      if (!config22.id) {
        return new Response(JSON.stringify({ error: "Missing config ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const result = await client.query(`
        UPDATE scraper_configs
        SET name = $1, description = $2, start_url = $3, fields = $4, ai_fields = $5, storage = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, description, start_url, fields, ai_fields, storage, created_at, updated_at
      `, [
        config22.name,
        config22.description || null,
        config22.startUrl,
        JSON.stringify(config22.fields),
        config22.aiFields ? JSON.stringify(config22.aiFields) : null,
        config22.storage ? JSON.stringify(config22.storage) : null,
        config22.id
      ]);
      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: "Config not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const saved = result.rows[0];
      return new Response(JSON.stringify({
        success: true,
        config: {
          id: saved.id,
          name: saved.name,
          description: saved.description,
          startUrl: saved.start_url,
          fields: saved.fields,
          aiFields: saved.ai_fields,
          storage: saved.storage,
          createdAt: saved.created_at,
          updatedAt: saved.updated_at
        }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing config ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      await client.query("DELETE FROM scraper_configs WHERE id = $1", [id]);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error32) {
    console.error("Scraper configs API error:", error32);
    return new Response(JSON.stringify({
      error: error32.message || "Internal server error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } finally {
    if (client) {
      await client.end();
    }
  }
}
__name(onRequest10, "onRequest10");
var init_scraper_configs = __esm({
  "api/scraper-configs.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_esm();
    __name2(onRequest10, "onRequest");
  }
});
async function onRequest11(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get("state")?.toUpperCase();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Calendar-Sources, X-Data-Source",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!stateAbbr) {
    return new Response(JSON.stringify({
      error: "State parameter required"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  try {
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const { results: events } = await env22.DB.prepare(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.level,
        e.lat,
        e.lng,
        e.state_code as state,
        e.location_name as location,
        e.committee_name as committee,
        e.type,
        e.description,
        e.details_url as detailsUrl,
        e.source_url as sourceUrl,
        e.docket_url as docketUrl,
        e.agenda_url as agendaUrl,
        e.virtual_meeting_url as virtualMeetingUrl,
        e.allows_public_participation
      FROM events e
      WHERE e.state_code = ?
      AND e.date >= date('now')
      ORDER BY e.date ASC, e.time ASC
      LIMIT ?
    `).bind(stateAbbr, limit).all();
    const eventIds = events.map((e) => e.id);
    const billsMap = /* @__PURE__ */ new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(",");
      const { results: allBills } = await env22.DB.prepare(`
        SELECT 
          eb.event_id,
          b.bill_number as number,
          b.title,
          b.url,
          b.summary
        FROM bills b
        INNER JOIN event_bills eb ON b.id = eb.bill_id
        WHERE eb.event_id IN (${placeholders})
      `).bind(...eventIds).all();
      for (const bill of allBills || []) {
        if (!billsMap.has(bill.event_id)) {
          billsMap.set(bill.event_id, []);
        }
        const { event_id, ...billData } = bill;
        billsMap.get(bill.event_id).push(billData);
      }
    }
    const tagsMap = /* @__PURE__ */ new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(",");
      const { results: allTags } = await env22.DB.prepare(`
        SELECT event_id, tag FROM event_tags WHERE event_id IN (${placeholders})
      `).bind(...eventIds).all();
      for (const tagRow of allTags || []) {
        if (!tagsMap.has(tagRow.event_id)) {
          tagsMap.set(tagRow.event_id, []);
        }
        tagsMap.get(tagRow.event_id).push(tagRow.tag);
      }
    }
    const summariesMap = /* @__PURE__ */ new Map();
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(",");
      const { results: allSummaries } = await env22.DB.prepare(`
        SELECT event_id, summary FROM agenda_summaries WHERE event_id IN (${placeholders})
      `).bind(...eventIds).all();
      for (const summaryRow of allSummaries || []) {
        if (summaryRow.summary) {
          summariesMap.set(summaryRow.event_id, summaryRow.summary);
        }
      }
    }
    for (const event of events) {
      event.bills = billsMap.get(event.id) || [];
      event.tags = tagsMap.get(event.id) || [];
      if (summariesMap.has(event.id)) {
        event.agendaSummary = summariesMap.get(event.id);
      }
    }
    let calendarSources = [];
    try {
      const { results: sources } = await env22.DB.prepare(`
        SELECT name, url, type, description, notes, status
        FROM data_sources
        WHERE state_code = ?
      `).bind(stateAbbr).all();
      calendarSources = sources || [];
    } catch (sourcesError) {
      console.error("Error fetching data sources:", sourcesError);
    }
    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type");
    responseHeaders.set("Access-Control-Expose-Headers", "X-Calendar-Sources");
    responseHeaders.set("Content-Type", "application/json");
    responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=600");
    responseHeaders.set("X-Calendar-Sources", JSON.stringify(calendarSources));
    return new Response(JSON.stringify(events), {
      headers: responseHeaders
    });
  } catch (error32) {
    console.error("Error:", error32);
    return new Response(JSON.stringify({
      error: "Failed to fetch state events",
      message: error32.message,
      stack: error32.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest11, "onRequest11");
var init_state_events = __esm({
  "api/state-events.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest11, "onRequest");
  }
});
async function onRequest12(context22) {
  const { request, env: env22 } = context22;
  console.log("\u{1F3E2} STATE-EVENTS: Request received");
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get("state")?.toUpperCase();
  console.log(`State requested: ${stateAbbr}`);
  if (!stateAbbr || !STATE_JURISDICTIONS[stateAbbr]) {
    console.error(`Invalid state: ${stateAbbr}`);
    return new Response(
      JSON.stringify({
        error: "Valid state abbreviation required",
        message: "Please provide a valid 2-letter US state abbreviation"
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  const sql = getSQL(context22.env);
  try {
    console.log(`\u{1F4CA} Querying database for ${stateAbbr} events...`);
    const dataAgeResult = await sql`
      SELECT 
        MAX(scraped_at) as last_scraped,
        COUNT(*) as event_count
      FROM events
      WHERE state_code = ${stateAbbr}
        AND date >= CURRENT_DATE
    `;
    const { last_scraped, event_count } = dataAgeResult[0];
    if (event_count === 0) {
      console.log(`\u26A0\uFE0F No events found in database for ${stateAbbr}`);
      return new Response(
        JSON.stringify([]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "X-Data-Source, X-Message",
            "X-Data-Source": "database-empty",
            "X-Message": "No events available. Scraper on local PC will populate data."
          }
        }
      );
    }
    const dataAge = last_scraped ? Date.now() - new Date(last_scraped).getTime() : null;
    const dataAgeHours = dataAge ? Math.floor(dataAge / 1e3 / 60 / 60) : null;
    console.log(`\u2705 Found ${event_count} events, last scraped ${dataAgeHours}h ago`);
    const cleanedEvents = await sql`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.lat,
        e.lng,
        e.level,
        e.type,
        e.state_code as state,
        e.committee_name as committee,
        e.description,
        e.details_url as "detailsUrl",
        e.docket_url as "docketUrl",
        e.virtual_meeting_url as "virtualMeetingUrl",
        e.source_url as "sourceUrl",
        e.allows_public_participation as "allowsPublicParticipation",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', b.bill_number,
              'number', b.bill_number,
              'title', b.title,
              'url', b.url,
              'status', b.status,
              'summary', b.summary
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bills,
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      LEFT JOIN event_tags et ON e.id = et.event_id
      WHERE e.state_code = ${stateAbbr}
        AND e.date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
    `;
    const formattedEvents = cleanedEvents.map((event) => ({
      ...event,
      bills: event.bills && Array.isArray(event.bills) && event.bills[0] !== null ? event.bills : [],
      tags: event.tags && Array.isArray(event.tags) && event.tags[0] !== null ? event.tags.filter((t) => t !== null) : []
    }));
    console.log(`\u{1F4E6} Returning ${formattedEvents.length} events from database`);
    return new Response(
      JSON.stringify(formattedEvents),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "X-Data-Source, X-Data-Age-Hours, X-Last-Scraped",
          "X-Data-Source": "database",
          "X-Data-Age-Hours": String(dataAgeHours),
          "X-Last-Scraped": last_scraped || "unknown"
        }
      }
    );
  } catch (dbError) {
    console.error(`\u274C Database error for ${stateAbbr}:`, dbError);
    return new Response(
      JSON.stringify({
        error: "Database error",
        message: "Failed to retrieve events from database"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest12, "onRequest12");
var STATE_JURISDICTIONS;
var init_state_events_backup2 = __esm({
  "api/state-events-backup2.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_connection();
    STATE_JURISDICTIONS = {
      "AL": { id: "ocd-jurisdiction/country:us/state:al/government", capitol: { lat: 32.3617, lng: -86.2792, city: "Montgomery" } },
      "AK": { id: "ocd-jurisdiction/country:us/state:ak/government", capitol: { lat: 58.3019, lng: -134.4197, city: "Juneau" } },
      "AZ": { id: "ocd-jurisdiction/country:us/state:az/government", capitol: { lat: 33.4484, lng: -112.074, city: "Phoenix" } },
      "AR": { id: "ocd-jurisdiction/country:us/state:ar/government", capitol: { lat: 34.7465, lng: -92.2896, city: "Little Rock" } },
      "CA": { id: "ocd-jurisdiction/country:us/state:ca/government", capitol: { lat: 38.5767, lng: -121.4934, city: "Sacramento" } },
      "CO": { id: "ocd-jurisdiction/country:us/state:co/government", capitol: { lat: 39.7392, lng: -104.9903, city: "Denver" } },
      "CT": { id: "ocd-jurisdiction/country:us/state:ct/government", capitol: { lat: 41.7658, lng: -72.6734, city: "Hartford" } },
      "DE": { id: "ocd-jurisdiction/country:us/state:de/government", capitol: { lat: 39.1582, lng: -75.5244, city: "Dover" } },
      "FL": { id: "ocd-jurisdiction/country:us/state:fl/government", capitol: { lat: 30.4383, lng: -84.2807, city: "Tallahassee" } },
      "GA": { id: "ocd-jurisdiction/country:us/state:ga/government", capitol: { lat: 33.749, lng: -84.388, city: "Atlanta" } },
      "HI": { id: "ocd-jurisdiction/country:us/state:hi/government", capitol: { lat: 21.3099, lng: -157.8581, city: "Honolulu" } },
      "ID": { id: "ocd-jurisdiction/country:us/state:id/government", capitol: { lat: 43.615, lng: -116.2023, city: "Boise" } },
      "IL": { id: "ocd-jurisdiction/country:us/state:il/government", capitol: { lat: 39.7817, lng: -89.6501, city: "Springfield" } },
      "IN": { id: "ocd-jurisdiction/country:us/state:in/government", capitol: { lat: 39.7684, lng: -86.1581, city: "Indianapolis" } },
      "IA": { id: "ocd-jurisdiction/country:us/state:ia/government", capitol: { lat: 41.5868, lng: -93.625, city: "Des Moines" } },
      "KS": { id: "ocd-jurisdiction/country:us/state:ks/government", capitol: { lat: 39.0473, lng: -95.6752, city: "Topeka" } },
      "KY": { id: "ocd-jurisdiction/country:us/state:ky/government", capitol: { lat: 38.1867, lng: -84.8753, city: "Frankfort" } },
      "LA": { id: "ocd-jurisdiction/country:us/state:la/government", capitol: { lat: 30.4515, lng: -91.1871, city: "Baton Rouge" } },
      "ME": { id: "ocd-jurisdiction/country:us/state:me/government", capitol: { lat: 44.3106, lng: -69.7795, city: "Augusta" } },
      "MD": { id: "ocd-jurisdiction/country:us/state:md/government", capitol: { lat: 38.9784, lng: -76.4922, city: "Annapolis" } },
      "MA": { id: "ocd-jurisdiction/country:us/state:ma/government", capitol: { lat: 42.3601, lng: -71.0589, city: "Boston" } },
      "MI": { id: "ocd-jurisdiction/country:us/state:mi/government", capitol: { lat: 42.7325, lng: -84.5555, city: "Lansing" } },
      "MN": { id: "ocd-jurisdiction/country:us/state:mn/government", capitol: { lat: 44.9537, lng: -93.09, city: "Saint Paul" } },
      "MS": { id: "ocd-jurisdiction/country:us/state:ms/government", capitol: { lat: 32.2988, lng: -90.1848, city: "Jackson" } },
      "MO": { id: "ocd-jurisdiction/country:us/state:mo/government", capitol: { lat: 38.5767, lng: -92.1735, city: "Jefferson City" } },
      "MT": { id: "ocd-jurisdiction/country:us/state:mt/government", capitol: { lat: 46.5884, lng: -112.0245, city: "Helena" } },
      "NE": { id: "ocd-jurisdiction/country:us/state:ne/government", capitol: { lat: 40.8136, lng: -96.7026, city: "Lincoln" } },
      "NV": { id: "ocd-jurisdiction/country:us/state:nv/government", capitol: { lat: 39.1638, lng: -119.7674, city: "Carson City" } },
      "NH": { id: "ocd-jurisdiction/country:us/state:nh/government", capitol: { lat: 43.2081, lng: -71.5376, city: "Concord" } },
      "NJ": { id: "ocd-jurisdiction/country:us/state:nj/government", capitol: { lat: 40.2206, lng: -74.7597, city: "Trenton" } },
      "NM": { id: "ocd-jurisdiction/country:us/state:nm/government", capitol: { lat: 35.687, lng: -105.9378, city: "Santa Fe" } },
      "NY": { id: "ocd-jurisdiction/country:us/state:ny/government", capitol: { lat: 42.6526, lng: -73.7562, city: "Albany" } },
      "NC": { id: "ocd-jurisdiction/country:us/state:nc/government", capitol: { lat: 35.7796, lng: -78.6382, city: "Raleigh" } },
      "ND": { id: "ocd-jurisdiction/country:us/state:nd/government", capitol: { lat: 46.8083, lng: -100.7837, city: "Bismarck" } },
      "OH": { id: "ocd-jurisdiction/country:us/state:oh/government", capitol: { lat: 39.9612, lng: -82.9988, city: "Columbus" } },
      "OK": { id: "ocd-jurisdiction/country:us/state:ok/government", capitol: { lat: 35.4676, lng: -97.5164, city: "Oklahoma City" } },
      "OR": { id: "ocd-jurisdiction/country:us/state:or/government", capitol: { lat: 44.9429, lng: -123.0351, city: "Salem" } },
      "PA": { id: "ocd-jurisdiction/country:us/state:pa/government", capitol: { lat: 40.2732, lng: -76.8867, city: "Harrisburg" } },
      "RI": { id: "ocd-jurisdiction/country:us/state:ri/government", capitol: { lat: 41.824, lng: -71.4128, city: "Providence" } },
      "SC": { id: "ocd-jurisdiction/country:us/state:sc/government", capitol: { lat: 34.0007, lng: -81.0348, city: "Columbia" } },
      "SD": { id: "ocd-jurisdiction/country:us/state:sd/government", capitol: { lat: 44.3683, lng: -100.351, city: "Pierre" } },
      "TN": { id: "ocd-jurisdiction/country:us/state:tn/government", capitol: { lat: 36.1627, lng: -86.7816, city: "Nashville" } },
      "TX": { id: "ocd-jurisdiction/country:us/state:tx/government", capitol: { lat: 30.2672, lng: -97.7431, city: "Austin" } },
      "UT": { id: "ocd-jurisdiction/country:us/state:ut/government", capitol: { lat: 40.7608, lng: -111.891, city: "Salt Lake City" } },
      "VT": { id: "ocd-jurisdiction/country:us/state:vt/government", capitol: { lat: 44.2601, lng: -72.5754, city: "Montpelier" } },
      "VA": { id: "ocd-jurisdiction/country:us/state:va/government", capitol: { lat: 37.5407, lng: -77.436, city: "Richmond" } },
      "WA": { id: "ocd-jurisdiction/country:us/state:wa/government", capitol: { lat: 47.0379, lng: -122.9007, city: "Olympia" } },
      "WV": { id: "ocd-jurisdiction/country:us/state:wv/government", capitol: { lat: 38.3498, lng: -81.6326, city: "Charleston" } },
      "WI": { id: "ocd-jurisdiction/country:us/state:wi/government", capitol: { lat: 43.0731, lng: -89.4012, city: "Madison" } },
      "WY": { id: "ocd-jurisdiction/country:us/state:wy/government", capitol: { lat: 41.14, lng: -104.8202, city: "Cheyenne" } }
    };
    __name2(onRequest12, "onRequest");
  }
});
async function onRequest13(context22) {
  const { request, env: env22 } = context22;
  const url = new URL(request.url);
  const stateAbbr = url.searchParams.get("state")?.toUpperCase();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!stateAbbr) {
    return new Response(JSON.stringify({
      error: "State parameter required"
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  try {
    const sql = cs(env22.DATABASE_URL);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = await sql`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.state_code as state,
        e.location_name as location,
        e.committee_name as committee,
        e.type,
        e.description,
        e.details_url,
        e.docket_url,
        e.virtual_meeting_url,
        e.allows_public_participation,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'number', b.bill_number,
              'title', b.title,
              'url', b.url,
              'summary', b.summary
            )
          ) FILTER (WHERE b.id IS NOT NULL),
          '[]'::json
        ) as bills,
        COALESCE(
          array_agg(DISTINCT et.tag) FILTER (WHERE et.tag IS NOT NULL),
          ARRAY[]::text[]
        ) as tags
      FROM events e
      LEFT JOIN event_bills eb ON e.id = eb.event_id
      LEFT JOIN bills b ON eb.bill_id = b.id
      LEFT JOIN event_tags et ON e.id = et.event_id
      WHERE e.state_code = ${stateAbbr}
      AND e.date >= CURRENT_DATE
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
      LIMIT ${limit}
    `;
    const events = result.map((e) => ({
      ...e,
      bills: e.bills && Array.isArray(e.bills) && e.bills[0] !== null ? e.bills : [],
      tags: e.tags && Array.isArray(e.tags) && e.tags[0] !== null ? e.tags.filter((t) => t !== null) : []
    }));
    return new Response(JSON.stringify({
      events
    }), {
      headers: corsHeaders
    });
  } catch (error32) {
    console.error("Error:", error32);
    return new Response(JSON.stringify({
      error: "Failed to fetch state events",
      message: error32.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(onRequest13, "onRequest13");
var init_state_events_simple = __esm({
  "api/state-events-simple.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_serverless();
    ce.fetchConnectionCache = true;
    __name2(onRequest13, "onRequest");
  }
});
async function onRequest14(context22) {
  try {
    const sql = getSQL(context22.env);
    const result = await sql`SELECT NOW() as current_time, COUNT(*) as event_count FROM events`;
    return new Response(
      JSON.stringify({
        message: "Test function works!",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        service: "CiviTracker API",
        database: {
          connected: true,
          serverTime: result[0].current_time,
          totalEvents: result[0].event_count
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Test endpoint error:", error32);
    return new Response(
      JSON.stringify({
        message: "Test function works!",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        service: "CiviTracker API",
        database: {
          connected: false,
          error: error32 instanceof Error ? error32.message : "Unknown error"
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest14, "onRequest14");
var init_test = __esm({
  "api/test.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_connection();
    __name2(onRequest14, "onRequest");
  }
});
async function onRequest15(context22) {
  const { env: env22 } = context22;
  try {
    const dbUrl = new URL(env22.DATABASE_URL.replace("postgresql://", "https://"));
    const auth = dbUrl.username + ":" + dbUrl.password;
    const response = await fetch("https://console.neon.tech/api/v2/sql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(auth)
      },
      body: JSON.stringify({
        query: "SELECT COUNT(*) as count FROM events WHERE date >= CURRENT_DATE"
      })
    });
    const data = await response.json();
    return new Response(JSON.stringify({
      test: "http-api",
      result: data
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error32) {
    return new Response(JSON.stringify({
      error: error32.message,
      dbUrlExists: !!env22.DATABASE_URL
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequest15, "onRequest15");
var init_test_db = __esm({
  "api/test-db.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest15, "onRequest");
  }
});
async function onRequest16() {
  return new Response(JSON.stringify({
    status: "ok",
    message: "Cloudflare Pages Functions working!",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(onRequest16, "onRequest16");
var init_test_simple = __esm({
  "api/test-simple.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest16, "onRequest");
  }
});
async function onRequest17(context22) {
  const { request, env: env22 } = context22;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { results: events } = await env22.DB.prepare(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.time,
        e.location_name as location,
        e.lat,
        e.lng,
        e.level,
        e.type,
        e.state_code as state,
        e.committee_name as committee,
        e.description,
        e.source_url as sourceUrl
      FROM events e
      WHERE e.date >= date('now')
      ORDER BY e.date ASC, e.time ASC
      LIMIT 100
    `).all();
    for (const event of events) {
      const { results: tags } = await env22.DB.prepare(`
        SELECT tag FROM event_tags WHERE event_id = ?
      `).bind(event.id).all();
      event.tags = tags?.map((t) => t.tag) || [];
    }
    const response = {
      events,
      count: events.length,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      prioritization: "date-based",
      cached: false
    };
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=600",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Error fetching top events:", error32);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch top events",
        message: error32.message,
        stack: error32.stack
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest17, "onRequest17");
var init_top_events = __esm({
  "api/top-events.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequest17, "onRequest");
  }
});
async function onRequest18(context22) {
  const { request, env: env22 } = context22;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const { results: events } = await env22.DB.prepare(`
      SELECT 
        e.id, 
        e.name, 
        e.description,
        e.committee_name
      FROM events e
      WHERE e.date >= date('now')
      ORDER BY e.date
    `).all();
    console.log(`\u{1F3F7}\uFE0F Processing ${events.length} events for tagging...`);
    let taggedCount = 0;
    let totalTagsAdded = 0;
    const batchSize = 50;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const statements = [];
      for (const event of batch) {
        let searchableText = `${event.name} ${event.description || ""} ${event.committee_name || ""}`;
        const tags = [];
        for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
          if (patterns.some((pattern) => pattern.test(searchableText))) {
            tags.push(tag);
          }
        }
        if (tags.length > 0) {
          statements.push(
            env22.DB.prepare(`DELETE FROM event_tags WHERE event_id = ?`).bind(event.id)
          );
          for (const tag of tags) {
            statements.push(
              env22.DB.prepare(`INSERT INTO event_tags (event_id, tag) VALUES (?, ?)`).bind(event.id, tag)
            );
            totalTagsAdded++;
          }
          taggedCount++;
        }
      }
      if (statements.length > 0) {
        await env22.DB.batch(statements);
        console.log(`\u2705 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
      }
    }
    console.log(`\u2728 Tagging complete! Tagged ${taggedCount} events with ${totalTagsAdded} total tags`);
    return new Response(
      JSON.stringify({
        success: true,
        processedEvents: events.length,
        taggedEvents: taggedCount,
        totalTags: totalTagsAdded,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error32) {
    console.error("Update tags error:", error32);
    return new Response(
      JSON.stringify({
        error: "Tag update failed",
        details: error32 instanceof Error ? error32.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequest18, "onRequest18");
var TAG_PATTERNS;
var init_update_tags = __esm({
  "api/update-tags.ts"() {
    "use strict";
    init_functionsRoutes_0_7350416873415733();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    TAG_PATTERNS = {
      "healthcare": [/health/i, /medicaid/i, /medicare/i, /hospital/i, /medical/i, /patient/i, /doctor/i, /nurse/i, /pharmacy/i, /prescription/i, /mental\s?health/i, /opioid/i, /vaccine/i, /pandemic/i, /covid/i],
      "education": [/education/i, /school/i, /university/i, /college/i, /student/i, /teacher/i, /curriculum/i, /literacy/i, /tuition/i, /scholarship/i, /k-12/i, /charter\s?school/i],
      "transportation": [/transportation/i, /transit/i, /highway/i, /road/i, /bridge/i, /railroad/i, /airport/i, /aviation/i, /traffic/i, /metro/i, /bus/i, /bike/i, /pedestrian/i],
      "housing": [/housing/i, /affordable\s?housing/i, /rent/i, /tenant/i, /landlord/i, /eviction/i, /homeless/i, /shelter/i, /mortgage/i, /zoning/i, /construction/i, /building/i],
      "budget": [/budget/i, /appropriation/i, /revenue/i, /tax/i, /fiscal/i, /spending/i, /deficit/i, /debt/i, /treasury/i, /allocation/i, /funding/i],
      "environment": [/environment/i, /climate/i, /pollution/i, /conservation/i, /renewable/i, /wildlife/i, /water\s?quality/i, /air\s?quality/i, /sustainability/i, /green/i, /carbon/i, /emissions/i, /recycling/i, /clean\s?energy/i],
      "justice": [/justice/i, /court/i, /judge/i, /criminal/i, /sentencing/i, /police/i, /prison/i, /jail/i, /reform/i, /legal/i, /attorney/i, /crime/i],
      "economy": [/economy/i, /economic/i, /business/i, /commerce/i, /trade/i, /job/i, /employment/i, /unemployment/i, /wage/i, /salary/i, /minimum\s?wage/i, /small\s?business/i],
      "technology": [/technology/i, /tech/i, /internet/i, /broadband/i, /digital/i, /cyber/i, /privacy/i, /security/i, /artificial\s?intelligence/i, /\bai\b/i, /software/i, /5g/i],
      "agriculture": [/agriculture/i, /farm/i, /crop/i, /livestock/i, /rural/i, /food/i, /nutrition/i, /usda/i, /harvest/i, /pesticide/i, /organic/i, /dairy/i],
      "energy": [/energy/i, /power/i, /electricity/i, /gas\b/i, /oil\b/i, /coal/i, /nuclear/i, /solar/i, /wind/i, /hydroelectric/i, /utility/i, /grid/i, /battery/i],
      "defense": [/defense/i, /military/i, /armed\s?forces/i, /army/i, /navy/i, /air\s?force/i, /marines/i, /national\s?security/i, /veteran/i, /troop/i, /weapon/i],
      "immigration": [/immigration/i, /immigrant/i, /refugee/i, /asylum/i, /border/i, /citizenship/i, /visa/i, /deportation/i, /daca/i, /dreamer/i, /\bice\b/i],
      "labor": [/labor/i, /worker/i, /union/i, /workplace/i, /osha/i, /benefits/i, /retirement/i, /pension/i, /workforce/i, /collective\s?bargaining/i, /strike/i, /safety/i],
      "voting": [/voting/i, /election/i, /ballot/i, /voter/i, /electoral/i],
      "veterans": [/veteran/i, /\bva\b/i, /veterans\s?affairs/i, /gi\s?bill/i, /service\s?member/i, /disabled\s?veteran/i],
      "hearing": [/hearing/i, /testimony/i, /witness/i, /public\s?comment/i, /forum/i, /town\s?hall/i, /listening\s?session/i],
      "oversight": [/oversight/i, /investigation/i, /inquiry/i, /audit/i, /review/i, /examination/i, /monitoring/i, /compliance/i, /accountability/i],
      "public": [/public\s?comment/i, /public\s?input/i, /public\s?testimony/i, /citizen/i, /community\s?input/i, /open\s?to\s?public/i, /public\s?participation/i],
      "livestream": [/livestream/i, /live\s?stream/i, /webcast/i, /broadcast/i, /streaming/i, /watch\s?live/i, /remote/i, /virtual/i, /zoom/i, /teams/i]
    };
    __name2(onRequest18, "onRequest");
  }
});
var routes;
var init_functionsRoutes_0_7350416873415733 = __esm({
  "../.wrangler/tmp/pages-ei5W3I/functionsRoutes-0.7350416873415733.mjs"() {
    "use strict";
    init_admin_events();
    init_admin_events_backup();
    init_admin_events_simple();
    init_agenda_summaries();
    init_cache_info();
    init_congress_meetings();
    init_db_maintenance();
    init_invalidate_cache();
    init_local_meetings();
    init_scraper_configs();
    init_state_events();
    init_state_events_backup2();
    init_state_events_simple();
    init_test();
    init_test_db();
    init_test_simple();
    init_top_events();
    init_update_tags();
    routes = [
      {
        routePath: "/api/admin-events",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/admin-events-backup",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      },
      {
        routePath: "/api/admin-events-simple",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest3]
      },
      {
        routePath: "/api/agenda-summaries",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest4]
      },
      {
        routePath: "/api/cache-info",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest5]
      },
      {
        routePath: "/api/congress-meetings",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest6]
      },
      {
        routePath: "/api/db-maintenance",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest7]
      },
      {
        routePath: "/api/invalidate-cache",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest8]
      },
      {
        routePath: "/api/local-meetings",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest9]
      },
      {
        routePath: "/api/scraper-configs",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest10]
      },
      {
        routePath: "/api/state-events",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest11]
      },
      {
        routePath: "/api/state-events-backup2",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest12]
      },
      {
        routePath: "/api/state-events-simple",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest13]
      },
      {
        routePath: "/api/test",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest14]
      },
      {
        routePath: "/api/test-db",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest15]
      },
      {
        routePath: "/api/test-simple",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest16]
      },
      {
        routePath: "/api/top-events",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest17]
      },
      {
        routePath: "/api/update-tags",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest18]
      }
    ];
  }
});
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count32 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count32--;
          if (count32 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count32++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count32)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open3 = tryConsume("OPEN");
    if (open3) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x2) {
    return x2;
  } : _a;
  return function(pathname) {
    var m2 = re.exec(pathname);
    if (!m2)
      return false;
    var path = m2[0], index = m2.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m2[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m2[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m2[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m2.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x2) {
    return x2;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env22, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context22 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env22,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context22);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env22["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error32) {
      if (isFailOpen) {
        const response = await env22["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error32;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var drainBody = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } catch (e) {
    const error32 = reduceError(e);
    return Response.json(error32, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_7350416873415733();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env22, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env22, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env22, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env22, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env22, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env22, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env22, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env22, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env22, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env22, ctx) => {
      this.env = env22;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../AppData/Roaming/npm/node_modules/wrangler/templates/pages-dev-util.ts
function isRoutingRuleMatch(pathname, routingRule) {
  if (!pathname) {
    throw new Error("Pathname is undefined.");
  }
  if (!routingRule) {
    throw new Error("Routing rule is undefined.");
  }
  const ruleRegExp = transformRoutingRuleToRegExp(routingRule);
  return pathname.match(ruleRegExp) !== null;
}
__name(isRoutingRuleMatch, "isRoutingRuleMatch");
function transformRoutingRuleToRegExp(rule) {
  let transformedRule;
  if (rule === "/" || rule === "/*") {
    transformedRule = rule;
  } else if (rule.endsWith("/*")) {
    transformedRule = `${rule.substring(0, rule.length - 2)}(/*)?`;
  } else if (rule.endsWith("/")) {
    transformedRule = `${rule.substring(0, rule.length - 1)}(/)?`;
  } else if (rule.endsWith("*")) {
    transformedRule = rule;
  } else {
    transformedRule = `${rule}(/)?`;
  }
  transformedRule = `^${transformedRule.replaceAll(/\./g, "\\.").replaceAll(/\*/g, ".*")}$`;
  return new RegExp(transformedRule);
}
__name(transformRoutingRuleToRegExp, "transformRoutingRuleToRegExp");

// .wrangler/tmp/pages-ei5W3I/j776fczp1va.js
var define_ROUTES_default = {
  version: 1,
  include: [
    "/api/*"
  ],
  exclude: []
};
var routes2 = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env3, context3) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes2.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env3.ASSETS.fetch(request);
      }
    }
    for (const include of routes2.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = middleware_loader_entry_default;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env3, context3);
      }
    }
    return env3.ASSETS.fetch(request);
  }
};

// ../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error4 = reduceError2(e);
    return Response.json(error4, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-I1knC6/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = pages_dev_pipeline_default;

// ../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env3, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-I1knC6/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
/*! Bundled license information:

@neondatabase/serverless/index.mjs:
  (*! Bundled license information:
  
  ieee754/index.js:
    (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
  
  buffer/index.js:
    (*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     *)
  *)
*/
//# sourceMappingURL=j776fczp1va.js.map
