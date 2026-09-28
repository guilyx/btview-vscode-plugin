import { useState } from 'react';
import type { SerializedDocument } from '../types';
import { getState, patchState, postMessage } from '../vscodeApi';
import { ONBOARDING_STATE_KEY, ONBOARDING_TIPS, isOnboardingDismissed } from '../utils/onboarding';

/** Dismissible "getting started" card, shown until the user closes it once. */
export function FirstRunHint({ doc }: { doc: SerializedDocument }) {
  const [dismissed, setDismissed] = useState(() => isOnboardingDismissed(doc, getState()));

  if (dismissed || doc.onboardingDismissed) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    patchState({ [ONBOARDING_STATE_KEY]: true });
    postMessage({ type: 'dismissOnboarding' });
  };

  return (
    <section
      className="first-run-hint"
      role="region"
      aria-labelledby="btview-first-run-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          dismiss();
        }
      }}
    >
      <header className="first-run-hint-header">
        <h2 id="btview-first-run-title">Getting started with BTView</h2>
        <button
          type="button"
          className="first-run-hint-close"
          onClick={dismiss}
          aria-label="Dismiss getting started tips"
        >
          ×
        </button>
      </header>
      <ul>
        {ONBOARDING_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <button type="button" className="first-run-hint-ok" onClick={dismiss}>
        Got it
      </button>
    </section>
  );
}
