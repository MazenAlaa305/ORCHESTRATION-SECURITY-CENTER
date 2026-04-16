"""agent_log append-only trigger and hash chain columns

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add hash chain columns
    op.add_column('agent_logs', sa.Column('prev_hash', sa.String(64), nullable=True))
    op.add_column('agent_logs', sa.Column('this_hash', sa.String(64), nullable=True))

    # 2. Create trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION _block_agent_log_mutation()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION
                'agent_logs is append-only: % is not permitted on this table',
                TG_OP;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # 3. Attach trigger for UPDATE
    op.execute("""
        CREATE TRIGGER agent_logs_no_update
            BEFORE UPDATE ON agent_logs
            FOR EACH ROW
            EXECUTE FUNCTION _block_agent_log_mutation();
    """)

    # 4. Attach trigger for DELETE
    op.execute("""
        CREATE TRIGGER agent_logs_no_delete
            BEFORE DELETE ON agent_logs
            FOR EACH ROW
            EXECUTE FUNCTION _block_agent_log_mutation();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS agent_logs_no_delete ON agent_logs;")
    op.execute("DROP TRIGGER IF EXISTS agent_logs_no_update ON agent_logs;")
    op.execute("DROP FUNCTION IF EXISTS _block_agent_log_mutation();")
    op.drop_column('agent_logs', 'this_hash')
    op.drop_column('agent_logs', 'prev_hash')
