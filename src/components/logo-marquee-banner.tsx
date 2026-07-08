"use client";

export function LogoMarqueeBanner() {
  const logos = Array(8).fill("/logo-sidebar.png");

  return (
    <div className="relative w-full overflow-hidden bg-[#F8FBF8] py-3">
      <div className="marquee-track">
        {[...logos, ...logos].map((logo, i) => (
          <img
            key={i}
            src={logo}
            alt="Finora"
            className="h-15 w-auto flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}