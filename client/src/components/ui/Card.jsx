export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`surface-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-5 pt-5 sm:px-6 sm:pt-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '', as: Heading = 'h2' }) {
  return (
    <Heading className={`font-display text-lg font-semibold text-navy ${className}`}>
      {children}
    </Heading>
  );
}

export function CardDescription({ children, className = '' }) {
  return <p className={`mt-1 text-sm leading-relaxed text-slate ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-5 pb-5 pt-0 sm:px-6 sm:pb-6 ${className}`}>{children}</div>;
}
