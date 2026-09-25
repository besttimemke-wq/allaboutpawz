export interface CrmCampaign {
  id: string; tenant_id: string; name: string; campaign_type: string; status: string;
  channel: string; template_id: string | null; segment_definition: any;
  scheduled_at: string | null; started_at: string | null; completed_at: string | null;
  created_by: string | null; created_at: string; updated_at: string;
  // Joined
  template_name?: string | null; member_count?: number;
}

export interface CrmCampaignMember {
  id: string; tenant_id: string; campaign_id: string; customer_id: string;
  status: string; enrolled_at: string; sent_at: string | null;
  converted_at: string | null; failure_reason: string | null;
}

export interface CrmAutomationWorkflow {
  id: string; tenant_id: string; name: string; workflow_type: string;
  status: string; trigger_definition: any; condition_definition: any;
  action_definition: any; allow_reentry: boolean;
  created_by: string | null; created_at: string; updated_at: string;
  // Joined
  enrollment_count?: number;
}

export interface CrmAutomationEnrollment {
  id: string; tenant_id: string; workflow_id: string; customer_id: string | null;
  pet_id: string | null; appointment_id: string | null; status: string;
  current_step: number; scheduled_for: string | null;
  started_at: string | null; completed_at: string | null;
  last_error: string | null; context: any; created_at: string;
}

export interface CrmMessageTemplate {
  id: string; tenant_id: string; name: string; channel: string;
  subject: string | null; body: string; variables: any;
  category: string | null; is_system: boolean; is_active: boolean;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface CrmSegment {
  id: string; tenant_id: string; name: string; description: string | null;
  entity_type: string; definition: any; segment_type: string;
  is_active: boolean; created_at: string; updated_at: string;
  // Joined
  member_count?: number;
}
