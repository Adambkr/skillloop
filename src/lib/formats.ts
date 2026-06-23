// Single source of truth for exchange formats.
// Product-truth rule: only list formats the platform can actually deliver.
//  - Chat: real, in-app realtime chat.
//  - Video call / Voice call: arranged via a meeting link the partners share in
//    chat (SkillLoop has no native calling, so the label is honest about that).
//  - Project Review: real, backed by chat + file/link attachments.
export type ExchangeFormat = 'Chat' | 'Video call' | 'Voice call' | 'Project Review'

export const EXCHANGE_FORMATS: ExchangeFormat[] = ['Chat', 'Video call', 'Voice call', 'Project Review']

// Formats that happen over an external link the partners agree on in chat.
export const CALL_FORMATS: ExchangeFormat[] = ['Video call', 'Voice call']

export const FORMAT_NOTE: Record<ExchangeFormat, string> = {
  'Chat': 'Message-based help inside SkillLoop chat.',
  'Video call': 'Live video over a link you share in chat.',
  'Voice call': 'Audio call over a link you share in chat.',
  'Project Review': 'Share a link or file and get written feedback.',
}

export const DEFAULT_FORMAT: ExchangeFormat = 'Chat'

// Canonical skill categories used for filters and grouping. Skills store a free
// `category` text field; these are the buckets we present consistently.
export const SKILL_CATEGORIES = [
  'Design', 'Coding', 'Languages', 'Business', 'Marketing', 'Writing',
  'Video Editing', 'AI Tools', 'School', 'Music', 'Career', 'Other',
] as const

// Availability options, aligned with the values stored in user_preferences.
export const AVAILABILITY_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Flexible'] as const

// Normalize older/looser stored values (e.g. 'Video', 'Voice') to the canonical
// labels so legacy data keeps matching the new options.
export function normalizeFormat(value?: string): ExchangeFormat {
  const v = (value || '').toLowerCase()
  if (v.includes('video')) return 'Video call'
  if (v.includes('voice') || v.includes('audio')) return 'Voice call'
  if (v.includes('project') || v.includes('review')) return 'Project Review'
  return 'Chat'
}
