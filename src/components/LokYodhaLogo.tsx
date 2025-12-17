import { motion } from "framer-motion";

interface LokYodhaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  animated?: boolean;
  styleVariant?: "classic" | "tilt";
  // New: minimal wordmark-only mode (no emblem)
  minimal?: boolean;
  // ADD: force light wordmark color (e.g., for dark backgrounds like footer)
  light?: boolean;
}

export function LokYodhaLogo({
  size = "md",
  showText = true,
  className = "",
  onClick,
  animated = false,
  styleVariant = "classic",
  minimal = false, // new default
  light = false,   // NEW
}: LokYodhaLogoProps) {
  const sizeMap = {
    sm: { icon: 28, text: "text-lg", gap: "gap-2" },
    md: { icon: 36, text: "text-xl", gap: "gap-3" },
    lg: { icon: 52, text: "text-3xl", gap: "gap-4" },
  } as const;
  const s = sizeMap[size];

  // Colors: gold accent for emblem, navy for text (uses theme vars); fallbacks provided
  const strokeColor = "oklch(var(--accent, 0.75 0.12 85))";
  const textGradient = "bg-gradient-to-r from-black via-neutral-800 to-black";

  // Refined motion: ordered stroke-draw with subtle breathing loop
  const strokeBase = { stroke: strokeColor, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const isTilt = styleVariant === "tilt";

  // Minimal: render only a refined wordmark with subtle transitions
  if (minimal) {
    return (
      <motion.div
        className={`flex items-center ${s.gap} ${onClick ? "cursor-pointer" : ""} ${className}`}
        onClick={onClick}
        initial={animated ? { opacity: 0, y: 4 } : undefined}
        animate={animated ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {showText && (
          <motion.span
            className={`font-extrabold tracking-tight ${s.text} ${light ? "text-white" : "text-black"}`}
            initial={animated ? { letterSpacing: "0.01em" } : undefined}
            animate={animated ? { letterSpacing: "0.02em" } : undefined}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={{ x: 0.2 }}
          >
            LOKYODHA
          </motion.span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex items-center ${s.gap} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Emblem */}
      <motion.svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 64 64"
        fill="none"
        aria-label="LokYodha emblem"
        // gentle breathing loop only when animated
        animate={
          animated
            ? {
                scale: [1, 1.03, 1],
              }
            : undefined
        }
        transition={animated ? { duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : undefined}
        // Slight tilt when variant is "tilt"
        style={isTilt ? { rotate: -7 } : undefined}
      >
        {/* Outer Circle */}
        <motion.circle
          cx="32"
          cy="32"
          r="26"
          {...strokeBase}
          initial={animated ? { pathLength: 0, opacity: 0.8 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animated ? { duration: 0.7, ease: "easeOut", delay: 0.0 } : undefined}
        />
        {/* Crown */}
        <motion.path
          d="M20 18 L28 26 L32 20 L36 26 L44 18 L42 28 H22 L20 18 Z"
          {...strokeBase}
          fill="none"
          initial={animated ? { pathLength: 0, opacity: 0.7 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animated ? { duration: 0.55, ease: "easeOut", delay: 0.15 } : undefined}
        />
        {/* Shield */}
        <motion.path
          d="M22 28 V38 C22 46 27 50 32 53 C37 50 42 46 42 38 V28 H22 Z"
          {...strokeBase}
          fill="none"
          initial={animated ? { pathLength: 0, opacity: 0.7 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
          transition={animated ? { duration: 0.6, ease: "easeOut", delay: 0.3 } : undefined}
        />
      </motion.svg>

      {/* Wordmark */}
      {showText && (
        <motion.div
          className={
            // Netflix-like: heavy weight, uppercase, tight tracking, slight skew/tilt
            `font-extrabold tracking-tight ${s.text} ${
              isTilt ? "uppercase" : ""
            } ${isTilt ? "bg-clip-text text-transparent bg-gradient-to-r from-black via-black to-black" : textGradient}`
          }
          initial={animated ? { opacity: 0, x: -6 } : undefined}
          animate={animated ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.2 }}
          style={
            isTilt
              ? {
                  transform: "skewX(-6deg) rotate(-6deg)",
                  letterSpacing: "0.02em",
                }
              : undefined
          }
        >
          LOKYODHA
        </motion.div>
      )}
    </motion.div>
  );
}