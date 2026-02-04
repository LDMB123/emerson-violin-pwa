import Foundation
import CoreML
import UIKit

struct ModelRegistry: Decodable {
    let defaults: ModelConfig
    let models: [String: ModelConfig]
    let preload: [String]?
    let source: String?

    func config(for name: String) -> ModelConfig {
        let overrides = models[name]
        return ModelConfig.merge(defaults, overrides)
    }
}

struct ModelConfig: Decodable {
    let preferredComputeUnits: String?
    let maxInferencesPerSecond: Double?
    let maxConcurrency: Int?
    let topKDefault: Int?
    let maxOutputDefault: Int?
    let targetLatencyMs: Double?
    let allowCache: Bool?
    let batchEnabled: Bool?
    let fallbackModel: String?
    let variants: [String]?
    let variantStrategy: String?
    let integrityHash: String?
    let requireIntegrity: Bool?

    static func merge(_ base: ModelConfig, _ override: ModelConfig?) -> ModelConfig {
        ModelConfig(
            preferredComputeUnits: override?.preferredComputeUnits ?? base.preferredComputeUnits,
            maxInferencesPerSecond: override?.maxInferencesPerSecond ?? base.maxInferencesPerSecond,
            maxConcurrency: override?.maxConcurrency ?? base.maxConcurrency,
            topKDefault: override?.topKDefault ?? base.topKDefault,
            maxOutputDefault: override?.maxOutputDefault ?? base.maxOutputDefault,
            targetLatencyMs: override?.targetLatencyMs ?? base.targetLatencyMs,
            allowCache: override?.allowCache ?? base.allowCache,
            batchEnabled: override?.batchEnabled ?? base.batchEnabled,
            fallbackModel: override?.fallbackModel ?? base.fallbackModel,
            variants: override?.variants ?? base.variants,
            variantStrategy: override?.variantStrategy ?? base.variantStrategy,
            integrityHash: override?.integrityHash ?? base.integrityHash,
            requireIntegrity: override?.requireIntegrity ?? base.requireIntegrity
        )
    }
}

enum ModelVariantStrategy: String {
    case deviceHash = "deviceHash"
    case random = "random"
}

final class ModelRegistryProvider {
    static func load() -> ModelRegistry {
        if let appSupport = appSupportURL(),
           let data = try? Data(contentsOf: appSupport),
           let registry = try? JSONDecoder().decode(ModelRegistry.self, from: data) {
            return ModelRegistry(defaults: registry.defaults, models: registry.models, preload: registry.preload, source: "appSupport")
        }
        if let url = Bundle.main.url(forResource: "model-registry", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let registry = try? JSONDecoder().decode(ModelRegistry.self, from: data) {
            return ModelRegistry(defaults: registry.defaults, models: registry.models, preload: registry.preload, source: "bundle")
        }

        let defaults = ModelConfig(
            preferredComputeUnits: "cpuAndNeuralEngine",
            maxInferencesPerSecond: 12,
            maxConcurrency: 2,
            topKDefault: nil,
            maxOutputDefault: nil,
            targetLatencyMs: nil,
            allowCache: true,
            batchEnabled: true,
            fallbackModel: nil,
            variants: nil,
            variantStrategy: nil,
            integrityHash: nil,
            requireIntegrity: nil
        )
        return ModelRegistry(defaults: defaults, models: [:], preload: nil, source: "default")
    }

    private static func appSupportURL() -> URL? {
        let manager = FileManager.default
        guard let base = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
        let url = directory.appendingPathComponent("model-registry.json")
        return manager.fileExists(atPath: url.path) ? url : nil
    }
}

extension MLComputeUnits {
    static func from(_ raw: String?) -> MLComputeUnits? {
        guard let raw = raw?.lowercased() else { return nil }
        switch raw {
        case "cpuonly": return .cpuOnly
        case "cpuandgpu": return .cpuAndGPU
        case "cpuandneuralengine": return .cpuAndNeuralEngine
        case "all": return .all
        default: return nil
        }
    }

    var label: String {
        switch self {
        case .cpuOnly: return "cpuOnly"
        case .cpuAndGPU: return "cpuAndGPU"
        case .cpuAndNeuralEngine: return "cpuAndNeuralEngine"
        case .all: return "all"
        @unknown default: return "unknown"
        }
    }
}

extension ModelConfig {
    func resolvedVariant(baseName: String) -> String? {
        guard let variants = variants, !variants.isEmpty else { return nil }
        let strategy = ModelVariantStrategy(rawValue: variantStrategy ?? "") ?? .deviceHash
        switch strategy {
        case .deviceHash:
            let identifier = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
            let hash = abs(identifier.hashValue)
            return variants[hash % variants.count]
        case .random:
            return variants.randomElement()
        }
    }
}
