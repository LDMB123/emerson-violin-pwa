import Foundation
import CoreML
import UIKit
import os
import Accelerate

struct CoreMLRequest: Decodable {
    let id: String
    let model: String
    let input: [Double]?
    let batch: [[Double]]?
    let inputKey: String?
    let outputKey: String?
    let cacheKey: String?
    let topK: Int?
    let maxOutput: Int?
    let returnMeta: Bool?
    let models: [String]?
    let streamId: String?
    let streamAppend: [Double]?
    let windowSize: Int?
    let clearStream: Bool?
    let rejectWhenBusy: Bool?
    let allowOnConstrained: Bool?
    let packUrl: String?
    let action: String?
}

struct CoreMLResponse: Encodable {
    let id: String
    let output: [Double]
    let shape: [Int]?
    let error: String?
    let models: [String]?
    let indices: [Int]?
    let batchOutput: [[Double]]?
    let batchShapes: [[Int]]?
    let batchIndices: [[Int]]?
    let modelUsed: String?
    let cached: Bool?
    let busy: Bool?
    let snapshot: CoreMLSnapshot?
    let message: String?
    let evaluation: ModelEvaluationReport?
    let pack: ModelPackReport?
}

enum CoreMLBridgeError: Error {
    case missingModel
    case invalidInput
    case missingOutput
    case integrityFailed
    case constrained
}

final class CoreMLBridge: NSObject, NSCacheDelegate {
    private var models: [String: MLModel] = [:]
    private var inputCache: [String: MLMultiArray] = [:]
    private var warmedModels: Set<String> = []
    private var availableModelNames: Set<String> = []
    private var modelSemaphores: [String: DispatchSemaphore] = [:]
    private var modelRateLimiters: [String: RateLimiter] = [:]
    private let outputCache = NSCache<NSString, OutputCacheEntry>()
    private var registry = ModelRegistryProvider.load()
    private let deviceProfile = DeviceProfile.current()
    private var currentBudget = PowerBudget(maxIps: 12, maxConcurrency: 2, computeUnits: .cpuAndNeuralEngine, constrained: false)
    private var computeUnits: MLComputeUnits = .cpuAndNeuralEngine
    private var isConstrained = false
    private var totalInferences = 0
    private var cacheHits = 0
    private var batchRequests = 0
    private var batchItems = 0
    private var lastInferenceMs: Double?
    private var lastModelUsed: String?
    private var lastWasCached = false
    private var outputCacheCount = 0
    private var modelLatencyEma: [String: Double] = [:]
    private let latencyEmaAlpha = 0.2
    private var inflightCount = 0
    private var lastPowerState: SystemPowerState
    private var streamBuffers: [String: StreamBuffer] = [:]
    private let maxStreams = 16
    private var integrityCache: [String: Bool] = [:]
    private let defaultOutputCacheTTL: TimeInterval = 30
    private var outputCacheTTL: TimeInterval = 30
    private var memoryWarningObserver: NSObjectProtocol?
    private var memoryPressureSource: DispatchSourceMemoryPressure?
    private let workQueue = DispatchQueue(label: "coreml.bridge.work", qos: .userInitiated, attributes: .concurrent)
    private let stateQueue = DispatchQueue(label: "coreml.bridge.state", qos: .userInitiated)
    private var concurrencySemaphore = DispatchSemaphore(value: 2)
    private let rateLimiter = RateLimiter(maxPerSecond: 12)
    private let smallModelSuffixes = ["_small", "-small", "Small", "_lite", "-lite", "Lite"]
    private let log = OSLog(subsystem: "com.emersonviolin.shell", category: "coreml")
    private var isSuspended = false

    private struct StreamBuffer {
        var values: [Double]
        var lastUpdated: TimeInterval
        var maxWindow: Int?
    }

