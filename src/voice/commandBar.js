const CONNECT_TIMEOUT_MS = 20_000;

/** True when keyboard focus is somewhere the user is typing. */
function isEditable(target) {
  return Boolean(
    target?.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName),
  );
}

/**
 * The typed AI command bar: a text box (dictation tools such as Wispr Flow
 * type straight into it) that sends each command to the agent session in text
 * mode — no microphone — and shows the reply underneath.
 */
export function createCommandBar({ session }) {
  document.getElementById('gev-command-bar')?.remove();
  const root = document.createElement('form');
  root.id = 'gev-command-bar';
  root.hidden = true;
  root.autocomplete = 'off';
  root.dataset.state = 'idle';
  root.innerHTML = `
    <div class="gev-command-row">
      <span class="gev-command-kicker">AI</span>
      <input id="gev-command-input" type="text" spellcheck="false"
        placeholder="Ask or command… e.g. fly to 13725 W 31st Ave, Golden CO"
        aria-label="Type a command for the AI agent" />
      <button class="gev-command-send" type="submit" aria-label="Send command">SEND</button>
      <button class="gev-command-close" type="button" aria-label="Close command bar">✕</button>
    </div>
    <div class="gev-command-log" aria-live="polite">
      <div class="gev-command-you"></div>
      <div class="gev-command-reply"></div>
    </div>
  `;
  document.body.appendChild(root);
  const input = root.querySelector('#gev-command-input');
  const you = root.querySelector('.gev-command-you');
  const reply = root.querySelector('.gev-command-reply');
  let replyId = null;

  const setState = (state) => {
    root.dataset.state = state;
  };
  const showReply = (text, { append = false } = {}) => {
    reply.textContent = append ? reply.textContent + text : text;
    root.classList.toggle('has-log', Boolean(you.textContent || reply.textContent));
  };

  function open() {
    root.hidden = false;
    input.focus();
    input.select();
  }
  function close() {
    root.hidden = true;
    input.blur();
  }

  /** Resolve once the session can take a command, starting it if needed. */
  function ensureConnected() {
    const ready = () => ['listening', 'executing'].includes(session.state);
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        done();
        reject(new Error('The AI agent took too long to connect'));
      }, CONNECT_TIMEOUT_MS);
      const unsubscribe = session.subscribe((event) => {
        if (event.type !== 'state') return;
        if (ready()) {
          done();
          resolve();
        } else if (event.state === 'error') {
          done();
          reject(new Error(event.detail || 'The AI agent could not connect'));
        }
      });
      function done() {
        clearTimeout(timer);
        unsubscribe();
      }
      if (session.state !== 'connecting')
        void session.start({ textOnly: true });
    });
  }

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    you.textContent = text;
    showReply('Connecting…');
    setState('working');
    try {
      await ensureConnected();
      replyId = null;
      showReply('…');
      session.sendText(text);
    } catch (error) {
      setState('error');
      showReply(error.message || 'Could not send that command');
    }
  });

  const unsubscribe = session.subscribe((event) => {
    if (event.type === 'state') {
      if (event.state === 'error') {
        setState('error');
        showReply(event.detail || 'The AI agent stopped');
      } else if (event.state === 'executing') setState('working');
      else if (/rate limit/i.test(event.detail || '')) {
        setState('working');
        showReply(event.detail);
      }
      return;
    }
    if (event.type === 'transcript' && event.role === 'assistant') {
      if (event.final) {
        if (event.text) showReply(event.text);
        setState('idle');
      } else {
        // Stream the reply as it arrives; a new response starts a fresh line.
        const fresh = event.responseId && event.responseId !== replyId;
        if (fresh) replyId = event.responseId;
        showReply(event.delta ?? event.text ?? '', { append: !fresh });
      }
    }
    if (event.type === 'completion') setState('idle');
  });

  // Keys typed here belong to the command, not the map's shortcuts.
  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') close();
  });
  input.addEventListener('keyup', (event) => event.stopPropagation());
  root.querySelector('.gev-command-close').addEventListener('click', close);

  // "/" opens the bar from anywhere on the map.
  const slash = (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey)
      return;
    if (isEditable(event.target)) return;
    event.preventDefault();
    open();
  };
  document.addEventListener('keydown', slash);

  return {
    root,
    open,
    close,
    toggle: () => (root.hidden ? open() : close()),
    destroy() {
      unsubscribe();
      document.removeEventListener('keydown', slash);
      root.remove();
    },
  };
}
