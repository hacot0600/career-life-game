// 職業人生ゲーム - ゲーム本体
(() => {
  const PLAYER_COLORS = ["#f87171", "#60a5fa", "#4ade80", "#facc15"];
  const DEFAULT_NAMES = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];
  const MIN_PLAYERS = 1;
  const MAX_PLAYERS = 4;
  const BOARD_COLUMNS = 6;
  const STEP_MS = 220;

  const $ = (id) => document.getElementById(id);
  const jobById = (id) => JOBS.find((job) => job.id === id);

  let state = null;
  let playerCount = 2;

  // ---------- ユーティリティ ----------
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") Object.assign(node.style, value);
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
  }

  function showScreen(id) {
    for (const screen of document.querySelectorAll(".screen")) {
      screen.hidden = screen.id !== id;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- はじめる画面 ----------
  function renderPlayerInputs() {
    const box = $("player-inputs");
    const oldValues = [...box.querySelectorAll("input")].map((input) => input.value);
    box.replaceChildren();
    for (let i = 0; i < playerCount; i++) {
      const input = el("input", {
        type: "text",
        maxlength: "10",
        placeholder: DEFAULT_NAMES[i],
        "aria-label": `${i + 1}にんめの なまえ`,
      });
      input.value = oldValues[i] || "";
      box.append(
        el("label", { class: "player-input" }, [
          el("span", { class: "token-dot", style: { background: PLAYER_COLORS[i] } }),
          input,
        ])
      );
    }
    $("remove-player").disabled = playerCount <= MIN_PLAYERS;
    $("add-player").disabled = playerCount >= MAX_PLAYERS;
  }

  function startGame(names) {
    state = {
      players: names.map((name, i) => ({
        name,
        color: PLAYER_COLORS[i],
        pos: 0,
        points: 0,
        cards: [],
        finished: false,
        finishOrder: null,
      })),
      current: 0,
      finishedCount: 0,
      jobDeck: shuffle(JOBS.map((job) => job.id)),
      busy: false,
    };
    $("log").replaceChildren();
    renderBoard();
    renderScoreboard();
    renderTurn();
    addLog("ゲーム スタート！");
    showScreen("game");
  }

  // ---------- 盤面 ----------
  function squarePosition(index) {
    const row = Math.floor(index / BOARD_COLUMNS);
    const offset = index % BOARD_COLUMNS;
    const col = row % 2 === 0 ? offset : BOARD_COLUMNS - 1 - offset;
    return { row: row + 1, col: col + 1 };
  }

  function renderBoard() {
    const board = $("board");
    board.replaceChildren();
    BOARD.forEach((type, index) => {
      const info = SQUARE_TYPES[type];
      const { row, col } = squarePosition(index);
      const square = el(
        "div",
        {
          class: `square ${info.className}`,
          style: { gridRow: row, gridColumn: col },
          title: info.help ? `${info.label}：${info.help}` : info.label,
        },
        [
          el("span", { class: "sq-num", text: index === 0 || index === BOARD.length - 1 ? "" : String(index) }),
          el("span", { class: "sq-label", text: info.short }),
          el("div", { class: "sq-tokens", "data-index": String(index) }),
        ]
      );
      board.append(square);
    });
    renderTokens();
  }

  function renderTokens() {
    for (const box of document.querySelectorAll(".sq-tokens")) box.replaceChildren();
    state.players.forEach((player, i) => {
      const box = document.querySelector(`.sq-tokens[data-index="${player.pos}"]`);
      const token = el("span", {
        class: "token" + (i === state.current && !player.finished ? " token-active" : ""),
        style: { background: player.color },
        title: player.name,
      });
      box.append(token);
    });
  }

  function renderScoreboard() {
    const board = $("scoreboard");
    board.replaceChildren();
    state.players.forEach((player, i) => {
      const cardList = el("div", { class: "held-cards" });
      if (player.cards.length === 0) {
        cardList.append(el("span", { class: "muted", text: "まだ カードが ないよ" }));
      }
      for (const id of player.cards) {
        const job = jobById(id);
        cardList.append(el("span", { class: "mini-card", title: job.company, text: `${job.icon} ${job.name}` }));
      }
      board.append(
        el("div", { class: "card score" + (i === state.current && !player.finished ? " score-active" : "") }, [
          el("div", { class: "score-head" }, [
            el("span", { class: "token-dot", style: { background: player.color } }),
            el("strong", { text: player.name }),
            el("span", { class: "points", text: `${player.points} pt` }),
          ]),
          player.finished ? el("p", { class: "finished", text: `ゴール！（${player.finishOrder}ばん）` }) : "",
          cardList,
        ])
      );
    });
  }

  function renderTurn() {
    const player = state.players[state.current];
    $("turn-name").textContent = player.name;
    $("turn-token").style.background = player.color;
    $("roll-btn").disabled = state.busy;
  }

  function addLog(text) {
    const log = $("log");
    log.prepend(el("li", { text }));
    while (log.children.length > 30) log.lastChild.remove();
  }

  // ---------- ダイアログ ----------
  function showModal({ kind, title, body, actions }) {
    return new Promise((resolve) => {
      $("modal-kind").textContent = kind || "";
      $("modal-title").textContent = title;
      $("modal-body").replaceChildren(...[].concat(body || []));
      const actionBox = $("modal-actions");
      actionBox.replaceChildren();
      for (const action of actions) {
        const button = el("button", {
          class: "btn " + (action.primary ? "btn-primary" : "btn-ghost"),
          text: action.label,
        });
        button.addEventListener("click", () => {
          if (action.keepOpen) {
            action.onClick && action.onClick(button);
            return;
          }
          $("modal").hidden = true;
          resolve(action.value);
        });
        actionBox.append(button);
      }
      $("modal").hidden = false;
      actionBox.querySelector("button")?.focus();
    });
  }

  function jobCardView(job) {
    return el("div", { class: "job-card" }, [
      el("div", { class: "job-icon", text: job.icon }),
      el("div", { class: "job-name", text: job.name }),
      el("div", { class: "job-company", text: job.company }),
      el("p", { class: "job-desc", text: job.desc + "です。" }),
      el("div", { class: "job-helps-title", text: "おたすけ できること！" }),
      el("ul", { class: "job-helps" }, job.helps.map((help) => el("li", { text: help }))),
    ]);
  }

  // ---------- マスのできごと ----------
  function drawJob() {
    if (state.jobDeck.length === 0) {
      state.jobDeck = shuffle(JOBS.map((job) => job.id));
    }
    return jobById(state.jobDeck.pop());
  }

  async function doCardSquare(player, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) drawn.push(drawJob());
    for (const job of drawn) player.cards.push(job.id);
    renderScoreboard();
    addLog(`${player.name} は ${drawn.map((job) => job.name).join("・")} の カードを ゲット！`);
    await showModal({
      kind: count > 1 ? "スペシャルマス" : "カードマス",
      title: `しょくぎょうカードを ${count}まい ゲット！`,
      body: el("div", { class: "job-cards" }, drawn.map(jobCardView)),
      actions: [{ label: "OK", primary: true }],
    });
  }

  async function doMissionSquare(player) {
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    const mission = job.helps[Math.floor(Math.random() * job.helps.length)];
    const matched = player.cards.includes(job.id);
    if (matched) player.points += 1;
    renderScoreboard();
    addLog(
      matched
        ? `${player.name} は ${job.name} で「${mission}」を おたすけ！ +1pt`
        : `${player.name} は「${mission}」を おたすけ できなかった…`
    );
    await showModal({
      kind: "おしごとマス",
      title: mission,
      body: [
        el("p", {
          class: "result-line " + (matched ? "good" : "bad"),
          text: matched
            ? `${job.icon} ${job.name} の カードで おたすけ できた！ +1pt`
            : "おたすけ できる カードを もっていなかった…",
        }),
        el("p", { class: "muted", text: "この おねがいを かなえられるのは…" }),
        jobCardView(job),
      ],
      actions: [{ label: "OK", primary: true }],
    });
  }

  function makeQuiz() {
    const answer = JOBS[Math.floor(Math.random() * JOBS.length)];
    const others = shuffle(JOBS.filter((job) => job.id !== answer.id)).slice(0, 2);
    const choices = shuffle([answer, ...others]);
    if (Math.random() < 0.5) {
      return { question: `「${answer.desc}」は どれ？`, answer, choices };
    }
    const help = answer.helps[Math.floor(Math.random() * answer.helps.length)];
    return { question: `「${help}」 だれに たのむと いいかな？`, answer, choices };
  }

  async function doQuizSquare(player) {
    const quiz = makeQuiz();
    let correct = false;
    const feedback = el("p", { class: "result-line" });
    const choiceBox = el("div", { class: "quiz-choices" });
    await new Promise((resolve) => {
      for (const choice of quiz.choices) {
        const button = el("button", { class: "btn btn-choice", text: `${choice.icon} ${choice.name}` });
        button.addEventListener("click", () => {
          correct = choice.id === quiz.answer.id;
          for (const b of choiceBox.children) b.disabled = true;
          button.classList.add(correct ? "choice-good" : "choice-bad");
          feedback.className = "result-line " + (correct ? "good" : "bad");
          feedback.textContent = correct
            ? "せいかい！ +1pt"
            : `ざんねん！ こたえは ${quiz.answer.icon} ${quiz.answer.name} でした`;
          resolve();
        });
        choiceBox.append(button);
      }
      showModal({
        kind: "クイズマス",
        title: quiz.question,
        body: [choiceBox, feedback],
        actions: [],
      });
    });
    if (correct) player.points += 1;
    renderScoreboard();
    addLog(`${player.name} は クイズに ${correct ? "せいかい！ +1pt" : "ざんねん…"}`);
    await showModal({
      kind: "クイズマス",
      title: correct ? "せいかい！" : "ざんねん！",
      body: [feedback, jobCardView(quiz.answer)],
      actions: [{ label: "OK", primary: true }],
    });
  }

  async function doGoal(player) {
    state.finishedCount += 1;
    player.finished = true;
    player.finishOrder = state.finishedCount;
    renderScoreboard();
    addLog(`${player.name} が ゴール！（${player.finishOrder}ばん）`);
    await showModal({
      kind: "ゴール",
      title: `${player.name} が ゴール！`,
      body: el("p", { text: `しょくぎょうカード ${player.cards.length}まい、${player.points}pt で ゴールしたよ。` }),
      actions: [{ label: "OK", primary: true }],
    });
  }

  // ---------- ターン進行 ----------
  async function rollDice() {
    const dice = $("dice");
    dice.classList.add("rolling");
    const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let value = 1;
    for (let i = 0; i < 10; i++) {
      value = Math.floor(Math.random() * 6) + 1;
      dice.textContent = faces[value - 1];
      await wait(60);
    }
    dice.classList.remove("rolling");
    dice.textContent = faces[value - 1];
    return value;
  }

  async function takeTurn() {
    if (state.busy) return;
    state.busy = true;
    renderTurn();

    const player = state.players[state.current];
    const value = await rollDice();
    addLog(`${player.name} は ${value} が でた！`);

    const goalIndex = BOARD.length - 1;
    const target = Math.min(player.pos + value, goalIndex);
    while (player.pos < target) {
      player.pos += 1;
      renderTokens();
      await wait(STEP_MS);
    }

    const type = BOARD[player.pos];
    if (type === "card") await doCardSquare(player, 1);
    else if (type === "special") await doCardSquare(player, 2);
    else if (type === "mission") await doMissionSquare(player);
    else if (type === "quiz") await doQuizSquare(player);
    else if (type === "goal") await doGoal(player);

    if (state.finishedCount === state.players.length) {
      showResult();
      return;
    }
    nextPlayer();
    state.busy = false;
    renderTokens();
    renderScoreboard();
    renderTurn();
  }

  function nextPlayer() {
    do {
      state.current = (state.current + 1) % state.players.length;
    } while (state.players[state.current].finished);
  }

  // ---------- けっか ----------
  function showResult() {
    const ranked = state.players
      .slice()
      .sort((a, b) => b.points - a.points || b.cards.length - a.cards.length || a.finishOrder - b.finishOrder);
    const list = $("ranking");
    list.replaceChildren();
    ranked.forEach((player, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || "🎖️";
      const jobs = player.cards.map((id) => {
        const job = jobById(id);
        return el("span", { class: "mini-card", text: `${job.icon} ${job.name}` });
      });
      list.append(
        el("li", { class: "rank-item" }, [
          el("div", { class: "rank-head" }, [
            el("span", { class: "medal", text: medal }),
            el("span", { class: "token-dot", style: { background: player.color } }),
            el("strong", { text: player.name }),
            el("span", { class: "points", text: `${player.points} pt` }),
          ]),
          el("div", { class: "held-cards" }, jobs.length ? jobs : [el("span", { class: "muted", text: "カードなし" })]),
        ])
      );
    });
    showScreen("result");
  }

  // ---------- イベント ----------
  $("add-player").addEventListener("click", () => {
    playerCount = Math.min(MAX_PLAYERS, playerCount + 1);
    renderPlayerInputs();
  });
  $("remove-player").addEventListener("click", () => {
    playerCount = Math.max(MIN_PLAYERS, playerCount - 1);
    renderPlayerInputs();
  });
  $("setup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const names = [...$("player-inputs").querySelectorAll("input")].map(
      (input, i) => input.value.trim() || DEFAULT_NAMES[i]
    );
    startGame(names);
  });
  $("roll-btn").addEventListener("click", takeTurn);
  $("again-btn").addEventListener("click", () => showScreen("setup"));

  renderPlayerInputs();
})();
