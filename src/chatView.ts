import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'ollama.chatView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    public getWebview() {
        return this._view?.webview;
    }

    public addMessage(type: string, text: string) {
        this._view?.webview.postMessage({ command: 'addMessage', type, text });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesUri}" rel="stylesheet">
                <title>Ollama Chat</title>
            </head>
            <body>
                <div id="chat-container"></div>
                <input id="prompt-input" type="text" placeholder="Ask Ollama..."/>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
