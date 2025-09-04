# Local Buddy (olla­ma-copilot)

**Local Buddy** — Your friendly, offline coding partner.

This is a VS Code extension that hijacks the GitHub Copilot channel… and routes it straight to your **Ollama local model** (like `phi3:mini`, `llama3`, or `mistral`). Zero cloud, zero subscriptions.

---

##  Why Use Local Buddy?

- **100% Private & Offline**  
  All your code and prompts stay on your machine—no data ever leaves your workstation.

- **One-Time Payment, No Monthly Fee**  
  Ditch the $10/month Copilot subscription. Own one local code assistant forever.

- **Ultra Low Latency**  
  Keep your model warm with Ollama’s `--keepalive`, and Local Buddy responds almost instantly.

- **Multiple Model Support**  
  Use popular open-source models like `phi3:mini`, `llama3`, `mistral`, depending on your need and hardware.

---

## Installation

1. Unzip `ollama-copilot-0.0.1.vsix`  
2. In VS Code, go to **Extensions** → click the three dots → **Install from VSIX...**  
3. Select `ollama-copilot-0.0.1.vsix`.  
4. Set your model in the extension settings (e.g., `phi3:mini`).

---

## Usage Tips

- Preload your Ollama model:
   ```bash
   ollama run phi3:mini --keepalive 5m
Go to any JS/TS file → start typing → Local Buddy will autocomplete using Ollama.

Want streaming output? In the extension files, ensure your requests include:

{ "stream": true }
Potential Roadmap
Version	Features
v1 (current)	Local AI suggestions using Ollama phi3:mini
v2	Select models via settings, add inline chat sidebar
v3	Desktop app (Electron), richer settings, per-language customization

Contributing
Made this because official Copilot is too expensive and too online. Want to improve it? Contributions, issue reports, and feature suggestions are welcome!

License
Distributed under the MIT License—free to use and modify. Be sure your use of Ollama models complies with their licenses.

TL;DR
Local Buddy = Copilot experience, but totally local and private. One download—no cloud, no monthly bills.

---

###  Tips:

- Replace `"unnamed"` placeholder language with your actual extension name if you’d like.
- Provide links (in the real README) to how to install Ollama, and to documentation for your models.
- Add a screenshot of Local Buddy in action—IDE showing code autocomplete from Ollama—would give instant credibility.

