import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useClient } from "@objectstack/client-react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FileUploadResult {
  /** Server-assigned file ID or key */
  id: string;
  /** Original file name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Download URL (resolved via getDownloadUrl) */
  downloadUrl?: string;
}

export interface UseFileUploadResult {
  /** Pick an image from the photo library and upload it */
  pickAndUploadImage: () => Promise<FileUploadResult | null>;
  /** Take a photo with the camera and upload it */
  captureAndUploadPhoto: () => Promise<FileUploadResult | null>;
  /** Pick a document and upload it */
  pickAndUploadDocument: () => Promise<FileUploadResult | null>;
  /** Upload a file from a local URI */
  uploadFile: (uri: string, name: string, mimeType: string) => Promise<FileUploadResult | null>;
  /** Get a download URL for a previously uploaded file */
  getDownloadUrl: (fileId: string) => Promise<string | null>;
  /** Download a file to a local cache directory */
  downloadFile: (fileId: string, fileName: string) => Promise<string | null>;
  /** Share a file via the system share sheet */
  shareFile: (fileId: string, fileName: string) => Promise<void>;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Upload progress (0–1) */
  uploadProgress: number;
  /** Last error */
  error: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for file upload, download, and sharing using the ObjectStack
 * storage SDK (`client.storage.upload()` / `getDownloadUrl()`).
 *
 * Integrates with expo-image-picker for photo library & camera access
 * and expo-document-picker for arbitrary file selection.
 */
export function useFileUpload(): UseFileUploadResult {
  const client = useClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  /* ---- Core upload ---- */
  const uploadFile = useCallback(
    async (uri: string, name: string, mimeType: string): Promise<FileUploadResult | null> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const storage = (client as any).storage;
        if (!storage?.upload) {
          throw new Error("client.storage.upload() is not available");
        }

        // Read file info for size
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const fileSize = (fileInfo as any).size ?? 0;

        setUploadProgress(0.1);

        // Build upload payload — SDK expects a File-like object or
        // { uri, name, type } on React Native.
        const file = { uri, name, type: mimeType };
        const response = await storage.upload(file);

        setUploadProgress(0.9);

        const fileId: string =
          response?.id ?? response?.key ?? response?.fileId ?? "";

        // Resolve download URL
        let downloadUrl: string | undefined;
        if (fileId && storage.getDownloadUrl) {
          try {
            downloadUrl = await storage.getDownloadUrl(fileId);
          } catch {
            // Non-critical — caller can resolve later
          }
        }

        setUploadProgress(1);

        return {
          id: fileId,
          name,
          mimeType,
          size: fileSize,
          downloadUrl,
        };
      } catch (err: unknown) {
        const uploadError = err instanceof Error ? err : new Error("File upload failed");
        setError(uploadError);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [client],
  );

  /* ---- Pick image from library ---- */
  const pickAndUploadImage = useCallback(async (): Promise<FileUploadResult | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(new Error("Media library permission denied"));
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const name = asset.fileName ?? `image_${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? "image/jpeg";

    return uploadFile(asset.uri, name, mimeType);
  }, [uploadFile]);

  /* ---- Camera capture ---- */
  const captureAndUploadPhoto = useCallback(async (): Promise<FileUploadResult | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(new Error("Camera permission denied"));
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? "image/jpeg";

    return uploadFile(asset.uri, name, mimeType);
  }, [uploadFile]);

  /* ---- Document picker ---- */
  const pickAndUploadDocument = useCallback(async (): Promise<FileUploadResult | null> => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    return uploadFile(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
  }, [uploadFile]);

  /* ---- Get download URL ---- */
  const getDownloadUrl = useCallback(
    async (fileId: string): Promise<string | null> => {
      try {
        const storage = (client as any).storage;
        if (!storage?.getDownloadUrl) return null;
        return await storage.getDownloadUrl(fileId);
      } catch {
        return null;
      }
    },
    [client],
  );

  /* ---- Download file ---- */
  const downloadFile = useCallback(
    async (fileId: string, fileName: string): Promise<string | null> => {
      try {
        const url = await getDownloadUrl(fileId);
        if (!url) return null;

        const localUri = `${FileSystem.cacheDirectory}${fileName}`;
        const download = await FileSystem.downloadAsync(url, localUri);
        return download.uri;
      } catch {
        return null;
      }
    },
    [getDownloadUrl],
  );

  /* ---- Share file ---- */
  const shareFile = useCallback(
    async (fileId: string, fileName: string): Promise<void> => {
      const localUri = await downloadFile(fileId, fileName);
      if (!localUri) {
        setError(new Error("Failed to download file for sharing"));
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setError(new Error("Sharing is not available on this device"));
        return;
      }

      await Sharing.shareAsync(localUri);
    },
    [downloadFile],
  );

  return {
    pickAndUploadImage,
    captureAndUploadPhoto,
    pickAndUploadDocument,
    uploadFile,
    getDownloadUrl,
    downloadFile,
    shareFile,
    isUploading,
    uploadProgress,
    error,
  };
}
