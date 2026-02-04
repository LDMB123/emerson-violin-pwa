import Foundation
import WebKit
import GameController
import CoreMotion
import CoreHaptics
import AVFoundation
import UIKit
import os

struct SystemPowerState: Equatable {
    let thermalState: ProcessInfo.ThermalState
    let lowPowerMode: Bool
    let batteryLevel: Float
    let batteryState: UIDevice.BatteryState
}

final class NativeGamingBridge {
    weak var webView: WKWebView?
    var onPowerStateChange: ((SystemPowerState) -> Void)?

    private let haptics = HapticsManager()
    private let controllers = GameControllerManager()
    private let motion = MotionManager()
    private let audio = AudioSessionManager()
    private let system = SystemMonitor()
    private let deviceProfile = DeviceProfile.current()
    private let eventQueue = DispatchQueue(label: "nativegaming.events", qos: .userInitiated)
    private let log = OSLog(subsystem: "com.emersonviolin.shell", category: "nativegaming")
    private lazy var motionThrottler = EventThrottler(interval: 1.0 / 60.0, queue: eventQueue) { [weak self] payload in
        self?.sendToJS(callback: "__nativeGamingEvent", payload: payload)
    }
    private lazy var controllerThrottler = EventThrottler(interval: 1.0 / 60.0, queue: eventQueue) { [weak self] payload in
        self?.sendToJS(callback: "__nativeGamingEvent", payload: payload)
    }
    private var powerState: SystemPowerState?
    private var perfProfile: PerformanceProfile?
    private var isActive = true

    init() {
        controllers.onEvent = { [weak self] payload in
            self?.sendEvent(type: "controller", data: payload)
        }
        motion.onEvent = { [weak self] payload in
            self?.sendEvent(type: "motion", data: payload)
        }
        system.onPower = { [weak self] payload in
            self?.handlePower(payload)
        }
        system.startObserving()
        applyPowerState(system.currentState())
    }

    func refreshPowerState() {
        applyPowerState(system.currentState())
    }

    func setActive(_ active: Bool) {
        guard active != isActive else { return }
        isActive = active
        if !active {
            motion.stop()
            controllers.stop()
        }
    }

    func handle(_ body: Any) {
        guard let request = parseRequest(body) else { return }
        let id = request.id
        switch request.action {
        case "capabilities":
            respond(id: id, data: [
                "haptics": haptics.supportsHaptics,
                "motion": motion.isAvailable,
                "controllers": controllers.isAvailable,
                "thermal": true
            ])
        case "systemInfo":
            var info = system.info()
            let perf = deviceProfile.performanceProfile(for: system.currentState())
            info["performance"] = perf.payload()
            respond(id: id, data: info)
        case "hapticImpact":
            haptics.impact(style: request.payload["style"] as? String)
            respond(id: id)
        case "hapticSelection":
            haptics.selection()
            respond(id: id)
        case "hapticNotification":
            haptics.notification(type: request.payload["type"] as? String)
            respond(id: id)
        case "controllerStart":
            controllers.start()
            respond(id: id, data: ["active": true])
        case "controllerStop":
            controllers.stop()
            respond(id: id, data: ["active": false])
        case "controllerList":
            respond(id: id, data: controllers.list())
        case "motionStart":
            let frequency = numberValue(from: request.payload, keys: ["frequency", "hz"])
            let intervalMs = numberValue(from: request.payload, keys: ["intervalMs"])
            let interval = intervalMs != nil ? (intervalMs! / 1000.0) : nil
            let started = motion.start(frequency: frequency, interval: interval)
            respond(id: id, data: ["active": started])
        case "motionStop":
            motion.stop()
            respond(id: id, data: ["active": false])
        case "audioSession":
            do {
                let data = try audio.configure(payload: request.payload)
                respond(id: id, data: data)
            } catch {
                respond(id: id, error: "Audio session error: \(error)")
            }
        default:
            respond(id: id, error: "Unknown action: \(request.action)")
        }
    }

