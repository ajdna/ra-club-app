-- Migration: Allow users to read their own upline rows in hierarchy_closure
--
-- Problem: The existing closure_select_downline policy only allowed reading rows
-- where ancestor_id = app_user_id() (i.e., your downline). Members querying
-- their own coach (upline, where descendant_id = app_user_id()) got empty results
-- because RLS blocked those rows. This also caused the users_select_upline policy
-- on the users table to fail (its EXISTS subquery hit the same RLS wall).
--
-- Fix: Add a complementary policy that allows reading rows where you are the descendant.

create policy closure_select_upline on hierarchy_closure
  for select using ( descendant_id = app_user_id() );
