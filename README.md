# FMS — 서버/보안장비/네트워크 자산관리 시스템

장비(서버/보안장비/네트워크장비) 인벤토리 등록과 유지보수/점검 이력 관리를 위한 웹 애플리케이션 MVP입니다.

- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL
- Frontend: React + TypeScript + Vite

## 사전 준비물

이 프로젝트를 실행하려면 아래가 설치되어 있어야 합니다 (개발 환경에는 아직 없어서 직접 설치가 필요합니다).

- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/) (npm 포함)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL을 로컬에서 간편하게 띄우기 위함. 이미 PostgreSQL이 설치되어 있다면 생략 가능)

## 1. 데이터베이스 실행

```bash
docker compose up -d
```

Docker를 쓰지 않는다면 PostgreSQL에 `fms`/`fms` 계정과 `fms` 데이터베이스를 직접 만들고, `backend/.env`의 `DATABASE_URL`을 맞게 수정하세요.

## 2. 백엔드 실행

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

## 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

- 앱 접속: http://localhost:5173

## 프로덕션 배포 (Ubuntu)

`192.168.146.130` (Ubuntu 26.04) 에 아래 구성으로 배포되어 있습니다.

- 코드 위치: `/opt/fms/backend`, `/opt/fms/frontend`
- Backend: `/opt/fms/backend/.venv` 가상환경 + systemd 서비스 `fms-backend` (127.0.0.1:8000)
  - PostgreSQL 드라이버는 `psycopg[binary]` (v3) 사용 — `psycopg2-binary`는 최신 Python(3.14)에서 빌드가 안 돼서 교체함
- Frontend: `npm run build` 결과물(`/opt/fms/frontend/dist`)을 nginx가 정적 서빙
- DB: 로컬 PostgreSQL 18 (`fms`/`fms` 계정, `fms` 데이터베이스), `backend/.env`에 `DATABASE_URL` 설정
- nginx: `/etc/nginx/sites-available/fms` (→ `sites-enabled/fms` 심볼릭 링크, 기본 `default` 사이트는 제거) — `/`는 정적 파일, `/api/`는 `fms-backend`(8000)로 리버스 프록시
- 방화벽(ufw)은 이 서버에서 비활성 상태라 별도로 포트를 열지 않았습니다. AppArmor는 활성 상태지만 nginx 전용 프로파일이 없어 별도 조치가 필요 없었습니다.
- 접속: http://192.168.146.130

### 코드 변경 후 재배포

```bash
# 로컬에서 서버로 파일 복사 (backend, frontend 소스)
scp -i ~/.ssh/fms_rocky_deploy -r backend root@192.168.146.130:/opt/fms/
scp -i ~/.ssh/fms_rocky_deploy -r frontend root@192.168.146.130:/opt/fms/

# 서버에서
ssh -i ~/.ssh/fms_rocky_deploy root@192.168.146.130

# 백엔드 변경 시
cd /opt/fms/backend && .venv/bin/pip install -r requirements.txt && .venv/bin/alembic upgrade head
systemctl restart fms-backend

# 프론트엔드 변경 시
cd /opt/fms/frontend && npm install && npm run build
# nginx는 dist 폴더를 직접 서빙하므로 재시작 불필요
```

SSH 키는 로컬 `~/.ssh/fms_rocky_deploy` (전용 배포 키, root 계정에 등록됨)를 그대로 재사용합니다.

> 이전에는 같은 방식으로 Rocky Linux 서버(192.168.146.128)에도 배포했었지만, 요청에 따라 해당 서버의 FMS 앱/설정은 모두 제거했습니다.

## 로그인 / 계정 관리

- 모든 API는 로그인(JWT Bearer 토큰)이 필요합니다. 화면에 회원가입은 없고, 서버에서 CLI로 계정을 만듭니다.
- 계정 생성/비밀번호 변경:
  ```bash
  cd /opt/fms/backend
  .venv/bin/python scripts/create_user.py <아이디> <비밀번호> --full-name "홍길동"
  ```
  이미 있는 아이디면 비밀번호만 갱신됩니다.
- `backend/.env`의 `SECRET_KEY`는 배포 시 서버에서 무작위로 생성해 저장해뒀습니다 (로컬 저장소에는 커밋하지 않음). 이 값이 바뀌면 기존에 발급된 토큰은 모두 무효화됩니다.
- 토큰 만료 시간은 `ACCESS_TOKEN_EXPIRE_MINUTES` (기본 720분 = 12시간).

## 현재 범위 (MVP)

- 로그인 (JWT), 장비 등록/조회/삭제, 장비별 유지보수/점검 이력 등록/조회/삭제
- 화면 톤은 www.snetict.co.kr을 참고해 오렌지(`#FE8300`) 포인트 + 다크 네이비 헤더로 스타일링

## 다음 단계 후보

- 사용자 관리 화면 (현재는 CLI로만 계정 생성), 역할별 권한 분리
- 실시간 상태 모니터링 (온/오프라인, 리소스 사용량)
- 네트워크 토폴로지 시각화
- 다음 점검 예정일 기반 알림