    private func parseRequest(_ body: Any) -> (id: String, action: String, payload: [String: Any])? {
        guard let dict = body as? [String: Any],
              let id = dict["id"] as? String,
              let action = dict["action"] as? String else {
            return nil
        }
        let payload = dict["payload"] as? [String: Any] ?? [:]
        return (id: id, action: action, payload: payload)
    }

    private func numberValue(from payload: [String: Any], keys: [String]) -> Double? {
        for key in keys {
            if let value = payload[key] as? Double { return value }
            if let value = payload[key] as? NSNumber { return value.doubleValue }
            if let value = payload[key] as? String, let parsed = Double(value) { return parsed }
        }
        return nil
    }

    private func respond(id: String, data: Any = [:], error: String? = nil) {
        var payload: [String: Any] = ["id": id, "data": data]
        if let error = error {
            payload["error"] = error
        }
        sendToJS(callback: "__nativeGamingCallback", payload: payload)
    }

    private func sendEvent(type: String, data: [String: Any]) {
        let payload: [String: Any] = ["type": type, "data": data]
        switch type {
        case "motion":
            motionThrottler.submit(payload)
        case "controller":
            controllerThrottler.submit(payload)
        default:
            sendToJS(callback: "__nativeGamingEvent", payload: payload)
        }
    }

    private func sendToJS(callback: String, payload: [String: Any]) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
#if DEBUG
            let signpostID = OSSignpostID(log: self.log)
            os_signpost(.begin, log: self.log, name: "JSBridge", signpostID: signpostID, "%{public}s", callback)
#endif
            if #available(iOS 14.0, *) {
                webView.callAsyncJavaScript(
                    "window.\(callback)(payload);",
                    arguments: ["payload": payload],
                    in: nil,
                    in: .page,
                    completionHandler: { _, _ in
#if DEBUG
                        os_signpost(.end, log: self.log, name: "JSBridge", signpostID: signpostID)
#endif
                    }
                )
            } else {
                guard JSONSerialization.isValidJSONObject(payload),
                      let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
                      let json = String(data: data, encoding: .utf8) else {
                    return
                }
                let script = "window.\(callback)(\(json));"
                webView.evaluateJavaScript(script, completionHandler: { _, _ in
#if DEBUG
                    os_signpost(.end, log: self.log, name: "JSBridge", signpostID: signpostID)
#endif
                })
            }
        }
    }

    private func handlePower(_ payload: [String: Any]) {
        sendEvent(type: "power", data: payload)
        sendEvent(type: "thermal", data: payload)
        applyPowerState(system.currentState())
    }

    private func applyPowerState(_ state: SystemPowerState) {
        if let current = powerState, current == state { return }
        powerState = state
        let maxHz: Double
        if state.lowPowerMode || state.thermalState == .critical || state.thermalState == .serious {
            maxHz = 30.0
        } else if state.thermalState == .fair {
            maxHz = 45.0
        } else {
            maxHz = 60.0
        }
        motion.updatePowerCap(maxHz: maxHz)
        motionThrottler.updateInterval(1.0 / maxHz)
        controllerThrottler.updateInterval(1.0 / maxHz)
        onPowerStateChange?(state)

        let profile = deviceProfile.performanceProfile(for: state)
        if profile != perfProfile {
            perfProfile = profile
            sendEvent(type: "perf", data: profile.payload())
        }
    }
}

final class HapticsManager {
    let supportsHaptics: Bool
    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
    private let impactSoft = UIImpactFeedbackGenerator(style: .soft)
    private let impactRigid = UIImpactFeedbackGenerator(style: .rigid)
    private let selectionGen = UISelectionFeedbackGenerator()
    private let notificationGen = UINotificationFeedbackGenerator()

    init() {
        supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
    }

