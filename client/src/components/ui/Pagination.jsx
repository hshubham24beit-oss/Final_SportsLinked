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
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-sm font-bold text-body transition-colors hover:bg-sand hover:text-navy disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
      >
        <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-slate"
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
              className={`h-10 min-w-10 rounded-full px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track ${
                item === page ? 'bg-navy text-ivory' : 'text-slate hover:bg-sand hover:text-navy'
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
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-sm font-bold text-body transition-colors hover:bg-sand hover:text-navy disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
      >
        Next
        <FiChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
