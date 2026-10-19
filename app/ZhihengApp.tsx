"use client";

import { useEffect, useMemo, useState } from "react";
import { generateComprehensiveReport } from "../lib/report";

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

const isiQuestions = [
  "过去两周，你入睡困难的严重程度如何？",
  "过去两周，你维持睡眠困难的严重程度如何？",
  "过去两周，你过早醒来的严重程度如何？",
  "你对目前睡眠模式的满意程度如何？",
  "你认为睡眠问题在多大程度上影响了日常功能？",
  "你认为他人能在多大程度上察觉到你的睡眠问题？",
  "你对目前睡眠问题的担忧或痛苦程度如何？",
];
const isiOptionSets = [
  ["无", "轻度", "中度", "重度", "非常严重"],
  ["无", "轻度", "中度", "重度", "非常严重"],
  ["无", "轻度", "中度", "重度", "非常严重"],
  ["非常满意", "满意", "一般", "不满意", "非常不满意"],
  ["完全不影响", "轻微影响", "有些影响", "明显影响", "严重影响"],
  ["完全不会", "轻微", "有些", "很明显", "非常明显"],
  ["完全不担忧", "轻微", "有些", "明显", "非常担忧"],
].map((labels) => labels.map((label, score) => ({ score, label })));

const pss10Questions = [
  "因为发生意外的事情而感到心烦意乱？",
  "感到无法控制生活中重要的事情？",
  "感到紧张和有压力？",
  "有信心处理自己的个人问题？",
  "感到事情正在按自己的想法发展？",
  "发现自己无法应付所有必须做的事情？",
  "能够控制生活中令人恼火的事情？",
  "感到自己能掌控事情？",
  "因为无法控制的事情而生气？",
  "感到困难堆积得太多，无法克服？",
];
const pss10Options = ["从不", "几乎从不", "有时", "经常", "总是"].map((label, score) => ({ score, label }));

const lifestyleQuestions = [
  "我能保持相对规律的入睡和起床时间",
  "我每次会进行至少 30 分钟的中等强度活动",
  "我会接触户外日光或在户外活动",
  "我会规律吃饭，并尽量保证饮食多样",
  "我会与家人、朋友或同伴保持有质量的联系",
  "长时间学习或使用屏幕后，我会主动休息",
];
const lifestyleOptions = ["几乎没有", "每周 1—2 天", "每周 3—4 天", "每周 5 天以上"].map((label, score) => ({ score, label }));

