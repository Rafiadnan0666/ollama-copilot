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
const axios = __importDefault(require("axios")); // Import the Axios library for HTTP requests
const vscode = require('vscode'); // Assuming VS Code integration is needed here, though not used in this snippet
// Make OLLAMA_HOST configurable later or set a default value if necessary.
const OLLAMA_HOST = 'http://localhost:11434'; 
async function getModels() {
    try {
        const response = await axios.get(`${OLLAMA_HOST}/api/tags`); // Get list of models supported by Ollama
        return response.data.models;
    } catch (error) {
        vscode.window.showErrorMessage('Ollama is not running or there was a network error while fetching the model list:', 'Please start Ollama and try again.');
        throw new Error(error); // Re-throw to allow calling code to handle it, e.g., retry logic could be implemented here if needed
    }
}
async function generateCompletion(model, prompt) {
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
            model: model, // Model to use for generating completions
            prompt: prompt, // Prompt text provided by the user or another part of your application
            stream: false // Consider changing this to true if you want immediate responses and handling them as they come in real-time instead of waiting for the full response body.
        });
        
        return response.data.response;
    } catch (error) {
        consoles.log('Network error or timeout occurred:', error); // Log network errors to help with debugging issues related to connectivity and API availability
        vscode.window.showErrorMessage('An unexpected error occurred while generating completion suggestions, please try again later or check your internet connection.:');
        return ''; // Return an empty string as a fallback in case of critical failures affecting subsequent operations that rely on completions being generated successfully
    }
}

async function chat(model, messages) {
    try {
        const response = await axios.post(`${OLLAMA_HOST}/api/chat`, {
            model: model, // Model used in conversation with Ollama
            messages: messages, // Array of user-generated or predefined chat messages to send through the API
            stream: false // Consider changing this to true if you want immediate responses and handling them as they come in real-time instead of waiting for full response body.
        });
        
        return response.data.message;
    } catch (error) {
        console.log('An unexpected error occurred while chatting with Ollama:', error); // Log errors to assist debugging chat functionality issues
        vscode.window.showErrorMessage('A problem occurred during the conversation, please try again later or check your internet connection.:');
        return null; // Returning `null` here indicates that there was an issue which might require user intervention or retry logic in calling code if necessary
    }
}
//# sourceMappingURL=ollama.js.map