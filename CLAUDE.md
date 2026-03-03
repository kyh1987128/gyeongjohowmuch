# 경조사비얼마 - 토스 미니앱 (앱인토스)

## 프로젝트 개요
- AI 기반 경조사비 추천 서비스 (토스 미니앱)
- React + TypeScript + Vite + TailwindCSS
- 빌드: `npm run build` (granite build → .ait 파일 생성)
- 경로: D:/GitHub/project-6551412/gyeongjohowmuch/

## 기술 스택
- 프레임워크: @apps-in-toss/web-framework
- AI: Google Gemini API (src/utils/gemini.ts)
- DB: Supabase (src/utils/supabase.ts)
- 라우터: react-router-dom (src/router/config.tsx)

## 주요 페이지
- /intro → 인트로
- /home → 홈 (카테고리 선택 + 일정 배너)
- /subcategory → 세부 카테고리
- /input → 상세 정보 입력
- /result → AI 추천 결과 + 광고
- /records → 기록 조회 + 연간 리포트 진입
- /myinfo → 내 정보
- /quiz → 경조사 센스 퀴즈 (20문제 풀에서 랜덤 5문제)
- /quiz-result → 퀴즈 결과 + 등급 + 공유
- /schedules → 경조사 일정 관리 (추가/수정/삭제/완료→기록전환/추천연동)
- /report → 연간 지출 리포트 (요약/월별 차트/카테고리 차트/인사이트)

## 광고 시스템
- 토스 앱인토스 자체 광고 (loadFullScreenAd / showFullScreenAd)
- 실제 광고 ID: 'ait.v2.live.c05b1d17ceda40da' (2곳: line 574, 707 in result/page.tsx)
- 정산 승인 완료 → 실제 광고 ID 적용됨 (2025-03-03)
- AdMob 계정도 생성됨 (웹뷰 앱용, 토스 미니앱과 별개)
  - 앱 ID: ca-app-pub-4912078882467687~9102026325
  - 광고 단위 ID: ca-app-pub-4912078882467687/5278331382

## 공유 기능
- 경조사비 결과 카드: saveBase64Data로 이미지 저장 + 텍스트 복사 (ShareCardModal.tsx)
- 퀴즈 결과: share({ message: text })로 텍스트+딥링크 공유 (quiz-result/page.tsx)
- 딥링크: intoss://gyeongjohowmuch/quiz

## 대기 중인 작업
1. 로고 크기 수정 (콘솔에서 검토 중)
2. 웹뷰 안드로이드 앱 출시 (보류 - 수익 확인 후)

## localStorage 키
- gyeongjo_records → 경조사 기록 배열 (EventRecord[])
- gyeongjo_recent → 최근 조회 내역 (RecentQuery[], 최대 5개)
- gyeongjo_myinfo → 사용자 프로필 (연령, 직업, 소득)
- gyeongjo_schedules → 경조사 일정 배열 (Schedule[])

## 주의사항
- .cjs 스크립트 파일 실행 금지 (이전 스크립트가 파일을 덮어씀)
- 백틱(`) 포함 코드는 .cjs에서 이스케이프 충돌 발생 → 메모장으로 직접 수정
- 빌드 시 chunk size 경고는 무시해도 됨
