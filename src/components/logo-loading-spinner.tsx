"use client";
 
const CELL = 44; // taille d'un carreau en px
const GAP = 8;   // espace entre les carreaux
 
export function LogoLoadingSpinner() {
  const containerSize = CELL * 2 + GAP;
  return (
    <div
      className="relative"
      style={{ width: containerSize, height: containerSize }}
      aria-label="Chargement"
      role="status"
    >
      <img src="/logo-quad-tl.png" alt="" className="logo-quad logo-quad-tl" style={{ width: CELL, height: CELL }} />
      <img src="/logo-quad-tr.png" alt="" className="logo-quad logo-quad-tr" style={{ width: CELL, height: CELL }} />
      <img src="/logo-quad-br.png" alt="" className="logo-quad logo-quad-br" style={{ width: CELL, height: CELL }} />
      <img src="/logo-quad-bl.png" alt="" className="logo-quad logo-quad-bl" style={{ width: CELL, height: CELL }} />
    </div>
  );
}