export function hasActiveClassifiedMediaUpload(heroUploading: boolean, feedUploading: boolean): boolean {
  return heroUploading || feedUploading;
}
