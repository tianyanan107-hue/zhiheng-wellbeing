"use client";

import { useEffect, useMemo, useState } from "react";

const questions = [
  "我感到心情愉快、精神状态良好",
  "我感到平静和放松",
  "我感到精力充沛、富有活力",
  "我醒来时感到清醒且休息充分",
  "我的日常生活中充满了令我感兴趣的事物",
];
const options = [
  { score: 5, label: "所有时候" }, { score: 4, label: "大部分时候" },
  { score: 3, label: "超过一半时间" }, { score: 2, label: "少于一半时间" },
  { score: 1, label: "有些时候" }, { score: 0, label: "任何时候都没有" },
];

type HistoryItem = { id: number; normalizedScore: number; createdAt: string };
type Result = { rawScore: number; normalizedScore: number; band: "positive" | "review" };
type Stage = "intro" | "consent" | "questionnaire" | "result";

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
  const [consented, setConsented] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(Array(5).fill(null));
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    const response = await fetch(`/api/assessments?anonymousId=${encodeURIComponent(getAnonymousId())}`);
    if (!response.ok) return;
    const data = (await response.json()) as { history: HistoryItem[] };
    setHistory(data.history);
  }

  useEffect(() => { loadHistory().catch(() => undefined); }, []);
  const latestDisplay = useMemo(() => history.at(-1)?.normalizedScore ?? "—", [history]);
  const currentAnswer = answers[questionIndex];

  function goToAssessment(next: Stage) {
    setStage(next);
    window.setTimeout(() => document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth" }), 30);
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
        body: JSON.stringify({ anonymousId: getAnonymousId(), answers: complete }),
      });
      const data = (await response.json()) as { result?: Result; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "暂时无法保存结果。");
      setResult(data.result); goToAssessment("result"); await loadHistory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法保存结果。");
    } finally { setSubmitting(false); }
  }

  function resetAssessment() {
    setAnswers(Array(5).fill(null)); setQuestionIndex(0); setResult(null); setError(""); goToAssessment("questionnaire");
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
          <p className="hero-copy">用约两分钟完成一次规范的幸福感评估。我们帮助你记录状态、看见变化，但不会给你贴上疾病标签。</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => goToAssessment("consent")}>开始本次评估</button>
            <button className="secondary" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>查看我的趋势</button>
          </div>
        </div>
        <aside className="hero-card" aria-label="最近一次评估概览">
          <div className="status-label">最近一次 WHO-5 得分</div>
          <div className="status-score">{latestDisplay}<span className="status-unit"> / 100</span></div>
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
              <div className="consent-card"><strong>这项评估能做什么</strong><p>WHO-5用于了解过去两周的主观心理幸福感，帮助你观察个人变化。</p></div>
              <div className="consent-card"><strong>它不能做什么</strong><p>结果不能诊断抑郁症或其他疾病，也不能替代医生、心理咨询师的判断。</p></div>
            </div>
            <label className="consent-check"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /><span>我已阅读并理解以上说明，自愿进行本次匿名自我评估。</span></label>
            <div className="question-actions"><button className="secondary" onClick={() => setStage("intro")}>暂不评估</button><button className="primary" disabled={!consented} onClick={() => setStage("questionnaire")}>继续</button></div>
          </div>
        </>}

        {stage === "questionnaire" && <>
          <div className="panel-header"><div><h2>WHO-5 心理幸福感评估</h2><p>请根据过去两周的真实感受作答。</p></div><span className="step-badge">约 2 分钟</span></div>
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
            <div className="score-ring" style={{ "--score-angle": `${result.normalizedScore * 3.6}deg` } as React.CSSProperties}><div className="score-value">{result.normalizedScore}<small>满分 100</small></div></div>
            <div className="result-copy">
              <h3>{result.band === "positive" ? "继续关注自己的状态" : "值得给自己多一些关注"}</h3>
              <p>{result.band === "positive" ? "本次结果未落入WHO-5建议进一步评估的范围。单次结果会受到近期事件影响，持续记录更有参考价值。" : "本次得分低于WHO-5建议进一步评估的参考范围。这不代表你患有某种疾病；如果这种状态持续、影响生活，建议向合格的专业人员进一步咨询。"}</p>
              <div className="notice">如果你正处于危险中，或有伤害自己、他人的想法，请立即联系当地紧急服务、可信任的人或专业机构。本网站不提供紧急干预。</div>
              <div className="hero-actions" style={{ marginTop: 20 }}><button className="primary" onClick={resetAssessment}>再次评估</button><button className="secondary" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>查看趋势</button></div>
            </div>
          </div></div>
        </>}
      </section>}

      <section className="panel history" id="history">
        <div className="panel-header"><div><h2>我的幸福感趋势</h2><p>仅保存在匿名标识下，展示最近 12 次结果。</p></div><span className="step-badge">WHO-5</span></div>
        <div className="panel-body">{history.length === 0
          ? <div className="empty-history">完成第一次评估后，这里会出现你的个人趋势。</div>
          : <div className="history-chart" aria-label="历史得分柱状图">{history.map((item) => <div className="history-column" key={item.id} title={`${item.createdAt}：${item.normalizedScore}分`}><div className="history-bar" style={{ height: `${Math.max(item.normalizedScore, 6)}%` }}><span>{item.normalizedScore}</span></div>{new Date(item.createdAt.replace(" ", "T") + "Z").toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</div>)}</div>}
        </div>
      </section>
    </main>
    <footer className="footer"><span>知衡 · 自我观察与健康教育工具</span><span>不提供疾病诊断、治疗或紧急服务</span></footer>
  </div>;
}
