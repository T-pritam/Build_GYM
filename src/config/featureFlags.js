import { IS_LEGACY_BUILD as RAW_IS_LEGACY_BUILD } from '@env';

// Build-time only — set via the "legacy" EAS build profile's env block.
// Not runtime-toggleable.
export const IS_LEGACY_BUILD = RAW_IS_LEGACY_BUILD === 'true' || RAW_IS_LEGACY_BUILD === '1';
