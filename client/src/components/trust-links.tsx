import { Link } from "wouter";

type TrustLinksProps = {
  className?: string;
  linkClassName?: string;
};

export function TrustLinks({ className = "", linkClassName = "" }: TrustLinksProps) {
  const links = `underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${linkClassName}`;

  return (
    <nav className={className} aria-label="Trust and transparency">
      <Link href="/privacy" className={links} data-testid="link-privacy-policy">Privacy</Link>
      <a href="https://github.com/barsham/ChantLive" target="_blank" rel="noopener noreferrer" className={links} data-testid="link-source-code">
        Source code
      </a>
    </nav>
  );
}
