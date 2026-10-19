"use client";

import { useEffect, useMemo, useState } from "react";

const who5Questions = [
  "我感到心情愉快、精神状态良好",
  "我感到平静和放松",
  "我感到精力充沛、富有活力",
  "我醒来时感到清醒且休息充分",
  "我的日常生活中充满了令我感兴趣的事物",
];
const who5Options = [
  { score: 5, label: "所有时候" }, { score: 4, label: "大部分时候" },
  { score: 3, label: "超过一半时间" }, { score: 2, label: "少于一半时间" },
  { score: 1, label: "有些时候" }, { score: 0, label: "任何时候都没有" },
];

const phq9Questions = [
  "做事时提不起劲或没有兴趣",
  "感到心情低落、沮丧或绝望",
  "入睡困难、睡不安稳，或睡眠过多",
  "感觉疲倦或没有活力",
  "食欲不振或吃得太多",
  "觉得自己很糟，或觉得自己让自己或家人失望",
  "难以集中注意力，例如阅读或看电视时",
  "动作或说话速度慢到别人已经察觉，或相反地烦躁不安、动来动去",
  "有不如死掉或用某种方式伤害自己的念头",
];
const phq9Options = [
  { score: 0, label: "完全没有" }, { score: 1, label: "有几天" },
  { score: 2, label: "一半以上天数" }, { score: 3, label: "几乎每天" },
];

const gad7Questions = [
  "感到紧张、焦虑或急切",
  "不能停止或控制担忧",
  "对各种各样的事情担忧过多",
  "很难放松下来",
  "由于不安而无法静坐",
  "变得容易烦恼或急躁",
  "感到似乎将有可怕的事情发生而害怕",
];

type Scale = "WHO-5" | "PHQ-9" | "GAD-7";

type HistoryItem = { id: number; rawScore: number; normalizedScore: number; createdAt: string };
type Result = { rawScore: number; normalizedScore: number; band: string; selfHarmRisk?: boolean };
type Stage = "intro" | "consent" | "questionnaire" | "result";
type Checkin = { id: number; mood: number; sleepHours: number; sleepQuality: number; stress: number; energy: number; exercised: boolean; note: string; createdAt: string };

function getAnonymousId() {
  const key = "zhiheng-anonymous-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `anon_${crypto.randomUUID().replaceAll("-", "")}`;
  window.localStorage.setItem(key, created);
  return created;
}

