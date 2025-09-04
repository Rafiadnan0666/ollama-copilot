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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModels = getModels;
exports.generateCompletion = generateCompletion;
exports.chat = chat;
exports.streamChat = streamChat;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
const OLLAMA_HOST = 'http://localhost:11434'; // Make this configurable later
async function getModels() {
    console.log('[Ollama] Fetching models...');
    try {
        const response = await axios_1.default.get(`${OLLAMA_HOST}/api/tags`);
        console.log('[Ollama] Models fetched successfully.');
        return response.data.models;
    }
    catch (error) {
        console.error('!!! [Ollama] FAILED to fetch models:', error);
        vscode.window.showErrorMessage('Ollama is not running. Please start Ollama and try again.');
        return [];
    }
}
async function generateCompletion(model, prompt, signal) {
    console.log(`[Ollama] Generating completion for model: ${model}`);
    try {
        const response = await axios_1.default.post(`${OLLAMA_HOST}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: false
        }, {
            signal: signal
        });
        console.log('[Ollama] Completion generated successfully.');
        return response.data.response;
    }
    catch (error) {
        if (axios_1.default.isCancel(error)) {
            console.log('[Ollama] Completion request canceled:', error.message);
            return '';
        }
        vscode.window.showErrorMessage(`Error generating completion: ${error}`);
        console.error('!!! [Ollama] FAILED to generate completion:', error);
        return '';
    }
}
async function chat(model, messages, signal) {
    console.log(`[Ollama] Starting non-streaming chat for model: ${model}`);
    try {
        const response = await axios_1.default.post(`${OLLAMA_HOST}/api/chat`, {
            model: model,
            messages: messages,
            stream: false
        }, {
            signal: signal
        });
        console.log('[Ollama] Non-streaming chat finished successfully.');
        return response.data.message;
    }
    catch (error) {
        if (axios_1.default.isCancel(error)) {
            console.log('[Ollama] Non-streaming chat request canceled:', error.message);
            return null;
        }
        vscode.window.showErrorMessage(`Error in chat: ${error}`);
        console.error('!!! [Ollama] FAILED non-streaming chat:', error);
        return null;
    }
}
async function streamChat(model, messages, signal, onData) {
    console.log(`[Ollama] Starting stream chat for model: ${model}`);
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios_1.default.post(`${OLLAMA_HOST}/api/chat`, {
                model: model,
                messages: messages,
                stream: true
            }, {
                signal: signal,
                responseType: 'stream'
            });
            let buffer = '';
            response.data.on('data', (chunk) => {
                buffer += chunk.toString();
                let lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last partial line
                for (const line of lines) {
                    if (line.trim() === '')
                        continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message && typeof parsed.message.content !== 'undefined') {
                            onData(parsed.message.content);
                        }
                    }
                    catch (e) {
                        console.error('[Ollama] Error parsing stream chunk:', e);
                    }
                }
            });
            response.data.on('end', () => {
                console.log('[Ollama] Chat stream ended.');
                resolve();
            });
            response.data.on('error', (err) => {
                console.error('!!! [Ollama] Chat stream errored:', err);
                reject(err);
            });
        }
        catch (error) {
            if (axios_1.default.isCancel(error)) {
                console.log('[Ollama] Chat stream request canceled by user.');
                return resolve();
            }
            vscode.window.showErrorMessage(`Error in chat stream: ${error}`);
            console.error('!!! [Ollama] FAILED to start chat stream:', error);
            reject(error);
        }
    });
}
//# sourceMappingURL=ollama.js.map