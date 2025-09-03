const vscode = acquireVsCodeApi();

const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');

promptInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        const prompt = promptInput.value;
        promptInput.value = '';

        vscode.postMessage({
            command: 'prompt',
            text: prompt
        });
    }
});

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
    }
});
