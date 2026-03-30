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
          action_type: string
          admin_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
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
      cleaner_disabled_times: {
        Row: {
          cleaner_id: string
          created_at: string
          id: string
          time_slot: string
        }
        Insert: {
          cleaner_id: string
          created_at?: string
          id?: string
          time_slot: string
        }
        Update: {
          cleaner_id?: string
          created_at?: string
          id?: string
          time_slot?: string
        }
        Relationships: []
      }
      cleaner_pricing: {
        Row: {
          complex_id: string
          created_at: string | null
          id: string
          price_one_plus_one: number | null
          price_studio: number | null
          price_two_plus_one: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          complex_id: string
          created_at?: string | null
          id?: string
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          complex_id?: string
          created_at?: string | null
          id?: string
          price_one_plus_one?: number | null
          price_studio?: number | null
          price_two_plus_one?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_pricing_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "residential_complexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaner_pricing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      levels: {
        Row: {
          level: number
          min_cleanings: number
          min_rating: number
          title: string
        }
        Insert: {
          level: number
          min_cleanings: number
          min_rating: number
          title: string
        }
        Update: {
          level?: number
          min_cleanings?: number
          min_rating?: number
          title?: string
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
          complex_id: string | null
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
          complex_id?: string | null
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
          complex_id?: string | null
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
            foreignKeyName: "objects_complex_id_fkey"
            columns: ["complex_id"]
            isOneToOne: false
            referencedRelation: "residential_complexes"
            referencedColumns: ["id"]
          },
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
          airbnb_profile_link: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          manual_orders_adjustment: number | null
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
          airbnb_profile_link?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          manual_orders_adjustment?: number | null
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
          airbnb_profile_link?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          manual_orders_adjustment?: number | null
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
      user_inventory: {
        Row: {
          created_at: string | null
          has_item: boolean | null
          id: string
          item_code: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          has_item?: boolean | null
          id?: string
          item_code?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          has_item?: boolean | null
          id?: string
          item_code?: string | null
          user_id?: string | null
          verified?: boolean | null
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
          },
        ]
      }
    }
    Views: {
      cleaner_stats_view: {
        Row: {
          avg_rating: number | null
          clean_jobs: number | null
          clean_rate: number | null
          cleaner_id: string | null
          final_cleanings: number | null
          total_cleanings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_cleaner_level: {
        Args: { p_cleaner_id: string }
        Returns: {
          level: number
          min_cleanings: number
          min_rating: number
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "levels"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_cleaner: { Args: never; Returns: boolean }
      is_demo_cleaner: { Args: never; Returns: boolean }
      is_demo_manager: { Args: { _manager_id: string }; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_real_cleaner: { Args: never; Returns: boolean }
      is_real_manager: { Args: { _manager_id: string }; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
