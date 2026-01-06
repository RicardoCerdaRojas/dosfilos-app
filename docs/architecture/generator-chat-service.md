# Generator Chat Service Architecture

**Date**: December 2024  
**Status**: Implemented

## Overview

The `GeneratorChatService` is a sermon-scoped chat service that provides RAG-enabled AI assistance during the sermon generation workflow. It's the generator's equivalent to the planner's `PlannerChatService`, adapted for the three-step wizard context.

## Key Differences from PlannerChatService

| Feature | PlannerChatService | GeneratorChatService |
|---------|-------------------|---------------------|
| Scope | Planner-wide | Per-sermon, per-phase |
| History Key | `planner_chat_history` | `generator_chat_history_{sermonId}_{phase}` |
| Context | Topic/Book planning | Passage-based sermon content |
| Phases | N/A | exegesis, homiletics, drafting |

## Service Interface

```typescript
class GeneratorChatService {
    // Initialize for a specific sermon and phase
    initializeForSermon(sermonId: string, phase: WorkflowPhase): void
    
    // Set coaching style preference
    setCoachingStyle(style: CoachingStyle | 'auto'): void
    
    // Send message with RAG context
    sendMessage(message: string, context: GeneratorChatContext): Promise<ChatResponseWithSources>
    
    // Get persisted history
    getHistory(): ChatMessage[]
    
    // Clear current session
    clearHistory(): void
}
```

## Context Interface

```typescript
interface GeneratorChatContext {
    passage: string;                        // Bible passage being studied
    currentContent: any;                    // Current step content (exegesis/homiletics/draft)
    focusedSection: string | null;          // Section being refined, or null for general chat
    libraryResources: LibraryResourceEntity[]; // User's full library
    phaseResources: SermonPhaseDocument[];  // Phase-specific documents
}
```

## RAG Integration

### Document Sources

1. **Full Library**: User's complete library resources (always searched)
2. **Phase Documents**: Documents specifically attached to the current workflow phase

### Search Strategy

```typescript
// 1. Search user's library for relevant chunks
const libraryResults = await this.searchLibrary(message, libraryResources);

// 2. Search phase-specific documents
const phaseResults = await this.searchPhaseDocuments(message, phaseResources);

// 3. Combine and rank by relevance
const combinedSources = this.rankSources([...libraryResults, ...phaseResults]);
```

## History Persistence

### Storage Format

```typescript
// Key format
const storageKey = `generator_chat_history_${sermonId}_${phase}`;

// Stored data
interface StoredHistory {
    messages: ChatMessage[];
    lastUpdated: number;  // Timestamp
    coachingStyle: CoachingStyle | 'auto';
}
```

### TTL (Time-To-Live)

- **Duration**: 7 days
- **Cleanup**: Performed on service initialization
- **Behavior**: Old histories are automatically purged

### Storage Keys Per Phase

| Phase | Storage Key Example |
|-------|---------------------|
| Exegesis | `generator_chat_history_sermon123_exegesis` |
| Homiletics | `generator_chat_history_sermon123_homiletics` |
| Drafting | `generator_chat_history_sermon123_drafting` |

## Coaching Styles

Uses the same `AutomaticStrategySelector` as `PlannerChatService`:

| Style | Description | Use Case |
|-------|-------------|----------|
| Automatic | AI selects best strategy | Default, recommended |
| Socratic | Guides through questions | Deep exploration |
| Direct | Provides answers directly | Quick assistance |
| Exploratory | Encourages discovery | Learning-focused |
| Didactic | Teaching mode | Explanatory content |

## Integration with UI

### ResizableChatPanel

The chat interface is wrapped in `ResizableChatPanel` for each wizard step:

```tsx
<ResizableChatPanel storageKey="exegesisChatWidth">
    <ChatInterface
        messages={messages}
        showStyleSelector={!expandedSectionId}
        selectedStyle={selectedStyle}
        onStyleChange={(style) => {
            setSelectedStyle(style);
            generatorChatService.setCoachingStyle(style);
        }}
    />
</ResizableChatPanel>
```

### Style Selector Visibility

- **General Chat**: Style selector visible in ChatInterface header
- **Section Refinement**: Style selector hidden (uses contentRefinementService instead)

## File Structure

```
packages/
├── application/
│   └── src/
│       └── services/
│           └── GeneratorChatService.ts   # Main service
└── web/
    └── src/
        ├── components/
        │   └── canvas-chat/
        │       ├── ChatInterface.tsx      # Enhanced with style props
        │       └── ResizableChatPanel.tsx # New resize wrapper
        └── pages/
            └── sermons/
                └── generator/
                    ├── StepExegesis.tsx   # Integrated
                    ├── StepHomiletics.tsx # Integrated
                    └── StepDraft.tsx      # Integrated
```

## Future Enhancements

1. **Cloud Sync**: Migrate history to Firestore for cross-device persistence
2. **Analytics**: Track coaching style effectiveness
3. **Suggestions**: Proactive suggestions based on content state
4. **Export**: Include chat insights in exported sermons
