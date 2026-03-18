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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chamados: {
        Row: {
          aberto_por_email: string | null
          cliente_empresa: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string
          descricao: string | null
          id: string
          jira_key: string | null
          modulo: string | null
          origem: Database["public"]["Enums"]["origem_chamado"]
          prioridade: string | null
          rd_conversa_id: string | null
          relator_account_id: string | null
          relator_nome: string
          status_jira: string | null
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          updated_at: string
        }
        Insert: {
          aberto_por_email?: string | null
          cliente_empresa?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          jira_key?: string | null
          modulo?: string | null
          origem?: Database["public"]["Enums"]["origem_chamado"]
          prioridade?: string | null
          rd_conversa_id?: string | null
          relator_account_id?: string | null
          relator_nome: string
          status_jira?: string | null
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          updated_at?: string
        }
        Update: {
          aberto_por_email?: string | null
          cliente_empresa?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          jira_key?: string | null
          modulo?: string | null
          origem?: Database["public"]["Enums"]["origem_chamado"]
          prioridade?: string | null
          rd_conversa_id?: string | null
          relator_account_id?: string | null
          relator_nome?: string
          status_jira?: string | null
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      mapeamento_usuarios: {
        Row: {
          account_id_jira: string | null
          ativo: boolean
          created_at: string
          email: string
          id: string
          jira_api_token: string | null
          jira_email: string | null
          nome: string
          telefone_whatsapp: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          updated_at: string
        }
        Insert: {
          account_id_jira?: string | null
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          jira_api_token?: string | null
          jira_email?: string | null
          nome: string
          telefone_whatsapp?: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
        }
        Update: {
          account_id_jira?: string | null
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          jira_api_token?: string | null
          jira_email?: string | null
          nome?: string
          telefone_whatsapp?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
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
      origem_chamado: "app_direto" | "rd_conversas"
      tipo_chamado: "bug" | "melhoria" | "solicitacao"
      tipo_usuario: "franqueado" | "suporte" | "gestor"
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
      origem_chamado: ["app_direto", "rd_conversas"],
      tipo_chamado: ["bug", "melhoria", "solicitacao"],
      tipo_usuario: ["franqueado", "suporte", "gestor"],
    },
  },
} as const
