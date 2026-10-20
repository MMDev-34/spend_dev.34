import React, { useState } from "react";

interface RealisticCoinProps {
  size?: number;
  speed?: number; // seconds per full rotation
  tiltX?: number; // degrees of tilt to expose 3D rim
  interactive?: boolean;
  className?: string;
  symbol?: string;
}

export const RealisticCoin: React.FC<RealisticCoinProps> = ({
  size = 52,
  speed = 4.5,
  tiltX = 14,
  interactive = true,
  className = "",
  symbol = "₹",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Scaled dimensions based on base size
  const rimThickness = Math.max(3, Math.round(size * 0.08));
  const fontSize = Math.round(size * 0.48);
  const shadowWidth = Math.round(size * 0.82);
  const shadowHeight = Math.max(6, Math.round(size * 0.14));

  return (
    <div
      className={`realistic-coin-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size + 8}px`,
        perspective: "700px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        userSelect: "none",
      }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      <style>{`
        @keyframes spinCoin3D {
          0% {
            transform: rotateX(var(--tilt-x, 14deg)) rotateY(0deg);
          }
          100% {
            transform: rotateX(var(--tilt-x, 14deg)) rotateY(360deg);
          }
        }

        @keyframes coinSheenGlance {
          0%, 100% {
            transform: translateX(-120%) rotate(30deg);
            opacity: 0;
          }
          20% {
            opacity: 0.95;
          }
          45% {
            transform: translateX(120%) rotate(30deg);
            opacity: 0;
          }
        }

        @keyframes coinShadowMorph {
          0%, 50%, 100% {
            transform: translateX(-50%) scaleX(1);
            opacity: 0.65;
          }
          25%, 75% {
            transform: translateX(-50%) scaleX(0.28);
            opacity: 0.35;
          }
        }

        .realistic-coin-disc {
          position: relative;
          transform-style: preserve-3d;
          animation: spinCoin3D var(--spin-dur, 4.5s) linear infinite;
          will-change: transform;
          transition: filter 0.3s ease;
        }

        .realistic-coin-disc.boosted {
          animation-duration: 2s !important;
          filter: drop-shadow(0 0 12px rgba(221, 251, 92, 0.65));
        }

        /* Front and Back Face Base */
        .coin-side {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          backface-visibility: hidden;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        /* Front Mint Face */
        .coin-side-front {
          background: radial-gradient(circle at 34% 30%, #fffbe6 0%, #eefd86 16%, #c5f137 42%, #688e17 76%, #283709 100%);
          box-shadow: 
            inset 0 0 0 2px rgba(255, 255, 230, 0.9),
            inset 0 0 0 4px #7da81a,
            inset 0 0 0 5.5px #2d3c0a,
            0 0 10px rgba(221, 251, 92, 0.3);
        }

        /* Back Mint Face */
        .coin-side-back {
          transform: rotateY(180deg);
          background: radial-gradient(circle at 34% 30%, #fffbe6 0%, #e2fa60 18%, #addf22 45%, #597d13 78%, #202b06 100%);
          box-shadow: 
            inset 0 0 0 2px rgba(255, 255, 230, 0.9),
            inset 0 0 0 4px #7da81a,
            inset 0 0 0 5.5px #2d3c0a,
            0 0 10px rgba(221, 251, 92, 0.3);
        }

        /* Reeded Metallic Rim Edges (Z-slices) */
        .coin-rim-layer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #739818;
          border: 1px solid #94c120;
          box-shadow: inset 0 0 2px #263307;
          pointer-events: none;
        }

        /* Specular Light Sweep */
        .coin-specular-sweep {
          position: absolute;
          inset: -20%;
          width: 140%;
          height: 140%;
          background: linear-gradient(
            110deg,
            transparent 30%,
            rgba(255, 255, 255, 0.75) 48%,
            rgba(255, 255, 255, 0.95) 52%,
            transparent 70%
          );
          animation: coinSheenGlance var(--spin-dur, 4.5s) linear infinite;
          pointer-events: none;
        }

        /* Coin Dynamic Floor Shadow */
        .coin-ground-shadow {
          position: absolute;
          bottom: 0px;
          left: 50%;
          background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 72%);
          border-radius: 50%;
          pointer-events: none;
          animation: coinShadowMorph var(--spin-dur, 4.5s) linear infinite;
        }
      `}</style>

      {/* 3D Rotating Disc */}
      <div
        className={`realistic-coin-disc ${isHovered ? "boosted" : ""}`}
        style={
          {
            width: `${size}px`,
            height: `${size}px`,
            "--tilt-x": `${tiltX}deg`,
            "--spin-dur": `${isHovered ? speed * 0.45 : speed}s`,
          } as React.CSSProperties
        }
      >
        {/* Physical 3D Edge Slices for Realistic Thickness */}
        <div className="coin-rim-layer" style={{ transform: `translateZ(-${rimThickness * 0.8}px)` }} />
        <div className="coin-rim-layer" style={{ transform: `translateZ(-${rimThickness * 0.4}px)` }} />
        <div className="coin-rim-layer" style={{ transform: "translateZ(0px)" }} />
        <div className="coin-rim-layer" style={{ transform: `translateZ(${rimThickness * 0.4}px)` }} />
        <div className="coin-rim-layer" style={{ transform: `translateZ(${rimThickness * 0.8}px)` }} />

        {/* Back Face (Vault Crest) */}
        <div
          className="coin-side coin-side-back"
          style={{ transform: `rotateY(180deg) translateZ(${rimThickness}px)` }}
        >
          {/* Minted Border Bead Ring */}
          <div
            style={{
              position: "absolute",
              inset: "5px",
              borderRadius: "50%",
              border: "1px dashed rgba(255, 255, 240, 0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--display, sans-serif)",
                fontSize: `${Math.round(size * 0.16)}px`,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#182307",
                textShadow: "0 1px 0 rgba(255, 255, 255, 0.6)",
              }}
            >
              SPEND
            </span>
            <span
              style={{
                fontSize: `${Math.round(size * 0.18)}px`,
                color: "#182307",
                lineHeight: 1,
              }}
            >
              ✦
            </span>
            <span
              style={{
                fontFamily: "var(--text, sans-serif)",
                fontSize: `${Math.max(8, Math.round(size * 0.14))}px`,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "#27380a",
              }}
            >
              VAULT
            </span>
          </div>
          <div className="coin-specular-sweep" />
        </div>

        {/* Front Face (Embossed Rupee Symbol) */}
        <div
          className="coin-side coin-side-front"
          style={{ transform: `translateZ(${rimThickness}px)` }}
        >
          {/* Minted Outer Bead Ring */}
          <div
            style={{
              position: "absolute",
              inset: "5px",
              borderRadius: "50%",
              border: "1px dashed rgba(255, 255, 240, 0.65)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--display, serif)",
                fontWeight: 800,
                fontSize: `${fontSize}px`,
                color: "#162007",
                lineHeight: 1,
                textShadow: `
                  1px 1px 0px rgba(255, 255, 255, 0.85),
                  -1px -1px 0px rgba(0, 0, 0, 0.55),
                  0 2px 4px rgba(0, 0, 0, 0.35)
                `,
                transform: "translateY(-1px)",
              }}
            >
              {symbol}
            </span>
          </div>
          <div className="coin-specular-sweep" />
        </div>
      </div>

      {/* Dynamic Floor Shadow beneath the coin */}
      <div
        className="coin-ground-shadow"
        style={{
          width: `${shadowWidth}px`,
          height: `${shadowHeight}px`,
        }}
      />
    </div>
  );
};
