import {
  Banknote, Briefcase, Car, CreditCard, Dumbbell, Gamepad2, Gift, GraduationCap, HeartPulse, Home, Landmark, Laptop, Pizza,
  PartyPopper, PawPrint, PiggyBank, Plane, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Tag, TrendingUp, Tv, Utensils,
  Wallet, Wifi, Wrench, Zap, Baby, Bus, Coffee, Fuel, BookOpen, Music, Target, Bike, Building2, Droplets, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  tag: Tag, utensils: Utensils, home: Home, car: Car, "heart-pulse": HeartPulse, "graduation-cap": GraduationCap,
  "party-popper": PartyPopper, tv: Tv, "shopping-bag": ShoppingBag, "trending-up": TrendingUp, landmark: Landmark,
  briefcase: Briefcase, sparkles: Sparkles, wallet: Wallet, "credit-card": CreditCard, "piggy-bank": PiggyBank, plane: Plane,
  "shopping-cart": ShoppingCart, pizza: Pizza, coffee: Coffee, fuel: Fuel, bus: Bus, bike: Bike, wifi: Wifi, zap: Zap,
  droplets: Droplets, smartphone: Smartphone, laptop: Laptop, shirt: Shirt, gift: Gift, "paw-print": PawPrint, baby: Baby,
  dumbbell: Dumbbell, gamepad: Gamepad2, music: Music, "book-open": BookOpen, wrench: Wrench, banknote: Banknote, target: Target,
  building: Building2,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, size = 16, className }: { name?: string | null; size?: number; className?: string }) {
  const I = (name && ICONS[name]) || Tag;
  return <I size={size} className={className} strokeWidth={2} />;
}

/** Ícone dentro de um quadrado branco, como os logos de curso da referência. */
export function IconTile({ name, color, size = 40 }: { name?: string | null; color?: string | null; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-surface shadow-soft"
      style={{ width: size, height: size, color: color ?? "#0b0b0b" }}
    >
      <CategoryIcon name={name} size={Math.round(size * 0.45)} />
    </span>
  );
}
