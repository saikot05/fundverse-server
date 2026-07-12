export const USER_ROLES = ['supporter', 'creator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CAMPAIGN_CATEGORIES = ['Tech', 'Creative', 'Community', 'Charity', 'Gaming'] as const;
export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number];

export const CAMPAIGN_STATUSES = ['pending', 'active', 'rejected', 'completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
