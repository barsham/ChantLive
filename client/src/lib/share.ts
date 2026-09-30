export type ShareResult = "shared" | "copied" | "cancelled" | "manual";

type ShareOptions = {
  title: string;
  text: string;
  url?: string;
  completeText: string;
  share?: ((data: ShareData) => Promise<void>) | null;
  writeText?: ((text: string) => Promise<void>) | null;
};

export async function shareWithVisibleFallback({
  title,
  text,
  url,
  completeText,
  share = typeof navigator !== "undefined" && navigator.share ? navigator.share.bind(navigator) : null,
  writeText = typeof navigator !== "undefined" && navigator.clipboard?.writeText ? navigator.clipboard.writeText.bind(navigator.clipboard) : null,
}: ShareOptions): Promise<ShareResult> {
  if (share) {
    try {
      await share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  if (writeText) {
    try {
      await writeText(completeText);
      return "copied";
    } catch {
      // The caller will expose selectable text.
    }
  }

  return "manual";
}
