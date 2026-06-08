/**
 * Hand-written Supabase types derived from all migration files.
 * Replace this file with the auto-generated version by running:
 *
 *   npx supabase login          ← one-time browser auth
 *   npm run gen:types
 *
 * Until then, this file is a fully accurate reflection of the DB schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          role: Database["public"]["Enums"]["user_role"];
          parent_id: string | null;
          ambassador_tier: string | null;
          status: string;
          address: string | null;
          locale: string | null;
          timezone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          name: string;
          phone?: string | null;
          email?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          parent_id?: string | null;
          ambassador_tier?: string | null;
          status?: string;
          address?: string | null;
          locale?: string | null;
          timezone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          name?: string;
          phone?: string | null;
          email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          parent_id?: string | null;
          ambassador_tier?: string | null;
          status?: string;
          address?: string | null;
          locale?: string | null;
          timezone?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hierarchy_closure: {
        Row: {
          ancestor_id: string;
          descendant_id: string;
          depth: number;
        };
        Insert: {
          ancestor_id: string;
          descendant_id: string;
          depth: number;
        };
        Update: {
          ancestor_id?: string;
          descendant_id?: string;
          depth?: number;
        };
        Relationships: [
          {
            foreignKeyName: "hierarchy_closure_ancestor_id_fkey";
            columns: ["ancestor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hierarchy_closure_descendant_id_fkey";
            columns: ["descendant_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          user_id: string;
          coach_id: string;
          membership_type: Database["public"]["Enums"]["membership_type"];
          stage: number;
          join_date: string;
          recharge_count: number;
          ideal_weight: number | null;
          current_weight: number | null;
          program_config: Json;
        };
        Insert: {
          user_id: string;
          coach_id: string;
          membership_type: Database["public"]["Enums"]["membership_type"];
          stage?: number;
          join_date?: string;
          recharge_count?: number;
          ideal_weight?: number | null;
          current_weight?: number | null;
          program_config?: Json;
        };
        Update: {
          user_id?: string;
          coach_id?: string;
          membership_type?: Database["public"]["Enums"]["membership_type"];
          stage?: number;
          join_date?: string;
          recharge_count?: number;
          ideal_weight?: number | null;
          current_weight?: number | null;
          program_config?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      role_mappings: {
        Row: {
          id: string;
          display_name: string;
          system_role: Database["public"]["Enums"]["user_role"];
          gets_members_row: boolean;
          gets_followup: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          system_role: Database["public"]["Enums"]["user_role"];
          gets_members_row?: boolean;
          gets_followup?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          system_role?: Database["public"]["Enums"]["user_role"];
          gets_members_row?: boolean;
          gets_followup?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      follow_up_tasks: {
        Row: {
          id: string;
          member_id: string;
          coach_id: string;
          day_number: number;
          cycle: number;
          activity: Database["public"]["Enums"]["followup_activity"];
          title: string | null;
          due_date: string;
          status: Database["public"]["Enums"]["followup_status"];
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          coach_id: string;
          day_number: number;
          cycle: number;
          activity: Database["public"]["Enums"]["followup_activity"];
          title?: string | null;
          due_date: string;
          status?: Database["public"]["Enums"]["followup_status"];
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          coach_id?: string;
          day_number?: number;
          cycle?: number;
          activity?: Database["public"]["Enums"]["followup_activity"];
          title?: string | null;
          due_date?: string;
          status?: Database["public"]["Enums"]["followup_status"];
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_tasks_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "follow_up_tasks_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dmo_entries: {
        Row: {
          id: string;
          coach_id: string;
          entry_date: string;
          present_in_club: number;
          video_on_interaction: number;
          video_on_meet: number;
          status_posts: number;
          calls_made: number;
          new_guests: number;
          contact_list: number;
          second_shake: number;
          total: number; // generated always as stored
          created_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          entry_date?: string;
          present_in_club?: number;
          video_on_interaction?: number;
          video_on_meet?: number;
          status_posts?: number;
          calls_made?: number;
          new_guests?: number;
          contact_list?: number;
          second_shake?: number;
          // total is generated — not insertable
          created_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          entry_date?: string;
          present_in_club?: number;
          video_on_interaction?: number;
          video_on_meet?: number;
          status_posts?: number;
          calls_made?: number;
          new_guests?: number;
          contact_list?: number;
          second_shake?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dmo_entries_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rule_config: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rule_config_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          member_id: string;
          date: string;
          present: boolean;
          marked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          date?: string;
          present?: boolean;
          marked_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          date?: string;
          present?: boolean;
          marked_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "attendance_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      weight_logs: {
        Row: {
          id: string;
          member_id: string;
          weight: number;
          logged_at: string;
          logged_by: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          weight: number;
          logged_at?: string;
          logged_by?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          weight?: number;
          logged_at?: string;
          logged_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weight_logs_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "weight_logs_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: Database["public"]["Enums"]["notification_type"];
          title: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          title?: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      member_intake: {
        Row: {
          member_id: string;
          visit_date: string | null;
          age: number | null;
          height_cm: number | null;
          start_weight: number | null;
          ideal_weight: number | null;
          family_members: string | null;
          health_challenge: string | null;
          purpose: string | null;
          energy: string | null;
          digestion: string | null;
          sleep: string | null;
          wake_up_time: string | null;
          sleeping_time: string | null;
          breakfast_time: string | null;
          mid_meal_1: string | null;
          lunch_time: string | null;
          mid_meal_2: string | null;
          dinner_time: string | null;
          exercise: string | null;
          water_intake: string | null;
          fruit_salad: string | null;
          tea: string | null;
          non_veg: string | null;
          notes: string | null;
          recorded_by: string | null;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          visit_date?: string | null;
          age?: number | null;
          height_cm?: number | null;
          start_weight?: number | null;
          ideal_weight?: number | null;
          family_members?: string | null;
          health_challenge?: string | null;
          purpose?: string | null;
          energy?: string | null;
          digestion?: string | null;
          sleep?: string | null;
          wake_up_time?: string | null;
          sleeping_time?: string | null;
          breakfast_time?: string | null;
          mid_meal_1?: string | null;
          lunch_time?: string | null;
          mid_meal_2?: string | null;
          dinner_time?: string | null;
          exercise?: string | null;
          water_intake?: string | null;
          fruit_salad?: string | null;
          tea?: string | null;
          non_veg?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          visit_date?: string | null;
          age?: number | null;
          height_cm?: number | null;
          start_weight?: number | null;
          ideal_weight?: number | null;
          family_members?: string | null;
          health_challenge?: string | null;
          purpose?: string | null;
          energy?: string | null;
          digestion?: string | null;
          sleep?: string | null;
          wake_up_time?: string | null;
          sleeping_time?: string | null;
          breakfast_time?: string | null;
          mid_meal_1?: string | null;
          lunch_time?: string | null;
          mid_meal_2?: string | null;
          dinner_time?: string | null;
          exercise?: string | null;
          water_intake?: string | null;
          fruit_salad?: string | null;
          tea?: string | null;
          non_veg?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_intake_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "member_intake_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_user_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      app_user_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      can_see: {
        Args: { target: string };
        Returns: boolean;
      };
      bulk_import_user: {
        Args: {
          p_name: string;
          p_upline_id: string;
          p_role?: Database["public"]["Enums"]["user_role"];
          p_gets_members_row?: boolean;
          p_phone?: string | null;
          p_email?: string | null;
          p_membership?: Database["public"]["Enums"]["membership_type"];
          p_join_date?: string;
          p_ideal_weight?: number | null;
          p_cur_weight?: number | null;
        };
        Returns: string;
      };
      create_member: {
        Args: {
          p_name: string;
          p_phone: string;
          p_membership: Database["public"]["Enums"]["membership_type"];
          p_stage: number;
        };
        Returns: string;
      };
      get_coaches_for_registration: {
        Args: Record<string, never>;
        Returns: { id: string; name: string; role: Database["public"]["Enums"]["user_role"] }[];
      };
      register_user: {
        Args: {
          p_name: string;
          p_email: string;
          p_role: Database["public"]["Enums"]["user_role"];
          p_phone: string;
          p_parent_id: string;
        };
        Returns: string;
      };
      approve_user: {
        Args: { p_user_id: string };
        Returns: void;
      };
      reject_user: {
        Args: { p_user_id: string };
        Returns: void;
      };
      update_user_role: {
        Args: {
          p_user_id: string;
          p_new_role: Database["public"]["Enums"]["user_role"];
          p_new_parent_id?: string | null;
          p_membership?: Database["public"]["Enums"]["membership_type"] | null;
          p_status?: string | null;
        };
        Returns: void;
      };
      update_user_details: {
        Args: {
          p_user_id: string;
          p_name?: string | null;
          p_phone?: string | null;
          p_address?: string | null;
        };
        Returns: void;
      };
      sync_current_weight: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role:
        | "upline"
        | "club_owner"
        | "nco"
        | "jco"
        | "coach"
        | "supervisor"
        | "member"
        | "privilege"
        | "guest";
      membership_type: "basic" | "elite" | "privilege";
      followup_activity: "call" | "home_visit" | "reminder";
      followup_status: "pending" | "done" | "skipped";
      notification_type: "milestone" | "recharge_due" | "drop_off" | "info" | "weight_reminder" | "checkin_reminder" | "followup_reminder" | "followup_overdue" | "dmo_reminder";
    };
    CompositeTypes: Record<string, never>;
  };
};

// ── Convenience type aliases (mirrors the auto-generated format) ───────────────

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
