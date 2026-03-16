import { APP_VERSION } from "@/lib/version";

export function AppVersion({ className = "" }: { className?: string }) {
  return <span className={`text-xs text-muted-foreground ${className}`.trim()}>v{APP_VERSION}</span>;
}
