# makecho · 나의 작은 초파리 정원

초파리 모모를 돌보고, 정원을 탐험하고, 작은 발견을 수집하는 한국어 펫 게임입니다. React + TypeScript + Vite 웹앱, 설치형 PWA, Capacitor Android / iOS 프로젝트를 함께 제공합니다.

## 플레이

- 웹: https://songharry77ss-sketch.github.io/makecho/
- 먹이 주기, 놀아 주기, 청소하기, 쉬게 하기로 네 가지 상태 관리
- 경험치와 성장 레벨, 꽃잎 재화, 첫 목표 3개와 중복 수령 방지
- 탐험으로 수집품 6종 발견, 레벨별 도감 해금
- 햇살 초원 / 이슬 숲 / 노을 정원 해금과 이동
- 로컬 자동 저장, JSON 저장·복원, 최대 8시간 오프라인 상태 변화
- 설치형 PWA, 최초 온라인 방문 후 오프라인 플레이
- 모바일 하단 탐색, 키보드 조작, 저동작 환경설정 반영

## 로컬 실행

```sh
npm ci
npm run dev
```

http://127.0.0.1:5173 에서 실행합니다. 프로덕션 빌드는 `npm run build`, 정적 미리보기는 `npm run preview`입니다. `dist`를 HTTPS 정적 호스팅에 배포할 수 있습니다. `file://`로 HTML을 직접 여는 방식은 지원하지 않습니다.

## 검증

```sh
npm test
npm run build
```

게임 엔진 테스트는 재화 지불, 에너지 부족, 레벨 보상, 중복 수령, 서식지 구매, 저장 데이터 검증, 오프라인 감소 상한, 도감 해금을 검증합니다.

## 모바일 앱

- Android: `npm run android` 후 `npx cap open android`. Android Studio와 Java 21이 필요합니다.
- GitHub Actions는 웹 배포와 Android 디버그 APK를 자동 생성합니다. Actions 실행의 `makecho-android-debug`에서 받습니다. 디버그 APK는 개발·개인 테스트용입니다.
- iOS: macOS + Xcode에서 `npm ci`, `npm run ios`, `npx cap open ios`. 실기기·App Store 배포에는 본인 Apple 개발자 서명 설정이 필요합니다.
- 앱스토어 등록·심사·결제·푸시·클라우드 동기화는 이 버전에 포함되지 않습니다.

## 뇌지도와 과학적 범위

FlyWire의 2024년 성체 초파리 커넥톰 연구에서 영감을 받았습니다. **이 버전은 실제 커넥톰이나 생명체를 실행하지 않습니다.** 모모는 결정론적 게임 규칙으로 작동하며, 뇌 관찰실은 직접 만든 교육용 도식입니다. 연결 구조를 공개했다고 해서 의식과 기억이 업로드되었다고 볼 수 없습니다. 상세 출처와 확장 방향은 [docs/SCIENCE.md](docs/SCIENCE.md)를 참고하세요.

## 아트와 디자인

- 기본 정원과 모모: OpenAI 내장 이미지 생성 도구로 만든 독자적 이미지
- 이슬 숲: 연결된 Higgsfield의 `gpt_image_2_5`로 생성한 배경, 작업 `48e08090-c1be-4f5a-b133-f0692d6dadd0`
- 외부 게임 캐릭터·로고·스크린샷을 복제하지 않았습니다.
- 아트 프롬프트 및 디자인 참고: [docs/ART.md](docs/ART.md), [docs/DESIGN.md](docs/DESIGN.md)

진행 정보는 해당 브라우저/앱의 localStorage에 저장합니다. 저장 파일을 백업할 수 있습니다. 서버로 플레이 데이터를 보내지 않습니다. 웹 폰트는 Google Fonts를 사용하며 오프라인에서는 시스템 글꼴로 표시됩니다.
