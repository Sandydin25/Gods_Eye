import { VOICE_MODELS } from '../../../src/voice/voiceCost.js';

// Sourced from the shared voice-model registry so the client's cost estimate
// can never be computed against a different model than the session runs on.
const OPENAI_REALTIME_MODEL_DEFAULT = VOICE_MODELS.standard.id;

const OPENAI_REALTIME_MODEL_MINI_DEFAULT = VOICE_MODELS.mini.id;

const OPENAI_REALTIME_VOICE_DEFAULT = 'marin';

const OPENAI_REALTIME_REASONING_DEFAULT = 'low';

const OPENAI_REALTIME_CONTEXT_TOKENS_DEFAULT = 3000;

const OPENAI_REALTIME_CONTEXT_RETENTION_DEFAULT = 0.5;

const OPENAI_HUD_SUMMARY_MODEL_DEFAULT = 'gpt-5-nano';

// Text-to-speech voice mode (OPENAI_TTS_VOICE): the Realtime session answers in
// text and these speak it, so voices the Realtime API lacks (fable) are usable.
const OPENAI_TTS_MODEL_DEFAULT = 'gpt-4o-mini-tts';

const OPENAI_TTS_INSTRUCTIONS_DEFAULT =
  'Speak as a calm, refined British butler: crisp Received Pronunciation, measured pace, composed and quietly warm, with dry understatement. Never theatrical.';

/** Longest reply the speech route will voice, in characters. */
const OPENAI_TTS_MAX_CHARS = 1200;

export {
  OPENAI_HUD_SUMMARY_MODEL_DEFAULT,
  OPENAI_TTS_MODEL_DEFAULT,
  OPENAI_TTS_INSTRUCTIONS_DEFAULT,
  OPENAI_TTS_MAX_CHARS,
  OPENAI_REALTIME_MODEL_MINI_DEFAULT,
  OPENAI_REALTIME_MODEL_DEFAULT,
  OPENAI_REALTIME_VOICE_DEFAULT,
  OPENAI_REALTIME_REASONING_DEFAULT,
  OPENAI_REALTIME_CONTEXT_TOKENS_DEFAULT,
  OPENAI_REALTIME_CONTEXT_RETENTION_DEFAULT,
};
