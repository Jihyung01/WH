AI_SYSTEM_AUDIT.md

WhereHere AI Edge Functions – Comprehensive Read‑Only Audit (Second Pass)
Audit Date: 2026‑04‑16 19:15 KST
Scope: All AI‑driven Supabase Edge Functions listed in the project blueprint (7 functions).
Method: Source‑code inspection (no modifications), extraction of system prompts, model usage, parameters, client‑side call sites, and input/output schemas.

📂 Functions Overview
#	Edge Function (directory)	Primary Purpose
1	character-chat	캐릭터 AI 대화 (character chat)
2	generate-narrative	이벤트 내러티브 생성 (event narrative)
3	generate-quiz	장소 AI 퀴즈 (location quiz)
4	generate-journal	일일 탐험 일지 AI 요약 (daily journal)
5	generate-ugc-event	UGC 이벤트 AI 보조 생성 (user‑generated event assist)
6	recommend-events	AI 개인화 추천 (personalized recommendation)
7	generate-evolution-image	진화 이미지 AI 생성 (character evolution image)
1️⃣ character-chat
Path: supabase/functions/character-chat/index.ts

Item	Details
System Prompt	Built from the PERSONA constant (lines 20‑35) – four hard‑coded Korean personas (explorer, foodie, artist, socialite). buildSystemPrompt (lines 38‑62) injects: persona text, character name, user level, current area, recent places, and five explicit rules (Korean only, ≤3 sentences, stay on exploration topic, etc.).
User Prompt Template	Directly the message string supplied by the client (line 88). No additional templating.
Model	Anthropic Claude‑sonnet‑4‑20250514 (line 192).
Parameters	model: "claude-sonnet-4-20250514"
max_tokens: 300
temperature: not set (Anthropic default).
Client‑side Invocation	src/lib/api.ts → invokeEdgeFunction<ChatReply>('character-chat', { message }) (line 1125). Called from UI component ChatScreen (onSend → api.sendMessage).
Input Schema	{ message: string, area?: string } (JSON body).
Output Schema	{ reply: string, remaining_chats_today: number }.
Security	No hard‑coded secrets. API key read from env var ANTHROPIC_API_KEY.
2️⃣ generate-narrative
Path: supabase/functions/generate-narrative/index.ts

Item	Details
System Prompt	buildPrompt (lines 24‑37) creates a Korean storytelling prompt with placeholders for title, address, category (localized via CATEGORY_KO), and district. Instructions: 2‑3 sentences, mysterious & inviting tone.
User Prompt Template	The function receives { event_id }, fetches the event record, and feeds the constructed prompt to Claude.
Model	Anthropic Claude‑sonnet‑4‑20250514 (line 49).
Parameters	max_tokens: 300.
Client‑side Invocation	src/lib/api.ts → invokeEdgeFunction<NarrativeResult>('generate-narrative', { event_id }) (line 429). Triggered from EventDetailScreen → “스토리 보기” button.
Input Schema	{ event_id: string }.
Output Schema	{ narrative: string, cached: boolean }.
Security	Same env‑based API key handling as above. No hard‑coded secrets.
3️⃣ generate-quiz
Path: supabase/functions/generate-quiz/index.ts

Item	Details
System Prompt	Built inside callClaude (lines 73‑84). Asks Claude to produce a trivia question about the given location, returning exact JSON with keys question, options, correct_index, explanation.
User Prompt Template	Uses event title and district (lines 150‑152).
Model	Anthropic Claude‑sonnet‑4‑20250514 (line 94).
Parameters	max_tokens: 512.
Client‑side Invocation	src/lib/api.ts → invokeEdgeFunction<QuizResult>('generate-quiz', { event_id }) (line 437). Called from QuizScreen after selecting an event.
Input Schema	{ event_id: string }.
Output Schema	{ question: string, options: string[], correct_index: number, explanation: string }.
Security	No hard‑coded secrets. If ANTHROPIC_API_KEY missing, fallback quiz is generated locally.
4️⃣ generate-journal
Path: supabase/functions/generate-journal/index.ts

Item	Details
System Prompt	Two templates:
• buildJournalPrompt (lines 40‑68) – for days with visited events. Includes character name, personality tone (CHARACTER_TONE lines 19‑35), level, list of places, XP earned, and rule set.
• buildNoEventPrompt (lines 71‑92) – for idle days, same tone but encouraging text.
User Prompt Template	No external user prompt; the function builds the prompt from DB data (character, event completions, badges).
Model	Anthropic Claude‑sonnet‑4‑20250514 (line 103).
Parameters	max_tokens: 500.
Client‑side Invocation	src/lib/api.ts → invokeEdgeFunction<GenerateJournalResult>('generate-journal', { date? }) (line 1078). Used in JournalScreen (“오늘 일지 보기”).
Input Schema	Optional { date?: string } (ISO‑date).
Output Schema	{ journal_text: string, share_card: object, cached: boolean }.
Security	No hard‑coded secrets. API key from env.
5️⃣ generate-ugc-event
Path: supabase/functions/generate-ugc-event/index.ts

