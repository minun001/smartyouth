type HelpQueueHrefInput = {
  pathname: string;
  staticDemo: boolean;
  token?: string | null;
};

export function canCarryHqTokenToHelp(pathname: string) {
  void pathname;
  return false;
}

export function getHelpQueueHref(input: HelpQueueHrefInput) {
  void input;
  return '/help';
}
