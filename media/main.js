const vscode = acquireVsCodeApi();

const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');

promptInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        const prompt = promptInput.value;
        if (prompt.trim() === '') return;
        promptInput.value = '';

        vscode.postMessage({
            command: 'prompt',
            text: prompt
        });
    }
});

let streamingMessageElement = null;

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'addMessage':
            const messageElement = document.createElement('div');
            messageElement.classList.add(message.type + '-message');
            messageElement.textContent = message.text;
            chatContainer.appendChild(messageElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            break;
        case 'stream-start':
            streamingMessageElement = document.createElement('div');
            streamingMessageElement.classList.add('bot-message');
            chatContainer.appendChild(streamingMessageElement);
            break;
        case 'stream-chunk':
            if (streamingMessageElement) {
                streamingMessageElement.textContent += message.text;
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            break;
        case 'stream-end':
            streamingMessageElement = null;
            break;
    }
});
