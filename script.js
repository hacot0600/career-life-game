// 職業人生ゲーム - 共通スクリプト
// ヘッダー・フッターは全ページ共通なので、ここで一か所だけ管理する。

const NAV_ITEMS = [
  { href: "about.html", label: "職業人生ゲームとは" },
  { href: "sponsors.html", label: "各地の協賛企業" },
  { href: "organizer.html", label: "主催団体" },
  { href: "support.html", label: "賛助企業" },
  { href: "faq.html", label: "よくある質問" },
];

// Instagram のURLが決まったらここを書き換える
const INSTAGRAM = {
  game: "#",
  aportar: "#",
};

function currentPage() {
  const file = location.pathname.split("/").pop();
  return file === "" ? "index.html" : file;
}

function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  const here = currentPage();
  const links = NAV_ITEMS.map(
    (item) =>
      `<li><a href="${item.href}"${item.href === here ? ' aria-current="page"' : ""}>${item.label}</a></li>`
  ).join("");

  el.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="index.html" aria-label="トップへ戻る">
        <span class="logo-mark" aria-hidden="true">🎲</span>
        <span class="logo-type">職業人生ゲーム</span>
      </a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="global-nav" aria-label="メニューを開く">
        <span></span><span></span><span></span>
      </button>
      <nav id="global-nav" class="global-nav" aria-label="メインメニュー">
        <ul>${links}</ul>
        <a class="btn btn-contact" href="contact.html">お問い合わせ</a>
      </nav>
    </div>`;

  const toggle = el.querySelector(".menu-toggle");
  const nav = el.querySelector(".global-nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const links = [{ href: "index.html", label: "トップ" }, ...NAV_ITEMS, { href: "contact.html", label: "お問い合わせ・協賛" }]
    .map((item) => `<li><a href="${item.href}">${item.label}</a></li>`)
    .join("");

  el.innerHTML = `
    <div class="footer-inner">
      <div class="footer-about">
        <p class="footer-logo">🎲 職業人生ゲーム</p>
        <p>あそんで みつける しょうらいの おしごと。子ども向けの職業体験すごろくです。</p>
        <div class="sns">
          <a href="${INSTAGRAM.game}" class="sns-link" target="_blank" rel="noopener">
            <span class="sns-icon" aria-hidden="true">IG</span>職業人生ゲームのInstagram
          </a>
          <a href="${INSTAGRAM.aportar}" class="sns-link" target="_blank" rel="noopener">
            <span class="sns-icon" aria-hidden="true">IG</span>AporTarのInstagram
          </a>
        </div>
        <a class="btn" href="contact.html">お問い合わせ・協賛のご案内</a>
      </div>
      <nav class="footer-nav" aria-label="サイトマップ">
        <ul>${links}</ul>
      </nav>
    </div>
    <p class="copyright">&copy; 2026 職業人生ゲーム / AporTar</p>`;
}

function setupBackToTop() {
  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.setAttribute("aria-label", "ページの上に戻る");
  btn.textContent = "↑";
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(btn);
}

// トップページのメインビジュアル（自動スライド）
function setupSlideshow() {
  const slides = document.querySelectorAll(".hero-slide");
  if (slides.length < 2) return;
  let index = 0;
  setInterval(() => {
    slides[index].classList.remove("is-active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("is-active");
  }, 5000);
}

// 協賛企業ページの地域切り替え（高槻・吹田）
function setupRegionTabs() {
  const tabs = document.querySelectorAll("[data-region-tab]");
  if (!tabs.length) return;
  const panels = document.querySelectorAll("[data-region-panel]");

  function show(region) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.regionTab === region)));
    panels.forEach((p) => (p.hidden = p.dataset.regionPanel !== region));
  }

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      show(t.dataset.regionTab);
      history.replaceState(null, "", `#${t.dataset.regionTab}`);
    })
  );

  // トップページの「高槻」「吹田」ボタンから #takatsuki などで飛んでくる
  const fromHash = location.hash.slice(1);
  show([...tabs].some((t) => t.dataset.regionTab === fromHash) ? fromHash : tabs[0].dataset.regionTab);
}

// トップの「今後のスケジュール」：月ごとに表示して、予定のある月だけを矢印で行き来する
function setupSchedule() {
  const items = [...document.querySelectorAll(".schedule-item[data-date]")];
  if (!items.length) return;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const item of items) {
    const [y, m, d] = item.dataset.date.split("-").map(Number);
    item.dataset.month = `${y}-${String(m).padStart(2, "0")}`;
    const md = item.querySelector(".schedule-md");
    const dow = item.querySelector(".schedule-dow");
    if (d) {
      const date = new Date(y, m - 1, d);
      md.textContent = `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
      dow.textContent = DOW[date.getDay()];
      if (date.getDay() === 6) item.classList.add("is-sat");
      if (date.getDay() === 0) item.classList.add("is-sun");
      if (date < today) item.classList.add("is-done");
    } else {
      // 日にちが決まっていない予定は「05月」「日程調整中」と出す
      md.textContent = `${String(m).padStart(2, "0")}月`;
      dow.textContent = "日程調整中";
      if (new Date(y, m, 0) < today) item.classList.add("is-done");
    }
  }

  const months = [...new Set(items.map((item) => item.dataset.month))].sort();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  let index = months.findIndex((month) => month >= thisMonth);
  if (index === -1) index = months.length - 1;

  const nav = document.querySelector(".schedule-nav");
  const label = nav.querySelector(".schedule-month");
  const [prev, next] = nav.querySelectorAll(".schedule-arrow");

  function show() {
    const month = months[index];
    const [y, m] = month.split("-");
    label.textContent = `${m}.${y}`;
    items.forEach((item) => (item.hidden = item.dataset.month !== month));
    prev.disabled = index === 0;
    next.disabled = index === months.length - 1;
  }

  prev.addEventListener("click", () => { index = Math.max(0, index - 1); show(); });
  next.addEventListener("click", () => { index = Math.min(months.length - 1, index + 1); show(); });
  nav.hidden = false;
  show();
}

renderHeader();
renderFooter();
setupSchedule();
setupBackToTop();
setupSlideshow();
setupRegionTabs();
