import {
  Eye,
  EyeOff,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Check,
  LogOut,
  LayoutDashboard,
  Layers,
  ClipboardList,
  UserRound,
  Users,
  Wrench,
  History,
  RefreshCw,
  Download,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  X,
  ShieldCheck,
  Inbox,
  ArrowUpRight,
  Plus,
  MessageSquare,
  FileDown,
  Play,
  Archive,
  Send
} from 'lucide-react'

const icons = {
  eye: Eye,
  'eye-off': EyeOff,
  'arrow-right': ArrowRight,
  alert: CircleAlert,
  'check-circle': CircleCheck,
  check: Check,
  logout: LogOut,
  dashboard: LayoutDashboard,
  layers: Layers,
  assign: ClipboardList,
  user: UserRound,
  users: Users,
  wrench: Wrench,
  history: History,
  refresh: RefreshCw,
  download: Download,
  calendar: CalendarDays,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  search: Search,
  clock: Clock,
  close: X,
  shield: ShieldCheck,
  inbox: Inbox,
  'arrow-up-right': ArrowUpRight,
  plus: Plus,
  comment: MessageSquare,
  pdf: FileDown,
  play: Play,
  archive: Archive,
  send: Send
}

export type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  const SelectedIcon = icons[name]
  return (
    <SelectedIcon
      size={size}
      className={className}
      strokeWidth={1.7}
      aria-hidden="true"
    />
  )
}
