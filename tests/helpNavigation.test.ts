import { describe, expect, it } from 'vitest';
import { canCarryHqTokenToHelp, getHelpQueueHref } from '../lib/helpNavigation';

describe('help queue navigation', () => {
  it('keeps the href as a simple Next internal route so basePath is not doubled', () => {
    expect(getHelpQueueHref({ pathname: '/smartyouth/booth/1', staticDemo: true, token: 'demo-booth-1' })).toBe(
      '/help'
    );
  });

  it('does not carry any token into the help queue on live routes', () => {
    expect(getHelpQueueHref({ pathname: '/booth/1', staticDemo: false, token: 'booth-token' })).toBe('/help');
  });

  it('does not require help queue token carry from management pages', () => {
    expect(getHelpQueueHref({ pathname: '/smartyouth/hq/', staticDemo: false, token: 'hq-token' })).toBe('/help');
    expect(canCarryHqTokenToHelp('/smartyouth/overview')).toBe(false);
    expect(canCarryHqTokenToHelp('/smartyouth/booth/1')).toBe(false);
  });
});
