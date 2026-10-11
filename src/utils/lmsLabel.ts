import { type LMSRecord } from '../signals/signals'

/** How an LMS load reads in the Exception and DY Log suggestion dropdowns. */
export const lmsLabel = (o: LMSRecord) =>
    `${o.load_no}  |  Dock ${o.dock || '—'}  |  Trailer ${o.trailer || '—'}`
