import React, { useEffect, useState, useMemo } from "react";

interface CasinoSlotCounterProps {
  value: string; // The formatted string, e.g. "₹1,450" or "₹0"
  className?: string;
}

interface DigitReelProps {
  digit: number;
  index: number;
  totalDigits: number;
  triggerKey: number;
}

const CYCLES = 2; // Number of full (0-9) rotations before landing on target digit

const DigitReel: React.FC<DigitReelProps> = ({ digit, index, totalDigits, triggerKey }) => {
  const [isSpinning, setIsSpinning] = useState(false);

  // Build reel strip: [0..9, 0..9, 0..digit]
  const reelNumbers = useMemo(() => {
    const list: number[] = [];
    for (let c = 0; c < CYCLES; c++) {
      for (let i = 0; i <= 9; i++) {
        list.push(i);
      }
    }
    for (let i = 0; i <= digit; i++) {
      list.push(i);
    }
    return list;
  }, [digit]);

  const targetIndex = CYCLES * 10 + digit;

  useEffect(() => {
    // Reset to top
    setIsSpinning(false);
    // Request animation frame / timeout to start the casino reel spin
    const timer = setTimeout(() => {
      setIsSpinning(true);
    }, 40);

    return () => clearTimeout(timer);
  }, [triggerKey, digit]);

  // Staggered duration and delay for classic left-to-right casino reel locking
  const delayMs = 60 + index * 90;
  const durationMs = 850 + index * 110;

  return (
    <span
      className="relative inline-flex flex-col h-[1.12em] overflow-hidden select-none"
      style={{
        lineHeight: "1.12em",
        verticalAlign: "baseline",
      }}
      aria-hidden="true"
    >
      {/* Top and Bottom subtle cylinder 3D glass shading */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[0.16em] bg-gradient-to-b from-[#141414] to-transparent z-10 opacity-75" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.16em] bg-gradient-to-t from-[#141414] to-transparent z-10 opacity-75" />

      {/* Vertical digit roll */}
      <span
        className="inline-flex flex-col will-change-transform"
        style={{
          transform: isSpinning
            ? `translateY(-${(targetIndex / reelNumbers.length) * 100}%)`
            : "translateY(0%)",
          transition: isSpinning
            ? `transform ${durationMs}ms cubic-bezier(0.14, 0.84, 0.24, 1.05) ${delayMs}ms`
            : "none",
        }}
      >
        {reelNumbers.map((num, idx) => (
          <span
            key={idx}
            className="h-[1.12em] flex items-center justify-center font-mono-num leading-none"
          >
            {num}
          </span>
        ))}
      </span>
    </span>
  );
};

export const CasinoSlotCounter: React.FC<CasinoSlotCounterProps> = ({
  value,
  className = "",
}) => {
  const [triggerKey, setTriggerKey] = useState(0);

  // Trigger on initial page load / refresh and when value changes
  useEffect(() => {
    setTriggerKey((prev) => prev + 1);
  }, [value]);

  // Parse characters into static vs numeric digit positions
  const characters = useMemo(() => value.split(""), [value]);
  const digitCount = useMemo(
    () => characters.filter((c) => /[0-9]/.test(c)).length,
    [characters]
  );

  let digitIndex = 0;

  return (
    <div
      className={`inline-flex items-baseline font-mono-num cursor-default ${className}`}
      aria-label={value}
      title="Click to spin"
      onClick={() => setTriggerKey((k) => k + 1)}
    >
      {characters.map((char, i) => {
        const isDigit = /[0-9]/.test(char);
        if (isDigit) {
          const currentDigitIdx = digitIndex++;
          return (
            <DigitReel
              key={`digit-${i}-${char}`}
              digit={parseInt(char, 10)}
              index={currentDigitIdx}
              totalDigits={digitCount}
              triggerKey={triggerKey}
            />
          );
        }
        return (
          <span
            key={`char-${i}-${char}`}
            className="inline-block leading-none select-none"
            style={{ lineHeight: "1.12em" }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
