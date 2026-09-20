"""SLA: master data, failure time limits, availability tracking, operations

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sla_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column("weight", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("threshold_100", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column("threshold_90", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column("threshold_80", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column("threshold_70", sa.Numeric(10, 3), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_sla_metrics_key", "sla_metrics", ["key"])

    op.create_table(
        "sla_failure_time_limits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("severity_code_id", sa.Integer(), sa.ForeignKey("codes.id"), nullable=False),
        sa.Column("equipment_scope", sa.String(length=20), nullable=False),
        sa.Column("max_minutes", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "sla_business_services",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("grade", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sla_business_monthly",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "business_service_id",
            sa.Integer(),
            sa.ForeignKey("sla_business_services.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("year_month", sa.String(length=7), nullable=False),
        sa.Column("downtime_hours", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sla_operation_monthly",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("year_month", sa.String(length=7), nullable=False),
        sa.Column("backup_total_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("backup_success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("change_failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("deliverable_score", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("security_incident", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint(
        "uq_sla_operation_monthly_year_month", "sla_operation_monthly", ["year_month"]
    )


def downgrade() -> None:
    op.drop_table("sla_operation_monthly")
    op.drop_table("sla_business_monthly")
    op.drop_table("sla_business_services")
    op.drop_table("sla_failure_time_limits")
    op.drop_constraint("uq_sla_metrics_key", "sla_metrics", type_="unique")
    op.drop_table("sla_metrics")
