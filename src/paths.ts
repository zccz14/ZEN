import { join } from 'path';

export const ZEN_DIR = join(process.cwd(), '.zen');
export const ZEN_DIST_DIR = join(ZEN_DIR, 'dist');
export const ZEN_SRC_DIR = join(ZEN_DIR, 'src');
export const ZEN_META_PATH = join(ZEN_DIR, 'meta.json');
