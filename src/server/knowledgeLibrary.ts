import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { inflateRawSync } from 'zlib';

export type KnowledgeDocumentMeta = {
  id: string;
  title: string;
  originalName: string;
  sourceType: 'docx' | 'txt' | 'md' | 'pdf';
  createdAt: string;
  updatedAt: string;
  characterCount: number;
};

export type StoredKnowledgeDocument = KnowledgeDocumentMeta & {
  text: string;
};

type KnowledgeLibraryOptions = {
  libraryPath: string;
  legacyPath?: string;
  legacyTitle?: string;
};

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 1_500_000;
const MAX_PDF_PAGES = 300;
const DOCUMENT_ID_PATTERN = /^[a-f0-9-]{36}$/i;

export type ExtractedDocument = {
  originalName: string;
  title: string;
  sourceType: KnowledgeDocumentMeta['sourceType'];
  text: string;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function findZipEntry(archive: Buffer, targetName: string) {
  const minimumEocdOffset = Math.max(0, archive.length - 65_557);
  let eocdOffset = -1;
  for (let offset = archive.length - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('DOCX 文件结构无效。');

  const entryCount = archive.readUInt16LE(eocdOffset + 10);
  let offset = archive.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('DOCX 文件目录损坏。');
    }

    const flags = archive.readUInt16LE(offset + 8);
    const compressionMethod = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const uncompressedSize = archive.readUInt32LE(offset + 24);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const entryName = archive.subarray(nameStart, nameEnd).toString('utf8').replace(/\\/g, '/');

    if (entryName === targetName) {
      if ((flags & 0x1) !== 0) throw new Error('不支持加密的 DOCX 文件。');
      if (uncompressedSize > MAX_EXTRACTED_CHARACTERS * 4) {
        throw new Error('DOCX 正文内容过大。');
      }
      if (
        localHeaderOffset + 30 > archive.length ||
        archive.readUInt32LE(localHeaderOffset) !== 0x04034b50
      ) {
        throw new Error('DOCX 文件正文结构损坏。');
      }

      const localNameLength = archive.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > archive.length) throw new Error('DOCX 文件正文不完整。');

      const compressed = archive.subarray(dataStart, dataEnd);
      if (compressionMethod === 0) return Buffer.from(compressed);
      if (compressionMethod === 8) return inflateRawSync(compressed);
      throw new Error('DOCX 使用了不支持的压缩格式。');
    }

    offset = nameEnd + extraLength + commentLength;
  }

  throw new Error('DOCX 中未找到可读取的正文。');
}

function extractDocxText(archive: Buffer) {
  const documentXml = findZipEntry(archive, 'word/document.xml').toString('utf8');
  return decodeXmlEntities(
    documentXml
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, '')
  );
}

