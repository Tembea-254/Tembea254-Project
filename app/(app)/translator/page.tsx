import type { Metadata } from "next";
import { Translator } from "@/components/translator/translator";
import { getPhrases } from "@/lib/repo/phrases";

export const metadata: Metadata = { title: "Translator" };
export const dynamic = "force-dynamic";

export default async function TranslatorPage() {
  return <Translator phrases={await getPhrases()} />;
}
