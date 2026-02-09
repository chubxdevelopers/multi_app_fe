export interface User {
  id: string;
  name: string;
  email?: string;
  role_id?: number;
  team_id?: number;
  company_id?: number;
  uiPermissions?: Array<{ feature_tag: string }>;
}
