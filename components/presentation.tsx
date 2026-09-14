"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Grid2X2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  TvMinimal,
  X,
} from "lucide-react";
import originalSlides from "@/lib/slides.json";
import { films, details, type FilmPlacement } from "@/lib/animations";
import { StoriesGallery } from "./stories";
import { stories } from "@/lib/stories";
import portrait from "@/lib/portrait.json";
import { portraitOverlay } from "@/lib/portrait-layout";
import { TvProgress, tvDuration } from "./tv-progress";
import type { RemoteCommand } from "@/lib/remote-control";
const RemotePairing = dynamic(() => import("./remote-pairing"), { ssr: false });
const ThreeLogo = dynamic(() => import("./three-logo"), { ssr: false });
const completeDeck = originalSlides.map((slide, index) => ({
  ...slide,
  portrait: portrait[index],
}));
const withoutInvestment = completeDeck.filter(
  (slide) => slide.number !== 43 && slide.number !== 44,
);

function CharacterFilm({
  placement,
  moving,
  visible,
}: {
  placement: FilmPlacement;
  moving: boolean;
  visible: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (moving && visible) element.play().catch(() => setReady(false));
    else element.pause();
  }, [moving, visible]);
  return (
    <div
      className="character-film"
      style={{
        ...portraitOverlay(placement.page, placement.box),
        left: `${placement.box[0] / 19.2}%`,
        top: `${placement.box[1] / 10.8}%`,
        width: `${placement.box[2] / 19.2}%`,
        height: `${placement.box[3] / 10.8}%`,
        backgroundColor: placement.background,
        opacity: ready && moving && visible ? 1 : 0,
      }}
      aria-hidden="true"
    >
      <video
        ref={video}
        src={
          visible ? `/media/character-${placement.character}.mp4` : undefined
        }
        style={{
          left: `${(placement.frame[0] / placement.box[2]) * 100}%`,
          top: `${(placement.frame[1] / placement.box[3]) * 100}%`,
          width: `${(placement.frame[2] / placement.box[2]) * 100}%`,
        }}
        muted
        loop
        playsInline
        preload="none"
        onLoadStart={() => setReady(false)}
        onEmptied={() => setReady(false)}
        onPlaying={() => setReady(true)}
        onError={() => setReady(false)}
      />
    </div>
  );
}

