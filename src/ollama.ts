import axios from 'axios';
import * as vscode from 'vscode';

const OLLAMA_HOST = 'http://localhost:11434'; // Make this configurable later

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

export async function getModels(): Promise<OllamaModel[]> {
    console.log('[Ollama] Fetching models...');
    try {
        const response = await axios.get(`${OLLAMA_HOST}/api/tags`);
        console.log('[Ollama] Models fetched successfully.');
        return response.data.models;
    } catch (error) {
        console.error('!!! [Ollama] FAILED to fetch models:', error);
        vscode.window.showErrorMessage('Ollama is not running. Please start Ollama and try again.');
        return [];
    }
}

export async function generateCompletion(model: string, prompt: string, signal: AbortSignal): Promise<string> {
    console.log(`[Ollama] Generating completion for model: ${model}`)
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: false
        }, {
            signal: signal
        });
        console.log('[Ollama] Completion generated successfully.');
        return response.data.response;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('[Ollama] Completion request canceled:', error.message);
            return '';
        }
        vscode.window.showErrorMessage(`Error generating completion: ${error}`);
        console.error('!!! [Ollama] FAILED to generate completion:', error);
        return '';
    }
}

export async function chat(model: string, messages: any[], signal: AbortSignal): Promise<any> {
    console.log(`[Ollama] Starting non-streaming chat for model: ${model}`)
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/chat`, {
            model: model,
            messages: messages,
            stream: false
        }, {
            signal: signal
        });
        console.log('[Ollama] Non-streaming chat finished successfully.');
        return response.data.message;
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('[Ollama] Non-streaming chat request canceled:', error.message);
            return null;
        }
        vscode.window.showErrorMessage(`Error in chat: ${error}`);
        console.error('!!! [Ollama] FAILED non-streaming chat:', error);
        return null;
    }
}

export async function streamChat(model: string, messages: any[], signal: AbortSignal, onData: (chunk: string) => void): Promise<void> {
    console.log(`[Ollama] Starting stream chat for model: ${model}`)
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios.post(`${OLLAMA_HOST}/api/chat`, {
                model: model,
                messages: messages,
                stream: true
            }, {
                signal: signal,
                responseType: 'stream'
            });

            let buffer = '';
            response.data.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                let lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last partial line

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message && typeof parsed.message.content !== 'undefined') {
                            onData(parsed.message.content);
                        }
                    } catch (e) {
                        console.error('[Ollama] Error parsing stream chunk:', e);
                    }
                }
            });

            response.data.on('end', () => {
                console.log('[Ollama] Chat stream ended.');
                resolve();
            });

            response.data.on('error', (err: any) => {
                console.error('!!! [Ollama] Chat stream errored:', err);
                reject(err);
            });

        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('[Ollama] Chat stream request canceled by user.');
                return resolve();
            }
            vscode.window.showErrorMessage(`Error in chat stream: ${error}`);
            console.error('!!! [Ollama] FAILED to start chat stream:', error);
            reject(error);
        }
    });
}