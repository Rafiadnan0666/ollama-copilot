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
let chatRequestController;
// Function to silently warm up the Ollama model
async function warmUpOllama(model) {
    console.log(`[Extension] Warming up model: ${model}`);
    try {
        const controller = new AbortController();
        // Set a timeout to avoid waiting forever on a stuck model
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds
        await (0, ollama_1.generateCompletion)(model, ' ', controller.signal);
        clearTimeout(timeoutId);
        console.log(`[Extension] Model ${model} is warm.`);
    }
    catch (error) {
        // Suppress errors, as this is a background task
        console.error(`[Extension] Error warming up model ${model}:`, error);
    }
}
function activate(context) {
    console.log('Congratulations, your extension "ollama-copilot" is now active!');
    const chatViewProvider = new chatView_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(chatView_1.ChatViewProvider.viewType, chatViewProvider));
    const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(modelStatusBarItem);
    const updateStatusBar = async () => {
        console.log('[Extension] Updating status bar...');
        const models = await (0, ollama_1.getModels)();
        if (models.length > 0) {
            if (!selectedModel) {
                selectedModel = models[0].name;
                console.log(`[Extension] No model selected, defaulting to: ${selectedModel}`);
                // Initial warm-up on activation
                warmUpOllama(selectedModel);
            }
            modelStatusBarItem.text = `$(chip) ${selectedModel}`;
            modelStatusBarItem.tooltip = `Ollama Model: ${selectedModel}`;
            modelStatusBarItem.command = 'ollama-copilot.selectModel';
            modelStatusBarItem.show();
        }
        else {
            console.log('[Extension] No Ollama models found, hiding status bar item.');
            modelStatusBarItem.hide();
        }
    };
    let selectModelCommand = vscode.commands.registerCommand('ollama-copilot.selectModel', async () => {
        console.log('[Extension] Executing selectModel command...');
        const models = await (0, ollama_1.getModels)();
        if (models.length > 0) {
            const modelNames = models.map((model) => model.name);
            const chosenModel = await vscode.window.showQuickPick(modelNames, { placeHolder: 'Select an Ollama model' });
            if (chosenModel && chosenModel !== selectedModel) {
                console.log(`[Extension] User selected model: ${chosenModel}`);
                selectedModel = chosenModel;
                updateStatusBar();
                // Warm up the new model
                warmUpOllama(chosenModel);
            }
        }
    });
    const completionProvider = vscode.languages.registerCompletionItemProvider({ scheme: 'file' }, {
        async provideCompletionItems(document, position, token) {
            console.log('[Extension] provideCompletionItems triggered.');
            if (!selectedModel) {
                console.log('[Extension] No model selected, returning no completions.');
                return [];
            }
            const controller = new AbortController();
            token.onCancellationRequested(() => {
                console.log('[Extension] Completion request cancelled by VS Code.');
                controller.abort();
            });
            const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
            console.log(`[Extension] Calling generateCompletion for model: ${selectedModel}`);
            const completion = await (0, ollama_1.generateCompletion)(selectedModel, text, controller.signal);
            if (completion) {
                console.log('[Extension] Completion received, creating completion item.');
                const completionItem = new vscode.CompletionItem(completion, vscode.CompletionItemKind.Snippet);
                completionItem.insertText = completion;
                return [completionItem];
            }
            console.log('[Extension] No completion received from Ollama.');
            return [];
        }
    });
    // Handle messages from the webview
    chatViewProvider.getWebview()?.onDidReceiveMessage(async (message) => {
        console.log(`[Extension] Received message from webview: ${message.command}`);
        switch (message.command) {
            case 'prompt':
                if (selectedModel) {
                    console.log(`[Extension] Handling prompt for model: ${selectedModel}`);
                    if (chatRequestController) {
                        console.log('[Extension] Aborting previous chat request.');
                        chatRequestController.abort();
                    }
                    chatRequestController = new AbortController();
                    const signal = chatRequestController.signal;
                    chatHistory.push({ role: 'user', content: message.text });
                    chatViewProvider.addMessage('user', message.text);
                    chatViewProvider.getWebview()?.postMessage({ command: 'stream-start' });
                    let fullResponse = '';
                    const onData = (chunk) => {
                        fullResponse += chunk;
                        chatViewProvider.getWebview()?.postMessage({ command: 'stream-chunk', text: chunk });
                    };
                    try {
                        console.log('[Extension] Calling streamChat...');
                        await (0, ollama_1.streamChat)(selectedModel, chatHistory, signal, onData);
                        console.log('[Extension] streamChat finished.');
                        chatHistory.push({ role: 'assistant', content: fullResponse });
                        const chatHistoryPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat_history.json');
                        await vscode.workspace.fs.writeFile(chatHistoryPath, Buffer.from(JSON.stringify(chatHistory, null, 2)));
                    }
                    catch (error) {
                        console.error('!!! [Extension] Error during streamChat call:', error);
                    }
                    finally {
                        console.log('[Extension] Finalizing stream.');
                        chatViewProvider.getWebview()?.postMessage({ command: 'stream-end' });
                        chatRequestController = undefined;
                    }
                }
                break;
        }
    });
    // Load chat history
    (async () => {
        const chatHistoryPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat_history.json');
        try {
            console.log('[Extension] Loading chat history...');
            const historyData = await vscode.workspace.fs.readFile(chatHistoryPath);
            chatHistory = JSON.parse(historyData.toString());
            console.log('[Extension] Chat history loaded.');
            chatHistory.forEach(msg => chatViewProvider.addMessage(msg.role, msg.content));
        }
        catch (e) {
            console.log('[Extension] No chat history found.');
        }
    })();
    context.subscriptions.push(selectModelCommand, completionProvider);
    updateStatusBar();
}
function deactivate() {
    console.log('[Extension] Deactivating...');
    if (chatRequestController) {
        chatRequestController.abort();
    }
}
//# sourceMappingURL=extension.js.map