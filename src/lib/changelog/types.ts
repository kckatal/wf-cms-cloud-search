export interface ProfileChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface ChangelogEntry {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  agentSlug: string;
  userSub: string;
  userEmail: string | null;
  userName: string | null;
  changes: ProfileChange[];
}

export interface ChangelogListResult {
  entries: ChangelogEntry[];
  total: number;
}
