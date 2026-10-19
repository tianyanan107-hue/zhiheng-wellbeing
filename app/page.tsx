import type { Metadata } from "next";
import { ZhihengApp } from "./ZhihengApp";

export const metadata: Metadata = {
  title: "开始评估｜知衡",
  description: "完成 WHO-5、PHQ-9、GAD-7 自我评估和每日状态打卡，查看个人长期趋势。",
};

export default function Home() {
  return <ZhihengApp />;
}
