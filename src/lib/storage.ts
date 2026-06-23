import { isSupabaseConfigured, supabase } from './supabase'

export const AVATAR_BUCKET = 'avatars'
export const CIRCLE_COVER_BUCKET = 'circle-covers'
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const MAX_COVER_BYTES = 4 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export type ImageUploadResult = { url: string }

function formatLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

// Returns a human-friendly error string when the file is not an acceptable image, else null.
export function validateImageFile(file: File, maxBytes: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Please choose a JPG, PNG, WebP, or GIF image.'
  if (file.size > maxBytes) return `That image is too large. Please use one under ${formatLimit(maxBytes)}.`
  return null
}

export function validateAvatarFile(file: File): string | null {
  return validateImageFile(file, MAX_AVATAR_BYTES)
}

// Uploads an image into the user's own folder in a public bucket and returns the public URL.
// In keyless preview mode it falls back to a local object URL so the UI still works without a backend.
async function uploadUserImage(bucket: string, prefix: string, file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured) return URL.createObjectURL(file)
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const path = `${userId}/${prefix}-${Date.now()}.${extension}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Uploads an avatar and persists the resulting URL on the user's profile.
export async function uploadAvatar(file: File, userId: string): Promise<ImageUploadResult> {
  const validation = validateImageFile(file, MAX_AVATAR_BYTES)
  if (validation) throw new Error(validation)
  const url = await uploadUserImage(AVATAR_BUCKET, 'avatar', file, userId)
  if (isSupabaseConfigured) {
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    if (profileError) throw profileError
  }
  return { url }
}

// Uploads a circle cover image. The URL is persisted by create_learning_circle when the circle is created.
export async function uploadCircleCover(file: File, userId: string): Promise<ImageUploadResult> {
  const validation = validateImageFile(file, MAX_COVER_BYTES)
  if (validation) throw new Error(validation)
  const url = await uploadUserImage(CIRCLE_COVER_BUCKET, 'cover', file, userId)
  return { url }
}

export const ATTACHMENT_BUCKET = 'attachments'
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
export const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf']

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return 'Please attach an image or a PDF file.'
  if (file.size > MAX_ATTACHMENT_BYTES) return `That file is too large. Please keep it under ${formatLimit(MAX_ATTACHMENT_BYTES)}.`
  return null
}

// Uploads a project attachment. The URL is persisted by create_swap_request when the request is sent.
export async function uploadAttachment(file: File, userId: string): Promise<ImageUploadResult> {
  const validation = validateAttachmentFile(file)
  if (validation) throw new Error(validation)
  const url = await uploadUserImage(ATTACHMENT_BUCKET, 'attachment', file, userId)
  return { url }
}
