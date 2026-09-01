import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import bgImg from "@/assets/bg.png";
import safetyImg from "@/assets/card-safety.png";
import devImg from "@/assets/card-dev.png";
import searchImg from "@/assets/card-search.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "방주 게시판 | 팀별 메시지 보드" },
      {
        name: "description",
        content:
          "안전팀, 수색팀, 개발팀이 한 줄 메시지를 남기는 방주 게시판. 닉네임과 30자 이내의 말을 남겨보세요.",
      },
      { property: "og:title", content: "방주 게시판 | 팀별 메시지 보드" },
      {
        property: "og:description",
        content: "안전팀, 수색팀, 개발팀이 한 줄 메시지를 남기는 방주 게시판.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Board,
});

type Team = "safety" | "search" | "dev";

type Post = {
  id: string;
  nickname: string;
  message: string;
  team: Team;
  created_at: string;
};

const TEAMS: { value: Team; label: string; image: string }[] = [
  { value: "safety", label: "안전팀", image: safetyImg },
  { value: "search", label: "수색팀", image: searchImg },
  { value: "dev", label: "개발팀", image: devImg },
];

const PRELOAD_IMAGES = [bgImg, safetyImg, devImg, searchImg];

function Board() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      const settle = () => {
        loaded += 1;
        if (!cancelled && loaded === PRELOAD_IMAGES.length) {
          setImagesReady(true);
        }
      };
      img.onload = settle;
      img.onerror = settle;
      img.src = src;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPosts(data as Post[]);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("posts-board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const submit = async () => {
    if (!nickname.trim() || !message.trim() || !team) {
      toast.error("닉네임, 하고 싶은 말, 팀을 모두 입력해 주세요.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("posts").insert({
      nickname: nickname.trim().slice(0, 20),
      message: message.trim().slice(0, 30),
      team,
    });
    setSaving(false);
    if (error) {
      toast.error("게시글을 올리지 못했습니다.");
      return;
    }
    setNickname("");
    setMessage("");
    setTeam(null);
    setOpen(false);
    void load();
  };

  if (!imagesReady) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm tracking-[0.2em] text-muted-foreground">
            로딩중...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen w-full bg-background bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      <Toaster />
      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-10">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[0.2em] text-foreground">
              방주 게시판
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              남기고 싶은 한마디를 기록하세요.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">게시글 남기기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>게시글 남기기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">닉네임</label>
                  <Input
                    value={nickname}
                    maxLength={20}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="닉네임"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    하고 싶은 말 ({message.length}/30)
                  </label>
                  <Input
                    value={message}
                    maxLength={30}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="30자 이내로 입력해 주세요"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">팀 선택</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TEAMS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTeam(t.value)}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          team === t.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted text-foreground hover:bg-accent"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={submit} disabled={saving}>
                  작성하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        <section className="space-y-5">
          {posts.length === 0 && (
            <p className="py-20 text-center text-sm text-muted-foreground">
              아직 게시글이 없습니다.
            </p>
          )}
          {posts.map((post) => {
            const t = TEAMS.find((x) => x.value === post.team) ?? TEAMS[0]!;
            return (
              <article key={post.id} className="relative">
                <img
                  src={t.image}
                  alt={`${t.label} 게시글 배경`}
                  className="w-full"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex flex-col justify-center gap-1 px-[6%]">
                  <span className="text-[11px] tracking-[0.25em] text-neutral-500">
                    {t.label} · {post.nickname}
                  </span>
                  <p className="text-base font-medium text-neutral-900 sm:text-xl">
                    {post.message}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
