interface FooterProps {
  siteName?: string;
}

export function Footer({ siteName = "LDC Store" }: FooterProps) {
  return (
    <footer className="border-t">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-center px-4 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} {siteName}</span>
      </div>
    </footer>
  );
}
