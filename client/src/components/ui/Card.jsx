export function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`rounded-xl border border-line bg-white shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 pt-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '', as: Heading = 'h2' }) {
  return <Heading className={`text-base font-semibold text-ink ${className}`}>{children}</Heading>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={`mt-1 text-sm leading-relaxed text-ink-muted ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-5 pb-5 pt-0 ${className}`}>{children}</div>;
}
