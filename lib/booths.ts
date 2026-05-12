import type { Booth, BoothStatus } from './types';

export const booths: Booth[] = [
  { boothNo: 1, name: '새싹 플레이존', type: 'experience' },
  { boothNo: 2, name: '발명 공작소, 드릴로 만드는 나만의 연필꽂이', type: 'experience' },
  { boothNo: 3, name: '지구를 위한 작은 실천, 나만의 에코 굿즈', type: 'experience' },
  { boothNo: 4, name: '나만의 뱃지 만들기', type: 'experience' },
  { boothNo: 5, name: '작고 소중한 나만의 키링&비즈스트랩', type: 'experience' },
  { boothNo: 6, name: '소잉디자이너 LAB : AI 거울 만들기', type: 'experience' },
  { boothNo: 7, name: '뚜껑을 활용한 클리커 만들기', type: 'experience' },
  { boothNo: 8, name: '의료부스, 활력징후 측정', type: 'medical' },
  { boothNo: 9, name: '쉼터', type: 'rest' },
  { boothNo: 10, name: '업사이클링 키링 팩토리', type: 'experience' },
  { boothNo: 11, name: '마음 휴게소 : 여름의 끝에서 만난 나', type: 'experience' },
  { boothNo: 12, name: '너와 나의 MBTI 연결고리 : 배방청소년자유공간은 무슨 유형일까?', type: 'experience' },
  { boothNo: 13, name: '나만의 커피드립백 만들기', type: 'experience' },
  { boothNo: 14, name: '수학으로 함께 놀아요.', type: 'experience' },
  { boothNo: 15, name: '날아라 드론체험', type: 'experience' },
  { boothNo: 16, name: '퀴즈풀고 자전거 안전고리 받자 1388불꽃단 볼펜꾸미기', type: 'experience' },
  { boothNo: 17, name: '미래산업꿈나무아카데미 레고 AI 체험존', type: 'experience' },
  { boothNo: 18, name: '청소년 퍼스널 트레이닝 체험존', type: 'experience' },
  { boothNo: 19, name: '(사)한국디지털사진가협회 충남지부 아산지회', type: 'experience' },
  { boothNo: 20, name: '아산시학생회장단연합회[내팀] 사랑은 키링을 타고', type: 'experience' },
  { boothNo: 21, name: '이거 때부세요', type: 'experience' },
  { boothNo: 22, name: '재활용품을 활용한 에코 키캡 만들기', type: 'experience' },
  { boothNo: 23, name: '스포츠스태킹 뇌벨업 챌린지', type: 'experience' },
  { boothNo: 24, name: '분리수거 게임랜드', type: 'experience' },
  { boothNo: 25, name: '한빛과 함께하는 [나의 KEY를 찾아라!] 키캡 키링 만들기', type: 'experience' },
  { boothNo: 26, name: '그나래 공작소: 나만의 감성을 만듭니다.', type: 'experience' },
  { boothNo: 27, name: '청소년유스카페운영단 꿈빛샷 나만의 힐링쿠키 꾸미기', type: 'experience' },
  { boothNo: 28, name: '그나래 포토랩 : 지금의 나를 담아드립니다.', type: 'experience' },
  { boothNo: 29, name: '아산시청소년상담복지센터 힐링액자 만들기', type: 'experience' },
  { boothNo: 30, name: '청소년 전략본부-작전회의 작전명 : 정책요원 미션 클리어', type: 'experience' },
  { boothNo: 31, name: '내 몸 밸런스 테스트', type: 'experience' },
  { boothNo: 32, name: '온새미로', type: 'experience' },
  { boothNo: 33, name: '요리조리 나만의 컵케이크 만들기', type: 'experience' },
  { boothNo: 34, name: '청소년운영위원회 “청하랑”이 지켜주는 뽀송뽀송한 우리집', type: 'experience' },
  { boothNo: 35, name: '꿈달아와 함께하는 먹는 화분 만들기', type: 'experience' },
  { boothNo: 36, name: '새롭게, 다시 만드는 업사이클링[과자봉투 키링 / 과자박스 노트]', type: 'experience' },
  { boothNo: 37, name: '꾸.꾸.페(꾸미지가 꾸리는 페이스페인팅)', type: 'experience' },
  { boothNo: 38, name: 'We are Epilizer', type: 'experience' },
  { boothNo: 39, name: '배방청소년자유공간 쏘잉티어스와 함께하는 양말목, 네잎클로버 키링 만들기', type: 'experience' },
  { boothNo: 40, name: '체험부스 코인 & 상품 교환소', type: 'exchange' },
  { boothNo: 41, name: '운영본부(종합안내, 접수, 미아보호소)', type: 'hq' },
  { boothNo: 44, name: '청소년재능경연대회 대기실', type: 'waiting' }
];

export function createInitialStatus(boothNo: number, now = new Date().toISOString()): BoothStatus {
  return {
    boothNo,
    operationStatus: 'READY',
    congestionLevel: 0,
    waitMinutes: 0,
    materialStatus: 'OK',
    helpRequested: false,
    updatedAt: now
  };
}

export function getBooth(boothNo: number) {
  return booths.find((booth) => booth.boothNo === boothNo);
}