type Scale = "WHO-5" | "PHQ-9" | "GAD-7" | "ISI" | "PSS-10" | "LIFESTYLE";

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
  const [histories, setHistories] = useState<Record<Scale, HistoryItem[]>>({ "WHO-5": [], "PHQ-9": [], "GAD-7": [], ISI: [], "PSS-10": [], LIFESTYLE: [] });
  const [dashboardDays, setDashboardDays] = useState<7 | 30>(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkin, setCheckin] = useState({ mood: 3, sleepHours: 7, sleepQuality: 3, stress: 3, energy: 3, exercised: false, note: "" });
  const [checkinMessage, setCheckinMessage] = useState("");
  const [showReport, setShowReport] = useState(false);

  const questions = scale === "PHQ-9" ? phq9Questions : scale === "GAD-7" ? gad7Questions : scale === "ISI" ? isiQuestions : scale === "PSS-10" ? pss10Questions : scale === "LIFESTYLE" ? lifestyleQuestions : who5Questions;
  const options = scale === "WHO-5" ? who5Options : scale === "ISI" ? isiOptionSets[questionIndex] : scale === "PSS-10" ? pss10Options : scale === "LIFESTYLE" ? lifestyleOptions : phq9Options;

  async function loadHistory(activeScale: Scale = scale) {
    const response = await fetch(`/api/assessments?anonymousId=${encodeURIComponent(getAnonymousId())}&scale=${activeScale}`);
    if (!response.ok) return;
    const data = (await response.json()) as { history: HistoryItem[] };
    if (activeScale === scale) setHistory(data.history);
    setHistories((current) => ({ ...current, [activeScale]: data.history }));
  }

  async function loadAllHistories() {
    await Promise.all((["WHO-5", "PHQ-9", "GAD-7", "ISI", "PSS-10", "LIFESTYLE"] as Scale[]).map((item) => loadHistory(item)));
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
  const comprehensiveReport = useMemo(() => {
    const latest = (name: Scale) => histories[name].at(-1)?.rawScore;
    const assessmentCount = Object.values(histories).filter((items) => items.length > 0).length;
    return generateComprehensiveReport({ assessmentCount, dashboardDays, checkinCount: recentCheckins.length, who5: histories["WHO-5"].at(-1)?.normalizedScore, phq9: latest("PHQ-9"), gad7: latest("GAD-7"), isi: latest("ISI"), pss10: latest("PSS-10"), lifestyle: latest("LIFESTYLE"), averageSleep: averages.sleep, averageStress: averages.stress, averageMood: averages.mood });
  }, [histories, recentCheckins, dashboardDays, averages]);

  function goToAssessment(next: Stage) {
    setStage(next);
    window.setTimeout(() => document.getElementById("assessment")?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  function selectScale(nextScale: Scale) {
    setScale(nextScale);
    const counts: Record<Scale, number> = { "WHO-5": 5, "PHQ-9": 9, "GAD-7": 7, ISI: 7, "PSS-10": 10, LIFESTYLE: 6 };
    setAnswers(Array(counts[nextScale]).fill(null));
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
    const [who5, phq9, gad7, isi, pss10, lifestyle, daily] = await Promise.all([
      fetch(`/api/assessments?anonymousId=${id}&scale=WHO-5`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=PHQ-9`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=GAD-7`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=ISI`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=PSS-10`).then((response) => response.json()),
      fetch(`/api/assessments?anonymousId=${id}&scale=LIFESTYLE`).then((response) => response.json()),
      fetch(`/api/checkins?anonymousId=${id}`).then((response) => response.json()),
    ]) as Array<{ history?: HistoryItem[]; checkins?: Checkin[] }>;
    const payload = { exportedAt: new Date().toISOString(), assessments: { "WHO-5": who5.history ?? [], "PHQ-9": phq9.history ?? [], "GAD-7": gad7.history ?? [], ISI: isi.history ?? [], "PSS-10": pss10.history ?? [], LIFESTYLE: lifestyle.history ?? [] }, dailyCheckins: daily.checkins ?? [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `zhiheng-data-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  function downloadReport() {
    if (!comprehensiveReport.ready) return;
    const lines = [
      "知衡｜个人状态综合报告",
      `生成时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      comprehensiveReport.headline,
      comprehensiveReport.overview,
      "",
      "本周建议：",
      ...comprehensiveReport.actions.map((action, index) => `${index + 1}. ${action}`),
      "",
      comprehensiveReport.needsProfessionalSupport ? "专业支持提示：当前部分记录达到建议进一步咨询的范围。如果困扰持续、加重或影响生活，请联系合格的专业人员。" : "专业支持提示：如困扰持续、加重或影响学习、工作和生活，仍建议联系合格的专业人员。",
      "",
      "本报告用于自我观察和健康教育，不构成诊断、治疗建议或紧急服务。",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `zhiheng-report-${new Date().toISOString().slice(0, 10)}.txt`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function deleteAllData() {
    if (!window.confirm("确定删除此设备匿名标识下的全部量表和打卡记录吗？此操作无法撤销。")) return;
    const id = encodeURIComponent(getAnonymousId());
    const responses = await Promise.all([fetch(`/api/assessments?anonymousId=${id}`, { method: "DELETE" }), fetch(`/api/checkins?anonymousId=${id}`, { method: "DELETE" })]);
    if (responses.some((response) => !response.ok)) return setCheckinMessage("删除失败，请稍后再试。");
    setHistory([]); setHistories({ "WHO-5": [], "PHQ-9": [], "GAD-7": [], ISI: [], "PSS-10": [], LIFESTYLE: [] }); setCheckins([]); setCheckinMessage("此设备对应的记录已全部删除。");
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
            <button className="secondary" onClick={() => selectScale("ISI")}>测睡眠困扰 ISI</button>
            <button className="secondary" onClick={() => selectScale("PSS-10")}>测感知压力 PSS-10</button>
            <button className="secondary" onClick={() => selectScale("LIFESTYLE")}>生活习惯问卷</button>
            <button className="secondary" onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}>查看我的趋势</button>
          </div>
        </div>
        <aside className="hero-card" aria-label="最近一次评估概览">
          <div className="status-label">最近一次 {scale} 得分</div>
          <div className="status-score">{latestDisplay}<span className="status-unit"> / {scale === "PHQ-9" ? 27 : scale === "GAD-7" ? 21 : scale === "ISI" ? 28 : scale === "PSS-10" ? 40 : scale === "LIFESTYLE" ? 18 : 100}</span></div>
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
              <div className="consent-card"><strong>这项评估能做什么</strong><p>{scale === "PHQ-9" ? "PHQ-9用于筛查过去两周的抑郁相关症状，帮助识别是否值得进一步咨询。" : scale === "GAD-7" ? "GAD-7用于筛查过去两周的焦虑相关症状，帮助你观察症状频率和变化。" : scale === "ISI" ? "ISI用于了解过去两周的失眠症状、睡眠满意度及其日间影响。" : scale === "PSS-10" ? "PSS-10用于了解过去一个月中，你对生活压力的主观感受。" : scale === "LIFESTYLE" ? "这份非诊断性问卷记录近一周中支持身心状态的日常习惯。" : "WHO-5用于了解过去两周的主观心理幸福感，帮助你观察个人变化。"}</p></div>
              <div className="consent-card"><strong>它不能做什么</strong><p>结果不能诊断抑郁症或其他疾病，也不能替代医生、心理咨询师的判断。</p></div>
            </div>
            <label className="consent-check"><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /><span>我已阅读并理解以上说明，自愿进行本次匿名自我评估。</span></label>
            <div className="question-actions"><button className="secondary" onClick={() => setStage("intro")}>暂不评估</button><button className="primary" disabled={!consented} onClick={() => setStage("questionnaire")}>继续</button></div>
          </div>
        </>}

        {stage === "questionnaire" && <>
          <div className="panel-header"><div><h2>{scale === "PHQ-9" ? "PHQ-9 抑郁症状筛查" : scale === "GAD-7" ? "GAD-7 焦虑症状筛查" : scale === "ISI" ? "ISI 失眠严重程度评估" : scale === "PSS-10" ? "PSS-10 感知压力评估" : scale === "LIFESTYLE" ? "生活习惯问卷" : "WHO-5 心理幸福感评估"}</h2><p>{scale === "PSS-10" ? "请根据过去一个月的真实感受作答。" : scale === "LIFESTYLE" ? "请根据过去一周的实际情况作答。" : "请根据过去两周的真实感受作答。"}</p></div><span className="step-badge">约 {questions.length <= 6 ? 2 : 3} 分钟</span></div>
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
            <div className="score-ring" style={{ "--score-angle": `${result.normalizedScore * 3.6}deg` } as React.CSSProperties}><div className="score-value">{scale === "WHO-5" ? result.normalizedScore : result.rawScore}<small>{scale === "PHQ-9" ? "满分 27" : scale === "GAD-7" ? "满分 21" : scale === "ISI" ? "满分 28" : scale === "PSS-10" ? "满分 40" : scale === "LIFESTYLE" ? "支持度 / 18" : "满分 100"}</small></div></div>
            <div className="result-copy">
              <h3>{({ positive: "继续关注自己的状态", negative: "值得给自己多一些关注", minimal: "目前症状很少", mild: "存在轻度症状", moderate: "建议进一步关注", moderately_severe: "建议尽快咨询专业人员", severe: "建议尽快寻求专业帮助", none: "目前未见明显失眠困扰", subthreshold: "存在轻度睡眠困扰", low: "目前感知压力较低", high: "目前感知压力较高", needs_attention: "可以从一个小习惯开始", developing: "已有一些支持健康的习惯", supportive: "当前习惯对状态较有支持" }[result.band] ?? "关注自己的状态")}</h3>
              <p>{scale === "WHO-5" ? (result.band === "positive" ? "本次结果未落入WHO-5建议进一步评估的范围。单次结果会受到近期事件影响，持续记录更有参考价值。" : "本次得分低于WHO-5建议进一步评估的参考范围。这不代表你患有某种疾病；如果这种状态持续、影响生活，建议向合格的专业人员进一步咨询。") : scale === "LIFESTYLE" ? "生活习惯支持度不是医学量表，也没有诊断意义。它只帮助你发现可调整的日常环节，建议每次只选择一个容易坚持的小目标。" : `${scale}是自我筛查工具，分数用于帮助观察近期状态，不能单独用于诊断。如果困扰持续、加重或影响生活，请向合格的专业人员咨询。`}</p>
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
            <div className="metric-card"><span>ISI</span><strong>{histories.ISI.at(-1)?.rawScore ?? "—"}</strong><small>睡眠困扰 / 28</small></div>
            <div className="metric-card"><span>PSS-10</span><strong>{histories["PSS-10"].at(-1)?.rawScore ?? "—"}</strong><small>感知压力 / 40</small></div>
            <div className="metric-card"><span>生活习惯</span><strong>{histories.LIFESTYLE.at(-1)?.rawScore ?? "—"}</strong><small>支持度 / 18，非临床</small></div>
            <div className="metric-card"><span>平均情绪</span><strong>{averages.mood?.toFixed(1) ?? "—"}</strong><small>{recentCheckins.length} 次记录</small></div>
            <div className="metric-card"><span>平均睡眠</span><strong>{averages.sleep?.toFixed(1) ?? "—"}</strong><small>小时 / 晚</small></div>
            <div className="metric-card"><span>压力 / 精力</span><strong>{averages.stress?.toFixed(1) ?? "—"} / {averages.energy?.toFixed(1) ?? "—"}</strong><small>满分均为 5</small></div>
          </div>
          <div className="weekly-summary"><span>规则总结</span><p>{weeklySummary}</p></div>
          {recentCheckins.length > 1 && <div className="spark-chart" aria-label={`${dashboardDays}天情绪与压力趋势`}>
            {recentCheckins.map((item) => <div className="spark-day" key={item.id} title={`情绪 ${item.mood}，压力 ${item.stress}`}><i style={{ height: `${item.mood * 18}%` }} /><b style={{ height: `${item.stress * 18}%` }} /></div>)}
          </div>}
          <div className="report-entry"><div><strong>生成综合报告</strong><p>汇总量表与每日记录，得到三个可执行的小建议。所有判断均来自固定规则。</p></div><button className="primary" onClick={() => { setShowReport(true); window.setTimeout(() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth" }), 30); }}>生成我的报告</button></div>
          <div className="data-actions"><div><strong>我的数据</strong><p>导出或删除此浏览器匿名标识对应的记录。</p></div><div className="hero-actions"><button className="secondary" onClick={() => exportData().catch(() => setCheckinMessage("导出失败，请稍后再试。"))}>导出 JSON</button><button className="danger-button" onClick={() => deleteAllData().catch(() => setCheckinMessage("删除失败，请稍后再试。"))}>删除全部记录</button></div></div>
        </div>
      </section>

      {showReport && <section className="panel report-panel" id="report" aria-live="polite">
        <div className="panel-header"><div><h2>个人状态综合报告</h2><p>由确定性规则生成，可追溯、非诊断，不使用大模型判断风险。</p></div><span className="step-badge">v0.6 规则报告</span></div>
        <div className="panel-body">
          {!comprehensiveReport.ready ? <div className="empty-history"><strong>目前还没有足够的数据</strong><p>请先完成任意一项评估或保存一次每日状态，再回来生成报告。</p></div> : <>
            <div className="report-hero"><span>本次概览</span><h3>{comprehensiveReport.headline}</h3><p>{comprehensiveReport.overview}</p></div>
            <div className="report-section"><span className="report-kicker">未来 7 天建议</span><ol>{comprehensiveReport.actions.map((action, index) => <li key={index}><b>{index + 1}</b><span>{action}</span></li>)}</ol></div>
            <div className={`report-support ${comprehensiveReport.needsProfessionalSupport ? "attention" : ""}`}><strong>{comprehensiveReport.needsProfessionalSupport ? "建议考虑专业支持" : "什么时候需要专业支持"}</strong><p>{comprehensiveReport.needsProfessionalSupport ? "当前部分记录达到建议进一步咨询的范围。如果困扰持续、加重或已经影响学习、工作或生活，请联系合格的专业人员。" : "如果困扰持续、明显加重，或开始影响学习、工作、睡眠和人际关系，建议联系合格的专业人员。"}</p><small>如果你正处于危险中，或有伤害自己、他人的想法，请立即联系当地紧急服务、可信任的人或专业机构。本网站不提供紧急干预。</small></div>
            <div className="report-footer"><p>建议每 7 天重新生成一次，比较自己的变化，不把单次分数当作结论。</p><button className="secondary" onClick={downloadReport}>下载文字报告</button></div>
          </>}
        </div>
      </section>}

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
