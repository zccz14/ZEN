import { join } from 'path';

export const INPUT_DIR = process.cwd();
export const CZON_DIR = join(process.cwd(), '.czon');
export const CZON_DIST_DIR = join(CZON_DIR, 'dist');
export const CZON_DIST_RAW_CONTENT_DIR = join(CZON_DIST_DIR, '__raw__');
export const CZON_SRC_DIR = join(CZON_DIR, 'src');
export const CZON_META_PATH = join(CZON_DIR, 'meta.json');
