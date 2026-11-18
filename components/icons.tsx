"use client"

// Central icon set: Hugeicons (https://hugeicons.com), exposed under the
// names the app already used (previously lucide-react) so call sites keep
// working with className / size / strokeWidth / color props.
import { forwardRef, type ComponentProps } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon as HiActivity01Icon,
  Alert02Icon as HiAlert02Icon,
  AlertCircleIcon as HiAlertCircleIcon,
  ArrowDataTransferHorizontalIcon as HiArrowDataTransferHorizontalIcon,
  ArrowDown01Icon as HiArrowDown01Icon,
  ArrowDownRight01Icon as HiArrowDownRight01Icon,
  ArrowLeft01Icon as HiArrowLeft01Icon,
  ArrowRight01Icon as HiArrowRight01Icon,
  ArrowUp01Icon as HiArrowUp01Icon,
  ArrowUpRight01Icon as HiArrowUpRight01Icon,
  Award01Icon as HiAward01Icon,
  Award05Icon as HiAward05Icon,
  BookOpen01Icon as HiBookOpen01Icon,
  Brain01Icon as HiBrain01Icon,
  Calculator01Icon as HiCalculator01Icon,
  Calendar03Icon as HiCalendar03Icon,
  Cancel01Icon as HiCancel01Icon,
  CancelCircleIcon as HiCancelCircleIcon,
  ChartDecreaseIcon as HiChartDecreaseIcon,
  ChartHistogramIcon as HiChartHistogramIcon,
  ChartIncreaseIcon as HiChartIncreaseIcon,
  ChartLineData01Icon as HiChartLineData01Icon,
  CheckmarkCircle02Icon as HiCheckmarkCircle02Icon,
  CircleIcon as HiCircleIcon,
  CommandIcon as HiCommandIcon,
  DashboardSquare01Icon as HiDashboardSquare01Icon,
  Database01Icon as HiDatabase01Icon,
  Delete01Icon as HiDelete01Icon,
  Delete02Icon as HiDelete02Icon,
  Dollar01Icon as HiDollar01Icon,
  Download04Icon as HiDownload04Icon,
  DragDropVerticalIcon as HiDragDropVerticalIcon,
  FavouriteIcon as HiFavouriteIcon,
  File01Icon as HiFile01Icon,
  FileScriptIcon as HiFileScriptIcon,
  FileUploadIcon as HiFileUploadIcon,
  FireIcon as HiFireIcon,
  Folder01Icon as HiFolder01Icon,
  FolderOpenIcon as HiFolderOpenIcon,
  GridIcon as HiGridIcon,
  Heading02Icon as HiHeading02Icon,
  Image01Icon as HiImage01Icon,
  InformationCircleIcon as HiInformationCircleIcon,
  Layers01Icon as HiLayers01Icon,
  LayoutTwoColumnIcon as HiLayoutTwoColumnIcon,
  LayoutTwoRowIcon as HiLayoutTwoRowIcon,
  LeftToRightListBulletIcon as HiLeftToRightListBulletIcon,
  LinkSquare02Icon as HiLinkSquare02Icon,
  Loading03Icon as HiLoading03Icon,
  Maximize01Icon as HiMaximize01Icon,
  Menu01Icon as HiMenu01Icon,
  MinusSignIcon as HiMinusSignIcon,
  Moon02Icon as HiMoon02Icon,
  MoreHorizontalIcon as HiMoreHorizontalIcon,
  MoreVerticalIcon as HiMoreVerticalIcon,
  PaintBoardIcon as HiPaintBoardIcon,
  PauseIcon as HiPauseIcon,
  PencilEdit02Icon as HiPencilEdit02Icon,
  PercentIcon as HiPercentIcon,
  PlayIcon as HiPlayIcon,
  PlusSignIcon as HiPlusSignIcon,
  RefreshIcon as HiRefreshIcon,
  RotateClockwiseIcon as HiRotateClockwiseIcon,
  Search01Icon as HiSearch01Icon,
  SecurityCheckIcon as HiSecurityCheckIcon,
  ServerStack01Icon as HiServerStack01Icon,
  Settings01Icon as HiSettings01Icon,
  Share08Icon as HiShare08Icon,
  SidebarLeftIcon as HiSidebarLeftIcon,
  SplitIcon as HiSplitIcon,
  StarIcon as HiStarIcon,
  StickyNote01Icon as HiStickyNote01Icon,
  Sun03Icon as HiSun03Icon,
  Table01Icon as HiTable01Icon,
  TableIcon as HiTableIcon,
  Target02Icon as HiTarget02Icon,
  TextBoldIcon as HiTextBoldIcon,
  TextItalicIcon as HiTextItalicIcon,
  Tick02Icon as HiTick02Icon,
  Upload04Icon as HiUpload04Icon,
  UserAdd01Icon as HiUserAdd01Icon,
  UserIcon as HiUserIcon,
  UserMultipleIcon as HiUserMultipleIcon,
  ViewIcon as HiViewIcon,
  ViewOffSlashIcon as HiViewOffSlashIcon,
  Wallet01Icon as HiWallet01Icon,
  WifiOff01Icon as HiWifiOff01Icon,
  ZapIcon as HiZapIcon,
  ZoomInAreaIcon as HiZoomInAreaIcon,
  ZoomOutAreaIcon as HiZoomOutAreaIcon,
  Logout03Icon as HiLogout03Icon,
  Analytics01Icon as HiAnalytics01Icon,
  DashboardSquare02Icon as HiDashboardSquare02Icon,
  Copy01Icon as HiCopy01Icon,
} from "@hugeicons/core-free-icons"

