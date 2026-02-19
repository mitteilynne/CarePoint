"""Add prescription notification type

Revision ID: add_prescription_notif
Revises: f3d3ce085f18
Create Date: 2026-02-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_prescription_notif'
down_revision = 'f3d3ce085f18'
branch_labels = None
depends_on = None


def upgrade():
    # Add prescription_id column to notifications table
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('prescription_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_notification_prescription', 'prescriptions', ['prescription_id'], ['id'])
    
    # Add 'prescription' to the notification_types enum
    # For PostgreSQL, MySQL, and other databases that support enum types
    try:
        op.execute("ALTER TYPE notification_types ADD VALUE IF NOT EXISTS 'prescription'")
    except Exception:
        # For SQLite and other databases that don't support ALTER TYPE
        pass


def downgrade():
    # Removing enum values is generally not supported without recreating the type
    # This is left as a no-op for safety
    pass
