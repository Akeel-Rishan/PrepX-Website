export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      examinations: {
        Row: {
          id: string;
          name: string;
          year: number;
          organization_name: string;
          status: 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED';
          publication_date: string | null;
          result_notice: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          year: number;
          organization_name?: string;
          status?: 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED';
          publication_date?: string | null;
          result_notice?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          year?: number;
          organization_name?: string;
          status?: 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED';
          publication_date?: string | null;
          result_notice?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          examination_id: string;
          full_name: string;
          index_number: string;
          nic_number: string | null;
          school_name: string;
          examination_center: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          examination_id: string;
          full_name: string;
          index_number: string;
          nic_number?: string | null;
          school_name: string;
          examination_center?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          examination_id?: string;
          full_name?: string;
          index_number?: string;
          nic_number?: string | null;
          school_name?: string;
          examination_center?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          examination_id: string;
          subject_name: string;
          subject_code: string | null;
          display_order: number;
          required: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          examination_id: string;
          subject_name: string;
          subject_code?: string | null;
          display_order?: number;
          required?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          examination_id?: string;
          subject_name?: string;
          subject_code?: string | null;
          display_order?: number;
          required?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_results: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          grade: 'A' | 'B' | 'C' | 'S' | 'W' | 'AB';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          grade: 'A' | 'B' | 'C' | 'S' | 'W' | 'AB';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string;
          grade?: 'A' | 'B' | 'C' | 'S' | 'W' | 'AB';
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
};
