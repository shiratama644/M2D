# Agent rules

## Language

- Reply in Japanese when the user writes in Japanese.
- Prefer words that the reader will understand on first pass.
- If a Japanese term is hard to read, easy to misread, or unlikely to land (for example 事件 for *event*, 取得 for *fetch*), use the English word instead, or write both (`event（事件）`).
- Do not invent calques just to keep a sentence fully Japanese. Domain terms from the codebase (`emit`, `dispatch`, `Feature`, `catalog`) may stay in English.

## Comments

- Write all comments in source files in English (including scripts and config).
- User-facing copy and i18n strings are not comments; leave those as designed.

## Confirmations

- Before starting something new (a new feature, a new test campaign, a migration, a refactor, a docs overhaul, etc.), stop and ask first.
- Whenever you need a decision or confirmation from the user, ask in quiz form: short questions, 2–4 predefined options each, plus room for a custom reply.
- Do not begin the work until the user has answered (or explicitly said to skip).
- Do not dump an open-ended “how should I do this?” — turn the fork into options.
