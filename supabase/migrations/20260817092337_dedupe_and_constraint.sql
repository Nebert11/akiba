-- 1) Deduplicate categories by user + name (case-insensitive), keep earliest
with ranked as (
	select
		id,
		user_id,
		lower(name) as lname,
		row_number() over (
			partition by user_id, lower(name)
			order by created_at, id
		) as rn,
		first_value(id) over (
			partition by user_id, lower(name)
			order by created_at, id
		) as keep_id
	from categories
),
dupes as (
	select id, keep_id
	from ranked
	where rn > 1
)
update budget_categories bc
set category_id = d.keep_id
from dupes d
where bc.category_id = d.id;

with ranked as (
	select
		id,
		user_id,
		lower(name) as lname,
		row_number() over (
			partition by user_id, lower(name)
			order by created_at, id
		) as rn,
		first_value(id) over (
			partition by user_id, lower(name)
			order by created_at, id
		) as keep_id
	from categories
),
dupes as (
	select id, keep_id
	from ranked
	where rn > 1
)
update transactions t
set category_id = d.keep_id
from dupes d
where t.category_id = d.id;

with ranked as (
	select
		id,
		user_id,
		lower(name) as lname,
		row_number() over (
			partition by user_id, lower(name)
			order by created_at, id
		) as rn
	from categories
)
delete from categories c
using ranked r
where c.id = r.id
	and r.rn > 1;

-- 2) Deduplicate budgets by user + month_date, keep earliest
with ranked as (
	select
		id,
		user_id,
		month_date,
		row_number() over (
			partition by user_id, month_date
			order by created_at, id
		) as rn,
		first_value(id) over (
			partition by user_id, month_date
			order by created_at, id
		) as keep_id
	from budgets
),
dupes as (
	select id, keep_id
	from ranked
	where rn > 1
)
update budget_categories bc
set budget_id = d.keep_id
from dupes d
where bc.budget_id = d.id;

-- 3) Remove duplicate budget_category lines (same budget + category), keep earliest
with ranked as (
	select
		id,
		row_number() over (
			partition by budget_id, category_id
			order by created_at, id
		) as rn
	from budget_categories
)
delete from budget_categories bc
using ranked r
where bc.id = r.id
	and r.rn > 1;

-- 4) Delete duplicate budget rows after remap
with ranked as (
	select
		id,
		row_number() over (
			partition by user_id, month_date
			order by created_at, id
		) as rn
	from budgets
)
delete from budgets b
using ranked r
where b.id = r.id
	and r.rn > 1;

-- 5) Prevent duplicates going forward
create unique index if not exists ux_categories_user_lower_name
	on categories (user_id, lower(name));

create unique index if not exists ux_budgets_user_month
	on budgets (user_id, month_date);

create unique index if not exists ux_budget_categories_budget_category
	on budget_categories (budget_id, category_id);
