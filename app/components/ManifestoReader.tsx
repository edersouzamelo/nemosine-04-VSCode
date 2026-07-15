"use client";

import { CSSProperties, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGE_COUNT = 75;
const PDF_URL = "/assets/manifesto-reader/nemosine-manifesto-sem-divisorias.pdf";

function pageImageSrc(page: number) {
  return `/assets/manifesto-pages/page-${String(page).padStart(2, "0")}.jpg`;
}

export default function ManifestoReader() {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const pages = useMemo(() => Array.from({ length: PAGE_COUNT }, (_, index) => index + 1), []);

  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), PAGE_COUNT));
  }, []);

  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const previousPage = useCallback(() => goToPage(page - 1), [goToPage, page]);
  const turnProgress = Math.min(Math.abs(dragOffset) / 260, 1);
  const turnDirection = dragOffset < 0 ? "next" : dragOffset > 0 ? "previous" : "idle";

  useEffect(() => {
    const savedPage = window.localStorage.getItem("nemosine-manifesto-page");
    if (savedPage) goToPage(Number(savedPage));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("nemosine-manifesto-page", String(page));
  }, [page]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") previousPage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextPage, previousPage]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current === null) return;
    setDragOffset(event.clientX - dragStartRef.current);
  };

  const handlePointerEnd = () => {
    if (dragOffset < -60) nextPage();
    if (dragOffset > 60) previousPage();
    dragStartRef.current = null;
    setDragOffset(0);
  };

  return (
    <div className="manifesto-reader-shell mx-auto w-full max-w-6xl">
      <div className="manifesto-reader-toolbar">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#c5a059]/55">
            Biblioteca Nemosine
          </p>
          <p className="mt-1 font-serif text-lg text-[#f4e6c8]">Manifesto Nemosine Nous</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="manifesto-reader-action"
            onClick={() => setZoom((current) => Math.max(0.85, Number((current - 0.1).toFixed(2))))}
          >
            -
          </button>
          <button
            type="button"
            className="manifesto-reader-action"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="manifesto-reader-action"
            onClick={() => setZoom((current) => Math.min(1.45, Number((current + 0.1).toFixed(2))))}
          >
            +
          </button>
          <a
            href={PDF_URL}
            download
            className="manifesto-reader-action"
          >
            Baixar PDF
          </a>
          <span className="manifesto-reader-counter">
            {page} / {PAGE_COUNT}
          </span>
        </div>
      </div>

      <div
        className={`manifesto-reader-stage is-turning-${turnDirection}`}
        style={{
          "--manifesto-drag": `${dragOffset * 0.08}px`,
          "--manifesto-turn": String(turnProgress),
          "--manifesto-zoom": String(zoom)
        } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <button
          type="button"
          className="manifesto-reader-nav manifesto-reader-nav-left"
          onClick={previousPage}
          disabled={page === 1}
          aria-label="Pagina anterior"
        >
          ‹
        </button>

        <div className="manifesto-reader-book">
          <figure className="manifesto-reader-page manifesto-reader-page-left">
            <img src={pageImageSrc(page)} alt={`Pagina ${page} do Manifesto Nemosine Nous`} draggable={false} />
          </figure>
          {page < PAGE_COUNT && (
            <figure className="manifesto-reader-page manifesto-reader-page-right manifesto-reader-page-paired">
              <img src={pageImageSrc(page + 1)} alt={`Pagina ${page + 1} do Manifesto Nemosine Nous`} draggable={false} />
            </figure>
          )}
        </div>

        <button
          type="button"
          className="manifesto-reader-nav manifesto-reader-nav-right"
          onClick={nextPage}
          disabled={page === PAGE_COUNT}
          aria-label="Proxima pagina"
        >
          ›
        </button>
      </div>

      <div className="manifesto-reader-footer">
        <input
          type="range"
          min={1}
          max={PAGE_COUNT}
          value={page}
          onChange={(event) => goToPage(Number(event.target.value))}
          aria-label="Selecionar pagina"
        />
        <div className="flex justify-center gap-2">
          {pages.filter((pageNumber) => pageNumber === 1 || pageNumber % 10 === 0 || pageNumber === PAGE_COUNT).map((pageNumber) => (
            <button key={pageNumber} type="button" onClick={() => goToPage(pageNumber)}>
              {pageNumber}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
