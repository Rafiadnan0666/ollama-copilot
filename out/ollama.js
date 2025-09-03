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
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
const OLLAMA_HOST = 'http://localhost:11434'; // Make this configurable later
async function getModels() {
    try {
        const response = await axios_1.default.get(`${OLLAMA_HOST}/api/tags`);
        return response.data.models;
    }
    catch (error) {
        vscode.window.showErrorMessage('Ollama is not running. Please start Ollama and try again.');
        return [];
    }
}
async function generateCompletion(model, prompt) {
    try {
       const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "phi3:mini",
        prompt: userPrompt,
        stream: true 
      }
    );

        return response.data.response;
    }
    catch (error) {
        console.error(error);
        return '';
    }
}
async function chat(model, messages) {
    try {
        const response = await axios_1.default.post(`${OLLAMA_HOST}/api/chat`, {
            model: model,
            messages: messages,
            stream: true
        });
        return response.data.message;
    }
    catch (error) {
        console.error(error);
        return null;
    }
}
//# sourceMappingURL=ollama.js.map