import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    @ObservedObject var session: WebSession
    var reloadToken: UUID

    func makeCoordinator() -> Coordinator {
        Coordinator(session: session)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let user = WKUserContentController()
        user.add(context.coordinator, name: "cefot")
        user.addUserScript(WKUserScript(source: Self.bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        config.userContentController = user

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.backgroundColor = UIColor(red: 0.96, green: 0.95, blue: 0.90, alpha: 1)
        webView.isOpaque = false
        context.coordinator.webView = webView
        context.coordinator.loadStart()
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.session = session
        if context.coordinator.lastToken != reloadToken {
            context.coordinator.lastToken = reloadToken
            context.coordinator.loadStart()
        }
    }

    static var bridgeScript: String {
        #"""
        (function () {
          if (window.__cefotBridge) return;
          window.__cefotBridge = true;

          document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!a || !a.download || !a.href) return;
            if (a.href.indexOf('blob:') !== 0 && a.href.indexOf('data:') !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            var filename = a.download || 'documento.pdf';
            fetch(a.href).then(function (r) { return r.blob(); }).then(function (b) {
              var reader = new FileReader();
              reader.onload = function () {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cefot) {
                  window.webkit.messageHandlers.cefot.postMessage({
                    type: 'download',
                    filename: filename,
                    dataUrl: reader.result
                  });
                }
              };
              reader.readAsDataURL(b);
            }).catch(function () {});
          }, true);
        })();
        """#
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
        var session: WebSession
        weak var webView: WKWebView?
        var lastToken = UUID()
        private var downloadFileName = "documento.pdf"
        private var lastDownloadDest: URL?

        init(session: WebSession) {
            self.session = session
        }

        func loadStart() {
            session.isLoading = true
            session.lastError = nil
            session.statusText = "Conectando con el servidor…"
            let request = URLRequest(url: AppConfig.startURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 45)
            webView?.load(request)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            session.isLoading = true
            session.statusText = "Cargando…"
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            session.isLoading = false
            session.lastError = nil
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            fail(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
            fail(error)
        }

        private func fail(_ error: Error) {
            session.isLoading = false
            let ns = error as NSError
            if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorTimedOut {
                session.lastError = "El servidor no responde. Si está en Render (plan gratuito) puede tardar un minuto en despertar. Pulsa Reintentar."
            } else if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCannotConnectToHost {
                session.lastError = "No hay conexión con \(AppConfig.serverURL.host ?? "el servidor"). Revisa la URL en Ajustes."
            } else {
                session.lastError = error.localizedDescription
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            if url.scheme == "tel" || url.scheme == "mailto" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
                decisionHandler(.cancel)
                return
            }
            if AppConfig.isAllowed(url) || url.scheme == "about" || url.scheme == "blob" {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            let mime = navigationResponse.response.mimeType ?? ""
            let name = suggestedName(from: navigationResponse.response)
            if mime == "application/pdf" || name.lowercased().hasSuffix(".pdf") || mime.hasPrefix("application/octet-stream") {
                downloadFileName = name
                if #available(iOS 14.5, *) {
                    decisionHandler(.download)
                    return
                }
            }
            decisionHandler(.allow)
        }

        @available(iOS 14.5, *)
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            download.delegate = self
        }

        @available(iOS 14.5, *)
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        @available(iOS 14.5, *)
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let name = suggestedFilename.isEmpty ? downloadFileName : suggestedFilename
            let dest = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            try? FileManager.default.removeItem(at: dest)
            lastDownloadDest = dest
            completionHandler(dest)
        }

        @available(iOS 14.5, *)
        func downloadDidFinish(_ download: WKDownload) {
            guard let dest = lastDownloadDest else { return }
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .cefotShareFile, object: dest)
            }
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            presentAlert(title: "CEFOT", message: message, completion: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let root = rootController() else { completionHandler(false); return }
            let alert = UIAlertController(title: "CEFOT", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in completionHandler(true) })
            root.present(alert, animated: true)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "cefot",
                  let body = message.body as? [String: Any],
                  let type = body["type"] as? String,
                  type == "download",
                  let dataUrl = body["dataUrl"] as? String
            else { return }
            let filename = (body["filename"] as? String)?.replacingOccurrences(of: "/", with: "-") ?? "documento.pdf"
            guard let file = decodeDataURL(dataUrl, filename: filename) else { return }
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: .cefotShareFile, object: file)
            }
        }

        private func decodeDataURL(_ dataUrl: String, filename: String) -> URL? {
            guard let comma = dataUrl.firstIndex(of: ",") else { return nil }
            let encoded = String(dataUrl[dataUrl.index(after: comma)...])
            guard let data = Data(base64Encoded: encoded, options: .ignoreUnknownCharacters) else { return nil }
            let dest = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            do {
                try data.write(to: dest, options: .atomic)
                return dest
            } catch {
                return nil
            }
        }

        private func suggestedName(from response: URLResponse) -> String {
            if let http = response as? HTTPURLResponse,
               let disp = http.value(forHTTPHeaderField: "Content-Disposition"),
               let range = disp.range(of: "filename=", options: .caseInsensitive) {
                var name = String(disp[range.upperBound...]).trimmingCharacters(in: CharacterSet(charactersIn: "\"'; "))
                if let star = disp.range(of: "filename*=", options: .caseInsensitive) {
                    name = String(disp[star.upperBound...]).trimmingCharacters(in: CharacterSet(charactersIn: "\"'; "))
                    if let utf = name.split(separator: "'").last { name = String(utf) }
                }
                if !name.isEmpty { return name }
            }
            return response.suggestedFilename ?? "documento.pdf"
        }

        private func presentAlert(title: String, message: String, completion: @escaping () -> Void) {
            guard let root = rootController() else { completion(); return }
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Aceptar", style: .default) { _ in completion() })
            root.present(alert, animated: true)
        }

        private func rootController() -> UIViewController? {
            UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?
                .rootViewController
        }
    }
}
