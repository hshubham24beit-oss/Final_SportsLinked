export default function AuthHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-7">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}
