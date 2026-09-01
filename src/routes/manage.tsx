import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/manage")({
  head: () => ({
    meta: [{ title: "관리자 | 방주 게시판" }],
  }),
  component: Manage,
});

// Hardcoded admin credentials. This lives in the client bundle, so anyone
// who opens dev tools can read it — it only keeps casual visitors out of
// the /manage screen, it is not real authentication. Change these before
// sharing the link with other admins.
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "bangjoo2026";

const AUTH_STORAGE_KEY = "bangju-admin-authed";

type Team = "safety" | "search" | "dev";

type Post = {
  id: string;
  nickname: string;
  message: string;
  team: Team;
  created_at: string;
};

const TEAM_LABEL: Record<Team, string> = {
  safety: "안전팀",
  search: "수색팀",
  dev: "개발팀",
};

function Manage() {
  const [authed, setAuthed] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(AUTH_STORAGE_KEY) === "1");
    }
    setCheckedAuth(true);
  }, []);

  const login = () => {
    if (id === ADMIN_ID && pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthed(false);
    setId("");
    setPw("");
  };

  if (!checkedAuth) {
    return null;
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold text-foreground">관리자 로그인</h1>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">아이디</label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">비밀번호</label>
            <Input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
          </div>
          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          <Button className="w-full" onClick={login}>
            로그인
          </Button>
        </div>
      </main>
    );
  }

  return <AdminPanel onLogout={logout} />;
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("게시글을 불러오지 못했습니다.");
    } else if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)),
    );
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 게시글을 삭제할까요?`)) return;
    setWorking(true);
    const { error } = await supabase
      .from("posts")
      .delete()
      .in("id", Array.from(selected));
    setWorking(false);
    if (error) {
      toast.error("삭제하지 못했습니다.");
      return;
    }
    toast.success("삭제했습니다.");
    setSelected(new Set());
    void load();
  };

  const deleteAll = async () => {
    if (posts.length === 0) return;
    if (!confirm("전체 게시글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setWorking(true);
    const { error } = await supabase.from("posts").delete().not("id", "is", null);
    setWorking(false);
    if (error) {
      toast.error("전체 삭제하지 못했습니다.");
      return;
    }
    toast.success("전체 삭제했습니다.");
    setSelected(new Set());
    void load();
  };

  return (
    <main className="min-h-screen w-full bg-background">
      <Toaster />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-foreground">게시글 관리</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onLogout}>
              로그아웃
            </Button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={posts.length > 0 && selected.size === posts.length}
              onCheckedChange={toggleAll}
            />
            전체 선택 ({selected.size}/{posts.length})
          </label>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={deleteSelected}
              disabled={selected.size === 0 || working}
            >
              선택 삭제
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteAll}
              disabled={posts.length === 0 || working}
            >
              전체 삭제
            </Button>
          </div>
        </div>

        {loading && <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>}
        {!loading && posts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">게시글이 없습니다.</p>
        )}

        <ul className="space-y-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <Checkbox
                checked={selected.has(post.id)}
                onCheckedChange={() => toggle(post.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  {TEAM_LABEL[post.team]} · {post.nickname} ·{" "}
                  {new Date(post.created_at).toLocaleString("ko-KR")}
                </div>
                <p className="mt-1 truncate text-sm text-foreground">{post.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
