"""Add bns_sections and ipc_bns_links tables

Revision ID: 4b5c6d7e8f9a
Revises: 3a4b5c6d7e8f
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4b5c6d7e8f9a'
down_revision: Union[str, None] = 'eb2826d86dd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── bns_sections ──────────────────────────────────────────────────────
    op.create_table(
        'bns_sections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('chapter_number', sa.Integer(), nullable=False),
        sa.Column('chapter_name', sa.String(500), nullable=False),
        sa.Column('chapter_subtype', sa.String(500), nullable=True),
        sa.Column('section_number', sa.String(30), nullable=False, unique=True),
        sa.Column('section_name', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_bns_chapter', 'bns_sections', ['chapter_number'])
    op.create_index('ix_bns_section_number', 'bns_sections', ['section_number'])

    # ── ipc_bns_links ─────────────────────────────────────────────────────
    op.create_table(
        'ipc_bns_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('ipc_section_number', sa.String(20), nullable=False),
        sa.Column('bns_section_number', sa.String(30), nullable=True),
        sa.Column('change_type', sa.String(50), nullable=False),
        sa.Column('change_summary', sa.Text(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_ipc_bns_ipc', 'ipc_bns_links', ['ipc_section_number'])
    op.create_index('ix_ipc_bns_bns', 'ipc_bns_links', ['bns_section_number'])


def downgrade() -> None:
    op.drop_index('ix_ipc_bns_bns', table_name='ipc_bns_links')
    op.drop_index('ix_ipc_bns_ipc', table_name='ipc_bns_links')
    op.drop_table('ipc_bns_links')

    op.drop_index('ix_bns_section_number', table_name='bns_sections')
    op.drop_index('ix_bns_chapter', table_name='bns_sections')
    op.drop_table('bns_sections')
