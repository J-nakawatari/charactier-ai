import { writeFileSync } from 'fs';

export const writeUtf8 = (p: string, data: string) =>
  writeFileSync(p, data, { encoding: 'utf8' });