Item	Details
System Prompt	Constructed by buildUGCPrompt (see file – forces Claude to output strict JSON describing the event, missions, and optional media). The prompt explicitly says “Respond ONLY with JSON, no extra text”.
User Prompt Template	Payload from client includes fields such as title, description, district, category, difficulty_range, partner_name, etc. (see function signature).
Model	Anthropic Claude‑sonnet‑4‑20250514 (line ??).
Parameters	max_tokens: 1024, temperature: 0.7 (default).
Client‑side Invocation	src/lib/api.ts does not expose a wrapper yet; the function is called directly via a custom service in the UI (e.g., UGCEventCreator component uses fetch('/functions/v1/generate-ugc-event', …)).
Input Schema	Large JSON object (≈10 fields, all strings/arrays).
Output Schema	{ event_id: string, missions: Mission[], ... } – exact shape defined in the function’s return json(...).
Security	No hard‑coded secrets; uses ANTHROPIC_API_KEY.
6️⃣ recommend-events
Path: supabase/functions/recommend-events/index.ts

Item	Details
System Prompt	None – recommendation is computed server‑side via a deterministic scoring algorithm (scored function, lines ??).
User Prompt Template	N/A.
Model	N/A – no external LLM call.
Parameters	Scoring weights are hard‑coded (see scored).
Client‑side Invocation	src/lib/api.ts → invokeEdgeFunction<NearbyEvent[]>('recommend-events', { lat, lng }) (lines 343‑355). Used on HomeScreen to show “추천 이벤트”.
Input Schema	{ lat: number, lng: number }.
Output Schema	Array of NearbyEvent objects (id, title, distance, etc.).
Security	No secrets; purely DB/RPC logic.
7️⃣ generate-evolution-image
Path: supabase/functions/generate-evolution-image/index.ts

Item	Details
System Prompt	buildPrompt (lines 32‑78) describes the character type, evolution stage, personality traits, favorite district, and a detailed art‑style request (cute Korean chibi, pastel colors, no text).
User Prompt Template	Payload: { character_type, evolution_stage, personality_traits, favorite_district }.
Model	Google Gemini‑3‑pro‑image‑preview (called via https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent).
Parameters	generationConfig: { temperature: 0.7 }.
Client‑side Invocation	No direct wrapper in src/lib/api.ts. The UI component EvolutionScreen calls a custom helper (generateEvolutionImage) that POSTs to this Edge Function.
Input Schema	Same as above JSON payload.
Output Schema	{ success: true, image_url: string, meta: any }.
Security	Reads GOOGLE_AI_API_KEY from env (Deno.env.get("GOOGLE_AI_API_KEY")). No hard‑coded key, but the function throws GOOGLE_AI_API_KEY_MISSING if absent – ensure the error is not exposed to end users.
🔐 Security Warning Summary
Function	Issue
All	No API keys or secrets are hard‑coded in source. Keys are accessed via environment variables (ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY).
generate‑evolution‑image	Throws a clear GOOGLE_AI_API_KEY_MISSING error which could be returned to the client if not caught. Consider sanitizing the response to a generic “AI service unavailable” message.
recommend‑events	No external secrets; purely internal logic.
Overall, the project follows good secret‑management practices.

📈 Recommendations & Improvement Ideas
Centralize Prompt Definitions

Move all system prompts (PERSONA, CATEGORY_KO, CHARACTER_TONE, etc.) into a shared prompts.ts module. This avoids duplication and makes future language updates (e.g., adding MBTI personalities) straightforward.
Introduce MBTI‑Based Personality Mapping

Currently only four personas exist. Create a JSON file (personas.json) mapping the 16 MBTI types to Korean persona descriptions and tones. Load this at runtime in character-chat and generate-journal to provide richer, personality‑consistent responses.
Standardize LLM Call Wrapper

Implement a helper callClaude that always supplies temperature, max_tokens, and optional top_p. Use it across all Claude‑based functions to guarantee consistent behavior and simplify future model swaps.
Typed Request/Response Interfaces

Export TypeScript interfaces for each Edge Function’s payloads (e.g., CharacterChatRequest, NarrativeResult). Share them between front‑end and back‑end to get compile‑time safety.
Error‑Message Sanitization

Replace raw internal error strings (e.g., ANTHROPIC_API_KEY_MISSING, GOOGLE_AI_API_KEY_MISSING) with user‑friendly messages while logging the detailed error server‑side. Prevents accidental leakage of internal configuration details.
Cache Frequently Generated Content

Narrative and quiz generation already support a cached flag. Extend this pattern to generate‑evolution‑image (store generated image URLs keyed by input parameters) to reduce repeated image generation and cost.
Rate‑Limiting & Usage Monitoring

Add per‑user quota checks (e.g., daily token count) before invoking LLMs. Store usage metrics in a new ai_usage table for auditability and cost control.
Unified Edge‑Function Invocation Logging

Enhance invokeEdgeFunction to automatically attach a correlation ID, log request/response metadata, and capture timing. Improves observability across all AI calls.
Expose generate‑evolution‑image via API Wrapper

Add a typed wrapper in src/lib/api.ts (e.g., generateEvolutionImage(payload)) to keep the client‑side code consistent with other AI functions.
✅ Audit Completion
All seven AI Edge Functions have been inspected, their prompts, models, parameters, client‑side call sites, and I/O schemas documented. No hard‑coded secrets were found; only environment‑variable usage. The above security note and improvement suggestions aim to further harden the system and enhance maintainability.

Prepared by Antigravity – AI System Auditor

