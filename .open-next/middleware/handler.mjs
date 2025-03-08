
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "3.4.2";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseCookies(cookies) {
  if (!cookies) {
    return [];
  }
  return typeof cookies === "string" ? cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim()) : cookies;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    init_util();
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = {};
        for (const [key, value] of searchParams.entries()) {
          if (key in query) {
            if (Array.isArray(query[key])) {
              query[key].push(value);
            } else {
              query[key] = [query[key], value];
            }
          } else {
            query[key] = value;
          }
        }
        const body = await event.arrayBuffer();
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const cookies = Object.fromEntries(parseCookies(event.headers.get("cookie")).map((cookie) => cookie.split("=")));
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body: shouldHaveBody ? Buffer2.from(body) : void 0,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
        }
        return new Response(result.body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
var envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          const origin = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
          for (const [key, value] of Object.entries(globalThis.openNextConfig.functions ?? {}).filter(([key2]) => key2 !== "default")) {
            if (value.patterns.some((pattern) => {
              return new RegExp(
                // transform glob pattern to regex
                `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`
              ).test(_path);
            })) {
              debug("Using origin", key, value.patterns);
              return origin[key];
            }
          }
          if (_path.startsWith("/_next/image") && origin.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return origin.imageOptimizer;
          }
          if (origin.default) {
            debug("Using default origin", origin.default, _path);
            return origin.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { Readable } from "node:stream";
function toReadableStream(value, isBase64) {
  return Readable.toWeb(Readable.from(Buffer.from(value, isBase64 ? "base64" : "utf8")));
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return Readable.toWeb(Readable.from([Buffer.from("SOMETHING")]));
  }
  return Readable.toWeb(Readable.from([]));
}
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge-runtime-webpack.js
var require_edge_runtime_webpack = __commonJS({
  ".next/server/edge-runtime-webpack.js"() {
    "use strict";
    (() => {
      "use strict";
      var e = {}, r = {};
      function t(o) {
        var n = r[o];
        if (void 0 !== n)
          return n.exports;
        var i = r[o] = { exports: {} }, l = true;
        try {
          e[o].call(i.exports, i, i.exports, t), l = false;
        } finally {
          l && delete r[o];
        }
        return i.exports;
      }
      t.m = e, t.amdO = {}, (() => {
        var e2 = [];
        t.O = (r2, o, n, i) => {
          if (o) {
            i = i || 0;
            for (var l = e2.length; l > 0 && e2[l - 1][2] > i; l--)
              e2[l] = e2[l - 1];
            e2[l] = [o, n, i];
            return;
          }
          for (var a = 1 / 0, l = 0; l < e2.length; l++) {
            for (var [o, n, i] = e2[l], u = true, f = 0; f < o.length; f++)
              (false & i || a >= i) && Object.keys(t.O).every((e3) => t.O[e3](o[f])) ? o.splice(f--, 1) : (u = false, i < a && (a = i));
            if (u) {
              e2.splice(l--, 1);
              var s = n();
              void 0 !== s && (r2 = s);
            }
          }
          return r2;
        };
      })(), t.n = (e2) => {
        var r2 = e2 && e2.__esModule ? () => e2.default : () => e2;
        return t.d(r2, { a: r2 }), r2;
      }, t.d = (e2, r2) => {
        for (var o in r2)
          t.o(r2, o) && !t.o(e2, o) && Object.defineProperty(e2, o, { enumerable: true, get: r2[o] });
      }, t.g = function() {
        if ("object" == typeof globalThis)
          return globalThis;
        try {
          return this || Function("return this")();
        } catch (e2) {
          if ("object" == typeof window)
            return window;
        }
      }(), t.o = (e2, r2) => Object.prototype.hasOwnProperty.call(e2, r2), t.r = (e2) => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e2, "__esModule", { value: true });
      }, (() => {
        var e2 = { 149: 0 };
        t.O.j = (r3) => 0 === e2[r3];
        var r2 = (r3, o2) => {
          var n, i, [l, a, u] = o2, f = 0;
          if (l.some((r4) => 0 !== e2[r4])) {
            for (n in a)
              t.o(a, n) && (t.m[n] = a[n]);
            if (u)
              var s = u(t);
          }
          for (r3 && r3(o2); f < l.length; f++)
            i = l[f], t.o(e2, i) && e2[i] && e2[i][0](), e2[i] = 0;
          return t.O(s);
        }, o = self.webpackChunk_N_E = self.webpackChunk_N_E || [];
        o.forEach(r2.bind(null, 0)), o.push = r2.bind(null, o.push.bind(o));
      })();
    })();
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// .next/server/src/middleware.js
var require_middleware = __commonJS({
  ".next/server/src/middleware.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[550], { 7: (e, t) => {
      "use strict";
      t.q = function(e2, t2) {
        if ("string" != typeof e2)
          throw TypeError("argument str must be a string");
        var r2 = {}, i2 = e2.length;
        if (i2 < 2)
          return r2;
        var s2 = t2 && t2.decode || u, o2 = 0, a2 = 0, h = 0;
        do {
          if (-1 === (a2 = e2.indexOf("=", o2)))
            break;
          if (-1 === (h = e2.indexOf(";", o2)))
            h = i2;
          else if (a2 > h) {
            o2 = e2.lastIndexOf(";", a2 - 1) + 1;
            continue;
          }
          var d = c(e2, o2, a2), p = l(e2, a2, d), f = e2.slice(d, p);
          if (!n.call(r2, f)) {
            var m = c(e2, a2 + 1, h), w = l(e2, h, m);
            34 === e2.charCodeAt(m) && 34 === e2.charCodeAt(w - 1) && (m++, w--);
            var y = e2.slice(m, w);
            r2[f] = function(e3, t3) {
              try {
                return t3(e3);
              } catch (t4) {
                return e3;
              }
            }(y, s2);
          }
          o2 = h + 1;
        } while (o2 < i2);
        return r2;
      }, t.l = function(e2, t2, n2) {
        var c2 = n2 && n2.encode || encodeURIComponent;
        if ("function" != typeof c2)
          throw TypeError("option encode is invalid");
        if (!i.test(e2))
          throw TypeError("argument name is invalid");
        var l2 = c2(t2);
        if (!s.test(l2))
          throw TypeError("argument val is invalid");
        var u2 = e2 + "=" + l2;
        if (!n2)
          return u2;
        if (null != n2.maxAge) {
          var h = Math.floor(n2.maxAge);
          if (!isFinite(h))
            throw TypeError("option maxAge is invalid");
          u2 += "; Max-Age=" + h;
        }
        if (n2.domain) {
          if (!o.test(n2.domain))
            throw TypeError("option domain is invalid");
          u2 += "; Domain=" + n2.domain;
        }
        if (n2.path) {
          if (!a.test(n2.path))
            throw TypeError("option path is invalid");
          u2 += "; Path=" + n2.path;
        }
        if (n2.expires) {
          var d, p = n2.expires;
          if (d = p, "[object Date]" !== r.call(d) || isNaN(p.valueOf()))
            throw TypeError("option expires is invalid");
          u2 += "; Expires=" + p.toUTCString();
        }
        if (n2.httpOnly && (u2 += "; HttpOnly"), n2.secure && (u2 += "; Secure"), n2.partitioned && (u2 += "; Partitioned"), n2.priority)
          switch ("string" == typeof n2.priority ? n2.priority.toLowerCase() : n2.priority) {
            case "low":
              u2 += "; Priority=Low";
              break;
            case "medium":
              u2 += "; Priority=Medium";
              break;
            case "high":
              u2 += "; Priority=High";
              break;
            default:
              throw TypeError("option priority is invalid");
          }
        if (n2.sameSite)
          switch ("string" == typeof n2.sameSite ? n2.sameSite.toLowerCase() : n2.sameSite) {
            case true:
            case "strict":
              u2 += "; SameSite=Strict";
              break;
            case "lax":
              u2 += "; SameSite=Lax";
              break;
            case "none":
              u2 += "; SameSite=None";
              break;
            default:
              throw TypeError("option sameSite is invalid");
          }
        return u2;
      };
      var r = Object.prototype.toString, n = Object.prototype.hasOwnProperty, i = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/, s = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$/, o = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, a = /^[\u0020-\u003A\u003D-\u007E]*$/;
      function c(e2, t2, r2) {
        do {
          var n2 = e2.charCodeAt(t2);
          if (32 !== n2 && 9 !== n2)
            return t2;
        } while (++t2 < r2);
        return r2;
      }
      function l(e2, t2, r2) {
        for (; t2 > r2; ) {
          var n2 = e2.charCodeAt(--t2);
          if (32 !== n2 && 9 !== n2)
            return t2 + 1;
        }
        return r2;
      }
      function u(e2) {
        return -1 !== e2.indexOf("%") ? decodeURIComponent(e2) : e2;
      }
    }, 35: (e, t) => {
      "use strict";
      var r = { H: null, A: null };
      function n(e2) {
        var t2 = "https://react.dev/errors/" + e2;
        if (1 < arguments.length) {
          t2 += "?args[]=" + encodeURIComponent(arguments[1]);
          for (var r2 = 2; r2 < arguments.length; r2++)
            t2 += "&args[]=" + encodeURIComponent(arguments[r2]);
        }
        return "Minified React error #" + e2 + "; visit " + t2 + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      var i = Array.isArray, s = Symbol.for("react.transitional.element"), o = Symbol.for("react.portal"), a = Symbol.for("react.fragment"), c = Symbol.for("react.strict_mode"), l = Symbol.for("react.profiler"), u = Symbol.for("react.forward_ref"), h = Symbol.for("react.suspense"), d = Symbol.for("react.memo"), p = Symbol.for("react.lazy"), f = Symbol.iterator, m = Object.prototype.hasOwnProperty, w = Object.assign;
      function y(e2, t2, r2, n2, i2, o2) {
        return { $$typeof: s, type: e2, key: t2, ref: void 0 !== (r2 = o2.ref) ? r2 : null, props: o2 };
      }
      function g(e2) {
        return "object" == typeof e2 && null !== e2 && e2.$$typeof === s;
      }
      var b = /\/+/g;
      function v(e2, t2) {
        var r2, n2;
        return "object" == typeof e2 && null !== e2 && null != e2.key ? (r2 = "" + e2.key, n2 = { "=": "=0", ":": "=2" }, "$" + r2.replace(/[=:]/g, function(e3) {
          return n2[e3];
        })) : t2.toString(36);
      }
      function x() {
      }
      function E(e2, t2, r2) {
        if (null == e2)
          return e2;
        var a2 = [], c2 = 0;
        return !function e3(t3, r3, a3, c3, l2) {
          var u2, h2, d2, m2 = typeof t3;
          ("undefined" === m2 || "boolean" === m2) && (t3 = null);
          var w2 = false;
          if (null === t3)
            w2 = true;
          else
            switch (m2) {
              case "bigint":
              case "string":
              case "number":
                w2 = true;
                break;
              case "object":
                switch (t3.$$typeof) {
                  case s:
                  case o:
                    w2 = true;
                    break;
                  case p:
                    return e3((w2 = t3._init)(t3._payload), r3, a3, c3, l2);
                }
            }
          if (w2)
            return l2 = l2(t3), w2 = "" === c3 ? "." + v(t3, 0) : c3, i(l2) ? (a3 = "", null != w2 && (a3 = w2.replace(b, "$&/") + "/"), e3(l2, r3, a3, "", function(e4) {
              return e4;
            })) : null != l2 && (g(l2) && (u2 = l2, h2 = a3 + (null == l2.key || t3 && t3.key === l2.key ? "" : ("" + l2.key).replace(b, "$&/") + "/") + w2, l2 = y(u2.type, h2, void 0, void 0, void 0, u2.props)), r3.push(l2)), 1;
          w2 = 0;
          var E2 = "" === c3 ? "." : c3 + ":";
          if (i(t3))
            for (var _2 = 0; _2 < t3.length; _2++)
              m2 = E2 + v(c3 = t3[_2], _2), w2 += e3(c3, r3, a3, m2, l2);
          else if ("function" == typeof (_2 = null === (d2 = t3) || "object" != typeof d2 ? null : "function" == typeof (d2 = f && d2[f] || d2["@@iterator"]) ? d2 : null))
            for (t3 = _2.call(t3), _2 = 0; !(c3 = t3.next()).done; )
              m2 = E2 + v(c3 = c3.value, _2++), w2 += e3(c3, r3, a3, m2, l2);
          else if ("object" === m2) {
            if ("function" == typeof t3.then)
              return e3(function(e4) {
                switch (e4.status) {
                  case "fulfilled":
                    return e4.value;
                  case "rejected":
                    throw e4.reason;
                  default:
                    switch ("string" == typeof e4.status ? e4.then(x, x) : (e4.status = "pending", e4.then(function(t4) {
                      "pending" === e4.status && (e4.status = "fulfilled", e4.value = t4);
                    }, function(t4) {
                      "pending" === e4.status && (e4.status = "rejected", e4.reason = t4);
                    })), e4.status) {
                      case "fulfilled":
                        return e4.value;
                      case "rejected":
                        throw e4.reason;
                    }
                }
                throw e4;
              }(t3), r3, a3, c3, l2);
            throw Error(n(31, "[object Object]" === (r3 = String(t3)) ? "object with keys {" + Object.keys(t3).join(", ") + "}" : r3));
          }
          return w2;
        }(e2, a2, "", "", function(e3) {
          return t2.call(r2, e3, c2++);
        }), a2;
      }
      function _(e2) {
        if (-1 === e2._status) {
          var t2 = e2._result;
          (t2 = t2()).then(function(t3) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 1, e2._result = t3);
          }, function(t3) {
            (0 === e2._status || -1 === e2._status) && (e2._status = 2, e2._result = t3);
          }), -1 === e2._status && (e2._status = 0, e2._result = t2);
        }
        if (1 === e2._status)
          return e2._result.default;
        throw e2._result;
      }
      function S() {
        return /* @__PURE__ */ new WeakMap();
      }
      function R() {
        return { s: 0, v: void 0, o: null, p: null };
      }
      t.Children = { map: E, forEach: function(e2, t2, r2) {
        E(e2, function() {
          t2.apply(this, arguments);
        }, r2);
      }, count: function(e2) {
        var t2 = 0;
        return E(e2, function() {
          t2++;
        }), t2;
      }, toArray: function(e2) {
        return E(e2, function(e3) {
          return e3;
        }) || [];
      }, only: function(e2) {
        if (!g(e2))
          throw Error(n(143));
        return e2;
      } }, t.Fragment = a, t.Profiler = l, t.StrictMode = c, t.Suspense = h, t.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = r, t.cache = function(e2) {
        return function() {
          var t2 = r.A;
          if (!t2)
            return e2.apply(null, arguments);
          var n2 = t2.getCacheForType(S);
          void 0 === (t2 = n2.get(e2)) && (t2 = R(), n2.set(e2, t2)), n2 = 0;
          for (var i2 = arguments.length; n2 < i2; n2++) {
            var s2 = arguments[n2];
            if ("function" == typeof s2 || "object" == typeof s2 && null !== s2) {
              var o2 = t2.o;
              null === o2 && (t2.o = o2 = /* @__PURE__ */ new WeakMap()), void 0 === (t2 = o2.get(s2)) && (t2 = R(), o2.set(s2, t2));
            } else
              null === (o2 = t2.p) && (t2.p = o2 = /* @__PURE__ */ new Map()), void 0 === (t2 = o2.get(s2)) && (t2 = R(), o2.set(s2, t2));
          }
          if (1 === t2.s)
            return t2.v;
          if (2 === t2.s)
            throw t2.v;
          try {
            var a2 = e2.apply(null, arguments);
            return (n2 = t2).s = 1, n2.v = a2;
          } catch (e3) {
            throw (a2 = t2).s = 2, a2.v = e3, e3;
          }
        };
      }, t.captureOwnerStack = function() {
        return null;
      }, t.cloneElement = function(e2, t2, r2) {
        if (null == e2)
          throw Error(n(267, e2));
        var i2 = w({}, e2.props), s2 = e2.key, o2 = void 0;
        if (null != t2)
          for (a2 in void 0 !== t2.ref && (o2 = void 0), void 0 !== t2.key && (s2 = "" + t2.key), t2)
            m.call(t2, a2) && "key" !== a2 && "__self" !== a2 && "__source" !== a2 && ("ref" !== a2 || void 0 !== t2.ref) && (i2[a2] = t2[a2]);
        var a2 = arguments.length - 2;
        if (1 === a2)
          i2.children = r2;
        else if (1 < a2) {
          for (var c2 = Array(a2), l2 = 0; l2 < a2; l2++)
            c2[l2] = arguments[l2 + 2];
          i2.children = c2;
        }
        return y(e2.type, s2, void 0, void 0, o2, i2);
      }, t.createElement = function(e2, t2, r2) {
        var n2, i2 = {}, s2 = null;
        if (null != t2)
          for (n2 in void 0 !== t2.key && (s2 = "" + t2.key), t2)
            m.call(t2, n2) && "key" !== n2 && "__self" !== n2 && "__source" !== n2 && (i2[n2] = t2[n2]);
        var o2 = arguments.length - 2;
        if (1 === o2)
          i2.children = r2;
        else if (1 < o2) {
          for (var a2 = Array(o2), c2 = 0; c2 < o2; c2++)
            a2[c2] = arguments[c2 + 2];
          i2.children = a2;
        }
        if (e2 && e2.defaultProps)
          for (n2 in o2 = e2.defaultProps)
            void 0 === i2[n2] && (i2[n2] = o2[n2]);
        return y(e2, s2, void 0, void 0, null, i2);
      }, t.createRef = function() {
        return { current: null };
      }, t.forwardRef = function(e2) {
        return { $$typeof: u, render: e2 };
      }, t.isValidElement = g, t.lazy = function(e2) {
        return { $$typeof: p, _payload: { _status: -1, _result: e2 }, _init: _ };
      }, t.memo = function(e2, t2) {
        return { $$typeof: d, type: e2, compare: void 0 === t2 ? null : t2 };
      }, t.use = function(e2) {
        return r.H.use(e2);
      }, t.useCallback = function(e2, t2) {
        return r.H.useCallback(e2, t2);
      }, t.useDebugValue = function() {
      }, t.useId = function() {
        return r.H.useId();
      }, t.useMemo = function(e2, t2) {
        return r.H.useMemo(e2, t2);
      }, t.version = "19.1.0-canary-d55cc79b-20250228";
    }, 144: (e, t, r) => {
      "use strict";
      var n = Object.defineProperty, i = Object.getOwnPropertyDescriptor, s = Object.getOwnPropertyNames, o = Object.prototype.hasOwnProperty, a = (e2, t2) => {
        for (var r2 in t2)
          n(e2, r2, { get: t2[r2], enumerable: true });
      }, c = {};
      a(c, { Analytics: () => u, IpDenyList: () => v, MultiRegionRatelimit: () => D, Ratelimit: () => M }), e.exports = ((e2, t2, r2, a2) => {
        if (t2 && "object" == typeof t2 || "function" == typeof t2)
          for (let c2 of s(t2))
            o.call(e2, c2) || c2 === r2 || n(e2, c2, { get: () => t2[c2], enumerable: !(a2 = i(t2, c2)) || a2.enumerable });
        return e2;
      })(n({}, "__esModule", { value: true }), c);
      var l = r(975), u = class {
        analytics;
        table = "events";
        constructor(e2) {
          this.analytics = new l.Analytics({ redis: e2.redis, window: "1h", prefix: e2.prefix ?? "@upstash/ratelimit", retention: "90d" });
        }
        extractGeo(e2) {
          return void 0 !== e2.geo ? e2.geo : void 0 !== e2.cf ? e2.cf : {};
        }
        async record(e2) {
          await this.analytics.ingest(this.table, e2);
        }
        async series(e2, t2) {
          let r2 = Math.min((this.analytics.getBucket(Date.now()) - this.analytics.getBucket(t2)) / 36e5, 256);
          return this.analytics.aggregateBucketsWithPipeline(this.table, e2, r2);
        }
        async getUsage(e2 = 0) {
          let t2 = Math.min((this.analytics.getBucket(Date.now()) - this.analytics.getBucket(e2)) / 36e5, 256);
          return await this.analytics.getAllowedBlocked(this.table, t2);
        }
        async getUsageOverTime(e2, t2) {
          return await this.analytics.aggregateBucketsWithPipeline(this.table, t2, e2);
        }
        async getMostAllowedBlocked(e2, t2, r2) {
          return t2 = t2 ?? 5, this.analytics.getMostAllowedBlocked(this.table, e2, t2, void 0, r2);
        }
      }, h = class {
        cache;
        constructor(e2) {
          this.cache = e2;
        }
        isBlocked(e2) {
          if (!this.cache.has(e2))
            return { blocked: false, reset: 0 };
          let t2 = this.cache.get(e2);
          return t2 < Date.now() ? (this.cache.delete(e2), { blocked: false, reset: 0 }) : { blocked: true, reset: t2 };
        }
        blockUntil(e2, t2) {
          this.cache.set(e2, t2);
        }
        set(e2, t2) {
          this.cache.set(e2, t2);
        }
        get(e2) {
          return this.cache.get(e2) || null;
        }
        incr(e2) {
          let t2 = this.cache.get(e2) ?? 0;
          return t2 += 1, this.cache.set(e2, t2), t2;
        }
        pop(e2) {
          this.cache.delete(e2);
        }
        empty() {
          this.cache.clear();
        }
        size() {
          return this.cache.size;
        }
      };
      function d(e2) {
        let t2 = e2.match(/^(\d+)\s?(ms|s|m|h|d)$/);
        if (!t2)
          throw Error(`Unable to parse window size: ${e2}`);
        let r2 = Number.parseInt(t2[1]);
        switch (t2[2]) {
          case "ms":
            return r2;
          case "s":
            return 1e3 * r2;
          case "m":
            return 6e4 * r2;
          case "h":
            return 36e5 * r2;
          case "d":
            return 864e5 * r2;
          default:
            throw Error(`Unable to parse window size: ${e2}`);
        }
      }
      var p = async (e2, t2, r2, n2) => {
        try {
          return await e2.redis.evalsha(t2.hash, r2, n2);
        } catch (i2) {
          if (`${i2}`.includes("NOSCRIPT")) {
            let i3 = await e2.redis.scriptLoad(t2.script);
            return i3 !== t2.hash && console.warn("Upstash Ratelimit: Expected hash and the hash received from Redis are different. Ratelimit will work as usual but performance will be reduced."), await e2.redis.evalsha(i3, r2, n2);
          }
          throw i2;
        }
      }, f = { singleRegion: { fixedWindow: { limit: { script: `
  local key           = KEYS[1]
  local window        = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == tonumber(incrementBy) then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end

  return r
`, hash: "b13943e359636db027ad280f1def143f02158c13" }, getRemaining: { script: `
      local key = KEYS[1]
      local tokens = 0

      local value = redis.call('GET', key)
      if value then
          tokens = value
      end
      return tokens
    `, hash: "8c4c341934502aee132643ffbe58ead3450e5208" } }, slidingWindow: { limit: { script: `
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local tokens      = tonumber(ARGV[1]) -- tokens per window
  local now         = ARGV[2]           -- current timestamp in milliseconds
  local window      = ARGV[3]           -- interval in milliseconds
  local incrementBy = ARGV[4]           -- increment rate per request at a given value, default is 1

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end
  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
  if requestsInPreviousWindow + requestsInCurrentWindow >= tokens then
    return -1
  end

  local newValue = redis.call("INCRBY", currentKey, incrementBy)
  if newValue == tonumber(incrementBy) then
    -- The first time this key is set, the value will be equal to incrementBy.
    -- So we only need the expire command once
    redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
  end
  return tokens - ( newValue + requestsInPreviousWindow )
`, hash: "e1391e429b699c780eb0480350cd5b7280fd9213" }, getRemaining: { script: `
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local now         = ARGV[1]           -- current timestamp in milliseconds
  local window      = ARGV[2]           -- interval in milliseconds

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end

  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)

  return requestsInPreviousWindow + requestsInCurrentWindow
`, hash: "65a73ac5a05bf9712903bc304b77268980c1c417" } }, tokenBucket: { limit: { script: `
  local key         = KEYS[1]           -- identifier including prefixes
  local maxTokens   = tonumber(ARGV[1]) -- maximum number of tokens
  local interval    = tonumber(ARGV[2]) -- size of the window in milliseconds
  local refillRate  = tonumber(ARGV[3]) -- how many tokens are refilled after each interval
  local now         = tonumber(ARGV[4]) -- current timestamp in milliseconds
  local incrementBy = tonumber(ARGV[5]) -- how many tokens to consume, default is 1
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")
        
  local refilledAt
  local tokens

  if bucket[1] == false then
    refilledAt = now
    tokens = maxTokens
  else
    refilledAt = tonumber(bucket[1])
    tokens = tonumber(bucket[2])
  end
        
  if now >= refilledAt + interval then
    local numRefills = math.floor((now - refilledAt) / interval)
    tokens = math.min(maxTokens, tokens + numRefills * refillRate)

    refilledAt = refilledAt + numRefills * interval
  end

  if tokens == 0 then
    return {-1, refilledAt + interval}
  end

  local remaining = tokens - incrementBy
  local expireAt = math.ceil(((maxTokens - remaining) / refillRate)) * interval
        
  redis.call("HSET", key, "refilledAt", refilledAt, "tokens", remaining)
  redis.call("PEXPIRE", key, expireAt)
  return {remaining, refilledAt + interval}
`, hash: "5bece90aeef8189a8cfd28995b479529e270b3c6" }, getRemaining: { script: `
  local key         = KEYS[1]
  local maxTokens   = tonumber(ARGV[1])
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")

  if bucket[1] == false then
    return {maxTokens, -1}
  end
        
  return {tonumber(bucket[2]), tonumber(bucket[1])}
`, hash: "a15be2bb1db2a15f7c82db06146f9d08983900d0" } }, cachedFixedWindow: { limit: { script: `
  local key     = KEYS[1]
  local window  = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == incrementBy then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end
      
  return r
`, hash: "c26b12703dd137939b9a69a3a9b18e906a2d940f" }, getRemaining: { script: `
  local key = KEYS[1]
  local tokens = 0

  local value = redis.call('GET', key)
  if value then
      tokens = value
  end
  return tokens
`, hash: "8e8f222ccae68b595ee6e3f3bf2199629a62b91a" } } }, multiRegion: { fixedWindow: { limit: { script: `
	local key           = KEYS[1]
	local id            = ARGV[1]
	local window        = ARGV[2]
	local incrementBy   = tonumber(ARGV[3])

	redis.call("HSET", key, id, incrementBy)
	local fields = redis.call("HGETALL", key)
	if #fields == 2 and tonumber(fields[2])==incrementBy then
	-- The first time this key is set, and the value will be equal to incrementBy.
	-- So we only need the expire command once
	  redis.call("PEXPIRE", key, window)
	end

	return fields
`, hash: "a8c14f3835aa87bd70e5e2116081b81664abcf5c" }, getRemaining: { script: `
      local key = KEYS[1]
      local tokens = 0

      local fields = redis.call("HGETALL", key)

      return fields
    `, hash: "8ab8322d0ed5fe5ac8eb08f0c2e4557f1b4816fd" } }, slidingWindow: { limit: { script: `
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local tokens        = tonumber(ARGV[1]) -- tokens per window
	local now           = ARGV[2]           -- current timestamp in milliseconds
	local window        = ARGV[3]           -- interval in milliseconds
	local requestId     = ARGV[4]           -- uuid for this request
	local incrementBy   = tonumber(ARGV[5]) -- custom rate, default is  1

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
	if requestsInPreviousWindow * (1 - percentageInCurrent ) + requestsInCurrentWindow >= tokens then
	  return {currentFields, previousFields, false}
	end

	redis.call("HSET", currentKey, requestId, incrementBy)

	if requestsInCurrentWindow == 0 then 
	  -- The first time this key is set, the value will be equal to incrementBy.
	  -- So we only need the expire command once
	  redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
	end
	return {currentFields, previousFields, true}
`, hash: "cb4fdc2575056df7c6d422764df0de3a08d6753b" }, getRemaining: { script: `
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local now         	= ARGV[1]           -- current timestamp in milliseconds
  	local window      	= ARGV[2]           -- interval in milliseconds

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
  	requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
	
	return requestsInCurrentWindow + requestsInPreviousWindow
`, hash: "558c9306b7ec54abb50747fe0b17e5d44bd24868" } } } }, m = { script: `
      local pattern = KEYS[1]

      -- Initialize cursor to start from 0
      local cursor = "0"

      repeat
          -- Scan for keys matching the pattern
          local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern)

          -- Extract cursor for the next iteration
          cursor = scan_result[1]

          -- Extract keys from the scan result
          local keys = scan_result[2]

          for i=1, #keys do
          redis.call('DEL', keys[i])
          end

      -- Continue scanning until cursor is 0 (end of keyspace)
      until cursor == "0"
    `, hash: "54bd274ddc59fb3be0f42deee2f64322a10e2b50" }, w = "denyList", y = "ipDenyList", g = "ipDenyListStatus", b = `
  -- Checks if values provideed in ARGV are present in the deny lists.
  -- This is done using the allDenyListsKey below.

  -- Additionally, checks the status of the ip deny list using the
  -- ipDenyListStatusKey below. Here are the possible states of the
  -- ipDenyListStatusKey key:
  -- * status == -1: set to "disabled" with no TTL
  -- * status == -2: not set, meaning that is was set before but expired
  -- * status  >  0: set to "valid", with a TTL
  --
  -- In the case of status == -2, we set the status to "pending" with
  -- 30 second ttl. During this time, the process which got status == -2
  -- will update the ip deny list.

  local allDenyListsKey     = KEYS[1]
  local ipDenyListStatusKey = KEYS[2]

  local results = redis.call('SMISMEMBER', allDenyListsKey, unpack(ARGV))
  local status  = redis.call('TTL', ipDenyListStatusKey)
  if status == -2 then
    redis.call('SETEX', ipDenyListStatusKey, 30, "pending")
  end

  return { results, status }
`, v = {};
      a(v, { ThresholdError: () => E, disableIpDenyList: () => R, updateIpDenyList: () => S });
      var x = (e2) => 864e5 - ((e2 || Date.now()) - 72e5) % 864e5, E = class extends Error {
        constructor(e2) {
          super(`Allowed threshold values are from 1 to 8, 1 and 8 included. Received: ${e2}`), this.name = "ThresholdError";
        }
      }, _ = async (e2) => {
        if ("number" != typeof e2 || e2 < 1 || e2 > 8)
          throw new E(e2);
        try {
          let t2 = await fetch(`https://raw.githubusercontent.com/stamparm/ipsum/master/levels/${e2}.txt`);
          if (!t2.ok)
            throw Error(`Error fetching data: ${t2.statusText}`);
          return (await t2.text()).split("\n").filter((e3) => e3.length > 0);
        } catch (e3) {
          throw Error(`Failed to fetch ip deny list: ${e3}`);
        }
      }, S = async (e2, t2, r2, n2) => {
        let i2 = await _(r2), s2 = [t2, w, "all"].join(":"), o2 = [t2, w, y].join(":"), a2 = [t2, g].join(":"), c2 = e2.multi();
        return c2.sdiffstore(s2, s2, o2), c2.del(o2), c2.sadd(o2, i2.at(0), ...i2.slice(1)), c2.sdiffstore(o2, o2, s2), c2.sunionstore(s2, s2, o2), c2.set(a2, "valid", { px: n2 ?? x() }), await c2.exec();
      }, R = async (e2, t2) => {
        let r2 = [t2, w, "all"].join(":"), n2 = [t2, w, y].join(":"), i2 = [t2, g].join(":"), s2 = e2.multi();
        return s2.sdiffstore(r2, r2, n2), s2.del(n2), s2.set(i2, "disabled"), await s2.exec();
      }, k = new h(/* @__PURE__ */ new Map()), O = (e2) => e2.find((e3) => k.isBlocked(e3).blocked), A = (e2) => {
        k.size() > 1e3 && k.empty(), k.blockUntil(e2, Date.now() + 6e4);
      }, T = async (e2, t2, r2) => {
        let n2;
        let [i2, s2] = await e2.eval(b, [[t2, w, "all"].join(":"), [t2, g].join(":")], r2);
        return i2.map((e3, t3) => {
          e3 && (A(r2[t3]), n2 = r2[t3]);
        }), { deniedValue: n2, invalidIpDenyList: -2 === s2 };
      }, C = (e2, t2, [r2, n2], i2) => {
        if (n2.deniedValue && (r2.success = false, r2.remaining = 0, r2.reason = "denyList", r2.deniedValue = n2.deniedValue), n2.invalidIpDenyList) {
          let n3 = S(e2, t2, i2);
          r2.pending = Promise.all([r2.pending, n3]);
        }
        return r2;
      }, P = (e2) => ({ success: false, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve(), reason: "denyList", deniedValue: e2 }), I = class {
        limiter;
        ctx;
        prefix;
        timeout;
        primaryRedis;
        analytics;
        enableProtection;
        denyListThreshold;
        constructor(e2) {
          this.ctx = e2.ctx, this.limiter = e2.limiter, this.timeout = e2.timeout ?? 5e3, this.prefix = e2.prefix ?? "@upstash/ratelimit", this.enableProtection = e2.enableProtection ?? false, this.denyListThreshold = e2.denyListThreshold ?? 6, this.primaryRedis = "redis" in this.ctx ? this.ctx.redis : this.ctx.regionContexts[0].redis, this.analytics = e2.analytics ? new u({ redis: this.primaryRedis, prefix: this.prefix }) : void 0, e2.ephemeralCache instanceof Map ? this.ctx.cache = new h(e2.ephemeralCache) : void 0 === e2.ephemeralCache && (this.ctx.cache = new h(/* @__PURE__ */ new Map()));
        }
        limit = async (e2, t2) => {
          let r2 = null;
          try {
            let n2 = this.getRatelimitResponse(e2, t2), { responseArray: i2, newTimeoutId: s2 } = this.applyTimeout(n2);
            r2 = s2;
            let o2 = await Promise.race(i2);
            return this.submitAnalytics(o2, e2, t2);
          } finally {
            r2 && clearTimeout(r2);
          }
        };
        blockUntilReady = async (e2, t2) => {
          let r2;
          if (t2 <= 0)
            throw Error("timeout must be positive");
          let n2 = Date.now() + t2;
          for (; !(r2 = await this.limit(e2)).success; ) {
            if (0 === r2.reset)
              throw Error("This should not happen");
            let e3 = Math.min(r2.reset, n2) - Date.now();
            if (await new Promise((t3) => setTimeout(t3, e3)), Date.now() > n2)
              break;
          }
          return r2;
        };
        resetUsedTokens = async (e2) => {
          let t2 = [this.prefix, e2].join(":");
          await this.limiter().resetTokens(this.ctx, t2);
        };
        getRemaining = async (e2) => {
          let t2 = [this.prefix, e2].join(":");
          return await this.limiter().getRemaining(this.ctx, t2);
        };
        getRatelimitResponse = async (e2, t2) => {
          let r2 = this.getKey(e2), n2 = this.getDefinedMembers(e2, t2), i2 = O(n2), s2 = i2 ? [P(i2), { deniedValue: i2, invalidIpDenyList: false }] : await Promise.all([this.limiter().limit(this.ctx, r2, t2?.rate), this.enableProtection ? T(this.primaryRedis, this.prefix, n2) : { deniedValue: void 0, invalidIpDenyList: false }]);
          return C(this.primaryRedis, this.prefix, s2, this.denyListThreshold);
        };
        applyTimeout = (e2) => {
          let t2 = null, r2 = [e2];
          if (this.timeout > 0) {
            let e3 = new Promise((e4) => {
              t2 = setTimeout(() => {
                e4({ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve(), reason: "timeout" });
              }, this.timeout);
            });
            r2.push(e3);
          }
          return { responseArray: r2, newTimeoutId: t2 };
        };
        submitAnalytics = (e2, t2, r2) => {
          if (this.analytics)
            try {
              let n2 = r2 ? this.analytics.extractGeo(r2) : void 0, i2 = this.analytics.record({ identifier: "denyList" === e2.reason ? e2.deniedValue : t2, time: Date.now(), success: "denyList" === e2.reason ? "denied" : e2.success, ...n2 }).catch((e3) => {
                let t3 = "Failed to record analytics";
                `${e3}`.includes("WRONGTYPE") && (t3 = `
    Failed to record analytics. See the information below:

    This can occur when you uprade to Ratelimit version 1.1.2
    or later from an earlier version.

    This occurs simply because the way we store analytics data
    has changed. To avoid getting this error, disable analytics
    for *an hour*, then simply enable it back.

    `), console.warn(t3, e3);
              });
              e2.pending = Promise.all([e2.pending, i2]);
            } catch (e3) {
              console.warn("Failed to record analytics", e3);
            }
          return e2;
        };
        getKey = (e2) => [this.prefix, e2].join(":");
        getDefinedMembers = (e2, t2) => [e2, t2?.ip, t2?.userAgent, t2?.country].filter(Boolean);
      };
      function N() {
        let e2 = "", t2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", r2 = t2.length;
        for (let n2 = 0; n2 < 16; n2++)
          e2 += t2.charAt(Math.floor(Math.random() * r2));
        return e2;
      }
      var D = class extends I {
        constructor(e2) {
          super({ prefix: e2.prefix, limiter: e2.limiter, timeout: e2.timeout, analytics: e2.analytics, ctx: { regionContexts: e2.redis.map((e3) => ({ redis: e3 })), cache: e2.ephemeralCache ? new h(e2.ephemeralCache) : void 0 } });
        }
        static fixedWindow(e2, t2) {
          let r2 = d(t2);
          return () => ({ async limit(t3, n2, i2) {
            if (t3.cache) {
              let { blocked: r3, reset: i3 } = t3.cache.isBlocked(n2);
              if (r3)
                return { success: false, limit: e2, remaining: 0, reset: i3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let s2 = N(), o2 = Math.floor(Date.now() / r2), a2 = [n2, o2].join(":"), c2 = i2 ? Math.max(1, i2) : 1, l2 = t3.regionContexts.map((e3) => ({ redis: e3.redis, request: p(e3, f.multiRegion.fixedWindow.limit, [a2], [s2, r2, c2]) })), u2 = e2 - (await Promise.any(l2.map((e3) => e3.request))).reduce((e3, t4, r3) => {
              let n3 = 0;
              return r3 % 2 && (n3 = Number.parseInt(t4)), e3 + n3;
            }, 0);
            async function h2() {
              let t4 = [...new Set((await Promise.all(l2.map((e3) => e3.request))).flat().reduce((e3, t5, r3) => (r3 % 2 == 0 && e3.push(t5), e3), [])).values()];
              for (let r3 of l2) {
                let n3 = (await r3.request).reduce((e3, t5, r4) => {
                  let n4 = 0;
                  return r4 % 2 && (n4 = Number.parseInt(t5)), e3 + n4;
                }, 0), i3 = (await r3.request).reduce((e3, t5, r4) => (r4 % 2 == 0 && e3.push(t5), e3), []);
                if (n3 >= e2)
                  continue;
                let s3 = t4.filter((e3) => !i3.includes(e3));
                if (0 !== s3.length)
                  for (let e3 of s3)
                    await r3.redis.hset(a2, { [e3]: c2 });
              }
            }
            let d2 = u2 > 0, m2 = (o2 + 1) * r2;
            return t3.cache && !d2 && t3.cache.blockUntil(n2, m2), { success: d2, limit: e2, remaining: u2, reset: m2, pending: h2() };
          }, async getRemaining(t3, n2) {
            let i2 = Math.floor(Date.now() / r2), s2 = [n2, i2].join(":"), o2 = t3.regionContexts.map((e3) => ({ redis: e3.redis, request: p(e3, f.multiRegion.fixedWindow.getRemaining, [s2], [null]) }));
            return { remaining: Math.max(0, e2 - (await Promise.any(o2.map((e3) => e3.request))).reduce((e3, t4, r3) => {
              let n3 = 0;
              return r3 % 2 && (n3 = Number.parseInt(t4)), e3 + n3;
            }, 0)), reset: (i2 + 1) * r2 };
          }, async resetTokens(e3, t3) {
            let r3 = [t3, "*"].join(":");
            e3.cache && e3.cache.pop(t3), await Promise.all(e3.regionContexts.map((e4) => {
              p(e4, m, [r3], [null]);
            }));
          } });
        }
        static slidingWindow(e2, t2) {
          let r2 = d(t2), n2 = d(t2);
          return () => ({ async limit(t3, i2, s2) {
            if (t3.cache) {
              let { blocked: r3, reset: n3 } = t3.cache.isBlocked(i2);
              if (r3)
                return { success: false, limit: e2, remaining: 0, reset: n3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let o2 = N(), a2 = Date.now(), c2 = Math.floor(a2 / r2), l2 = [i2, c2].join(":"), u2 = [i2, c2 - 1].join(":"), h2 = s2 ? Math.max(1, s2) : 1, d2 = t3.regionContexts.map((t4) => ({ redis: t4.redis, request: p(t4, f.multiRegion.slidingWindow.limit, [l2, u2], [e2, a2, n2, o2, h2]) })), m2 = a2 % n2 / n2, [w2, y2, g2] = await Promise.any(d2.map((e3) => e3.request));
            g2 && w2.push(o2, h2.toString());
            let b2 = y2.reduce((e3, t4, r3) => {
              let n3 = 0;
              return r3 % 2 && (n3 = Number.parseInt(t4)), e3 + n3;
            }, 0), v2 = w2.reduce((e3, t4, r3) => {
              let n3 = 0;
              return r3 % 2 && (n3 = Number.parseInt(t4)), e3 + n3;
            }, 0), x2 = e2 - (Math.ceil(b2 * (1 - m2)) + v2);
            async function E2() {
              let t4 = [...new Set((await Promise.all(d2.map((e3) => e3.request))).flatMap(([e3]) => e3).reduce((e3, t5, r3) => (r3 % 2 == 0 && e3.push(t5), e3), [])).values()];
              for (let r3 of d2) {
                let [n3, i3, s3] = await r3.request, o3 = n3.reduce((e3, t5, r4) => (r4 % 2 == 0 && e3.push(t5), e3), []);
                if (n3.reduce((e3, t5, r4) => {
                  let n4 = 0;
                  return r4 % 2 && (n4 = Number.parseInt(t5)), e3 + n4;
                }, 0) >= e2)
                  continue;
                let a3 = t4.filter((e3) => !o3.includes(e3));
                if (0 !== a3.length)
                  for (let e3 of a3)
                    await r3.redis.hset(l2, { [e3]: h2 });
              }
            }
            let _2 = (c2 + 1) * n2;
            return t3.cache && !g2 && t3.cache.blockUntil(i2, _2), { success: !!g2, limit: e2, remaining: Math.max(0, x2), reset: _2, pending: E2() };
          }, async getRemaining(t3, n3) {
            let i2 = Date.now(), s2 = Math.floor(i2 / r2), o2 = [n3, s2].join(":"), a2 = [n3, s2 - 1].join(":"), c2 = t3.regionContexts.map((e3) => ({ redis: e3.redis, request: p(e3, f.multiRegion.slidingWindow.getRemaining, [o2, a2], [i2, r2]) }));
            return { remaining: Math.max(0, e2 - await Promise.any(c2.map((e3) => e3.request))), reset: (s2 + 1) * r2 };
          }, async resetTokens(e3, t3) {
            let r3 = [t3, "*"].join(":");
            e3.cache && e3.cache.pop(t3), await Promise.all(e3.regionContexts.map((e4) => {
              p(e4, m, [r3], [null]);
            }));
          } });
        }
      }, M = class extends I {
        constructor(e2) {
          super({ prefix: e2.prefix, limiter: e2.limiter, timeout: e2.timeout, analytics: e2.analytics, ctx: { redis: e2.redis }, ephemeralCache: e2.ephemeralCache, enableProtection: e2.enableProtection, denyListThreshold: e2.denyListThreshold });
        }
        static fixedWindow(e2, t2) {
          let r2 = d(t2);
          return () => ({ async limit(t3, n2, i2) {
            let s2 = Math.floor(Date.now() / r2), o2 = [n2, s2].join(":");
            if (t3.cache) {
              let { blocked: r3, reset: i3 } = t3.cache.isBlocked(n2);
              if (r3)
                return { success: false, limit: e2, remaining: 0, reset: i3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let a2 = i2 ? Math.max(1, i2) : 1, c2 = await p(t3, f.singleRegion.fixedWindow.limit, [o2], [r2, a2]), l2 = c2 <= e2, u2 = Math.max(0, e2 - c2), h2 = (s2 + 1) * r2;
            return t3.cache && !l2 && t3.cache.blockUntil(n2, h2), { success: l2, limit: e2, remaining: u2, reset: h2, pending: Promise.resolve() };
          }, async getRemaining(t3, n2) {
            let i2 = Math.floor(Date.now() / r2), s2 = [n2, i2].join(":");
            return { remaining: Math.max(0, e2 - await p(t3, f.singleRegion.fixedWindow.getRemaining, [s2], [null])), reset: (i2 + 1) * r2 };
          }, async resetTokens(e3, t3) {
            let r3 = [t3, "*"].join(":");
            e3.cache && e3.cache.pop(t3), await p(e3, m, [r3], [null]);
          } });
        }
        static slidingWindow(e2, t2) {
          let r2 = d(t2);
          return () => ({ async limit(t3, n2, i2) {
            let s2 = Date.now(), o2 = Math.floor(s2 / r2), a2 = [n2, o2].join(":"), c2 = [n2, o2 - 1].join(":");
            if (t3.cache) {
              let { blocked: r3, reset: i3 } = t3.cache.isBlocked(n2);
              if (r3)
                return { success: false, limit: e2, remaining: 0, reset: i3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let l2 = i2 ? Math.max(1, i2) : 1, u2 = await p(t3, f.singleRegion.slidingWindow.limit, [a2, c2], [e2, s2, r2, l2]), h2 = u2 >= 0, d2 = (o2 + 1) * r2;
            return t3.cache && !h2 && t3.cache.blockUntil(n2, d2), { success: h2, limit: e2, remaining: Math.max(0, u2), reset: d2, pending: Promise.resolve() };
          }, async getRemaining(t3, n2) {
            let i2 = Date.now(), s2 = Math.floor(i2 / r2), o2 = [n2, s2].join(":"), a2 = [n2, s2 - 1].join(":");
            return { remaining: Math.max(0, e2 - await p(t3, f.singleRegion.slidingWindow.getRemaining, [o2, a2], [i2, r2])), reset: (s2 + 1) * r2 };
          }, async resetTokens(e3, t3) {
            let r3 = [t3, "*"].join(":");
            e3.cache && e3.cache.pop(t3), await p(e3, m, [r3], [null]);
          } });
        }
        static tokenBucket(e2, t2, r2) {
          let n2 = d(t2);
          return () => ({ async limit(t3, i2, s2) {
            if (t3.cache) {
              let { blocked: e3, reset: n3 } = t3.cache.isBlocked(i2);
              if (e3)
                return { success: false, limit: r2, remaining: 0, reset: n3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let o2 = Date.now(), a2 = s2 ? Math.max(1, s2) : 1, [c2, l2] = await p(t3, f.singleRegion.tokenBucket.limit, [i2], [r2, n2, e2, o2, a2]), u2 = c2 >= 0;
            return t3.cache && !u2 && t3.cache.blockUntil(i2, l2), { success: u2, limit: r2, remaining: c2, reset: l2, pending: Promise.resolve() };
          }, async getRemaining(e3, t3) {
            let [i2, s2] = await p(e3, f.singleRegion.tokenBucket.getRemaining, [t3], [r2]), o2 = Date.now() + n2, a2 = s2 + n2;
            return { remaining: i2, reset: -1 === s2 ? o2 : a2 };
          }, async resetTokens(e3, t3) {
            e3.cache && e3.cache.pop(t3), await p(e3, m, [t3], [null]);
          } });
        }
        static cachedFixedWindow(e2, t2) {
          let r2 = d(t2);
          return () => ({ async limit(t3, n2, i2) {
            if (!t3.cache)
              throw Error("This algorithm requires a cache");
            let s2 = Math.floor(Date.now() / r2), o2 = [n2, s2].join(":"), a2 = (s2 + 1) * r2, c2 = i2 ? Math.max(1, i2) : 1;
            if ("number" == typeof t3.cache.get(o2)) {
              let n3 = t3.cache.incr(o2), i3 = n3 < e2, s3 = i3 ? p(t3, f.singleRegion.cachedFixedWindow.limit, [o2], [r2, c2]) : Promise.resolve();
              return { success: i3, limit: e2, remaining: e2 - n3, reset: a2, pending: s3 };
            }
            let l2 = await p(t3, f.singleRegion.cachedFixedWindow.limit, [o2], [r2, c2]);
            t3.cache.set(o2, l2);
            let u2 = e2 - l2;
            return { success: u2 >= 0, limit: e2, remaining: u2, reset: a2, pending: Promise.resolve() };
          }, async getRemaining(t3, n2) {
            if (!t3.cache)
              throw Error("This algorithm requires a cache");
            let i2 = Math.floor(Date.now() / r2), s2 = [n2, i2].join(":");
            return "number" == typeof t3.cache.get(s2) ? { remaining: Math.max(0, e2 - (t3.cache.get(s2) ?? 0)), reset: (i2 + 1) * r2 } : { remaining: Math.max(0, e2 - await p(t3, f.singleRegion.cachedFixedWindow.getRemaining, [s2], [null])), reset: (i2 + 1) * r2 };
          }, async resetTokens(e3, t3) {
            if (!e3.cache)
              throw Error("This algorithm requires a cache");
            let n2 = [t3, Math.floor(Date.now() / r2)].join(":");
            e3.cache.pop(n2);
            let i2 = [t3, "*"].join(":");
            await p(e3, m, [i2], [null]);
          } });
        }
      };
    }, 201: (e, t, r) => {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: true }), !function(e2, t2) {
        for (var r2 in t2)
          Object.defineProperty(e2, r2, { enumerable: true, get: t2[r2] });
      }(t, { getTestReqInfo: function() {
        return o;
      }, withRequest: function() {
        return s;
      } });
      let n = new (r(521)).AsyncLocalStorage();
      function i(e2, t2) {
        let r2 = t2.header(e2, "next-test-proxy-port");
        if (!r2)
          return;
        let n2 = t2.url(e2);
        return { url: n2, proxyPort: Number(r2), testData: t2.header(e2, "next-test-data") || "" };
      }
      function s(e2, t2, r2) {
        let s2 = i(e2, t2);
        return s2 ? n.run(s2, r2) : r2();
      }
      function o(e2, t2) {
        let r2 = n.getStore();
        return r2 || (e2 && t2 ? i(e2, t2) : void 0);
      }
    }, 238: function(e, t, r) {
      e.exports = r(825).enc.Hex;
    }, 280: (e, t, r) => {
      var n;
      (() => {
        var i = { 226: function(i2, s2) {
          !function(o2, a) {
            "use strict";
            var c = "function", l = "undefined", u = "object", h = "string", d = "major", p = "model", f = "name", m = "type", w = "vendor", y = "version", g = "architecture", b = "console", v = "mobile", x = "tablet", E = "smarttv", _ = "wearable", S = "embedded", R = "Amazon", k = "Apple", O = "ASUS", A = "BlackBerry", T = "Browser", C = "Chrome", P = "Firefox", I = "Google", N = "Huawei", D = "Microsoft", M = "Motorola", j = "Opera", L = "Samsung", U = "Sharp", W = "Sony", B = "Xiaomi", $ = "Zebra", q = "Facebook", H = "Chromium OS", K = "Mac OS", z = function(e2, t2) {
              var r2 = {};
              for (var n2 in e2)
                t2[n2] && t2[n2].length % 2 == 0 ? r2[n2] = t2[n2].concat(e2[n2]) : r2[n2] = e2[n2];
              return r2;
            }, J = function(e2) {
              for (var t2 = {}, r2 = 0; r2 < e2.length; r2++)
                t2[e2[r2].toUpperCase()] = e2[r2];
              return t2;
            }, G = function(e2, t2) {
              return typeof e2 === h && -1 !== V(t2).indexOf(V(e2));
            }, V = function(e2) {
              return e2.toLowerCase();
            }, F = function(e2, t2) {
              if (typeof e2 === h)
                return e2 = e2.replace(/^\s\s*/, ""), typeof t2 === l ? e2 : e2.substring(0, 350);
            }, X = function(e2, t2) {
              for (var r2, n2, i3, s3, o3, l2, h2 = 0; h2 < t2.length && !o3; ) {
                var d2 = t2[h2], p2 = t2[h2 + 1];
                for (r2 = n2 = 0; r2 < d2.length && !o3 && d2[r2]; )
                  if (o3 = d2[r2++].exec(e2))
                    for (i3 = 0; i3 < p2.length; i3++)
                      l2 = o3[++n2], typeof (s3 = p2[i3]) === u && s3.length > 0 ? 2 === s3.length ? typeof s3[1] == c ? this[s3[0]] = s3[1].call(this, l2) : this[s3[0]] = s3[1] : 3 === s3.length ? typeof s3[1] !== c || s3[1].exec && s3[1].test ? this[s3[0]] = l2 ? l2.replace(s3[1], s3[2]) : void 0 : this[s3[0]] = l2 ? s3[1].call(this, l2, s3[2]) : void 0 : 4 === s3.length && (this[s3[0]] = l2 ? s3[3].call(this, l2.replace(s3[1], s3[2])) : a) : this[s3] = l2 || a;
                h2 += 2;
              }
            }, Y = function(e2, t2) {
              for (var r2 in t2)
                if (typeof t2[r2] === u && t2[r2].length > 0) {
                  for (var n2 = 0; n2 < t2[r2].length; n2++)
                    if (G(t2[r2][n2], e2))
                      return "?" === r2 ? a : r2;
                } else if (G(t2[r2], e2))
                  return "?" === r2 ? a : r2;
              return e2;
            }, Z = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, Q = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [y, [f, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [y, [f, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [f, y], [/opios[\/ ]+([\w\.]+)/i], [y, [f, j + " Mini"]], [/\bopr\/([\w\.]+)/i], [y, [f, j]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [f, y], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [y, [f, "UC" + T]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [y, [f, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [y, [f, "WeChat"]], [/konqueror\/([\w\.]+)/i], [y, [f, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [y, [f, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [y, [f, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[f, /(.+)/, "$1 Secure " + T], y], [/\bfocus\/([\w\.]+)/i], [y, [f, P + " Focus"]], [/\bopt\/([\w\.]+)/i], [y, [f, j + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [y, [f, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [y, [f, "Dolphin"]], [/coast\/([\w\.]+)/i], [y, [f, j + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [y, [f, "MIUI " + T]], [/fxios\/([-\w\.]+)/i], [y, [f, P]], [/\bqihu|(qi?ho?o?|360)browser/i], [[f, "360 " + T]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[f, /(.+)/, "$1 " + T], y], [/(comodo_dragon)\/([\w\.]+)/i], [[f, /_/g, " "], y], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [f, y], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [f], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[f, q], y], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [f, y], [/\bgsa\/([\w\.]+) .*safari\//i], [y, [f, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [y, [f, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [y, [f, C + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[f, C + " WebView"], y], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [y, [f, "Android " + T]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [f, y], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [y, [f, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [y, f], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [f, [y, Y, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [f, y], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[f, "Netscape"], y], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [y, [f, P + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [f, y], [/(cobalt)\/([\w\.]+)/i], [f, [y, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[g, "amd64"]], [/(ia32(?=;))/i], [[g, V]], [/((?:i[346]|x)86)[;\)]/i], [[g, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[g, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[g, "armhf"]], [/windows (ce|mobile); ppc;/i], [[g, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[g, /ower/, "", V]], [/(sun4\w)[;\)]/i], [[g, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[g, V]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [p, [w, L], [m, x]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [p, [w, L], [m, v]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [p, [w, k], [m, v]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [p, [w, k], [m, x]], [/(macintosh);/i], [p, [w, k]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [p, [w, U], [m, v]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [p, [w, N], [m, x]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [p, [w, N], [m, v]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[p, /_/g, " "], [w, B], [m, v]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[p, /_/g, " "], [w, B], [m, x]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [p, [w, "OPPO"], [m, v]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [p, [w, "Vivo"], [m, v]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [p, [w, "Realme"], [m, v]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [p, [w, M], [m, v]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [p, [w, M], [m, x]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [p, [w, "LG"], [m, x]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [p, [w, "LG"], [m, v]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [p, [w, "Lenovo"], [m, x]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[p, /_/g, " "], [w, "Nokia"], [m, v]], [/(pixel c)\b/i], [p, [w, I], [m, x]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [p, [w, I], [m, v]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [p, [w, W], [m, v]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[p, "Xperia Tablet"], [w, W], [m, x]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [p, [w, "OnePlus"], [m, v]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [p, [w, R], [m, x]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[p, /(.+)/g, "Fire Phone $1"], [w, R], [m, v]], [/(playbook);[-\w\),; ]+(rim)/i], [p, w, [m, x]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [p, [w, A], [m, v]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [p, [w, O], [m, x]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [p, [w, O], [m, v]], [/(nexus 9)/i], [p, [w, "HTC"], [m, x]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [w, [p, /_/g, " "], [m, v]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [p, [w, "Acer"], [m, x]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [p, [w, "Meizu"], [m, v]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [w, p, [m, v]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [w, p, [m, x]], [/(surface duo)/i], [p, [w, D], [m, x]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [p, [w, "Fairphone"], [m, v]], [/(u304aa)/i], [p, [w, "AT&T"], [m, v]], [/\bsie-(\w*)/i], [p, [w, "Siemens"], [m, v]], [/\b(rct\w+) b/i], [p, [w, "RCA"], [m, x]], [/\b(venue[\d ]{2,7}) b/i], [p, [w, "Dell"], [m, x]], [/\b(q(?:mv|ta)\w+) b/i], [p, [w, "Verizon"], [m, x]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [p, [w, "Barnes & Noble"], [m, x]], [/\b(tm\d{3}\w+) b/i], [p, [w, "NuVision"], [m, x]], [/\b(k88) b/i], [p, [w, "ZTE"], [m, x]], [/\b(nx\d{3}j) b/i], [p, [w, "ZTE"], [m, v]], [/\b(gen\d{3}) b.+49h/i], [p, [w, "Swiss"], [m, v]], [/\b(zur\d{3}) b/i], [p, [w, "Swiss"], [m, x]], [/\b((zeki)?tb.*\b) b/i], [p, [w, "Zeki"], [m, x]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[w, "Dragon Touch"], p, [m, x]], [/\b(ns-?\w{0,9}) b/i], [p, [w, "Insignia"], [m, x]], [/\b((nxa|next)-?\w{0,9}) b/i], [p, [w, "NextBook"], [m, x]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[w, "Voice"], p, [m, v]], [/\b(lvtel\-)?(v1[12]) b/i], [[w, "LvTel"], p, [m, v]], [/\b(ph-1) /i], [p, [w, "Essential"], [m, v]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [p, [w, "Envizen"], [m, x]], [/\b(trio[-\w\. ]+) b/i], [p, [w, "MachSpeed"], [m, x]], [/\btu_(1491) b/i], [p, [w, "Rotor"], [m, x]], [/(shield[\w ]+) b/i], [p, [w, "Nvidia"], [m, x]], [/(sprint) (\w+)/i], [w, p, [m, v]], [/(kin\.[onetw]{3})/i], [[p, /\./g, " "], [w, D], [m, v]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [p, [w, $], [m, x]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [p, [w, $], [m, v]], [/smart-tv.+(samsung)/i], [w, [m, E]], [/hbbtv.+maple;(\d+)/i], [[p, /^/, "SmartTV"], [w, L], [m, E]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[w, "LG"], [m, E]], [/(apple) ?tv/i], [w, [p, k + " TV"], [m, E]], [/crkey/i], [[p, C + "cast"], [w, I], [m, E]], [/droid.+aft(\w)( bui|\))/i], [p, [w, R], [m, E]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [p, [w, U], [m, E]], [/(bravia[\w ]+)( bui|\))/i], [p, [w, W], [m, E]], [/(mitv-\w{5}) bui/i], [p, [w, B], [m, E]], [/Hbbtv.*(technisat) (.*);/i], [w, p, [m, E]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[w, F], [p, F], [m, E]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[m, E]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [w, p, [m, b]], [/droid.+; (shield) bui/i], [p, [w, "Nvidia"], [m, b]], [/(playstation [345portablevi]+)/i], [p, [w, W], [m, b]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [p, [w, D], [m, b]], [/((pebble))app/i], [w, p, [m, _]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [p, [w, k], [m, _]], [/droid.+; (glass) \d/i], [p, [w, I], [m, _]], [/droid.+; (wt63?0{2,3})\)/i], [p, [w, $], [m, _]], [/(quest( 2| pro)?)/i], [p, [w, q], [m, _]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [w, [m, S]], [/(aeobc)\b/i], [p, [w, R], [m, S]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [p, [m, v]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [p, [m, x]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[m, x]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[m, v]], [/(android[-\w\. ]{0,9});.+buil/i], [p, [w, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [y, [f, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [y, [f, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [f, y], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [y, f]], os: [[/microsoft (windows) (vista|xp)/i], [f, y], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [f, [y, Y, Z]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[f, "Windows"], [y, Y, Z]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[y, /_/g, "."], [f, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[f, K], [y, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [y, f], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [f, y], [/\(bb(10);/i], [y, [f, A]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [y, [f, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [y, [f, P + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [y, [f, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [y, [f, "watchOS"]], [/crkey\/([\d\.]+)/i], [y, [f, C + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[f, H], y], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [f, y], [/(sunos) ?([\w\.\d]*)/i], [[f, "Solaris"], y], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [f, y]] }, ee = function(e2, t2) {
              if (typeof e2 === u && (t2 = e2, e2 = a), !(this instanceof ee))
                return new ee(e2, t2).getResult();
              var r2 = typeof o2 !== l && o2.navigator ? o2.navigator : a, n2 = e2 || (r2 && r2.userAgent ? r2.userAgent : ""), i3 = r2 && r2.userAgentData ? r2.userAgentData : a, s3 = t2 ? z(Q, t2) : Q, b2 = r2 && r2.userAgent == n2;
              return this.getBrowser = function() {
                var e3, t3 = {};
                return t3[f] = a, t3[y] = a, X.call(t3, n2, s3.browser), t3[d] = typeof (e3 = t3[y]) === h ? e3.replace(/[^\d\.]/g, "").split(".")[0] : a, b2 && r2 && r2.brave && typeof r2.brave.isBrave == c && (t3[f] = "Brave"), t3;
              }, this.getCPU = function() {
                var e3 = {};
                return e3[g] = a, X.call(e3, n2, s3.cpu), e3;
              }, this.getDevice = function() {
                var e3 = {};
                return e3[w] = a, e3[p] = a, e3[m] = a, X.call(e3, n2, s3.device), b2 && !e3[m] && i3 && i3.mobile && (e3[m] = v), b2 && "Macintosh" == e3[p] && r2 && typeof r2.standalone !== l && r2.maxTouchPoints && r2.maxTouchPoints > 2 && (e3[p] = "iPad", e3[m] = x), e3;
              }, this.getEngine = function() {
                var e3 = {};
                return e3[f] = a, e3[y] = a, X.call(e3, n2, s3.engine), e3;
              }, this.getOS = function() {
                var e3 = {};
                return e3[f] = a, e3[y] = a, X.call(e3, n2, s3.os), b2 && !e3[f] && i3 && "Unknown" != i3.platform && (e3[f] = i3.platform.replace(/chrome os/i, H).replace(/macos/i, K)), e3;
              }, this.getResult = function() {
                return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
              }, this.getUA = function() {
                return n2;
              }, this.setUA = function(e3) {
                return n2 = typeof e3 === h && e3.length > 350 ? F(e3, 350) : e3, this;
              }, this.setUA(n2), this;
            };
            ee.VERSION = "1.0.35", ee.BROWSER = J([f, y, d]), ee.CPU = J([g]), ee.DEVICE = J([p, w, m, b, v, E, x, _, S]), ee.ENGINE = ee.OS = J([f, y]), typeof s2 !== l ? (i2.exports && (s2 = i2.exports = ee), s2.UAParser = ee) : r.amdO ? void 0 !== (n = function() {
              return ee;
            }.call(t, r, t, e)) && (e.exports = n) : typeof o2 !== l && (o2.UAParser = ee);
            var et = typeof o2 !== l && (o2.jQuery || o2.Zepto);
            if (et && !et.ua) {
              var er = new ee();
              et.ua = er.getResult(), et.ua.get = function() {
                return er.getUA();
              }, et.ua.set = function(e2) {
                er.setUA(e2);
                var t2 = er.getResult();
                for (var r2 in t2)
                  et.ua[r2] = t2[r2];
              };
            }
          }("object" == typeof window ? window : this);
        } }, s = {};
        function o(e2) {
          var t2 = s[e2];
          if (void 0 !== t2)
            return t2.exports;
          var r2 = s[e2] = { exports: {} }, n2 = true;
          try {
            i[e2].call(r2.exports, r2, r2.exports, o), n2 = false;
          } finally {
            n2 && delete s[e2];
          }
          return r2.exports;
        }
        o.ab = "//", e.exports = o(226);
      })();
    }, 335: (e, t, r) => {
      "use strict";
      let n, i;
      r.r(t), r.d(t, { default: () => ak });
      var s, o, a, c, l, u, h = {};
      r.r(h), r.d(h, { default: () => t$, getRandomValues: () => tB, randomUUID: () => tW, subtle: () => tU });
      var d = {};
      async function p() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      r.r(d), r.d(d, { config: () => aE, middleware: () => ax });
      let f = null;
      async function m() {
        if ("phase-production-build" === process.env.NEXT_PHASE)
          return;
        f || (f = p());
        let e10 = await f;
        if (null == e10 ? void 0 : e10.register)
          try {
            await e10.register();
          } catch (e11) {
            throw e11.message = `An error occurred while loading instrumentation hook: ${e11.message}`, e11;
          }
      }
      async function w(...e10) {
        let t10 = await p();
        try {
          var r10;
          await (null == t10 ? void 0 : null == (r10 = t10.onRequestError) ? void 0 : r10.call(t10, ...e10));
        } catch (e11) {
          console.error("Error in instrumentation.onRequestError:", e11);
        }
      }
      let y = null;
      function g() {
        return y || (y = m()), y;
      }
      function b(e10) {
        return `The edge runtime does not support Node.js '${e10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== r.g.process && (process.env = r.g.process.env, r.g.process = process), Object.defineProperty(globalThis, "__import_unsupported", { value: function(e10) {
        let t10 = new Proxy(function() {
        }, { get(t11, r10) {
          if ("then" === r10)
            return {};
          throw Object.defineProperty(Error(b(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }, construct() {
          throw Object.defineProperty(Error(b(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }, apply(r10, n10, i10) {
          if ("function" == typeof i10[0])
            return i10[0](t10);
          throw Object.defineProperty(Error(b(e10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        } });
        return new Proxy({}, { get: () => t10 });
      }, enumerable: false, configurable: false }), g();
      class v extends Error {
        constructor({ page: e10 }) {
          super(`The middleware "${e10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class x extends Error {
        constructor() {
          super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
        }
      }
      class E extends Error {
        constructor() {
          super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
        }
      }
      let _ = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function S(e10) {
        var t10, r10, n10, i10, s10, o10 = [], a2 = 0;
        function c2() {
          for (; a2 < e10.length && /\s/.test(e10.charAt(a2)); )
            a2 += 1;
          return a2 < e10.length;
        }
        for (; a2 < e10.length; ) {
          for (t10 = a2, s10 = false; c2(); )
            if ("," === (r10 = e10.charAt(a2))) {
              for (n10 = a2, a2 += 1, c2(), i10 = a2; a2 < e10.length && "=" !== (r10 = e10.charAt(a2)) && ";" !== r10 && "," !== r10; )
                a2 += 1;
              a2 < e10.length && "=" === e10.charAt(a2) ? (s10 = true, a2 = i10, o10.push(e10.substring(t10, n10)), t10 = a2) : a2 = n10 + 1;
            } else
              a2 += 1;
          (!s10 || a2 >= e10.length) && o10.push(e10.substring(t10, e10.length));
        }
        return o10;
      }
      function R(e10) {
        let t10 = {}, r10 = [];
        if (e10)
          for (let [n10, i10] of e10.entries())
            "set-cookie" === n10.toLowerCase() ? (r10.push(...S(i10)), t10[n10] = 1 === r10.length ? r10[0] : r10) : t10[n10] = i10;
        return t10;
      }
      function k(e10) {
        try {
          return String(new URL(String(e10)));
        } catch (t10) {
          throw Object.defineProperty(Error(`URL is malformed "${String(e10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: t10 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ..._, GROUP: { builtinReact: [_.reactServerComponents, _.actionBrowser], serverOnly: [_.reactServerComponents, _.actionBrowser, _.instrument, _.middleware], neutralTarget: [_.apiNode, _.apiEdge], clientOnly: [_.serverSideRendering, _.appPagesBrowser], bundled: [_.reactServerComponents, _.actionBrowser, _.serverSideRendering, _.appPagesBrowser, _.shared, _.instrument, _.middleware], appPages: [_.reactServerComponents, _.serverSideRendering, _.appPagesBrowser, _.actionBrowser] } });
      let O = Symbol("response"), A = Symbol("passThrough"), T = Symbol("waitUntil");
      class C {
        constructor(e10, t10) {
          this[A] = false, this[T] = t10 ? { kind: "external", function: t10 } : { kind: "internal", promises: [] };
        }
        respondWith(e10) {
          this[O] || (this[O] = Promise.resolve(e10));
        }
        passThroughOnException() {
          this[A] = true;
        }
        waitUntil(e10) {
          if ("external" === this[T].kind)
            return (0, this[T].function)(e10);
          this[T].promises.push(e10);
        }
      }
      class P extends C {
        constructor(e10) {
          var t10;
          super(e10.request, null == (t10 = e10.context) ? void 0 : t10.waitUntil), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new v({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new v({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function I(e10) {
        return e10.replace(/\/$/, "") || "/";
      }
      function N(e10) {
        let t10 = e10.indexOf("#"), r10 = e10.indexOf("?"), n10 = r10 > -1 && (t10 < 0 || r10 < t10);
        return n10 || t10 > -1 ? { pathname: e10.substring(0, n10 ? r10 : t10), query: n10 ? e10.substring(r10, t10 > -1 ? t10 : void 0) : "", hash: t10 > -1 ? e10.slice(t10) : "" } : { pathname: e10, query: "", hash: "" };
      }
      function D(e10, t10) {
        if (!e10.startsWith("/") || !t10)
          return e10;
        let { pathname: r10, query: n10, hash: i10 } = N(e10);
        return "" + t10 + r10 + n10 + i10;
      }
      function M(e10, t10) {
        if (!e10.startsWith("/") || !t10)
          return e10;
        let { pathname: r10, query: n10, hash: i10 } = N(e10);
        return "" + r10 + t10 + n10 + i10;
      }
      function j(e10, t10) {
        if ("string" != typeof e10)
          return false;
        let { pathname: r10 } = N(e10);
        return r10 === t10 || r10.startsWith(t10 + "/");
      }
      let L = /* @__PURE__ */ new WeakMap();
      function U(e10, t10) {
        let r10;
        if (!t10)
          return { pathname: e10 };
        let n10 = L.get(t10);
        n10 || (n10 = t10.map((e11) => e11.toLowerCase()), L.set(t10, n10));
        let i10 = e10.split("/", 2);
        if (!i10[1])
          return { pathname: e10 };
        let s10 = i10[1].toLowerCase(), o10 = n10.indexOf(s10);
        return o10 < 0 ? { pathname: e10 } : (r10 = t10[o10], { pathname: e10 = e10.slice(r10.length + 1) || "/", detectedLocale: r10 });
      }
      let W = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
      function B(e10, t10) {
        return new URL(String(e10).replace(W, "localhost"), t10 && String(t10).replace(W, "localhost"));
      }
      let $ = Symbol("NextURLInternal");
      class q {
        constructor(e10, t10, r10) {
          let n10, i10;
          "object" == typeof t10 && "pathname" in t10 || "string" == typeof t10 ? (n10 = t10, i10 = r10 || {}) : i10 = r10 || t10 || {}, this[$] = { url: B(e10, n10 ?? i10.base), options: i10, basePath: "" }, this.analyze();
        }
        analyze() {
          var e10, t10, r10, n10, i10;
          let s10 = function(e11, t11) {
            var r11, n11;
            let { basePath: i11, i18n: s11, trailingSlash: o11 } = null != (r11 = t11.nextConfig) ? r11 : {}, a3 = { pathname: e11, trailingSlash: "/" !== e11 ? e11.endsWith("/") : o11 };
            i11 && j(a3.pathname, i11) && (a3.pathname = function(e12, t12) {
              if (!j(e12, t12))
                return e12;
              let r12 = e12.slice(t12.length);
              return r12.startsWith("/") ? r12 : "/" + r12;
            }(a3.pathname, i11), a3.basePath = i11);
            let c2 = a3.pathname;
            if (a3.pathname.startsWith("/_next/data/") && a3.pathname.endsWith(".json")) {
              let e12 = a3.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              a3.buildId = e12[0], c2 = "index" !== e12[1] ? "/" + e12.slice(1).join("/") : "/", true === t11.parseData && (a3.pathname = c2);
            }
            if (s11) {
              let e12 = t11.i18nProvider ? t11.i18nProvider.analyze(a3.pathname) : U(a3.pathname, s11.locales);
              a3.locale = e12.detectedLocale, a3.pathname = null != (n11 = e12.pathname) ? n11 : a3.pathname, !e12.detectedLocale && a3.buildId && (e12 = t11.i18nProvider ? t11.i18nProvider.analyze(c2) : U(c2, s11.locales)).detectedLocale && (a3.locale = e12.detectedLocale);
            }
            return a3;
          }(this[$].url.pathname, { nextConfig: this[$].options.nextConfig, parseData: true, i18nProvider: this[$].options.i18nProvider }), o10 = function(e11, t11) {
            let r11;
            if ((null == t11 ? void 0 : t11.host) && !Array.isArray(t11.host))
              r11 = t11.host.toString().split(":", 1)[0];
            else {
              if (!e11.hostname)
                return;
              r11 = e11.hostname;
            }
            return r11.toLowerCase();
          }(this[$].url, this[$].options.headers);
          this[$].domainLocale = this[$].options.i18nProvider ? this[$].options.i18nProvider.detectDomainLocale(o10) : function(e11, t11, r11) {
            if (e11)
              for (let s11 of (r11 && (r11 = r11.toLowerCase()), e11)) {
                var n11, i11;
                if (t11 === (null == (n11 = s11.domain) ? void 0 : n11.split(":", 1)[0].toLowerCase()) || r11 === s11.defaultLocale.toLowerCase() || (null == (i11 = s11.locales) ? void 0 : i11.some((e12) => e12.toLowerCase() === r11)))
                  return s11;
              }
          }(null == (t10 = this[$].options.nextConfig) ? void 0 : null == (e10 = t10.i18n) ? void 0 : e10.domains, o10);
          let a2 = (null == (r10 = this[$].domainLocale) ? void 0 : r10.defaultLocale) || (null == (i10 = this[$].options.nextConfig) ? void 0 : null == (n10 = i10.i18n) ? void 0 : n10.defaultLocale);
          this[$].url.pathname = s10.pathname, this[$].defaultLocale = a2, this[$].basePath = s10.basePath ?? "", this[$].buildId = s10.buildId, this[$].locale = s10.locale ?? a2, this[$].trailingSlash = s10.trailingSlash;
        }
        formatPathname() {
          var e10;
          let t10;
          return t10 = function(e11, t11, r10, n10) {
            if (!t11 || t11 === r10)
              return e11;
            let i10 = e11.toLowerCase();
            return !n10 && (j(i10, "/api") || j(i10, "/" + t11.toLowerCase())) ? e11 : D(e11, "/" + t11);
          }((e10 = { basePath: this[$].basePath, buildId: this[$].buildId, defaultLocale: this[$].options.forceLocale ? void 0 : this[$].defaultLocale, locale: this[$].locale, pathname: this[$].url.pathname, trailingSlash: this[$].trailingSlash }).pathname, e10.locale, e10.buildId ? void 0 : e10.defaultLocale, e10.ignorePrefix), (e10.buildId || !e10.trailingSlash) && (t10 = I(t10)), e10.buildId && (t10 = M(D(t10, "/_next/data/" + e10.buildId), "/" === e10.pathname ? "index.json" : ".json")), t10 = D(t10, e10.basePath), !e10.buildId && e10.trailingSlash ? t10.endsWith("/") ? t10 : M(t10, "/") : I(t10);
        }
        formatSearch() {
          return this[$].url.search;
        }
        get buildId() {
          return this[$].buildId;
        }
        set buildId(e10) {
          this[$].buildId = e10;
        }
        get locale() {
          return this[$].locale ?? "";
        }
        set locale(e10) {
          var t10, r10;
          if (!this[$].locale || !(null == (r10 = this[$].options.nextConfig) ? void 0 : null == (t10 = r10.i18n) ? void 0 : t10.locales.includes(e10)))
            throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${e10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[$].locale = e10;
        }
        get defaultLocale() {
          return this[$].defaultLocale;
        }
        get domainLocale() {
          return this[$].domainLocale;
        }
        get searchParams() {
          return this[$].url.searchParams;
        }
        get host() {
          return this[$].url.host;
        }
        set host(e10) {
          this[$].url.host = e10;
        }
        get hostname() {
          return this[$].url.hostname;
        }
        set hostname(e10) {
          this[$].url.hostname = e10;
        }
        get port() {
          return this[$].url.port;
        }
        set port(e10) {
          this[$].url.port = e10;
        }
        get protocol() {
          return this[$].url.protocol;
        }
        set protocol(e10) {
          this[$].url.protocol = e10;
        }
        get href() {
          let e10 = this.formatPathname(), t10 = this.formatSearch();
          return `${this.protocol}//${this.host}${e10}${t10}${this.hash}`;
        }
        set href(e10) {
          this[$].url = B(e10), this.analyze();
        }
        get origin() {
          return this[$].url.origin;
        }
        get pathname() {
          return this[$].url.pathname;
        }
        set pathname(e10) {
          this[$].url.pathname = e10;
        }
        get hash() {
          return this[$].url.hash;
        }
        set hash(e10) {
          this[$].url.hash = e10;
        }
        get search() {
          return this[$].url.search;
        }
        set search(e10) {
          this[$].url.search = e10;
        }
        get password() {
          return this[$].url.password;
        }
        set password(e10) {
          this[$].url.password = e10;
        }
        get username() {
          return this[$].url.username;
        }
        set username(e10) {
          this[$].url.username = e10;
        }
        get basePath() {
          return this[$].basePath;
        }
        set basePath(e10) {
          this[$].basePath = e10.startsWith("/") ? e10 : `/${e10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new q(String(this), this[$].options);
        }
      }
      var H = r(724);
      let K = Symbol("internal request");
      class z extends Request {
        constructor(e10, t10 = {}) {
          let r10 = "string" != typeof e10 && "url" in e10 ? e10.url : String(e10);
          k(r10), e10 instanceof Request ? super(e10, t10) : super(r10, t10);
          let n10 = new q(r10, { headers: R(this.headers), nextConfig: t10.nextConfig });
          this[K] = { cookies: new H.RequestCookies(this.headers), nextUrl: n10, url: n10.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[K].cookies;
        }
        get nextUrl() {
          return this[K].nextUrl;
        }
        get page() {
          throw new x();
        }
        get ua() {
          throw new E();
        }
        get url() {
          return this[K].url;
        }
      }
      class J {
        static get(e10, t10, r10) {
          let n10 = Reflect.get(e10, t10, r10);
          return "function" == typeof n10 ? n10.bind(e10) : n10;
        }
        static set(e10, t10, r10, n10) {
          return Reflect.set(e10, t10, r10, n10);
        }
        static has(e10, t10) {
          return Reflect.has(e10, t10);
        }
        static deleteProperty(e10, t10) {
          return Reflect.deleteProperty(e10, t10);
        }
      }
      let G = Symbol("internal response"), V = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function F(e10, t10) {
        var r10;
        if (null == e10 ? void 0 : null == (r10 = e10.request) ? void 0 : r10.headers) {
          if (!(e10.request.headers instanceof Headers))
            throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let r11 = [];
          for (let [n10, i10] of e10.request.headers)
            t10.set("x-middleware-request-" + n10, i10), r11.push(n10);
          t10.set("x-middleware-override-headers", r11.join(","));
        }
      }
      class X extends Response {
        constructor(e10, t10 = {}) {
          super(e10, t10);
          let r10 = this.headers, n10 = new Proxy(new H.ResponseCookies(r10), { get(e11, n11, i10) {
            switch (n11) {
              case "delete":
              case "set":
                return (...i11) => {
                  let s10 = Reflect.apply(e11[n11], e11, i11), o10 = new Headers(r10);
                  return s10 instanceof H.ResponseCookies && r10.set("x-middleware-set-cookie", s10.getAll().map((e12) => (0, H.stringifyCookie)(e12)).join(",")), F(t10, o10), s10;
                };
              default:
                return J.get(e11, n11, i10);
            }
          } });
          this[G] = { cookies: n10, url: t10.url ? new q(t10.url, { headers: R(r10), nextConfig: t10.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[G].cookies;
        }
        static json(e10, t10) {
          let r10 = Response.json(e10, t10);
          return new X(r10.body, r10);
        }
        static redirect(e10, t10) {
          let r10 = "number" == typeof t10 ? t10 : (null == t10 ? void 0 : t10.status) ?? 307;
          if (!V.has(r10))
            throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let n10 = "object" == typeof t10 ? t10 : {}, i10 = new Headers(null == n10 ? void 0 : n10.headers);
          return i10.set("Location", k(e10)), new X(null, { ...n10, headers: i10, status: r10 });
        }
        static rewrite(e10, t10) {
          let r10 = new Headers(null == t10 ? void 0 : t10.headers);
          return r10.set("x-middleware-rewrite", k(e10)), F(t10, r10), new X(null, { ...t10, headers: r10 });
        }
        static next(e10) {
          let t10 = new Headers(null == e10 ? void 0 : e10.headers);
          return t10.set("x-middleware-next", "1"), F(e10, t10), new X(null, { ...e10, headers: t10 });
        }
      }
      function Y(e10, t10) {
        let r10 = "string" == typeof t10 ? new URL(t10) : t10, n10 = new URL(e10, t10), i10 = n10.origin === r10.origin;
        return { url: i10 ? n10.toString().slice(r10.origin.length) : n10.toString(), isRelative: i10 };
      }
      let Z = "Next-Router-Prefetch", Q = ["RSC", "Next-Router-State-Tree", Z, "Next-HMR-Refresh", "Next-Router-Segment-Prefetch"], ee = "_rsc";
      class et extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new et();
        }
      }
      class er extends Headers {
        constructor(e10) {
          super(), this.headers = new Proxy(e10, { get(t10, r10, n10) {
            if ("symbol" == typeof r10)
              return J.get(t10, r10, n10);
            let i10 = r10.toLowerCase(), s10 = Object.keys(e10).find((e11) => e11.toLowerCase() === i10);
            if (void 0 !== s10)
              return J.get(t10, s10, n10);
          }, set(t10, r10, n10, i10) {
            if ("symbol" == typeof r10)
              return J.set(t10, r10, n10, i10);
            let s10 = r10.toLowerCase(), o10 = Object.keys(e10).find((e11) => e11.toLowerCase() === s10);
            return J.set(t10, o10 ?? r10, n10, i10);
          }, has(t10, r10) {
            if ("symbol" == typeof r10)
              return J.has(t10, r10);
            let n10 = r10.toLowerCase(), i10 = Object.keys(e10).find((e11) => e11.toLowerCase() === n10);
            return void 0 !== i10 && J.has(t10, i10);
          }, deleteProperty(t10, r10) {
            if ("symbol" == typeof r10)
              return J.deleteProperty(t10, r10);
            let n10 = r10.toLowerCase(), i10 = Object.keys(e10).find((e11) => e11.toLowerCase() === n10);
            return void 0 === i10 || J.deleteProperty(t10, i10);
          } });
        }
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "append":
              case "delete":
              case "set":
                return et.callable;
              default:
                return J.get(e11, t10, r10);
            }
          } });
        }
        merge(e10) {
          return Array.isArray(e10) ? e10.join(", ") : e10;
        }
        static from(e10) {
          return e10 instanceof Headers ? e10 : new er(e10);
        }
        append(e10, t10) {
          let r10 = this.headers[e10];
          "string" == typeof r10 ? this.headers[e10] = [r10, t10] : Array.isArray(r10) ? r10.push(t10) : this.headers[e10] = t10;
        }
        delete(e10) {
          delete this.headers[e10];
        }
        get(e10) {
          let t10 = this.headers[e10];
          return void 0 !== t10 ? this.merge(t10) : null;
        }
        has(e10) {
          return void 0 !== this.headers[e10];
        }
        set(e10, t10) {
          this.headers[e10] = t10;
        }
        forEach(e10, t10) {
          for (let [r10, n10] of this.entries())
            e10.call(t10, n10, r10, this);
        }
        *entries() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase(), r10 = this.get(t10);
            yield [t10, r10];
          }
        }
        *keys() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = e10.toLowerCase();
            yield t10;
          }
        }
        *values() {
          for (let e10 of Object.keys(this.headers)) {
            let t10 = this.get(e10);
            yield t10;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let en = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class ei {
        disable() {
          throw en;
        }
        getStore() {
        }
        run() {
          throw en;
        }
        exit() {
          throw en;
        }
        enterWith() {
          throw en;
        }
        static bind(e10) {
          return e10;
        }
      }
      let es = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage;
      function eo() {
        return es ? new es() : new ei();
      }
      let ea = eo(), ec = eo();
      function el(e10) {
        let t10 = ec.getStore();
        if (t10) {
          if ("request" === t10.type)
            return t10;
          if ("prerender" === t10.type || "prerender-ppr" === t10.type || "prerender-legacy" === t10.type)
            throw Object.defineProperty(Error(`\`${e10}\` cannot be called inside a prerender. This is a bug in Next.js.`), "__NEXT_ERROR_CODE", { value: "E401", enumerable: false, configurable: true });
          if ("cache" === t10.type)
            throw Object.defineProperty(Error(`\`${e10}\` cannot be called inside "use cache". Call it outside and pass an argument instead. Read more: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E37", enumerable: false, configurable: true });
          if ("unstable-cache" === t10.type)
            throw Object.defineProperty(Error(`\`${e10}\` cannot be called inside unstable_cache. Call it outside and pass an argument instead. Read more: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", { value: "E69", enumerable: false, configurable: true });
        }
        throw Object.defineProperty(Error(`\`${e10}\` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context`), "__NEXT_ERROR_CODE", { value: "E251", enumerable: false, configurable: true });
      }
      class eu extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new eu();
        }
      }
      class eh {
        static seal(e10) {
          return new Proxy(e10, { get(e11, t10, r10) {
            switch (t10) {
              case "clear":
              case "delete":
              case "set":
                return eu.callable;
              default:
                return J.get(e11, t10, r10);
            }
          } });
        }
      }
      let ed = Symbol.for("next.mutated.cookies");
      class ep {
        static wrap(e10, t10) {
          let r10 = new H.ResponseCookies(new Headers());
          for (let t11 of e10.getAll())
            r10.set(t11);
          let n10 = [], i10 = /* @__PURE__ */ new Set(), s10 = () => {
            let e11 = ea.getStore();
            if (e11 && (e11.pathWasRevalidated = true), n10 = r10.getAll().filter((e12) => i10.has(e12.name)), t10) {
              let e12 = [];
              for (let t11 of n10) {
                let r11 = new H.ResponseCookies(new Headers());
                r11.set(t11), e12.push(r11.toString());
              }
              t10(e12);
            }
          }, o10 = new Proxy(r10, { get(e11, t11, r11) {
            switch (t11) {
              case ed:
                return n10;
              case "delete":
                return function(...t12) {
                  i10.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.delete(...t12), o10;
                  } finally {
                    s10();
                  }
                };
              case "set":
                return function(...t12) {
                  i10.add("string" == typeof t12[0] ? t12[0] : t12[0].name);
                  try {
                    return e11.set(...t12), o10;
                  } finally {
                    s10();
                  }
                };
              default:
                return J.get(e11, t11, r11);
            }
          } });
          return o10;
        }
      }
      function ef(e10) {
        return "action" === e10.phase;
      }
      function em(e10) {
        if (!ef(el(e10)))
          throw new eu();
      }
      var ew = function(e10) {
        return e10.handleRequest = "BaseServer.handleRequest", e10.run = "BaseServer.run", e10.pipe = "BaseServer.pipe", e10.getStaticHTML = "BaseServer.getStaticHTML", e10.render = "BaseServer.render", e10.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", e10.renderToResponse = "BaseServer.renderToResponse", e10.renderToHTML = "BaseServer.renderToHTML", e10.renderError = "BaseServer.renderError", e10.renderErrorToResponse = "BaseServer.renderErrorToResponse", e10.renderErrorToHTML = "BaseServer.renderErrorToHTML", e10.render404 = "BaseServer.render404", e10;
      }(ew || {}), ey = function(e10) {
        return e10.loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", e10.loadComponents = "LoadComponents.loadComponents", e10;
      }(ey || {}), eg = function(e10) {
        return e10.getRequestHandler = "NextServer.getRequestHandler", e10.getServer = "NextServer.getServer", e10.getServerRequestHandler = "NextServer.getServerRequestHandler", e10.createServer = "createServer.createServer", e10;
      }(eg || {}), eb = function(e10) {
        return e10.compression = "NextNodeServer.compression", e10.getBuildId = "NextNodeServer.getBuildId", e10.createComponentTree = "NextNodeServer.createComponentTree", e10.clientComponentLoading = "NextNodeServer.clientComponentLoading", e10.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", e10.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", e10.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", e10.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", e10.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", e10.sendRenderResult = "NextNodeServer.sendRenderResult", e10.proxyRequest = "NextNodeServer.proxyRequest", e10.runApi = "NextNodeServer.runApi", e10.render = "NextNodeServer.render", e10.renderHTML = "NextNodeServer.renderHTML", e10.imageOptimizer = "NextNodeServer.imageOptimizer", e10.getPagePath = "NextNodeServer.getPagePath", e10.getRoutesManifest = "NextNodeServer.getRoutesManifest", e10.findPageComponents = "NextNodeServer.findPageComponents", e10.getFontManifest = "NextNodeServer.getFontManifest", e10.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", e10.getRequestHandler = "NextNodeServer.getRequestHandler", e10.renderToHTML = "NextNodeServer.renderToHTML", e10.renderError = "NextNodeServer.renderError", e10.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", e10.render404 = "NextNodeServer.render404", e10.startResponse = "NextNodeServer.startResponse", e10.route = "route", e10.onProxyReq = "onProxyReq", e10.apiResolver = "apiResolver", e10.internalFetch = "internalFetch", e10;
      }(eb || {}), ev = function(e10) {
        return e10.startServer = "startServer.startServer", e10;
      }(ev || {}), ex = function(e10) {
        return e10.getServerSideProps = "Render.getServerSideProps", e10.getStaticProps = "Render.getStaticProps", e10.renderToString = "Render.renderToString", e10.renderDocument = "Render.renderDocument", e10.createBodyResult = "Render.createBodyResult", e10;
      }(ex || {}), eE = function(e10) {
        return e10.renderToString = "AppRender.renderToString", e10.renderToReadableStream = "AppRender.renderToReadableStream", e10.getBodyResult = "AppRender.getBodyResult", e10.fetch = "AppRender.fetch", e10;
      }(eE || {}), e_ = function(e10) {
        return e10.executeRoute = "Router.executeRoute", e10;
      }(e_ || {}), eS = function(e10) {
        return e10.runHandler = "Node.runHandler", e10;
      }(eS || {}), eR = function(e10) {
        return e10.runHandler = "AppRouteRouteHandlers.runHandler", e10;
      }(eR || {}), ek = function(e10) {
        return e10.generateMetadata = "ResolveMetadata.generateMetadata", e10.generateViewport = "ResolveMetadata.generateViewport", e10;
      }(ek || {}), eO = function(e10) {
        return e10.execute = "Middleware.execute", e10;
      }(eO || {});
      let eA = ["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"], eT = ["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"];
      function eC(e10) {
        return null !== e10 && "object" == typeof e10 && "then" in e10 && "function" == typeof e10.then;
      }
      let { context: eP, propagation: eI, trace: eN, SpanStatusCode: eD, SpanKind: eM, ROOT_CONTEXT: ej } = n = r(700);
      class eL extends Error {
        constructor(e10, t10) {
          super(), this.bubble = e10, this.result = t10;
        }
      }
      let eU = (e10, t10) => {
        (function(e11) {
          return "object" == typeof e11 && null !== e11 && e11 instanceof eL;
        })(t10) && t10.bubble ? e10.setAttribute("next.bubble", true) : (t10 && e10.recordException(t10), e10.setStatus({ code: eD.ERROR, message: null == t10 ? void 0 : t10.message })), e10.end();
      }, eW = /* @__PURE__ */ new Map(), eB = n.createContextKey("next.rootSpanId"), e$ = 0, eq = () => e$++, eH = { set(e10, t10, r10) {
        e10.push({ key: t10, value: r10 });
      } };
      class eK {
        getTracerInstance() {
          return eN.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return eP;
        }
        getTracePropagationData() {
          let e10 = eP.active(), t10 = [];
          return eI.inject(e10, t10, eH), t10;
        }
        getActiveScopeSpan() {
          return eN.getSpan(null == eP ? void 0 : eP.active());
        }
        withPropagatedContext(e10, t10, r10) {
          let n10 = eP.active();
          if (eN.getSpanContext(n10))
            return t10();
          let i10 = eI.extract(n10, e10, r10);
          return eP.with(i10, t10);
        }
        trace(...e10) {
          var t10;
          let [r10, n10, i10] = e10, { fn: s10, options: o10 } = "function" == typeof n10 ? { fn: n10, options: {} } : { fn: i10, options: { ...n10 } }, a2 = o10.spanName ?? r10;
          if (!eA.includes(r10) && "1" !== process.env.NEXT_OTEL_VERBOSE || o10.hideSpan)
            return s10();
          let c2 = this.getSpanContext((null == o10 ? void 0 : o10.parentSpan) ?? this.getActiveScopeSpan()), l2 = false;
          c2 ? (null == (t10 = eN.getSpanContext(c2)) ? void 0 : t10.isRemote) && (l2 = true) : (c2 = (null == eP ? void 0 : eP.active()) ?? ej, l2 = true);
          let u2 = eq();
          return o10.attributes = { "next.span_name": a2, "next.span_type": r10, ...o10.attributes }, eP.with(c2.setValue(eB, u2), () => this.getTracerInstance().startActiveSpan(a2, o10, (e11) => {
            let t11 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0, n11 = () => {
              eW.delete(u2), t11 && process.env.NEXT_OTEL_PERFORMANCE_PREFIX && eT.includes(r10 || "") && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-${(r10.split(".").pop() || "").replace(/[A-Z]/g, (e12) => "-" + e12.toLowerCase())}`, { start: t11, end: performance.now() });
            };
            l2 && eW.set(u2, new Map(Object.entries(o10.attributes ?? {})));
            try {
              if (s10.length > 1)
                return s10(e11, (t13) => eU(e11, t13));
              let t12 = s10(e11);
              if (eC(t12))
                return t12.then((t13) => (e11.end(), t13)).catch((t13) => {
                  throw eU(e11, t13), t13;
                }).finally(n11);
              return e11.end(), n11(), t12;
            } catch (t12) {
              throw eU(e11, t12), n11(), t12;
            }
          }));
        }
        wrap(...e10) {
          let t10 = this, [r10, n10, i10] = 3 === e10.length ? e10 : [e10[0], {}, e10[1]];
          return eA.includes(r10) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let e11 = n10;
            "function" == typeof e11 && "function" == typeof i10 && (e11 = e11.apply(this, arguments));
            let s10 = arguments.length - 1, o10 = arguments[s10];
            if ("function" != typeof o10)
              return t10.trace(r10, e11, () => i10.apply(this, arguments));
            {
              let n11 = t10.getContext().bind(eP.active(), o10);
              return t10.trace(r10, e11, (e12, t11) => (arguments[s10] = function(e13) {
                return null == t11 || t11(e13), n11.apply(this, arguments);
              }, i10.apply(this, arguments)));
            }
          } : i10;
        }
        startSpan(...e10) {
          let [t10, r10] = e10, n10 = this.getSpanContext((null == r10 ? void 0 : r10.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(t10, r10, n10);
        }
        getSpanContext(e10) {
          return e10 ? eN.setSpan(eP.active(), e10) : void 0;
        }
        getRootSpanAttributes() {
          let e10 = eP.active().getValue(eB);
          return eW.get(e10);
        }
        setRootSpanAttribute(e10, t10) {
          let r10 = eP.active().getValue(eB), n10 = eW.get(r10);
          n10 && n10.set(e10, t10);
        }
      }
      let ez = (() => {
        let e10 = new eK();
        return () => e10;
      })(), eJ = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(eJ);
      class eG {
        constructor(e10, t10, r10, n10) {
          var i10;
          let s10 = e10 && function(e11, t11) {
            let r11 = er.from(e11.headers);
            return { isOnDemandRevalidate: r11.get("x-prerender-revalidate") === t11.previewModeId, revalidateOnlyGenerated: r11.has("x-prerender-revalidate-if-generated") };
          }(t10, e10).isOnDemandRevalidate, o10 = null == (i10 = r10.get(eJ)) ? void 0 : i10.value;
          this.isEnabled = !!(!s10 && o10 && e10 && o10 === e10.previewModeId), this._previewModeId = null == e10 ? void 0 : e10.previewModeId, this._mutableCookies = n10;
        }
        enable() {
          if (!this._previewModeId)
            throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: eJ, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" });
        }
        disable() {
          this._mutableCookies.set({ name: eJ, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) });
        }
      }
      function eV(e10, t10) {
        if ("x-middleware-set-cookie" in e10.headers && "string" == typeof e10.headers["x-middleware-set-cookie"]) {
          let r10 = e10.headers["x-middleware-set-cookie"], n10 = new Headers();
          for (let e11 of S(r10))
            n10.append("set-cookie", e11);
          for (let e11 of new H.ResponseCookies(n10).getAll())
            t10.set(e11);
        }
      }
      var eF = r(802), eX = r.n(eF);
      class eY extends Error {
        constructor(e10, t10) {
          super("Invariant: " + (e10.endsWith(".") ? e10 : e10 + ".") + " This is a bug in Next.js.", t10), this.name = "InvariantError";
        }
      }
      async function eZ(e10, t10) {
        if (!e10)
          return t10();
        let r10 = eQ(e10);
        try {
          return await t10();
        } finally {
          let t11 = function(e11, t12) {
            let r11 = new Set(e11.revalidatedTags), n10 = new Set(e11.pendingRevalidateWrites);
            return { revalidatedTags: t12.revalidatedTags.filter((e12) => !r11.has(e12)), pendingRevalidates: Object.fromEntries(Object.entries(t12.pendingRevalidates).filter(([t13]) => !(t13 in e11.pendingRevalidates))), pendingRevalidateWrites: t12.pendingRevalidateWrites.filter((e12) => !n10.has(e12)) };
          }(r10, eQ(e10));
          await e0(e10, t11);
        }
      }
      function eQ(e10) {
        return { revalidatedTags: e10.revalidatedTags ? [...e10.revalidatedTags] : [], pendingRevalidates: { ...e10.pendingRevalidates }, pendingRevalidateWrites: e10.pendingRevalidateWrites ? [...e10.pendingRevalidateWrites] : [] };
      }
      async function e0(e10, { revalidatedTags: t10, pendingRevalidates: r10, pendingRevalidateWrites: n10 }) {
        var i10;
        return Promise.all([null == (i10 = e10.incrementalCache) ? void 0 : i10.revalidateTag(t10), ...Object.values(r10), ...n10]);
      }
      let e1 = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class e2 {
        disable() {
          throw e1;
        }
        getStore() {
        }
        run() {
          throw e1;
        }
        exit() {
          throw e1;
        }
        enterWith() {
          throw e1;
        }
        static bind(e10) {
          return e10;
        }
      }
      let e3 = "undefined" != typeof globalThis && globalThis.AsyncLocalStorage, e5 = e3 ? new e3() : new e2();
      class e4 {
        constructor({ waitUntil: e10, onClose: t10, onTaskError: r10 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = e10, this.onClose = t10, this.onTaskError = r10, this.callbackQueue = new (eX())(), this.callbackQueue.pause();
        }
        after(e10) {
          if (eC(e10))
            this.waitUntil || e8(), this.waitUntil(e10.catch((e11) => this.reportTaskError("promise", e11)));
          else if ("function" == typeof e10)
            this.addCallback(e10);
          else
            throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(e10) {
          var t10;
          this.waitUntil || e8();
          let r10 = ec.getStore();
          r10 && this.workUnitStores.add(r10);
          let n10 = e5.getStore(), i10 = n10 ? n10.rootTaskSpawnPhase : null == r10 ? void 0 : r10.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let s10 = (t10 = async () => {
            try {
              await e5.run({ rootTaskSpawnPhase: i10 }, () => e10());
            } catch (e11) {
              this.reportTaskError("function", e11);
            }
          }, e3 ? e3.bind(t10) : e2.bind(t10));
          this.callbackQueue.add(s10);
        }
        async runCallbacksOnClose() {
          return await new Promise((e10) => this.onClose(e10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size)
            return;
          for (let e11 of this.workUnitStores)
            e11.phase = "after";
          let e10 = ea.getStore();
          if (!e10)
            throw Object.defineProperty(new eY("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return eZ(e10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(e10, t10) {
          if (console.error("promise" === e10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", t10), this.onTaskError)
            try {
              null == this.onTaskError || this.onTaskError.call(this, t10);
            } catch (e11) {
              console.error(Object.defineProperty(new eY("`onTaskError` threw while handling an error thrown from an `after` task", { cause: e11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
            }
        }
      }
      function e8() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      class e6 {
        onClose(e10) {
          if (this.isClosed)
            throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", e10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed)
            throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function e9() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID, previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let e7 = Symbol.for("@next/request-context");
      class te extends z {
        constructor(e10) {
          super(e10.input, e10.init), this.sourcePage = e10.page;
        }
        get request() {
          throw Object.defineProperty(new v({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new v({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new v({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let tt = { keys: (e10) => Array.from(e10.keys()), get: (e10, t10) => e10.get(t10) ?? void 0 }, tr = (e10, t10) => ez().withPropagatedContext(e10.headers, t10, tt), tn = false;
      async function ti(e10) {
        var t10;
        let n10, i10;
        !function() {
          if (!tn && (tn = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
            let { interceptTestApis: e11, wrapRequestHandler: t11 } = r(905);
            e11(), tr = t11(tr);
          }
        }(), await g();
        let s10 = void 0 !== globalThis.__BUILD_MANIFEST;
        e10.request.url = e10.request.url.replace(/\.rsc($|\?)/, "$1");
        let o10 = new q(e10.request.url, { headers: e10.request.headers, nextConfig: e10.request.nextConfig });
        for (let e11 of [...o10.searchParams.keys()]) {
          let t11 = o10.searchParams.getAll(e11), r10 = function(e12) {
            for (let t12 of ["nxtP", "nxtI"])
              if (e12 !== t12 && e12.startsWith(t12))
                return e12.substring(t12.length);
            return null;
          }(e11);
          if (r10) {
            for (let e12 of (o10.searchParams.delete(r10), t11))
              o10.searchParams.append(r10, e12);
            o10.searchParams.delete(e11);
          }
        }
        let a2 = o10.buildId;
        o10.buildId = "";
        let c2 = function(e11) {
          let t11 = new Headers();
          for (let [r10, n11] of Object.entries(e11))
            for (let e12 of Array.isArray(n11) ? n11 : [n11])
              void 0 !== e12 && ("number" == typeof e12 && (e12 = e12.toString()), t11.append(r10, e12));
          return t11;
        }(e10.request.headers), l2 = c2.has("x-nextjs-data"), u2 = "1" === c2.get("RSC");
        l2 && "/index" === o10.pathname && (o10.pathname = "/");
        let h2 = /* @__PURE__ */ new Map();
        if (!s10)
          for (let e11 of Q) {
            let t11 = e11.toLowerCase(), r10 = c2.get(t11);
            null !== r10 && (h2.set(t11, r10), c2.delete(t11));
          }
        let d2 = new te({ page: e10.page, input: function(e11) {
          let t11 = "string" == typeof e11, r10 = t11 ? new URL(e11) : e11;
          return r10.searchParams.delete(ee), t11 ? r10.toString() : r10;
        }(o10).toString(), init: { body: e10.request.body, headers: c2, method: e10.request.method, nextConfig: e10.request.nextConfig, signal: e10.request.signal } });
        l2 && Object.defineProperty(d2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCache && e10.IncrementalCache && (globalThis.__incrementalCache = new e10.IncrementalCache({ appDir: true, fetchCache: true, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: e10.request.headers, requestProtocol: "https", getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: e9() }) }));
        let p2 = e10.request.waitUntil ?? (null == (t10 = function() {
          let e11 = globalThis[e7];
          return null == e11 ? void 0 : e11.get();
        }()) ? void 0 : t10.waitUntil), f2 = new P({ request: d2, page: e10.page, context: p2 ? { waitUntil: p2 } : void 0 });
        if ((n10 = await tr(d2, () => {
          if ("/middleware" === e10.page || "/src/middleware" === e10.page) {
            let t11 = f2.waitUntil.bind(f2), r10 = new e6();
            return ez().trace(eO.execute, { spanName: `middleware ${d2.method} ${d2.nextUrl.pathname}`, attributes: { "http.target": d2.nextUrl.pathname, "http.method": d2.method } }, async () => {
              try {
                var n11, s11, o11, c3, l3;
                let u3 = e9(), h3 = (l3 = d2.nextUrl, function(e11, t12, r11, n12, i11, s12, o12, a3, c4, l4, u4) {
                  function h4(e12) {
                    r11 && r11.setHeader("Set-Cookie", e12);
                  }
                  let d3 = {};
                  return { type: "request", phase: e11, implicitTags: s12 ?? [], url: { pathname: n12.pathname, search: n12.search ?? "" }, rootParams: i11, get headers() {
                    return d3.headers || (d3.headers = function(e12) {
                      let t13 = er.from(e12);
                      for (let e13 of Q)
                        t13.delete(e13.toLowerCase());
                      return er.seal(t13);
                    }(t12.headers)), d3.headers;
                  }, get cookies() {
                    if (!d3.cookies) {
                      let e12 = new H.RequestCookies(er.from(t12.headers));
                      eV(t12, e12), d3.cookies = eh.seal(e12);
                    }
                    return d3.cookies;
                  }, set cookies(value) {
                    d3.cookies = value;
                  }, get mutableCookies() {
                    if (!d3.mutableCookies) {
                      let e12 = function(e13, t13) {
                        let r12 = new H.RequestCookies(er.from(e13));
                        return ep.wrap(r12, t13);
                      }(t12.headers, o12 || (r11 ? h4 : void 0));
                      eV(t12, e12), d3.mutableCookies = e12;
                    }
                    return d3.mutableCookies;
                  }, get userspaceMutableCookies() {
                    return d3.userspaceMutableCookies || (d3.userspaceMutableCookies = function(e12) {
                      let t13 = new Proxy(e12, { get(e13, r12, n13) {
                        switch (r12) {
                          case "delete":
                            return function(...r13) {
                              return em("cookies().delete"), e13.delete(...r13), t13;
                            };
                          case "set":
                            return function(...r13) {
                              return em("cookies().set"), e13.set(...r13), t13;
                            };
                          default:
                            return J.get(e13, r12, n13);
                        }
                      } });
                      return t13;
                    }(this.mutableCookies)), d3.userspaceMutableCookies;
                  }, get draftMode() {
                    return d3.draftMode || (d3.draftMode = new eG(c4, t12, this.cookies, this.mutableCookies)), d3.draftMode;
                  }, renderResumeDataCache: a3 ?? null, isHmrRefresh: l4, serverComponentsHmrCache: u4 || globalThis.__serverComponentsHmrCache };
                }("action", d2, void 0, l3, {}, void 0, (e11) => {
                  i10 = e11;
                }, void 0, u3, false, void 0)), p3 = function({ page: e11, fallbackRouteParams: t12, renderOpts: r11, requestEndedState: n12, isPrefetchRequest: i11, buildId: s12 }) {
                  var o12;
                  let a3 = { isStaticGeneration: !r11.shouldWaitOnAllReady && !r11.supportsDynamicResponse && !r11.isDraftMode && !r11.isServerAction, page: e11, fallbackRouteParams: t12, route: (o12 = e11.split("/").reduce((e12, t13, r12, n13) => t13 ? "(" === t13[0] && t13.endsWith(")") || "@" === t13[0] || ("page" === t13 || "route" === t13) && r12 === n13.length - 1 ? e12 : e12 + "/" + t13 : e12, "")).startsWith("/") ? o12 : "/" + o12, incrementalCache: r11.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: r11.cacheLifeProfiles, isRevalidate: r11.isRevalidate, isPrerendering: r11.nextExport, fetchCache: r11.fetchCache, isOnDemandRevalidate: r11.isOnDemandRevalidate, isDraftMode: r11.isDraftMode, requestEndedState: n12, isPrefetchRequest: i11, buildId: s12, reactLoadableManifest: (null == r11 ? void 0 : r11.reactLoadableManifest) || {}, assetPrefix: (null == r11 ? void 0 : r11.assetPrefix) || "", afterContext: function(e12) {
                    let { waitUntil: t13, onClose: r12, onAfterTaskError: n13 } = e12;
                    return new e4({ waitUntil: t13, onClose: r12, onTaskError: n13 });
                  }(r11), dynamicIOEnabled: r11.experimental.dynamicIO, dev: r11.dev ?? false };
                  return r11.store = a3, a3;
                }({ page: "/", fallbackRouteParams: null, renderOpts: { cacheLifeProfiles: null == (s11 = e10.request.nextConfig) ? void 0 : null == (n11 = s11.experimental) ? void 0 : n11.cacheLife, experimental: { isRoutePPREnabled: false, dynamicIO: false, authInterrupts: !!(null == (c3 = e10.request.nextConfig) ? void 0 : null == (o11 = c3.experimental) ? void 0 : o11.authInterrupts) }, supportsDynamicResponse: true, waitUntil: t11, onClose: r10.onClose.bind(r10), onAfterTaskError: void 0 }, requestEndedState: { ended: false }, isPrefetchRequest: d2.headers.has(Z), buildId: a2 ?? "" });
                return await ea.run(p3, () => ec.run(h3, e10.handler, d2, f2));
              } finally {
                setTimeout(() => {
                  r10.dispatchClose();
                }, 0);
              }
            });
          }
          return e10.handler(d2, f2);
        })) && !(n10 instanceof Response))
          throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        n10 && i10 && n10.headers.set("set-cookie", i10);
        let m2 = null == n10 ? void 0 : n10.headers.get("x-middleware-rewrite");
        if (n10 && m2 && (u2 || !s10)) {
          let t11 = new q(m2, { forceLocale: true, headers: e10.request.headers, nextConfig: e10.request.nextConfig });
          s10 || t11.host !== d2.nextUrl.host || (t11.buildId = a2 || t11.buildId, n10.headers.set("x-middleware-rewrite", String(t11)));
          let { url: r10, isRelative: i11 } = Y(t11.toString(), o10.toString());
          !s10 && l2 && n10.headers.set("x-nextjs-rewrite", r10), u2 && i11 && (o10.pathname !== t11.pathname && n10.headers.set("x-nextjs-rewritten-path", t11.pathname), o10.search !== t11.search && n10.headers.set("x-nextjs-rewritten-query", t11.search.slice(1)));
        }
        let w2 = null == n10 ? void 0 : n10.headers.get("Location");
        if (n10 && w2 && !s10) {
          let t11 = new q(w2, { forceLocale: false, headers: e10.request.headers, nextConfig: e10.request.nextConfig });
          n10 = new Response(n10.body, n10), t11.host === o10.host && (t11.buildId = a2 || t11.buildId, n10.headers.set("Location", t11.toString())), l2 && (n10.headers.delete("Location"), n10.headers.set("x-nextjs-redirect", Y(t11.toString(), o10.toString()).url));
        }
        let y2 = n10 || X.next(), b2 = y2.headers.get("x-middleware-override-headers"), v2 = [];
        if (b2) {
          for (let [e11, t11] of h2)
            y2.headers.set(`x-middleware-request-${e11}`, t11), v2.push(e11);
          v2.length > 0 && y2.headers.set("x-middleware-override-headers", b2 + "," + v2.join(","));
        }
        return { response: y2, waitUntil: ("internal" === f2[T].kind ? Promise.all(f2[T].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: d2.fetchMetrics };
      }
      r(280), "undefined" == typeof URLPattern || URLPattern;
      var ts = r(815);
      class to extends Error {
        constructor(e10) {
          super("Dynamic server usage: " + e10), this.description = e10, this.digest = "DYNAMIC_SERVER_USAGE";
        }
      }
      class ta extends Error {
        constructor(...e10) {
          super(...e10), this.code = "NEXT_STATIC_GEN_BAILOUT";
        }
      }
      class tc extends Error {
        constructor(e10) {
          super(`During prerendering, ${e10} rejects when the prerender is complete. Typically these errors are handled by React but if you move ${e10} to a different context by using \`setTimeout\`, \`after\`, or similar functions you may observe this error and you should handle it in that context.`), this.expression = e10, this.digest = "HANGING_PROMISE_REJECTION";
        }
      }
      function tl() {
      }
      let tu = "function" == typeof ts.unstable_postpone;
      function th(e10, t10, r10, n10) {
        let i10 = n10.dynamicTracking;
        throw i10 && null === i10.syncDynamicErrorWithStack && (i10.syncDynamicExpression = t10, i10.syncDynamicErrorWithStack = r10, true === n10.validating && (i10.syncDynamicLogged = true)), function(e11, t11, r11) {
          let n11 = tp(`Route ${e11} needs to bail out of prerendering at this point because it used ${t11}.`);
          r11.controller.abort(n11);
          let i11 = r11.dynamicTracking;
          i11 && i11.dynamicAccesses.push({ stack: i11.isDebugDynamicAccesses ? Error().stack : void 0, expression: t11 });
        }(e10, t10, n10), tp(`Route ${e10} needs to bail out of prerendering at this point because it used ${t10}.`);
      }
      function td(e10, t10) {
        return `Route ${e10} needs to bail out of prerendering at this point because it used ${t10}. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error`;
      }
      if (false === function(e10) {
        return e10.includes("needs to bail out of prerendering at this point because it used") && e10.includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error");
      }(td("%%%", "^^^")))
        throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      function tp(e10) {
        let t10 = Object.defineProperty(Error(e10), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        return t10.digest = "NEXT_PRERENDER_INTERRUPTED", t10;
      }
      RegExp(`\\n\\s+at __next_metadata_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_viewport_boundary__[\\n\\s]`), RegExp(`\\n\\s+at __next_outlet_boundary__[\\n\\s]`), /* @__PURE__ */ new WeakMap();
      var tf = r(7), tm = {}, tw = Array.from({ length: 64 });
      for (let e10 = 0; e10 + 65 <= 90; e10++) {
        let t10 = String.fromCharCode(e10 + 65);
        tm[t10] = e10, tw[e10] = t10;
      }
      for (let e10 = 0; e10 + 97 <= 122; e10++) {
        let t10 = String.fromCharCode(e10 + 97), r10 = e10 + 26;
        tm[t10] = r10, tw[r10] = t10;
      }
      for (let e10 = 0; e10 < 10; e10++) {
        tm[e10.toString(10)] = e10 + 52;
        let t10 = e10.toString(10), r10 = e10 + 52;
        tm[t10] = r10, tw[r10] = t10;
      }
      tm["-"] = 62, tw[62] = "-", tm._ = 63, tw[63] = "_";
      var ty = (e10) => new TextEncoder().encode(e10), tg = (e10) => new TextDecoder().decode(e10), tb = (e10) => {
        let t10 = e10 + "=".repeat((4 - e10.length % 4) % 4), r10 = t10.length / 4 * 3;
        t10.endsWith("==") ? r10 -= 2 : t10.endsWith("=") && r10--;
        let n10 = new ArrayBuffer(r10), i10 = new DataView(n10);
        for (let e11 = 0; e11 < t10.length; e11 += 4) {
          let r11 = 0, n11 = 0;
          for (let i11 = e11, s11 = e11 + 3; i11 <= s11; i11++)
            if ("=" === t10[i11])
              r11 >>= 6;
            else {
              if (!(t10[i11] in tm))
                throw TypeError(`Invalid character ${t10[i11]} in base64 string.`);
              r11 |= tm[t10[i11]] << (s11 - i11) * 6, n11 += 6;
            }
          let s10 = e11 / 4 * 3;
          r11 >>= n11 % 8;
          let o10 = Math.floor(n11 / 8);
          for (let e12 = 0; e12 < o10; e12++) {
            let t11 = (o10 - e12 - 1) * 8;
            i10.setUint8(s10 + e12, (r11 & 255 << t11) >> t11);
          }
        }
        return new Uint8Array(n10);
      }, tv = (e10) => {
        let t10 = "string" == typeof e10 ? ty(e10) : e10, r10 = "";
        for (let e11 = 0; e11 < t10.length; e11 += 3) {
          let n10 = 0, i10 = 0;
          for (let r11 = e11, s11 = Math.min(e11 + 3, t10.length); r11 < s11; r11++)
            n10 |= t10[r11] << (s11 - r11 - 1) * 8, i10 += 8;
          let s10 = Math.ceil(i10 / 6);
          n10 <<= 6 * s10 - i10;
          for (let e12 = 1; e12 <= s10; e12++) {
            let t11 = (s10 - e12) * 6;
            r10 += tw[(n10 & 63 << t11) >> t11];
          }
        }
        return r10;
      }, tx = { encryption: { saltBits: 256, algorithm: "aes-256-cbc", iterations: 1, minPasswordlength: 32 }, integrity: { saltBits: 256, algorithm: "sha256", iterations: 1, minPasswordlength: 32 }, ttl: 0, timestampSkewSec: 60, localtimeOffsetMsec: 0 }, tE = (e10) => ({ ...e10, encryption: { ...e10.encryption }, integrity: { ...e10.integrity } }), t_ = { "aes-128-ctr": { keyBits: 128, ivBits: 128, name: "AES-CTR" }, "aes-256-cbc": { keyBits: 256, ivBits: 128, name: "AES-CBC" }, sha256: { keyBits: 256, name: "SHA-256" } }, tS = "Fe26.2", tR = (e10, t10) => {
        let r10 = new Uint8Array(t10);
        return e10.getRandomValues(r10), r10;
      }, tk = (e10, t10) => {
        if (t10 < 1)
          throw Error("Invalid random bits count");
        return tR(e10, Math.ceil(t10 / 8));
      }, tO = async (e10, t10, r10, n10, i10, s10) => {
        let o10 = ty(t10), a2 = await e10.subtle.importKey("raw", o10, { name: "PBKDF2" }, false, ["deriveBits"]), c2 = ty(r10);
        return await e10.subtle.deriveBits({ name: "PBKDF2", hash: s10, salt: c2, iterations: n10 }, a2, 8 * i10);
      }, tA = async (e10, t10, r10) => {
        var n10;
        if (!(null == t10 ? void 0 : t10.length))
          throw Error("Empty password");
        if (null == r10 || "object" != typeof r10)
          throw Error("Bad options");
        if (!(r10.algorithm in t_))
          throw Error(`Unknown algorithm: ${r10.algorithm}`);
        let i10 = t_[r10.algorithm], s10 = {}, o10 = null != (n10 = r10.hmac) && n10, a2 = o10 ? { name: "HMAC", hash: i10.name } : { name: i10.name }, c2 = o10 ? ["sign", "verify"] : ["encrypt", "decrypt"];
        if ("string" == typeof t10) {
          if (t10.length < r10.minPasswordlength)
            throw Error(`Password string too short (min ${r10.minPasswordlength} characters required)`);
          let { salt: n11 = "" } = r10;
          if (!n11) {
            let { saltBits: t11 = 0 } = r10;
            if (!t11)
              throw Error("Missing salt and saltBits options");
            n11 = [...new Uint8Array(tk(e10, t11))].map((e11) => e11.toString(16).padStart(2, "0")).join("");
          }
          let o11 = await tO(e10, t10, n11, r10.iterations, i10.keyBits / 8, "SHA-1");
          s10.key = await e10.subtle.importKey("raw", o11, a2, false, c2), s10.salt = n11;
        } else {
          if (t10.length < i10.keyBits / 8)
            throw Error("Key buffer (password) too small");
          s10.key = await e10.subtle.importKey("raw", t10, a2, false, c2), s10.salt = "";
        }
        return r10.iv ? s10.iv = r10.iv : "ivBits" in i10 && (s10.iv = tk(e10, i10.ivBits)), s10;
      }, tT = (e10, t10, r10) => ["aes-128-ctr" === e10 ? { name: "AES-CTR", counter: t10.iv, length: 128 } : { name: "AES-CBC", iv: t10.iv }, t10.key, "string" == typeof r10 ? ty(r10) : r10], tC = async (e10, t10, r10, n10) => {
        let i10 = await tA(e10, t10, r10);
        return { encrypted: new Uint8Array(await e10.subtle.encrypt(...tT(r10.algorithm, i10, n10))), key: i10 };
      }, tP = async (e10, t10, r10, n10) => {
        let i10 = await tA(e10, t10, r10);
        return tg(new Uint8Array(await e10.subtle.decrypt(...tT(r10.algorithm, i10, n10))));
      }, tI = async (e10, t10, r10, n10) => {
        let i10 = await tA(e10, t10, { ...r10, hmac: true }), s10 = ty(n10);
        return { digest: tv(new Uint8Array(await e10.subtle.sign({ name: "HMAC" }, i10.key, s10))), salt: i10.salt };
      }, tN = (e10) => "string" == typeof e10 || e10 instanceof Uint8Array ? { encryption: e10, integrity: e10 } : "secret" in e10 ? { id: e10.id, encryption: e10.secret, integrity: e10.secret } : { id: e10.id, encryption: e10.encryption, integrity: e10.integrity }, tD = async (e10, t10, r10, n10) => {
        if (!r10)
          throw Error("Empty password");
        let i10 = tE(n10), s10 = Date.now() + (i10.localtimeOffsetMsec || 0), o10 = JSON.stringify(t10), { id: a2 = "", encryption: c2, integrity: l2 } = tN(r10);
        if (a2 && !/^\w+$/.test(a2))
          throw Error("Invalid password id");
        let { encrypted: u2, key: h2 } = await tC(e10, c2, i10.encryption, o10), d2 = tv(new Uint8Array(u2)), p2 = tv(h2.iv), f2 = i10.ttl ? s10 + i10.ttl : "", m2 = `${tS}*${a2}*${h2.salt}*${p2}*${d2}*${f2}`, w2 = await tI(e10, l2, i10.integrity, m2);
        return `${m2}*${w2.salt}*${w2.digest}`;
      }, tM = (e10, t10) => {
        let r10 = +(e10.length !== t10.length);
        r10 && (t10 = e10);
        for (let n10 = 0; n10 < e10.length; n10 += 1)
          r10 |= e10.charCodeAt(n10) ^ t10.charCodeAt(n10);
        return 0 === r10;
      }, tj = async (e10, t10, r10, n10) => {
        if (!r10)
          throw Error("Empty password");
        let i10 = tE(n10), s10 = Date.now() + (i10.localtimeOffsetMsec || 0), o10 = t10.split("*");
        if (8 !== o10.length)
          throw Error("Incorrect number of sealed components");
        let a2 = o10[0], c2 = o10[1], l2 = o10[2], u2 = o10[3], h2 = o10[4], d2 = o10[5], p2 = o10[6], f2 = o10[7], m2 = `${a2}*${c2}*${l2}*${u2}*${h2}*${d2}`;
        if (tS !== a2)
          throw Error("Wrong mac prefix");
        if (d2) {
          if (!/^\d+$/.test(d2))
            throw Error("Invalid expiration");
          if (Number.parseInt(d2, 10) <= s10 - 1e3 * i10.timestampSkewSec)
            throw Error("Expired seal");
        }
        let w2 = "";
        if (c2 = c2 || "default", "string" == typeof r10 || r10 instanceof Uint8Array)
          w2 = r10;
        else if (c2 in r10)
          w2 = r10[c2];
        else
          throw Error(`Cannot find password: ${c2}`);
        w2 = tN(w2);
        let y2 = i10.integrity;
        if (y2.salt = p2, !tM((await tI(e10, w2.integrity, y2, m2)).digest, f2))
          throw Error("Bad hmac value");
        let g2 = tb(h2), b2 = i10.encryption;
        b2.salt = l2, b2.iv = tb(u2);
        let v2 = await tP(e10, w2.encryption, b2, g2);
        return v2 ? JSON.parse(v2) : null;
      };
      let tL = globalThis.crypto, tU = tL.subtle, tW = () => tL.randomUUID(), tB = (e10) => tL.getRandomValues(e10), t$ = { randomUUID: tW, getRandomValues: tB, subtle: tU };
      var tq = { ttl: 1209600, cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } };
      function tH(e10) {
        return "string" == typeof e10 ? { 1: e10 } : e10;
      }
      function tK(e10, t10) {
        if ("headers" in e10 && "function" == typeof e10.headers.append) {
          e10.headers.append("set-cookie", t10);
          return;
        }
        let r10 = e10.getHeader("set-cookie") ?? [];
        Array.isArray(r10) || (r10 = [r10.toString()]), e10.setHeader("set-cookie", [...r10, t10]);
      }
      function tz(e10) {
        let t10 = { ...tq, ...e10, cookieOptions: { ...tq.cookieOptions, ...e10.cookieOptions || {} } };
        if (e10.cookieOptions && "maxAge" in e10.cookieOptions)
          void 0 === e10.cookieOptions.maxAge && (t10.ttl = 0);
        else {
          var r10;
          t10.cookieOptions.maxAge = 0 === (r10 = t10.ttl) ? 2147483647 : r10 - 60;
        }
        return t10;
      }
      var tJ = "iron-session: Bad usage: use getIronSession(req, res, options) or getIronSession(cookieStore, options).";
      async function tG(e10, t10, r10, n10) {
        if (!t10.cookieName)
          throw Error("iron-session: Bad usage. Missing cookie name.");
        if (!t10.password)
          throw Error("iron-session: Bad usage. Missing password.");
        let i10 = tH(t10.password);
        if (Object.values(i10).some((e11) => e11.length < 32))
          throw Error("iron-session: Bad usage. Password must be at least 32 characters long.");
        let s10 = tz(t10), o10 = function(e11, t11) {
          let r11 = t11.get(e11), n11 = r11?.value;
          return "string" == typeof n11 ? n11 : "";
        }(s10.cookieName, e10), a2 = o10 ? await n10(o10, { password: i10, ttl: s10.ttl }) : {};
        return Object.defineProperties(a2, { updateConfig: { value: function(e11) {
          s10 = tz(e11);
        } }, save: { value: async function() {
          let t11 = await r10(a2, { password: i10, ttl: s10.ttl }), n11 = s10.cookieName.length + t11.length + JSON.stringify(s10.cookieOptions).length;
          if (n11 > 4096)
            throw Error(`iron-session: Cookie length is too big (${n11} bytes), browsers will refuse it. Try to remove some data.`);
          e10.set(s10.cookieName, t11, s10.cookieOptions);
        } }, destroy: { value: function() {
          Object.keys(a2).forEach((e11) => {
            delete a2[e11];
          });
          let t11 = { ...s10.cookieOptions, maxAge: 0 };
          e10.set(s10.cookieName, "", t11);
        } } }), a2;
      }
      var tV = function(e10, t10) {
        return r10;
        async function r10(r11, n10, i10) {
          var s10;
          if (!r11 || !n10)
            throw Error(tJ);
          if (!i10)
            return tG(r11, n10, e10, t10);
          if (!i10)
            throw Error(tJ);
          if (!i10.cookieName)
            throw Error("iron-session: Bad usage. Missing cookie name.");
          if (!i10.password)
            throw Error("iron-session: Bad usage. Missing password.");
          let o10 = tH(i10.password);
          if (Object.values(o10).some((e11) => e11.length < 32))
            throw Error("iron-session: Bad usage. Password must be at least 32 characters long.");
          let a2 = tz(i10), c2 = (s10 = a2.cookieName, (0, tf.q)(("headers" in r11 && "function" == typeof r11.headers.get ? r11.headers.get("cookie") : r11.headers.cookie) ?? "")[s10] ?? ""), l2 = c2 ? await t10(c2, { password: o10, ttl: a2.ttl }) : {};
          return Object.defineProperties(l2, { updateConfig: { value: function(e11) {
            a2 = tz(e11);
          } }, save: { value: async function() {
            if ("headersSent" in n10 && n10.headersSent)
              throw Error("iron-session: Cannot set session cookie: session.save() was called after headers were sent. Make sure to call it before any res.send() or res.end()");
            let t11 = await e10(l2, { password: o10, ttl: a2.ttl }), r12 = (0, tf.l)(a2.cookieName, t11, a2.cookieOptions);
            if (r12.length > 4096)
              throw Error(`iron-session: Cookie length is too big (${r12.length} bytes), browsers will refuse it. Try to remove some data.`);
            tK(n10, r12);
          } }, destroy: { value: function() {
            Object.keys(l2).forEach((e11) => {
              delete l2[e11];
            }), tK(n10, (0, tf.l)(a2.cookieName, "", { ...a2.cookieOptions, maxAge: 0 }));
          } } }), l2;
        }
      }(async function(e10, { password: t10, ttl: r10 = 1209600 }) {
        let n10 = tH(t10), i10 = Math.max(...Object.keys(n10).map(Number)), s10 = { id: i10.toString(), secret: n10[i10] }, o10 = await tD(h, e10, s10, { ...tx, ttl: 1e3 * r10 });
        return `${o10}~2`;
      }, async function(e10, { password: t10, ttl: r10 = 1209600 }) {
        let n10 = tH(t10), { sealWithoutVersion: i10, tokenVersion: s10 } = function(e11) {
          let [t11, r11] = e11.split("~");
          return { sealWithoutVersion: t11, tokenVersion: null == r11 ? null : parseInt(r11, 10) };
        }(e10);
        try {
          let e11 = await tj(h, i10, n10, { ...tx, ttl: 1e3 * r10 }) ?? {};
          if (2 === s10)
            return e11;
          return { ...e11.persistent };
        } catch (e11) {
          if (e11 instanceof Error && /^(Expired seal|Bad hmac value|Cannot find password|Incorrect number of sealed components)/.test(e11.message))
            return {};
          throw e11;
        }
      });
      let tF = { current: null }, tX = "function" == typeof ts.cache ? ts.cache : (e10) => e10, tY = console.warn;
      function tZ(e10) {
        return function(...t10) {
          tY(e10(...t10));
        };
      }
      tX((e10) => {
        try {
          tY(tF.current);
        } finally {
          tF.current = null;
        }
      });
      let tQ = /* @__PURE__ */ new WeakMap();
      function t0(e10) {
        let t10 = tQ.get(e10);
        if (t10)
          return t10;
        let r10 = Promise.resolve(e10);
        return tQ.set(e10, r10), Object.defineProperties(r10, { [Symbol.iterator]: { value: e10[Symbol.iterator] ? e10[Symbol.iterator].bind(e10) : t5.bind(e10) }, size: { get: () => e10.size }, get: { value: e10.get.bind(e10) }, getAll: { value: e10.getAll.bind(e10) }, has: { value: e10.has.bind(e10) }, set: { value: e10.set.bind(e10) }, delete: { value: e10.delete.bind(e10) }, clear: { value: "function" == typeof e10.clear ? e10.clear.bind(e10) : t4.bind(e10, r10) }, toString: { value: e10.toString.bind(e10) } }), r10;
      }
      function t1(e10) {
        return "object" == typeof e10 && null !== e10 && "string" == typeof e10.name ? `'${e10.name}'` : "string" == typeof e10 ? `'${e10}'` : "...";
      }
      let t2 = tZ(t3);
      function t3(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`cookies()\` should be awaited before using its value. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E223", enumerable: false, configurable: true });
      }
      function t5() {
        return this.getAll().map((e10) => [e10.name, e10]).values();
      }
      function t4(e10) {
        for (let e11 of this.getAll())
          this.delete(e11.name);
        return e10;
      }
      let t8 = /* @__PURE__ */ new WeakMap(), t6 = tZ(function(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`headers()\` should be awaited before using its value. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E277", enumerable: false, configurable: true });
      });
      /* @__PURE__ */ new WeakMap();
      class t9 {
        constructor(e10) {
          this._provider = e10;
        }
        get isEnabled() {
          return null !== this._provider && this._provider.isEnabled;
        }
        enable() {
          re("draftMode().enable()"), null !== this._provider && this._provider.enable();
        }
        disable() {
          re("draftMode().disable()"), null !== this._provider && this._provider.disable();
        }
      }
      let t7 = tZ(function(e10, t10) {
        let r10 = e10 ? `Route "${e10}" ` : "This route ";
        return Object.defineProperty(Error(`${r10}used ${t10}. \`draftMode()\` should be awaited before using its value. Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", { value: "E377", enumerable: false, configurable: true });
      });
      function re(e10) {
        let t10 = workAsyncStorage.getStore(), r10 = workUnitAsyncStorage.getStore();
        if (t10) {
          if (r10) {
            if ("cache" === r10.type)
              throw Object.defineProperty(Error(`Route ${t10.route} used "${e10}" inside "use cache". The enabled status of draftMode can be read in caches but you must not enable or disable draftMode inside a cache. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E246", enumerable: false, configurable: true });
            if ("unstable-cache" === r10.type)
              throw Object.defineProperty(Error(`Route ${t10.route} used "${e10}" inside a function cached with "unstable_cache(...)". The enabled status of draftMode can be read in caches but you must not enable or disable draftMode inside a cache. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", { value: "E259", enumerable: false, configurable: true });
            if ("after" === r10.phase)
              throw Object.defineProperty(Error(`Route ${t10.route} used "${e10}" inside \`after\`. The enabled status of draftMode can be read inside \`after\` but you cannot enable or disable draftMode. See more info here: https://nextjs.org/docs/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", { value: "E348", enumerable: false, configurable: true });
          }
          if (t10.dynamicShouldError)
            throw Object.defineProperty(new StaticGenBailoutError(`Route ${t10.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`${e10}\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", { value: "E553", enumerable: false, configurable: true });
          if (r10) {
            if ("prerender" === r10.type) {
              let n10 = Object.defineProperty(Error(`Route ${t10.route} used ${e10} without first calling \`await connection()\`. See more info here: https://nextjs.org/docs/messages/next-prerender-sync-headers`), "__NEXT_ERROR_CODE", { value: "E126", enumerable: false, configurable: true });
              abortAndThrowOnSynchronousRequestDataAccess(t10.route, e10, n10, r10);
            } else if ("prerender-ppr" === r10.type)
              postponeWithTracking(t10.route, e10, r10.dynamicTracking);
            else if ("prerender-legacy" === r10.type) {
              r10.revalidate = 0;
              let n10 = Object.defineProperty(new DynamicServerError(`Route ${t10.route} couldn't be rendered statically because it used \`${e10}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", { value: "E558", enumerable: false, configurable: true });
              throw t10.dynamicUsageDescription = e10, t10.dynamicUsageStack = n10.stack, n10;
            }
          }
        }
      }
      let rt = { password: process.env.IRON_SESSION_PASSWORD || "complex_password_at_least_32_characters_long", cookieName: "nuco_session", cookieOptions: { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 } };
      async function rr() {
        let e10 = await tV(await function() {
          let e11 = "cookies", t10 = ea.getStore(), r10 = ec.getStore();
          if (t10) {
            var n10, i10, s10, o10, a2;
            if (r10 && "after" === r10.phase && !function() {
              let e12 = e5.getStore();
              return (null == e12 ? void 0 : e12.rootTaskSpawnPhase) === "action";
            }())
              throw Object.defineProperty(Error(`Route ${t10.route} used "cookies" inside "after(...)". This is not supported. If you need this data inside an "after" callback, use "cookies" outside of the callback. See more info here: https://nextjs.org/docs/canary/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", { value: "E88", enumerable: false, configurable: true });
            if (t10.forceStatic)
              return t0(eh.seal(new H.RequestCookies(new Headers({}))));
            if (r10) {
              if ("cache" === r10.type)
                throw Object.defineProperty(Error(`Route ${t10.route} used "cookies" inside "use cache". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", { value: "E398", enumerable: false, configurable: true });
              if ("unstable-cache" === r10.type)
                throw Object.defineProperty(Error(`Route ${t10.route} used "cookies" inside a function cached with "unstable_cache(...)". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use "cookies" outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", { value: "E157", enumerable: false, configurable: true });
            }
            if (t10.dynamicShouldError)
              throw Object.defineProperty(new ta(`Route ${t10.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`cookies\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", { value: "E549", enumerable: false, configurable: true });
            if (r10) {
              if ("prerender" === r10.type)
                return function(e12, t11) {
                  let r11 = tQ.get(t11);
                  if (r11)
                    return r11;
                  let n11 = function(e13, t12) {
                    let r12 = new Promise((r13, n12) => {
                      e13.addEventListener("abort", () => {
                        n12(new tc(t12));
                      }, { once: true });
                    });
                    return r12.catch(tl), r12;
                  }(t11.renderSignal, "`cookies()`");
                  return tQ.set(t11, n11), Object.defineProperties(n11, { [Symbol.iterator]: { value: function() {
                    let r12 = "`cookies()[Symbol.iterator]()`", n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, size: { get() {
                    let r12 = "`cookies().size`", n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, get: { value: function() {
                    let r12;
                    r12 = 0 == arguments.length ? "`cookies().get()`" : `\`cookies().get(${t1(arguments[0])})\``;
                    let n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, getAll: { value: function() {
                    let r12;
                    r12 = 0 == arguments.length ? "`cookies().getAll()`" : `\`cookies().getAll(${t1(arguments[0])})\``;
                    let n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, has: { value: function() {
                    let r12;
                    r12 = 0 == arguments.length ? "`cookies().has()`" : `\`cookies().has(${t1(arguments[0])})\``;
                    let n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, set: { value: function() {
                    let r12;
                    if (0 == arguments.length)
                      r12 = "`cookies().set()`";
                    else {
                      let e13 = arguments[0];
                      r12 = e13 ? `\`cookies().set(${t1(e13)}, ...)\`` : "`cookies().set(...)`";
                    }
                    let n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, delete: { value: function() {
                    let r12;
                    r12 = 0 == arguments.length ? "`cookies().delete()`" : 1 == arguments.length ? `\`cookies().delete(${t1(arguments[0])})\`` : `\`cookies().delete(${t1(arguments[0])}, ...)\``;
                    let n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, clear: { value: function() {
                    let r12 = "`cookies().clear()`", n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } }, toString: { value: function() {
                    let r12 = "`cookies().toString()`", n12 = t3(e12, r12);
                    th(e12, r12, n12, t11);
                  } } }), n11;
                }(t10.route, r10);
              "prerender-ppr" === r10.type ? (n10 = t10.route, i10 = e11, s10 = r10.dynamicTracking, function() {
                if (!tu)
                  throw Object.defineProperty(Error("Invariant: React.unstable_postpone is not defined. This suggests the wrong version of React was loaded. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E224", enumerable: false, configurable: true });
              }(), s10 && s10.dynamicAccesses.push({ stack: s10.isDebugDynamicAccesses ? Error().stack : void 0, expression: i10 }), ts.unstable_postpone(td(n10, i10))) : "prerender-legacy" === r10.type && function(e12, t11, r11) {
                let n11 = Object.defineProperty(new to(`Route ${t11.route} couldn't be rendered statically because it used \`${e12}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", { value: "E558", enumerable: false, configurable: true });
                throw r11.revalidate = 0, t11.dynamicUsageDescription = e12, t11.dynamicUsageStack = n11.stack, n11;
              }(e11, t10, r10);
            }
            o10 = 0, (a2 = r10) && "cache" !== a2.type && "unstable-cache" !== a2.type && ("prerender" === a2.type || "prerender-legacy" === a2.type) && (a2.revalidate = 0);
          }
          let c2 = el(e11);
          return t0(ef(c2) ? c2.userspaceMutableCookies : c2.cookies);
        }(), rt);
        return e10.isLoggedIn || (e10.isLoggedIn = false), e10;
      }
      async function rn(e10) {
        if (!(!["POST", "PUT", "PATCH", "DELETE"].includes(e10.method) || e10.nextUrl.pathname.startsWith("/api/auth")))
          try {
            var t10;
            let r10 = await rr();
            if (!r10.isLoggedIn)
              return;
            if (t10 = e10.headers.get("x-csrf-token") || void 0, !r10.csrfToken || !t10 || r10.csrfToken !== t10)
              return X.json({ error: "Invalid CSRF token" }, { status: 403 });
            return;
          } catch (e11) {
            return X.json({ error: "CSRF validation failed" }, { status: 403 });
          }
      }
      var ri = r(144), rs = r(238), ro = r(615), ra = Object.defineProperty;
      ((e10, t10) => {
        for (var r10 in t10)
          ra(e10, r10, { get: t10[r10], enumerable: true });
      })({}, { UpstashError: () => rc, UrlError: () => rl });
      var rc = class extends Error {
        constructor(e10) {
          super(e10), this.name = "UpstashError";
        }
      }, rl = class extends Error {
        constructor(e10) {
          super(`Upstash Redis client was passed an invalid URL. You should pass a URL starting with https. Received: "${e10}". `), this.name = "UrlError";
        }
      }, ru = class {
        baseUrl;
        headers;
        options;
        readYourWrites;
        upstashSyncToken = "";
        hasCredentials;
        retry;
        constructor(e10) {
          if (this.options = { backend: e10.options?.backend, agent: e10.agent, responseEncoding: e10.responseEncoding ?? "base64", cache: e10.cache, signal: e10.signal, keepAlive: e10.keepAlive ?? true }, this.upstashSyncToken = "", this.readYourWrites = e10.readYourWrites ?? true, this.baseUrl = (e10.baseUrl || "").replace(/\/$/, ""), this.baseUrl && !/^https?:\/\/[^\s#$./?].\S*$/.test(this.baseUrl))
            throw new rl(this.baseUrl);
          this.headers = { "Content-Type": "application/json", ...e10.headers }, this.hasCredentials = !!(this.baseUrl && this.headers.authorization.split(" ")[1]), "base64" === this.options.responseEncoding && (this.headers["Upstash-Encoding"] = "base64"), this.retry = "boolean" != typeof e10.retry || e10.retry ? { attempts: e10.retry?.retries ?? 5, backoff: e10.retry?.backoff ?? ((e11) => 50 * Math.exp(e11)) } : { attempts: 1, backoff: () => 0 };
        }
        mergeTelemetry(e10) {
          this.headers = rp(this.headers, "Upstash-Telemetry-Runtime", e10.runtime), this.headers = rp(this.headers, "Upstash-Telemetry-Platform", e10.platform), this.headers = rp(this.headers, "Upstash-Telemetry-Sdk", e10.sdk);
        }
        async request(e10) {
          let t10 = { cache: this.options.cache, method: "POST", headers: this.headers, body: JSON.stringify(e10.body), keepalive: this.options.keepAlive, agent: this.options.agent, signal: this.options.signal, backend: this.options.backend };
          if (this.hasCredentials || console.warn("[Upstash Redis] Redis client was initialized without url or token. Failed to execute command."), this.readYourWrites) {
            let e11 = this.upstashSyncToken;
            this.headers["upstash-sync-token"] = e11;
          }
          let r10 = null, n10 = null;
          for (let i11 = 0; i11 <= this.retry.attempts; i11++)
            try {
              r10 = await fetch([this.baseUrl, ...e10.path ?? []].join("/"), t10);
              break;
            } catch (e11) {
              if (this.options.signal?.aborted) {
                r10 = new Response(new Blob([JSON.stringify({ result: this.options.signal.reason ?? "Aborted" })]), { status: 200, statusText: this.options.signal.reason ?? "Aborted" });
                break;
              }
              n10 = e11, i11 < this.retry.attempts && await new Promise((e12) => setTimeout(e12, this.retry.backoff(i11)));
            }
          if (!r10)
            throw n10 ?? Error("Exhausted all retries");
          let i10 = await r10.json();
          if (!r10.ok)
            throw new rc(`${i10.error}, command was: ${JSON.stringify(e10.body)}`);
          if (this.readYourWrites) {
            let e11 = r10.headers;
            this.upstashSyncToken = e11.get("upstash-sync-token") ?? "";
          }
          if (this.readYourWrites) {
            let e11 = r10.headers;
            this.upstashSyncToken = e11.get("upstash-sync-token") ?? "";
          }
          return "base64" === this.options.responseEncoding ? Array.isArray(i10) ? i10.map(({ result: e11, error: t11 }) => ({ result: rd(e11), error: t11 })) : { result: rd(i10.result), error: i10.error } : i10;
        }
      };
      function rh(e10) {
        let t10 = "";
        try {
          let r10 = atob(e10), n10 = r10.length, i10 = new Uint8Array(n10);
          for (let e11 = 0; e11 < n10; e11++)
            i10[e11] = r10.charCodeAt(e11);
          t10 = new TextDecoder().decode(i10);
        } catch {
          t10 = e10;
        }
        return t10;
      }
      function rd(e10) {
        let t10;
        switch (typeof e10) {
          case "undefined":
            return e10;
          case "number":
            t10 = e10;
            break;
          case "object":
            t10 = Array.isArray(e10) ? e10.map((e11) => "string" == typeof e11 ? rh(e11) : Array.isArray(e11) ? e11.map((e12) => rd(e12)) : e11) : null;
            break;
          case "string":
            t10 = "OK" === e10 ? "OK" : rh(e10);
        }
        return t10;
      }
      function rp(e10, t10, r10) {
        return r10 && (e10[t10] = e10[t10] ? [e10[t10], r10].join(",") : r10), e10;
      }
      function rf(e10) {
        try {
          return function e11(t10) {
            let r10 = Array.isArray(t10) ? t10.map((t11) => {
              try {
                return e11(t11);
              } catch {
                return t11;
              }
            }) : JSON.parse(t10);
            return "number" == typeof r10 && r10.toString() !== t10 ? t10 : r10;
          }(e10);
        } catch {
          return e10;
        }
      }
      function rm(e10) {
        return [e10[0], ...rf(e10.slice(1))];
      }
      var rw = (e10) => {
        switch (typeof e10) {
          case "string":
          case "number":
          case "boolean":
            return e10;
          default:
            return JSON.stringify(e10);
        }
      }, ry = class {
        command;
        serialize;
        deserialize;
        constructor(e10, t10) {
          if (this.serialize = rw, this.deserialize = t10?.automaticDeserialization === void 0 || t10.automaticDeserialization ? t10?.deserialize ?? rf : (e11) => e11, this.command = e10.map((e11) => this.serialize(e11)), t10?.latencyLogging) {
            let e11 = this.exec.bind(this);
            this.exec = async (t11) => {
              let r10 = performance.now(), n10 = await e11(t11), i10 = (performance.now() - r10).toFixed(2);
              return console.log(`Latency for \x1B[38;2;19;185;39m${this.command[0].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${i10} ms\x1B[0m`), n10;
            };
          }
        }
        async exec(e10) {
          let { result: t10, error: r10 } = await e10.request({ body: this.command, upstashSyncToken: e10.upstashSyncToken });
          if (r10)
            throw new rc(r10);
          if (void 0 === t10)
            throw TypeError("Request did not return a result");
          return this.deserialize(t10);
        }
      }, rg = class extends ry {
        constructor(e10, t10) {
          let r10 = ["hrandfield", e10[0]];
          "number" == typeof e10[1] && r10.push(e10[1]), e10[2] && r10.push("WITHVALUES"), super(r10, { deserialize: e10[2] ? (e11) => function(e12) {
            if (0 === e12.length)
              return null;
            let t11 = {};
            for (; e12.length >= 2; ) {
              let r11 = e12.shift(), n10 = e12.shift();
              try {
                t11[r11] = JSON.parse(n10);
              } catch {
                t11[r11] = n10;
              }
            }
            return t11;
          }(e11) : t10?.deserialize, ...t10 });
        }
      }, rb = class extends ry {
        constructor(e10, t10) {
          super(["append", ...e10], t10);
        }
      }, rv = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["bitcount", e10];
          "number" == typeof t10 && i10.push(t10), "number" == typeof r10 && i10.push(r10), super(i10, n10);
        }
      }, rx = class {
        constructor(e10, t10, r10, n10 = (e11) => e11.exec(this.client)) {
          this.client = t10, this.opts = r10, this.execOperation = n10, this.command = ["bitfield", ...e10];
        }
        command;
        chain(...e10) {
          return this.command.push(...e10), this;
        }
        get(...e10) {
          return this.chain("get", ...e10);
        }
        set(...e10) {
          return this.chain("set", ...e10);
        }
        incrby(...e10) {
          return this.chain("incrby", ...e10);
        }
        overflow(e10) {
          return this.chain("overflow", e10);
        }
        exec() {
          let e10 = new ry(this.command, this.opts);
          return this.execOperation(e10);
        }
      }, rE = class extends ry {
        constructor(e10, t10) {
          super(["bitop", ...e10], t10);
        }
      }, r_ = class extends ry {
        constructor(e10, t10) {
          super(["bitpos", ...e10], t10);
        }
      }, rS = class extends ry {
        constructor([e10, t10, r10], n10) {
          super(["COPY", e10, t10, ...r10?.replace ? ["REPLACE"] : []], { ...n10, deserialize: (e11) => e11 > 0 ? "COPIED" : "NOT_COPIED" });
        }
      }, rR = class extends ry {
        constructor(e10) {
          super(["dbsize"], e10);
        }
      }, rk = class extends ry {
        constructor(e10, t10) {
          super(["decr", ...e10], t10);
        }
      }, rO = class extends ry {
        constructor(e10, t10) {
          super(["decrby", ...e10], t10);
        }
      }, rA = class extends ry {
        constructor(e10, t10) {
          super(["del", ...e10], t10);
        }
      }, rT = class extends ry {
        constructor(e10, t10) {
          super(["echo", ...e10], t10);
        }
      }, rC = class extends ry {
        constructor([e10, t10, r10], n10) {
          super(["eval", e10, t10.length, ...t10, ...r10 ?? []], n10);
        }
      }, rP = class extends ry {
        constructor([e10, t10, r10], n10) {
          super(["evalsha", e10, t10.length, ...t10, ...r10 ?? []], n10);
        }
      }, rI = class extends ry {
        constructor(e10, t10) {
          super(e10.map((e11) => "string" == typeof e11 ? e11 : String(e11)), t10);
        }
      }, rN = class extends ry {
        constructor(e10, t10) {
          super(["exists", ...e10], t10);
        }
      }, rD = class extends ry {
        constructor(e10, t10) {
          super(["expire", ...e10.filter(Boolean)], t10);
        }
      }, rM = class extends ry {
        constructor(e10, t10) {
          super(["expireat", ...e10], t10);
        }
      }, rj = class extends ry {
        constructor(e10, t10) {
          let r10 = ["flushall"];
          e10 && e10.length > 0 && e10[0].async && r10.push("async"), super(r10, t10);
        }
      }, rL = class extends ry {
        constructor([e10], t10) {
          let r10 = ["flushdb"];
          e10?.async && r10.push("async"), super(r10, t10);
        }
      }, rU = class extends ry {
        constructor([e10, t10, ...r10], n10) {
          let i10 = ["geoadd", e10];
          "nx" in t10 && t10.nx ? i10.push("nx") : "xx" in t10 && t10.xx && i10.push("xx"), "ch" in t10 && t10.ch && i10.push("ch"), "latitude" in t10 && t10.latitude && i10.push(t10.longitude, t10.latitude, t10.member), i10.push(...r10.flatMap(({ latitude: e11, longitude: t11, member: r11 }) => [t11, e11, r11])), super(i10, n10);
        }
      }, rW = class extends ry {
        constructor([e10, t10, r10, n10 = "M"], i10) {
          super(["GEODIST", e10, t10, r10, n10], i10);
        }
      }, rB = class extends ry {
        constructor(e10, t10) {
          let [r10] = e10;
          super(["GEOHASH", r10, ...Array.isArray(e10[1]) ? e10[1] : e10.slice(1)], t10);
        }
      }, r$ = class extends ry {
        constructor(e10, t10) {
          let [r10] = e10;
          super(["GEOPOS", r10, ...Array.isArray(e10[1]) ? e10[1] : e10.slice(1)], { deserialize: (e11) => function(e12) {
            let t11 = [];
            for (let r11 of e12)
              r11?.[0] && r11?.[1] && t11.push({ lng: Number.parseFloat(r11[0]), lat: Number.parseFloat(r11[1]) });
            return t11;
          }(e11), ...t10 });
        }
      }, rq = class extends ry {
        constructor([e10, t10, r10, n10, i10], s10) {
          let o10 = ["GEOSEARCH", e10];
          ("FROMMEMBER" === t10.type || "frommember" === t10.type) && o10.push(t10.type, t10.member), ("FROMLONLAT" === t10.type || "fromlonlat" === t10.type) && o10.push(t10.type, t10.coordinate.lon, t10.coordinate.lat), ("BYRADIUS" === r10.type || "byradius" === r10.type) && o10.push(r10.type, r10.radius, r10.radiusType), ("BYBOX" === r10.type || "bybox" === r10.type) && o10.push(r10.type, r10.rect.width, r10.rect.height, r10.rectType), o10.push(n10), i10?.count && o10.push("COUNT", i10.count.limit, ...i10.count.any ? ["ANY"] : []), super([...o10, ...i10?.withCoord ? ["WITHCOORD"] : [], ...i10?.withDist ? ["WITHDIST"] : [], ...i10?.withHash ? ["WITHHASH"] : []], { deserialize: (e11) => i10?.withCoord || i10?.withDist || i10?.withHash ? e11.map((e12) => {
            let t11 = 1, r11 = {};
            try {
              r11.member = JSON.parse(e12[0]);
            } catch {
              r11.member = e12[0];
            }
            return i10.withDist && (r11.dist = Number.parseFloat(e12[t11++])), i10.withHash && (r11.hash = e12[t11++].toString()), i10.withCoord && (r11.coord = { long: Number.parseFloat(e12[t11][0]), lat: Number.parseFloat(e12[t11][1]) }), r11;
          }) : e11.map((e12) => {
            try {
              return { member: JSON.parse(e12) };
            } catch {
              return { member: e12 };
            }
          }), ...s10 });
        }
      }, rH = class extends ry {
        constructor([e10, t10, r10, n10, i10, s10], o10) {
          let a2 = ["GEOSEARCHSTORE", e10, t10];
          ("FROMMEMBER" === r10.type || "frommember" === r10.type) && a2.push(r10.type, r10.member), ("FROMLONLAT" === r10.type || "fromlonlat" === r10.type) && a2.push(r10.type, r10.coordinate.lon, r10.coordinate.lat), ("BYRADIUS" === n10.type || "byradius" === n10.type) && a2.push(n10.type, n10.radius, n10.radiusType), ("BYBOX" === n10.type || "bybox" === n10.type) && a2.push(n10.type, n10.rect.width, n10.rect.height, n10.rectType), a2.push(i10), s10?.count && a2.push("COUNT", s10.count.limit, ...s10.count.any ? ["ANY"] : []), super([...a2, ...s10?.storeDist ? ["STOREDIST"] : []], o10);
        }
      }, rK = class extends ry {
        constructor(e10, t10) {
          super(["get", ...e10], t10);
        }
      }, rz = class extends ry {
        constructor(e10, t10) {
          super(["getbit", ...e10], t10);
        }
      }, rJ = class extends ry {
        constructor(e10, t10) {
          super(["getdel", ...e10], t10);
        }
      }, rG = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["getex", e10];
          t10 && ("ex" in t10 && "number" == typeof t10.ex ? n10.push("ex", t10.ex) : "px" in t10 && "number" == typeof t10.px ? n10.push("px", t10.px) : "exat" in t10 && "number" == typeof t10.exat ? n10.push("exat", t10.exat) : "pxat" in t10 && "number" == typeof t10.pxat ? n10.push("pxat", t10.pxat) : "persist" in t10 && t10.persist && n10.push("persist")), super(n10, r10);
        }
      }, rV = class extends ry {
        constructor(e10, t10) {
          super(["getrange", ...e10], t10);
        }
      }, rF = class extends ry {
        constructor(e10, t10) {
          super(["getset", ...e10], t10);
        }
      }, rX = class extends ry {
        constructor(e10, t10) {
          super(["hdel", ...e10], t10);
        }
      }, rY = class extends ry {
        constructor(e10, t10) {
          super(["hexists", ...e10], t10);
        }
      }, rZ = class extends ry {
        constructor(e10, t10) {
          super(["hget", ...e10], t10);
        }
      }, rQ = class extends ry {
        constructor(e10, t10) {
          super(["hgetall", ...e10], { deserialize: (e11) => function(e12) {
            if (0 === e12.length)
              return null;
            let t11 = {};
            for (; e12.length >= 2; ) {
              let r10 = e12.shift(), n10 = e12.shift();
              try {
                let e13 = !Number.isNaN(Number(n10)) && !Number.isSafeInteger(Number(n10));
                t11[r10] = e13 ? n10 : JSON.parse(n10);
              } catch {
                t11[r10] = n10;
              }
            }
            return t11;
          }(e11), ...t10 });
        }
      }, r0 = class extends ry {
        constructor(e10, t10) {
          super(["hincrby", ...e10], t10);
        }
      }, r1 = class extends ry {
        constructor(e10, t10) {
          super(["hincrbyfloat", ...e10], t10);
        }
      }, r2 = class extends ry {
        constructor([e10], t10) {
          super(["hkeys", e10], t10);
        }
      }, r3 = class extends ry {
        constructor(e10, t10) {
          super(["hlen", ...e10], t10);
        }
      }, r5 = class extends ry {
        constructor([e10, ...t10], r10) {
          super(["hmget", e10, ...t10], { deserialize: (e11) => function(e12, t11) {
            if (t11.every((e13) => null === e13))
              return null;
            let r11 = {};
            for (let [n10, i10] of e12.entries())
              try {
                r11[i10] = JSON.parse(t11[n10]);
              } catch {
                r11[i10] = t11[n10];
              }
            return r11;
          }(t10, e11), ...r10 });
        }
      }, r4 = class extends ry {
        constructor([e10, t10], r10) {
          super(["hmset", e10, ...Object.entries(t10).flatMap(([e11, t11]) => [e11, t11])], r10);
        }
      }, r8 = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["hscan", e10, t10];
          r10?.match && i10.push("match", r10.match), "number" == typeof r10?.count && i10.push("count", r10.count), super(i10, { deserialize: rm, ...n10 });
        }
      }, r6 = class extends ry {
        constructor([e10, t10], r10) {
          super(["hset", e10, ...Object.entries(t10).flatMap(([e11, t11]) => [e11, t11])], r10);
        }
      }, r9 = class extends ry {
        constructor(e10, t10) {
          super(["hsetnx", ...e10], t10);
        }
      }, r7 = class extends ry {
        constructor(e10, t10) {
          super(["hstrlen", ...e10], t10);
        }
      }, ne = class extends ry {
        constructor(e10, t10) {
          super(["hvals", ...e10], t10);
        }
      }, nt = class extends ry {
        constructor(e10, t10) {
          super(["incr", ...e10], t10);
        }
      }, nr = class extends ry {
        constructor(e10, t10) {
          super(["incrby", ...e10], t10);
        }
      }, nn = class extends ry {
        constructor(e10, t10) {
          super(["incrbyfloat", ...e10], t10);
        }
      }, ni = class extends ry {
        constructor(e10, t10) {
          super(["JSON.ARRAPPEND", ...e10], t10);
        }
      }, ns = class extends ry {
        constructor(e10, t10) {
          super(["JSON.ARRINDEX", ...e10], t10);
        }
      }, no = class extends ry {
        constructor(e10, t10) {
          super(["JSON.ARRINSERT", ...e10], t10);
        }
      }, na = class extends ry {
        constructor(e10, t10) {
          super(["JSON.ARRLEN", e10[0], e10[1] ?? "$"], t10);
        }
      }, nc = class extends ry {
        constructor(e10, t10) {
          super(["JSON.ARRPOP", ...e10], t10);
        }
      }, nl = class extends ry {
        constructor(e10, t10) {
          let r10 = e10[1] ?? "$";
          super(["JSON.ARRTRIM", e10[0], r10, e10[2] ?? 0, e10[3] ?? 0], t10);
        }
      }, nu = class extends ry {
        constructor(e10, t10) {
          super(["JSON.CLEAR", ...e10], t10);
        }
      }, nh = class extends ry {
        constructor(e10, t10) {
          super(["JSON.DEL", ...e10], t10);
        }
      }, nd = class extends ry {
        constructor(e10, t10) {
          super(["JSON.FORGET", ...e10], t10);
        }
      }, np = class extends ry {
        constructor(e10, t10) {
          let r10 = ["JSON.GET"];
          "string" == typeof e10[1] ? r10.push(...e10) : (r10.push(e10[0]), e10[1] && (e10[1].indent && r10.push("INDENT", e10[1].indent), e10[1].newline && r10.push("NEWLINE", e10[1].newline), e10[1].space && r10.push("SPACE", e10[1].space)), r10.push(...e10.slice(2))), super(r10, t10);
        }
      }, nf = class extends ry {
        constructor(e10, t10) {
          super(["JSON.MGET", ...e10[0], e10[1]], t10);
        }
      }, nm = class extends ry {
        constructor(e10, t10) {
          let r10 = ["JSON.MSET"];
          for (let t11 of e10)
            r10.push(t11.key, t11.path, t11.value);
          super(r10, t10);
        }
      }, nw = class extends ry {
        constructor(e10, t10) {
          super(["JSON.NUMINCRBY", ...e10], t10);
        }
      }, ny = class extends ry {
        constructor(e10, t10) {
          super(["JSON.NUMMULTBY", ...e10], t10);
        }
      }, ng = class extends ry {
        constructor(e10, t10) {
          super(["JSON.OBJKEYS", ...e10], t10);
        }
      }, nb = class extends ry {
        constructor(e10, t10) {
          super(["JSON.OBJLEN", ...e10], t10);
        }
      }, nv = class extends ry {
        constructor(e10, t10) {
          super(["JSON.RESP", ...e10], t10);
        }
      }, nx = class extends ry {
        constructor(e10, t10) {
          let r10 = ["JSON.SET", e10[0], e10[1], e10[2]];
          e10[3] && (e10[3].nx ? r10.push("NX") : e10[3].xx && r10.push("XX")), super(r10, t10);
        }
      }, nE = class extends ry {
        constructor(e10, t10) {
          super(["JSON.STRAPPEND", ...e10], t10);
        }
      }, n_ = class extends ry {
        constructor(e10, t10) {
          super(["JSON.STRLEN", ...e10], t10);
        }
      }, nS = class extends ry {
        constructor(e10, t10) {
          super(["JSON.TOGGLE", ...e10], t10);
        }
      }, nR = class extends ry {
        constructor(e10, t10) {
          super(["JSON.TYPE", ...e10], t10);
        }
      }, nk = class extends ry {
        constructor(e10, t10) {
          super(["keys", ...e10], t10);
        }
      }, nO = class extends ry {
        constructor(e10, t10) {
          super(["lindex", ...e10], t10);
        }
      }, nA = class extends ry {
        constructor(e10, t10) {
          super(["linsert", ...e10], t10);
        }
      }, nT = class extends ry {
        constructor(e10, t10) {
          super(["llen", ...e10], t10);
        }
      }, nC = class extends ry {
        constructor(e10, t10) {
          super(["lmove", ...e10], t10);
        }
      }, nP = class extends ry {
        constructor(e10, t10) {
          let [r10, n10, i10, s10] = e10;
          super(["LMPOP", r10, ...n10, i10, ...s10 ? ["COUNT", s10] : []], t10);
        }
      }, nI = class extends ry {
        constructor(e10, t10) {
          super(["lpop", ...e10], t10);
        }
      }, nN = class extends ry {
        constructor(e10, t10) {
          let r10 = ["lpos", e10[0], e10[1]];
          "number" == typeof e10[2]?.rank && r10.push("rank", e10[2].rank), "number" == typeof e10[2]?.count && r10.push("count", e10[2].count), "number" == typeof e10[2]?.maxLen && r10.push("maxLen", e10[2].maxLen), super(r10, t10);
        }
      }, nD = class extends ry {
        constructor(e10, t10) {
          super(["lpush", ...e10], t10);
        }
      }, nM = class extends ry {
        constructor(e10, t10) {
          super(["lpushx", ...e10], t10);
        }
      }, nj = class extends ry {
        constructor(e10, t10) {
          super(["lrange", ...e10], t10);
        }
      }, nL = class extends ry {
        constructor(e10, t10) {
          super(["lrem", ...e10], t10);
        }
      }, nU = class extends ry {
        constructor(e10, t10) {
          super(["lset", ...e10], t10);
        }
      }, nW = class extends ry {
        constructor(e10, t10) {
          super(["ltrim", ...e10], t10);
        }
      }, nB = class extends ry {
        constructor(e10, t10) {
          super(["mget", ...Array.isArray(e10[0]) ? e10[0] : e10], t10);
        }
      }, n$ = class extends ry {
        constructor([e10], t10) {
          super(["mset", ...Object.entries(e10).flatMap(([e11, t11]) => [e11, t11])], t10);
        }
      }, nq = class extends ry {
        constructor([e10], t10) {
          super(["msetnx", ...Object.entries(e10).flat()], t10);
        }
      }, nH = class extends ry {
        constructor(e10, t10) {
          super(["persist", ...e10], t10);
        }
      }, nK = class extends ry {
        constructor(e10, t10) {
          super(["pexpire", ...e10], t10);
        }
      }, nz = class extends ry {
        constructor(e10, t10) {
          super(["pexpireat", ...e10], t10);
        }
      }, nJ = class extends ry {
        constructor(e10, t10) {
          super(["pfadd", ...e10], t10);
        }
      }, nG = class extends ry {
        constructor(e10, t10) {
          super(["pfcount", ...e10], t10);
        }
      }, nV = class extends ry {
        constructor(e10, t10) {
          super(["pfmerge", ...e10], t10);
        }
      }, nF = class extends ry {
        constructor(e10, t10) {
          let r10 = ["ping"];
          e10?.[0] !== void 0 && r10.push(e10[0]), super(r10, t10);
        }
      }, nX = class extends ry {
        constructor(e10, t10) {
          super(["psetex", ...e10], t10);
        }
      }, nY = class extends ry {
        constructor(e10, t10) {
          super(["pttl", ...e10], t10);
        }
      }, nZ = class extends ry {
        constructor(e10, t10) {
          super(["publish", ...e10], t10);
        }
      }, nQ = class extends ry {
        constructor(e10) {
          super(["randomkey"], e10);
        }
      }, n0 = class extends ry {
        constructor(e10, t10) {
          super(["rename", ...e10], t10);
        }
      }, n1 = class extends ry {
        constructor(e10, t10) {
          super(["renamenx", ...e10], t10);
        }
      }, n2 = class extends ry {
        constructor(e10, t10) {
          super(["rpop", ...e10], t10);
        }
      }, n3 = class extends ry {
        constructor(e10, t10) {
          super(["rpush", ...e10], t10);
        }
      }, n5 = class extends ry {
        constructor(e10, t10) {
          super(["rpushx", ...e10], t10);
        }
      }, n4 = class extends ry {
        constructor(e10, t10) {
          super(["sadd", ...e10], t10);
        }
      }, n8 = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["scan", e10];
          t10?.match && n10.push("match", t10.match), "number" == typeof t10?.count && n10.push("count", t10.count), t10?.type && t10.type.length > 0 && n10.push("type", t10.type), super(n10, { deserialize: rm, ...r10 });
        }
      }, n6 = class extends ry {
        constructor(e10, t10) {
          super(["scard", ...e10], t10);
        }
      }, n9 = class extends ry {
        constructor(e10, t10) {
          super(["script", "exists", ...e10], { deserialize: (e11) => e11, ...t10 });
        }
      }, n7 = class extends ry {
        constructor([e10], t10) {
          let r10 = ["script", "flush"];
          e10?.sync ? r10.push("sync") : e10?.async && r10.push("async"), super(r10, t10);
        }
      }, ie = class extends ry {
        constructor(e10, t10) {
          super(["script", "load", ...e10], t10);
        }
      }, it = class extends ry {
        constructor(e10, t10) {
          super(["sdiff", ...e10], t10);
        }
      }, ir = class extends ry {
        constructor(e10, t10) {
          super(["sdiffstore", ...e10], t10);
        }
      }, ii = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["set", e10, t10];
          r10 && ("nx" in r10 && r10.nx ? i10.push("nx") : "xx" in r10 && r10.xx && i10.push("xx"), "get" in r10 && r10.get && i10.push("get"), "ex" in r10 && "number" == typeof r10.ex ? i10.push("ex", r10.ex) : "px" in r10 && "number" == typeof r10.px ? i10.push("px", r10.px) : "exat" in r10 && "number" == typeof r10.exat ? i10.push("exat", r10.exat) : "pxat" in r10 && "number" == typeof r10.pxat ? i10.push("pxat", r10.pxat) : "keepTtl" in r10 && r10.keepTtl && i10.push("keepTtl")), super(i10, n10);
        }
      }, is = class extends ry {
        constructor(e10, t10) {
          super(["setbit", ...e10], t10);
        }
      }, io = class extends ry {
        constructor(e10, t10) {
          super(["setex", ...e10], t10);
        }
      }, ia = class extends ry {
        constructor(e10, t10) {
          super(["setnx", ...e10], t10);
        }
      }, ic = class extends ry {
        constructor(e10, t10) {
          super(["setrange", ...e10], t10);
        }
      }, il = class extends ry {
        constructor(e10, t10) {
          super(["sinter", ...e10], t10);
        }
      }, iu = class extends ry {
        constructor(e10, t10) {
          super(["sinterstore", ...e10], t10);
        }
      }, ih = class extends ry {
        constructor(e10, t10) {
          super(["sismember", ...e10], t10);
        }
      }, id = class extends ry {
        constructor(e10, t10) {
          super(["smembers", ...e10], t10);
        }
      }, ip = class extends ry {
        constructor(e10, t10) {
          super(["smismember", e10[0], ...e10[1]], t10);
        }
      }, im = class extends ry {
        constructor(e10, t10) {
          super(["smove", ...e10], t10);
        }
      }, iw = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["spop", e10];
          "number" == typeof t10 && n10.push(t10), super(n10, r10);
        }
      }, iy = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["srandmember", e10];
          "number" == typeof t10 && n10.push(t10), super(n10, r10);
        }
      }, ig = class extends ry {
        constructor(e10, t10) {
          super(["srem", ...e10], t10);
        }
      }, ib = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["sscan", e10, t10];
          r10?.match && i10.push("match", r10.match), "number" == typeof r10?.count && i10.push("count", r10.count), super(i10, { deserialize: rm, ...n10 });
        }
      }, iv = class extends ry {
        constructor(e10, t10) {
          super(["strlen", ...e10], t10);
        }
      }, ix = class extends ry {
        constructor(e10, t10) {
          super(["sunion", ...e10], t10);
        }
      }, iE = class extends ry {
        constructor(e10, t10) {
          super(["sunionstore", ...e10], t10);
        }
      }, i_ = class extends ry {
        constructor(e10) {
          super(["time"], e10);
        }
      }, iS = class extends ry {
        constructor(e10, t10) {
          super(["touch", ...e10], t10);
        }
      }, iR = class extends ry {
        constructor(e10, t10) {
          super(["ttl", ...e10], t10);
        }
      }, ik = class extends ry {
        constructor(e10, t10) {
          super(["type", ...e10], t10);
        }
      }, iO = class extends ry {
        constructor(e10, t10) {
          super(["unlink", ...e10], t10);
        }
      }, iA = class extends ry {
        constructor([e10, t10, r10], n10) {
          super(["XACK", e10, t10, ...Array.isArray(r10) ? [...r10] : [r10]], n10);
        }
      }, iT = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["XADD", e10];
          for (let [e11, i11] of (n10 && (n10.nomkStream && s10.push("NOMKSTREAM"), n10.trim && (s10.push(n10.trim.type, n10.trim.comparison, n10.trim.threshold), void 0 !== n10.trim.limit && s10.push("LIMIT", n10.trim.limit))), s10.push(t10), Object.entries(r10)))
            s10.push(e11, i11);
          super(s10, i10);
        }
      }, iC = class extends ry {
        constructor([e10, t10, r10, n10, i10, s10], o10) {
          let a2 = [];
          s10?.count && a2.push("COUNT", s10.count), s10?.justId && a2.push("JUSTID"), super(["XAUTOCLAIM", e10, t10, r10, n10, i10, ...a2], o10);
        }
      }, iP = class extends ry {
        constructor([e10, t10, r10, n10, i10, s10], o10) {
          let a2 = Array.isArray(i10) ? [...i10] : [i10], c2 = [];
          s10?.idleMS && c2.push("IDLE", s10.idleMS), s10?.idleMS && c2.push("TIME", s10.timeMS), s10?.retryCount && c2.push("RETRYCOUNT", s10.retryCount), s10?.force && c2.push("FORCE"), s10?.justId && c2.push("JUSTID"), s10?.lastId && c2.push("LASTID", s10.lastId), super(["XCLAIM", e10, t10, r10, n10, ...a2, ...c2], o10);
        }
      }, iI = class extends ry {
        constructor([e10, t10], r10) {
          super(["XDEL", e10, ...Array.isArray(t10) ? [...t10] : [t10]], r10);
        }
      }, iN = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["XGROUP"];
          switch (t10.type) {
            case "CREATE":
              n10.push("CREATE", e10, t10.group, t10.id), t10.options && (t10.options.MKSTREAM && n10.push("MKSTREAM"), void 0 !== t10.options.ENTRIESREAD && n10.push("ENTRIESREAD", t10.options.ENTRIESREAD.toString()));
              break;
            case "CREATECONSUMER":
              n10.push("CREATECONSUMER", e10, t10.group, t10.consumer);
              break;
            case "DELCONSUMER":
              n10.push("DELCONSUMER", e10, t10.group, t10.consumer);
              break;
            case "DESTROY":
              n10.push("DESTROY", e10, t10.group);
              break;
            case "SETID":
              n10.push("SETID", e10, t10.group, t10.id), t10.options?.ENTRIESREAD !== void 0 && n10.push("ENTRIESREAD", t10.options.ENTRIESREAD.toString());
              break;
            default:
              throw Error("Invalid XGROUP");
          }
          super(n10, r10);
        }
      }, iD = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = [];
          "CONSUMERS" === t10.type ? n10.push("CONSUMERS", e10, t10.group) : n10.push("GROUPS", e10), super(["XINFO", ...n10], r10);
        }
      }, iM = class extends ry {
        constructor(e10, t10) {
          super(["XLEN", ...e10], t10);
        }
      }, ij = class extends ry {
        constructor([e10, t10, r10, n10, i10, s10], o10) {
          super(["XPENDING", e10, t10, ...s10?.idleTime ? ["IDLE", s10.idleTime] : [], r10, n10, i10, ...s10?.consumer === void 0 ? [] : Array.isArray(s10.consumer) ? [...s10.consumer] : [s10.consumer]], o10);
        }
      }, iL = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["XRANGE", e10, t10, r10];
          "number" == typeof n10 && s10.push("COUNT", n10), super(s10, { deserialize: (e11) => function(e12) {
            let t11 = {};
            for (let r11 of e12)
              for (; r11.length >= 2; ) {
                let e13 = r11.shift(), n11 = r11.shift();
                for ((e13 in t11) || (t11[e13] = {}); n11.length >= 2; ) {
                  let r12 = n11.shift(), i11 = n11.shift();
                  try {
                    t11[e13][r12] = JSON.parse(i11);
                  } catch {
                    t11[e13][r12] = i11;
                  }
                }
              }
            return t11;
          }(e11), ...i10 });
        }
      }, iU = class extends ry {
        constructor([e10, t10, r10], n10) {
          if (Array.isArray(e10) && Array.isArray(t10) && e10.length !== t10.length)
            throw Error("ERR Unbalanced XREAD list of streams: for each stream key an ID or '$' must be specified");
          let i10 = [];
          "number" == typeof r10?.count && i10.push("COUNT", r10.count), "number" == typeof r10?.blockMS && i10.push("BLOCK", r10.blockMS), i10.push("STREAMS", ...Array.isArray(e10) ? [...e10] : [e10], ...Array.isArray(t10) ? [...t10] : [t10]), super(["XREAD", ...i10], n10);
        }
      }, iW = class extends ry {
        constructor([e10, t10, r10, n10, i10], s10) {
          if (Array.isArray(r10) && Array.isArray(n10) && r10.length !== n10.length)
            throw Error("ERR Unbalanced XREADGROUP list of streams: for each stream key an ID or '$' must be specified");
          let o10 = [];
          "number" == typeof i10?.count && o10.push("COUNT", i10.count), "number" == typeof i10?.blockMS && o10.push("BLOCK", i10.blockMS), "boolean" == typeof i10?.NOACK && i10.NOACK && o10.push("NOACK"), o10.push("STREAMS", ...Array.isArray(r10) ? [...r10] : [r10], ...Array.isArray(n10) ? [...n10] : [n10]), super(["XREADGROUP", "GROUP", e10, t10, ...o10], s10);
        }
      }, iB = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["XREVRANGE", e10, t10, r10];
          "number" == typeof n10 && s10.push("COUNT", n10), super(s10, { deserialize: (e11) => function(e12) {
            let t11 = {};
            for (let r11 of e12)
              for (; r11.length >= 2; ) {
                let e13 = r11.shift(), n11 = r11.shift();
                for ((e13 in t11) || (t11[e13] = {}); n11.length >= 2; ) {
                  let r12 = n11.shift(), i11 = n11.shift();
                  try {
                    t11[e13][r12] = JSON.parse(i11);
                  } catch {
                    t11[e13][r12] = i11;
                  }
                }
              }
            return t11;
          }(e11), ...i10 });
        }
      }, i$ = class extends ry {
        constructor([e10, t10], r10) {
          let { limit: n10, strategy: i10, threshold: s10, exactness: o10 = "~" } = t10;
          super(["XTRIM", e10, i10, o10, s10, ...n10 ? ["LIMIT", n10] : []], r10);
        }
      }, iq = class extends ry {
        constructor([e10, t10, ...r10], n10) {
          let i10 = ["zadd", e10];
          "nx" in t10 && t10.nx ? i10.push("nx") : "xx" in t10 && t10.xx && i10.push("xx"), "ch" in t10 && t10.ch && i10.push("ch"), "incr" in t10 && t10.incr && i10.push("incr"), "lt" in t10 && t10.lt ? i10.push("lt") : "gt" in t10 && t10.gt && i10.push("gt"), "score" in t10 && "member" in t10 && i10.push(t10.score, t10.member), i10.push(...r10.flatMap(({ score: e11, member: t11 }) => [e11, t11])), super(i10, n10);
        }
      }, iH = class extends ry {
        constructor(e10, t10) {
          super(["zcard", ...e10], t10);
        }
      }, iK = class extends ry {
        constructor(e10, t10) {
          super(["zcount", ...e10], t10);
        }
      }, iz = class extends ry {
        constructor(e10, t10) {
          super(["zincrby", ...e10], t10);
        }
      }, iJ = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["zinterstore", e10, t10];
          Array.isArray(r10) ? s10.push(...r10) : s10.push(r10), n10 && ("weights" in n10 && n10.weights ? s10.push("weights", ...n10.weights) : "weight" in n10 && "number" == typeof n10.weight && s10.push("weights", n10.weight), "aggregate" in n10 && s10.push("aggregate", n10.aggregate)), super(s10, i10);
        }
      }, iG = class extends ry {
        constructor(e10, t10) {
          super(["zlexcount", ...e10], t10);
        }
      }, iV = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["zpopmax", e10];
          "number" == typeof t10 && n10.push(t10), super(n10, r10);
        }
      }, iF = class extends ry {
        constructor([e10, t10], r10) {
          let n10 = ["zpopmin", e10];
          "number" == typeof t10 && n10.push(t10), super(n10, r10);
        }
      }, iX = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["zrange", e10, t10, r10];
          n10?.byScore && s10.push("byscore"), n10?.byLex && s10.push("bylex"), n10?.rev && s10.push("rev"), n10?.count !== void 0 && void 0 !== n10.offset && s10.push("limit", n10.offset, n10.count), n10?.withScores && s10.push("withscores"), super(s10, i10);
        }
      }, iY = class extends ry {
        constructor(e10, t10) {
          super(["zrank", ...e10], t10);
        }
      }, iZ = class extends ry {
        constructor(e10, t10) {
          super(["zrem", ...e10], t10);
        }
      }, iQ = class extends ry {
        constructor(e10, t10) {
          super(["zremrangebylex", ...e10], t10);
        }
      }, i0 = class extends ry {
        constructor(e10, t10) {
          super(["zremrangebyrank", ...e10], t10);
        }
      }, i1 = class extends ry {
        constructor(e10, t10) {
          super(["zremrangebyscore", ...e10], t10);
        }
      }, i2 = class extends ry {
        constructor(e10, t10) {
          super(["zrevrank", ...e10], t10);
        }
      }, i3 = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["zscan", e10, t10];
          r10?.match && i10.push("match", r10.match), "number" == typeof r10?.count && i10.push("count", r10.count), super(i10, { deserialize: rm, ...n10 });
        }
      }, i5 = class extends ry {
        constructor(e10, t10) {
          super(["zscore", ...e10], t10);
        }
      }, i4 = class extends ry {
        constructor([e10, t10, r10], n10) {
          let i10 = ["zunion", e10];
          Array.isArray(t10) ? i10.push(...t10) : i10.push(t10), r10 && ("weights" in r10 && r10.weights ? i10.push("weights", ...r10.weights) : "weight" in r10 && "number" == typeof r10.weight && i10.push("weights", r10.weight), "aggregate" in r10 && i10.push("aggregate", r10.aggregate), r10.withScores && i10.push("withscores")), super(i10, n10);
        }
      }, i8 = class extends ry {
        constructor([e10, t10, r10, n10], i10) {
          let s10 = ["zunionstore", e10, t10];
          Array.isArray(r10) ? s10.push(...r10) : s10.push(r10), n10 && ("weights" in n10 && n10.weights ? s10.push("weights", ...n10.weights) : "weight" in n10 && "number" == typeof n10.weight && s10.push("weights", n10.weight), "aggregate" in n10 && s10.push("aggregate", n10.aggregate)), super(s10, i10);
        }
      }, i6 = class extends ry {
        constructor(e10, t10) {
          super(["zdiffstore", ...e10], t10);
        }
      }, i9 = class extends ry {
        constructor(e10, t10) {
          let [r10, n10] = e10;
          super(["zmscore", r10, ...n10], t10);
        }
      }, i7 = class {
        client;
        commands;
        commandOptions;
        multiExec;
        constructor(e10) {
          if (this.client = e10.client, this.commands = [], this.commandOptions = e10.commandOptions, this.multiExec = e10.multiExec ?? false, this.commandOptions?.latencyLogging) {
            let e11 = this.exec.bind(this);
            this.exec = async (t10) => {
              let r10 = performance.now(), n10 = await (t10 ? e11(t10) : e11()), i10 = (performance.now() - r10).toFixed(2);
              return console.log(`Latency for \x1B[38;2;19;185;39m${this.multiExec ? ["MULTI-EXEC"] : ["PIPELINE"].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${i10} ms\x1B[0m`), n10;
            };
          }
        }
        exec = async (e10) => {
          if (0 === this.commands.length)
            throw Error("Pipeline is empty");
          let t10 = this.multiExec ? ["multi-exec"] : ["pipeline"], r10 = await this.client.request({ path: t10, body: Object.values(this.commands).map((e11) => e11.command) });
          return e10?.keepErrors ? r10.map(({ error: e11, result: t11 }, r11) => ({ error: e11, result: this.commands[r11].deserialize(t11) })) : r10.map(({ error: e11, result: t11 }, r11) => {
            if (e11)
              throw new rc(`Command ${r11 + 1} [ ${this.commands[r11].command[0]} ] failed: ${e11}`);
            return this.commands[r11].deserialize(t11);
          });
        };
        length() {
          return this.commands.length;
        }
        chain(e10) {
          return this.commands.push(e10), this;
        }
        append = (...e10) => this.chain(new rb(e10, this.commandOptions));
        bitcount = (...e10) => this.chain(new rv(e10, this.commandOptions));
        bitfield = (...e10) => new rx(e10, this.client, this.commandOptions, this.chain.bind(this));
        bitop = (e10, t10, r10, ...n10) => this.chain(new rE([e10, t10, r10, ...n10], this.commandOptions));
        bitpos = (...e10) => this.chain(new r_(e10, this.commandOptions));
        copy = (...e10) => this.chain(new rS(e10, this.commandOptions));
        zdiffstore = (...e10) => this.chain(new i6(e10, this.commandOptions));
        dbsize = () => this.chain(new rR(this.commandOptions));
        decr = (...e10) => this.chain(new rk(e10, this.commandOptions));
        decrby = (...e10) => this.chain(new rO(e10, this.commandOptions));
        del = (...e10) => this.chain(new rA(e10, this.commandOptions));
        echo = (...e10) => this.chain(new rT(e10, this.commandOptions));
        eval = (...e10) => this.chain(new rC(e10, this.commandOptions));
        evalsha = (...e10) => this.chain(new rP(e10, this.commandOptions));
        exists = (...e10) => this.chain(new rN(e10, this.commandOptions));
        expire = (...e10) => this.chain(new rD(e10, this.commandOptions));
        expireat = (...e10) => this.chain(new rM(e10, this.commandOptions));
        flushall = (e10) => this.chain(new rj(e10, this.commandOptions));
        flushdb = (...e10) => this.chain(new rL(e10, this.commandOptions));
        geoadd = (...e10) => this.chain(new rU(e10, this.commandOptions));
        geodist = (...e10) => this.chain(new rW(e10, this.commandOptions));
        geopos = (...e10) => this.chain(new r$(e10, this.commandOptions));
        geohash = (...e10) => this.chain(new rB(e10, this.commandOptions));
        geosearch = (...e10) => this.chain(new rq(e10, this.commandOptions));
        geosearchstore = (...e10) => this.chain(new rH(e10, this.commandOptions));
        get = (...e10) => this.chain(new rK(e10, this.commandOptions));
        getbit = (...e10) => this.chain(new rz(e10, this.commandOptions));
        getdel = (...e10) => this.chain(new rJ(e10, this.commandOptions));
        getex = (...e10) => this.chain(new rG(e10, this.commandOptions));
        getrange = (...e10) => this.chain(new rV(e10, this.commandOptions));
        getset = (e10, t10) => this.chain(new rF([e10, t10], this.commandOptions));
        hdel = (...e10) => this.chain(new rX(e10, this.commandOptions));
        hexists = (...e10) => this.chain(new rY(e10, this.commandOptions));
        hget = (...e10) => this.chain(new rZ(e10, this.commandOptions));
        hgetall = (...e10) => this.chain(new rQ(e10, this.commandOptions));
        hincrby = (...e10) => this.chain(new r0(e10, this.commandOptions));
        hincrbyfloat = (...e10) => this.chain(new r1(e10, this.commandOptions));
        hkeys = (...e10) => this.chain(new r2(e10, this.commandOptions));
        hlen = (...e10) => this.chain(new r3(e10, this.commandOptions));
        hmget = (...e10) => this.chain(new r5(e10, this.commandOptions));
        hmset = (e10, t10) => this.chain(new r4([e10, t10], this.commandOptions));
        hrandfield = (e10, t10, r10) => this.chain(new rg([e10, t10, r10], this.commandOptions));
        hscan = (...e10) => this.chain(new r8(e10, this.commandOptions));
        hset = (e10, t10) => this.chain(new r6([e10, t10], this.commandOptions));
        hsetnx = (e10, t10, r10) => this.chain(new r9([e10, t10, r10], this.commandOptions));
        hstrlen = (...e10) => this.chain(new r7(e10, this.commandOptions));
        hvals = (...e10) => this.chain(new ne(e10, this.commandOptions));
        incr = (...e10) => this.chain(new nt(e10, this.commandOptions));
        incrby = (...e10) => this.chain(new nr(e10, this.commandOptions));
        incrbyfloat = (...e10) => this.chain(new nn(e10, this.commandOptions));
        keys = (...e10) => this.chain(new nk(e10, this.commandOptions));
        lindex = (...e10) => this.chain(new nO(e10, this.commandOptions));
        linsert = (e10, t10, r10, n10) => this.chain(new nA([e10, t10, r10, n10], this.commandOptions));
        llen = (...e10) => this.chain(new nT(e10, this.commandOptions));
        lmove = (...e10) => this.chain(new nC(e10, this.commandOptions));
        lpop = (...e10) => this.chain(new nI(e10, this.commandOptions));
        lmpop = (...e10) => this.chain(new nP(e10, this.commandOptions));
        lpos = (...e10) => this.chain(new nN(e10, this.commandOptions));
        lpush = (e10, ...t10) => this.chain(new nD([e10, ...t10], this.commandOptions));
        lpushx = (e10, ...t10) => this.chain(new nM([e10, ...t10], this.commandOptions));
        lrange = (...e10) => this.chain(new nj(e10, this.commandOptions));
        lrem = (e10, t10, r10) => this.chain(new nL([e10, t10, r10], this.commandOptions));
        lset = (e10, t10, r10) => this.chain(new nU([e10, t10, r10], this.commandOptions));
        ltrim = (...e10) => this.chain(new nW(e10, this.commandOptions));
        mget = (...e10) => this.chain(new nB(e10, this.commandOptions));
        mset = (e10) => this.chain(new n$([e10], this.commandOptions));
        msetnx = (e10) => this.chain(new nq([e10], this.commandOptions));
        persist = (...e10) => this.chain(new nH(e10, this.commandOptions));
        pexpire = (...e10) => this.chain(new nK(e10, this.commandOptions));
        pexpireat = (...e10) => this.chain(new nz(e10, this.commandOptions));
        pfadd = (...e10) => this.chain(new nJ(e10, this.commandOptions));
        pfcount = (...e10) => this.chain(new nG(e10, this.commandOptions));
        pfmerge = (...e10) => this.chain(new nV(e10, this.commandOptions));
        ping = (e10) => this.chain(new nF(e10, this.commandOptions));
        psetex = (e10, t10, r10) => this.chain(new nX([e10, t10, r10], this.commandOptions));
        pttl = (...e10) => this.chain(new nY(e10, this.commandOptions));
        publish = (...e10) => this.chain(new nZ(e10, this.commandOptions));
        randomkey = () => this.chain(new nQ(this.commandOptions));
        rename = (...e10) => this.chain(new n0(e10, this.commandOptions));
        renamenx = (...e10) => this.chain(new n1(e10, this.commandOptions));
        rpop = (...e10) => this.chain(new n2(e10, this.commandOptions));
        rpush = (e10, ...t10) => this.chain(new n3([e10, ...t10], this.commandOptions));
        rpushx = (e10, ...t10) => this.chain(new n5([e10, ...t10], this.commandOptions));
        sadd = (e10, t10, ...r10) => this.chain(new n4([e10, t10, ...r10], this.commandOptions));
        scan = (...e10) => this.chain(new n8(e10, this.commandOptions));
        scard = (...e10) => this.chain(new n6(e10, this.commandOptions));
        scriptExists = (...e10) => this.chain(new n9(e10, this.commandOptions));
        scriptFlush = (...e10) => this.chain(new n7(e10, this.commandOptions));
        scriptLoad = (...e10) => this.chain(new ie(e10, this.commandOptions));
        sdiff = (...e10) => this.chain(new it(e10, this.commandOptions));
        sdiffstore = (...e10) => this.chain(new ir(e10, this.commandOptions));
        set = (e10, t10, r10) => this.chain(new ii([e10, t10, r10], this.commandOptions));
        setbit = (...e10) => this.chain(new is(e10, this.commandOptions));
        setex = (e10, t10, r10) => this.chain(new io([e10, t10, r10], this.commandOptions));
        setnx = (e10, t10) => this.chain(new ia([e10, t10], this.commandOptions));
        setrange = (...e10) => this.chain(new ic(e10, this.commandOptions));
        sinter = (...e10) => this.chain(new il(e10, this.commandOptions));
        sinterstore = (...e10) => this.chain(new iu(e10, this.commandOptions));
        sismember = (e10, t10) => this.chain(new ih([e10, t10], this.commandOptions));
        smembers = (...e10) => this.chain(new id(e10, this.commandOptions));
        smismember = (e10, t10) => this.chain(new ip([e10, t10], this.commandOptions));
        smove = (e10, t10, r10) => this.chain(new im([e10, t10, r10], this.commandOptions));
        spop = (...e10) => this.chain(new iw(e10, this.commandOptions));
        srandmember = (...e10) => this.chain(new iy(e10, this.commandOptions));
        srem = (e10, ...t10) => this.chain(new ig([e10, ...t10], this.commandOptions));
        sscan = (...e10) => this.chain(new ib(e10, this.commandOptions));
        strlen = (...e10) => this.chain(new iv(e10, this.commandOptions));
        sunion = (...e10) => this.chain(new ix(e10, this.commandOptions));
        sunionstore = (...e10) => this.chain(new iE(e10, this.commandOptions));
        time = () => this.chain(new i_(this.commandOptions));
        touch = (...e10) => this.chain(new iS(e10, this.commandOptions));
        ttl = (...e10) => this.chain(new iR(e10, this.commandOptions));
        type = (...e10) => this.chain(new ik(e10, this.commandOptions));
        unlink = (...e10) => this.chain(new iO(e10, this.commandOptions));
        zadd = (...e10) => (e10[1], this.chain(new iq([e10[0], e10[1], ...e10.slice(2)], this.commandOptions)));
        xadd = (...e10) => this.chain(new iT(e10, this.commandOptions));
        xack = (...e10) => this.chain(new iA(e10, this.commandOptions));
        xdel = (...e10) => this.chain(new iI(e10, this.commandOptions));
        xgroup = (...e10) => this.chain(new iN(e10, this.commandOptions));
        xread = (...e10) => this.chain(new iU(e10, this.commandOptions));
        xreadgroup = (...e10) => this.chain(new iW(e10, this.commandOptions));
        xinfo = (...e10) => this.chain(new iD(e10, this.commandOptions));
        xlen = (...e10) => this.chain(new iM(e10, this.commandOptions));
        xpending = (...e10) => this.chain(new ij(e10, this.commandOptions));
        xclaim = (...e10) => this.chain(new iP(e10, this.commandOptions));
        xautoclaim = (...e10) => this.chain(new iC(e10, this.commandOptions));
        xtrim = (...e10) => this.chain(new i$(e10, this.commandOptions));
        xrange = (...e10) => this.chain(new iL(e10, this.commandOptions));
        xrevrange = (...e10) => this.chain(new iB(e10, this.commandOptions));
        zcard = (...e10) => this.chain(new iH(e10, this.commandOptions));
        zcount = (...e10) => this.chain(new iK(e10, this.commandOptions));
        zincrby = (e10, t10, r10) => this.chain(new iz([e10, t10, r10], this.commandOptions));
        zinterstore = (...e10) => this.chain(new iJ(e10, this.commandOptions));
        zlexcount = (...e10) => this.chain(new iG(e10, this.commandOptions));
        zmscore = (...e10) => this.chain(new i9(e10, this.commandOptions));
        zpopmax = (...e10) => this.chain(new iV(e10, this.commandOptions));
        zpopmin = (...e10) => this.chain(new iF(e10, this.commandOptions));
        zrange = (...e10) => this.chain(new iX(e10, this.commandOptions));
        zrank = (e10, t10) => this.chain(new iY([e10, t10], this.commandOptions));
        zrem = (e10, ...t10) => this.chain(new iZ([e10, ...t10], this.commandOptions));
        zremrangebylex = (...e10) => this.chain(new iQ(e10, this.commandOptions));
        zremrangebyrank = (...e10) => this.chain(new i0(e10, this.commandOptions));
        zremrangebyscore = (...e10) => this.chain(new i1(e10, this.commandOptions));
        zrevrank = (e10, t10) => this.chain(new i2([e10, t10], this.commandOptions));
        zscan = (...e10) => this.chain(new i3(e10, this.commandOptions));
        zscore = (e10, t10) => this.chain(new i5([e10, t10], this.commandOptions));
        zunionstore = (...e10) => this.chain(new i8(e10, this.commandOptions));
        zunion = (...e10) => this.chain(new i4(e10, this.commandOptions));
        get json() {
          return { arrappend: (...e10) => this.chain(new ni(e10, this.commandOptions)), arrindex: (...e10) => this.chain(new ns(e10, this.commandOptions)), arrinsert: (...e10) => this.chain(new no(e10, this.commandOptions)), arrlen: (...e10) => this.chain(new na(e10, this.commandOptions)), arrpop: (...e10) => this.chain(new nc(e10, this.commandOptions)), arrtrim: (...e10) => this.chain(new nl(e10, this.commandOptions)), clear: (...e10) => this.chain(new nu(e10, this.commandOptions)), del: (...e10) => this.chain(new nh(e10, this.commandOptions)), forget: (...e10) => this.chain(new nd(e10, this.commandOptions)), get: (...e10) => this.chain(new np(e10, this.commandOptions)), mget: (...e10) => this.chain(new nf(e10, this.commandOptions)), mset: (...e10) => this.chain(new nm(e10, this.commandOptions)), numincrby: (...e10) => this.chain(new nw(e10, this.commandOptions)), nummultby: (...e10) => this.chain(new ny(e10, this.commandOptions)), objkeys: (...e10) => this.chain(new ng(e10, this.commandOptions)), objlen: (...e10) => this.chain(new nb(e10, this.commandOptions)), resp: (...e10) => this.chain(new nv(e10, this.commandOptions)), set: (...e10) => this.chain(new nx(e10, this.commandOptions)), strappend: (...e10) => this.chain(new nE(e10, this.commandOptions)), strlen: (...e10) => this.chain(new n_(e10, this.commandOptions)), toggle: (...e10) => this.chain(new nS(e10, this.commandOptions)), type: (...e10) => this.chain(new nR(e10, this.commandOptions)) };
        }
      }, se = class {
        pipelinePromises = /* @__PURE__ */ new WeakMap();
        activePipeline = null;
        indexInCurrentPipeline = 0;
        redis;
        pipeline;
        pipelineCounter = 0;
        constructor(e10) {
          this.redis = e10, this.pipeline = e10.pipeline();
        }
        async withAutoPipeline(e10) {
          let t10 = this.activePipeline ?? this.redis.pipeline();
          this.activePipeline || (this.activePipeline = t10, this.indexInCurrentPipeline = 0);
          let r10 = this.indexInCurrentPipeline++;
          e10(t10);
          let n10 = this.deferExecution().then(() => {
            if (!this.pipelinePromises.has(t10)) {
              let e11 = t10.exec({ keepErrors: true });
              this.pipelineCounter += 1, this.pipelinePromises.set(t10, e11), this.activePipeline = null;
            }
            return this.pipelinePromises.get(t10);
          }), i10 = (await n10)[r10];
          if (i10.error)
            throw new rc(`Command failed: ${i10.error}`);
          return i10.result;
        }
        async deferExecution() {
          await Promise.resolve(), await Promise.resolve();
        }
      }, st = class {
        script;
        sha1;
        redis;
        constructor(e10, t10) {
          this.redis = e10, this.sha1 = this.digest(t10), this.script = t10;
        }
        async eval(e10, t10) {
          return await this.redis.eval(this.script, e10, t10);
        }
        async evalsha(e10, t10) {
          return await this.redis.evalsha(this.sha1, e10, t10);
        }
        async exec(e10, t10) {
          return await this.redis.evalsha(this.sha1, e10, t10).catch(async (r10) => {
            if (r10 instanceof Error && r10.message.toLowerCase().includes("noscript"))
              return await this.redis.eval(this.script, e10, t10);
            throw r10;
          });
        }
        digest(e10) {
          return rs.stringify(ro(e10));
        }
      }, sr = class {
        client;
        opts;
        enableTelemetry;
        enableAutoPipelining;
        constructor(e10, t10) {
          this.client = e10, this.opts = t10, this.enableTelemetry = t10?.enableTelemetry ?? true, t10?.readYourWrites === false && (this.client.readYourWrites = false), this.enableAutoPipelining = t10?.enableAutoPipelining ?? true;
        }
        get readYourWritesSyncToken() {
          return this.client.upstashSyncToken;
        }
        set readYourWritesSyncToken(e10) {
          this.client.upstashSyncToken = e10;
        }
        get json() {
          return { arrappend: (...e10) => new ni(e10, this.opts).exec(this.client), arrindex: (...e10) => new ns(e10, this.opts).exec(this.client), arrinsert: (...e10) => new no(e10, this.opts).exec(this.client), arrlen: (...e10) => new na(e10, this.opts).exec(this.client), arrpop: (...e10) => new nc(e10, this.opts).exec(this.client), arrtrim: (...e10) => new nl(e10, this.opts).exec(this.client), clear: (...e10) => new nu(e10, this.opts).exec(this.client), del: (...e10) => new nh(e10, this.opts).exec(this.client), forget: (...e10) => new nd(e10, this.opts).exec(this.client), get: (...e10) => new np(e10, this.opts).exec(this.client), mget: (...e10) => new nf(e10, this.opts).exec(this.client), mset: (...e10) => new nm(e10, this.opts).exec(this.client), numincrby: (...e10) => new nw(e10, this.opts).exec(this.client), nummultby: (...e10) => new ny(e10, this.opts).exec(this.client), objkeys: (...e10) => new ng(e10, this.opts).exec(this.client), objlen: (...e10) => new nb(e10, this.opts).exec(this.client), resp: (...e10) => new nv(e10, this.opts).exec(this.client), set: (...e10) => new nx(e10, this.opts).exec(this.client), strappend: (...e10) => new nE(e10, this.opts).exec(this.client), strlen: (...e10) => new n_(e10, this.opts).exec(this.client), toggle: (...e10) => new nS(e10, this.opts).exec(this.client), type: (...e10) => new nR(e10, this.opts).exec(this.client) };
        }
        use = (e10) => {
          let t10 = this.client.request.bind(this.client);
          this.client.request = (r10) => e10(r10, t10);
        };
        addTelemetry = (e10) => {
          if (this.enableTelemetry)
            try {
              this.client.mergeTelemetry(e10);
            } catch {
            }
        };
        createScript(e10) {
          return new st(this, e10);
        }
        pipeline = () => new i7({ client: this.client, commandOptions: this.opts, multiExec: false });
        autoPipeline = () => function e10(t10, r10) {
          return t10.autoPipelineExecutor || (t10.autoPipelineExecutor = new se(t10)), new Proxy(t10, { get: (t11, n10) => "pipelineCounter" === n10 ? t11.autoPipelineExecutor.pipelineCounter : "json" === n10 ? e10(t11, true) : n10 in t11 && !(n10 in t11.autoPipelineExecutor.pipeline) ? t11[n10] : (r10 ? "function" == typeof t11.autoPipelineExecutor.pipeline.json[n10] : "function" == typeof t11.autoPipelineExecutor.pipeline[n10]) ? (...e11) => t11.autoPipelineExecutor.withAutoPipeline((t12) => {
            r10 ? t12.json[n10](...e11) : t12[n10](...e11);
          }) : t11.autoPipelineExecutor.pipeline[n10] });
        }(this);
        multi = () => new i7({ client: this.client, commandOptions: this.opts, multiExec: true });
        bitfield = (...e10) => new rx(e10, this.client, this.opts);
        append = (...e10) => new rb(e10, this.opts).exec(this.client);
        bitcount = (...e10) => new rv(e10, this.opts).exec(this.client);
        bitop = (e10, t10, r10, ...n10) => new rE([e10, t10, r10, ...n10], this.opts).exec(this.client);
        bitpos = (...e10) => new r_(e10, this.opts).exec(this.client);
        copy = (...e10) => new rS(e10, this.opts).exec(this.client);
        dbsize = () => new rR(this.opts).exec(this.client);
        decr = (...e10) => new rk(e10, this.opts).exec(this.client);
        decrby = (...e10) => new rO(e10, this.opts).exec(this.client);
        del = (...e10) => new rA(e10, this.opts).exec(this.client);
        echo = (...e10) => new rT(e10, this.opts).exec(this.client);
        eval = (...e10) => new rC(e10, this.opts).exec(this.client);
        evalsha = (...e10) => new rP(e10, this.opts).exec(this.client);
        exec = (e10) => new rI(e10, this.opts).exec(this.client);
        exists = (...e10) => new rN(e10, this.opts).exec(this.client);
        expire = (...e10) => new rD(e10, this.opts).exec(this.client);
        expireat = (...e10) => new rM(e10, this.opts).exec(this.client);
        flushall = (e10) => new rj(e10, this.opts).exec(this.client);
        flushdb = (...e10) => new rL(e10, this.opts).exec(this.client);
        geoadd = (...e10) => new rU(e10, this.opts).exec(this.client);
        geopos = (...e10) => new r$(e10, this.opts).exec(this.client);
        geodist = (...e10) => new rW(e10, this.opts).exec(this.client);
        geohash = (...e10) => new rB(e10, this.opts).exec(this.client);
        geosearch = (...e10) => new rq(e10, this.opts).exec(this.client);
        geosearchstore = (...e10) => new rH(e10, this.opts).exec(this.client);
        get = (...e10) => new rK(e10, this.opts).exec(this.client);
        getbit = (...e10) => new rz(e10, this.opts).exec(this.client);
        getdel = (...e10) => new rJ(e10, this.opts).exec(this.client);
        getex = (...e10) => new rG(e10, this.opts).exec(this.client);
        getrange = (...e10) => new rV(e10, this.opts).exec(this.client);
        getset = (e10, t10) => new rF([e10, t10], this.opts).exec(this.client);
        hdel = (...e10) => new rX(e10, this.opts).exec(this.client);
        hexists = (...e10) => new rY(e10, this.opts).exec(this.client);
        hget = (...e10) => new rZ(e10, this.opts).exec(this.client);
        hgetall = (...e10) => new rQ(e10, this.opts).exec(this.client);
        hincrby = (...e10) => new r0(e10, this.opts).exec(this.client);
        hincrbyfloat = (...e10) => new r1(e10, this.opts).exec(this.client);
        hkeys = (...e10) => new r2(e10, this.opts).exec(this.client);
        hlen = (...e10) => new r3(e10, this.opts).exec(this.client);
        hmget = (...e10) => new r5(e10, this.opts).exec(this.client);
        hmset = (e10, t10) => new r4([e10, t10], this.opts).exec(this.client);
        hrandfield = (e10, t10, r10) => new rg([e10, t10, r10], this.opts).exec(this.client);
        hscan = (...e10) => new r8(e10, this.opts).exec(this.client);
        hset = (e10, t10) => new r6([e10, t10], this.opts).exec(this.client);
        hsetnx = (e10, t10, r10) => new r9([e10, t10, r10], this.opts).exec(this.client);
        hstrlen = (...e10) => new r7(e10, this.opts).exec(this.client);
        hvals = (...e10) => new ne(e10, this.opts).exec(this.client);
        incr = (...e10) => new nt(e10, this.opts).exec(this.client);
        incrby = (...e10) => new nr(e10, this.opts).exec(this.client);
        incrbyfloat = (...e10) => new nn(e10, this.opts).exec(this.client);
        keys = (...e10) => new nk(e10, this.opts).exec(this.client);
        lindex = (...e10) => new nO(e10, this.opts).exec(this.client);
        linsert = (e10, t10, r10, n10) => new nA([e10, t10, r10, n10], this.opts).exec(this.client);
        llen = (...e10) => new nT(e10, this.opts).exec(this.client);
        lmove = (...e10) => new nC(e10, this.opts).exec(this.client);
        lpop = (...e10) => new nI(e10, this.opts).exec(this.client);
        lmpop = (...e10) => new nP(e10, this.opts).exec(this.client);
        lpos = (...e10) => new nN(e10, this.opts).exec(this.client);
        lpush = (e10, ...t10) => new nD([e10, ...t10], this.opts).exec(this.client);
        lpushx = (e10, ...t10) => new nM([e10, ...t10], this.opts).exec(this.client);
        lrange = (...e10) => new nj(e10, this.opts).exec(this.client);
        lrem = (e10, t10, r10) => new nL([e10, t10, r10], this.opts).exec(this.client);
        lset = (e10, t10, r10) => new nU([e10, t10, r10], this.opts).exec(this.client);
        ltrim = (...e10) => new nW(e10, this.opts).exec(this.client);
        mget = (...e10) => new nB(e10, this.opts).exec(this.client);
        mset = (e10) => new n$([e10], this.opts).exec(this.client);
        msetnx = (e10) => new nq([e10], this.opts).exec(this.client);
        persist = (...e10) => new nH(e10, this.opts).exec(this.client);
        pexpire = (...e10) => new nK(e10, this.opts).exec(this.client);
        pexpireat = (...e10) => new nz(e10, this.opts).exec(this.client);
        pfadd = (...e10) => new nJ(e10, this.opts).exec(this.client);
        pfcount = (...e10) => new nG(e10, this.opts).exec(this.client);
        pfmerge = (...e10) => new nV(e10, this.opts).exec(this.client);
        ping = (e10) => new nF(e10, this.opts).exec(this.client);
        psetex = (e10, t10, r10) => new nX([e10, t10, r10], this.opts).exec(this.client);
        pttl = (...e10) => new nY(e10, this.opts).exec(this.client);
        publish = (...e10) => new nZ(e10, this.opts).exec(this.client);
        randomkey = () => new nQ().exec(this.client);
        rename = (...e10) => new n0(e10, this.opts).exec(this.client);
        renamenx = (...e10) => new n1(e10, this.opts).exec(this.client);
        rpop = (...e10) => new n2(e10, this.opts).exec(this.client);
        rpush = (e10, ...t10) => new n3([e10, ...t10], this.opts).exec(this.client);
        rpushx = (e10, ...t10) => new n5([e10, ...t10], this.opts).exec(this.client);
        sadd = (e10, t10, ...r10) => new n4([e10, t10, ...r10], this.opts).exec(this.client);
        scan = (...e10) => new n8(e10, this.opts).exec(this.client);
        scard = (...e10) => new n6(e10, this.opts).exec(this.client);
        scriptExists = (...e10) => new n9(e10, this.opts).exec(this.client);
        scriptFlush = (...e10) => new n7(e10, this.opts).exec(this.client);
        scriptLoad = (...e10) => new ie(e10, this.opts).exec(this.client);
        sdiff = (...e10) => new it(e10, this.opts).exec(this.client);
        sdiffstore = (...e10) => new ir(e10, this.opts).exec(this.client);
        set = (e10, t10, r10) => new ii([e10, t10, r10], this.opts).exec(this.client);
        setbit = (...e10) => new is(e10, this.opts).exec(this.client);
        setex = (e10, t10, r10) => new io([e10, t10, r10], this.opts).exec(this.client);
        setnx = (e10, t10) => new ia([e10, t10], this.opts).exec(this.client);
        setrange = (...e10) => new ic(e10, this.opts).exec(this.client);
        sinter = (...e10) => new il(e10, this.opts).exec(this.client);
        sinterstore = (...e10) => new iu(e10, this.opts).exec(this.client);
        sismember = (e10, t10) => new ih([e10, t10], this.opts).exec(this.client);
        smismember = (e10, t10) => new ip([e10, t10], this.opts).exec(this.client);
        smembers = (...e10) => new id(e10, this.opts).exec(this.client);
        smove = (e10, t10, r10) => new im([e10, t10, r10], this.opts).exec(this.client);
        spop = (...e10) => new iw(e10, this.opts).exec(this.client);
        srandmember = (...e10) => new iy(e10, this.opts).exec(this.client);
        srem = (e10, ...t10) => new ig([e10, ...t10], this.opts).exec(this.client);
        sscan = (...e10) => new ib(e10, this.opts).exec(this.client);
        strlen = (...e10) => new iv(e10, this.opts).exec(this.client);
        sunion = (...e10) => new ix(e10, this.opts).exec(this.client);
        sunionstore = (...e10) => new iE(e10, this.opts).exec(this.client);
        time = () => new i_().exec(this.client);
        touch = (...e10) => new iS(e10, this.opts).exec(this.client);
        ttl = (...e10) => new iR(e10, this.opts).exec(this.client);
        type = (...e10) => new ik(e10, this.opts).exec(this.client);
        unlink = (...e10) => new iO(e10, this.opts).exec(this.client);
        xadd = (...e10) => new iT(e10, this.opts).exec(this.client);
        xack = (...e10) => new iA(e10, this.opts).exec(this.client);
        xdel = (...e10) => new iI(e10, this.opts).exec(this.client);
        xgroup = (...e10) => new iN(e10, this.opts).exec(this.client);
        xread = (...e10) => new iU(e10, this.opts).exec(this.client);
        xreadgroup = (...e10) => new iW(e10, this.opts).exec(this.client);
        xinfo = (...e10) => new iD(e10, this.opts).exec(this.client);
        xlen = (...e10) => new iM(e10, this.opts).exec(this.client);
        xpending = (...e10) => new ij(e10, this.opts).exec(this.client);
        xclaim = (...e10) => new iP(e10, this.opts).exec(this.client);
        xautoclaim = (...e10) => new iC(e10, this.opts).exec(this.client);
        xtrim = (...e10) => new i$(e10, this.opts).exec(this.client);
        xrange = (...e10) => new iL(e10, this.opts).exec(this.client);
        xrevrange = (...e10) => new iB(e10, this.opts).exec(this.client);
        zadd = (...e10) => (e10[1], new iq([e10[0], e10[1], ...e10.slice(2)], this.opts).exec(this.client));
        zcard = (...e10) => new iH(e10, this.opts).exec(this.client);
        zcount = (...e10) => new iK(e10, this.opts).exec(this.client);
        zdiffstore = (...e10) => new i6(e10, this.opts).exec(this.client);
        zincrby = (e10, t10, r10) => new iz([e10, t10, r10], this.opts).exec(this.client);
        zinterstore = (...e10) => new iJ(e10, this.opts).exec(this.client);
        zlexcount = (...e10) => new iG(e10, this.opts).exec(this.client);
        zmscore = (...e10) => new i9(e10, this.opts).exec(this.client);
        zpopmax = (...e10) => new iV(e10, this.opts).exec(this.client);
        zpopmin = (...e10) => new iF(e10, this.opts).exec(this.client);
        zrange = (...e10) => new iX(e10, this.opts).exec(this.client);
        zrank = (e10, t10) => new iY([e10, t10], this.opts).exec(this.client);
        zrem = (e10, ...t10) => new iZ([e10, ...t10], this.opts).exec(this.client);
        zremrangebylex = (...e10) => new iQ(e10, this.opts).exec(this.client);
        zremrangebyrank = (...e10) => new i0(e10, this.opts).exec(this.client);
        zremrangebyscore = (...e10) => new i1(e10, this.opts).exec(this.client);
        zrevrank = (e10, t10) => new i2([e10, t10], this.opts).exec(this.client);
        zscan = (...e10) => new i3(e10, this.opts).exec(this.client);
        zscore = (e10, t10) => new i5([e10, t10], this.opts).exec(this.client);
        zunion = (...e10) => new i4(e10, this.opts).exec(this.client);
        zunionstore = (...e10) => new i8(e10, this.opts).exec(this.client);
      }, sn = r(356).Buffer;
      "undefined" == typeof atob && (global.atob = (e10) => sn.from(e10, "base64").toString("utf8"));
      var si = class e10 extends sr {
        constructor(e11) {
          if ("request" in e11) {
            super(e11);
            return;
          }
          if (e11.url ? (e11.url.startsWith(" ") || e11.url.endsWith(" ") || /\r|\n/.test(e11.url)) && console.warn("[Upstash Redis] The redis url contains whitespace or newline, which can cause errors!") : console.warn("[Upstash Redis] The 'url' property is missing or undefined in your Redis config."), e11.token ? (e11.token.startsWith(" ") || e11.token.endsWith(" ") || /\r|\n/.test(e11.token)) && console.warn("[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!") : console.warn("[Upstash Redis] The 'token' property is missing or undefined in your Redis config."), super(new ru({ baseUrl: e11.url, retry: e11.retry, headers: { authorization: `Bearer ${e11.token}` }, agent: e11.agent, responseEncoding: e11.responseEncoding, cache: e11.cache ?? "no-store", signal: e11.signal, keepAlive: e11.keepAlive, readYourWrites: e11.readYourWrites }), { automaticDeserialization: e11.automaticDeserialization, enableTelemetry: !process.env.UPSTASH_DISABLE_TELEMETRY, latencyLogging: e11.latencyLogging, enableAutoPipelining: e11.enableAutoPipelining }), this.addTelemetry({ runtime: "edge-light", platform: process.env.VERCEL ? "vercel" : process.env.AWS_REGION ? "aws" : "unknown", sdk: "@upstash/redis@v1.34.4" }), this.enableAutoPipelining)
            return this.autoPipeline();
        }
        static fromEnv(t10) {
          if (void 0 === process.env)
            throw TypeError('[Upstash Redis] Unable to get environment variables, `process.env` is undefined. If you are deploying to cloudflare, please import from "@upstash/redis/cloudflare" instead');
          let r10 = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
          r10 || console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_URL`");
          let n10 = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
          return n10 || console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_TOKEN`"), new e10({ ...t10, url: r10, token: n10 });
        }
      };
      let ss = process.env.UPSTASH_REDIS_REST_URL, so = process.env.UPSTASH_REDIS_REST_TOKEN, sa = ss && so ? new si({ url: ss, token: so }) : void 0, sc = (e10, t10, r10) => {
        if (sa) {
          let n10 = parseInt(t10.slice(0, -1)), i10 = t10.slice(-1);
          return new ri.Ratelimit({ redis: sa, limiter: ri.Ratelimit.fixedWindow(e10, "m" === i10 ? `${n10} m` : "h" === i10 ? `${n10} h` : "d" === i10 ? `${n10} d` : `${n10} s`), analytics: true, prefix: r10 });
        }
        return { limit: async () => ({ success: true, limit: e10, reset: Date.now() + 6e4, remaining: e10 - 1 }) };
      }, sl = sc(100, "1m", "ratelimit:global"), su = sc(30, "1m", "ratelimit:auth"), sh = sc(50, "1m", "ratelimit:api");
      async function sd(e10) {
        let t10 = e10.headers.get("x-forwarded-for") || e10.headers.get("x-real-ip") || "anonymous";
        if (!(e10.nextUrl.pathname.startsWith("/_next") || e10.nextUrl.pathname.startsWith("/static") || e10.nextUrl.pathname.startsWith("/favicon.ico") || e10.nextUrl.pathname.startsWith("/api/auth/session") || e10.nextUrl.pathname.includes("/session")))
          try {
            let r10 = sl;
            e10.nextUrl.pathname.startsWith("/api/auth") ? r10 = su : e10.nextUrl.pathname.startsWith("/api/") && (r10 = sh);
            let { success: n10, limit: i10, reset: s10, remaining: o10 } = await r10.limit(t10), a2 = new Headers();
            if (a2.set("X-RateLimit-Limit", i10.toString()), a2.set("X-RateLimit-Remaining", o10.toString()), a2.set("X-RateLimit-Reset", s10.toString()), !n10)
              return X.json({ error: "Too many requests, please try again later." }, { status: 429, headers: a2 });
            let c2 = X.next();
            return Object.entries(Object.fromEntries(a2.entries())).forEach(([e11, t11]) => {
              c2.headers.set(e11, t11);
            }), c2;
          } catch (e11) {
            return;
          }
      }
      let sp = () => {
        if ("undefined" != typeof globalThis)
          return globalThis;
        if ("undefined" != typeof self)
          return self;
        if ("undefined" != typeof window)
          return window;
        throw Error("unable to locate global object");
      }, sf = async (e10, t10, r10, n10, i10) => {
        let { crypto: { subtle: s10 } } = sp();
        return new Uint8Array(await s10.deriveBits({ name: "HKDF", hash: `SHA-${e10.substr(3)}`, salt: r10, info: n10 }, await s10.importKey("raw", t10, "HKDF", false, ["deriveBits"]), i10 << 3));
      };
      function sm(e10, t10) {
        if ("string" == typeof e10)
          return new TextEncoder().encode(e10);
        if (!(e10 instanceof Uint8Array))
          throw TypeError(`"${t10}"" must be an instance of Uint8Array or a string`);
        return e10;
      }
      async function sw(e10, t10, r10, n10, i10) {
        return sf(function(e11) {
          switch (e11) {
            case "sha256":
            case "sha384":
            case "sha512":
            case "sha1":
              return e11;
            default:
              throw TypeError('unsupported "digest" value');
          }
        }(e10), function(e11) {
          let t11 = sm(e11, "ikm");
          if (!t11.byteLength)
            throw TypeError('"ikm" must be at least one byte in length');
          return t11;
        }(t10), sm(r10, "salt"), function(e11) {
          let t11 = sm(e11, "info");
          if (t11.byteLength > 1024)
            throw TypeError('"info" must not contain more than 1024 bytes');
          return t11;
        }(n10), function(e11, t11) {
          if ("number" != typeof e11 || !Number.isInteger(e11) || e11 < 1)
            throw TypeError('"keylen" must be a positive integer');
          if (e11 > 255 * (parseInt(t11.substr(3), 10) >> 3 || 20))
            throw TypeError('"keylen" too large');
          return e11;
        }(i10, e10));
      }
      let sy = crypto, sg = (e10) => e10 instanceof CryptoKey, sb = async (e10, t10) => {
        let r10 = `SHA-${e10.slice(-3)}`;
        return new Uint8Array(await sy.subtle.digest(r10, t10));
      }, sv = new TextEncoder(), sx = new TextDecoder();
      function sE(...e10) {
        let t10 = new Uint8Array(e10.reduce((e11, { length: t11 }) => e11 + t11, 0)), r10 = 0;
        for (let n10 of e10)
          t10.set(n10, r10), r10 += n10.length;
        return t10;
      }
      function s_(e10, t10, r10) {
        if (t10 < 0 || t10 >= 4294967296)
          throw RangeError(`value must be >= 0 and <= ${4294967296 - 1}. Received ${t10}`);
        e10.set([t10 >>> 24, t10 >>> 16, t10 >>> 8, 255 & t10], r10);
      }
      function sS(e10) {
        let t10 = new Uint8Array(4);
        return s_(t10, e10), t10;
      }
      function sR(e10) {
        return sE(sS(e10.length), e10);
      }
      async function sk(e10, t10, r10) {
        let n10 = Math.ceil((t10 >> 3) / 32), i10 = new Uint8Array(32 * n10);
        for (let t11 = 0; t11 < n10; t11++) {
          let n11 = new Uint8Array(4 + e10.length + r10.length);
          n11.set(sS(t11 + 1)), n11.set(e10, 4), n11.set(r10, 4 + e10.length), i10.set(await sb("sha256", n11), 32 * t11);
        }
        return i10.slice(0, t10 >> 3);
      }
      let sO = (e10) => {
        let t10 = e10;
        "string" == typeof t10 && (t10 = sv.encode(t10));
        let r10 = [];
        for (let e11 = 0; e11 < t10.length; e11 += 32768)
          r10.push(String.fromCharCode.apply(null, t10.subarray(e11, e11 + 32768)));
        return btoa(r10.join(""));
      }, sA = (e10) => sO(e10).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"), sT = (e10) => {
        let t10 = atob(e10), r10 = new Uint8Array(t10.length);
        for (let e11 = 0; e11 < t10.length; e11++)
          r10[e11] = t10.charCodeAt(e11);
        return r10;
      }, sC = (e10) => {
        let t10 = e10;
        t10 instanceof Uint8Array && (t10 = sx.decode(t10)), t10 = t10.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
        try {
          return sT(t10);
        } catch {
          throw TypeError("The input to be decoded is not correctly encoded.");
        }
      };
      class sP extends Error {
        constructor(e10, t10) {
          super(e10, t10), this.code = "ERR_JOSE_GENERIC", this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
        }
      }
      sP.code = "ERR_JOSE_GENERIC";
      class sI extends sP {
        constructor(e10, t10, r10 = "unspecified", n10 = "unspecified") {
          super(e10, { cause: { claim: r10, reason: n10, payload: t10 } }), this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED", this.claim = r10, this.reason = n10, this.payload = t10;
        }
      }
      sI.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
      class sN extends sP {
        constructor(e10, t10, r10 = "unspecified", n10 = "unspecified") {
          super(e10, { cause: { claim: r10, reason: n10, payload: t10 } }), this.code = "ERR_JWT_EXPIRED", this.claim = r10, this.reason = n10, this.payload = t10;
        }
      }
      sN.code = "ERR_JWT_EXPIRED";
      class sD extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
        }
      }
      sD.code = "ERR_JOSE_ALG_NOT_ALLOWED";
      class sM extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JOSE_NOT_SUPPORTED";
        }
      }
      sM.code = "ERR_JOSE_NOT_SUPPORTED";
      class sj extends sP {
        constructor(e10 = "decryption operation failed", t10) {
          super(e10, t10), this.code = "ERR_JWE_DECRYPTION_FAILED";
        }
      }
      sj.code = "ERR_JWE_DECRYPTION_FAILED";
      class sL extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JWE_INVALID";
        }
      }
      sL.code = "ERR_JWE_INVALID";
      class sU extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JWS_INVALID";
        }
      }
      sU.code = "ERR_JWS_INVALID";
      class sW extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JWT_INVALID";
        }
      }
      sW.code = "ERR_JWT_INVALID";
      class sB extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JWK_INVALID";
        }
      }
      sB.code = "ERR_JWK_INVALID";
      class s$ extends sP {
        constructor() {
          super(...arguments), this.code = "ERR_JWKS_INVALID";
        }
      }
      s$.code = "ERR_JWKS_INVALID";
      class sq extends sP {
        constructor(e10 = "no applicable key found in the JSON Web Key Set", t10) {
          super(e10, t10), this.code = "ERR_JWKS_NO_MATCHING_KEY";
        }
      }
      sq.code = "ERR_JWKS_NO_MATCHING_KEY";
      class sH extends sP {
        constructor(e10 = "multiple matching keys found in the JSON Web Key Set", t10) {
          super(e10, t10), this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
        }
      }
      Symbol.asyncIterator, sH.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
      class sK extends sP {
        constructor(e10 = "request timed out", t10) {
          super(e10, t10), this.code = "ERR_JWKS_TIMEOUT";
        }
      }
      sK.code = "ERR_JWKS_TIMEOUT";
      class sz extends sP {
        constructor(e10 = "signature verification failed", t10) {
          super(e10, t10), this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
        }
      }
      sz.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
      let sJ = (e10, t10) => {
        if (t10.length << 3 !== function(e11) {
          switch (e11) {
            case "A128GCM":
            case "A128GCMKW":
            case "A192GCM":
            case "A192GCMKW":
            case "A256GCM":
            case "A256GCMKW":
              return 96;
            case "A128CBC-HS256":
            case "A192CBC-HS384":
            case "A256CBC-HS512":
              return 128;
            default:
              throw new sM(`Unsupported JWE Algorithm: ${e11}`);
          }
        }(e10))
          throw new sL("Invalid Initialization Vector length");
      }, sG = (e10, t10) => {
        let r10 = e10.byteLength << 3;
        if (r10 !== t10)
          throw new sL(`Invalid Content Encryption Key length. Expected ${t10} bits, got ${r10} bits`);
      }, sV = (e10, t10) => {
        if (!(e10 instanceof Uint8Array))
          throw TypeError("First argument must be a buffer");
        if (!(t10 instanceof Uint8Array))
          throw TypeError("Second argument must be a buffer");
        if (e10.length !== t10.length)
          throw TypeError("Input buffers must have the same length");
        let r10 = e10.length, n10 = 0, i10 = -1;
        for (; ++i10 < r10; )
          n10 |= e10[i10] ^ t10[i10];
        return 0 === n10;
      };
      function sF(e10, t10 = "algorithm.name") {
        return TypeError(`CryptoKey does not support this operation, its ${t10} must be ${e10}`);
      }
      function sX(e10, t10) {
        return e10.name === t10;
      }
      function sY(e10, t10, ...r10) {
        switch (t10) {
          case "A128GCM":
          case "A192GCM":
          case "A256GCM": {
            if (!sX(e10.algorithm, "AES-GCM"))
              throw sF("AES-GCM");
            let r11 = parseInt(t10.slice(1, 4), 10);
            if (e10.algorithm.length !== r11)
              throw sF(r11, "algorithm.length");
            break;
          }
          case "A128KW":
          case "A192KW":
          case "A256KW": {
            if (!sX(e10.algorithm, "AES-KW"))
              throw sF("AES-KW");
            let r11 = parseInt(t10.slice(1, 4), 10);
            if (e10.algorithm.length !== r11)
              throw sF(r11, "algorithm.length");
            break;
          }
          case "ECDH":
            switch (e10.algorithm.name) {
              case "ECDH":
              case "X25519":
              case "X448":
                break;
              default:
                throw sF("ECDH, X25519, or X448");
            }
            break;
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW":
            if (!sX(e10.algorithm, "PBKDF2"))
              throw sF("PBKDF2");
            break;
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512": {
            if (!sX(e10.algorithm, "RSA-OAEP"))
              throw sF("RSA-OAEP");
            let r11 = parseInt(t10.slice(9), 10) || 1;
            if (parseInt(e10.algorithm.hash.name.slice(4), 10) !== r11)
              throw sF(`SHA-${r11}`, "algorithm.hash");
            break;
          }
          default:
            throw TypeError("CryptoKey does not support this operation");
        }
        !function(e11, t11) {
          if (t11.length && !t11.some((t12) => e11.usages.includes(t12))) {
            let e12 = "CryptoKey does not support this operation, its usages must include ";
            if (t11.length > 2) {
              let r11 = t11.pop();
              e12 += `one of ${t11.join(", ")}, or ${r11}.`;
            } else
              2 === t11.length ? e12 += `one of ${t11[0]} or ${t11[1]}.` : e12 += `${t11[0]}.`;
            throw TypeError(e12);
          }
        }(e10, r10);
      }
      function sZ(e10, t10, ...r10) {
        if ((r10 = r10.filter(Boolean)).length > 2) {
          let t11 = r10.pop();
          e10 += `one of type ${r10.join(", ")}, or ${t11}.`;
        } else
          2 === r10.length ? e10 += `one of type ${r10[0]} or ${r10[1]}.` : e10 += `of type ${r10[0]}.`;
        return null == t10 ? e10 += ` Received ${t10}` : "function" == typeof t10 && t10.name ? e10 += ` Received function ${t10.name}` : "object" == typeof t10 && null != t10 && t10.constructor?.name && (e10 += ` Received an instance of ${t10.constructor.name}`), e10;
      }
      let sQ = (e10, ...t10) => sZ("Key must be ", e10, ...t10);
      function s0(e10, t10, ...r10) {
        return sZ(`Key for the ${e10} algorithm must be `, t10, ...r10);
      }
      let s1 = (e10) => !!sg(e10) || e10?.[Symbol.toStringTag] === "KeyObject", s2 = ["CryptoKey"];
      async function s3(e10, t10, r10, n10, i10, s10) {
        let o10, a2;
        if (!(t10 instanceof Uint8Array))
          throw TypeError(sQ(t10, "Uint8Array"));
        let c2 = parseInt(e10.slice(1, 4), 10), l2 = await sy.subtle.importKey("raw", t10.subarray(c2 >> 3), "AES-CBC", false, ["decrypt"]), u2 = await sy.subtle.importKey("raw", t10.subarray(0, c2 >> 3), { hash: `SHA-${c2 << 1}`, name: "HMAC" }, false, ["sign"]), h2 = sE(s10, n10, r10, function(e11) {
          let t11 = Math.floor(e11 / 4294967296), r11 = new Uint8Array(8);
          return s_(r11, t11, 0), s_(r11, e11 % 4294967296, 4), r11;
        }(s10.length << 3)), d2 = new Uint8Array((await sy.subtle.sign("HMAC", u2, h2)).slice(0, c2 >> 3));
        try {
          o10 = sV(i10, d2);
        } catch {
        }
        if (!o10)
          throw new sj();
        try {
          a2 = new Uint8Array(await sy.subtle.decrypt({ iv: n10, name: "AES-CBC" }, l2, r10));
        } catch {
        }
        if (!a2)
          throw new sj();
        return a2;
      }
      async function s5(e10, t10, r10, n10, i10, s10) {
        let o10;
        t10 instanceof Uint8Array ? o10 = await sy.subtle.importKey("raw", t10, "AES-GCM", false, ["decrypt"]) : (sY(t10, e10, "decrypt"), o10 = t10);
        try {
          return new Uint8Array(await sy.subtle.decrypt({ additionalData: s10, iv: n10, name: "AES-GCM", tagLength: 128 }, o10, sE(r10, i10)));
        } catch {
          throw new sj();
        }
      }
      let s4 = async (e10, t10, r10, n10, i10, s10) => {
        if (!sg(t10) && !(t10 instanceof Uint8Array))
          throw TypeError(sQ(t10, ...s2, "Uint8Array"));
        if (!n10)
          throw new sL("JWE Initialization Vector missing");
        if (!i10)
          throw new sL("JWE Authentication Tag missing");
        switch (sJ(e10, n10), e10) {
          case "A128CBC-HS256":
          case "A192CBC-HS384":
          case "A256CBC-HS512":
            return t10 instanceof Uint8Array && sG(t10, parseInt(e10.slice(-3), 10)), s3(e10, t10, r10, n10, i10, s10);
          case "A128GCM":
          case "A192GCM":
          case "A256GCM":
            return t10 instanceof Uint8Array && sG(t10, parseInt(e10.slice(1, 4), 10)), s5(e10, t10, r10, n10, i10, s10);
          default:
            throw new sM("Unsupported JWE Content Encryption Algorithm");
        }
      }, s8 = (...e10) => {
        let t10;
        let r10 = e10.filter(Boolean);
        if (0 === r10.length || 1 === r10.length)
          return true;
        for (let e11 of r10) {
          let r11 = Object.keys(e11);
          if (!t10 || 0 === t10.size) {
            t10 = new Set(r11);
            continue;
          }
          for (let e12 of r11) {
            if (t10.has(e12))
              return false;
            t10.add(e12);
          }
        }
        return true;
      };
      function s6(e10) {
        if ("object" != typeof e10 || null === e10 || "[object Object]" !== Object.prototype.toString.call(e10))
          return false;
        if (null === Object.getPrototypeOf(e10))
          return true;
        let t10 = e10;
        for (; null !== Object.getPrototypeOf(t10); )
          t10 = Object.getPrototypeOf(t10);
        return Object.getPrototypeOf(e10) === t10;
      }
      let s9 = [{ hash: "SHA-256", name: "HMAC" }, true, ["sign"]], s7 = async (e10, t10, r10) => {
        let n10 = await function(e11, t11, r11) {
          if (sg(e11))
            return sY(e11, t11, r11), e11;
          if (e11 instanceof Uint8Array)
            return sy.subtle.importKey("raw", e11, "AES-KW", true, [r11]);
          throw TypeError(sQ(e11, ...s2, "Uint8Array"));
        }(t10, e10, "unwrapKey");
        !function(e11, t11) {
          if (e11.algorithm.length !== parseInt(t11.slice(1, 4), 10))
            throw TypeError(`Invalid key size for alg: ${t11}`);
        }(n10, e10);
        let i10 = await sy.subtle.unwrapKey("raw", r10, n10, "AES-KW", ...s9);
        return new Uint8Array(await sy.subtle.exportKey("raw", i10));
      };
      async function oe(e10, t10, r10, n10, i10 = new Uint8Array(0), s10 = new Uint8Array(0)) {
        let o10;
        if (!sg(e10))
          throw TypeError(sQ(e10, ...s2));
        if (sY(e10, "ECDH"), !sg(t10))
          throw TypeError(sQ(t10, ...s2));
        sY(t10, "ECDH", "deriveBits");
        let a2 = sE(sR(sv.encode(r10)), sR(i10), sR(s10), sS(n10));
        return o10 = "X25519" === e10.algorithm.name ? 256 : "X448" === e10.algorithm.name ? 448 : Math.ceil(parseInt(e10.algorithm.namedCurve.substr(-3), 10) / 8) << 3, sk(new Uint8Array(await sy.subtle.deriveBits({ name: e10.algorithm.name, public: e10 }, t10, o10)), n10, a2);
      }
      async function ot(e10, t10, r10, n10) {
        !function(e11) {
          if (!(e11 instanceof Uint8Array) || e11.length < 8)
            throw new sL("PBES2 Salt Input must be 8 or more octets");
        }(e10);
        let i10 = sE(sv.encode(t10), new Uint8Array([0]), e10), s10 = parseInt(t10.slice(13, 16), 10), o10 = { hash: `SHA-${t10.slice(8, 11)}`, iterations: r10, name: "PBKDF2", salt: i10 }, a2 = await function(e11, t11) {
          if (e11 instanceof Uint8Array)
            return sy.subtle.importKey("raw", e11, "PBKDF2", false, ["deriveBits"]);
          if (sg(e11))
            return sY(e11, t11, "deriveBits", "deriveKey"), e11;
          throw TypeError(sQ(e11, ...s2, "Uint8Array"));
        }(n10, t10);
        if (a2.usages.includes("deriveBits"))
          return new Uint8Array(await sy.subtle.deriveBits(o10, a2, s10));
        if (a2.usages.includes("deriveKey"))
          return sy.subtle.deriveKey(o10, a2, { length: s10, name: "AES-KW" }, false, ["wrapKey", "unwrapKey"]);
        throw TypeError('PBKDF2 key "usages" must include "deriveBits" or "deriveKey"');
      }
      let or = async (e10, t10, r10, n10, i10) => {
        let s10 = await ot(i10, e10, n10, t10);
        return s7(e10.slice(-6), s10, r10);
      };
      function on(e10) {
        switch (e10) {
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            return "RSA-OAEP";
          default:
            throw new sM(`alg ${e10} is not supported either by JOSE or your javascript runtime`);
        }
      }
      let oi = (e10, t10) => {
        if (e10.startsWith("RS") || e10.startsWith("PS")) {
          let { modulusLength: r10 } = t10.algorithm;
          if ("number" != typeof r10 || r10 < 2048)
            throw TypeError(`${e10} requires key modulusLength to be 2048 bits or larger`);
        }
      }, os = async (e10, t10, r10) => {
        if (!sg(t10))
          throw TypeError(sQ(t10, ...s2));
        if (sY(t10, e10, "decrypt", "unwrapKey"), oi(e10, t10), t10.usages.includes("decrypt"))
          return new Uint8Array(await sy.subtle.decrypt(on(e10), t10, r10));
        if (t10.usages.includes("unwrapKey")) {
          let n10 = await sy.subtle.unwrapKey("raw", r10, t10, on(e10), ...s9);
          return new Uint8Array(await sy.subtle.exportKey("raw", n10));
        }
        throw TypeError('RSA-OAEP key "usages" must include "decrypt" or "unwrapKey" for this operation');
      };
      function oo(e10) {
        return s6(e10) && "string" == typeof e10.kty;
      }
      let oa = async (e10) => {
        if (!e10.alg)
          throw TypeError('"alg" argument is required when "jwk.alg" is not present');
        let { algorithm: t10, keyUsages: r10 } = function(e11) {
          let t11, r11;
          switch (e11.kty) {
            case "RSA":
              switch (e11.alg) {
                case "PS256":
                case "PS384":
                case "PS512":
                  t11 = { name: "RSA-PSS", hash: `SHA-${e11.alg.slice(-3)}` }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "RS256":
                case "RS384":
                case "RS512":
                  t11 = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${e11.alg.slice(-3)}` }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "RSA-OAEP":
                case "RSA-OAEP-256":
                case "RSA-OAEP-384":
                case "RSA-OAEP-512":
                  t11 = { name: "RSA-OAEP", hash: `SHA-${parseInt(e11.alg.slice(-3), 10) || 1}` }, r11 = e11.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
                  break;
                default:
                  throw new sM('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "EC":
              switch (e11.alg) {
                case "ES256":
                  t11 = { name: "ECDSA", namedCurve: "P-256" }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "ES384":
                  t11 = { name: "ECDSA", namedCurve: "P-384" }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "ES512":
                  t11 = { name: "ECDSA", namedCurve: "P-521" }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  t11 = { name: "ECDH", namedCurve: e11.crv }, r11 = e11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new sM('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            case "OKP":
              switch (e11.alg) {
                case "Ed25519":
                  t11 = { name: "Ed25519" }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "EdDSA":
                  t11 = { name: e11.crv }, r11 = e11.d ? ["sign"] : ["verify"];
                  break;
                case "ECDH-ES":
                case "ECDH-ES+A128KW":
                case "ECDH-ES+A192KW":
                case "ECDH-ES+A256KW":
                  t11 = { name: e11.crv }, r11 = e11.d ? ["deriveBits"] : [];
                  break;
                default:
                  throw new sM('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
              }
              break;
            default:
              throw new sM('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
          }
          return { algorithm: t11, keyUsages: r11 };
        }(e10), n10 = [t10, e10.ext ?? false, e10.key_ops ?? r10], i10 = { ...e10 };
        return delete i10.alg, delete i10.use, sy.subtle.importKey("jwk", i10, ...n10);
      }, oc = (e10) => sC(e10), ol = (e10) => e10?.[Symbol.toStringTag] === "KeyObject", ou = async (e10, t10, r10, n10, i10 = false) => {
        let s10 = e10.get(t10);
        if (s10?.[n10])
          return s10[n10];
        let o10 = await oa({ ...r10, alg: n10 });
        return i10 && Object.freeze(t10), s10 ? s10[n10] = o10 : e10.set(t10, { [n10]: o10 }), o10;
      }, oh = { normalizePrivateKey: (e10, t10) => {
        if (ol(e10)) {
          let r10 = e10.export({ format: "jwk" });
          return r10.k ? oc(r10.k) : (i || (i = /* @__PURE__ */ new WeakMap()), ou(i, e10, r10, t10));
        }
        return oo(e10) ? e10.k ? sC(e10.k) : (i || (i = /* @__PURE__ */ new WeakMap()), ou(i, e10, e10, t10, true)) : e10;
      } }, od = sy.getRandomValues.bind(sy);
      function op(e10) {
        switch (e10) {
          case "A128GCM":
            return 128;
          case "A192GCM":
            return 192;
          case "A256GCM":
          case "A128CBC-HS256":
            return 256;
          case "A192CBC-HS384":
            return 384;
          case "A256CBC-HS512":
            return 512;
          default:
            throw new sM(`Unsupported JWE Algorithm: ${e10}`);
        }
      }
      let of = (e10) => od(new Uint8Array(op(e10) >> 3));
      async function om(e10, t10) {
        if (!s6(e10))
          throw TypeError("JWK must be an object");
        switch (t10 || (t10 = e10.alg), e10.kty) {
          case "oct":
            if ("string" != typeof e10.k || !e10.k)
              throw TypeError('missing "k" (Key Value) Parameter value');
            return sC(e10.k);
          case "RSA":
            if ("oth" in e10 && void 0 !== e10.oth)
              throw new sM('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
          case "EC":
          case "OKP":
            return oa({ ...e10, alg: t10 });
          default:
            throw new sM('Unsupported "kty" (Key Type) Parameter value');
        }
      }
      let ow = (e10) => e10?.[Symbol.toStringTag], oy = (e10, t10, r10) => {
        if (void 0 !== t10.use && "sig" !== t10.use)
          throw TypeError("Invalid key for this operation, when present its use must be sig");
        if (void 0 !== t10.key_ops && t10.key_ops.includes?.(r10) !== true)
          throw TypeError(`Invalid key for this operation, when present its key_ops must include ${r10}`);
        if (void 0 !== t10.alg && t10.alg !== e10)
          throw TypeError(`Invalid key for this operation, when present its alg must be ${e10}`);
        return true;
      }, og = (e10, t10, r10, n10) => {
        if (!(t10 instanceof Uint8Array)) {
          if (n10 && oo(t10)) {
            if (function(e11) {
              return oo(e11) && "oct" === e11.kty && "string" == typeof e11.k;
            }(t10) && oy(e10, t10, r10))
              return;
            throw TypeError('JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present');
          }
          if (!s1(t10))
            throw TypeError(s0(e10, t10, ...s2, "Uint8Array", n10 ? "JSON Web Key" : null));
          if ("secret" !== t10.type)
            throw TypeError(`${ow(t10)} instances for symmetric algorithms must be of type "secret"`);
        }
      }, ob = (e10, t10, r10, n10) => {
        if (n10 && oo(t10))
          switch (r10) {
            case "sign":
              if (function(e11) {
                return "oct" !== e11.kty && "string" == typeof e11.d;
              }(t10) && oy(e10, t10, r10))
                return;
              throw TypeError("JSON Web Key for this operation be a private JWK");
            case "verify":
              if (function(e11) {
                return "oct" !== e11.kty && void 0 === e11.d;
              }(t10) && oy(e10, t10, r10))
                return;
              throw TypeError("JSON Web Key for this operation be a public JWK");
          }
        if (!s1(t10))
          throw TypeError(s0(e10, t10, ...s2, n10 ? "JSON Web Key" : null));
        if ("secret" === t10.type)
          throw TypeError(`${ow(t10)} instances for asymmetric algorithms must not be of type "secret"`);
        if ("sign" === r10 && "public" === t10.type)
          throw TypeError(`${ow(t10)} instances for asymmetric algorithm signing must be of type "private"`);
        if ("decrypt" === r10 && "public" === t10.type)
          throw TypeError(`${ow(t10)} instances for asymmetric algorithm decryption must be of type "private"`);
        if (t10.algorithm && "verify" === r10 && "private" === t10.type)
          throw TypeError(`${ow(t10)} instances for asymmetric algorithm verifying must be of type "public"`);
        if (t10.algorithm && "encrypt" === r10 && "private" === t10.type)
          throw TypeError(`${ow(t10)} instances for asymmetric algorithm encryption must be of type "public"`);
      };
      function ov(e10, t10, r10, n10) {
        t10.startsWith("HS") || "dir" === t10 || t10.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(t10) ? og(t10, r10, n10, e10) : ob(t10, r10, n10, e10);
      }
      let ox = ov.bind(void 0, false);
      async function oE(e10, t10, r10, n10, i10) {
        return s4(e10.slice(0, 7), t10, r10, n10, i10, new Uint8Array(0));
      }
      async function o_(e10, t10, r10, n10, i10) {
        switch (ox(e10, t10, "decrypt"), t10 = await oh.normalizePrivateKey?.(t10, e10) || t10, e10) {
          case "dir":
            if (void 0 !== r10)
              throw new sL("Encountered unexpected JWE Encrypted Key");
            return t10;
          case "ECDH-ES":
            if (void 0 !== r10)
              throw new sL("Encountered unexpected JWE Encrypted Key");
          case "ECDH-ES+A128KW":
          case "ECDH-ES+A192KW":
          case "ECDH-ES+A256KW": {
            let i11, s10;
            if (!s6(n10.epk))
              throw new sL('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
            if (!function(e11) {
              if (!sg(e11))
                throw TypeError(sQ(e11, ...s2));
              return ["P-256", "P-384", "P-521"].includes(e11.algorithm.namedCurve) || "X25519" === e11.algorithm.name || "X448" === e11.algorithm.name;
            }(t10))
              throw new sM("ECDH with the provided key is not allowed or not supported by your javascript runtime");
            let o10 = await om(n10.epk, e10);
            if (void 0 !== n10.apu) {
              if ("string" != typeof n10.apu)
                throw new sL('JOSE Header "apu" (Agreement PartyUInfo) invalid');
              try {
                i11 = sC(n10.apu);
              } catch {
                throw new sL("Failed to base64url decode the apu");
              }
            }
            if (void 0 !== n10.apv) {
              if ("string" != typeof n10.apv)
                throw new sL('JOSE Header "apv" (Agreement PartyVInfo) invalid');
              try {
                s10 = sC(n10.apv);
              } catch {
                throw new sL("Failed to base64url decode the apv");
              }
            }
            let a2 = await oe(o10, t10, "ECDH-ES" === e10 ? n10.enc : e10, "ECDH-ES" === e10 ? op(n10.enc) : parseInt(e10.slice(-5, -2), 10), i11, s10);
            if ("ECDH-ES" === e10)
              return a2;
            if (void 0 === r10)
              throw new sL("JWE Encrypted Key missing");
            return s7(e10.slice(-6), a2, r10);
          }
          case "RSA1_5":
          case "RSA-OAEP":
          case "RSA-OAEP-256":
          case "RSA-OAEP-384":
          case "RSA-OAEP-512":
            if (void 0 === r10)
              throw new sL("JWE Encrypted Key missing");
            return os(e10, t10, r10);
          case "PBES2-HS256+A128KW":
          case "PBES2-HS384+A192KW":
          case "PBES2-HS512+A256KW": {
            let s10;
            if (void 0 === r10)
              throw new sL("JWE Encrypted Key missing");
            if ("number" != typeof n10.p2c)
              throw new sL('JOSE Header "p2c" (PBES2 Count) missing or invalid');
            let o10 = i10?.maxPBES2Count || 1e4;
            if (n10.p2c > o10)
              throw new sL('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
            if ("string" != typeof n10.p2s)
              throw new sL('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
            try {
              s10 = sC(n10.p2s);
            } catch {
              throw new sL("Failed to base64url decode the p2s");
            }
            return or(e10, t10, r10, n10.p2c, s10);
          }
          case "A128KW":
          case "A192KW":
          case "A256KW":
            if (void 0 === r10)
              throw new sL("JWE Encrypted Key missing");
            return s7(e10, t10, r10);
          case "A128GCMKW":
          case "A192GCMKW":
          case "A256GCMKW": {
            let i11, s10;
            if (void 0 === r10)
              throw new sL("JWE Encrypted Key missing");
            if ("string" != typeof n10.iv)
              throw new sL('JOSE Header "iv" (Initialization Vector) missing or invalid');
            if ("string" != typeof n10.tag)
              throw new sL('JOSE Header "tag" (Authentication Tag) missing or invalid');
            try {
              i11 = sC(n10.iv);
            } catch {
              throw new sL("Failed to base64url decode the iv");
            }
            try {
              s10 = sC(n10.tag);
            } catch {
              throw new sL("Failed to base64url decode the tag");
            }
            return oE(e10, t10, r10, i11, s10);
          }
          default:
            throw new sM('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
      }
      ov.bind(void 0, true);
      let oS = function(e10, t10, r10, n10, i10) {
        let s10;
        if (void 0 !== i10.crit && n10?.crit === void 0)
          throw new e10('"crit" (Critical) Header Parameter MUST be integrity protected');
        if (!n10 || void 0 === n10.crit)
          return /* @__PURE__ */ new Set();
        if (!Array.isArray(n10.crit) || 0 === n10.crit.length || n10.crit.some((e11) => "string" != typeof e11 || 0 === e11.length))
          throw new e10('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
        for (let o10 of (s10 = void 0 !== r10 ? new Map([...Object.entries(r10), ...t10.entries()]) : t10, n10.crit)) {
          if (!s10.has(o10))
            throw new sM(`Extension Header Parameter "${o10}" is not recognized`);
          if (void 0 === i10[o10])
            throw new e10(`Extension Header Parameter "${o10}" is missing`);
          if (s10.get(o10) && void 0 === n10[o10])
            throw new e10(`Extension Header Parameter "${o10}" MUST be integrity protected`);
        }
        return new Set(n10.crit);
      }, oR = (e10, t10) => {
        if (void 0 !== t10 && (!Array.isArray(t10) || t10.some((e11) => "string" != typeof e11)))
          throw TypeError(`"${e10}" option must be an array of strings`);
        if (t10)
          return new Set(t10);
      };
      async function ok(e10, t10, r10) {
        let n10, i10, s10, o10, a2, c2, l2;
        if (!s6(e10))
          throw new sL("Flattened JWE must be an object");
        if (void 0 === e10.protected && void 0 === e10.header && void 0 === e10.unprotected)
          throw new sL("JOSE Header missing");
        if (void 0 !== e10.iv && "string" != typeof e10.iv)
          throw new sL("JWE Initialization Vector incorrect type");
        if ("string" != typeof e10.ciphertext)
          throw new sL("JWE Ciphertext missing or incorrect type");
        if (void 0 !== e10.tag && "string" != typeof e10.tag)
          throw new sL("JWE Authentication Tag incorrect type");
        if (void 0 !== e10.protected && "string" != typeof e10.protected)
          throw new sL("JWE Protected Header incorrect type");
        if (void 0 !== e10.encrypted_key && "string" != typeof e10.encrypted_key)
          throw new sL("JWE Encrypted Key incorrect type");
        if (void 0 !== e10.aad && "string" != typeof e10.aad)
          throw new sL("JWE AAD incorrect type");
        if (void 0 !== e10.header && !s6(e10.header))
          throw new sL("JWE Shared Unprotected Header incorrect type");
        if (void 0 !== e10.unprotected && !s6(e10.unprotected))
          throw new sL("JWE Per-Recipient Unprotected Header incorrect type");
        if (e10.protected)
          try {
            let t11 = sC(e10.protected);
            n10 = JSON.parse(sx.decode(t11));
          } catch {
            throw new sL("JWE Protected Header is invalid");
          }
        if (!s8(n10, e10.header, e10.unprotected))
          throw new sL("JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint");
        let u2 = { ...n10, ...e10.header, ...e10.unprotected };
        if (oS(sL, /* @__PURE__ */ new Map(), r10?.crit, n10, u2), void 0 !== u2.zip)
          throw new sM('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
        let { alg: h2, enc: d2 } = u2;
        if ("string" != typeof h2 || !h2)
          throw new sL("missing JWE Algorithm (alg) in JWE Header");
        if ("string" != typeof d2 || !d2)
          throw new sL("missing JWE Encryption Algorithm (enc) in JWE Header");
        let p2 = r10 && oR("keyManagementAlgorithms", r10.keyManagementAlgorithms), f2 = r10 && oR("contentEncryptionAlgorithms", r10.contentEncryptionAlgorithms);
        if (p2 && !p2.has(h2) || !p2 && h2.startsWith("PBES2"))
          throw new sD('"alg" (Algorithm) Header Parameter value not allowed');
        if (f2 && !f2.has(d2))
          throw new sD('"enc" (Encryption Algorithm) Header Parameter value not allowed');
        if (void 0 !== e10.encrypted_key)
          try {
            i10 = sC(e10.encrypted_key);
          } catch {
            throw new sL("Failed to base64url decode the encrypted_key");
          }
        let m2 = false;
        "function" == typeof t10 && (t10 = await t10(n10, e10), m2 = true);
        try {
          s10 = await o_(h2, t10, i10, u2, r10);
        } catch (e11) {
          if (e11 instanceof TypeError || e11 instanceof sL || e11 instanceof sM)
            throw e11;
          s10 = of(d2);
        }
        if (void 0 !== e10.iv)
          try {
            o10 = sC(e10.iv);
          } catch {
            throw new sL("Failed to base64url decode the iv");
          }
        if (void 0 !== e10.tag)
          try {
            a2 = sC(e10.tag);
          } catch {
            throw new sL("Failed to base64url decode the tag");
          }
        let w2 = sv.encode(e10.protected ?? "");
        c2 = void 0 !== e10.aad ? sE(w2, sv.encode("."), sv.encode(e10.aad)) : w2;
        try {
          l2 = sC(e10.ciphertext);
        } catch {
          throw new sL("Failed to base64url decode the ciphertext");
        }
        let y2 = { plaintext: await s4(d2, s10, l2, o10, a2, c2) };
        if (void 0 !== e10.protected && (y2.protectedHeader = n10), void 0 !== e10.aad)
          try {
            y2.additionalAuthenticatedData = sC(e10.aad);
          } catch {
            throw new sL("Failed to base64url decode the aad");
          }
        return (void 0 !== e10.unprotected && (y2.sharedUnprotectedHeader = e10.unprotected), void 0 !== e10.header && (y2.unprotectedHeader = e10.header), m2) ? { ...y2, key: t10 } : y2;
      }
      async function oO(e10, t10, r10) {
        if (e10 instanceof Uint8Array && (e10 = sx.decode(e10)), "string" != typeof e10)
          throw new sL("Compact JWE must be a string or Uint8Array");
        let { 0: n10, 1: i10, 2: s10, 3: o10, 4: a2, length: c2 } = e10.split(".");
        if (5 !== c2)
          throw new sL("Invalid Compact JWE");
        let l2 = await ok({ ciphertext: o10, iv: s10 || void 0, protected: n10, tag: a2 || void 0, encrypted_key: i10 || void 0 }, t10, r10), u2 = { plaintext: l2.plaintext, protectedHeader: l2.protectedHeader };
        return "function" == typeof t10 ? { ...u2, key: l2.key } : u2;
      }
      let oA = (e10) => Math.floor(e10.getTime() / 1e3), oT = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i, oC = (e10) => {
        let t10;
        let r10 = oT.exec(e10);
        if (!r10 || r10[4] && r10[1])
          throw TypeError("Invalid time period format");
        let n10 = parseFloat(r10[2]);
        switch (r10[3].toLowerCase()) {
          case "sec":
          case "secs":
          case "second":
          case "seconds":
          case "s":
            t10 = Math.round(n10);
            break;
          case "minute":
          case "minutes":
          case "min":
          case "mins":
          case "m":
            t10 = Math.round(60 * n10);
            break;
          case "hour":
          case "hours":
          case "hr":
          case "hrs":
          case "h":
            t10 = Math.round(3600 * n10);
            break;
          case "day":
          case "days":
          case "d":
            t10 = Math.round(86400 * n10);
            break;
          case "week":
          case "weeks":
          case "w":
            t10 = Math.round(604800 * n10);
            break;
          default:
            t10 = Math.round(31557600 * n10);
        }
        return "-" === r10[1] || "ago" === r10[4] ? -t10 : t10;
      }, oP = (e10) => e10.toLowerCase().replace(/^application\//, ""), oI = (e10, t10) => "string" == typeof e10 ? t10.includes(e10) : !!Array.isArray(e10) && t10.some(Set.prototype.has.bind(new Set(e10))), oN = (e10, t10, r10 = {}) => {
        let n10, i10;
        try {
          n10 = JSON.parse(sx.decode(t10));
        } catch {
        }
        if (!s6(n10))
          throw new sW("JWT Claims Set must be a top-level JSON object");
        let { typ: s10 } = r10;
        if (s10 && ("string" != typeof e10.typ || oP(e10.typ) !== oP(s10)))
          throw new sI('unexpected "typ" JWT header value', n10, "typ", "check_failed");
        let { requiredClaims: o10 = [], issuer: a2, subject: c2, audience: l2, maxTokenAge: u2 } = r10, h2 = [...o10];
        for (let e11 of (void 0 !== u2 && h2.push("iat"), void 0 !== l2 && h2.push("aud"), void 0 !== c2 && h2.push("sub"), void 0 !== a2 && h2.push("iss"), new Set(h2.reverse())))
          if (!(e11 in n10))
            throw new sI(`missing required "${e11}" claim`, n10, e11, "missing");
        if (a2 && !(Array.isArray(a2) ? a2 : [a2]).includes(n10.iss))
          throw new sI('unexpected "iss" claim value', n10, "iss", "check_failed");
        if (c2 && n10.sub !== c2)
          throw new sI('unexpected "sub" claim value', n10, "sub", "check_failed");
        if (l2 && !oI(n10.aud, "string" == typeof l2 ? [l2] : l2))
          throw new sI('unexpected "aud" claim value', n10, "aud", "check_failed");
        switch (typeof r10.clockTolerance) {
          case "string":
            i10 = oC(r10.clockTolerance);
            break;
          case "number":
            i10 = r10.clockTolerance;
            break;
          case "undefined":
            i10 = 0;
            break;
          default:
            throw TypeError("Invalid clockTolerance option type");
        }
        let { currentDate: d2 } = r10, p2 = oA(d2 || /* @__PURE__ */ new Date());
        if ((void 0 !== n10.iat || u2) && "number" != typeof n10.iat)
          throw new sI('"iat" claim must be a number', n10, "iat", "invalid");
        if (void 0 !== n10.nbf) {
          if ("number" != typeof n10.nbf)
            throw new sI('"nbf" claim must be a number', n10, "nbf", "invalid");
          if (n10.nbf > p2 + i10)
            throw new sI('"nbf" claim timestamp check failed', n10, "nbf", "check_failed");
        }
        if (void 0 !== n10.exp) {
          if ("number" != typeof n10.exp)
            throw new sI('"exp" claim must be a number', n10, "exp", "invalid");
          if (n10.exp <= p2 - i10)
            throw new sN('"exp" claim timestamp check failed', n10, "exp", "check_failed");
        }
        if (u2) {
          let e11 = p2 - n10.iat;
          if (e11 - i10 > ("number" == typeof u2 ? u2 : oC(u2)))
            throw new sN('"iat" claim timestamp check failed (too far in the past)', n10, "iat", "check_failed");
          if (e11 < 0 - i10)
            throw new sI('"iat" claim timestamp check failed (it should be in the past)', n10, "iat", "check_failed");
        }
        return n10;
      };
      async function oD(e10, t10, r10) {
        let n10 = await oO(e10, t10, r10), i10 = oN(n10.protectedHeader, n10.plaintext, r10), { protectedHeader: s10 } = n10;
        if (void 0 !== s10.iss && s10.iss !== i10.iss)
          throw new sI('replicated "iss" claim header parameter mismatch', i10, "iss", "mismatch");
        if (void 0 !== s10.sub && s10.sub !== i10.sub)
          throw new sI('replicated "sub" claim header parameter mismatch', i10, "sub", "mismatch");
        if (void 0 !== s10.aud && JSON.stringify(s10.aud) !== JSON.stringify(i10.aud))
          throw new sI('replicated "aud" claim header parameter mismatch', i10, "aud", "mismatch");
        let o10 = { payload: i10, protectedHeader: s10 };
        return "function" == typeof t10 ? { ...o10, key: n10.key } : o10;
      }
      let oM = (e10, t10) => {
        if ("string" != typeof e10 || !e10)
          throw new sB(`${t10} missing or invalid`);
      };
      async function oj(e10, t10) {
        let r10;
        if (!s6(e10))
          throw TypeError("JWK must be an object");
        if (t10 ?? (t10 = "sha256"), "sha256" !== t10 && "sha384" !== t10 && "sha512" !== t10)
          throw TypeError('digestAlgorithm must one of "sha256", "sha384", or "sha512"');
        switch (e10.kty) {
          case "EC":
            oM(e10.crv, '"crv" (Curve) Parameter'), oM(e10.x, '"x" (X Coordinate) Parameter'), oM(e10.y, '"y" (Y Coordinate) Parameter'), r10 = { crv: e10.crv, kty: e10.kty, x: e10.x, y: e10.y };
            break;
          case "OKP":
            oM(e10.crv, '"crv" (Subtype of Key Pair) Parameter'), oM(e10.x, '"x" (Public Key) Parameter'), r10 = { crv: e10.crv, kty: e10.kty, x: e10.x };
            break;
          case "RSA":
            oM(e10.e, '"e" (Exponent) Parameter'), oM(e10.n, '"n" (Modulus) Parameter'), r10 = { e: e10.e, kty: e10.kty, n: e10.n };
            break;
          case "oct":
            oM(e10.k, '"k" (Key Value) Parameter'), r10 = { k: e10.k, kty: e10.kty };
            break;
          default:
            throw new sM('"kty" (Key Type) Parameter missing or unsupported');
        }
        let n10 = sv.encode(JSON.stringify(r10));
        return sA(await sb(t10, n10));
      }
      var oL = function(e10, t10, r10, n10, i10) {
        if ("m" === n10)
          throw TypeError("Private method is not writable");
        if ("a" === n10 && !i10)
          throw TypeError("Private accessor was defined without a setter");
        if ("function" == typeof t10 ? e10 !== t10 || !i10 : !t10.has(e10))
          throw TypeError("Cannot write private member to an object whose class did not declare it");
        return "a" === n10 ? i10.call(e10, r10) : i10 ? i10.value = r10 : t10.set(e10, r10), r10;
      }, oU = function(e10, t10, r10, n10) {
        if ("a" === r10 && !n10)
          throw TypeError("Private accessor was defined without a getter");
        if ("function" == typeof t10 ? e10 !== t10 || !n10 : !t10.has(e10))
          throw TypeError("Cannot read private member from an object whose class did not declare it");
        return "m" === r10 ? n10 : "a" === r10 ? n10.call(e10) : n10 ? n10.value : t10.get(e10);
      };
      class oW {
        constructor(e10, t10, r10) {
          if (s.add(this), o.set(this, {}), a.set(this, void 0), c.set(this, void 0), oL(this, c, r10, "f"), oL(this, a, e10, "f"), !t10)
            return;
          let { name: n10 } = e10;
          for (let [e11, r11] of Object.entries(t10))
            e11.startsWith(n10) && r11 && (oU(this, o, "f")[e11] = r11);
        }
        get value() {
          return Object.keys(oU(this, o, "f")).sort((e10, t10) => parseInt(e10.split(".").pop() || "0") - parseInt(t10.split(".").pop() || "0")).map((e10) => oU(this, o, "f")[e10]).join("");
        }
        chunk(e10, t10) {
          let r10 = oU(this, s, "m", u).call(this);
          for (let n10 of oU(this, s, "m", l).call(this, { name: oU(this, a, "f").name, value: e10, options: { ...oU(this, a, "f").options, ...t10 } }))
            r10[n10.name] = n10;
          return Object.values(r10);
        }
        clean() {
          return Object.values(oU(this, s, "m", u).call(this));
        }
      }
      o = /* @__PURE__ */ new WeakMap(), a = /* @__PURE__ */ new WeakMap(), c = /* @__PURE__ */ new WeakMap(), s = /* @__PURE__ */ new WeakSet(), l = function(e10) {
        let t10 = Math.ceil(e10.value.length / 3936);
        if (1 === t10)
          return oU(this, o, "f")[e10.name] = e10.value, [e10];
        let r10 = [];
        for (let n10 = 0; n10 < t10; n10++) {
          let t11 = `${e10.name}.${n10}`, i10 = e10.value.substr(3936 * n10, 3936);
          r10.push({ ...e10, name: t11, value: i10 }), oU(this, o, "f")[t11] = i10;
        }
        return oU(this, c, "f").debug("CHUNKING_SESSION_COOKIE", { message: "Session cookie exceeds allowed 4096 bytes.", emptyCookieSize: 160, valueSize: e10.value.length, chunks: r10.map((e11) => e11.value.length + 160) }), r10;
      }, u = function() {
        let e10 = {};
        for (let t10 in oU(this, o, "f"))
          delete oU(this, o, "f")?.[t10], e10[t10] = { name: t10, value: "", options: { ...oU(this, a, "f").options, maxAge: 0 } };
        return e10;
      };
      class oB extends Error {
        constructor(e10, t10) {
          e10 instanceof Error ? super(void 0, { cause: { err: e10, ...e10.cause, ...t10 } }) : "string" == typeof e10 ? (t10 instanceof Error && (t10 = { err: t10, ...t10.cause }), super(e10, t10)) : super(void 0, e10), this.name = this.constructor.name, this.type = this.constructor.type ?? "AuthError", this.kind = this.constructor.kind ?? "error", Error.captureStackTrace?.(this, this.constructor);
          let r10 = `https://errors.authjs.dev#${this.type.toLowerCase()}`;
          this.message += `${this.message ? ". " : ""}Read more at ${r10}`;
        }
      }
      class o$ extends oB {
      }
      o$.kind = "signIn";
      class oq extends oB {
      }
      oq.type = "AdapterError";
      class oH extends oB {
      }
      oH.type = "AccessDenied";
      class oK extends oB {
      }
      oK.type = "CallbackRouteError";
      class oz extends oB {
      }
      oz.type = "ErrorPageLoop";
      class oJ extends oB {
      }
      oJ.type = "EventError";
      class oG extends oB {
      }
      oG.type = "InvalidCallbackUrl";
      class oV extends o$ {
        constructor() {
          super(...arguments), this.code = "credentials";
        }
      }
      oV.type = "CredentialsSignin";
      class oF extends oB {
      }
      oF.type = "InvalidEndpoints";
      class oX extends oB {
      }
      oX.type = "InvalidCheck";
      class oY extends oB {
      }
      oY.type = "JWTSessionError";
      class oZ extends oB {
      }
      oZ.type = "MissingAdapter";
      class oQ extends oB {
      }
      oQ.type = "MissingAdapterMethods";
      class o0 extends oB {
      }
      o0.type = "MissingAuthorize";
      class o1 extends oB {
      }
      o1.type = "MissingSecret";
      class o2 extends o$ {
      }
      o2.type = "OAuthAccountNotLinked";
      class o3 extends o$ {
      }
      o3.type = "OAuthCallbackError";
      class o5 extends oB {
      }
      o5.type = "OAuthProfileParseError";
      class o4 extends oB {
      }
      o4.type = "SessionTokenError";
      class o8 extends o$ {
      }
      o8.type = "OAuthSignInError";
      class o6 extends o$ {
      }
      o6.type = "EmailSignInError";
      class o9 extends oB {
      }
      o9.type = "SignOutError";
      class o7 extends oB {
      }
      o7.type = "UnknownAction";
      class ae extends oB {
      }
      ae.type = "UnsupportedStrategy";
      class at extends oB {
      }
      at.type = "InvalidProvider";
      class ar extends oB {
      }
      ar.type = "UntrustedHost";
      class an extends oB {
      }
      an.type = "Verification";
      class ai extends o$ {
      }
      ai.type = "MissingCSRF";
      class as extends oB {
      }
      as.type = "DuplicateConditionalUI";
      class ao extends oB {
      }
      ao.type = "MissingWebAuthnAutocomplete";
      class aa extends oB {
      }
      aa.type = "WebAuthnVerificationError";
      class ac extends o$ {
      }
      ac.type = "AccountNotLinked";
      class al extends oB {
      }
      al.type = "ExperimentalFeatureNotEnabled";
      var au = r(995);
      async function ah(e10) {
        let { token: t10, secret: r10, salt: n10 } = e10, i10 = Array.isArray(r10) ? r10 : [r10];
        if (!t10)
          return null;
        let { payload: s10 } = await oD(t10, async ({ kid: e11, enc: t11 }) => {
          for (let r11 of i10) {
            let i11 = await ap(t11, r11, n10);
            if (void 0 === e11 || e11 === await oj({ kty: "oct", k: sA(i11) }, `sha${i11.byteLength << 3}`))
              return i11;
          }
          throw Error("no matching decryption secret");
        }, { clockTolerance: 15, keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"] });
        return s10;
      }
      async function ad(e10) {
        let { secureCookie: t10, cookieName: r10 = function(e11) {
          let t11 = e11 ? "__Secure-" : "";
          return { sessionToken: { name: `${t11}authjs.session-token`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11 } }, callbackUrl: { name: `${t11}authjs.callback-url`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11 } }, csrfToken: { name: `${e11 ? "__Host-" : ""}authjs.csrf-token`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11 } }, pkceCodeVerifier: { name: `${t11}authjs.pkce.code_verifier`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11, maxAge: 900 } }, state: { name: `${t11}authjs.state`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11, maxAge: 900 } }, nonce: { name: `${t11}authjs.nonce`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11 } }, webauthnChallenge: { name: `${t11}authjs.challenge`, options: { httpOnly: true, sameSite: "lax", path: "/", secure: e11, maxAge: 900 } } };
        }(t10 ?? false).sessionToken.name, decode: n10 = ah, salt: i10 = r10, secret: s10, logger: o10 = console, raw: a2, req: c2 } = e10;
        if (!c2)
          throw Error("Must pass `req` to JWT getToken()");
        let l2 = c2.headers instanceof Headers ? c2.headers : new Headers(c2.headers), u2 = new oW({ name: r10, options: { secure: t10 } }, (0, au.q)(l2.get("cookie") ?? ""), o10).value, h2 = l2.get("authorization");
        if (u2 || h2?.split(" ")[0] !== "Bearer" || (u2 = decodeURIComponent(h2.split(" ")[1])), !u2)
          return null;
        if (a2)
          return u2;
        if (!s10)
          throw new o1("Must pass `secret` if not set to JWT getToken()");
        try {
          return await n10({ token: u2, secret: s10, salt: i10 });
        } catch {
          return null;
        }
      }
      async function ap(e10, t10, r10) {
        let n10;
        switch (e10) {
          case "A256CBC-HS512":
            n10 = 64;
            break;
          case "A256GCM":
            n10 = 32;
            break;
          default:
            throw Error("Unsupported JWT Content Encryption Algorithm");
        }
        return await sw("sha256", t10, r10, `Auth.js Generated Encryption Key (${r10})`, n10);
      }
      async function af(e10) {
        let t10 = await ad({ req: e10, secret: process.env.NEXTAUTH_SECRET });
        return t10 ? { id: t10.id, role: t10.role, defaultOrganizationId: t10.defaultOrganizationId } : null;
      }
      let am = ["/dashboard", "/chat", "/integrations", "/settings", "/api/chat", "/api/integrations"], aw = ["/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email"], ay = ["/about", "/pricing", "/contact", "/privacy", "/terms", "/api/webhooks", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"], ag = ["/", "/home", "/landing"], ab = ["/_next/static", "/images", "/fonts", "/icons"];
      function av(e10, t10) {
        return t10.some((t11) => e10 === t11 || e10.startsWith(`${t11}/`));
      }
      async function ax(e10) {
        let t10 = await af(e10), r10 = e10.nextUrl.pathname, n10 = await sd(e10);
        if (n10)
          return n10;
        let i10 = await rn(e10);
        if (i10)
          return i10;
        let s10 = X.next();
        s10.headers.set("Cache-Control", ab.some((e11) => r10.startsWith(e11)) ? "public, max-age=31536000, immutable" : r10.startsWith("/api/") ? "no-store, no-cache, must-revalidate" : "public, max-age=0, must-revalidate");
        let o10 = Date.now(), a2 = Date.now();
        s10.headers.set("Server-Timing", `edge;dur=${a2 - o10};desc="Edge Middleware"`);
        let c2 = av(r10, am), l2 = av(r10, aw);
        av(r10, ay);
        let u2 = av(r10, ag);
        if (!t10 && c2) {
          let t11 = new URL("/auth/login", e10.url);
          return t11.searchParams.set("callbackUrl", r10), X.redirect(t11);
        }
        return t10 && l2 || t10 && u2 || t10 && r10.startsWith("/org") && !r10.split("/")[2] && t10.defaultOrganizationId ? X.redirect(new URL("/dashboard", e10.url)) : s10;
      }
      let aE = { matcher: ["/((?!favicon.ico|public).*)", "/", "/dashboard/:path*", "/chat/:path*", "/integrations/:path*", "/org/:path*", "/settings/:path*"] };
      Object.values({ NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401 });
      let a_ = { ...d }, aS = a_.middleware || a_.default, aR = "/src/middleware";
      if ("function" != typeof aS)
        throw Object.defineProperty(Error(`The Middleware "${aR}" must export a \`middleware\` or a \`default\` function`), "__NEXT_ERROR_CODE", { value: "E120", enumerable: false, configurable: true });
      function ak(e10) {
        return ti({ ...e10, page: aR, handler: async (...e11) => {
          try {
            return await aS(...e11);
          } catch (i10) {
            let t10 = e11[0], r10 = new URL(t10.url), n10 = r10.pathname + r10.search;
            throw await w(i10, { path: n10, method: t10.method, headers: Object.fromEntries(t10.headers.entries()) }, { routerKind: "Pages Router", routePath: "/middleware", routeType: "middleware", revalidateReason: void 0 }), i10;
          }
        } });
      }
    }, 356: (e) => {
      "use strict";
      e.exports = (init_node_buffer(), __toCommonJS(node_buffer_exports));
    }, 477: () => {
    }, 521: (e) => {
      "use strict";
      e.exports = (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports));
    }, 552: (e, t, r) => {
      "use strict";
      var n = r(356).Buffer;
      Object.defineProperty(t, "__esModule", { value: true }), !function(e2, t2) {
        for (var r2 in t2)
          Object.defineProperty(e2, r2, { enumerable: true, get: t2[r2] });
      }(t, { handleFetch: function() {
        return a;
      }, interceptFetch: function() {
        return c;
      }, reader: function() {
        return s;
      } });
      let i = r(201), s = { url: (e2) => e2.url, header: (e2, t2) => e2.headers.get(t2) };
      async function o(e2, t2) {
        let { url: r2, method: i2, headers: s2, body: o2, cache: a2, credentials: c2, integrity: l, mode: u, redirect: h, referrer: d, referrerPolicy: p } = t2;
        return { testData: e2, api: "fetch", request: { url: r2, method: i2, headers: [...Array.from(s2), ["next-test-stack", function() {
          let e3 = (Error().stack ?? "").split("\n");
          for (let t3 = 1; t3 < e3.length; t3++)
            if (e3[t3].length > 0) {
              e3 = e3.slice(t3);
              break;
            }
          return (e3 = (e3 = (e3 = e3.filter((e4) => !e4.includes("/next/dist/"))).slice(0, 5)).map((e4) => e4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: o2 ? n.from(await t2.arrayBuffer()).toString("base64") : null, cache: a2, credentials: c2, integrity: l, mode: u, redirect: h, referrer: d, referrerPolicy: p } };
      }
      async function a(e2, t2) {
        let r2 = (0, i.getTestReqInfo)(t2, s);
        if (!r2)
          return e2(t2);
        let { testData: a2, proxyPort: c2 } = r2, l = await o(a2, t2), u = await e2(`http://localhost:${c2}`, { method: "POST", body: JSON.stringify(l), next: { internal: true } });
        if (!u.ok)
          throw Object.defineProperty(Error(`Proxy request failed: ${u.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let h = await u.json(), { api: d } = h;
        switch (d) {
          case "continue":
            return e2(t2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${t2.method} ${t2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
        }
        return function(e3) {
          let { status: t3, headers: r3, body: i2 } = e3.response;
          return new Response(i2 ? n.from(i2, "base64") : null, { status: t3, headers: new Headers(r3) });
        }(h);
      }
      function c(e2) {
        return r.g.fetch = function(t2, r2) {
          var n2;
          return (null == r2 ? void 0 : null == (n2 = r2.next) ? void 0 : n2.internal) ? e2(t2, r2) : a(e2, new Request(t2, r2));
        }, () => {
          r.g.fetch = e2;
        };
      }
    }, 615: function(e, t, r) {
      var n, i, s, o, a, c, l;
      s = (i = (n = r(825)).lib).WordArray, o = i.Hasher, a = n.algo, c = [], l = a.SHA1 = o.extend({ _doReset: function() {
        this._hash = new s.init([1732584193, 4023233417, 2562383102, 271733878, 3285377520]);
      }, _doProcessBlock: function(e2, t2) {
        for (var r2 = this._hash.words, n2 = r2[0], i2 = r2[1], s2 = r2[2], o2 = r2[3], a2 = r2[4], l2 = 0; l2 < 80; l2++) {
          if (l2 < 16)
            c[l2] = 0 | e2[t2 + l2];
          else {
            var u = c[l2 - 3] ^ c[l2 - 8] ^ c[l2 - 14] ^ c[l2 - 16];
            c[l2] = u << 1 | u >>> 31;
          }
          var h = (n2 << 5 | n2 >>> 27) + a2 + c[l2];
          l2 < 20 ? h += (i2 & s2 | ~i2 & o2) + 1518500249 : l2 < 40 ? h += (i2 ^ s2 ^ o2) + 1859775393 : l2 < 60 ? h += (i2 & s2 | i2 & o2 | s2 & o2) - 1894007588 : h += (i2 ^ s2 ^ o2) - 899497514, a2 = o2, o2 = s2, s2 = i2 << 30 | i2 >>> 2, i2 = n2, n2 = h;
        }
        r2[0] = r2[0] + n2 | 0, r2[1] = r2[1] + i2 | 0, r2[2] = r2[2] + s2 | 0, r2[3] = r2[3] + o2 | 0, r2[4] = r2[4] + a2 | 0;
      }, _doFinalize: function() {
        var e2 = this._data, t2 = e2.words, r2 = 8 * this._nDataBytes, n2 = 8 * e2.sigBytes;
        return t2[n2 >>> 5] |= 128 << 24 - n2 % 32, t2[(n2 + 64 >>> 9 << 4) + 14] = Math.floor(r2 / 4294967296), t2[(n2 + 64 >>> 9 << 4) + 15] = r2, e2.sigBytes = 4 * t2.length, this._process(), this._hash;
      }, clone: function() {
        var e2 = o.clone.call(this);
        return e2._hash = this._hash.clone(), e2;
      } }), n.SHA1 = o._createHelper(l), n.HmacSHA1 = o._createHmacHelper(l), e.exports = n.SHA1;
    }, 700: (e, t, r) => {
      "use strict";
      r.r(t), r.d(t, { DiagConsoleLogger: () => D, DiagLogLevel: () => n, INVALID_SPANID: () => eh, INVALID_SPAN_CONTEXT: () => ep, INVALID_TRACEID: () => ed, ProxyTracer: () => eP, ProxyTracerProvider: () => eN, ROOT_CONTEXT: () => I, SamplingDecision: () => o, SpanKind: () => a, SpanStatusCode: () => c, TraceFlags: () => s, ValueType: () => i, baggageEntryMetadataFromString: () => C, context: () => eB, createContextKey: () => P, createNoopMeter: () => ee, createTraceState: () => eW, default: () => e2, defaultTextMapGetter: () => et, defaultTextMapSetter: () => er, diag: () => e$, isSpanContextValid: () => ek, isValidSpanId: () => eR, isValidTraceId: () => eS, metrics: () => eK, propagation: () => eQ, trace: () => e1 });
      var n, i, s, o, a, c, l = "object" == typeof globalThis ? globalThis : "object" == typeof self ? self : "object" == typeof window ? window : "object" == typeof r.g ? r.g : {}, u = "1.9.0", h = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/, d = function(e3) {
        var t2 = /* @__PURE__ */ new Set([e3]), r2 = /* @__PURE__ */ new Set(), n2 = e3.match(h);
        if (!n2)
          return function() {
            return false;
          };
        var i2 = { major: +n2[1], minor: +n2[2], patch: +n2[3], prerelease: n2[4] };
        if (null != i2.prerelease)
          return function(t3) {
            return t3 === e3;
          };
        function s2(e4) {
          return r2.add(e4), false;
        }
        return function(e4) {
          if (t2.has(e4))
            return true;
          if (r2.has(e4))
            return false;
          var n3 = e4.match(h);
          if (!n3)
            return s2(e4);
          var o2 = { major: +n3[1], minor: +n3[2], patch: +n3[3], prerelease: n3[4] };
          if (null != o2.prerelease || i2.major !== o2.major)
            return s2(e4);
          if (0 === i2.major)
            return i2.minor === o2.minor && i2.patch <= o2.patch ? (t2.add(e4), true) : s2(e4);
          return i2.minor <= o2.minor ? (t2.add(e4), true) : s2(e4);
        };
      }(u), p = Symbol.for("opentelemetry.js.api." + u.split(".")[0]);
      function f(e3, t2, r2, n2) {
        void 0 === n2 && (n2 = false);
        var i2, s2 = l[p] = null !== (i2 = l[p]) && void 0 !== i2 ? i2 : { version: u };
        if (!n2 && s2[e3]) {
          var o2 = Error("@opentelemetry/api: Attempted duplicate registration of API: " + e3);
          return r2.error(o2.stack || o2.message), false;
        }
        if (s2.version !== u) {
          var o2 = Error("@opentelemetry/api: Registration of version v" + s2.version + " for " + e3 + " does not match previously registered API v" + u);
          return r2.error(o2.stack || o2.message), false;
        }
        return s2[e3] = t2, r2.debug("@opentelemetry/api: Registered a global for " + e3 + " v" + u + "."), true;
      }
      function m(e3) {
        var t2, r2, n2 = null === (t2 = l[p]) || void 0 === t2 ? void 0 : t2.version;
        if (n2 && d(n2))
          return null === (r2 = l[p]) || void 0 === r2 ? void 0 : r2[e3];
      }
      function w(e3, t2) {
        t2.debug("@opentelemetry/api: Unregistering a global for " + e3 + " v" + u + ".");
        var r2 = l[p];
        r2 && delete r2[e3];
      }
      var y = function(e3, t2) {
        var r2 = "function" == typeof Symbol && e3[Symbol.iterator];
        if (!r2)
          return e3;
        var n2, i2, s2 = r2.call(e3), o2 = [];
        try {
          for (; (void 0 === t2 || t2-- > 0) && !(n2 = s2.next()).done; )
            o2.push(n2.value);
        } catch (e4) {
          i2 = { error: e4 };
        } finally {
          try {
            n2 && !n2.done && (r2 = s2.return) && r2.call(s2);
          } finally {
            if (i2)
              throw i2.error;
          }
        }
        return o2;
      }, g = function(e3, t2, r2) {
        if (r2 || 2 == arguments.length)
          for (var n2, i2 = 0, s2 = t2.length; i2 < s2; i2++)
            !n2 && i2 in t2 || (n2 || (n2 = Array.prototype.slice.call(t2, 0, i2)), n2[i2] = t2[i2]);
        return e3.concat(n2 || Array.prototype.slice.call(t2));
      }, b = function() {
        function e3(e4) {
          this._namespace = e4.namespace || "DiagComponentLogger";
        }
        return e3.prototype.debug = function() {
          for (var e4 = [], t2 = 0; t2 < arguments.length; t2++)
            e4[t2] = arguments[t2];
          return v("debug", this._namespace, e4);
        }, e3.prototype.error = function() {
          for (var e4 = [], t2 = 0; t2 < arguments.length; t2++)
            e4[t2] = arguments[t2];
          return v("error", this._namespace, e4);
        }, e3.prototype.info = function() {
          for (var e4 = [], t2 = 0; t2 < arguments.length; t2++)
            e4[t2] = arguments[t2];
          return v("info", this._namespace, e4);
        }, e3.prototype.warn = function() {
          for (var e4 = [], t2 = 0; t2 < arguments.length; t2++)
            e4[t2] = arguments[t2];
          return v("warn", this._namespace, e4);
        }, e3.prototype.verbose = function() {
          for (var e4 = [], t2 = 0; t2 < arguments.length; t2++)
            e4[t2] = arguments[t2];
          return v("verbose", this._namespace, e4);
        }, e3;
      }();
      function v(e3, t2, r2) {
        var n2 = m("diag");
        if (n2)
          return r2.unshift(t2), n2[e3].apply(n2, g([], y(r2), false));
      }
      !function(e3) {
        e3[e3.NONE = 0] = "NONE", e3[e3.ERROR = 30] = "ERROR", e3[e3.WARN = 50] = "WARN", e3[e3.INFO = 60] = "INFO", e3[e3.DEBUG = 70] = "DEBUG", e3[e3.VERBOSE = 80] = "VERBOSE", e3[e3.ALL = 9999] = "ALL";
      }(n || (n = {}));
      var x = function(e3, t2) {
        var r2 = "function" == typeof Symbol && e3[Symbol.iterator];
        if (!r2)
          return e3;
        var n2, i2, s2 = r2.call(e3), o2 = [];
        try {
          for (; (void 0 === t2 || t2-- > 0) && !(n2 = s2.next()).done; )
            o2.push(n2.value);
        } catch (e4) {
          i2 = { error: e4 };
        } finally {
          try {
            n2 && !n2.done && (r2 = s2.return) && r2.call(s2);
          } finally {
            if (i2)
              throw i2.error;
          }
        }
        return o2;
      }, E = function(e3, t2, r2) {
        if (r2 || 2 == arguments.length)
          for (var n2, i2 = 0, s2 = t2.length; i2 < s2; i2++)
            !n2 && i2 in t2 || (n2 || (n2 = Array.prototype.slice.call(t2, 0, i2)), n2[i2] = t2[i2]);
        return e3.concat(n2 || Array.prototype.slice.call(t2));
      }, _ = function() {
        function e3() {
          function e4(e5) {
            return function() {
              for (var t3 = [], r2 = 0; r2 < arguments.length; r2++)
                t3[r2] = arguments[r2];
              var n2 = m("diag");
              if (n2)
                return n2[e5].apply(n2, E([], x(t3), false));
            };
          }
          var t2 = this;
          t2.setLogger = function(e5, r2) {
            if (void 0 === r2 && (r2 = { logLevel: n.INFO }), e5 === t2) {
              var i2, s2, o2, a2 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
              return t2.error(null !== (i2 = a2.stack) && void 0 !== i2 ? i2 : a2.message), false;
            }
            "number" == typeof r2 && (r2 = { logLevel: r2 });
            var c2 = m("diag"), l2 = function(e6, t3) {
              function r3(r4, n2) {
                var i3 = t3[r4];
                return "function" == typeof i3 && e6 >= n2 ? i3.bind(t3) : function() {
                };
              }
              return e6 < n.NONE ? e6 = n.NONE : e6 > n.ALL && (e6 = n.ALL), t3 = t3 || {}, { error: r3("error", n.ERROR), warn: r3("warn", n.WARN), info: r3("info", n.INFO), debug: r3("debug", n.DEBUG), verbose: r3("verbose", n.VERBOSE) };
            }(null !== (s2 = r2.logLevel) && void 0 !== s2 ? s2 : n.INFO, e5);
            if (c2 && !r2.suppressOverrideMessage) {
              var u2 = null !== (o2 = Error().stack) && void 0 !== o2 ? o2 : "<failed to generate stacktrace>";
              c2.warn("Current logger will be overwritten from " + u2), l2.warn("Current logger will overwrite one already registered from " + u2);
            }
            return f("diag", l2, t2, true);
          }, t2.disable = function() {
            w("diag", t2);
          }, t2.createComponentLogger = function(e5) {
            return new b(e5);
          }, t2.verbose = e4("verbose"), t2.debug = e4("debug"), t2.info = e4("info"), t2.warn = e4("warn"), t2.error = e4("error");
        }
        return e3.instance = function() {
          return this._instance || (this._instance = new e3()), this._instance;
        }, e3;
      }(), S = function(e3, t2) {
        var r2 = "function" == typeof Symbol && e3[Symbol.iterator];
        if (!r2)
          return e3;
        var n2, i2, s2 = r2.call(e3), o2 = [];
        try {
          for (; (void 0 === t2 || t2-- > 0) && !(n2 = s2.next()).done; )
            o2.push(n2.value);
        } catch (e4) {
          i2 = { error: e4 };
        } finally {
          try {
            n2 && !n2.done && (r2 = s2.return) && r2.call(s2);
          } finally {
            if (i2)
              throw i2.error;
          }
        }
        return o2;
      }, R = function(e3) {
        var t2 = "function" == typeof Symbol && Symbol.iterator, r2 = t2 && e3[t2], n2 = 0;
        if (r2)
          return r2.call(e3);
        if (e3 && "number" == typeof e3.length)
          return { next: function() {
            return e3 && n2 >= e3.length && (e3 = void 0), { value: e3 && e3[n2++], done: !e3 };
          } };
        throw TypeError(t2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
      }, k = function() {
        function e3(e4) {
          this._entries = e4 ? new Map(e4) : /* @__PURE__ */ new Map();
        }
        return e3.prototype.getEntry = function(e4) {
          var t2 = this._entries.get(e4);
          if (t2)
            return Object.assign({}, t2);
        }, e3.prototype.getAllEntries = function() {
          return Array.from(this._entries.entries()).map(function(e4) {
            var t2 = S(e4, 2);
            return [t2[0], t2[1]];
          });
        }, e3.prototype.setEntry = function(t2, r2) {
          var n2 = new e3(this._entries);
          return n2._entries.set(t2, r2), n2;
        }, e3.prototype.removeEntry = function(t2) {
          var r2 = new e3(this._entries);
          return r2._entries.delete(t2), r2;
        }, e3.prototype.removeEntries = function() {
          for (var t2, r2, n2 = [], i2 = 0; i2 < arguments.length; i2++)
            n2[i2] = arguments[i2];
          var s2 = new e3(this._entries);
          try {
            for (var o2 = R(n2), a2 = o2.next(); !a2.done; a2 = o2.next()) {
              var c2 = a2.value;
              s2._entries.delete(c2);
            }
          } catch (e4) {
            t2 = { error: e4 };
          } finally {
            try {
              a2 && !a2.done && (r2 = o2.return) && r2.call(o2);
            } finally {
              if (t2)
                throw t2.error;
            }
          }
          return s2;
        }, e3.prototype.clear = function() {
          return new e3();
        }, e3;
      }(), O = Symbol("BaggageEntryMetadata"), A = _.instance();
      function T(e3) {
        return void 0 === e3 && (e3 = {}), new k(new Map(Object.entries(e3)));
      }
      function C(e3) {
        return "string" != typeof e3 && (A.error("Cannot create baggage metadata from unknown type: " + typeof e3), e3 = ""), { __TYPE__: O, toString: function() {
          return e3;
        } };
      }
      function P(e3) {
        return Symbol.for(e3);
      }
      var I = new function e3(t2) {
        var r2 = this;
        r2._currentContext = t2 ? new Map(t2) : /* @__PURE__ */ new Map(), r2.getValue = function(e4) {
          return r2._currentContext.get(e4);
        }, r2.setValue = function(t3, n2) {
          var i2 = new e3(r2._currentContext);
          return i2._currentContext.set(t3, n2), i2;
        }, r2.deleteValue = function(t3) {
          var n2 = new e3(r2._currentContext);
          return n2._currentContext.delete(t3), n2;
        };
      }(), N = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }], D = function() {
        for (var e3 = 0; e3 < N.length; e3++)
          this[N[e3].n] = function(e4) {
            return function() {
              for (var t2 = [], r2 = 0; r2 < arguments.length; r2++)
                t2[r2] = arguments[r2];
              if (console) {
                var n2 = console[e4];
                if ("function" != typeof n2 && (n2 = console.log), "function" == typeof n2)
                  return n2.apply(console, t2);
              }
            };
          }(N[e3].c);
      }, M = function() {
        var e3 = function(t2, r2) {
          return (e3 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(e4, t3) {
            e4.__proto__ = t3;
          } || function(e4, t3) {
            for (var r3 in t3)
              Object.prototype.hasOwnProperty.call(t3, r3) && (e4[r3] = t3[r3]);
          })(t2, r2);
        };
        return function(t2, r2) {
          if ("function" != typeof r2 && null !== r2)
            throw TypeError("Class extends value " + String(r2) + " is not a constructor or null");
          function n2() {
            this.constructor = t2;
          }
          e3(t2, r2), t2.prototype = null === r2 ? Object.create(r2) : (n2.prototype = r2.prototype, new n2());
        };
      }(), j = function() {
        function e3() {
        }
        return e3.prototype.createGauge = function(e4, t2) {
          return V;
        }, e3.prototype.createHistogram = function(e4, t2) {
          return F;
        }, e3.prototype.createCounter = function(e4, t2) {
          return G;
        }, e3.prototype.createUpDownCounter = function(e4, t2) {
          return X;
        }, e3.prototype.createObservableGauge = function(e4, t2) {
          return Z;
        }, e3.prototype.createObservableCounter = function(e4, t2) {
          return Y;
        }, e3.prototype.createObservableUpDownCounter = function(e4, t2) {
          return Q;
        }, e3.prototype.addBatchObservableCallback = function(e4, t2) {
        }, e3.prototype.removeBatchObservableCallback = function(e4) {
        }, e3;
      }(), L = function() {
      }, U = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2.prototype.add = function(e4, t3) {
        }, t2;
      }(L), W = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2.prototype.add = function(e4, t3) {
        }, t2;
      }(L), B = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2.prototype.record = function(e4, t3) {
        }, t2;
      }(L), $ = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2.prototype.record = function(e4, t3) {
        }, t2;
      }(L), q = function() {
        function e3() {
        }
        return e3.prototype.addCallback = function(e4) {
        }, e3.prototype.removeCallback = function(e4) {
        }, e3;
      }(), H = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2;
      }(q), K = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2;
      }(q), z = function(e3) {
        function t2() {
          return null !== e3 && e3.apply(this, arguments) || this;
        }
        return M(t2, e3), t2;
      }(q), J = new j(), G = new U(), V = new B(), F = new $(), X = new W(), Y = new H(), Z = new K(), Q = new z();
      function ee() {
        return J;
      }
      !function(e3) {
        e3[e3.INT = 0] = "INT", e3[e3.DOUBLE = 1] = "DOUBLE";
      }(i || (i = {}));
      var et = { get: function(e3, t2) {
        if (null != e3)
          return e3[t2];
      }, keys: function(e3) {
        return null == e3 ? [] : Object.keys(e3);
      } }, er = { set: function(e3, t2, r2) {
        null != e3 && (e3[t2] = r2);
      } }, en = function(e3, t2) {
        var r2 = "function" == typeof Symbol && e3[Symbol.iterator];
        if (!r2)
          return e3;
        var n2, i2, s2 = r2.call(e3), o2 = [];
        try {
          for (; (void 0 === t2 || t2-- > 0) && !(n2 = s2.next()).done; )
            o2.push(n2.value);
        } catch (e4) {
          i2 = { error: e4 };
        } finally {
          try {
            n2 && !n2.done && (r2 = s2.return) && r2.call(s2);
          } finally {
            if (i2)
              throw i2.error;
          }
        }
        return o2;
      }, ei = function(e3, t2, r2) {
        if (r2 || 2 == arguments.length)
          for (var n2, i2 = 0, s2 = t2.length; i2 < s2; i2++)
            !n2 && i2 in t2 || (n2 || (n2 = Array.prototype.slice.call(t2, 0, i2)), n2[i2] = t2[i2]);
        return e3.concat(n2 || Array.prototype.slice.call(t2));
      }, es = function() {
        function e3() {
        }
        return e3.prototype.active = function() {
          return I;
        }, e3.prototype.with = function(e4, t2, r2) {
          for (var n2 = [], i2 = 3; i2 < arguments.length; i2++)
            n2[i2 - 3] = arguments[i2];
          return t2.call.apply(t2, ei([r2], en(n2), false));
        }, e3.prototype.bind = function(e4, t2) {
          return t2;
        }, e3.prototype.enable = function() {
          return this;
        }, e3.prototype.disable = function() {
          return this;
        }, e3;
      }(), eo = function(e3, t2) {
        var r2 = "function" == typeof Symbol && e3[Symbol.iterator];
        if (!r2)
          return e3;
        var n2, i2, s2 = r2.call(e3), o2 = [];
        try {
          for (; (void 0 === t2 || t2-- > 0) && !(n2 = s2.next()).done; )
            o2.push(n2.value);
        } catch (e4) {
          i2 = { error: e4 };
        } finally {
          try {
            n2 && !n2.done && (r2 = s2.return) && r2.call(s2);
          } finally {
            if (i2)
              throw i2.error;
          }
        }
        return o2;
      }, ea = function(e3, t2, r2) {
        if (r2 || 2 == arguments.length)
          for (var n2, i2 = 0, s2 = t2.length; i2 < s2; i2++)
            !n2 && i2 in t2 || (n2 || (n2 = Array.prototype.slice.call(t2, 0, i2)), n2[i2] = t2[i2]);
        return e3.concat(n2 || Array.prototype.slice.call(t2));
      }, ec = "context", el = new es(), eu = function() {
        function e3() {
        }
        return e3.getInstance = function() {
          return this._instance || (this._instance = new e3()), this._instance;
        }, e3.prototype.setGlobalContextManager = function(e4) {
          return f(ec, e4, _.instance());
        }, e3.prototype.active = function() {
          return this._getContextManager().active();
        }, e3.prototype.with = function(e4, t2, r2) {
          for (var n2, i2 = [], s2 = 3; s2 < arguments.length; s2++)
            i2[s2 - 3] = arguments[s2];
          return (n2 = this._getContextManager()).with.apply(n2, ea([e4, t2, r2], eo(i2), false));
        }, e3.prototype.bind = function(e4, t2) {
          return this._getContextManager().bind(e4, t2);
        }, e3.prototype._getContextManager = function() {
          return m(ec) || el;
        }, e3.prototype.disable = function() {
          this._getContextManager().disable(), w(ec, _.instance());
        }, e3;
      }();
      !function(e3) {
        e3[e3.NONE = 0] = "NONE", e3[e3.SAMPLED = 1] = "SAMPLED";
      }(s || (s = {}));
      var eh = "0000000000000000", ed = "00000000000000000000000000000000", ep = { traceId: ed, spanId: eh, traceFlags: s.NONE }, ef = function() {
        function e3(e4) {
          void 0 === e4 && (e4 = ep), this._spanContext = e4;
        }
        return e3.prototype.spanContext = function() {
          return this._spanContext;
        }, e3.prototype.setAttribute = function(e4, t2) {
          return this;
        }, e3.prototype.setAttributes = function(e4) {
          return this;
        }, e3.prototype.addEvent = function(e4, t2) {
          return this;
        }, e3.prototype.addLink = function(e4) {
          return this;
        }, e3.prototype.addLinks = function(e4) {
          return this;
        }, e3.prototype.setStatus = function(e4) {
          return this;
        }, e3.prototype.updateName = function(e4) {
          return this;
        }, e3.prototype.end = function(e4) {
        }, e3.prototype.isRecording = function() {
          return false;
        }, e3.prototype.recordException = function(e4, t2) {
        }, e3;
      }(), em = P("OpenTelemetry Context Key SPAN");
      function ew(e3) {
        return e3.getValue(em) || void 0;
      }
      function ey() {
        return ew(eu.getInstance().active());
      }
      function eg(e3, t2) {
        return e3.setValue(em, t2);
      }
      function eb(e3) {
        return e3.deleteValue(em);
      }
      function ev(e3, t2) {
        return eg(e3, new ef(t2));
      }
      function ex(e3) {
        var t2;
        return null === (t2 = ew(e3)) || void 0 === t2 ? void 0 : t2.spanContext();
      }
      var eE = /^([0-9a-f]{32})$/i, e_ = /^[0-9a-f]{16}$/i;
      function eS(e3) {
        return eE.test(e3) && e3 !== ed;
      }
      function eR(e3) {
        return e_.test(e3) && e3 !== eh;
      }
      function ek(e3) {
        return eS(e3.traceId) && eR(e3.spanId);
      }
      function eO(e3) {
        return new ef(e3);
      }
      var eA = eu.getInstance(), eT = function() {
        function e3() {
        }
        return e3.prototype.startSpan = function(e4, t2, r2) {
          if (void 0 === r2 && (r2 = eA.active()), null == t2 ? void 0 : t2.root)
            return new ef();
          var n2, i2 = r2 && ex(r2);
          return "object" == typeof (n2 = i2) && "string" == typeof n2.spanId && "string" == typeof n2.traceId && "number" == typeof n2.traceFlags && ek(i2) ? new ef(i2) : new ef();
        }, e3.prototype.startActiveSpan = function(e4, t2, r2, n2) {
          if (!(arguments.length < 2)) {
            2 == arguments.length ? o2 = t2 : 3 == arguments.length ? (i2 = t2, o2 = r2) : (i2 = t2, s2 = r2, o2 = n2);
            var i2, s2, o2, a2 = null != s2 ? s2 : eA.active(), c2 = this.startSpan(e4, i2, a2), l2 = eg(a2, c2);
            return eA.with(l2, o2, void 0, c2);
          }
        }, e3;
      }(), eC = new eT(), eP = function() {
        function e3(e4, t2, r2, n2) {
          this._provider = e4, this.name = t2, this.version = r2, this.options = n2;
        }
        return e3.prototype.startSpan = function(e4, t2, r2) {
          return this._getTracer().startSpan(e4, t2, r2);
        }, e3.prototype.startActiveSpan = function(e4, t2, r2, n2) {
          var i2 = this._getTracer();
          return Reflect.apply(i2.startActiveSpan, i2, arguments);
        }, e3.prototype._getTracer = function() {
          if (this._delegate)
            return this._delegate;
          var e4 = this._provider.getDelegateTracer(this.name, this.version, this.options);
          return e4 ? (this._delegate = e4, this._delegate) : eC;
        }, e3;
      }(), eI = new (function() {
        function e3() {
        }
        return e3.prototype.getTracer = function(e4, t2, r2) {
          return new eT();
        }, e3;
      }())(), eN = function() {
        function e3() {
        }
        return e3.prototype.getTracer = function(e4, t2, r2) {
          var n2;
          return null !== (n2 = this.getDelegateTracer(e4, t2, r2)) && void 0 !== n2 ? n2 : new eP(this, e4, t2, r2);
        }, e3.prototype.getDelegate = function() {
          var e4;
          return null !== (e4 = this._delegate) && void 0 !== e4 ? e4 : eI;
        }, e3.prototype.setDelegate = function(e4) {
          this._delegate = e4;
        }, e3.prototype.getDelegateTracer = function(e4, t2, r2) {
          var n2;
          return null === (n2 = this._delegate) || void 0 === n2 ? void 0 : n2.getTracer(e4, t2, r2);
        }, e3;
      }();
      !function(e3) {
        e3[e3.NOT_RECORD = 0] = "NOT_RECORD", e3[e3.RECORD = 1] = "RECORD", e3[e3.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED";
      }(o || (o = {})), function(e3) {
        e3[e3.INTERNAL = 0] = "INTERNAL", e3[e3.SERVER = 1] = "SERVER", e3[e3.CLIENT = 2] = "CLIENT", e3[e3.PRODUCER = 3] = "PRODUCER", e3[e3.CONSUMER = 4] = "CONSUMER";
      }(a || (a = {})), function(e3) {
        e3[e3.UNSET = 0] = "UNSET", e3[e3.OK = 1] = "OK", e3[e3.ERROR = 2] = "ERROR";
      }(c || (c = {}));
      var eD = "[_0-9a-z-*/]", eM = RegExp("^(?:[a-z]" + eD + "{0,255}|" + ("[a-z0-9]" + eD + "{0,240}@[a-z]") + eD + "{0,13})$"), ej = /^[ -~]{0,255}[!-~]$/, eL = /,|=/, eU = function() {
        function e3(e4) {
          this._internalState = /* @__PURE__ */ new Map(), e4 && this._parse(e4);
        }
        return e3.prototype.set = function(e4, t2) {
          var r2 = this._clone();
          return r2._internalState.has(e4) && r2._internalState.delete(e4), r2._internalState.set(e4, t2), r2;
        }, e3.prototype.unset = function(e4) {
          var t2 = this._clone();
          return t2._internalState.delete(e4), t2;
        }, e3.prototype.get = function(e4) {
          return this._internalState.get(e4);
        }, e3.prototype.serialize = function() {
          var e4 = this;
          return this._keys().reduce(function(t2, r2) {
            return t2.push(r2 + "=" + e4.get(r2)), t2;
          }, []).join(",");
        }, e3.prototype._parse = function(e4) {
          !(e4.length > 512) && (this._internalState = e4.split(",").reverse().reduce(function(e5, t2) {
            var r2 = t2.trim(), n2 = r2.indexOf("=");
            if (-1 !== n2) {
              var i2 = r2.slice(0, n2), s2 = r2.slice(n2 + 1, t2.length);
              eM.test(i2) && ej.test(s2) && !eL.test(s2) && e5.set(i2, s2);
            }
            return e5;
          }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
        }, e3.prototype._keys = function() {
          return Array.from(this._internalState.keys()).reverse();
        }, e3.prototype._clone = function() {
          var t2 = new e3();
          return t2._internalState = new Map(this._internalState), t2;
        }, e3;
      }();
      function eW(e3) {
        return new eU(e3);
      }
      var eB = eu.getInstance(), e$ = _.instance(), eq = new (function() {
        function e3() {
        }
        return e3.prototype.getMeter = function(e4, t2, r2) {
          return J;
        }, e3;
      }())(), eH = "metrics", eK = function() {
        function e3() {
        }
        return e3.getInstance = function() {
          return this._instance || (this._instance = new e3()), this._instance;
        }, e3.prototype.setGlobalMeterProvider = function(e4) {
          return f(eH, e4, _.instance());
        }, e3.prototype.getMeterProvider = function() {
          return m(eH) || eq;
        }, e3.prototype.getMeter = function(e4, t2, r2) {
          return this.getMeterProvider().getMeter(e4, t2, r2);
        }, e3.prototype.disable = function() {
          w(eH, _.instance());
        }, e3;
      }().getInstance(), ez = function() {
        function e3() {
        }
        return e3.prototype.inject = function(e4, t2) {
        }, e3.prototype.extract = function(e4, t2) {
          return e4;
        }, e3.prototype.fields = function() {
          return [];
        }, e3;
      }(), eJ = P("OpenTelemetry Baggage Key");
      function eG(e3) {
        return e3.getValue(eJ) || void 0;
      }
      function eV() {
        return eG(eu.getInstance().active());
      }
      function eF(e3, t2) {
        return e3.setValue(eJ, t2);
      }
      function eX(e3) {
        return e3.deleteValue(eJ);
      }
      var eY = "propagation", eZ = new ez(), eQ = function() {
        function e3() {
          this.createBaggage = T, this.getBaggage = eG, this.getActiveBaggage = eV, this.setBaggage = eF, this.deleteBaggage = eX;
        }
        return e3.getInstance = function() {
          return this._instance || (this._instance = new e3()), this._instance;
        }, e3.prototype.setGlobalPropagator = function(e4) {
          return f(eY, e4, _.instance());
        }, e3.prototype.inject = function(e4, t2, r2) {
          return void 0 === r2 && (r2 = er), this._getGlobalPropagator().inject(e4, t2, r2);
        }, e3.prototype.extract = function(e4, t2, r2) {
          return void 0 === r2 && (r2 = et), this._getGlobalPropagator().extract(e4, t2, r2);
        }, e3.prototype.fields = function() {
          return this._getGlobalPropagator().fields();
        }, e3.prototype.disable = function() {
          w(eY, _.instance());
        }, e3.prototype._getGlobalPropagator = function() {
          return m(eY) || eZ;
        }, e3;
      }().getInstance(), e0 = "trace", e1 = function() {
        function e3() {
          this._proxyTracerProvider = new eN(), this.wrapSpanContext = eO, this.isSpanContextValid = ek, this.deleteSpan = eb, this.getSpan = ew, this.getActiveSpan = ey, this.getSpanContext = ex, this.setSpan = eg, this.setSpanContext = ev;
        }
        return e3.getInstance = function() {
          return this._instance || (this._instance = new e3()), this._instance;
        }, e3.prototype.setGlobalTracerProvider = function(e4) {
          var t2 = f(e0, this._proxyTracerProvider, _.instance());
          return t2 && this._proxyTracerProvider.setDelegate(e4), t2;
        }, e3.prototype.getTracerProvider = function() {
          return m(e0) || this._proxyTracerProvider;
        }, e3.prototype.getTracer = function(e4, t2) {
          return this.getTracerProvider().getTracer(e4, t2);
        }, e3.prototype.disable = function() {
          w(e0, _.instance()), this._proxyTracerProvider = new eN();
        }, e3;
      }().getInstance();
      let e2 = { context: eB, diag: e$, metrics: eK, propagation: eQ, trace: e1 };
    }, 724: (e) => {
      "use strict";
      var t = Object.defineProperty, r = Object.getOwnPropertyDescriptor, n = Object.getOwnPropertyNames, i = Object.prototype.hasOwnProperty, s = {};
      function o(e2) {
        var t2;
        let r2 = ["path" in e2 && e2.path && `Path=${e2.path}`, "expires" in e2 && (e2.expires || 0 === e2.expires) && `Expires=${("number" == typeof e2.expires ? new Date(e2.expires) : e2.expires).toUTCString()}`, "maxAge" in e2 && "number" == typeof e2.maxAge && `Max-Age=${e2.maxAge}`, "domain" in e2 && e2.domain && `Domain=${e2.domain}`, "secure" in e2 && e2.secure && "Secure", "httpOnly" in e2 && e2.httpOnly && "HttpOnly", "sameSite" in e2 && e2.sameSite && `SameSite=${e2.sameSite}`, "partitioned" in e2 && e2.partitioned && "Partitioned", "priority" in e2 && e2.priority && `Priority=${e2.priority}`].filter(Boolean), n2 = `${e2.name}=${encodeURIComponent(null != (t2 = e2.value) ? t2 : "")}`;
        return 0 === r2.length ? n2 : `${n2}; ${r2.join("; ")}`;
      }
      function a(e2) {
        let t2 = /* @__PURE__ */ new Map();
        for (let r2 of e2.split(/; */)) {
          if (!r2)
            continue;
          let e3 = r2.indexOf("=");
          if (-1 === e3) {
            t2.set(r2, "true");
            continue;
          }
          let [n2, i2] = [r2.slice(0, e3), r2.slice(e3 + 1)];
          try {
            t2.set(n2, decodeURIComponent(null != i2 ? i2 : "true"));
          } catch {
          }
        }
        return t2;
      }
      function c(e2) {
        var t2, r2;
        if (!e2)
          return;
        let [[n2, i2], ...s2] = a(e2), { domain: o2, expires: c2, httponly: h2, maxage: d2, path: p, samesite: f, secure: m, partitioned: w, priority: y } = Object.fromEntries(s2.map(([e3, t3]) => [e3.toLowerCase().replace(/-/g, ""), t3]));
        return function(e3) {
          let t3 = {};
          for (let r3 in e3)
            e3[r3] && (t3[r3] = e3[r3]);
          return t3;
        }({ name: n2, value: decodeURIComponent(i2), domain: o2, ...c2 && { expires: new Date(c2) }, ...h2 && { httpOnly: true }, ..."string" == typeof d2 && { maxAge: Number(d2) }, path: p, ...f && { sameSite: l.includes(t2 = (t2 = f).toLowerCase()) ? t2 : void 0 }, ...m && { secure: true }, ...y && { priority: u.includes(r2 = (r2 = y).toLowerCase()) ? r2 : void 0 }, ...w && { partitioned: true } });
      }
      ((e2, r2) => {
        for (var n2 in r2)
          t(e2, n2, { get: r2[n2], enumerable: true });
      })(s, { RequestCookies: () => h, ResponseCookies: () => d, parseCookie: () => a, parseSetCookie: () => c, stringifyCookie: () => o }), e.exports = ((e2, s2, o2, a2) => {
        if (s2 && "object" == typeof s2 || "function" == typeof s2)
          for (let c2 of n(s2))
            i.call(e2, c2) || c2 === o2 || t(e2, c2, { get: () => s2[c2], enumerable: !(a2 = r(s2, c2)) || a2.enumerable });
        return e2;
      })(t({}, "__esModule", { value: true }), s);
      var l = ["strict", "lax", "none"], u = ["low", "medium", "high"], h = class {
        constructor(e2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          let t2 = e2.get("cookie");
          if (t2)
            for (let [e3, r2] of a(t2))
              this._parsed.set(e3, { name: e3, value: r2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed);
          if (!e2.length)
            return r2.map(([e3, t3]) => t3);
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter(([e3]) => e3 === n2).map(([e3, t3]) => t3);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2] = 1 === e2.length ? [e2[0].name, e2[0].value] : e2, n2 = this._parsed;
          return n2.set(t2, { name: t2, value: r2 }), this._headers.set("cookie", Array.from(n2).map(([e3, t3]) => o(t3)).join("; ")), this;
        }
        delete(e2) {
          let t2 = this._parsed, r2 = Array.isArray(e2) ? e2.map((e3) => t2.delete(e3)) : t2.delete(e2);
          return this._headers.set("cookie", Array.from(t2).map(([e3, t3]) => o(t3)).join("; ")), r2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((e2) => `${e2.name}=${encodeURIComponent(e2.value)}`).join("; ");
        }
      }, d = class {
        constructor(e2) {
          var t2, r2, n2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = e2;
          let i2 = null != (n2 = null != (r2 = null == (t2 = e2.getSetCookie) ? void 0 : t2.call(e2)) ? r2 : e2.get("set-cookie")) ? n2 : [];
          for (let e3 of Array.isArray(i2) ? i2 : function(e4) {
            if (!e4)
              return [];
            var t3, r3, n3, i3, s2, o2 = [], a2 = 0;
            function c2() {
              for (; a2 < e4.length && /\s/.test(e4.charAt(a2)); )
                a2 += 1;
              return a2 < e4.length;
            }
            for (; a2 < e4.length; ) {
              for (t3 = a2, s2 = false; c2(); )
                if ("," === (r3 = e4.charAt(a2))) {
                  for (n3 = a2, a2 += 1, c2(), i3 = a2; a2 < e4.length && "=" !== (r3 = e4.charAt(a2)) && ";" !== r3 && "," !== r3; )
                    a2 += 1;
                  a2 < e4.length && "=" === e4.charAt(a2) ? (s2 = true, a2 = i3, o2.push(e4.substring(t3, n3)), t3 = a2) : a2 = n3 + 1;
                } else
                  a2 += 1;
              (!s2 || a2 >= e4.length) && o2.push(e4.substring(t3, e4.length));
            }
            return o2;
          }(i2)) {
            let t3 = c(e3);
            t3 && this._parsed.set(t3.name, t3);
          }
        }
        get(...e2) {
          let t2 = "string" == typeof e2[0] ? e2[0] : e2[0].name;
          return this._parsed.get(t2);
        }
        getAll(...e2) {
          var t2;
          let r2 = Array.from(this._parsed.values());
          if (!e2.length)
            return r2;
          let n2 = "string" == typeof e2[0] ? e2[0] : null == (t2 = e2[0]) ? void 0 : t2.name;
          return r2.filter((e3) => e3.name === n2);
        }
        has(e2) {
          return this._parsed.has(e2);
        }
        set(...e2) {
          let [t2, r2, n2] = 1 === e2.length ? [e2[0].name, e2[0].value, e2[0]] : e2, i2 = this._parsed;
          return i2.set(t2, function(e3 = { name: "", value: "" }) {
            return "number" == typeof e3.expires && (e3.expires = new Date(e3.expires)), e3.maxAge && (e3.expires = new Date(Date.now() + 1e3 * e3.maxAge)), (null === e3.path || void 0 === e3.path) && (e3.path = "/"), e3;
          }({ name: t2, value: r2, ...n2 })), function(e3, t3) {
            for (let [, r3] of (t3.delete("set-cookie"), e3)) {
              let e4 = o(r3);
              t3.append("set-cookie", e4);
            }
          }(i2, this._headers), this;
        }
        delete(...e2) {
          let [t2, r2] = "string" == typeof e2[0] ? [e2[0]] : [e2[0].name, e2[0]];
          return this.set({ ...r2, name: t2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(o).join("; ");
        }
      };
    }, 802: (e) => {
      (() => {
        "use strict";
        var t = { 993: (e2) => {
          var t2 = Object.prototype.hasOwnProperty, r2 = "~";
          function n2() {
          }
          function i2(e3, t3, r3) {
            this.fn = e3, this.context = t3, this.once = r3 || false;
          }
          function s(e3, t3, n3, s2, o2) {
            if ("function" != typeof n3)
              throw TypeError("The listener must be a function");
            var a2 = new i2(n3, s2 || e3, o2), c = r2 ? r2 + t3 : t3;
            return e3._events[c] ? e3._events[c].fn ? e3._events[c] = [e3._events[c], a2] : e3._events[c].push(a2) : (e3._events[c] = a2, e3._eventsCount++), e3;
          }
          function o(e3, t3) {
            0 == --e3._eventsCount ? e3._events = new n2() : delete e3._events[t3];
          }
          function a() {
            this._events = new n2(), this._eventsCount = 0;
          }
          Object.create && (n2.prototype = /* @__PURE__ */ Object.create(null), new n2().__proto__ || (r2 = false)), a.prototype.eventNames = function() {
            var e3, n3, i3 = [];
            if (0 === this._eventsCount)
              return i3;
            for (n3 in e3 = this._events)
              t2.call(e3, n3) && i3.push(r2 ? n3.slice(1) : n3);
            return Object.getOwnPropertySymbols ? i3.concat(Object.getOwnPropertySymbols(e3)) : i3;
          }, a.prototype.listeners = function(e3) {
            var t3 = r2 ? r2 + e3 : e3, n3 = this._events[t3];
            if (!n3)
              return [];
            if (n3.fn)
              return [n3.fn];
            for (var i3 = 0, s2 = n3.length, o2 = Array(s2); i3 < s2; i3++)
              o2[i3] = n3[i3].fn;
            return o2;
          }, a.prototype.listenerCount = function(e3) {
            var t3 = r2 ? r2 + e3 : e3, n3 = this._events[t3];
            return n3 ? n3.fn ? 1 : n3.length : 0;
          }, a.prototype.emit = function(e3, t3, n3, i3, s2, o2) {
            var a2 = r2 ? r2 + e3 : e3;
            if (!this._events[a2])
              return false;
            var c, l, u = this._events[a2], h = arguments.length;
            if (u.fn) {
              switch (u.once && this.removeListener(e3, u.fn, void 0, true), h) {
                case 1:
                  return u.fn.call(u.context), true;
                case 2:
                  return u.fn.call(u.context, t3), true;
                case 3:
                  return u.fn.call(u.context, t3, n3), true;
                case 4:
                  return u.fn.call(u.context, t3, n3, i3), true;
                case 5:
                  return u.fn.call(u.context, t3, n3, i3, s2), true;
                case 6:
                  return u.fn.call(u.context, t3, n3, i3, s2, o2), true;
              }
              for (l = 1, c = Array(h - 1); l < h; l++)
                c[l - 1] = arguments[l];
              u.fn.apply(u.context, c);
            } else {
              var d, p = u.length;
              for (l = 0; l < p; l++)
                switch (u[l].once && this.removeListener(e3, u[l].fn, void 0, true), h) {
                  case 1:
                    u[l].fn.call(u[l].context);
                    break;
                  case 2:
                    u[l].fn.call(u[l].context, t3);
                    break;
                  case 3:
                    u[l].fn.call(u[l].context, t3, n3);
                    break;
                  case 4:
                    u[l].fn.call(u[l].context, t3, n3, i3);
                    break;
                  default:
                    if (!c)
                      for (d = 1, c = Array(h - 1); d < h; d++)
                        c[d - 1] = arguments[d];
                    u[l].fn.apply(u[l].context, c);
                }
            }
            return true;
          }, a.prototype.on = function(e3, t3, r3) {
            return s(this, e3, t3, r3, false);
          }, a.prototype.once = function(e3, t3, r3) {
            return s(this, e3, t3, r3, true);
          }, a.prototype.removeListener = function(e3, t3, n3, i3) {
            var s2 = r2 ? r2 + e3 : e3;
            if (!this._events[s2])
              return this;
            if (!t3)
              return o(this, s2), this;
            var a2 = this._events[s2];
            if (a2.fn)
              a2.fn !== t3 || i3 && !a2.once || n3 && a2.context !== n3 || o(this, s2);
            else {
              for (var c = 0, l = [], u = a2.length; c < u; c++)
                (a2[c].fn !== t3 || i3 && !a2[c].once || n3 && a2[c].context !== n3) && l.push(a2[c]);
              l.length ? this._events[s2] = 1 === l.length ? l[0] : l : o(this, s2);
            }
            return this;
          }, a.prototype.removeAllListeners = function(e3) {
            var t3;
            return e3 ? (t3 = r2 ? r2 + e3 : e3, this._events[t3] && o(this, t3)) : (this._events = new n2(), this._eventsCount = 0), this;
          }, a.prototype.off = a.prototype.removeListener, a.prototype.addListener = a.prototype.on, a.prefixed = r2, a.EventEmitter = a, e2.exports = a;
        }, 213: (e2) => {
          e2.exports = (e3, t2) => (t2 = t2 || (() => {
          }), e3.then((e4) => new Promise((e5) => {
            e5(t2());
          }).then(() => e4), (e4) => new Promise((e5) => {
            e5(t2());
          }).then(() => {
            throw e4;
          })));
        }, 574: (e2, t2) => {
          Object.defineProperty(t2, "__esModule", { value: true }), t2.default = function(e3, t3, r2) {
            let n2 = 0, i2 = e3.length;
            for (; i2 > 0; ) {
              let s = i2 / 2 | 0, o = n2 + s;
              0 >= r2(e3[o], t3) ? (n2 = ++o, i2 -= s + 1) : i2 = s;
            }
            return n2;
          };
        }, 821: (e2, t2, r2) => {
          Object.defineProperty(t2, "__esModule", { value: true });
          let n2 = r2(574);
          class i2 {
            constructor() {
              this._queue = [];
            }
            enqueue(e3, t3) {
              let r3 = { priority: (t3 = Object.assign({ priority: 0 }, t3)).priority, run: e3 };
              if (this.size && this._queue[this.size - 1].priority >= t3.priority) {
                this._queue.push(r3);
                return;
              }
              let i3 = n2.default(this._queue, r3, (e4, t4) => t4.priority - e4.priority);
              this._queue.splice(i3, 0, r3);
            }
            dequeue() {
              let e3 = this._queue.shift();
              return null == e3 ? void 0 : e3.run;
            }
            filter(e3) {
              return this._queue.filter((t3) => t3.priority === e3.priority).map((e4) => e4.run);
            }
            get size() {
              return this._queue.length;
            }
          }
          t2.default = i2;
        }, 816: (e2, t2, r2) => {
          let n2 = r2(213);
          class i2 extends Error {
            constructor(e3) {
              super(e3), this.name = "TimeoutError";
            }
          }
          let s = (e3, t3, r3) => new Promise((s2, o) => {
            if ("number" != typeof t3 || t3 < 0)
              throw TypeError("Expected `milliseconds` to be a positive number");
            if (t3 === 1 / 0) {
              s2(e3);
              return;
            }
            let a = setTimeout(() => {
              if ("function" == typeof r3) {
                try {
                  s2(r3());
                } catch (e4) {
                  o(e4);
                }
                return;
              }
              let n3 = "string" == typeof r3 ? r3 : `Promise timed out after ${t3} milliseconds`, a2 = r3 instanceof Error ? r3 : new i2(n3);
              "function" == typeof e3.cancel && e3.cancel(), o(a2);
            }, t3);
            n2(e3.then(s2, o), () => {
              clearTimeout(a);
            });
          });
          e2.exports = s, e2.exports.default = s, e2.exports.TimeoutError = i2;
        } }, r = {};
        function n(e2) {
          var i2 = r[e2];
          if (void 0 !== i2)
            return i2.exports;
          var s = r[e2] = { exports: {} }, o = true;
          try {
            t[e2](s, s.exports, n), o = false;
          } finally {
            o && delete r[e2];
          }
          return s.exports;
        }
        n.ab = "//";
        var i = {};
        (() => {
          Object.defineProperty(i, "__esModule", { value: true });
          let e2 = n(993), t2 = n(816), r2 = n(821), s = () => {
          }, o = new t2.TimeoutError();
          class a extends e2 {
            constructor(e3) {
              var t3, n2, i2, o2;
              if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = s, this._resolveIdle = s, !("number" == typeof (e3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: r2.default }, e3)).intervalCap && e3.intervalCap >= 1))
                throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null !== (n2 = null === (t3 = e3.intervalCap) || void 0 === t3 ? void 0 : t3.toString()) && void 0 !== n2 ? n2 : ""}\` (${typeof e3.intervalCap})`);
              if (void 0 === e3.interval || !(Number.isFinite(e3.interval) && e3.interval >= 0))
                throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null !== (o2 = null === (i2 = e3.interval) || void 0 === i2 ? void 0 : i2.toString()) && void 0 !== o2 ? o2 : ""}\` (${typeof e3.interval})`);
              this._carryoverConcurrencyCount = e3.carryoverConcurrencyCount, this._isIntervalIgnored = e3.intervalCap === 1 / 0 || 0 === e3.interval, this._intervalCap = e3.intervalCap, this._interval = e3.interval, this._queue = new e3.queueClass(), this._queueClass = e3.queueClass, this.concurrency = e3.concurrency, this._timeout = e3.timeout, this._throwOnTimeout = true === e3.throwOnTimeout, this._isPaused = false === e3.autoStart;
            }
            get _doesIntervalAllowAnother() {
              return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
            }
            get _doesConcurrentAllowAnother() {
              return this._pendingCount < this._concurrency;
            }
            _next() {
              this._pendingCount--, this._tryToStartAnother(), this.emit("next");
            }
            _resolvePromises() {
              this._resolveEmpty(), this._resolveEmpty = s, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = s, this.emit("idle"));
            }
            _onResumeInterval() {
              this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
            }
            _isIntervalPaused() {
              let e3 = Date.now();
              if (void 0 === this._intervalId) {
                let t3 = this._intervalEnd - e3;
                if (!(t3 < 0))
                  return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                    this._onResumeInterval();
                  }, t3)), true;
                this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
              }
              return false;
            }
            _tryToStartAnother() {
              if (0 === this._queue.size)
                return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
              if (!this._isPaused) {
                let e3 = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                  let t3 = this._queue.dequeue();
                  return !!t3 && (this.emit("active"), t3(), e3 && this._initializeIntervalIfNeeded(), true);
                }
              }
              return false;
            }
            _initializeIntervalIfNeeded() {
              !this._isIntervalIgnored && void 0 === this._intervalId && (this._intervalId = setInterval(() => {
                this._onInterval();
              }, this._interval), this._intervalEnd = Date.now() + this._interval);
            }
            _onInterval() {
              0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
            }
            _processQueue() {
              for (; this._tryToStartAnother(); )
                ;
            }
            get concurrency() {
              return this._concurrency;
            }
            set concurrency(e3) {
              if (!("number" == typeof e3 && e3 >= 1))
                throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${e3}\` (${typeof e3})`);
              this._concurrency = e3, this._processQueue();
            }
            async add(e3, r3 = {}) {
              return new Promise((n2, i2) => {
                let s2 = async () => {
                  this._pendingCount++, this._intervalCount++;
                  try {
                    let s3 = void 0 === this._timeout && void 0 === r3.timeout ? e3() : t2.default(Promise.resolve(e3()), void 0 === r3.timeout ? this._timeout : r3.timeout, () => {
                      (void 0 === r3.throwOnTimeout ? this._throwOnTimeout : r3.throwOnTimeout) && i2(o);
                    });
                    n2(await s3);
                  } catch (e4) {
                    i2(e4);
                  }
                  this._next();
                };
                this._queue.enqueue(s2, r3), this._tryToStartAnother(), this.emit("add");
              });
            }
            async addAll(e3, t3) {
              return Promise.all(e3.map(async (e4) => this.add(e4, t3)));
            }
            start() {
              return this._isPaused && (this._isPaused = false, this._processQueue()), this;
            }
            pause() {
              this._isPaused = true;
            }
            clear() {
              this._queue = new this._queueClass();
            }
            async onEmpty() {
              if (0 !== this._queue.size)
                return new Promise((e3) => {
                  let t3 = this._resolveEmpty;
                  this._resolveEmpty = () => {
                    t3(), e3();
                  };
                });
            }
            async onIdle() {
              if (0 !== this._pendingCount || 0 !== this._queue.size)
                return new Promise((e3) => {
                  let t3 = this._resolveIdle;
                  this._resolveIdle = () => {
                    t3(), e3();
                  };
                });
            }
            get size() {
              return this._queue.size;
            }
            sizeBy(e3) {
              return this._queue.filter(e3).length;
            }
            get pending() {
              return this._pendingCount;
            }
            get isPaused() {
              return this._isPaused;
            }
            get timeout() {
              return this._timeout;
            }
            set timeout(e3) {
              this._timeout = e3;
            }
          }
          i.default = a;
        })(), e.exports = i;
      })();
    }, 815: (e, t, r) => {
      "use strict";
      e.exports = r(35);
    }, 825: function(e, t, r) {
      var n;
      e.exports = n || function(e2, t2) {
        if ("undefined" != typeof window && window.crypto && (n2 = window.crypto), "undefined" != typeof self && self.crypto && (n2 = self.crypto), "undefined" != typeof globalThis && globalThis.crypto && (n2 = globalThis.crypto), !n2 && "undefined" != typeof window && window.msCrypto && (n2 = window.msCrypto), !n2 && void 0 !== r.g && r.g.crypto && (n2 = r.g.crypto), !n2)
          try {
            n2 = r(477);
          } catch (e3) {
          }
        var n2, i = function() {
          if (n2) {
            if ("function" == typeof n2.getRandomValues)
              try {
                return n2.getRandomValues(new Uint32Array(1))[0];
              } catch (e3) {
              }
            if ("function" == typeof n2.randomBytes)
              try {
                return n2.randomBytes(4).readInt32LE();
              } catch (e3) {
              }
          }
          throw Error("Native crypto module could not be used to get secure random number.");
        }, s = Object.create || function() {
          function e3() {
          }
          return function(t3) {
            var r2;
            return e3.prototype = t3, r2 = new e3(), e3.prototype = null, r2;
          };
        }(), o = {}, a = o.lib = {}, c = a.Base = { extend: function(e3) {
          var t3 = s(this);
          return e3 && t3.mixIn(e3), t3.hasOwnProperty("init") && this.init !== t3.init || (t3.init = function() {
            t3.$super.init.apply(this, arguments);
          }), t3.init.prototype = t3, t3.$super = this, t3;
        }, create: function() {
          var e3 = this.extend();
          return e3.init.apply(e3, arguments), e3;
        }, init: function() {
        }, mixIn: function(e3) {
          for (var t3 in e3)
            e3.hasOwnProperty(t3) && (this[t3] = e3[t3]);
          e3.hasOwnProperty("toString") && (this.toString = e3.toString);
        }, clone: function() {
          return this.init.prototype.extend(this);
        } }, l = a.WordArray = c.extend({ init: function(e3, r2) {
          e3 = this.words = e3 || [], t2 != r2 ? this.sigBytes = r2 : this.sigBytes = 4 * e3.length;
        }, toString: function(e3) {
          return (e3 || h).stringify(this);
        }, concat: function(e3) {
          var t3 = this.words, r2 = e3.words, n3 = this.sigBytes, i2 = e3.sigBytes;
          if (this.clamp(), n3 % 4)
            for (var s2 = 0; s2 < i2; s2++) {
              var o2 = r2[s2 >>> 2] >>> 24 - s2 % 4 * 8 & 255;
              t3[n3 + s2 >>> 2] |= o2 << 24 - (n3 + s2) % 4 * 8;
            }
          else
            for (var a2 = 0; a2 < i2; a2 += 4)
              t3[n3 + a2 >>> 2] = r2[a2 >>> 2];
          return this.sigBytes += i2, this;
        }, clamp: function() {
          var t3 = this.words, r2 = this.sigBytes;
          t3[r2 >>> 2] &= 4294967295 << 32 - r2 % 4 * 8, t3.length = e2.ceil(r2 / 4);
        }, clone: function() {
          var e3 = c.clone.call(this);
          return e3.words = this.words.slice(0), e3;
        }, random: function(e3) {
          for (var t3 = [], r2 = 0; r2 < e3; r2 += 4)
            t3.push(i());
          return new l.init(t3, e3);
        } }), u = o.enc = {}, h = u.Hex = { stringify: function(e3) {
          for (var t3 = e3.words, r2 = e3.sigBytes, n3 = [], i2 = 0; i2 < r2; i2++) {
            var s2 = t3[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
            n3.push((s2 >>> 4).toString(16)), n3.push((15 & s2).toString(16));
          }
          return n3.join("");
        }, parse: function(e3) {
          for (var t3 = e3.length, r2 = [], n3 = 0; n3 < t3; n3 += 2)
            r2[n3 >>> 3] |= parseInt(e3.substr(n3, 2), 16) << 24 - n3 % 8 * 4;
          return new l.init(r2, t3 / 2);
        } }, d = u.Latin1 = { stringify: function(e3) {
          for (var t3 = e3.words, r2 = e3.sigBytes, n3 = [], i2 = 0; i2 < r2; i2++) {
            var s2 = t3[i2 >>> 2] >>> 24 - i2 % 4 * 8 & 255;
            n3.push(String.fromCharCode(s2));
          }
          return n3.join("");
        }, parse: function(e3) {
          for (var t3 = e3.length, r2 = [], n3 = 0; n3 < t3; n3++)
            r2[n3 >>> 2] |= (255 & e3.charCodeAt(n3)) << 24 - n3 % 4 * 8;
          return new l.init(r2, t3);
        } }, p = u.Utf8 = { stringify: function(e3) {
          try {
            return decodeURIComponent(escape(d.stringify(e3)));
          } catch (e4) {
            throw Error("Malformed UTF-8 data");
          }
        }, parse: function(e3) {
          return d.parse(unescape(encodeURIComponent(e3)));
        } }, f = a.BufferedBlockAlgorithm = c.extend({ reset: function() {
          this._data = new l.init(), this._nDataBytes = 0;
        }, _append: function(e3) {
          "string" == typeof e3 && (e3 = p.parse(e3)), this._data.concat(e3), this._nDataBytes += e3.sigBytes;
        }, _process: function(t3) {
          var r2, n3 = this._data, i2 = n3.words, s2 = n3.sigBytes, o2 = this.blockSize, a2 = s2 / (4 * o2), c2 = (a2 = t3 ? e2.ceil(a2) : e2.max((0 | a2) - this._minBufferSize, 0)) * o2, u2 = e2.min(4 * c2, s2);
          if (c2) {
            for (var h2 = 0; h2 < c2; h2 += o2)
              this._doProcessBlock(i2, h2);
            r2 = i2.splice(0, c2), n3.sigBytes -= u2;
          }
          return new l.init(r2, u2);
        }, clone: function() {
          var e3 = c.clone.call(this);
          return e3._data = this._data.clone(), e3;
        }, _minBufferSize: 0 });
        a.Hasher = f.extend({ cfg: c.extend(), init: function(e3) {
          this.cfg = this.cfg.extend(e3), this.reset();
        }, reset: function() {
          f.reset.call(this), this._doReset();
        }, update: function(e3) {
          return this._append(e3), this._process(), this;
        }, finalize: function(e3) {
          return e3 && this._append(e3), this._doFinalize();
        }, blockSize: 16, _createHelper: function(e3) {
          return function(t3, r2) {
            return new e3.init(r2).finalize(t3);
          };
        }, _createHmacHelper: function(e3) {
          return function(t3, r2) {
            return new m.HMAC.init(e3, r2).finalize(t3);
          };
        } });
        var m = o.algo = {};
        return o;
      }(Math);
    }, 890: (e) => {
      (() => {
        "use strict";
        "undefined" != typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var t = {};
        (() => {
          t.parse = function(t2, r2) {
            if ("string" != typeof t2)
              throw TypeError("argument str must be a string");
            for (var i2 = {}, s = t2.split(n), o = (r2 || {}).decode || e2, a = 0; a < s.length; a++) {
              var c = s[a], l = c.indexOf("=");
              if (!(l < 0)) {
                var u = c.substr(0, l).trim(), h = c.substr(++l, c.length).trim();
                '"' == h[0] && (h = h.slice(1, -1)), void 0 == i2[u] && (i2[u] = function(e3, t3) {
                  try {
                    return t3(e3);
                  } catch (t4) {
                    return e3;
                  }
                }(h, o));
              }
            }
            return i2;
          }, t.serialize = function(e3, t2, n2) {
            var s = n2 || {}, o = s.encode || r;
            if ("function" != typeof o)
              throw TypeError("option encode is invalid");
            if (!i.test(e3))
              throw TypeError("argument name is invalid");
            var a = o(t2);
            if (a && !i.test(a))
              throw TypeError("argument val is invalid");
            var c = e3 + "=" + a;
            if (null != s.maxAge) {
              var l = s.maxAge - 0;
              if (isNaN(l) || !isFinite(l))
                throw TypeError("option maxAge is invalid");
              c += "; Max-Age=" + Math.floor(l);
            }
            if (s.domain) {
              if (!i.test(s.domain))
                throw TypeError("option domain is invalid");
              c += "; Domain=" + s.domain;
            }
            if (s.path) {
              if (!i.test(s.path))
                throw TypeError("option path is invalid");
              c += "; Path=" + s.path;
            }
            if (s.expires) {
              if ("function" != typeof s.expires.toUTCString)
                throw TypeError("option expires is invalid");
              c += "; Expires=" + s.expires.toUTCString();
            }
            if (s.httpOnly && (c += "; HttpOnly"), s.secure && (c += "; Secure"), s.sameSite)
              switch ("string" == typeof s.sameSite ? s.sameSite.toLowerCase() : s.sameSite) {
                case true:
                case "strict":
                  c += "; SameSite=Strict";
                  break;
                case "lax":
                  c += "; SameSite=Lax";
                  break;
                case "none":
                  c += "; SameSite=None";
                  break;
                default:
                  throw TypeError("option sameSite is invalid");
              }
            return c;
          };
          var e2 = decodeURIComponent, r = encodeURIComponent, n = /; */, i = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
        })(), e.exports = t;
      })();
    }, 905: (e, t, r) => {
      "use strict";
      Object.defineProperty(t, "__esModule", { value: true }), !function(e2, t2) {
        for (var r2 in t2)
          Object.defineProperty(e2, r2, { enumerable: true, get: t2[r2] });
      }(t, { interceptTestApis: function() {
        return s;
      }, wrapRequestHandler: function() {
        return o;
      } });
      let n = r(201), i = r(552);
      function s() {
        return (0, i.interceptFetch)(r.g.fetch);
      }
      function o(e2) {
        return (t2, r2) => (0, n.withRequest)(t2, i.reader, () => e2(t2, r2));
      }
    }, 975: (e) => {
      "use strict";
      var t = Object.defineProperty, r = Object.getOwnPropertyDescriptor, n = Object.getOwnPropertyNames, i = Object.prototype.hasOwnProperty, s = {};
      ((e2, r2) => {
        for (var n2 in r2)
          t(e2, n2, { get: r2[n2], enumerable: true });
      })(s, { Analytics: () => l }), e.exports = ((e2, s2, o2, a2) => {
        if (s2 && "object" == typeof s2 || "function" == typeof s2)
          for (let c2 of n(s2))
            i.call(e2, c2) || c2 === o2 || t(e2, c2, { get: () => s2[c2], enumerable: !(a2 = r(s2, c2)) || a2.enumerable });
        return e2;
      })(t({}, "__esModule", { value: true }), s);
      var o = `
local key = KEYS[1]
local field = ARGV[1]

local data = redis.call("ZRANGE", key, 0, -1, "WITHSCORES")
local count = {}

for i = 1, #data, 2 do
  local json_str = data[i]
  local score = tonumber(data[i + 1])
  local obj = cjson.decode(json_str)

  local fieldValue = obj[field]

  if count[fieldValue] == nil then
    count[fieldValue] = score
  else
    count[fieldValue] = count[fieldValue] + score
  end
end

local result = {}
for k, v in pairs(count) do
  table.insert(result, {k, v})
end

return result
`, a = `
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1]) -- First timestamp to check
local increment = tonumber(ARGV[2])       -- Increment between each timestamp
local num_timestamps = tonumber(ARGV[3])  -- Number of timestampts to check (24 for a day and 24 * 7 for a week)
local num_elements = tonumber(ARGV[4])    -- Number of elements to fetch in each category
local check_at_most = tonumber(ARGV[5])   -- Number of elements to check at most.

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

-- select num_elements many items
local true_group = {}
local false_group = {}
local denied_group = {}
local true_count = 0
local false_count = 0
local denied_count = 0
local i = #result - 1

-- index to stop at after going through "checkAtMost" many items:
local cutoff_index = #result - 2 * check_at_most

-- iterate over the results
while (true_count + false_count + denied_count) < (num_elements * 3) and 1 <= i and i >= cutoff_index do
  local score = tonumber(result[i + 1])
  if score > 0 then
    local element = result[i]
    if string.find(element, "success\\":true") and true_count < num_elements then
      table.insert(true_group, {score, element})
      true_count = true_count + 1
    elseif string.find(element, "success\\":false") and false_count < num_elements then
      table.insert(false_group, {score, element})
      false_count = false_count + 1
    elseif string.find(element, "success\\":\\"denied") and denied_count < num_elements then
      table.insert(denied_group, {score, element})
      denied_count = denied_count + 1
    end
  end
  i = i - 2
end

return {true_group, false_group, denied_group}
`, c = `
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1])
local increment = tonumber(ARGV[2])
local num_timestamps = tonumber(ARGV[3])

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

return result
`, l = class {
        redis;
        prefix;
        bucketSize;
        constructor(e2) {
          this.redis = e2.redis, this.prefix = e2.prefix ?? "@upstash/analytics", this.bucketSize = this.parseWindow(e2.window);
        }
        validateTableName(e2) {
          if (!/^[a-zA-Z0-9_-]+$/.test(e2))
            throw Error(`Invalid table name: ${e2}. Table names can only contain letters, numbers, dashes and underscores.`);
        }
        parseWindow(e2) {
          if ("number" == typeof e2) {
            if (e2 <= 0)
              throw Error(`Invalid window: ${e2}`);
            return e2;
          }
          let t2 = /^(\d+)([smhd])$/;
          if (!t2.test(e2))
            throw Error(`Invalid window: ${e2}`);
          let [, r2, n2] = e2.match(t2), i2 = parseInt(r2);
          switch (n2) {
            case "s":
              return 1e3 * i2;
            case "m":
              return 6e4 * i2;
            case "h":
              return 36e5 * i2;
            case "d":
              return 864e5 * i2;
            default:
              throw Error(`Invalid window unit: ${n2}`);
          }
        }
        getBucket(e2) {
          return Math.floor((e2 ?? Date.now()) / this.bucketSize) * this.bucketSize;
        }
        async ingest(e2, ...t2) {
          this.validateTableName(e2), await Promise.all(t2.map(async (t3) => {
            let r2 = this.getBucket(t3.time), n2 = [this.prefix, e2, r2].join(":");
            await this.redis.zincrby(n2, 1, JSON.stringify({ ...t3, time: void 0 }));
          }));
        }
        formatBucketAggregate(e2, t2, r2) {
          let n2 = {};
          return e2.forEach(([e3, r3]) => {
            "success" == t2 && (e3 = 1 === e3 ? "true" : null === e3 ? "false" : e3), n2[t2] = n2[t2] || {}, n2[t2][(e3 ?? "null").toString()] = r3;
          }), { time: r2, ...n2 };
        }
        async aggregateBucket(e2, t2, r2) {
          this.validateTableName(e2);
          let n2 = this.getBucket(r2), i2 = [this.prefix, e2, n2].join(":"), s2 = await this.redis.eval(o, [i2], [t2]);
          return this.formatBucketAggregate(s2, t2, n2);
        }
        async aggregateBuckets(e2, t2, r2, n2) {
          this.validateTableName(e2);
          let i2 = this.getBucket(n2), s2 = [];
          for (let n3 = 0; n3 < r2; n3 += 1)
            s2.push(this.aggregateBucket(e2, t2, i2)), i2 -= this.bucketSize;
          return Promise.all(s2);
        }
        async aggregateBucketsWithPipeline(e2, t2, r2, n2, i2) {
          this.validateTableName(e2), i2 = i2 ?? 48;
          let s2 = this.getBucket(n2), a2 = [], c2 = this.redis.pipeline(), l2 = [];
          for (let n3 = 1; n3 <= r2; n3 += 1) {
            let u = [this.prefix, e2, s2].join(":");
            c2.eval(o, [u], [t2]), a2.push(s2), s2 -= this.bucketSize, (n3 % i2 == 0 || n3 == r2) && (l2.push(c2.exec()), c2 = this.redis.pipeline());
          }
          return (await Promise.all(l2)).flat().map((e3, r3) => this.formatBucketAggregate(e3, t2, a2[r3]));
        }
        async getAllowedBlocked(e2, t2, r2) {
          this.validateTableName(e2);
          let n2 = [this.prefix, e2].join(":"), i2 = this.getBucket(r2), s2 = await this.redis.eval(c, [n2], [i2, this.bucketSize, t2]), o2 = {};
          for (let e3 = 0; e3 < s2.length; e3 += 2) {
            let t3 = s2[e3], r3 = t3.identifier, n3 = +s2[e3 + 1];
            o2[r3] || (o2[r3] = { success: 0, blocked: 0 }), o2[r3][t3.success ? "success" : "blocked"] = n3;
          }
          return o2;
        }
        async getMostAllowedBlocked(e2, t2, r2, n2, i2) {
          this.validateTableName(e2);
          let s2 = [this.prefix, e2].join(":"), o2 = this.getBucket(n2), [c2, l2, u] = await this.redis.eval(a, [s2], [o2, this.bucketSize, t2, r2, i2 ?? 5 * r2]);
          return { allowed: this.toDicts(c2), ratelimited: this.toDicts(l2), denied: this.toDicts(u) };
        }
        toDicts(e2) {
          let t2 = [];
          for (let r2 = 0; r2 < e2.length; r2 += 1) {
            let n2 = +e2[r2][0], i2 = e2[r2][1];
            t2.push({ identifier: i2.identifier, count: n2 });
          }
          return t2;
        }
      };
    }, 995: (e, t) => {
      "use strict";
      t.q = function(e2, t2) {
        if ("string" != typeof e2)
          throw TypeError("argument str must be a string");
        var r2 = {}, n2 = e2.length;
        if (n2 < 2)
          return r2;
        var i2 = t2 && t2.decode || l, s2 = 0, o2 = 0, u = 0;
        do {
          if (-1 === (o2 = e2.indexOf("=", s2)))
            break;
          if (-1 === (u = e2.indexOf(";", s2)))
            u = n2;
          else if (o2 > u) {
            s2 = e2.lastIndexOf(";", o2 - 1) + 1;
            continue;
          }
          var h = a(e2, s2, o2), d = c(e2, o2, h), p = e2.slice(h, d);
          if (!r2.hasOwnProperty(p)) {
            var f = a(e2, o2 + 1, u), m = c(e2, u, f);
            34 === e2.charCodeAt(f) && 34 === e2.charCodeAt(m - 1) && (f++, m--);
            var w = e2.slice(f, m);
            r2[p] = function(e3, t3) {
              try {
                return t3(e3);
              } catch (t4) {
                return e3;
              }
            }(w, i2);
          }
          s2 = u + 1;
        } while (s2 < n2);
        return r2;
      };
      var r = Object.prototype.toString, n = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/, i = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$/, s = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, o = /^[\u0020-\u003A\u003D-\u007E]*$/;
      function a(e2, t2, r2) {
        do {
          var n2 = e2.charCodeAt(t2);
          if (32 !== n2 && 9 !== n2)
            return t2;
        } while (++t2 < r2);
        return r2;
      }
      function c(e2, t2, r2) {
        for (; t2 > r2; ) {
          var n2 = e2.charCodeAt(--t2);
          if (32 !== n2 && 9 !== n2)
            return t2 + 1;
        }
        return r2;
      }
      function l(e2) {
        return -1 !== e2.indexOf("%") ? decodeURIComponent(e2) : e2;
      }
    } }, (e) => {
      var t = e(e.s = 335);
      (_ENTRIES = "undefined" == typeof _ENTRIES ? {} : _ENTRIES)["middleware_src/middleware"] = t;
    }]);
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path2 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  const correspondingRoute = routes.find((route) => route.regex.some((r) => new RegExp(r).test(path2)));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "src/middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!favicon.ico|public).*))(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/(\\/?index|\\/?index\\.json))?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/dashboard(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/chat(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/integrations(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/org(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/settings(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$"] }];
    require_edge_runtime_webpack();
    require_middleware();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil }, fn) {
  return globalThis.__openNextAls.run({
    requestId: Math.random().toString(36),
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const override = config[handler3.type]?.override;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { Readable as Readable2 } from "node:stream";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": {}, "webpack": null, "eslint": { "ignoreDuringBuilds": true }, "typescript": { "ignoreBuildErrors": false, "tsconfigPath": "tsconfig.json" }, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.ts", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": true, "compress": true, "images": { "deviceSizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840], "imageSizes": [16, 32, 48, 64, 96, 128, 256, 384], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 60, "formats": ["image/avif", "image/webp"], "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "remotePatterns": [{ "protocol": "https", "hostname": "**" }], "unoptimized": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "amp": { "canonicalBase": "" }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "serverRuntimeConfig": {}, "publicRuntimeConfig": {}, "reactProductionProfiling": false, "reactStrictMode": null, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "/Users/jacob/projects/nuco", "experimental": { "nodeMiddleware": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 0, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 4294967294 } }, "cacheHandlers": {}, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "serverSourceMaps": false, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "clientSegmentCache": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "middlewarePrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 9, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "turbo": { "root": "/Users/jacob/projects/nuco" }, "typedRoutes": false, "typedEnv": false, "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": false, "optimizeServerReact": true, "useEarlyImport": false, "viewTransition": false, "staleTimes": { "dynamic": 0, "static": 300 }, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "dynamicIO": false, "inlineCss": false, "useCache": false, "serverActions": { "bodySizeLimit": "2mb" }, "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-squlite-node", "@effect/sql-squlite-bun", "@effect/sql-squlite-wasm", "@effect/sql-squlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "Mediapartners-Google|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview", "bundlePagesRouterDependencies": false, "configFileName": "next.config.ts", "serverExternalPackages": ["pg", "pgvector", "drizzle-orm", "@trpc/server"], "compiler": { "removeConsole": true } };
var BuildId = "N9-__q4hk5A6hPIfuTwaG";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/api-tokens", "regex": "^/api\\-tokens(?:/)?$", "routeKeys": {}, "namedRegex": "^/api\\-tokens(?:/)?$" }, { "page": "/auth/complete-signup", "regex": "^/auth/complete\\-signup(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/complete\\-signup(?:/)?$" }, { "page": "/auth/login", "regex": "^/auth/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/login(?:/)?$" }, { "page": "/auth/signup", "regex": "^/auth/signup(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/signup(?:/)?$" }, { "page": "/chat", "regex": "^/chat(?:/)?$", "routeKeys": {}, "namedRegex": "^/chat(?:/)?$" }, { "page": "/chat/functions", "regex": "^/chat/functions(?:/)?$", "routeKeys": {}, "namedRegex": "^/chat/functions(?:/)?$" }, { "page": "/chat/new", "regex": "^/chat/new(?:/)?$", "routeKeys": {}, "namedRegex": "^/chat/new(?:/)?$" }, { "page": "/chat-templates", "regex": "^/chat\\-templates(?:/)?$", "routeKeys": {}, "namedRegex": "^/chat\\-templates(?:/)?$" }, { "page": "/chat-templates/new", "regex": "^/chat\\-templates/new(?:/)?$", "routeKeys": {}, "namedRegex": "^/chat\\-templates/new(?:/)?$" }, { "page": "/dashboard", "regex": "^/dashboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard(?:/)?$" }, { "page": "/dashboard/ai", "regex": "^/dashboard/ai(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/ai(?:/)?$" }, { "page": "/dashboard/extensions", "regex": "^/dashboard/extensions(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/extensions(?:/)?$" }, { "page": "/dashboard/extensions/marketplace", "regex": "^/dashboard/extensions/marketplace(?:/)?$", "routeKeys": {}, "namedRegex": "^/dashboard/extensions/marketplace(?:/)?$" }, { "page": "/favicon.ico", "regex": "^/favicon\\.ico(?:/)?$", "routeKeys": {}, "namedRegex": "^/favicon\\.ico(?:/)?$" }, { "page": "/integrations", "regex": "^/integrations(?:/)?$", "routeKeys": {}, "namedRegex": "^/integrations(?:/)?$" }, { "page": "/integrations/slack", "regex": "^/integrations/slack(?:/)?$", "routeKeys": {}, "namedRegex": "^/integrations/slack(?:/)?$" }, { "page": "/integrations/slack/analytics", "regex": "^/integrations/slack/analytics(?:/)?$", "routeKeys": {}, "namedRegex": "^/integrations/slack/analytics(?:/)?$" }, { "page": "/settings", "regex": "^/settings(?:/)?$", "routeKeys": {}, "namedRegex": "^/settings(?:/)?$" }, { "page": "/settings/ai", "regex": "^/settings/ai(?:/)?$", "routeKeys": {}, "namedRegex": "^/settings/ai(?:/)?$" }, { "page": "/settings/api-tokens", "regex": "^/settings/api\\-tokens(?:/)?$", "routeKeys": {}, "namedRegex": "^/settings/api\\-tokens(?:/)?$" }, { "page": "/settings/profile", "regex": "^/settings/profile(?:/)?$", "routeKeys": {}, "namedRegex": "^/settings/profile(?:/)?$" }], "dynamic": [{ "page": "/api/auth/[...nextauth]", "regex": "^/api/auth/(.+?)(?:/)?$", "routeKeys": { "nxtPnextauth": "nxtPnextauth" }, "namedRegex": "^/api/auth/(?<nxtPnextauth>.+?)(?:/)?$" }, { "page": "/api/chat-templates/[id]", "regex": "^/api/chat\\-templates/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/chat\\-templates/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/extensions/[id]", "regex": "^/api/extensions/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/extensions/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/extensions/[id]/disable", "regex": "^/api/extensions/([^/]+?)/disable(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/extensions/(?<nxtPid>[^/]+?)/disable(?:/)?$" }, { "page": "/api/extensions/[id]/enable", "regex": "^/api/extensions/([^/]+?)/enable(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/extensions/(?<nxtPid>[^/]+?)/enable(?:/)?$" }, { "page": "/api/extensions/[id]/settings", "regex": "^/api/extensions/([^/]+?)/settings(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/extensions/(?<nxtPid>[^/]+?)/settings(?:/)?$" }, { "page": "/api/trpc/[trpc]", "regex": "^/api/trpc/([^/]+?)(?:/)?$", "routeKeys": { "nxtPtrpc": "nxtPtrpc" }, "namedRegex": "^/api/trpc/(?<nxtPtrpc>[^/]+?)(?:/)?$" }, { "page": "/api/user/api-tokens/[id]", "regex": "^/api/user/api\\-tokens/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/user/api\\-tokens/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/chat/[id]", "regex": "^/chat/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/chat/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/chat-templates/[id]", "regex": "^/chat\\-templates/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/chat\\-templates/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/dashboard/extensions/[id]/settings", "regex": "^/dashboard/extensions/([^/]+?)/settings(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/dashboard/extensions/(?<nxtPid>[^/]+?)/settings(?:/)?$" }, { "page": "/invites/[id]", "regex": "^/invites/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/invites/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/org/[slug]", "regex": "^/org/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/org/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/org/[slug]/settings", "regex": "^/org/([^/]+?)/settings(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/org/(?<nxtPslug>[^/]+?)/settings(?:/)?$" }, { "page": "/settings/organization/[id]/billing", "regex": "^/settings/organization/([^/]+?)/billing(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/settings/organization/(?<nxtPid>[^/]+?)/billing(?:/)?$" }, { "page": "/settings/organization/[id]/general", "regex": "^/settings/organization/([^/]+?)/general(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/settings/organization/(?<nxtPid>[^/]+?)/general(?:/)?$" }, { "page": "/settings/organization/[id]/integrations", "regex": "^/settings/organization/([^/]+?)/integrations(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/settings/organization/(?<nxtPid>[^/]+?)/integrations(?:/)?$" }, { "page": "/settings/organization/[id]/members", "regex": "^/settings/organization/([^/]+?)/members(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/settings/organization/(?<nxtPid>[^/]+?)/members(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [];
var PrerenderManifest = { "version": 4, "routes": { "/favicon.ico": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "image/x-icon", "x-next-cache-tags": "_N_T_/layout,_N_T_/favicon.ico/layout,_N_T_/favicon.ico/route,_N_T_/favicon.ico" }, "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/favicon.ico", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/api-tokens": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/api-tokens", "dataRoute": "/api-tokens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth/login": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/login", "dataRoute": "/auth/login.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/dashboard/extensions/marketplace": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/dashboard/extensions/marketplace", "dataRoute": "/dashboard/extensions/marketplace.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/dashboard/extensions": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/dashboard/extensions", "dataRoute": "/dashboard/extensions.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth/complete-signup": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/complete-signup", "dataRoute": "/auth/complete-signup.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/auth/signup": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/auth/signup", "dataRoute": "/auth/signup.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/integrations/slack/analytics": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/integrations/slack/analytics", "dataRoute": "/integrations/slack/analytics.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/chat-templates/new": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/chat-templates/new", "dataRoute": "/chat-templates/new.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/", "dataRoute": "/index.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/settings/api-tokens": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/settings/api-tokens", "dataRoute": "/settings/api-tokens.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/chat-templates": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/chat-templates", "dataRoute": "/chat-templates.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/integrations/slack": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/integrations/slack", "dataRoute": "/integrations/slack.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/settings/profile": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/settings/profile", "dataRoute": "/settings/profile.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/settings": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/settings", "dataRoute": "/settings.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/settings/ai": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/settings/ai", "dataRoute": "/settings/ai.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/dashboard/ai": { "experimentalBypassFor": [{ "type": "header", "key": "Next-Action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/dashboard/ai", "dataRoute": "/dashboard/ai.rsc", "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": {}, "notFoundRoutes": [], "preview": { "previewModeId": "55a3de9f1b2da5583c73bdf57693f8d0", "previewModeSigningKey": "f2fc0c95a2158d3a245d3bbb8998bfe4ca1c69006959293e9050f568a7ecfa75", "previewModeEncryptionKey": "4c02a1fa9e6cbc9a11baeba1123f1b7b6be60ead84d1309b740dc07e12388b9e" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge-runtime-webpack.js", "server/src/middleware.js"], "name": "src/middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!favicon.ico|public).*))(\\.json)?[\\/#\\?]?$", "originalSource": "/((?!favicon.ico|public).*)" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/(\\/?index|\\/?index\\.json))?[\\/#\\?]?$", "originalSource": "/" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/dashboard(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/dashboard/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/chat(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/chat/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/integrations(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/integrations/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/org(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/org/:path*" }, { "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?\\/settings(?:\\/((?:[^\\/#\\?]+?)(?:\\/(?:[^\\/#\\?]+?))*))?(\\.json)?[\\/#\\?]?$", "originalSource": "/settings/:path*" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "N9-__q4hk5A6hPIfuTwaG", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "diTMf36V1jwEN6vHXZsRleB+/MyNkKR+ZxrWF7O7P1Q=", "__NEXT_PREVIEW_MODE_ID": "55a3de9f1b2da5583c73bdf57693f8d0", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "4c02a1fa9e6cbc9a11baeba1123f1b7b6be60ead84d1309b740dc07e12388b9e", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "f2fc0c95a2158d3a245d3bbb8998bfe4ca1c69006959293e9050f568a7ecfa75" } } }, "functions": {}, "sortedMiddleware": ["/"] };
var AppPathRoutesManifest = { "/_not-found/page": "/_not-found", "/api/chat-templates/[id]/route": "/api/chat-templates/[id]", "/api/auth/signup/route": "/api/auth/signup", "/api/auth/complete-signup/route": "/api/auth/complete-signup", "/api/extensions/[id]/disable/route": "/api/extensions/[id]/disable", "/api/chat-templates/route": "/api/chat-templates", "/api/extensions/[id]/route": "/api/extensions/[id]", "/api/extensions/[id]/enable/route": "/api/extensions/[id]/enable", "/api/extensions/[id]/settings/route": "/api/extensions/[id]/settings", "/api/extensions/route": "/api/extensions", "/api/slack/analytics/event-counts/route": "/api/slack/analytics/event-counts", "/api/slack/analytics/ai-metrics/route": "/api/slack/analytics/ai-metrics", "/api/slack/analytics/top-channels/route": "/api/slack/analytics/top-channels", "/api/slack/analytics/summary/route": "/api/slack/analytics/summary", "/api/slack/analytics/top-users/route": "/api/slack/analytics/top-users", "/api/slack/chat/route": "/api/slack/chat", "/api/slack/bot/route": "/api/slack/bot", "/api/slack/slack-templates/route": "/api/slack/slack-templates", "/api/slack/slack-templates/submit/route": "/api/slack/slack-templates/submit", "/api/slack/slack-templates/use/route": "/api/slack/slack-templates/use", "/api/user/api-tokens/[id]/route": "/api/user/api-tokens/[id]", "/api/user/api-tokens/route": "/api/user/api-tokens", "/api/trpc/[trpc]/route": "/api/trpc/[trpc]", "/favicon.ico/route": "/favicon.ico", "/api/auth/[...nextauth]/route": "/api/auth/[...nextauth]", "/api/chat/route": "/api/chat", "/api/sse/route": "/api/sse", "/api/webhooks/stripe/route": "/api/webhooks/stripe", "/api-tokens/page": "/api-tokens", "/auth/login/page": "/auth/login", "/chat-templates/page": "/chat-templates", "/auth/complete-signup/page": "/auth/complete-signup", "/auth/signup/page": "/auth/signup", "/chat-templates/new/page": "/chat-templates/new", "/chat-templates/[id]/page": "/chat-templates/[id]", "/dashboard/extensions/[id]/settings/page": "/dashboard/extensions/[id]/settings", "/dashboard/extensions/marketplace/page": "/dashboard/extensions/marketplace", "/dashboard/extensions/page": "/dashboard/extensions", "/integrations/slack/page": "/integrations/slack", "/integrations/slack/analytics/page": "/integrations/slack/analytics", "/invites/[id]/page": "/invites/[id]", "/chat/functions/page": "/chat/functions", "/chat/[id]/page": "/chat/[id]", "/chat/page": "/chat", "/chat/new/page": "/chat/new", "/dashboard/page": "/dashboard", "/page": "/", "/integrations/page": "/integrations", "/org/[slug]/page": "/org/[slug]", "/org/[slug]/settings/page": "/org/[slug]/settings", "/settings/api-tokens/page": "/settings/api-tokens", "/settings/organization/[id]/billing/page": "/settings/organization/[id]/billing", "/settings/organization/[id]/integrations/page": "/settings/organization/[id]/integrations", "/settings/organization/[id]/general/page": "/settings/organization/[id]/general", "/settings/page": "/settings", "/settings/profile/page": "/settings/profile", "/settings/organization/[id]/members/page": "/settings/organization/[id]/members", "/dashboard/ai/page": "/dashboard/ai", "/settings/ai/page": "/settings/ai" };
var FunctionsConfigManifest = { "version": 1, "functions": { "/api/webhooks/stripe": { "maxDuration": 60 }, "/api/chat": {}, "/": {} } };
process.env.NEXT_BUILD_ID = BuildId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path2) {
  return NextConfig.i18n?.locales.includes(path2.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectLocale(internalEvent, i18n) {
  if (i18n.localeDetection === false) {
    return i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale
  });
  return cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateMessageGroupId(rawPath) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `revalidate-${randomInt}`;
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (host) {
    return pattern.test(url) && !url.includes(host);
  }
  return pattern.test(url);
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return queryParts.reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path2) {
  const nextBasePath = NextConfig.basePath;
  const url = new URL(`${nextBasePath}${path2}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const urlQuery = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => urlQuery.append(key, decodeURIComponent(entry)));
    } else {
      urlQuery.append(key, decodeURIComponent(value));
    }
  });
  const queryString = urlQuery.toString();
  return queryString ? `?${queryString}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str) {
  return str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
  return readable;
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    return value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
async function computeCacheControl(path2, body, host, revalidate, lastModified) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest.routes).find((p) => p[0] === path2)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  if (finalRevalidate !== CACHE_ONE_YEAR) {
    const sMaxAge = Math.max(finalRevalidate - age, 1);
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate
    });
    const isStale = sMaxAge === 1;
    if (isStale) {
      let url = NextConfig.trailingSlash ? `${path2}/` : path2;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: { host, url },
        MessageDeduplicationId: hash(`${path2}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path2)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
async function generateResult(event, localizedPath, cachedValue, lastModified) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  switch (cachedValue.type) {
    case "app":
      isDataRequest = Boolean(event.headers.rsc);
      body = isDataRequest ? cachedValue.rsc : cachedValue.html;
      type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
      break;
    case "page":
      isDataRequest = Boolean(event.query.__nextDataReq);
      body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
      type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
      break;
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified);
  return {
    type: "core",
    statusCode: 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers
    }
  };
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  if (localizedPath === "") {
    localizedPath = "index";
  }
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest.routes).includes(localizedPath) || Object.values(PrerenderManifest.dynamicRoutes).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(localizedPath);
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      if (cachedData.value?.type === "app") {
        const tags = getTagsFromValue(cachedData.value);
        const _hasBeenRevalidated = await hasBeenRevalidated(localizedPath, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
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
      var count = 1;
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
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
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
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path2 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path2 += prefix;
        prefix = "";
      }
      if (path2) {
        result.push(path2);
        path2 = "";
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
      path2 += value;
      continue;
    }
    if (path2) {
      result.push(path2);
      path2 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
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
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path2 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path2 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path2 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path2 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path2;
  };
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path2 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path2, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path2, keys) {
  if (!keys)
    return path2;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path2.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path2.source);
  }
  return path2;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path2) {
    return pathToRegexp(path2, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path2, keys, options) {
  return tokensToRegexp(parse2(path2, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
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
function pathToRegexp(path2, keys, options) {
  if (path2 instanceof RegExp)
    return regexpToRegexp(path2, keys);
  if (Array.isArray(path2))
    return arrayToRegexp(path2, keys, options);
  return stringToRegexp(path2, keys, options);
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path2 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path2) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path2);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path2 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path2) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    const encodePlusQueryString = queryString.replaceAll("+", "%20");
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(encodePlusQueryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source)))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = encodePlusQueryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !event.headers["x-nextjs-data"] && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const dataPattern = `${NextConfig.basePath ?? ""}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/");
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes, routes } = prerenderManifest;
  const routeFallback = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false).some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  const localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"])
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = convertToQueryString(internalEvent.query);
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  responseHeaders.delete("x-middleware-override-headers");
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else {
        resHeaders[key] = value;
      }
    }
  });
  if (statusCode >= 300 && statusCode < 400) {
    resHeaders.location = responseHeaders.get("location") ?? resHeaders.location;
    return {
      body: emptyReadableStream(),
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      isBase64Encoded: false
    };
  }
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let rewritten = false;
  let isExternalRewrite = false;
  let middlewareQueryString = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    rewritten = true;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQueryString = middlewareQueryString.__nextDataReq ? {
        __nextDataReq: middlewareQueryString.__nextDataReq
      } : {};
      rewriteUrlObject.searchParams.forEach((v, k) => {
        middlewareQueryString[k] = v;
      });
    }
  }
  if (result.body) {
    const body = result.body;
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQueryString,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var apiPrefix = `${RoutesManifest.basePath ?? ""}/api`;
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path2) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path2));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher(RoutesManifest.routes.static);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
function applyMiddlewareHeaders(eventHeaders, middlewareHeaders, setPrefix = true) {
  const keyPrefix = setPrefix ? MIDDLEWARE_HEADER_PREFIX : "";
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      eventHeaders[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event) {
  for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
    const value = event.headers[openNextGeoName];
    if (value) {
      event.headers[nextGeoName] = value;
    }
  }
  for (const key of Object.keys(event.headers)) {
    if (key.startsWith(INTERNAL_HEADER_PREFIX) || key.startsWith(MIDDLEWARE_HEADER_PREFIX)) {
      delete event.headers[key];
    }
  }
  const nextHeaders = getNextConfigHeaders(event, ConfigHeaders);
  let internalEvent = fixDataPage(event, BuildId);
  if ("statusCode" in internalEvent) {
    return internalEvent;
  }
  const redirect = handleRedirects(internalEvent, RoutesManifest.redirects);
  if (redirect) {
    debug("redirect", redirect);
    return redirect;
  }
  const eventOrResult = await handleMiddleware(internalEvent);
  const isResult = "statusCode" in eventOrResult;
  if (isResult) {
    return eventOrResult;
  }
  const middlewareResponseHeaders = eventOrResult.responseHeaders;
  let isExternalRewrite = eventOrResult.isExternalRewrite ?? false;
  internalEvent = eventOrResult;
  if (!isExternalRewrite) {
    const beforeRewrites = handleRewrites(internalEvent, RoutesManifest.rewrites.beforeFiles);
    internalEvent = beforeRewrites.internalEvent;
    isExternalRewrite = beforeRewrites.isExternalRewrite;
  }
  const foundStaticRoute = staticRouteMatcher(internalEvent.rawPath);
  const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
  if (!(isStaticRoute || isExternalRewrite)) {
    const afterRewrites = handleRewrites(internalEvent, RoutesManifest.rewrites.afterFiles);
    internalEvent = afterRewrites.internalEvent;
    isExternalRewrite = afterRewrites.isExternalRewrite;
  }
  const { event: fallbackEvent, isISR } = handleFallbackFalse(internalEvent, PrerenderManifest);
  internalEvent = fallbackEvent;
  const foundDynamicRoute = dynamicRouteMatcher(internalEvent.rawPath);
  const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
  if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
    const fallbackRewrites = handleRewrites(internalEvent, RoutesManifest.rewrites.fallback);
    internalEvent = fallbackRewrites.internalEvent;
    isExternalRewrite = fallbackRewrites.isExternalRewrite;
  }
  const isApiRoute = internalEvent.rawPath === apiPrefix || internalEvent.rawPath.startsWith(`${apiPrefix}/`);
  const isNextImageRoute = internalEvent.rawPath.startsWith("/_next/image");
  const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
  if (!(isRouteFoundBeforeAllRewrites || isApiRoute || isNextImageRoute || // We need to check again once all rewrites have been applied
  staticRouteMatcher(internalEvent.rawPath).length > 0 || dynamicRouteMatcher(internalEvent.rawPath).length > 0)) {
    internalEvent = {
      ...internalEvent,
      rawPath: "/404",
      url: constructNextUrl(internalEvent.url, "/404"),
      headers: {
        ...internalEvent.headers,
        "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
      }
    };
  }
  if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !("statusCode" in internalEvent)) {
    debug("Cache interception enabled");
    internalEvent = await cacheInterceptor(internalEvent);
    if ("statusCode" in internalEvent) {
      applyMiddlewareHeaders(internalEvent.headers, {
        ...middlewareResponseHeaders,
        ...nextHeaders
      }, false);
      return internalEvent;
    }
  }
  applyMiddlewareHeaders(internalEvent.headers, {
    ...middlewareResponseHeaders,
    ...nextHeaders
  });
  const resolvedRoutes = [
    ...foundStaticRoute,
    ...foundDynamicRoute
  ];
  debug("resolvedRoutes", resolvedRoutes);
  return {
    internalEvent,
    isExternalRewrite,
    origin: false,
    isISR,
    resolvedRoutes,
    initialURL: event.url,
    locale: NextConfig.i18n ? detectLocale(internalEvent, NextConfig.i18n) : void 0
  };
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const originResolver = await resolveOriginResolver(globalThis.openNextConfig.middleware?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(globalThis.openNextConfig.middleware?.override?.proxyExternalRequest);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil
  }, async () => {
    const result = await routingHandler(internalEvent);
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