    init() {
        super.init()
        let initialState = SystemPowerState(
            thermalState: ProcessInfo.processInfo.thermalState,
            lowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled,
            batteryLevel: UIDevice.current.batteryLevel,
            batteryState: UIDevice.current.batteryState
        )
        lastPowerState = initialState
        currentBudget = deviceProfile.budget(for: initialState)
        computeUnits = currentBudget.computeUnits
        isConstrained = currentBudget.constrained
        rateLimiter.update(maxPerSecond: currentBudget.maxIps)
        concurrencySemaphore = DispatchSemaphore(value: currentBudget.maxConcurrency)
        outputCache.countLimit = 32
        outputCache.totalCostLimit = 2 * 1024 * 1024
        outputCache.delegate = self
        outputCacheTTL = defaultOutputCacheTTL
        memoryWarningObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            guard let self = self else { return }
            self.outputCacheTTL = min(self.outputCacheTTL, 5)
            self.trimCaches(for: .warning)
        }
        let source = DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: stateQueue)
        source.setEventHandler { [weak self] in
            guard let self = self else { return }
            self.trimCaches(for: source.data)
        }
        source.resume()
        memoryPressureSource = source
    }

    deinit {
        if let observer = memoryWarningObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    func status() -> (snapshot: CoreMLSnapshot, busy: Bool) {
        let snap = snapshot()
        let busy = snap.inflightCount >= snap.maxConcurrency
        return (snap, busy)
    }

    func cache(_ cache: NSCache<AnyObject, AnyObject>, willEvictObject obj: Any) {
        if obj is OutputCacheEntry {
            stateQueue.async {
                self.outputCacheCount = max(0, self.outputCacheCount - 1)
            }
        }
    }

    func infer(_ request: CoreMLRequest, completion: @escaping (CoreMLResponse) -> Void) {
        workQueue.async {
            let registry = self.registrySnapshot()
            let modelConfig = registry.config(for: request.model)
            let hasOverrides = registry.models[request.model] != nil
            if self.stateQueue.sync(execute: { self.isSuspended }) {
                completion(self.busyResponse(id: request.id, message: "App inactive"))
                return
            }
            let budget = self.stateQueue.sync { self.currentBudget }
            if budget.constrained, request.allowOnConstrained != true {
                completion(self.busyResponse(id: request.id, message: "Power constrained"))
                return
            }
            let maxConcurrent = self.effectiveMaxConcurrency(for: modelConfig, budget: budget, useOverrides: hasOverrides)
            if (request.rejectWhenBusy ?? false), self.isBusy(maxConcurrent: maxConcurrent) {
                completion(self.busyResponse(id: request.id, message: "Busy"))
                return
            }
            if let streamId = request.streamId,
               request.clearStream == true,
               (request.streamAppend == nil),
               (request.input == nil || request.input?.isEmpty == true),
               (request.batch == nil || request.batch?.isEmpty == true) {
                let cleared = self.clearStream(id: streamId)
                completion(self.infoResponse(id: request.id, message: cleared ? "Stream cleared" : "Stream not found"))
                return
            }
            self.stateQueue.sync {
                self.inflightCount += 1
            }
            defer {
                self.stateQueue.async {
                    self.inflightCount = max(0, self.inflightCount - 1)
                }
            }
            let limiter = self.limiter(for: request.model, config: modelConfig, budget: budget, useOverrides: hasOverrides)
            let semaphore = self.semaphore(for: request.model, config: modelConfig, budget: budget, useOverrides: hasOverrides)
            semaphore.wait()
            defer { semaphore.signal() }
            limiter.acquire()
            let start = ProcessInfo.processInfo.systemUptime
            autoreleasepool {
#if DEBUG
                let signpostID = OSSignpostID(log: self.log)
                let inputCount = request.input?.count ?? 0
                os_signpost(.begin, log: self.log, name: "CoreMLInfer", signpostID: signpostID, "%{public}s inputs=%{public}d", request.model, inputCount)
#endif
                do {
                    let (model, modelName) = try self.loadModel(named: request.model, config: modelConfig)
                    let inputKey = request.inputKey ?? "input"
                    let dataType = model.modelDescription
                        .inputDescriptionsByName[inputKey]?
                        .multiArrayConstraint?
                        .dataType ?? .float32

                    if let batch = request.batch, !batch.isEmpty {
                        let outputKey = request.outputKey
                        let topK = request.topK ?? modelConfig.topKDefault
                        let maxOutput = request.maxOutput ?? modelConfig.maxOutputDefault
                        let allowBatch = modelConfig.batchEnabled ?? true
                        let result = try self.inferBatch(
                            model: model,
                            modelName: modelName,
                            inputKey: inputKey,
                            dataType: dataType,
                            batch: batch,
                            outputKey: outputKey,
                            topK: topK,
                            maxOutput: maxOutput,
                            useBatchProvider: allowBatch
                        )
                        self.recordInference(
                            modelName: modelName,
                            duration: ProcessInfo.processInfo.systemUptime - start,
                            cached: false,
                            batchCount: batch.count
                        )
                        completion(CoreMLResponse(
                            id: request.id,
                            output: [],
                            shape: nil,
                            error: nil,
                            models: nil,
                            indices: nil,
                            batchOutput: result.outputs,
                            batchShapes: result.shapes,
                            batchIndices: result.indices,
                            modelUsed: modelName,
                            cached: false,
                            busy: nil,
                            snapshot: nil,
                            message: nil,
                            evaluation: nil,
                            pack: nil
                        ))
                        return
                    }

                    let inputValues = self.resolveInputValues(request)
                    if inputValues.isEmpty {
                        throw CoreMLBridgeError.invalidInput
                    }

                    let allowCache = modelConfig.allowCache ?? true
                    let effectiveCacheKey = allowCache ? request.cacheKey : nil
                    let topK = request.topK ?? modelConfig.topKDefault
                    let maxOutput = request.maxOutput ?? modelConfig.maxOutputDefault

                    if let cacheKey = effectiveCacheKey,
                       let cached = self.cachedOutput(forKey: cacheKey) {
                        let processed = self.postprocessOutput(
                            values: cached.values,
                            shape: cached.shape,
                            topK: topK,
                            maxOutput: maxOutput
                        )
                        self.recordInference(
                            modelName: modelName,
                            duration: ProcessInfo.processInfo.systemUptime - start,
                            cached: true,
                            batchCount: 1
                        )
                        completion(CoreMLResponse(
                            id: request.id,
                            output: processed.values,
                            shape: processed.shape,
                            error: nil,
                            models: nil,
                            indices: processed.indices,
                            batchOutput: nil,
                            batchShapes: nil,
                            batchIndices: nil,
                            modelUsed: modelName,
                            cached: true,
                            busy: nil,
                            snapshot: nil,
                            message: nil,
                            evaluation: nil,
                            pack: nil
                        ))
                        return
                    }

                    let inputArray = try self.makeMultiArray(
                        inputValues,
                        dataType: dataType,
                        cacheKey: "\(modelName):\(inputKey):\(dataType.rawValue):\(inputValues.count)"
                    )
                    let provider = try MLDictionaryFeatureProvider(dictionary: [inputKey: inputArray])
                    let output = try model.prediction(from: provider)
                    let outputKey = request.outputKey
                    let (values, shape) = try self.extractOutput(output, preferredKey: outputKey)
                    if let cacheKey = effectiveCacheKey {
                        self.storeCachedOutput(values: values, shape: shape, key: cacheKey)
                    }
                    let processed = self.postprocessOutput(
                        values: values,
                        shape: shape,
                        topK: topK,
                        maxOutput: maxOutput
                    )
                    self.recordInference(
                        modelName: modelName,
                        duration: ProcessInfo.processInfo.systemUptime - start,
                        cached: false,
                        batchCount: 1
                    )
                    completion(CoreMLResponse(
                        id: request.id,
                        output: processed.values,
                        shape: processed.shape,
                        error: nil,
                        models: nil,
                        indices: processed.indices,
                        batchOutput: nil,
                        batchShapes: nil,
                        batchIndices: nil,
                        modelUsed: modelName,
                        cached: false,
                        busy: nil,
                        snapshot: nil,
                        message: nil,
                        evaluation: nil,
                        pack: nil
                    ))
                } catch {
                    self.recordInference(
                        modelName: request.model,
                        duration: ProcessInfo.processInfo.systemUptime - start,
                        cached: false,
                        batchCount: 0
                    )
                    completion(self.errorResponse(id: request.id, error: String(describing: error)))
                }
#if DEBUG
                os_signpost(.end, log: self.log, name: "CoreMLInfer", signpostID: signpostID)
#endif
            }
        }
    }

    func listModels() -> [String] {
        let models = stateQueue.sync {
            if availableModelNames.isEmpty {
                availableModelNames = Self.loadModelNames()
            }
            return availableModelNames
        }
        return models.sorted()
    }

    private func loadModel(named name: String, config: ModelConfig) throws -> (MLModel, String) {
        let resolvedName = resolveModelName(for: name, config: config)
        let units = effectiveComputeUnits(for: config)
        let cacheKey = "\(resolvedName)|\(units.label)"
        if let cached = stateQueue.sync(execute: { models[cacheKey] }) {
            return (cached, resolvedName)
        }
        guard let url = modelURL(for: resolvedName) else {
            throw CoreMLBridgeError.missingModel
        }
        try verifyModelIntegrity(named: resolvedName, url: url, config: config)
        let configuration = MLModelConfiguration()
        configuration.computeUnits = units
        configureLowPrecision(configuration)
        let model = try MLModel(contentsOf: url, configuration: configuration)
        stateQueue.sync {
            models[cacheKey] = model
        }
        warmUpIfNeeded(model: model, name: cacheKey)
        return (model, resolvedName)
    }

    private func modelURL(for name: String) -> URL? {
        if let override = modelOverrideURL(for: name) {
            return override
        }
        return Bundle.main.url(forResource: name, withExtension: "mlmodelc")
    }

    private func modelOverrideURL(for name: String) -> URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
            .appendingPathComponent("Models", isDirectory: true)
        let url = directory.appendingPathComponent("\(name).mlmodelc")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func updateComputeUnits(_ units: MLComputeUnits) {
        stateQueue.async {
            guard self.computeUnits != units else { return }
            self.computeUnits = units
            self.clearCacheLocked()
        }
    }

    func updatePowerProfile(_ state: SystemPowerState) {
        let budget = deviceProfile.budget(for: state)
        rateLimiter.update(maxPerSecond: budget.maxIps)
        stateQueue.async {
            self.currentBudget = budget
            self.isConstrained = budget.constrained
            self.lastPowerState = state
            if self.computeUnits != budget.computeUnits {
                self.computeUnits = budget.computeUnits
                self.clearCacheLocked()
            }
            self.updateConcurrencyLocked(budget.maxConcurrency)
        }
    }

    func setAppActive(_ active: Bool) {
        stateQueue.async {
            self.isSuspended = !active
            self.outputCacheTTL = active ? self.defaultOutputCacheTTL : min(self.outputCacheTTL, 5)
            if !active {
                self.trimCachesLocked(level: .warning)
            }
        }
    }

    func preload(models: [String]?) {
        workQueue.async {
            let registry = self.registrySnapshot()
            let names = models ?? self.listModels()
            for name in names {
                let config = registry.config(for: name)
                _ = try? self.loadModel(named: name, config: config)
            }
        }
    }

    func preloadDefaults() {
        let registry = registrySnapshot()
        guard let names = registry.preload, !names.isEmpty else { return }
        preload(models: names)
    }

    func reloadRegistry() {
        let updated = ModelRegistryProvider.load()
        stateQueue.async {
            self.registry = updated
            self.availableModelNames.removeAll()
        }
    }

    func clearAllCaches() {
        stateQueue.async {
            self.clearCacheLocked()
        }
    }

    private func clearCache() {
        stateQueue.async {
            self.clearCacheLocked()
        }
    }

    private func clearCacheLocked() {
        models.removeAll()
        inputCache.removeAll()
        warmedModels.removeAll()
        availableModelNames.removeAll()
        outputCache.removeAllObjects()
        outputCacheCount = 0
        modelSemaphores.removeAll()
        modelRateLimiters.removeAll()
        modelLatencyEma.removeAll()
        streamBuffers.removeAll()
        integrityCache.removeAll()
    }

    func clearStream(id: String) -> Bool {
        return stateQueue.sync {
            if streamBuffers.removeValue(forKey: id) != nil {
                return true
            }
            return false
        }
    }

    private func pruneStreams() {
        stateQueue.async {
            self.pruneStreamsLocked()
        }
    }

    private func pruneStreamsLocked() {
        guard streamBuffers.count > maxStreams else { return }
        let sorted = streamBuffers.sorted { lhs, rhs in
            lhs.value.lastUpdated < rhs.value.lastUpdated
        }
        let removeCount = streamBuffers.count - maxStreams
        for index in 0..<removeCount {
            streamBuffers.removeValue(forKey: sorted[index].key)
        }
    }

    private func resolveInputValues(_ request: CoreMLRequest) -> [Double] {
        guard let streamId = request.streamId else {
            return request.input ?? []
        }
        if let append = request.streamAppend, !append.isEmpty {
            return updateStreamBuffer(id: streamId, append: append, replace: request.input, windowSize: request.windowSize)
        }
        if let input = request.input, !input.isEmpty {
            return updateStreamBuffer(id: streamId, append: nil, replace: input, windowSize: request.windowSize)
        }
        return stateQueue.sync { streamBuffers[streamId]?.values ?? [] }
    }

    private func trimCaches(for level: DispatchSource.MemoryPressureEvent) {
        stateQueue.async {
            self.trimCachesLocked(level: level)
        }
    }

    private func trimCachesLocked(level: DispatchSource.MemoryPressureEvent) {
        if level.contains(.critical) {
            clearCacheLocked()
            return
        }
        inputCache.removeAll()
        outputCache.removeAllObjects()
        outputCacheCount = 0
        integrityCache.removeAll()
        pruneStreamsLocked()
    }

    private func updateStreamBuffer(
        id: String,
        append: [Double]?,
        replace: [Double]?,
        windowSize: Int?
    ) -> [Double] {
        let now = ProcessInfo.processInfo.systemUptime
        return stateQueue.sync {
            var buffer = streamBuffers[id] ?? StreamBuffer(values: [], lastUpdated: now, maxWindow: windowSize)
            if let replace = replace, !replace.isEmpty {
                buffer.values = replace
            }
            if let append = append, !append.isEmpty {
                buffer.values.append(contentsOf: append)
            }
            if let window = windowSize, window > 0 {
                buffer.maxWindow = window
            }
            if let window = buffer.maxWindow, window > 0, buffer.values.count > window {
                buffer.values = Array(buffer.values.suffix(window))
            }
            buffer.lastUpdated = now
            streamBuffers[id] = buffer
            pruneStreamsLocked()
            return buffer.values
        }
    }

    private func makeMultiArray(
        _ input: [Double],
        dataType: MLMultiArrayDataType,
        cacheKey: String,
        useCache: Bool = true
    ) throws -> MLMultiArray {
        if input.isEmpty {
            throw CoreMLBridgeError.invalidInput
        }
        if useCache,
           let cached = stateQueue.sync(execute: { inputCache[cacheKey] }),
           cached.count == input.count,
           cached.dataType == dataType {
            fillArray(cached, with: input)
            return cached
        }
        let array = try MLMultiArray(shape: [NSNumber(value: input.count)], dataType: dataType)
        fillArray(array, with: input)
        if useCache {
            stateQueue.sync {
                inputCache[cacheKey] = array
            }
        }
        return array
    }

    private func fillArray(_ array: MLMultiArray, with input: [Double]) {
        let count = input.count
        switch array.dataType {
        case .double:
            let pointer = array.dataPointer.bindMemory(to: Double.self, capacity: count)
            input.withUnsafeBufferPointer { buffer in
                if let base = buffer.baseAddress {
                    pointer.assign(from: base, count: count)
                }
            }
        case .float32:
            let pointer = array.dataPointer.bindMemory(to: Float.self, capacity: count)
            input.withUnsafeBufferPointer { buffer in
                if let base = buffer.baseAddress {
                    vDSP_vdpsp(base, 1, pointer, 1, vDSP_Length(count))
                }
            }
        default:
            for (index, value) in input.enumerated() {
                array[index] = NSNumber(value: value)
            }
        }
    }

    private func resolveModelName(for requested: String, config: ModelConfig) -> String {
        if let variant = config.resolvedVariant(baseName: requested) {
            let available = stateQueue.sync { () -> Set<String> in
                if availableModelNames.isEmpty {
                    availableModelNames = Self.loadModelNames()
                }
                return availableModelNames
            }
            if available.contains(variant) {
                return variant
            }
        }
        if let target = config.targetLatencyMs {
            let ema = stateQueue.sync { modelLatencyEma[requested] }
            if let ema = ema,
               ema > target * 1.2,
               let fallback = config.fallbackModel {
                let available = stateQueue.sync { () -> Set<String> in
                    if availableModelNames.isEmpty {
                        availableModelNames = Self.loadModelNames()
                    }
                    return availableModelNames
                }
                if available.contains(fallback) {
                    return fallback
                }
            }
        }
        let constrained = stateQueue.sync { isConstrained }
        guard constrained else { return requested }
        let available = stateQueue.sync { () -> Set<String> in
            if availableModelNames.isEmpty {
                availableModelNames = Self.loadModelNames()
            }
            return availableModelNames
        }
        if let fallback = config.fallbackModel, available.contains(fallback) {
            return fallback
        }
        if smallModelSuffixes.contains(where: { requested.hasSuffix($0) }) {
            return requested
        }
        for suffix in smallModelSuffixes {
            let candidate = requested + suffix
            if available.contains(candidate) {
                return candidate
            }
        }
        return requested
    }

    private func effectiveComputeUnits(for config: ModelConfig) -> MLComputeUnits {
        let globalUnits = stateQueue.sync { computeUnits }
        if globalUnits == .cpuOnly {
            return .cpuOnly
        }
        if let preferred = MLComputeUnits.from(config.preferredComputeUnits) {
            if globalUnits == .cpuAndNeuralEngine && preferred == .cpuAndGPU {
                return preferred
            }
            return preferred
        }
        return globalUnits
    }

    private func configureLowPrecision(_ configuration: MLModelConfiguration) {
        let gpuSelector = NSSelectorFromString("setAllowLowPrecisionAccumulationOnGPU:")
        if configuration.responds(to: gpuSelector) {
            configuration.setValue(true, forKey: "allowLowPrecisionAccumulationOnGPU")
        }
        let cpuSelector = NSSelectorFromString("setAllowLowPrecisionAccumulationOnCPU:")
        if configuration.responds(to: cpuSelector) {
            configuration.setValue(true, forKey: "allowLowPrecisionAccumulationOnCPU")
        }
    }

    private func registrySnapshot() -> ModelRegistry {
        return stateQueue.sync { registry }
    }

    private func verifyModelIntegrity(named name: String, url: URL, config: ModelConfig) throws {
        guard config.requireIntegrity == true else { return }
        guard let expected = config.integrityHash, !expected.isEmpty else { return }
        if let cached = stateQueue.sync(execute: { integrityCache[name] }) {
            if cached { return }
            throw CoreMLBridgeError.integrityFailed
        }
        let valid = ModelIntegrityVerifier.verify(url: url, expectedSHA256: expected)
        stateQueue.sync {
            integrityCache[name] = valid
        }
        if !valid {
            throw CoreMLBridgeError.integrityFailed
        }
    }

    private func limiter(for modelName: String, config: ModelConfig, budget: PowerBudget, useOverrides: Bool) -> RateLimiter {
        let scale = latencyScale(for: modelName, config: config)
        if useOverrides, let requested = config.maxInferencesPerSecond {
            let effective = max(1, min(requested, budget.maxIps) * scale)
            return stateQueue.sync {
                if let limiter = modelRateLimiters[modelName] {
                    limiter.update(maxPerSecond: effective)
                    return limiter
                }
                let limiter = RateLimiter(maxPerSecond: effective)
                modelRateLimiters[modelName] = limiter
                return limiter
            }
        }
        let effective = max(1, budget.maxIps * scale)
        rateLimiter.update(maxPerSecond: effective)
        return rateLimiter
    }

    private func semaphore(for modelName: String, config: ModelConfig, budget: PowerBudget, useOverrides: Bool) -> DispatchSemaphore {
        guard useOverrides, let requested = config.maxConcurrency else {
            return stateQueue.sync { concurrencySemaphore }
        }
        let effective = min(requested, budget.maxConcurrency)
        return stateQueue.sync {
            if let semaphore = modelSemaphores[modelName] {
                return semaphore
            }
            let semaphore = DispatchSemaphore(value: max(1, effective))
            modelSemaphores[modelName] = semaphore
            return semaphore
        }
    }

    private func effectiveMaxConcurrency(for config: ModelConfig, budget: PowerBudget, useOverrides: Bool) -> Int {
        let override = useOverrides ? (config.maxConcurrency ?? budget.maxConcurrency) : budget.maxConcurrency
        return max(1, min(override, budget.maxConcurrency))
    }

    private func isBusy(maxConcurrent: Int) -> Bool {
        return stateQueue.sync { inflightCount >= maxConcurrent }
    }

    private func latencyScale(for modelName: String, config: ModelConfig) -> Double {
        guard let target = config.targetLatencyMs, target > 0 else { return 1.0 }
        let ema = stateQueue.sync { modelLatencyEma[modelName] }
        guard let ema = ema, ema > 0 else { return 1.0 }
        let raw = target / ema
        return min(1.0, max(0.25, raw))
    }

    private func warmUpIfNeeded(model: MLModel, name: String) {
        let shouldWarm = stateQueue.sync { () -> Bool in
            if warmedModels.contains(name) { return false }
            warmedModels.insert(name)
            return true
        }
        guard shouldWarm else { return }
        let inputs = model.modelDescription.inputDescriptionsByName
        guard inputs.count == 1, let (key, desc) = inputs.first else { return }
        guard let constraint = desc.multiArrayConstraint, !constraint.shape.isEmpty else { return }
        do {
            let array = try MLMultiArray(shape: constraint.shape, dataType: constraint.dataType)
            let provider = try MLDictionaryFeatureProvider(dictionary: [key: array])
            _ = try model.prediction(from: provider)
        } catch {
            // Warmup is best-effort only.
        }
    }

    func snapshot() -> CoreMLSnapshot {
        let snapshot = stateQueue.sync { () -> CoreMLSnapshot in
            let available = availableModelNames.isEmpty ? Self.loadModelNames() : availableModelNames
            let loadedNames = models.keys.sorted()
            let warmed = warmedModels.sorted()
            let hitRate = totalInferences > 0 ? Double(cacheHits) / Double(totalInferences) : 0
            let power = lastPowerState
            let summaries = registry.models.map { (name, config) -> ModelSummary in
                let ema = modelLatencyEma[name]
                return ModelSummary(
                    id: name,
                    name: name,
                    preferredUnits: config.preferredComputeUnits,
                    maxIps: config.maxInferencesPerSecond,
                    maxConcurrency: config.maxConcurrency,
                    topKDefault: config.topKDefault,
                    maxOutputDefault: config.maxOutputDefault,
                    targetLatencyMs: config.targetLatencyMs,
                    latencyEmaMs: ema,
                    allowCache: config.allowCache,
                    batchEnabled: config.batchEnabled,
                    fallbackModel: config.fallbackModel,
                    variants: config.variants
                )
            }.sorted { $0.name < $1.name }
            return CoreMLSnapshot(
                deviceTier: deviceProfile.tier,
                computeUnits: computeUnits.label,
                maxIps: currentBudget.maxIps,
                maxConcurrency: currentBudget.maxConcurrency,
                constrained: currentBudget.constrained,
                thermalState: power.thermalState.rawValue,
                lowPowerMode: power.lowPowerMode,
                batteryLevel: power.batteryLevel,
                batteryState: power.batteryState.rawValue,
                totalInferences: totalInferences,
                cacheHits: cacheHits,
                cacheHitRate: hitRate,
                batchRequests: batchRequests,
                batchItems: batchItems,
                lastInferenceMs: lastInferenceMs,
                lastModelUsed: lastModelUsed,
                lastWasCached: lastWasCached,
                outputCacheCount: outputCacheCount,
                outputCacheTTL: outputCacheTTL,
                availableModels: available.sorted(),
                loadedModels: loadedNames,
                warmedModels: warmed,
                registryPreload: registry.preload ?? [],
                registrySource: registry.source,
                modelSummaries: summaries,
                inflightCount: inflightCount
            )
        }
        return snapshot
    }

    private func recordInference(modelName: String, duration: TimeInterval, cached: Bool, batchCount: Int) {
        let ms = duration * 1000
        stateQueue.async {
            if batchCount > 0 {
                self.totalInferences += batchCount
            }
            if cached {
                self.cacheHits += max(batchCount, 1)
            }
            if batchCount > 1 {
                self.batchRequests += 1
                self.batchItems += batchCount
            }
            self.lastInferenceMs = ms
            self.lastModelUsed = modelName
            self.lastWasCached = cached
            if batchCount > 0 {
                let perInference = ms / Double(max(1, batchCount))
                let prev = self.modelLatencyEma[modelName]
                if let prev = prev {
                    self.modelLatencyEma[modelName] = (self.latencyEmaAlpha * perInference) + ((1 - self.latencyEmaAlpha) * prev)
                } else {
                    self.modelLatencyEma[modelName] = perInference
                }
            }
        }
    }

    private func cachedOutput(forKey key: String) -> OutputCacheEntry? {
        let now = ProcessInfo.processInfo.systemUptime
        if let entry = outputCache.object(forKey: key as NSString) {
            if now - entry.timestamp <= outputCacheTTL {
                return entry
            }
            outputCache.removeObject(forKey: key as NSString)
            stateQueue.async {
                self.outputCacheCount = max(0, self.outputCacheCount - 1)
            }
        }
        return nil
    }

    private func storeCachedOutput(values: [Double], shape: [Int]?, key: String) {
        let cost = values.count * MemoryLayout<Double>.stride
        let entry = OutputCacheEntry(values: values, shape: shape, timestamp: ProcessInfo.processInfo.systemUptime)
        if outputCache.object(forKey: key as NSString) == nil {
            stateQueue.async {
                self.outputCacheCount += 1
            }
        }
        outputCache.setObject(entry, forKey: key as NSString, cost: cost)
    }

    private struct ProcessedOutput {
        let values: [Double]
        let shape: [Int]?
        let indices: [Int]?
    }

    private func postprocessOutput(
        values: [Double],
        shape: [Int]?,
        topK: Int?,
        maxOutput: Int?
    ) -> ProcessedOutput {
        if let topK = topK, topK > 0, values.count > topK {
            let result = selectTopK(values: values, k: topK)
            return ProcessedOutput(values: result.values, shape: [topK], indices: result.indices)
        }
        if let maxOutput = maxOutput, maxOutput > 0, values.count > maxOutput {
            return ProcessedOutput(values: Array(values.prefix(maxOutput)), shape: [maxOutput], indices: nil)
        }
        return ProcessedOutput(values: values, shape: shape, indices: nil)
    }

    private struct BatchResult {
        let outputs: [[Double]]
        let shapes: [[Int]]
        let indices: [[Int]]?
    }

    private func inferBatch(
        model: MLModel,
        modelName: String,
        inputKey: String,
        dataType: MLMultiArrayDataType,
        batch: [[Double]],
        outputKey: String?,
        topK: Int?,
        maxOutput: Int?,
        useBatchProvider: Bool
    ) throws -> BatchResult {
        var providers: [MLFeatureProvider] = []
        providers.reserveCapacity(batch.count)
        for values in batch {
            let array = try makeMultiArray(
                values,
                dataType: dataType,
                cacheKey: "\(modelName):batch:\(dataType.rawValue):\(values.count)",
                useCache: false
            )
            let provider = try MLDictionaryFeatureProvider(dictionary: [inputKey: array])
            providers.append(provider)
        }
        var outputs: [[Double]] = []
        var shapes: [[Int]] = []
        var indices: [[Int]] = []
        outputs.reserveCapacity(providers.count)
        shapes.reserveCapacity(providers.count)
        indices.reserveCapacity(providers.count)

        if useBatchProvider {
            let batchProvider = MLArrayBatchProvider(array: providers)
            let results = try model.predictions(from: batchProvider)
            for index in 0..<results.count {
                let output = results.features(at: index)
                let (values, shape) = try extractOutput(output, preferredKey: outputKey)
                let processed = postprocessOutput(values: values, shape: shape, topK: topK, maxOutput: maxOutput)
                outputs.append(processed.values)
                shapes.append(processed.shape ?? [processed.values.count])
                if let idx = processed.indices {
                    indices.append(idx)
                } else if !indices.isEmpty {
                    indices.append([])
                }
            }
        } else {
            for provider in providers {
                let output = try model.prediction(from: provider)
                let (values, shape) = try extractOutput(output, preferredKey: outputKey)
                let processed = postprocessOutput(values: values, shape: shape, topK: topK, maxOutput: maxOutput)
                outputs.append(processed.values)
                shapes.append(processed.shape ?? [processed.values.count])
                if let idx = processed.indices {
                    indices.append(idx)
                } else if !indices.isEmpty {
                    indices.append([])
                }
            }
        }

        return BatchResult(outputs: outputs, shapes: shapes, indices: indices.isEmpty ? nil : indices)
    }

    private func busyResponse(id: String, message: String) -> CoreMLResponse {
        CoreMLResponse(
            id: id,
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
            busy: true,
            snapshot: nil,
            message: message,
            evaluation: nil,
            pack: nil
        )
    }

    private func infoResponse(id: String, message: String) -> CoreMLResponse {
        CoreMLResponse(
            id: id,
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
            message: message,
            evaluation: nil,
            pack: nil
        )
    }

    private func errorResponse(id: String, error: String) -> CoreMLResponse {
        CoreMLResponse(
            id: id,
            output: [],
            shape: nil,
            error: error,
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
        )
    }

    private func selectTopK(values: [Double], k: Int) -> (values: [Double], indices: [Int]) {
        guard k > 0 else { return ([], []) }
        if values.count <= k {
            return (values, Array(values.indices))
        }

        var heap: [(value: Double, index: Int)] = []
        heap.reserveCapacity(k)

        func siftUp(_ index: Int) {
            var child = index
            while child > 0 {
                let parent = (child - 1) / 2
                if heap[child].value >= heap[parent].value { break }
                heap.swapAt(child, parent)
                child = parent
            }
        }

        func siftDown(_ index: Int) {
            var parent = index
            while true {
                let left = parent * 2 + 1
                let right = left + 1
                var candidate = parent
                if left < heap.count && heap[left].value < heap[candidate].value {
                    candidate = left
                }
                if right < heap.count && heap[right].value < heap[candidate].value {
                    candidate = right
                }
                if candidate == parent { break }
                heap.swapAt(parent, candidate)
                parent = candidate
            }
        }

        for (index, value) in values.enumerated() {
            if heap.count < k {
                heap.append((value: value, index: index))
                siftUp(heap.count - 1)
            } else if let min = heap.first, value > min.value {
                heap[0] = (value: value, index: index)
                siftDown(0)
            }
        }

        heap.sort { $0.value > $1.value }
        let topValues = heap.map { $0.value }
        let topIndices = heap.map { $0.index }
        return (topValues, topIndices)
    }

    private func updateConcurrencyLocked(_ maxConcurrent: Int) {
        let clamped = max(1, maxConcurrent)
        concurrencySemaphore = DispatchSemaphore(value: clamped)
        modelSemaphores.removeAll()
    }

    private static func loadModelNames() -> Set<String> {
        var names = Set<String>()
        let bundleUrls = Bundle.main.urls(forResourcesWithExtension: "mlmodelc", subdirectory: nil) ?? []
        names.formUnion(bundleUrls.map { $0.deletingPathExtension().lastPathComponent })
        let supportUrls = appSupportModelURLs()
        names.formUnion(supportUrls.map { $0.deletingPathExtension().lastPathComponent })
        return names
    }

    private static func appSupportModelURLs() -> [URL] {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return []
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
            .appendingPathComponent("Models", isDirectory: true)
        guard let urls = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else {
            return []
        }
        return urls.filter { $0.pathExtension == "mlmodelc" }
    }

    private func extractOutput(_ output: MLFeatureProvider, preferredKey: String?) throws -> ([Double], [Int]?) {
        let outputKey = preferredKey ?? output.featureNames.first
        guard let key = outputKey,
              let value = output.featureValue(for: key) else {
            throw CoreMLBridgeError.missingOutput
        }
        if let multiArray = value.multiArrayValue {
            let count = multiArray.count
            var values: [Double] = []
            values.reserveCapacity(count)
            for index in 0..<count {
                values.append(multiArray[index].doubleValue)
            }
            let shape = multiArray.shape.map { $0.intValue }
            return (values, shape)
        }
        if let number = value.doubleValue as Double? {
            return ([number], [1])
        }
        throw CoreMLBridgeError.missingOutput
    }

    func runEvaluation(filter: String?, completion: @escaping (ModelEvaluationReport) -> Void) {
        workQueue.async {
            if self.stateQueue.sync(execute: { self.isSuspended }) {
                completion(ModelEvaluationReport(summaries: [], error: "App inactive"))
                return
            }
            guard let suite = ModelEvaluationLoader.load() else {
                completion(ModelEvaluationReport(summaries: [], error: "model-eval.json not found"))
                return
            }
            let trimmed = filter?.trimmingCharacters(in: .whitespacesAndNewlines)
            let cases = suite.cases.filter { evalCase in
                guard let trimmed = trimmed, !trimmed.isEmpty else { return true }
                if evalCase.id == trimmed { return true }
                return evalCase.model == trimmed
            }
            guard !cases.isEmpty else {
                completion(ModelEvaluationReport(summaries: [], error: "No matching evaluation cases"))
                return
            }
            self.stateQueue.sync {
                self.inflightCount += 1
            }
            defer {
                self.stateQueue.async {
                    self.inflightCount = max(0, self.inflightCount - 1)
                }
            }
            var summaries: [ModelEvaluationSummary] = []
            for evalCase in cases {
                do {
                    let summary = try self.evaluateCase(evalCase)
                    summaries.append(summary)
                } catch {
                    summaries.append(ModelEvaluationSummary(
                        model: evalCase.model,
                        caseId: evalCase.id,
                        sampleCount: 0,
                        avgLatencyMs: 0,
                        metric: evalCase.metric,
                        metricValue: nil,
                        errorCount: evalCase.samples?.count ?? 0
                    ))
                }
            }
            completion(ModelEvaluationReport(summaries: summaries, error: nil))
        }
    }

    func downloadModelPack(from urlString: String, completion: @escaping (ModelPackReport) -> Void) {
        guard let url = URL(string: urlString) else {
            completion(ModelPackReport(version: nil, downloaded: [], skipped: [], failed: [], registryUpdated: false, message: "Invalid URL"))
            return
        }
        ModelPackManager.download(from: url) { report in
            if report.registryUpdated || !report.downloaded.isEmpty {
                self.reloadRegistry()
                self.clearAllCaches()
            }
            completion(report)
        }
    }

    private func evaluateCase(_ evalCase: ModelEvaluationCase) throws -> ModelEvaluationSummary {
        let config = registrySnapshot().config(for: evalCase.model)
        let (model, modelName) = try loadModel(named: evalCase.model, config: config)
        let inputKey = evalCase.inputKey ?? "input"
        let dataType = model.modelDescription
            .inputDescriptionsByName[inputKey]?
            .multiArrayConstraint?
            .dataType ?? .float32
        let outputKey = evalCase.outputKey
        let topK = evalCase.topK ?? config.topKDefault
        let maxOutput = evalCase.maxOutput ?? config.maxOutputDefault
        let samples = resolveEvaluationSamples(evalCase, model: model, inputKey: inputKey)
        let sampleLimit = min(evalCase.maxSamples ?? samples.count, samples.count)
        var totalLatencyMs: Double = 0
        var errors = 0
        var metricSum: Double = 0
        var metricCount = 0
        let metric = (evalCase.metric ?? "").lowercased()

        for index in 0..<sampleLimit {
            autoreleasepool {
                let sample = samples[index]
                let start = ProcessInfo.processInfo.systemUptime
                do {
                    let array = try makeMultiArray(
                        sample,
                        dataType: dataType,
                        cacheKey: "\(modelName):eval:\(dataType.rawValue):\(sample.count)",
                        useCache: false
                    )
                    let provider = try MLDictionaryFeatureProvider(dictionary: [inputKey: array])
                    let output = try model.prediction(from: provider)
                    let (values, shape) = try extractOutput(output, preferredKey: outputKey)
                    let processed = postprocessOutput(values: values, shape: shape, topK: topK, maxOutput: maxOutput)
                    let latencyMs = (ProcessInfo.processInfo.systemUptime - start) * 1000
                    totalLatencyMs += latencyMs
                    if let expected = evalCase.expected, index < expected.count {
                        let expectedValues = expected[index]
                        let count = min(processed.values.count, expectedValues.count)
                        if count > 0 {
                            for idx in 0..<count {
                                let diff = processed.values[idx] - expectedValues[idx]
                                if metric == "mse" {
                                    metricSum += diff * diff
                                } else {
                                    metricSum += abs(diff)
                                }
                            }
                            metricCount += count
                        }
                    }
                } catch {
                    errors += 1
                }
            }
        }

        let avgLatency = sampleLimit > 0 ? (totalLatencyMs / Double(sampleLimit)) : 0
        let metricValue = metricCount > 0 ? (metricSum / Double(metricCount)) : nil
        return ModelEvaluationSummary(
            model: modelName,
            caseId: evalCase.id,
            sampleCount: sampleLimit,
            avgLatencyMs: avgLatency,
            metric: evalCase.metric,
            metricValue: metricValue,
            errorCount: errors
        )
    }

    private func resolveEvaluationSamples(_ evalCase: ModelEvaluationCase, model: MLModel, inputKey: String) -> [[Double]] {
        let provided = evalCase.samples ?? []
        if !provided.isEmpty {
            return provided
        }
        let count = max(0, evalCase.autoSampleCount ?? 0)
        guard count > 0 else { return [] }
        let length = resolveFeatureLength(evalCase, model: model, inputKey: inputKey)
        guard length > 0 else { return [] }
        let strategy = (evalCase.fillStrategy ?? "zeros").lowercased()
        let range = evalCase.range ?? [-1.0, 1.0]
        var generator = SeededGenerator(seed: UInt64(evalCase.seed ?? 1337))
        var samples: [[Double]] = []
        samples.reserveCapacity(count)
        for _ in 0..<count {
            samples.append(generateSample(length: length, strategy: strategy, range: range, generator: &generator))
        }
        return samples
    }

    private func resolveFeatureLength(_ evalCase: ModelEvaluationCase, model: MLModel, inputKey: String) -> Int {
        if let length = evalCase.featureLength, length > 0 {
            return length
        }
        if let constraint = model.modelDescription.inputDescriptionsByName[inputKey]?.multiArrayConstraint {
            let shape = constraint.shape.map { $0.intValue }
            if !shape.isEmpty, shape.allSatisfy({ $0 > 0 }) {
                return shape.reduce(1, *)
            }
        }
        return 0
    }

    private func generateSample(
        length: Int,
        strategy: String,
        range: [Double],
        generator: inout SeededGenerator
    ) -> [Double] {
        let minVal = range.first ?? -1.0
        let maxVal = range.count > 1 ? range[1] : 1.0
        switch strategy {
        case "random", "randomuniform":
            return (0..<length).map { _ in
                minVal + (maxVal - minVal) * generator.nextUnit()
            }
        case "sine":
            let twoPi = Double.pi * 2
            return (0..<length).map { idx in
                sin(twoPi * Double(idx) / Double(max(1, length)))
            }
        default:
            return Array(repeating: 0, count: length)
        }
    }

    private struct SeededGenerator {
        private var state: UInt64

        init(seed: UInt64) {
            self.state = seed == 0 ? 0xdeadbeef : seed
        }

        mutating func nextUnit() -> Double {
            state = 2862933555777941757 &* state &+ 3037000493
            let value = Double(state >> 33) / Double(UInt64.max >> 33)
            return min(1.0, max(0.0, value))
        }
    }
}

final class OutputCacheEntry: NSObject {
    let values: [Double]
    let shape: [Int]?
    let timestamp: TimeInterval

    init(values: [Double], shape: [Int]?, timestamp: TimeInterval) {
        self.values = values
        self.shape = shape
        self.timestamp = timestamp
    }
}

final class RateLimiter {
    private let lock = DispatchSemaphore(value: 1)
    private var interval: TimeInterval
    private var nextAllowed: TimeInterval = 0

    init(maxPerSecond: Double) {
        let clamped = max(0.1, maxPerSecond)
        interval = 1.0 / clamped
    }

    func update(maxPerSecond: Double) {
        let clamped = max(0.1, maxPerSecond)
        lock.wait()
        interval = 1.0 / clamped
        lock.signal()
    }

    func acquire() {
        while true {
            lock.wait()
            let now = ProcessInfo.processInfo.systemUptime
            if now >= nextAllowed {
                nextAllowed = now + interval
                lock.signal()
                return
            }
            let sleepTime = nextAllowed - now
            lock.signal()
            if sleepTime > 0 {
                Thread.sleep(forTimeInterval: sleepTime)
            }
        }
    }
}
