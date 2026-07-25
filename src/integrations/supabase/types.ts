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
      academic_calendar: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_name: string
          id: string
          is_student_created: boolean | null
          start_date: string
          trimester: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_name: string
          id?: string
          is_student_created?: boolean | null
          start_date: string
          trimester?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_name?: string
          id?: string
          is_student_created?: boolean | null
          start_date?: string
          trimester?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: string
          created_at: string
          id: string
          openai_thread_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_type?: string
          created_at?: string
          id?: string
          openai_thread_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_type?: string
          created_at?: string
          id?: string
          openai_thread_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          description: string | null
          faculty: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          faculty: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          faculty?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          material_id: string | null
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          material_id?: string | null
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          material_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      document_hashes: {
        Row: {
          content_hash: string
          created_at: string | null
          file_name: string
          id: string
          material_id: string | null
          unit_id: string | null
          uploaded_by: string
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          file_name: string
          id?: string
          material_id?: string | null
          unit_id?: string | null
          uploaded_by: string
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          file_name?: string
          id?: string
          material_id?: string | null
          unit_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_hashes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_hashes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          chunk_count: number | null
          created_at: string
          document_type: string
          downloads: number
          embedding_status: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          openai_file_id: string | null
          storage_path: string | null
          title: string
          unit_id: string
          uploaded_by: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          document_type?: string
          downloads?: number
          embedding_status?: string | null
          file_name: string
          file_size?: number
          file_type: string
          id?: string
          openai_file_id?: string | null
          storage_path?: string | null
          title: string
          unit_id: string
          uploaded_by: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          document_type?: string
          downloads?: number
          embedding_status?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          openai_file_id?: string | null
          storage_path?: string | null
          title?: string
          unit_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string | null
          group_emails: Json | null
          id: string
          paid_at: string | null
          paystack_access_code: string | null
          paystack_reference: string | null
          plan_type: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string | null
          group_emails?: Json | null
          id?: string
          paid_at?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan_type?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string | null
          group_emails?: Json | null
          id?: string
          paid_at?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admission_number: string | null
          avatar_url: string | null
          course: string | null
          course_name: string | null
          created_at: string
          email: string
          id: string
          name: string
          program: string | null
          semester: string | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          admission_number?: string | null
          avatar_url?: string | null
          course?: string | null
          course_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          program?: string | null
          semester?: string | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          admission_number?: string | null
          avatar_url?: string | null
          course?: string | null
          course_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          program?: string | null
          semester?: string | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      student_memory: {
        Row: {
          content: string
          created_at: string | null
          id: string
          last_seen_at: string | null
          memory_type: string
          strength_level: number | null
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          memory_type?: string
          strength_level?: number | null
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          memory_type?: string
          strength_level?: number | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_units: {
        Row: {
          created_at: string
          id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      teach_me_sessions: {
        Row: {
          checkpoint_scores: Json
          completed_topics: Json
          created_at: string | null
          current_topic_index: number
          eli5_triggers: number
          exam_readiness_score: number | null
          focus_mode: boolean
          id: string
          metadata: Json | null
          predicted_q_score: number | null
          session_recap: Json | null
          status: string
          streak_days: number | null
          strong_topics: Json | null
          thread_id: string
          topic_outline: Json
          unit_name: string
          updated_at: string | null
          user_id: string
          weak_topics: Json | null
        }
        Insert: {
          checkpoint_scores?: Json
          completed_topics?: Json
          created_at?: string | null
          current_topic_index?: number
          eli5_triggers?: number
          exam_readiness_score?: number | null
          focus_mode?: boolean
          id?: string
          metadata?: Json | null
          predicted_q_score?: number | null
          session_recap?: Json | null
          status?: string
          streak_days?: number | null
          strong_topics?: Json | null
          thread_id: string
          topic_outline?: Json
          unit_name: string
          updated_at?: string | null
          user_id: string
          weak_topics?: Json | null
        }
        Update: {
          checkpoint_scores?: Json
          completed_topics?: Json
          created_at?: string | null
          current_topic_index?: number
          eli5_triggers?: number
          exam_readiness_score?: number | null
          focus_mode?: boolean
          id?: string
          metadata?: Json | null
          predicted_q_score?: number | null
          session_recap?: Json | null
          status?: string
          streak_days?: number | null
          strong_topics?: Json | null
          thread_id?: string
          topic_outline?: Json
          unit_name?: string
          updated_at?: string | null
          user_id?: string
          weak_topics?: Json | null
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          created_at: string
          id: string
          model: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          tokens_used: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lecturer: string | null
          name: string
          openai_vector_store_id: string | null
          semester: number
          year: number
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lecturer?: string | null
          name: string
          openai_vector_store_id?: string | null
          semester: number
          year: number
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lecturer?: string | null
          name?: string
          openai_vector_store_id?: string | null
          semester?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_daily_token_usage: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_documents_for_units: {
        Args: {
          allowed_unit_ids: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          material_id: string
          metadata: Json
          similarity: number
          unit_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student" | "lecturer"
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
      app_role: ["admin", "student", "lecturer"],
    },
  },
} as const
