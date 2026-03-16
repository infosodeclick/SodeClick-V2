-- SodeClick V2 MVP schema (PostgreSQL)

create table if not exists roles (
  id bigserial primary key,
  name varchar(50) unique not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists users (
  id bigserial primary key,
  username varchar(60) unique not null,
  email varchar(120) unique not null,
  phone varchar(30),
  password_hash text not null,
  status varchar(20) default 'active',
  role_id bigint references roles(id),
  is_email_verified boolean default false,
  is_phone_verified boolean default false,
  is_selfie_verified boolean default false,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_profiles (
  id bigserial primary key,
  user_id bigint unique not null references users(id) on delete cascade,
  display_name varchar(100),
  bio text,
  gender varchar(20),
  birth_date date,
  age int,
  province_id bigint,
  city varchar(100),
  occupation varchar(120),
  relationship_goal_id bigint,
  online_status varchar(20) default 'offline',
  last_active_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_likes (
  id bigserial primary key,
  from_user_id bigint not null references users(id) on delete cascade,
  to_user_id bigint not null references users(id) on delete cascade,
  like_type varchar(20) not null default 'like',
  created_at timestamptz default now()
);

create table if not exists matches (
  id bigserial primary key,
  user1_id bigint not null references users(id) on delete cascade,
  user2_id bigint not null references users(id) on delete cascade,
  matched_at timestamptz default now(),
  status varchar(20) default 'active',
  created_at timestamptz default now()
);

create unique index if not exists ux_matches_pair
on matches (least(user1_id,user2_id), greatest(user1_id,user2_id));

create table if not exists chat_rooms (
  id bigserial primary key,
  match_id bigint unique references matches(id) on delete cascade,
  room_type varchar(20) default 'private',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_messages (
  id bigserial primary key,
  room_id bigint not null references chat_rooms(id) on delete cascade,
  sender_user_id bigint not null references users(id) on delete cascade,
  message_type varchar(20) default 'text',
  message_text text,
  attachment_url text,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists user_wallets (
  id bigserial primary key,
  user_id bigint unique not null references users(id) on delete cascade,
  balance bigint default 0,
  updated_at timestamptz default now()
);

create table if not exists wallet_transactions (
  id bigserial primary key,
  wallet_id bigint not null references user_wallets(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  transaction_type varchar(40) not null,
  direction varchar(10) not null,
  amount bigint not null,
  balance_before bigint not null,
  balance_after bigint not null,
  reference_type varchar(40),
  reference_id varchar(80),
  note text,
  created_at timestamptz default now()
);

create table if not exists vip_plans (
  id bigserial primary key,
  name varchar(60) not null,
  duration_days int not null,
  price numeric(12,2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists vip_subscriptions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  vip_plan_id bigint not null references vip_plans(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status varchar(20) default 'active',
  payment_id varchar(80),
  created_at timestamptz default now()
);

create table if not exists profile_frames (
  id bigserial primary key,
  frame_name varchar(80) not null,
  frame_code varchar(40) unique not null,
  preview_image_url text,
  frame_css_class varchar(120),
  rarity varchar(30),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists user_profile_frame_inventory (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  frame_id bigint not null references profile_frames(id) on delete cascade,
  purchased_at timestamptz default now(),
  is_active boolean default true,
  unique(user_id, frame_id)
);

create table if not exists user_active_profile_frame (
  id bigserial primary key,
  user_id bigint unique not null references users(id) on delete cascade,
  frame_id bigint references profile_frames(id),
  applied_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists board_categories (
  id bigserial primary key,
  name varchar(80) not null,
  slug varchar(80) unique not null,
  description text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists board_topics (
  id bigserial primary key,
  category_id bigint references board_categories(id),
  user_id bigint references users(id),
  title varchar(180) not null,
  content text not null,
  view_count int default 0,
  like_count int default 0,
  comment_count int default 0,
  is_pinned boolean default false,
  status varchar(20) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists board_comments (
  id bigserial primary key,
  topic_id bigint not null references board_topics(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  parent_comment_id bigint references board_comments(id),
  content text not null,
  like_count int default 0,
  status varchar(20) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payments (
  id bigserial primary key,
  user_id bigint not null references users(id),
  payment_type varchar(40) not null,
  reference_type varchar(40),
  reference_id varchar(80),
  amount numeric(12,2) not null,
  currency varchar(10) default 'THB',
  provider varchar(40),
  provider_ref varchar(120),
  status varchar(20) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);
