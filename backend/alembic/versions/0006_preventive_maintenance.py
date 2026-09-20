"""preventive maintenance: daily checks, special checks, weekly tasks, work status

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_checks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("check_date", sa.Date(), nullable=False),
        sa.Column("inspector_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "approved_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

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

    op.create_table(
        "special_checks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("check_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("memo", sa.String(length=500), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "weekly_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_date", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("memo", sa.String(length=500), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "work_statuses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status_date", sa.Date(), nullable=False),
        sa.Column("leave_type", sa.String(length=20), nullable=False),
        sa.Column("content", sa.String(length=500), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("work_statuses")
    op.drop_table("weekly_tasks")
    op.drop_table("special_checks")
    op.drop_table("daily_check_failures")
    op.drop_table("daily_check_items")
    op.drop_table("daily_checks")
