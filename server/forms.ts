/**
 * フォーム受付の共通処理（Cloudflare Pages Functions から呼ばれる）
 * 仕様書 9-3：Turnstile ＋ ハニーポット ＋ 送信時間チェック ＋ サーバ側検証 ＋ Origin 検証
 * 個人情報はログに出さず、DB にも保存しない（メール送信のみ）。
 */

export interface Env {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
  PUBLIC_TIMEREX_URL?: string;
  /** staging で Turnstile 未設定のまま動かす場合のみ "true" */
  ALLOW_NO_TURNSTILE?: string;
}

export type FormKind = 'booking' | 'contact';

export const GRADES = ['未就学', '小1', '小2', '小3', '小4', '小5', '小6', 'その他'];
export const TOPICS: Record<string, string> = {
  strategy: '受験するかどうか・全体の進め方',
  juku: '塾選び・転塾',
  study: '成績・勉強方法',
  'school-selection': '志望校・併願校',
  'home-study': '家庭学習・学習計画',
  mock: '模試・過去問',
  continuous: '継続的に相談したい',
  other: 'その他・まだ分からない',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 3000;

export type Validated =
  | { ok: true; spam: false; data: Record<string, string>; topics: string[] }
  | { ok: true; spam: true }
  | { ok: false; errors: string[] };

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max);
/** メールヘッダインジェクション対策：改行を除去 */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ');

