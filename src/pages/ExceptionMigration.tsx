import SheetMigration from './SheetMigration'
import { EXCEPTION_SHEET_LOAD_NUM, parseExceptionSheet, type ExceptionEntry } from '../utils/exceptionSheet'

// Exception Log spreadsheet -> app, re-run until the sheet is retired. Parsing:
// utils/exceptionSheet.ts; endpoint: mgo_backend src/io_migration.rs.
const ExceptionMigration = () => (
    <SheetMigration<ExceptionEntry>
        logName="Exception Log"
        loadNum={EXCEPTION_SHEET_LOAD_NUM}
        parse={parseExceptionSheet}
        existingUrl="/api/get_exceptions"
        importUrl="/api/import_exception_sheet"
        describe={e => `${e.dock || '?'} / ${e.trailer1 || 'no trailer'}`}
        notes={<p style={{ color: '#888' }}>Repower is off and repowered load blank on every entry. Dock Door (C) and plan end date/time (P, Q) aren't imported.</p>}
        preview={[
            { label: 'Requestor', value: e => e.requestor },
            { label: 'Dock',      value: e => e.dock },
            { label: 'Type',      value: e => e.type },
            { label: 'Status',    value: e => e.status },
            { label: 'Route',     value: e => e.route },
            { label: 'SCAC',      value: e => e.scac },
            { label: 'Trailer 1', value: e => e.trailer1 },
            { label: 'Trailer 2', value: e => e.trailer2 },
            { label: 'Supplier',  value: e => e.supplier },
            { label: 'Stop Seq',  value: e => e.dockSequence },
            { label: 'Orig Date', value: e => e.originalDate },
            { label: 'Orig Time', value: e => e.originalTime },
            { label: 'New Date',  value: e => e.newDate },
            { label: 'New Time',  value: e => e.newTime },
            { label: 'End Date',  value: e => e.newEndDate },
            { label: 'End Time',  value: e => e.newEndTime },
            { label: 'Comment',   value: e => e.comment },
        ]}
    />
)

export default ExceptionMigration
