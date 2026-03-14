export const IPC = {
  // Claude CLI
  CLAUDE_EXECUTE: 'claude:execute',
  CLAUDE_EXECUTE_STREAM: 'claude:execute-stream',
  CLAUDE_STREAM_CHUNK: 'claude:stream-chunk',
  CLAUDE_STREAM_END: 'claude:stream-end',
  CLAUDE_STREAM_ERROR: 'claude:stream-error',
  CLAUDE_CANCEL: 'claude:cancel',
  CLAUDE_CHECK_STATUS: 'claude:check-status',
  CLAUDE_RAW_LOG: 'claude:raw-log',

  // Episodes
  EPISODES_LOAD: 'episodes:load',
  EPISODES_RELOAD: 'episodes:reload',
  EPISODES_CHANGED: 'episodes:changed',
  EPISODE_DELETE: 'episodes:delete',
  EPISODE_SAVE_FILE: 'episodes:save-file',
  EPISODE_SUGGEST_IDEAS: 'episodes:suggest-ideas',

  // Applications
  APP_SAVE: 'app:save',
  APP_LIST: 'app:list',
  APP_GET: 'app:get',
  APP_DELETE: 'app:delete',
  APP_UPDATE_STATUS: 'app:update-status',

  // Cover Letters
  CL_SAVE: 'cl:save',
  CL_GET: 'cl:get',
  CL_UPDATE: 'cl:update',

  // Drafts
  DRAFT_SAVE: 'draft:save',
  DRAFT_GET: 'draft:get',
  DRAFT_DELETE: 'draft:delete',
  DRAFT_LIST: 'draft:list',

  // Episode Usage
  EPISODE_USAGE: 'episode:usage',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_TEST_CLI: 'settings:test-cli',
  SETTINGS_TEST_GEMINI: 'settings:test-gemini',

  // File system
  FS_READ_MD: 'fs:read-md',
  FS_SELECT_DIR: 'fs:select-dir',
  FS_SELECT_FILE: 'fs:select-file',
  FS_PARSE_PDF: 'fs:parse-pdf',

  // User Profile
  USER_PROFILE_GET: 'user-profile:get',
  USER_PROFILE_SAVE: 'user-profile:save',
  USER_PROFILES_LIST: 'user-profiles:list',
  USER_PROFILE_SWITCH: 'user-profile:switch',
  USER_PROFILE_CREATE: 'user-profile:create',
  USER_PROFILE_DELETE: 'user-profile:delete',

  // Automation
  ANALYZE_FORM_STRUCTURE: 'analyze-form-structure',
  ANALYZE_COMPANY: 'analyze-company',
  ONBOARDING_PARSE_FILE: 'onboarding:parse-file',
  ONBOARDING_PROGRESS: 'onboarding:progress',

  // Bridge (v20.0)
  BRIDGE_GET_INFO: 'bridge:get-info',
  BRIDGE_SET_SCRIPT: 'bridge:set-script',
  BRIDGE_GET_EMPTY_FIELDS: 'bridge:get-empty-fields',

  // Web Fetch (URL 자동 수집)
  WEB_FETCH_URL: 'web:fetch-url',

  // Dev / Testing
  DEV_LOAD_FIXTURES: 'dev:load-fixtures',
  FS_CHECK_TRASH: 'fs:check-trash',
  FS_EMPTY_TRASH: 'fs:empty-trash'
} as const

export type IPCChannel = (typeof IPC)[keyof typeof IPC]
