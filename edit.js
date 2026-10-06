// 職業人生ゲーム - 編集モード（edit.html）
// 実際のページを表示したまま文字をクリックして直し、GitHub に直接保存する。
// 保存すると GitHub Pages が自動で作り直すので、1〜2分でサイトに反映される。

const REPO = "hacot0600/career-life-game";
// 保存先のブランチ。edit.html?branch=xxx で切り替えられる。
const BRANCH = new URLSearchParams(location.search).get("branch") || "main";
const TOKEN_KEY = "cle-edit-token";

const PAGES = [
  { path: "index.html", label: "トップ" },
  { path: "about.html", label: "職業人生ゲームとは" },
  { path: "sponsors.html", label: "各地の協賛企業" },
  { path: "organizer.html", label: "主催団体" },
  { path: "support.html", label: "賛助企業" },
  { path: "faq.html", label: "よくある質問" },
  { path: "contact.html", label: "お問い合わせ" },
];

// プレビュー用に edit.html を1ファイルにまとめたときは window.EDIT_DEMO にページの中身が入る。
// その場合は GitHub に保存せず、変更内容を見せるだけにする。
const DEMO = window.EDIT_DEMO || null;

// 文字を直せる場所を決めるための、中に入っていたら「段落より大きい」とみなすタグ
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DETAILS", "DIALOG", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6",
  "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TBODY", "THEAD",
  "TFOOT", "TR", "TD", "TH", "UL", "SUMMARY", "IFRAME", "VIDEO", "SELECT", "TEXTAREA",
]);
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG"]);

const $ = (id) => document.getElementById(id);
const els = {
  page: $("ed-page"),
  count: $("ed-count"),
  discard: $("ed-discard"),
  save: $("ed-save"),
  settings: $("ed-settings"),
  message: $("ed-message"),
  frame: $("ed-frame"),
  setup: $("ed-setup"),
  setupForm: $("ed-setup-form"),
  token: $("ed-token"),
  tokenClear: $("ed-token-clear"),
  setupError: $("ed-setup-error"),
  review: $("ed-review"),
  reviewTitle: $("ed-review-title"),
  reviewList: $("ed-review-list"),
  reviewNote: $("ed-review-note"),
  reviewOk: $("ed-review-ok"),
};

const state = {
  path: null,
  source: "", // GitHub にある元の HTML
  sha: null, // GitHub 上のファイルの版（上書き事故を防ぐため保存時に送る）
  original: [], // 編集できる場所ごとの元の中身（番号順）
  dirty: new Set(), // 変更された場所の番号
};

// ---------- 文字を直せる場所を見つける ----------

function hasOwnText(el) {
  return [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== "");
}

function hasBlockInside(el) {
  return [...el.querySelectorAll("*")].some((d) => BLOCK_TAGS.has(d.tagName));
}

// 自分の中に文字が直接あり、中に段落などを含まない一番外側の要素を、文書の順番に集める。
// 同じ HTML なら必ず同じ順番になるので、番号で元のファイルと画面を対応づけられる。
function findEditable(root) {
  const found = [];
  (function walk(el) {
    for (const child of el.children) {
      if (SKIP_TAGS.has(child.tagName.toUpperCase())) continue;
      if (hasOwnText(child) && !hasBlockInside(child)) found.push(child);
      else walk(child);
    }
  })(root);
  return found;
}

// ---------- GitHub とのやりとり ----------

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

function setToken(value) {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* 保存できないブラウザでは毎回入力してもらう */ }
}

