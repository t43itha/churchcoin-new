/**
 * Layout constants for consistent spacing and sizing across the app.
 * Use these instead of hardcoded pixel values.
 */
export const LAYOUT = {
  // Table/list container heights
  TABLE_MAX_HEIGHT: 540,
  LEDGER_MAX_HEIGHT: 600,
  PREVIEW_MAX_HEIGHT: 400,
  MODAL_CONTENT_MAX_HEIGHT: 500,

  // Sidebar and navigation
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 64,
  HEADER_HEIGHT: 64,
  MOBILE_HEADER_HEIGHT: 56,

  // Card grid gaps
  GRID_GAP_SM: 16,
  GRID_GAP_MD: 24,
  GRID_GAP_LG: 32,

  // Modal widths
  MODAL_SM: 400,
  MODAL_MD: 560,
  MODAL_LG: 720,
  MODAL_XL: 900,
  MODAL_FULL: 1200,

  // Drawer widths
  DRAWER_SM: 320,
  DRAWER_MD: 480,
  DRAWER_LG: 640,

  // Content max widths
  CONTENT_MAX_WIDTH: 1280,
  PROSE_MAX_WIDTH: 720,

  // Breakpoints (for reference, matches Tailwind defaults)
  BREAKPOINT_SM: 640,
  BREAKPOINT_MD: 768,
  BREAKPOINT_LG: 1024,
  BREAKPOINT_XL: 1280,

  // Common spacing values (in pixels)
  SPACING_XS: 4,
  SPACING_SM: 8,
  SPACING_MD: 16,
  SPACING_LG: 24,
  SPACING_XL: 32,
  SPACING_2XL: 48,

  // Input heights
  INPUT_HEIGHT_SM: 32,
  INPUT_HEIGHT_MD: 40,
  INPUT_HEIGHT_LG: 48,

  // Avatar sizes
  AVATAR_SM: 24,
  AVATAR_MD: 32,
  AVATAR_LG: 40,
  AVATAR_XL: 64,

  // Icon sizes
  ICON_SM: 16,
  ICON_MD: 20,
  ICON_LG: 24,
  ICON_XL: 32,

  // Border radius values
  RADIUS_SM: 4,
  RADIUS_MD: 8,
  RADIUS_LG: 12,
  RADIUS_FULL: 9999,

  // Z-index layers
  Z_DROPDOWN: 50,
  Z_STICKY: 40,
  Z_OVERLAY: 60,
  Z_MODAL: 70,
  Z_TOAST: 80,
  Z_TOOLTIP: 90,
} as const;

/**
 * Tailwind-compatible class names for common layout values.
 * These can be used directly in className props.
 */
export const LAYOUT_CLASSES = {
  // Max heights as Tailwind classes
  tableMaxHeight: `max-h-[${LAYOUT.TABLE_MAX_HEIGHT}px]`,
  ledgerMaxHeight: `max-h-[${LAYOUT.LEDGER_MAX_HEIGHT}px]`,
  previewMaxHeight: `max-h-[${LAYOUT.PREVIEW_MAX_HEIGHT}px]`,

  // Modal widths as Tailwind classes
  modalSm: `max-w-[${LAYOUT.MODAL_SM}px]`,
  modalMd: `max-w-[${LAYOUT.MODAL_MD}px]`,
  modalLg: `max-w-[${LAYOUT.MODAL_LG}px]`,
  modalXl: `max-w-[${LAYOUT.MODAL_XL}px]`,

  // Drawer widths
  drawerSm: `w-[${LAYOUT.DRAWER_SM}px]`,
  drawerMd: `w-[${LAYOUT.DRAWER_MD}px]`,
  drawerLg: `w-[${LAYOUT.DRAWER_LG}px]`,
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  SLOWER: 500,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
  MAX_PAGE_SIZE: 100,
} as const;
