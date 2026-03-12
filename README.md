# OpenVenice

An open-source frontend for the [Venice AI](https://venice.ai) API. Chat, generate images, audio, music, video, compute embeddings, and chain models together in visual workflows — all from one interface.

## Features

### Chat
Full-featured conversational interface with streaming responses, conversation history, model selection, and Venice-specific parameters (web search, citations, temperature). Supports Markdown rendering with syntax highlighting.

### Image Generation
Generate images with configurable prompts, negative prompts, style presets, steps, resolution, and aspect ratio. Supports multiple variants, watermark control, and a lightbox gallery with download.

### Audio (Text-to-Speech & Transcription)
Convert text to speech with 40+ voices across 9 languages, adjustable speed, and multiple output formats (MP3, Opus, AAC, FLAC, WAV). Also supports audio file transcription.

### Music Generation
Generate music from text prompts with optional lyrics, adjustable duration, and instrumental mode. Supports models like Stable Audio, ACE-Step, ElevenLabs Music, and MiniMax.

### Video Generation
Text-to-video and image-to-video generation with configurable aspect ratio, resolution, and duration. Supports multiple model families with automatic capability detection.

### Embeddings
Compute vector embeddings for text with selectable models and encoding formats.

### Workflows
Visual node-based editor for chaining Venice models together. Connect an Input node to an LLM, pipe the result into Image Gen or TTS, and view the final result in an Output node. Each node has full parameter controls matching its standalone view. Includes starter templates:
- **Write + Illustrate** — LLM expands a concept, then generates an image
- **Research + Summarize** — Web-search a topic, then distill into bullet points
- **Write + Narrate** — LLM writes an explanation, then TTS reads it aloud

## Tech Stack

- **React 19** + **TypeScript 5.9**
- **Vite 7** — dev server & build
- **Zustand** — state management with localStorage persistence
- **TanStack Query** — data fetching & caching
- **Tailwind CSS 4** — styling
- **React Flow** (@xyflow/react) — workflow canvas
- **react-markdown** + remark-gfm — chat rendering

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (proxies /venice/* to Venice API)
npm run dev

# Type-check & build for production
npm run build

# Preview production build
npm run preview
```

### API Key

Click the **API Key** button in the header to enter your [Venice AI API key](https://venice.ai). The key is stored locally in your browser and never sent anywhere except the Venice API.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` | New chat |
| `Cmd+1-7` | Switch tabs |

## Project Structure

```
src/
├── app.tsx                     # Root app, tab routing
├── components/
│   ├── chat/                   # Chat UI, message bubbles, params
│   ├── image/                  # Image generation view
│   ├── audio/                  # TTS & transcription
│   ├── music/                  # Music generation
│   ├── video/                  # Video generation
│   ├── embeddings/             # Embeddings view
│   ├── workflows/              # Visual workflow editor & nodes
│   ├── layout/                 # Sidebar, header, API key dialog
│   └── ui/                     # Shared components (Select, Logo, etc.)
├── stores/                     # Zustand stores (settings, chat, auth, workflows)
├── hooks/                      # Data-fetching hooks (models, styles, TTS, etc.)
├── lib/                        # Venice API client, workflow engine, utilities
└── types/                      # TypeScript type definitions
```

## License

MIT
