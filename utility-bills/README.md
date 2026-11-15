# 우리집 공과금

전기·수도·가스·관리비·통신비 고지서(PDF나 텍스트)를 올리면 금액·사용량·청구월을 자동으로 찾아 저장하고, 그래프로 보여주는 웹앱입니다. 시놀로지 NAS의 Container Manager(Docker)에서 돌리는 것을 기준으로 만들었습니다.

## 할 수 있는 것

- **등록**: PDF/TXT 파일을 끌어다 놓거나 고지서 내용을 붙여 넣으면 종류, 청구월, 금액, 사용량, 납기일, 기관을 자동으로 채웁니다. 확인하고 고친 뒤 저장합니다. 원본 파일도 함께 보관됩니다.
- **대시보드**: 월별 공과금(종류별 누적 막대), 종류별 합계, 사용량 추이(전기 kWh, 수도 ㎥, 가스 MJ), 작년 같은 달과 비교, 미납 합계를 보여줍니다.
- **내역**: 연도·종류별 목록, 수정·삭제, 납부 여부 전환, 원본 파일 보기, 엑셀(CSV) 내려받기.
- 휴대폰 화면과 다크 모드를 지원합니다.

> 스캔한 이미지 PDF(글자를 선택할 수 없는 PDF)는 글자를 읽지 못합니다. 이때는 원본만 첨부하고 값을 직접 입력하세요.

## 시놀로지 NAS에 설치하기

### 준비

- DSM 7.2 이상, Intel/AMD CPU 모델(Container Manager가 패키지 센터에 보여야 합니다)
- 패키지 센터에서 **Container Manager** 설치

### 1. 파일 올리기

1. File Station에서 `docker` 공유 폴더 안에 `utility-bills` 폴더를 만듭니다.
2. 이 폴더(`utility-bills/`) 안의 파일을 그대로 올립니다. **`node_modules`와 `data` 폴더는 올리지 않습니다.**
   필요한 것: `Dockerfile`, `docker-compose.yml`, `package.json`, `package-lock.json`, `server/`, `public/`

### 2. 프로젝트 만들기

1. Container Manager → **프로젝트** → **생성**
2. 프로젝트 이름: `utility-bills`
3. 경로: 방금 만든 `/docker/utility-bills`
4. 원본: **기존 docker-compose.yml 사용**
5. 다음 → 완료. 처음에는 이미지를 만드느라 몇 분 걸립니다.

### 3. 접속

같은 와이파이에 있는 PC나 휴대폰 브라우저에서:

```
http://NAS의IP:8089
```

(NAS IP는 DSM → 제어판 → 네트워크 → 네트워크 인터페이스에서 확인)

### 4. (선택) 밖에서도 접속하기

1. `docker-compose.yml`에서 `APP_USER`, `APP_PASSWORD` 줄의 `#`을 지우고 비밀번호를 정합니다. 그러면 접속할 때 로그인 창이 뜹니다.
2. Container Manager에서 프로젝트를 **중지 → 빌드 → 시작**합니다.
3. DSM → 제어판 → 로그인 포털 → 고급 → **역방향 프록시**에서 `https://bills.내DDNS주소` → `http://localhost:8089`로 연결하고, 보안 → 인증서에서 Let's Encrypt 인증서를 붙입니다.

## 데이터와 백업

모든 데이터는 NAS의 `/docker/utility-bills/data/` 폴더에 있습니다.

- `bills.db`: 공과금 기록(SQLite)
- `files/`: 올린 원본 PDF/TXT

이 폴더를 Hyper Backup 대상에 넣어 두세요.

## 업데이트

새 버전 파일을 같은 폴더에 덮어쓴 뒤(`data` 폴더는 그대로 두기) Container Manager에서 프로젝트를 **중지 → 빌드 → 시작**합니다.

## PC에서 개발하기

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev     # http://localhost:8080
npm test        # 고지서 분석 테스트
```

`samples/` 폴더에 테스트용 고지서 텍스트가 있습니다. 실제 고지서에서 값을 잘 못 찾으면, 그 고지서 텍스트를 `samples/`에 넣고 `test/parser.test.js`에 테스트를 추가한 뒤 `server/parser.js`의 규칙을 고치면 됩니다.

## 구조

```
server/index.js       웹 서버, API
server/parser.js      고지서 텍스트 → 값 추출 규칙
server/db.js          SQLite 테이블
server/categories.js  공과금 종류(전기, 수도, 가스, 관리비, 통신, 기타)
public/               화면(HTML/CSS/JS, Chart.js)
```
