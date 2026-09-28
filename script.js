// 職業人生ゲーム - 共通スクリプト
// ヘッダー・フッターは全ページ共通なので、ここで一か所だけ管理する。

const NAV_ITEMS = [
  { href: "about.html", label: "職業人生ゲームとは" },
  { href: "sponsors.html", label: "各地の協賛企業" },
  { href: "organizer.html", label: "主催団体" },
  { href: "support.html", label: "サポート企業" },
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

  // トップでは画像の上に透明で重ねているので、画像を過ぎたら白い背景にする
  if (document.body.classList.contains("home")) {
    const hero = document.querySelector(".hero");
    const update = () =>
      el.classList.toggle("is-scrolled", window.scrollY > (hero ? hero.offsetHeight - el.offsetHeight : 0));
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

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
        <p>ゲームで地元企業を知る、子ども向けの職業体験イベントです。</p>
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

// 問い合わせフォーム（送信先が決まるまでは送信しない）
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("フォームの送信先は準備中です。お手数ですがInstagramのDMからご連絡ください。");
  });
}

renderHeader();
renderFooter();
setupBackToTop();
setupSlideshow();
setupRegionTabs();
setupContactForm();
