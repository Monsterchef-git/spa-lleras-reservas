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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_audit_log: {
        Row: {
          action: string
          booking_id: string | null
          changed_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          booking_id?: string | null
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          booking_id?: string | null
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          price_cop: number
          price_usd: number
          quantity: number
          service_duration_id: string | null
          service_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          price_cop?: number
          price_usd?: number
          quantity?: number
          service_duration_id?: string | null
          service_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          price_cop?: number
          price_usd?: number
          quantity?: number
          service_duration_id?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_service_duration_id_fkey"
            columns: ["service_duration_id"]
            isOneToOne: false
            referencedRelation: "service_durations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          client_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string
          id: string
          last_notification_sent: Json | null
          nationality: string | null
          notes: string | null
          preferred_language: string | null
          price_cop: number | null
          price_usd: number | null
          resource_id: string | null
          second_therapist_id: string | null
          service_duration_id: string | null
          service_id: string | null
          source: Database["public"]["Enums"]["booking_source"] | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: string
          last_notification_sent?: Json | null
          nationality?: string | null
          notes?: string | null
          preferred_language?: string | null
          price_cop?: number | null
          price_usd?: number | null
          resource_id?: string | null
          second_therapist_id?: string | null
          service_duration_id?: string | null
          service_id?: string | null
          source?: Database["public"]["Enums"]["booking_source"] | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: string
          last_notification_sent?: Json | null
          nationality?: string | null
          notes?: string | null
          preferred_language?: string | null
          price_cop?: number | null
          price_usd?: number | null
          resource_id?: string | null
          second_therapist_id?: string | null
          service_duration_id?: string | null
          service_id?: string | null
          source?: Database["public"]["Enums"]["booking_source"] | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_second_therapist_id_fkey"
            columns: ["second_therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_duration_id_fkey"
            columns: ["service_duration_id"]
            isOneToOne: false
            referencedRelation: "service_durations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          type: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          type: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          type?: string
        }
        Relationships: []
      }
      service_durations: {
        Row: {
          duration_minutes: number
          id: string
          price_cop: number
          price_usd: number
          service_id: string
        }
        Insert: {
          duration_minutes: number
          id?: string
          price_cop: number
          price_usd: number
          service_id: string
        }
        Update: {
          duration_minutes?: number
          id?: string
          price_cop?: number
          price_usd?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_durations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_addon: boolean | null
          name: string
          notes: string | null
          requires_two_therapists: boolean | null
          updated_at: string | null
          uses_rooftop: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_addon?: boolean | null
          name: string
          notes?: string | null
          requires_two_therapists?: boolean | null
          updated_at?: string | null
          uses_rooftop?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_addon?: boolean | null
          name?: string
          notes?: string | null
          requires_two_therapists?: boolean | null
          updated_at?: string | null
          uses_rooftop?: boolean | null
        }
        Relationships: []
      }
      therapists: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          name: string
          schedule: string | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          schedule?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          schedule?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_cancel_reason: { Args: { reason: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_source: "fresha" | "whatsapp" | "email" | "walk_in" | "web"
      booking_status: "pendiente" | "confirmada" | "cancelada" | "completada"
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
    Enums: {
      app_role: ["admin", "staff"],
      booking_source: ["fresha", "whatsapp", "email", "walk_in", "web"],
      booking_status: ["pendiente", "confirmada", "cancelada", "completada"],
    },
  },
} as const
