/** staging 環境のみ：【要確認】を黄色でハイライトしてレビューしやすくする */
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const targets: Text[] = [];
while (walker.nextNode()) {
  const n = walker.currentNode as Text;
  if (n.nodeValue?.includes('【要確認')) targets.push(n);
}
for (const node of targets) {
  const frag = document.createDocumentFragment();
  const parts = node.nodeValue!.split(/(【要確認[^】]*】)/);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('【要確認')) {
      const m = document.createElement('mark');
      m.className = 'tbd';
      m.textContent = p;
      frag.appendChild(m);
    } else frag.appendChild(document.createTextNode(p));
  }
  node.replaceWith(frag);
}
