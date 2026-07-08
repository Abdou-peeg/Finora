"use client";

export function LogoMarqueeBanner() {
  const logos = [
    "/logo-sidebar.png",
    "/logo-sidebar.png",
    "/logo-sidebar.png",
    "/logo-sidebar.png",
    "/logo-sidebar.png",
    "/logo-sidebar.png",
  ];

  return (
    <div className="relative w-full overflow-hidden bg-white py-3">
      <div className="marquee-track flex items-center gap-12">
        {[...logos, ...logos].map((logo, i) => (
          <img
            key={i}
            src={logo}
            alt="Finora"
            className="h-10 w-auto flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}