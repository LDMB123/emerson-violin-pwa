import SwiftUI

final class CoreMLTelemetryViewModel: ObservableObject {
    @Published var snapshot: CoreMLSnapshot
    @Published var evaluation: ModelEvaluationReport?
    private let bridge: CoreMLBridge
    private var timer: Timer?

    init(bridge: CoreMLBridge) {
        self.bridge = bridge
        self.snapshot = bridge.snapshot()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.snapshot = self.bridge.snapshot()
        }
    }

    deinit {
        timer?.invalidate()
    }

    func clearCache() {
        bridge.clearAllCaches()
        snapshot = bridge.snapshot()
    }

    func preloadDefaults() {
        bridge.preloadDefaults()
    }

    func runEvaluation() {
        bridge.runEvaluation(filter: nil) { [weak self] report in
            DispatchQueue.main.async {
                self?.evaluation = report
            }
        }
    }
}

struct TelemetryOverlayView: View {
    @StateObject private var viewModel: CoreMLTelemetryViewModel
    @State private var showModels = false
    @State private var showLoaded = false
    @State private var showWarmed = false
    @State private var showRegistry = false
    @State private var pwaStatus = PWAInstaller.status()

    init(bridge: CoreMLBridge) {
        _viewModel = StateObject(wrappedValue: CoreMLTelemetryViewModel(bridge: bridge))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            header
            pwaInfo
            metrics
            actions
            modelSection
            registrySection
            evaluationSection
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .shadow(radius: 8)
        .frame(maxWidth: 320)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("CoreML Telemetry")
                .font(.headline)
            Text("Tier: \(viewModel.snapshot.deviceTier.rawValue)  |  Units: \(viewModel.snapshot.computeUnits)")
                .font(.caption)
            Text("IPS: \(format(viewModel.snapshot.maxIps))  |  Concurrency: \(viewModel.snapshot.maxConcurrency)")
                .font(.caption)
            if let source = viewModel.snapshot.registrySource {
                Text("Registry: \(source)")
                    .font(.caption2)
            }
        }
    }

    private var metrics: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Inferences: \(viewModel.snapshot.totalInferences)  |  Cache hit: \(percent(viewModel.snapshot.cacheHitRate))")
            Text("Batches: \(viewModel.snapshot.batchRequests)  |  Batch items: \(viewModel.snapshot.batchItems)")
            Text("Last: \(format(viewModel.snapshot.lastInferenceMs))ms  |  Model: \(viewModel.snapshot.lastModelUsed ?? "-")")
            Text("Cache entries: \(viewModel.snapshot.outputCacheCount)  |  TTL: \(Int(viewModel.snapshot.outputCacheTTL))s")
            Text("Inflight: \(viewModel.snapshot.inflightCount)")
            Text("Power: thermal \(viewModel.snapshot.thermalState) | low power \(viewModel.snapshot.lowPowerMode ? "on" : "off")")
            Text("Battery: \(Int(viewModel.snapshot.batteryLevel * 100))% | state \(viewModel.snapshot.batteryState)")
        }
        .font(.caption)
    }

    private var pwaInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            let scheme = pwaStatus.useAppScheme ? "app://" : "file://"
            Text("PWA: \(scheme)")
            if let bundleVersion = pwaStatus.bundleVersion {
                Text("Bundle: \(bundleVersion)")
            }
            if let installed = pwaStatus.installedVersion {
                Text("Installed: \(installed)")
            }
            if let root = pwaStatus.rootPath {
                Text("Root: \(root)")
            }
            if let ok = pwaStatus.integrityOk {
                let label = ok ? "OK" : "FAIL"
                let failures = pwaStatus.integrityFailures ?? 0
                Text("Integrity: \(label) (\(failures))")
                    .foregroundColor(ok ? .secondary : .red)
            }
            if let version = pwaStatus.integrityVersion {
                Text("Integrity version: \(version)")
            }
            if let checked = pwaStatus.integrityCheckedAt {
                Text("Integrity checked: \(checked.formatted(date: .numeric, time: .shortened))")
            }
        }
        .font(.caption2)
        .foregroundColor(.secondary)
        .onReceive(Timer.publish(every: 2, on: .main, in: .common).autoconnect()) { _ in
            pwaStatus = PWAInstaller.status()
        }
    }

    private var actions: some View {
        HStack {
            Button("Preload") { viewModel.preloadDefaults() }
            Button("Clear Cache") { viewModel.clearCache() }
            Button("Run Eval") { viewModel.runEvaluation() }
        }
        .font(.caption)
    }

    private var modelSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Toggle("Show available models (\(viewModel.snapshot.availableModels.count))", isOn: $showModels)
                .font(.caption)
            if showModels {
                ForEach(viewModel.snapshot.availableModels, id: \.self) { model in
                    Text(model).font(.caption2)
                }
            }
            Toggle("Loaded models (\(viewModel.snapshot.loadedModels.count))", isOn: $showLoaded)
                .font(.caption)
            if showLoaded {
                ForEach(viewModel.snapshot.loadedModels, id: \.self) { model in
                    Text(model).font(.caption2)
                }
            }
            Toggle("Warmed models (\(viewModel.snapshot.warmedModels.count))", isOn: $showWarmed)
                .font(.caption)
            if showWarmed {
                ForEach(viewModel.snapshot.warmedModels, id: \.self) { model in
                    Text(model).font(.caption2)
                }
            }
        }
    }

    private var registrySection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Toggle("Registry overrides (\(viewModel.snapshot.modelSummaries.count))", isOn: $showRegistry)
                .font(.caption)
            if showRegistry {
                ForEach(viewModel.snapshot.modelSummaries) { model in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(model.name).font(.caption2).bold()
                        Text(detailLine(model))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }

    private var evaluationSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let report = viewModel.evaluation {
                if let error = report.error {
                    Text("Eval error: \(error)")
                        .font(.caption2)
                        .foregroundColor(.red)
                }
                ForEach(report.summaries, id: \.self) { summary in
                    Text(evalLine(summary))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private func detailLine(_ model: ModelSummary) -> String {
        var parts: [String] = []
        if let units = model.preferredUnits { parts.append("units: \(units)") }
        if let ips = model.maxIps { parts.append("ips: \(format(ips))") }
        if let c = model.maxConcurrency { parts.append("concurrency: \(c)") }
        if let k = model.topKDefault { parts.append("topK: \(k)") }
        if let m = model.maxOutputDefault { parts.append("maxOut: \(m)") }
        if let target = model.targetLatencyMs {
            let ema = model.latencyEmaMs.map { format($0) } ?? "-"
            parts.append("latency: \(ema)/\(format(target))ms")
        }
        if let cache = model.allowCache { parts.append("cache: \(cache ? "on" : "off")") }
        if let batch = model.batchEnabled { parts.append("batch: \(batch ? "on" : "off")") }
        if let fallback = model.fallbackModel { parts.append("fallback: \(fallback)") }
        if let variants = model.variants, !variants.isEmpty { parts.append("variants: \(variants.count)") }
        return parts.joined(separator: " | ")
    }

    private func format(_ value: Double?) -> String {
        guard let value = value else { return "-" }
        return String(format: "%.1f", value)
    }

    private func percent(_ value: Double) -> String {
        return String(format: "%.0f%%", value * 100)
    }

    private func evalLine(_ summary: ModelEvaluationSummary) -> String {
        var parts: [String] = []
        let id = summary.caseId ?? summary.model
        parts.append(id)
        parts.append("n=\(summary.sampleCount)")
        parts.append("lat=\(format(summary.avgLatencyMs))ms")
        if let metric = summary.metric, let value = summary.metricValue {
            parts.append("\(metric)=\(format(value))")
        }
        if summary.errorCount > 0 {
            parts.append("errors=\(summary.errorCount)")
        }
        return parts.joined(separator: " | ")
    }
}
