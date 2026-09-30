import SheetMigration from './SheetMigration'
import { DY_SHEET_LOAD_NUM, parseDySheet, type DyEntry } from '../utils/dySheet'

// DropYard Communication Log spreadsheet -> app, re-run until the sheet is
// retired. Parsing: utils/dySheet.ts; endpoint: mgo_backend src/io_migration.rs.
const DyMigration = () => (
    <SheetMigration<DyEntry>
        logName="DY Comm Log"
        loadNum={DY_SHEET_LOAD_NUM}
        parse={parseDySheet}
        existingUrl="/api/get_dy"
        importUrl="/api/import_dy_sheet"
        describe={e => `${e.dock || '?'} / ${e.trailer || 'no trailer'}`}
        notes={
            <p style={{ color: '#888' }}>
                Columns K–O (Part #, PDT, DY contact, confirmation time, audit sheet) aren't imported.
                Dock, route and SCAC are uppercased, as the DY Log form does. DATE + Time (A, B) are
                kept as when the entry was logged, converted from this computer's time zone to UTC
                like the app's own timestamps — run it from a machine set to the plant's time.
            </p>
        }
        preview={[
            { label: 'Requestor',     value: e => e.createdBy },
            { label: 'Logged (UTC)',  value: e => e.createdAt },
            { label: 'Trailer',       value: e => e.trailer },
            { label: 'SCAC',          value: e => e.scac },
            { label: 'Route',         value: e => e.route },
            { label: 'Dock',          value: e => e.dock },
            { label: 'Location',      value: e => e.location },
            { label: 'Delivery Date', value: e => e.deliveryDate },
            { label: 'Delivery Time', value: e => e.deliveryTime },
            { label: 'Supplier',      value: e => e.supplier },
        ]}
    />
)

export default DyMigration
