/** A small, quiet footer: the product name and a reminder that uploads are private. */
export function SiteFooter() {
  return (
    <footer className="no-print mt-auto border-t border-line">
      <div className="gutter mx-auto flex max-w-[75rem] flex-wrap items-center justify-between gap-x-6 gap-y-1 py-6 text-[15px] text-ink-2">
        <p className="font-display font-extrabold text-ink">ReviewLens</p>
        <p>Only you can see your uploads.</p>
      </div>
    </footer>
  );
}
