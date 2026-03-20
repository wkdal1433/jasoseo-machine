import { ipcMain, BrowserWindow, dialog } from 'electron'
import { readFileSync, readdirSync, unlinkSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc-channels'
import { bridgeServer } from './automation/bridge-server'
import {
  saveApplication,
  listApplications,
  getApplication,
  deleteApplication,
  updateApplicationStatus,
  saveCoverLetter,
  getCoverLetter,
  listCoverLettersByApp,
  updateCoverLetter,
  saveDraft,
  getDraft,
  deleteDraft,
  listDrafts,
  getEpisodeUsage,
  getSetting,
  setSetting,
  getUserProfile,
  saveUserProfile,
  listProfiles,
  switchProfile,
  createProfile,
  deleteProfile,
  renameProfile,
  duplicateProfile,
  listPatterns,
  savePattern,
  deletePattern,
  togglePattern,
  updatePatternAnalysis,
  getPatternSettings,
  savePatternSettings,
  saveExecutionHistory,
  getExecutionHistoryByStep
} from './db'
import {
  executeClaudePrompt,
  executeClaudeStream,
  cancelActiveProcess,
  cancelProcessById,
  testClaudeConnection,
  testGeminiConnection
} from './claude-bridge'

export function registerIpcHandlers(): void {
  Object.entries(IPC).forEach(([key, value]) => {
    if (value === undefined) console.error(`[IPC Error] Channel "${key}" is undefined!`);
  });

  const getProfileEpisodeDir = () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return null
    const profile = getUserProfile()
    if (!profile) return null
    const folderName = profile.id || 'default'
    const dir = join(projectDir, 'episodes', folderName)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }

  ipcMain.handle('maintenance:check-trash', () => {
    const projectDir = getSetting('project_dir') || ''
    const trashDir = join(projectDir, 'episodes', '.trash')
    if (!existsSync(trashDir)) return 0
    try {
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      return readdirSync(trashDir).filter(file => {
        try {
          return (now - require('fs').statSync(join(trashDir, file)).mtimeMs) > thirtyDaysMs
        } catch { return false }
      }).length
    } catch { return 0 }
  })

  ipcMain.handle('maintenance:empty-trash', () => {
    const projectDir = getSetting('project_dir') || ''
    const trashDir = join(projectDir, 'episodes', '.trash')
    if (!existsSync(trashDir)) return true
    try {
      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      readdirSync(trashDir).forEach(file => {
        const filePath = join(trashDir, file)
        try {
          if (now - require('fs').statSync(filePath).mtimeMs > thirtyDaysMs) unlinkSync(filePath)
        } catch { /* ignore */ }
      })
      return true
    } catch { return false }
  })

  const migrateFolderNaming = () => {
    const projectDir = getSetting('project_dir') || ''
    if (!projectDir) return
    const profiles = listProfiles()
    let changed = false
    profiles.forEach((p: any) => {
      if (p.id && p.name && !p.isMigrated) {
        const oldDir = join(projectDir, 'episodes', p.name)
        const newDir = join(projectDir, 'episodes', p.id)
        let success = false
        if (existsSync(oldDir) && !existsSync(newDir)) {
          try {
            renameSync(oldDir, newDir)
            if (existsSync(newDir)) success = true
          } catch { /* error */ }
        } else if (existsSync(newDir)) success = true
        if (success) {
          const fullProfile = (listProfiles() as any[]).find((prof: any) => prof.id === p.id)
          if (fullProfile) { fullProfile.isMigrated = true; changed = true; }
        }
      }
    })
    if (changed) saveUserProfile(getUserProfile())
  }
  migrateFolderNaming()

  ipcMain.handle(IPC.CLAUDE_EXECUTE, async (_event, options) => executeClaudePrompt(options))
  ipcMain.on(IPC.CLAUDE_EXECUTE_STREAM, (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) executeClaudeStream(options, window)
  })
  ipcMain.handle(IPC.CLAUDE_CANCEL, () => cancelActiveProcess())
  ipcMain.handle(IPC.CLAUDE_CANCEL_BY_ID, (_event, id: string) => cancelProcessById(id))
  ipcMain.handle(IPC.CLAUDE_CHECK_STATUS, async () => testClaudeConnection())

  ipcMain.handle(IPC.EPISODES_LOAD, () => {
    const dir = getProfileEpisodeDir()
    if (!dir) return []
    try {
      return readdirSync(dir).filter(f => f.endsWith('.md')).map(file => ({
        fileName: file, content: readFileSync(join(dir, file), 'utf-8')
      }))
    } catch { return [] }
  })

  ipcMain.handle(IPC.EPISODE_DELETE, (_event, fileName) => {
    const dir = getProfileEpisodeDir()
    if (!dir) return false
    try {
      const trashDir = join(dir, '.trash')
      if (!existsSync(trashDir)) mkdirSync(trashDir, { recursive: true })
      renameSync(join(dir, fileName), join(trashDir, `${Date.now()}_${fileName}`))
      return true
    } catch { return false }
  })

  ipcMain.handle(IPC.EPISODE_SAVE_FILE, (_event, fileName, content) => {
    const dir = getProfileEpisodeDir()
    if (!dir) return false
    try {
      writeFileSync(join(dir, fileName), content, 'utf-8')
      return true
    } catch { return false }
  })
