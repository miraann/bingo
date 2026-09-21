"use client";

import { motion } from "framer-motion";

const SIZE_CLASSES = {
  md: "w-20 md:w-24 min-h-[60px] md:min-h-[68px] px-1.5 py-2",
  lg: "w-24 md:w-28 min-h-[76px] md:min-h-[84px] px-2 py-3",
} as const;

const ICON_SIZE = { md: 20, lg: 28 } as const;
const LABEL_CLASSES = { md: "text-[10px]", lg: "text-xs" } as const;

export function IconToggle({
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  label,
  active,
  onClick,
  activeClass = "bg-purple-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.45)]",
  size = "md",
}: {
  activeIcon: React.ElementType;
  inactiveIcon?: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass?: string;
  size?: "md" | "lg";
}) {
  const Icon = active ? ActiveIcon : (InactiveIcon ?? ActiveIcon);
  return (
    <motion.button
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1
        ${SIZE_CLASSES[size]}
        rounded-2xl cursor-pointer select-none transition-all duration-200
        ${active ? activeClass : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"}
      `}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={2} />
      <span className={`${LABEL_CLASSES[size]} font-bold tracking-wide text-center leading-tight whitespace-normal`}>{label}</span>
    </motion.button>
  );
}
