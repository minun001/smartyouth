import { describe, expect, it } from 'vitest';
import { canCarryHqTokenToHelp, getHelpQueueHref } from '../lib/helpNavigation';

describe('help queue navigation', () => {
  it('keeps the href as a Next internal route so basePath is not doubled', () => {
    expect(getHelpQueueHref({ pathname: '/smartyouth/booth/1', staticDemo: true, token: 'demo-booth-1' })).toBe(
      '/help?t=demo-hq'
    );
  });

  it('does not carry a booth page token into the HQ help queue on live routes', () => {
    expect(getHelpQueueHref({ pathname: '/booth/1', staticDemo: false, token: 'booth-token' })).toBe('/help');
  });

  it('preserves HQ tokens from HQ-facing pages', () => {
    expect(getHelpQueueHref({ pathname: '/smartyouth/hq/', staticDemo: false, token: 'hq-token' })).toBe(
      '/help?t=hq-token'
    );
    expect(canCarryHqTokenToHelp('/smartyouth/overview')).toBe(true);
    expect(canCarryHqTokenToHelp('/smartyouth/booth/1')).toBe(false);
  });
});
