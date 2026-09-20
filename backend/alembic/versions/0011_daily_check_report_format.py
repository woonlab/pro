"""replace daily-check items/failures with 4-section report format

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("daily_check_failures")
    op.drop_table("daily_check_items")

    op.add_column("daily_checks", sa.Column("common_content", sa.Text(), nullable=True))
    op.add_column("daily_checks", sa.Column("maintenance_content", sa.Text(), nullable=True))
    op.add_column("daily_checks", sa.Column("log_missing_content", sa.Text(), nullable=True))
    op.add_column("daily_checks", sa.Column("ongoing_work_content", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_checks", "ongoing_work_content")
    op.drop_column("daily_checks", "log_missing_content")
    op.drop_column("daily_checks", "maintenance_content")
    op.drop_column("daily_checks", "common_content")

    op.create_table(
        "daily_check_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "daily_check_id",
            sa.Integer(),
            sa.ForeignKey("daily_checks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("business_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("target_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("remark_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "daily_check_failures",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "daily_check_id",
            sa.Integer(),
            sa.ForeignKey("daily_checks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("system_name", sa.String(length=200), nullable=True),
        sa.Column("failure_time", sa.String(length=100), nullable=True),
        sa.Column("cause", sa.Text(), nullable=True),
        sa.Column("action", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
