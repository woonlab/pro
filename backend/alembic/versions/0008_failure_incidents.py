"""failure management: failure incidents

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "failure_incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("equipment_id", sa.Integer(), sa.ForeignKey("equipment.id"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="registered"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("service_down_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("severity_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("equipment_scope", sa.String(length=20), nullable=True),
        sa.Column("cause_analysis", sa.Text(), nullable=True),
        sa.Column("follow_up_action", sa.Text(), nullable=True),
        sa.Column(
            "registered_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True
        ),
        sa.Column("handled_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("failure_incidents")
