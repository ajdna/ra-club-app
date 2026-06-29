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
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          member_id: string
          present: boolean
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          member_id: string
          present?: boolean
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          member_id?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      broadcast_groups: {
        Row: {
          created_at: string
          created_by: string
          filter_type: string
          filter_value: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filter_type?: string
          filter_value?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filter_type?: string
          filter_value?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          added_by: string | null
          joined_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          joined_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          joined_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          reply_to_message_id: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          reply_to_message_id?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          reply_to_message_id?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string | null
          pinned_message_id: string | null
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id?: string | null
          pinned_message_id?: string | null
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string | null
          pinned_message_id?: string | null
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      club_sessions: {
        Row: {
          details: string | null
          link: string | null
          period: string
          session_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          details?: string | null
          link?: string | null
          period: string
          session_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          details?: string | null
          link?: string | null
          period?: string
          session_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_sessions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dmo_entries: {
        Row: {
          calls_made: number
          coach_id: string
          contact_list: number
          created_at: string
          entry_date: string
          id: string
          new_guests: number
          present_in_club: number
          second_shake: number
          status_posts: number
          total: number | null
          video_on_interaction: number
          video_on_meet: number
        }
        Insert: {
          calls_made?: number
          coach_id: string
          contact_list?: number
          created_at?: string
          entry_date?: string
          id?: string
          new_guests?: number
          present_in_club?: number
          second_shake?: number
          status_posts?: number
          total?: number | null
          video_on_interaction?: number
          video_on_meet?: number
        }
        Update: {
          calls_made?: number
          coach_id?: string
          contact_list?: number
          created_at?: string
          entry_date?: string
          id?: string
          new_guests?: number
          present_in_club?: number
          second_shake?: number
          status_posts?: number
          total?: number | null
          video_on_interaction?: number
          video_on_meet?: number
        }
        Relationships: [
          {
            foreignKeyName: "dmo_entries_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          activity: Database["public"]["Enums"]["followup_activity"]
          coach_id: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          cycle: number
          day_number: number
          due_date: string
          id: string
          meeting_link: string | null
          member_id: string
          notes: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["followup_status"]
          title: string | null
        }
        Insert: {
          activity: Database["public"]["Enums"]["followup_activity"]
          coach_id: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          cycle: number
          day_number: number
          due_date: string
          id?: string
          meeting_link?: string | null
          member_id: string
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string | null
        }
        Update: {
          activity?: Database["public"]["Enums"]["followup_activity"]
          coach_id?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          cycle?: number
          day_number?: number
          due_date?: string
          id?: string
          meeting_link?: string | null
          member_id?: string
          notes?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      hierarchy_closure: {
        Row: {
          ancestor_id: string
          depth: number
          descendant_id: string
        }
        Insert: {
          ancestor_id: string
          depth: number
          descendant_id: string
        }
        Update: {
          ancestor_id?: string
          depth?: number
          descendant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hierarchy_closure_ancestor_id_fkey"
            columns: ["ancestor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hierarchy_closure_descendant_id_fkey"
            columns: ["descendant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_intake: {
        Row: {
          age: number | null
          breakfast_time: string | null
          digestion: string | null
          dinner_time: string | null
          energy: string | null
          exercise: string | null
          family_members: string | null
          fruit_salad: string | null
          health_challenge: string | null
          height_cm: number | null
          ideal_weight: number | null
          lunch_time: string | null
          member_id: string
          mid_meal_1: string | null
          mid_meal_2: string | null
          non_veg: string | null
          notes: string | null
          purpose: string | null
          recorded_by: string | null
          sleep: string | null
          sleeping_time: string | null
          start_weight: number | null
          tea: string | null
          updated_at: string
          visit_date: string | null
          wake_up_time: string | null
          water_intake: string | null
        }
        Insert: {
          age?: number | null
          breakfast_time?: string | null
          digestion?: string | null
          dinner_time?: string | null
          energy?: string | null
          exercise?: string | null
          family_members?: string | null
          fruit_salad?: string | null
          health_challenge?: string | null
          height_cm?: number | null
          ideal_weight?: number | null
          lunch_time?: string | null
          member_id: string
          mid_meal_1?: string | null
          mid_meal_2?: string | null
          non_veg?: string | null
          notes?: string | null
          purpose?: string | null
          recorded_by?: string | null
          sleep?: string | null
          sleeping_time?: string | null
          start_weight?: number | null
          tea?: string | null
          updated_at?: string
          visit_date?: string | null
          wake_up_time?: string | null
          water_intake?: string | null
        }
        Update: {
          age?: number | null
          breakfast_time?: string | null
          digestion?: string | null
          dinner_time?: string | null
          energy?: string | null
          exercise?: string | null
          family_members?: string | null
          fruit_salad?: string | null
          health_challenge?: string | null
          height_cm?: number | null
          ideal_weight?: number | null
          lunch_time?: string | null
          member_id?: string
          mid_meal_1?: string | null
          mid_meal_2?: string | null
          non_veg?: string | null
          notes?: string | null
          purpose?: string | null
          recorded_by?: string | null
          sleep?: string | null
          sleeping_time?: string | null
          start_weight?: number | null
          tea?: string | null
          updated_at?: string
          visit_date?: string | null
          wake_up_time?: string | null
          water_intake?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_intake_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "member_intake_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          coach_id: string
          current_weight: number | null
          ideal_weight: number | null
          join_date: string
          membership_type: Database["public"]["Enums"]["membership_type"]
          program_config: Json
          recharge_count: number
          stage: number
          user_id: string
        }
        Insert: {
          coach_id: string
          current_weight?: number | null
          ideal_weight?: number | null
          join_date?: string
          membership_type: Database["public"]["Enums"]["membership_type"]
          program_config?: Json
          recharge_count?: number
          stage?: number
          user_id: string
        }
        Update: {
          coach_id?: string
          current_weight?: number | null
          ideal_weight?: number | null
          join_date?: string
          membership_type?: Database["public"]["Enums"]["membership_type"]
          program_config?: Json
          recharge_count?: number
          stage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          enabled: boolean
          last_sent_on: string | null
          send_time: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          last_sent_on?: string | null
          send_time?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          last_sent_on?: string | null
          send_time?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          broadcast_target: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          broadcast_target?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          broadcast_target?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_mappings: {
        Row: {
          created_at: string
          display_name: string
          gets_followup: boolean
          gets_members_row: boolean
          id: string
          sort_order: number
          system_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          display_name: string
          gets_followup?: boolean
          gets_members_row?: boolean
          id?: string
          sort_order?: number
          system_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          display_name?: string
          gets_followup?: boolean
          gets_members_row?: boolean
          id?: string
          sort_order?: number
          system_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      rule_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rule_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          ambassador_tier: string | null
          auth_id: string | null
          created_at: string
          email: string | null
          id: string
          last_seen_at: string | null
          locale: string | null
          name: string
          parent_id: string | null
          phone: string | null
          qualification: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          timezone: string | null
          username: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          ambassador_tier?: string | null
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          name: string
          parent_id?: string | null
          phone?: string | null
          qualification?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          timezone?: string | null
          username?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          ambassador_tier?: string | null
          auth_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          qualification?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          timezone?: string | null
          username?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          id: string
          logged_at: string
          logged_by: string | null
          member_id: string
          weight: number
        }
        Insert: {
          id?: string
          logged_at?: string
          logged_by?: string | null
          member_id: string
          weight: number
        }
        Update: {
          id?: string
          logged_at?: string
          logged_by?: string | null
          member_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_user_id: { Args: never; Returns: string }
      app_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      approve_user: { Args: { p_user_id: string }; Returns: undefined }
      bulk_import_member: {
        Args: {
          p_coach_id: string
          p_cur_weight?: number
          p_email?: string
          p_ideal_weight?: number
          p_join_date?: string
          p_membership?: Database["public"]["Enums"]["membership_type"]
          p_name: string
          p_phone?: string
        }
        Returns: string
      }
      bulk_import_user: {
        Args: {
          p_cur_weight?: number
          p_email?: string
          p_gets_members_row?: boolean
          p_ideal_weight?: number
          p_join_date?: string
          p_membership?: Database["public"]["Enums"]["membership_type"]
          p_name: string
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_upline_id: string
        }
        Returns: string
      }
      bulk_upsert_user: {
        Args: {
          p_cur_weight?: number
          p_email?: string
          p_gets_members_row?: boolean
          p_ideal_weight?: number
          p_join_date?: string
          p_membership?: Database["public"]["Enums"]["membership_type"]
          p_name: string
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_upline_id: string
        }
        Returns: Json
      }
      can_see: { Args: { target: string }; Returns: boolean }
      can_see_thread: { Args: { p_thread_id: string }; Returns: boolean }
      check_registration_available: {
        Args: { p_email: string; p_phone: string; p_username: string }
        Returns: string
      }
      create_member: {
        Args: {
          p_membership: Database["public"]["Enums"]["membership_type"]
          p_name: string
          p_phone: string
          p_stage: number
        }
        Returns: string
      }
      get_coaches_for_registration: {
        Args: never
        Returns: {
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_login_email: { Args: { p_identifier: string }; Returns: string }
      register_user: {
        Args: {
          p_email: string
          p_name: string
          p_parent_id: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      register_user_v2: {
        Args: {
          p_email: string
          p_name: string
          p_parent_id: string
          p_phone: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_username: string
          p_whatsapp: string
        }
        Returns: string
      }
      reject_user: { Args: { p_user_id: string }; Returns: undefined }
      unread_message_count: { Args: never; Returns: number }
      update_user_details: {
        Args: {
          p_address?: string
          p_name?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          p_membership?: Database["public"]["Enums"]["membership_type"]
          p_new_parent_id?: string
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_status?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      followup_activity: "call" | "home_visit" | "reminder"
      followup_status: "pending" | "done" | "skipped"
      membership_type: "basic" | "elite" | "privilege"
      notification_type:
        | "milestone"
        | "recharge_due"
        | "drop_off"
        | "info"
        | "weight_reminder"
        | "checkin_reminder"
        | "followup_reminder"
        | "followup_overdue"
        | "dmo_reminder"
        | "message_received"
        | "broadcast_received"
        | "approval_request"
        | "new_downline_member"
      user_role:
        | "upline"
        | "club_owner"
        | "nco"
        | "jco"
        | "coach"
        | "member"
        | "privilege"
        | "guest"
        | "supervisor"
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
      followup_activity: ["call", "home_visit", "reminder"],
      followup_status: ["pending", "done", "skipped"],
      membership_type: ["basic", "elite", "privilege"],
      notification_type: [
        "milestone",
        "recharge_due",
        "drop_off",
        "info",
        "weight_reminder",
        "checkin_reminder",
        "followup_reminder",
        "followup_overdue",
        "dmo_reminder",
        "message_received",
        "broadcast_received",
        "approval_request",
        "new_downline_member",
      ],
      user_role: [
        "upline",
        "club_owner",
        "nco",
        "jco",
        "coach",
        "member",
        "privilege",
        "guest",
        "supervisor",
      ],
    },
  },
} as const
