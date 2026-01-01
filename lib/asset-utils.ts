// Utility functions for asset management

/**
 * Converts a File object to a Base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Downloads a Base64 string as a file
 */
export function downloadBase64File(base64String: string, fileName: string): void {
  try {
    // Extract mime type and data from base64 string
    const matches = base64String.match(/^data:([^;]+);base64,(.+)$/)

    if (!matches) {
      // If not a data URL, assume it's a regular URL
      const link = document.createElement("a")
      link.href = base64String
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("[v0] Error downloading file:", error)
    throw new Error("Failed to download file")
  }
}

/**
 * Gets the file extension from a filename or mime type
 */
export function getFileExtension(fileName: string, mimeType?: string): string {
  const extensionFromName = fileName.split(".").pop()?.toLowerCase()
  if (extensionFromName && ["svg", "jpg", "jpeg", "png", "gif", "webp"].includes(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName
  }

  if (mimeType) {
    const typeMap: Record<string, string> = {
      "image/svg+xml": "svg",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
    }
    return typeMap[mimeType] || "other"
  }

  return "other"
}

/**
 * Validates if a string is a valid image URL or Base64 string
 */
export function isValidImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) {
    return true
  }
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
