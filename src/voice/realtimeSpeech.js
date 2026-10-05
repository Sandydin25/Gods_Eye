export const SPEECH_ENDPOINT = '/api/realtime/speech';

/**
 * Voices assistant replies in text-to-speech mode: each reply's text is sent
 * to the speech route and played in order. One reply plays at a time; a newer
 * user turn or a stopped session cancels whatever is queued or playing.
 */
export class RealtimeSpeech {
  constructor({
    endpoint = SPEECH_ENDPOINT,
    transport = (...args) => fetch(...args),
    operations,
  }) {
    Object.assign(this, { endpoint, transport }, operations);
    this.queue = [];
    this.playing = false;
    this.abort = null;
    this.audioEl = null;
    this.generation = 0;
  }

  get active() {
    return this.playing || this.queue.length > 0;
  }

  speak(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    this.queue.push(clean);
    if (!this.playing) this.playNext(this.generation);
  }

  async playNext(generation) {
    const text = this.queue.shift();
    if (text === undefined || generation !== this.generation) return;
    this.playing = true;
    this.abort = new AbortController();
    let url = null;
    try {
      const response = await this.transport(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: this.abort.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Speech failed: HTTP ${response.status}`);
      const blob = await response.blob();
      if (generation !== this.generation) return;
      this.recordSpeech(
        Number(response.headers.get('X-GEV-Speech-Chars')) || text.length,
      );
      url = URL.createObjectURL(blob);
      await this.play(url, generation);
    } catch (error) {
      if (generation === this.generation && error?.name !== 'AbortError') {
        this.debugLog('speech.failed', { error: error?.message || String(error) });
      }
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (generation === this.generation) {
        this.playing = false;
        this.abort = null;
        if (this.queue.length) this.playNext(generation);
        else this.onIdle();
      }
    }
  }

  play(url, generation) {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      this.audioEl = audio;
      const done = () => {
        audio.onended = audio.onerror = null;
        if (this.audioEl === audio) this.audioEl = null;
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio
        .play()
        .then(() => {
          if (generation !== this.generation) return audio.pause(), done();
          this.onPlaying(audio);
        })
        .catch(done);
      this.stopCurrent = () => {
        audio.pause();
        done();
      };
    });
  }

  /** Drop everything queued and silence the current reply. */
  cancel() {
    const wasActive = this.active;
    this.generation++;
    this.queue = [];
    this.abort?.abort();
    this.abort = null;
    this.stopCurrent?.();
    this.stopCurrent = null;
    this.playing = false;
    if (wasActive) this.onIdle();
  }
}
