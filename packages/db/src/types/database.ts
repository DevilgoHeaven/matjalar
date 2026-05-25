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
      app_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nickname: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nickname?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nickname?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          last_verified_at: string | null
          launch_status: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          launch_status?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          launch_status?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_change_logs: {
        Row: {
          after_data: Json | null
          before_data: Json | null
          brand_id: string | null
          change_type: string
          crawler_run_id: string | null
          created_at: string
          external_id: string | null
          id: string
          status: string
          target_type: string
        }
        Insert: {
          after_data?: Json | null
          before_data?: Json | null
          brand_id?: string | null
          change_type: string
          crawler_run_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          status?: string
          target_type: string
        }
        Update: {
          after_data?: Json | null
          before_data?: Json | null
          brand_id?: string | null
          change_type?: string
          crawler_run_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          status?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_change_logs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_change_logs_crawler_run_id_fkey"
            columns: ["crawler_run_id"]
            isOneToOne: false
            referencedRelation: "crawler_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji: string
          id: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      combo_options: {
        Row: {
          action_type: string
          combo_id: string
          created_at: string
          group_name_snapshot: string
          id: string
          option_group_id: string | null
          option_item_id: string | null
          option_name_snapshot: string
          price_delta_snapshot: number
          quantity: number
          sort_order: number
        }
        Insert: {
          action_type: string
          combo_id: string
          created_at?: string
          group_name_snapshot: string
          id?: string
          option_group_id?: string | null
          option_item_id?: string | null
          option_name_snapshot: string
          price_delta_snapshot?: number
          quantity?: number
          sort_order?: number
        }
        Update: {
          action_type?: string
          combo_id?: string
          created_at?: string
          group_name_snapshot?: string
          id?: string
          option_group_id?: string | null
          option_item_id?: string | null
          option_name_snapshot?: string
          price_delta_snapshot?: number
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_options_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_options_option_item_id_fkey"
            columns: ["option_item_id"]
            isOneToOne: false
            referencedRelation: "option_items"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_stats: {
        Row: {
          average_rating: number
          bookmark_count: number
          combo_id: string
          hot_score: number
          review_count: number
          updated_at: string
          view_count: number
          vote_count: number
        }
        Insert: {
          average_rating?: number
          bookmark_count?: number
          combo_id: string
          hot_score?: number
          review_count?: number
          updated_at?: string
          view_count?: number
          vote_count?: number
        }
        Update: {
          average_rating?: number
          bookmark_count?: number
          combo_id?: string
          hot_score?: number
          review_count?: number
          updated_at?: string
          view_count?: number
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_stats_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: true
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_tags: {
        Row: {
          combo_id: string
          tag_id: string
        }
        Insert: {
          combo_id: string
          tag_id: string
        }
        Update: {
          combo_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_tags_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_votes: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_votes_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          brand_id: string
          card_summary: string
          combo_signature: string | null
          created_at: string
          creator_id: string | null
          estimated_price: number
          featured_review_id: string | null
          id: string
          menu_variant_id: string
          price_status: string
          primary_menu_id: string
          published_at: string | null
          rejected_reason: string | null
          search_text: string
          seed_comment: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          card_summary: string
          combo_signature?: string | null
          created_at?: string
          creator_id?: string | null
          estimated_price?: number
          featured_review_id?: string | null
          id?: string
          menu_variant_id: string
          price_status?: string
          primary_menu_id: string
          published_at?: string | null
          rejected_reason?: string | null
          search_text?: string
          seed_comment?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          card_summary?: string
          combo_signature?: string | null
          created_at?: string
          creator_id?: string | null
          estimated_price?: number
          featured_review_id?: string | null
          id?: string
          menu_variant_id?: string
          price_status?: string
          primary_menu_id?: string
          published_at?: string | null
          rejected_reason?: string | null
          search_text?: string
          seed_comment?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combos_creator_fk"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combos_featured_review_fk"
            columns: ["featured_review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combos_menu_variant_id_fkey"
            columns: ["menu_variant_id"]
            isOneToOne: false
            referencedRelation: "menu_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combos_primary_menu_id_fkey"
            columns: ["primary_menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_runs: {
        Row: {
          changed_count: number
          error_message: string | null
          fetched_count: number
          finished_at: string | null
          id: string
          source_name: string
          started_at: string
          status: string
        }
        Insert: {
          changed_count?: number
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          source_name: string
          started_at?: string
          status?: string
        }
        Update: {
          changed_count?: number
          error_message?: string | null
          fetched_count?: number
          finished_at?: string | null
          id?: string
          source_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          session_id: string
          type: Database["public"]["Enums"]["events_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          session_id: string
          type: Database["public"]["Enums"]["events_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          session_id?: string
          type?: Database["public"]["Enums"]["events_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_variants: {
        Row: {
          base_price: number
          created_at: string
          id: string
          is_default: boolean
          menu_id: string
          name: string
          sort_order: number
        }
        Insert: {
          base_price: number
          created_at?: string
          id?: string
          is_default?: boolean
          menu_id: string
          name: string
          sort_order?: number
        }
        Update: {
          base_price?: number
          created_at?: string
          id?: string
          is_default?: boolean
          menu_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_variants_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          brand_id: string
          category_kind: string | null
          created_at: string
          external_id: string | null
          id: string
          last_synced_at: string | null
          name: string
          slug: string | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          category_kind?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          slug?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          category_kind?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          slug?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          brand_id: string
          card_priority: number
          created_at: string
          id: string
          is_required: boolean
          max_select: number
          menu_id: string | null
          min_select: number
          name: string
          option_role: string
          selection_mode: string
          show_in_card: boolean
          sort_order: number
        }
        Insert: {
          brand_id: string
          card_priority?: number
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_id?: string | null
          min_select?: number
          name: string
          option_role?: string
          selection_mode?: string
          show_in_card?: boolean
          sort_order?: number
        }
        Update: {
          brand_id?: string
          card_priority?: number
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_id?: string | null
          min_select?: number
          name?: string
          option_role?: string
          selection_mode?: string
          show_in_card?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_groups_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      option_items: {
        Row: {
          alias_names: string[]
          created_at: string
          external_id: string | null
          id: string
          is_available: boolean
          name: string
          option_group_id: string
          price_delta: number
          sort_order: number
        }
        Insert: {
          alias_names?: string[]
          created_at?: string
          external_id?: string | null
          id?: string
          is_available?: boolean
          name: string
          option_group_id: string
          price_delta?: number
          sort_order?: number
        }
        Update: {
          alias_names?: string[]
          created_at?: string
          external_id?: string | null
          id?: string
          is_available?: boolean
          name?: string
          option_group_id?: string
          price_delta?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_items_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          combo_id: string
          content: string
          created_at: string
          id: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          combo_id: string
          content: string
          created_at?: string
          id?: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          combo_id?: string
          content?: string
          created_at?: string
          id?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_app_user_self: { Args: never; Returns: undefined }
      pgroonga_command:
        | { Args: { groongacommand: string }; Returns: string }
        | {
            Args: { arguments: string[]; groongacommand: string }
            Returns: string
          }
      pgroonga_command_escape_value: {
        Args: { value: string }
        Returns: string
      }
      pgroonga_condition: {
        Args: {
          column_name?: string
          fuzzy_max_distance_ratio?: number
          index_name?: string
          query?: string
          schema_name?: string
          scorers?: string[]
          weights?: number[]
        }
        Returns: Database["public"]["CompositeTypes"]["pgroonga_condition"]
        SetofOptions: {
          from: "*"
          to: "pgroonga_condition"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pgroonga_equal_query_text_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_equal_query_varchar_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_varchar_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_equal_text: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_equal_varchar: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_escape:
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: boolean }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { special_characters: string; value: string }
            Returns: string
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { value: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      pgroonga_flush: { Args: { indexname: unknown }; Returns: boolean }
      pgroonga_highlight_html:
        | { Args: { keywords: string[]; target: string }; Returns: string }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: string
          }
        | { Args: { keywords: string[]; targets: string[] }; Returns: string[] }
        | {
            Args: { indexname: unknown; keywords: string[]; targets: string[] }
            Returns: string[]
          }
      pgroonga_index_column_name:
        | { Args: { columnindex: number; indexname: unknown }; Returns: string }
        | { Args: { columnname: string; indexname: unknown }; Returns: string }
      pgroonga_is_writable: { Args: never; Returns: boolean }
      pgroonga_list_broken_indexes: { Args: never; Returns: string[] }
      pgroonga_list_lagged_indexes: { Args: never; Returns: string[] }
      pgroonga_match_positions_byte:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: number[]
          }
      pgroonga_match_positions_character:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string }
            Returns: number[]
          }
      pgroonga_match_term:
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean }
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean }
      pgroonga_match_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string[]
            }
            Returns: boolean
          }
      pgroonga_match_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string[]
        }
        Returns: boolean
      }
      pgroonga_match_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_match_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_match_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_match_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_normalize:
        | { Args: { target: string }; Returns: string }
        | { Args: { normalizername: string; target: string }; Returns: string }
      pgroonga_prefix_varchar_condition:
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_escape: { Args: { query: string }; Returns: string }
      pgroonga_query_expand: {
        Args: {
          query: string
          synonymscolumnname: string
          tablename: unknown
          termcolumnname: string
        }
        Returns: string
      }
      pgroonga_query_extract_keywords: {
        Args: { index_name?: string; query: string }
        Returns: string[]
      }
      pgroonga_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
            Returns: boolean
          }
      pgroonga_query_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_query_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_query_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
            Returns: boolean
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
            Returns: boolean
          }
      pgroonga_query_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_regexp_text_array: {
        Args: { pattern: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_regexp_text_array_condition: {
        Args: {
          pattern: Database["public"]["CompositeTypes"]["pgroonga_condition"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_result_to_jsonb_objects: {
        Args: { result: Json }
        Returns: Json
      }
      pgroonga_result_to_recordset: {
        Args: { result: Json }
        Returns: Record<string, unknown>[]
      }
      pgroonga_score:
        | { Args: { row: Record<string, unknown> }; Returns: number }
        | { Args: { ctid: unknown; tableoid: unknown }; Returns: number }
      pgroonga_set_writable: {
        Args: { newwritable: boolean }
        Returns: boolean
      }
      pgroonga_snippet_html: {
        Args: { keywords: string[]; target: string; width?: number }
        Returns: string[]
      }
      pgroonga_table_name: { Args: { indexname: unknown }; Returns: string }
      pgroonga_tokenize: {
        Args: { options: string[]; target: string }
        Returns: Json[]
      }
      pgroonga_vacuum: { Args: never; Returns: boolean }
      pgroonga_wal_apply:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number }
      pgroonga_wal_set_applied_position:
        | { Args: never; Returns: boolean }
        | { Args: { block: number; offset: number }; Returns: boolean }
        | { Args: { indexname: unknown }; Returns: boolean }
        | {
            Args: { block: number; indexname: unknown; offset: number }
            Returns: boolean
          }
      pgroonga_wal_status: {
        Args: never
        Returns: {
          current_block: number
          current_offset: number
          current_size: number
          last_block: number
          last_offset: number
          last_size: number
          name: string
          oid: unknown
        }[]
      }
      pgroonga_wal_truncate:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number }
      set_admin_claim: { Args: { event: Json }; Returns: Json }
      update_combo_stats: {
        Args: { p_combo: string; p_delta: number; p_kind: string }
        Returns: undefined
      }
    }
    Enums: {
      events_type:
        | "page_view"
        | "list_view"
        | "detail_view"
        | "login_modal_open"
        | "login_completed"
        | "vote_click"
        | "bookmark_click"
        | "review_submit"
        | "combo_register_started"
        | "combo_register_submitted"
        | "order_copy"
        | "share_click"
        | "ranking_view"
        | "quiz_result_share"
        | "client_error"
        | "report_submit"
    }
    CompositeTypes: {
      pgroonga_condition: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        schema_name: string | null
        index_name: string | null
        column_name: string | null
        fuzzy_max_distance_ratio: number | null
      }
      pgroonga_full_text_search_condition: {
        query: string | null
        weigths: number[] | null
        indexname: string | null
      }
      pgroonga_full_text_search_condition_with_scorers: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        indexname: string | null
      }
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
      events_type: [
        "page_view",
        "list_view",
        "detail_view",
        "login_modal_open",
        "login_completed",
        "vote_click",
        "bookmark_click",
        "review_submit",
        "combo_register_started",
        "combo_register_submitted",
        "client_error",
        "report_submit",
      ],
    },
  },
} as const
