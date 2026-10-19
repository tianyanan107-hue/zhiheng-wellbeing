import type { Metadata } from "next";
import { ZhihengApp } from "./ZhihengApp";

export const metadata: Metadata = {
  title: "开始评估｜知衡",
  description: "完成多维状态评估，使用可追溯的本地智能体查看趋势、综合报告与行动建议。",
};

export default function Home() {
  return <ZhihengApp />;
}
