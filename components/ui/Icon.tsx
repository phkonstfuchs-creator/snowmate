import {
  Bell, CloudSnow, Plus, Mail, ChevronLeft, ChevronRight, MapPin, Sun, Zap,
  Mountain, MountainSnow, Users, Car, Flame, User, Check, X, Snowflake,
  Trophy, Moon, AlarmClock, AtSign, Send, Search, Star, Crown,
  ShieldCheck, MessageCircle, Heart, Settings, Share2, Wind, ThermometerSnowflake,
  Sparkles, UserPlus, ArrowRight, Compass, Navigation, Route, Clock, Users2,
  BadgeCheck, Lock, ChevronDown, MoreHorizontal, MapPinned, Satellite,
  Sunrise, Map, Hammer,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const REGISTRY: Record<string, ComponentType<LucideProps>> = {
  bell: Bell,
  "cloud-snow": CloudSnow,
  plus: Plus,
  mail: Mail,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "map-pin": MapPin,
  "map-pinned": MapPinned,
  sun: Sun,
  zap: Zap,
  mountain: Mountain,
  "mountain-snow": MountainSnow,
  users: Users,
  "users-2": Users2,
  car: Car,
  flame: Flame,
  user: User,
  check: Check,
  x: X,
  snowflake: Snowflake,
  trophy: Trophy,
  moon: Moon,
  alarm: AlarmClock,
  instagram: AtSign,
  send: Send,
  search: Search,
  star: Star,
  crown: Crown,
  "shield-check": ShieldCheck,
  "badge-check": BadgeCheck,
  "message-circle": MessageCircle,
  heart: Heart,
  settings: Settings,
  share: Share2,
  wind: Wind,
  thermometer: ThermometerSnowflake,
  sparkles: Sparkles,
  "user-plus": UserPlus,
  "arrow-right": ArrowRight,
  compass: Compass,
  navigation: Navigation,
  route: Route,
  clock: Clock,
  lock: Lock,
  "more-horizontal": MoreHorizontal,
  satellite: Satellite,
  sunrise: Sunrise,
  map: Map,
  hammer: Hammer,
};

interface IconProps extends Omit<LucideProps, "ref"> {
  name: keyof typeof REGISTRY | (string & {});
}

export default function Icon({ name, size = 20, strokeWidth = 2, ...rest }: IconProps) {
  const Cmp = REGISTRY[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden {...rest} />;
}
