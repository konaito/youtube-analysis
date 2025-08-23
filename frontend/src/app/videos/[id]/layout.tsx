import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "動画詳細 - YouTube ダウンローダー",
  description: "YouTube動画の詳細とダウンロードページ",
};

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}