const definitions = [
  ['ai-web-summary', 'AI_WebSummary.user.js'],
  ['bangumi-enhanced', 'Bangumi_Enhanced.user.js'],
  ['github-releases', 'GitHubReleases_NavigationEnhancer.user.js'],
  ['iyuu-reseed-checker', 'IYUU_Reseed_Checker.user.js'],
  ['local-debug-loader', 'Local_Debug_Loader.user.js'],
  ['lounge-irc-translator', 'Lounge_IRC_Translator.user.js'],
  ['moviepilot-auto-login', 'Moviepilot_AutoLogin.user.js'],
  ['moviepilot-name-test', 'Moviepilot_NameTest.user.js'],
  ['nicept-replace-icon', 'NicePT_ReplaceIcon.user.js'],
  ['picix-card-actions', 'Picix_CardQuickActions.user.js'],
  ['pt-audit-assistant', 'PT_AuditAssistant.user.js'],
  ['pt-batch-download', 'PT_BatchDownload.user.js'],
  ['pt-one-click-claim', 'PT_OneClickClaim.user.js'],
  ['zhuque-batch-download', 'Zhuque_BatchDownload.user.js']
];

export const scripts = definitions.map(([id, output]) => ({
  id,
  sourceDir: `src/scripts/${id}`,
  entry: 'index.js',
  metadata: 'meta.js',
  output
}));