async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${getToken()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function decodeBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function loadSource(path) {
  if (DEMO) return { text: DEMO.pages[path], sha: null };
  const data = await github(`contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`);
  return { text: decodeBase64(data.content), sha: data.sha };
}

async function saveSource(path, text, summary) {
  const data = await github(`contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `編集モードで ${path} の文字を修正（${summary}）`,
      content: encodeBase64(text),
      sha: state.sha,
      branch: BRANCH,
    }),
  });
  return data.content.sha;
}

// ---------- 画面の表示 ----------

function setMessage(text, kind = "") {
  els.message.textContent = text;
  els.message.className = `ed-message${kind ? ` is-${kind}` : ""}`;
}

function updateCount() {
  const n = state.dirty.size;
  els.count.textContent = n ? `変更 ${n}か所（未保存）` : "変更なし";
  els.count.classList.toggle("is-dirty", n > 0);
  els.save.disabled = n === 0;
  els.discard.disabled = n === 0;
}

const FRAME_STYLE = `
  [data-cle-id] { outline: 1px dashed rgba(245, 160, 0, 0.7); outline-offset: 2px; cursor: text; }
  [data-cle-id]:hover { outline: 2px solid rgba(245, 160, 0, 0.9); }
  [data-cle-id]:focus { outline: 2px solid #f5a000; background: rgba(255, 248, 225, 0.35); }
  [data-cle-id].cle-changed { box-shadow: inset 0 0 0 9999px rgba(255, 214, 0, 0.18); }
  .hero-slide { pointer-events: none; }
`;

function renderPage() {
  const doc = new DOMParser().parseFromString(state.source, "text/html");
  const editable = findEditable(doc.body);
  state.original = editable.map((el) => el.innerHTML);
  editable.forEach((el, i) => el.setAttribute("data-cle-id", String(i)));

  // 画像・CSS・スクリプトは本物のサイトから読み込む
  const base = doc.createElement("base");
  base.href = new URL(".", location.href).href;
  doc.head.prepend(base);
  const style = doc.createElement("style");
  style.textContent = FRAME_STYLE;
  doc.head.append(style);

  els.frame.onload = setupFrame;
  els.frame.srcdoc = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

function setupFrame() {
  const fdoc = els.frame.contentDocument;
  if (!fdoc) return;

  // 編集中はリンクで別のページに移動したり、フォームを送信したりしない
  fdoc.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link) e.preventDefault();
  }, true);
  fdoc.addEventListener("submit", (e) => e.preventDefault(), true);
  // よくある質問の答えも直せるように全部開いておく
  fdoc.querySelectorAll("details").forEach((d) => (d.open = true));
  fdoc.querySelectorAll("summary").forEach((s) => s.addEventListener("click", (e) => e.preventDefault()));

  fdoc.querySelectorAll("[data-cle-id]").forEach((el) => {
    el.contentEditable = "true";
    el.spellcheck = false;
  });

  fdoc.addEventListener("keydown", (e) => {
    if (!e.target.closest || !e.target.closest("[data-cle-id]")) return;
    // Enter は段落を増やさず改行（<br>）にする
    if (e.key === "Enter") {
      e.preventDefault();
      fdoc.execCommand("insertLineBreak");
    }
    // 太字などの装飾は付けない
    if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) e.preventDefault();
  });

  // 貼り付けは文字だけにする（Wordなどの書式を持ち込まない）
  fdoc.addEventListener("paste", (e) => {
    if (!e.target.closest || !e.target.closest("[data-cle-id]")) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    fdoc.execCommand("insertText", false, text);
  });

  fdoc.addEventListener("input", (e) => {
    const el = e.target.closest && e.target.closest("[data-cle-id]");
    if (!el) return;
    const id = Number(el.dataset.cleId);
    const changed = cleanHTML(el.innerHTML, state.original[id]) !== state.original[id];
    el.classList.toggle("cle-changed", changed);
    if (changed) state.dirty.add(id);
    else state.dirty.delete(id);
    updateCount();
  });
}

// 編集で入りこみやすい余計なものを取り除く
function cleanHTML(html, original) {
  let out = html;
  if (!/<br[^>]*>\s*$/i.test(original)) out = out.replace(/(<br>)+$/i, "");
  // 消したり貼ったりしたときにブラウザが勝手に付ける色や大きさの指定
  if (!/style=/i.test(original)) out = out.replace(/\sstyle="[^"]*"/gi, "");
  if (!/<span>/i.test(original)) out = out.replace(/<span>([\s\S]*?)<\/span>/gi, "$1");
  out = out.replace(/<\/?font[^>]*>/gi, "");
  return out;
}

function textOf(html) {
  const div = document.createElement("div");
  div.innerHTML = html.replace(/<br[^>]*>/gi, "\n");
  return div.textContent.trim().replace(/[ \t]*\n[ \t]*/g, "\n").replace(/[ \t]+/g, " ");
}

// ---------- 保存 ----------

// 元のファイルの書き方をできるだけ崩さないよう、変わった場所の中身だけを差し替える
function buildNewSource(changes) {
  const doc = new DOMParser().parseFromString(state.source, "text/html");
  const editable = findEditable(doc.body);
  const tagPattern = (el) => el.tagName.toLowerCase();

  let out = "";
  let cursor = doc.body ? state.source.search(/<body[\s>]/i) : 0;
  let copiedTo = 0;
  for (let i = 0; i < editable.length; i++) {
    const inner = editable[i].innerHTML;
    const closing = `</${tagPattern(editable[i])}`;
    let at = cursor;
    let found = -1;
    while ((at = state.source.indexOf(inner, at)) !== -1) {
      const before = state.source[at - 1];
      const after = state.source.slice(at + inner.length, at + inner.length + closing.length).toLowerCase();
      if (before === ">" && after === closing) { found = at; break; }
      at += 1;
    }
    if (found === -1) return null;
    if (changes.has(i)) {
      out += state.source.slice(copiedTo, found) + changes.get(i);
      copiedTo = found + inner.length;
    }
    cursor = found + inner.length;
  }
  return out + state.source.slice(copiedTo);
}

// 差し替えがうまくいかないときは、ファイル全体を書き出し直す
function buildNewSourceFallback(changes) {
  const doc = new DOMParser().parseFromString(state.source, "text/html");
  const editable = findEditable(doc.body);
  changes.forEach((html, i) => (editable[i].innerHTML = html));
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML + "\n";
}

function collectChanges() {
  const fdoc = els.frame.contentDocument;
  const changes = new Map();
  [...state.dirty].sort((a, b) => a - b).forEach((id) => {
    const el = fdoc.querySelector(`[data-cle-id="${id}"]`);
    const html = cleanHTML(el.innerHTML, state.original[id]);
    if (html !== state.original[id]) changes.set(id, html);
  });
  return changes;
}

function showReview(changes) {
  els.reviewList.innerHTML = "";
  changes.forEach((html, id) => {
    const li = document.createElement("li");
    const del = document.createElement("del");
    const ins = document.createElement("ins");
    del.textContent = textOf(state.original[id]) || "（空）";
    ins.textContent = textOf(html) || "（空）";
    del.style.whiteSpace = ins.style.whiteSpace = "pre-wrap";
    li.append(del, ins);
    els.reviewList.append(li);
  });
  els.reviewTitle.textContent = `${pageLabel(state.path)}の変更 ${changes.size}か所`;
  els.reviewNote.textContent = DEMO
    ? "これはプレビューなので、実際には保存されません。"
    : "公開すると、1〜2分でサイトに反映されます。";
  els.review.returnValue = "";
  els.review.showModal();
  return new Promise((resolve) => {
    els.review.addEventListener("close", () => resolve(els.review.returnValue === "confirm"), { once: true });
  });
}

async function save() {
  const changes = collectChanges();
  if (!changes.size) {
    state.dirty.clear();
    updateCount();
    return;
  }
  if (!(await showReview(changes))) return;

  const newSource = buildNewSource(changes) ?? buildNewSourceFallback(changes);
  const summary = [...changes.values()].map((h) => textOf(h).replace(/\s+/g, " ")).join(" / ").slice(0, 40);

  if (DEMO) {
    acceptSaved(newSource, null);
    setMessage("プレビューのため保存はしていません。本番では、ここで公開されます。", "ok");
    return;
  }

  els.save.disabled = true;
  setMessage("保存しています…");
  try {
    const sha = await saveSource(state.path, newSource, summary);
    acceptSaved(newSource, sha);
    setMessage("保存しました。1〜2分でサイトに反映されます。", "ok");
  } catch (err) {
    els.save.disabled = false;
    if (err.status === 401 || err.status === 403) {
      setMessage("保存できませんでした。トークンが正しくないか、期限が切れています。「設定」から入れ直してください。", "error");
    } else if (err.status === 409 || err.status === 422) {
      setMessage("保存できませんでした。開いている間に、ほかの人がこのページを更新したようです。直した文字を控えてから、ページを開き直してください。", "error");
    } else {
      setMessage("保存できませんでした。通信を確認して、もう一度「保存して公開」を押してください。", "error");
    }
  }
}

function acceptSaved(newSource, sha) {
  state.source = newSource;
  state.sha = sha;
  const fdoc = els.frame.contentDocument;
  const doc = new DOMParser().parseFromString(newSource, "text/html");
  state.original = findEditable(doc.body).map((el) => el.innerHTML);
  fdoc.querySelectorAll(".cle-changed").forEach((el) => el.classList.remove("cle-changed"));
  state.dirty.clear();
  updateCount();
}

// ---------- ページの切り替えと設定 ----------

function pageLabel(path) {
  return (PAGES.find((p) => p.path === path) || { label: path }).label;
}

async function openPage(path) {
  setMessage("ページを読み込んでいます…");
  try {
    const { text, sha } = await loadSource(path);
    state.path = path;
    state.source = text;
    state.sha = sha;
    state.dirty.clear();
    updateCount();
    renderPage();
    els.page.value = path;
    setMessage("文字をクリックすると、そのまま直せます。点線の枠が直せる場所です。");
  } catch (err) {
    els.page.value = state.path || path;
    if (err.status === 401 || err.status === 403) {
      setMessage("ページを読み込めませんでした。トークンを確認してください。", "error");
      openSetup("トークンが正しくないか、期限が切れているようです。");
    } else if (err.status === 404) {
      setMessage(`「${BRANCH}」にこのページがまだありません。`, "error");
    } else {
      setMessage("ページを読み込めませんでした。通信を確認してください。", "error");
    }
  }
}

// プレビュー（Artifact）では確認ダイアログが出せないので、確認なしで進める
function ask(question) {
  return DEMO ? true : confirm(question);
}

function confirmLeave() {
  return state.dirty.size === 0 || ask("保存していない変更があります。破棄してよいですか？");
}

function openSetup(error = "") {
  els.token.value = getToken();
  els.setupError.hidden = !error;
  els.setupError.textContent = error;
  els.setup.showModal();
}

async function checkToken(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO}`, {
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const repo = await res.json();
  return Boolean(repo.permissions && repo.permissions.push);
}

function init() {
  PAGES.forEach((p) => els.page.add(new Option(p.label, p.path)));
  const first = new URLSearchParams(location.search).get("page") || PAGES[0].path;

  els.page.addEventListener("change", () => {
    if (!confirmLeave()) {
      els.page.value = state.path;
      return;
    }
    openPage(els.page.value);
  });
  els.discard.addEventListener("click", () => {
    if (ask("変更を元に戻しますか？")) {
      state.dirty.clear();
      updateCount();
      renderPage();
    }
  });
  els.save.addEventListener("click", save);
  els.settings.addEventListener("click", () => (DEMO ? setMessage("プレビューでは設定は使いません。") : openSetup()));
  els.tokenClear.addEventListener("click", () => {
    setToken("");
    els.token.value = "";
    els.setup.close();
    setMessage("トークンを削除しました。保存するには「設定」から入れ直してください。");
  });
  els.setupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = els.token.value.trim();
    els.setupError.hidden = true;
    if (!(await checkToken(token).catch(() => false))) {
      els.setupError.textContent = "このトークンでは保存できません。手順の3と4（career-life-game を選ぶ、Contents を Read and write にする）を確認してください。";
      els.setupError.hidden = false;
      return;
    }
    setToken(token);
    els.setup.close();
    openPage(state.path || first);
  });
  window.addEventListener("beforeunload", (e) => {
    if (state.dirty.size) e.preventDefault();
  });

  if (!DEMO && !getToken()) {
    els.page.value = first;
    setMessage("はじめに一度だけ設定が必要です。");
    openSetup();
    return;
  }
  openPage(first);
}

init();
