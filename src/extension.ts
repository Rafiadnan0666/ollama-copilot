import * as vscode from 'vscode';
import { getModels, generateCompletion, streamChat } from './ollama';
import { ChatViewProvider } from './chatView';

let selectedModel: string | undefined;
let chatHistory: { role: string, content: string }[] = [];
let chatRequestController: AbortController | undefined;

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "ollama-copilot" is now active!');

    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider));

    const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(modelStatusBarItem);

    const updateStatusBar = async () => {
        console.log('[Extension] Updating status bar...');
        const models = await getModels();
        if (models.length > 0) {
            if (!selectedModel) {
                selectedModel = models[0].name;
                console.log(`[Extension] No model selected, defaulting to: ${selectedModel}`);
            }
            modelStatusBarItem.text = `$(chip) ${selectedModel}`;
            modelStatusBarItem.tooltip = `Ollama Model: ${selectedModel}`;
            modelStatusBarItem.command = 'ollama-copilot.selectModel';
            modelStatusBarItem.show();
        } else {
            console.log('[Extension] No Ollama models found, hiding status bar item.');
            modelStatusBarItem.hide();
        }
    };

    let selectModelCommand = vscode.commands.registerCommand('ollama-copilot.selectModel', async () => {
        console.log('[Extension] Executing selectModel command...');
        const models = await getModels();
        if (models.length > 0) {
            const modelNames = models.map((model) => model.name);
            const chosenModel = await vscode.window.showQuickPick(modelNames, { placeHolder: 'Select an Ollama model' });
            if (chosenModel) {
                console.log(`[Extension] User selected model: ${chosenModel}`);
                selectedModel = chosenModel;
                updateStatusBar();
            }
        }
    });

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file' },
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
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
                const completion = await generateCompletion(selectedModel, text, controller.signal);

                if (completion) {
                    console.log('[Extension] Completion received, creating completion item.');
                    const completionItem = new vscode.CompletionItem(completion, vscode.CompletionItemKind.Snippet);
                    completionItem.insertText = completion;
                    return [completionItem];
                }

                console.log('[Extension] No completion received from Ollama.');
                return [];
            }
        }
    );

    // Handle messages from the webview
    chatViewProvider.getWebview()?.onDidReceiveMessage(async message => {
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
                    const onData = (chunk: string) => {
                        fullResponse += chunk;
                        chatViewProvider.getWebview()?.postMessage({ command: 'stream-chunk', text: chunk });
                    };

                    try {
                        console.log('[Extension] Calling streamChat...');
                        await streamChat(selectedModel, chatHistory, signal, onData);
                        console.log('[Extension] streamChat finished.');
                        chatHistory.push({ role: 'assistant', content: fullResponse });
                        
                        const chatHistoryPath = vscode.Uri.joinPath(context.globalStorageUri, 'chat_history.json');
                        await vscode.workspace.fs.writeFile(chatHistoryPath, Buffer.from(JSON.stringify(chatHistory, null, 2)));

                    } catch (error) {
                        console.error('!!! [Extension] Error during streamChat call:', error);
                    } finally {
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
        } catch (e) {
            console.log('[Extension] No chat history found.');
        }
    })();

    context.subscriptions.push(selectModelCommand, completionProvider);
    updateStatusBar();
}

export function deactivate() {
    console.log('[Extension] Deactivating...');
    if (chatRequestController) {
        chatRequestController.abort();
    }
}
