import "server-only";

import * as mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";
import WordExtractor from "word-extractor";

import { AppError } from "@/lib/errors";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 120_000;

function assertTrustedCvUrl(value: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("The stored CV URL is invalid.", 422, "INVALID_CV_URL");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !cloudName ||
    !url.pathname.startsWith(`/${cloudName}/`)
  ) {
    throw new AppError("The stored CV location is not trusted.", 422, "UNTRUSTED_CV_URL");
  }
  return url;
}

async function downloadCv(cvUrl: string) {
  const url = assertTrustedCvUrl(cvUrl);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new AppError("The CV could not be downloaded for analysis.", 502, "CV_DOWNLOAD_FAILED");
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_CV_BYTES) {
    throw new AppError("The CV is larger than the supported limit.", 422, "CV_TOO_LARGE");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_CV_BYTES) {
    throw new AppError("The CV file is empty or too large.", 422, "INVALID_CV_SIZE");
  }
  return buffer;
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

export async function extractCvText(cvUrl: string, format: string) {
  const buffer = await downloadCv(cvUrl);
  let text = "";

  try {
    if (format === "pdf") {
      const result = await extractPdfText(new Uint8Array(buffer), { mergePages: true });
      text = result.text;
    } else if (format === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (format === "doc") {
      const extractor = new WordExtractor();
      const document = await extractor.extract(buffer);
      text = document.getBody();
    } else {
      throw new AppError("This CV format is not supported.", 422, "UNSUPPORTED_CV_FORMAT");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Text could not be extracted from this CV.", 422, "CV_EXTRACTION_FAILED");
  }

  const normalized = normalizeExtractedText(text);
  if (normalized.length < 40) {
    throw new AppError(
      "Not enough readable text was found in this CV. A scanned PDF may need OCR.",
      422,
      "CV_TEXT_INSUFFICIENT",
    );
  }
  return normalized;
}
