# Agent rules

## Language

- Reply in Japanese when the user writes in Japanese.
- Prefer words that the reader will understand on first pass.
- If a Japanese term is hard to read, easy to misread, or unlikely to land (for example 事件 for *event*, 取得 for *fetch*), use the English word instead, or write both (`event（事件）`).
- Do not invent calques just to keep a sentence fully Japanese. Domain terms from the codebase (`emit`, `dispatch`, `Feature`, `catalog`) may stay in English.

## Comments

- Write all comments in source files in English (including scripts and config).
- User-facing copy and i18n strings are not comments; leave those as designed.