type HugeiconData = ComponentProps<typeof HugeiconsIcon>["icon"]
export type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, "icon" | "ref">
export type IconComponent = ReturnType<typeof createIcon>

function createIcon(icon: HugeiconData, displayName: string) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 24, strokeWidth = 1.75, ...props }, ref) => (
    <HugeiconsIcon ref={ref} icon={icon} size={size} strokeWidth={strokeWidth} {...props} />
  ))
  Icon.displayName = displayName
  return Icon
}

export const Activity = createIcon(HiActivity01Icon, "Activity")
export const AlertCircle = createIcon(HiAlertCircleIcon, "AlertCircle")
export const AlertTriangle = createIcon(HiAlert02Icon, "AlertTriangle")
export const ArrowDown = createIcon(HiArrowDown01Icon, "ArrowDown")
export const ArrowDownRight = createIcon(HiArrowDownRight01Icon, "ArrowDownRight")
export const ArrowLeft = createIcon(HiArrowLeft01Icon, "ArrowLeft")
export const ArrowRight = createIcon(HiArrowRight01Icon, "ArrowRight")
export const ArrowRightLeft = createIcon(HiArrowDataTransferHorizontalIcon, "ArrowRightLeft")
export const ArrowUp = createIcon(HiArrowUp01Icon, "ArrowUp")
export const ArrowUpRight = createIcon(HiArrowUpRight01Icon, "ArrowUpRight")
export const Award = createIcon(HiAward01Icon, "Award")
export const BarChart3 = createIcon(HiChartHistogramIcon, "BarChart3")
export const Bold = createIcon(HiTextBoldIcon, "Bold")
export const BookOpen = createIcon(HiBookOpen01Icon, "BookOpen")
export const Brain = createIcon(HiBrain01Icon, "Brain")
export const Calculator = createIcon(HiCalculator01Icon, "Calculator")
export const Calendar = createIcon(HiCalendar03Icon, "Calendar")
export const Check = createIcon(HiTick02Icon, "Check")
export const CheckCircle = createIcon(HiCheckmarkCircle02Icon, "CheckCircle")
export const CheckCircle2 = createIcon(HiCheckmarkCircle02Icon, "CheckCircle2")
export const CheckIcon = createIcon(HiTick02Icon, "CheckIcon")
export const ChevronDown = createIcon(HiArrowDown01Icon, "ChevronDown")
export const ChevronDownIcon = createIcon(HiArrowDown01Icon, "ChevronDownIcon")
export const ChevronLeft = createIcon(HiArrowLeft01Icon, "ChevronLeft")
export const ChevronLeftIcon = createIcon(HiArrowLeft01Icon, "ChevronLeftIcon")
export const ChevronRight = createIcon(HiArrowRight01Icon, "ChevronRight")
export const ChevronRightIcon = createIcon(HiArrowRight01Icon, "ChevronRightIcon")
export const ChevronUpIcon = createIcon(HiArrowUp01Icon, "ChevronUpIcon")
export const CircleIcon = createIcon(HiCircleIcon, "CircleIcon")
export const Columns = createIcon(HiLayoutTwoColumnIcon, "Columns")
export const Combine = createIcon(HiLayers01Icon, "Combine")
export const Command = createIcon(HiCommandIcon, "Command")
export const Database = createIcon(HiDatabase01Icon, "Database")
export const DollarSign = createIcon(HiDollar01Icon, "DollarSign")
export const Download = createIcon(HiDownload04Icon, "Download")
export const Edit2 = createIcon(HiPencilEdit02Icon, "Edit2")
export const ExternalLink = createIcon(HiLinkSquare02Icon, "ExternalLink")
export const Eye = createIcon(HiViewIcon, "Eye")
export const EyeOff = createIcon(HiViewOffSlashIcon, "EyeOff")
export const FileJson = createIcon(HiFileScriptIcon, "FileJson")
export const FileText = createIcon(HiFile01Icon, "FileText")
export const FileUp = createIcon(HiFileUploadIcon, "FileUp")
export const Flame = createIcon(HiFireIcon, "Flame")
export const Folder = createIcon(HiFolder01Icon, "Folder")
export const FolderOpen = createIcon(HiFolderOpenIcon, "FolderOpen")
export const Grid3X3 = createIcon(HiGridIcon, "Grid3X3")
export const GripVerticalIcon = createIcon(HiDragDropVerticalIcon, "GripVerticalIcon")
export const Heading2 = createIcon(HiHeading02Icon, "Heading2")
export const Heart = createIcon(HiFavouriteIcon, "Heart")
export const Image = createIcon(HiImage01Icon, "Image")
export const ImageIcon = createIcon(HiImage01Icon, "ImageIcon")
export const Info = createIcon(HiInformationCircleIcon, "Info")
export const Italic = createIcon(HiTextItalicIcon, "Italic")
export const LayoutGrid = createIcon(HiDashboardSquare01Icon, "LayoutGrid")
export const LineChart = createIcon(HiChartLineData01Icon, "LineChart")
export const List = createIcon(HiLeftToRightListBulletIcon, "List")
export const Loader2 = createIcon(HiLoading03Icon, "Loader2")
export const Loader2Icon = createIcon(HiLoading03Icon, "Loader2Icon")
export const Maximize2 = createIcon(HiMaximize01Icon, "Maximize2")
export const Menu = createIcon(HiMenu01Icon, "Menu")
export const Minus = createIcon(HiMinusSignIcon, "Minus")
export const MinusIcon = createIcon(HiMinusSignIcon, "MinusIcon")
export const Moon = createIcon(HiMoon02Icon, "Moon")
export const MoreHorizontal = createIcon(HiMoreHorizontalIcon, "MoreHorizontal")
export const MoreHorizontalIcon = createIcon(HiMoreHorizontalIcon, "MoreHorizontalIcon")
export const MoreVertical = createIcon(HiMoreVerticalIcon, "MoreVertical")
export const Palette = createIcon(HiPaintBoardIcon, "Palette")
export const PanelLeftIcon = createIcon(HiSidebarLeftIcon, "PanelLeftIcon")
export const Pause = createIcon(HiPauseIcon, "Pause")
export const Percent = createIcon(HiPercentIcon, "Percent")
export const Play = createIcon(HiPlayIcon, "Play")
export const Plus = createIcon(HiPlusSignIcon, "Plus")
export const RefreshCw = createIcon(HiRefreshIcon, "RefreshCw")
export const RotateCw = createIcon(HiRotateClockwiseIcon, "RotateCw")
export const Rows = createIcon(HiLayoutTwoRowIcon, "Rows")
export const Search = createIcon(HiSearch01Icon, "Search")
export const SearchIcon = createIcon(HiSearch01Icon, "SearchIcon")
export const Server = createIcon(HiServerStack01Icon, "Server")
export const Settings = createIcon(HiSettings01Icon, "Settings")
export const Share2 = createIcon(HiShare08Icon, "Share2")
export const ShieldCheck = createIcon(HiSecurityCheckIcon, "ShieldCheck")
export const SplitSquareHorizontal = createIcon(HiSplitIcon, "SplitSquareHorizontal")
export const Star = createIcon(HiStarIcon, "Star")
export const StickyNote = createIcon(HiStickyNote01Icon, "StickyNote")
export const Sun = createIcon(HiSun03Icon, "Sun")
export const Table2 = createIcon(HiTable01Icon, "Table2")
export const Table = createIcon(HiTableIcon, "Table")
export const Target = createIcon(HiTarget02Icon, "Target")
export const Trash = createIcon(HiDelete01Icon, "Trash")
export const Trash2 = createIcon(HiDelete02Icon, "Trash2")
export const TrendingDown = createIcon(HiChartDecreaseIcon, "TrendingDown")
export const TrendingUp = createIcon(HiChartIncreaseIcon, "TrendingUp")
export const Trophy = createIcon(HiAward05Icon, "Trophy")
export const Upload = createIcon(HiUpload04Icon, "Upload")
export const User = createIcon(HiUserIcon, "User")
export const UserPlus = createIcon(HiUserAdd01Icon, "UserPlus")
export const Users = createIcon(HiUserMultipleIcon, "Users")
export const Wallet = createIcon(HiWallet01Icon, "Wallet")
export const WifiOff = createIcon(HiWifiOff01Icon, "WifiOff")
export const X = createIcon(HiCancel01Icon, "X")
export const XCircle = createIcon(HiCancelCircleIcon, "XCircle")
export const XIcon = createIcon(HiCancel01Icon, "XIcon")
export const Zap = createIcon(HiZapIcon, "Zap")
export const ZoomIn = createIcon(HiZoomInAreaIcon, "ZoomIn")
export const ZoomOut = createIcon(HiZoomOutAreaIcon, "ZoomOut")
export const LogOut = createIcon(HiLogout03Icon, "LogOut")
export const AnalyticsIcon = createIcon(HiAnalytics01Icon, "AnalyticsIcon")
export const DashboardIcon = createIcon(HiDashboardSquare02Icon, "DashboardIcon")
export const Copy = createIcon(HiCopy01Icon, "Copy")
