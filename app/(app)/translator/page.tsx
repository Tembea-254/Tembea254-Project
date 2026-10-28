import type { Metadata } from "next";
import { Translator } from "@/components/translator/translator";

export const metadata: Metadata = { title: "Translator" };

export default function TranslatorPage() {
  return <Translator />;
}
