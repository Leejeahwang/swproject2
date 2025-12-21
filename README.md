# 쉐어허브 (ShareHub) - 이웃 간 물품 공유 플랫폼

이웃과 함께하는 물품 공유 플랫폼입니다. 필요한 물건을 이웃과 나누고, 수익을 창출할 수 있는 서비스입니다.

## 🆕 최근 업데이트 (2025.12.06)

### 🛡️ 안전 기능 및 증거 관리 시스템
- **증거 데이터 보관 시스템** - IP 주소, 채팅 정보, 거래 위치 등 핵심 증거 데이터 별도 보관 (1년 보관)
- **대여 전/후 이미지 업로드** - 대여 시작 전과 반납 후 제품 상태 이미지 업로드 및 비교 기능
- **노쇼/허위매물 신고 기능** - 사용자가 노쇼나 허위매물을 관리자에게 신고 가능
- **관리자 계정 차단 기능** - 관리자가 사용자 계정을 1~30일 기간으로 차단 가능

### 🗺️ 지역 선택 방식 개선
- **지도 기반 지역 선택** - 한국 지도 클릭으로 주 지역 선택
- **정식 명칭 표시** - "서울특별시", "부산광역시" 등 정식 명칭 사용
- **세종 특별 처리** - 세종특별자치시는 세부지역 선택 불필요
- **프로필 지역 수정** - 프로필 페이지에서 지역 변경 가능
- **메인 화면 내지역 표시** - 사용자 지역과 일치 시 "(내지역)" 표시

### 📷 이미지 업로드 개선
- **동적 슬롯 시스템** - 이미지 선택 시 오른쪽에 새 슬롯 자동 추가
- **개별 이미지 관리** - 각 이미지 미리보기 및 삭제 가능
- **단일 선택 방식** - 한 번에 하나씩만 선택 (다중 선택 불가)

### ⭐ 리뷰 시스템 개선
- **리뷰 구조 간소화** - 각자 1번씩만 리뷰 작성
- 빌린 사람: **제품 리뷰** → 소유자 평점에 반영
- 빌려준 사람: **대여자 리뷰** → 대여자 평점에 반영
- 제품 페이지에는 제품 리뷰만 표시
- 프로필 페이지에는 해당 사용자에 대한 리뷰 표시

---

## 🆕 이전 업데이트 (2025.12.03)

### ✉️ 이메일 인증 시스템
- **Gmail SMTP** 기반 이메일 발송
- **6자리 인증번호** 입력 방식 (모바일 호환성 향상)
- 회원가입 시 인증번호 발송
- 프로필 페이지에서 미인증 사용자 인증 가능
- 인증번호 재발송 기능 (60초 쿨다운)

### 🛡️ 관리자 시스템
- **관리자 대시보드** (`/admin`)
- 사용자/상품/대여 통계 조회
- 사용자 강제 탈퇴
- 상품 강제 삭제
- 대여 강제 취소
- role 기반 권한 관리 (`user` / `admin`)

### ⏰ 반납 지연 시스템
- **자동 지연 체크** 스케줄러 (1시간마다)
- **알림 발송**: 1일 전, 당일, 지연 후 매일
- **지연 요금**: 일일 대여료의 **1.5배** × 지연일수
- 메인 화면에 "🚨 반납 지연" 뱃지 표시
- 달력에 지연 기간 빨간색 표시
- 반납 시 지연 요금 안내 및 정산 포함

### 🗑️ 계정 탈퇴 기능
- 프로필 페이지에서 계정 삭제 가능
- 비밀번호 확인 후 탈퇴
- 관련 데이터 자동 삭제 (상품, 대여, 채팅, 알림)

---

## 주요 기능

### 사용자 관리
- 회원가입 및 로그인 (JWT 인증)
- **이메일 인증** (6자리 코드)
- 사용자 프로필 관리
- **계정 탈퇴**
- 평점 시스템 (1~5점)
- 지역 기반 서비스

### 제품 관리
- 제품 등록 및 수정/삭제
- 제품 검색 및 필터링 (카테고리, 지역, 가격 등)
- 제품 상세 정보 조회 (리뷰 포함)
- 제품 찜하기 기능
- 같은 카테고리 제품 추천

