import Foundation
import CoreML

struct ModelPackManifest: Decodable {
    let version: String?
    let registryUrl: String?
    let models: [ModelPackEntry]
}

struct ModelPackEntry: Decodable {
    let name: String
    let url: String
    let sha256: String?
    let compile: Bool?
    let skipIfExists: Bool?
}

struct ModelPackReport: Codable, Equatable {
    let version: String?
    let downloaded: [String]
    let skipped: [String]
    let failed: [String]
    let registryUpdated: Bool
    let message: String?
}

enum ModelPackError: Error {
    case invalidManifest
    case downloadFailed
    case compileFailed
}

final class ModelPackManager {
    static func download(from manifestURL: URL, completion: @escaping (ModelPackReport) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = fetchData(from: manifestURL) else {
                completion(ModelPackReport(version: nil, downloaded: [], skipped: [], failed: [], registryUpdated: false, message: "Manifest download failed"))
                return
            }
            guard let manifest = try? JSONDecoder().decode(ModelPackManifest.self, from: data) else {
                completion(ModelPackReport(version: nil, downloaded: [], skipped: [], failed: [], registryUpdated: false, message: "Invalid manifest"))
                return
            }

            var downloaded: [String] = []
            var skipped: [String] = []
            var failed: [String] = []
            var registryUpdated = false

            if let registryUrl = manifest.registryUrl, let url = URL(string: registryUrl) {
                if let registryData = fetchData(from: url) {
                    if writeRegistry(data: registryData) {
                        registryUpdated = true
                    }
                }
            }

            for entry in manifest.models {
                if entry.skipIfExists == true, modelExists(name: entry.name) {
                    skipped.append(entry.name)
                    continue
                }
                guard let modelURL = URL(string: entry.url) else {
                    failed.append(entry.name)
                    continue
                }
                guard let temp = downloadFile(from: modelURL) else {
                    failed.append(entry.name)
                    continue
                }
                if let expected = entry.sha256, !expected.isEmpty {
                    if !ModelIntegrityVerifier.verify(url: temp, expectedSHA256: expected) {
                        failed.append(entry.name)
                        try? FileManager.default.removeItem(at: temp)
                        continue
                    }
                }
                let compiledURL: URL
                if entry.compile == false {
                    compiledURL = temp
                } else {
                    do {
                        compiledURL = try MLModel.compileModel(at: temp)
                    } catch {
                        failed.append(entry.name)
                        try? FileManager.default.removeItem(at: temp)
                        continue
                    }
                }

                do {
                    try installCompiledModel(named: entry.name, from: compiledURL)
                    downloaded.append(entry.name)
                } catch {
                    failed.append(entry.name)
                }

                if compiledURL != temp {
                    try? FileManager.default.removeItem(at: compiledURL)
                }
                try? FileManager.default.removeItem(at: temp)
            }

            completion(ModelPackReport(
                version: manifest.version,
                downloaded: downloaded,
                skipped: skipped,
                failed: failed,
                registryUpdated: registryUpdated,
                message: nil
            ))
        }
    }

    private static func fetchData(from url: URL) -> Data? {
        let semaphore = DispatchSemaphore(value: 0)
        var result: Data?
        let task = URLSession.shared.dataTask(with: url) { data, _, _ in
            result = data
            semaphore.signal()
        }
        task.resume()
        semaphore.wait()
        return result
    }

    private static func downloadFile(from url: URL) -> URL? {
        let semaphore = DispatchSemaphore(value: 0)
        var result: URL?
        let task = URLSession.shared.downloadTask(with: url) { tempUrl, _, _ in
            result = tempUrl
            semaphore.signal()
        }
        task.resume()
        semaphore.wait()
        return result
    }

    private static func modelExists(name: String) -> Bool {
        guard let modelsDir = modelsDirectory() else { return false }
        let url = modelsDir.appendingPathComponent("\(name).mlmodelc")
        return FileManager.default.fileExists(atPath: url.path)
    }

    private static func modelsDirectory() -> URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
            .appendingPathComponent("Models", isDirectory: true)
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        return directory
    }

    private static func installCompiledModel(named name: String, from compiledURL: URL) throws {
        guard let modelsDir = modelsDirectory() else {
            throw ModelPackError.compileFailed
        }
        let destination = modelsDir.appendingPathComponent("\(name).mlmodelc")
        if FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.removeItem(at: destination)
        }
        try FileManager.default.copyItem(at: compiledURL, to: destination)
    }

    private static func writeRegistry(data: Data) -> Bool {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return false
        }
        let directory = base.appendingPathComponent("EmersonViolinShell", isDirectory: true)
        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        let url = directory.appendingPathComponent("model-registry.json")
        do {
            try data.write(to: url, options: .atomic)
            return true
        } catch {
            return false
        }
    }
}
