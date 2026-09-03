import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/lib/db';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const UPLOADS_BASE = path.join(PUBLIC_DIR, 'uploads');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_DOC_EXTENSIONS = ['pdf', 'doc', 'docx'];

const ALL_ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOC_EXTENSIONS];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ext;
}

function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = getFileExtension(file.name);

  if (!ALL_ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type .${ext} is not allowed. Allowed: ${ALL_ALLOWED_EXTENSIONS.join(', ')}` };
  }

  if (!ALL_ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `MIME type ${file.type} is not allowed.` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }

  return { valid: true };
}

export async function uploadMedia(
  siteId: string,
  file: File,
  folder?: string,
  alt?: string,
) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = getFileExtension(file.name);
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const targetFolder = folder || 'uploads';
  const dirPath = path.join(UPLOADS_BASE, siteId, targetFolder);

  // Ensure directory exists
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  const urlPath = `/uploads/${siteId}/${targetFolder}/${uniqueName}`;

  const media = await db.media.create({
    data: {
      siteId,
      fileName: uniqueName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      url: urlPath,
      alt: alt || null,
      folder: targetFolder,
    },
  });

  return media;
}

export async function listMedia(
  siteId: string,
  filters?: {
    folder?: string;
    mimeType?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const where: Record<string, unknown> = { siteId };

  if (filters?.folder) where.folder = filters.folder;
  if (filters?.mimeType) where.mimeType = { contains: filters.mimeType };
  if (filters?.search) {
    where.OR = [
      { fileName: { contains: filters.search } },
      { originalName: { contains: filters.search } },
      { alt: { contains: filters.search } },
    ];
  }

  const [media, total] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.media.count({ where }),
  ]);

  return { media, total, page, limit };
}

export async function getMedia(id: string, siteId: string) {
  const media = await db.media.findFirst({ where: { id, siteId } });
  if (!media) throw new Error('Media not found');
  return media;
}

export async function updateMedia(
  id: string,
  siteId: string,
  data: { alt?: string; folder?: string },
) {
  const existing = await db.media.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Media not found');

  // If folder changed, move the physical file
  if (data.folder && data.folder !== existing.folder) {
    const oldPath = path.join(UPLOADS_BASE, siteId, existing.folder, existing.fileName);
    const newDir = path.join(UPLOADS_BASE, siteId, data.folder);
    const newPath = path.join(newDir, existing.fileName);

    fs.mkdirSync(newDir, { recursive: true });

    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    const newUrl = `/uploads/${siteId}/${data.folder}/${existing.fileName}`;

    return db.media.update({
      where: { id },
      data: {
        alt: data.alt !== undefined ? data.alt : existing.alt,
        folder: data.folder,
        url: newUrl,
      },
    });
  }

  const updateData: Record<string, unknown> = {};
  if (data.alt !== undefined) updateData.alt = data.alt;

  return db.media.update({ where: { id }, data: updateData });
}

export async function deleteMedia(id: string, siteId: string) {
  const existing = await db.media.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Media not found');

  // Delete physical file
  const filePath = path.join(UPLOADS_BASE, siteId, existing.folder, existing.fileName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Log but don't fail if file deletion fails — DB record is the source of truth
  }

  await db.media.delete({ where: { id } });
  return { success: true };
}

export async function getMediaStats(siteId: string) {
  const media = await db.media.findMany({
    where: { siteId },
    select: { mimeType: true, fileSize: true },
  });

  const byMimeType: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (const item of media) {
    const group = item.mimeType.split('/')[0]; // 'image', 'application', etc.
    if (!byMimeType[group]) {
      byMimeType[group] = { count: 0, size: 0 };
    }
    byMimeType[group].count += 1;
    byMimeType[group].size += item.fileSize;
    totalSize += item.fileSize;
  }

  return {
    total: media.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    byMimeType: Object.fromEntries(
      Object.entries(byMimeType).map(([key, val]) => [
        key,
        { count: val.count, size: val.size, sizeFormatted: formatBytes(val.size) },
      ]),
    ),
  };
}

export async function getFolders(siteId: string) {
  const folders = await db.media.findMany({
    where: { siteId },
    select: { folder: true },
    distinct: ['folder'],
    orderBy: { folder: 'asc' },
  });
  return folders.map((f) => f.folder);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
