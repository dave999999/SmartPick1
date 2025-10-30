import React, { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "./Button";
import { FileDropzone } from "./FileDropzone";
import { useUploadImageMutation } from "../helpers/useImageUpload";
import styles from "./ImageUpload.module.css";

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  className?: string;
}

const compressImage = async (
  file: File,
  maxSizeMB: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 1920;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Start with high quality and reduce if needed
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              const sizeMB = blob.size / 1024 / 1024;
              if (sizeMB > maxSizeMB && quality > 0.1) {
                quality -= 0.1;
                tryCompress();
              } else {
                const compressedReader = new FileReader();
                compressedReader.onload = () => {
                  resolve(compressedReader.result as string);
                };
                compressedReader.onerror = reject;
                compressedReader.readAsDataURL(blob);
              }
            },
            "image/jpeg",
            quality
          );
        };

        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 5,
  className = "",
}) => {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadImageMutation();

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const file = files[0];
      setError(null);

      // Check file size
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > maxSizeMB) {
        setError(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      try {
        setIsUploading(true);

        // Compress image if needed
        const base64Data = await compressImage(file, maxSizeMB);
        setPreview(base64Data);

        // Upload to server
        const result = await uploadMutation.mutateAsync({
          image: base64Data,
          name: file.name,
        });

        if (result.success) {
          onChange(result.url);
          setPreview(result.url);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to upload image"
        );
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [maxSizeMB, onChange, uploadMutation]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }, [onChange]);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(Array.from(files));
    }
  };

  if (preview) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.preview}>
          <img src={preview} alt="Preview" className={styles.previewImage} />
          {!disabled && (
            <div className={styles.previewOverlay}>
              <Button
                variant="destructive"
                size="icon-md"
                onClick={handleRemove}
                disabled={isUploading}
                type="button"
              >
                <X size={20} />
              </Button>
            </div>
          )}
        </div>
        {isUploading && (
          <div className={styles.uploadingIndicator}>
            <div className={styles.spinner} />
            <span>Uploading...</span>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <FileDropzone
        accept="image/*"
        maxFiles={1}
        maxSize={maxSizeMB * 1024 * 1024}
        onFilesSelected={handleFileSelect}
        disabled={disabled || isUploading}
        icon={<ImageIcon size={48} />}
        title="Click to upload or drag and drop"
        subtitle={`PNG, JPG, GIF up to ${maxSizeMB}MB`}
      />

      <div className={styles.cameraSection}>
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={disabled || isUploading}
          className={styles.cameraButton}
        >
          <Camera size={20} />
          Take Photo
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className={styles.hiddenInput}
        disabled={disabled || isUploading}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className={styles.hiddenInput}
        disabled={disabled || isUploading}
      />

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};