export function ZhihengApp() {
  const [stage, setStage] = useState<Stage>("intro");
  const [scale, setScale] = useState<Scale>("WHO-5");
  const [consented, setConsented] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(Array(5).fill(null));
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [histories, setHistories] = useState<Record<Scale, HistoryItem[]>>({ "WHO-5": [], "PHQ-9": [], "GAD-7": [] });
  const [dashboardDays, setDashboardDays] = useState<7 | 30>(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkin, setCheckin] = useState({ mood: 3, sleepHours: 7, sleepQuality: 3, stress: 3, energy: 3, exercised: false, note: "" });
  const [checkinMessage, setCheckinMessage] = useState("");

  const questions = scale === "PHQ-9" ? phq9Questions : scale === "GAD-7" ? gad7Questions : who5Questions;
  const options = scale === "WHO-5" ? who5Options : phq9Options;

  async function loadHistory(activeScale: Scale = scale) {
    const response = await fetch(`/api/assessments?anonymousId=${encodeURIComponent(getAnonymousId())}&scale=${activeScale}`);
    if (!response.ok) return;
    const data = (await response.json()) as { history: HistoryItem[] };
    if (activeScale === scale) setHistory(data.history);
    setHistories((current) => ({ ...current, [activeScale]: data.history }));
  }

  async function loadAllHistories() {
    await Promise.all((["WHO-5", "PHQ-9", "GAD-7"] as Scale[]).map((item) => loadHistory(item)));
  }

  async function loadCheckins() {
    const response = await fetch(`/api/checkins?anonymousId=${encodeURIComponent(getAnonymousId())}`);
    if (response.ok) setCheckins(((await response.json()) as { checkins: Checkin[] }).checkins);
  }

  useEffect(() => { loadHistory(scale).catch(() => undefined); }, [scale]);
  useEffect(() => { loadAllHistories().catch(() => undefined); loadCheckins().catch(() => undefined); }, []);
  const latestDisplay = useMemo(() => {
    const latest = history.at(-1);
    return latest ? (scale === "WHO-5" ? latest.normalizedScore : latest.rawScore) : "—";
  }, [history, scale]);
  const currentAnswer = answers[questionIndex];
  const recentCheckins = useMemo(() => {
    const cutoff = Date.now() - dashboardDays * 86400000;
    return checkins.filter((item) => new Date(item.createdAt.replace(" ", "T") + "Z").getTime() >= cutoff);
  }, [checkins, dashboardDays]);
  const averages = useMemo(() => {
    const avg = (key: "mood" | "sleepHours" | "stress" | "energy") => recentCheckins.length ? recentCheckins.reduce((sum, item) => sum + item[key], 0) / recentCheckins.length : null;
    return { mood: avg("mood"), sleep: avg("sleepHours"), stress: avg("stress"), energy: avg("energy") };
  }, [recentCheckins]);
  const weeklySummary = useMemo(() => {
    if (recentCheckins.length < 2) return "记录满 2 天后，这里会生成基于数据的状态总结。";
    const parts = [`最近 ${dashboardDays} 天记录了 ${recentCheckins.length} 次，平均睡眠 ${averages.sleep?.toFixed(1)} 小时`];
    if ((averages.stress ?? 0) >= 4) parts.push("平均压力处于较高水平，建议优先安排休息并继续观察");
    if ((averages.sleep ?? 8) < 6) parts.push("平均睡眠不足 6 小时，可关注睡眠与第二天精力的变化");
    if ((averages.mood ?? 3) >= 4) parts.push("整体情绪记录较积极");
    return `${parts.join("；")}。这些只是记录现象，不代表原因或诊断。`;
  }, [recentCheckins, dashboardDays, averages]);

  function goToAssessment(next: Stage) {
    setStage(next);
    window.setTimeout(() => document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  function selectScale(nextScale: Scale) {
    setScale(nextScale);
    setAnswers(Array(nextScale === "PHQ-9" ? 9 : nextScale === "GAD-7" ? 7 : 5).fill(null));
    setQuestionIndex(0); setResult(null); setError(""); setConsented(false);
    goToAssessment("consent");
  }

  async function saveCheckin() {
    setCheckinMessage("正在保存…");
    const response = await fetch("/api/checkins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anonymousId: getAnonymousId(), ...checkin }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setCheckinMessage(data.error ?? "保存失败，请稍后再试。");
    setCheckinMessage("今天的状态已匿名保存。"); setCheckin((current) => ({ ...current, note: "" })); await loadCheckins();
  }

  async function exportData() {
    const id = encodeURIComponent(getAnonymousId());
    const [who5, phq9, gad7, daily] = await Promise.all([
      fetch(`/api/assessments?anonymousId=${id}&scale=WHO-5`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=PHQ-9`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=GAD-7`).then((response) => response.json()),
      fetch(`/api/checkins?anonymousId=${id}`).then((response) => response.json()),
    ]) as Array<{ history?: HistoryItem[]; checkins?: Checkin[] }>;
    const payload = { exportedAt: new Date().toISOString(), assessments: { "WHO-5": who5.history ?? [], "PHQ-9": phq9.history ?? [], "GAD-7": gad7.history ?? [] }, dailyCheckins: daily.checkins ?? [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `zhiheng-data-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function deleteAllData() {
    if (!window.confirm("确定删除此设备匿名标识下的全部量表和打卡记录吗？此操作无法撤销。")) return;
    const id = encodeURIComponent(getAnonymousId());
    const responses = await Promise.all([fetch(`/api/assessments?anonymousId=${id}`, { method: "DELETE" }), fetch(`/api/checkins?anonymousId=${id}`, { method: "DELETE" })]);
    if (responses.some((response) => !response.ok)) return setCheckinMessage("删除失败，请稍后再试。");
    setHistory([]); setHistories({ "WHO-5": [], "PHQ-9": [], "GAD-7": [] }); setCheckins([]); setCheckinMessage("此设备对应的记录已全部删除。");
  }

  function chooseAnswer(score: number) {
    setAnswers((current) => current.map((answer, index) => index === questionIndex ? score : answer));
  }

  async function submitAssessment() {
    const complete = answers.filter((answer): answer is number => answer !== null);
    if (complete.length !== questions.length) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/assessments", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ anonymousId: getAnonymousId(), scale, answers: complete }),
      });
      const data = (await response.json()) as { result?: Result; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "暂时无法保存结果。");
      setResult(data.result); goToAssessment("result"); await loadHistory(scale);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法保存结果。");
    } finally { setSubmitting(false); }
  }

  function resetAssessment() {
    setAnswers(Array(questions.length).fill(null)); setQuestionIndex(0); setResult(null); setError(""); goToAssessment("questionnaire");
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">衡</span><span>知衡</span></div>
      <div className="privacy-pill">匿名记录 · 非诊断工具</div>
    </header>

    <main className="main">
      <section className="hero">
        <div>
          <p className="eyebrow">认知与心理健康随访</p>
          <h1>多一点了解，<br />少一点猜测。</h1>
          <p className="hero-copy">用标准化量表记录幸福感与抑郁症状变化。我们帮助你看见状态，但不会给你贴上疾病标签。</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => selectScale("WHO-5")}>测幸福感 WHO-5</button>
            <button className="secondary" onClick={() => selectScale("PHQ-9")}>测抑郁症状 PHQ-9</button>
            <button className="secondary" onClick={() => selectScale("GAD-7")}>测焦虑症状 GAD-7</button>
            <button className="secondary" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>查看我的趋势</button>
          </div>
        </div>
        <aside className="hero-card" aria-label="最近一次评估概览">
          <div className="status-label">最近一次 {scale} 得分</div>
          <div className="status-score">{latestDisplay}<span className="status-unit"> / {scale === "PHQ-9" ? 27 : scale === "GAD-7" ? 21 : 100}</span></div>
          <p className="status-message">规律记录比单次分数更重要。完成多次评估后，你可以在这里看到属于自己的变化。</p>
          <div className="mini-bars" aria-hidden="true">{[42,53,48,65,59,72].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>
        </aside>
      </section>

      <section className="trust-row" aria-label="产品原则">
        <div className="trust-item"><strong>规范计分</strong>量表结果由固定程序计算，不由大模型猜测。</div>
        <div className="trust-item"><strong>纵向观察</strong>关注你自己的长期变化，而不是和陌生人比较。</div>
        <div className="trust-item"><strong>清晰边界</strong>用于自我了解和健康教育，不代替专业诊断。</div>
      </section>

      {stage !== "intro" && <section className="panel" id="assessment">
        {stage === "consent" && <>
          <div className="panel-header"><div><h2>开始前，请先了解</h2><p>你的自主选择和安全，比完成一次评估更重要。</p></div><span className="step-badge">知情说明</span></div>
          <div className="panel-body">
            <div className="consent-grid">
              <div className="consent-card"><strong>这项评估能做什么</strong><p>{scale === "PHQ-9" ? "PHQ-9用于筛查过去两周的抑郁相关症状，帮助识别是否值得进一步咨询。" : scale === "GAD-7" ? "GAD-7用于筛查过去两周的焦虑相关症状，帮助你观察症状频率和变化。" : "WHO-5用于了解过去两周的主观心理幸福感，帮助你观察个人变化。"}</p></div>
              <div className="consent-card"><strong>它不能做什么</strong><p>结果不能诊断抑郁症或其他疾病，也不能替代医生、心理咨询师的判断。</p></div>
            </div>
            <label className="consent-check"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /><span>我已阅读并理解以上说明，自愿进行本次匿名自我评估。</span></label>
            <div className="question-actions"><button className="secondary" onClick={() => setStage("intro")}>暂不评估</button><button className="primary" disabled={!consented} onClick={() => setStage("questionnaire")}>继续</button></div>
          </div>
        </>}

        {stage === "questionnaire" && <>
          <div className="panel-header"><div><h2>{scale === "PHQ-9" ? "PHQ-9 抑郁症状筛查" : scale === "GAD-7" ? "GAD-7 焦虑症状筛查" : "WHO-5 心理幸福感评估"}</h2><p>请根据过去两周的真实感受作答。</p></div><span className="step-badge">约 {scale === "WHO-5" ? 2 : 3} 分钟</span></div>
          <div className="panel-body">
            <div className="progress-track"><div className="progress-fill" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
            <div className="question-number">问题 {questionIndex + 1} / {questions.length}</div>
            <div className="question-text">{questions[questionIndex]}</div>
            <div className="options" role="radiogroup" aria-label={questions[questionIndex]}>
              {options.map((option) => <button key={option.score} role="radio" aria-checked={currentAnswer === option.score} className={`option ${currentAnswer === option.score ? "selected" : ""}`} onClick={() => chooseAnswer(option.score)}>{option.label}</button>)}
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="question-actions">
              <button className="secondary" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => index - 1)}>上一题</button>
              {questionIndex < questions.length - 1
                ? <button className="primary" disabled={currentAnswer === null} onClick={() => setQuestionIndex((index) => index + 1)}>下一题</button>
                : <button className="primary" disabled={currentAnswer === null || submitting} onClick={submitAssessment}>{submitting ? "正在生成结果…" : "查看结果"}</button>}
            </div>
          </div>
        </>}

        {stage === "result" && result && <>
          <div className="panel-header"><div><h2>本次评估结果</h2><p>这是一次状态记录，不是一份诊断结论。</p></div><span className="step-badge">已匿名保存</span></div>
          <div className="panel-body"><div className="result-layout">
            <div className="score-ring" style={{ "--score-angle": `${result.normalizedScore * 3.6}deg` } as React.CSSProperties}><div className="score-value">{scale === "WHO-5" ? result.normalizedScore : result.rawScore}<small>{scale === "PHQ-9" ? "满分 27" : scale === "GAD-7" ? "满分 21" : "满分 100"}</small></div></div>
            <div className="result-copy">
              <h3>{scale !== "WHO-5" ? ({ minimal: "目前症状很少", mild: "存在轻度症状", moderate: "建议进一步关注", moderately_severe: "建议尽快咨询专业人员", severe: "建议尽快寻求专业帮助" }[result.band] ?? "关注自己的状态") : result.band === "positive" ? "继续关注自己的状态" : "值得给自己多一些关注"}</h3>
              <p>{scale !== "WHO-5" ? `${scale}是筛查工具，分数反映过去两周症状出现的频率，不能单独用于诊断。如果症状持续、加重或影响生活，请向合格的专业人员咨询。` : result.band === "positive" ? "本次结果未落入WHO-5建议进一步评估的范围。单次结果会受到近期事件影响，持续记录更有参考价值。" : "本次得分低于WHO-5建议进一步评估的参考范围。这不代表你患有某种疾病；如果这种状态持续、影响生活，建议向合格的专业人员进一步咨询。"}</p>
              {result.selfHarmRisk && <div className="notice urgent"><strong>请优先关注你的安全。</strong><br />你对“伤害自己”的问题选择了非零答案。请现在联系可信任的人陪伴你，并尽快联系当地紧急服务或专业心理援助；不要独自承受。本网站不提供紧急干预。</div>}
              {!result.selfHarmRisk && <div className="notice">如果你正处于危险中，或有伤害自己、他人的想法，请立即联系当地紧急服务、可信任的人或专业机构。本网站不提供紧急干预。</div>}
              <div className="hero-actions" style={{ marginTop: 20 }}><button className="primary" onClick={resetAssessment}>再次评估</button><button className="secondary" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>查看趋势</button></div>
            </div>
          </div></div>
        </>}
      </section>}

      <section className="panel dashboard" id="dashboard">
        <div className="panel-header"><div><h2>状态仪表盘</h2><p>把量表和每日记录放在一起看，关注自己的变化，而不是和别人比较。</p></div><div className="range-toggle"><button className={dashboardDays === 7 ? "active" : ""} onClick={() => setDashboardDays(7)}>7 天</button><button className={dashboardDays === 30 ? "active" : ""} onClick={() => setDashboardDays(30)}>30 天</button></div></div>
        <div className="panel-body">
          <div className="metric-grid">
            <div className="metric-card"><span>WHO-5</span><strong>{histories["WHO-5"].at(-1)?.normalizedScore ?? "—"}</strong><small>幸福感 / 100</small></div>
            <div className="metric-card"><span>PHQ-9</span><strong>{histories["PHQ-9"].at(-1)?.rawScore ?? "—"}</strong><small>症状频率 / 27</small></div>
            <div className="metric-card"><span>GAD-7</span><strong>{histories["GAD-7"].at(-1)?.rawScore ?? "—"}</strong><small>症状频率 / 21</small></div>
            <div className="metric-card"><span>平均情绪</span><strong>{averages.mood?.toFixed(1) ?? "—"}</strong><small>{recentCheckins.length} 次记录</small></div>
            <div className="metric-card"><span>平均睡眠</span><strong>{averages.sleep?.toFixed(1) ?? "—"}</strong><small>小时 / 晚</small></div>
            <div className="metric-card"><span>压力 / 精力</span><strong>{averages.stress?.toFixed(1) ?? "—"} / {averages.energy?.toFixed(1) ?? "—"}</strong><small>满分均为 5</small></div>
          </div>
          <div className="weekly-summary"><span>规则总结</span><p>{weeklySummary}</p></div>
          {recentCheckins.length > 1 && <div className="spark-chart" aria-label={`${dashboardDays}天情绪与压力趋势`}>
            {recentCheckins.map((item) => <div className="spark-day" key={item.id} title={`情绪 ${item.mood}，压力 ${item.stress}`}><i style={{ height: `${item.mood * 18}%` }} /><b style={{ height: `${item.stress * 18}%` }} /></div>)}
          </div>}
          <div className="data-actions"><div><strong>我的数据</strong><p>导出或删除此浏览器匿名标识对应的记录。</p></div><div className="hero-actions"><button className="secondary" onClick={() => exportData().catch(() => setCheckinMessage("导出失败，请稍后再试。"))}>导出 JSON</button><button className="danger-button" onClick={() => deleteAllData().catch(() => setCheckinMessage("删除失败，请稍后再试。"))}>删除全部记录</button></div></div>
        </div>
      </section>

      <section className="panel history" id="history">
        <div className="panel-header"><div><h2>我的{scale === "WHO-5" ? "幸福感" : "症状"}趋势</h2><p>仅保存在匿名标识下，展示最近 12 次结果。点击上方量表按钮可切换。</p></div><span className="step-badge">{scale}</span></div>
        <div className="panel-body">{history.length === 0
          ? <div className="empty-history">完成第一次评估后，这里会出现你的个人趋势。</div>
          : <div className="history-chart" aria-label="历史得分柱状图">{history.map((item) => <div className="history-column" key={item.id} title={`${item.createdAt}：${scale === "WHO-5" ? item.normalizedScore : item.rawScore}分`}><div className="history-bar" style={{ height: `${Math.max(item.normalizedScore, 6)}%` }}><span>{scale === "WHO-5" ? item.normalizedScore : item.rawScore}</span></div>{new Date(item.createdAt.replace(" ", "T") + "Z").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</div>)}</div>}
        </div>
      </section>

      <section className="panel checkin-panel" id="checkin">
        <div className="panel-header"><div><h2>每日状态打卡</h2><p>用一分钟记录今天，帮助你看见睡眠、压力与情绪的关系。</p></div><span className="step-badge">最近 {checkins.length} 次</span></div>
        <div className="panel-body">
          <div className="checkin-grid">
            {([['mood','情绪'],['sleepQuality','睡眠质量'],['stress','压力'],['energy','精力']] as const).map(([key,label]) => <label className="checkin-field" key={key}><span>{label}<strong>{checkin[key]} / 5</strong></span><input type="range" min="1" max="5" value={checkin[key]} onChange={(event) => setCheckin((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
            <label className="checkin-field"><span>睡眠时长<strong>{checkin.sleepHours} 小时</strong></span><input type="range" min="0" max="16" value={checkin.sleepHours} onChange={(event) => setCheckin((current) => ({ ...current, sleepHours: Number(event.target.value) }))} /></label>
            <label className="exercise-check"><input type="checkbox" checked={checkin.exercised} onChange={(event) => setCheckin((current) => ({ ...current, exercised: event.target.checked }))} />今天运动过</label>
          </div>
          <label className="note-field">简短备注（可选）<textarea maxLength={200} value={checkin.note} onChange={(event) => setCheckin((current) => ({ ...current, note: event.target.value }))} placeholder="例如：今天有考试，午后散步了 30 分钟" /></label>
          <div className="checkin-actions"><span role="status">{checkinMessage}</span><button className="primary" onClick={() => saveCheckin().catch(() => setCheckinMessage("保存失败，请稍后再试。"))}>保存今日状态</button></div>
          {checkins.length > 0 && <div className="checkin-summary"><strong>最近一次：</strong>情绪 {checkins.at(-1)?.mood}/5 · 睡眠 {checkins.at(-1)?.sleepHours} 小时 · 压力 {checkins.at(-1)?.stress}/5 · 精力 {checkins.at(-1)?.energy}/5</div>}
        </div>
      </section>
    </main>
    <footer className="footer"><span>知衡 · 自我观察与健康教育工具</span><span>不提供疾病诊断、治疗或紧急服务</span></footer>
  </div>;
}
