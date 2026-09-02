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
          thread_id: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json | null
          role?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_engagement: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rsvp_status: string
          saved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rsvp_status?: string
          saved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rsvp_status?: string
          saved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_engagement_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reflections: {
        Row: {
          attended: boolean
          contacts: string[]
          created_at: string
          event_id: string
          id: string
          rating: number | null
          takeaway: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean
          contacts?: string[]
          created_at?: string
          event_id: string
          id?: string
          rating?: number | null
          takeaway?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean
          contacts?: string[]
          created_at?: string
          event_id?: string
          id?: string
          rating?: number | null
          takeaway?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reflections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          cohort_going: number
          cost: string
          country: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string
          external_id: string
          format: string
          id: string
          last_seen_at: string
          lat: number | null
          lng: number | null
          organizer: string
          price_text: string | null
          skill_tags: string[]
          source: string
          starts_at: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          city?: string | null
          cohort_going?: number
          cost?: string
          country?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type: string
          external_id: string
          format?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          organizer: string
          price_text?: string | null
          skill_tags?: string[]
          source: string
          starts_at: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          city?: string | null
          cohort_going?: number
          cost?: string
          country?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          external_id?: string
          format?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          organizer?: string
          price_text?: string | null
          skill_tags?: string[]
          source?: string
          starts_at?: string
          title?: string
          updated_at?: string
          url?: string
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
          is_example: boolean
          liked: boolean | null
          location: string | null
          required_skills: string[]
          seniority: string | null
          source: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          application_status?: string
          company: string
          created_at?: string
          description?: string | null
          id?: string
          is_example?: boolean
          liked?: boolean | null
          location?: string | null
          required_skills?: string[]
          seniority?: string | null
          source?: string
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          application_status?: string
          company?: string
          created_at?: string
          description?: string | null
          id?: string
          is_example?: boolean
          liked?: boolean | null
          location?: string | null
          required_skills?: string[]
          seniority?: string | null
          source?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mentor_actions: {
        Row: {
          created_at: string
          detail: string | null
          done: boolean
          due_date: string | null
          id: string
          mentor_id: string | null
          roadmap_item_id: string | null
          session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          mentor_id?: string | null
          roadmap_item_id?: string | null
          session_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          mentor_id?: string | null
          roadmap_item_id?: string | null
          session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_actions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_actions_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_matches: {
        Row: {
          created_at: string
          id: string
          matched_attributes: string[]
          mentor_id: string
          reasons: string[]
          score: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_attributes?: string[]
          mentor_id: string
          reasons?: string[]
          score?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_attributes?: string[]
          mentor_id?: string
          reasons?: string[]
          score?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_matches_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_preferences: {
        Row: {
          availability_notes: string | null
          completed_at: string | null
          created_at: string
          goal: string | null
          guidance_style: string | null
          language: string | null
          location_pref: string
          next_check_in_at: string | null
          preferred_time_of_day: string | null
          priority_skills: string[]
          reminder_cadence: string
          reminder_pending: boolean
          selected_mentor_id: string | null
          session_focus: string | null
          target_role: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_notes?: string | null
          completed_at?: string | null
          created_at?: string
          goal?: string | null
          guidance_style?: string | null
          language?: string | null
          location_pref?: string
          next_check_in_at?: string | null
          preferred_time_of_day?: string | null
          priority_skills?: string[]
          reminder_cadence?: string
          reminder_pending?: boolean
          selected_mentor_id?: string | null
          session_focus?: string | null
          target_role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_notes?: string | null
          completed_at?: string | null
          created_at?: string
          goal?: string | null
          guidance_style?: string | null
          language?: string | null
          location_pref?: string
          next_check_in_at?: string | null
          preferred_time_of_day?: string | null
          priority_skills?: string[]
          reminder_cadence?: string
          reminder_pending?: boolean
          selected_mentor_id?: string | null
          session_focus?: string | null
          target_role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_preferences_selected_mentor_id_fkey"
            columns: ["selected_mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          agenda: string | null
          created_at: string
          email_detail: string | null
          email_sent_at: string | null
          email_status: string
          ends_at: string
          id: string
          key_advice: string | null
          meeting_format: string
          mentor_id: string
          next_check_in_at: string | null
          prep_questions: string[]
          recap: string | null
          recap_source: string
          starts_at: string
          status: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          email_detail?: string | null
          email_sent_at?: string | null
          email_status?: string
          ends_at: string
          id?: string
          key_advice?: string | null
          meeting_format?: string
          mentor_id: string
          next_check_in_at?: string | null
          prep_questions?: string[]
          recap?: string | null
          recap_source?: string
          starts_at: string
          status?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          email_detail?: string | null
          email_sent_at?: string | null
          email_status?: string
          ends_at?: string
          id?: string
          key_advice?: string | null
          meeting_format?: string
          mentor_id?: string
          next_check_in_at?: string | null
          prep_questions?: string[]
          recap?: string | null
          recap_source?: string
          starts_at?: string
          status?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          availability_summary: string
          bio: string
          city: string | null
          community: string | null
          company: string
          contact_email: string | null
          country: string | null
          created_at: string
          expertise: string[]
          external_id: string
          full_name: string
          id: string
          is_demo: boolean
          languages: string[]
          lat: number | null
          lng: number | null
          meeting_pref: string
          role_track: string
          seniority: string
          slots: Json
          title: string
          topics: string[]
          years_experience: number
        }
        Insert: {
          availability_summary?: string
          bio: string
          city?: string | null
          community?: string | null
          company: string
          contact_email?: string | null
          country?: string | null
          created_at?: string
          expertise?: string[]
          external_id: string
          full_name: string
          id?: string
          is_demo?: boolean
          languages?: string[]
          lat?: number | null
          lng?: number | null
          meeting_pref?: string
          role_track: string
          seniority: string
          slots?: Json
          title: string
          topics?: string[]
          years_experience?: number
        }
        Update: {
          availability_summary?: string
          bio?: string
          city?: string | null
          community?: string | null
          company?: string
          contact_email?: string | null
          country?: string | null
          created_at?: string
          expertise?: string[]
          external_id?: string
          full_name?: string
          id?: string
          is_demo?: boolean
          languages?: string[]
          lat?: number | null
          lng?: number | null
          meeting_pref?: string
          role_track?: string
          seniority?: string
          slots?: Json
          title?: string
          topics?: string[]
          years_experience?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          certifications: Json
          created_at: string
          date_of_birth: string | null
          drawn_to: string | null
          education: Json
          email: string | null
          experience: Json
          full_name: string | null
          goal: string | null
          id: string
          interests: string[]
          location: string | null
          location_pref: string | null
          nationality: string | null
          onboarding_complete: boolean
          onboarding_stage: string
          phone: string | null
          photo_url: string | null
          recent_role: string | null
          roadmap_generated: boolean
          skill_confidence: Json
          skills: string[]
          timeline: string | null
          timeline_months: number | null
          updated_at: string
          weekly_hours: number | null
          work_auth: string | null
          work_setup: string[]
        }
        Insert: {
          certifications?: Json
          created_at?: string
          date_of_birth?: string | null
          drawn_to?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          goal?: string | null
          id: string
          interests?: string[]
          location?: string | null
          location_pref?: string | null
          nationality?: string | null
          onboarding_complete?: boolean
          onboarding_stage?: string
          phone?: string | null
          photo_url?: string | null
          recent_role?: string | null
          roadmap_generated?: boolean
          skill_confidence?: Json
          skills?: string[]
          timeline?: string | null
          timeline_months?: number | null
          updated_at?: string
          weekly_hours?: number | null
          work_auth?: string | null
          work_setup?: string[]
        }
        Update: {
          certifications?: Json
          created_at?: string
          date_of_birth?: string | null
          drawn_to?: string | null
          education?: Json
          email?: string | null
          experience?: Json
          full_name?: string | null
          goal?: string | null
          id?: string
          interests?: string[]
          location?: string | null
          location_pref?: string | null
          nationality?: string | null
          onboarding_complete?: boolean
          onboarding_stage?: string
          phone?: string | null
          photo_url?: string | null
          recent_role?: string | null
          roadmap_generated?: boolean
          skill_confidence?: Json
          skills?: string[]
          timeline?: string | null
          timeline_months?: number | null
          updated_at?: string
          weekly_hours?: number | null
          work_auth?: string | null
          work_setup?: string[]
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
      session_feedback: {
        Row: {
          attended: boolean
          comments: string | null
          continue_with_mentor: boolean
          created_at: string
          followup_request: string | null
          helpful: string | null
          id: string
          mentor_id: string | null
          rating: number | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          comments?: string | null
          continue_with_mentor?: boolean
          created_at?: string
          followup_request?: string | null
          helpful?: string | null
          id?: string
          mentor_id?: string | null
          rating?: number | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          comments?: string | null
          continue_with_mentor?: boolean
          created_at?: string
          followup_request?: string | null
          helpful?: string | null
          id?: string
          mentor_id?: string | null
          rating?: number | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "mentor_sessions"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
