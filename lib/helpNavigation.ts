const HQ_QUEUE_ROUTES = /\/(?:hq|overview|help)\/?$/;

type HelpQueueHrefInput = {
  pathname: string;
  staticDemo: boolean;
  token?: string | null;
};

export function canCarryHqTokenToHelp(pathname: string) {
  return HQ_QUEUE_ROUTES.test(pathname);
}

export function getHelpQueueHref({ pathname, staticDemo, token }: HelpQueueHrefInput) {
  const queueToken = staticDemo ? 'demo-hq' : canCarryHqTokenToHelp(pathname) ? token : null;
  return `/help${queueToken ? `?t=${encodeURIComponent(queueToken)}` : ''}`;
}
