import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <Image
        src="/logos/full-white.svg"
        alt="Logo"
        width={350}
        height={100}
        priority
      />
      
      <h1 className="text-4xl font-bold mt-4">Coming Soon</h1>
      <p className="mt-2 text-lg text-gray-600">
        We’re working hard to launch our new site. ( You could help us by contributing! 😉 )
      </p>
    </div>
  );
}
