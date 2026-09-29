import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, buildMails, handleForm } from '../../server/forms.ts';

const base = () => {
  const fd = new FormData();
  fd.set('name', '山田 花子');
  fd.set('email', 'hanako@example.com');
  fd.set('grade', '小5');
  fd.append('topics', 'juku');
  fd.append('topics', 'study');
  fd.set('consent', 'yes');
  fd.set('started_at', String(Date.now() - 60_000));
  return fd;
};

test('正しい入力は通る', () => {
  const v = validate(base(), 'booking');
  assert.ok(v.ok && !v.spam);
  if (v.ok && !v.spam) assert.deepEqual(v.topics, ['juku', 'study']);
});

test('必須項目の欠落を検出する', () => {
  const fd = new FormData();
  fd.set('started_at', String(Date.now() - 60_000));
  const v = validate(fd, 'booking');
  assert.ok(!v.ok);
  if (!v.ok) assert.deepEqual(v.errors.sort(), ['consent', 'email', 'grade', 'name', 'topics']);
});

test('不正な学年・テーマは受け付けない', () => {
  const fd = base();
  fd.set('grade', '中1');
  fd.delete('topics');
  fd.append('topics', 'unknown');
  const v = validate(fd, 'booking');
  assert.ok(!v.ok);
});

test('ハニーポットと送信時間でスパム判定', () => {
  const a = base(); a.set('website', 'http://spam');
  assert.deepEqual(validate(a, 'booking'), { ok: true, spam: true });
  const b = base(); b.set('started_at', String(Date.now() - 500));
  assert.deepEqual(validate(b, 'booking'), { ok: true, spam: true });
});

test('改行を含む名前はヘッダインジェクションにならない', () => {
  const fd = base(); fd.set('name', '山田\r\nBcc: x@example.com');
  const v = validate(fd, 'booking');
  assert.ok(v.ok && !v.spam);
  if (v.ok && !v.spam) assert.ok(!v.data.name.includes('\n'));
});

test('自動返信メールに「無料」「合格」を含めない', () => {
  const v = validate(base(), 'booking');
  if (!(v.ok && !v.spam)) throw new Error('invalid');
  const m = buildMails('booking', v.data, v.topics, {});
  assert.ok(m.reply);
  assert.ok(!/無料|合格/.test(m.reply!.text));
  assert.match(m.notify.subject, /小5/);
});

test('他ドメインからの POST は拒否', async () => {
  const req = new Request('https://compass.example/api/consultation', {
    method: 'POST', body: base(), headers: { Origin: 'https://evil.example', Accept: 'application/json' },
  });
  const res = await handleForm(req, {}, 'booking');
  assert.equal(res.status, 403);
});

test('設定不足時は送信しない（500）', async () => {
  const req = new Request('https://compass.example/api/consultation', { method: 'POST', body: base(), headers: { Accept: 'application/json' } });
  const res = await handleForm(req, {}, 'booking');
  assert.equal(res.status, 500);
});

test('JS無効時の成功は完了ページへ303リダイレクト', async () => {
  const fd = base(); fd.set('website', 'bot');
  const req = new Request('https://compass.example/api/consultation', { method: 'POST', body: fd });
  const res = await handleForm(req, {}, 'booking');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), 'https://compass.example/consultation/thanks/');
});
