-- SodeClick V2 Full-scale extensions (PostgreSQL)
-- ต่อจาก 001_mvp_schema.sql

create table if not exists user_sessions (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  token text not null,
  ip_address varchar(64),
  user_agent text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists password_resets (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  reset_token text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists email_verifications (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  verify_token text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists phone_verifications (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  phone varchar(30),
  otp_code varchar(10),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists provinces (
  id bigserial primary key,
  name_th varchar(120) not null,
  name_en varchar(120),
  region varchar(80),
  is_active boolean default true
);

create table if not exists relationship_goals (
  id bigserial primary key,
  name varchar(100) not null,
  description text
);

create table if not exists user_profile_photos (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  photo_url text not null,
  sort_order int default 0,
  is_primary boolean default false,
  is_approved boolean default true,
  created_at timestamptz default now()
);

create table if not exists user_interests (
  id bigserial primary key,
  name varchar(120) not null,
  category varchar(80),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists user_profile_interest_map (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  interest_id bigint not null references user_interests(id),
  created_at timestamptz default now(),
  unique(user_id, interest_id)
);

create table if not exists user_passes (
  id bigserial primary key,
  from_user_id bigint not null references users(id) on delete cascade,
  to_user_id bigint not null references users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists profile_boosts (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  boost_type varchar(40),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status varchar(20) default 'active',
  created_at timestamptz default now()
);

create table if not exists user_search_logs (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  keyword varchar(120),
  min_age int,
  max_age int,
  gender varchar(20),
  province_id bigint,
  relationship_goal_id bigint,
  created_at timestamptz default now()
);

create table if not exists chat_room_members (
  id bigserial primary key,
  room_id bigint not null references chat_rooms(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

create table if not exists chat_message_reads (
  id bigserial primary key,
  message_id bigint not null references chat_messages(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  read_at timestamptz default now(),
  unique(message_id, user_id)
);

create table if not exists chat_attachments (
  id bigserial primary key,
  message_id bigint not null references chat_messages(id) on delete cascade,
  file_url text,
  file_type varchar(40),
  file_size bigint,
  created_at timestamptz default now()
);

create table if not exists gifts (
  id bigserial primary key,
  name varchar(120) not null,
  description text,
  icon_url text,
  coin_price int not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists gift_transactions (
  id bigserial primary key,
  gift_id bigint references gifts(id),
  sender_user_id bigint references users(id),
  receiver_user_id bigint references users(id),
  room_id bigint references chat_rooms(id),
  coin_used int,
  created_at timestamptz default now()
);

create table if not exists store_categories (
  id bigserial primary key,
  name varchar(120) not null,
  slug varchar(120) unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists store_items (
  id bigserial primary key,
  category_id bigint references store_categories(id),
  item_type varchar(40),
  name varchar(120),
  description text,
  image_url text,
  coin_price int,
  cash_price numeric(12,2),
  is_repeatable boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists profile_frame_purchase_logs (
  id bigserial primary key,
  user_id bigint references users(id),
  frame_id bigint references profile_frames(id),
  coin_used int,
  purchase_source varchar(40),
  created_at timestamptz default now()
);

create table if not exists coin_packages (
  id bigserial primary key,
  package_name varchar(80),
  coin_amount int,
  price numeric(12,2),
  bonus_coin int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists coin_topups (
  id bigserial primary key,
  user_id bigint references users(id),
  coin_package_id bigint references coin_packages(id),
  payment_id bigint,
  total_coin_received int,
  status varchar(20) default 'pending',
  created_at timestamptz default now()
);

create table if not exists vip_features (
  id bigserial primary key,
  feature_key varchar(80) unique,
  feature_name varchar(120),
  description text,
  is_active boolean default true
);

create table if not exists vip_plan_feature_map (
  id bigserial primary key,
  vip_plan_id bigint references vip_plans(id),
  vip_feature_id bigint references vip_features(id),
  unique(vip_plan_id, vip_feature_id)
);

create table if not exists board_topic_tags (
  id bigserial primary key,
  topic_id bigint references board_topics(id) on delete cascade,
  tag_name varchar(80),
  created_at timestamptz default now()
);

create table if not exists board_topic_likes (
  id bigserial primary key,
  topic_id bigint references board_topics(id) on delete cascade,
  user_id bigint references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(topic_id, user_id)
);

create table if not exists board_comment_likes (
  id bigserial primary key,
  comment_id bigint references board_comments(id) on delete cascade,
  user_id bigint references users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

create table if not exists notifications (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  notification_type varchar(40),
  title varchar(160),
  message text,
  reference_type varchar(40),
  reference_id varchar(120),
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists report_reasons (
  id bigserial primary key,
  name varchar(120) not null,
  description text,
  is_active boolean default true
);

create table if not exists user_reports (
  id bigserial primary key,
  reporter_user_id bigint references users(id),
  reported_user_id bigint references users(id),
  reason_id bigint references report_reasons(id),
  detail text,
  status varchar(20) default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists content_reports (
  id bigserial primary key,
  reporter_user_id bigint references users(id),
  content_type varchar(40),
  content_id varchar(120),
  reason_id bigint references report_reasons(id),
  detail text,
  status varchar(20) default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists user_blocks (
  id bigserial primary key,
  user_id bigint references users(id),
  blocked_user_id bigint references users(id),
  created_at timestamptz default now(),
  unique(user_id, blocked_user_id)
);

create table if not exists moderation_logs (
  id bigserial primary key,
  admin_user_id bigint references users(id),
  action_type varchar(80),
  target_type varchar(40),
  target_id varchar(120),
  note text,
  created_at timestamptz default now()
);

create table if not exists payment_logs (
  id bigserial primary key,
  payment_id bigint references payments(id) on delete cascade,
  raw_response text,
  status varchar(20),
  created_at timestamptz default now()
);

create table if not exists admin_login_logs (
  id bigserial primary key,
  user_id bigint references users(id),
  ip_address varchar(64),
  user_agent text,
  login_at timestamptz default now(),
  status varchar(20)
);

create table if not exists system_settings (
  id bigserial primary key,
  setting_key varchar(120) unique not null,
  setting_value text,
  description text,
  updated_at timestamptz default now()
);

create table if not exists feature_flags (
  id bigserial primary key,
  feature_key varchar(120) unique not null,
  is_enabled boolean default false,
  description text,
  updated_at timestamptz default now()
);
