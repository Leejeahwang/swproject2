# 쉐어허브 (ShareHub) - 이웃 간 물품 공유 플랫폼

이웃과 함께하는 물품 공유 플랫폼입니다. 필요한 물건을 이웃과 나누고, 수익을 창출할 수 있는 서비스입니다.

## 주요 기능

### 사용자 관리
- 회원가입 및 로그인 (JWT 인증)
- 사용자 프로필 관리
- 평점 시스템 (1~5점)
- 지역 기반 서비스

### 제품 관리
- 제품 등록 및 수정/삭제
- 제품 검색 및 필터링 (카테고리, 지역, 가격 등)
- 제품 상세 정보 조회
- 제품 찜하기 기능
- 같은 카테고리 제품 추천

### 대여 시스템
- 대여 요청 및 승인
- 대여 상태 관리 (대기/승인/진행중/완료/취소)
- 대여 내역 조회 (빌린 것/빌려준 것)

### 리뷰 시스템
- 대여 완료 후 리뷰 작성
- 평점 및 코멘트
- 사용자 평균 평점 자동 계산

### 채팅 기능
- Socket.io 기반 실시간 채팅
- 제품별 채팅방
- 채팅 내역 저장

## 기술 스택

### 백엔드
- Node.js
- Express.js
- lowdb (JSON 기반 로컬 데이터베이스)
- JWT (인증)
- Socket.io (실시간 채팅)
- Multer (파일 업로드)
- bcryptjs (비밀번호 암호화)

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

2. 환경 변수 설정 (선택사항)
`.env` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:
```
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

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
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

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
- `POST /api/reviews` - 리뷰 작성
- `GET /api/reviews/user/:userId` - 사용자가 받은 리뷰
- `GET /api/reviews/rental/:rentalId` - 대여 관련 리뷰

## 프로젝트 구조

```
sharehub/
├── server.js                 # 서버 진입점
├── package.json
├── .env
├── .gitignore
├── README.md
├── database/                 # 로컬 데이터베이스
│   ├── db.js                # lowdb 설정
│   └── db.json              # JSON 데이터 파일
├── routes/                   # API 라우트
│   ├── auth.js
│   ├── users.js
│   ├── products.js
│   ├── rentals.js
│   └── reviews.js
├── middleware/               # 미들웨어
│   └── auth.js
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

1. **홈 화면** - 제품 목록, 검색, 필터링
2. **로그인/회원가입** - 사용자 인증
3. **제품 상세** - 제품 정보, 대여 요청, 채팅
4. **제품 등록** - 새 제품 등록
5. **내 물품** - 등록한 제품 관리
6. **대여 내역** - 빌린/빌려준 제품 관리
7. **프로필** - 사용자 프로필, 평점, 리뷰
8. **채팅** - 실시간 채팅

## 보안

- JWT 토큰 기반 인증
- 비밀번호 bcrypt 암호화
- API 라우트 보호
- 파일 업로드 검증
- XSS 및 CSRF 방지

## 향후 개선 사항

- [ ] MongoDB로 데이터베이스 전환 (필요시)
- [ ] 결제 시스템 통합
- [ ] 푸시 알림
- [ ] 이미지 최적화 및 CDN
- [ ] 모바일 앱 개발
- [ ] 관리자 대시보드
- [ ] 고급 검색 필터
- [ ] 제품 추천 알고리즘 개선

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

