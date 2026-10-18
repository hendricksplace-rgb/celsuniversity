import Image from "next/image";
import Link from "next/link";

/** Purchase pages: light CelsU style, open to guests (they create their account when they pay). */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5FA] text-[#1B1830]">
      <header className="border-b border-[#EFE6F2] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5178C]">
            <Image src="/brand/celsu-u.png" alt="" width={30} height={20} />
            <span className="text-lg font-extrabold">CelsU</span>
          </Link>
          <Link href="/ayuda" className="text-sm font-bold text-[#4A4766] hover:text-[#1B1830]">
            Ayuda
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8">{children}</main>
    </div>
  );
}
