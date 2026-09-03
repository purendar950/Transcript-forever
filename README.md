# SSC Vocabulary AI

AI-powered English vocabulary learning and revision app built specifically for SSC exam preparation.

## Current Project

This repository contains the active **SSC Vocabulary AI** project. Old/unused transcript and Cloudflare Worker project files have been removed so the repository stays focused on this application.

## Features

### Vocabulary Learning
- SSC-focused vocabulary bank
- Active Recall learning flow
- Simple English meaning
- Hindi meaning
- Hinglish explanation
- Pronunciation and part of speech
- Synonyms and antonyms
- SSC-style example sentences
- Phonetic mnemonics
- Visual memory stories
- Core idea and confusion words
- Vocabulary status shown on flashcards and My Vocabulary
- **LEARNED** status — green
- **WEAK** status — red
- **NOT READY** status — blue
- Delete control for user-added vocabulary words
- Seed/official vocabulary cannot be accidentally deleted

### AI Settings
- Multiple Text AI providers
- Dedicated Image AI providers
- Add multiple models to each provider
- Edit existing providers
- Use This / Remove provider controls
- Provider-specific model selection
- Model dropdowns show **only models saved by the user**
- OpenAI-compatible API support
- Connection testing

### SSC Quiz
- Four-option MCQs
- Random option positions
- Correct answer mapping remains accurate after randomization
- All Words mode
- Weak Words mode
- Learned Words mode
- Correct answer → Learned
- Wrong answer → Weak
- Review timing based on performance

### Cloud Sync (Supabase)
- Sync vocabulary, progress, providers, and quiz history across devices
- Code-based auth (no email required) — 8-character recovery code
- Images stored locally only (not synced to save bandwidth)
- Auto-sync on every save with debounced uploads
- Offline-first: works without Supabase, sync when available
- Merge strategy: remote + local, no data loss

## Cloud Sync Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
4. Copy your **Project URL** and **anon/public key** from Settings → API
5. In the app, go to **AI Settings → Cloud Sync (Supabase)**
6. Paste your URL and anon key, click **Save Config**
7. Click **Create New Account** — you'll get an 8-character code
8. **Save this code** — use it to sign in from other devices

### Image Generation
- Dedicated Image AI configuration
- Supports image-generation providers such as Pollinations AI
- Image generation is separate from Text AI because text models do not necessarily support image generation

## Vocabulary Status Logic

Each word has a learning status stored locally in the browser:

| Status | Color | Meaning |
|---|---|---|
| **NOT READY** | Blue | Not yet successfully learned/reviewed |
| **LEARNED** | Green | Answered correctly / marked as known |
| **WEAK** | Red | Answered incorrectly, difficult, or forgotten |

Quiz answers and flashcard rating buttons update the same status system. This keeps **All Words**, **Weak Words**, and **Learned Words** quiz modes synchronized.

## Project Structure

```text
.
├── index.html          # Main SSC Vocabulary AI application
├── api/
│   ├── ai.js           # AI provider proxy and image/text API handling
│   └── home.js         # Application HTML delivery and UI compatibility layer
├── supabase-schema.sql # SQL schema for Supabase cloud sync
├── vercel.json         # Vercel routing configuration
├── README.md
└── .gitignore
```

## AI Provider Configuration

For a Text AI provider, configure:

- Provider name
- Base URL
- API key
- Optional API user
- One or more model IDs

For an Image AI provider, configure the same provider information plus the image model and size where supported.

### Pollinations AI

For Pollinations' OpenAI-compatible API, use:

```text
Base URL: https://gen.pollinations.ai/v1
```

Add the image model you want to use to the provider's **Model** field. The app intentionally displays only the models you manually save in AI Settings rather than mixing them with a large remote model catalog.

## Security

- Do not commit API keys to the repository.
- API keys entered in the application are handled through the app's provider configuration flow.
- Use secret/server-side keys only where the provider requires them.

## Deployment

The project is configured for Vercel deployment. The root route is served through the Vercel API entry point defined in `vercel.json`.

## Development Principle

The existing working features should be preserved when adding new functionality. Future changes should be made as small, isolated fixes instead of replacing the entire application unnecessarily.
