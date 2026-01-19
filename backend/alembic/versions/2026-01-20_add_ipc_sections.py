"""Add ipc_sections table

Revision ID: 3a4b5c6d7e8f
Revises: 2a3b4c5d6e7f
Create Date: 2026-01-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3a4b5c6d7e8f'
down_revision: Union[str, None] = '2a3b4c5d6e7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ipc_sections table
    op.create_table(
        'ipc_sections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('section_number', sa.String(20), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('offense', sa.Text(), nullable=True),
        sa.Column('punishment', sa.Text(), nullable=True),
        sa.Column('cognizable', sa.Boolean(), nullable=True),
        sa.Column('bailable', sa.Boolean(), nullable=True),
        sa.Column('court', sa.String(255), nullable=True),
        sa.Column('source_url', sa.String(512), nullable=True),
        sa.Column('embedding_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    
    # Create indexes
    op.create_index('ix_ipc_section_number', 'ipc_sections', ['section_number'])
    op.create_index('ix_ipc_cognizable', 'ipc_sections', ['cognizable'])
    op.create_index('ix_ipc_bailable', 'ipc_sections', ['bailable'])


def downgrade() -> None:
    op.drop_index('ix_ipc_bailable', table_name='ipc_sections')
    op.drop_index('ix_ipc_cognizable', table_name='ipc_sections')
    op.drop_index('ix_ipc_section_number', table_name='ipc_sections')
    op.drop_table('ipc_sections')
