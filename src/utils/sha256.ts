import { BinaryLike, createHash } from 'crypto';

export const sha256 = (content: BinaryLike): string =>
  createHash('sha256').update(content).digest('hex');
