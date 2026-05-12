create extension if not exists pgcrypto;

create table if not exists booths (
  booth_no integer primary key,
  name text not null,
  type text not null check (type in ('experience', 'medical', 'exchange', 'hq', 'waiting', 'rest')),
  zone text null,
  x numeric null,
  y numeric null,
  created_at timestamptz not null default now()
);

create table if not exists booth_statuses (
  booth_no integer primary key references booths(booth_no) on delete cascade,
  operation_status text not null check (operation_status in ('READY', 'OPEN', 'PAUSED', 'CLOSED')),
  congestion_level integer not null check (congestion_level between 0 and 4),
  wait_minutes integer not null check (wait_minutes in (0, 5, 10, 20, 30)),
  material_status text not null check (material_status in ('OK', 'LOW', 'OUT')),
  help_requested boolean not null default false,
  help_type text null check (help_type in ('STAFF', 'MATERIAL', 'EQUIPMENT', 'SAFETY', 'ETC')),
  memo text null,
  updated_at timestamptz not null default now()
);

create table if not exists booth_status_logs (
  id uuid primary key default gen_random_uuid(),
  booth_no integer not null references booths(booth_no) on delete cascade,
  field text not null,
  old_value text null,
  new_value text null,
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  booth_no integer not null references booths(booth_no) on delete cascade,
  type text not null check (type in ('STAFF', 'MATERIAL', 'EQUIPMENT', 'SAFETY', 'ETC')),
  memo text null,
  status text not null check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booth_status_logs_booth_no_created_at_idx
  on booth_status_logs (booth_no, created_at desc);

create index if not exists incidents_booth_no_status_idx
  on incidents (booth_no, status);

alter table booths enable row level security;
alter table booth_statuses enable row level security;
alter table booth_status_logs enable row level security;
alter table incidents enable row level security;

insert into booths (booth_no, name, type) values
  (1, '새싹 플레이존', 'experience'),
  (2, '발명 공작소, 드릴로 만드는 나만의 연필꽂이', 'experience'),
  (3, '지구를 위한 작은 실천, 나만의 에코 굿즈', 'experience'),
  (4, '나만의 뱃지 만들기', 'experience'),
  (5, '작고 소중한 나만의 키링&비즈스트랩', 'experience'),
  (6, '소잉디자이너 LAB : AI 거울 만들기', 'experience'),
  (7, '뚜껑을 활용한 클리커 만들기', 'experience'),
  (8, '의료부스, 활력징후 측정', 'medical'),
  (9, '쉼터', 'rest'),
  (10, '업사이클링 키링 팩토리', 'experience'),
  (11, '마음 휴게소 : 여름의 끝에서 만난 나', 'experience'),
  (12, '너와 나의 MBTI 연결고리 : 배방청소년자유공간은 무슨 유형일까?', 'experience'),
  (13, '나만의 커피드립백 만들기', 'experience'),
  (14, '수학으로 함께 놀아요.', 'experience'),
  (15, '날아라 드론체험', 'experience'),
  (16, '퀴즈풀고 자전거 안전고리 받자 1388불꽃단 볼펜꾸미기', 'experience'),
  (17, '미래산업꿈나무아카데미 레고 AI 체험존', 'experience'),
  (18, '청소년 퍼스널 트레이닝 체험존', 'experience'),
  (19, '(사)한국디지털사진가협회 충남지부 아산지회', 'experience'),
  (20, '아산시학생회장단연합회[내팀] 사랑은 키링을 타고', 'experience'),
  (21, '이거 때부세요', 'experience'),
  (22, '재활용품을 활용한 에코 키캡 만들기', 'experience'),
  (23, '스포츠스태킹 뇌벨업 챌린지', 'experience'),
  (24, '분리수거 게임랜드', 'experience'),
  (25, '한빛과 함께하는 [나의 KEY를 찾아라!] 키캡 키링 만들기', 'experience'),
  (26, '그나래 공작소: 나만의 감성을 만듭니다.', 'experience'),
  (27, '청소년유스카페운영단 꿈빛샷 나만의 힐링쿠키 꾸미기', 'experience'),
  (28, '그나래 포토랩 : 지금의 나를 담아드립니다.', 'experience'),
  (29, '아산시청소년상담복지센터 힐링액자 만들기', 'experience'),
  (30, '청소년 전략본부-작전회의 작전명 : 정책요원 미션 클리어', 'experience'),
  (31, '내 몸 밸런스 테스트', 'experience'),
  (32, '온새미로', 'experience'),
  (33, '요리조리 나만의 컵케이크 만들기', 'experience'),
  (34, '청소년운영위원회 “청하랑”이 지켜주는 뽀송뽀송한 우리집', 'experience'),
  (35, '꿈달아와 함께하는 먹는 화분 만들기', 'experience'),
  (36, '새롭게, 다시 만드는 업사이클링[과자봉투 키링 / 과자박스 노트]', 'experience'),
  (37, '꾸.꾸.페(꾸미지가 꾸리는 페이스페인팅)', 'experience'),
  (38, 'We are Epilizer', 'experience'),
  (39, '배방청소년자유공간 쏘잉티어스와 함께하는 양말목, 네잎클로버 키링 만들기', 'experience'),
  (40, '체험부스 코인 & 상품 교환소', 'exchange'),
  (41, '운영본부(종합안내, 접수, 미아보호소)', 'hq'),
  (44, '청소년재능경연대회 대기실', 'waiting')
on conflict (booth_no) do update set
  name = excluded.name,
  type = excluded.type;

insert into booth_statuses (
  booth_no,
  operation_status,
  congestion_level,
  wait_minutes,
  material_status,
  help_requested,
  updated_at
)
select booth_no, 'READY', 0, 0, 'OK', false, now()
from booths
on conflict (booth_no) do nothing;

update booths
set x = coords.x,
    y = coords.y
from (
  values
    (1, 15.8, 72.8),
    (2, 18.3, 72.3),
    (3, 20.8, 71.1),
    (4, 23.3, 69.8),
    (5, 25.7, 68.6),
    (6, 28.1, 66.6),
    (7, 30.7, 66.1),
    (8, 35.4, 64.8),
    (9, 20.5, 96.6),
    (10, 22.6, 94.7),
    (11, 24.9, 94.2),
    (12, 27.1, 93.0),
    (13, 29.3, 91.8),
    (14, 31.5, 89.8),
    (15, 33.7, 88.6),
    (16, 36.0, 88.1),
    (17, 38.1, 86.2),
    (18, 40.3, 84.9),
    (19, 37.4, 48.1),
    (20, 38.8, 51.4),
    (21, 40.7, 54.2),
    (22, 42.7, 56.9),
    (23, 45.0, 59.1),
    (24, 47.5, 61.0),
    (25, 50.1, 62.0),
    (26, 52.9, 62.2),
    (27, 55.4, 61.2),
    (28, 57.8, 59.3),
    (29, 63.0, 53.7),
    (30, 62.0, 49.0),
    (31, 60.8, 44.3),
    (32, 59.9, 39.7),
    (33, 59.0, 35.2),
    (34, 58.7, 30.5),
    (35, 60.4, 27.1),
    (36, 62.8, 25.5),
    (37, 40.4, 37.0),
    (38, 42.8, 35.7),
    (39, 45.3, 34.6),
    (40, 47.6, 33.1),
    (41, 15.9, 44.7),
    (44, 86.5, 40.0)
) as coords(booth_no, x, y)
where booths.booth_no = coords.booth_no;
