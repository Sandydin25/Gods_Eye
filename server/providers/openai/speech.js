import { enforceRateLimit, openAiRateLimiter } from './rate-limit.js';
import { readRequestBody } from '../common/request.js';
import {
  OPENAI_TTS_MODEL_DEFAULT,
  OPENAI_TTS_INSTRUCTIONS_DEFAULT,
  OPENAI_TTS_MAX_CHARS,
} from './constants.js';

/** The configured text-to-speech voice, or null when the mode is off. */
function ttsVoice() {
  return process.env.OPENAI_TTS_VOICE?.trim() || null;
}

/**
 * Speaks one assistant reply through OpenAI's speech endpoint and returns the
 * audio. Used only in text-to-speech voice mode (OPENAI_TTS_VOICE); the key
 * stays server-side like the Realtime token route.
 */
function createSpeechHandler({
  endpoint = 'https://api.openai.com/v1/audio/speech',
  fetchImpl = (...args) => fetch(...args),
  resolveApiKey = () => process.env.OPENAI_API_KEY,
} = {}) {
  const fail = (res, status, error) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error }));
  };
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
    const voice = ttsVoice();
    if (!voice) return fail(res, 404, 'Text-to-speech voice mode is off');
    if (!enforceRateLimit(openAiRateLimiter(), req, res)) return;
    const apiKey = resolveApiKey();
    if (!apiKey) return fail(res, 503, 'OPENAI_API_KEY is not set');

    let text;
    try {
      text = String(
        JSON.parse((await readRequestBody(req, 16 * 1024)) || '{}').text || '',
      ).trim();
    } catch {
      return fail(res, 400, 'Invalid speech request');
    }
    if (!text) return fail(res, 400, 'Nothing to speak');
    text = text.slice(0, OPENAI_TTS_MAX_CHARS);

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || OPENAI_TTS_MODEL_DEFAULT,
          voice,
          input: text,
          instructions:
            process.env.OPENAI_TTS_INSTRUCTIONS ||
            OPENAI_TTS_INSTRUCTIONS_DEFAULT,
          response_format: 'mp3',
        }),
      });
      if (!response.ok) {
        // Never relay OpenAI's own error wording (request ids, quota hints).
        console.warn(`[realtime-speech] upstream HTTP ${response.status}`);
        await response.body?.cancel?.().catch(() => {});
        return fail(res, response.status, 'Speech request failed');
      }
      const audio = Buffer.from(await response.arrayBuffer());
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('X-GEV-Speech-Chars', String(text.length));
      res.end(audio);
    } catch {
      console.warn('[realtime-speech] request failed');
      fail(res, 502, 'Speech request failed');
    }
  };
}

export { createSpeechHandler, ttsVoice };
