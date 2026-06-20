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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          data_source: string | null
          id: string
          is_seed_data: boolean
          job_id: string
          professional_id: string
          referral_source: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_seed_data?: boolean
          job_id: string
          professional_id: string
          referral_source?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_seed_data?: boolean
          job_id?: string
          professional_id?: string
          referral_source?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hospital_follows: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospital_follows_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospital_profiles: {
        Row: {
          address: string | null
          address_verified: boolean
          avg_payment_days: number | null
          avg_response_hours: number | null
          awards: string[]
          bed_count: number | null
          certifications: string[]
          city: string | null
          cover_image_url: string | null
          created_at: string | null
          data_source: string | null
          departments: string[]
          description: string | null
          emergency_available: boolean
          established_year: number | null
          follower_count: number
          gst_verified: boolean
          hospital_name: string
          hospital_type: Database["public"]["Enums"]["hospital_type"]
          id: string
          is_seed_data: boolean
          is_verified: boolean
          latitude: number | null
          license_verified: boolean
          logo_url: string | null
          longitude: number | null
          mission: string | null
          nabh_accredited: boolean
          phone: string | null
          slug: string | null
          specialties: string[]
          state: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          website: string | null
          years_in_operation: number | null
        }
        Insert: {
          address?: string | null
          address_verified?: boolean
          avg_payment_days?: number | null
          avg_response_hours?: number | null
          awards?: string[]
          bed_count?: number | null
          certifications?: string[]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          data_source?: string | null
          departments?: string[]
          description?: string | null
          emergency_available?: boolean
          established_year?: number | null
          follower_count?: number
          gst_verified?: boolean
          hospital_name: string
          hospital_type?: Database["public"]["Enums"]["hospital_type"]
          id?: string
          is_seed_data?: boolean
          is_verified?: boolean
          latitude?: number | null
          license_verified?: boolean
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          nabh_accredited?: boolean
          phone?: string | null
          slug?: string | null
          specialties?: string[]
          state?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          website?: string | null
          years_in_operation?: number | null
        }
        Update: {
          address?: string | null
          address_verified?: boolean
          avg_payment_days?: number | null
          avg_response_hours?: number | null
          awards?: string[]
          bed_count?: number | null
          certifications?: string[]
          city?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          data_source?: string | null
          departments?: string[]
          description?: string | null
          emergency_available?: boolean
          established_year?: number | null
          follower_count?: number
          gst_verified?: boolean
          hospital_name?: string
          hospital_type?: Database["public"]["Enums"]["hospital_type"]
          id?: string
          is_seed_data?: boolean
          is_verified?: boolean
          latitude?: number | null
          license_verified?: boolean
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          nabh_accredited?: boolean
          phone?: string | null
          slug?: string | null
          specialties?: string[]
          state?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          website?: string | null
          years_in_operation?: number | null
        }
        Relationships: []
      }
      hospital_reviews: {
        Row: {
          created_at: string
          data_source: string | null
          environment_rating: number | null
          hospital_id: string
          id: string
          is_seed_data: boolean
          management_rating: number | null
          payment_rating: number | null
          professional_role: string | null
          rating: number
          review_text: string
          role_title: string
          shift_completed_date: string | null
          shift_organization_rating: number | null
          specialty: string | null
          would_work_again: boolean | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          environment_rating?: number | null
          hospital_id: string
          id?: string
          is_seed_data?: boolean
          management_rating?: number | null
          payment_rating?: number | null
          professional_role?: string | null
          rating: number
          review_text: string
          role_title: string
          shift_completed_date?: string | null
          shift_organization_rating?: number | null
          specialty?: string | null
          would_work_again?: boolean | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          environment_rating?: number | null
          hospital_id?: string
          id?: string
          is_seed_data?: boolean
          management_rating?: number | null
          payment_rating?: number | null
          professional_role?: string | null
          rating?: number
          review_text?: string
          role_title?: string
          shift_completed_date?: string | null
          shift_organization_rating?: number | null
          specialty?: string | null
          would_work_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hospital_reviews_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          compensation: number | null
          created_at: string | null
          data_source: string | null
          department: string
          description: string
          filled_at: string | null
          hospital_id: string
          id: string
          is_seed_data: boolean
          required_specialization: string
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          slug: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          compensation?: number | null
          created_at?: string | null
          data_source?: string | null
          department: string
          description: string
          filled_at?: string | null
          hospital_id: string
          id?: string
          is_seed_data?: boolean
          required_specialization: string
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          slug?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          compensation?: number | null
          created_at?: string | null
          data_source?: string | null
          department?: string
          description?: string
          filled_at?: string | null
          hospital_id?: string
          id?: string
          is_seed_data?: boolean
          required_specialization?: string
          shift_date?: string
          shift_end_time?: string
          shift_start_time?: string
          slug?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospital_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          application_id: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          recipient: string | null
          status: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient?: string | null
          status: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          anonymous_id: string | null
          created_at: string
          event_name: string
          hospital_id: string | null
          id: string
          job_id: string | null
          page: string | null
          properties: Json
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          created_at?: string
          event_name: string
          hospital_id?: string | null
          id?: string
          job_id?: string | null
          page?: string | null
          properties?: Json
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          created_at?: string
          event_name?: string
          hospital_id?: string | null
          id?: string
          job_id?: string | null
          page?: string | null
          properties?: Json
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          available: boolean | null
          bio: string | null
          created_at: string | null
          data_source: string | null
          experience_years: number | null
          id: string
          is_seed_data: boolean
          license_number: string | null
          qualifications: string | null
          specialization: string
          updated_at: string | null
          user_id: string
          verification_document_url: string | null
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_status: string
          verification_submitted_at: string | null
        }
        Insert: {
          available?: boolean | null
          bio?: string | null
          created_at?: string | null
          data_source?: string | null
          experience_years?: number | null
          id?: string
          is_seed_data?: boolean
          license_number?: string | null
          qualifications?: string | null
          specialization: string
          updated_at?: string | null
          user_id: string
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Update: {
          available?: boolean | null
          bio?: string | null
          created_at?: string | null
          data_source?: string | null
          experience_years?: number | null
          id?: string
          is_seed_data?: boolean
          license_number?: string | null
          qualifications?: string | null
          specialization?: string
          updated_at?: string | null
          user_id?: string
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_status?: string
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          data_source: string | null
          email: string | null
          full_name: string
          id: string
          is_seed_data: boolean
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          email?: string | null
          full_name: string
          id: string
          is_seed_data?: boolean
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_seed_data?: boolean
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_anonymous_links: {
        Row: {
          anonymous_id: string
          linked_at: string
          user_id: string
        }
        Insert: {
          anonymous_id: string
          linked_at?: string
          user_id: string
        }
        Update: {
          anonymous_id?: string
          linked_at?: string
          user_id?: string
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
      waitlist: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          email: string
          id: string
          ip_address: string | null
          language: string | null
          latitude: number | null
          longitude: number | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          timezone: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email: string
          id?: string
          ip_address?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          timezone?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          language?: string | null
          latitude?: number | null
          longitude?: number | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          timezone?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      business_metrics: {
        Row: {
          accepted_application_rate_pct: number | null
          accepted_applications: number | null
          applications_last_7d: number | null
          applications_per_open_job: number | null
          closed_jobs: number | null
          filled_jobs: number | null
          jobs_posted_last_7d: number | null
          open_jobs: number | null
          pending_applications: number | null
          total_applications: number | null
          total_hospitals: number | null
          total_jobs: number | null
          total_professionals: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _analytics_biggest_leak: { Args: { p_steps: Json }; Returns: Json }
      _analytics_dropoff_counts: {
        Args: { p_since: string; p_until: string }
        Returns: {
          cnt: number
          stage: string
        }[]
      }
      _analytics_funnel_steps:
        | {
            Args: { p_event_groups: Json; p_since: string; p_until: string }
            Returns: Json
          }
        | {
            Args: { p_event_groups: string[]; p_since: string; p_until: string }
            Returns: Json
          }
      _analytics_journey_status: {
        Args: { p_events: string[] }
        Returns: string
      }
      _analytics_norm_source: { Args: { p_source: string }; Returns: string }
      _analytics_period_delta: {
        Args: { p_current: number; p_previous: number }
        Returns: number
      }
      _analytics_session_dropoff_stage: {
        Args: { p_events: string[] }
        Returns: string
      }
      _analytics_session_key: {
        Args: { p_id: string; p_session_id: string }
        Returns: string
      }
      _event_job_ref: {
        Args: { p_job_id: string; p_properties: Json }
        Returns: string
      }
      _founder_action_row: {
        Args: {
          p_category: string
          p_id: string
          p_impact: string
          p_investigate_href: string
          p_priority?: number
          p_severity: string
          p_suggested_action: string
          p_title: string
        }
        Returns: Json
      }
      _mask_phone: { Args: { p_phone: string }; Returns: string }
      _reconciliation_row: {
        Args: {
          p_key: string
          p_label: string
          p_source_a_label: string
          p_source_a_value: number
          p_source_b_label: string
          p_source_b_value: number
        }
        Returns: Json
      }
      _recovery_dropoff_stage: { Args: { p_events: string[] }; Returns: string }
      _recovery_high_intent: {
        Args: {
          p_events: string[]
          p_last_activity: string
          p_top_job_views: number
        }
        Returns: boolean
      }
      _recovery_segment_key: { Args: { p_stage: string }; Returns: string }
      _test_row: {
        Args: {
          p_detail: string
          p_id: string
          p_name: string
          p_status: string
        }
        Returns: Json
      }
      _verification_metric:
        | {
            Args: {
              p_calculated_at: string
              p_key: string
              p_label: string
              p_note?: string
              p_raw_count: number
              p_source_events: string[]
              p_source_tables: string[]
              p_sql: string
              p_tracked?: boolean
              p_value: string
              p_value_numeric: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_calculated_at: string
              p_category?: string
              p_key: string
              p_label: string
              p_note?: string
              p_raw_count: number
              p_source_events: string[]
              p_source_tables: string[]
              p_sql: string
              p_tracked?: boolean
              p_value: string
              p_value_numeric: number
            }
            Returns: Json
          }
      admin_get_acquisition_breakdown: {
        Args: { p_days?: number }
        Returns: Json
      }
      admin_get_analytics_confidence: { Args: never; Returns: Json }
      admin_get_analytics_test_suite: { Args: never; Returns: Json }
      admin_get_application_funnel: { Args: { p_days?: number }; Returns: Json }
      admin_get_cron_status: { Args: never; Returns: Json }
      admin_get_dropoff_analysis: { Args: { p_days?: number }; Returns: Json }
      admin_get_event_counts: {
        Args: { p_since: string; p_until?: string }
        Returns: {
          event_count: number
          event_name: string
        }[]
      }
      admin_get_founder_actions: { Args: { p_hours?: number }; Returns: Json }
      admin_get_founder_dashboard: { Args: never; Returns: Json }
      admin_get_founder_metric_records: {
        Args: { p_limit?: number; p_metric_key: string; p_offset?: number }
        Returns: Json
      }
      admin_get_founder_metric_verification: { Args: never; Returns: Json }
      admin_get_founder_reconciliation: { Args: never; Returns: Json }
      admin_get_founder_recovery: {
        Args: { p_days?: number; p_limit?: number; p_segment?: string }
        Returns: Json
      }
      admin_get_hospital_funnel: { Args: { p_days?: number }; Returns: Json }
      admin_get_hospital_leaderboards: {
        Args: { p_days?: number }
        Returns: Json
      }
      admin_get_recovery_detail: {
        Args: { p_session_id?: string; p_user_id?: string }
        Returns: Json
      }
      admin_get_session_timeline: {
        Args: { p_session_id: string }
        Returns: Json
      }
      admin_get_slow_query_count: { Args: never; Returns: number }
      admin_get_user_journeys: {
        Args: { p_days?: number; p_limit?: number }
        Returns: Json
      }
      founder_specialty_bucket: {
        Args: { dept: string; spec: string }
        Returns: string
      }
      generate_hospital_slug: {
        Args: { hospital_id: string; name: string }
        Returns: string
      }
      generate_job_slug: {
        Args: { city: string; job_id: string; job_title: string }
        Returns: string
      }
      get_hospital_public_profile: { Args: { p_slug: string }; Returns: Json }
      get_nearby_discovery: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_anonymous_to_user: {
        Args: { p_anonymous_id: string; p_user_id: string }
        Returns: undefined
      }
      list_pending_verifications: {
        Args: never
        Returns: {
          experience_years: number
          full_name: string
          license_number: string
          profile_id: string
          specialization: string
          user_id: string
          verification_document_url: string
          verification_submitted_at: string
        }[]
      }
      review_professional_verification: {
        Args: { p_approve: boolean; p_notes?: string; p_profile_id: string }
        Returns: {
          available: boolean | null
          bio: string | null
          created_at: string | null
          data_source: string | null
          experience_years: number | null
          id: string
          is_seed_data: boolean
          license_number: string | null
          qualifications: string | null
          specialization: string
          updated_at: string | null
          user_id: string
          verification_document_url: string | null
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_status: string
          verification_submitted_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "professional_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "hospital" | "professional" | "admin"
      application_status: "pending" | "accepted" | "rejected"
      blog_post_status: "draft" | "published"
      hospital_type:
        | "hospital"
        | "clinic"
        | "diagnostic_centre"
        | "wellness_centre"
        | "multi_speciality_hospital"
        | "corporate_hospital"
        | "teaching_hospital"
      job_status: "open" | "filled" | "closed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["hospital", "professional", "admin"],
      application_status: ["pending", "accepted", "rejected"],
      blog_post_status: ["draft", "published"],
      hospital_type: [
        "hospital",
        "clinic",
        "diagnostic_centre",
        "wellness_centre",
        "multi_speciality_hospital",
        "corporate_hospital",
        "teaching_hospital",
      ],
      job_status: ["open", "filled", "closed"],
    },
  },
} as const
