export const OPFS_DIRS = {
  binaries: "editnovel_binary_store",
  images: "editnovel_images",
  dictionaries: "editnovel_dicts",
  ocrModels: "editnovel_ocr_models",
} as const;

export type OpfsBucket = (typeof OPFS_DIRS)[keyof typeof OPFS_DIRS];
