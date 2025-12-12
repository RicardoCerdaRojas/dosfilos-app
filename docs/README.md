# DosFilos Documentation

This directory contains technical documentation for the DosFilos sermon preparation application.

## Structure

### `/architecture`
Technical architecture documents describing system design and service implementations.

| Document | Description |
|----------|-------------|
| [generator-chat-service.md](./architecture/generator-chat-service.md) | RAG-enabled chat service for sermon generator |
| [server-side-indexing.md](./architecture/server-side-indexing.md) | Library resource indexing architecture |
| [technology_recommendations.md](./architecture/technology_recommendations.md) | Technology stack recommendations |

### `/walkthroughs`
Step-by-step implementation walkthroughs and feature documentation.

| Document | Description |
|----------|-------------|
| [generator-assistant-upgrade-walkthrough.md](./walkthroughs/generator-assistant-upgrade-walkthrough.md) | RAG, coaching styles, resizable panel implementation |
| [auto-save-walkthrough.md](./walkthroughs/auto-save-walkthrough.md) | Auto-save and resume functionality |
| [initial-setup-walkthrough.md](./walkthroughs/initial-setup-walkthrough.md) | Initial project setup documentation |
| [server-side-indexing-walkthrough.md](./walkthroughs/server-side-indexing-walkthrough.md) | Library indexing implementation walkthrough |

### `/guides`
How-to guides and user documentation.

### `/prompts`
AI prompt templates and configurations.

## Recent Updates

- **December 2024**: Added Generator Assistant Upgrade documentation
  - `GeneratorChatService` with RAG and coaching styles
  - `ResizableChatPanel` for expandable/draggable chat
  - Integration across all wizard steps