### 대여 시스템
- **상시 대여 가능** - 제품 상태와 관계없이 예약 요청 가능
- **예약 달력 표시** - 제품 상세 페이지에서 예약된 날짜 확인
- **날짜 중복 방지** - 겹치는 예약 자동 차단
- 대여 요청 및 승인
- 대여 상태 관리 (대기/승인/진행중/완료/취소)
- 대여 내역 조회 (빌린 것/빌려준 것)
- **반납 지연 관리** - 지연 시 알림 및 추가 요금 (1.5배)
- **지연 상태 표시** - 카드, 달력에 지연 표시
- **대여 전/후 이미지 업로드** - 대여 시작 전과 반납 후 제품 상태 확인을 위한 이미지 업로드
- **이미지 비교 뷰어** - 대여 전후 이미지를 나란히 비교하여 손상 여부 확인

### 리뷰 시스템
- 대여 완료 후 **각자 1번씩** 리뷰 작성
- **제품 리뷰** (빌린 사람 → 제품 평가)
  - 제품 상세 페이지에 표시
  - **소유자(빌려준 사람) 평점에 반영** ⭐
- **대여자 리뷰** (빌려준 사람 → 대여자 평가)
  - 대여자 프로필에 표시
  - 대여자 평점에 반영
- 사용자 평균 평점 자동 계산
- 프로필 페이지 리뷰 조회

> 💡 **리뷰 구조 요약**
> | 역할 | 리뷰 타입 | 평점 반영 대상 | 표시 위치 |
> |-----|---------|-------------|---------|
> | 빌린 사람 | 제품 리뷰 | 소유자 평점 | 제품 페이지 |
> | 빌려준 사람 | 대여자 리뷰 | 대여자 평점 | 대여자 프로필 |

### 채팅 기능
- Socket.io 기반 실시간 채팅
- 제품별 채팅방
- **채팅 내역 저장 및 불러오기** - 페이지 새로고침해도 대화 유지
- 채팅 목록에서 마지막 메시지 확인
- 상대방 프로필 정보 표시

### 신고 시스템
- **허위매물 신고** - 제품 상세 페이지에서 허위매물 신고 가능
- **노쇼 신고** - 대여 내역에서 노쇼 신고 가능
- **관리자 신고 관리** - 관리자가 신고 목록 조회 및 처리 (승인/거절)

### 증거 데이터 보관 시스템
- **자동 증거 수집** - 대여 생성/수정 시 IP 주소, 거래 위치 등 자동 저장
- **채팅 메시지 보관** - 모든 채팅 메시지 증거 데이터로 별도 보관
- **1년 보관 정책** - 증거 데이터는 1년간 별도 보관 (관리자가 게시물/계정 삭제해도 보관)
- **자동 정리** - 만료된 증거 데이터 자동 삭제 (24시간마다 체크)
- **관리자 조회** - 관리자가 증거 데이터 조회 가능 (수사 협조용)

## 기술 스택

### 백엔드
- Node.js
- Express.js
- lowdb (JSON 기반 로컬 데이터베이스)
- JWT (인증)
- Socket.io (실시간 채팅)
- Multer (파일 업로드)
- bcryptjs (비밀번호 암호화)
- **Nodemailer** (이메일 발송 - Gmail SMTP)

### 프론트엔드
- React 18
- React Router
- Axios
- Socket.io Client
- CSS3

## 설치 및 실행

### 사전 요구사항
- Node.js (v14 이상)
- 별도의 데이터베이스 설치 불필요! (lowdb 사용)

### 백엔드 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하세요:

```env
# 서버 설정
PORT=5000
NODE_ENV=development

# JWT 설정
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Gmail SMTP 설정 (이메일 인증용)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=인증메일발송용_이메일@gmail.com
SMTP_PASS=해당계정의_앱비밀번호16자리

# 클라이언트 URL
CLIENT_URL=http://localhost:3000
```

