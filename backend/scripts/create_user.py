"""Create or update a login user.

Usage:
    python scripts/create_user.py <username> <password> [--full-name "홍길동"]

Run from the backend/ directory with the venv activated.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an FMS login user")
    parser.add_argument("username")
    parser.add_argument("password")
    parser.add_argument("--full-name", default=None)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.username == args.username))
        if user is None:
            user = User(username=args.username)
            db.add(user)
            action = "생성"
        else:
            action = "비밀번호 갱신"

        user.hashed_password = hash_password(args.password)
        if args.full_name:
            user.full_name = args.full_name

        db.commit()
        print(f"사용자 '{args.username}' {action} 완료")
    finally:
        db.close()


if __name__ == "__main__":
    main()
