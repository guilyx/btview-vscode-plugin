/** Capture host messages before React mounts (avoids lost loadDocument). */

const pending: unknown[] = [];
let handler: ((data: unknown) => void) | null = null;

function onMessage(event: MessageEvent): void {
  const data = event.data;
  if (handler) {
    handler(data);
  } else {
    pending.push(data);
  }
}

window.addEventListener('message', onMessage);

export function setHostMessageHandler(onHostMessage: (data: unknown) => void): void {
  handler = onHostMessage;
  for (const msg of pending) {
    onHostMessage(msg);
  }
  pending.length = 0;
}

export function clearHostMessageHandler(): void {
  handler = null;
}