export function validate(fd: FormData, kind: FormKind, now = Date.now()): Validated {
  // ハニーポット・送信時間（ボットには成功したように見せて破棄）
  if (str(fd, 'website', 200)) return { ok: true, spam: true };
  const started = Number(fd.get('started_at'));
  if (Number.isFinite(started) && started > 0 && now - started < MIN_FILL_MS) return { ok: true, spam: true };

  const errors: string[] = [];
  const name = oneLine(str(fd, 'name', 50));
  const email = oneLine(str(fd, 'email', 254));
  if (!name) errors.push('name');
  if (!EMAIL_RE.test(email)) errors.push('email');
  if (fd.get('consent') !== 'yes') errors.push('consent');

  if (kind === 'contact') {
    const message = str(fd, 'message', 2000);
    if (!message) errors.push('message');
    if (errors.length) return { ok: false, errors };
    return {
      ok: true, spam: false, topics: [],
      data: { name, email, organization: oneLine(str(fd, 'organization', 100)), message },
    };
  }

  const grade = str(fd, 'grade', 10);
  if (!GRADES.includes(grade)) errors.push('grade');
  const topics = fd.getAll('topics').map(String).filter((t) => t in TOPICS);
  if (topics.length === 0) errors.push('topics');
  const message = str(fd, 'message', 1000);
  // URL を大量に含む本文はスパムとみなす
  if ((message.match(/https?:\/\//g) ?? []).length > 3) return { ok: true, spam: true };
  if (errors.length) return { ok: false, errors };

  return {
    ok: true, spam: false, topics,
    data: {
      name, email, grade, message,
      kana: oneLine(str(fd, 'kana', 50)),
      tel: oneLine(str(fd, 'tel', 20)),
      juku_status: oneLine(str(fd, 'juku_status', 20)),
      format: oneLine(str(fd, 'format', 20)),
      source: oneLine(str(fd, 'source', 50)),
      utm: oneLine(str(fd, 'utm', 300)),
      landing_page: oneLine(str(fd, 'landing_page', 200)),
    },
  };
}

export async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const json = (await res.json()) as { success?: boolean };
  return json.success === true;
}

async function sendMail(env: Env, to: string, subject: string, text: string, replyTo?: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`mail send failed: ${res.status}`);
}

export function buildMails(kind: FormKind, data: Record<string, string>, topics: string[], env: Env) {
  const topicLabels = topics.map((t) => TOPICS[t]).join('、');
  if (kind === 'contact') {
    return {
      notify: {
        subject: `[お問い合わせ] ${data.organization || data.name}`,
        text: `お問い合わせを受け付けました。\n\nお名前：${data.name}\n会社名・団体名：${data.organization}\nメール：${data.email}\n\n${data.message}\n`,
      },
      reply: null,
    };
  }
  const rows = [
    ['お名前', data.name], ['ふりがな', data.kana], ['メールアドレス', data.email], ['電話番号', data.tel],
    ['お子さまの学年', data.grade], ['ご相談したいこと', topicLabels], ['ご希望の相談形式', data.format],
    ['通塾状況', data.juku_status], ['ご相談内容', data.message], ['知ったきっかけ', data.source],
  ].filter(([, v]) => v).map(([k, v]) => `■${k}\n${v}`).join('\n\n');
  const booking = env.PUBLIC_TIMEREX_URL
    ? `\nご都合の良い日時は、こちらからもお選びいただけます。\n${env.PUBLIC_TIMEREX_URL}\n`
    : '';
  return {
    notify: {
      subject: `[相談予約] ${data.grade} / ${topicLabels}`,
      text: `相談予約のお申し込みがありました。\n\n${rows}\n\n---\n流入：${data.landing_page} ${data.utm}\n`,
    },
    reply: {
      subject: '【COMPASS】ご相談のお申し込みを受け付けました',
      text:
        `${data.name} 様\n\nこのたびは COMPASS 中学受験コンサルタントにご相談のお申し込みをいただき、ありがとうございます。\n` +
        `内容を確認のうえ、担当より日程調整のご連絡をいたします。\n${booking}\n` +
        `――― お申し込み内容 ―――\n\n${rows}\n\n` +
        `――――――――――――――\n\nお心当たりのない場合は、お手数ですがこのメールを破棄してください。\n\n` +
        `COMPASS 中学受験コンサルタント\n`,
    },
  };
}

function respond(request: Request, kind: FormKind, status: number, body: { ok: boolean; message?: string; errors?: string[] }) {
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
  if (wantsJson) return Response.json(body, { status });
  if (body.ok) {
    const to = kind === 'booking' ? '/consultation/thanks/' : '/contact/thanks/';
    return Response.redirect(new URL(to, request.url).href, 303);
  }
  return new Response(`${body.message ?? '送信できませんでした。'}\nブラウザの「戻る」で入力画面に戻り、内容をご確認ください。`, {
    status, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function handleForm(request: Request, env: Env, kind: FormKind): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });

  // Origin 検証（自ドメイン以外からの POST を拒否）
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return respond(request, kind, 403, { ok: false, message: '不正なリクエストです。' });
  }

  let fd: FormData;
  try { fd = await request.formData(); } catch { return respond(request, kind, 400, { ok: false, message: '入力内容を読み取れませんでした。' }); }

  const v = validate(fd, kind);
  if (v.ok && v.spam) return respond(request, kind, 200, { ok: true });
  if (!v.ok) return respond(request, kind, 422, { ok: false, message: '入力内容に不備があります。', errors: v.errors });

  if (env.TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(String(fd.get('cf-turnstile-response') ?? ''), env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
    if (!passed) return respond(request, kind, 400, { ok: false, message: '認証を確認できませんでした。ページを再読み込みしてお試しください。' });
  } else if (env.ALLOW_NO_TURNSTILE !== 'true') {
    return respond(request, kind, 500, { ok: false, message: 'ただいまフォームを利用できません。' });
  }

  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
    return respond(request, kind, 500, { ok: false, message: 'ただいまフォームを利用できません。' });
  }

  const mails = buildMails(kind, v.data, v.topics, env);
  try {
    await sendMail(env, env.MAIL_TO, mails.notify.subject, mails.notify.text, v.data.email);
    if (mails.reply) await sendMail(env, v.data.email, mails.reply.subject, mails.reply.text, env.MAIL_TO);
  } catch {
    // 個人情報を含めないエラーログのみ
    console.error(`[forms] ${kind}: mail delivery failed`);
    return respond(request, kind, 502, { ok: false, message: '送信できませんでした。' });
  }
  return respond(request, kind, 200, { ok: true });
}
