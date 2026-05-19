import { AppSidebar } from "@/components/AppSidebar";

export default function ProductsShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AppSidebar />
      <main className="min-h-screen px-4 py-6 lg:ml-68 lg:px-8">{children}</main>
    </div>
  );
}
