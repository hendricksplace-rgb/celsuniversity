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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          email: string | null
          id: string
          reason: string | null
          requested_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          email?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          email?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          at: string
          before: Json | null
          course_id: string | null
          id: number
          lesson_id: string | null
          row_id: string | null
          table_name: string
          undone_at: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          course_id?: string | null
          id?: never
          lesson_id?: string | null
          row_id?: string | null
          table_name: string
          undone_at?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          course_id?: string | null
          id?: never
          lesson_id?: string | null
          row_id?: string | null
          table_name?: string
          undone_at?: string | null
        }
        Relationships: []
      }
      answer_banks: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_jobs: {
        Row: {
          attempts: number
          created_at: string
          done_at: string | null
          duration: number | null
          error: string | null
          id: number
          kind: string
          model_id: string
          path: string
          ref: Json
          status: string
          text: string
          voice_id: string
          wt: Json | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          done_at?: string | null
          duration?: number | null
          error?: string | null
          id?: number
          kind: string
          model_id?: string
          path: string
          ref?: Json
          status?: string
          text: string
          voice_id: string
          wt?: Json | null
        }
        Update: {
          attempts?: number
          created_at?: string
          done_at?: string | null
          duration?: number | null
          error?: string | null
          id?: number
          kind?: string
          model_id?: string
          path?: string
          ref?: Json
          status?: string
          text?: string
          voice_id?: string
          wt?: Json | null
        }
        Relationships: []
      }
      audio_transcripts: {
        Row: {
          created_at: string
          done_at: string | null
          error: string | null
          language: string | null
          path: string
          status: string
          text: string | null
          words: Json | null
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          error?: string | null
          language?: string | null
          path: string
          status?: string
          text?: string | null
          words?: Json | null
        }
        Update: {
          created_at?: string
          done_at?: string | null
          error?: string | null
          language?: string | null
          path?: string
          status?: string
          text?: string | null
          words?: Json | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          active: boolean
          code: string
          color: string
          name: string
          requirement: string
          rule: Json
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          color: string
          name: string
          requirement: string
          rule: Json
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          color?: string
          name?: string
          requirement?: string
          rule?: Json
          sort_order?: number
        }
        Relationships: []
      }
      capstone_parts: {
        Row: {
          body: string
          completed_at: string | null
          course_id: string
          fields: Json
          part: number
          source_submission_id: string | null
          sources: Json
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          completed_at?: string | null
          course_id: string
          fields?: Json
          part: number
          source_submission_id?: string | null
          sources?: Json
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          completed_at?: string | null
          course_id?: string
          fields?: Json
          part?: number
          source_submission_id?: string | null
          sources?: Json
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capstone_parts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capstone_parts_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capstone_parts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_assignments: {
        Row: {
          class_id: string
          course_id: string
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          module_id: string | null
          note: string | null
        }
        Insert: {
          class_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          module_id?: string | null
          note?: string | null
        }
        Update: {
          class_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          module_id?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_courses: {
        Row: {
          class_id: string
          course_id: string
        }
        Insert: {
          class_id: string
          course_id: string
        }
        Update: {
          class_id?: string
          course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          class_id: string
          member_role: string
          user_id: string
        }
        Insert: {
          class_id: string
          member_role: string
          user_id: string
        }
        Update: {
          class_id?: string
          member_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          duration_min: number | null
          id: string
          legacy_id: string | null
          meeting_url: string | null
          name: string
          next_session_at: string | null
          organization_id: string
          schedule_label: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          id?: string
          legacy_id?: string | null
          meeting_url?: string | null
          name: string
          next_session_at?: string | null
          organization_id: string
          schedule_label?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          id?: string
          legacy_id?: string | null
          meeting_url?: string | null
          name?: string
          next_session_at?: string | null
          organization_id?: string
          schedule_label?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          at: string
          id: number
          kind: string
          message: string
          route: string | null
          session_id: string
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          at?: string
          id?: never
          kind?: string
          message: string
          route?: string | null
          session_id: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          at?: string
          id?: never
          kind?: string
          message?: string
          route?: string | null
          session_id?: string
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_type: string
          body: string | null
          created_at: string
          data: Json
          id: string
          legacy_id: string | null
          lesson_id: string
          offline: boolean
          sort_order: number
          teacher_only: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type: string
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          legacy_id?: string | null
          lesson_id: string
          offline?: boolean
          sort_order?: number
          teacher_only?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          legacy_id?: string | null
          lesson_id?: string
          offline?: boolean
          sort_order?: number
          teacher_only?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_commitments: {
        Row: {
          course_id: string
          id: string
          lang: string
          signed_at: string
          signed_name: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          lang?: string
          signed_at?: string
          signed_name: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          lang?: string
          signed_at?: string
          signed_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_commitments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accent_color: string | null
          cover_art_url: string | null
          created_at: string
          description: string | null
          id: string
          layout: string
          legacy_id: string | null
          slug: string | null
          sort_order: number
          status: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at: string
          theme: string | null
        }
        Insert: {
          accent_color?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          layout?: string
          legacy_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at?: string
          theme?: string | null
        }
        Update: {
          accent_color?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          layout?: string
          legacy_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title?: string
          updated_at?: string
          theme?: string | null
        }
        Relationships: []
      }
      ebook_answers: {
        Row: {
          answers: Json
          completed_at: string | null
          ebook_id: string
          last_screen: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          ebook_id: string
          last_screen?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          ebook_id?: string
          last_screen?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_answers_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebook_source_text: {
        Row: {
          page: number
          path: string
          text: string | null
        }
        Insert: {
          page: number
          path: string
          text?: string | null
        }
        Update: {
          page?: number
          path?: string
          text?: string | null
        }
        Relationships: []
      }
      ebooks: {
        Row: {
          course_id: string
          cover_path: string | null
          created_at: string
          est_minutes: number | null
          format_version: number
          id: string
          pdf_path: string | null
          program: string
          quiz: Json
          resources: Json
          review_notes: string | null
          screens: Json
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          cover_path?: string | null
          created_at?: string
          est_minutes?: number | null
          format_version?: number
          id?: string
          pdf_path?: string | null
          program: string
          quiz?: Json
          resources?: Json
          review_notes?: string | null
          screens?: Json
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          cover_path?: string | null
          created_at?: string
          est_minutes?: number | null
          format_version?: number
          id?: string
          pdf_path?: string | null
          program?: string
          quiz?: Json
          resources?: Json
          review_notes?: string | null
          screens?: Json
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebooks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          created_at: string
          dedupe_key: string | null
          error: string | null
          html: string
          id: number
          kind: string
          lead_id: string | null
          order_id: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template: string | null
          to_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          html: string
          id?: number
          kind: string
          lead_id?: string | null
          order_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template?: string | null
          to_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          error?: string | null
          html?: string
          id?: number
          kind?: string
          lead_id?: string | null
          order_id?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string | null
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string | null
          course_id: string | null
          created_at: string
          enrollment_type: string
          expires_at: string | null
          id: string
          legacy_id: string | null
          order_id: string | null
          plan: string | null
          program_id: string | null
          source: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          legacy_id?: string | null
          order_id?: string | null
          plan?: string | null
          program_id?: string | null
          source?: string | null
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          legacy_id?: string | null
          order_id?: string | null
          plan?: string | null
          program_id?: string | null
          source?: string | null
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_rate_limits: {
        Row: {
          count: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          count?: number
          ip_hash: string
          window_start?: string
        }
        Update: {
          count?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      eval_sessions: {
        Row: {
          ai_calls: number
          created_at: string
          expires_at: string
          finished_at: string | null
          ip_hash: string
          result: Json | null
          speaking: Json | null
          token: string
          user_id: string | null
          writing: Json | null
          writing_text: string | null
        }
        Insert: {
          ai_calls?: number
          created_at?: string
          expires_at?: string
          finished_at?: string | null
          ip_hash: string
          result?: Json | null
          speaking?: Json | null
          token?: string
          user_id?: string | null
          writing?: Json | null
          writing_text?: string | null
        }
        Update: {
          ai_calls?: number
          created_at?: string
          expires_at?: string
          finished_at?: string | null
          ip_hash?: string
          result?: Json | null
          speaking?: Json | null
          token?: string
          user_id?: string | null
          writing?: Json | null
          writing_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_attempts: {
        Row: {
          answers: Json | null
          created_at: string
          evaluation_id: string
          id: string
          legacy_id: string | null
          passed: boolean
          score: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          evaluation_id: string
          id?: string
          legacy_id?: string | null
          passed?: boolean
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          evaluation_id?: string
          id?: string
          legacy_id?: string | null
          passed?: boolean
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_attempts_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_questions: {
        Row: {
          answer_text: string | null
          data: Json
          evaluation_id: string
          explanation: string | null
          id: string
          is_asterisked: boolean
          legacy_id: string | null
          question_text: string
          question_type: string | null
          sort_order: number
        }
        Insert: {
          answer_text?: string | null
          data?: Json
          evaluation_id: string
          explanation?: string | null
          id?: string
          is_asterisked?: boolean
          legacy_id?: string | null
          question_text: string
          question_type?: string | null
          sort_order?: number
        }
        Update: {
          answer_text?: string | null
          data?: Json
          evaluation_id?: string
          explanation?: string | null
          id?: string
          is_asterisked?: boolean
          legacy_id?: string | null
          question_text?: string
          question_type?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_questions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          archived: boolean
          bank_size: number
          exam_question_count: number
          has_audio: boolean
          id: string
          language: Database["public"]["Enums"]["lang"]
          large_text: boolean
          legacy_id: string | null
          module_id: string | null
          pass_count: number
          sort_order: number
          source_subset_of: string | null
          test_version: string | null
          title: string
        }
        Insert: {
          archived?: boolean
          bank_size?: number
          exam_question_count?: number
          has_audio?: boolean
          id?: string
          language?: Database["public"]["Enums"]["lang"]
          large_text?: boolean
          legacy_id?: string | null
          module_id?: string | null
          pass_count?: number
          sort_order?: number
          source_subset_of?: string | null
          test_version?: string | null
          title: string
        }
        Update: {
          archived?: boolean
          bank_size?: number
          exam_question_count?: number
          has_audio?: boolean
          id?: string
          language?: Database["public"]["Enums"]["lang"]
          large_text?: boolean
          legacy_id?: string | null
          module_id?: string | null
          pass_count?: number
          sort_order?: number
          source_subset_of?: string | null
          test_version?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_source_subset_of_fkey"
            columns: ["source_subset_of"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      function_errors: {
        Row: {
          at: string
          function: string
          id: number
          message: string
          status: number | null
        }
        Insert: {
          at?: string
          function: string
          id?: never
          message: string
          status?: number | null
        }
        Update: {
          at?: string
          function?: string
          id?: never
          message?: string
          status?: number | null
        }
        Relationships: []
      }
      gamification: {
        Row: {
          badges: Json
          current_streak: number
          last_activity_date: string | null
          legacy_id: string | null
          longest_streak: number
          streak_freezes: number
          total_xp: number
          user_id: string
          weekly_reset_date: string | null
          weekly_xp: number
        }
        Insert: {
          badges?: Json
          current_streak?: number
          last_activity_date?: string | null
          legacy_id?: string | null
          longest_streak?: number
          streak_freezes?: number
          total_xp?: number
          user_id: string
          weekly_reset_date?: string | null
          weekly_xp?: number
        }
        Update: {
          badges?: Json
          current_streak?: number
          last_activity_date?: string | null
          legacy_id?: string | null
          longest_streak?: number
          streak_freezes?: number
          total_xp?: number
          user_id?: string
          weekly_reset_date?: string | null
          weekly_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_saves: {
        Row: {
          course_id: string
          created_at: string
          term: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          term: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_saves_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_course_steps: {
        Row: {
          data: Json
          module_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          module_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          module_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guided_course_steps_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_step_progress: {
        Row: {
          completed_at: string | null
          module_id: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          module_id: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          module_id?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guided_step_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          admin_id: string | null
          created: number | null
          created_at: string
          details: Json | null
          failed: number | null
          id: string
          legacy_id: string | null
          skipped: number | null
          total_rows: number | null
        }
        Insert: {
          admin_id?: string | null
          created?: number | null
          created_at?: string
          details?: Json | null
          failed?: number | null
          id?: string
          legacy_id?: string | null
          skipped?: number | null
          total_rows?: number | null
        }
        Update: {
          admin_id?: string | null
          created?: number | null
          created_at?: string
          details?: Json | null
          failed?: number | null
          id?: string
          legacy_id?: string | null
          skipped?: number | null
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          audio_path: string | null
          created_at: string
          duration_s: number | null
          feedback: Json | null
          id: string
          question_key: string
          score: number | null
          session_id: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          duration_s?: number | null
          feedback?: Json | null
          id?: string
          question_key: string
          score?: number | null
          session_id: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          duration_s?: number | null
          feedback?: Json | null
          id?: string
          question_key?: string
          score?: number | null
          session_id?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          finished_at: string | null
          id: string
          mode: string
          started_at: string
          summary: Json | null
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          mode: string
          started_at?: string
          summary?: Json | null
          user_id: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      job_tokens: {
        Row: {
          name: string
          token: string
        }
        Insert: {
          name: string
          token?: string
        }
        Update: {
          name?: string
          token?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cefr_level: Database["public"]["Enums"]["cefr_level"] | null
          converted_to_student: boolean
          created_at: string
          email: string
          evaluated_at: string | null
          followup_stage: number
          goal: string | null
          id: string
          legacy_id: string | null
          name: string
          native_language: string | null
          recommended_product: string | null
          skill_levels: Json | null
          student_id: string | null
          unsubscribe_token: string
          unsubscribed: boolean
          writing_feedback: string | null
          writing_sample: string | null
        }
        Insert: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null
          converted_to_student?: boolean
          created_at?: string
          email: string
          evaluated_at?: string | null
          followup_stage?: number
          goal?: string | null
          id?: string
          legacy_id?: string | null
          name: string
          native_language?: string | null
          recommended_product?: string | null
          skill_levels?: Json | null
          student_id?: string | null
          unsubscribe_token?: string
          unsubscribed?: boolean
          writing_feedback?: string | null
          writing_sample?: string | null
        }
        Update: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null
          converted_to_student?: boolean
          created_at?: string
          email?: string
          evaluated_at?: string | null
          followup_stage?: number
          goal?: string | null
          id?: string
          legacy_id?: string | null
          name?: string
          native_language?: string | null
          recommended_product?: string | null
          skill_levels?: Json | null
          student_id?: string | null
          unsubscribe_token?: string
          unsubscribed?: boolean
          writing_feedback?: string | null
          writing_sample?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_answers: {
        Row: {
          block_id: string
          body: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id: string
          body?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          block_id?: string
          body?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_answers_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          accent_color: string | null
          created_at: string
          has_content: boolean
          icon: string | null
          id: string
          legacy_id: string | null
          lesson_type: string
          module_id: string
          sort_order: number
          status: Database["public"]["Enums"]["pub_status"]
          teacher_only: boolean
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          has_content?: boolean
          icon?: string | null
          id?: string
          legacy_id?: string | null
          lesson_type?: string
          module_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          teacher_only?: boolean
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          has_content?: boolean
          icon?: string | null
          id?: string
          legacy_id?: string | null
          lesson_type?: string
          module_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          teacher_only?: boolean
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          bucket: string
          bytes: number | null
          course_id: string | null
          created_at: string
          id: string
          mime_type: string | null
          module_id: string | null
          path: string
          source_url: string | null
        }
        Insert: {
          bucket?: string
          bytes?: number | null
          course_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          module_id?: string | null
          path: string
          source_url?: string | null
        }
        Update: {
          bucket?: string
          bytes?: number | null
          course_id?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          module_id?: string | null
          path?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          artwork_url: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          kind: string
          legacy_id: string | null
          offline_enabled: boolean
          sort_order: number
          status: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at: string
        }
        Insert: {
          artwork_url?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          legacy_id?: string | null
          offline_enabled?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at?: string
        }
        Update: {
          artwork_url?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          legacy_id?: string | null
          offline_enabled?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_downloads: {
        Row: {
          bytes: number | null
          device_id: string
          downloaded_at: string
          expires_at: string
          id: string
          last_validated_at: string
          module_id: string
          removed_at: string | null
          user_id: string
        }
        Insert: {
          bytes?: number | null
          device_id: string
          downloaded_at?: string
          expires_at?: string
          id?: string
          last_validated_at?: string
          module_id: string
          removed_at?: string | null
          user_id: string
        }
        Update: {
          bytes?: number | null
          device_id?: string
          downloaded_at?: string
          expires_at?: string
          id?: string
          last_validated_at?: string
          module_id?: string
          removed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_downloads_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_usd_cents: number | null
          buyer_name: string | null
          card_last4: string | null
          created_at: string
          email: string | null
          id: string
          paid_at: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd_cents?: number | null
          buyer_name?: string | null
          card_last4?: string | null
          created_at?: string
          email?: string | null
          id?: string
          paid_at?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd_cents?: number | null
          buyer_name?: string | null
          card_last4?: string | null
          created_at?: string
          email?: string | null
          id?: string
          paid_at?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_language: Database["public"]["Enums"]["lang"]
          id: string
          legacy_id: string | null
          logo_url: string | null
          name: string
          notes: string | null
          seat_limit: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_language?: Database["public"]["Enums"]["lang"]
          id?: string
          legacy_id?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          seat_limit?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_language?: Database["public"]["Enums"]["lang"]
          id?: string
          legacy_id?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          seat_limit?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd_cents: number
          card_last4: string | null
          created_at: string
          id: string
          kind: string
          order_id: string | null
          stripe_charge_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent: string | null
          user_id: string | null
        }
        Insert: {
          amount_usd_cents: number
          card_last4?: string | null
          created_at?: string
          id?: string
          kind: string
          order_id?: string | null
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          user_id?: string | null
        }
        Update: {
          amount_usd_cents?: number
          card_last4?: string | null
          created_at?: string
          id?: string
          kind?: string
          order_id?: string | null
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_bank: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          source: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          source?: string | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          source?: string | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrase_bank_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phrase_bank_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          access_label: string | null
          active: boolean
          code: string
          features: Json
          grants: Json
          id: string
          installments: Json | null
          name: string
          price_usd_cents: number
          program: string | null
          sort_order: number
          stripe_price_id: string | null
          tier: string | null
        }
        Insert: {
          access_label?: string | null
          active?: boolean
          code: string
          features?: Json
          grants?: Json
          id?: string
          installments?: Json | null
          name: string
          price_usd_cents: number
          program?: string | null
          sort_order?: number
          stripe_price_id?: string | null
          tier?: string | null
        }
        Update: {
          access_label?: string | null
          active?: boolean
          code?: string
          features?: Json
          grants?: Json
          id?: string
          installments?: Json | null
          name?: string
          price_usd_cents?: number
          program?: string | null
          sort_order?: number
          stripe_price_id?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          civics_representative: string | null
          civics_senator: string | null
          civics_track: string | null
          created_at: string
          display_name: string | null
          email: string | null
          evaluation_date: string | null
          evaluation_level: Database["public"]["Enums"]["cefr_level"] | null
          evaluation_skills: Json | null
          id: string
          legacy_id: string | null
          organization_id: string | null
          preferred_language: Database["public"]["Enums"]["lang"]
          role: Database["public"]["Enums"]["user_role"]
          starting_level: Database["public"]["Enums"]["cefr_level"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          civics_representative?: string | null
          civics_senator?: string | null
          civics_track?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          evaluation_date?: string | null
          evaluation_level?: Database["public"]["Enums"]["cefr_level"] | null
          evaluation_skills?: Json | null
          id: string
          legacy_id?: string | null
          organization_id?: string | null
          preferred_language?: Database["public"]["Enums"]["lang"]
          role?: Database["public"]["Enums"]["user_role"]
          starting_level?: Database["public"]["Enums"]["cefr_level"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          civics_representative?: string | null
          civics_senator?: string | null
          civics_track?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          evaluation_date?: string | null
          evaluation_level?: Database["public"]["Enums"]["cefr_level"] | null
          evaluation_skills?: Json | null
          id?: string
          legacy_id?: string | null
          organization_id?: string | null
          preferred_language?: Database["public"]["Enums"]["lang"]
          role?: Database["public"]["Enums"]["user_role"]
          starting_level?: Database["public"]["Enums"]["cefr_level"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_courses: {
        Row: {
          course_id: string
          icon_url: string | null
          id: string
          is_launcher: boolean
          launcher_label: string | null
          legacy_id: string | null
          program_id: string
          sort_order: number
        }
        Insert: {
          course_id: string
          icon_url?: string | null
          id?: string
          is_launcher?: boolean
          launcher_label?: string | null
          legacy_id?: string | null
          program_id: string
          sort_order?: number
        }
        Update: {
          course_id?: string
          icon_url?: string | null
          id?: string
          is_launcher?: boolean
          launcher_label?: string | null
          legacy_id?: string | null
          program_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          accent_color: string | null
          cover_art_url: string | null
          created_at: string
          description: string | null
          id: string
          legacy_id: string | null
          slug: string | null
          sort_order: number
          status: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          slug?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["pub_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          client_updated_at: string | null
          flashcard_state: Json | null
          id: string
          last_activity: string
          legacy_id: string | null
          lesson_id: string
          parts: Json
          quiz_max_score: number | null
          quiz_score: number | null
          status: string
          user_id: string
          video_position: number
          xp_earned: number
        }
        Insert: {
          client_updated_at?: string | null
          flashcard_state?: Json | null
          id?: string
          last_activity?: string
          legacy_id?: string | null
          lesson_id: string
          parts?: Json
          quiz_max_score?: number | null
          quiz_score?: number | null
          status?: string
          user_id: string
          video_position?: number
          xp_earned?: number
        }
        Update: {
          client_updated_at?: string | null
          flashcard_state?: Json | null
          id?: string
          last_activity?: string
          legacy_id?: string | null
          lesson_id?: string
          parts?: Json
          quiz_max_score?: number | null
          quiz_score?: number | null
          status?: string
          user_id?: string
          video_position?: number
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_notes: {
        Row: {
          block_id: string
          body: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id: string
          body?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_id?: string
          body?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          completed_at: string | null
          lesson_id: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          lesson_id: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          lesson_id?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      research_entries: {
        Row: {
          analysis: string | null
          borrow: string | null
          field: string | null
          lesson_id: string
          liked: string | null
          share: number[]
          slot: number
          source_type: string | null
          tone: number[]
          updated_at: string
          url: string | null
          user_id: string
          who: string | null
        }
        Insert: {
          analysis?: string | null
          borrow?: string | null
          field?: string | null
          lesson_id: string
          liked?: string | null
          share?: number[]
          slot: number
          source_type?: string | null
          tone?: number[]
          updated_at?: string
          url?: string | null
          user_id: string
          who?: string | null
        }
        Update: {
          analysis?: string | null
          borrow?: string | null
          field?: string | null
          lesson_id?: string
          liked?: string | null
          share?: number[]
          slot?: number
          source_type?: string | null
          tone?: number[]
          updated_at?: string
          url?: string | null
          user_id?: string
          who?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_entries_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_reflections: {
        Row: {
          change: string | null
          completed_at: string | null
          field: string | null
          lesson_id: string
          patterns: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          change?: string | null
          completed_at?: string | null
          field?: string | null
          lesson_id: string
          patterns?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          change?: string | null
          completed_at?: string | null
          field?: string | null
          lesson_id?: string
          patterns?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_reflections_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          label: string
          label_es: string | null
          legacy_id: string | null
          module_id: string
          resource_type: string
          sort_order: number
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          label: string
          label_es?: string | null
          legacy_id?: string | null
          module_id: string
          resource_type?: string
          sort_order?: number
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          label?: string
          label_es?: string | null
          legacy_id?: string | null
          module_id?: string
          resource_type?: string
          sort_order?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [

        ]
      }
      resume_reviews: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          notified_at: string | null
          original_text: string
          result: Json | null
          status: string
          unlock_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notified_at?: string | null
          original_text: string
          result?: Json | null
          status?: string
          unlock_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notified_at?: string | null
          original_text?: string
          result?: Json | null
          status?: string
          unlock_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_submissions: {
        Row: {
          file_path: string | null
          id: string
          legacy_id: string | null
          original_text: string | null
          result: Json | null
          status: string
          submitted_at: string
          unlock_at: string
          user_id: string
        }
        Insert: {
          file_path?: string | null
          id?: string
          legacy_id?: string | null
          original_text?: string | null
          result?: Json | null
          status?: string
          submitted_at?: string
          unlock_at: string
          user_id: string
        }
        Update: {
          file_path?: string | null
          id?: string
          legacy_id?: string | null
          original_text?: string | null
          result?: Json | null
          status?: string
          submitted_at?: string
          unlock_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      speaking_best: {
        Row: {
          created_at: string
          duration_s: number | null
          exercise: number
          id: string
          lesson_id: string
          points: number[]
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          exercise: number
          id?: string
          lesson_id: string
          points?: number[]
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          exercise?: number
          id?: string
          lesson_id?: string
          points?: number[]
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_best_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_progress: {
        Row: {
          completed_at: string | null
          lesson_id: string
          partner_feedback: number[]
          reps: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          lesson_id: string
          partner_feedback?: number[]
          reps?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          lesson_id?: string
          partner_feedback?: number[]
          reps?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaking_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          received_at: string
          type: string
        }
        Insert: {
          id: string
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          body: string
          coach_feedback: string | null
          coach_good: string | null
          coach_improve: string | null
          coach_message: string | null
          created_at: string
          history: Json
          id: string
          lesson_id: string
          media_path: string | null
          parts_confirmed: number[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          body?: string
          coach_feedback?: string | null
          coach_good?: string | null
          coach_improve?: string | null
          coach_message?: string | null
          created_at?: string
          history?: Json
          id?: string
          lesson_id: string
          media_path?: string | null
          parts_confirmed?: number[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          body?: string
          coach_feedback?: string | null
          coach_good?: string | null
          coach_improve?: string | null
          coach_message?: string | null
          created_at?: string
          history?: Json
          id?: string
          lesson_id?: string
          media_path?: string | null
          parts_confirmed?: number[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          autoplay_audio: boolean
          daily_goal_xp: number
          email_followups: boolean
          email_promotions: boolean
          show_spanish: boolean
          sound_effects: boolean
          text_size: string
          updated_at: string
          usage_analytics: boolean
          user_id: string
        }
        Insert: {
          autoplay_audio?: boolean
          daily_goal_xp?: number
          email_followups?: boolean
          email_promotions?: boolean
          show_spanish?: boolean
          sound_effects?: boolean
          text_size?: string
          updated_at?: string
          usage_analytics?: boolean
          user_id: string
        }
        Update: {
          autoplay_audio?: boolean
          daily_goal_xp?: number
          email_followups?: boolean
          email_promotions?: boolean
          show_spanish?: boolean
          sound_effects?: boolean
          text_size?: string
          updated_at?: string
          usage_analytics?: boolean
          user_id?: string
        }
        Relationships: []
      }
      video_proofs: {
        Row: {
          confidence: number | null
          created_at: string
          duration_s: number | null
          frame_at_s: number | null
          id: string
          lesson_id: string
          script: string | null
          self_check: number[]
          thumb_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          duration_s?: number | null
          frame_at_s?: number | null
          id?: string
          lesson_id: string
          script?: string | null
          self_check?: number[]
          thumb_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          duration_s?: number | null
          frame_at_s?: number | null
          id?: string
          lesson_id?: string
          script?: string | null
          self_check?: number[]
          thumb_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_proofs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_proofs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_task_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_task_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reflections: {
        Row: {
          answers: string[]
          completed_at: string | null
          confidence: number | null
          course_id: string
          created_at: string
          focus: string[]
          id: string
          next_goal: string | null
          self_eval: number[]
          updated_at: string
          user_id: string
          week: number
        }
        Insert: {
          answers?: string[]
          completed_at?: string | null
          confidence?: number | null
          course_id: string
          created_at?: string
          focus?: string[]
          id?: string
          next_goal?: string | null
          self_eval?: number[]
          updated_at?: string
          user_id: string
          week: number
        }
        Update: {
          answers?: string[]
          completed_at?: string | null
          confidence?: number | null
          course_id?: string
          created_at?: string
          focus?: string[]
          id?: string
          next_goal?: string | null
          self_eval?: number[]
          updated_at?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reflections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_content: {
        Row: {
          data: Json
          lesson_id: string
          updated_at: string
        }
        Insert: {
          data: Json
          lesson_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          lesson_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_speaking_rep: {
        Args: { p_exercise: number; p_lesson: string }
        Returns: number[]
      }
      admin_duplicate_module: { Args: { p_module: string }; Returns: string }
      can_use_ai_tools: { Args: never; Returns: boolean }
      content_health: {
        Args: never
        Returns: {
          course: string
          course_id: string
          course_sort: number
          detail: string
          kind: string
          lesson_id: string
          link: string
          module_n: number
          title: string
        }[]
      }
      eval_rate_hit: {
        Args: { p_ip_hash: string; p_max?: number; p_window?: string }
        Returns: boolean
      }
      eval_take_ai_call: {
        Args: { p_max?: number; p_token: string }
        Returns: boolean
      }
      log_client_error: {
        Args: {
          p_kind?: string
          p_message: string
          p_route: string
          p_session_id: string
          p_stack?: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      my_class_people: {
        Args: never
        Returns: {
          class_id: string
          display_name: string
          member_role: string
          user_id: string
        }[]
      }
      my_evaluation_history: {
        Args: never
        Returns: {
          evaluated_at: string
          level: string
        }[]
      }
      my_new_badges: {
        Args: never
        Returns: {
          code: string
          color: string
          name: string
        }[]
      }
      my_resume_reviews: {
        Args: never
        Returns: {
          created_at: string
          file_name: string
          id: string
          original_text: string
          result: Json
          status: string
          unlock_at: string
        }[]
      }
      record_lesson_progress: {
        Args: { p_finish?: boolean; p_lesson: string; p_part?: string }
        Returns: Json
      }
      renew_offline_downloads: {
        Args: { p_device: string }
        Returns: {
          allowed: boolean
          expires_at: string
          module_id: string
        }[]
      }
      set_speaking_partner: {
        Args: { p_lesson: string; p_question: number; p_value: number }
        Returns: number[]
      }
    }
    Enums: {
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      lang: "es" | "en"
      pub_status: "draft" | "published"
      user_role:
        | "super_admin"
        | "director"
        | "administrator"
        | "teacher"
        | "student"
        | "individual_student"
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
    Enums: {
      cefr_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      lang: ["es", "en"],
      pub_status: ["draft", "published"],
      user_role: [
        "super_admin",
        "director",
        "administrator",
        "teacher",
        "student",
        "individual_student",
      ],
    },
  },
} as const
