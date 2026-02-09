/**
 * Tests for useFileUpload – validates file upload, download, and sharing
 * hooks wrapping client.storage.*.
 */
import { renderHook, act } from "@testing-library/react-native";

/* ---- Mocks ---- */
const mockUpload = jest.fn();
const mockGetDownloadUrl = jest.fn();

const mockClient = {
  storage: {
    upload: mockUpload,
    getDownloadUrl: mockGetDownloadUrl,
  },
};

jest.mock("@objectstack/client-react", () => ({
  useClient: () => mockClient,
}));

const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) =>
    mockLaunchImageLibraryAsync(...args),
  requestCameraPermissionsAsync: (...args: any[]) =>
    mockRequestCameraPermissionsAsync(...args),
  launchCameraAsync: (...args: any[]) => mockLaunchCameraAsync(...args),
  MediaTypeOptions: { Images: "Images" },
}));

const mockGetDocumentAsync = jest.fn();
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args),
}));

const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: any[]) => mockIsAvailableAsync(...args),
  shareAsync: (...args: any[]) => mockShareAsync(...args),
}));

import { useFileUpload } from "~/hooks/useFileUpload";

beforeEach(() => {
  mockUpload.mockReset();
  mockGetDownloadUrl.mockReset();
  mockRequestMediaLibraryPermissionsAsync.mockReset();
  mockLaunchImageLibraryAsync.mockReset();
  mockRequestCameraPermissionsAsync.mockReset();
  mockLaunchCameraAsync.mockReset();
  mockGetDocumentAsync.mockReset();
  mockIsAvailableAsync.mockReset();
  mockShareAsync.mockReset();
});

describe("useFileUpload", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.uploadFile).toBe("function");
    expect(typeof result.current.pickAndUploadImage).toBe("function");
    expect(typeof result.current.captureAndUploadPhoto).toBe("function");
    expect(typeof result.current.pickAndUploadDocument).toBe("function");
    expect(typeof result.current.getDownloadUrl).toBe("function");
    expect(typeof result.current.downloadFile).toBe("function");
    expect(typeof result.current.shareFile).toBe("function");
  });

  it("uploadFile calls client.storage.upload() and returns result", async () => {
    mockUpload.mockResolvedValue({ id: "file-123" });
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/file-123");

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(
        "file:///tmp/test.jpg",
        "test.jpg",
        "image/jpeg",
      );
    });

    expect(mockUpload).toHaveBeenCalledWith({
      uri: "file:///tmp/test.jpg",
      name: "test.jpg",
      type: "image/jpeg",
    });
    expect(uploadResult).toEqual({
      id: "file-123",
      name: "test.jpg",
      mimeType: "image/jpeg",
      size: 0,
      downloadUrl: "https://cdn.example.com/file-123",
    });
    expect(result.current.isUploading).toBe(false);
  });

  it("uploadFile handles errors gracefully", async () => {
    mockUpload.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(
        "file:///tmp/test.jpg",
        "test.jpg",
        "image/jpeg",
      );
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.isUploading).toBe(false);
  });

  it("pickAndUploadImage handles permission denied", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.pickAndUploadImage();
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error?.message).toBe(
      "Media library permission denied",
    );
  });

  it("pickAndUploadImage handles user cancellation", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true });

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.pickAndUploadImage();
    });

    expect(uploadResult).toBeNull();
  });

  it("pickAndUploadImage uploads selected image", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///photo.jpg",
          fileName: "photo.jpg",
          mimeType: "image/jpeg",
        },
      ],
    });
    mockUpload.mockResolvedValue({ id: "img-1" });
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/img-1");

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.pickAndUploadImage();
    });

    expect(uploadResult).toMatchObject({
      id: "img-1",
      name: "photo.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("captureAndUploadPhoto handles permission denied", async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.captureAndUploadPhoto();
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error?.message).toBe("Camera permission denied");
  });

  it("captureAndUploadPhoto uploads captured photo", async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///camera.jpg",
          fileName: "camera.jpg",
          mimeType: "image/jpeg",
        },
      ],
    });
    mockUpload.mockResolvedValue({ id: "cam-1" });
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/cam-1");

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.captureAndUploadPhoto();
    });

    expect(uploadResult).toMatchObject({
      id: "cam-1",
      name: "camera.jpg",
    });
  });

  it("pickAndUploadDocument uploads selected document", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///doc.pdf",
          name: "doc.pdf",
          mimeType: "application/pdf",
        },
      ],
    });
    mockUpload.mockResolvedValue({ id: "doc-1" });
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/doc-1");

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.pickAndUploadDocument();
    });

    expect(uploadResult).toMatchObject({
      id: "doc-1",
      name: "doc.pdf",
      mimeType: "application/pdf",
    });
  });

  it("pickAndUploadDocument handles cancellation", async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });

    const { result } = renderHook(() => useFileUpload());

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.pickAndUploadDocument();
    });

    expect(uploadResult).toBeNull();
  });

  it("getDownloadUrl returns URL from storage", async () => {
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/file-1");

    const { result } = renderHook(() => useFileUpload());

    let url: any;
    await act(async () => {
      url = await result.current.getDownloadUrl("file-1");
    });

    expect(url).toBe("https://cdn.example.com/file-1");
  });

  it("getDownloadUrl returns null on failure", async () => {
    mockGetDownloadUrl.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useFileUpload());

    let url: any;
    await act(async () => {
      url = await result.current.getDownloadUrl("file-1");
    });

    expect(url).toBeNull();
  });

  it("shareFile calls Sharing.shareAsync with download URL", async () => {
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/file-1");
    mockIsAvailableAsync.mockResolvedValue(true);

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.shareFile("file-1", "report.pdf");
    });

    expect(mockShareAsync).toHaveBeenCalledWith(
      "https://cdn.example.com/file-1",
    );
  });

  it("shareFile handles sharing not available", async () => {
    mockGetDownloadUrl.mockResolvedValue("https://cdn.example.com/file-1");
    mockIsAvailableAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.shareFile("file-1", "report.pdf");
    });

    expect(result.current.error?.message).toBe(
      "Sharing is not available on this device",
    );
  });
});
