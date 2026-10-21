import {
  BatteryCharging,
  CircleDot,
  ClipboardCheck,
  Cog,
  Disc3,
  Droplets,
  MoveVertical,
  Settings2,
  Snowflake,
  Thermometer,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ServiceType } from '../types'

const ICONS: Record<ServiceType, LucideIcon> = {
  vidange: Droplets,
  filtre_habitacle: Wind,
  filtre_air: Wind,
  freins: Disc3,
  pneus: CircleDot,
  distribution: Settings2,
  bougies: Zap,
  liquide_refroidissement: Thermometer,
  climatisation: Snowflake,
  batterie: BatteryCharging,
  controle_technique: ClipboardCheck,
  boite_vitesses: Cog,
  amortisseurs: MoveVertical,
  autre: Wrench,
}

export function ServiceIcon({ type, className }: { type: ServiceType; className?: string }) {
  const Icon = ICONS[type] ?? Wrench
  return <Icon className={className} />
}
