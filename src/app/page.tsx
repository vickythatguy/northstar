import { PageHeader } from "@/components/shell/page-header";

export default function HomePage() {
  return (
    <>
      <PageHeader kicker="vision board" title="Where you're pointed.">
        A quiet quote, a grid of goals, the long view.
      </PageHeader>

      <blockquote className="mb-12 border-l-2 border-accent pl-5 font-serif text-2xl leading-snug text-balance">
        “The two most important days in your life are the day you are born and the day you find out why.”
        <footer className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          — Mark Twain
        </footer>
      </blockquote>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { title: "Add your first goal", body: "Click below to seed the board." },
          { title: "Coming soon", body: "Drag to reorder, images, target dates." },
        ].map((c) => (
          <article
            key={c.title}
            className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-sm"
          >
            <h3 className="text-lg">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}