    func impact(style: String?) {
        let key = (style ?? "medium").lowercased()
        switch key {
        case "light":
            impactLight.impactOccurred()
        case "heavy":
            impactHeavy.impactOccurred()
        case "soft":
            impactSoft.impactOccurred()
        case "rigid":
            impactRigid.impactOccurred()
        default:
            impactMedium.impactOccurred()
        }
    }

    func selection() {
        selectionGen.selectionChanged()
    }

    func notification(type: String?) {
        let key = (type ?? "success").lowercased()
        switch key {
        case "warning":
            notificationGen.notificationOccurred(.warning)
        case "error":
            notificationGen.notificationOccurred(.error)
        default:
            notificationGen.notificationOccurred(.success)
        }
    }
}

final class GameControllerManager {
    var onEvent: (([String: Any]) -> Void)?
    private var isRunning = false

    var isAvailable: Bool {
        return !GCController.controllers().isEmpty
    }

    func start() {
        guard !isRunning else { return }
        isRunning = true
        NotificationCenter.default.addObserver(self, selector: #selector(controllerDidConnect), name: .GCControllerDidConnect, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(controllerDidDisconnect), name: .GCControllerDidDisconnect, object: nil)
        attachHandlers(to: GCController.controllers())
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        NotificationCenter.default.removeObserver(self, name: .GCControllerDidConnect, object: nil)
        NotificationCenter.default.removeObserver(self, name: .GCControllerDidDisconnect, object: nil)
        GCController.controllers().forEach { controller in
            controller.extendedGamepad?.valueChangedHandler = nil
            controller.gamepad?.valueChangedHandler = nil
        }
    }

    func list() -> [[String: Any]] {
        return GCController.controllers().map { describe($0) }
    }

    @objc private func controllerDidConnect(_ notification: Notification) {
        if let controller = notification.object as? GCController {
            attachHandlers(to: [controller])
        }
    }

    @objc private func controllerDidDisconnect(_ notification: Notification) {
        if let controller = notification.object as? GCController {
            onEvent?([\"type\": \"disconnect\", \"controller\": describe(controller)])
        }
    }

    private func attachHandlers(to controllers: [GCController]) {
        controllers.forEach { controller in
            if let pad = controller.extendedGamepad {
                pad.valueChangedHandler = { [weak self] pad, element in
                    guard let self = self else { return }
                    let payload = self.payload(for: controller, extended: pad)
                    self.onEvent?(payload)
                }
            } else if let pad = controller.gamepad {
                pad.valueChangedHandler = { [weak self] pad, element in
                    guard let self = self else { return }
                    let payload = self.payload(for: controller, gamepad: pad)
                    self.onEvent?(payload)
                }
            }
        }
    }

    private func describe(_ controller: GCController) -> [String: Any] {
        return [
            "id": controller.vendorName ?? UUID().uuidString,
            "name": controller.vendorName ?? "Controller",
            "extended": controller.extendedGamepad != nil
        ]
    }

    private func payload(for controller: GCController, extended: GCExtendedGamepad) -> [String: Any] {
        let buttons: [String: Any] = [
            "a": extended.buttonA.value,
            "b": extended.buttonB.value,
            "x": extended.buttonX.value,
            "y": extended.buttonY.value,
            "lb": extended.leftShoulder.value,
            "rb": extended.rightShoulder.value,
            "lt": extended.leftTrigger.value,
            "rt": extended.rightTrigger.value
        ]
        let axes: [String: Any] = [
            "lx": extended.leftThumbstick.xAxis.value,
            "ly": extended.leftThumbstick.yAxis.value,
            "rx": extended.rightThumbstick.xAxis.value,
            "ry": extended.rightThumbstick.yAxis.value
        ]
        let dpad: [String: Any] = [
            "x": extended.dpad.xAxis.value,
            "y": extended.dpad.yAxis.value
        ]
        return [
            "type": "input",
            "controller": describe(controller),
            "buttons": buttons,
            "axes": axes,
            "dpad": dpad
        ]
    }

    private func payload(for controller: GCController, gamepad: GCGamepad) -> [String: Any] {
        let buttons: [String: Any] = [
            "a": gamepad.buttonA.value,
            "b": gamepad.buttonB.value,
            "x": gamepad.buttonX.value,
            "y": gamepad.buttonY.value,
            "lb": gamepad.leftShoulder.value,
            "rb": gamepad.rightShoulder.value
        ]
        let dpad: [String: Any] = [
            "x": gamepad.dpad.xAxis.value,
            "y": gamepad.dpad.yAxis.value
        ]
        return [
            "type": "input",
            "controller": describe(controller),
            "buttons": buttons,
            "axes": [
                "lx": gamepad.dpad.xAxis.value,
                "ly": gamepad.dpad.yAxis.value
            ],
            "dpad": dpad
        ]
    }
}

final class MotionManager {
    var onEvent: (([String: Any]) -> Void)?
    private let manager = CMMotionManager()
    private var maxHz: Double = 60.0
    private let queue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "nativegaming.motion"
        queue.qualityOfService = .userInitiated
        queue.maxConcurrentOperationCount = 1
        return queue
    }()

    var isAvailable: Bool {
        return manager.isDeviceMotionAvailable
    }

    func start(frequency: Double?, interval: Double?) -> Bool {
        guard isAvailable else { return false }
        let targetInterval: Double
        if let interval = interval {
            targetInterval = interval
        } else if let frequency = frequency, frequency > 0 {
            targetInterval = 1.0 / min(frequency, maxHz)
        } else {
            targetInterval = 1.0 / maxHz
        }
        manager.deviceMotionUpdateInterval = targetInterval
        manager.startDeviceMotionUpdates(to: queue) { [weak self] motion, error in
            guard let self = self, let motion = motion else { return }
            let data: [String: Any] = [
                "attitude": ["roll": motion.attitude.roll, "pitch": motion.attitude.pitch, "yaw": motion.attitude.yaw],
                "rotationRate": ["x": motion.rotationRate.x, "y": motion.rotationRate.y, "z": motion.rotationRate.z],
                "gravity": ["x": motion.gravity.x, "y": motion.gravity.y, "z": motion.gravity.z],
                "userAcceleration": ["x": motion.userAcceleration.x, "y": motion.userAcceleration.y, "z": motion.userAcceleration.z]
            ]
            self.onEvent?(data)
        }
        return true
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
    }

    func updatePowerCap(maxHz: Double) {
        self.maxHz = max(15.0, maxHz)
    }
}

final class AudioSessionManager {
    func configure(payload: [String: Any]) throws -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        let category = parseCategory(payload["category"] as? String)
        let mode = parseMode(payload["mode"] as? String)
        let options = parseOptions(payload["options"])
        try session.setCategory(category, mode: mode, options: options)
        if let sampleRate = payload["preferredSampleRate"] as? Double {
            try session.setPreferredSampleRate(sampleRate)
        }
        if let buffer = payload["preferredIOBufferDuration"] as? Double {
            try session.setPreferredIOBufferDuration(buffer)
        }
        try session.setActive(true)
        return [
            "category": session.category.rawValue,
            "mode": session.mode.rawValue,
            "sampleRate": session.sampleRate,
            "ioBufferDuration": session.ioBufferDuration
        ]
    }

    private func parseCategory(_ value: String?) -> AVAudioSession.Category {
        switch (value ?? "playAndRecord").lowercased() {
        case "ambient": return .ambient
        case "playback": return .playback
        case "record": return .record
        case "multiRoute": return .multiRoute
        case "soloAmbient": return .soloAmbient
        default: return .playAndRecord
        }
    }

    private func parseMode(_ value: String?) -> AVAudioSession.Mode {
        switch (value ?? "default").lowercased() {
        case "measurement": return .measurement
        case "spokenAudio": return .spokenAudio
        case "videoChat": return .videoChat
        case "voiceChat": return .voiceChat
        case "gameChat": return .gameChat
        default: return .default
        }
    }

    private func parseOptions(_ value: Any?) -> AVAudioSession.CategoryOptions {
        guard let array = value as? [String] else { return [] }
        var options: AVAudioSession.CategoryOptions = []
        array.forEach { item in
            switch item.lowercased() {
            case "defaulttospeaker": options.insert(.defaultToSpeaker)
            case "allowbluetooth": options.insert(.allowBluetooth)
            case "allowbluetootha2dp": options.insert(.allowBluetoothA2DP)
            case "mixwithothers": options.insert(.mixWithOthers)
            case "duckothers": options.insert(.duckOthers)
            default: break
            }
        }
        return options
    }
}

final class SystemMonitor {
    var onPower: (([String: Any]) -> Void)?
    private var observers: [NSObjectProtocol] = []

