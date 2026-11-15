import {
  Activity, Apple, Baby, Bed, Beer, Bike, Book, BookOpen, Brain, Briefcase, Brush, Camera, CheckSquare, Cigarette, Clock, Cloud, Code, Coffee, Coins,
  Droplet, Dumbbell, Flame, Flower2, Footprints, Gamepad2, Globe, GraduationCap, Guitar, Headphones, Heart, HeartPulse, Home, Laptop, Leaf, Lightbulb,
  Moon, Mountain, Music, Palette, PawPrint, PenLine, Phone, Pill, Pizza, Plane, Salad, Scale, ShoppingBag, Smartphone, Smile, Sparkles, Star, Sun,
  Sunrise, Target, Thermometer, Timer, Trees, Tv, Users, Utensils, Waves, Wind, Wine, Zap, type LucideIcon,
} from 'lucide-react'

/** Icons a tracker can use, keyed by the name stored in the database. */
export const TRACKER_ICONS: Record<string, LucideIcon> = {
  activity: Activity, apple: Apple, baby: Baby, bed: Bed, beer: Beer, bike: Bike, book: Book, 'book-open': BookOpen, brain: Brain, briefcase: Briefcase,
  brush: Brush, camera: Camera, 'check-square': CheckSquare, cigarette: Cigarette, clock: Clock, cloud: Cloud, code: Code, coffee: Coffee, coins: Coins,
  droplet: Droplet, dumbbell: Dumbbell, flame: Flame, flower: Flower2, footprints: Footprints, 'gamepad-2': Gamepad2, globe: Globe,
  'graduation-cap': GraduationCap, guitar: Guitar, headphones: Headphones, heart: Heart, 'heart-pulse': HeartPulse, home: Home, laptop: Laptop, leaf: Leaf,
  lightbulb: Lightbulb, moon: Moon, mountain: Mountain, music: Music, palette: Palette, 'paw-print': PawPrint, 'pen-line': PenLine, phone: Phone,
  pill: Pill, pizza: Pizza, plane: Plane, salad: Salad, scale: Scale, 'shopping-bag': ShoppingBag, smartphone: Smartphone, smile: Smile,
  sparkles: Sparkles, star: Star, sun: Sun, sunrise: Sunrise, target: Target, thermometer: Thermometer, timer: Timer, trees: Trees, tv: Tv, users: Users,
  utensils: Utensils, waves: Waves, wind: Wind, wine: Wine, zap: Zap,
}

export const TRACKER_ICON_NAMES = Object.keys(TRACKER_ICONS)

export function TrackerIcon({ name, className, color }: { name: string | null | undefined; className?: string; color?: string }) {
  const Icon = TRACKER_ICONS[(name ?? '').replace(/^lucide:/, '')] ?? Sparkles
  return <Icon className={className} style={color ? { color } : undefined} aria-hidden />
}
