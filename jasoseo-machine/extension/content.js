(async function() {
  console.log('%c🧙‍♂️ Jasoseo Machine: Hands of God Active', 'color: #4f46e5; font-weight: bold;');

  // ── 진행 오버레이 ──────────────────────────────────────────────────
  let _overlay = null;
  let _progressBar = null;
  let _stepEl = null;
  let _countEl = null;
  let _detailEl = null;

  function createProgressOverlay() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    Object.assign(_overlay.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '2147483647',
      background: 'rgba(17,24,39,0.96)', color: '#f9fafb', borderRadius: '12px',
      padding: '14px 18px', minWidth: '230px', maxWidth: '280px',
      fontFamily: 'system-ui, sans-serif', fontSize: '13px', lineHeight: '1.5',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
      transition: 'opacity .3s',
    });
    _overlay.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:16px;">🧙</span>
        <span style="font-weight:700;font-size:13px;color:#a5b4fc;">자소서 머신</span>
      </div>
      <div id="jm-step" style="color:#e0e7ff;margin-bottom:6px;">준비 중...</div>
      <div style="background:#374151;border-radius:99px;height:6px;overflow:hidden;margin-bottom:6px;">
        <div id="jm-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:99px;transition:width .4s ease;"></div>
      </div>
      <div id="jm-count" style="color:#9ca3af;font-size:11px;"></div>
      <div id="jm-detail" style="color:#6b7280;font-size:10px;margin-top:2px;min-height:12px;"></div>
    `;
    document.body.appendChild(_overlay);
    _stepEl = _overlay.querySelector('#jm-step');
    _progressBar = _overlay.querySelector('#jm-bar');
    _countEl = _overlay.querySelector('#jm-count');
    _detailEl = _overlay.querySelector('#jm-detail');
  }

  function updateProgress(step, pct, count, detail) {
    if (!_overlay) createProgressOverlay();
    if (_stepEl) _stepEl.textContent = step;
    if (_progressBar) _progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    if (_countEl) _countEl.textContent = count || '';
    if (_detailEl) _detailEl.textContent = detail || '';
  }

  function finishProgress(success, summary) {
    if (!_overlay) return;
    if (_stepEl) _stepEl.textContent = success ? '✅ 완료' : '❌ 실패';
    if (_progressBar) _progressBar.style.width = '100%';
    if (_progressBar) _progressBar.style.background = success ? 'linear-gradient(90deg,#10b981,#34d399)' : '#ef4444';
    if (_countEl) _countEl.textContent = summary || '';
    if (_detailEl) _detailEl.textContent = '';
    setTimeout(() => { if (_overlay) { _overlay.style.opacity = '0'; setTimeout(() => { _overlay?.remove(); _overlay = null; }, 400); } }, 4000);
  }

  function destroyProgress() {
    if (_overlay) { _overlay.remove(); _overlay = null; }
  }

  // HMAC 서명 생성 헬퍼
  async function makeSignature(secret, body = {}) {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(7);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(`${timestamp}:${nonce}:${JSON.stringify(body)}`);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { timestamp, nonce, signature };
  }

  async function bridgePost(port, secret, path, body = {}) {
    const { timestamp, nonce, signature } = await makeSignature(secret, body);
    const response = await fetch(`http://localhost:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jasoseo-signature': signature,
        'x-jasoseo-timestamp': timestamp,
        'x-jasoseo-nonce': nonce
      },
      body: JSON.stringify(body)
    });
    return response.json();
  }

  async function bridgeGet(port, secret, path) {
    const { timestamp, nonce, signature } = await makeSignature(secret, {});
    const response = await fetch(`http://localhost:${port}${path}`, {
      method: 'GET',
      headers: {
        'x-jasoseo-signature': signature,
        'x-jasoseo-timestamp': timestamp,
        'x-jasoseo-nonce': nonce
      }
    });
    return response.json();
  }

  // ── 반복 섹션 행 확장 ──────────────────────────────────────────────
  // 섹션 키워드 매핑 (프로필 필드명 → 한국어 섹션 헤딩 키워드)
  const SECTION_KEYWORDS = {
    experience:    ['경력', '직장', '근무', '재직', '회사명'],
    education:     ['학력', '학교', '최종학력'],
    languages:     ['어학', '언어', '외국어', 'toeic', 'toefl', 'jlpt', 'ielts'],
    certificates:  ['자격', '자격증', '면허'],
    training:      ['교육', '훈련', '연수', '수료', '이수'],
    activities:    ['활동', '동아리', '봉사', '사회활동'],
    awards:        ['수상', '포상', '상훈'],
    overseas:      ['해외', '유학', '어학연수', '해외경험'],
    projects:      ['프로젝트', '과제', '연구'],
    computerSkills:['컴퓨터', '컴활', 'oa', 'ms office'],
  };

  // 버튼 기준으로 가장 가까운 섹션 헤딩 텍스트를 찾아 섹션 타입 반환
  function detectSectionType(btn) {
    const btnRect = btn.getBoundingClientRect();
    const headingSelectors = 'h1,h2,h3,h4,h5,th,caption,strong,b,[class*="title"],[class*="heading"],[class*="tit"],[class*="label"]';
    const headings = Array.from(document.querySelectorAll(headingSelectors));
    // 버튼보다 위에 있는 헤딩 중 가장 가까운 것
    let best = null, bestDist = Infinity;
    for (const h of headings) {
      const r = h.getBoundingClientRect();
      const dist = btnRect.top - r.bottom;
      if (dist >= 0 && dist < bestDist && r.width > 0) {
        bestDist = dist;
        best = h;
      }
    }
    if (!best) return null;
    const txt = best.textContent.toLowerCase().replace(/\s/g, '');
    for (const [type, keywords] of Object.entries(SECTION_KEYWORDS)) {
      if (keywords.some(kw => txt.includes(kw.replace(/\s/g, '')))) return type;
    }
    return null;
  }

  // 섹션 헤딩과 추가 버튼 사이의 현재 행 수 추정 (입력 필드 수 ÷ 예상 필드/행)
  function estimateCurrentRows(btn) {
    let container = btn.parentElement;
    for (let i = 0; i < 6 && container && container !== document.body; i++) {
      const inputs = container.querySelectorAll('input[type="text"],input[type="date"],select');
      if (inputs.length >= 3) return Math.max(1, Math.round(inputs.length / 4));
      container = container.parentElement;
    }
    return 1;
  }

  // Fill 전 구조 확장: 프로필 행 수에 맞게 추가 버튼 클릭
  async function expandSectionRows(port, secret) {
    let requirements = null;
    try {
      const res = await bridgeGet(port, secret, '/profile-section-requirements');
      if (res.success) requirements = res.requirements;
    } catch (e) {
      console.warn('[섹션 확장] requirements 조회 실패, 스킵:', e.message);
      return;
    }
    if (!requirements) return;

    const addBtns = Array.from(document.querySelectorAll('button,[role="button"]')).filter(btn => {
      if (btn.disabled) return false;
      const s = window.getComputedStyle(btn);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const t = btn.textContent.trim();
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      const cls = (btn.className || '').toLowerCase();
      return /추가|추가하기|행\s*추가|항목\s*추가|입력\s*추가/.test(t)
        || t === '+'
        || /추가|add/.test(aria)
        || (/add|plus|append/.test(cls) && t.length < 5);
    });

    // + 버튼 방식
    let expanded = false;
    const coveredSections = new Set();
    for (const btn of addBtns) {
      const sectionType = detectSectionType(btn);
      if (!sectionType || !requirements[sectionType]) continue;
      const needed = requirements[sectionType];
      const current = estimateCurrentRows(btn);
      const clicks = Math.max(0, needed - current);
      if (clicks === 0) { coveredSections.add(sectionType); continue; }

      console.log(`[섹션 확장] ${sectionType}: 현재 ${current}행 → 목표 ${needed}행 (${clicks}회 클릭)`);
      for (let i = 0; i < clicks; i++) {
        try { btn.click(); } catch (e) {}
        await waitForDomSettle(1000);
        await waitForNewFields(1500);
      }
      coveredSections.add(sectionType);
      expanded = true;
    }

    // save-button 방식: + 버튼 없는 섹션에서 저장 버튼 탐지
    // DOM 속성 대신 JS 배열로 반환 — React 리렌더 시 DOM 속성 유실 방지
    const detectedSaveSections = [];
    for (const [sectionType, needed] of Object.entries(requirements)) {
      if (coveredSections.has(sectionType) || needed <= 1) continue;
      // 해당 섹션 heading 찾기
      const headingSelectors = 'h1,h2,h3,h4,h5,th,caption,[class*="title"],[class*="tit"]';
      const headings = Array.from(document.querySelectorAll(headingSelectors));
      const keywords = SECTION_KEYWORDS[sectionType] || [];
      const sectionHeading = headings.find(h => {
        const t = h.textContent.toLowerCase().replace(/\s/g, '');
        return keywords.some(kw => t.includes(kw.replace(/\s/g, '')));
      });
      if (!sectionHeading) continue;

      // heading 기준 섹션 컨테이너 탐색 — LCA(heading, saveBtn)로 최소 범위로 좁힘
      // walk-up이 너무 높이 올라가 #resumeContainer 같은 전체 컨테이너가 되는 문제 방지
      let sectionRoot = sectionHeading.parentElement;
      let foundSaveBtn = null;
      for (let i = 0; i < 6 && sectionRoot && sectionRoot !== document.body; i++) {
        const saveBtn = findSectionSaveButton(sectionRoot);
        if (saveBtn) { foundSaveBtn = saveBtn; break; }
        sectionRoot = sectionRoot.parentElement;
      }
      if (!foundSaveBtn) continue;

      // LCA(sectionHeading, foundSaveBtn): 두 요소를 모두 포함하는 가장 작은 공통 조상
      // walk-up으로 너무 넓어진 sectionRoot를 정확한 섹션 경계로 좁힘
      const lcaAncestors = new Set();
      let lcaNode = sectionHeading;
      while (lcaNode && lcaNode !== document.body) { lcaAncestors.add(lcaNode); lcaNode = lcaNode.parentElement; }
      lcaNode = foundSaveBtn;
      while (lcaNode && lcaNode !== document.body) {
        if (lcaAncestors.has(lcaNode)) { sectionRoot = lcaNode; break; }
        lcaNode = lcaNode.parentElement;
      }

      console.log(`[Save-button 방식 감지] ${sectionType}: 저장 버튼 발견 — ${needed}항목 대기`);
      detectedSaveSections.push({ sectionType, sectionRoot, needed });
    }

    if (expanded) {
      console.log('[섹션 확장] 완료 — DOM 최종 정착 대기');
      await waitForDomSettle(500);
    }

    return detectedSaveSections; // fill 후 save-loop에서 사용
  }

  // ── Save-button 패턴 처리 ──────────────────────────────────────────────
  // 섹션 루트 내에서 저장 버튼 탐색 (전역 탐색 금지 — 오탐 방지)
  function findSectionSaveButton(sectionRoot) {
    const savePattern = /^저장$|^저장하기$|^등록$|^입력완료$|^추가완료$/;
    // 제출·접수·신청·확인 계열 + type="submit" 은 절대 클릭 안 함
    const excludePattern = /전체\s*저장|임시\s*저장|최종\s*저장|전체\s*확인|목록|취소|삭제|제출|지원|접수|신청|완료|확인/;
    const candidates = Array.from(sectionRoot.querySelectorAll('button,[role="button"]')).filter(btn => {
      if (btn.disabled) return false;
      if (btn.type === 'submit') return false; // 폼 제출 버튼 완전 차단
      const s = window.getComputedStyle(btn);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const t = btn.textContent.trim();
      return savePattern.test(t) && !excludePattern.test(t);
    });
    return candidates.length > 0 ? candidates[0] : null;
  }

  // 섹션 루트 탐색: 추가 버튼 기준으로 가장 가까운 섹션 컨테이너 반환
  function getSectionRoot(addBtn) {
    // 추가 버튼에서 최대 8레벨 위로 올라가며 충분히 큰 컨테이너 찾기
    let node = addBtn.parentElement;
    for (let i = 0; i < 8 && node && node !== document.body; i++) {
      const inputs = node.querySelectorAll('input, select, textarea');
      if (inputs.length >= 3) return node;
      node = node.parentElement;
    }
    return addBtn.closest('section, article, fieldset, [class*="section"], [class*="wrap"], [class*="area"]')
      || addBtn.parentElement;
  }

  // 저장 버튼 클릭 후 DOM 변화 2단계 대기 (엔지니어 권장)
  async function commitSectionRow(saveBtn) {
    saveBtn.click();
    await waitForDomSettle(1500);
    await waitForNewFields(2000);
  }

  // 섹션 루트에서 "마지막 행" 반환 — save-loop 저장 후 생성된 새 행 감지에 사용
  // [class*="row"] 제외: arrow/narrow 등 클래스명 오탐 방지
  function getLastRow(sectionRoot) {
    // `:scope >` — 직계 자식만 탐색하여 중첩된 wrapper의 오탐 방지
    const ROW_SELS = ['.form-row', '.field-row', '.repeat-item', '.list-item'];
    for (const sel of ROW_SELS) {
      try {
        const rows = Array.from(sectionRoot.querySelectorAll(`:scope > ${sel}`));
        if (rows.length > 0) return rows[rows.length - 1];
      } catch (_) {}
    }
    // tr: 직계 또는 table>tbody>tr 구조 모두 지원
    try {
      const trSearchRoots = [
        sectionRoot,
        sectionRoot.querySelector(':scope > table > tbody'),
        sectionRoot.querySelector(':scope > table'),
        sectionRoot.querySelector(':scope > tbody'),
      ].filter(Boolean);
      for (const el of trSearchRoots) {
        const dataTrs = Array.from(el.querySelectorAll(':scope > tr'))
          .filter(tr => tr.querySelectorAll('input, select').length > 0);
        if (dataTrs.length > 0) return dataTrs[dataTrs.length - 1];
      }
    } catch (_) {}
    // fallback 1: 직계 자식 중 input/select를 포함하는 마지막 자식
    const children = Array.from(sectionRoot.children)
      .filter(el => el.querySelectorAll('input, select').length > 0);
    if (children.length > 0) return children[children.length - 1];
    // fallback 2: sectionRoot 자체 반환 (단일 행 컨테이너)
    return sectionRoot;
  }

  // 섹션 내 현재 "데이터 행" 개수 반환 (getLastRow와 동일한 ROW_SELS 기준)
  // tr은 헤더/레이아웃 행 제외 — input/select 포함 여부로 데이터 행만 카운트
  function getExistingRowCount(sectionRoot) {
    const ROW_SELS = ['.form-row', '.field-row', '.repeat-item', '.list-item'];
    for (const sel of ROW_SELS) {
      try {
        const rows = sectionRoot.querySelectorAll(`:scope > ${sel}`);
        if (rows.length > 0) return rows.length;
      } catch (_) {}
    }
    // tr: 직계 또는 table>tbody>tr 구조 모두 지원
    // LCA로 sectionRoot가 좁혀진 경우, tr은 table>tbody 안에 있을 수 있음
    try {
      const trSearchRoots = [
        sectionRoot,                                               // :scope > tr
        sectionRoot.querySelector(':scope > table > tbody'),       // table>tbody>tr
        sectionRoot.querySelector(':scope > table'),               // table>tr
        sectionRoot.querySelector(':scope > tbody'),               // tbody>tr
      ].filter(Boolean);
      for (const el of trSearchRoots) {
        const dataTrs = Array.from(el.querySelectorAll(':scope > tr'))
          .filter(tr => tr.querySelectorAll('input, select').length > 0);
        if (dataTrs.length > 0) return dataTrs.length;
      }
    } catch (_) {}
    // fallback: 0 반환 — 파악 불가 시 루프를 실행하는 방향이 안전
    return 0;
  }

  // Save-button Sequential Fill-Save 루프
  // 설계 원칙:
  //   시작 전: 현재 행 개수 >= entries.length 이면 즉시 스킵 (재실행 중복 저장 방지)
  //   row 0 (메인 fill이 채운 첫 행): rowHasData(행 단위)로 저장 여부 판단
  //   row 1+ (AI가 채운 후속 행): rowDirty flag — 실제 변화가 있었을 때만 저장
  //   수집 범위: getLastRow(sectionRoot) — data-seen-before 의존 제거
  async function fillSaveLoop(sectionType, entries, sectionRoot, port, secret) {
    console.log(`[Save루프] ${sectionType}: ${entries.length}개 항목 처리 시작`);

    // ── 재실행 중복 저장 방지: 현재 행 개수 체크 ─────────────────────────
    // entries.length=2이고 현재 행이 이미 2개 이상이면 이전 실행이 완료된 것 → 스킵
    const existingCount = getExistingRowCount(sectionRoot);
    if (existingCount >= entries.length) {
      console.log(`[Save루프] ${sectionType}: 이미 ${existingCount}행 존재 (목표 ${entries.length}) — 재실행 스킵`);
      return;
    }
    console.log(`[Save루프] ${sectionType}: 현재 ${existingCount}행 → 목표 ${entries.length}행`);

    // ── row 0 직접 AI 채움 (메인 fill이 채우지 않는 섹션용) ──────────────
    // 설계 원칙: save-loop이 스스로 row 0을 채운 뒤 저장한다.
    //   메인 fill이 languages/training/awards를 인덱싱하지 않으므로
    //   row0HasData 체크는 항상 false → break 오류를 유발했음 (Bug C 근본 원인)
    let rowDirty = false;
    {
      const row0 = getLastRow(sectionRoot);
      const row0Fields = Array.from(row0.querySelectorAll('input, select')).filter(el => {
        if (el.getAttribute('data-seen-before')) return false;
        if (el.disabled || el.readOnly) return false;
        const s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
      });
      if (row0Fields.length > 0) {
        const idxEls = Array.from(document.querySelectorAll('[data-pfill-idx]'));
        let nextIdx = idxEls.length > 0
          ? Math.max(...idxEls.map(el => parseInt(el.getAttribute('data-pfill-idx') || '0'))) + 1
          : 0;
        const row0Meta = [];
        row0Fields.forEach(el => {
          const idx = nextIdx++;
          el.setAttribute('data-pfill-idx', idx);
          let label = '';
          if (el.id) { try { const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (lbl) label = lbl.textContent.trim(); } catch {} }
          if (!label) label = el.getAttribute('aria-label') || el.placeholder || '';
          if (!label) {
            let node = el.parentElement;
            for (let d = 0; d < 4 && node && node !== document.body; d++) {
              for (const child of node.children) {
                if (child.contains(el)) continue;
                const t = child.textContent.trim();
                if (t.length > 0 && t.length < 40) { label = t; break; }
              }
              if (label) break;
              node = node.parentElement;
            }
          }
          const meta = { idx, type: el.type || el.tagName.toLowerCase(), labelText: label, placeholder: el.placeholder || null };
          if (el.tagName === 'SELECT') {
            meta.options = Array.from(el.options)
              .filter(o => o.value && o.value !== '0' && o.value !== '-1')
              .map(o => `${o.text.trim()}(value=${o.value})`);
          }
          row0Meta.push(meta);
        });
        try {
          const fillRes0 = await bridgePost(port, secret, '/analyze-profile-fill', { inputs: row0Meta });
          if (fillRes0?.success && fillRes0.fills?.length > 0) {
            fillRes0.fills.forEach(({ idx, value }) => {
              if (value === null || value === undefined || value === '') return;
              const el = row0.querySelector(`[data-pfill-idx="${idx}"]`) || document.querySelector(`[data-pfill-idx="${idx}"]`);
              if (!el) return;
              if (el.type !== 'email' && el.type !== 'text' && el.tagName !== 'TEXTAREA' && String(value).includes('@')) return;
              if (el.type === 'number' && isNaN(Number(value))) return;
              if (isFieldSatisfied(el, value)) { console.log(`⏭️ [Save루프] row0 이미 채움 스킵: idx=${idx}`); return; }
              if (el.tagName === 'SELECT') {
                const opts = Array.from(el.options);
                const target = String(value).toLowerCase();
                const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target || o.text.trim().toLowerCase().includes(target));
                if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); rowDirty = true; console.log(`✅ [Save루프] ${sectionType} row0 채움: idx=${idx} → "${match.text.trim()}"`); }
              } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                let val = String(value).includes(',') ? String(value).split(',')[0].trim() : String(value);
                if (/^\d{4}-\d{2}$/.test(val)) val += '-01';
                val = val.slice(0, el.type === 'date' ? 10 : val.length);
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value');
                if (setter?.set) setter.set.call(el, val); else el.value = val;
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: val }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                rowDirty = true;
                console.log(`✅ [Save루프] ${sectionType} row0 채움: idx=${idx} → "${val}"`);
              }
            });
          }
        } catch(e) {
          console.warn(`[Save루프] ${sectionType}: row 0 AI 채움 실패:`, e.message);
        }
        console.log(`[Save루프] ${sectionType}: row 0 채움 완료 — rowDirty=${rowDirty}`);
      }
    }

    for (let i = 0; i < entries.length; i++) {
      if (i < entries.length - 1) {
        const saveBtn = findSectionSaveButton(sectionRoot);
        if (!saveBtn) {
          console.warn(`[Save루프] ${sectionType}: 저장 버튼 없음 — 루프 중단 (${i + 1}/${entries.length})`);
          logSkipped(`${sectionType}[row ${i}]`, '저장 버튼 탐지 실패');
          break;
        }

        // ── 저장 조건 판단 (rowDirty 단일 기준) ─────────────────────
        if (!rowDirty) {
          // AI fill 결과 변화 없음 → 이전 실행에서 이미 채워진 행
          console.log(`[Save루프] ${sectionType}: 행 ${i} 변화 없음 — 이전 실행 완료로 간주, 루프 중단`);
          break;
        }

        // ── 저장 실행 ────────────────────────────────────────────────
        markAllInputsAsSeen(); // waitForNewFields용 마킹 유지
        console.log(`[Save루프] ${sectionType}: 행 ${i + 1} 저장 → 새 행 대기`);
        await commitSectionRow(saveBtn);
        await waitForNewFields(2000);

        // ── 새 행 수집: getLastRow 기준 (data-seen-before 의존 제거) ──
        const newRow = getLastRow(sectionRoot);
        const newFields = Array.from(newRow.querySelectorAll('input, select')).filter(el => {
          if (el.getAttribute('data-seen-before')) return false; // seen-before는 waitForNewFields 호환용으로만 유지
          if (el.disabled || el.readOnly) return false;
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
        });

        if (newFields.length === 0) {
          console.warn(`[Save루프] ${sectionType}: 저장 후 새 행 미생성 — 루프 중단`);
          logFailed(`${sectionType}[row ${i}]`, 'save-loop', '저장 후 새 행 DOM 미생성');
          rowDirty = false;
          break;
        }
        console.log(`[Save루프] ${sectionType}: 새 행 확인됨 (${newFields.length}개 신규 필드) — AI 채움 시작`);

        // ── idx 할당 및 메타데이터 수집 ──────────────────────────────
        const existingIdxEls = Array.from(document.querySelectorAll('[data-pfill-idx]'));
        let nextIdx = existingIdxEls.length > 0
          ? Math.max(...existingIdxEls.map(el => parseInt(el.getAttribute('data-pfill-idx') || '0'))) + 1
          : 0;

        const newInputsMeta = [];
        newFields.forEach(el => {
          const idx = nextIdx++;
          el.setAttribute('data-pfill-idx', idx);
          let label = '';
          if (el.id) { try { const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (lbl) label = lbl.textContent.trim(); } catch {} }
          if (!label) label = el.getAttribute('aria-label') || el.placeholder || '';
          if (!label) {
            let node = el.parentElement;
            for (let d = 0; d < 4 && node && node !== document.body; d++) {
              for (const child of node.children) {
                if (child.contains(el)) continue;
                const t = child.textContent.trim();
                if (t.length > 0 && t.length < 40) { label = t; break; }
              }
              if (label) break;
              node = node.parentElement;
            }
          }
          const meta = { idx, type: el.type || el.tagName.toLowerCase(), labelText: label, placeholder: el.placeholder || null };
          if (el.tagName === 'SELECT') {
            meta.options = Array.from(el.options)
              .filter(o => o.value && o.value !== '0' && o.value !== '-1')
              .map(o => `${o.text.trim()}(value=${o.value})`);
          }
          newInputsMeta.push(meta);
        });

        if (newInputsMeta.length === 0) { rowDirty = false; continue; }

        // ── 새 행 AI fill → rowDirty 추적 ───────────────────────────
        rowDirty = false;
        try {
          const fillRes = await bridgePost(port, secret, '/analyze-profile-fill', { inputs: newInputsMeta });
          if (fillRes?.success && fillRes.fills?.length > 0) {
            fillRes.fills.forEach(({ idx, value }) => {
              if (value === null || value === undefined || value === '') return;
              // newRow 범위 내 필드만 (전체 document 검색 제거 — 오탐 방지)
              const el = newRow.querySelector(`[data-pfill-idx="${idx}"]`)
                || document.querySelector(`[data-pfill-idx="${idx}"]`);
              if (!el) return;
              // 타입 안전 가드: email 값은 email/text 필드에만 / NaN은 number 금지
              if (el.type !== 'email' && el.type !== 'text' && el.tagName !== 'TEXTAREA'
                  && String(value).includes('@')) {
                console.warn(`[Save루프] 타입 불일치 스킵: idx=${idx} type=${el.type} value="${value}"`);
                return;
              }
              if (el.type === 'number' && isNaN(Number(value))) {
                console.warn(`[Save루프] number 불일치 스킵: idx=${idx} value="${value}"`);
                return;
              }
              // 멱등성: 이미 올바른 값이면 스킵
              if (isFieldSatisfied(el, value)) {
                console.log(`⏭️ [Save루프] 이미 채움 스킵: idx=${idx} → "${value}"`);
                return;
              }
              if (el.tagName === 'SELECT') {
                const opts = Array.from(el.options);
                const target = String(value).toLowerCase();
                const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target || o.text.trim().toLowerCase().includes(target));
                if (match) {
                  el.value = match.value;
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                  logSuccess(`${sectionType}[row${i+1}][${idx}]`, 'select', match.text.trim());
                  rowDirty = true;
                }
              } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                let val = String(value).includes(',') ? String(value).split(',')[0].trim() : String(value);
                if (/^\d{4}-\d{2}$/.test(val)) val += '-01';
                val = val.slice(0, el.type === 'date' ? 10 : val.length);
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value');
                if (setter?.set) setter.set.call(el, val); else el.value = val;
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: val }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                logSuccess(`${sectionType}[row${i+1}][${idx}]`, el.type || 'input', val);
                rowDirty = true;
              }
              console.log(`✅ [Save루프] ${sectionType} 행${i + 2} 채움: idx=${idx} → "${value}"`);
            });
            console.log(`[Save루프] ${sectionType} 행${i + 2}: rowDirty=${rowDirty}`);
          }
        } catch(e) {
          console.warn(`[Save루프] ${sectionType} 행${i + 2} AI 채움 실패:`, e.message);
          rowDirty = false;
        }
      }
    }
  }


  // 프로필 필드 자동 매칭 — label/aria-label/placeholder/부모텍스트 다중 전략
  function fillProfileFields(profile) {
    if (!profile) return [];
    const p = profile.personal || {};
    const edu = (profile.education || [])[0] || {};
    const exp = (profile.experience || [])[0] || {};

    // [키워드 그룹] → 값 매핑 (프로필에 있는 모든 필드 커버)
    const fieldRules = [
      { keys: ['이름', '성명', '한글명', '한글이름', '성함'], value: p.name },
      { keys: ['생년월일', '생년', '출생일', 'birth'], value: p.birthDate },
      { keys: ['이메일', 'email', 'e-mail', 'e_mail', '메일'], value: p.email },
      { keys: ['휴대폰', '휴대전화', '핸드폰', '휴대번호', 'mobile', 'cell'], value: p.mobile },
      { keys: ['전화', '집전화', '전화번호', 'phone', 'tel'], value: p.phone || p.mobile },
      { keys: ['연락처'], value: p.mobile || p.phone },
      { keys: ['주소', 'address'], value: p.address },
      { keys: ['학교', '대학교', '학교명', '출신학교', '최종학교'], value: edu.name },
      { keys: ['전공', '학과', '학부', '주전공'], value: edu.major },
      { keys: ['학점', '평점', 'gpa', '성적'], value: edu.gpa },
      { keys: ['직장', '회사', '직전직장', '직전회사', '회사명'], value: exp.companyName },
      { keys: ['직무', '담당업무', '업무내용'], value: exp.jobCategory },
    ].filter(r => r.value);

    // 입력 요소의 라벨 텍스트를 여러 방법으로 가져오기
    function getLabelText(input) {
      // 1. <label for="id">
      if (input.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (lbl) return lbl.textContent.trim();
      }
      // 2. aria-label 속성
      const ariaLabel = input.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      // 3. placeholder
      if (input.placeholder) return input.placeholder;
      // 4. 부모 <label>
      let node = input.parentElement;
      while (node && node !== document.body) {
        if (node.tagName === 'LABEL') return node.textContent.replace(input.value || '', '').trim();
        node = node.parentElement;
      }
      // 5. 가까운 조상에서 짧은 텍스트 형제 탐색 (최대 4레벨)
      node = input.parentElement;
      for (let i = 0; i < 4 && node && node !== document.body; i++) {
        for (const child of node.children) {
          if (child.contains(input)) continue;
          const t = child.textContent.trim();
          if (t.length > 0 && t.length < 30 && !t.includes('\n')) return t;
        }
        node = node.parentElement;
      }
      return '';
    }

    // React/Vue 네이티브 setter로 값 주입
    function setNativeValue(input, value) {
      const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) setter.set.call(input, value);
      else input.value = value;
      ['input', 'change', 'blur'].forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
    }

    let filledCount = 0;
    const selectors = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])';
    document.querySelectorAll(selectors).forEach(input => {
      if (input.disabled || input.readOnly) return;
      const style = window.getComputedStyle(input);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (input.offsetWidth === 0) return;
      if (input.value) return; // 이미 채워진 필드는 건드리지 않음

      const rawLabel = getLabelText(input);
      if (!rawLabel) return;
      const label = rawLabel.toLowerCase().replace(/[\s\*\(\)\[\]]/g, '');

      const rule = fieldRules.find(r => r.keys.some(k => label.includes(k.replace(/\s/g, ''))));
      if (rule) {
        setNativeValue(input, rule.value);
        filledCount++;
        console.log(`✅ 프로필 채움: "${rawLabel}" → "${rule.value}"`);
      }
    });

    // Select 처리 — 키워드 매칭
    document.querySelectorAll('select').forEach(select => {
      if (select.disabled) return;
      const style = window.getComputedStyle(select);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const curVal = select.value;
      if (curVal && curVal !== '0' && curVal !== '-1') return;

      const rawLabel = getLabelText(select);
      if (!rawLabel) return;
      const label = rawLabel.toLowerCase().replace(/[\s\*\(\)\[\]]/g, '');

      const rule = fieldRules.find(r => r.keys.some(k => label.includes(k.replace(/\s/g, ''))));
      if (!rule) return;

      const target = String(rule.value).toLowerCase();
      const opts = Array.from(select.options);
      const match = opts.find(o =>
        o.value.toLowerCase() === target ||
        o.text.trim().toLowerCase() === target ||
        o.text.trim().toLowerCase().includes(target) ||
        target.includes(o.text.trim().toLowerCase()) && o.text.trim().length > 0
      );
      if (match) {
        select.value = match.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
        console.log(`✅ Select 채움: "${rawLabel}" → "${match.text.trim()}"`);
      }
    });

    // Date input 처리 — 키워드 매칭
    const dateRules = [
      { keys: ['생년월일', '출생일', 'birth'], value: p.birthDate },
    ].filter(r => r.value);

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (input.disabled || input.readOnly || input.value) return;
      const style = window.getComputedStyle(input);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      const rawLabel = getLabelText(input);
      if (!rawLabel) return;
      const label = rawLabel.toLowerCase().replace(/[\s\*\(\)\[\]]/g, '');

      const rule = dateRules.find(r => r.keys.some(k => label.includes(k)));
      if (rule) {
        input.value = String(rule.value).slice(0, 10);
        ['input', 'change'].forEach(e => input.dispatchEvent(new Event(e, { bubbles: true })));
        filledCount++;
        console.log(`✅ Date 채움: "${rawLabel}" → "${input.value}"`);
      }
    });

    // 라디오 버튼 처리 — 성별, 병역 등
    // 그룹 라벨(예: "성별")을 조상에서 찾고, 옵션 라벨(예: "남")이 맞는 것을 클릭
    function fillRadio(groupKeywords, valueAliases) {
      const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
      for (const radio of allRadios) {
        if (radio.disabled || radio.checked) continue;
        const style = window.getComputedStyle(radio);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const radioValue = (radio.value || '').toLowerCase();
        const optLabel = getLabelText(radio).toLowerCase().replace(/[\s\*]/g, '');

        // 이 라디오의 옵션값이 target value와 일치하는지
        const isTargetValue = valueAliases.some(v => {
          const vl = v.toLowerCase();
          return optLabel === vl || radioValue === vl || optLabel.startsWith(vl) || radioValue.startsWith(vl);
        });
        if (!isTargetValue) continue;

        // 조상 요소에서 그룹 라벨 키워드 탐색 (직계 텍스트 + 앞 형제 텍스트)
        let ancestor = radio.parentElement;
        let groupFound = false;
        for (let d = 0; d < 8 && ancestor && ancestor !== document.body; d++) {
          // 직계 텍스트 노드
          const directText = Array.from(ancestor.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim().toLowerCase()).join(' ');
          // 앞 형제 요소 텍스트 (th, td, label 등)
          const prevSibText = ancestor.previousElementSibling
            ? ancestor.previousElementSibling.textContent.trim().toLowerCase() : '';
          const combinedText = directText + ' ' + prevSibText;
          if (groupKeywords.some(k => combinedText.includes(k.toLowerCase()))) {
            groupFound = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        if (groupFound) {
          radio.click();
          ['change', 'input'].forEach(e => radio.dispatchEvent(new Event(e, { bubbles: true })));
          console.log(`✅ Radio 채움: [${groupKeywords[0]}] → "${radio.value}"`);
          filledCount++;
          break;
        }
      }
    }

    const gender = p.gender;
    if (gender === 'male' || gender === '남') {
      fillRadio(['성별', 'gender', '남녀'], ['남', '남성', 'male', 'm', '1']);
    } else if (gender === 'female' || gender === '여') {
      fillRadio(['성별', 'gender', '남녀'], ['여', '여성', 'female', 'f', '2']);
    }

    // 체크박스 처리 — 프로필에서 true인 항목만 체크 (false여도 절대 uncheck 안 함)
    const prefs = profile.preferences || {};
    const checkboxRules = [
      { keys: ['보훈', '국가유공', '보훈대상'], shouldCheck: !!prefs.isVeteran },
      { keys: ['장애', '장애인', '장애여부'], shouldCheck: !!prefs.isDisabled },
      { keys: ['취업보호', '취업지원대상', '고용지원'], shouldCheck: !!prefs.isProtection },
      { keys: ['운전면허', '운전가능', '면허보유'], shouldCheck: !!prefs.hasDriverLicense },
      { keys: ['취약계층'], shouldCheck: !!prefs.isVulnerable },
    ].filter(r => r.shouldCheck);

    if (checkboxRules.length > 0) {
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.disabled || checkbox.checked) return;
        const style = window.getComputedStyle(checkbox);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        const rawLabel = getLabelText(checkbox);
        if (!rawLabel) return;
        const label = rawLabel.toLowerCase().replace(/[\s\*\(\)\[\]]/g, '');

        const rule = checkboxRules.find(r => r.keys.some(k => label.includes(k.toLowerCase().replace(/\s/g, ''))));
        if (rule) {
          checkbox.click();
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          console.log(`✅ Checkbox 체크: "${rawLabel}"`);
        }
      });
    }

    console.log(`[프로필] ${filledCount}개 필드 채움`);
    return [];
  }

  // "0 / 1000" 형태의 글자수 카운터 탐색
  // Vuetify: .v-input root → .v-counter 우선 / 범용: 조상 텍스트 스캔 fallback
  function findNearbyCharLimit(el) {
    // 1) Vuetify/컴포넌트 기반: 컴포넌트 루트에서 카운터 직접 탐색
    // [class*="limit"], .counter, [class*="counter"] 제거 — "0/2" 항목 수 카운터 오탐 방지 (P0)
    const compRoot = el.closest('.v-input, .v-field, .el-form-item, .form-group');
    if (compRoot) {
      const counter = compRoot.querySelector(
        '.v-counter, [class*="char-count"], [class*="charCount"], [class*="char_count"]'
      );
      if (counter) {
        const m = counter.textContent.trim().match(/\d+\s*[\/|]\s*(\d+)/);
        if (m) {
          const val = parseInt(m[1]);
          if (val >= 100) return val; // 100 미만 = 항목 수 카운터, 무시
        }
      }
      // 1b) .v-messages__message fallback (Vuetify "0 / 1000자" 형태)
      const messages = compRoot.querySelector('.v-messages__message');
      if (messages) {
        const m = messages.textContent.trim().match(/\d+\s*[\/|]\s*(\d+)/);
        if (m) {
          const val = parseInt(m[1]);
          if (val >= 100) return val;
        }
      }
    }
    // 2) 범용 fallback: 조상 텍스트 노드 스캔
    // depth 5로 제한: 깊이 올라가면 "항목 수 카운터(0/2)" 등을 잘못 잡음
    // 100 미만 값도 무시: charLimit은 항상 100 이상 (섹션 카운터 오탐 방지)
    let ancestor = el.parentElement;
    for (let i = 0; i < 5 && ancestor; i++) {
      for (const leaf of ancestor.querySelectorAll('*')) {
        if (leaf.children.length > 0) continue;
        const m = leaf.textContent.trim().match(/^\d+\s*[\/\|]\s*(\d+)$/);
        if (m) {
          const val = parseInt(m[1]);
          if (val >= 100) return val;
        }
      }
      ancestor = ancestor.parentElement;
    }
    return null;
  }

  function findLabelText(el) {
    // 1) id 기반 <label for="...">
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.trim();
    }
    // 2) 부모 중 <label> — form 요소 제외 후 텍스트 추출
    let p = el.parentElement;
    while (p) {
      if (p.tagName === 'LABEL') {
        const clone = p.cloneNode(true);
        clone.querySelectorAll('input, textarea, select, button').forEach(n => n.remove());
        return clone.textContent.trim();
      }
      p = p.parentElement;
    }
    // 3) 조상 컨테이너 내 제목/강조 요소 우선 탐색 (Vuetify v-label, strong 등 포함)
    const headingSelector = 'h1, h2, h3, h4, h5, h6, dt, th, legend, strong, b';
    let ancestor = el.parentElement;
    for (let i = 0; i < 10 && ancestor; i++) {
      const headings = Array.from(ancestor.querySelectorAll(headingSelector));
      for (const h of headings) {
        if (h.contains(el)) continue;
        const t = h.textContent.trim();
        if (t.length >= 5 && t.length <= 400) return t;
      }
      ancestor = ancestor.parentElement;
    }
    // 4) el → 부모 → 조부모 순으로 이전 형제 탐색 (최대 8레벨)
    // 순수 글자수 안내문 (텍스트 전체가 안내문인 경우)만 skip — 나머지는 정규화해서 사용
    const pureCounterPattern = /^[\d\/\|\s~\-,]+$|^(최소|최대)\s*\d/;
    let node = el;
    for (let depth = 0; depth < 8; depth++) {
      let prev = node.previousElementSibling;
      while (prev) {
        const t = prev.textContent.trim();
        if (t.length >= 5 && t.length <= 800 && !pureCounterPattern.test(t)) return t;
        prev = prev.previousElementSibling;
      }
      if (!node.parentElement) break;
      node = node.parentElement;
    }
    // 5) placeholder 폴백 — 질문 텍스트가 placeholder에만 있는 경우
    if (el.placeholder && el.placeholder.length > 5 && !pureCounterPattern.test(el.placeholder)) {
      return el.placeholder;
    }
    return '';
  }

  // 라벨 정규화: "지원동기를 작성해 주세요 (최소 500자)" → "지원동기" (instruction 제거, question 보존)
  function normalizeLabel(text) {
    return text
      // 후행 instruction 동사구 제거 (작성해/입력해/서술해/설명해 주세요)
      .replace(/\s*(를|을|이|가|에\s*대해|에\s*대하여)?\s*(작성해\s*주세요|입력해\s*주세요|서술해\s*주세요|설명해\s*주세요|작성하세요|입력하세요|서술하세요|설명하세요|여기에\s*입력\s*해\s*주세요|기재해\s*주세요|기술해\s*주세요)\.?$/gi, '')
      .replace(/[\(\（][^\)\）]*\d+\s*자[^\)\）]*[\)\）]/g, '') // (최소 N자 ~ 최대 N자) 제거
      .replace(/\s*[(\[（【]\s*(최소|최대|\d)[^\)\]）】]*[\)\]）】]\s*$/g, '') // 후행 괄호 설명 제거
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // ── 문항 추출 보조 함수 ────────────────────────────────────────────────

  // Vuetify처럼 wrapper가 높이를 갖고 el 자체는 0일 수 있으므로 wrapper 기준 가시성 체크
  function isActuallyVisible(el) {
    const wrapper = el.closest('.v-input, .v-field, .form-group') || el;
    const wrapRect = wrapper.getBoundingClientRect();
    if (wrapRect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  // Hard filter — instruction 텍스트는 scoring 전에 먼저 제거
  // 단, 질문 키워드(지원동기·성장과정 등)가 함께 있으면 instruction으로 보지 않음
  // 예: "지원동기를 작성해 주세요" → 질문 O / "최소 500자 이상 입력해 주세요" → instruction O
  const INSTRUCTION_PAT = /이내|이상|글자|작성해|입력해|작성하세요|입력하세요|이하|최소|최대|서술해|서술 해|\d+\s*자/;
  const QUESTION_KW_PAT = /지원동기|성장과정|지원\s*이유|역량|강점|약점|자기소개|경험|포부|직무|관심|성과|도전|협업|리더|성장|가치관|노력|역할|활동|계획|목표|비전|장단점|입사|회사|당사|본인|귀사|특기|자질|의지|열정|책임|신념|철학|전문|기술|역사|배경|업무/;
  function isInstruction(text) {
    if (QUESTION_KW_PAT.test(text)) return false; // 질문 키워드 포함 → question으로 판단
    return INSTRUCTION_PAT.test(text);
  }
  function isQuestionLike(text) {
    return text.length >= 4 && text.length <= 120 && !isInstruction(text);
  }

  // 구조 + 의미 통합 scoring (Engineer 피드백 핵심: "구조 점수 추가")
  // candidateNode: 후보 DOM 노드 (optional) — 구조 가중치에 사용
  function scoreCandidateLabel(text, el, candidateNode) {
    // Hard filter 먼저
    if (isInstruction(text)) return -10;

    let score = 0;

    // 의미 점수
    if (/지원동기|이유|경험|역량|강점|약점|설명|기술|소개|포부|직무|관심|성과|도전|협업|리더|성장|가치관|노력|자기소개|역할|활동|계획|지원이유|장단점|입사|목표|비전/.test(text)) score += 5;
    if (text.length >= 4 && text.length <= 60) score += 2; // 짧은 제목 보너스

    // 구조 점수 (Engineer Step 4)
    if (candidateNode) {
      // Heading 태그 보너스
      if (/^H[1-6]$/.test(candidateNode.tagName)) score += 4;
      // 제목 클래스 패턴 보너스
      if (/title|label|question|heading|subject/i.test(candidateNode.className)) score += 3;
      // 필드보다 위에 있음 (before-input 보너스)
      try {
        const elRect = el.getBoundingClientRect();
        const nodeRect = candidateNode.getBoundingClientRect();
        if (nodeRect.bottom <= elRect.top + 10) score += 3;
      } catch (_) {}
      // 같은 row 안에 있음
      const elRow = el.closest('.row, .form-row, .field-group');
      if (elRow && elRow.contains(candidateNode)) score += 5;
    }

    // 숫자/슬래시만 있는 텍스트 제거
    if (/^\d+\s*[\/|]\s*\d+$/.test(text.trim())) score -= 5;

    return score;
  }

  // el이 포함된 col을 제외한 container 안의 노드를 수집 → 구조+의미 scoring → best 반환
  function scoredScan(container, el) {
    // container의 직계 자식 중 el을 포함하는 브랜치를 찾아 제외 (P3 fix)
    // 기존: Array.from(container.children).find() — el이 container의 직계자식이 아니면 undefined 반환
    let inputBranch = el;
    while (inputBranch.parentElement && inputBranch.parentElement !== container) {
      inputBranch = inputBranch.parentElement;
    }
    const excludedBranch = inputBranch.parentElement === container ? inputBranch : null;
    const candidates = [];
    container.querySelectorAll('*').forEach(node => {
      if (excludedBranch && (excludedBranch === node || excludedBranch.contains(node))) return;
      const t = node.textContent?.trim();
      if (!t || !isQuestionLike(t)) return; // Hard filter 먼저
      if (candidates.some(c => c.text === t)) return; // 중복 제거
      candidates.push({ text: t, node });
    });
    if (!candidates.length) return '';
    const best = candidates
      .map(c => ({ ...c, score: scoreCandidateLabel(c.text, el, c.node) }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    return best ? normalizeLabel(best.text) : '';
  }

  // 범용 질문 제목 추출 — Tier 1→4 순차 fallback
  // 전략: "DOM 구조를 먼저 좁힌 뒤 텍스트로 최종 선택" (Engineer 최종 원칙)
  function findQuestionLabel(el) {
    // Tier 1: 표준 label[for] / aria (가장 신뢰도 높음 — instruction이면 건너뜀)
    const standard = findLabelText(el);
    if (standard && standard.length >= 4 && !isInstruction(standard)) return standard;

    // Tier 2: multi-group 순차 탐색 (first-match, 큰 단위 우선)
    // 단일 closest()가 아니라 배열 순서대로 각각 시도
    // .row 먼저: question+input을 함께 묶을 확률이 가장 높음
    // .v-input 나중: 내부에 라벨 텍스트가 없는 경우가 대부분
    const GROUP_CANDIDATES = [
      '.row', '.form-row', '.field-group', '.item-common', '.form-item',
      '[class*="question-"]', '[class*="qa-"]', '.v-input'
    ];
    const seenGroups = new Set();
    for (const sel of GROUP_CANDIDATES) {
      const g = el.closest(sel);
      if (!g || seenGroups.has(g)) continue; // 동일 group 중복 방지
      seenGroups.add(g);
      const fromGroup = scoredScan(g, el);
      if (fromGroup) {
        console.log(`[문항추출] Tier2 ${sel}: "${fromGroup}"`);
        return fromGroup;
      }
    }

    // Tier 3: 각 group 후보의 이전 형제 순차 탐색 (Guard 포함)
    // Guard: prev에 textarea/contenteditable 있으면 다른 질문의 컨테이너 → skip (binary 판단)
    const seenPrevGroups = new Set();
    for (const sel of GROUP_CANDIDATES) {
      const g = el.closest(sel);
      if (!g) continue;
      const prev = g.previousElementSibling;
      if (!prev || seenPrevGroups.has(prev)) continue;
      seenPrevGroups.add(prev);
      if (prev.querySelector('textarea, [contenteditable="true"]')) {
        console.log(`[문항추출] Tier3 ${sel}.prev skip — 다른 질문 컨테이너`);
        continue; // 완전 skip — penalty 아님
      }
      const fromPrev = scoredScan(prev, el);
      if (fromPrev) {
        console.log(`[문항추출] Tier3 ${sel}.prev: "${fromPrev}"`);
        return fromPrev;
      }
    }

    // Tier 4: 상위 탐색 — depth 3 제한 + section bound (범위 확장이 아닌 제한된 탐색)
    // sectionBound 밖으로 나가지 않음: 관련 없는 섹션 텍스트 오탐 방지
    // textarea 있는 sibling은 skip: 다른 질문 컨테이너를 label source로 쓰지 않음
    const sectionBound = findEssaySectionContainer() || document.body;
    let cursor = el;
    for (let lvl = 0; lvl < 3; lvl++) {
      cursor = cursor.parentElement;
      if (!cursor || !sectionBound.contains(cursor)) break; // section 밖 — 즉시 중단
      let sib = cursor.previousElementSibling;
      while (sib) {
        // 다른 질문의 입력 컨테이너 — label source로 쓰면 안 됨 (Tier3 guard와 동일 원칙)
        if (sib.querySelector('textarea, [contenteditable="true"]')) {
          sib = sib.previousElementSibling;
          continue;
        }
        const candidates = [];
        sib.querySelectorAll('p,span,div,h1,h2,h3,h4,h5,h6,dt,legend,label').forEach(node => {
          const t = node.textContent?.trim();
          if (t && isQuestionLike(t) && !candidates.some(c => c.text === t))
            candidates.push({ text: t, node });
        });
        const best = candidates
          .map(c => ({ ...c, score: scoreCandidateLabel(c.text, el, c.node) }))
          .filter(c => c.score > 0)
          .sort((a, b) => b.score - a.score)[0];
        if (best) {
          console.log(`[문항추출] Tier4 ancestor[${lvl}]: "${best.text}"`);
          return normalizeLabel(best.text);
        }
        sib = sib.previousElementSibling;
      }
    }

    return '';
  }

  // 하위 호환 — 기존 호출부에서 사용하던 함수명 유지
  function findLabelForEditable(el) { return findQuestionLabel(el); }

  // 자소서 섹션 컨테이너 탐색 — 이 컨테이너 안의 textarea만 추출 대상으로 제한 (P1)
  // 프로필/경력 섹션 textarea를 자소서 문항으로 오탐하는 것을 방지
  //
  // 탐색 전략 (범용 우선 — 특정 사이트 과적합 금지):
  //   1순위: aria-controls/href 기반 — 탭-패널 표준 ARIA 연결 (어떤 ATS든 동작)
  //   2순위: ARIA role="tabpanel" 계열 활성 패널 (ARIA 준수 사이트)
  //   3순위: 정적 ID/class 셀렉터 (알려진 패턴)
  //   4순위: heading 기반 하향 탐색 (자소서 키워드 heading → 자식 탐색)
  //
  // ※ 전달받은 tabEl 파라미터: activateEssaySection에서 실제 클릭한 탭 요소
  //   탭과 패널의 연결 관계를 가장 정확히 파악하는 데 사용
  function findEssaySectionContainer(tabEl) {
    const ESSAY_KW = /자기소개|자소서|에세이|cover.?letter|자기\s*pr/i;
    const hasTa = (el) => el.querySelectorAll('textarea, [contenteditable="true"]').length > 0;

    // ── 1순위: aria-controls / href — 탭-패널 표준 ARIA 연결 ─────────────
    // HTML 명세상 탭은 aria-controls로 패널 ID를 명시하거나, href="#id"로 링크한다.
    // 이 방식은 사이트 구조에 무관하게 어떤 ATS에서도 동작한다.
    if (tabEl) {
      const panelId =
        tabEl.getAttribute('aria-controls') ||
        (tabEl.getAttribute('href') || '').replace(/^#/, '');
      if (panelId) {
        const panel = document.getElementById(panelId);
        if (panel && hasTa(panel)) {
          console.log('[문항추출] aria-controls/href 패널:', panelId);
          return panel;
        }
      }
      // 탭 주변에서 패널 탐색 — 최대 5레벨 상향하며 형제 패널 탐색
      // 원리: 탭 네비게이션과 탭 콘텐츠는 DOM 어딘가에서 형제(sibling)관계
      // aria/class 무관하게 동작 (커스텀 탭 구현 대응)
      // 예: ul.tab-nav > li > a (tabEl) → ul 형제인 div.tab-panel (depth 2)
      //     div.tabs > div.tab-item > span (tabEl) → tabs 형제인 div.content (depth 2)
      // 가시성 체크 포함 — 다중 패널이 DOM에 있을 때 활성(보이는) 패널 우선
      const hasTaVisible = (el) =>
        el.getBoundingClientRect().height > 0 &&
        el.querySelectorAll('textarea, [contenteditable="true"]').length > 0;
      let probe = tabEl;
      for (let lvl = 0; lvl < 5 && probe && probe !== document.body; lvl++) {
        const parent = probe.parentElement;
        if (!parent || parent === document.body) break;
        const siblings = Array.from(parent.children).filter(el => !el.contains(tabEl));
        // 1) 가시 패널 우선
        const visPanel = siblings.find(el => hasTaVisible(el));
        if (visPanel) {
          console.log('[문항추출] 탭 주변 가시 패널 (depth ' + lvl + '):', visPanel.tagName, visPanel.id || visPanel.className?.slice(0, 40));
          return visPanel;
        }
        // 2) 비가시 패널 fallback (클릭 직후 아직 렌더링 전일 수 있음)
        const anyPanel = siblings.find(el => hasTa(el));
        if (anyPanel) {
          console.log('[문항추출] 탭 주변 비가시 패널 (depth ' + lvl + '):', anyPanel.tagName, anyPanel.id || anyPanel.className?.slice(0, 40));
          return anyPanel;
        }
        probe = parent;
      }
    }

    // ── 2순위: ARIA role="tabpanel" 활성 패널 ────────────────────────────
    const activePanel =
      document.querySelector('[role="tabpanel"][aria-hidden="false"]') ||
      document.querySelector('[role="tabpanel"]:not([hidden])') ||
      document.querySelector('[role="tabpanel"][aria-selected="true"]') ||
      document.querySelector('.tab-pane.active') ||
      document.querySelector('.v-window-item--active');
    if (activePanel && hasTa(activePanel)) {
      console.log('[문항추출] ARIA tabpanel 감지:', activePanel.id || activePanel.className?.slice(0, 40));
      return activePanel;
    }

    // ── 3순위: 정적 ID/class 셀렉터 ─────────────────────────────────────
    const ESSAY_SECTION_SELECTORS = [
      '#nav-typeEssay', '#nav-typeCoverLetter', '#section-essay', '#essay-section',
      '[class*="essay-section"]', '[class*="cover-letter"]', '[class*="jasoseo"]',
      '[aria-label*="자기소개"]', '[aria-label*="자소서"]',
    ];
    for (const sel of ESSAY_SECTION_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el && hasTa(el)) return el;
      } catch (_) {}
    }

    // ── 4순위: heading 기반 하향 탐색 ────────────────────────────────────
    // heading 하위로 내려가며 textarea를 포함하는 가장 가까운 컨테이너 탐색
    // 상향 탐색(parentElement 반복)은 resumeContainer 같은 전체 wrapper까지 올라갈 위험이 있어 제거
    const headings = Array.from(document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,[class*="section-title"],[class*="section-tit"],[class*="tit-section"]'
    ));
    for (const h of headings) {
      if (!ESSAY_KW.test(h.textContent)) continue;
      // heading의 다음 형제 요소들 중 textarea 포함 탐색 (부모 상향 금지)
      let sib = h.nextElementSibling;
      for (let i = 0; i < 5 && sib; i++) {
        if (hasTa(sib)) {
          console.log('[문항추출] heading 형제 탐색:', h.textContent.trim().slice(0, 20));
          return sib;
        }
        sib = sib.nextElementSibling;
      }
      // heading 부모의 직계 자식 중 textarea 포함 (heading 자신 제외)
      const parent = h.parentElement;
      if (parent && parent !== document.body) {
        const child = Array.from(parent.children).find(el => el !== h && hasTa(el));
        if (child) {
          console.log('[문항추출] heading 부모 자식 탐색:', h.textContent.trim().slice(0, 20));
          return child;
        }
      }
    }

    return null;
  }

  // 자소서 섹션 탭 탐색 (스텝/탭 기반 ATS 대응)
  function findEssayTab() {
    const kw = /자기소개|자소서|에세이|essay|cover.?letter|자기\s*pr|지원\s*동기/i;
    return Array.from(document.querySelectorAll('a, button, [role="tab"], li, span'))
      .find(el => kw.test(el.textContent.trim())
        && el.offsetParent !== null
        && !btnContainer.contains(el)
        && !(_overlay && _overlay.contains(el))) || null;  // 진행 오버레이 제외
  }

  // 자소서 섹션 활성화 시도: 탭 클릭 → DOM 생성 대기 (클릭 성공 ≠ DOM 생성 성공)
  // 반환값: 클릭한 탭 요소 (findEssaySectionContainer에 전달하여 aria-controls 탐색에 사용)
  async function activateEssaySection() {
    const tab = findEssayTab();
    if (tab) {
      console.log('[문항추출] 자소서 탭 클릭:', tab.textContent.trim());
      tab.click();
      await waitForDomSettle(1000);
    }
    // textarea 등장 대기 — 탭 없는 사이트도 포함
    await waitFor(() =>
      document.querySelectorAll('textarea, [contenteditable="true"]').length > 0
    , 3000);
    return tab; // tabEl 반환 — findEssaySectionContainer(tabEl) 호출용
  }

  // 진단 함수: 문항 추출 전 DOM 현황 로그
  function debugQuestionDOM() {
    console.group('🔍 [문항추출 진단]');
    console.log('textarea:', document.querySelectorAll('textarea').length);
    console.log('contenteditable:', document.querySelectorAll('[contenteditable="true"]').length);
    console.log('ProseMirror:', document.querySelectorAll('.ProseMirror').length);
    console.log('Quill:', document.querySelectorAll('.ql-editor').length);
    console.log('iframe:', document.querySelectorAll('iframe').length);
    const tab = findEssayTab();
    console.log('자소서 탭:', tab ? tab.textContent.trim() : '없음');
    console.groupEnd();
  }

  // 자소서 문항 추출: textarea + contenteditable 병렬 수집 (fallback 구조 제거)
  // tabEl: activateEssaySection()이 반환한 탭 요소 — findEssaySectionContainer에 전달
  function extractCoverLetterQuestions(tabEl) {
    const questions = [];
    const visited = new Set();

    // 공통 처리: 가시성 체크 → 글자수 필터 → 라벨 추출 → 점수 필터 → push
    function processField(el) {
      if (visited.has(el)) return;
      if (!isActuallyVisible(el)) {
        console.log(`[문항추출] #${el.id || el.tagName} 비가시 → 스킵`);
        return;
      }
      visited.add(el);

      const nearbyLimit = findNearbyCharLimit(el);
      const maxLenAttr = el.getAttribute('maxlength');
      const maxLen = maxLenAttr ? parseInt(maxLenAttr) : null;
      if (nearbyLimit !== null && nearbyLimit < 200) {
        console.log(`[문항추출] #${el.id || el.tagName} nearbyLimit=${nearbyLimit} < 200 → 스킵`);
        return;
      }
      if (nearbyLimit === null && maxLen !== null && maxLen < 200) {
        console.log(`[문항추출] #${el.id || el.tagName} maxLen=${maxLen} < 200 → 스킵`);
        return;
      }
      const charLimit = nearbyLimit ?? maxLen;

      // 라벨 추출: 모든 필드 타입에 findQuestionLabel 적용 (row-sibling 우선)
      let labelText = findQuestionLabel(el);

      if (!labelText) {
        if (el.placeholder && el.placeholder.length > 5) labelText = el.placeholder;
        else labelText = `자기소개서 항목 ${questions.length + 1}`;
      }

      const normalized = normalizeLabel(labelText);
      const isInstructionOnly = normalized.length < 4 ||
        /^(최소|최대)/.test(normalized) ||
        /^\d+\s*(자($|\s)|~\s*\d|\/\s*\d)/.test(normalized);
      if (isInstructionOnly) {
        console.warn('[문항추출] instruction-only 라벨 제외:', labelText);
        return;
      }

      const charLimitMatch = labelText.match(/(\d{3,4})\s*자/);
      const finalCharLimit = charLimit ?? (charLimitMatch ? parseInt(charLimitMatch[1]) : null);

      if (normalized.length >= 4) {
        // 동일 질문 제목 dedup — 같은 heading 아래 여러 textarea가 있을 때 발생
        // charLimit이 더 큰 쪽(메인 입력창)을 우선 보존
        const existing = questions.findIndex(q => q.question === normalized);
        if (existing >= 0) {
          if ((finalCharLimit ?? 0) > (questions[existing].charLimit ?? 0)) {
            questions[existing].charLimit = finalCharLimit;
            console.log(`[문항추출] ♻️ 중복 병합 (charLimit 갱신): "${normalized}" → ${finalCharLimit}자`);
          } else {
            console.log(`[문항추출] ♻️ 중복 스킵: "${normalized}"`);
          }
          return;
        }
        console.log(`[문항추출] ✅ 추출: "${normalized}" (${finalCharLimit}자)`);
        questions.push({ question: normalized, charLimit: finalCharLimit });
        if (el.getAttribute('contenteditable') === 'true') el.setAttribute('data-editor-type', 'contenteditable');
      }
    }

    // 자소서 섹션 컨테이너로 탐색 범위 제한 (P1) — 없으면 document 전체로 fallback
    const essayContainer = findEssaySectionContainer(tabEl);
    const scope = essayContainer || document;
    if (essayContainer) {
      console.log('[문항추출] 자소서 섹션 컨테이너 발견:', essayContainer.tagName, essayContainer.id || essayContainer.className?.slice(0, 40));
    } else {
      console.log('[문항추출] 자소서 섹션 컨테이너 없음 — document 전체 탐색');
    }

    // 1. textarea (항상 탐색)
    scope.querySelectorAll('textarea').forEach(ta => {
      console.log(`[문항추출] textarea 발견: height=${ta.offsetHeight} id=${ta.id || '없음'}`);
      processField(ta);
    });

    // 2. contenteditable (병렬 탐색 — fallback 아님)
    const EDITABLE_SELS = [
      '.ProseMirror[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"]',
      'section[contenteditable="true"]',
    ];
    EDITABLE_SELS.forEach(sel => {
      scope.querySelectorAll(sel).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.height < 60 && !el.closest('.v-input')) return;
        console.log(`[문항추출] contenteditable 발견: ${sel} height=${rect.height}`);
        processField(el);
      });
    });

    // 3. same-origin iframe (항상 탐색)
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        doc.querySelectorAll('textarea').forEach(ta => processField(ta));
        EDITABLE_SELS.forEach(sel => {
          doc.querySelectorAll(sel).forEach(el => {
            if (el.getBoundingClientRect().height >= 60) processField(el);
          });
        });
      } catch (_) { /* cross-origin — 조용히 스킵 */ }
    });

    // 4. iframe fallback (cross-origin 포함 — 이전 동작 유지)
    if (questions.length === 0) {
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc) return;
          const IFRAME_SELS = ['textarea', ...EDITABLE_SELS];
          IFRAME_SELS.forEach(sel => {
            doc.querySelectorAll(sel).forEach(el => {
              if (visited.has(el)) return;
              const rect = el.getBoundingClientRect();
              if (rect.height < 60) return;
              visited.add(el);
              const labelText = el.getAttribute('aria-label')
                || el.getAttribute('placeholder')
                || doc.title
                || '자기소개서 입력';
              if (labelText.length < 4) return;
              questions.push({
                question: labelText.trim(),
                charLimit: null,
                editorType: 'iframe-contenteditable',
              });
              el.setAttribute('data-editor-type', 'iframe-contenteditable');
            });
          });
        } catch (e) {
          // cross-origin — 조용히 스킵 (접근 불가)
        }
      });
    }

    return questions;
  }

  // ── 버튼 표시/숨김 상태 관리 ──────────────────────────────────────────
  const STORAGE_KEY = 'jasoseoButtonsVisible';

  // 컨테이너: 두 버튼을 함께 감싸서 한 번에 show/hide
  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'
  });
  document.body.appendChild(btnContainer);

  // 1. 플로팅 버튼 생성
  const btn = document.createElement('button');
  btn.innerText = '✨ 자동 입력';
  Object.assign(btn.style, {
    padding: '12px 20px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '14px'
  });
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';

  // 1-b. "📋 문항 추출" 버튼
  const extractBtn = document.createElement('button');
  extractBtn.innerText = '📋 문항 추출';
  Object.assign(extractBtn.style, {
    padding: '10px 18px', background: '#0891b2', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '13px'
  });
  extractBtn.onmouseover = () => extractBtn.style.transform = 'scale(1.05)';
  extractBtn.onmouseout = () => extractBtn.style.transform = 'scale(1)';

  // 1-c. "🧑 프로필 채우기" 버튼 (문항 추출 없이 프로필 필드만 채움)
  const profileFillBtn = document.createElement('button');
  profileFillBtn.innerText = '🧑 프로필 채우기';
  Object.assign(profileFillBtn.style, {
    padding: '10px 18px', background: '#059669', color: 'white',
    border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s', fontSize: '13px'
  });
  profileFillBtn.onmouseover = () => profileFillBtn.style.transform = 'scale(1.05)';
  profileFillBtn.onmouseout = () => profileFillBtn.style.transform = 'scale(1)';

  // 1-d. 숨기기 버튼 (작은 ×)
  const hideBtn = document.createElement('button');
  hideBtn.innerText = '× 숨기기';
  Object.assign(hideBtn.style, {
    padding: '4px 10px', background: 'rgba(0,0,0,0.35)', color: 'white',
    border: 'none', borderRadius: '20px', cursor: 'pointer',
    fontSize: '11px', alignSelf: 'flex-end', transition: 'background 0.2s'
  });
  hideBtn.onmouseover = () => hideBtn.style.background = 'rgba(0,0,0,0.6)';
  hideBtn.onmouseout = () => hideBtn.style.background = 'rgba(0,0,0,0.35)';

  btnContainer.appendChild(hideBtn);
  btnContainer.appendChild(extractBtn);
  btnContainer.appendChild(profileFillBtn);
  btnContainer.appendChild(btn);

  // 1-e. 복원 미니 버튼 (숨겨진 상태에서 우하단에 작게 표시)
  const showBtn = document.createElement('button');
  showBtn.innerText = '자소서M';
  Object.assign(showBtn.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
    padding: '6px 12px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer',
    fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'none', opacity: '0.7'
  });
  showBtn.onmouseover = () => showBtn.style.opacity = '1';
  showBtn.onmouseout = () => showBtn.style.opacity = '0.7';
  document.body.appendChild(showBtn);

  // ── 표시/숨김 헬퍼 ──────────────────────────────────────────────────
  function setVisible(visible) {
    btnContainer.style.display = visible ? 'flex' : 'none';
    showBtn.style.display = visible ? 'none' : 'block';
    chrome.storage.local.set({ [STORAGE_KEY]: visible });
  }

  hideBtn.onclick = () => setVisible(false);
  showBtn.onclick = () => setVisible(true);

  // 초기 상태 로드 (기본값: 표시)
  chrome.storage.local.get([STORAGE_KEY], (res) => {
    const visible = res[STORAGE_KEY] !== false;
    btnContainer.style.display = visible ? 'flex' : 'none';
    showBtn.style.display = visible ? 'none' : 'block';
  });

  // 팝업에서 상태 변경 시 실시간 반영
  chrome.storage.onChanged.addListener((changes) => {
    if (STORAGE_KEY in changes) {
      const visible = changes[STORAGE_KEY].newValue !== false;
      btnContainer.style.display = visible ? 'flex' : 'none';
      showBtn.style.display = visible ? 'none' : 'block';
    }
  });

  // textarea 주변 컨텍스트만 추출 (Gemini에 보낼 최소 HTML)
  function captureFormHtml() {
    const tas = Array.from(document.querySelectorAll('textarea')).filter(ta => {
      if (ta.offsetHeight < 40) return false;
      const s = window.getComputedStyle(ta);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });

    if (tas.length === 0) {
      // textarea가 없으면 body 전체 축약본
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, svg, noscript, iframe').forEach(el => el.remove());
      clone.querySelectorAll('img').forEach(el => el.removeAttribute('src'));
      return clone.innerHTML.slice(0, 20000);
    }

    // 각 textarea의 공통 조상 컨테이너를 찾아서 그 innerHTML만 수집
    const parts = [];
    const seen = new Set();
    for (const ta of tas) {
      // textarea 기준 최대 8레벨 위 조상 중 가장 가까운 section/div/form 사용
      let node = ta.parentElement;
      for (let i = 0; i < 8 && node && node !== document.body; i++) {
        const tag = node.tagName.toLowerCase();
        if (['section', 'article', 'form', 'fieldset'].includes(tag) || node.offsetHeight > 200) break;
        node = node.parentElement;
      }
      const container = node || ta.parentElement;
      if (container && !seen.has(container)) {
        seen.add(container);
        const clone = container.cloneNode(true);
        clone.querySelectorAll('script, style, svg, noscript, iframe').forEach(el => el.remove());
        clone.querySelectorAll('img').forEach(el => el.removeAttribute('src'));
        parts.push(clone.outerHTML);
      }
    }
    return parts.join('\n').slice(0, 30000);
  }

  // === Custom Dropdown (Vuetify / Element UI / 커스텀 — 행동 기반) ===
  // selector 탐지가 아니라 "클릭 → aria-expanded/listbox 열림 확인 → 옵션 클릭" 행동 시뮬레이션
  async function injectCustomDropdown(triggerEl, value, fieldName) {
    if (!triggerEl) return false;
    try {
      // 1) 트리거 클릭 → 드롭다운 열기
      triggerEl.click();
      triggerEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      console.log(`📋 CustomDropdown 열기: ${fieldName}`);

      // 2) 드롭다운 열림 감지 — aria-expanded 또는 role=listbox/option 등장 대기
      const opened = await waitFor(() => {
        // aria-expanded 전환 확인
        const expanded = triggerEl.getAttribute('aria-expanded') === 'true'
          || triggerEl.closest('[aria-expanded="true"]') !== null;
        if (expanded) return true;
        // listbox 또는 option role 등장 확인
        if (document.querySelector('[role="listbox"],[role="option"]')) return true;
        return false;
      }, 800);

      if (!opened) {
        console.warn(`⚠️ CustomDropdown 열림 감지 실패 — 옵션 직접 탐색 시도: ${fieldName}`);
      }

      // 3) 옵션 텍스트 매칭 클릭 (role 우선, 그 다음 li/div)
      const OPTION_SELECTORS = [
        '[role="option"]', '[role="listbox"] li',
        '.el-select-dropdown__item', '.v-list-item',
        'li', '[class*="option"]', '[class*="item"]',
      ];
      for (const s of OPTION_SELECTORS) {
        for (const item of document.querySelectorAll(s)) {
          const t = item.textContent.trim();
          if (t && isSemanticallyEqual(t, value)) {
            item.click();
            console.log(`✅ CustomDropdown 선택: ${fieldName} → "${t}"`);
            return true;
          }
        }
      }

      // 닫기 (미매칭 시 Escape)
      console.warn(`⚠️ CustomDropdown 옵션 미발견: ${fieldName} = "${value}"`);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    } catch (err) {
      console.error(`❌ CustomDropdown 실패: ${fieldName}`, err);
      return false;
    }
  }

  // === contenteditable / Rich Text Editor 입력 ===
  // ProseMirror, Quill, TipTap 등 — el.value 안 먹힘, innerText + InputEvent 필요
  function injectContentEditable(el, value, fieldName) {
    if (!el) return false;
    try {
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);

      el.innerText = value;

      // insertText InputEvent — React/Vue 상태 동기화 트리거
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));

      console.log(`✅ ContentEditable 채움: ${fieldName} (${value.length}자)`);
      return true;
    } catch (err) {
      console.error(`❌ ContentEditable 실패: ${fieldName}`, err);
      return false;
    }
  }

  // === iframe 내부 contenteditable 탐색 및 채움 ===
  // same-origin: 직접 접근 / cross-origin: clipboard fallback + 안내 토스트
  function showClipboardToast(value, fieldName) {
    navigator.clipboard.writeText(value).catch(() => {});
    const toast = document.createElement('div');
    Object.assign(toast.style, {
      position: 'fixed', bottom: '80px', right: '20px', zIndex: '9999999',
      background: '#1e293b', color: '#f1f5f9', padding: '12px 16px',
      borderRadius: '10px', fontSize: '13px', maxWidth: '320px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', lineHeight: '1.5',
    });
    toast.innerHTML = `<b>📋 클립보드 복사 완료</b><br>"${fieldName}" 입력창은 보안 영역(cross-origin)이라 자동 입력이 제한됩니다.<br><span style="color:#94a3b8">Ctrl+V로 붙여넣기 해주세요.</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 7000);
  }

  async function injectIntoIframes(value, fieldName) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) continue; // cross-origin → 접근 불가
        const EDITOR_SELS = [
          '.ProseMirror[contenteditable="true"]',
          '.ql-editor[contenteditable="true"]',
          '[role="textbox"][contenteditable="true"]',
          'div[contenteditable="true"]',
          'textarea',
        ];
        for (const sel of EDITOR_SELS) {
          const el = doc.querySelector(sel);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height < 30) continue;

          if (el.tagName === 'TEXTAREA') {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
            if (setter?.set) setter.set.call(el, value); else el.value = value;
            ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
          } else {
            injectContentEditable(el, value, `${fieldName}[iframe]`);
          }
          console.log(`✅ iframe 내부 채움: ${fieldName}`);
          logSuccess(`${fieldName}[iframe]`, 'iframe-editor', value);
          return true;
        }
      } catch (e) {
        // cross-origin SecurityError — clipboard fallback
        if (e.name === 'SecurityError' || e.message?.includes('cross-origin')) {
          console.warn(`🛡️ cross-origin iframe 감지: ${fieldName} — clipboard fallback 실행`);
          showClipboardToast(value, fieldName);
          logFailed(fieldName, 'iframe-crossorigin', 'cross-origin 접근 차단 → clipboard 복사');
          return false;
        }
      }
    }
    return false;
  }

  // === Failure Log (실패 로그 수집 — 커버리지 튜닝의 원료) ===
  const FILL_LOG = {
    success: [],  // { fieldName, type, value }
    failed:  [],  // { fieldName, type, selectors, reason }
    skipped: [],  // { fieldName, reason }
  };

  function logSuccess(fieldName, type, value) {
    FILL_LOG.success.push({ fieldName, type, value: String(value).slice(0, 50) });
  }
  function logFailed(fieldName, type, reason, selectors = []) {
    FILL_LOG.failed.push({ fieldName, type, reason, selectors });
  }
  function logSkipped(fieldName, reason) {
    FILL_LOG.skipped.push({ fieldName, reason });
  }

  function showFillSummary() {
    const { success, failed, skipped } = FILL_LOG;
    const total = success.length + failed.length;
    console.groupCollapsed(
      `%c📊 Fill Summary: ${success.length}/${total} 성공 | 실패 ${failed.length} | 스킵 ${skipped.length}`,
      'color: #6366f1; font-weight: bold; font-size: 13px;'
    );
    if (success.length > 0) {
      console.log('%c✅ 성공 필드:', 'color: #10b981; font-weight: bold;');
      success.forEach(f => console.log(`  [${f.type}] ${f.fieldName}: "${f.value}"`));
    }
    if (failed.length > 0) {
      console.log('%c❌ 실패 필드 (튜닝 필요):', 'color: #ef4444; font-weight: bold;');
      failed.forEach(f => console.log(`  [${f.type}] ${f.fieldName}: ${f.reason}`));
    }
    if (skipped.length > 0) {
      console.log('%c⏭️ 스킵된 필드:', 'color: #f59e0b; font-weight: bold;');
      skipped.forEach(f => console.log(`  ${f.fieldName}: ${f.reason}`));
    }
    console.groupEnd();
  }

  // === Convergence Engine Utilities ===

  // Semantic equality: "010-1234-5678" === "01012345678", "대졸" === "대학교 졸업" 등 처리
  function normalize(v) {
    return String(v).replace(/[\s\-\(\)\/]/g, '').toLowerCase();
  }

  function isSemanticallyEqual(a, b) {
    if (!a || !b) return false;
    const na = normalize(a), nb = normalize(b);
    return na === nb || na.includes(nb) || nb.includes(na);
  }

  // 상태 기반 필드 현재값 반환
  // radio: 그룹 내 checked된 항목의 라벨 텍스트 반환 (첫 번째 radio를 el로 받음)
  function getFieldValue(el) {
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? 'true' : 'false';
    if (el.type === 'radio') {
      if (el.name) {
        const checked = document.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`);
        if (!checked) return '';
        const lbl = document.querySelector(`label[for="${CSS.escape(checked.id)}"]`);
        return lbl?.textContent.trim() || checked.value;
      }
      return el.checked ? el.value : '';
    }
    if (el.getAttribute('contenteditable') === 'true') return el.innerText.trim();
    if (el.tagName === 'SELECT') {
      const selected = el.options[el.selectedIndex];
      if (!selected || !selected.value || selected.value === '0' || selected.value === '-1') return '';
      return selected.text.trim();
    }
    return (el.value || '').trim();
  }

  // 상태 기반 멱등성 검사 — normalize(actual) === normalize(expected)
  // normalize: 소문자 + 공백·구두점·특수문자 제거 (전화번호 대시 등 포함)
  function isFieldSatisfied(el, expectedValue) {
    if (!el || expectedValue === undefined || expectedValue === null || expectedValue === '') return false;
    if (el.type === 'checkbox') {
      const expected = expectedValue === 'true' || expectedValue === true || expectedValue === '1' || expectedValue === 1;
      return el.checked === expected;
    }
    const actual = getFieldValue(el);
    if (actual === '') return false;
    const n = (v) => String(v).toLowerCase().replace(/\s+/g, '').replace(/[.,\-\(\)\/]/g, '');
    return n(actual) === n(String(expectedValue));
  }

  // 이미 올바른 값이 채워진 필드인지 확인 (isFieldSatisfied 위임)
  function alreadyFilled(el, expectedValue) {
    return isFieldSatisfied(el, expectedValue);
  }

  // DOM 변화 감지 기반 대기 (setTimeout 대체)
  async function waitFor(condition, timeout = 2000, interval = 150) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) return true;
      await new Promise(r => setTimeout(r, interval));
    }
    return false;
  }

  // MutationObserver 기반 DOM 안정화 대기
  async function waitForDomSettle(maxWait = 1500) {
    return new Promise(resolve => {
      let timer;
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => { observer.disconnect(); resolve(); }, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      // 최대 대기 보장
      setTimeout(() => { observer.disconnect(); resolve(); }, maxWait);
    });
  }

  // 새 필드 수가 늘어날 때까지 대기 (Virtualized list 대응)
  // data-seen-before 방식: count 비교보다 정밀 — 섹션 교체로 count가 그대로여도 새 노드 감지
  const RAW_FIELD_SELECTOR = 'input[type="text"],input[type="date"],input[type="radio"],input[type="number"],select,input:not([type])';

  function markAllInputsAsSeen() {
    document.querySelectorAll(RAW_FIELD_SELECTOR).forEach(el => {
      el.dataset.seenBefore = '1';
    });
  }

  async function waitForNewFields(timeout = 2000) {
    return waitFor(() => {
      for (const el of document.querySelectorAll(RAW_FIELD_SELECTOR)) {
        if (el.dataset.seenBefore) continue; // 이미 본 필드
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true; // 새 visible 필드 발견
      }
      return false;
    }, timeout);
  }

  // 1-b 클릭: Gemini로 문항 분석 → 앱으로 전송 + 프로필 자동 입력
  extractBtn.onclick = async () => {
    extractBtn.disabled = true;
    extractBtn.innerText = '⏳ 분석 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }
      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // ── 라벨 텍스트 추출 공통 헬퍼 (5가지 전략) ──────────────────────
      function collectLabelText(el) {
        let labelText = '';
        if (el.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) labelText = lbl.textContent.trim();
          } catch {}
        }
        if (!labelText) labelText = el.getAttribute('aria-label') || '';
        if (!labelText) labelText = el.placeholder || '';
        if (!labelText) {
          let node = el.parentElement;
          while (node && node !== document.body) {
            if (node.tagName === 'LABEL') { labelText = node.textContent.replace(el.value || '', '').trim(); break; }
            node = node.parentElement;
          }
        }
        if (!labelText) {
          let node = el.parentElement;
          outer: for (let i = 0; i < 4 && node && node !== document.body; i++) {
            for (const child of node.children) {
              if (child.contains(el)) continue;
              const t = child.textContent.trim();
              if (t.length > 0 && t.length < 30 && !t.includes('\n')) { labelText = t; break outer; }
            }
            node = node.parentElement;
          }
        }
        return labelText.replace(/[*\s]+/g, ' ').trim();
      }

      function makeStableId(type, labelText, sectionHint, posInSection) {
        const label = (labelText || '').replace(/[\s*\[\]]/g, '').slice(0, 20);
        return `${sectionHint || 'f'}.${type}.${posInSection}.${label}`;
      }

      // Phase 0: Fill 전에 구조를 완성한다 (AI 없음, extractBtn 흐름)
      createProgressOverlay();
      updateProgress('🏗️ 폼 구조 확장 중...', 10, '', '반복 섹션 행 추가');
      extractBtn.innerText = '⏳ 구조 확장 중...';
      const detectedSaveSections = await expandSectionRows(port, secret) || [];

      // 폼 입력 필드 메타데이터 수집 (text / select / date — Gemini에 보낼 경량 구조체)
      const formInputs = [];

      // 1) text 계열 input
      const textSelectors = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])';
      document.querySelectorAll(textSelectors).forEach((input) => {
        if (input.disabled || input.readOnly) return;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (input.offsetWidth === 0) return;
        if (input.value) return;

        const idx = formInputs.length;
        const labelText_t = collectLabelText(input);
        input.setAttribute('data-fill-idx', idx);
        formInputs.push({
          idx,
          type: 'text',
          id: input.id || null,
          name: input.getAttribute('name') || null,
          labelText: labelText_t,
          placeholder: input.placeholder || null,
          ariaLabel: input.getAttribute('aria-label') || null,
          stableId: makeStableId('text', labelText_t, null, formInputs.length),
        });
      });

      // 2) date input
      document.querySelectorAll('input[type="date"]').forEach((input) => {
        if (input.disabled || input.readOnly) return;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (input.value) return;

        const idx = formInputs.length;
        const labelText_d = collectLabelText(input);
        input.setAttribute('data-fill-idx', idx);
        formInputs.push({
          idx,
          type: 'date',
          id: input.id || null,
          name: input.getAttribute('name') || null,
          labelText: labelText_d,
          stableId: makeStableId('date', labelText_d, null, formInputs.length),
        });
      });

      // 4) checkbox — 이미 체크된 것(개인정보 동의 등)은 건드리지 않음
      //    disabled 상태도 수집은 함 (radio/select 채운 후 활성화될 수 있어서)
      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.checked) return; // 이미 체크된 건 건드리지 않음
        const style = window.getComputedStyle(checkbox);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (checkbox.offsetWidth === 0) return;

        const idx = formInputs.length;
        const labelText_c = collectLabelText(checkbox);
        checkbox.setAttribute('data-fill-idx', idx);
        formInputs.push({
          idx,
          type: 'checkbox',
          id: checkbox.id || null,
          name: checkbox.getAttribute('name') || null,
          labelText: labelText_c,
          disabled: checkbox.disabled, // AI에게 현재 disabled 여부 알림
          stableId: makeStableId('checkbox', labelText_c, null, formInputs.length),
        });
      });

      // 5) radio group — name 별로 묶어서 하나의 항목으로 수집
      //    예) 전역여부: [{value:'Y', label:'예'}, {value:'N', label:'아니오'}]
      {
        const seenNames = new Set();
        document.querySelectorAll('input[type="radio"]').forEach((radio) => {
          if (radio.disabled) return;
          const style = window.getComputedStyle(radio);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          if (radio.offsetWidth === 0) return;
          const groupName = radio.getAttribute('name');
          if (!groupName || seenNames.has(groupName)) return;
          seenNames.add(groupName);

          // 그룹 내 이미 선택된 것 있으면 스킵
          const groupEls = Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`));
          if (groupEls.some(r => r.checked)) return;

          const options = groupEls.map(r => {
            const lbl = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
            const labelTxt = lbl?.textContent.trim()
              || r.getAttribute('aria-label')
              || r.value;
            return `${labelTxt}(value=${r.value})`;
          });

          const idx = formInputs.length;
          const labelText_r = collectLabelText(radio);
          // 대표 요소(첫 번째 라디오)에만 data-fill-idx 부여
          radio.setAttribute('data-fill-idx', idx);
          formInputs.push({
            idx,
            type: 'radio',
            name: groupName,
            labelText: labelText_r,
            options,
            stableId: makeStableId('radio', labelText_r, null, formInputs.length),
          });
        });
      }

      // 3) select (드롭다운) — options 목록 포함해서 AI에 전달
      document.querySelectorAll('select').forEach((select) => {
        if (select.disabled) return;
        const style = window.getComputedStyle(select);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (select.offsetWidth === 0) return;
        // 이미 의미 있는 값이 선택된 경우 스킵 (placeholder option은 value="" 또는 0)
        const curVal = select.value;
        if (curVal && curVal !== '0' && curVal !== '-1') return;

        const options = Array.from(select.options)
          .filter(o => o.value !== '' && o.value !== '0' && o.value !== '-1')
          .map(o => `${o.text.trim()}(value=${o.value})`);
        if (options.length === 0) return;

        const idx = formInputs.length;
        const labelText_s = collectLabelText(select);
        select.setAttribute('data-fill-idx', idx);
        formInputs.push({
          idx,
          type: 'select',
          id: select.id || null,
          name: select.getAttribute('name') || null,
          labelText: labelText_s,
          options,
          stableId: makeStableId('select', labelText_s, null, formInputs.length),
        });
      });

      // 6) 커스텀 드롭다운 (Vuetify / Element UI / li 기반)
      //    native <select> 없이 div/span 클릭으로 열리는 드롭다운 감지
      {
        const customDropdownSelectors = [
          // Vuetify
          '.v-select__slot', '.v-select__selections',
          // Element UI
          '.el-select', '.el-select__input',
          // 범용 커스텀 드롭다운
          '[class*="select-wrap"] [class*="selected"]',
          '[class*="selectbox"] [class*="selected"]',
          '[class*="custom-select"]',
          '[class*="dropdown-trigger"]',
          '[role="combobox"]',
        ];
        customDropdownSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(trigger => {
            if (trigger.getAttribute('data-fill-idx') !== null) return; // 중복 방지
            const style = window.getComputedStyle(trigger);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            if (trigger.offsetWidth === 0) return;
            // 이미 선택된 텍스트가 있는지 확인 (placeholder가 아닌 경우 스킵)
            const currentText = trigger.textContent.trim();
            const isPlaceholder = !currentText || currentText.length < 2
              || /선택|please|select|--/i.test(currentText);
            if (!isPlaceholder) return;

            const idx = formInputs.length;
            const labelText_cd = collectLabelText(trigger);
            trigger.setAttribute('data-fill-idx', idx);
            trigger.setAttribute('data-fill-type', 'custom-dropdown');
            formInputs.push({
              idx,
              type: 'custom-dropdown',
              labelText: labelText_cd,
              currentText,
              stableId: makeStableId('custom-dropdown', labelText_cd, null, formInputs.length),
            });
          });
        });
      }

      // 문항 추출 전 진단 + 자소서 섹션 활성화
      debugQuestionDOM();
      updateProgress('📋 문항 추출 중...', 30, `${formInputs.length}개 필드 발견`, '자소서 섹션 탐색');
      const essayTabEl = await activateEssaySection(); // 탭 클릭 → DOM 생성 대기, tabEl 반환
      const questions = extractCoverLetterQuestions(essayTabEl);

      // 문항 즉시 전송 — fill loop와 독립적으로 비동기 처리 (fire-and-forget)
      // fill이 끝날 때까지 기다리지 않고 바로 앱에 전달
      if (questions.length > 0) {
        console.log('📋 룰 기반 추출 문항:', questions);
        const toSend = questions.map(q => ({ question: q.question, charLimit: q.charLimit ?? null }));
        bridgePost(port, secret, '/submit-extracted-questions', { questions: toSend })
          .then(result => {
            if (result?.success) {
              console.log(`[문항전송] ✅ ${questions.length}개 즉시 전송 완료 — 채우기 백그라운드 진행`);
              extractBtn.innerText = `✅ 문항 전송됨`;
            } else {
              console.warn('[문항전송] 앱 전송 실패 (앱 미실행?):', result?.error);
            }
          })
          .catch(err => console.warn('[문항전송] 네트워크 오류:', err.message));
      }

      // 프로필 매핑 분석 (AI) + 프로필 조회 병렬 실행
      updateProgress('🤖 AI 분석 중...', 50, `문항 ${questions.length}개 추출`, '채우기 시작...');
      const [profileRes, profileFillResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-profile').catch(() => null),
        formInputs.length > 0
          ? bridgePost(port, secret, '/analyze-profile-fill', { inputs: formInputs })
          : Promise.resolve({ success: false }),
      ]);

      const profile = (profileRes.status === 'fulfilled' && profileRes.value?.success)
        ? profileRes.value.profile
        : null;

      // 1단계: AI 매핑으로 채울 수 있는 필드 채움 (매칭 안 된 필드는 건너뜀)
      updateProgress('✍️ 필드 채우는 중...', 70, `문항 ${questions.length}개 추출됨`, 'AI 매핑 결과 적용');
      console.log('[디버그] profileFillResult:', JSON.stringify(profileFillResult));
      const aiFills = (profileFillResult.status === 'fulfilled' && profileFillResult.value?.success)
        ? profileFillResult.value.fills || []
        : [];
      aiFills.forEach(({ idx, value }) => {
        const el = document.querySelector(`[data-fill-idx="${idx}"]`);
        if (!el) { logFailed(`idx=${idx}`, 'unknown', 'DOM에서 요소 찾기 실패'); return; }
        if (!value) { logSkipped(`idx=${idx}`, 'AI 응답 값 없음'); return; }

        // 이미 올바른 값이면 스킵 (idempotency)
        if (alreadyFilled(el, value)) {
          console.log(`⏭️ 이미 채움 스킵: idx=${idx} → "${value}"`);
          logSkipped(`idx=${idx}`, '이미 채워진 필드');
          return;
        }

        if (el.tagName === 'SELECT') {
          // select: value 또는 option text로 매칭
          const opts = Array.from(el.options);
          const target = String(value).toLowerCase();
          const match = opts.find(o =>
            o.value.toLowerCase() === target ||
            o.text.trim().toLowerCase() === target ||
            o.text.trim().toLowerCase().includes(target) ||
            (target.includes(o.text.trim().toLowerCase()) && o.text.trim().length > 0)
          );
          if (match) {
            el.value = match.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ AI Select 채움: idx=${idx} → "${match.text.trim()}"`);
            logSuccess(`select[idx=${idx}]`, 'select', match.text.trim());
          } else {
            console.warn(`⚠️ Select 옵션 미매칭: idx=${idx} value="${value}"`);
            logFailed(`select[idx=${idx}]`, 'select', `옵션 미매칭: "${value}"`);
          }
        } else if (el.type === 'radio') {
          // radio group: name으로 전체 그룹 찾아서 텍스트 매칭 클릭
          const groupName = el.getAttribute('name');
          if (groupName) {
            const groupEls = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`);
            let clicked = false;
            for (const radio of groupEls) {
              const lbl = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
              const t = lbl?.textContent.trim() || radio.value;
              if (isSemanticallyEqual(t, value) || isSemanticallyEqual(radio.value, value)) {
                radio.click();
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ AI Radio 채움: idx=${idx} name="${groupName}" → "${t}"`);
                logSuccess(`radio[${groupName}]`, 'radio', t);
                clicked = true;
                break;
              }
            }
            if (!clicked) { console.warn(`⚠️ Radio 옵션 미매칭: idx=${idx} name="${groupName}" value="${value}"`); logFailed(`radio[${groupName}]`, 'radio', `옵션 미매칭: "${value}"`); }
          }
        } else if (el.type === 'checkbox') {
          // checkbox: "true"/"1"/true 일 때만 체크 (절대 uncheck 안 함)
          const shouldCheck = value === 'true' || value === true || value === '1' || value === 1;
          if (shouldCheck && !el.checked) {
            el.click();
            el.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ AI Checkbox 체크: idx=${idx} label="${el.getAttribute('data-fill-idx')}"`);
            logSuccess(`checkbox[idx=${idx}]`, 'checkbox', 'true');
          } else if (!shouldCheck) {
            logSkipped(`checkbox[idx=${idx}]`, 'AI값 false — uncheck 안함');
          }
        } else if (el.getAttribute('data-fill-type') === 'custom-dropdown') {
          // 커스텀 드롭다운 (Vuetify / Element UI)
          injectCustomDropdown(el, value, `custom-dropdown[idx=${idx}]`);
        } else if (el.type === 'date') {
          // date: YYYY-MM-DD 필수 — YYYY-MM이면 -01 패딩
          let dateVal = String(value).split(',')[0].trim();
          if (/^\d{4}-\d{2}$/.test(dateVal)) dateVal += '-01';
          dateVal = dateVal.slice(0, 10);
          const dateSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (dateSetter && dateSetter.set) dateSetter.set.call(el, dateVal);
          else el.value = dateVal;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: dateVal }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ AI Date 채움: idx=${idx} → "${dateVal}"`);
          logSuccess(`date[idx=${idx}]`, 'date', dateVal);
        } else {
          // text 계열 — React 17+ 대응: InputEvent + inputType:'insertText' 필수
          const proto = window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value');
          // 콤마 구분 다중값이면 첫 번째 항목만 사용 (반복 섹션 오매핑 방지)
          const singleValue = String(value).includes(',') && el.type !== 'hidden'
            ? String(value).split(',')[0].trim()
            : String(value);
          if (setter && setter.set) setter.set.call(el, singleValue);
          else el.value = singleValue;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: singleValue }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
          const confirmed = el.value === singleValue;
          console.log(`${confirmed ? '✅' : '⚠️'} AI 프로필 채움: idx=${idx} → "${singleValue}"${confirmed ? '' : ' (DOM 미반영 의심)'}`);
          if (confirmed) logSuccess(`text[idx=${idx}]`, el.type || 'text', singleValue);
          else logFailed(`text[idx=${idx}]`, el.type || 'text', 'DOM 미반영 — React setter 실패 의심');
        }
      });
      console.log(`[프로필] AI ${aiFills.length}개 채움`);
      updateProgress('✍️ 필드 채우는 중...', 70, `${aiFills.length}개 채움 완료`, '보완 매칭 중');

      // 2단계: 키워드 매칭으로 나머지 표준 필드 보완
      // (이미 AI가 채운 필드는 input.value 있어서 자동 스킵됨)
      if (profile) {
        fillProfileFields(profile);
      } else {
        console.log('[프로필] 프로필 정보 없음 — 키워드 보완 생략');
      }

      // 3단계: 600ms 후 재시도 — radio/select 채운 직후 disabled 해제되는 연동 필드 대응
      // 예) "보훈여부: 예" 선택 → "보훈구분" input이 enabled로 전환
      if (profile) {
        setTimeout(() => {
          // AI fill 중 disabled였던 필드들 재시도 (data-fill-idx 있으나 당시 disabled)
          aiFills.forEach(({ idx, value }) => {
            const el = document.querySelector(`[data-fill-idx="${idx}"]`);
            if (!el || !value || el.disabled) return; // 여전히 disabled면 스킵
            // 이미 값이 있으면 스킵
            if (el.tagName === 'SELECT' && el.value && el.value !== '0' && el.value !== '-1') return;
            if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.value) return;

            if (el.tagName === 'SELECT') {
              const opts = Array.from(el.options);
              const target = String(value).toLowerCase();
              const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target);
              if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); console.log(`✅ [재시도] Select: idx=${idx} → "${match.text.trim()}"`); }
            } else if (el.type === 'checkbox') {
              const shouldCheck = value === 'true' || value === '1';
              if (shouldCheck && !el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); console.log(`✅ [재시도] Checkbox: idx=${idx}`); }
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              const proto = el.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
              const setter = Object.getOwnPropertyDescriptor(proto, 'value');
              if (setter && setter.set) setter.set.call(el, value);
              else el.value = value;
              ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
              console.log(`✅ [재시도] Input: idx=${idx} → "${value}"`);
            }
          });
          // 키워드 매칭도 재시도 (새로 활성화된 필드 커버)
          fillProfileFields(profile);
          console.log('[재시도] 연동 필드 재시도 완료');

          // [종료 조건 보완] disabled→enabled된 필드가 있으면 한 번 더 AI 채움 시도
          const newlyEnabled = aiFills.filter(({ idx }) => {
            const el = document.querySelector(`[data-fill-idx="${idx}"]`);
            return el && !el.disabled && !alreadyFilled(el, aiFills.find(f => f.idx === idx)?.value);
          });
          if (newlyEnabled.length > 0) {
            console.log(`[수렴] 새로 활성화된 필드 ${newlyEnabled.length}개 재채움`);
            newlyEnabled.forEach(({ idx, value }) => {
              const el = document.querySelector(`[data-fill-idx="${idx}"]`);
              if (!el || alreadyFilled(el, value)) return;
              if (el.tagName === 'SELECT') {
                const opts = Array.from(el.options);
                const match = opts.find(o => isSemanticallyEqual(o.text, value) || isSemanticallyEqual(o.value, value));
                if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); console.log(`✅ [수렴] Select: idx=${idx} → "${match.text.trim()}"`); }
              } else if (el.type === 'radio') {
                const radioGroup = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
                for (const radio of radioGroup) {
                  const lbl = document.querySelector(`label[for="${radio.id}"]`);
                  const t = lbl?.textContent.trim() || radio.value;
                  if (isSemanticallyEqual(t, value)) { radio.click(); radio.dispatchEvent(new Event('change', { bubbles: true })); console.log(`✅ [수렴] Radio: "${t}"`); break; }
                }
              } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value');
                if (setter?.set) setter.set.call(el, value); else el.value = value;
                ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
                console.log(`✅ [수렴] Input: idx=${idx} → "${value}"`);
              }
            });
          }
        }, 600);
      }

      // [다중행] 추가 버튼 자동 클릭 → 새로 생긴 필드 2차 AI 채움
      const addBtns = Array.from(document.querySelectorAll('button, [role="button"], a[role="button"]'))
        .filter(btn => {
          if (btn.disabled) return false;
          const style = window.getComputedStyle(btn);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const t = btn.textContent.trim();
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          const cls = (btn.className || '').toLowerCase();
          // 텍스트 포함 버튼
          if (/추가|추가하기|행\s*추가|항목\s*추가|입력\s*추가/.test(t)) return true;
          // "+" 텍스트 단독 (icon-only add button)
          if (t === '+') return true;
          // aria-label 또는 class에 추가/add 포함
          if (/추가|add/.test(aria)) return true;
          if (/add|plus|append/.test(cls) && t.length < 5) return true;
          return false;
        });

      if (addBtns.length > 0) {
        // 클릭 전 현재 모든 필드를 "본 적 있음"으로 마킹 → 이후 새 필드만 감지
        markAllInputsAsSeen();
        addBtns.slice(0, 10).forEach(btn => {
          try { btn.click(); console.log(`➕ 행 추가 클릭: "${btn.textContent.trim()}"`); } catch(e) {}
        });
        await waitForDomSettle(2000);
        // Virtualized list: 새 visible 필드가 나타날 때까지 대기
        await waitForNewFields(1500);

        // 새로 생긴 빈 필드만 수집 (data-fill-idx 없는 것)
        let newIdx = formInputs.length;
        const newInputs = [];
        const collectNew = (el, type, extra = {}) => {
          if (el.getAttribute('data-fill-idx') !== null) return;
          el.setAttribute('data-fill-idx', newIdx);
          newInputs.push({ idx: newIdx, type, labelText: collectLabelText(el), ...extra });
          newIdx++;
        };
        document.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input[type="number"],input:not([type])').forEach(input => {
          if (input.disabled || input.readOnly || input.value) return;
          const s = window.getComputedStyle(input);
          if (s.display === 'none' || s.visibility === 'hidden' || input.offsetWidth === 0) return;
          collectNew(input, 'text', { placeholder: input.placeholder || null, name: input.getAttribute('name') || null });
        });
        document.querySelectorAll('input[type="date"]').forEach(input => {
          if (input.disabled || input.readOnly || input.value) return;
          const s = window.getComputedStyle(input);
          if (s.display === 'none' || s.visibility === 'hidden') return;
          collectNew(input, 'date', { name: input.getAttribute('name') || null });
        });
        document.querySelectorAll('select').forEach(select => {
          if (select.disabled) return;
          const s = window.getComputedStyle(select);
          if (s.display === 'none' || s.visibility === 'hidden' || select.offsetWidth === 0) return;
          const curVal = select.value;
          if (curVal && curVal !== '0' && curVal !== '-1') return;
          const options = Array.from(select.options)
            .filter(o => o.value !== '' && o.value !== '0' && o.value !== '-1')
            .map(o => `${o.text.trim()}(value=${o.value})`);
          if (options.length === 0) return;
          collectNew(select, 'select', { options, name: select.getAttribute('name') || null });
        });

        if (newInputs.length > 0) {
          console.log(`[다중행] 새 필드 ${newInputs.length}개 — 2차 AI 채움 시작`);
          try {
            const secondFill = await bridgePost(port, secret, '/analyze-profile-fill', { inputs: newInputs });
            console.log('[디버그] 2차 profileFillResult:', JSON.stringify({ status: 'fulfilled', value: secondFill }));
            const secondFills = secondFill?.success ? (secondFill.fills || []) : [];
            secondFills.forEach(({ idx, value }) => {
              const el = document.querySelector(`[data-fill-idx="${idx}"]`);
              if (!el || !value) return;
              if (alreadyFilled(el, value)) { console.log(`⏭️ 2차 스킵: idx=${idx}`); return; }
              if (el.tagName === 'SELECT') {
                const opts = Array.from(el.options);
                const target = String(value).toLowerCase();
                const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target || o.text.trim().toLowerCase().includes(target));
                if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); console.log(`✅ 2차 Select: idx=${idx} → "${match.text.trim()}"`); }
              } else if (el.type === 'radio') {
                const groupName = el.getAttribute('name');
                if (groupName) {
                  const groupEls = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(groupName)}"]`);
                  for (const radio of groupEls) {
                    const lbl = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
                    const t = lbl?.textContent.trim() || radio.value;
                    if (isSemanticallyEqual(t, value) || isSemanticallyEqual(radio.value, value)) {
                      radio.click(); radio.dispatchEvent(new Event('change', { bubbles: true }));
                      console.log(`✅ 2차 Radio: idx=${idx} → "${t}"`); break;
                    }
                  }
                }
              } else if (el.type === 'checkbox') {
                const shouldCheck = value === 'true' || value === true || value === '1';
                if (shouldCheck && !el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
              } else {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                if (setter?.set) setter.set.call(el, value); else el.value = value;
                ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
                console.log(`✅ 2차 채움: idx=${idx} → "${value}"`);
              }
            });
            console.log(`[다중행] 2차 AI ${secondFills.length}개 채움`);
          } catch(e) {
            console.warn('[다중행] 2차 AI 실패:', e.message);
          }
        } else {
          console.log('[다중행] 추가 버튼은 클릭됐으나 새 빈 필드 없음');
        }
      }

      // Save-button 루프 실행 (extractBtn 흐름)
      if (detectedSaveSections.length > 0) {
        updateProgress('💾 섹션 저장 중...', 85, `${detectedSaveSections.length}개 섹션`, '저장 버튼 패턴');
        for (const { sectionType, sectionRoot } of detectedSaveSections) {
          const entries = profile?.[sectionType] || [];
          console.log(`[Save루프 준비] ${sectionType}: profile 항목 ${entries.length}개`);
          if (entries.length <= 1) { console.log(`[Save루프 스킵] ${sectionType}: 1개 이하`); continue; }
          await fillSaveLoop(sectionType, entries, sectionRoot, port, secret);
        }
      }

      // 채우기 완료 — 문항은 이미 위에서 즉시 전송됨
      if (questions.length === 0) {
        console.warn('[문항추출] 자소서 입력창을 찾지 못함 — 앱에서 직접 입력 필요');
      }
      finishProgress(true, `채우기 완료 | 문항 ${questions.length}개 전송됨`);
    } catch (err) {
      const msg = err.message?.includes('Extension context invalidated')
        ? '페이지를 새로고침(F5) 후 다시 눌러주세요.\n(확장 프로그램 업데이트 후 필요)'
        : '문항 추출 실패: ' + err.message;
      finishProgress(false, err.message?.slice(0, 40) || '실패');
      alert(msg);
      extractBtn.innerText = '❌ 실패';
    } finally {
      // 실패 로그 요약 출력 (커버리지 튜닝 원료)
      showFillSummary();
      setTimeout(() => {
        extractBtn.disabled = false;
        extractBtn.innerText = '📋 문항 추출';
      }, 5000);
    }
  };

  // "🧑 프로필 채우기" 클릭: 문항 추출 없이 프로필 필드만 AI + 키워드 매칭으로 채움
  profileFillBtn.onclick = async () => {
    profileFillBtn.disabled = true;
    profileFillBtn.innerText = '⏳ 분석 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }
      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // Phase 0: Fill 전에 구조를 완성한다 (AI 없음)
      // "AI는 값을 채우고, DOM은 구조를 만든다"
      createProgressOverlay();
      updateProgress('🏗️ 폼 구조 확장 중...', 10, '', '반복 섹션 행 추가');
      profileFillBtn.innerText = '⏳ 구조 확장 중...';
      const detectedSaveSections = await expandSectionRows(port, secret) || [];

      // 라벨 텍스트 추출 헬퍼
      function collectLabelText(el) {
        let labelText = '';
        if (el.id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (lbl) labelText = lbl.textContent.trim();
          } catch {}
        }
        if (!labelText) labelText = el.getAttribute('aria-label') || '';
        if (!labelText) labelText = el.placeholder || '';
        if (!labelText) {
          let node = el.parentElement;
          while (node && node !== document.body) {
            if (node.tagName === 'LABEL') { labelText = node.textContent.replace(el.value || '', '').trim(); break; }
            node = node.parentElement;
          }
        }
        if (!labelText) {
          let node = el.parentElement;
          outer: for (let i = 0; i < 4 && node && node !== document.body; i++) {
            for (const child of node.children) {
              if (child.contains(el)) continue;
              const t = child.textContent.trim();
              if (t.length > 0 && t.length < 30 && !t.includes('\n')) { labelText = t; break outer; }
            }
            node = node.parentElement;
          }
        }
        return labelText.replace(/[*\s]+/g, ' ').trim();
      }

      // 폼 필드 메타데이터 수집
      const formInputs = [];

      const textSelectors = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])';
      document.querySelectorAll(textSelectors).forEach((input) => {
        if (input.disabled || input.readOnly) return;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (input.offsetWidth === 0 || input.value) return;
        const idx = formInputs.length;
        input.setAttribute('data-pfill-idx', idx);
        formInputs.push({ idx, type: 'text', id: input.id || null, name: input.getAttribute('name') || null,
          labelText: collectLabelText(input), placeholder: input.placeholder || null, ariaLabel: input.getAttribute('aria-label') || null });
      });

      document.querySelectorAll('input[type="date"]').forEach((input) => {
        if (input.disabled || input.readOnly || input.value) return;
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const idx = formInputs.length;
        input.setAttribute('data-pfill-idx', idx);
        formInputs.push({ idx, type: 'date', id: input.id || null, name: input.getAttribute('name') || null, labelText: collectLabelText(input) });
      });

      document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.checked) return;
        const style = window.getComputedStyle(checkbox);
        if (style.display === 'none' || style.visibility === 'hidden' || checkbox.offsetWidth === 0) return;
        const idx = formInputs.length;
        checkbox.setAttribute('data-pfill-idx', idx);
        formInputs.push({ idx, type: 'checkbox', id: checkbox.id || null, name: checkbox.getAttribute('name') || null,
          labelText: collectLabelText(checkbox), disabled: checkbox.disabled });
      });

      document.querySelectorAll('select').forEach((select) => {
        if (select.disabled) return;
        const style = window.getComputedStyle(select);
        if (style.display === 'none' || style.visibility === 'hidden' || select.offsetWidth === 0) return;
        const curVal = select.value;
        if (curVal && curVal !== '0' && curVal !== '-1') return;
        const options = Array.from(select.options)
          .filter(o => o.value !== '' && o.value !== '0' && o.value !== '-1')
          .map(o => `${o.text.trim()}(value=${o.value})`);
        if (options.length === 0) return;
        const idx = formInputs.length;
        select.setAttribute('data-pfill-idx', idx);
        formInputs.push({ idx, type: 'select', id: select.id || null, name: select.getAttribute('name') || null,
          labelText: collectLabelText(select), options });
      });

      // 프로필 + AI 매핑 병렬 요청
      updateProgress('🤖 AI 분석 중...', 40, `${formInputs.length}개 필드 수집`, 'Bridge 서버 호출');
      const [profileRes, profileFillResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-profile'),
        formInputs.length > 0
          ? bridgePost(port, secret, '/analyze-profile-fill', { inputs: formInputs })
          : Promise.resolve({ success: false })
      ]);

      const profile = (profileRes.status === 'fulfilled' && profileRes.value?.success) ? profileRes.value.profile : null;
      const aiFills = (profileFillResult.status === 'fulfilled' && profileFillResult.value?.success) ? profileFillResult.value.fills || [] : [];

      // AI 매핑 적용
      aiFills.forEach(({ idx, value }) => {
        const el = document.querySelector(`[data-pfill-idx="${idx}"]`);
        if (!el || !value) return;
        if (el.tagName === 'SELECT') {
          const opts = Array.from(el.options);
          const target = String(value).toLowerCase();
          const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target ||
            o.text.trim().toLowerCase().includes(target) || (target.includes(o.text.trim().toLowerCase()) && o.text.trim().length > 0));
          if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (el.type === 'checkbox') {
          const shouldCheck = value === 'true' || value === true || value === '1' || value === 1;
          if (shouldCheck && !el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (el.type === 'date') {
          el.value = String(value).slice(0, 10);
          ['input', 'change'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
        } else {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          if (setter && setter.set) setter.set.call(el, value); else el.value = value;
          ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
        }
      });
      console.log(`[프로필 채우기] AI ${aiFills.length}개 채움`);

      // 키워드 매칭으로 나머지 보완
      if (profile) fillProfileFields(profile);

      // 600ms 재시도 — disabled→enabled 연동 필드 대응
      if (profile) {
        setTimeout(() => {
          aiFills.forEach(({ idx, value }) => {
            const el = document.querySelector(`[data-pfill-idx="${idx}"]`);
            if (!el || !value || el.disabled) return;
            if (el.tagName === 'SELECT' && el.value && el.value !== '0' && el.value !== '-1') return;
            if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.value) return;
            if (el.tagName === 'SELECT') {
              const opts = Array.from(el.options);
              const target = String(value).toLowerCase();
              const match = opts.find(o => o.value.toLowerCase() === target || o.text.trim().toLowerCase() === target);
              if (match) { el.value = match.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
            } else if (el.type === 'checkbox') {
              if ((value === 'true' || value === '1') && !el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
            } else {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
              if (setter && setter.set) setter.set.call(el, value);
              ['input', 'change', 'blur'].forEach(e => el.dispatchEvent(new Event(e, { bubbles: true })));
            }
          });
          fillProfileFields(profile);
        }, 600);
      }

      // Save-button 루프 실행 (expandSectionRows 반환 목록 사용 — DOM 속성 유실 방지)
      if (detectedSaveSections.length > 0) {
        updateProgress('💾 섹션 저장 중...', 85, `${detectedSaveSections.length}개 섹션`, '저장 버튼 패턴');
        for (const { sectionType, sectionRoot, needed } of detectedSaveSections) {
          const entries = profile?.[sectionType] || [];
          console.log(`[Save루프 준비] ${sectionType}: profile 항목 ${entries.length}개, needed ${needed}`);
          if (entries.length <= 1) {
            console.log(`[Save루프 스킵] ${sectionType}: profile 항목 1개 이하`);
            continue;
          }
          await fillSaveLoop(sectionType, entries, sectionRoot, port, secret);
        }
      }

      const totalFilled = aiFills.length;
      profileFillBtn.innerText = totalFilled > 0 ? `✅ ${totalFilled}개 채움!` : '✅ 완료 (매칭 없음)';
      finishProgress(true, totalFilled > 0 ? `${totalFilled}개 필드 채움 완료` : '완료 (매칭 없음)');
    } catch (err) {
      const msg = err.message?.includes('Extension context invalidated')
        ? '페이지를 새로고침(F5) 후 다시 눌러주세요.\n(확장 프로그램 업데이트 후 필요)'
        : '프로필 채우기 실패: ' + err.message;
      finishProgress(false, err.message?.slice(0, 40) || '실패');
      alert(msg);
      profileFillBtn.innerText = '❌ 실패';
    } finally {
      setTimeout(() => {
        profileFillBtn.disabled = false;
        profileFillBtn.innerText = '🧑 프로필 채우기';
      }, 3000);
    }
  };

  // 문자열 정규화 (공백 제거, 소문자)
  function normalizeText(s) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  // 두 질문 텍스트가 충분히 유사한지 판단 (앞 40자 포함 관계)
  function questionsMatch(stored, found) {
    const a = normalizeText(stored);
    const b = normalizeText(found);
    if (a === b) return true;
    const prefix = Math.min(40, Math.min(a.length, b.length));
    if (prefix >= 10 && a.slice(0, prefix) === b.slice(0, prefix)) return true;
    return false;
  }

  // textarea에 값을 React/Vue 호환 방식으로 채움
  function fillTextarea(ta, text) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (setter) setter.set.call(ta, text);
    else ta.value = text;
    ['input', 'change', 'keyup'].forEach(evt => ta.dispatchEvent(new Event(evt, { bubbles: true })));
  }

  // 자소서 textarea 목록 반환 (findNearbyCharLimit 재사용)
  function getCoverLetterTextareas() {
    return Array.from(document.querySelectorAll('textarea')).filter(ta => {
      if (ta.offsetHeight < 60) return false;
      const s = window.getComputedStyle(ta);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const nearbyLimit = findNearbyCharLimit(ta);
      const maxLen = ta.getAttribute('maxlength') ? parseInt(ta.getAttribute('maxlength')) : null;
      if (nearbyLimit !== null && nearbyLimit < 200) return false;
      if (nearbyLimit === null && maxLen !== null && maxLen < 200) return false;
      return true;
    });
  }

  // 2. 버튼 클릭 시 주입 로직 실행
  btn.onclick = async () => {
    btn.disabled = true;
    btn.innerText = '⏳ 처리 중...';

    try {
      const config = await chrome.storage.local.get(['bridgePort', 'bridgeSecret']);
      if (!config.bridgePort || !config.bridgeSecret) {
        alert('확장 프로그램 설정에서 포트와 보안 키를 먼저 등록해 주세요!');
        return;
      }

      const port = config.bridgePort;
      const secret = config.bridgeSecret;

      // 답변 목록 + 프로필 병렬 요청
      const [answersResult, profileResult] = await Promise.allSettled([
        bridgePost(port, secret, '/get-answers'),
        bridgePost(port, secret, '/get-profile')
      ]);

      // 프로필 기본 정보 자동 입력
      const unfilledFields = [];
      if (profileResult.status === 'fulfilled' && profileResult.value?.success && profileResult.value?.profile) {
        const unfilled = fillProfileFields(profileResult.value.profile);
        unfilledFields.push(...unfilled);
      }
      if (unfilledFields.length > 0) {
        try {
          await bridgePost(port, secret, '/report-empty-fields', { fields: unfilledFields, url: location.href });
        } catch { /* 선택적 기능 */ }
      }

      // 답변 없으면 에러
      if (answersResult.status !== 'fulfilled' || !answersResult.value?.success) {
        const msg = answersResult.status === 'fulfilled'
          ? (answersResult.value?.error || '대기 중인 답변이 없습니다. 앱에서 [전송]을 먼저 눌러주세요.')
          : '브릿지 서버에 연결할 수 없습니다.';
        throw new Error(msg);
      }

      const answers = answersResult.value.answers; // [{question, answer, charLimit}]
      const allTa = getCoverLetterTextareas();
      let filledCount = 0;
      const usedTa = new Set();

      // 1차: question 텍스트 매칭으로 채움
      for (const ans of answers) {
        for (const ta of allTa) {
          if (usedTa.has(ta)) continue;
          const labelText = findLabelText(ta);
          if (labelText && questionsMatch(ans.question, labelText)) {
            fillTextarea(ta, ans.answer);
            usedTa.add(ta);
            filledCount++;
            console.log(`✅ 매칭: "${ans.question.slice(0, 30)}..."`);
            break;
          }
        }
      }

      // 2차 폴백: 매칭 실패 시 순서대로 채움
      if (filledCount === 0 && allTa.length > 0) {
        console.log('⚠️ 질문 매칭 실패 — 순서 기반 폴백으로 채웁니다.');
        answers.forEach((ans, i) => {
          if (allTa[i] && !usedTa.has(allTa[i])) {
            fillTextarea(allTa[i], ans.answer);
            filledCount++;
          }
        });
      }

      btn.innerText = `✅ ${filledCount}개 완료!`;
      console.log(`✅ ${filledCount}/${answers.length}개 문항 자동 입력 완료`);
    } catch (err) {
      const msg = err.message?.includes('Extension context invalidated')
        ? '페이지를 새로고침(F5) 후 다시 눌러주세요.\n(확장 프로그램 업데이트 후 필요)'
        : '주입 실패: ' + err.message;
      alert(msg);
      btn.innerText = '❌ 실패';
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerText = '✨ 자동 입력';
      }, 3000);
    }
  };
})();
