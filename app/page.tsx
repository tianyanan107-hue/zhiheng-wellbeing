import type { Metadata } from "next";
import { ZhihengApp } from "./ZhihengApp";

export const metadata: Metadata = {
  title: "开始评估｜知衡",
  description: "完成幸福感、情绪、焦虑、睡眠、压力和生活习惯评估，查看个人长期趋势。",
};

export default function Home() {
  return <ZhihengApp />;
}
