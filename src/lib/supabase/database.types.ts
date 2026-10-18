// Generated from the live schema (Supabase "generate TypeScript types"). Do not edit by hand;
// regenerate after each migration: `npx supabase gen types typescript --project-id pbpnhsgygwqxnkklhyuz`.
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
      submissions: {
        Row: { id: string; user_id: string; lesson_id: string; body: string; media_path: string | null; status: string; coach_feedback: string | null; reviewed_by: string | null; reviewed_at: string | null; submitted_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id?: string; lesson_id: string; body?: string; media_path?: string | null; status?: string; coach_feedback?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; submitted_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; lesson_id?: string; body?: string; media_path?: string | null; status?: string; coach_feedback?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; submitted_at?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      audio_transcripts: {
        Row: { path: string; status: string; language: string | null; text: string | null; words: Json | null; error: string | null; created_at: string; done_at: string | null };
        Insert: { path: string; status?: string; language?: string | null; text?: string | null; words?: Json | null; error?: string | null; created_at?: string; done_at?: string | null };
        Update: { path?: string; status?: string; language?: string | null; text?: string | null; words?: Json | null; error?: string | null; created_at?: string; done_at?: string | null };
        Relationships: [];
      };
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
          id: string
          legacy_id: string | null
          name: string
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          legacy_id?: string | null
          name: string
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          legacy_id?: string | null
          name?: string
          organization_id?: string
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
      enrollments: {
        Row: {
          order_id: string | null
          class_id: string | null
          course_id: string | null
          created_at: string
          enrollment_type: string
          expires_at: string | null
          id: string
          legacy_id: string | null
          plan: string | null
          program_id: string | null
          source: string | null
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          order_id?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          legacy_id?: string | null
          plan?: string | null
          program_id?: string | null
          source?: string | null
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          order_id?: string | null
          class_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_type?: string
          expires_at?: string | null
          id?: string
          legacy_id?: string | null
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
      lessons: {
        Row: {
          accent_color: string | null
          created_at: string
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
          buyer_name: string | null
          paid_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          amount_usd_cents: number | null
          created_at: string
          email: string | null
          id: string
          product_id: string | null
          status: string
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          buyer_name?: string | null
          paid_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          amount_usd_cents?: number | null
          created_at?: string
          email?: string | null
          id?: string
          product_id?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          buyer_name?: string | null
          paid_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          amount_usd_cents?: number | null
          created_at?: string
          email?: string | null
          id?: string
          product_id?: string | null
          status?: string
          stripe_session_id?: string | null
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
      products: {
        Row: {
          access_label: string | null
          features: Json
          installments: Json | null
          program: string | null
          sort_order: number
          tier: string | null
          active: boolean
          code: string
          grants: Json
          id: string
          name: string
          price_usd_cents: number
          stripe_price_id: string | null
        }
        Insert: {
          access_label?: string | null
          features?: Json
          installments?: Json | null
          program?: string | null
          sort_order?: number
          tier?: string | null
          active?: boolean
          code: string
          grants?: Json
          id?: string
          name: string
          price_usd_cents: number
          stripe_price_id?: string | null
        }
        Update: {
          access_label?: string | null
          features?: Json
          installments?: Json | null
          program?: string | null
          sort_order?: number
          tier?: string | null
          active?: boolean
          code?: string
          grants?: Json
          id?: string
          name?: string
          price_usd_cents?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      record_lesson_progress: {
        Args: { p_finish?: boolean; p_lesson: string; p_part?: string }
        Returns: Json
      }
      can_use_ai_tools: { Args: never; Returns: boolean };
      my_resume_reviews: {
        Args: never;
        Returns: { id: string; file_name: string | null; status: string; created_at: string; unlock_at: string; result: Json | null; original_text: string | null }[];
      };
      my_evaluation_history: {
        Args: never
        Returns: {
          evaluated_at: string
          level: string
        }[]
      }
      renew_offline_downloads: {
        Args: { p_device: string }
        Returns: {
          allowed: boolean
          expires_at: string
          module_id: string
        }[]
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
