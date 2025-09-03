"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ollama_1 = require("./ollama");
const chatView_1 = require("./chatView");
let selectedModel;
let chatHistory = [];
function activate(context) {
    console.log('Congratulations, your extension "ollama-copilot" is now active!');
    const chatViewProvider = new chatView_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(chatView_1.ChatViewProvider.viewType, chatViewProvider));
    const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(modelStatusBarItem);
    const updateStatusBar = async () => {
        const models = await (0, ollama_1.getModels)();
        if (models.length > 0) {
            if (!selectedModel) {
                selectedModel = models[0].name;
            }
            modelStatusBarItem.text = `$(chip) ${selectedModel}`;
            modelStatusBarItem.tooltip = `Ollama Model: ${selectedModel}`;
            modelStatusBarItem.command = 'ollama-copilot.selectModel';
            modelStatusBarItem.show();
        }
        else {
            modelStatusBarItem.hide();
        }
    };
    let selectModelCommand = vscode.commands.registerCommand('ollama-copilot.selectModel', async () => {
        const models = await (0, ollama_1.getModels)();
        if (models.length > 0) {
            const modelNames = models.map((model) => model.name);
            const chosenModel = await vscode.window.showQuickPick(modelNames, { placeHolder: 'Select an Ollama model' });
            if (chosenModel) {
                selectedModel = chosenModel;
                updateStatusBar();
            }
        }
    });
    const completionProvider = vscode.languages.registerCompletionItemProvider({ scheme: 'file' }, {
        async provideCompletionItems(document, position) {
            if (!selectedModel) {
                return [];
            }
            const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            const completion = await (0, ollama_1.generateCompletion)(selectedModel, text);
            if (completion) {
                const completionItem = new vscode.CompletionItem(completion, vscode.CompletionItemKind.Snippet);
                completionItem.insertText = completion;
                return [completionItem];
            }
            return [];
        }
    });
    // Handle messages from the webview
    chatViewProvider.getWebview()?.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'prompt':
                if (selectedModel) {
                    chatHistory.push({ role: 'user', content: message.text });
                    chatViewProvider.addMessage('user', message.text);
                    const response = await (0, ollama_1.chat)(selectedModel, chatHistory);
                    if (response) {
                        chatHistory.push(response);
                        chatViewProvider.addMessage('bot', response.content);
                        // Save chat history
                        const chatHistoryPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat_history.json');
                        await vscode.workspace.fs.writeFile(chatHistoryPath, Buffer.from(JSON.stringify(chatHistory, null, 2)));
                    }
                }
                break;
        }
    });
    // Load chat history
    (async () => {
        const chatHistoryPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat_history.json');
        try {
            const historyData = await vscode.workspace.fs.readFile(chatHistoryPath);
            chatHistory = JSON.parse(historyData.toString());
            // Restore chat history in the view
            chatHistory.forEach(msg => chatViewProvider.addMessage(msg.role, msg.content));
        }
        catch (e) {
            // No history yet
        }
    })();
    context.subscriptions.push(selectModelCommand, completionProvider);
    updateStatusBar();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map