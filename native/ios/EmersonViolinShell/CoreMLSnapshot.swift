import Foundation

struct ModelSummary: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    let preferredUnits: String?
    let maxIps: Double?
    let maxConcurrency: Int?
    let topKDefault: Int?
    let maxOutputDefault: Int?
    let targetLatencyMs: Double?
    let latencyEmaMs: Double?
    let allowCache: Bool?
    let batchEnabled: Bool?
    let fallbackModel: String?
    let variants: [String]?
}

struct CoreMLSnapshot: Codable, Equatable {
    let deviceTier: DeviceTier
    let computeUnits: String
    let maxIps: Double
    let maxConcurrency: Int
    let constrained: Bool
    let thermalState: Int
    let lowPowerMode: Bool
    let batteryLevel: Float
    let batteryState: Int
    let totalInferences: Int
    let cacheHits: Int
    let cacheHitRate: Double
    let batchRequests: Int
    let batchItems: Int
    let lastInferenceMs: Double?
    let lastModelUsed: String?
    let lastWasCached: Bool
    let outputCacheCount: Int
    let outputCacheTTL: TimeInterval
    let availableModels: [String]
    let loadedModels: [String]
    let warmedModels: [String]
    let registryPreload: [String]
    let registrySource: String?
    let modelSummaries: [ModelSummary]
    let inflightCount: Int
}
