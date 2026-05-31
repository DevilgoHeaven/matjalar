-- ===================================================================
-- catalog_change_logs 승인 RPC
--
-- 카탈로그 변경 적용과 로그 상태 전환은 하나의 트랜잭션 안에서 성공/실패해야 한다.
-- Server Action 에서 여러 HTTP 쿼리로 나누면 승인 상태와 production 테이블이
-- 어긋날 수 있어, row lock 기반 SECURITY DEFINER RPC 로 묶는다.
-- ===================================================================

create or replace function public.approve_catalog_change(p_change uuid)
returns table (
  change_id uuid,
  target_type text,
  change_type text,
  affected_brand_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_change public.catalog_change_logs%rowtype;
  v_data jsonb;
  v_id uuid;
  v_brand_id uuid;
  v_menu_id uuid;
  v_option_group_id uuid;
  v_external_id text;
  v_name text;
  v_aliases text[];
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.current_app_user_is_active_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  select *
    into v_change
    from public.catalog_change_logs
   where id = p_change
   for update;

  if not found or v_change.status <> 'pending' then
    raise exception '카탈로그 변경이 이미 처리되었거나 찾을 수 없습니다.';
  end if;

  if v_change.change_type = 'selector_error' then
    raise exception '셀렉터 오류는 production 카탈로그에 적용할 수 없습니다. 무시 처리해 주세요.';
  end if;

  if v_change.change_type in ('created', 'updated') then
    if v_change.after_data is null or jsonb_typeof(v_change.after_data) <> 'object' then
      raise exception 'after_data JSON 객체가 필요합니다.';
    end if;
    v_data := v_change.after_data;

    case v_change.target_type
      when 'menu' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_brand_id := coalesce(nullif(v_data->>'brand_id', '')::uuid, v_change.brand_id);
        v_external_id := coalesce(nullif(v_data->>'external_id', ''), v_change.external_id);
        v_name := nullif(trim(v_data->>'name'), '');

        if v_brand_id is null then
          raise exception '메뉴 변경에는 brand_id 가 필요합니다.';
        end if;
        if v_name is null then
          raise exception '메뉴 변경에는 name 이 필요합니다.';
        end if;
        if v_id is null and v_external_id is null then
          raise exception '메뉴 변경에는 id 또는 external_id 가 필요합니다.';
        end if;

        if v_id is not null then
          insert into public.menus (
            id, brand_id, external_id, name, slug, category_kind, status,
            source_url, last_synced_at
          )
          values (
            v_id,
            v_brand_id,
            v_external_id,
            v_name,
            nullif(trim(v_data->>'slug'), ''),
            nullif(trim(v_data->>'category_kind'), ''),
            coalesce(nullif(v_data->>'status', ''), 'active'),
            nullif(trim(v_data->>'source_url'), ''),
            now()
          )
          on conflict (id) do update
             set brand_id = excluded.brand_id,
                 external_id = excluded.external_id,
                 name = excluded.name,
                 slug = excluded.slug,
                 category_kind = excluded.category_kind,
                 status = excluded.status,
                 source_url = excluded.source_url,
                 last_synced_at = excluded.last_synced_at;
        else
          insert into public.menus (
            brand_id, external_id, name, slug, category_kind, status,
            source_url, last_synced_at
          )
          values (
            v_brand_id,
            v_external_id,
            v_name,
            nullif(trim(v_data->>'slug'), ''),
            nullif(trim(v_data->>'category_kind'), ''),
            coalesce(nullif(v_data->>'status', ''), 'active'),
            nullif(trim(v_data->>'source_url'), ''),
            now()
          )
          on conflict (brand_id, external_id) do update
             set name = excluded.name,
                 slug = excluded.slug,
                 category_kind = excluded.category_kind,
                 status = excluded.status,
                 source_url = excluded.source_url,
                 last_synced_at = excluded.last_synced_at;
        end if;

      when 'menu_variant' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_menu_id := nullif(v_data->>'menu_id', '')::uuid;
        v_name := nullif(trim(v_data->>'name'), '');

        if v_menu_id is null or v_name is null then
          raise exception '메뉴 변형 변경에는 menu_id 와 name 이 필요합니다.';
        end if;

        if v_id is not null then
          insert into public.menu_variants (
            id, menu_id, name, base_price, is_default, sort_order
          )
          values (
            v_id,
            v_menu_id,
            v_name,
            coalesce(nullif(v_data->>'base_price', '')::integer, 0),
            coalesce(nullif(v_data->>'is_default', '')::boolean, false),
            coalesce(nullif(v_data->>'sort_order', '')::integer, 0)
          )
          on conflict (id) do update
             set menu_id = excluded.menu_id,
                 name = excluded.name,
                 base_price = excluded.base_price,
                 is_default = excluded.is_default,
                 sort_order = excluded.sort_order;
        else
          insert into public.menu_variants (
            menu_id, name, base_price, is_default, sort_order
          )
          values (
            v_menu_id,
            v_name,
            coalesce(nullif(v_data->>'base_price', '')::integer, 0),
            coalesce(nullif(v_data->>'is_default', '')::boolean, false),
            coalesce(nullif(v_data->>'sort_order', '')::integer, 0)
          )
          on conflict (menu_id, name) do update
             set base_price = excluded.base_price,
                 is_default = excluded.is_default,
                 sort_order = excluded.sort_order;
        end if;

      when 'option_group' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_brand_id := coalesce(nullif(v_data->>'brand_id', '')::uuid, v_change.brand_id);
        v_name := nullif(trim(v_data->>'name'), '');

        if v_id is null then
          raise exception '옵션 그룹은 unique key 가 없어 id 없는 변경을 자동 승인할 수 없습니다.';
        end if;
        if v_brand_id is null or v_name is null then
          raise exception '옵션 그룹 변경에는 brand_id 와 name 이 필요합니다.';
        end if;

        insert into public.option_groups (
          id, brand_id, menu_id, name, selection_mode, option_role,
          min_select, max_select, is_required, show_in_card, card_priority,
          sort_order
        )
        values (
          v_id,
          v_brand_id,
          nullif(v_data->>'menu_id', '')::uuid,
          v_name,
          coalesce(nullif(v_data->>'selection_mode', ''), 'single'),
          coalesce(nullif(v_data->>'option_role', ''), 'include'),
          coalesce(nullif(v_data->>'min_select', '')::integer, 0),
          coalesce(nullif(v_data->>'max_select', '')::integer, 1),
          coalesce(nullif(v_data->>'is_required', '')::boolean, false),
          coalesce(nullif(v_data->>'show_in_card', '')::boolean, true),
          coalesce(nullif(v_data->>'card_priority', '')::integer, 0),
          coalesce(nullif(v_data->>'sort_order', '')::integer, 0)
        )
        on conflict (id) do update
           set brand_id = excluded.brand_id,
               menu_id = excluded.menu_id,
               name = excluded.name,
               selection_mode = excluded.selection_mode,
               option_role = excluded.option_role,
               min_select = excluded.min_select,
               max_select = excluded.max_select,
               is_required = excluded.is_required,
               show_in_card = excluded.show_in_card,
               card_priority = excluded.card_priority,
               sort_order = excluded.sort_order;

      when 'option_item' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_option_group_id := nullif(v_data->>'option_group_id', '')::uuid;
        v_external_id := coalesce(nullif(v_data->>'external_id', ''), v_change.external_id);
        v_name := nullif(trim(v_data->>'name'), '');

        if v_option_group_id is null or v_name is null then
          raise exception '옵션 항목 변경에는 option_group_id 와 name 이 필요합니다.';
        end if;
        if v_data ? 'alias_names' and jsonb_typeof(v_data->'alias_names') <> 'array' then
          raise exception 'alias_names 는 문자열 배열이어야 합니다.';
        end if;

        select coalesce(array_agg(value), '{}'::text[])
          into v_aliases
          from jsonb_array_elements_text(coalesce(v_data->'alias_names', '[]'::jsonb)) as alias(value)
         where trim(value) <> '';

        if v_id is not null then
          insert into public.option_items (
            id, option_group_id, external_id, name, alias_names, price_delta,
            is_available, sort_order
          )
          values (
            v_id,
            v_option_group_id,
            v_external_id,
            v_name,
            v_aliases,
            coalesce(nullif(v_data->>'price_delta', '')::integer, 0),
            coalesce(nullif(v_data->>'is_available', '')::boolean, true),
            coalesce(nullif(v_data->>'sort_order', '')::integer, 0)
          )
          on conflict (id) do update
             set option_group_id = excluded.option_group_id,
                 external_id = excluded.external_id,
                 name = excluded.name,
                 alias_names = excluded.alias_names,
                 price_delta = excluded.price_delta,
                 is_available = excluded.is_available,
                 sort_order = excluded.sort_order;
        else
          insert into public.option_items (
            option_group_id, external_id, name, alias_names, price_delta,
            is_available, sort_order
          )
          values (
            v_option_group_id,
            v_external_id,
            v_name,
            v_aliases,
            coalesce(nullif(v_data->>'price_delta', '')::integer, 0),
            coalesce(nullif(v_data->>'is_available', '')::boolean, true),
            coalesce(nullif(v_data->>'sort_order', '')::integer, 0)
          )
          on conflict (option_group_id, name) do update
             set external_id = excluded.external_id,
                 alias_names = excluded.alias_names,
                 price_delta = excluded.price_delta,
                 is_available = excluded.is_available,
                 sort_order = excluded.sort_order;
        end if;

      else
        raise exception '지원하지 않는 카탈로그 대상입니다: %', v_change.target_type;
    end case;
  elsif v_change.change_type = 'missing' then
    v_data := coalesce(v_change.before_data, v_change.after_data);
    if v_data is null or jsonb_typeof(v_data) <> 'object' then
      raise exception 'missing 변경에는 before_data JSON 객체가 필요합니다.';
    end if;

    case v_change.target_type
      when 'menu' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_brand_id := coalesce(nullif(v_data->>'brand_id', '')::uuid, v_change.brand_id);
        v_external_id := coalesce(nullif(v_data->>'external_id', ''), v_change.external_id);

        if v_id is not null then
          update public.menus
             set status = 'discontinued',
                 last_synced_at = now()
           where id = v_id;
        else
          if v_brand_id is null or v_external_id is null then
            raise exception '누락 메뉴 처리에는 id 또는 brand_id/external_id 가 필요합니다.';
          end if;
          update public.menus
             set status = 'discontinued',
                 last_synced_at = now()
           where brand_id = v_brand_id
             and external_id = v_external_id;
        end if;

        if not found then
          raise exception '누락 처리할 메뉴를 찾을 수 없습니다.';
        end if;

      when 'option_item' then
        v_id := nullif(v_data->>'id', '')::uuid;
        v_option_group_id := nullif(v_data->>'option_group_id', '')::uuid;
        v_external_id := coalesce(nullif(v_data->>'external_id', ''), v_change.external_id);
        v_name := nullif(trim(v_data->>'name'), '');

        if v_id is not null then
          update public.option_items
             set is_available = false
           where id = v_id;
        elsif v_option_group_id is not null and v_external_id is not null then
          update public.option_items
             set is_available = false
           where option_group_id = v_option_group_id
             and external_id = v_external_id;
        elsif v_option_group_id is not null and v_name is not null then
          update public.option_items
             set is_available = false
           where option_group_id = v_option_group_id
             and name = v_name;
        else
          raise exception '누락 옵션 처리에는 id 또는 option_group_id/name 이 필요합니다.';
        end if;

        if not found then
          raise exception '누락 처리할 옵션 항목을 찾을 수 없습니다.';
        end if;

      when 'menu_variant', 'option_group' then
        raise exception '이 대상은 현재 스키마에 비활성 상태 필드가 없어 자동 승인할 수 없습니다. 무시 처리해 주세요.';

      else
        raise exception '지원하지 않는 카탈로그 대상입니다: %', v_change.target_type;
    end case;
  else
    raise exception '지원하지 않는 변경 종류입니다: %', v_change.change_type;
  end if;

  update public.catalog_change_logs
     set status = 'approved'
   where id = v_change.id;

  return query
    select v_change.id, v_change.target_type, v_change.change_type, v_change.brand_id;
end;
$$;

revoke all on function public.approve_catalog_change(uuid) from public;
grant execute on function public.approve_catalog_change(uuid)
  to authenticated, service_role;

comment on function public.approve_catalog_change(uuid) is
  'catalog_change_logs pending row 를 row lock 으로 승인하고 production catalog 변경과 status=approved 를 한 트랜잭션으로 적용';
