import { ButtonLink, Notice } from "@/components/ui";

/** Shown when the browser left before all rows were sent. Those rows can't be recovered, so start again. */
export function ImportUnfinished() {
  return (
    <Notice tone="warning" title="This import didn't finish" action={<ButtonLink href="/upload" size="sm">Upload again</ButtonLink>}>
      {"The page was closed before every row was sent, so this upload can't be analyzed. Upload the file again, and delete this one when you no longer need it."}
    </Notice>
  );
}
