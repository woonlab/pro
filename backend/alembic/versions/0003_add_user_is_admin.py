"""add is_admin flag to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.execute("UPDATE users SET is_admin = true WHERE username = 'admin'")


def downgrade() -> None:
    op.drop_column("users", "is_admin")
