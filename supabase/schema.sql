-- ============================================================================
-- Finora ERP SaaS — Supabase / PostgreSQL Schema (OHADA, Sénégal, multi-tenant)
-- ============================================================================
-- To deploy on your Supabase project:
--   1. Open your Supabase dashboard → SQL Editor
--   2. Paste this file and run it
--   3. Set these env vars in your .env (server-side):
--        SUPABASE_URL=https://xxxxx.supabase.co
--        SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
--        NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
--        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
--   4. (Optional) To migrate the data layer from SQLite to Supabase Postgres:
--        - Update prisma/schema.prisma: provider = "postgresql"
--        - Update DATABASE_URL in .env to your Supabase connection string
--        - Run: bun run db:push
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- TENANT & AUTH
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists tenants (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  legal_name  text,
  siret       text,
  currency    text not null default 'XOF',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists users (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null references tenants(id) on delete cascade,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  role          text not null default 'VENDEUR' check (role in ('ADMIN','COMPTABLE','VENDEUR','STOCK_MANAGER')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_users_tenant on users(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACCOUNTING (OHADA)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists accounts (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null references tenants(id) on delete cascade,
  code       text not null,
  label      text not null,
  type       text not null check (type in ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  created_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create index if not exists idx_accounts_tenant on accounts(tenant_id);

create table if not exists journal_entries (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  reference   text not null,
  description text not null,
  date        timestamptz not null default now(),
  source      text not null check (source in ('SALE','PURCHASE','INVOICE','CASH','MANUAL')),
  source_id   text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_journal_tenant on journal_entries(tenant_id);
create index if not exists idx_journal_date on journal_entries(tenant_id, date);

create table if not exists journal_entry_lines (
  id              text primary key default gen_random_uuid()::text,
  journal_entry_id text not null references journal_entries(id) on delete cascade,
  account_id      text not null references accounts(id) on delete cascade,
  debit           numeric(14,2) not null default 0,
  credit          numeric(14,2) not null default 0
);
create index if not exists idx_jel_je on journal_entry_lines(journal_entry_id);
create index if not exists idx_jel_acc on journal_entry_lines(account_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS & STOCK
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists products (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  sku         text not null,
  name        text not null,
  description text,
  category    text,
  unit        text not null default 'pièce',
  sale_price  numeric(14,2) not null,
  cost_price  numeric(14,2) not null,
  tax_rate    numeric(5,2) not null default 18.0,
  stock_qty   numeric(14,2) not null default 0,
  min_stock   numeric(14,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, sku)
);
create index if not exists idx_products_tenant on products(tenant_id);

create table if not exists stock_movements (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null references tenants(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  type       text not null check (type in ('IN','OUT','ADJ')),
  qty        numeric(14,2) not null,
  reference  text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sm_tenant on stock_movements(tenant_id);
create index if not exists idx_sm_product on stock_movements(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMERS & SUPPLIERS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists customers (
  id           text primary key default gen_random_uuid()::text,
  tenant_id    text not null references tenants(id) on delete cascade,
  code         text not null,
  name         text not null,
  email        text,
  phone        text,
  address      text,
  city         text,
  country      text default 'Sénégal',
  tax_id       text,
  credit_limit numeric(14,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(tenant_id, code)
);
create index if not exists idx_customers_tenant on customers(tenant_id);

create table if not exists suppliers (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null references tenants(id) on delete cascade,
  code       text not null,
  name       text not null,
  email      text,
  phone      text,
  address    text,
  city       text,
  country    text default 'Sénégal',
  tax_id     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create index if not exists idx_suppliers_tenant on suppliers(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SALES & PURCHASES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists sales (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  reference   text not null,
  customer_id text not null references customers(id),
  user_id     text references users(id),
  date        timestamptz not null default now(),
  status      text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','INVOICED','PAID','CANCELLED')),
  subtotal    numeric(14,2) not null,
  tax_total   numeric(14,2) not null,
  total       numeric(14,2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, reference)
);
create index if not exists idx_sales_tenant on sales(tenant_id);
create index if not exists idx_sales_customer on sales(customer_id);

create table if not exists sale_items (
  id         text primary key default gen_random_uuid()::text,
  sale_id    text not null references sales(id) on delete cascade,
  product_id text not null references products(id),
  qty        numeric(14,2) not null,
  unit_price numeric(14,2) not null,
  tax_rate   numeric(5,2) not null,
  line_total numeric(14,2) not null
);
create index if not exists idx_si_sale on sale_items(sale_id);

create table if not exists purchases (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  reference   text not null,
  supplier_id text not null references suppliers(id),
  user_id     text references users(id),
  date        timestamptz not null default now(),
  status      text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','INVOICED','PAID','CANCELLED')),
  subtotal    numeric(14,2) not null,
  tax_total   numeric(14,2) not null,
  total       numeric(14,2) not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(tenant_id, reference)
);
create index if not exists idx_purchases_tenant on purchases(tenant_id);

create table if not exists purchase_items (
  id          text primary key default gen_random_uuid()::text,
  purchase_id text not null references purchases(id) on delete cascade,
  product_id  text not null references products(id),
  qty         numeric(14,2) not null,
  unit_price  numeric(14,2) not null,
  tax_rate    numeric(5,2) not null,
  line_total  numeric(14,2) not null
);
create index if not exists idx_pi_purchase on purchase_items(purchase_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- INVOICING
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id          text primary key default gen_random_uuid()::text,
  tenant_id   text not null references tenants(id) on delete cascade,
  number      text not null,
  type        text not null check (type in ('CUSTOMER','SUPPLIER')),
  party_type  text not null check (party_type in ('CUSTOMER','SUPPLIER')),
  party_id    text not null,
  party_name  text not null,
  sale_id     text unique references sales(id),
  purchase_id text unique references purchases(id),
  issue_date  timestamptz not null default now(),
  due_date    timestamptz,
  subtotal    numeric(14,2) not null,
  tax_total   numeric(14,2) not null,
  total       numeric(14,2) not null,
  paid_amount numeric(14,2) not null default 0,
  status      text not null default 'UNPAID' check (status in ('UNPAID','PARTIAL','PAID','CANCELLED')),
  created_at  timestamptz not null default now(),
  unique(tenant_id, number)
);
create index if not exists idx_invoices_tenant on invoices(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CASH & TREASURY
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists cash_entries (
  id            text primary key default gen_random_uuid()::text,
  tenant_id     text not null references tenants(id) on delete cascade,
  reference     text not null,
  type          text not null check (type in ('IN','OUT')),
  amount        numeric(14,2) not null,
  label         text not null,
  source        text not null check (source in ('SALE','PURCHASE','INVOICE_PAYMENT','MANUAL')),
  source_id     text,
  invoice_id    text references invoices(id),
  date          timestamptz not null default now(),
  balance_after numeric(14,2),
  created_at    timestamptz not null default now()
);
create index if not exists idx_cash_tenant on cash_entries(tenant_id);
create index if not exists idx_cash_date on cash_entries(tenant_id, date);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id         text primary key default gen_random_uuid()::text,
  tenant_id  text not null references tenants(id) on delete cascade,
  user_id    text references users(id) on delete set null,
  user_name  text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    text,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_tenant on audit_logs(tenant_id);
create index if not exists idx_audit_entity on audit_logs(tenant_id, entity);
create index if not exists idx_audit_created on audit_logs(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (multi-tenant isolation)
-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on every tenant-scoped table. With proper auth setup (Supabase Auth
-- + JWT containing tenant_id), policies ensure each user only sees their tenant's
-- rows. For the MVP using NextAuth (not Supabase Auth), RLS is enabled but
-- policies are permissive — actual isolation is enforced by the API layer.
-- ─────────────────────────────────────────────────────────────────────────────
alter table tenants           enable row level security;
alter table users             enable row level security;
alter table accounts          enable row level security;
alter table journal_entries   enable row level security;
alter table journal_entry_lines enable row level security;
alter table products          enable row level security;
alter table stock_movements   enable row level security;
alter table customers         enable row level security;
alter table suppliers         enable row level security;
alter table sales             enable row level security;
alter table sale_items        enable row level security;
alter table purchases         enable row level security;
alter table purchase_items    enable row level security;
alter table invoices          enable row level security;
alter table cash_entries      enable row level security;
alter table audit_logs        enable row level security;

-- Permissive policies (for service-role key). Tighten with JWT-based policies
-- once you wire Supabase Auth into the app.
create policy "service_role_all" on tenants for all using (auth.role() = 'service_role');
create policy "service_role_all" on users for all using (auth.role() = 'service_role');
create policy "service_role_all" on accounts for all using (auth.role() = 'service_role');
create policy "service_role_all" on journal_entries for all using (auth.role() = 'service_role');
create policy "service_role_all" on journal_entry_lines for all using (auth.role() = 'service_role');
create policy "service_role_all" on products for all using (auth.role() = 'service_role');
create policy "service_role_all" on stock_movements for all using (auth.role() = 'service_role');
create policy "service_role_all" on customers for all using (auth.role() = 'service_role');
create policy "service_role_all" on suppliers for all using (auth.role() = 'service_role');
create policy "service_role_all" on sales for all using (auth.role() = 'service_role');
create policy "service_role_all" on sale_items for all using (auth.role() = 'service_role');
create policy "service_role_all" on purchases for all using (auth.role() = 'service_role');
create policy "service_role_all" on purchase_items for all using (auth.role() = 'service_role');
create policy "service_role_all" on invoices for all using (auth.role() = 'service_role');
create policy "service_role_all" on cash_entries for all using (auth.role() = 'service_role');
create policy "service_role_all" on audit_logs for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime — enable broadcast on all tables so Supabase Realtime picks up
-- inserts/updates/deletes automatically.
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table tenants;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table sales;
alter publication supabase_realtime add table purchases;
alter publication supabase_realtime add table invoices;
alter publication supabase_realtime add table cash_entries;
alter publication supabase_realtime add table journal_entries;
alter publication supabase_realtime add table stock_movements;
alter publication supabase_realtime add table audit_logs;

-- Done. The schema is now ready on Supabase.
-- To switch your Prisma app to use it: update prisma/schema.prisma (provider="postgresql"),
-- set DATABASE_URL to your Supabase connection string, run `bun run db:push`.