async function extractPdfText(archive: Buffer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsDataPath = path
    .resolve(process.cwd(), 'node_modules', 'pdfjs-dist')
    .replace(/\\/g, '/');
  const loadingTask = getDocument({
    data: new Uint8Array(archive),
    cMapUrl: `${pdfjsDataPath}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${pdfjsDataPath}/standard_fonts/`,
    useSystemFonts: true,
  });

  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF 页数不能超过 ${MAX_PDF_PAGES} 页。`);
    }

    const pages: string[] = [];
    let extractedCharacters = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const segments: string[] = [];

      for (const item of content.items) {
        if (!('str' in item) || typeof item.str !== 'string' || !item.str) continue;
        segments.push(item.str, item.hasEOL ? '\n' : ' ');
      }

      const pageText = segments.join('').trim();
      if (pageText) {
        const pageWithLabel = `第 ${pageNumber} 页\n${pageText}`;
        extractedCharacters += pageWithLabel.length;
        if (extractedCharacters > MAX_EXTRACTED_CHARACTERS) {
          throw new Error('PDF 正文内容过大。');
        }
        pages.push(pageWithLabel);
      }
      page.cleanup();
    }

    if (pages.join('').replace(/\s/g, '').length < 20) {
      throw new Error('PDF 未包含可检索文字，可能是扫描件，请先转换为带文本层的 PDF。');
    }
    return pages.join('\n\n');
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new Error('不支持加密或受密码保护的 PDF。');
    }
    throw error;
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

function normalizeDocumentText(value: string) {
  const normalized = value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (normalized.length < 20) throw new Error('未能从文档中提取到足够的正文内容。');
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) throw new Error('文档正文内容过大。');
  return normalized;
}

function cleanDisplayName(value: string, fallback: string, maxLength: number) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, maxLength);
}

export async function extractSupportedDocument(
  fileNameValue: string,
  buffer: Buffer,
  maxUploadBytes = MAX_UPLOAD_BYTES
): Promise<ExtractedDocument> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('请选择要上传的文档。');
  if (buffer.length > maxUploadBytes) {
    throw new Error(`单个文档不能超过 ${Math.floor(maxUploadBytes / 1024 / 1024)}MB。`);
  }

  const originalName = cleanDisplayName(path.basename(fileNameValue), '未命名文档', 180);
  const extension = path.extname(originalName).toLowerCase();
  if (!['.docx', '.txt', '.md', '.markdown', '.pdf'].includes(extension)) {
    throw new Error('仅支持 DOCX、TXT、MD 或 PDF 文档。');
  }

  const rawText = extension === '.docx'
    ? extractDocxText(buffer)
    : extension === '.pdf'
    ? await extractPdfText(buffer)
    : new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  const text = normalizeDocumentText(rawText);
  const fallbackTitle = path.basename(originalName, extension);
  const title = cleanDisplayName(fallbackTitle, '未命名文档', 120);
  const sourceType: KnowledgeDocumentMeta['sourceType'] =
    extension === '.docx'
      ? 'docx'
      : extension === '.pdf'
      ? 'pdf'
      : extension === '.md' || extension === '.markdown'
      ? 'md'
      : 'txt';

  return { originalName, title, sourceType, text };
}

export function createKnowledgeLibrary(options: KnowledgeLibraryOptions) {
  const libraryPath = path.resolve(options.libraryPath);
  const legacyTrashPath = path.join(libraryPath, '.trash');
  const markerPath = path.join(libraryPath, '.initialized');

  const documentPath = (id: string) => path.join(libraryPath, `${id}.json`);

  const writeStoredDocument = (document: StoredKnowledgeDocument) => {
    const targetPath = documentPath(document.id);
    const temporaryPath = path.join(libraryPath, `.${document.id}.${Date.now()}.tmp`);
    fs.writeFileSync(temporaryPath, JSON.stringify(document), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryPath, targetPath);
    return document;
  };

  const ensureInitialized = () => {
    fs.mkdirSync(libraryPath, { recursive: true, mode: 0o700 });
    if (fs.existsSync(legacyTrashPath)) {
      fs.rmSync(legacyTrashPath, { recursive: true, force: true });
    }
    if (fs.existsSync(markerPath)) return;

    const existingDocuments = fs.readdirSync(libraryPath).some((name) => name.endsWith('.json'));
    if (!existingDocuments && options.legacyPath && fs.existsSync(options.legacyPath)) {
      const rawText = fs.readFileSync(options.legacyPath, 'utf8');
      const text = normalizeDocumentText(rawText);
      const now = new Date().toISOString();
      const id = randomUUID();
      const title = cleanDisplayName(options.legacyTitle || '', '初始知识文档', 120);
      writeStoredDocument({
        id,
        title,
        originalName: `${title}.txt`,
        sourceType: 'txt',
        createdAt: now,
        updatedAt: now,
        characterCount: text.length,
        text,
      });
    }

    fs.writeFileSync(markerPath, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 });
  };

  const readDocuments = () => {
    ensureInitialized();
    const documents: StoredKnowledgeDocument[] = [];
    for (const name of fs.readdirSync(libraryPath)) {
      if (!name.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(libraryPath, name), 'utf8'));
        if (
          !DOCUMENT_ID_PATTERN.test(parsed?.id || '') ||
          typeof parsed?.title !== 'string' ||
          typeof parsed?.text !== 'string'
        ) {
          continue;
        }
        documents.push(parsed as StoredKnowledgeDocument);
      } catch (error) {
        console.error(`Knowledge document load failed (${name}):`, error);
      }
    }
    return documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  };

  const fingerprint = () => {
    ensureInitialized();
    return fs
      .readdirSync(libraryPath)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => {
        const stats = fs.statSync(path.join(libraryPath, name));
        return `${name}:${stats.size}:${stats.mtimeMs}`;
      })
      .join('|');
  };

  const addDocument = async (fileNameValue: string, buffer: Buffer) => {
    ensureInitialized();
    const { originalName, title, sourceType, text } = await extractSupportedDocument(
      fileNameValue,
      buffer
    );
    const now = new Date().toISOString();
    return writeStoredDocument({
      id: randomUUID(),
      title,
      originalName,
      sourceType,
      createdAt: now,
      updatedAt: now,
      characterCount: text.length,
      text,
    });
  };

  const deleteDocument = (id: string) => {
    ensureInitialized();
    if (!DOCUMENT_ID_PATTERN.test(id)) return false;
    const sourcePath = documentPath(id);
    if (!fs.existsSync(sourcePath)) return false;
    fs.unlinkSync(sourcePath);
    return true;
  };

  return {
    getDocuments: readDocuments,
    getFingerprint: fingerprint,
    addDocument,
    deleteDocument,
    listDocuments: () =>
      readDocuments().map(({ text: _text, ...metadata }) => metadata as KnowledgeDocumentMeta),
  };
}
