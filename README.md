# 💬 TARRYTALK

> **실시간 채팅 플랫폼** — Firebase Realtime Database 기반 웹 채팅 애플리케이션

[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange?logo=firebase)](https://firebase.google.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-blue?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ 주요 기능

### 💬 채팅
| 기능 | 설명 |
|------|------|
| 실시간 메시지 | Firebase Realtime DB 기반 즉시 동기화 |
| 단체채팅 / 1대1 DM | 방 타입 분리, 멤버 관리 |
| 타이핑 인디케이터 | 상대방 입력 중 실시간 표시 |
| 메시지 답장(Reply) | 특정 메시지에 인라인 답장 |
| 이모지 반응 | 👍❤️😂😮😢🔥🎉 7종 리액션 |
| 메시지 수정/삭제 | 본인 메시지 10분 이내 수정, 삭제 |
| 이미지 / 파일 / 영상 | Base64 전송 (이미지 8MB, 영상 50MB) |
| 이미지 라이트박스 | 클릭 시 풀스크린 뷰어 |
| URL 자동 링크 | 텍스트 내 URL 자동 감지 → 클릭 가능 |
| 일정 공유 카드 | 날짜·시간·장소·메모 포함 카드 형식 |
| 안읽음 배지 | 채팅방별 읽지 않은 메시지 수 표시 |
| 읽음 확인(✓✓) | 상대방 읽음 여부 파란색 표시 |
| 메시지 검색 | 현재 채팅방 내 키워드 검색 |
| 스크롤 투 바텀 | 새 메시지 도착 시 바로가기 버튼 |

### 👥 사용자
| 기능 | 설명 |
|------|------|
| Firebase Auth | 이메일/비밀번호 로그인 |
| 회원가입 | 이름·이메일·비밀번호 검증 |
| 온라인 상태 | 실시간 온/오프라인 표시 |
| 아바타 색상 | 8가지 색상 커스터마이징 |
| 이름 변경 | 프로필 페이지에서 실시간 변경 |
| 비밀번호 변경 | 재인증 후 변경 |
| 게스트 둘러보기 | 로그인 없이 UI 탐색 |

### ⚙️ 관리자
| 기능 | 설명 |
|------|------|
| 대시보드 | 회원·채팅방·메시지 통계 |
| 회원 관리 | 추가·비활성화·관리자 권한 설정·삭제 |
| 채팅방 관리 | 전체 채팅방 목록·삭제 |
| 공지 발송 | 전체 채팅방 일괄 공지 |
| 활동 로그 | 최근 가입·메시지·방 생성 이벤트 |
| 바 차트 | 채팅방별 메시지 현황 시각화 |

### 📱 기타
- **PWA 지원** — 홈 화면 추가, 오프라인 캐싱, 푸시 알림 기반
- **다크 테마** — 딥 그린 + 블랙 다크 모드 (기본값)
- **반응형 디자인** — 모바일/태블릿/데스크탑 완벽 대응
- **Firebase Security Rules** — 엄격한 읽기/쓰기 권한 제어

---

## 🗂 파일 구조

```
tarrytalk/
├── index.html          # 로그인 / 회원가입 대문
├── chat.html           # 메인 채팅 화면
├── admin.html          # 관리자 대시보드
├── profile.html        # 사용자 프로필
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA Manifest
├── vercel.json         # Vercel 배포 설정
├── firebase.json       # Firebase Hosting 설정
├── database.rules.json # Firebase Realtime DB 보안 규칙
├── .gitignore
└── README.md
```

---

## 🚀 배포 방법

### 방법 1 — Vercel (권장)

```bash
# 1. 이 저장소를 fork 또는 clone
git clone https://github.com/YOUR_ID/tarrytalk.git
cd tarrytalk

# 2. Vercel CLI 설치 (선택)
npm i -g vercel

# 3. 배포
vercel --prod
```

또는 [Vercel 대시보드](https://vercel.com)에서 GitHub 저장소 직접 연결.

### 방법 2 — Firebase Hosting

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 설정
firebase use tarrytalk

# DB 보안 규칙 배포
firebase deploy --only database

# 호스팅 배포
firebase deploy --only hosting
```

---

## 🔥 Firebase 설정

### 1. Firebase Console에서 설정

1. [Firebase Console](https://console.firebase.google.com) → 프로젝트 생성
2. **Authentication** → 이메일/비밀번호 로그인 활성화
3. **Realtime Database** → 데이터베이스 생성 (서울 리전 권장)
4. **웹 앱 등록** → Firebase 구성 키 획득

### 2. Firebase Config 교체

`index.html`, `chat.html`, `admin.html`, `profile.html` 파일에서 아래 부분을 본인 Firebase 설정으로 교체:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. 관리자 이메일 설정

각 파일의 `ADMIN_EMAIL` 상수를 본인 이메일로 변경:

```javascript
const ADMIN_EMAIL = 'your-admin@email.com';
```

### 4. Database 보안 규칙 배포

```bash
firebase deploy --only database
```

---

## 🔐 보안 규칙 요약

| 경로 | 읽기 | 쓰기 |
|------|------|------|
| `/users` | 로그인 사용자 전체 | 본인 또는 관리자 |
| `/rooms` | 멤버 또는 관리자 | 로그인 사용자 |
| `/messages/$roomId` | 해당 방 멤버 | 해당 방 멤버 |
| `/typing/$roomId` | 해당 방 멤버 | 본인 UID만 |
| `/notices` | 로그인 사용자 | 관리자만 |

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | HTML5 · CSS3 · Vanilla JS (ES Modules) |
| 실시간 DB | Firebase Realtime Database |
| 인증 | Firebase Authentication |
| 배포 | Vercel / Firebase Hosting |
| PWA | Service Worker · Web App Manifest |
| 폰트 | Noto Sans KR (Google Fonts) |

---

## 📋 환경 정보

- 순수 HTML/CSS/JS — 빌드 도구 불필요
- Firebase SDK v10 (CDN 로드)
- 모던 브라우저 지원 (Chrome 90+, Safari 14+, Firefox 88+)
- Node.js 불필요 (Firebase CLI 사용 시만 필요)

---

## 👤 개발자

**TARRY** (김종훈)  
- 링크: [bihyuk.linkstory.co.kr](https://bihyuk.linkstory.co.kr)
- 관리자 이메일: tarry9653@daum.net

---

## 📄 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능.  
사용 시 출처 표기를 권장합니다.
