export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          admin_id: string | null
          action_type: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
          id: string
        }
        Insert: {
          admin_id?: string | null
          action_type: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
          id?: string
        }
        Update: {
          admin_id?: string | null
          action_type?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          read_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_email: string
          user_id: string
          user_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_email: string
          user_id: string
          user_role: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          read_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_email?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      cleaner_unavailability: {
        Row: {
          cleaner_id: string
          created_at: string
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          cleaner_id: string
          created_at?: string
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          cleaner_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      cleaner_pricing: {
        Row: {
          user_id: string
          created_at: string | null
          id: string
          price_one_plus_one: number | null
          price_studio: number | null
          price_two_plus_one: number | null
          complex_id: string
          updated_at: string | null
        }
        Insert: {
          user_id: string
          created_at?: string | null
          id?: string
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          complex_id: string
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          created_at?: string | null
          id?: string
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          complex_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_pricing_residential_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "residential_complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      completion_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogs: {
        Row: {
          cleaner_id: string
          cleaner_last_read_at: string | null
          created_at: string
          id: string
          manager_id: string
          manager_last_read_at: string | null
        }
        Insert: {
          cleaner_id: string
          cleaner_last_read_at?: string | null
          created_at?: string
          id?: string
          manager_id: string
          manager_last_read_at?: string | null
        }
        Update: {
          cleaner_id?: string
          cleaner_last_read_at?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          manager_last_read_at?: string | null
        }
        Relationships: []
      }
      message_files: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          dialog_id: string
          id: string
          sender_id: string
          sender_role: string
          text: string
        }
        Insert: {
          created_at?: string
          dialog_id: string
          id?: string
          sender_id: string
          sender_role: string
          text: string
        }
        Update: {
          created_at?: string
          dialog_id?: string
          id?: string
          sender_id?: string
          sender_role?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_dialog_id_fkey"
            columns: ["dialog_id"]
            isOneToOne: false
            referencedRelation: "dialogs"
            referencedColumns: ["id"]
          },
        ]
      }
      objects: {
        Row: {
          apartment_number: string
          apartment_type: string | null
          complex_name: string
          created_at: string
          id: string
          is_archived: boolean
          residential_complex_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment_number: string
          apartment_type?: string | null
          complex_name: string
          created_at?: string
          id?: string
          is_archived?: boolean
          residential_complex_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment_number?: string
          apartment_type?: string | null
          complex_name?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          residential_complex_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objects_residential_complex_id_fkey"
            columns: ["residential_complex_id"]
            isOneToOne: false
            referencedRelation: "residential_complexes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cleaner_id: string
          cleaner_rating: number | null
          created_at: string
          id: string
          manager_id: string
          object_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          cleaner_id: string
          cleaner_rating?: number | null
          created_at?: string
          id?: string
          manager_id: string
          object_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          cleaner_id?: string
          cleaner_rating?: number | null
          created_at?: string
          id?: string
          manager_id?: string
          object_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          completed_orders_count: number
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          price_one_plus_one: number | null
          price_studio: number | null
          price_two_plus_one: number | null
          rating: number | null
          role: string
          status: string
          telegram_chat_id: string | null
          telegram_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          completed_orders_count?: number
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          rating?: number | null
          role: string
          status?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          completed_orders_count?: number
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          rating?: number | null
          role?: string
          status?: string
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
        }
        Relationships: []
      }
      report_files: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          report_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type: string
          id?: string
          report_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_files_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "completion_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      residential_complexes: {
        Row: {
          city: string | null
          created_at: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          code: string
          title: string
        }
        Insert: {
          code: string
          title: string
        }
        Update: {
          code?: string
          title?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          id: string
          user_id: string
          item_code: string
          has_item: boolean
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_code: string
          has_item?: boolean
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_code?: string
          has_item?: boolean
          verified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const