import { Header } from "@/components/Header";
import { HomeActions } from "@/components/HomeActions";
import { BottomNav } from "@/components/BottomNav";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20">
        <HomeActions />
      </main>
      <BottomNav />
    </div>
  );
}