> 📌 **상세 설정 가이드**: `env파일생성요령.txt` 파일 참조
> 
> **Gmail 앱 비밀번호 발급 (간략)**
> 1. [Google 계정](https://myaccount.google.com) → 보안 → 2단계 인증 활성화
> 2. [앱 비밀번호](https://myaccount.google.com/apppasswords) → 앱 이름: ShareHub → 생성
> 3. 표시된 16자리 비밀번호를 `SMTP_PASS`에 입력 (공백 없이)

3. 자동으로 데이터베이스 파일 생성됨
- `database/db.json` 파일에 모든 데이터가 JSON 형태로 저장됩니다
- MongoDB 설치 불필요!

4. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

서버가 `http://localhost:5000`에서 실행됩니다.

### 프론트엔드 설치 및 실행

1. client 디렉토리로 이동
```bash
cd client
```

2. 의존성 설치
```bash
npm install
```

3. 개발 서버 실행
```bash
npm start
```

프론트엔드가 `http://localhost:3000`에서 실행됩니다.

### 동시 실행
루트 디렉토리에서 백엔드와 프론트엔드를 동시에 실행:
```bash
npm run dev:all
```

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입 (인증번호 발송)
- `POST /api/auth/login` - 로그인
- `POST /api/auth/verify-code` - 인증번호 확인
- `POST /api/auth/resend-verification` - 인증번호 재발송
- `DELETE /api/auth/delete-account` - 계정 탈퇴

### 사용자
- `GET /api/users/me` - 현재 사용자 정보
- `PUT /api/users/me` - 사용자 정보 수정
- `GET /api/users/:id` - 특정 사용자 프로필
- `POST /api/users/profile-image` - 프로필 이미지 업로드

### 제품
- `GET /api/products` - 제품 목록 (검색, 필터링)
- `GET /api/products/:id` - 제품 상세 정보
- `POST /api/products` - 제품 등록
- `PUT /api/products/:id` - 제품 수정
- `DELETE /api/products/:id` - 제품 삭제
- `POST /api/products/:id/like` - 제품 찜하기/취소

### 대여
- `POST /api/rentals` - 대여 요청
- `GET /api/rentals/my-rentals` - 내가 빌린 목록
- `GET /api/rentals/my-listings` - 내 제품의 대여 목록
- `GET /api/rentals/:id` - 대여 상세 정보
- `PUT /api/rentals/:id/approve` - 대여 승인
- `PUT /api/rentals/:id/start` - 대여 시작
- `PUT /api/rentals/:id/complete` - 대여 완료
- `PUT /api/rentals/:id/cancel` - 대여 취소

### 리뷰
- `POST /api/reviews` - 리뷰 작성 (`type`: `product` 또는 `owner`)
- `GET /api/reviews/user/:userId` - 사용자가 받은 리뷰 (프로필용)
- `GET /api/reviews/product/:productId` - 제품 리뷰 목록 (제품 페이지용)
- `GET /api/reviews/rental/:rentalId` - 대여 관련 리뷰

### 대여 이미지
- `PUT /api/rentals/:id/before-images` - 대여 전 이미지 업로드
- `PUT /api/rentals/:id/after-images` - 반납 후 이미지 업로드

### 신고
- `POST /api/reports` - 노쇼/허위매물 신고
- `GET /api/admin/reports` - 신고 목록 조회 (관리자)
- `PUT /api/admin/reports/:id/process` - 신고 처리 (관리자)

### 관리자 (Admin Only)
- `GET /api/admin/stats` - 대시보드 통계
- `GET /api/admin/users` - 전체 사용자 목록
- `PUT /api/admin/users/:id/block` - 사용자 계정 차단 (1~30일)
- `PUT /api/admin/users/:id/unblock` - 사용자 계정 차단 해제
- `DELETE /api/admin/users/:id` - 사용자 강제 탈퇴
- `GET /api/admin/products` - 전체 상품 목록
- `DELETE /api/admin/products/:id` - 상품 강제 삭제
- `GET /api/admin/rentals` - 전체 대여 목록
- `PUT /api/admin/rentals/:id/cancel` - 대여 강제 취소
- `GET /api/admin/evidence` - 증거 데이터 조회
- `GET /api/admin/evidence/:id` - 특정 증거 데이터 상세 조회

## 프로젝트 구조

```
sharehub/
├── server.js                 # 서버 진입점
├── package.json
├── .env                      # 환경 변수 (직접 생성)
├── env파일생성요령.txt        # .env 파일 생성 가이드
├── .gitignore
├── README.md
├── database/                 # 로컬 데이터베이스
│   ├── db.js                # lowdb 설정
│   └── db.json              # JSON 데이터 파일
├── routes/                   # API 라우트
│   ├── auth.js              # 인증 (로그인, 회원가입, 이메일 인증)
│   ├── users.js
│   ├── products.js
│   ├── rentals.js
│   ├── reviews.js
│   ├── notifications.js     # 알림 시스템
│   ├── reports.js           # 신고 시스템
│   ├── locations.js        # 안전 거래장소 추천 (비활성화)
│   └── admin.js             # 관리자 API
├── middleware/               # 미들웨어
│   ├── auth.js              # JWT 인증 + 관리자 권한 체크 + 계정 차단 체크
│   └── evidence.js          # 증거 데이터 수집 미들웨어
├── utils/                    # 유틸리티
│   ├── mailer.js            # 이메일 발송 (Nodemailer)
│   └── sms.js               # SMS 발송 (비활성화)
├── uploads/                  # 업로드된 파일
└── client/                   # React 프론트엔드
    ├── public/
    ├── src/
    │   ├── components/      # React 컴포넌트
    │   ├── pages/          # 페이지 컴포넌트
    │   ├── context/        # Context API
    │   ├── services/       # API 서비스
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## 주요 화면

1. **홈 화면** - 제품 목록, 검색, 필터링, 지연 상태 표시
2. **로그인/회원가입** - 사용자 인증, 이메일 인증
3. **제품 상세** - 제품 정보, 대여 요청, 채팅, 예약 달력
4. **제품 등록** - 새 제품 등록
5. **내 물품** - 등록한 제품 관리
6. **대여 내역** - 빌린/빌려준 제품 관리, 지연 요금 표시
7. **프로필** - 사용자 프로필, 평점, 리뷰, 이메일 인증, 계정 탈퇴
8. **채팅** - 실시간 채팅
9. **알림** - 대여/채팅/시스템 알림
10. **🛡️ 관리자** - 대시보드, 사용자/상품/대여 관리 (관리자 전용)

## 보안

- JWT 토큰 기반 인증
- **이메일 인증** (6자리 코드, 만료 시간 적용)
- 비밀번호 bcrypt 암호화
- API 라우트 보호
- **관리자 권한 체크** (role 기반)
- **계정 차단 시스템** - 차단된 사용자 접근 차단
- 파일 업로드 검증
- XSS 및 CSRF 방지
- **증거 데이터 보관** - 범죄 발생 시 수사 협조를 위한 핵심 데이터 별도 보관

## 향후 개선 사항

- [ ] MongoDB로 데이터베이스 전환 (필요시)
- [ ] 결제 시스템 통합 (실제 결제 연동)
- [ ] 푸시 알림 (모바일)
- [ ] 이미지 최적화 및 CDN
- [ ] 모바일 앱 개발
- [x] ~~관리자 대시보드~~ ✅ 완료
- [ ] 고급 검색 필터
- [ ] 제품 추천 알고리즘 개선
- [x] ~~이메일 인증 시스템~~ ✅ 완료
- [x] ~~반납 지연 관리~~ ✅ 완료
- [x] ~~계정 탈퇴 기능~~ ✅ 완료
- [x] ~~증거 데이터 보관 시스템~~ ✅ 완료
- [x] ~~대여 전/후 이미지 업로드~~ ✅ 완료
- [x] ~~노쇼/허위매물 신고 기능~~ ✅ 완료
- [x] ~~관리자 계정 차단 기능~~ ✅ 완료
- [ ] SMS 인증 기능 (현재 비활성화, API 연동 필요)
- [ ] 안전 거래장소 추천 (현재 비활성화, 지도 API 연동 필요)

## 관리자 계정 설정

관리자 계정을 만들려면:

1. 일반 회원가입으로 계정 생성
2. `database/db.json` 파일 열기
3. 해당 사용자에 `"role": "admin"` 추가:

```json
{
  "id": "xxx",
  "username": "관리자",
  "email": "admin@example.com",
  "role": "admin",    // ← 이 줄 추가
  "password": "...",
  ...
}
```

4. 서버 재시작 (또는 로그아웃 후 재로그인)
5. 네비게이션 바에 "🛡️ 관리자" 메뉴 표시됨

---

## lowdb에서 MongoDB로 전환하기

나중에 MongoDB로 전환하고 싶다면:

1. MongoDB 설치 및 실행
2. `package.json`에서 `lowdb` 대신 `mongoose` 추가
3. `database/db.js` 대신 Mongoose 연결 코드 사용
4. 라우트 파일들의 lowdb 쿼리를 Mongoose 쿼리로 변경
5. 모델 파일 생성 (User, Product, Rental, Review, Chat)

현재는 lowdb로 빠르게 개발하고, 나중에 필요할 때 MongoDB로 전환할 수 있습니다!

## 라이센스

MIT License

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해주세요.

