import { PageHeader } from "@/components/shell/page-header";
import { VisionBoard } from "@/components/vision/vision-board";

const QUOTES = [
  ["The two most important days in your life are the day you are born and the day you find out why.", "Mark Twain"],
  ["What you do every day matters more than what you do once in a while.", "Gretchen Rubin"],
  ["You are what you repeat.", "Aristotle (paraphrased)"],
  ["Discipline equals freedom.", "Jocko Willink"],
  ["The best way out is always through.", "Robert Frost"],
];

export default function HomePage() {
  // Stable but rotates: keyed by day of year so it changes daily, not on every refresh.
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const [text, author] = QUOTES[dayOfYear % QUOTES.length];

  return (
    <>
      <PageHeader kicker="vision board" title="Where you're pointed.">
        A daily quote, and the things you're walking toward.
      </PageHeader>

      <blockquote className="mb-12 border-l-2 border-accent pl-5 font-serif text-2xl leading-snug text-balance">
        “{text}”
        <footer className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">— {author}</footer>
      </blockquote>

      <VisionBoard />
    </>
  );
}
