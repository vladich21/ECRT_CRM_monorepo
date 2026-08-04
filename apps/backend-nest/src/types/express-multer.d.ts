import type { File as MulterFile } from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      type File = MulterFile;
    }
  }
}

export {};
