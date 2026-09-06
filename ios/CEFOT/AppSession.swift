import Foundation
import WebKit

struct LoginResult: Decodable {
    let dni: String
    let nombre: String
    let role: String?
    let tenantId: String?
    let superAdmin: Bool?
    let capitanCompania: Int?
}

enum SessionError: LocalizedError {
    case badURL
    case server(String)
    case http(Int)
    case decode

    var errorDescription: String? {
        switch self {
        case .badURL: return "La URL del servidor no es válida."
        case .server(let s): return s
        case .http(let c): return "Error del servidor (\(c))."
        case .decode: return "Respuesta inesperada del servidor."
        }
    }
}

@MainActor
final class AppSession: ObservableObject {
    @Published var isLoggedIn = false
    @Published var startPath = AppConfig.startPath
    @Published var displayName = ""

    func destinationPath(from result: LoginResult) -> String {
        if result.superAdmin == true { return "/superadmin.html" }
        if result.capitanCompania != nil && result.tenantId == nil { return "/capitan.html" }
        if result.role == "admin" { return "/admin.html" }
        return "/instructor.html"
    }

    func login(dni: String, password: String) async throws {
        guard let url = URL(string: AppConfig.serverURL.absoluteString + "/api/auth/login") else {
            throw SessionError.badURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "dni": dni.trimmingCharacters(in: .whitespacesAndNewlines),
            "password": password
        ])

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw SessionError.http(-1) }

        if let fields = http.allHeaderFields as? [String: String], let respURL = http.url {
            let cookies = HTTPCookie.cookies(withResponseHeaderFields: fields, for: respURL)
            for cookie in cookies {
                HTTPCookieStorage.shared.setCookie(cookie)
                await setWebCookie(cookie)
            }
        }

        if http.statusCode >= 400 {
            if let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let err = obj["error"] as? String {
                throw SessionError.server(err)
            }
            throw SessionError.http(http.statusCode)
        }

        let result = try JSONDecoder().decode(LoginResult.self, from: data)
        displayName = result.nombre
        startPath = destinationPath(from: result)
        isLoggedIn = true
    }

    func logout() async {
        if let url = URL(string: AppConfig.serverURL.absoluteString + "/api/auth/logout") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            _ = try? await URLSession.shared.data(for: req)
        }
        let store = WKWebsiteDataStore.default()
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        let records = await store.dataRecords(ofTypes: types)
        await store.removeData(ofTypes: types, for: records)
        HTTPCookieStorage.shared.cookies?.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
        isLoggedIn = false
        startPath = AppConfig.startPath
        displayName = ""
    }

    private func setWebCookie(_ cookie: HTTPCookie) async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            WKWebsiteDataStore.default().httpCookieStore.setCookie(cookie) {
                cont.resume()
            }
        }
    }
}
