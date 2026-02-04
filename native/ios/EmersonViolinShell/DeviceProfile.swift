import Foundation
import UIKit
import CoreML
import Darwin

enum DeviceTier: String, Codable {
    case low
    case mid
    case high
}

struct PowerBudget {
    let maxIps: Double
    let maxConcurrency: Int
    let computeUnits: MLComputeUnits
    let constrained: Bool
}

struct PerformanceProfile: Equatable {
    let tier: DeviceTier
    let maxFps: Int
    let animationScale: Double
    let renderQuality: String
    let mlMaxIps: Double
    let mlMaxConcurrency: Int
    let mlComputeUnits: String
    let constrained: Bool
    let thermalState: Int
    let lowPowerMode: Bool
    let batteryLevel: Float
    let batteryState: Int

    func payload() -> [String: Any] {
        return [
            "tier": tier.rawValue,
            "maxFps": maxFps,
            "animationScale": animationScale,
            "renderQuality": renderQuality,
            "mlMaxIps": mlMaxIps,
            "mlMaxConcurrency": mlMaxConcurrency,
            "mlComputeUnits": mlComputeUnits,
            "constrained": constrained,
            "thermalState": thermalState,
            "lowPowerMode": lowPowerMode,
            "batteryLevel": batteryLevel,
            "batteryState": batteryState
        ]
    }
}

struct DeviceProfile {
    let tier: DeviceTier
    let baseMaxIps: Double
    let baseMaxConcurrency: Int

    static func current() -> DeviceProfile {
        let defaults = UserDefaults.standard
        if let tierOverride = defaults.string(forKey: "MLDeviceTierOverride"),
           let tier = DeviceTier(rawValue: tierOverride) {
            let ips = defaults.double(forKey: "MLBaseIpsOverride")
            let conc = defaults.integer(forKey: "MLBaseConcurrencyOverride")
            let resolvedIps = ips > 0 ? ips : 12
            let resolvedConc = conc > 0 ? conc : 2
            return DeviceProfile(tier: tier, baseMaxIps: resolvedIps, baseMaxConcurrency: resolvedConc)
        }

        let memory = ProcessInfo.processInfo.physicalMemory
        let isPad = UIDevice.current.userInterfaceIdiom == .pad
        let hardware = hardwareIdentifier()

        if hardware == "iPad14,1" || hardware == "iPad14,2" {
            // iPad mini 6 specific tuning (A15, 4GB RAM)
            return DeviceProfile(tier: .low, baseMaxIps: 14, baseMaxConcurrency: 2)
        }

        let tier: DeviceTier
        if memory <= 4_000_000_000 {
            tier = .low
        } else if memory <= 6_000_000_000 {
            tier = .mid
        } else {
            tier = .high
        }

        let baseIps: Double
        let baseConcurrency: Int
        switch tier {
        case .low:
            baseIps = isPad ? 12 : 10
            baseConcurrency = 2
        case .mid:
            baseIps = isPad ? 18 : 16
            baseConcurrency = 2
        case .high:
            baseIps = isPad ? 24 : 20
            baseConcurrency = 3
        }

        return DeviceProfile(tier: tier, baseMaxIps: baseIps, baseMaxConcurrency: baseConcurrency)
    }

    func budget(for state: SystemPowerState) -> PowerBudget {
        let constrained = state.lowPowerMode || state.thermalState == .serious || state.thermalState == .critical
        let batteryLevel = state.batteryLevel
        let batteryState = state.batteryState
        let lowBattery = batteryLevel >= 0 && batteryLevel < 0.2 && batteryState != .charging && batteryState != .full
        if state.lowPowerMode || state.thermalState == .critical {
            return PowerBudget(
                maxIps: max(1, baseMaxIps * 0.2),
                maxConcurrency: 1,
                computeUnits: .cpuOnly,
                constrained: true
            )
        }
        if lowBattery {
            return PowerBudget(
                maxIps: max(2, baseMaxIps * 0.4),
                maxConcurrency: 1,
                computeUnits: .cpuAndNeuralEngine,
                constrained: false
            )
        }
        if state.thermalState == .serious {
            return PowerBudget(
                maxIps: max(2, baseMaxIps * 0.35),
                maxConcurrency: 1,
                computeUnits: .cpuOnly,
                constrained: true
            )
        }
        if state.thermalState == .fair {
            return PowerBudget(
                maxIps: max(4, baseMaxIps * 0.75),
                maxConcurrency: max(1, baseMaxConcurrency - 1),
                computeUnits: .cpuAndNeuralEngine,
                constrained: false
            )
        }
        return PowerBudget(
            maxIps: baseMaxIps,
            maxConcurrency: baseMaxConcurrency,
            computeUnits: .cpuAndNeuralEngine,
            constrained: false
        )
    }

    func performanceProfile(for state: SystemPowerState) -> PerformanceProfile {
        let budget = budget(for: state)
        let baseQuality: String
        switch tier {
        case .low:
            baseQuality = "low"
        case .mid:
            baseQuality = "medium"
        case .high:
            baseQuality = "high"
        }

        let maxFps: Int
        let animationScale: Double
        let renderQuality: String

        if state.lowPowerMode || state.thermalState == .critical || state.thermalState == .serious {
            maxFps = 30
            animationScale = 0.6
            renderQuality = "low"
        } else if state.thermalState == .fair {
            maxFps = 45
            animationScale = 0.8
            renderQuality = baseQuality == "high" ? "medium" : "low"
        } else {
            maxFps = 60
            animationScale = 1.0
            renderQuality = baseQuality == "low" ? "medium" : baseQuality
        }

        return PerformanceProfile(
            tier: tier,
            maxFps: maxFps,
            animationScale: animationScale,
            renderQuality: renderQuality,
            mlMaxIps: budget.maxIps,
            mlMaxConcurrency: budget.maxConcurrency,
            mlComputeUnits: budget.computeUnits.label,
            constrained: budget.constrained,
            thermalState: state.thermalState.rawValue,
            lowPowerMode: state.lowPowerMode,
            batteryLevel: state.batteryLevel,
            batteryState: state.batteryState.rawValue
        )
    }

    private static func hardwareIdentifier() -> String {
        var size: size_t = 0
        sysctlbyname("hw.machine", nil, &size, nil, 0)
        var machine = [CChar](repeating: 0, count: Int(size))
        sysctlbyname("hw.machine", &machine, &size, nil, 0)
        return String(cString: machine)
    }
}
