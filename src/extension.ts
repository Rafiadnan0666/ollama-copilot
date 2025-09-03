import * as vscode from 'vscode';
import { getModels, generateCompletion, chat } from './ollama';
import { ChatViewProvider } from './chatView';

let selectedModel: string | undefined;
let chatHistory: { role: string, content: string }[] = [];

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "ollama-copilot" is now active!');

    const chatViewProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider));

    const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(modelStatusBarItem);

    const updateStatusBar = async () => {
        const models = await getModels();
        if (models.length > 0) {
            if (!selectedModel) {
                selectedModel = models[0].name;
            }
            modelStatusBarItem.text = `$(chip) ${selectedModel}`;
            modelStatusBarItem.tooltip = `Ollama Model: ${selectedModel}`;
            modelStatusBarItem.command = 'ollama-copilot.selectModel';
            modelStatusBarItem.show();
        } else {
            modelStatusBarItem.hide();
        }
    };

    let selectModelCommand = vscode.commands.registerCommand('ollama-copilot.selectModel', async () => {
        const models = await getModels();
        if (models.length > 0) {
            const modelNames = models.map((model) => model.name);
            const chosenModel = await vscode.window.showQuickPick(modelNames, { placeHolder: 'Select an Ollama model' });
            if (chosenModel) {
                selectedModel = chosenModel;
                updateStatusBar();
            }
        }
    });

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file' },
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                if (!selectedModel) {
                    return [];
                }

                const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                const completion = await generateCompletion(selectedModel, text);

                if (completion) {
                    const completionItem = new vscode.CompletionItem(completion, vscode.CompletionItemKind.Snippet);
                    completionItem.insertText = completion;
                    return [completionItem];
                }

                return [];
            }
        }
    );

    // Handle messages from the webview
    chatViewProvider.getWebview()?.onDidReceiveMessage(async message => {
        switch (message.command) {
            case 'prompt':
                if (selectedModel) {
                    chatHistory.push({ role: 'user', content: message.text });
                    chatViewProvider.addMessage('user', message.text);

                    const response = await chat(selectedModel, chatHistory);
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
        } catch (e) {
            // No history yet
        }
    })();

    context.subscriptions.push(selectModelCommand, completionProvider);
    updateStatusBar();
}

export function deactivate() {}
