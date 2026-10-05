import { GevRealtimeController } from './realtimeController.js';

/** Adapt the existing WebRTC implementation to the common voice session. */
export function createRealtimeSession({
  emit,
  runAction,
  createController = (options) => new GevRealtimeController(options),
  ...options
}) {
  const controller = createController({
    ...options,
    actionExecutor: runAction,
    onSessionEvent: emit,
  });
  return {
    controller,
    capabilities: { costControls: true, pushToTalk: true },
    start: (settings) => controller.start(settings),
    stop: (settings) => controller.stop(settings),
    sendText: (text) => controller.sendTextCommand(text),
    sendMapEvent: (event) => controller.notifyMapEvent(event),
    ignoreButtonClick: () => Boolean(controller.spaceKeyHeld),
    bindControls({ pushToTalk = true } = {}) {
      if (controller.ui.tierButton) {
        controller.tierHandler = () => controller.toggleVoiceTier();
        controller.ui.tierButton.addEventListener(
          'click',
          controller.tierHandler,
        );
      }
      controller.syncCostUi();
      // Typed-command mode leaves Space alone: holding it must not open a mic.
      if (pushToTalk) controller.bindPushToTalkShortcut();
    },
  };
}
