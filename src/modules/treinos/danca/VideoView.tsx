import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Video } from "lucide-react";
import { embedUrl, videoUrl } from "@/lib/videos";
import type { StepVideo } from "./types";

/** Mostra o vídeo do passo: player do YouTube/Vimeo, o arquivo enviado, ou um cartão com o link. */
export function VideoView({ video }: { video: StepVideo }) {
  if (video.source === "upload") return <UploadedVideo videoRef={video.url} title={video.title} />;
  const embed = embedUrl(video.url);
  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-md border border-border bg-black">
        <iframe
          src={embed}
          title={video.title}
          className="size-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-md border border-border bg-surface-muted/50 px-3 py-3 hover:bg-surface-hover"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface">
        <Video className="size-4.5 text-muted-foreground" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{video.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{video.url}</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

function UploadedVideo({ videoRef, title }: { videoRef: string; title: string }) {
  const [state, setState] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    let live = true;
    videoUrl(videoRef).then(
      (url) => live && setState({ url }),
      (err: unknown) => live && setState({ error: err instanceof Error ? err.message : "Não deu para abrir o vídeo." }),
    );
    return () => {
      live = false;
    };
  }, [videoRef]);

  if (state.url) {
    return (
      <video
        src={state.url}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        className="aspect-video w-full rounded-md border border-border bg-black"
      />
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {state.error ? state.error : <><Loader2 className="size-4 animate-spin" aria-hidden /> Carregando vídeo...</>}
    </div>
  );
}