    func startObserving() {
        UIDevice.current.isBatteryMonitoringEnabled = true
        let thermalObserver = NotificationCenter.default.addObserver(
            forName: ProcessInfo.thermalStateDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emitPower()
        }
        let powerObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name.NSProcessInfoPowerStateDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emitPower()
        }
        let batteryLevelObserver = NotificationCenter.default.addObserver(
            forName: UIDevice.batteryLevelDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emitPower()
        }
        let batteryStateObserver = NotificationCenter.default.addObserver(
            forName: UIDevice.batteryStateDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.emitPower()
        }
        observers = [thermalObserver, powerObserver, batteryLevelObserver, batteryStateObserver]
    }

    func currentState() -> SystemPowerState {
        return SystemPowerState(
            thermalState: ProcessInfo.processInfo.thermalState,
            lowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled,
            batteryLevel: UIDevice.current.batteryLevel,
            batteryState: UIDevice.current.batteryState
        )
    }

    func info() -> [String: Any] {
        return [
            "device": UIDevice.current.model,
            "system": UIDevice.current.systemName,
            "systemVersion": UIDevice.current.systemVersion,
            "thermalState": ProcessInfo.processInfo.thermalState.rawValue,
            "lowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled,
            "batteryLevel": UIDevice.current.batteryLevel,
            "batteryState": UIDevice.current.batteryState.rawValue
        ]
    }