if (IPC.EPISODE_SUGGEST_IDEAS) {
  ipcMain.handle(IPC.EPISODE_SUGGEST_IDEAS, async () => {
    const { EpisodeInterviewer } = await import('./automation/episode-interviewer')
    const interviewer = new EpisodeInterviewer()
    try {
      const profile = getUserProfile()
      if (!profile) throw new Error('User profile not found.')

      // [v21.3 Optimized] 기존 에피소드 목록 읽기
      const dir = getProfileEpisodeDir()
      let existingTitles: string[] = []
      if (dir && existsSync(dir)) {
        existingTitles = readdirSync(dir).filter(f => f.endsWith('.md'))
      }

        const aiResponse = await executeClaudePrompt({
          prompt: interviewer.buildIdeaSuggestionPrompt(profile, existingTitles),
          outputFormat: 'json',
          maxTurns: 5,
          modelOverride: getSetting('model_ep_ep_suggest') || undefined
        })

        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('AI response invalid.')
        return { success: true, data: JSON.parse(jsonMatch[0]).ideas }
      } catch (error: any) { return { success: false, error: error.message } }
    })
  }

  ipcMain.handle(IPC.APP_SAVE, (_event, app) => {
    if (!getUserProfile()) return { success: false, error: '프로필이 없습니다.' }
    saveApplication(app); return { success: true }
  })
  ipcMain.handle(IPC.APP_LIST, () => listApplications())
  ipcMain.handle(IPC.APP_GET, (_event, id) => getApplication(id))
  ipcMain.handle(IPC.APP_DELETE, (_event, id) => { deleteApplication(id); return true })
  ipcMain.handle(IPC.APP_UPDATE_STATUS, (_event, id, status, note) => { updateApplicationStatus(id, status, note); return true })

  ipcMain.handle(IPC.CL_SAVE, (_event, cl) => { saveCoverLetter(cl); return true })
  ipcMain.handle(IPC.CL_GET, (_event, id) => getCoverLetter(id))
  ipcMain.handle(IPC.CL_LIST_BY_APP, (_event, applicationId) => listCoverLettersByApp(applicationId))
  ipcMain.handle(IPC.CL_UPDATE, (_event, id, updates) => { updateCoverLetter(id, updates); return true })

  ipcMain.handle(IPC.DRAFT_SAVE, (_event, id, state) => { saveDraft(id, JSON.stringify(state)); return true })
  ipcMain.handle(IPC.DRAFT_GET, (_event, id) => getDraft(id))
  ipcMain.handle(IPC.DRAFT_DELETE, (_event, id) => { deleteDraft(id); return true })
  ipcMain.handle(IPC.DRAFT_LIST, () => listDrafts())

  ipcMain.handle(IPC.EPISODE_USAGE, (_event, id) => getEpisodeUsage(id))
  ipcMain.handle(IPC.SETTINGS_GET, (_event, key) => getSetting(key))
  ipcMain.handle(IPC.SETTINGS_SET, (_event, key, value) => { setSetting(key, value); return true })
  ipcMain.handle(IPC.SETTINGS_TEST_CLI, async () => testClaudeConnection())
  ipcMain.handle(IPC.SETTINGS_TEST_GEMINI, async () => testGeminiConnection())

  ipcMain.handle(IPC.USER_PROFILE_GET, () => getUserProfile())
  ipcMain.handle('user-profile:get-sync', () => getUserProfile())
  ipcMain.handle(IPC.USER_PROFILE_SAVE, (_event, profile) => { saveUserProfile(profile); return true })
  ipcMain.handle(IPC.USER_PROFILES_LIST, () => listProfiles())
  ipcMain.handle(IPC.USER_PROFILE_SWITCH, (_event, id) => { switchProfile(id); return true })
  ipcMain.handle(IPC.USER_PROFILE_CREATE, (_event, name) => createProfile(name))
  ipcMain.handle(IPC.USER_PROFILE_DELETE, (_event, id) => {
    const projectDir = getSetting('project_dir') || ''
    const deletedId = deleteProfile(id)
    if (deletedId && projectDir) {
      const sourceDir = join(projectDir, 'episodes', deletedId)
      if (existsSync(sourceDir)) {
        const trashDir = join(projectDir, 'episodes', '.trash', `deleted_profile_${deletedId}_${Date.now()}`)
        if (!existsSync(join(projectDir, 'episodes', '.trash'))) mkdirSync(join(projectDir, 'episodes', '.trash'), { recursive: true })
        try { renameSync(sourceDir, trashDir) } catch { /* ignore */ }
      }
    }
    return true
  })

  ipcMain.handle(IPC.USER_PROFILE_RENAME, (_event, id, newName) => { renameProfile(id, newName); return true })

  ipcMain.handle(IPC.USER_PROFILE_DUPLICATE, (_event, id) => { return duplicateProfile(id) })

  ipcMain.handle(IPC.ANALYZE_FORM_STRUCTURE, async (_event, html) => {
    const { FormAnalyzer } = await import('./automation/form-analyzer')
    const analyzer = new FormAnalyzer()
    try {
      const profile = getUserProfile()
      if (!profile) throw new Error('프로필이 없습니다.')
      const aiResponse = await executeClaudePrompt({ prompt: analyzer.buildBatchPrompt(html, profile), outputFormat: 'json', maxTurns: 5, modelOverride: getSetting('model_ep_form_analyze') || undefined })
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 응답이 올바르지 않습니다.')
      const result = JSON.parse(jsonMatch[0])
      return { success: true, data: { ...result, script: analyzer.wrapWithEventSimulator(result.script) } }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle(IPC.ANALYZE_COMPANY, async (_event, name, date, additionalContext?: string) => {
    const { CompanyAnalyst } = await import('./automation/company-analyst')
    const analyst = new CompanyAnalyst()
    try {
      const query = analyst.buildSearchQuery(name, date, additionalContext)
      const aiResponse = await executeClaudePrompt({ prompt: analyst.buildAnalysisPrompt(name, `[Search for ${query}]`, date, additionalContext), outputFormat: 'json', maxTurns: 5, modelOverride: getSetting('model_ep_company_analyze') || undefined })
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 분석 실패')
      let result = JSON.parse(jsonMatch[0])
      if (result.foundLinks) {
        const validated = await Promise.all(result.foundLinks.map(async (l: any) => {
          try {
            const res = await fetch(l.url, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
            return { ...l, isValid: res.ok }
          } catch { return { ...l, isValid: false } }
        }))
        result.foundLinks = validated.filter((l: any) => l.isValid)
      }
      return { success: true, data: result }
    } catch (error: any) { return { success: false, error: error.message } }
  })

  ipcMain.handle(IPC.ONBOARDING_PARSE_FILE, async (event, filePath) => {
    const { OnboardingAgent } = await import('./automation/onboarding-agent')
    const agent = new OnboardingAgent()
    const window = BrowserWindow.fromWebContents(event.sender)
    const sendProgress = (step: string, percent: number) => {
      window?.webContents.send(IPC.ONBOARDING_PROGRESS, { step, percent })
    }
    try {
      sendProgress('AI가 파일을 정독하기 시작했습니다...', 10)

      // 파일 경로인지 텍스트 내용인지 판별
      // 절대경로 + 파일이 실제로 존재하면 → 파일 경로 모드 (PDF용)
      // 그 외(텍스트 내용 문자열) → 콘텐츠 모드 (MD/TXT용)
      const isFilePath = require('path').isAbsolute(filePath) && existsSync(filePath)
      const aiResponse = await executeClaudePrompt({
        prompt: isFilePath
          ? agent.buildExtractionPrompt(filePath)
          : agent.buildExtractionPromptFromContent(filePath),
        outputFormat: 'json',
        maxTurns: 10,
        filePath: isFilePath ? filePath : undefined,
        modelOverride: getSetting('model_ep_onboarding_parse') || undefined
      })
      
      sendProgress('핵심 데이터를 추출하여 구조화하고 있습니다...', 50)
      
      // [v20.8 개선] AI가 JSON을 여러 번 출력할 때 마지막 완전한 JSON만 추출
      // (첫번째 초안 → 수정본 → 추론텍스트 순으로 출력될 경우 마지막 것만 사용)
      const extractLastJSON = (text: string): string => {
        // 마지막 } 위치에서 역방향으로 중괄호를 추적해 완전한 JSON 범위 탐색
        let end = -1;
        for (let i = text.length - 1; i >= 0; i--) {
          if (text[i] === '}') { end = i; break; }
        }
        if (end === -1) return '';
        let depth = 0, start = -1;
        for (let i = end; i >= 0; i--) {
          if (text[i] === '}') depth++;
          else if (text[i] === '{') { depth--; if (depth === 0) { start = i; break; } }
        }
        return start !== -1 ? text.slice(start, end + 1) : '';
      };

      const jsonStr = extractLastJSON(aiResponse);
      if (!jsonStr) {
        console.error('[AI Raw Output Error]:', aiResponse);
        throw new Error('AI 응답에서 유효한 JSON 데이터를 찾을 수 없습니다.');
      }

      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (err) {
        console.error('[JSON Parse Error]:', jsonStr);
        throw new Error('추출된 데이터의 형식이 올바르지 않습니다.');
      }
      
      sendProgress('데이터 무결성 및 팩트 체크를 진행 중입니다...', 80)
      sendProgress('분석이 모두 완료되었습니다! 결과표를 구성합니다.', 100)
      return { success: true, data: result }
    } catch (error: any) { 
      return { success: false, error: error.message } 
    }
  })

  ipcMain.handle(IPC.BRIDGE_GET_INFO, () => {
    return { port: getSetting('bridge_port') || '12345', secret: bridgeServer.getSecret() }
  })
  ipcMain.handle(IPC.BRIDGE_SET_ANSWERS, (_event, answers) => {
    bridgeServer.setPendingAnswers(answers); return true
  })
  ipcMain.handle(IPC.BRIDGE_GET_EMPTY_FIELDS, () => bridgeServer.getEmptyFieldsReport())
  ipcMain.handle(IPC.BRIDGE_PEEK_QUESTIONS, () => bridgeServer.peekExtractedQuestions())
  ipcMain.handle(IPC.BRIDGE_CLEAR_QUESTIONS, () => { bridgeServer.clearExtractedQuestions(); return true })

  ipcMain.handle(IPC.FS_READ_MD, (_event, path) => { try { return readFileSync(path, 'utf-8') } catch { return null } })

  ipcMain.handle(IPC.FS_SELECT_FILE, async (event, filters) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      title: '자소서 파일 선택',
      filters: filters || [
        { name: '자소서 파일', extensions: ['pdf', 'md', 'txt'] }
      ]
    })
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.FS_SELECT_DIR, async (event) => {

    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'], title: '폴더 선택' })
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0]
  })

  // URL 자동 수집 (스마트 자동완성)
  ipcMain.handle(IPC.WEB_FETCH_URL, async (_event, url: string) => {
    let win: any = null
    try {
      const { BrowserWindow } = await import('electron')

      // 숨겨진 BrowserWindow로 JS 렌더링 후 텍스트 추출 (SPA 대응)
      win = new BrowserWindow({
        show: false,
        width: 1280,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          javascript: true
        }
      })

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), 15000) // 최대 15초 대기
        win.webContents.on('did-finish-load', () => { clearTimeout(timeout); resolve() })
        win.webContents.on('did-fail-load', (_: any, code: number, desc: string, _url: string, isMainFrame: boolean) => {
          if (!isMainFrame) return // 서브프레임 오류 무시
          if (code === -3) return  // ERR_ABORTED (리다이렉트) 무시 — did-finish-load 계속 대기
          clearTimeout(timeout)
          reject(new Error(`페이지 로드 실패: ${desc}`))
        })
        win.loadURL(url, {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
      })

      // SPA 렌더링 완료까지 폴링 (최대 10초, 500ms 간격)
      // 2단계 추출: Stage1(DOM 구조 기반) → Stage2(AI 정제)
      let extractedJson = ''
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const result: string = await win.webContents.executeJavaScript(`
          (function() {
            try {
              var structuredQuestions = [];
              var allText = '';

              // ── 탐색 대상: 메인 document + 접근 가능한 iframe ──────────────
              var docs = [document];
              try {
                document.querySelectorAll('iframe').forEach(function(iframe) {
                  try {
                    if (iframe.contentDocument && iframe.contentDocument.body) {
                      docs.push(iframe.contentDocument);
                    }
                  } catch(e) {} // cross-origin iframe은 건너뜀
                });
              } catch(e) {}

              // ── Stage1: textarea 앵커 기반 구조화 문항 추출 ────────────────
              docs.forEach(function(doc) {
                doc.querySelectorAll('textarea').forEach(function(ta) {
                  var label = '';
                  var charLimit = null;

                  // maxlength 속성에서 글자수 추출
                  var maxLen = ta.getAttribute('maxlength');
                  if (maxLen) charLimit = parseInt(maxLen);
                  var dataMax = ta.dataset && (ta.dataset.maxlength || ta.dataset.max || ta.dataset.limit);
                  if (dataMax && !charLimit) charLimit = parseInt(dataMax);

                  // label[for=id] 방식
                  var id = ta.id || ta.name;
                  if (id) {
                    var lbl = doc.querySelector('label[for="' + id + '"]');
                    if (lbl) label = lbl.innerText.trim();
                  }

                  // 부모 컨테이너에서 label 텍스트 추출
                  if (!label) {
                    var parent = ta.closest('.form-item, .input-wrap, .cover-item, .apply-item, .question-item, .essay-wrap, .essay-item, .cover-area, li, tr, dl');
                    if (!parent && ta.parentElement) parent = ta.parentElement.parentElement;
                    if (parent) {
                      var clone = parent.cloneNode(true);
                      clone.querySelectorAll('textarea, input, button, .byte, .count, .limit, .byte-wrap, .guide, .tip, .info, small').forEach(function(el) { el.remove(); });
                      var txt = clone.innerText.replace(/\\s+/g, ' ').trim();
                      // 순수 숫자/byte 안내문이 아닌 경우만 label로 사용
                      if (txt && txt.length > 3 && !/^[\\d,\\s자바이트byte%()]+$/.test(txt)) {
                        label = txt.slice(0, 300);
                      }
                    }
                  }

                  if (label && label.length > 3) {
                    structuredQuestions.push({ label: label.trim(), charLimit: charLimit });
                  }
                });
              });

              // ── Stage1 보완: contenteditable div 기반 (일부 공공기관 포털) ──
              if (structuredQuestions.length === 0) {
                docs.forEach(function(doc) {
                  doc.querySelectorAll('[contenteditable="true"]').forEach(function(div) {
                    var parent = div.closest('.question-wrap, .essay-item, .cover-item, li, tr, div');
                    if (parent) {
                      var clone = parent.cloneNode(true);
                      clone.querySelectorAll('[contenteditable]').forEach(function(el) { el.remove(); });
                      var label = clone.innerText.replace(/\\s+/g, ' ').trim();
                      if (label && label.length > 3) {
                        structuredQuestions.push({ label: label.slice(0, 300), charLimit: null });
                      }
                    }
                  });
                });
              }

              // ── 공통: 노이즈 제거 후 전체 텍스트 추출 (회사명·직무 파악용) ──
              docs.forEach(function(doc) {
                var body = doc.body ? doc.body.cloneNode(true) : null;
                if (!body) return;
                body.querySelectorAll([
                  'script','style','noscript','nav','header','footer','aside',
                  '.gnb','.lnb','.snb','.header','.footer','.sidebar',
                  '.advertisement','.banner','.popup','.modal-backdrop',
                  '[class*="nav"]','[class*="header"]','[class*="footer"]',
                  '[id*="nav"]','[id*="header"]','[id*="footer"]'
                ].join(',')).forEach(function(el) { el.remove(); });
                var t = body.innerText.replace(/\\s{3,}/g, '\\n').trim();
                if (t.length > allText.length) allText = t;
              });

              return JSON.stringify({
                mode: structuredQuestions.length > 0 ? 'structured' : 'fallback',
                questions: structuredQuestions,
                text: allText   // 길이 제한 없음
              });
            } catch(e) {
              return JSON.stringify({
                mode: 'error',
                questions: [],
                text: document.body ? document.body.innerText.slice(0, 30000) : ''
              });
            }
          })()
        `)
        const parsed = JSON.parse(result)
        if (parsed.text.replace(/\s/g, '').length > 300 || parsed.questions.length > 0) {
          extractedJson = result
          break
        }
      }

      if (!extractedJson) throw new Error('페이지 콘텐츠를 불러오지 못했습니다. 직접 입력 모드를 이용해 주세요.')

      const extracted = JSON.parse(extractedJson)
      const pageText = (extracted.text || '').replace(/\s{3,}/g, '\n').trim()

      // ── Stage2: 추출 결과에 따라 프롬프트 분기 ────────────────────────────
      let prompt: string
      if (extracted.mode === 'structured' && extracted.questions.length > 0) {
        // 문항을 DOM에서 직접 찾은 경우 → AI는 회사명/직무만 추출
        const qList = extracted.questions
          .map((q: any, i: number) => `${i + 1}. "${q.label}"${q.charLimit ? ` (${q.charLimit}자)` : ''}`)
          .join('\n')
        prompt = `다음은 채용공고 페이지에서 추출한 정보입니다. JSON 형식으로 정리해주세요.

[자소서 문항 목록 — DOM에서 직접 추출됨, 수정 금지]
${qList}

[페이지 텍스트 — 회사명·직무명 파악용]
${pageText.slice(0, 8000)}

## 출력 규칙 (반드시 준수)
1. 순수 JSON만 출력 (마크다운 코드블록 금지)
2. questions 배열은 위 [자소서 문항 목록]을 그대로 사용 (추가·수정·삭제 금지)
3. charLimit은 정수 또는 null (텍스트 형태 금지)
4. jobs 배열에 각 직무를 별개 객체로 분리

## 출력 예시
{"companyName":"현대자동차","jobs":[{"jobTitle":"SW개발","jobPosting":"...요약...","questions":[{"question":"지원동기를 서술하시오","charLimit":800},{"question":"본인의 강점을 기술하시오","charLimit":500}]}]}`
      } else {
        // 문항 DOM을 못 찾은 경우 → AI가 전체 텍스트에서 추출
        prompt = `다음은 채용공고 페이지의 텍스트입니다. JSON 형식으로 정보를 추출해주세요.

[페이지 텍스트]
${pageText}

## questions 필드 추출 규칙 (엄격 준수)
- 포함: 지원자에게 서술을 요청하는 질문 문장만 (예: "지원동기를 서술하시오", "본인의 강점을 기술해 주세요")
- 제외: "최대 N자", "공백 포함", "N바이트 이내", "필수 입력", 버튼 텍스트, 섹션 제목
- charLimit: 숫자만 (예: 500). 없으면 null. 절대 "500자" 형태 금지

## 출력 규칙
1. 순수 JSON만 출력 (마크다운 코드블록 금지)
2. jobs 배열에 각 직무를 별개 객체로 분리 (여러 직무를 하나로 합치지 말 것)

## 출력 예시
{"companyName":"현대자동차","jobs":[{"jobTitle":"SW개발","jobPosting":"...요약...","questions":[{"question":"지원동기를 서술하시오","charLimit":800},{"question":"성장과정을 기술하시오","charLimit":500}]},{"jobTitle":"HW개발","jobPosting":"...요약...","questions":[]}]}`
      }

      const aiResponse = await executeClaudePrompt({ prompt, outputFormat: 'json', maxTurns: 3, modelOverride: getSetting('model_ep_web_fetch') || undefined })
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 분석 실패')
      const parsed = JSON.parse(jsonMatch[0])

      // 정규화: 모델마다 다른 응답 형식 통일
      // 케이스1: jobs 배열이 없고 구형식(jobTitle/jobPosting)으로 온 경우
      if (!parsed.jobs && (parsed.jobTitle || parsed.jobPosting)) {
        parsed.jobs = [{
          jobTitle: parsed.jobTitle || '',
          jobPosting: parsed.jobPosting || '',
          questions: parsed.questions || []
        }]
      }
      // 케이스2: jobs가 배열이 아닌 경우
      if (parsed.jobs && !Array.isArray(parsed.jobs)) {
        parsed.jobs = [parsed.jobs]
      }
      // 케이스3: jobs[0].jobTitle이 여러 직무를 줄바꿈/슬래시로 합친 경우 분리
      if (Array.isArray(parsed.jobs) && parsed.jobs.length === 1) {
        const title = parsed.jobs[0].jobTitle || ''
        const splitTitles = title.split(/\n|\/|,|·/).map((t: string) => t.trim()).filter((t: string) => t.length > 1 && t.length < 60)
        if (splitTitles.length > 1) {
          parsed.jobs = splitTitles.map((t: string) => ({
            jobTitle: t,
            jobPosting: parsed.jobs[0].jobPosting || '',
            questions: parsed.jobs[0].questions || []
          }))
        }
      }

      return { success: true, data: parsed }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      if (win && !win.isDestroyed()) win.destroy()
    }
  })

  // 개발용 테스트 픽스처 로드
  ipcMain.handle(IPC.DEV_LOAD_FIXTURES, async () => {
    const projectDir = getSetting('project_dir')
    if (!projectDir) return { success: false, error: '프로젝트 디렉토리를 먼저 설정해주세요.' }
    try {
      const { FIXTURE_PROFILE, FIXTURE_EPISODES } = await import('./dev-fixtures')
      // 프로필 저장
      saveUserProfile({ ...FIXTURE_PROFILE, id: FIXTURE_PROFILE.id })
      // 에피소드 파일을 episodes/{profileId}/ 경로에 저장 (episodesLoad와 동일 경로)
      const episodeDir = join(projectDir, 'episodes', FIXTURE_PROFILE.id || 'default')
      if (!existsSync(episodeDir)) mkdirSync(episodeDir, { recursive: true })
      for (const ep of FIXTURE_EPISODES) {
        writeFileSync(join(episodeDir, ep.fileName), ep.content, 'utf-8')
      }
      return { success: true, episodeCount: FIXTURE_EPISODES.length }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // === Patterns ===
  ipcMain.handle(IPC.PATTERN_LIST, () => listPatterns())

  ipcMain.handle(IPC.PATTERN_SAVE, (_e, pattern) => {
    savePattern(pattern)
    return { success: true }
  })

  ipcMain.handle(IPC.PATTERN_DELETE, (_e, id: string) => {
    deletePattern(id)
    return { success: true }
  })

  ipcMain.handle(IPC.PATTERN_TOGGLE, (_e, id: string, isActive: boolean) => {
    togglePattern(id, isActive)
    return { success: true }
  })

  ipcMain.handle(IPC.PATTERN_SETTINGS_GET, () => getPatternSettings())

  ipcMain.handle(IPC.PATTERN_SETTINGS_SAVE, (_e, settings) => {
    savePatternSettings(settings)
    return { success: true }
  })

  // 패턴 AI 분석: 자소서 텍스트 → ExtractedPattern
  ipcMain.handle(IPC.PATTERN_ANALYZE, async (_e, id: string, coverLetterText: string) => {
    const prompt = `[자소서 패턴 분석 전문가]

다음 합격 자소서에서 서사 패턴을 추출해주세요.

[자소서 전문]:
"""
${coverLetterText}
"""

아래 JSON 형식으로 정확하게 반환하세요:
{
  "narrativeStructure": "두괄식/미괄식/문제해결형 등 구조 설명 (1-2문장)",
  "openingStyle": "도입부 패턴 요약 - 어떤 방식으로 시작하는지 (1-2문장, 실제 표현 스타일 포함)",
  "dualCodingKeywords": ["기업가치와 개인역량을 동시에 담은 핵심 키워드 5-8개"],
  "specificityLevel": "수치/기간/고유명사 활용 방식과 밀도 설명 (1-2문장)",
  "closingStyle": "마무리 패턴 - 어떻게 끝맺는지 (1-2문장)",
  "toneProfile": "formal/balanced/aggressive 중 하나 + 톤 특징 설명",
  "highlightExamples": ["S-P-A-A-R-L 구조가 잘 드러난 대표 문장 2-3개 (원문 그대로 발췌)"]
}`

    try {
      const response = await executeClaudePrompt({ prompt, outputFormat: 'json', maxTurns: 1, modelOverride: getSetting('model_ep_pattern_analyze') || undefined })
      const match = response.match(/\{[\s\S]*\}/)
      const extracted = match ? JSON.parse(match[0]) : null
      if (extracted) {
        updatePatternAnalysis(id, 'ready', extracted)
        return { success: true, extractedPattern: extracted }
      }
      throw new Error('파싱 실패')
    } catch (err: any) {
      updatePatternAnalysis(id, 'failed', null)
      return { success: false, error: err.message }
    }
  })

  // === Execution History (v2) ===
  ipcMain.handle(IPC.EXECUTION_HISTORY_SAVE, (_e, record: { step: string; model: string; durationSecs: number; charLimit?: number }) => {
    saveExecutionHistory(record)
    return { success: true }
  })

  ipcMain.handle(IPC.EXECUTION_HISTORY_GET, (_e, step: string, limit?: number) => {
    return getExecutionHistoryByStep(step, limit)
  })
}
