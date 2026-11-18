export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | 'Super Admin'
  | 'Procurement Director'
  | 'Procurement Engineer'
  | 'Purchasing Specialist'
  | 'Site Receiving Officer'
  | 'Financial Controller'
  | 'Internal Auditor';

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          code: 'FITCO' | 'ARABITRA';
          name: string;
          legal_name: string | null;
          cr_number: string | null;
          tax_id: string | null;
          currency: string;
          headquarters: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: 'FITCO' | 'ARABITRA';
          name: string;
          legal_name?: string | null;
          cr_number?: string | null;
          tax_id?: string | null;
          currency?: string;
          headquarters?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: 'FITCO' | 'ARABITRA';
          name?: string;
          legal_name?: string | null;
          cr_number?: string | null;
          tax_id?: string | null;
          currency?: string;
          headquarters?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_memberships: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: UserRole;
          department: string | null;
          title: string | null;
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: UserRole;
          department?: string | null;
          title?: string | null;
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          role?: UserRole;
          department?: string | null;
          title?: string | null;
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          company_id: string;
          vendor_code: string;
          name: string;
          category: string;
          contact_person: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          cr_number: string | null;
          vat_number: string | null;
          aramco_vendor_id: string | null;
          status: 'Active' | 'Under Review' | 'Suspended' | 'Blacklisted';
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vendor_code: string;
          name: string;
          category: string;
          contact_person?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cr_number?: string | null;
          vat_number?: string | null;
          aramco_vendor_id?: string | null;
          status?: 'Active' | 'Under Review' | 'Suspended' | 'Blacklisted';
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vendor_code?: string;
          name?: string;
          category?: string;
          contact_person?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cr_number?: string | null;
          vat_number?: string | null;
          aramco_vendor_id?: string | null;
          status?: 'Active' | 'Under Review' | 'Suspended' | 'Blacklisted';
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          company_id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string;
          unit_of_measure: string;
          stock_level: number;
          reorder_point: number;
          unit_price_sar: number;
          primary_vendor_id: string | null;
          location: string | null;
          status: 'In Stock' | 'Low Stock' | 'Critical' | 'Discontinued';
          lead_time_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          sku: string;
          name: string;
          description?: string | null;
          category: string;
          unit_of_measure?: string;
          stock_level?: number;
          reorder_point?: number;
          unit_price_sar?: number;
          primary_vendor_id?: string | null;
          location?: string | null;
          status?: 'In Stock' | 'Low Stock' | 'Critical' | 'Discontinued';
          lead_time_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          sku?: string;
          name?: string;
          description?: string | null;
          category?: string;
          unit_of_measure?: string;
          stock_level?: number;
          reorder_point?: number;
          unit_price_sar?: number;
          primary_vendor_id?: string | null;
          location?: string | null;
          status?: 'In Stock' | 'Low Stock' | 'Critical' | 'Discontinued';
          lead_time_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      rfqs: {
        Row: {
          id: string;
          company_id: string;
          rfq_number: string;
          title: string;
          project_name: string;
          target_item_id: string | null;
          quantity: number;
          estimated_budget_sar: number | null;
          status: 'Draft' | 'Open' | 'Evaluating' | 'Awarded' | 'Closed' | 'Cancelled';
          due_date: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          rfq_number: string;
          title: string;
          project_name: string;
          target_item_id?: string | null;
          quantity: number;
          estimated_budget_sar?: number | null;
          status?: 'Draft' | 'Open' | 'Evaluating' | 'Awarded' | 'Closed' | 'Cancelled';
          due_date: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          rfq_number?: string;
          title?: string;
          project_name?: string;
          target_item_id?: string | null;
          quantity?: number;
          estimated_budget_sar?: number | null;
          status?: 'Draft' | 'Open' | 'Evaluating' | 'Awarded' | 'Closed' | 'Cancelled';
          due_date?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          company_id: string;
          rfq_id: string;
          vendor_id: string;
          quote_reference: string;
          unit_price_sar: number;
          total_price_sar: number;
          delivery_lead_weeks: number | null;
          validity_date: string;
          compliance_rating: number | null;
          status: 'Received' | 'Shortlisted' | 'Awarded' | 'Rejected' | 'Expired';
          proposal_document_url: string | null;
          notes: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          rfq_id: string;
          vendor_id: string;
          quote_reference: string;
          unit_price_sar: number;
          total_price_sar: number;
          delivery_lead_weeks?: number | null;
          validity_date: string;
          compliance_rating?: number | null;
          status?: 'Received' | 'Shortlisted' | 'Awarded' | 'Rejected' | 'Expired';
          proposal_document_url?: string | null;
          notes?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          rfq_id?: string;
          vendor_id?: string;
          quote_reference?: string;
          unit_price_sar?: number;
          total_price_sar?: number;
          delivery_lead_weeks?: number | null;
          validity_date?: string;
          compliance_rating?: number | null;
          status?: 'Received' | 'Shortlisted' | 'Awarded' | 'Rejected' | 'Expired';
          proposal_document_url?: string | null;
          notes?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchase_orders: {
        Row: {
          id: string;
          company_id: string;
          po_number: string;
          rfq_id: string | null;
          quotation_id: string | null;
          vendor_id: string;
          project_name: string;
          total_amount_sar: number;
          status: 'Draft' | 'Pending Approval' | 'Executive Review' | 'Issued' | 'Partially Received' | 'Fulfilled' | 'Cancelled';
          payment_terms: string;
          delivery_deadline: string | null;
          requires_executive_approval: boolean;
          approved_by: string | null;
          approved_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          po_number: string;
          rfq_id?: string | null;
          quotation_id?: string | null;
          vendor_id: string;
          project_name: string;
          total_amount_sar?: number;
          status?: 'Draft' | 'Pending Approval' | 'Executive Review' | 'Issued' | 'Partially Received' | 'Fulfilled' | 'Cancelled';
          payment_terms: string;
          delivery_deadline?: string | null;
          requires_executive_approval?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          po_number?: string;
          rfq_id?: string | null;
          quotation_id?: string | null;
          vendor_id?: string;
          project_name?: string;
          total_amount_sar?: number;
          status?: 'Draft' | 'Pending Approval' | 'Executive Review' | 'Issued' | 'Partially Received' | 'Fulfilled' | 'Cancelled';
          payment_terms?: string;
          delivery_deadline?: string | null;
          requires_executive_approval?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      po_lines: {
        Row: {
          id: string;
          company_id: string;
          po_id: string;
          item_id: string | null;
          line_number: number;
          description: string;
          quantity: number;
          unit_price_sar: number;
          total_price_sar: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          po_id: string;
          item_id?: string | null;
          line_number: number;
          description: string;
          quantity: number;
          unit_price_sar: number;
          total_price_sar: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          po_id?: string;
          item_id?: string | null;
          line_number?: number;
          description?: string;
          quantity?: number;
          unit_price_sar?: number;
          total_price_sar?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          company_id: string;
          delivery_tracking_number: string;
          po_id: string;
          vendor_id: string;
          grn_number: string | null;
          status: 'Scheduled' | 'In Transit' | 'Customs Clearance' | 'Delivered' | 'Delayed' | 'Rejected';
          destination_site: string;
          carrier_name: string | null;
          expected_delivery_date: string;
          actual_delivery_date: string | null;
          qc_passed: boolean | null;
          received_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          delivery_tracking_number: string;
          po_id: string;
          vendor_id: string;
          grn_number?: string | null;
          status?: 'Scheduled' | 'In Transit' | 'Customs Clearance' | 'Delivered' | 'Delayed' | 'Rejected';
          destination_site: string;
          carrier_name?: string | null;
          expected_delivery_date: string;
          actual_delivery_date?: string | null;
          qc_passed?: boolean | null;
          received_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          delivery_tracking_number?: string;
          po_id?: string;
          vendor_id?: string;
          grn_number?: string | null;
          status?: 'Scheduled' | 'In Transit' | 'Customs Clearance' | 'Delivered' | 'Delayed' | 'Rejected';
          destination_site?: string;
          carrier_name?: string | null;
          expected_delivery_date?: string;
          actual_delivery_date?: string | null;
          qc_passed?: boolean | null;
          received_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          invoice_number: string;
          po_id: string;
          vendor_id: string;
          amount_sar: number;
          tax_amount_sar: number;
          status: 'Pending Review' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Void';
          due_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_number: string;
          po_id: string;
          vendor_id: string;
          amount_sar: number;
          tax_amount_sar?: number;
          status?: 'Pending Review' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Void';
          due_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          invoice_number?: string;
          po_id?: string;
          vendor_id?: string;
          amount_sar?: number;
          tax_amount_sar?: number;
          status?: 'Pending Review' | 'Approved' | 'Partially Paid' | 'Paid' | 'Disputed' | 'Void';
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          company_id: string;
          payment_reference: string;
          invoice_id: string;
          po_id: string;
          vendor_id: string;
          milestone_label: string;
          amount_sar: number;
          payment_method: 'SARIE Wire Transfer' | 'Letter of Credit' | 'Corporate Cheque' | 'Escrow';
          bank_reference: string | null;
          status: 'Scheduled' | 'Approved' | 'Processing' | 'Released' | 'Failed' | 'Cancelled';
          scheduled_date: string;
          released_at: string | null;
          released_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          payment_reference: string;
          invoice_id: string;
          po_id: string;
          vendor_id: string;
          milestone_label: string;
          amount_sar: number;
          payment_method?: 'SARIE Wire Transfer' | 'Letter of Credit' | 'Corporate Cheque' | 'Escrow';
          bank_reference?: string | null;
          status?: 'Scheduled' | 'Approved' | 'Processing' | 'Released' | 'Failed' | 'Cancelled';
          scheduled_date: string;
          released_at?: string | null;
          released_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          payment_reference?: string;
          invoice_id?: string;
          po_id?: string;
          vendor_id?: string;
          milestone_label?: string;
          amount_sar?: number;
          payment_method?: 'SARIE Wire Transfer' | 'Letter of Credit' | 'Corporate Cheque' | 'Escrow';
          bank_reference?: string | null;
          status?: 'Scheduled' | 'Approved' | 'Processing' | 'Released' | 'Failed' | 'Cancelled';
          scheduled_date?: string;
          released_at?: string | null;
          released_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          company_id: string;
          asset_tag: string;
          name: string;
          category: string;
          po_id: string | null;
          vendor_id: string | null;
          assigned_location: string;
          current_operator: string | null;
          condition: 'Operational' | 'Maintenance Required' | 'In Repair' | 'Decommissioned';
          next_maintenance_date: string | null;
          telematics_serial: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          asset_tag: string;
          name: string;
          category: string;
          po_id?: string | null;
          vendor_id?: string | null;
          assigned_location: string;
          current_operator?: string | null;
          condition?: 'Operational' | 'Maintenance Required' | 'In Repair' | 'Decommissioned';
          next_maintenance_date?: string | null;
          telematics_serial?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          asset_tag?: string;
          name?: string;
          category?: string;
          po_id?: string | null;
          vendor_id?: string | null;
          assigned_location?: string;
          current_operator?: string | null;
          condition?: 'Operational' | 'Maintenance Required' | 'In Repair' | 'Decommissioned';
          next_maintenance_date?: string | null;
          telematics_serial?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_events: {
        Row: {
          id: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'APPROVAL' | 'PAYMENT_RELEASE';
          performed_by: string | null;
          user_role: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entity_type: string;
          entity_id: string;
          action: 'INSERT' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'APPROVAL' | 'PAYMENT_RELEASE';
          performed_by?: string | null;
          user_role?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never; // Append-only immutable
      };
    };
  };
}
