import { supabase } from '@/integrations/supabase/client';
import { TablesInsert } from '@/integrations/supabase/types';

type AuditLogInsert = TablesInsert<'admin_audit_log'>;

export const logAdminAction = async (
  adminId: string,
  actionType: AuditLogInsert['action_type'],
  entityType: AuditLogInsert['entity_type'],
  entityId: string | null,
  metadata: Record<string, any> = {}
) => {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata,
    });

    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (e) {
    console.error('Audit logging failed unexpectedly:', e);
  }
};