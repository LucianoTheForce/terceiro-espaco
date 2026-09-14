"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Pause, Play } from "lucide-react";
import { stories, type Story } from "@/lib/stories";

function Avatar() {
  return (
    <span className="story-avatar" aria-hidden="true">
      <img src="/media/monogram.svg" alt="" />
    </span>
  );
}

function StoryArt({
  story,
  playing,
  onReady,
}: {
  story: Story;
  playing: boolean;
  onReady?: () => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth > 0) onReady?.();
  }, [onReady]);
  useEffect(() => {
    const element = video.current;
    if (playing) element?.play().catch(() => setVideoReady(false));
    else element?.pause();
    return () => element?.pause();
  }, [playing]);
  return (
    <div
      className={`story-art story-art--${story.kind}`}
      data-playing={playing}
    >
      <img
        ref={image}
        className="story-art-image"
        loading="lazy"
        src={story.image}
        alt={story.title}
        onLoad={onReady}
        onError={() => {
          setFailed(true);
          onReady?.();
        }}
        draggable={false}
      />
      {failed && (
        <span className="story-media-error">
          Não foi possível carregar esta arte. Você pode passar para a próxima.
        </span>
      )}
      {story.id === "18-2" && (
        <div className="story-reader" style={{ opacity: videoReady ? 1 : 0 }}>
          <video
            ref={video}
            src="/media/character-1.mp4"
            muted
            loop
            playsInline
            preload="metadata"
            onPlaying={() => setVideoReady(true)}
            onError={() => setVideoReady(false)}
          />
        </div>
      )}
    </div>
  );
}

function InlineStory({
  items,
  column,
  moving,
  visible,
  hidden,
}: {
  items: Story[];
  column: number;
  moving: boolean;
  visible: boolean;
  hidden: boolean;
}) {
  const [index, setIndex] = useState(column);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [ready, setReady] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const gesture = useRef<{ x: number; y: number; time: number } | null>(null);
  const suppressClick = useRef(false);
  const current = items[index];
  const playing = moving && visible && !hidden && !paused && !holding && ready;

  const select = useCallback(
    (target: number) => {
      const next = (target + items.length) % items.length;
      elapsed.current = 0;
      if (progress.current) progress.current.style.transform = "scaleX(0)";
      if (next !== index) setReady(false);
      setIndex(next);
    },
    [index, items.length],
  );

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      elapsed.current += Math.min(now - previous, 100);
      previous = now;
      if (progress.current)
        progress.current.style.transform = `scaleX(${Math.min(elapsed.current / 6500, 1)})`;
      if (elapsed.current >= 6500) {
        select(index + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, index, select]);

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHolding(true);
  }
  function pointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    gesture.current = null;
    setHolding(false);
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick.current = true;
      select(index + (dx < 0 ? 1 : -1));
    } else if (
      performance.now() - start.time >= 280 ||
      Math.abs(dx) > 12 ||
      Math.abs(dy) > 12
    ) {
      suppressClick.current = true;
    }
  }

  return (
    <section
      className="story-preview inline-story"
      data-story={current.id}
      data-playing={playing}
      style={{ left: `${(50 + column * 464.521484) / 19.2}%` }}
      aria-label={`Quadro ${column + 1}: ${current.group}`}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          select(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <button
        className="inline-story-surface"
        aria-label={`Passar story: ${current.title}`}
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          suppressClick.current = true;
          setHolding(false);
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
          setHolding(false);
        }}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            setPaused((value) => !value);
          }
        }}
        onClick={(event) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          select(
            index +
              (event.detail !== 0 &&
              (event.clientX - rect.left) / rect.width < 0.32
                ? -1
                : 1),
          );
        }}
      >
        <StoryArt
          key={current.id}
          story={current}
          playing={playing}
          onReady={() => setReady(true)}
        />
      </button>
      <header className="story-preview-header">
        <div
          className="inline-story-progress"
          aria-label={`Story ${index + 1} de ${items.length}`}
        >
          {items.map((story, position) => (
            <button
              key={story.id}
              aria-label={`Ver story ${position + 1}: ${story.title}`}
              onClick={() => select(position)}
            >
              <span className="inline-story-track">
                <span
                  key={`${current.id}-${position}`}
                  ref={position === index ? progress : undefined}
                  style={{ transform: `scaleX(${position < index ? 1 : 0})` }}
                />
              </span>
            </button>
          ))}
        </div>
        <div className="story-preview-account">
          <Avatar />
          <strong>TerceiroEspaço</strong>
          <span>1h</span>
          <button
            className="inline-story-pause"
            aria-label={
              paused ? "Reproduzir este quadro" : "Pausar este quadro"
            }
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
      </header>
      {paused && <span className="inline-story-paused">Pausado</span>}
    </section>
  );
}

export function StoriesGallery({
  page,
  moving,
  visible,
}: {
  page: number;
  moving: boolean;
  visible: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const items = stories.filter((story) => story.page === page);
  return (
    <div className="stories-gallery" aria-label="Stories na apresentação">
      {items.map((story, column) => (
        <InlineStory
          key={story.id}
          items={items}
          column={column}
          moving={moving}
          visible={visible}
          hidden={hidden}
        />
      ))}
      <span className="stories-gallery-hint">
        Toque nas laterais para passar · Segure para pausar
      </span>
    </div>
  );
}
