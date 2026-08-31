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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          payload: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          application_status: string
          company: string
          created_at: string
          description: string | null
          id: string
          liked: boolean | null
          location: string | null
          required_skills: string[]
          seniority: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_status?: string
          company: string
          created_at?: string
          description?: string | null
          id?: string
          liked?: boolean | null
          location?: string | null
          required_skills?: string[]
          seniority?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_status?: string
          company?: string
          created_at?: string
          description?: string | null
          id?: string
          liked?: boolean | null
          location?: string | null
          required_skills?: string[]
          seniority?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          certifications: Json
          created_at: string
          date_of_birth: string | null
          education: Json
          email: string | null
          experience: Json
          full_name: string | null
          goal: string | null
          id: string
          interests: string[]
          location: string | null
          nationality: string | null
          onboarding_complete: boolean
          onboarding_stage: string
          phone: string | null
          photo_url: string | null
          roadmap_generated: boolean
          skills: string[]
          timeline: string | null
          timeline_months: number | null
          updated_at: string
        }
        Insert: {
          certifications?: Json
          created_at?: string
          date_of_birth?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          goal?: string | null
          id: string
          interests?: string[]
          location?: string | null
          nationality?: string | null
          onboarding_complete?: boolean
          onboarding_stage?: string
          phone?: string | null
          photo_url?: string | null
          roadmap_generated?: boolean
          skills?: string[]
          timeline?: string | null
          timeline_months?: number | null
          updated_at?: string
        }
        Update: {
          certifications?: Json
          created_at?: string
          date_of_birth?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          goal?: string | null
          id?: string
          interests?: string[]
          location?: string | null
          nationality?: string | null
          onboarding_complete?: boolean
          onboarding_stage?: string
          phone?: string | null
          photo_url?: string | null
          roadmap_generated?: boolean
          skills?: string[]
          timeline?: string | null
          timeline_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          created_at: string
          detail: string | null
          difficulty: string | null
          done: boolean
          id: string
          item_type: string
          order_index: number
          progress_count: number
          proof_path: string | null
          proof_url: string | null
          provider: string | null
          skill_id: string
          target_count: number | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          difficulty?: string | null
          done?: boolean
          id?: string
          item_type: string
          order_index?: number
          progress_count?: number
          proof_path?: string | null
          proof_url?: string | null
          provider?: string | null
          skill_id: string
          target_count?: number | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          difficulty?: string | null
          done?: boolean
          id?: string
          item_type?: string
          order_index?: number
          progress_count?: number
          proof_path?: string | null
          proof_url?: string | null
          provider?: string | null
          skill_id?: string
          target_count?: number | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "roadmap_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_phases: {
        Row: {
          blurb: string | null
          created_at: string
          id: string
          kind: string
          name: string
          order_index: number
          user_id: string
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          order_index?: number
          user_id: string
        }
        Update: {
          blurb?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          order_index?: number
          user_id?: string
        }
        Relationships: []
      }
      roadmap_skills: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          phase_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          phase_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          phase_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_skills_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "roadmap_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
