-- Atomically applies one swipe to a user's aggregated stats, including
-- daily-goal and streak bookkeeping. Called by the imap-action edge
-- function with the service_role key.
create or replace function public.apply_swipe_stats(
  p_user_id uuid,
  p_action text,
  p_size_bytes bigint
) returns public.user_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats public.user_stats;
  v_today date := current_date;
  v_is_new_day boolean;
  v_was_yesterday boolean;
begin
  insert into public.user_stats (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_stats from public.user_stats where user_id = p_user_id for update;

  v_is_new_day := v_stats.last_swipe_date is distinct from v_today;
  v_was_yesterday := v_stats.last_swipe_date = v_today - interval '1 day';

  update public.user_stats
  set
    total_swiped = total_swiped + 1,
    total_deleted = total_deleted + case when p_action = 'delete' then 1 else 0 end,
    total_archived = total_archived + case when p_action = 'archive' then 1 else 0 end,
    total_kept = total_kept + case when p_action = 'keep' then 1 else 0 end,
    total_spam = total_spam + case when p_action = 'spam' then 1 else 0 end,
    bytes_freed = bytes_freed + case when p_action in ('delete', 'spam') then p_size_bytes else 0 end,
    current_streak = case
      when v_is_new_day and v_was_yesterday then current_streak + 1
      when v_is_new_day then 1
      else current_streak
    end,
    longest_streak = greatest(
      longest_streak,
      case
        when v_is_new_day and v_was_yesterday then current_streak + 1
        when v_is_new_day then 1
        else current_streak
      end
    ),
    last_swipe_date = v_today,
    swiped_today = case when v_is_new_day then 1 else swiped_today + 1 end,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_stats;

  return v_stats;
end;
$$;

revoke all on function public.apply_swipe_stats(uuid, text, bigint) from public;
