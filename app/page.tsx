import type { Metadata } from "next";
import { ZhihengApp } from "./ZhihengApp";

export const metadata: Metadata = {
  title: "开始评估｜知衡",
  description: "完成 WHO-5 幸福感评估，保存匿名记录并查看个人趋势。",
};

export default function Home() {
  return <ZhihengApp />;
}
