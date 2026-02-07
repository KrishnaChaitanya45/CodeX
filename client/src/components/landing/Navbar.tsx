import Image from "next/image";
import Link from "next/link";
import UserProfileIcon from "./UserProfileIcon";
import { getCurrentUser } from "@/auth/helper";
import JoinUsButton from "../ui/join-us-button";
export default async function Navbar() {
  let currentUser = await getCurrentUser()
  return (
    <header className="fixed inset-x-0 top-4 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
      <Link href="https://devsarena.in" className="relative flex items-center gap-3">
        <Image
        src="/logos/white.svg"
        alt="DevsArena"
        width={140}
        height={32}
        priority
        className="h-7 w-auto"
        />
      </Link>

      <div className="relative flex items-center gap-2">
         
      {currentUser ? (
        <UserProfileIcon user={currentUser} />
      ) : (
        <JoinUsButton />
      )}
      </div>
      </div>
    </header>
  );
}
