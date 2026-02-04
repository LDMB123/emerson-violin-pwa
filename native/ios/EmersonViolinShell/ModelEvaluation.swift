import Foundation

struct ModelEvaluationSuite: Decodable {
    let cases: [ModelEvaluationCase]
}

struct ModelEvaluationCase: Decodable {
    let id: String?
    let model: String
    let inputKey: String?
    let outputKey: String?
    let samples: [[Double]]?
    let expected: [[Double]]?
    let metric: String?
    let maxSamples: Int?
    let topK: Int?
    let maxOutput: Int?
    let autoSampleCount: Int?
    let featureLength: Int?
    let fillStrategy: String?
    let range: [Double]?
    let seed: Int?
}

struct ModelEvaluationSummary: Codable, Equatable, Hashable {
    let model: String
    let caseId: String?
    let sampleCount: Int
    let avgLatencyMs: Double
    let metric: String?
    let metricValue: Double?
    let errorCount: Int
}

struct ModelEvaluationReport: Codable, Equatable {
    let summaries: [ModelEvaluationSummary]
    let error: String?
}

enum ModelEvaluationLoader {
    static func load() -> ModelEvaluationSuite? {
        if let url = appSupportURL(),
           let data = try? Data(contentsOf: url),
           let suite = try? JSONDecoder().decode(ModelEvaluationSuite.self, from: data) {
            return suite
        }
        if let url = Bundle.main.url(forResource: "model-eval", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let suite = try? JSONDecoder().decode(ModelEvaluationSuite.self, from: data) {
            return suite
        }
        return nil
    }

    private static func appSupportURL() -> URL? {
        let manager = FileManager.default
        guard let base = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
        let url = directory.appendingPathComponent("model-eval.json")
        return manager.fileExists(atPath: url.path) ? url : nil
    }
}
