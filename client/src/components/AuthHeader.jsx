export default function AuthHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-7">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-navy sm:text-[2rem]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-slate">{description}</p>
      ) : null}
    </div>
  );
}
