"use client";

export function LogoMarqueeBanner() {
  // On répète le logo plusieurs fois pour que la boucle soit fluide et continue
  const repeated = Array.from({ length: 8 });

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen bg-white overflow-hidden py-3">
      <div className="marquee-track flex items-center gap-12 w-max">
        {repeated.map((_, i) => (
          <img
            key={i}
            src="/logo-sidebar.png"
            alt="Finora"
            className="h-10 w-auto flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}