export default function Presentation({
  portraitOnly = false,
  tvMode = false,
  hideInvestment = false,
}: {
  portraitOnly?: boolean;
  tvMode?: boolean;
  hideInvestment?: boolean;
}) {
  const slides = tvMode || hideInvestment ? withoutInvestment : completeDeck;
  const [current, setCurrent] = useState(0);
  const [moving, setMoving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [tvPaused, setTvPaused] = useState(false);
  const playMotion = moving && (!tvMode || !tvPaused);
  const dialog = useRef<HTMLDialogElement>(null);
  const indexButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLElement>(null);
  const active = useRef(0);
  const reduced = useRef(false);
  const goTo = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(slides.length - 1, index));
      const distance = Math.abs(target - active.current);
      active.current = target;
      setCurrent(target);
      document
        .getElementById(`slide-${slides[target].number}`)
        ?.scrollIntoView({
          // A long smooth jump can be stopped by intermediate scroll-snap pages.
          behavior:
            tvMode || reduced.current || distance > 1 ? "instant" : "smooth",
          block: "start",
        });
    },
    [tvMode, slides],
  );
  const advanceTv = useCallback(
    () => goTo((active.current + 1) % slides.length),
    [goTo, slides],
  );
  const remoteCommand = useCallback(
    (command: RemoteCommand) => {
      if (command.type === "pause" || command.type === "play") {
        if (tvMode) setTvPaused(command.type === "pause");
        else setMoving(command.type === "play");
        return;
      }
      if (tvMode) setTvPaused(true);
      if (dialog.current?.open) {
        dialog.current.close();
        setIndexOpen(false);
      }
      if (command.type === "goto") goTo(command.index);
      else goTo(active.current + (command.type === "next" ? 1 : -1));
    },
    [goTo, tvMode],
  );
  useEffect(() => {
    const sharedStory = location.hash.match(/^#story-(\d+-\d)$/)?.[1];
    const sharedIndex = stories.findIndex((story) => story.id === sharedStory);
    if (sharedIndex >= 0) {
      document
        .getElementById(`slide-${stories[sharedIndex].page}`)
        ?.scrollIntoView({ behavior: "instant" });
    } else {
      const requestedPage = Number(location.hash.match(/^#slide-(\d+)$/)?.[1]);
      if (requestedPage) {
        // Keep original page IDs stable across editions; omitted pages advance
        // to the next available page instead of leaving an invalid hash.
        const requestedIndex = slides.findIndex(
          (slide) => slide.number >= requestedPage,
        );
        goTo(requestedIndex >= 0 ? requestedIndex : slides.length - 1);
      }
    }
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => {
      reduced.current = media.matches;
      setMoving(!media.matches);
    };
    preference();
    media.addEventListener("change", preference);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio > 0.55) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            active.current = index;
            setCurrent(index);
            history.replaceState(
              history.state,
              "",
              `#slide-${slides[index].number}`,
            );
          }
        });
      },
      { threshold: [0.55, 0.7] },
    );
    document
      .querySelectorAll(".slide")
      .forEach((slide) => observer.observe(slide));
    const keyboard = (event: KeyboardEvent) => {
      if (
        dialog.current?.open ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element &&
          (event.target.closest(
            "input, select, textarea, [contenteditable=true]",
          ) ||
            (event.key === " " &&
              event.target.closest("button, a, [role=button]"))))
      )
        return;
      if (tvMode && event.key === " ") {
        event.preventDefault();
        setTvPaused((paused) => !paused);
        return;
      }
      if (tvMode && event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (tvMode && event.key === "Escape" && !document.fullscreenElement) {
        location.assign(
          `${portraitOnly ? "/vertical/sem-investimento" : "/sem-investimento"}#slide-${slides[active.current].number}`,
        );
        return;
      }
      const next = ["ArrowDown", "ArrowRight", "PageDown", " "].includes(
        event.key,
      );
      const previous = ["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key);
      if (next || previous) {
        event.preventDefault();
        goTo(active.current + (next ? 1 : -1));
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        goTo(event.key === "Home" ? 0 : slides.length - 1);
      }
    };
    const fullChange = () => setFullscreen(Boolean(document.fullscreenElement));
    let resizeFrame = 0;
    let resizeTarget: number | null = null;
    const keepCurrentSlide = () => {
      resizeTarget ??= active.current;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        document
          .getElementById(`slide-${slides[resizeTarget!].number}`)
          ?.scrollIntoView({
            behavior: "instant",
            block: "start",
          });
        resizeTarget = null;
      });
    };
    window.addEventListener("resize", keepCurrentSlide);
    document.addEventListener("keydown", keyboard);
    document.addEventListener("fullscreenchange", fullChange);
    return () => {
      media.removeEventListener("change", preference);
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", keepCurrentSlide);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("fullscreenchange", fullChange);
    };
  }, [goTo, portraitOnly, tvMode, slides]);
  function openIndex() {
    dialog.current?.showModal();
    setIndexOpen(true);
  }
  function closeIndex() {
    dialog.current?.close();
    setIndexOpen(false);
    indexButton.current?.focus();
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.current?.requestFullscreen();
    } catch {
      setNotice("A tela cheia não está disponível neste navegador.");
    }
  }
  return (
    <main
      ref={container}
      className={`presentation${portraitOnly ? " portrait-deck" : ""}${tvMode ? " tv-deck" : ""}`}
      id="apresentacao"
    >
      <h1 className="sr-only">Terceiro Espaço — apresentação</h1>
      <span className="sr-only" role="status">
        {notice}
      </span>
      {tvMode && (
        <TvProgress
          current={current}
          slideNumber={slides[current].number}
          total={slides.length}
          duration={tvDuration(slides[current].number, slides[current].text)}
          paused={tvPaused}
          onAdvance={advanceTv}
          onTogglePause={() => setTvPaused((paused) => !paused)}
        />
      )}
      {slides.map((slide, index) => (
        <section
          id={`slide-${slide.number}`}
          key={slide.number}
          data-index={index}
          className={`slide${current === index ? " is-current" : ""}`}
          style={{ backgroundColor: slide.background }}
          aria-label={`Página ${index + 1} de ${slides.length}: ${slide.title}`}
        >
          <div className="slide-art">
            <picture>
              <source
                media={portraitOnly ? "all" : "(orientation: portrait)"}
                srcSet={slide.portrait.src}
                width={2160}
                height={3840}
              />
              <img
                className="original-slide"
                src={slide.src}
                alt=""
                aria-hidden="true"
                width={1920}
                height={1080}
                loading={
                  index < 2 ||
                  (tvMode && index === (current + 1) % slides.length)
                    ? "eager"
                    : "lazy"
                }
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding={index === 0 ? "sync" : "async"}
                draggable={false}
              />
            </picture>
            {index === 0 && (
              <>
                <ThreeLogo moving={playMotion} visible={current === 0} />
                <RemotePairing
                  state={{
                    type: "state",
                    current,
                    paused: tvMode ? tvPaused : !moving,
                    tv: tvMode,
                    pages: slides.map((item) => ({
                      number: item.number,
                      title: item.title,
                    })),
                  }}
                  onCommand={remoteCommand}
                />
              </>
            )}
            {films
              .filter(
                (film) => film.page === slide.number && slide.number !== 18,
              )
              .map((film) => (
                <CharacterFilm
                  key={film.character}
                  placement={film}
                  moving={playMotion && !indexOpen}
                  visible={current === index}
                />
              ))}
            {slide.number >= 18 && slide.number <= 22 && (
              <StoriesGallery
                page={slide.number}
                moving={playMotion && !indexOpen}
                visible={current === index}
              />
            )}
            {details
              .filter((detail) => detail.page === slide.number)
              .map((detail) => (
                <div
                  key={detail.id}
                  className="illustration-detail"
                  aria-hidden="true"
                  data-moving={playMotion && current === index}
                  style={{
                    ...portraitOverlay(detail.page, detail.box),
                    left: `${detail.box[0] / 19.2}%`,
                    top: `${detail.box[1] / 10.8}%`,
                    width: `${detail.box[2] / 19.2}%`,
                    height: `${detail.box[3] / 10.8}%`,
                    backgroundColor: detail.background,
                  }}
                >
                  <img
                    src={`/media/${detail.id}.png`}
                    alt=""
                    draggable={false}
                  />
                </div>
              ))}
          </div>
          <div className="sr-only">
            <h2>{slide.title}</h2>
            <p>{slide.text}</p>
          </div>
        </section>
      ))}
      {!tvMode && (
        <>
          <nav className="deck-controls" aria-label="Controles da apresentação">
            <button
              aria-label="Ativar modo TV"
              title="Modo TV — apresentação automática"
              onClick={() =>
                location.assign(
                  `${portraitOnly ? "/vertical/tv" : "/tv"}#slide-${slides[current].number}`,
                )
              }
            >
              <TvMinimal size={16} strokeWidth={1.4} />
            </button>
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              aria-label="Página anterior"
            >
              <ArrowUp size={16} strokeWidth={1.4} />
            </button>
            <span className="page-count" aria-live="polite">
              {String(current + 1).padStart(2, "0")}
              <span> / {slides.length}</span>
            </span>
            <button
              onClick={() => goTo(current + 1)}
              disabled={current === slides.length - 1}
              aria-label="Próxima página"
            >
              <ArrowDown size={16} strokeWidth={1.4} />
            </button>
            <span className="control-divider" />
            <button
              ref={indexButton}
              onClick={openIndex}
              aria-label="Abrir índice"
              aria-expanded={indexOpen}
              aria-haspopup="dialog"
            >
              <Grid2X2 size={15} strokeWidth={1.3} />
            </button>
            <button
              onClick={() => setMoving(!moving)}
              aria-label={moving ? "Pausar animações" : "Ativar animações"}
              aria-pressed={moving}
            >
              {moving ? (
                <Pause size={14} strokeWidth={1.4} />
              ) : (
                <Play size={14} strokeWidth={1.4} />
              )}
            </button>
            <button
              className="fullscreen-control"
              onClick={toggleFullscreen}
              aria-label={
                fullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"
              }
            >
              {fullscreen ? (
                <Minimize2 size={15} strokeWidth={1.3} />
              ) : (
                <Maximize2 size={15} strokeWidth={1.3} />
              )}
            </button>
          </nav>
          <dialog
            ref={dialog}
            className="deck-index"
            onCancel={() => setIndexOpen(false)}
            onClose={() => setIndexOpen(false)}
            aria-labelledby="index-title"
          >
            <header>
              <h2 id="index-title">Terceiro Espaço</h2>
              <button onClick={closeIndex} aria-label="Fechar índice">
                <X size={22} strokeWidth={1.3} />
              </button>
            </header>
            <div className="index-grid">
              {slides.map((slide, index) => (
                <button
                  key={slide.number}
                  className={current === index ? "selected" : ""}
                  onClick={() => {
                    closeIndex();
                    goTo(index);
                  }}
                  aria-label={`Ir para página ${index + 1}: ${slide.title}`}
                >
                  <picture>
                    <source
                      media={portraitOnly ? "all" : "(orientation: portrait)"}
                      srcSet={slide.portrait.thumbnail}
                      width={270}
                      height={480}
                    />
                    <img
                      src={slide.thumbnail}
                      alt=""
                      width={480}
                      height={270}
                      loading="lazy"
                    />
                  </picture>
                  <span>
                    {String(index + 1).padStart(2, "0")}
                    <span>{slide.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </dialog>
        </>
      )}
    </main>
  );
}
