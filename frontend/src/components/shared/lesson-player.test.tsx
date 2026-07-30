import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LessonPlayer } from "@/components/shared/lesson-player";
import type { Lesson } from "@/services/api";

const BASE_LESSON: Lesson = {
  id: 1,
  title: "Como decodificar o tema",
  description: "desc",
  thumbnail_url: "",
  video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  summary: "",
  pdf_url: null,
  duration_minutes: 8,
  order: 1,
  progress: { progress_percent: 0, last_position_seconds: 0, completed: false },
  exercises: [],
};

describe("LessonPlayer — overlay customizado sobre a IFrame API do YouTube (fiel a AulaPlayer.dc.html)", () => {
  it("monta o player customizado (botão play + barra de progresso) para URLs do YouTube", () => {
    render(<LessonPlayer lesson={BASE_LESSON} onComplete={vi.fn()} />);
    expect(screen.getByTitle(BASE_LESSON.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reproduzir" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Progresso do vídeo" })).toBeInTheDocument();
  });

  it("não mexe em URLs que não são do YouTube (iframe cru, sem overlay)", () => {
    render(<LessonPlayer lesson={{ ...BASE_LESSON, video_url: "https://player.vimeo.com/video/123" }} onComplete={vi.fn()} />);
    const iframe = screen.getByTitle(BASE_LESSON.title) as HTMLIFrameElement;
    expect(iframe.src).toBe("https://player.vimeo.com/video/123");
  });

  it("mostra o aviso de PDF quando a aula não tem vídeo", () => {
    render(<LessonPlayer lesson={{ ...BASE_LESSON, video_url: "" }} onComplete={vi.fn()} />);
    expect(screen.getByText("Esta aula é em PDF, sem vídeo")).toBeInTheDocument();
  });
});
