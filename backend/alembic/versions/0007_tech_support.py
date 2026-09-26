"""tech support: part replacements, support tickets

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "part_replacements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("occurred_date", sa.Date(), nullable=False),
        sa.Column("org_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("field_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("replace_type", sa.String(length=300), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "support_tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("occurred_date", sa.Date(), nullable=False),
        sa.Column("org_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("category_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("detail_type_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("requester_name", sa.String(length=100), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("support_tickets")
    op.drop_table("part_replacements")
