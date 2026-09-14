# 모담샘의 상상 이미지 스튜디오

로그인 없이 사용하는 Gemini 이미지 생성 전용 앱입니다.

Vercel 환경변수:
- GEMINI_API_KEY: Google AI Studio API 키
- PER_IP_DAILY_LIMIT: 같은 네트워크의 하루 생성 한도(기본 70, 교실 공동 와이파이 고려)
- DAILY_IMAGE_LIMIT: 전체 하루 생성 한도(기본 70)

## 내 컴퓨터에서 사용하는 방법

1. Windows에서 C드라이브를 열고 api_key 폴더를 만듭니다.
2. 메모장을 열고 Gemini API 키 한 줄만 붙여넣습니다.
3. 파일 이름을 gemini_api_key.txt로 지정해 C:\\api_key 폴더에 저장합니다.
4. 최종 위치가 C:\\api_key\\gemini_api_key.txt인지 확인합니다.
5. 프로젝트 폴더에서 npm install을 한 번 실행합니다.
6. npm run dev를 실행한 후 표시되는 localhost 주소를 크롬에서 엽니다.

중요: index.html에는 API 키를 입력하지 않습니다. gemini_api_key.txt 파일은 GitHub에 올리지 마세요.

## Vercel에 배포하는 방법

Vercel 서버는 모담쌤 컴퓨터의 C드라이브를 읽을 수 없습니다. 배포할 때는 Vercel 프로젝트의 Settings → Environment Variables에서 GEMINI_API_KEY를 등록해야 합니다.
현재 메모리 기반 제한은 기본 과다 사용 방지용입니다. 완전한 비용 상한은 외부 저장소 기반 카운터나 Google Cloud 예산 알림을 함께 사용해야 합니다.
