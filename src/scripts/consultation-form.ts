import { track } from './analytics';

/**
 * 相談予約フォーム：入力 → 確認 → 送信 → 完了ページ
 * JS が無効な環境では通常の POST（/api/consultation → 303 で完了ページへ）として動作する。
 * 個人情報（入力値）は計測に送らない。
 */
export function initConsultationForm() {
  const form = document.querySelector<HTMLFormElement>('[data-consultation-form]');
  if (!form) return;

  const stepInput = form.querySelector<HTMLElement>('[data-step="input"]')!;
  const stepConfirm = form.querySelector<HTMLElement>('[data-step="confirm"]')!;
  const summary = document.querySelector<HTMLElement>('[data-error-summary]')!;
  const summaryList = summary.querySelector('[data-error-list]')!;
  const submitError = document.querySelector<HTMLElement>('[data-submit-error]')!;
  const indicators = document.querySelectorAll<HTMLElement>('[data-step-indicator]');

  // 流入情報（個人情報ではない）
  const params = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].map((k) => params.get(k) ? `${k}=${params.get(k)}` : '').filter(Boolean).join('&');
  (form.elements.namedItem('utm') as HTMLInputElement).value = utm;
  (form.elements.namedItem('landing_page') as HTMLInputElement).value = document.referrer ? new URL(document.referrer).pathname : '';
  (form.elements.namedItem('started_at') as HTMLInputElement).value = String(Date.now());

  // ?topic=juku などでテーマを事前選択
  const topic = params.get('topic');
  if (topic) {
    const box = form.querySelector<HTMLInputElement>(`input[name="topics"][value="${CSS.escape(topic)}"]`);
    if (box) box.checked = true;
  }

  // 下書きの一時保存（sessionStorage のみ。送信完了で削除）
  const DRAFT = 'compass_consultation_draft';
  try {
    const saved = sessionStorage.getItem(DRAFT);
    if (saved) {
      const data = JSON.parse(saved) as Record<string, string | string[]>;
      for (const [k, v] of Object.entries(data)) {
        const els = form.querySelectorAll<HTMLInputElement>(`[name="${k}"]`);
        els.forEach((el) => {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = ([] as string[]).concat(v).includes(el.value);
          else if (el.type !== 'hidden') el.value = String(v);
        });
      }
    }
  } catch { /* ignore */ }
  const saveDraft = () => {
    try {
      const fd = new FormData(form);
      const data: Record<string, string | string[]> = {};
      for (const k of ['name', 'kana', 'email', 'tel', 'grade', 'juku_status', 'message', 'source', 'format']) {
        const v = fd.get(k);
        if (v) data[k] = String(v);
      }
      data.topics = fd.getAll('topics').map(String);
      sessionStorage.setItem(DRAFT, JSON.stringify(data));
    } catch { /* ignore */ }
  };

  let started = false;
  form.addEventListener('focusin', () => {
    if (!started) { started = true; track('form_start', { form_id: 'booking' }); }
  });
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  const setStep = (n: 1 | 2) => {
    indicators.forEach((el, i) => {
      if (i === n - 1) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
      el.classList.toggle('is-done', i < n - 1);
    });
    stepInput.hidden = n !== 1;
    stepConfirm.hidden = n !== 2;
  };

  type Check = { field: string; ok: () => boolean; message: string; focus: () => HTMLElement | null };
  const q = (sel: string) => form.querySelector<HTMLInputElement>(sel);
  const checks: Check[] = [
    { field: 'name', ok: () => !!q('[name="name"]')!.value.trim(), message: 'お名前を入力してください', focus: () => q('[name="name"]') },
    { field: 'email', ok: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q('[name="email"]')!.value.trim()), message: 'メールアドレスの形式をご確認ください', focus: () => q('[name="email"]') },
    { field: 'grade', ok: () => !!q('[name="grade"]:checked'), message: 'お子さまの学年を選択してください', focus: () => q('[name="grade"]') },
    { field: 'topics', ok: () => !!q('[name="topics"]:checked'), message: 'ご相談したいことを1つ以上選択してください', focus: () => q('[name="topics"]') },
    { field: 'consent', ok: () => !!q('[name="consent"]:checked'), message: 'プライバシーポリシーへの同意が必要です', focus: () => q('[name="consent"]') },
  ];

  const validate = () => {
    const failed = checks.filter((c) => !c.ok());
    checks.forEach((c) => {
      const wrap = form.querySelector<HTMLElement>(`[data-field="${c.field}"]`);
      const bad = failed.includes(c);
      wrap?.setAttribute('data-invalid', String(bad));
      wrap?.querySelectorAll('input, textarea').forEach((i) => i.setAttribute('aria-invalid', String(bad)));
    });
    summaryList.innerHTML = '';
    for (const f of failed) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = f.message;
      a.addEventListener('click', (e) => { e.preventDefault(); f.focus()?.focus(); });
      li.appendChild(a);
      summaryList.appendChild(li);
      track('form_error', { form_id: 'booking', error_field: f.field, error_type: 'required' });
    }
    summary.hidden = failed.length === 0;
    if (failed.length) summary.focus();
    return failed.length === 0;
  };

  // 項目を修正したらその場でエラー表示を解除
  form.addEventListener('change', (e) => {
    const wrap = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
    const c = checks.find((x) => x.field === wrap?.dataset.field);
    if (wrap && c && wrap.dataset.invalid === 'true' && c.ok()) wrap.dataset.invalid = 'false';
  });

  const labelFor: Record<string, string> = {
    name: 'お名前', kana: 'ふりがな', email: 'メールアドレス', tel: '電話番号', grade: 'お子さまの学年',
    topics: 'ご相談したいこと', format: 'ご希望の相談形式', juku_status: '通塾状況', message: 'ご相談内容', source: '知ったきっかけ',
  };

  const renderConfirm = () => {
    const list = form.querySelector('[data-confirm-list]')!;
    list.innerHTML = '';
    const fd = new FormData(form);
    for (const key of Object.keys(labelFor)) {
      let value = '';
      if (key === 'topics') {
        value = Array.from(form.querySelectorAll<HTMLInputElement>('[name="topics"]:checked'))
          .map((i) => i.nextElementSibling?.textContent ?? i.value).join('、');
      } else value = String(fd.get(key) ?? '').trim();
      if (!value) continue;
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = labelFor[key];
      dd.textContent = value; // textContent でエスケープ
      row.append(dt, dd);
      list.appendChild(row);
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    renderConfirm();
    setStep(2);
    track('form_step', { form_id: 'booking', step_number: 2, step_name: 'confirm' });
    form.querySelector<HTMLElement>('[data-confirm-title]')?.focus();
    window.scrollTo({ top: 0 });
  });

  form.querySelector('[data-back]')!.addEventListener('click', () => {
    setStep(1);
    q('[name="name"]')?.focus();
  });

  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = '送信しています…';
    submitError.hidden = true;
    try {
      const fd = new FormData(form);
      const res = await fetch(form.action, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !body.ok) throw new Error(body.message || '送信できませんでした。');
      // 完了ページで generate_lead を1回だけ送るためのフラグ（個人情報を含めない）
      try {
        sessionStorage.setItem('compass_lead', JSON.stringify({
          lead_type: 'booking',
          consult_topic_category: fd.getAll('topics').map(String).join(','),
          child_grade_band: String(fd.get('grade') ?? ''),
        }));
        sessionStorage.removeItem(DRAFT);
      } catch { /* ignore */ }
      location.href = '/consultation/thanks/';
    } catch (err) {
      submitError.textContent = `${(err as Error).message} 時間をおいて再度お試しいただくか、メールでお問い合わせください。`;
      submitError.hidden = false;
      submitError.scrollIntoView({ block: 'center' });
      submitBtn.disabled = false;
      submitBtn.textContent = 'この内容で申し込む';
      window.turnstile?.reset();
    }
  });
}