    private func emitPower() {
        let state = currentState()
        let payload: [String: Any] = [
            "thermalState": state.thermalState.rawValue,
            "lowPowerMode": state.lowPowerMode,
            "batteryLevel": UIDevice.current.batteryLevel,
            "batteryState": UIDevice.current.batteryState.rawValue
        ]
        onPower?(payload)
    }
}

final class EventThrottler {
    private var interval: TimeInterval
    private let queue: DispatchQueue
    private let handler: ([String: Any]) -> Void
    private var lastEmit: TimeInterval = 0
    private var pending: [String: Any]?
    private var timer: DispatchWorkItem?

    init(interval: TimeInterval, queue: DispatchQueue, handler: @escaping ([String: Any]) -> Void) {
        self.interval = interval
        self.queue = queue
        self.handler = handler
    }

    func submit(_ payload: [String: Any]) {
        queue.async {
            let now = ProcessInfo.processInfo.systemUptime
            let delta = now - self.lastEmit
            if delta >= self.interval {
                self.lastEmit = now
                self.handler(payload)
                return
            }
            self.pending = payload
            if self.timer == nil {
                let wait = self.interval - delta
                let work = DispatchWorkItem { [weak self] in
                    guard let self = self else { return }
                    self.lastEmit = ProcessInfo.processInfo.systemUptime
                    if let pending = self.pending {
                        self.handler(pending)
                    }
                    self.pending = nil
                    self.timer = nil
                }
                self.timer = work
                self.queue.asyncAfter(deadline: .now() + max(wait, 0.0), execute: work)
            }
        }
    }

    func updateInterval(_ interval: TimeInterval) {
        queue.async {
            self.interval = interval
        }
    }
}
