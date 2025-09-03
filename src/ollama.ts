import axios from 'axios';
import * as vscode from 'vscode';

const OLLAMA_HOST = 'http://localhost:11434'; // Make this configurable later

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

export async function getModels(): Promise<OllamaModel[]> {
    try {
        const response = await axios.get(`${OLLAMA_HOST}/api/tags`);
        return response.data.models;
    } catch (error) {
        vscode.window.showErrorMessage('Ollama is not running. Please start Ollama and try again.');
        return [];
    }
}

export async function generateCompletion(model: string, prompt: string): Promise<string> {
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: model,
            prompt: prompt,
            stream: false
        });
        return response.data.response;
    } catch (error) {
        console.error(error);
        return '';
    }
}

export async function chat(model: string, messages: any[]): Promise<any> {
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/chat`, {
            model: model,
            messages: messages,
            stream: false
        });
        return response.data.message;
    } catch (error) {
        console.error(error);
        return null;
    }
}