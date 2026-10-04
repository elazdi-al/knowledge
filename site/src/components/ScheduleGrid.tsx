import { Grid, Node, Space, Tag, type State } from "@/components/figure";
import { TX_TONE } from "@/components/tones";

export type TxId = 1 | 2 | 3;

export interface ScheduleOp {
  tx: TxId;
  text: string;
  id?: string;
  state?: State;
}

/** A schedule: one column per transaction (toned header), one row per operation, time running down. */
export function ScheduleGrid({ txs, ops }: { txs: TxId[]; ops: ScheduleOp[] }) {
  return (
    <Grid cols={txs.length} colGap={8} rowGap={6} align="stretch">
      {txs.map((t) => (
        <Tag key={t} text={`T_${t}`} tone={TX_TONE[t]} />
      ))}
      {ops.flatMap((op, i) =>
        txs.map((t) =>
          t === op.tx ? <Node key={`${i}.${t}`} id={op.id} title={op.text} h={26} state={op.state} /> : <Space key={`${i}.${t}`} />,
        ),
      )}
    </Grid>
  );
}
