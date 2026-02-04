import SwiftUI
import WebKit
import CoreML
import UIKit

struct NativeShellRequest: Decodable {
    let id: String
    let action: String?
}

struct NativeShellStatus: Encodable {
    let bundleVersion: String?
    let installedVersion: String?
    let useAppScheme: Bool
    let rootPath: String?
    let integrityOk: Bool?
    let integrityFailures: Int?
    let integrityCheckedAt: String?
    let integrityVersion: String?

    init(_ status: PWAStatus) {
        let formatter = ISO8601DateFormatter()
        bundleVersion = status.bundleVersion
        installedVersion = status.installedVersion
        useAppScheme = status.useAppScheme
        rootPath = status.rootPath
        integrityOk = status.integrityOk
        integrityFailures = status.integrityFailures
        integrityCheckedAt = status.integrityCheckedAt.map { formatter.string(from: $0) }
        integrityVersion = status.integrityVersion
    }
}

struct NativeShellResponse: Encodable {
    let id: String
    let status: NativeShellStatus?
    let error: String?
    let message: String?
}

struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let store = WebViewStore.shared
        let webView = store.webView
        webView.navigationDelegate = store.coordinator
        webView.scrollView.bounces = false
        store.loadInitialURLIfNeeded()
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No-op. Reloads are driven externally.
    }

    func makeCoordinator() -> Coordinator {
        WebViewStore.shared.coordinator
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let bridge: CoreMLBridge
        let gamingBridge = NativeGamingBridge()
        var onPowerStateChange: ((SystemPowerState) -> Void)?

        init(bridge: CoreMLBridge) {
            self.bridge = bridge
            super.init()
            gamingBridge.onPowerStateChange = { [weak self] state in
                self?.bridge.updatePowerProfile(state)
                self?.onPowerStateChange?(state)
            }
            gamingBridge.refreshPowerState()
            bridge.preloadDefaults()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "gaming" {
                gamingBridge.handle(message.body)
                return
            }
            if message.name == "shell" {
                handleShell(message.body)
                return
            }
            guard message.name == "coreml" else { return }
            guard let request = decodeRequest(message.body) else {
                send(CoreMLResponse(
                    id: "unknown",
                    output: [],
                    shape: nil,
                    error: "Invalid Core ML request",
                    models: nil,
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: nil,
                    snapshot: nil,
                    message: nil,
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "listModels" {
                let models = bridge.listModels()
                send(CoreMLResponse(
                    id: request.id,
                    output: [],
                    shape: nil,
                    error: nil,
                    models: models,
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: nil,
                    snapshot: nil,
                    message: nil,
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "preloadModels" {
                bridge.preload(models: request.models)
                send(CoreMLResponse(
                    id: request.id,
                    output: [],
                    shape: nil,
                    error: nil,
                    models: request.models ?? [],
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: nil,
                    snapshot: nil,
                    message: nil,
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "clearCache" {
                bridge.clearAllCaches()
                send(CoreMLResponse(
                    id: request.id,
                    output: [],
                    shape: nil,
                    error: nil,
                    models: nil,
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: nil,
                    snapshot: nil,
                    message: nil,
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "status" {
                let status = bridge.status()
                send(CoreMLResponse(
                    id: request.id,
                    output: [],
                    shape: nil,
                    error: nil,
                    models: nil,
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: status.busy,
                    snapshot: status.snapshot,
                    message: nil,
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "clearStream" {
                let streamId = request.streamId ?? ""
                let cleared = streamId.isEmpty ? false : bridge.clearStream(id: streamId)
                send(CoreMLResponse(
                    id: request.id,
                    output: [],
                    shape: nil,
                    error: nil,
                    models: nil,
                    indices: nil,
                    batchOutput: nil,
                    batchShapes: nil,
                    batchIndices: nil,
                    modelUsed: nil,
                    cached: nil,
                    busy: nil,
                    snapshot: nil,
                    message: cleared ? "Stream cleared" : "Stream not found",
                    evaluation: nil,
                    pack: nil
                ))
                return
            }
            if request.action == "runEval" {
                let filter = request.model.isEmpty ? nil : request.model
                bridge.runEvaluation(filter: filter) { [weak self] report in
                    DispatchQueue.main.async {
                        self?.send(CoreMLResponse(
                            id: request.id,
                            output: [],
                            shape: nil,
                            error: nil,
                            models: nil,
                            indices: nil,
                            batchOutput: nil,
                            batchShapes: nil,
                            batchIndices: nil,
                            modelUsed: nil,
                            cached: nil,
                            busy: nil,
                            snapshot: nil,
                            message: nil,
                            evaluation: report,
                            pack: nil
                        ))
                    }
                }
                return
            }
            if request.action == "downloadModelPack" {
                let url = request.packUrl ?? ""
                bridge.downloadModelPack(from: url) { [weak self] report in
                    DispatchQueue.main.async {
                        self?.send(CoreMLResponse(
                            id: request.id,
                            output: [],
                            shape: nil,
                            error: nil,
                            models: nil,
                            indices: nil,
                            batchOutput: nil,
                            batchShapes: nil,
                            batchIndices: nil,
                            modelUsed: nil,
                            cached: nil,
                            busy: nil,
                            snapshot: nil,
                            message: report.message,
                            evaluation: nil,
                            pack: report
                        ))
                    }
                }
                return
            }
            bridge.infer(request) { [weak self] response in
                DispatchQueue.main.async {
                    self?.send(response)
                }
            }
        }

        private func handleShell(_ body: Any) {
            guard let request = decodeShellRequest(body) else {
                sendShell(NativeShellResponse(id: "unknown", status: nil, error: "Invalid shell request", message: nil))
                return
            }
            let action = request.action ?? "status"
            if action == "status" {
                let status = PWAInstaller.status()
                sendShell(NativeShellResponse(id: request.id, status: NativeShellStatus(status), error: nil, message: nil))
                return
            }
            if action == "refresh" {
                PWAInstaller.refresh { [weak self] status in
                    self?.sendShell(NativeShellResponse(id: request.id, status: NativeShellStatus(status), error: nil, message: "refreshed"))
                    NotificationCenter.default.post(
                        name: .pwaRefreshCompleted,
                        object: nil,
                        userInfo: ["message": "Local content refreshed"]
                    )
                    self?.webView?.reload()
                }
                return
            }
            if action == "verify" {
                PWAInstaller.verifyNow { [weak self] status in
                    self?.sendShell(NativeShellResponse(id: request.id, status: NativeShellStatus(status), error: nil, message: "verified"))
                    NotificationCenter.default.post(
                        name: .pwaVerifyCompleted,
                        object: nil,
                        userInfo: ["message": "Integrity verified"]
                    )
                }
                return
            }
            sendShell(NativeShellResponse(id: request.id, status: nil, error: "Unknown action", message: nil))
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.scheme == AppConfig.appScheme || url.isFileURL {
                decisionHandler(.allow)
                return
            }
            if let scheme = url.scheme?.lowercased(), scheme == "mailto" || scheme == "tel" {
                openExternal(url)
                decisionHandler(.cancel)
                return
            }
            if let scheme = url.scheme?.lowercased(), (scheme == "http" || scheme == "https") {
                let allowed = AppConfig.allowedHosts()
                if let host = url.host, allowed.contains(host) {
                    decisionHandler(.allow)
                } else {
                    openExternal(url)
                    decisionHandler(.cancel)
                }
                return
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard let fallback = AppConfig.offlineFallbackURL() else { return }
            if webView.url?.lastPathComponent == "offline.html" {
                return
            }
            webView.load(URLRequest(url: fallback))
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            guard let fallback = AppConfig.offlineFallbackURL() else {
                webView.reload()
                return
            }
            webView.load(URLRequest(url: fallback))
        }

        private func decodeRequest(_ body: Any) -> CoreMLRequest? {
            guard JSONSerialization.isValidJSONObject(body),
                  let data = try? JSONSerialization.data(withJSONObject: body, options: []),
                  let request = try? JSONDecoder().decode(CoreMLRequest.self, from: data) else {
                return nil
            }
            return request
        }

        private func decodeShellRequest(_ body: Any) -> NativeShellRequest? {
            guard JSONSerialization.isValidJSONObject(body),
                  let data = try? JSONSerialization.data(withJSONObject: body, options: []),
                  let request = try? JSONDecoder().decode(NativeShellRequest.self, from: data) else {
                return nil
            }
            return request
        }

        private func send(_ response: CoreMLResponse) {
            guard let webView = webView else { return }
            guard let data = try? JSONEncoder().encode(response),
                  let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []),
                  let payload = jsonObject as? [String: Any] else {
                return
            }
            DispatchQueue.main.async {
                if #available(iOS 14.0, *) {
                    webView.callAsyncJavaScript(
                        "window.__nativeCoreMLCallback(payload);",
                        arguments: ["payload": payload],
                        in: nil,
                        in: .page,
                        completionHandler: nil
                    )
                } else {
                    if let json = String(data: data, encoding: .utf8) {
                        let script = "window.__nativeCoreMLCallback(\(json));"
                        webView.evaluateJavaScript(script, completionHandler: nil)
                    }
                }
            }
        }

        private func sendShell(_ response: NativeShellResponse) {
            guard let webView = webView else { return }
            guard let data = try? JSONEncoder().encode(response),
                  let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []),
                  let payload = jsonObject as? [String: Any] else {
                return
            }
            DispatchQueue.main.async {
                if #available(iOS 14.0, *) {
                    webView.callAsyncJavaScript(
                        "window.__nativeShellCallback(payload);",
                        arguments: ["payload": payload],
                        in: nil,
                        in: .page,
                        completionHandler: nil
                    )
                } else {
                    if let json = String(data: data, encoding: .utf8) {
                        let script = "window.__nativeShellCallback(\(json));"
                        webView.evaluateJavaScript(script, completionHandler: nil)
                    }
                }
            }
        }

        private func openExternal(_ url: URL) {
            DispatchQueue.main.async {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
        }
    }

    static let coreMLBridgeScript = """
    (function() {
      if (window.NativeCoreML) return;
      var pending = {};
      var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.coreml;
      window.__nativeCoreMLCallback = function(payload) {
        if (!payload || !payload.id) return;
        var entry = pending[payload.id];
        if (!entry) return;
        delete pending[payload.id];
        if (payload.error) {
          entry.reject(payload.error);
        } else if (entry.action === 'infer' && payload.busy) {
          if (entry.returnMeta) {
            entry.resolve(payload);
          } else {
            entry.reject(payload.message || 'busy');
          }
        } else if (entry.action === 'listModels' || entry.action === 'preloadModels') {
          entry.resolve(payload.models || []);
        } else if (entry.action === 'status') {
          entry.resolve(payload.snapshot || payload);
        } else if (entry.action === 'clearCache') {
          entry.resolve(true);
        } else if (entry.action === 'clearStream') {
          entry.resolve(true);
        } else if (entry.action === 'runEval') {
          entry.resolve(payload.evaluation || payload);
        } else if (entry.action === 'downloadModelPack') {
          entry.resolve(payload.pack || payload);
        } else if (entry.returnMeta) {
          entry.resolve(payload);
        } else if (payload.batchOutput) {
          entry.resolve(payload.batchOutput || []);
        } else if (entry.returnIndices && payload.indices) {
          entry.resolve({ values: payload.output || [], indices: payload.indices });
        } else {
          entry.resolve(payload.output || []);
        }
      };
      window.NativeCoreML = {
        isAvailable: !!handler,
        infer: function(model, input, options) {
          options = options || {};
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = {
              resolve: resolve,
              reject: reject,
              action: 'infer',
              returnMeta: !!options.returnMeta,
              returnIndices: !!options.returnIndices
            };
            var batch = Array.isArray(options.batch) ? options.batch : null;
            handler.postMessage({
              id: id,
              model: model || '',
              input: input || [],
              batch: batch,
              inputKey: options.inputKey || null,
              outputKey: options.outputKey || null,
              cacheKey: options.cacheKey || null,
              topK: options.topK || null,
              maxOutput: options.maxOutput || null,
              rejectWhenBusy: options.rejectWhenBusy || null,
              allowOnConstrained: options.allowOnConstrained || null,
              streamId: options.streamId || null,
              streamAppend: Array.isArray(options.streamAppend) ? options.streamAppend : null,
              windowSize: options.windowSize || null,
              clearStream: options.clearStream || null,
              action: 'infer'
            });
          });
        },
        inferBatch: function(model, batch, options) {
          options = options || {};
          options.batch = Array.isArray(batch) ? batch : [];
          return window.NativeCoreML.infer(model, [], options);
        },
        listModels: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'listModels' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              inputKey: null,
              outputKey: null,
              action: 'listModels'
            });
          });
        },
        preload: function(models) {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'preloadModels' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              models: Array.isArray(models) ? models : [],
              action: 'preloadModels'
            });
          });
        },
        clearCache: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'clearCache' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              action: 'clearCache'
            });
          });
        },
        status: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'status' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              action: 'status'
            });
          });
        },
        clearStream: function(streamId) {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'clearStream' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              streamId: streamId || '',
              action: 'clearStream'
            });
          });
        },
        runEval: function(model) {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'runEval' };
            handler.postMessage({
              id: id,
              model: model || '',
              input: [],
              action: 'runEval'
            });
          });
        },
        downloadModelPack: function(packUrl) {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('coreml bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject, action: 'downloadModelPack' };
            handler.postMessage({
              id: id,
              model: '',
              input: [],
              packUrl: packUrl || '',
              action: 'downloadModelPack'
            });
          });
        },
        inferStream: function(model, streamId, append, options) {
          options = options || {};
          options.streamId = streamId || '';
          options.streamAppend = Array.isArray(append) ? append : [];
          return window.NativeCoreML.infer(model, [], options);
        }
      };
    })();
    """

    static let nativeGamingBridgeScript = """
    (function() {
      if (window.NativeGaming) return;
      var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.gaming;
      var pending = {};
      var listeners = {};
      var counter = 0;
      var now = function() { return String(Date.now()); };
      var makeId = function() { counter += 1; return 'ng-' + now() + '-' + counter.toString(16); };

      var emit = function(type, payload) {
        var set = listeners[type];
        if (!set) return;
        set.forEach(function(fn) {
          try { fn(payload); } catch (err) {}
        });
      };

      window.__nativeGamingCallback = function(payload) {
        if (!payload || !payload.id) return;
        var entry = pending[payload.id];
        if (!entry) return;
        delete pending[payload.id];
        if (payload.error) {
          entry.reject(payload.error);
        } else {
          entry.resolve(payload.data);
        }
      };

      window.__nativeGamingEvent = function(payload) {
        if (!payload || !payload.type) return;
        emit(payload.type, payload.data || {});
      };

      var request = function(action, data) {
        return new Promise(function(resolve, reject) {
          if (!handler) {
            reject('native gaming bridge unavailable');
            return;
          }
          var id = makeId();
          pending[id] = { resolve: resolve, reject: reject };
          handler.postMessage({ id: id, action: action, payload: data || {} });
        });
      };

      var on = function(type, handlerFn) {
        if (!type || typeof handlerFn !== 'function') return function() {};
        if (!listeners[type]) listeners[type] = new Set();
        listeners[type].add(handlerFn);
        return function() { listeners[type].delete(handlerFn); };
      };

      window.NativeGaming = {
        isAvailable: !!handler,
        request: request,
        on: on,
        haptics: {
          impact: function(style) { return request('hapticImpact', { style: style }); },
          selection: function() { return request('hapticSelection', {}); },
          notification: function(type) { return request('hapticNotification', { type: type }); }
        },
        controllers: {
          start: function() { return request('controllerStart', {}); },
          stop: function() { return request('controllerStop', {}); },
          list: function() { return request('controllerList', {}); },
          onEvent: function(handlerFn) { return on('controller', handlerFn); }
        },
        motion: {
          start: function(options) { return request('motionStart', options || {}); },
          stop: function() { return request('motionStop', {}); },
          onEvent: function(handlerFn) { return on('motion', handlerFn); }
        },
        audioSession: {
          configure: function(options) { return request('audioSession', options || {}); }
        },
        system: {
          info: function() { return request('systemInfo', {}); },
          onThermal: function(handlerFn) { return on('thermal', handlerFn); },
          onPower: function(handlerFn) { return on('power', handlerFn); },
          onPerf: function(handlerFn) { return on('perf', handlerFn); },
          performance: function() {
            return request('systemInfo', {}).then(function(info) {
              return info && info.performance ? info.performance : null;
            });
          }
        }
      };
    })();
    """

    static let nativeShellBridgeScript = """
    (function() {
      if (window.NativeShell) return;
      var pending = {};
      var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.shell;
      window.__nativeShellCallback = function(payload) {
        if (!payload || !payload.id) return;
        var entry = pending[payload.id];
        if (!entry) return;
        delete pending[payload.id];
        if (payload.error) {
          entry.reject(payload.error);
        } else {
          entry.resolve({ status: payload.status || null, message: payload.message || null });
        }
      };
      window.NativeShell = {
        isAvailable: !!handler,
        status: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('native shell bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject };
            handler.postMessage({ id: id, action: 'status' });
          });
        }
        ,
        refresh: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('native shell bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject };
            handler.postMessage({ id: id, action: 'refresh' });
          });
        },
        verify: function() {
          return new Promise(function(resolve, reject) {
            if (!handler) {
              reject('native shell bridge unavailable');
              return;
            }
            var id = String(Date.now()) + Math.random().toString(16).slice(2);
            pending[id] = { resolve: resolve, reject: reject };
            handler.postMessage({ id: id, action: 'verify' });
          });
        }
      };
    })();
    """
}

final class WebViewStore {
    static let shared = WebViewStore()

    let coordinator: WebViewContainer.Coordinator
    let configuration: WKWebViewConfiguration
    let webView: WKWebView
    let coreMLBridge: CoreMLBridge

    private let processPool = WKProcessPool()
    private var didLoadInitialURL = false
    private let telemetryToggleHandler = TelemetryToggleHandler()
    private var schemeHandler: OfflineSchemeHandler?
    private var memoryWarningObserver: NSObjectProtocol?
    private var memoryPressureSource: DispatchSourceMemoryPressure?
    private var lastPerformanceProfile: PerformanceProfile?

    private init() {
        PWAInstaller.ensureLocalPwa()
        URLCache.shared.memoryCapacity = 16 * 1024 * 1024
        URLCache.shared.diskCapacity = 64 * 1024 * 1024

        coreMLBridge = CoreMLBridge()
        coordinator = WebViewContainer.Coordinator(bridge: coreMLBridge)
        coordinator.onPowerStateChange = { [weak self] state in
            self?.applyPowerState(state)
        }

        let controller = WKUserContentController()
        controller.addUserScript(WKUserScript(
            source: WebViewContainer.coreMLBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        controller.addUserScript(WKUserScript(
            source: WebViewContainer.nativeGamingBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        controller.addUserScript(WKUserScript(
            source: WebViewContainer.nativeShellBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        controller.add(coordinator, name: "coreml")
        controller.add(coordinator, name: "gaming")
        controller.add(coordinator, name: "shell")

        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.processPool = processPool
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
            if let domains = Bundle.main.object(forInfoDictionaryKey: "WKAppBoundDomains") as? [String],
               !domains.isEmpty {
                config.limitsNavigationsToAppBoundDomains = true
            }
        }
        if AppConfig.shouldUseAppScheme, let root = AppConfig.offlineRootURL() {
            let handler = OfflineSchemeHandler(rootURL: root)
            config.setURLSchemeHandler(handler, forURLScheme: AppConfig.appScheme)
            schemeHandler = handler
        }
        configuration = config

        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = coordinator
        view.isOpaque = true
        view.backgroundColor = .systemBackground
        view.scrollView.bounces = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.dataDetectorTypes = []
        view.allowsLinkPreview = false
        telemetryToggleHandler.attach(to: view)
        webView = view

        coordinator.webView = view
        coordinator.gamingBridge.webView = view
        coordinator.gamingBridge.refreshPowerState()

        memoryWarningObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            self?.schemeHandler?.clearCache()
            URLCache.shared.removeAllCachedResponses()
            self?.coreMLBridge.clearAllCaches()
        }
        let source = DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: .main)
        source.setEventHandler { [weak self] in
            self?.schemeHandler?.clearCache()
            URLCache.shared.removeAllCachedResponses()
            self?.coreMLBridge.clearAllCaches()
        }
        source.resume()
        memoryPressureSource = source
    }

    func prewarm() {
        _ = webView
    }

    func loadInitialURLIfNeeded() {
        guard !didLoadInitialURL else { return }
        didLoadInitialURL = true
        let url = AppConfig.resolveAppURL()
        if url.scheme == AppConfig.appScheme {
            webView.load(URLRequest(url: url))
        } else if url.isFileURL {
            let accessURL = url.deletingLastPathComponent()
            webView.loadFileURL(url, allowingReadAccessTo: accessURL)
        } else {
            webView.load(URLRequest(url: url))
        }
    }

    func setScenePhase(_ phase: ScenePhase) {
        let isActive = phase == .active
        coreMLBridge.setAppActive(isActive)
        coordinator.gamingBridge.setActive(isActive)
        if isActive {
            loadInitialURLIfNeeded()
        }
    }

    func refreshPwa() {
        PWAInstaller.refresh { [weak self] _ in
            self?.schemeHandler?.clearCache()
            URLCache.shared.removeAllCachedResponses()
            NotificationCenter.default.post(
                name: .pwaRefreshCompleted,
                object: nil,
                userInfo: ["message": "Local content refreshed"]
            )
            self?.webView.reload()
        }
    }

    private func applyPowerState(_ state: SystemPowerState) {
        let profile = DeviceProfile.current().performanceProfile(for: state)
        guard profile != lastPerformanceProfile else { return }
        lastPerformanceProfile = profile

        let cacheConfig: (memory: Int, disk: Int, schemeBytes: Int, schemeCount: Int)
        switch profile.renderQuality {
        case "low":
            cacheConfig = (memory: 8 * 1024 * 1024, disk: 32 * 1024 * 1024, schemeBytes: 4 * 1024 * 1024, schemeCount: 32)
        case "medium":
            cacheConfig = (memory: 16 * 1024 * 1024, disk: 64 * 1024 * 1024, schemeBytes: 6 * 1024 * 1024, schemeCount: 48)
        default:
            cacheConfig = (memory: 24 * 1024 * 1024, disk: 96 * 1024 * 1024, schemeBytes: 8 * 1024 * 1024, schemeCount: 64)
        }

        URLCache.shared.memoryCapacity = cacheConfig.memory
        URLCache.shared.diskCapacity = cacheConfig.disk
        schemeHandler?.updateCacheLimits(countLimit: cacheConfig.schemeCount, totalCostLimit: cacheConfig.schemeBytes)

        if profile.renderQuality == "low" {
            schemeHandler?.clearCache()
            URLCache.shared.removeAllCachedResponses()
        }
    }
}

final class TelemetryToggleHandler: NSObject {
    private weak var webView: WKWebView?
    private var gesture: UILongPressGestureRecognizer?
    private let activationSize: CGFloat = 60

    func attach(to webView: WKWebView) {
        self.webView = webView
        if gesture != nil { return }
        let recognizer = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
        recognizer.minimumPressDuration = 1.0
        recognizer.cancelsTouchesInView = false
        recognizer.allowableMovement = 12
        webView.addGestureRecognizer(recognizer)
        gesture = recognizer
    }

    @objc private func handleLongPress(_ recognizer: UILongPressGestureRecognizer) {
        guard recognizer.state == .began, let view = webView else { return }
        let location = recognizer.location(in: view)
        guard location.x >= view.bounds.width - activationSize,
              location.y <= activationSize else { return }
        let key = "ShowTelemetryOverlay"
        let current = UserDefaults.standard.bool(forKey: key)
        UserDefaults.standard.set(!current, forKey: key)
    }
}
