"""asset management upgrade: code/user links, computed-input fields

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("equipment", "owner")

    op.add_column("equipment", sa.Column("serial_no", sa.String(length=50), nullable=True))
    op.add_column(
        "equipment", sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True)
    )
    op.add_column(
        "equipment", sa.Column("org_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True)
    )
    op.add_column(
        "equipment",
        sa.Column("major_category_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
    )
    op.add_column(
        "equipment",
        sa.Column("business_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
    )
    op.add_column(
        "equipment",
        sa.Column("product_type_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
    )
    op.add_column(
        "equipment",
        sa.Column("manufacturer_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
    )
    op.add_column(
        "equipment",
        sa.Column("review_result_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=True),
    )
    op.add_column("equipment", sa.Column("review_content", sa.String(length=1000), nullable=True))
    op.add_column("equipment", sa.Column("hw_sw", sa.String(length=10), nullable=True))
    op.add_column("equipment", sa.Column("maintenance_target", sa.String(length=10), nullable=True))
    op.add_column(
        "equipment", sa.Column("quantity", sa.Integer(), nullable=False, server_default="1")
    )
    op.add_column(
        "equipment",
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "equipment",
        sa.Column("maintenance_rate", sa.Numeric(6, 3), nullable=False, server_default="0"),
    )
    op.add_column(
        "equipment", sa.Column("maintenance_months", sa.Integer(), nullable=False, server_default="0")
    )


def downgrade() -> None:
    op.drop_column("equipment", "maintenance_months")
    op.drop_column("equipment", "maintenance_rate")
    op.drop_column("equipment", "unit_price")
    op.drop_column("equipment", "quantity")
    op.drop_column("equipment", "maintenance_target")
    op.drop_column("equipment", "hw_sw")
    op.drop_column("equipment", "review_content")
    op.drop_column("equipment", "review_result_code_id")
    op.drop_column("equipment", "manufacturer_code_id")
    op.drop_column("equipment", "product_type_code_id")
    op.drop_column("equipment", "business_code_id")
    op.drop_column("equipment", "major_category_code_id")
    op.drop_column("equipment", "org_code_id")
    op.drop_column("equipment", "owner_user_id")
    op.drop_column("equipment", "serial_no")

    op.add_column("equipment", sa.Column("owner", sa.String(length=100), nullable=True))
