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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          entity_id: string | null
          entity_type: string | null
          file_name: string | null
          file_path: string
          id: string
          org_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          org_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          org_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      government_schemes: {
        Row: {
          active: boolean
          application_process: string | null
          authority: string | null
          created_at: string
          description: string
          documents_required: string | null
          eligibility: string | null
          id: string
          name: string
          official_url: string | null
          scheme_type: string | null
          short_description: string | null
          slug: string
          state: string | null
          subsidy_details: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          application_process?: string | null
          authority?: string | null
          created_at?: string
          description: string
          documents_required?: string | null
          eligibility?: string | null
          id?: string
          name: string
          official_url?: string | null
          scheme_type?: string | null
          short_description?: string | null
          slug: string
          state?: string | null
          subsidy_details?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          application_process?: string | null
          authority?: string | null
          created_at?: string
          description?: string
          documents_required?: string | null
          eligibility?: string | null
          id?: string
          name?: string
          official_url?: string | null
          scheme_type?: string | null
          short_description?: string | null
          slug?: string
          state?: string | null
          subsidy_details?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          quantity: number
          reorder_level: number
          sku: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          quantity?: number
          reorder_level?: number
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          quantity?: number
          reorder_level?: number
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          hsn_sac: string | null
          id: string
          invoice_id: string
          org_id: string
          position: number
          quantity: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          hsn_sac?: string | null
          id?: string
          invoice_id: string
          org_id: string
          position?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          hsn_sac?: string | null
          id?: string
          invoice_id?: string
          org_id?: string
          position?: number
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          cgst: number
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_gstin: string | null
          customer_name: string
          discount: number
          due_date: string | null
          gst_rate: number
          gst_type: string
          id: string
          igst: number
          invoice_number: string
          issue_date: string
          notes: string | null
          org_id: string
          project_id: string | null
          quotation_id: string | null
          sgst: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          cgst?: number
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name: string
          discount?: number
          due_date?: string | null
          gst_rate?: number
          gst_type?: string
          id?: string
          igst?: number
          invoice_number: string
          issue_date?: string
          notes?: string | null
          org_id: string
          project_id?: string | null
          quotation_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          cgst?: number
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name?: string
          discount?: number
          due_date?: string | null
          gst_rate?: number
          gst_type?: string
          id?: string
          igst?: number
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          org_id?: string
          project_id?: string | null
          quotation_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_submissions: {
        Row: {
          aadhaar_path: string | null
          address: string | null
          annual_gross_income: number | null
          annual_net_income: number | null
          city: string | null
          converted_lead_id: string | null
          created_at: string
          electricity_bill_path: string | null
          email: string | null
          full_name: string
          house_tax_path: string | null
          id: string
          intake_token: string
          ip_hash: string | null
          mobile: string
          notes: string | null
          org_id: string
          pan_path: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aadhaar_path?: string | null
          address?: string | null
          annual_gross_income?: number | null
          annual_net_income?: number | null
          city?: string | null
          converted_lead_id?: string | null
          created_at?: string
          electricity_bill_path?: string | null
          email?: string | null
          full_name: string
          house_tax_path?: string | null
          id?: string
          intake_token: string
          ip_hash?: string | null
          mobile: string
          notes?: string | null
          org_id: string
          pan_path?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aadhaar_path?: string | null
          address?: string | null
          annual_gross_income?: number | null
          annual_net_income?: number | null
          city?: string | null
          converted_lead_id?: string | null
          created_at?: string
          electricity_bill_path?: string | null
          email?: string | null
          full_name?: string
          house_tax_path?: string | null
          id?: string
          intake_token?: string
          ip_hash?: string | null
          mobile?: string
          notes?: string | null
          org_id?: string
          pan_path?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          converted_project_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expected_capacity_kw: number | null
          expected_value: number | null
          id: string
          name: string
          next_followup_at: string | null
          notes: string | null
          org_id: string
          phone: string | null
          pincode: string | null
          source: Database["public"]["Enums"]["lead_source"]
          stage: Database["public"]["Enums"]["lead_stage"]
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_capacity_kw?: number | null
          expected_value?: number | null
          id?: string
          name: string
          next_followup_at?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          pincode?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_capacity_kw?: number | null
          expected_value?: number | null
          id?: string
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          pincode?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          intake_token: string | null
          logo_url: string | null
          name: string
          pan: string | null
          phone: string | null
          pincode: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          intake_token?: string | null
          logo_url?: string | null
          name: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          intake_token?: string | null
          logo_url?: string | null
          name?: string
          pan?: string | null
          phone?: string | null
          pincode?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          org_id: string
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id: string
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id?: string
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_completion_date: string | null
          address: string | null
          assigned_engineer: string | null
          capacity_kw: number
          city: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          lead_id: string | null
          notes: string | null
          org_id: string
          pincode: string | null
          scheduled_end_date: string | null
          scheduled_start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["project_status"]
          total_value: number
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          address?: string | null
          assigned_engineer?: string | null
          capacity_kw?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id: string
          pincode?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          address?: string | null
          assigned_engineer?: string | null
          capacity_kw?: number
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id?: string
          pincode?: string | null
          scheduled_end_date?: string | null
          scheduled_start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          hsn_sac: string | null
          id: string
          org_id: string
          position: number
          quantity: number
          quotation_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          hsn_sac?: string | null
          id?: string
          org_id: string
          position?: number
          quantity?: number
          quotation_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          hsn_sac?: string | null
          id?: string
          org_id?: string
          position?: number
          quantity?: number
          quotation_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          capacity_kw: number
          cgst: number
          city: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_gstin: string | null
          customer_name: string
          customer_phone: string | null
          discount: number
          gst_rate: number
          gst_type: string
          id: string
          igst: number
          issue_date: string
          lead_id: string | null
          notes: string | null
          org_id: string
          pincode: string | null
          project_id: string | null
          quotation_number: string
          sgst: number
          state: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          subsidy_amount: number
          subtotal: number
          system_type: string | null
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          capacity_kw?: number
          cgst?: number
          city?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name: string
          customer_phone?: string | null
          discount?: number
          gst_rate?: number
          gst_type?: string
          id?: string
          igst?: number
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          org_id: string
          pincode?: string | null
          project_id?: string | null
          quotation_number: string
          sgst?: number
          state?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subsidy_amount?: number
          subtotal?: number
          system_type?: string | null
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          capacity_kw?: number
          cgst?: number
          city?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_gstin?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          gst_rate?: number
          gst_type?: string
          id?: string
          igst?: number
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          org_id?: string
          pincode?: string | null
          project_id?: string | null
          quotation_number?: string
          sgst?: number
          state?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subsidy_amount?: number
          subtotal?: number
          system_type?: string | null
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_org_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      org_id_from_intake_token: { Args: { _token: string }; Returns: string }
      org_public_profile: {
        Args: { _token: string }
        Returns: {
          city: string
          id: string
          logo_url: string
          name: string
          state: string
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "sales" | "engineer" | "accountant"
      invoice_status:
        | "draft"
        | "sent"
        | "partial"
        | "paid"
        | "overdue"
        | "cancelled"
      lead_source:
        | "website"
        | "referral"
        | "google_ads"
        | "meta_ads"
        | "walk_in"
        | "whatsapp"
        | "other"
      lead_stage: "new" | "contacted" | "qualified" | "quoted" | "won" | "lost"
      payment_method:
        | "cash"
        | "upi"
        | "bank_transfer"
        | "cheque"
        | "razorpay"
        | "other"
      project_status:
        | "planning"
        | "survey"
        | "approved"
        | "in_progress"
        | "installed"
        | "commissioned"
        | "on_hold"
        | "cancelled"
      quotation_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      subscription_plan: "basic" | "pro" | "enterprise"
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
      app_role: ["owner", "sales", "engineer", "accountant"],
      invoice_status: [
        "draft",
        "sent",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
      lead_source: [
        "website",
        "referral",
        "google_ads",
        "meta_ads",
        "walk_in",
        "whatsapp",
        "other",
      ],
      lead_stage: ["new", "contacted", "qualified", "quoted", "won", "lost"],
      payment_method: [
        "cash",
        "upi",
        "bank_transfer",
        "cheque",
        "razorpay",
        "other",
      ],
      project_status: [
        "planning",
        "survey",
        "approved",
        "in_progress",
        "installed",
        "commissioned",
        "on_hold",
        "cancelled",
      ],
      quotation_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      subscription_plan: ["basic", "pro", "enterprise"],
    },
  },
} as const
