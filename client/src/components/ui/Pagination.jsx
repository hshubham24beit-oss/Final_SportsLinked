import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

function buildPages(page, totalPages) {
  const pages = [];
  for (let current = 1; current <= totalPages; current += 1) {
    const isEdge = current === 1 || current === totalPages;
    const isNear = Math.abs(current - page) <= 1;
    if (isEdge || isNear) {
      pages.push(current);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }
  return pages;
}

export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const pages = buildPages(page, totalPages);

  const goTo = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }
    onChange(nextPage);
  };

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-3 border-t border-line px-4 py-3 ${className}`}
    >
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-ink-subtle"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => goTo(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                item === page
                  ? 'bg-ink text-white'
                  : 'text-ink-muted hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {item}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        Next
        <FiChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
