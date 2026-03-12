# OpenVenice

A customizable, open-source frontend for the [Venice AI](https://venice.ai) API.

Venice gives you access to powerful AI models for text, images, audio, music, and video. OpenVenice gives you a clean interface to use them — one you own, can modify, and can host yourself.

## Why OpenVenice?

**Your interface, your rules.** Venice's official UI is great, but sometimes you want more control:

- **Customize everything** — add tools, change layouts, tweak parameters, build features that matter to you. The codebase is intentionally simple and hackable.
- **Share your API key with family** — host OpenVenice on your own server, enter your key once, and give your family a clean AI interface without them needing their own accounts.
- **No server, no backend** — it's a static site. Your API key stays in your browser's localStorage and goes directly to Venice's API. Nothing passes through a middleman.
- **Transparent** — every API call is visible in the source. No telemetry, no analytics, no tracking.
- **Barebones on purpose** — ships with useful features like visual workflows, but keeps things minimal so you can build on top without fighting existing complexity.

## Features

### Chat
Streaming responses, conversation history, model selection, web search, citations, temperature control. Markdown rendering with syntax highlighting.

### Image Generation
Prompts, negative prompts, style presets, steps, resolution, aspect ratio, variants, watermark control. Lightbox gallery with download.

### Audio
Text-to-speech with 40+ voices across 9 languages. Adjustable speed, multiple formats (MP3, Opus, AAC, FLAC, WAV). Audio transcription.

### Music Generation
Text-to-music with optional lyrics, duration control, instrumental mode. Supports Stable Audio, ACE-Step, ElevenLabs, MiniMax.

### Video Generation
Text-to-video and image-to-video. Configurable aspect ratio, resolution, duration. Auto-detects model capabilities.

### Embeddings
Vector embeddings for text with selectable models and encoding formats.

### Workflows
Visual node editor for chaining models. Connect Input to LLM to Image Gen to Output — each node has full parameter controls. Starter templates included:
- **Write + Illustrate** — LLM expands a concept into an image prompt, generates the image
- **Research + Summarize** — Web-search a topic, distill into bullet points
- **Write + Narrate** — LLM writes text, TTS reads it aloud

## Getting Started

```bash
npm install
npm run dev
```

That's it. Open `http://localhost:5173`, click **API Key** in the header, paste your [Venice AI API key](https://venice.ai/settings/api), and start using it.

### Self-hosting

Build and serve the static files from anywhere — Vercel, Netlify, a Raspberry Pi, whatever:

```bash
npm run build    # outputs to /dist
```

The `/dist` folder is a fully static site. Serve it with any web server. There's no backend — the browser talks directly to `api.venice.ai`.

To share with family: deploy it, share the URL, and have them enter your API key (or their own). Each person's key and settings are stored in their own browser.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` | New chat |
| `Cmd+1-7` | Switch tabs |

## Tech Stack

React 19, TypeScript, Vite, Zustand, TanStack Query, Tailwind CSS, React Flow.

## Project Structure

```
src/
├── app.tsx                     # Tab routing
├── components/
│   ├── chat/                   # Chat interface
│   ├── image/                  # Image generation
│   ├── audio/                  # TTS & transcription
│   ├── music/                  # Music generation
│   ├── video/                  # Video generation
│   ├── embeddings/             # Embeddings
│   ├── workflows/              # Visual workflow editor
│   ├── layout/                 # Sidebar, header, API key dialog
│   └── ui/                     # Shared components
├── stores/                     # Zustand stores
├── hooks/                      # Data-fetching hooks
├── lib/                        # API client, workflow engine, utils
└── types/                      # TypeScript types
```

## Contributing

Fork it, break it, make it yours. PRs welcome.

## License

MIT
